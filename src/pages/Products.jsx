import React, { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Input, InputNumber, Select, Space, Tag, Popconfirm, message } from 'antd';
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { getAllProducts, addProduct, updateProduct, deleteProduct, searchProducts } from '../utils/dbUtils';

const Products = () => {
  const [products, setProducts] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [form] = Form.useForm();

  const loadProducts = async () => {
    const data = await getAllProducts();
    setProducts(data);
  };

  useEffect(() => { loadProducts(); }, []);

  const handleSearch = async (keyword) => {
    setSearchKeyword(keyword);
    if (keyword) {
      const results = await searchProducts(keyword);
      setProducts(results);
    } else {
      loadProducts();
    }
  };

  const handleAdd = () => {
    setEditingProduct(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const handleEdit = (record) => {
    setEditingProduct(record);
    form.setFieldsValue(record);
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    await deleteProduct(id);
    message.success('Đã xóa sản phẩm');
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
        message.success('Thêm sản phẩm thành công');
      }
      setIsModalOpen(false);
      loadProducts();
    } catch (error) { console.error(error); }
  };

  const columns = [
    { title: 'Mã', dataIndex: 'code', key: 'code', sorter: (a, b) => a.code.localeCompare(b.code) },
    { title: 'Tên', dataIndex: 'name', key: 'name', sorter: (a, b) => a.name.localeCompare(b.name) },
    { title: 'Danh mục', dataIndex: 'category', key: 'category' },
    {
      title: 'Giá',
      dataIndex: 'price',
      key: 'price',
      render: (val) => val.toLocaleString('vi-VN') + ' đ',
      sorter: (a, b) => a.price - b.price
    },
    { title: 'Tồn kho', dataIndex: 'quantity', key: 'quantity', sorter: (a, b) => a.quantity - b.quantity },
    { title: 'Mức tối thiểu', dataIndex: 'min_stock', key: 'min_stock' },
    {
      title: 'Trạng thái',
      key: 'status',
      render: (_, record) => (
        record.quantity <= record.min_stock ?
          <Tag color="red">Sắp hết</Tag> :
          <Tag color="green">Bình thường</Tag>
      )
    },
    {
      title: 'Thao tác',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)}>Sửa</Button>
          <Popconfirm
            title="Xóa sản phẩm"
            description="Bạn có chắc muốn xóa?"
            onConfirm={() => handleDelete(record.id)}
            okText="Xóa"
            cancelText="Hủy"
          >
            <Button type="link" danger icon={<DeleteOutlined />}>Xóa</Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <Input.Search
          placeholder="Tìm kiếm theo mã, tên, danh mục..."
          allowClear
          style={{ width: 300 }}
          onSearch={handleSearch}
          onChange={(e) => !e.target.value && loadProducts()}
        />
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          Thêm sản phẩm
        </Button>
      </div>

      <Table dataSource={products} columns={columns} rowKey="id" pagination={{ pageSize: 10 }} />

      <Modal
        title={editingProduct ? 'Sửa sản phẩm' : 'Thêm sản phẩm mới'}
        open={isModalOpen}
        onOk={handleSubmit}
        onCancel={() => setIsModalOpen(false)}
        okText="Lưu"
        cancelText="Hủy"
      >
        <Form form={form} layout="vertical">
          <Form.Item name="code" label="Mã sản phẩm" rules={[{ required: true, message: 'Vui lòng nhập mã' }]}>
            <Input placeholder="Nhập mã sản phẩm" />
          </Form.Item>
          <Form.Item name="name" label="Tên sản phẩm" rules={[{ required: true, message: 'Vui lòng nhập tên' }]}>
            <Input placeholder="Nhập tên sản phẩm" />
          </Form.Item>
          <Form.Item name="category" label="Danh mục">
            <Input placeholder="Nhập danh mục" />
          </Form.Item>
          <Form.Item name="price" label="Giá" rules={[{ required: true, message: 'Vui lòng nhập giá' }]}>
            <InputNumber min={0} style={{ width: '100%' }} placeholder="Nhập giá" />
          </Form.Item>
          <Form.Item name="quantity" label="Số lượng tồn" initialValue={0}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="min_stock" label="Mức tồn tối thiểu" initialValue={0}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Products;
