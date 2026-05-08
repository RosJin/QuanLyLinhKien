import React, { useEffect, useState } from "react";
import { Table, Button, Modal, Form, DatePicker, Select, Space, Popconfirm, message, Input, Typography, List, Divider, Card, Tag, Statistic } from "antd";
import { PlusOutlined, DeleteOutlined, EyeOutlined, EditOutlined, CheckCircleOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { getAllDropStocks, getDropStockDetail, deleteDropStock, getAvailableInstallationOrders, createDropStock, updateDropStock, updateDropStockStatus } from "../utils/dbUtils";
import useMobile from "../hooks/useMobile";

const { Text, Title } = Typography;
const { RangePicker } = DatePicker;

const DropStock = () => {
  const isMobile = useMobile();
  const [dropStocks, setDropStocks] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [editDetail, setEditDetail] = useState(null);
  const [availableOrders, setAvailableOrders] = useState([]);
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);
  const [editOrderIds, setEditOrderIds] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();

  useEffect(() => {
    loadDropStocks();
  }, []);

  const loadDropStocks = async () => {
    try {
      setLoading(true);
      const data = await getAllDropStocks();
      setDropStocks(data || []);
    } catch (error) {
      console.error(error);
      message.error("Lỗi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableOrders = async () => {
    try {
      const data = await getAvailableInstallationOrders();
      setAvailableOrders(data || []);
    } catch (error) {
      console.error(error);
    }
  };

  const handleAdd = () => {
    setSelectedOrderIds([]);
    form.resetFields();
    form.setFieldsValue({ date: dayjs() });
    loadAvailableOrders();
    setIsModalOpen(true);
  };

  const handleEdit = async (record) => {
    setEditingId(record.id);
    editForm.setFieldsValue({
      date: dayjs(record.date),
      note: record.note
    });
    const detailData = await getDropStockDetail(record.id);
    setEditDetail(detailData);
    const linkedOrderIds = (detailData?.grouped_by_technician || [])
      .flatMap(g => g.orders || [])
      .map(o => o.id);
    setEditOrderIds(linkedOrderIds);
    loadAvailableOrders();
    setIsEditOpen(true);
  };

  const handleViewDetail = async (record) => {
    try {
      const detailData = await getDropStockDetail(record.id);
      setDetail(detailData);
      setIsDetailOpen(true);
    } catch (error) {
      console.error(error);
      message.error("Lỗi xem chi tiết");
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteDropStock(id);
      message.success("Đã xóa");
      loadDropStocks();
    } catch (error) {
      message.error("Lỗi xóa phiếu");
      console.error(error);
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (selectedOrderIds.length === 0) {
        message.warning("Chọn ít nhất 1 phiếu");
        return;
      }
      await createDropStock({
        date: values.date.format("YYYY-MM-DD"),
        note: values.note || ""
      }, selectedOrderIds);
      message.success("Tạo phiếu thành công");
      setIsModalOpen(false);
      loadDropStocks();
    } catch (error) {
      console.error(error);
      message.error("Lỗi tạo phiếu");
    }
  };

  const handleEditSubmit = async () => {
    try {
      const values = await editForm.validateFields();
      if (editOrderIds.length === 0) {
        message.warning("Chọn ít nhất 1 phiếu");
        return;
      }
      await updateDropStock(editingId, {
        date: values.date.format("YYYY-MM-DD"),
        note: values.note || ""
      }, editOrderIds);
      message.success("Cập nhật thành công");
      setIsEditOpen(false);
      loadDropStocks();
    } catch (error) {
      console.error(error);
      message.error("Lỗi cập nhật");
    }
  };

  const handleUpdateStatus = async (id, status) => {
    try {
      await updateDropStockStatus(id, status);
      const statusText = status === 'confirmed' ? 'đã chốt' : 'đã đối soát';
      message.success(`Cập nhật trạng thái: ${statusText}`);
      loadDropStocks();
    } catch (error) {
      message.error("Lỗi cập nhật trạng thái");
      console.error(error);
    }
  };

  const getStatusTag = (record) => {
    const status = record.status || 'draft';
    const statusMap = {
      'draft': { color: 'default', text: 'Nháp' },
      'confirmed': { color: 'blue', text: 'Đã chốt' },
      'reconciled': { color: 'green', text: 'Đã đối soát' }
    };
    const info = statusMap[status] || statusMap['draft'];
    return <Tag color={info.color}>{info.text}</Tag>;
  };

  const orderOptions = availableOrders.map(o => ({
    label: `${o.code} - ${o.recipient?.name || "N/A"} (${(o.total_value || 0).toLocaleString('vi-VN')} đ)`,
    value: o.id,
    searchText: `${o.code} ${o.recipient?.name || ""}`.toLowerCase()
  }));

  const columns = [
    {
      title: "Mã phiếu",
      key: "order_codes",
      render: (_, record) => {
        const codes = (record.grouped_by_technician || [])
          .flatMap(g => g.orders || [])
          .map(o => o.code)
          .join(", ");
        return <Text strong>{codes || "N/A"}</Text>;
      },
      ellipsis: true,
      width: isMobile ? 150 : 250
    },
    { title: "Ngày", dataIndex: "date", key: "date", width: isMobile ? 90 : 110 },
    { title: "Số phiếu", dataIndex: "total_orders", key: "total_orders", width: isMobile ? 80 : 100 },
    {
      title: "Tiền (đ)",
      dataIndex: "grand_total",
      key: "grand_total",
      width: isMobile ? 100 : 130,
      render: (val) => (val || 0).toLocaleString("vi-VN") + " đ"
    },
    {
      title: "Trạng thái",
      key: "status",
      width: isMobile ? 90 : 120,
      render: (_, record) => getStatusTag(record)
    },
    { title: "Ghi chú", dataIndex: "note", key: "note", ellipsis: true, width: isMobile ? 100 : 150 },
    {
      title: "Thao tác",
      key: "actions",
      width: isMobile ? 90 : 250,
      render: (_, record) => (
        <Space size="small" wrap>
          <Button type="link" size={isMobile ? 'small' : 'middle'} icon={<EyeOutlined />} onClick={() => handleViewDetail(record)}>{isMobile ? '' : 'Chi tiết'}</Button>
          <Button type="link" size={isMobile ? 'small' : 'middle'} icon={<EditOutlined />} onClick={() => handleEdit(record)}>{isMobile ? '' : 'Sửa'}</Button>
          {(!record.status || record.status === 'draft') && (
            <Button
              type="link"
              size={isMobile ? 'small' : 'middle'}
              onClick={() => handleUpdateStatus(record.id, 'confirmed')}
            >
              {isMobile ? 'C' : 'Chốt'}
            </Button>
          )}
          {record.status === 'confirmed' && (
            <Button
              type="link"
              size={isMobile ? 'small' : 'middle'}
              style={{ color: '#52c41a' }}
              onClick={() => handleUpdateStatus(record.id, 'reconciled')}
            >
              {isMobile ? 'ĐS' : 'Đối soát'}
            </Button>
          )}
          <Popconfirm title="Xóa phiếu?" onConfirm={() => handleDelete(record.id)} okText="Xóa" cancelText="Hủy">
            <Button type="link" danger size={isMobile ? 'small' : 'middle'} icon={<DeleteOutlined />}>{isMobile ? '' : 'Xóa'}</Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  const renderTechnicianGroup = (group, idx) => (
    <Card key={idx} size="small" style={{ marginBottom: 8 }}>
      <p>
        <Text strong>{group.recipient?.name || 'N/A'}</Text>
        <Tag style={{ marginLeft: 8 }}>{group.recipient?.type === 'technician' ? 'KTV' : 'CTV'}</Tag>
      </p>
      <p>Tiền: {(group.total_amount || 0).toLocaleString("vi-VN")} đ</p>
      {(group.orders || []).map((order, oIdx) => (
        <div key={oIdx} style={{ paddingLeft: 16, fontSize: 13 }}>
          • {order.code} - {(order.total_value || 0).toLocaleString("vi-VN")} đ
        </div>
      ))}
    </Card>
  );

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd} style={isMobile ? { width: '100%' } : {}}>
          Tạo Drop Stock
        </Button>
      </div>

      <Table
        dataSource={dropStocks}
        columns={columns}
        rowKey="id"
        pagination={{ pageSize: 10 }}
        scroll={{ x: 900 }}
        loading={loading}
      />

      {/* Create Modal */}
      <Modal
        title="Tạo Drop Stock mới"
        open={isModalOpen}
        onOk={handleSubmit}
        onCancel={() => setIsModalOpen(false)}
        okText="Lưu"
        cancelText="Hủy"
        width={isMobile ? '95%' : 900}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="date" label="Ngày" rules={[{ required: true }]}>
            <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" />
          </Form.Item>
          <Form.Item name="note" label="Ghi chú">
            <Input.TextArea rows={2} placeholder="Nhập ghi chú (tùy chọn)" />
          </Form.Item>
          <Form.Item label="Chọn phiếu lắp đặt" required>
            <Select
              mode="multiple"
              placeholder="Chọn các phiếu lắp đặt"
              value={selectedOrderIds}
              onChange={setSelectedOrderIds}
              options={orderOptions}
              style={{ width: "100%" }}
              showSearch
              optionFilterProp="children"
              filterOption={(input, option) =>
                option.searchText?.includes(input.toLowerCase())
              }
              maxTagCount="responsive"
            />
            <Text type="secondary" style={{ fontSize: 12 }}>Đã chọn: {selectedOrderIds.length} phiếu</Text>
          </Form.Item>
        </Form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        title="Sửa Drop Stock"
        open={isEditOpen}
        onOk={handleEditSubmit}
        onCancel={() => { setIsEditOpen(false); setEditDetail(null); }}
        okText="Lưu"
        cancelText="Hủy"
        width={isMobile ? '95%' : 900}
      >
        <Form form={editForm} layout="vertical">
          <Form.Item name="date" label="Ngày" rules={[{ required: true }]}>
            <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" />
          </Form.Item>
          <Form.Item name="note" label="Ghi chú">
            <Input.TextArea rows={2} placeholder="Nhập ghi chú (tùy chọn)" />
          </Form.Item>
          <Form.Item label="Chọn phiếu lắp đặt">
            <Select
              mode="multiple"
              placeholder="Chọn các phiếu lắp đặt"
              value={editOrderIds}
              onChange={setEditOrderIds}
              options={orderOptions}
              style={{ width: "100%" }}
              showSearch
              optionFilterProp="children"
              filterOption={(input, option) =>
                option.searchText?.includes(input.toLowerCase())
              }
              maxTagCount="responsive"
            />
            <Text type="secondary" style={{ fontSize: 12 }}>Đã chọn: {editOrderIds.length} phiếu</Text>
          </Form.Item>
        </Form>
      </Modal>

      {/* Detail Modal */}
      <Modal
        title={`Chi tiết Drop Stock - ${detail?.date || ''}`}
        open={isDetailOpen}
        onCancel={() => { setIsDetailOpen(false); setDetail(null); }}
        footer={null}
        width={isMobile ? '95%' : 900}
      >
        {detail && (
          <div>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col xs={24} sm={8}>
                <Statistic title="Ngày" value={detail.date} />
              </Col>
              <Col xs={24} sm={8}>
                <Statistic title="Tổng số phiếu" value={detail.total_orders || 0} />
              </Col>
              <Col xs={24} sm={8}>
                <Statistic
                  title="Tổng tiền"
                  value={detail.grand_total || 0}
                  precision={0}
                  formatter={(val) => val.toLocaleString("vi-VN") + " đ"}
                />
              </Col>
            </Row>
            <p><strong>Ghi chú:</strong> {detail.note || "Không có"}</p>

            <Divider orientation="left">Chi tiết theo KTV/CTV</Divider>
            {(detail.grouped_by_technician || []).map((group, idx) => renderTechnicianGroup(group, idx))}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default DropStock;
