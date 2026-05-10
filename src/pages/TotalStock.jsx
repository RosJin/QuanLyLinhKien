import React, { useEffect, useState } from 'react';
import { Table, Tag, Input } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { getAllProducts, getTransactions } from '../utils/dbUtils';
import useMobile from '../hooks/useMobile';

const TotalStock = () => {
  const isMobile = useMobile();
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [collabHoldMap, setCollabHoldMap] = useState({});
  const [ktvHoldMap, setKtvHoldMap] = useState({});

  const loadProducts = async () => {
    const data = await getAllProducts('product');
    setProducts(data);
    setFilteredProducts(data);
  };

  useEffect(() => { loadProducts(); }, []);

  useEffect(() => {
    const loadHoldMaps = async () => {
      try {
        const txs = await getTransactions();
        const collabMap = {};
        const ktvMap = {};
        txs.forEach(t => {
          if (t.type !== 'export') return;
          const r = t.recipient;
          if (!r) return;
          const pid = t.product_id || (t.product && t.product.id);
          if (!pid) return;
          if (r.type === 'collaborator') {
            collabMap[pid] = (collabMap[pid] || 0) + (t.quantity || 0);
          }
          if (r.type === 'technician') {
            ktvMap[pid] = (ktvMap[pid] || 0) + (t.quantity || 0);
          }
        });
        setCollabHoldMap(collabMap);
        setKtvHoldMap(ktvMap);
      } catch (err) {
        console.error('Failed to load transactions for hold maps', err);
      }
    };

    loadHoldMaps();
  }, []);

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
    { title: 'Mã', dataIndex: 'code', key: 'code', width: isMobile ? 80 : 100, sorter: (a, b) => a.code.localeCompare(b.code) },
    { title: 'Tên sản phẩm', dataIndex: 'name', key: 'name', width: isMobile ? 120 : 200, sorter: (a, b) => a.name.localeCompare(b.name) },
    { title: 'Danh mục', dataIndex: 'category', key: 'category', width: isMobile ? 100 : 150 },
    {
      title: 'Giá',
      dataIndex: 'price',
      key: 'price',
      width: isMobile ? 100 : 130,
      render: (val) => val.toLocaleString('vi-VN') + ' đ',
      sorter: (a, b) => a.price - b.price
    },
    {
      title: 'Tồn kho',
      dataIndex: 'quantity',
      key: 'quantity',
      width: isMobile ? 80 : 100,
      sorter: (a, b) => a.quantity - b.quantity,
      render: (val, record) => (
        <span style={{ color: val <= record.min_stock ? 'red' : 'black', fontWeight: val <= record.min_stock ? 'bold' : 'normal' }}>
          {val}
        </span>
      )
    },
    {
      title: 'CTV giữ',
      key: 'collab_hold',
      width: isMobile ? 80 : 100,
      render: (_, record) => (
        <span style={{ background: '#fffbe6', padding: '2px 6px', borderRadius: 6, fontWeight: 600, display: 'inline-block' }}>
          {collabHoldMap[record.id] || 0}
        </span>
      )
    },
    {
      title: 'Tổng (Tồn+KTV)',
      key: 'total_with_ktv',
      width: isMobile ? 90 : 120,
      render: (_, record) => {
        const q = record.quantity || 0;
        const k = ktvHoldMap[record.id] || 0;
        return (
          <span style={{ background: '#e6f7ff', padding: '2px 6px', borderRadius: 6, fontWeight: 600, display: 'inline-block' }}>
            {q + k}
          </span>
        );
      }
    },
    {
      title: 'KTV giữ',
      key: 'ktv_hold',
      width: isMobile ? 80 : 100,
      render: (_, record) => (
        <span style={{ background: '#fff0f6', padding: '2px 6px', borderRadius: 6, fontWeight: 600, display: 'inline-block' }}>
          {ktvHoldMap[record.id] || 0}
        </span>
      )
    },   
    {
      title: 'Tổng kho 3',
      key: 'kho3',
      width: isMobile ? 90 : 120,
      render: (_, record) => {
        const q = record.quantity || 0;
        const k = ktvHoldMap[record.id] || 0;
        const c = collabHoldMap[record.id] || 0;
        return (
          <span style={{ background: '#f6ffed', padding: '2px 6px', borderRadius: 6, fontWeight: 700, display: 'inline-block' }}>
            {q + k + c}
          </span>
        );
      }
    },
    { title: 'Mức tối thiểu', dataIndex: 'min_stock', key: 'min_stock', width: isMobile ? 80 : 100 },
    {
      title: 'Giá trị tồn',
      key: 'total_value',
      width: isMobile ? 100 : 130,
      render: (_, record) => (record.quantity * record.price).toLocaleString('vi-VN') + ' đ',
      sorter: (a, b) => (a.quantity * a.price) - (b.quantity * b.price)
    },
    {
      title: 'Trạng thái',
      key: 'status',
      width: isMobile ? 100 : 120,
      render: (_, record) => {
        if (record.quantity === 0) {
          return <Tag color="red">Hết hàng</Tag>;
        }
        if (record.quantity < 3) {
          return <Tag color="orange">Sắp hết</Tag>;
        }
        return <Tag color="green">Đủ</Tag>;
      }
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
            const totalQuantity = pageData.reduce((sum, item) => sum + (item.quantity || 0), 0);
                const totalCTV = pageData.reduce((sum, item) => sum + (collabHoldMap[item.id] || 0), 0);
                const totalKTV = pageData.reduce((sum, item) => sum + (ktvHoldMap[item.id] || 0), 0);
                const totalCombined = totalQuantity + totalKTV;
                const totalKho3 = pageData.reduce((sum, item) => sum + ((item.quantity || 0) + (ktvHoldMap[item.id] || 0) + (collabHoldMap[item.id] || 0)), 0);
                const totalValue = pageData.reduce((sum, item) => sum + ((item.quantity || 0) * (item.price || 0)), 0);
              return (
                <Table.Summary fixed>
                  <Table.Summary.Row>
                        <Table.Summary.Cell index={0} colSpan={4}><strong>Tổng cộng:</strong></Table.Summary.Cell>
                        <Table.Summary.Cell index={4}><strong>{totalQuantity}</strong></Table.Summary.Cell>
                        <Table.Summary.Cell index={5}><span style={{ background: '#fffbe6', padding: '2px 6px', borderRadius: 6, fontWeight: 700 }}>{totalCTV}</span></Table.Summary.Cell>
                        <Table.Summary.Cell index={6}><span style={{ background: '#e6f7ff', padding: '2px 6px', borderRadius: 6, fontWeight: 700 }}>{totalCombined}</span></Table.Summary.Cell>
                        <Table.Summary.Cell index={7}><span style={{ background: '#fff0f6', padding: '2px 6px', borderRadius: 6, fontWeight: 700 }}>{totalKTV}</span></Table.Summary.Cell>
                        <Table.Summary.Cell index={8}><span style={{ background: '#f6ffed', padding: '2px 6px', borderRadius: 6, fontWeight: 800 }}>{totalKho3}</span></Table.Summary.Cell>
                        <Table.Summary.Cell index={9}></Table.Summary.Cell>
                        <Table.Summary.Cell index={10}><strong>{totalValue.toLocaleString('vi-VN')} đ</strong></Table.Summary.Cell>
                        <Table.Summary.Cell index={11}></Table.Summary.Cell>
                  </Table.Summary.Row>
                </Table.Summary>
              );
        }}
      />
    </div>
  );
};

export default TotalStock;
