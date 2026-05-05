import db from '../db/database';
import dayjs from 'dayjs';

const seedData = async () => {
  // Clear all data
  await db.transaction('rw', db.products, db.recipients, db.installation_orders, db.installation_order_items, db.banking_slips, db.banking_slip_orders, db.drop_stocks, db.drop_stock_orders, async () => {
    await db.products.clear();
    await db.recipients.clear();
    await db.installation_orders.clear();
    await db.installation_order_items.clear();
    await db.banking_slips.clear();
    await db.banking_slip_orders.clear();
    await db.drop_stocks.clear();
    await db.drop_stock_orders.clear();
  });

  // 1. Products
  const product1 = await db.products.add({ code: 'HDD-001', name: 'HDD 1TB Seagate', category: 'Hard Drive', unit: 'Cai', price: 800000, quantity: 10, min_stock: 5, created_at: dayjs().subtract(10, 'day').toISOString(), updated_at: dayjs().subtract(10, 'day').toISOString() });
  const product2 = await db.products.add({ code: 'MON-001', name: 'Monitor 24inch Dell', category: 'Monitor', unit: 'Cai', price: 3500000, quantity: 3, min_stock: 5, created_at: dayjs().subtract(10, 'day').toISOString(), updated_at: dayjs().subtract(10, 'day').toISOString() });
  const product3 = await db.products.add({ code: 'RAM-001', name: 'RAM 8GB DDR4', category: 'Memory', unit: 'Cai', price: 400000, quantity: 20, min_stock: 10, created_at: dayjs().subtract(10, 'day').toISOString(), updated_at: dayjs().subtract(10, 'day').toISOString() });
  const product4 = await db.products.add({ code: 'SSD-001', name: 'SSD 256GB Samsung', category: 'SSD', unit: 'Cai', price: 600000, quantity: 15, min_stock: 5, created_at: dayjs().subtract(10, 'day').toISOString(), updated_at: dayjs().subtract(10, 'day').toISOString() });
  const product5 = await db.products.add({ code: 'CABLE-001', name: 'Cap HDMI 2m', category: 'Cable', unit: 'Cai', price: 150000, quantity: 50, min_stock: 20, created_at: dayjs().subtract(10, 'day').toISOString(), updated_at: dayjs().subtract(10, 'day').toISOString() });

  // 2. Recipients (KTV/CTV)
  const ktv1 = await db.recipients.add({ code: 'KTV-001', name: 'Nguyen Van A', type: 'technician', phone: '0901234567', province: 'Ha Noi', region: 'North', address: '123 Duong Lang', created_at: dayjs().subtract(10, 'day').toISOString(), updated_at: dayjs().subtract(10, 'day').toISOString() });
  const ktv2 = await db.recipients.add({ code: 'KTV-002', name: 'Tran Van B', type: 'technician', phone: '0912345678', province: 'Da Nang', region: 'Central', address: '456 Le Loi', created_at: dayjs().subtract(10, 'day').toISOString(), updated_at: dayjs().subtract(10, 'day').toISOString() });
  const ctv1 = await db.recipients.add({ code: 'CTV-001', name: 'Le Van C', type: 'collaborator', phone: '0923456789', province: 'TP.HCM', region: 'South', address: '789 Nguyen Trai', created_at: dayjs().subtract(10, 'day').toISOString(), updated_at: dayjs().subtract(10, 'day').toISOString() });

  // 3. Installation Orders
  const order1 = await db.installation_orders.add({ code: 'ORD-001', recipient_id: ktv1, order_date: dayjs().subtract(5, 'day').format('YYYY-MM-DD'), total_quantity: 3, total_value: 2000000, note: 'Thay o cung + RAM', created_at: dayjs().subtract(5, 'day').toISOString() });
  await db.installation_order_items.add({ order_id: order1, product_id: product1, quantity: 2, price: 800000, created_at: dayjs().subtract(5, 'day').toISOString() });
  await db.installation_order_items.add({ order_id: order1, product_id: product3, quantity: 1, price: 400000, created_at: dayjs().subtract(5, 'day').toISOString() });

  const order2 = await db.installation_orders.add({ code: 'ORD-002', recipient_id: ktv2, order_date: dayjs().subtract(4, 'day').format('YYYY-MM-DD'), total_quantity: 2, total_value: 500000, note: 'Thay cap HDMI', created_at: dayjs().subtract(4, 'day').toISOString() });
  await db.installation_order_items.add({ order_id: order2, product_id: product5, quantity: 2, price: 150000, created_at: dayjs().subtract(4, 'day').toISOString() });
  await db.installation_order_items.add({ order_id: order2, product_id: product3, quantity: 1, price: 400000, created_at: dayjs().subtract(4, 'day').toISOString() });

  const order3 = await db.installation_orders.add({ code: 'ORD-003', recipient_id: ktv1, order_date: dayjs().subtract(3, 'day').format('YYYY-MM-DD'), total_quantity: 1, total_value: 1200000, note: 'Thay man hinh', created_at: dayjs().subtract(3, 'day').toISOString() });
  await db.installation_order_items.add({ order_id: order3, product_id: product2, quantity: 1, price: 3500000, created_at: dayjs().subtract(3, 'day').toISOString() });

  const order4 = await db.installation_orders.add({ code: 'ORD-004', recipient_id: ctv1, order_date: dayjs().subtract(2, 'day').format('YYYY-MM-DD'), total_quantity: 2, total_value: 800000, note: 'Nang cap SSD', created_at: dayjs().subtract(2, 'day').toISOString() });
  await db.installation_order_items.add({ order_id: order4, product_id: product4, quantity: 2, price: 600000, created_at: dayjs().subtract(2, 'day').toISOString() });

  const order5 = await db.installation_orders.add({ code: 'ORD-005', recipient_id: ktv2, order_date: dayjs().subtract(1, 'day').format('YYYY-MM-DD'), total_quantity: 1, total_value: 1000000, note: 'Them RAM', created_at: dayjs().subtract(1, 'day').toISOString() });
  await db.installation_order_items.add({ order_id: order5, product_id: product3, quantity: 1, price: 400000, created_at: dayjs().subtract(1, 'day').toISOString() });

  // 4. Banking Slips
  const slip1 = await db.banking_slips.add({ code: 'PAY-001', recipient_id: ktv1, transfer_date: dayjs().subtract(5, 'day').format('YYYY-MM-DD'), amount: 2000000, note: 'Chuyen khoan lan 1', created_at: dayjs().subtract(5, 'day').toISOString(), updated_at: dayjs().subtract(5, 'day').toISOString() });
  await db.banking_slip_orders.add({ banking_slip_id: slip1, installation_order_id: order1, created_at: dayjs().subtract(5, 'day').toISOString() });

  const slip2 = await db.banking_slips.add({ code: 'PAY-002', recipient_id: ktv2, transfer_date: dayjs().subtract(3, 'day').format('YYYY-MM-DD'), amount: 1200000, note: 'Chuyen khoan', created_at: dayjs().subtract(3, 'day').toISOString(), updated_at: dayjs().subtract(3, 'day').toISOString() });
  await db.banking_slip_orders.add({ banking_slip_id: slip2, installation_order_id: order2, created_at: dayjs().subtract(3, 'day').toISOString() });

  const slip3 = await db.banking_slips.add({ code: 'PAY-003', recipient_id: ctv1, transfer_date: dayjs().subtract(2, 'day').format('YYYY-MM-DD'), amount: 800000, note: 'Chuyen khoan day du', created_at: dayjs().subtract(2, 'day').toISOString(), updated_at: dayjs().subtract(2, 'day').toISOString() });
  await db.banking_slip_orders.add({ banking_slip_id: slip3, installation_order_id: order4, created_at: dayjs().subtract(2, 'day').toISOString() });

  // 5. Drop Stocks
  const drop1 = await db.drop_stocks.add({ date: dayjs().subtract(4, 'day').format('YYYY-MM-DD'), note: 'Drop stock tuan 1', status: 'reconciled', created_at: dayjs().subtract(4, 'day').toISOString() });
  await db.drop_stock_orders.add({ drop_stock_id: drop1, installation_order_id: order1, created_at: dayjs().subtract(4, 'day').toISOString() });
  await db.drop_stock_orders.add({ drop_stock_id: drop1, installation_order_id: order2, created_at: dayjs().subtract(4, 'day').toISOString() });

  const drop2 = await db.drop_stocks.add({ date: dayjs().subtract(1, 'day').format('YYYY-MM-DD'), note: 'Drop stock tuan 2', status: 'confirmed', created_at: dayjs().subtract(1, 'day').toISOString() });
  await db.drop_stock_orders.add({ drop_stock_id: drop2, installation_order_id: order3, created_at: dayjs().subtract(1, 'day').toISOString() });
  await db.drop_stock_orders.add({ drop_stock_id: drop2, installation_order_id: order4, created_at: dayjs().subtract(1, 'day').toISOString() });
  await db.drop_stock_orders.add({ drop_stock_id: drop2, installation_order_id: order5, created_at: dayjs().subtract(1, 'day').toISOString() });

  console.log('Da tao du lieu mau thanh cong!');
  return { product1, product2, product3, product4, product5, ktv1, ktv2, ctv1, order1, order2, order3, order4, order5, slip1, slip2, slip3, drop1, drop2 };
};

export default seedData;
