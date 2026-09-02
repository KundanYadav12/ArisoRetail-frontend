import { db } from './offlineDb';
import { API_BASE_URL, apiFetch } from './api';

let syncInterval = null;
let isSyncingInProgress = false;

export function generateOfflineOrderId() {
  const date = new Date();
  const dateStr = date.toISOString().replace(/[-:T.]/g, '').substring(0, 14);
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `OFF-${dateStr}-${rand}`;
}

export class SyncService {
  /**
   * Check if the API server is reachable
   */
  static async checkNetworkHealth() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(`${API_BASE_URL}/health`, {
        method: 'GET',
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      return res.ok;
    } catch (e) {
      return false;
    }
  }

  /**
   * Downward Sync: Download latest product catalog, categories, receipt config, and users
   */
  static async downloadLatestCatalog(token) {
    if (!token) return false;
    try {
      const res = await apiFetch('/api/sync/downward');
      if (!res.ok) throw new Error('Downward sync failed');
      const data = await res.json();

      // Clear local tables and populate with fresh server configuration
      await db.transaction('rw', [db.menu_items, db.categories, db.settings, db.printers], async () => {
        // Save Menu items
        await db.menu_items.clear();
        if (data.menu_items && Array.isArray(data.menu_items)) {
          await db.menu_items.bulkPut(data.menu_items);
        }

        // Save Categories
        await db.categories.clear();
        if (data.categories && Array.isArray(data.categories)) {
          await db.categories.bulkPut(data.categories);
        }

        // Save Printers for offline hardware access
        if (db.printers) {
          await db.printers.clear();
          if (data.printers && Array.isArray(data.printers)) {
            await db.printers.bulkPut(data.printers);
          }
        }

        // Save Receipt Settings & Profile
        if (data.receipt_settings) {
          await db.settings.put({ key: 'receipt_settings', value: data.receipt_settings });
        }
        if (data.profile) {
          await db.settings.put({ key: 'restaurant_profile', value: data.profile });
        }
      });

      console.log('[SyncService] Successfully synchronized database catalog downward!');
      return true;
    } catch (err) {
      console.error('[SyncService] Error during downward catalog sync:', err);
      return false;
    }
  }

  /**
   * Save a newly created order locally in Dexie database
   */
  static async saveOfflineOrder(orderPayload) {
    try {
      const offlineId = orderPayload.offline_id || generateOfflineOrderId();
      const idempotencyKey = orderPayload.idempotency_key || offlineId;

      const newOrder = {
        offline_id: offlineId,
        idempotency_key: idempotencyKey,
        payload: {
          ...orderPayload,
          offline_id: offlineId,
          idempotency_key: idempotencyKey
        },
        status: 'pending_sync', // 'pending_sync' | 'synced' | 'failed' | 'dismissed'
        created_at: new Date().toISOString(),
        synced_at: null,
        server_order_number: null,
        retry_count: 0
      };

      await db.offline_orders.put(newOrder);

      // Decrement Local stock balance immediately in Dexie database
      for (const item of (orderPayload.items || [])) {
        if (item.menu_item_id) {
          const cachedProduct = await db.menu_items.get(item.menu_item_id);
          if (cachedProduct && cachedProduct.stock !== undefined && cachedProduct.stock !== null) {
            const currentStock = parseFloat(cachedProduct.stock);
            const qtyUsed = parseFloat(item.quantity || 1);
            const newStock = Math.max(0, currentStock - qtyUsed);
            await db.menu_items.update(item.menu_item_id, { stock: newStock });
            console.log(`[SyncService] Decrement stock of product #${item.menu_item_id}: ${currentStock} -> ${newStock}`);
          }
        }
      }

      console.log(`[SyncService] Saved local offline order #${offlineId}`);
      return newOrder;
    } catch (err) {
      console.error('[SyncService] Error saving offline order:', err);
      throw err;
    }
  }

  /**
   * Upward Sync: Upload all pending offline orders to the Express server
   */
  static async syncPendingOrders(token) {
    if (isSyncingInProgress || !token) return { synced: 0, total: 0 };
    isSyncingInProgress = true;

    let syncedCount = 0;
    let pendingOrders = [];

    try {
      pendingOrders = await db.offline_orders.where('status').equals('pending_sync').toArray();
    } catch (e) {
      console.warn('[SyncService] Error fetching offline queue:', e.message);
      isSyncingInProgress = false;
      return { synced: 0, total: 0 };
    }

    if (pendingOrders.length === 0) {
      isSyncingInProgress = false;
      return { synced: 0, total: 0 };
    }

    console.log(`[SyncService] Syncing ${pendingOrders.length} offline orders upward...`);

    for (const item of pendingOrders) {
      const payload = item.payload;
      const idempotencyKey = item.idempotency_key || item.offline_id;

      try {
        const response = await fetch(`${API_BASE_URL}/orders`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            ...payload,
            idempotency_key: idempotencyKey,
            offline_id: idempotencyKey
          })
        });

        const resData = await response.json().catch(() => ({}));

        if (response.ok || response.status === 201 || response.status === 200) {
          const serverOrderNumber = resData.orderNumber || resData.order_number || item.offline_id;
          const serverOrderId = resData.orderId || resData.id || null;

          await db.offline_orders.update(item.offline_id, {
            status: 'synced',
            synced_at: new Date().toISOString(),
            server_order_number: serverOrderNumber,
            server_order_id: serverOrderId
          });
          syncedCount++;
          console.log(`[SyncService] Order #${item.offline_id} synced -> Server #${serverOrderNumber}`);
        } else {
          console.warn(`[SyncService] Sync failed for order #${item.offline_id}:`, resData.error || response.statusText);
          await db.offline_orders.update(item.offline_id, {
            retry_count: (item.retry_count || 0) + 1,
            last_error: resData.error || 'Server error'
          });
        }
      } catch (err) {
        console.warn(`[SyncService] Network error syncing order #${item.offline_id}:`, err.message);
        await db.offline_orders.update(item.offline_id, {
          retry_count: (item.retry_count || 0) + 1,
          last_error: err.message
        });
      }
    }

    isSyncingInProgress = false;
    return { synced: syncedCount, total: pendingOrders.length };
  }

  /**
   * Fetch local queue status details
   */
  static async getPendingCount() {
    return await db.offline_orders.where('status').equals('pending_sync').count();
  }

  static async getPendingOrders() {
    return await db.offline_orders.where('status').equals('pending_sync').toArray();
  }

  static async dismissOrder(offlineId) {
    try {
      await db.offline_orders.update(offlineId, {
        status: 'dismissed',
        dismissed_at: new Date().toISOString()
      });
      console.log(`[SyncService] Dismissed sync for order #${offlineId}`);
    } catch (err) {
      console.error('[SyncService] Error dismissing order:', err);
    }
  }

  static async clearAllPending() {
    try {
      await db.offline_orders.where('status').equals('pending_sync').modify({
        status: 'dismissed',
        dismissed_at: new Date().toISOString()
      });
      console.log('[SyncService] Dismissed all pending orders.');
    } catch (err) {
      console.error('[SyncService] Error clearing pending orders:', err);
    }
  }

  /**
   * Start automatic background status checks and upward sync scheduler
   */
  static startAutoSync(token, onStateChange) {
    if (syncInterval) clearInterval(syncInterval);

    const monitor = async () => {
      try {
        const isOnline = await this.checkNetworkHealth();
        const pendingCount = await this.getPendingCount();

        if (onStateChange) {
          onStateChange({
            isOnline,
            pendingCount,
            isSyncing: isSyncingInProgress
          });
        }

        if (isOnline && pendingCount > 0 && !isSyncingInProgress && token) {
          if (onStateChange) onStateChange({ isOnline, pendingCount, isSyncing: true });
          await this.syncPendingOrders(token);
          const updatedCount = await this.getPendingCount();
          if (onStateChange) onStateChange({ isOnline, pendingCount: updatedCount, isSyncing: false });
        }
      } catch (err) {
        console.warn('[SyncService] Background sync task warning:', err.message);
      }
    };

    monitor();
    syncInterval = setInterval(monitor, 10000); // Poll connection every 10 seconds
  }

  /**
   * Stop background sync scheduler
   */
  static stopAutoSync() {
    if (syncInterval) {
      clearInterval(syncInterval);
      syncInterval = null;
    }
  }
}
