import { useEffect, useState, useCallback } from 'react';
import { Card, Row, Col, Statistic, Table, Tag, Button, Alert, Spin } from 'antd';
import { ShoppingOutlined, InboxOutlined, DollarOutlined, WarningOutlined, PlusOutlined } from '@ant-design/icons';
import { getStatistics, getLowStockProducts, getCategoryStats, getAllRecipients, getAllProducts, getTransactions, getAllInstallationOrders, getAllInstallationOrderItems } from '../utils/dbUtils';
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
  const [techColumns, setTechColumns] = useState([]);
  const [techData, setTechData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const loadTechProductMatrix = useCallback(async () => {
    try {
      const [allRecipients, products, allExportTransactions, orders, items] = await Promise.all([
        getAllRecipients(),
        getAllProducts('product'),
        getTransactions({ type: 'export' }),
        getAllInstallationOrders(),
        getAllInstallationOrderItems()
      ]);

      const techs = allRecipients.filter(r => r.type === 'technician' || r.type === 'collaborator');

      // Build product id -> code map
      const productCodeMap = {};
      products.forEach(p => { productCodeMap[p.id] = p.code; });
      const techMap = {};
      techs.forEach(t => { techMap[t.id] = t; });

      // 1. Get export transactions for techs
      const exportTransactions = allExportTransactions.filter(
        (t) => t.recipient_id && !!techMap[t.recipient_id]
      );

      // Initialize matrix: matrix[productCode][recipientId] = quantity
      const matrix = {};
      products.forEach(p => {
        matrix[p.code] = {};
        techs.forEach(t => { matrix[p.code][t.id] = 0; });
      });

      // Add exports (positive)
      exportTransactions.forEach(t => {
        const code = productCodeMap[t.product_id];
        if (code && matrix[code]) {
          matrix[code][t.recipient_id] = (matrix[code][t.recipient_id] || 0) + t.quantity;
        }
      });

      // Subtract usage from installation orders (negative)
      // Only subtract for recipients with normal allocation (not default)
      const orderRecipientMap = {};
      orders.forEach(o => { orderRecipientMap[o.id] = o.recipient_id; });

      items.forEach(item => {
        const recipientId = orderRecipientMap[item.order_id];
        const recipient = techMap[recipientId];
        // Chỉ trừ nếu KTV có allocation_type === 'normal', bỏ qua 'default'
        if (recipientId && recipient && recipient.allocation_type !== 'default') {
          const code = productCodeMap[item.product_id];
          if (code && matrix[code]) {
            matrix[code][recipientId] = (matrix[code][recipientId] || 0) - item.quantity;
          }
        }
      });

      // Build table data: each row = 1 product
      const data = products.map(p => {
        const row = {
          key: p.id,
          productCode: p.code,
          productName: p.name
        };
        techs.forEach(t => {
          row[`tech_${t.id}`] = matrix[p.code]?.[t.id] || 0;
        });
        return row;
      });

      // Build columns: first col = product code + name, then 1 col per tech
      const columns = [
        {
          title: 'Mã SP',
          dataIndex: 'productCode',
          key: 'productCode',
          fixed: 'left',
          width: isMobile ? 110 : 140,
          render: (code, record) => (
            <span title={record.productName}>{code}</span>
          )
        },
        {
          title: 'Tên SP',
          dataIndex: 'productName',
          key: 'productName',
          fixed: 'left',
          width: isMobile ? 140 : 180,
          ellipsis: { showTitle: true }
        },
        ...techs.map(t => ({
          title: t.allocation_type === 'default'
            ? `${t.code}\n${t.name}\n(MD)`
            : `${t.code}\n${t.name}`,
          dataIndex: `tech_${t.id}`,
          key: `tech_${t.id}`,
          width: isMobile ? 70 : 90,
          align: 'center',
          render: (val) => {
            if (val === 0) return <span style={{ color: '#ff4d4f', fontWeight: 'bold' }}>0</span>;
            if (val < 3) return <span style={{ color: '#fa8c16', fontWeight: '500' }}>{val}</span>;
            return <span style={{ color: '#52c41a' }}>{val}</span>;
          }
        }))
      ];

      setTechColumns(columns);
      setTechData(data);
    } catch (error) {
      console.error('Error loading tech product matrix:', error);
      throw error;
    }
  }, [isMobile]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setLoadError('');
    try {
      const [statistics, lowStock, categories] = await Promise.all([
        getStatistics(),
        getLowStockProducts(),
        getCategoryStats()
      ]);

      setStats(statistics);
      setLowStockProducts(lowStock);
      setCategoryStats(categories);

      await loadTechProductMatrix();
    } catch (error) {
      console.error(error);
      setLoadError('Không thể tải dữ liệu dashboard. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  }, [loadTechProductMatrix]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 0);

    return () => clearTimeout(timer);
  }, [loadData]);

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

  return (
    <div>
      {loadError && (
        <Alert
          type="error"
          showIcon
          message={loadError}
          action={<Button size="small" onClick={loadData}>Thử lại</Button>}
          style={{ marginBottom: 16 }}
        />
      )}

      <Spin spinning={isLoading}>

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
              title="Tổng nhập"
              value={stats.total_import}
              prefix={<PlusOutlined style={{ color: '#13c2c2' }} />}
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
        <Col xs={24} sm={12} md={6}>
          <Card hoverable>
            <Statistic
              title="Tổng xuất"
              value={stats.total_export}
              prefix={<InboxOutlined style={{ color: '#2f54eb' }} />}
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
              locale={{ emptyText: 'Không có sản phẩm sắp hết' }}
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
          <Card
            title="Linh kiện theo KTV/CTV"
            bordered={false}
          >
            <div style={{ overflowX: 'auto', maxHeight: '70vh', overflowY: 'auto' }}>
              <Table
                columns={techColumns}
                dataSource={techData}
                scroll={{ x: Math.max(800, (techColumns.length + 1) * (isMobile ? 80 : 100)), y: 500 }}
                size="small"
                pagination={false}
                bordered
                locale={{ emptyText: 'Không có dữ liệu' }}
                sticky
              />
            </div>
            <div style={{ marginTop: 8, fontSize: 12, color: '#888' }}>
              <span style={{ color: '#52c41a' }}>●</span> ≥ 3 (Đủ) &nbsp;
              <span style={{ color: '#fa8c16' }}>●</span> 1-2 (Sắp hết) &nbsp;
              <span style={{ color: '#ff4d4f', fontWeight: 'bold' }}>●</span> 0 (Hết hàng) &nbsp;|&nbsp;
              <span style={{ color: '#1890ff' }}>MD</span> = Cấp phát mặc định (không trừ đơn lắp đặt)
            </div>
          </Card>
        </Col>
      </Row>
      </Spin>
    </div>
  );
};

export default Dashboard;
