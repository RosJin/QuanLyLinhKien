import { useEffect, useState } from 'react';
import { Table, DatePicker, Card, Row, Col, Statistic, Space, Select, Button } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { getStatistics, getCategoryStats, getAllRecipients, getRecipientExportReport, getAllInstallationOrders, getInstallationOrderItems } from '../utils/dbUtils';
import dayjs from 'dayjs';

const Reports = () => {
  const [stats, setStats] = useState({});
  const [categoryStats, setCategoryStats] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [recipients, setRecipients] = useState([]);
  const [selectedRecipient, setSelectedRecipient] = useState(null);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [techRecipients, setTechRecipients] = useState([]);
  const [selectedTech, setSelectedTech] = useState(null);
  const [issuedItems, setIssuedItems] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');

  const loadData = async () => {
    try {
      const [statistics, categories, allRecipients] = await Promise.all([
        getStatistics(),
        getCategoryStats(),
        getAllRecipients()
      ]);
      setStats(statistics);
      setCategoryStats(categories);
      setRecipients(allRecipients);
      setTechRecipients(allRecipients.filter(r => r.type === 'technician' || r.type === 'collaborator'));
    } catch (error) {
      console.error('Load data error:', error);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleViewIssuedItems = async (recipientId) => {
    if (!recipientId) {
      setSelectedTech(null);
      setIssuedItems([]);
      return;
    }
    try {
      setSelectedTech(recipientId);
      const orders = await getAllInstallationOrders();
      const recipientOrders = orders.filter(o => o.recipient_id === recipientId);
      let allItems = [];
      for (const order of recipientOrders) {
        const items = await getInstallationOrderItems(order.id);
        const mappedItems = items.map(item => ({
          ...item,
          order_code: order.code,
          order_date: order.order_date
        }));
        allItems = [...allItems, ...mappedItems];
      }
      setIssuedItems(allItems);
    } catch (error) {
      console.error('View issued items error:', error);
    }
  };

  const handleSearch = async () => {
    try {
      const start = startDate ? startDate.format('YYYY-MM-DD') : null;
      const end = endDate ? endDate.format('YYYY-MM-DD') : null;
      const trans = await getRecipientExportReport(selectedRecipient, start, end);
      setTransactions(trans);
    } catch (error) {
      console.error('Search error:', error);
    }
  };

  const transColumns = [
    { title: 'Ngày', dataIndex: 'created_at', key: 'created_at', render: (val) => val ? dayjs(val).format('DD/MM/YYYY HH:mm') : '' },
    { title: 'Mã SP', key: 'product_code', render: (_, r) => r.product?.code || '' },
    { title: 'Tên SP', key: 'product_name', render: (_, r) => r.product?.name || '' },
    { title: 'SL', dataIndex: 'quantity', key: 'quantity' },
    { title: 'Giá', dataIndex: 'price', key: 'price', render: (val) => (val || 0).toLocaleString('vi-VN') + ' đ' },
    { title: 'Người nhận', key: 'recipient_name', render: (_, r) => r.recipient?.name || '' },
    { title: 'Ghi chú', dataIndex: 'note', key: 'note' }
  ];

  const catColumns = [
    { title: 'Danh mục', render: (_, r) => r[0] || 'Chưa phân loại' },
    { title: 'Số lượng SP', render: (_, r) => r[1]?.count || 0 },
    { title: 'Tổng SL', render: (_, r) => r[1]?.total_qty || 0 },
    { title: 'Tổng giá trị', render: (_, r) => (r[1]?.total_value || 0).toLocaleString('vi-VN') + ' đ' }
  ];

  const issuedColumns = [
    { title: 'Mã phiếu', dataIndex: 'order_code', key: 'order_code' },
    { title: 'Ngày', dataIndex: 'order_date', key: 'order_date' },
    { title: 'Mã SP', key: 'product_code', render: (_, r) => r.product?.code || '' },
    { title: 'Tên SP', key: 'product_name', render: (_, r) => r.product?.name || '' },
    { title: 'SL', dataIndex: 'quantity', key: 'quantity' },
    { title: 'Đơn giá', key: 'price', render: (_, r) => (r.price || 0).toLocaleString('vi-VN') + ' đ' },
    { title: 'Thành tiền', key: 'total', render: (_, r) => ((r.quantity || 0) * (r.price || 0)).toLocaleString('vi-VN') + ' đ' }
  ];

  const recipientOptions = recipients.map(r => ({ label: r.code + ' - ' + r.name, value: r.id }));
  const techOptions = techRecipients.map(r => ({ label: r.code + ' - ' + r.name + ' (' + (r.type === 'technician' ? 'KTV' : 'CTV') + ')', value: r.id }));

  const renderOverview = () => (
    <>
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={4}><Card><Statistic title="Sản phẩm" value={stats.total_products || 0} /></Card></Col>
        <Col span={4}><Card><Statistic title="Tổng SL" value={stats.total_quantity || 0} /></Card></Col>
        <Col span={4}><Card><Statistic title="Tổng giá trị" value={stats.total_value || 0} precision={0} suffix="đ" formatter={(val) => (val || 0).toLocaleString('vi-VN')} /></Card></Col>
        <Col span={4}><Card><Statistic title="Nhập" value={stats.total_import || 0} /></Card></Col>
        <Col span={4}><Card><Statistic title="Xuất" value={stats.total_export || 0} /></Card></Col>
        <Col span={4}><Card><Statistic title="Sắp hết" value={stats.low_stock_count || 0} valueStyle={{ color: (stats.low_stock_count || 0) > 0 ? '#cf1322' : '#3f8600' }} /></Card></Col>
      </Row>
      <Card title="Thống kê theo danh mục" style={{ marginBottom: 24 }}>
        <Table dataSource={categoryStats.map(([cat, data]) => ({ category: cat, ...data }))} columns={catColumns} rowKey="category" size="small" pagination={false} />
      </Card>
    </>
  );

  const renderExportReport = () => (
    <Card>
      <div style={{ marginBottom: 16 }}>
        <Space>
          <Select
            placeholder="Chọn người nhận"
            allowClear
            style={{ width: 250 }}
            showSearch
            options={recipientOptions}
            onChange={(val) => { setSelectedRecipient(val); if (val) handleSearch(); }}
            value={selectedRecipient}
          />
          <DatePicker placeholder="Từ ngày" onChange={(d) => setStartDate(d)} />
          <DatePicker placeholder="Đến ngày" onChange={(d) => setEndDate(d)} />
          <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>Xem báo cáo</Button>
        </Space>
      </div>
      <Table dataSource={transactions} columns={transColumns} rowKey="id" pagination={{ pageSize: 15 }} />
    </Card>
  );

  const renderIssuedItems = () => (
    <Card>
      <div style={{ marginBottom: 16 }}>
        <Space>
          <Select
            placeholder="Chọn KTV/CTV"
            style={{ width: 300 }}
            showSearch
            options={techOptions}
            onChange={handleViewIssuedItems}
            value={selectedTech}
          />
        </Space>
      </div>
      <Table
        dataSource={issuedItems}
        columns={issuedColumns}
        rowKey="id"
        pagination={{ pageSize: 15 }}
        summary={(data) => {
          const total = data.reduce((sum, item) => sum + (item.quantity || 0) * (item.price || 0), 0);
          return (
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={5} align="right"><strong>Tổng cộng:</strong></Table.Summary.Cell>
              <Table.Summary.Cell index={1}><strong>{total.toLocaleString('vi-VN')} đ</strong></Table.Summary.Cell>
            </Table.Summary.Row>
          );
        }}
      />
    </Card>
  );

  return (
    <div>
      <h2>Báo cáo & Thống kê</h2>
      <div style={{ marginBottom: 16 }}>
        <Space>
          <Button type={activeTab === 'overview' ? 'primary' : 'default'} onClick={() => setActiveTab('overview')}>Tổng quan</Button>
          <Button type={activeTab === 'export' ? 'primary' : 'default'} onClick={() => setActiveTab('export')}>Báo cáo xuất kho</Button>
          <Button type={activeTab === 'issued' ? 'primary' : 'default'} onClick={() => setActiveTab('issued')}>Phát linh kiện KTV/CTV</Button>
        </Space>
      </div>
      {activeTab === 'overview' && renderOverview()}
      {activeTab === 'export' && renderExportReport()}
      {activeTab === 'issued' && renderIssuedItems()}
    </div>
  );
};

export default Reports;
