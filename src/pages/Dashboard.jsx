import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, Table, Tag, Space, Button, message, Tabs } from 'antd';
import { ShoppingOutlined, InboxOutlined, DollarOutlined, WarningOutlined, PlusOutlined } from '@ant-design/icons';
import { getStatistics, getLowStockProducts, getCategoryStats, getAllRecipients, getAllProducts, getTransactions, getAllInstallationOrders, getAllInstallationOrderItems } from '../utils/dbUtils';
import seedData from '../utils/seedData';
import useMobile from '../hooks/useMobile';

const { Text, Title } = Typography;

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
      const products = await getAllProducts('product');
      setProductList(products);

      // Build product id -> code map
      const productCodeMap = {};
      products.forEach(p => { productCodeMap[p.id] = p.code; });

      // 1. Get export transactions for techs
      const allExportTransactions = await getTransactions({ type: 'export' });
      const exportTransactions = allExportTransactions.filter(
        t => t.recipient_id && techs.some(tech => tech.id === t.recipient_id)
      );

      // 2. Get orders and items
      const orders = await getAllInstallationOrders();
      const items = await getAllInstallationOrderItems();

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
          render: (val) => {
            if (val === 0) return <span style={{ color: '#ff4d4f', fontWeight: 'bold' }}>0</span>;
            if (val < 3) return <span style={{ color: '#fa8c16' }}>{val}</span>;
            return <span style={{ color: '#52c41a' }}>{val}</span>;
          }
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
    {
      title: 'Tồn kho',
      dataIndex: 'quantity',
      key: 'quantity',
      width: isMobile ? 60 : 80,
      render: (val) => {
        if (val === 0) return <span style={{ color: '#ff4d4f', fontWeight: 'bold' }}>0</span>;
        if (val < 3) return <span style={{ color: '#fa8c16' }}>{val}</span>;
        return val;
      }
    },
    { title: 'Mức tối thiểu', dataIndex: 'min_stock', key: 'min_stock', width: isMobile ? 60 : 80 },
    {
      title: 'Trạng thái',
      key: 'status',
      width: isMobile ? 70 : 100,
      render: (_, record) => {
        if (record.quantity === 0) return <Tag color="red">Hết hàng</Tag>;
        if (record.quantity < 3) return <Tag color="orange">Sắp hết</Tag>;
        return <Tag color="green">Đủ</Tag>;
      }
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
        <Col span={24}>
          <Card bordered={false}>
            <Tabs
              defaultActiveKey="lowstock"
              items={[
                {
                  key: 'lowstock',
                  label: `Sản phẩm sắp hết (${lowStockProducts.length})`,
                  children: (
                    <Table
                      dataSource={lowStockProducts}
                      columns={lowStockColumns}
                      rowKey="id"
                      size="small"
                      pagination={false}
                      scroll={{ x: 600 }}
                      locale={{ emptyText: 'Không có sản phẩm sắp hết' }}
                    />
                  )
                },
                {
                  key: 'category',
                  label: 'Thống kê theo danh mục',
                  children: (
                    <Table
                      dataSource={categoryStats.map(([category, data]) => ({ category, ...data }))}
                      columns={categoryColumns}
                      rowKey="category"
                      size="small"
                      pagination={false}
                      scroll={{ x: 500 }}
                    />
                  )
                }
              ]}
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
              locale={{ emptyText: 'Không có dữ liệu' }}
            />
            <div style={{ marginTop: 8, fontSize: 12, color: '#888' }}>
              <span style={{ color: '#52c41a' }}>●</span> ≥ 3 (Đủ) &nbsp;
              <span style={{ color: '#fa8c16' }}>●</span> 1-2 (Sắp hết) &nbsp;
              <span style={{ color: '#ff4d4f', fontWeight: 'bold' }}>●</span> 0 (Hết hàng)
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
