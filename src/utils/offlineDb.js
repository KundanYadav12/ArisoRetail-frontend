import Dexie from 'dexie';

// Create a new Dexie database instance
export const db = new Dexie('ArisoRetailOfflineDB');

// Define the schema for our local POS tables
// Note: Dexie only requires declaring fields that will be indexed.
db.version(1).stores({
  menu_items: 'id, name, barcode, sku, category_id',
  categories: 'id, sequence',
  settings: 'key',
  offline_orders: 'offline_id, status',
  users: 'id, username'
});

db.version(2).stores({
  printers: 'id, role, is_default_receipt, is_default_kot'
});

db.version(3).stores({
  users: 'id, username, email'
});

db.version(4).stores({
  menu_items: 'id, name, barcode, sku, category_id, is_weight_based',
  categories: 'id, sequence, name',
  customers: 'id, phone, name',
  settings: 'key',
  offline_orders: 'offline_id, idempotency_key, status, created_at',
  users: 'id, username, email',
  printers: 'id, role, is_default_receipt, is_default_kot'
});

db.version(5).stores({
  financial_accounts: 'id, account_type, is_active, is_default',
  payment_account_mappings: 'id, payment_mode, account_id'
});

db.version(6).stores({
  expense_categories: 'id, name, is_active',
  offline_expenses: 'offline_id, status, created_at'
});

db.version(7).stores({
  business_days: 'id, business_date, status, store_id',
  offline_cash_counts: 'id, business_date, created_at'
});

db.version(8).stores({
  payment_settlements: 'id, settlement_number, status, settlement_date, payment_mode',
  offline_reconciliations: 'id, created_at'
});

db.version(9).stores({
  suppliers: 'id, name, supplier_code, status',
  purchase_bills: 'id, internal_bill_number, supplier_id, payment_status, due_date',
  offline_supplier_payments: 'offline_id, supplier_id, status, created_at'
});

export default db;

