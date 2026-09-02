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

export default db;
