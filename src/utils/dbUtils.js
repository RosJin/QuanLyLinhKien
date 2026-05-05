import db from '../db/database';

// ==================== PRODUCTS ====================
export const addProduct = async (product) => {
  const id = await db.products.add({
    ...product,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });
  return id;
};

export const updateProduct = async (id, product) => {
  await db.products.update(id, { ...product, updated_at: new Date().toISOString() });
};

export const deleteProduct = async (id) => {
  await db.products.delete(id);
};

export const getAllProducts = async () => {
  return await db.products.orderBy('name').toArray();
};

export const getProductById = async (id) => {
  return await db.products.get(id);
};

export const searchProducts = async (keyword) => {
  return await db.products
    .filter(p => p.code.includes(keyword) || p.name.includes(keyword) || (p.category && p.category.includes(keyword)))
    .toArray();
};

// ==================== TRANSACTIONS ====================
export const addTransaction = async (transaction) => {
  const { product_id, type, quantity, price, note, recipient_id } = transaction;

  await db.transaction('rw', db.products, db.transactions, async () => {
    const product = await db.products.get(product_id);
    await db.transactions.add({
      product_id,
      type,
      quantity,
      price: price ?? product.price ?? 0,
      note,
      recipient_id,
      created_at: new Date().toISOString()
    });

    if (type === 'import') {
      await db.products.update(product_id, {
        quantity: product.quantity + quantity,
        updated_at: new Date().toISOString()
      });
    } else {
      await db.products.update(product_id, {
        quantity: product.quantity - quantity,
        updated_at: new Date().toISOString()
      });
    }
  });
};

export const updateTransaction = async (id, newValues) => {
  await db.transaction('rw', db.products, db.transactions, async () => {
    const oldTrans = await db.transactions.get(id);
    if (!oldTrans) throw new Error('Khong tim thay giao dich');

    const oldProduct = await db.products.get(oldTrans.product_id);
    if (oldTrans.type === 'import') {
      await db.products.update(oldTrans.product_id, {
        quantity: oldProduct.quantity - oldTrans.quantity,
        updated_at: new Date().toISOString()
      });
    } else {
      await db.products.update(oldTrans.product_id, {
        quantity: oldProduct.quantity + oldTrans.quantity,
        updated_at: new Date().toISOString()
      });
    }

    const { product_id, type, quantity, price, note, recipient_id } = newValues;
    const targetProduct = await db.products.get(product_id);
    if (!targetProduct) throw new Error('Khong tim thay san pham');

    await db.transactions.update(id, {
      product_id,
      type,
      quantity,
      price: price ?? targetProduct.price ?? 0,
      note,
      recipient_id,
      updated_at: new Date().toISOString()
    });

    if (type === 'import') {
      await db.products.update(product_id, {
        quantity: targetProduct.quantity + quantity,
        updated_at: new Date().toISOString()
      });
    } else {
      await db.products.update(product_id, {
        quantity: targetProduct.quantity - quantity,
        updated_at: new Date().toISOString()
      });
    }
  });
};

export const deleteTransaction = async (id) => {
  await db.transaction('rw', db.products, db.transactions, async () => {
    const trans = await db.transactions.get(id);
    if (!trans) return;

    const product = await db.products.get(trans.product_id);
    if (trans.type === 'import') {
      await db.products.update(trans.product_id, {
        quantity: product.quantity - trans.quantity,
        updated_at: new Date().toISOString()
      });
    } else {
      await db.products.update(trans.product_id, {
        quantity: product.quantity + trans.quantity,
        updated_at: new Date().toISOString()
      });
    }

    await db.transactions.delete(id);
  });
};

export const getTransactions = async (filters = {}) => {
  let query = db.transactions;

  if (filters.product_id) {
    query = query.where('product_id').equals(filters.product_id);
  }

  let transactions = await query.toArray();

  if (filters.start_date) {
    transactions = transactions.filter(t => t.created_at >= filters.start_date);
  }
  if (filters.end_date) {
    transactions = transactions.filter(t => t.created_at <= filters.end_date);
  }
  if (filters.recipient_id) {
    transactions = transactions.filter(t => t.recipient_id === filters.recipient_id);
  }
  if (filters.type) {
    transactions = transactions.filter(t => t.type === filters.type);
  }

  transactions.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const products = await db.products.toArray();
  const recipients = await db.recipients.toArray();
  const productMap = {};
  const recipientMap = {};
  products.forEach(p => productMap[p.id] = p);
  recipients.forEach(r => recipientMap[r.id] = r);

  return transactions.map(t => ({
    ...t,
    product: productMap[t.product_id],
    recipient: recipientMap[t.recipient_id]
  }));
};

// ==================== EXPORT TO RECIPIENT (KTV/CTV) ====================
export const exportToRecipient = async (recipient_id, items, note = '') => {
  return await db.transaction('rw', db.products, db.transactions, async () => {
    for (const item of items) {
      const product = await db.products.get(item.product_id);
      if (!product) throw new Error('Khong tim thay san pham: ' + item.product_id);
      await db.products.update(item.product_id, {
        quantity: product.quantity - item.quantity,
        updated_at: new Date().toISOString()
      });
      await db.transactions.add({
        product_id: item.product_id,
        type: 'export',
        quantity: item.quantity,
        price: item.price || product.price || 0,
        note: note || 'Xuat cho KTV/CTV',
        recipient_id,
        created_at: new Date().toISOString()
      });
    }
  });
};

// ==================== RECIPIENTS ====================
export const addRecipient = async (recipient) => {
  return await db.recipients.add({
    ...recipient,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });
};

export const updateRecipient = async (id, recipient) => {
  await db.recipients.update(id, { ...recipient, updated_at: new Date().toISOString() });
};

export const deleteRecipient = async (id) => {
  await db.recipients.delete(id);
};

export const getAllRecipients = async () => {
  return await db.recipients.orderBy('name').toArray();
};

export const getRecipientById = async (id) => {
  return await db.recipients.get(id);
};

export const getRecipientsByType = async (type) => {
  return await db.recipients.where('type').equals(type).toArray();
};

export const searchRecipients = async (keyword) => {
  return await db.recipients
    .filter(r => r.code.includes(keyword) || r.name.includes(keyword) || (r.phone && r.phone.includes(keyword)) || (r.province && r.province.includes(keyword)))
    .toArray();
};

// ==================== COMBOS ====================
export const addCombo = async (combo) => {
  return await db.combos.add({
    ...combo,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });
};

export const updateCombo = async (id, combo) => {
  await db.combos.update(id, { ...combo, updated_at: new Date().toISOString() });
};

export const deleteCombo = async (id) => {
  await db.transaction('rw', db.combos, db.combo_items, async () => {
    await db.combo_items.where('combo_id').equals(id).delete();
    await db.combos.delete(id);
  });
};

export const getAllCombos = async () => {
  return await db.combos.orderBy('name').toArray();
};

export const getComboById = async (id) => {
  return await db.combos.get(id);
};

export const searchCombos = async (keyword) => {
  return await db.combos
    .filter(c => c.code.includes(keyword) || c.name.includes(keyword))
    .toArray();
};

export const addComboItem = async (item) => {
  return await db.combo_items.add({ ...item, created_at: new Date().toISOString() });
};

export const updateComboItem = async (id, quantity) => {
  await db.combo_items.update(id, { quantity });
};

export const deleteComboItem = async (id) => {
  await db.combo_items.delete(id);
};

export const getComboItems = async (comboId) => {
  const items = await db.combo_items.where('combo_id').equals(comboId).toArray();
  const products = await db.products.toArray();
  const productMap = {};
  products.forEach(p => productMap[p.id] = p);
  return items.map(item => ({ ...item, product: productMap[item.product_id] }));
};

export const processComboTransaction = async (combo_id, type, quantity_multiplier = 1, note = '', recipient_id = null) => {
  const items = await getComboItems(combo_id);

  await db.transaction('rw', db.products, db.transactions, async () => {
    for (const item of items) {
      const product = await db.products.get(item.product_id);
      const qty = item.quantity * quantity_multiplier;

      await db.transactions.add({
        product_id: item.product_id,
        type,
        quantity: qty,
        price: item.product?.price || 0,
        note: note || `Combo: ${combo_id}`,
        recipient_id,
        created_at: new Date().toISOString()
      });

      if (type === 'import') {
        await db.products.update(item.product_id, {
          quantity: product.quantity + qty,
          updated_at: new Date().toISOString()
        });
      } else {
        await db.products.update(item.product_id, {
          quantity: product.quantity - qty,
          updated_at: new Date().toISOString()
        });
      }
    }
  });
};

// ==================== INSTALLATION ORDERS ====================
export const addInstallationOrder = async (order, items) => {
  return await db.transaction('rw', db.installation_orders, db.installation_order_items, async () => {
    const orderId = await db.installation_orders.add({
      ...order,
      created_at: new Date().toISOString()
    });

    for (const item of items) {
      await db.installation_order_items.add({
        order_id: orderId,
        product_id: item.product_id,
        quantity: item.quantity,
        price: item.price,
        created_at: new Date().toISOString()
      });
    }

    return orderId;
  });
};

export const deleteInstallationOrder = async (orderId) => {
  await db.transaction('rw', db.installation_orders, db.installation_order_items, async () => {
    await db.installation_order_items.where('order_id').equals(orderId).delete();
    await db.installation_orders.delete(orderId);
  });
};

export const updateInstallationOrder = async (orderId, order, items) => {
  return await db.transaction('rw', db.installation_orders, db.installation_order_items, async () => {
    await db.installation_orders.update(orderId, {
      ...order,
      updated_at: new Date().toISOString()
    });

    await db.installation_order_items.where('order_id').equals(orderId).delete();

    for (const item of items) {
      await db.installation_order_items.add({
        order_id: orderId,
        product_id: item.product_id,
        quantity: item.quantity,
        price: item.price,
        created_at: new Date().toISOString()
      });
    }
  });
};

export const getAllInstallationOrders = async () => {
  const orders = await db.installation_orders.orderBy('order_date').reverse().toArray();
  const recipients = await db.recipients.toArray();
  const recipientMap = {};
  recipients.forEach(r => recipientMap[r.id] = r);
  return orders.map(o => ({ ...o, recipient: recipientMap[o.recipient_id] }));
};

export const getInstallationOrderItems = async (orderId) => {
  const items = await db.installation_order_items.where('order_id').equals(orderId).toArray();
  const products = await db.products.toArray();
  const productMap = {};
  products.forEach(p => productMap[p.id] = p);
  return items.map(item => ({ ...item, product: productMap[item.product_id] }));
};

// ==================== BANKING SLIPS ====================
export const addBankingSlip = async (slip) => {
  return await db.banking_slips.add({
    ...slip,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });
};

export const updateBankingSlip = async (id, slip) => {
  await db.banking_slips.update(id, { ...slip, updated_at: new Date().toISOString() });
};

export const deleteBankingSlip = async (id) => {
  await db.transaction('rw', db.banking_slips, db.banking_slip_orders, async () => {
    await db.banking_slip_orders.where('banking_slip_id').equals(id).delete();
    await db.banking_slips.delete(id);
  });
};

export const getAllBankingSlips = async () => {
  const slips = await db.banking_slips.orderBy('transfer_date').reverse().toArray();
  const recipients = await db.recipients.toArray();
  const recipientMap = {};
  recipients.forEach(r => recipientMap[r.id] = r);
  return slips.map(s => ({ ...s, recipient: recipientMap[s.recipient_id] }));
};

export const addBankingSlipOrder = async (slipId, orderId) => {
  return await db.banking_slip_orders.add({
    banking_slip_id: slipId,
    installation_order_id: orderId,
    created_at: new Date().toISOString()
  });
};

export const getBankingSlipOrders = async (slipId) => {
  const bso = await db.banking_slip_orders.where('banking_slip_id').equals(slipId).toArray();
  const orders = await db.installation_orders.toArray();
  const orderMap = {};
  orders.forEach(o => orderMap[o.id] = o);
  const recipients = await db.recipients.toArray();
  const recipientMap = {};
  recipients.forEach(r => recipientMap[r.id] = r);
  return bso.map(item => ({
    ...item,
    order: { ...orderMap[item.installation_order_id], recipient: recipientMap[orderMap[item.installation_order_id]?.recipient_id] }
  }));
};

export const deleteBankingSlipOrder = async (id) => {
  await db.banking_slip_orders.delete(id);
};

// ==================== DROP STOCKS ====================
export const createDropStock = async (dropStock, installationOrderIds) => {
  return await db.transaction('rw', db.drop_stocks, db.drop_stock_orders, async () => {
    const dropStockId = await db.drop_stocks.add({
      date: dropStock.date,
      note: dropStock.note || '',
      created_at: new Date().toISOString()
    });

    for (const orderId of installationOrderIds) {
      await db.drop_stock_orders.add({
        drop_stock_id: dropStockId,
        installation_order_id: orderId,
        created_at: new Date().toISOString()
      });
    }

    return dropStockId;
  });
};

export const getAllDropStocks = async () => {
  const dropStocks = await db.drop_stocks.orderBy('date').reverse().toArray();

  const result = [];
  for (const ds of dropStocks) {
    const links = await db.drop_stock_orders.where('drop_stock_id').equals(ds.id).toArray();
    const orderIds = links.map(l => l.installation_order_id);

    let totalAmount = 0;
    let totalOrders = orderIds.length;
    let orderCodes = [];

    if (orderIds.length > 0) {
      const orders = await db.installation_orders.where('id').anyOf(orderIds).toArray();
      totalAmount = orders.reduce((sum, o) => sum + (o.total_value || 0), 0);
      orderCodes = orders.map(o => o.code);
    }

    result.push({
      ...ds,
      total_orders: totalOrders,
      total_amount: totalAmount,
      order_codes: orderCodes.join(', ')
    });
  }

  return result;
};

export const getDropStockDetail = async (dropStockId) => {
  const dropStock = await db.drop_stocks.get(dropStockId);
  if (!dropStock) return null;

  const links = await db.drop_stock_orders.where('drop_stock_id').equals(dropStockId).toArray();
  const orderIds = links.map(l => l.installation_order_id);

  const orders = await db.installation_orders.where('id').anyOf(orderIds).toArray();
  const orderItems = await db.installation_order_items.where('order_id').anyOf(orderIds).toArray();
  const products = await db.products.toArray();
  const recipients = await db.recipients.toArray();

  const productMap = {};
  products.forEach(p => productMap[p.id] = p);
  const recipientMap = {};
  recipients.forEach(r => recipientMap[r.id] = r);

  const ordersWithDetails = orders.map(o => {
    const items = orderItems.filter(i => i.order_id === o.id);
    const itemsWithProduct = items.map(i => ({ ...i, product: productMap[i.product_id] }));
    return {
      ...o,
      recipient: recipientMap[o.recipient_id],
      items: itemsWithProduct
    };
  });

  const grouped_by_technician = {};
  let grandTotal = 0;

  ordersWithDetails.forEach(o => {
    const recipientId = o.recipient_id;
    const recipient = o.recipient;
    if (!grouped_by_technician[recipientId]) {
      grouped_by_technician[recipientId] = {
        recipient,
        orders: [],
        total_amount: 0
      };
    }
    grouped_by_technician[recipientId].orders.push(o);
    grouped_by_technician[recipientId].total_amount += o.total_value || 0;
    grandTotal += o.total_value || 0;
  });

  return {
    ...dropStock,
    grouped_by_technician: Object.values(grouped_by_technician),
    grand_total: grandTotal,
    total_orders: orders.length
  };
};

export const deleteDropStock = async (id) => {
  await db.transaction('rw', db.drop_stocks, db.drop_stock_orders, async () => {
    await db.drop_stock_orders.where('drop_stock_id').equals(id).delete();
    await db.drop_stocks.delete(id);
  });
};

export const getAvailableInstallationOrders = async () => {
  const allOrders = await db.installation_orders.orderBy('order_date').reverse().toArray();
  const allLinks = await db.drop_stock_orders.toArray();
  const linkedOrderIds = new Set(allLinks.map(l => l.installation_order_id));

  const availableOrders = allOrders.filter(o => !linkedOrderIds.has(o.id));

  const recipients = await db.recipients.toArray();
  const recipientMap = {};
  recipients.forEach(r => recipientMap[r.id] = r);

  return availableOrders.map(o => ({ ...o, recipient: recipientMap[o.recipient_id] }));
};

export const updateDropStock = async (id, dropStock, installationOrderIds) => {
  return await db.transaction('rw', db.drop_stocks, db.drop_stock_orders, async () => {
    await db.drop_stocks.update(id, {
      date: dropStock.date,
      note: dropStock.note || '',
      status: dropStock.status || 'draft',
      updated_at: new Date().toISOString()
    });

    await db.drop_stock_orders.where('drop_stock_id').equals(id).delete();

    for (const orderId of installationOrderIds) {
      await db.drop_stock_orders.add({
        drop_stock_id: id,
        installation_order_id: orderId,
        created_at: new Date().toISOString()
      });
    }
  });
};

export const updateDropStockStatus = async (id, status) => {
  await db.drop_stocks.update(id, {
    status,
    updated_at: new Date().toISOString()
  });
};

// ==================== REPORTS ====================
export const getRecipientExportReport = async (recipientId = null, startDate = null, endDate = null) => {
  let query = db.transactions.where('type').equals('export');
  let transactions = await query.toArray();

  if (recipientId) {
    transactions = transactions.filter(t => t.recipient_id === recipientId);
  }
  if (startDate) {
    transactions = transactions.filter(t => t.created_at >= startDate);
  }
  if (endDate) {
    transactions = transactions.filter(t => t.created_at <= endDate);
  }

  transactions.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const products = await db.products.toArray();
  const recipients = await db.recipients.toArray();
  const productMap = {};
  const recipientMap = {};
  products.forEach(p => productMap[p.id] = p);
  recipients.forEach(r => recipientMap[r.id] = r);

  return transactions.map(t => ({
    ...t,
    product: productMap[t.product_id],
    recipient: recipientMap[t.recipient_id]
  }));
};

// ==================== STATISTICS ====================
export const getStatistics = async () => {
  const products = await db.products.toArray();
  const transactions = await db.transactions.toArray();

  const total_products = products.length;
  const total_quantity = products.reduce((sum, p) => sum + p.quantity, 0);
  const total_value = products.reduce((sum, p) => sum + (p.quantity * p.price), 0);
  const low_stock_count = products.filter(p => p.quantity <= p.min_stock).length;
  const total_import = transactions.filter(t => t.type === 'import').reduce((sum, t) => sum + t.quantity, 0);
  const total_export = transactions.filter(t => t.type === 'export').reduce((sum, t) => sum + t.quantity, 0);

  return { total_products, total_quantity, total_value, low_stock_count, total_import, total_export };
};

export const getLowStockProducts = async () => {
  const products = await db.products.toArray();
  return products.filter(p => p.quantity <= p.min_stock).sort((a, b) => a.quantity - b.quantity);
};

export const getCategoryStats = async () => {
  const products = await db.products.toArray();
  const categories = {};
  products.forEach(p => {
    if (!categories[p.category]) categories[p.category] = { count: 0, total_qty: 0, total_value: 0 };
    categories[p.category].count++;
    categories[p.category].total_qty += p.quantity;
    categories[p.category].total_value += p.quantity * p.price;
  });
  return Object.entries(categories).sort((a, b) => b[1].total_value - a[1].total_value);
};
