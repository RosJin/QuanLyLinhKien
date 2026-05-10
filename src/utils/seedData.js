import { addProduct, addRecipient, addInstallationOrder, addBankingSlip, addBankingSlipOrder, createDropStock } from './dbUtils';

const seedData = async () => {
  try {
    // 1. Products
    const p1 = await addProduct({ code: 'HDD-001', name: 'HDD 1TB Seagate', category: 'Hard Drive', unit: 'Cai', price: 800000, quantity: 10, min_stock: 5 });
    const p2 = await addProduct({ code: 'MON-001', name: 'Monitor 24inch Dell', category: 'Monitor', unit: 'Cai', price: 3500000, quantity: 3, min_stock: 5 });
    const p3 = await addProduct({ code: 'RAM-001', name: 'RAM 8GB DDR4', category: 'Memory', unit: 'Cai', price: 400000, quantity: 20, min_stock: 10 });
    const p4 = await addProduct({ code: 'SSD-001', name: 'SSD 256GB Samsung', category: 'SSD', unit: 'Cai', price: 600000, quantity: 15, min_stock: 5 });
    const p5 = await addProduct({ code: 'CABLE-001', name: 'Cap HDMI 2m', category: 'Cable', unit: 'Cai', price: 150000, quantity: 50, min_stock: 20 });

    // 2. Recipients
    const r1 = await addRecipient({ code: 'KTV-001', name: 'Nguyen Van A', type: 'technician', phone: '0901234567', province: 'Ha Noi', region: 'North', address: '123 Duong Lang', allocation_type: 'normal' });
    const r2 = await addRecipient({ code: 'KTV-002', name: 'Tran Van B', type: 'technician', phone: '0912345678', province: 'Da Nang', region: 'Central', address: '456 Le Loi', allocation_type: 'normal' });
    const r3 = await addRecipient({ code: 'CTV-001', name: 'Le Van C', type: 'collaborator', phone: '0923456789', province: 'TP.HCM', region: 'South', address: '789 Nguyen Trai', allocation_type: 'default' });

    // 3. Installation Orders
    const o1 = await addInstallationOrder(
      { code: 'ORD-001', recipient_id: r1, order_date: '2026-05-02', total_quantity: 3, total_value: 2000000, note: 'Thay o cung + RAM' },
      [{ product_id: p1, quantity: 2, price: 800000 }, { product_id: p3, quantity: 1, price: 400000 }]
    );
    const o2 = await addInstallationOrder(
      { code: 'ORD-002', recipient_id: r2, order_date: '2026-05-03', total_quantity: 2, total_value: 500000, note: 'Thay cap HDMI' },
      [{ product_id: p5, quantity: 2, price: 150000 }, { product_id: p3, quantity: 1, price: 400000 }]
    );
    const o3 = await addInstallationOrder(
      { code: 'ORD-003', recipient_id: r1, order_date: '2026-05-04', total_quantity: 1, total_value: 1200000, note: 'Thay man hinh' },
      [{ product_id: p2, quantity: 1, price: 3500000 }]
    );
    const o4 = await addInstallationOrder(
      { code: 'ORD-004', recipient_id: r3, order_date: '2026-05-05', total_quantity: 2, total_value: 800000, note: 'Nang cap SSD' },
      [{ product_id: p4, quantity: 2, price: 600000 }]
    );
    const o5 = await addInstallationOrder(
      { code: 'ORD-005', recipient_id: r2, order_date: '2026-05-06', total_quantity: 1, total_value: 1000000, note: 'Them RAM' },
      [{ product_id: p3, quantity: 1, price: 400000 }]
    );

    // 4. Banking Slips
    const s1 = await addBankingSlip({ code: 'PAY-001', recipient_id: r1, transfer_date: '2026-05-02', amount: 2000000, note: 'Chuyen khoan lan 1' });
    await addBankingSlipOrder(s1, o1);

    const s2 = await addBankingSlip({ code: 'PAY-002', recipient_id: r2, transfer_date: '2026-05-04', amount: 1200000, note: 'Chuyen khoan' });
    await addBankingSlipOrder(s2, o2);

    const s3 = await addBankingSlip({ code: 'PAY-003', recipient_id: r3, transfer_date: '2026-05-05', amount: 800000, note: 'Chuyen khoan day du' });
    await addBankingSlipOrder(s3, o4);

    console.log('Da tao du lieu mau thanh cong!');
    return true;
  } catch (error) {
    console.error('Loi tao du lieu mau:', error);
    throw error;
  }
};

export default seedData;
