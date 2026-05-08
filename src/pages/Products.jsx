import React, { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Input, InputNumber, Space, Tag, Popconfirm, message, Tabs } from 'antd';
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { getAllProducts, addProduct, updateProduct, deleteProduct, searchProducts, getProductsByType } from '../utils/dbUtils';
import useMobile from '../hooks/useMobile';

const Products = () => {
  const isMobile = useMobile();
  const [products, setProducts] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [activeTab, setActiveTab] = useState('product');
  const [form] = Form.useForm();

  const loadProducts = async () => {
    const data = await getProductsByType(activeTab);
    setProducts(data);
  };

  useEffect(() => { loadProducts(); }, [activeTab]);

  const handleSearch = async (keyword) => {
    setSearchKeyword(keyword);
    if (keyword) {
      const results = await searchProducts(keyword, activeTab);
      setProducts(results);
    } else {
      loadProducts();
    }
  };

  const handleAdd = () => {
    setEditingProduct(null);
    form.resetFields();
    form.setFieldsValue({ type: activeTab });
    setIsModalOpen(true);
  };

  const handleEdit = (record) => {
    setEditingProduct(record);
    form.setFieldsValue(record);
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    await deleteProduct(id);
    message.success('Đã xóa');
    loadProducts();
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editingProduct) {
        await updateProduct(editingProduct.id, values);
        message.success('Cập nhật thành công');
      } else {
        await addProduct(values);
        message.success(activeTab === 'service' ? 'Thêm phí dịch vụ thành công' : 'Thêm sản phẩm thành công');
      }
      setIsModalOpen(false);
      loadProducts();
    } catch (error) { console.error(error); }
  };

  const productColumns = [
    { title: 'Mã', dataIndex: 'code', key: 'code', width: isMobile ? 80 : 100, sorter: (a, b) => a.code.localeCompare(b.code) },
    { title: 'Tên', dataIndex: 'name', key: 'name', width: isMobile ? 120 : 200, sorter: (a, b) => a.name.localeCompare(b.name) },
    { title: 'Danh mục', dataIndex: 'category', key: 'category', width: isMobile ? 100 : 150 },
    {
      title: 'Giá',
      dataIndex: 'price',
      key: 'price',
      width: isMobile ? 100 : 130,
      render: (val) => val.toLocaleString('vi-VN') + ' đ',
      sorter: (a, b) => a.price - b.price
    },
    { title: 'Tồn kho', dataIndex: 'quantity', key: 'quantity', width: isMobile ? 80 : 100, sorter: (a, b) => a.quantity - b.quantity },
    { title: 'Mức tối thiểu', dataIndex: 'min_stock', key: 'min_stock', width: isMobile ? 80 : 100 },
    {
      title: 'Trạng thái',
      key: 'status',
      width: isMobile ? 100 : 120,
      render: (_, record) => (
        record.quantity <= record.min_stock ?
          <Tag color="red">Sắp hết</Tag> :
          <Tag color="green">Bình thường</Tag>
      )
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: isMobile ? 90 : 180,
      render: (_, record) => (
        <Space size="small" wrap>
          <Button type="link" size={isMobile ? 'small' : 'middle'} icon={<EditOutlined />} onClick={() => handleEdit(record)}>{isMobile ? '' : 'Sửa'}</Button>
          <Popconfirm title="Xóa sản phẩm" description="Bạn có chắc muốn xóa?" onConfirm={() => handleDelete(record.id)} okText="Xóa" cancelText="Hủy">
            <Button type="link" danger size={isMobile ? 'small' : 'middle'} icon={<DeleteOutlined />}>{isMobile ? '' : 'Xóa'}</Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  const serviceColumns = [
    { title: 'Mã', dataIndex: 'code', key: 'code', width: isMobile ? 100 : 120, sorter: (a, b) => a.code.localeCompare(b.code) },
    { title: 'Tên phí dịch vụ', dataIndex: 'name', key: 'name', width: isMobile ? 150 : 250, sorter: (a, b) => a.name.localeCompare(b.name) },
    {
      title: 'Giá',
      dataIndex: 'price',
      key: 'price',
      width: isMobile ? 120 : 150,
      render: (val) => val.toLocaleString('vi-VN') + ' đ',
      sorter: (a, b) => a.price - b.price
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: isMobile ? 90 : 180,
      render: (_, record) => (
        <Space size="small" wrap>
          <Button type="link" size={isMobile ? 'small' : 'middle'} icon={<EditOutlined />} onClick={() => handleEdit(record)}>{isMobile ? '' : 'Sửa'}</Button>
          <Popconfirm title="Xóa phí dịch vụ" description="Bạn có chắc muốn xóa?" onConfirm={() => handleDelete(record.id)} okText="Xóa" cancelText="Hủy">
            <Button type="link" danger size={isMobile ? 'small' : 'middle'} icon={<DeleteOutlined />}>{isMobile ? '' : 'Xóa'}</Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  const tabItems = [
    { key: 'product', label: 'Sản phẩm' },
    { key: 'service', label: 'Phí dịch vụ' }
  ];

  return (
    <div>
      <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />

      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <Input.Search
          placeholder={activeTab === 'service' ? 'Tìm kiếm theo mã, tên...' : 'Tìm kiếm theo mã, tên, danh mục...'}
          allowClear
          style={{ width: isMobile ? '100%' : 300 }}
          onSearch={handleSearch}
          onChange={(e) => !e.target.value && loadProducts()}
        />
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd} style={isMobile ? { width: '100%' } : {}}>
          {activeTab === 'service' ? 'Thêm phí dịch vụ' : 'Thêm sản phẩm'}
        </Button>
      </div>

      <Table
        dataSource={products}
        columns={activeTab === 'service' ? serviceColumns : productColumns}
        rowKey="id"
        pagination={{ pageSize: 10 }}
        scroll={{ x: 800 }}
      />

      <Modal
        title={editingProduct ? (activeTab === 'service' ? 'Sửa phí dịch vụ' : 'Sửa sản phẩm') : (activeTab === 'service' ? 'Thêm phí dịch vụ mới' : 'Thêm sản phẩm mới')}
        open={isModalOpen}
        onOk={handleSubmit}
        onCancel={() => setIsModalOpen(false)}
        okText="Lưu"
        cancelText="Hủy"
        width={isMobile ? '95%' : 520}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="type" hidden>
            <Input />
          </Form.Item>
          <Form.Item name="code" label={activeTab === 'service' ? 'Mã phí dịch vụ' : 'Mã sản phẩm'} rules={[{ required: true, message: 'Vui lòng nhập mã' }]}>
            <Input placeholder={activeTab === 'service' ? 'Nhập mã phí dịch vụ' : 'Nhập mã sản phẩm'} />
          </Form.Item>
          <Form.Item name="name" label={activeTab === 'service' ? 'Tên phí dịch vụ' : 'Tên sản phẩm'} rules={[{ required: true, message: 'Vui lòng nhập tên' }]}>
            <Input placeholder={activeTab === 'service' ? 'Nhập tên phí dịch vụ' : 'Nhập tên sản phẩm'} />
          </Form.Item>
          {activeTab === 'product' && (
            <Form.Item name="category" label="Danh mục">
              <Input placeholder="Nhập danh mục" />
            </Form.Item>
          )}
          <Form.Item name="price" label="Giá" rules={[{ required: true, message: 'Vui lòng nhập giá' }]}>
            <InputNumber min={0} style={{ width: '100%' }} placeholder="Nhập giá" />
          </Form.Item>
          {activeTab === 'product' && (
            <>
              <Form.Item name="quantity" label="Số lượng tồn" initialValue={0}>
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item name="min_stock" label="Mức tồn tối thiểu" initialValue={0}>
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </>
          )}
        </Form>
      </Modal>
    </div>
  );
};

export default Products;
