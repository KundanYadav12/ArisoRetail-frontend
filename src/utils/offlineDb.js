import Dexie from 'dexie';
import { getCurrentTenantId } from './storageNamespace.js';

/**
 * Tenant-Isolated Dexie IndexedDB Architecture
 * Every tenant operates on their own physically separate IndexedDB database:
 * "ArisoRetailOfflineDB_tenant_<tenantId>"
 * This ensures 100% data isolation at the storage engine level.
 */

const tenantDbs = new Map();

function applySchemaVersions(dexieInstance) {
  dexieInstance.version(1).stores({
    menu_items: 'id, name, barcode, sku, category_id',
    categories: 'id, sequence',
    settings: 'key',
    offline_orders: 'offline_id, status',
    users: 'id, username'
  });

  dexieInstance.version(2).stores({
    printers: 'id, role, is_default_receipt, is_default_kot'
  });

  dexieInstance.version(3).stores({
    users: 'id, username, email'
  });

  dexieInstance.version(4).stores({
    menu_items: 'id, name, barcode, sku, category_id, is_weight_based',
    categories: 'id, sequence, name',
    customers: 'id, phone, name',
    settings: 'key',
    offline_orders: 'offline_id, idempotency_key, status, created_at',
    users: 'id, username, email',
    printers: 'id, role, is_default_receipt, is_default_kot'
  });

  dexieInstance.version(5).stores({
    financial_accounts: 'id, account_type, is_active, is_default',
    payment_account_mappings: 'id, payment_mode, account_id'
  });

  dexieInstance.version(6).stores({
    expense_categories: 'id, name, is_active',
    offline_expenses: 'offline_id, status, created_at'
  });

  dexieInstance.version(7).stores({
    business_days: 'id, business_date, status, store_id',
    offline_cash_counts: 'id, business_date, created_at'
  });

  dexieInstance.version(8).stores({
    payment_settlements: 'id, settlement_number, status, settlement_date, payment_mode',
    offline_reconciliations: 'id, created_at'
  });

  dexieInstance.version(9).stores({
    suppliers: 'id, name, supplier_code, status',
    purchase_bills: 'id, internal_bill_number, supplier_id, payment_status, due_date',
    offline_supplier_payments: 'offline_id, supplier_id, status, created_at'
  });

  dexieInstance.version(10).stores({
    held_receipts: 'id, hold_number, status, restaurant_id, created_at'
  });
}

/**
 * Returns the Dexie IndexedDB instance strictly scoped to a specific tenant
 */
export function getTenantDb(restaurantId = null) {
  const tId = restaurantId ? String(restaurantId).trim() : getCurrentTenantId();
  const dbName = `ArisoRetailOfflineDB_tenant_${tId}`;

  if (!tenantDbs.has(dbName)) {
    const instance = new Dexie(dbName);
    applySchemaVersions(instance);
    tenantDbs.set(dbName, instance);
  }

  return tenantDbs.get(dbName);
}

/**
 * Safely purge a specific tenant's IndexedDB database
 */
export async function purgeTenantIndexedDb(restaurantId) {
  const tId = String(restaurantId).trim();
  const dbName = `ArisoRetailOfflineDB_tenant_${tId}`;
  try {
    if (tenantDbs.has(dbName)) {
      const instance = tenantDbs.get(dbName);
      await instance.close();
      tenantDbs.delete(dbName);
    }
    await Dexie.delete(dbName);
    console.log(`[OfflineDB] Purged IndexedDB for tenant ${tId}`);
  } catch (err) {
    console.warn(`[OfflineDB] Could not purge IndexedDB for tenant ${tId}:`, err.message);
  }
}

/**
 * Dynamic Proxy export for "db".
 * Routes table accesses (db.menu_items, db.categories, db.transaction, etc.)
 * directly to the active tenant's isolated database.
 */
export const db = new Proxy({}, {
  get(target, prop) {
    const activeDb = getTenantDb();
    const val = activeDb[prop];
    if (typeof val === 'function') {
      return val.bind(activeDb);
    }
    return val;
  }
});

export default db;
