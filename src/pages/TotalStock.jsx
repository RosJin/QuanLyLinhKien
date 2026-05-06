import React, { useEffect, useState } from 'react';
import { Table, Tag, Input } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { getAllProducts } from '../utils/dbUtils';
import useMobile from '../hooks/useMobile';

const TotalStock = () => {
  const isMobile = useMobile();
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);

  const loadProducts = async () => {
    const data = await getAllProducts();
    setProducts(data);
    setFilteredProducts(data);
  };

  useEffect(() => { loadProducts(); }, []);

  const handleSearch = (keyword) => {
    if (!keyword) {
      setFilteredProducts(products);
    } else {
      const filtered = products.filter(p =>
        p.code.toLowerCase().includes(keyword.toLowerCase()) ||
        p.name.toLowerCase().includes(keyword.toLowerCase()) ||
        (p.category && p.category.toLowerCase().includes(keyword.toLowerCase()))
      );
      setFilteredProducts(filtered);
    }
  };

  const columns = [
    { title: 'Mã', dataIndex: 'code', key: 'code', sorter: (a, b) => a.code.localeCompare(b.code) },
    { title: 'Tên sản phẩm', dataIndex: 'name', key: 'name', sorter: (a, b) => a.name.localeCompare(b.name) },
    { title: 'Danh mục', dataIndex: 'category', key: 'category' },
    {
      title: 'Giá',
      dataIndex: 'price',
      key: 'price',
      render: (val) => val.toLocaleString('vi-VN') + ' đ',
      sorter: (a, b) => a.price - b.price
    },
    {
      title: 'Tồn kho',
      dataIndex: 'quantity',
      key: 'quantity',
      sorter: (a, b) => a.quantity - b.quantity,
      render: (val, record) => (
        <span style={{ color: val <= record.min_stock ? 'red' : 'black', fontWeight: val <= record.min_stock ? 'bold' : 'normal' }}>
          {val}
        </span>
      )
    },
    { title: 'Mức tối thiểu', dataIndex: 'min_stock', key: 'min_stock' },
    {
      title: 'Giá trị tồn',
      key: 'total_value',
      render: (_, record) => (record.quantity * record.price).toLocaleString('vi-VN') + ' đ',
      sorter: (a, b) => (a.quantity * a.price) - (b.quantity * b.price)
    },
    {
      title: 'Trạng thái',
      key: 'status',
      render: (_, record) => (
        record.quantity <= record.min_stock ?
          <Tag color="red">Sắp hết</Tag> :
          record.quantity <= record.min_stock * 2 ?
            <Tag color="orange">Thấp</Tag> :
            <Tag color="green">Đủ</Tag>
      )
    }
  ];

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Input.Search
          placeholder="Tìm kiếm theo mã, tên, danh mục..."
          allowClear
          style={{ width: isMobile ? '100%' : 300 }}
          onSearch={handleSearch}
          onChange={(e) => !e.target.value && setFilteredProducts(products)}
        />
      </div>

      <Table
        dataSource={filteredProducts}
        columns={columns}
        rowKey="id"
        pagination={{ pageSize: 15 }}
        scroll={{ x: 800 }}
        summary={(pageData) => {
          const totalQuantity = pageData.reduce((sum, item) => sum + item.quantity, 0);
          const totalValue = pageData.reduce((sum, item) => sum + (item.quantity * item.price), 0);
          return (
            <Table.Summary fixed>
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={4}><strong>Tổng cộng:</strong></Table.Summary.Cell>
                <Table.Summary.Cell index={4}><strong>{totalQuantity}</strong></Table.Summary.Cell>
                <Table.Summary.Cell index={5}></Table.Summary.Cell>
                <Table.Summary.Cell index={6}><strong>{totalValue.toLocaleString('vi-VN')} đ</strong></Table.Summary.Cell>
                <Table.Summary.Cell index={7}></Table.Summary.Cell>
              </Table.Summary.Row>
            </Table.Summary>
          );
        }}
      />
    </div>
  );
};

export default TotalStock;
