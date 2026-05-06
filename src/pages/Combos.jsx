import { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Input, Select, InputNumber, Space, Popconfirm, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, PlusSquareOutlined } from '@ant-design/icons';
import { getAllCombos, addCombo, updateCombo, deleteCombo, searchCombos, getComboItems, addComboItem, deleteComboItem, getAllProducts } from '../utils/dbUtils';
import useMobile from '../hooks/useMobile';

const Combos = () => {
  const isMobile = useMobile();
  const [combos, setCombos] = useState([]);
  const [products, setProducts] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingCombo, setEditingCombo] = useState(null);
  const [selectedCombo, setSelectedCombo] = useState(null);
  const [comboItems, setComboItems] = useState([]);
  const [form] = Form.useForm();
  const [itemForm] = Form.useForm();

  const loadData = async () => {
    const [comboData, productData] = await Promise.all([getAllCombos(), getAllProducts()]);
    setCombos(comboData);
    setProducts(productData);
  };

  useEffect(() => { loadData(); }, []);

  const handleAdd = () => {
    setEditingCombo(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const handleEdit = (record) => {
    setEditingCombo(record);
    form.setFieldsValue(record);
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    await deleteCombo(id);
    message.success('Đã xóa combo');
    loadData();
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editingCombo) {
        await updateCombo(editingCombo.id, values);
        message.success('Cập nhật thành công');
      } else {
        await addCombo(values);
        message.success('Thêm combo thành công');
      }
      setIsModalOpen(false);
      loadData();
    } catch (error) { console.error(error); }
  };

  const handleManageItems = async (combo) => {
    setSelectedCombo(combo);
    const items = await getComboItems(combo.id);
    setComboItems(items);
    setIsItemModalOpen(true);
  };

  const handleAddItem = async () => {
    try {
      const values = await itemForm.validateFields();
      await addComboItem({ ...values, combo_id: selectedCombo.id });
      message.success('Đã thêm sản phẩm vào combo');
      itemForm.resetFields();
      const items = await getComboItems(selectedCombo.id);
      setComboItems(items);
    } catch (error) { console.error(error); }
  };

  const handleDeleteItem = async (itemId) => {
    await deleteComboItem(itemId);
    message.success('Đã xóa sản phẩm khỏi combo');
    const items = await getComboItems(selectedCombo.id);
    setComboItems(items);
  };

  const columns = [
    { title: 'Mã', dataIndex: 'code', key: 'code' },
    { title: 'Tên', dataIndex: 'name', key: 'name' },
    { title: 'Giá Combo', dataIndex: 'price', key: 'price', render: (val) => val ? val.toLocaleString('vi-VN') + ' đ' : '---' },
    { title: 'Ghi chú', dataIndex: 'note', key: 'note', ellipsis: true },
    {
      title: 'Thao tác',
      key: 'actions',
      width: isMobile ? 100 : 180,
      render: (_, record) => (
        <Space size="small" wrap>
          <Button type="link" size={isMobile ? 'small' : 'middle'} icon={<PlusSquareOutlined />} onClick={() => handleManageItems(record)}>{isMobile ? '' : 'SP'}</Button>
          <Button type="link" size={isMobile ? 'small' : 'middle'} icon={<EditOutlined />} onClick={() => handleEdit(record)}>{isMobile ? '' : 'Sửa'}</Button>
          <Popconfirm title="Xóa combo" description="Bạn có chắc muốn xóa?" onConfirm={() => handleDelete(record.id)} okText="Xóa" cancelText="Hủy">
            <Button type="link" danger size={isMobile ? 'small' : 'middle'} icon={<DeleteOutlined />}>{isMobile ? '' : 'Xóa'}</Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  const itemColumns = [
    { title: 'Mã SP', key: 'code', render: (_, r) => r.product?.code },
    { title: 'Tên SP', key: 'name', render: (_, r) => r.product?.name },
    { title: 'SL', dataIndex: 'quantity', key: 'quantity' },
    { title: 'Giá lẻ', key: 'price', render: (_, r) => r.product?.price?.toLocaleString('vi-VN') + ' đ' },
    {
      title: 'Thao tác',
      key: 'actions',
      width: isMobile ? 60 : 100,
      render: (_, record) => (
        <Button type="link" danger size={isMobile ? 'small' : 'middle'} icon={<DeleteOutlined />} onClick={() => handleDeleteItem(record.id)}>{isMobile ? '' : 'Xóa'}</Button>
      )
    }
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <Input.Search
          placeholder="Tìm kiếm theo mã, tên..."
          allowClear
          style={{ width: isMobile ? '100%' : 300 }}
          onSearch={async (keyword) => {
            if (keyword) {
              const results = await searchCombos(keyword);
              setCombos(results);
            } else { loadData(); }
          }}
        />
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd} style={isMobile ? { width: '100%' } : {}}>Thêm combo</Button>
      </div>

      <Table dataSource={combos} columns={columns} rowKey="id" pagination={{ pageSize: 10 }} scroll={{ x: 600 }} />

      <Modal title={editingCombo ? 'Sửa combo' : 'Thêm combo mới'} open={isModalOpen} onOk={handleSubmit} onCancel={() => setIsModalOpen(false)} okText="Lưu" cancelText="Hủy" width={isMobile ? '95%' : 520}>
        <Form form={form} layout="vertical">
          <Form.Item name="code" label="Mã combo" rules={[{ required: true, message: 'Vui lòng nhập mã' }]}>
            <Input placeholder="Nhập mã combo" />
          </Form.Item>
          <Form.Item name="name" label="Tên combo" rules={[{ required: true, message: 'Vui lòng nhập tên' }]}>
            <Input placeholder="Nhập tên combo" />
          </Form.Item>
          <Form.Item name="price" label="Giá Combo (giá ưu đãi riêng)" rules={[{ required: true, message: 'Vui lòng nhập giá' }]}>
            <InputNumber min={0} style={{ width: '100%' }} placeholder="Nhập giá ưu đãi của combo" />
          </Form.Item>
          <Form.Item name="note" label="Ghi chú">
            <Input.TextArea rows={3} placeholder="Nhập ghi chú" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title={`Quản lý sản phẩm trong combo: ${selectedCombo?.name || ''}`} open={isItemModalOpen} onCancel={() => setIsItemModalOpen(false)} footer={null} width={isMobile ? '95%' : 800}>
        <div style={{ marginBottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Form form={itemForm} layout={isMobile ? 'vertical' : 'inline'} style={{ width: isMobile ? '100%' : 'auto' }}>
            <Form.Item name="product_id" rules={[{ required: true, message: 'Chọn SP' }]}>
              <Select placeholder="Chọn sản phẩm" style={{ width: isMobile ? '100%' : 300 }} showSearch optionFilterProp="children">
                {products.map(p => <Select.Option key={p.id} value={p.id}>{p.code} - {p.name}</Select.Option>)}
              </Select>
            </Form.Item>
            <Form.Item name="quantity" rules={[{ required: true, message: 'Nhập SL' }]}>
              <InputNumber min={1} placeholder="SL" style={{ width: isMobile ? '100%' : 80 }} />
            </Form.Item>
            <Button type="primary" onClick={handleAddItem} style={isMobile ? { width: '100%' } : {}}>Thêm</Button>
          </Form>
        </div>
        <Table dataSource={comboItems} columns={itemColumns} rowKey="id" size="small" pagination={false} scroll={{ x: 500 }} />
      </Modal>
    </div>
  );
};

export default Combos;
