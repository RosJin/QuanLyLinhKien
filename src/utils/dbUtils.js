import supabase from './supabaseClient';

// ==================== PRODUCTS ====================
export const addProduct = async (product) => {
  const { data, error } = await supabase.from('products').insert({
    ...product,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }).select('id').single();
  if (error) throw error;
  return data.id;
};

export const updateProduct = async (id, product) => {
  const { error } = await supabase.from('products').update({
    ...product,
    updated_at: new Date().toISOString()
  }).eq('id', id);
  if (error) throw error;
};

export const deleteProduct = async (id) => {
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) throw error;
};

export const getAllProducts = async (type = null) => {
  let query = supabase.from('products').select('*');
  if (type) query = query.eq('type', type);
  const { data, error } = await query.order('name');
  if (error) throw error;
  return data || [];
};

export const getProductsByType = async (type) => {
  const { data, error } = await supabase.from('products').select('*').eq('type', type).order('name');
  if (error) throw error;
  return data || [];
};

export const getProductById = async (id) => {
  const { data, error } = await supabase.from('products').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
};

export const searchProducts = async (keyword, type = null) => {
  let query = supabase.from('products').select('*').or(`code.ilike.%${keyword}%,name.ilike.%${keyword}%,category.ilike.%${keyword}%`);
  if (type) query = query.eq('type', type);
  const { data, error } = await query.order('name');
  if (error) throw error;
  return data || [];
};

// ==================== TRANSACTIONS ====================
export const addTransaction = async (transaction) => {
  const { product_id, type, quantity, price, note, recipient_id } = transaction;

  // Get current product
  const product = await getProductById(product_id);
  if (!product) throw new Error('Khong tim thay san pham');

  // Calculate new quantity
  const newQuantity = type === 'import'
    ? product.quantity + quantity
    : product.quantity - quantity;

  // Insert transaction
  const { error: transError } = await supabase.from('transactions').insert({
    product_id,
    type,
    quantity,
    price: price ?? product.price ?? 0,
    note,
    recipient_id,
    created_at: new Date().toISOString()
  });
  if (transError) throw transError;

  // Update product quantity
  const { error: prodError } = await supabase.from('products').update({
    quantity: newQuantity,
    updated_at: new Date().toISOString()
  }).eq('id', product_id);
  if (prodError) throw prodError;
};

export const updateTransaction = async (id, newValues) => {
  // Get old transaction
  const { data: oldTrans, error: oldError } = await supabase.from('transactions').select('*').eq('id', id).single();
  if (oldError) throw oldError;
  if (!oldTrans) throw new Error('Khong tim thay giao dich');

  // Revert old transaction effect on product
  const oldProduct = await getProductById(oldTrans.product_id);
  if (oldProduct) {
    const revertQuantity = oldTrans.type === 'import'
      ? oldProduct.quantity - oldTrans.quantity
      : oldProduct.quantity + oldTrans.quantity;

    await supabase.from('products').update({
      quantity: revertQuantity,
      updated_at: new Date().toISOString()
    }).eq('id', oldTrans.product_id);
  }

  // Apply new transaction
  const { product_id, type, quantity, price, note, recipient_id } = newValues;
  const targetProduct = await getProductById(product_id);
  if (!targetProduct) throw new Error('Khong tim thay san pham');

  const newQuantity = type === 'import'
    ? targetProduct.quantity + quantity
    : targetProduct.quantity - quantity;

  // Update transaction
  const { error: updateError } = await supabase.from('transactions').update({
    product_id,
    type,
    quantity,
    price: price ?? targetProduct.price ?? 0,
    note,
    recipient_id,
    updated_at: new Date().toISOString()
  }).eq('id', id);
  if (updateError) throw updateError;

  // Update product with new quantity
  const { error: prodError } = await supabase.from('products').update({
    quantity: newQuantity,
    updated_at: new Date().toISOString()
  }).eq('id', product_id);
  if (prodError) throw prodError;
};

export const deleteTransaction = async (id) => {
  const { data: trans, error: getError } = await supabase.from('transactions').select('*').eq('id', id).single();
  if (getError) throw getError;
  if (!trans) return;

  // Revert effect on product
  const product = await getProductById(trans.product_id);
  if (product) {
    const revertQuantity = trans.type === 'import'
      ? product.quantity - trans.quantity
      : product.quantity + trans.quantity;

    await supabase.from('products').update({
      quantity: revertQuantity,
      updated_at: new Date().toISOString()
    }).eq('id', trans.product_id);
  }

  // Delete transaction
  const { error: deleteError } = await supabase.from('transactions').delete().eq('id', id);
  if (deleteError) throw deleteError;
};

export const getTransactions = async (filters = {}) => {
  let query = supabase.from('transactions').select('*, product:products(*), recipient:recipients(*)');

  if (filters.product_id) {
    query = query.eq('product_id', filters.product_id);
  }
  if (filters.recipient_id) {
    query = query.eq('recipient_id', filters.recipient_id);
  }
  if (filters.type) {
    query = query.eq('type', filters.type);
  }
  if (filters.start_date) {
    query = query.gte('created_at', filters.start_date);
  }
  if (filters.end_date) {
    query = query.lte('created_at', filters.end_date);
  }

  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
};

// ==================== EXPORT TO RECIPIENT (KTV/CTV) ====================
export const exportToRecipient = async (recipient_id, items, note = '') => {
  for (const item of items) {
    const product = await getProductById(item.product_id);
    if (!product) throw new Error('Khong tim thay san pham: ' + item.product_id);

    const newQuantity = product.quantity - item.quantity;
    await supabase.from('products').update({
      quantity: newQuantity,
      updated_at: new Date().toISOString()
    }).eq('id', item.product_id);

    await supabase.from('transactions').insert({
      product_id: item.product_id,
      type: 'export',
      quantity: item.quantity,
      price: item.price || product.price || 0,
      note: note || 'Xuat cho KTV/CTV',
      recipient_id,
      created_at: new Date().toISOString()
    });
  }
};

// ==================== RECIPIENTS ====================
export const addRecipient = async (recipient) => {
  const { data, error } = await supabase.from('recipients').insert({
    ...recipient,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }).select('id').single();
  if (error) throw error;
  return data.id;
};

export const updateRecipient = async (id, recipient) => {
  const { error } = await supabase.from('recipients').update({
    ...recipient,
    updated_at: new Date().toISOString()
  }).eq('id', id);
  if (error) throw error;
};

export const deleteRecipient = async (id) => {
  const { error } = await supabase.from('recipients').delete().eq('id', id);
  if (error) throw error;
};

export const getAllRecipients = async () => {
  const { data, error } = await supabase.from('recipients').select('*').order('name');
  if (error) throw error;
  return data || [];
};

export const getRecipientById = async (id) => {
  const { data, error } = await supabase.from('recipients').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
};

export const getRecipientsByType = async (type) => {
  const { data, error } = await supabase.from('recipients').select('*').eq('type', type);
  if (error) throw error;
  return data || [];
};

export const searchRecipients = async (keyword) => {
  const { data, error } = await supabase.from('recipients').select('*').or(`code.ilike.%${keyword}%,name.ilike.%${keyword}%,phone.ilike.%${keyword}%,province.ilike.%${keyword}%`);
  if (error) throw error;
  return data || [];
};

// ==================== COMBOS ====================
export const addCombo = async (combo) => {
  const { data, error } = await supabase.from('combos').insert({
    ...combo,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }).select('id').single();
  if (error) throw error;
  return data.id;
};

export const updateCombo = async (id, combo) => {
  const { error } = await supabase.from('combos').update({
    ...combo,
    updated_at: new Date().toISOString()
  }).eq('id', id);
  if (error) throw error;
};

export const deleteCombo = async (id) => {
  // Delete combo items first (cascade should handle this, but being explicit)
  await supabase.from('combo_items').delete().eq('combo_id', id);
  const { error } = await supabase.from('combos').delete().eq('id', id);
  if (error) throw error;
};

export const getAllCombos = async () => {
  const { data, error } = await supabase.from('combos').select('*').order('name');
  if (error) throw error;
  return data || [];
};

export const getComboById = async (id) => {
  const { data, error } = await supabase.from('combos').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
};

export const searchCombos = async (keyword) => {
  const { data, error } = await supabase.from('combos').select('*').or(`code.ilike.%${keyword}%,name.ilike.%${keyword}%`);
  if (error) throw error;
  return data || [];
};

export const addComboItem = async (item) => {
  const { error } = await supabase.from('combo_items').insert({
    ...item,
    created_at: new Date().toISOString()
  });
  if (error) throw error;
};

export const updateComboItem = async (id, quantity) => {
  const { error } = await supabase.from('combo_items').update({ quantity }).eq('id', id);
  if (error) throw error;
};

export const deleteComboItem = async (id) => {
  const { error } = await supabase.from('combo_items').delete().eq('id', id);
  if (error) throw error;
};

export const getComboItems = async (comboId) => {
  const { data, error } = await supabase.from('combo_items').select('*, product:products(*)').eq('combo_id', comboId);
  if (error) throw error;
  return data || [];
};

export const processComboTransaction = async (combo_id, type, quantity_multiplier = 1, note = '', recipient_id = null) => {
  const items = await getComboItems(combo_id);

  for (const item of items) {
    const product = await getProductById(item.product_id);
    if (!product) continue;

    const qty = item.quantity * quantity_multiplier;

    await supabase.from('transactions').insert({
      product_id: item.product_id,
      type,
      quantity: qty,
      price: item.product?.price || 0,
      note: note || `Combo: ${combo_id}`,
      recipient_id,
      created_at: new Date().toISOString()
    });

    const newQuantity = type === 'import'
      ? product.quantity + qty
      : product.quantity - qty;

    await supabase.from('products').update({
      quantity: newQuantity,
      updated_at: new Date().toISOString()
    }).eq('id', item.product_id);
  }
};

// ==================== INSTALLATION ORDERS ====================
export const addInstallationOrder = async (order, items) => {
  const { data: orderData, error: orderError } = await supabase.from('installation_orders').insert({
    ...order,
    created_at: new Date().toISOString()
  }).select('id').single();
  if (orderError) throw orderError;

  const orderId = orderData.id;

  for (const item of items) {
    await supabase.from('installation_order_items').insert({
      order_id: orderId,
      product_id: item.product_id,
      quantity: item.quantity,
      price: item.price,
      created_at: new Date().toISOString()
    });
  }

  return orderId;
};

export const deleteInstallationOrder = async (orderId) => {
  await supabase.from('installation_order_items').delete().eq('order_id', orderId);
  await supabase.from('installation_orders').delete().eq('id', orderId);
};

export const updateInstallationOrder = async (orderId, order, items) => {
  const { error: updateError } = await supabase.from('installation_orders').update({
    ...order,
    updated_at: new Date().toISOString()
  }).eq('id', orderId);
  if (updateError) throw updateError;

  // Delete old items
  await supabase.from('installation_order_items').delete().eq('order_id', orderId);

  // Insert new items
  for (const item of items) {
    await supabase.from('installation_order_items').insert({
      order_id: orderId,
      product_id: item.product_id,
      quantity: item.quantity,
      price: item.price,
      created_at: new Date().toISOString()
    });
  }
};

export const getAllInstallationOrders = async () => {
  const { data: orders, error: ordersError } = await supabase.from('installation_orders').select('*, recipient:recipients(*)').order('order_date', { ascending: false });
  if (ordersError) throw ordersError;
  return orders || [];
};

export const getInstallationOrderItems = async (orderId) => {
  const { data, error } = await supabase.from('installation_order_items').select('*, product:products(*)').eq('order_id', orderId);
  if (error) throw error;
  return data || [];
};

export const getAllInstallationOrderItems = async () => {
  const { data, error } = await supabase.from('installation_order_items').select('*, product:products(*)');
  if (error) throw error;
  return data || [];
};

// ==================== BANKING SLIPS ====================
export const addBankingSlip = async (slip) => {
  const { data, error } = await supabase.from('banking_slips').insert({
    ...slip,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }).select('id').single();
  if (error) throw error;
  return data.id;
};

export const updateBankingSlip = async (id, slip) => {
  const { error } = await supabase.from('banking_slips').update({
    ...slip,
    updated_at: new Date().toISOString()
  }).eq('id', id);
  if (error) throw error;
};

export const deleteBankingSlip = async (id) => {
  await supabase.from('banking_slip_orders').delete().eq('banking_slip_id', id);
  const { error } = await supabase.from('banking_slips').delete().eq('id', id);
  if (error) throw error;
};

export const getAllBankingSlips = async () => {
  const { data, error } = await supabase.from('banking_slips').select('*, recipient:recipients(*)').order('transfer_date', { ascending: false });
  if (error) throw error;
  return data || [];
};

export const addBankingSlipOrder = async (slipId, orderId) => {
  const { error } = await supabase.from('banking_slip_orders').insert({
    banking_slip_id: slipId,
    installation_order_id: orderId,
    created_at: new Date().toISOString()
  });
  if (error) throw error;
};

export const getBankingSlipOrders = async (slipId) => {
  const { data, error } = await supabase.from('banking_slip_orders').select(`
    *,
    order:installation_orders(
      *,
      recipient:recipients(*)
    )
  `).eq('banking_slip_id', slipId);
  if (error) throw error;
  return (data || []).map(item => ({
    ...item,
    order: item.order
  }));
};

export const deleteBankingSlipOrder = async (id) => {
  const { error } = await supabase.from('banking_slip_orders').delete().eq('id', id);
  if (error) throw error;
};

// ==================== DROP STOCKS ====================
export const createDropStock = async (dropStock, installationOrderIds) => {
  const { data, error } = await supabase.from('drop_stocks').insert({
    date: dropStock.date,
    note: dropStock.note || '',
    created_at: new Date().toISOString()
  }).select('id').single();
  if (error) throw error;

  const dropStockId = data.id;

  for (const orderId of installationOrderIds) {
    await supabase.from('drop_stock_orders').insert({
      drop_stock_id: dropStockId,
      installation_order_id: orderId,
      created_at: new Date().toISOString()
    });
  }

  return dropStockId;
};

export const getAllDropStocks = async () => {
  const { data: dropStocks, error } = await supabase.from('drop_stocks').select('*').order('date', { ascending: false });
  if (error) throw error;

  const result = [];
  for (const ds of (dropStocks || [])) {
    const detail = await getDropStockDetail(ds.id);
    if (detail) result.push(detail);
  }

  return result;
};

export const getDropStockDetail = async (dropStockId) => {
  const { data: dropStock, error } = await supabase.from('drop_stocks').select('*').eq('id', dropStockId).single();
  if (error) throw error;
  if (!dropStock) return null;

  const { data: links, error: linksError } = await supabase.from('drop_stock_orders').select('installation_order_id').eq('drop_stock_id', dropStockId);
  if (linksError) throw linksError;

  const orderIds = (links || []).map(l => l.installation_order_id);

  if (orderIds.length === 0) {
    return {
      ...dropStock,
      grouped_by_technician: [],
      grand_total: 0,
      total_orders: 0
    };
  }

  const { data: orders, error: ordersError } = await supabase.from('installation_orders').select('*, recipient:recipients(*)').in('id', orderIds);
  if (ordersError) throw ordersError;

  const { data: orderItems, error: itemsError } = await supabase.from('installation_order_items').select('*, product:products(*)').in('order_id', orderIds);
  if (itemsError) throw itemsError;

  const ordersWithDetails = (orders || []).map(o => ({
    ...o,
    items: (orderItems || []).filter(i => i.order_id === o.id)
  }));

  const grouped_by_technician = {};
  let grandTotal = 0;

  for (const o of ordersWithDetails) {
    const recipientId = o.recipient_id;
    if (!grouped_by_technician[recipientId]) {
      grouped_by_technician[recipientId] = {
        recipient: o.recipient,
        orders: [],
        total_amount: 0
      };
    }
    grouped_by_technician[recipientId].orders.push(o);
    grouped_by_technician[recipientId].total_amount += o.total_value || 0;
    grandTotal += o.total_value || 0;
  }

  return {
    ...dropStock,
    grouped_by_technician: Object.values(grouped_by_technician),
    grand_total: grandTotal,
    total_orders: orders.length
  };
};

export const deleteDropStock = async (id) => {
  await supabase.from('drop_stock_orders').delete().eq('drop_stock_id', id);
  await supabase.from('drop_stocks').delete().eq('id', id);
};

export const getAvailableInstallationOrders = async () => {
  const { data: allOrders, error: ordersError } = await supabase.from('installation_orders').select('*, recipient:recipients(*)').order('order_date', { ascending: false });
  if (ordersError) throw ordersError;

  const { data: allLinks, error: linksError } = await supabase.from('drop_stock_orders').select('installation_order_id');
  if (linksError) throw linksError;

  const linkedOrderIds = new Set((allLinks || []).map(l => l.installation_order_id));

  return (allOrders || []).filter(o => !linkedOrderIds.has(o.id));
};

export const updateDropStock = async (id, dropStock, installationOrderIds) => {
  const { error: updateError } = await supabase.from('drop_stocks').update({
    date: dropStock.date,
    note: dropStock.note || '',
    status: dropStock.status || 'draft'
  }).eq('id', id);
  if (updateError) throw updateError;

  // Delete old links
  await supabase.from('drop_stock_orders').delete().eq('drop_stock_id', id);

  // Insert new links
  for (const orderId of installationOrderIds) {
    await supabase.from('drop_stock_orders').insert({
      drop_stock_id: id,
      installation_order_id: orderId,
      created_at: new Date().toISOString()
    });
  }
};

export const updateDropStockStatus = async (id, status) => {
  const { error } = await supabase.from('drop_stocks').update({
    status
  }).eq('id', id);
  if (error) throw error;
};

// ==================== REPORTS ====================
export const getRecipientExportReport = async (recipientId = null, startDate = null, endDate = null) => {
  let query = supabase.from('transactions').select('*, product:products(*), recipient:recipients(*)').eq('type', 'export');

  if (recipientId) {
    query = query.eq('recipient_id', recipientId);
  }
  if (startDate) {
    query = query.gte('created_at', startDate);
  }
  if (endDate) {
    query = query.lte('created_at', endDate);
  }

  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
};

// ==================== STATISTICS ====================
export const getStatistics = async () => {
  const { data: products, error: productsError } = await supabase.from('products').select('*').eq('type', 'product');
  if (productsError) throw productsError;

  const { data: transactions, error: transError } = await supabase.from('transactions').select('*');
  if (transError) throw transError;

  const total_products = (products || []).length;
  const total_quantity = (products || []).reduce((sum, p) => sum + p.quantity, 0);
  const total_value = (products || []).reduce((sum, p) => sum + (p.quantity * p.price), 0);
  const low_stock_count = (products || []).filter(p => p.quantity <= p.min_stock).length;
  const total_import = (transactions || []).filter(t => t.type === 'import').reduce((sum, t) => sum + t.quantity, 0);
  const total_export = (transactions || []).filter(t => t.type === 'export').reduce((sum, t) => sum + t.quantity, 0);

  return { total_products, total_quantity, total_value, low_stock_count, total_import, total_export };
};

export const getLowStockProducts = async () => {
  const { data, error } = await supabase.from('products').select('*').eq('type', 'product').order('quantity');
  if (error) throw error;
  return (data || []).filter(p => p.quantity <= p.min_stock);
};

export const getCategoryStats = async () => {
  const { data: products, error } = await supabase.from('products').select('*').eq('type', 'product');
  if (error) throw error;

  const categories = {};
  (products || []).forEach(p => {
    const cat = p.category || 'Chua phan loai';
    if (!categories[cat]) categories[cat] = { count: 0, total_qty: 0, total_value: 0 };
    categories[cat].count++;
    categories[cat].total_qty += p.quantity;
    categories[cat].total_value += p.quantity * p.price;
  });

  return Object.entries(categories).sort((a, b) => b[1].total_value - a[1].total_value);
};
