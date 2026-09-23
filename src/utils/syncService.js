import { db } from './offlineDb.js';
import { API_BASE_URL, apiFetch } from './api.js';

let syncInterval = null;
let isSyncingInProgress = false;
let onlineStatusListenersAttached = false;
let currentStatusCallback = null;

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
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return false;
    }
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);
      const res = await fetch(`${API_BASE_URL}/health`, {
        method: 'GET',
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      return res.ok;
    } catch (e) {
      // If /health not found, try a lightweight endpoint
      try {
        const controller2 = new AbortController();
        const timeoutId2 = setTimeout(() => controller2.abort(), 3500);
        const res2 = await fetch(`${API_BASE_URL}/settings/receipt`, {
          method: 'GET',
          signal: controller2.signal
        });
        clearTimeout(timeoutId2);
        return res2.status < 500;
      } catch (_) {
        return false;
      }
    }
  }

  /**
   * Downward Sync: Download latest product catalog, categories, receipt config, and printers
   * Uses /api/sync/downward with seamless fallback to individual REST endpoints.
   */
  static async downloadLatestCatalog(token) {
    if (!token) {
      token = localStorage.getItem('ARISO_RETAIL_TOKEN') || localStorage.getItem('pos_token') || '';
    }

    try {
      console.log('[SyncService] Starting downward catalog synchronization...');
      let downwardData = null;

      // 1. Try unified downward sync endpoint
      try {
        const res = await apiFetch('/api/sync/downward');
        if (res.ok) {
          downwardData = await res.json();
        }
      } catch (e) {
        console.warn('[SyncService] Unified downward sync endpoint unreachable, using REST fallbacks...');
      }

      // 2. If downwardData was not obtained, fetch all resources in parallel
      if (!downwardData) {
        const [catRes, menuRes, receiptRes, profileRes, prnRes, finAccRes, finMapRes, expCatRes] = await Promise.allSettled([
          apiFetch('/api/categories'),
          apiFetch('/api/menu'),
          apiFetch('/api/settings/receipt'),
          apiFetch('/api/settings/profile'),
          apiFetch('/api/printers'),
          apiFetch('/api/finance/accounts'),
          apiFetch('/api/finance/mappings'),
          apiFetch('/api/expenses/categories')
        ]);

        downwardData = {
          categories: catRes.status === 'fulfilled' && catRes.value.ok ? await catRes.value.json() : null,
          menu_items: menuRes.status === 'fulfilled' && menuRes.value.ok ? await menuRes.value.json() : null,
          receipt_settings: receiptRes.status === 'fulfilled' && receiptRes.value.ok ? await receiptRes.value.json() : null,
          profile: profileRes.status === 'fulfilled' && profileRes.value.ok ? await profileRes.value.json() : null,
          printers: prnRes.status === 'fulfilled' && prnRes.value.ok ? await prnRes.value.json() : null,
          financial_accounts: finAccRes.status === 'fulfilled' && finAccRes.value.ok ? (await finAccRes.value.json())?.accounts : null,
          payment_mappings: finMapRes.status === 'fulfilled' && finMapRes.value.ok ? (await finMapRes.value.json())?.mappings : null,
          expense_categories: expCatRes.status === 'fulfilled' && expCatRes.value.ok ? (await expCatRes.value.json())?.categories : null
        };
      }

      // 3. Atomically persist into Dexie IndexedDB and dual-cache to localStorage
      await db.transaction('rw', [db.menu_items, db.categories, db.settings, db.printers, db.financial_accounts, db.payment_account_mappings, db.expense_categories], async () => {
        // Save Menu items
        if (downwardData.menu_items && Array.isArray(downwardData.menu_items) && downwardData.menu_items.length > 0) {
          await db.menu_items.clear();
          await db.menu_items.bulkPut(downwardData.menu_items);
          try {
            localStorage.setItem('ariso_offline_menu_items', JSON.stringify(downwardData.menu_items));
          } catch (e) {}
        }

        // Save Categories
        if (downwardData.categories && Array.isArray(downwardData.categories) && downwardData.categories.length > 0) {
          await db.categories.clear();
          await db.categories.bulkPut(downwardData.categories);
          try {
            localStorage.setItem('ariso_offline_categories', JSON.stringify(downwardData.categories));
          } catch (e) {}
        }

        // Save Receipt Settings & Profile
        if (downwardData.receipt_settings) {
          await db.settings.put({ key: 'receipt_settings', value: downwardData.receipt_settings });
          try {
            localStorage.setItem('ariso_offline_receipt_settings', JSON.stringify(downwardData.receipt_settings));
          } catch (e) {}
        }
        if (downwardData.profile) {
          await db.settings.put({ key: 'restaurant_profile', value: downwardData.profile });
          try {
            localStorage.setItem('ariso_offline_restaurant_profile', JSON.stringify(downwardData.profile));
          } catch (e) {}
        }

        // Save Printers
        if (downwardData.printers && Array.isArray(downwardData.printers) && downwardData.printers.length > 0) {
          await db.printers.clear();
          await db.printers.bulkPut(downwardData.printers);
          try {
            localStorage.setItem('ariso_offline_printers', JSON.stringify(downwardData.printers));
          } catch (e) {}
        }

        // Save Financial Accounts
        if (downwardData.financial_accounts && Array.isArray(downwardData.financial_accounts)) {
          await db.financial_accounts.clear();
          await db.financial_accounts.bulkPut(downwardData.financial_accounts);
        }

        // Save Payment Mappings
        if (downwardData.payment_mappings && Array.isArray(downwardData.payment_mappings)) {
          await db.payment_account_mappings.clear();
          await db.payment_account_mappings.bulkPut(downwardData.payment_mappings);
        }

        // Save Expense Categories
        if (downwardData.expense_categories && Array.isArray(downwardData.expense_categories)) {
          await db.expense_categories.clear();
          await db.expense_categories.bulkPut(downwardData.expense_categories);
        }
      });

      console.log('[SyncService] Successfully synchronized database catalog downward to Dexie IndexedDB!');
      return true;
    } catch (err) {
      console.error('[SyncService] Error during downward catalog sync:', err);
      return false;
    }
  }

  // Alias for backward compatibility
  static async syncDownward(token) {
    return SyncService.downloadLatestCatalog(token);
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
        const prodId = item.menu_item_id || item.product_id;
        if (prodId) {
          const menuItem = await db.menu_items.get(prodId);
          if (menuItem && menuItem.current_stock !== null && menuItem.current_stock !== undefined) {
            const deduction = item.is_weight_based ? (parseFloat(item.item_weight) || 1) : (item.quantity || 1);
            const newStock = Math.max(0, parseFloat(menuItem.current_stock) - deduction);
            await db.menu_items.update(prodId, { current_stock: newStock });
          }
        }
      }

      console.log(`[SyncService] Offline order ${offlineId} saved locally in queue.`);
      return newOrder;
    } catch (err) {
      console.error('[SyncService] Failed to save offline order:', err);
      throw err;
    }
  }

  /**
   * Sync pending offline orders with the backend server
   */
  static async syncPendingOrders(token) {
    if (isSyncingInProgress) return;
    if (!token) {
      token = localStorage.getItem('ARISO_RETAIL_TOKEN') || localStorage.getItem('pos_token') || '';
    }
    if (!token) return;

    isSyncingInProgress = true;
    SyncService.notifyStatusChange();

    try {
      const pendingOrders = await db.offline_orders.where('status').equals('pending_sync').toArray();
      if (!pendingOrders || pendingOrders.length === 0) {
        isSyncingInProgress = false;
        SyncService.notifyStatusChange();
        return;
      }

      console.log(`[SyncService] Syncing ${pendingOrders.length} pending offline orders to server...`);

      for (const order of pendingOrders) {
        try {
          const res = await apiFetch('/api/orders', {
            method: 'POST',
            body: order.payload
          });

          if (res.ok) {
            const data = await res.json();
            await db.offline_orders.update(order.offline_id, {
              status: 'synced',
              synced_at: new Date().toISOString(),
              server_order_number: data.unique_order_number || data.orderNumber || data.id
            });
            console.log(`[SyncService] Order ${order.offline_id} synced successfully -> Server Order #${data.unique_order_number || data.id}`);
          } else {
            const errorData = await res.json().catch(() => ({}));
            // If duplicate idempotency key detected or already processed
            if (res.status === 409 || errorData.error?.toLowerCase().includes('duplicate') || errorData.message?.toLowerCase().includes('duplicate')) {
              await db.offline_orders.update(order.offline_id, {
                status: 'synced',
                synced_at: new Date().toISOString(),
                server_order_number: errorData.orderNumber || order.offline_id
              });
              console.log(`[SyncService] Order ${order.offline_id} was already recorded on server (duplicate ack).`);
            } else {
              await db.offline_orders.update(order.offline_id, {
                retry_count: (order.retry_count || 0) + 1
              });
            }
          }
        } catch (err) {
          console.warn('[SyncService] Failed to sync order', order.offline_id, err.message);
        }
      }

      // After syncing orders, refresh catalog in background to reconcile stock
      SyncService.downloadLatestCatalog(token).catch(() => {});
    } catch (err) {
      console.error('[SyncService] Sync pending orders error:', err);
    } finally {
      isSyncingInProgress = false;
      SyncService.notifyStatusChange();
    }
  }

  /**
   * Helper to notify registered UI callbacks
   */
  static async notifyStatusChange() {
    if (!currentStatusCallback) return;
    try {
      const isOnline = await SyncService.checkNetworkHealth();
      let pendingCount = 0;
      try {
        pendingCount = await db.offline_orders.where('status').equals('pending_sync').count();
      } catch (_) {}

      currentStatusCallback({
        isOnline,
        pendingCount,
        isSyncing: isSyncingInProgress
      });
    } catch (_) {}
  }

  /**
   * Start auto background sync
   */
  static startAutoSync(token, onStatusChange) {
    currentStatusCallback = onStatusChange;
    if (syncInterval) clearInterval(syncInterval);

    const checkAndSync = async () => {
      const isOnline = await SyncService.checkNetworkHealth();
      let pendingCount = 0;
      try {
        pendingCount = await db.offline_orders.where('status').equals('pending_sync').count();
      } catch (_) {}

      if (currentStatusCallback) {
        currentStatusCallback({
          isOnline,
          pendingCount,
          isSyncing: isSyncingInProgress
        });
      }

      if (isOnline && pendingCount > 0 && !isSyncingInProgress) {
        await SyncService.syncPendingOrders(token);
      }
      if (isOnline) {
        await SyncService.syncPendingExpenses(token);
      }
    };

    // Attach native online/offline listeners once
    if (!onlineStatusListenersAttached && typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        console.log('[SyncService] Internet connection restored! Triggering sync...');
        checkAndSync();
        SyncService.downloadLatestCatalog(token).catch(() => {});
      });

      window.addEventListener('offline', () => {
        console.warn('[SyncService] Device is now OFFLINE.');
        SyncService.notifyStatusChange();
      });

      onlineStatusListenersAttached = true;
    }

    checkAndSync();
    syncInterval = setInterval(checkAndSync, 10000);
  }

  /**
   * Save a newly created expense locally in Dexie when offline
   */
  static async saveOfflineExpense(expensePayload) {
    try {
      const offlineId = `OFF-EXP-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const record = {
        offline_id: offlineId,
        status: 'pending_sync',
        created_at: new Date().toISOString(),
        payload: {
          ...expensePayload,
          offline_id: offlineId
        }
      };
      await db.offline_expenses.put(record);
      console.log(`[SyncService] Offline expense ${offlineId} saved locally in queue.`);
      return record;
    } catch (err) {
      console.error('[SyncService] Failed to save offline expense:', err);
      throw err;
    }
  }

  /**
   * Sync pending offline expenses to server
   */
  static async syncPendingExpenses(token) {
    try {
      const pending = await db.offline_expenses.where('status').equals('pending_sync').toArray();
      if (!pending || pending.length === 0) return;

      console.log(`[SyncService] Syncing ${pending.length} pending offline expenses to server...`);
      for (const item of pending) {
        try {
          const res = await apiFetch('/api/expenses', {
            method: 'POST',
            body: item.payload
          });
          if (res.ok) {
            const data = await res.json();
            await db.offline_expenses.update(item.offline_id, {
              status: 'synced',
              synced_at: new Date().toISOString(),
              server_expense_number: data.expense?.expense_number || data.expense_number
            });
          }
        } catch (err) {
          console.warn('[SyncService] Failed to sync expense', item.offline_id, err.message);
        }
      }
    } catch (err) {
      console.error('[SyncService] Sync pending expenses error:', err);
    }
  }

  /**
   * Stop auto background sync
   */
  static stopAutoSync() {
    if (syncInterval) {
      clearInterval(syncInterval);
      syncInterval = null;
    }
    currentStatusCallback = null;
  }

  /**
   * Manual Sync Trigger for UI buttons
   */
  static async triggerManualSync(token) {
    await SyncService.downloadLatestCatalog(token);
    await SyncService.syncPendingOrders(token);
    await SyncService.syncPendingExpenses(token);
    await SyncService.notifyStatusChange();
  }
}

