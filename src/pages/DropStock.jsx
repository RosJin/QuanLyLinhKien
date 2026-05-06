import React, { useEffect, useState } from "react";
import { Table, Button, Modal, Form, DatePicker, Select, Space, Popconfirm, message, Input, Typography, Tag, List, Divider, Card } from "antd";
import { PlusOutlined, DeleteOutlined, EyeOutlined, EditOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { getAllDropStocks, getDropStockDetail, deleteDropStock, getAvailableInstallationOrders, createDropStock, updateDropStock, updateDropStockStatus } from "../utils/dbUtils";
import useMobile from "../hooks/useMobile";

const { Text } = Typography;

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
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();

  useEffect(() => {
    loadDropStocks();
  }, []);

  const loadDropStocks = async () => {
    try {
      const data = await getAllDropStocks();
      setDropStocks(data || []);
    } catch (error) {
      console.error(error);
      message.error("Loi tai du lieu");
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
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteDropStock(id);
      message.success("Da xoa");
      loadDropStocks();
    } catch (error) {
      message.error("Loi xoa");
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (selectedOrderIds.length === 0) {
        message.warning("Chon it nhat 1 phieu");
        return;
      }
      await createDropStock({
        date: values.date.format("YYYY-MM-DD"),
        note: values.note || ""
      }, selectedOrderIds);
      message.success("Tao thanh cong");
      setIsModalOpen(false);
      loadDropStocks();
    } catch (error) {
      console.error(error);
    }
  };

  const handleEditSubmit = async () => {
    try {
      const values = await editForm.validateFields();
      if (editOrderIds.length === 0) {
        message.warning("Chon it nhat 1 phieu");
        return;
      }
      await updateDropStock(editingId, {
        date: values.date.format("YYYY-MM-DD"),
        note: values.note || ""
      }, editOrderIds);
      message.success("Cap nhat thanh cong");
      setIsEditOpen(false);
      loadDropStocks();
    } catch (error) {
      console.error(error);
    }
  };

  const handleUpdateStatus = async (id, status) => {
    try {
      await updateDropStockStatus(id, status);
      message.success("Cap nhat trang thai thanh cong");
      loadDropStocks();
    } catch (error) {
      message.error("Loi cap nhat trang thai");
    }
  };

  const getStatusTag = (record) => {
    const status = record.status || 'draft';
    const statusMap = {
      'draft': { color: 'default', text: 'Nhap' },
      'confirmed': { color: 'blue', text: 'Da chot' },
      'reconciled': { color: 'green', text: 'Da doi soat' }
    };
    const info = statusMap[status] || statusMap['draft'];
    return <Tag color={info.color}>{info.text}</Tag>;
  };

  const orderOptions = availableOrders.map(o => ({
    label: o.code + " - " + (o.recipient?.name || "N/A"),
    value: o.id
  }));

  const columns = [
    { title: "Ma phieu", dataIndex: "order_codes", key: "order_codes", ellipsis: true, width: isMobile ? 120 : 200 },
    { title: "Ngay", dataIndex: "date", key: "date", width: isMobile ? 90 : 110 },
    { title: "So phieu", dataIndex: "total_orders", key: "total_orders", width: isMobile ? 80 : 100 },
    {
      title: "Tien",
      dataIndex: "total_amount",
      key: "total_amount",
      width: isMobile ? 100 : 130,
      render: (val) => (val || 0).toLocaleString("vi-VN") + " d"
    },
    {
      title: "Trang thai",
      key: "status",
      width: isMobile ? 90 : 120,
      render: (_, record) => getStatusTag(record)
    },
    { title: "Ghi chu", dataIndex: "note", key: "note", ellipsis: true, width: isMobile ? 100 : 150 },
    {
      title: "Thao tac",
      key: "actions",
      width: isMobile ? 90 : 250,
      render: (_, record) => (
        <Space size="small" wrap>
          <Button type="link" size={isMobile ? 'small' : 'middle'} icon={<EyeOutlined />} onClick={() => handleViewDetail(record)}>{isMobile ? '' : 'Chi tiet'}</Button>
          <Button type="link" size={isMobile ? 'small' : 'middle'} icon={<EditOutlined />} onClick={() => handleEdit(record)}>{isMobile ? '' : 'Sua'}</Button>
          {!record.status || record.status === 'draft' ? (
            <Button type="link" size={isMobile ? 'small' : 'middle'} onClick={() => handleUpdateStatus(record.id, 'confirmed')}>{isMobile ? 'C' : 'Chot'}</Button>
          ) : null}
          <Popconfirm title="Xoa?" onConfirm={() => handleDelete(record.id)} okText="Xoa" cancelText="Huy">
            <Button type="link" danger size={isMobile ? 'small' : 'middle'} icon={<DeleteOutlined />}>{isMobile ? '' : 'Xoa'}</Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>Tao Drop Stock</Button>
      </div>

      <Table dataSource={dropStocks} columns={columns} rowKey="id" pagination={{ pageSize: 10 }} scroll={{ x: 900 }} />

      <Modal
        title="Tao Drop Stock"
        open={isModalOpen}
        onOk={handleSubmit}
        onCancel={() => setIsModalOpen(false)}
        okText="Luu"
        cancelText="Huy"
        width={isMobile ? '95%' : 900}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="date" label="Ngay" rules={[{ required: true }]}>
            <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" />
          </Form.Item>
          <Form.Item name="note" label="Ghi chu">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item label="Chon phieu lap dat">
            <Select
              mode="multiple"
              placeholder="Chon cac phieu lap dat"
              value={selectedOrderIds}
              onChange={setSelectedOrderIds}
              options={orderOptions}
              style={{ width: "100%" }}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Sua Drop Stock"
        open={isEditOpen}
        onOk={handleEditSubmit}
        onCancel={() => setIsEditOpen(false)}
        okText="Luu"
        cancelText="Huy"
        width={isMobile ? '95%' : 900}
      >
        <Form form={editForm} layout="vertical">
          <Form.Item name="date" label="Ngay" rules={[{ required: true }]}>
            <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" />
          </Form.Item>
          <Form.Item name="note" label="Ghi chu">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item label="Chon phieu lap dat">
            <Select
              mode="multiple"
              placeholder="Chon cac phieu lap dat"
              value={editOrderIds}
              onChange={setEditOrderIds}
              options={orderOptions}
              style={{ width: "100%" }}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Chi tiet Drop Stock"
        open={isDetailOpen}
        onCancel={() => { setIsDetailOpen(false); setDetail(null); }}
        footer={null}
        width={isMobile ? '95%' : 900}
      >
        {detail && (
          <div>
            <p><strong>Ngay: </strong>{detail.date}</p>
            <p><strong>Tong so phieu: </strong>{detail.total_orders}</p>
            <p><strong>Tong tien: </strong>{(detail.grand_total || 0).toLocaleString("vi-VN")} d</p>
            <p><strong>Ghi chu: </strong>{detail.note}</p>

            <Divider orientation="left">Chi tiet theo KTV/CTV</Divider>
            {(detail.grouped_by_technician || []).map((group, idx) => (
              <Card key={idx} size="small" style={{ marginBottom: 8 }}>
                <p><strong>{group.recipient?.name || 'N/A'}</strong> ({group.recipient?.type === 'technician' ? 'KTV' : 'CTV'})</p>
                <p>Tong tien: {(group.total_amount || 0).toLocaleString("vi-VN")} d</p>
                <List
                  size="small"
                  bordered
                  dataSource={group.orders || []}
                  renderItem={(item) => (
                    <List.Item>
                      {item.code} - {item.recipient?.name}
                      <span style={{ float: 'right' }}>{(item.total_value || 0).toLocaleString("vi-VN")} d</span>
                    </List.Item>
                  )}
                />
              </Card>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default DropStock;
