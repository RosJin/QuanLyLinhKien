import React, { useEffect, useState } from "react";
import { Table, Button, Modal, Form, DatePicker, Select, Space, Popconfirm, message, Input, Typography } from "antd";
import { PlusOutlined, DeleteOutlined, EyeOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { getAllDropStocks, getDropStockDetail, deleteDropStock, getAvailableInstallationOrders, createDropStock } from "../utils/dbUtils";

const { Text } = Typography;

const DropStock = () => {
  const [dropStocks, setDropStocks] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [availableOrders, setAvailableOrders] = useState([]);
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);
  const [form] = Form.useForm();

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

  const columns = [
    { title: "Ma phieu lap dat", dataIndex: "order_codes", key: "order_codes", ellipsis: true },
    { title: "Ngay", dataIndex: "date", key: "date" },
    { title: "So phieu", dataIndex: "total_orders", key: "total_orders" },
    {
      title: "Tong tien",
      dataIndex: "total_amount",
      key: "total_amount",
      render: (val) => (val || 0).toLocaleString("vi-VN") + " d"
    },
    { title: "Ghi chu", dataIndex: "note", key: "note", ellipsis: true },
    {
      title: "Thao tac",
      key: "actions",
      render: (_, record) => (
        <Space>
          <Button type="link" icon={<EyeOutlined />} onClick={() => handleViewDetail(record)}>Chi tiet</Button>
          <Popconfirm title="Xoa?" onConfirm={() => handleDelete(record.id)} okText="Xoa" cancelText="Huy">
            <Button type="link" danger icon={<DeleteOutlined />}>Xoa</Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  const orderOptions = availableOrders.map(o => ({
    label: o.code + " - " + (o.recipient?.name || "N/A"),
    value: o.id
  }));

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>Tao Drop Stock</Button>
      </div>

      <Table dataSource={dropStocks} columns={columns} rowKey="id" pagination={{ pageSize: 10 }} />

      <Modal
        title="Tao Drop Stock"
        open={isModalOpen}
        onOk={handleSubmit}
        onCancel={() => setIsModalOpen(false)}
        okText="Luu"
        cancelText="Huy"
        width={900}
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
        title="Chi tiet Drop Stock"
        open={isDetailOpen}
        onCancel={() => setIsDetailOpen(false)}
        footer={null}
        width={700}
      >
        {detail && (
          <div>
            <p><strong>Ngay: </strong>{detail.date}</p>
            <p><strong>Tong so phieu: </strong>{detail.total_orders}</p>
            <p><strong>Tong tien: </strong>{(detail.grand_total || 0).toLocaleString("vi-VN")} d</p>
            <p><strong>Ghi chu: </strong>{detail.note}</p>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default DropStock;
