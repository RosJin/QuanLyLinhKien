import React, { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Select, InputNumber, Input, Radio, Space, Tag, message, Typography, DatePicker, Popconfirm } from 'antd';
import { PlusOutlined, ImportOutlined, ExportOutlined, EditOutlined, DeleteOutlined, ClearOutlined } from '@ant-design/icons';
import { getTransactions, getAllProducts, getAllRecipients, addTransaction, updateTransaction, deleteTransaction, getAllCombos, getComboItems, processComboTransaction } from '../utils/dbUtils';
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
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [form] = Form.useForm();

  // Filter states
  const [filterProductId, setFilterProductId] = useState(null);
  const [filterRecipientId, setFilterRecipientId] = useState(null);
  const [filterType, setFilterType] = useState(null);
  const [filterDateRange, setFilterDateRange] = useState(null);

  // Load static data (products, recipients, combos) once
  useEffect(() => {
    const loadStatic = async () => {
      const [prods, recips, cmb] = await Promise.all([
        getAllProducts(),
        getAllRecipients(),
        getAllCombos()
      ]);
      setProducts(prods);
      setRecipients(recips);
      setCombos(cmb);
    };
    loadStatic();
  }, []);

  // Reload transactions when filters change
  useEffect(() => {
    reloadTransactions();
  }, [filterProductId, filterRecipientId, filterType, filterDateRange]);

  const reloadTransactions = async () => {
    const filters = {};
    if (filterProductId) filters.product_id = filterProductId;
    if (filterRecipientId) filters.recipient_id = filterRecipientId;
    if (filterType) filters.type = filterType;
    if (filterDateRange && filterDateRange[0]) filters.start_date = filterDateRange[0].startOf('day').toISOString();
    if (filterDateRange && filterDateRange[1]) filters.end_date = filterDateRange[1].endOf('day').toISOString();

    const trans = await getTransactions(filters);
    setTransactions(trans);
  };

  const handleAddTransaction = (type) => {
    setEditingTransaction(null);
    setTransType(type);
    setSelectedType('product');
    setComboItems([]);
    form.resetFields();
    form.setFieldsValue({ type });
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
      note: record.note
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

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

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
    { title: 'Ngày', dataIndex: 'created_at', key: 'created_at', render: (val) => dayjs(val).format('DD/MM/YYYY HH:mm') },
    { title: 'Mã SP', key: 'product_code', render: (_, record) => record.product?.code },
    { title: 'Tên SP', key: 'product_name', render: (_, record) => record.product?.name },
    {
      title: 'Loại',
      dataIndex: 'type',
      key: 'type',
      render: (type) => (
        <Tag color={type === 'import' ? 'green' : 'blue'}>
          {type === 'import' ? 'Nhập' : 'Xuất'}
        </Tag>
      )
    },
    { title: 'Số lượng', dataIndex: 'quantity', key: 'quantity' },
    { title: 'Thành tiền', key: 'total', render: (_, record) => ((record.price ?? record.product?.price ?? 0) * (record.quantity || 0)).toLocaleString('vi-VN') + ' đ' },
    { title: 'Ghi chú', dataIndex: 'note', key: 'note' },
    { title: 'Người nhận', key: 'recipient_name', render: (_, record) => record.recipient?.name },
    {
      title: 'Thao tác',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button type="link" icon={<EditOutlined />} onClick={() => handleEditTransaction(record)} />
          <Popconfirm title="Xóa giao dịch?" onConfirm={() => handleDeleteTransaction(record.id)} okText="Xóa" cancelText="Hủy">
            <Button type="link" danger icon={<DeleteOutlined />} />
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

          <Button icon={<ClearOutlined />} onClick={handleResetFilters}>Xóa bộ lọc</Button>
        </Space>
      </div>

      <Table dataSource={transactions} columns={columns} rowKey="id" pagination={{ pageSize: 10 }} scroll={{ x: 900 }} />

      <Modal
        title={editingTransaction ? 'Sửa giao dịch' : (transType === 'import' ? 'Nhập kho' : 'Xuất kho')}
        open={isModalOpen}
        onOk={handleSubmit}
        onCancel={() => { setIsModalOpen(false); setEditingTransaction(null); }}
        okText={editingTransaction ? 'Cập nhật' : 'Lưu'}
        cancelText="Hủy"
        width={isMobile ? '95%' : 700}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="type" hidden><Input /></Form.Item>

          {!editingTransaction && (
            <Form.Item label="Loại giao dịch">
              <Radio.Group value={selectedType} onChange={(e) => setSelectedType(e.target.value)}>
                <Radio value="product">Sản phẩm</Radio>
                <Radio value="combo">Combo</Radio>
              </Radio.Group>
            </Form.Item>
          )}

          {editingTransaction || selectedType === 'product' ? (
            <>
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

          <Form.Item name="recipient_id" label="Người nhận">
            <Select placeholder="Chọn người nhận" allowClear showSearch optionFilterProp="children">
              {recipients.map(r => (
                <Select.Option key={r.id} value={r.id}>{r.code} - {r.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="note" label="Ghi chú">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default PhysicalStock;
