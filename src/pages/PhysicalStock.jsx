import { useCallback, useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Select, InputNumber, Input, Radio, Space, Tag, message, Typography, DatePicker, Popconfirm } from 'antd';
import { ImportOutlined, ExportOutlined, EditOutlined, DeleteOutlined, ClearOutlined } from '@ant-design/icons';
import { getTransactions, getAllProducts, getAllRecipients, addTransaction, updateTransaction, deleteTransaction, getAllCombos, getComboItems, processComboTransaction, processBatchTransaction } from '../utils/dbUtils';
import dayjs from 'dayjs';
import useMobile from '../hooks/useMobile';

const { Text } = Typography;
const { RangePicker } = DatePicker;

const PhysicalStock = () => {
  const isMobile = useMobile();
  const [transactions, setTransactions] = useState([]);
  const [products, setProducts] = useState([]);
  const [recipients, setRecipients] = useState([]);
  const [combos, setCombos] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [transType, setTransType] = useState('import');
  const [selectedType, setSelectedType] = useState('product');
  const [comboItems, setComboItems] = useState([]);
  const [batchItems, setBatchItems] = useState([]);
  const [batchPickerProductId, setBatchPickerProductId] = useState(null);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [form] = Form.useForm();

  // Filter states
  const [filterProductId, setFilterProductId] = useState(null);
  const [filterRecipientId, setFilterRecipientId] = useState(null);
  const [filterType, setFilterType] = useState(null);
  const [filterDateRange, setFilterDateRange] = useState(null);

  // Load static data
  useEffect(() => {
    const loadStatic = async () => {
      const [prods, recips, cmb] = await Promise.all([
        getAllProducts('product'),
        getAllRecipients(),
        getAllCombos()
      ]);
      setProducts(prods);
      setRecipients(recips);
      setCombos(cmb);
    };
    loadStatic();
  }, []);

  const reloadTransactions = useCallback(async () => {
    const filters = {};
    if (filterProductId) filters.product_id = filterProductId;
    if (filterRecipientId) filters.recipient_id = filterRecipientId;
    if (filterType) filters.type = filterType;
    if (filterDateRange && filterDateRange[0]) filters.start_date = filterDateRange[0].startOf('day').toISOString();
    if (filterDateRange && filterDateRange[1]) filters.end_date = filterDateRange[1].endOf('day').toISOString();

    const trans = await getTransactions(filters);
    setTransactions(trans);
  }, [filterProductId, filterRecipientId, filterType, filterDateRange]);

  // Reload transactions when filters change
  useEffect(() => {
    const timer = setTimeout(() => {
      reloadTransactions();
    }, 0);
    return () => clearTimeout(timer);
  }, [reloadTransactions]);

  const handleAddTransaction = (type) => {
    setEditingTransaction(null);
    setTransType(type);
    setSelectedType('product');
    setComboItems([]);
    setBatchItems([]);
    setBatchPickerProductId(null);
    form.resetFields();
    form.setFieldsValue({
      type,
      batch_items: [{ quantity: 1 }]
    });
    setIsModalOpen(true);
  };

  const handleEditTransaction = (record) => {
    setEditingTransaction(record);
    setTransType(record.type);
    setSelectedType('product');
    setComboItems([]);
    form.resetFields();
    form.setFieldsValue({
      type: record.type,
      product_id: record.product_id,
      quantity: record.quantity,
      price: record.price,
      recipient_id: record.recipient_id,
      note: record.note,
      transaction_date: record.created_at ? dayjs(record.created_at) : null
    });
    setIsModalOpen(true);
  };

  const handleDeleteTransaction = async (id) => {
    try {
      await deleteTransaction(id);
      message.success('Xóa giao dịch thành công');
      reloadTransactions();
    } catch (error) {
      message.error('Lỗi khi xóa giao dịch');
      console.error(error);
    }
  };

  const handleComboChange = async (comboId) => {
    if (comboId) {
      const items = await getComboItems(comboId);
      setComboItems(items);
    } else {
      setComboItems([]);
    }
  };

  const addBatchProduct = (productId = null) => {
    const id = productId || batchPickerProductId;
    if (!id) {
      message.warning('Vui lòng chọn linh kiện');
      return;
    }

    const product = products.find(p => p.id === id);
    if (!product) {
      message.warning('Không tìm thấy linh kiện');
      return;
    }

    setBatchItems(prev => {
      const existing = prev.find(item => item.product_id === product.id);
      if (existing) {
        return prev.map(item => (
          item.product_id === product.id
            ? { ...item, quantity: (item.quantity || 0) + 1 }
            : item
        ));
      }

      return [...prev, { product_id: product.id, quantity: 1, price: product.price || 0 }];
    });

    setBatchPickerProductId(null);
  };

  const handleBatchProductSelect = (productId) => {
    addBatchProduct(productId);
  };

  const updateBatchQuantity = (productId, quantity) => {
    setBatchItems(prev => prev.map(item => (
      item.product_id === productId
        ? { ...item, quantity }
        : item
    )));
  };

  const removeBatchProduct = (productId) => {
    setBatchItems(prev => prev.filter(item => item.product_id !== productId));
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      // Không lưu recipient_id khi nhập kho
      if (transType === 'import') {
        values.recipient_id = null;
      }

      if (editingTransaction) {
        await updateTransaction(editingTransaction.id, values);
        message.success('Cập nhật giao dịch thành công');
      } else {
        if (selectedType === 'combo') {
          if (!values.combo_id) {
            message.warning('Vui lòng chọn Combo');
            return;
          }
          const qty = values.quantity || 1;
          await processComboTransaction(values.combo_id, transType, qty, values.note || '', values.recipient_id);
          message.success(`Xử lý Combo ${transType === 'import' ? 'nhập' : 'xuất'} thành công`);
        } else if (selectedType === 'batch') {
          if (transType === 'export') {
            const recipientIds = Array.isArray(values.recipient_id) ? values.recipient_id.filter(Boolean) : (values.recipient_id ? [values.recipient_id] : []);
            if (!recipientIds.length) {
              message.warning('Vui lòng chọn ít nhất một KTV/CTV');
              return;
            }

            for (const recipientId of recipientIds) {
              await processBatchTransaction(batchItems, transType, values.note || '', recipientId);
            }
          } else {
            await processBatchTransaction(batchItems, transType, values.note || '', null);
          }
          message.success(`${transType === 'import' ? 'Nhập' : 'Xuất'} nhiều linh kiện thành công`);
        } else {
          await addTransaction(values);
          message.success(`${transType === 'import' ? 'Nhập' : 'Xuất'} kho thành công`);
        }
      }

      setIsModalOpen(false);
      setEditingTransaction(null);
      reloadTransactions();
    } catch (error) {
      console.error(error);
    }
  };

  const handleResetFilters = () => {
    setFilterProductId(null);
    setFilterRecipientId(null);
    setFilterType(null);
    setFilterDateRange(null);
  };

  const columns = [
    { title: 'Ngày', dataIndex: 'created_at', key: 'created_at', width: isMobile ? 90 : 110, render: (val) => val ? dayjs(val).format('DD/MM/YYYY HH:mm') : '' },
    { title: 'Mã SP', key: 'product_code', width: isMobile ? 80 : 100, render: (_, r) => r.product?.code || '' },
    { title: 'Tên SP', key: 'product_name', width: isMobile ? 100 : 150, render: (_, r) => r.product?.name || '' },
    {
      title: 'Loại',
      dataIndex: 'type',
      key: 'type',
      width: isMobile ? 60 : 80,
      render: (type) => (
        <Tag color={type === 'import' ? 'green' : 'blue'}>
          {type === 'import' ? 'Nhập' : 'Xuất'}
        </Tag>
      )
    },
    { title: 'SL', dataIndex: 'quantity', key: 'quantity', width: isMobile ? 50 : 70 },
    { title: 'Thành tiền', key: 'total', width: isMobile ? 100 : 130, render: (_, r) => ((r.quantity || 0) * (r.price || r.product?.price || 0)).toLocaleString('vi-VN') + ' đ' },
    { title: 'Ghi chú', dataIndex: 'note', key: 'note', ellipsis: true, width: isMobile ? 80 : 120 },
    { title: 'Người nhận', key: 'recipient_name', width: isMobile ? 100 : 150, render: (_, r) => r.recipient?.name || '' },
    {
      title: 'Thao tác',
      key: 'actions',
      width: isMobile ? 70 : 120,
      render: (_, record) => (
        <Space size="small" wrap>
          <Button type="link" size={isMobile ? 'small' : 'middle'} icon={<EditOutlined />} onClick={() => handleEditTransaction(record)} />
          <Popconfirm title="Xóa giao dịch?" onConfirm={() => handleDeleteTransaction(record.id)} okText="Xóa" cancelText="Hủy">
            <Button type="link" danger size={isMobile ? 'small' : 'middle'} icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <Button type="primary" icon={<ImportOutlined />} onClick={() => handleAddTransaction('import')} style={{ marginRight: 8 }}>
            Nhập kho
          </Button>
          <Button type="primary" icon={<ExportOutlined />} onClick={() => handleAddTransaction('export')} danger>
            Xuất kho
          </Button>
          
        </div>
      </div>

      <div style={{ marginBottom: 16, padding: 16, background: '#fafafa', borderRadius: 8 }}>
        <Space direction={isMobile ? 'vertical' : 'horizontal'} size={[8, 8]} style={{ width: isMobile ? '100%' : 'auto' }}>
          <Select
            placeholder="Sản phẩm"
            allowClear
            showSearch
            optionFilterProp="children"
            style={{ width: isMobile ? '100%' : 200 }}
            value={filterProductId}
            onChange={setFilterProductId}
          >
            {products.map(p => (
              <Select.Option key={p.id} value={p.id}>{p.code} - {p.name}</Select.Option>
            ))}
          </Select>

          <Select
            placeholder="Người nhận"
            allowClear
            showSearch
            optionFilterProp="children"
            style={{ width: isMobile ? '100%' : 200 }}
            value={filterRecipientId}
            onChange={setFilterRecipientId}
          >
            {recipients.map(r => (
              <Select.Option key={r.id} value={r.id}>{r.code} - {r.name}</Select.Option>
            ))}
          </Select>

          <Select
            placeholder="Loại giao dịch"
            allowClear
            style={{ width: isMobile ? '100%' : 150 }}
            value={filterType}
            onChange={setFilterType}
          >
            <Select.Option value="import">Nhập</Select.Option>
            <Select.Option value="export">Xuất</Select.Option>
          </Select>

          <RangePicker
            value={filterDateRange}
            onChange={setFilterDateRange}
            style={{ width: isMobile ? '100%' : 280 }}
            placeholder={['Từ ngày', 'Đến ngày']}
          />

          <Button icon={<ClearOutlined />} onClick={handleResetFilters} style={isMobile ? { width: '100%' } : {}}>Xóa bộ lọc</Button>
        </Space>
      </div>

      <Table dataSource={transactions} columns={columns} rowKey="id" pagination={{ pageSize: 10 }} scroll={{ x: 900 }} />

      <Modal title={editingTransaction ? 'Sửa giao dịch' : (transType === 'import' ? 'Nhập kho' : 'Xuất kho')} open={isModalOpen} onOk={handleSubmit} onCancel={() => { setIsModalOpen(false); setEditingTransaction(null); }} okText={editingTransaction ? 'Cập nhật' : 'Lưu'} cancelText="Hủy" width={isMobile ? '95%' : 700}>
        <Form form={form} layout="vertical">
          <Form.Item name="type" hidden><Input /></Form.Item>

          {!editingTransaction && (
            <Form.Item label="Loại giao dịch">
              <Radio.Group value={selectedType} onChange={(e) => setSelectedType(e.target.value)}>
                <Radio value="product">Sản phẩm</Radio>
                <Radio value="batch">Nhiều linh kiện</Radio>
                <Radio value="combo">Combo</Radio>
              </Radio.Group>
            </Form.Item>
          )}

          {editingTransaction || selectedType === 'product' ? (
            <>
              {editingTransaction && (
                <Form.Item name="transaction_date" label="Ngày giao dịch" rules={[{ required: true, message: 'Chọn ngày' }]}>
                  <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD HH:mm" showTime />
                </Form.Item>
              )}
              <Form.Item name="product_id" label="Sản phẩm" rules={[{ required: true, message: 'Chọn sản phẩm' }]}>
                <Select placeholder="Chọn sản phẩm" showSearch optionFilterProp="children">
                  {products.map(p => (
                    <Select.Option key={p.id} value={p.id}>
                      {p.code} - {p.name} (Tồn: {p.quantity})
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
              <Form.Item name="quantity" label="Số lượng" rules={[{ required: true, message: 'Nhập số lượng' }]}>
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
            </>
          ) : selectedType === 'batch' ? (
            <div style={{ marginBottom: 16 }}>
              <Form.Item label="Chọn linh kiện để thêm">
                <Select
                  value={batchPickerProductId}
                  onChange={handleBatchProductSelect}
                  placeholder="Tìm và chọn linh kiện"
                  showSearch
                  optionFilterProp="children"
                >
                  {products.map(p => (
                    <Select.Option key={p.id} value={p.id}>
                      {p.code} - {p.name} (Tồn: {p.quantity})
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>

              <div style={{ marginTop: 8, marginBottom: 8, fontWeight: 600 }}>
                Đã chọn: {batchItems.length}
              </div>

              <Table
                size="small"
                pagination={false}
                rowKey="product_id"
                dataSource={batchItems}
                columns={[
                  {
                    title: 'Linh kiện',
                    key: 'product',
                    render: (_, item) => {
                      const product = products.find(p => p.id === item.product_id);
                      return product ? `${product.code} - ${product.name}` : item.product_id;
                    }
                  },
                  {
                    title: 'Số lượng',
                    key: 'quantity',
                    width: 140,
                    render: (_, item) => (
                      <InputNumber
                        min={1}
                        value={item.quantity}
                        onChange={(value) => updateBatchQuantity(item.product_id, value || 1)}
                        style={{ width: '100%' }}
                      />
                    )
                  },
                  {
                    title: 'Thao tác',
                    key: 'actions',
                    width: 100,
                    render: (_, item) => (
                      <Button danger type="link" onClick={() => removeBatchProduct(item.product_id)}>
                        Xóa
                      </Button>
                    )
                  }
                ]}
              />
            </div>
          ) : (
            <>
              <Form.Item name="combo_id" label="Combo" rules={[{ required: true, message: 'Chọn Combo' }]}>
                <Select
                  placeholder="Chọn Combo"
                  showSearch
                  optionFilterProp="children"
                  onChange={handleComboChange}
                >
                  {combos.map(c => (
                    <Select.Option key={c.id} value={c.id}>{c.code} - {c.name}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
              <Form.Item name="quantity" label="Số lượng Combo" initialValue={1}>
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>

              {comboItems.length > 0 && (
                <div style={{ marginBottom: 16, padding: 16, background: '#f5f5f5', borderRadius: 8 }}>
                  <Text strong>Chi tiết Combo:</Text>
                  {comboItems.map((item, idx) => (
                    <div key={idx} style={{ marginTop: 8 }}>
                      {item.product?.code} - {item.product?.name}: {item.quantity} {item.product?.unit}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          <Form.Item name="price" label="Giá (để trống dùng giá sản phẩm)">
            <InputNumber min={0} style={{ width: '100%' }} placeholder="Để trống nếu dùng giá sản phẩm" />
          </Form.Item>

          {transType === 'export' && (
            <Form.Item name="recipient_id" label="Người nhận">
              <Select
                placeholder={selectedType === 'batch' ? 'Chọn KTV/CTV' : 'Chọn người nhận'}
                allowClear
                showSearch
                optionFilterProp="children"
                mode={selectedType === 'batch' ? 'multiple' : undefined}
              >
                {(selectedType === 'batch'
                  ? recipients.filter(r => r.type === 'technician' || r.type === 'collaborator')
                  : recipients
                ).map(r => (
                  <Select.Option key={r.id} value={r.id}>{r.code} - {r.name}</Select.Option>
                ))}
              </Select>
            </Form.Item>
          )}

          <Form.Item name="note" label="Ghi chú">
            <Input.TextArea rows={3} placeholder="Nhập ghi chú" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default PhysicalStock;
