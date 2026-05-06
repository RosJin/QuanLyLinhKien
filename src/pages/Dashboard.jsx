import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, Table, Tag, Space, Button, message } from 'antd';
import { ShoppingOutlined, InboxOutlined, WarningOutlined, DollarOutlined, PlusOutlined } from '@ant-design/icons';
import { getStatistics, getLowStockProducts, getCategoryStats, getAllRecipients, getAllProducts } from '../utils/dbUtils';
import db from '../db/database';
import seedData from '../utils/seedData';
import useMobile from '../hooks/useMobile';

const Dashboard = () => {
  const isMobile = useMobile();
  const [stats, setStats] = useState({
    total_products: 0,
    total_quantity: 0,
    total_value: 0,
    low_stock_count: 0,
    total_import: 0,
    total_export: 0
  });
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [categoryStats, setCategoryStats] = useState([]);
  const [techProductColumns, setTechProductColumns] = useState([]);
  const [techProductData, setTechProductData] = useState([]);
  const [productList, setProductList] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadTechProductMatrix = async () => {
    try {
      const allRecipients = await getAllRecipients();
      const techs = allRecipients.filter(r => r.type === 'technician' || r.type === 'collaborator');
      const products = await getAllProducts();
      setProductList(products);

      // Build product id -> code map
      const productCodeMap = {};
      products.forEach(p => { productCodeMap[p.id] = p.code; });

      // 1. Exports TO KTV (transactions with type='export' and recipient_id)
      const exportTransactions = await db.transactions
        .where('type').equals('export')
        .and(t => t.recipient_id && techs.some(tech => tech.id === t.recipient_id))
        .toArray();

      // 2. Usage by KTV (installation orders)
      const orders = await db.installation_orders.toArray();
      const items = await db.installation_order_items.toArray();

      // Initialize matrix
      const matrix = {};
      techs.forEach(t => {
        matrix[t.id] = {};
        products.forEach(p => { matrix[t.id][p.code] = 0; });
      });

      // Add exports (positive)
      exportTransactions.forEach(t => {
        const code = productCodeMap[t.product_id];
        if (code && matrix[t.recipient_id]) {
          matrix[t.recipient_id][code] = (matrix[t.recipient_id][code] || 0) + t.quantity;
        }
      });

      // Subtract usage from installation orders (negative)
      const orderRecipientMap = {};
      orders.forEach(o => { orderRecipientMap[o.id] = o.recipient_id; });

      items.forEach(item => {
        const recipientId = orderRecipientMap[item.order_id];
        if (recipientId && matrix[recipientId]) {
          const code = productCodeMap[item.product_id];
          if (code) {
            matrix[recipientId][code] = (matrix[recipientId][code] || 0) - item.quantity;
          }
        }
      });

      // Build table data
      const data = techs.map(tech => {
        const row = { key: tech.id, techName: tech.name + (tech.type === 'technician' ? ' (KTV)' : ' (CTV)') };
        products.forEach(p => {
          row[p.code] = matrix[tech.id][p.code] || 0;
        });
        return row;
      });

      const columns = [
        { title: 'KTV/CTV', dataIndex: 'techName', key: 'techName', fixed: 'left', width: isMobile ? 120 : 200 },
        ...products.map(p => ({
          title: p.code,
          dataIndex: p.code,
          key: p.id,
          width: isMobile ? 80 : 120,
          render: (val) => val || 0
        }))
      ];

      setTechProductColumns(columns);
      setTechProductData(data);
    } catch (error) {
      console.error('Error loading tech product matrix:', error);
    }
  };

  const loadData = async () => {
    const statistics = await getStatistics();
    setStats(statistics);

    const lowStock = await getLowStockProducts();
    setLowStockProducts(lowStock);

    const categories = await getCategoryStats();
    setCategoryStats(categories);

    await loadTechProductMatrix();
  };

  const lowStockColumns = [
    { title: 'Mã', dataIndex: 'code', key: 'code', width: isMobile ? 80 : 100 },
    { title: 'Tên', dataIndex: 'name', key: 'name', width: isMobile ? 100 : 150 },
    { title: 'Danh mục', dataIndex: 'category', key: 'category', width: isMobile ? 80 : 120 },
    { title: 'Tồn kho', dataIndex: 'quantity', key: 'quantity', width: isMobile ? 60 : 80 },
    { title: 'Mức tối thiểu', dataIndex: 'min_stock', key: 'min_stock', width: isMobile ? 60 : 80 },
    {
      title: 'Trạng thái',
      key: 'status',
      width: isMobile ? 70 : 100,
      render: () => <Tag color="red">Sắp hết</Tag>
    }
  ];

  const categoryColumns = [
    { title: 'Danh mục', dataIndex: 'category', key: 'category', render: (text) => text || 'Chưa phân loại', width: isMobile ? 100 : 150 },
    { title: 'Số lượng SP', dataIndex: 'count', key: 'count', width: isMobile ? 80 : 100 },
    { title: 'Tổng SL', dataIndex: 'total_qty', key: 'total_qty', width: isMobile ? 80 : 100 },
    {
      title: 'Tổng giá trị',
      dataIndex: 'total_value',
      key: 'total_value',
      width: isMobile ? 100 : 130,
      render: (val) => val.toLocaleString('vi-VN') + ' đ'
    }
  ];

  const handleSeedData = async () => {
    try {
      await seedData();
      message.success('Đã tạo dữ liệu mẫu!');
      loadData();
    } catch (error) {
      console.error(error);
      message.error('Lỗi tạo dữ liệu');
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <Button type="primary" onClick={handleSeedData} style={isMobile ? { width: '100%' } : {}}>
          Tạo dữ liệu mẫu để test
        </Button>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} md={6}>
          <Card hoverable>
            <Statistic
              title="Tổng sản phẩm"
              value={stats.total_products}
              prefix={<ShoppingOutlined style={{ color: '#1890ff' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card hoverable>
            <Statistic
              title="Tổng số lượng"
              value={stats.total_quantity}
              prefix={<InboxOutlined style={{ color: '#52c41a' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card hoverable>
            <Statistic
              title="Tổng giá trị"
              value={stats.total_value}
              precision={0}
              prefix={<DollarOutlined style={{ color: '#faad14' }} />}
              suffix="đ"
              formatter={(val) => val.toLocaleString('vi-VN')}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card hoverable>
            <Statistic
              title="Sắp hết hàng"
              value={stats.low_stock_count}
              prefix={<WarningOutlined style={{ color: stats.low_stock_count > 0 ? '#f5222d' : '#52c41a' }} />}
              valueStyle={{ color: stats.low_stock_count > 0 ? '#f5222d' : '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} md={12}>
          <Card title="Sản phẩm sắp hết hàng" bordered={false}>
            <Table
              dataSource={lowStockProducts}
              columns={lowStockColumns}
              rowKey="id"
              size="small"
              pagination={false}
              scroll={{ x: 600 }}
            />
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="Thống kê theo danh mục" bordered={false}>
            <Table
              dataSource={categoryStats.map(([category, data]) => ({ category, ...data }))}
              columns={categoryColumns}
              rowKey="category"
              size="small"
              pagination={false}
              scroll={{ x: 500 }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card title="Linh kiện theo KTV/CTV" bordered={false}>
            <Table
              columns={techProductColumns}
              dataSource={techProductData}
              scroll={{ x: Math.max(800, 200 + productList.length * 120) }}
              size="small"
              pagination={false}
              bordered
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
