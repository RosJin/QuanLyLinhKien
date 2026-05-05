import Dexie from 'dexie';

const db = new Dexie('QuanLyLinhKienDB');

db.version(1).stores({
  products: '++id, code, name, category, unit, price, quantity, min_stock, created_at, updated_at',
  transactions: '++id, product_id, type, quantity, price, note, recipient_id, created_at',
  recipients: '++id, code, name, type, phone, province, region, address, created_at, updated_at',
  installation_orders: '++id, code, recipient_id, order_date, total_quantity, total_value, note, created_at',
  installation_order_items: '++id, order_id, product_id, quantity, price, created_at',
  combos: '++id, code, name, note, created_at, updated_at',
  combo_items: '++id, combo_id, product_id, quantity, created_at',
  banking_slips: '++id, code, recipient_id, transfer_date, amount, image_path, note, created_at, updated_at',
  banking_slip_orders: '++id, banking_slip_id, installation_order_id, created_at'
});

db.version(2).stores({
  products: '++id, code, name, category, unit, price, quantity, min_stock, created_at, updated_at',
  transactions: '++id, product_id, type, quantity, price, note, recipient_id, created_at',
  recipients: '++id, code, name, type, phone, province, region, address, created_at, updated_at',
  installation_orders: '++id, code, recipient_id, order_date, total_quantity, total_value, note, created_at',
  installation_order_items: '++id, order_id, product_id, quantity, price, created_at',
  combos: '++id, code, name, note, created_at, updated_at',
  combo_items: '++id, combo_id, product_id, quantity, created_at',
  banking_slips: '++id, code, recipient_id, transfer_date, amount, image_path, note, created_at, updated_at',
  banking_slip_orders: '++id, banking_slip_id, installation_order_id, created_at',
  drop_stocks: '++id, date, note, created_at',
  drop_stock_orders: '++id, drop_stock_id, installation_order_id, created_at'
});

export default db;
