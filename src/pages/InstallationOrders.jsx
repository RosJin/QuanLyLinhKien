import React, { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Select, Input, InputNumber, Space, Popconfirm, message, Card, Row, Col, Typography } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { getAllInstallationOrders, getInstallationOrderItems, addInstallationOrder, updateInstallationOrder, deleteInstallationOrder, getAllRecipients, getAllProducts, getAllCombos, getComboItems } from '../utils/dbUtils';

const { Title, Text } = Typography;

const InstallationOrders = () => {
  const [orders, setOrders] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [recipients, setRecipients] = useState([]);
  const [products, setProducts] = useState([]);
  const [combos, setCombos] = useState([]);
  const [orderItems, setOrderItems] = useState([]);
  const [orderCombos, setOrderCombos] = useState([]);
  const [comboItems, setComboItems] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailItems, setDetailItems] = useState([]);
  const [form] = Form.useForm();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [ordersData, recipientsData, productsData, combosData] = await Promise.all([
      getAllInstallationOrders(),
      getAllRecipients(),
      getAllProducts(),
      getAllCombos()
    ]);
    setOrders(ordersData);
    setRecipients(recipientsData);
    setProducts(productsData);
    setCombos(combosData);
  };

  const handleAdd = () => {
    setEditingOrder(null);
    setOrderItems([]);
    setOrderCombos([]);
    setComboItems([]);
    form.resetFields();
    form.setFieldsValue({ order_date: new Date().toISOString().split('T')[0] });
    setIsModalOpen(true);
  };

  const handleEdit = async (order) => {
    setEditingOrder(order);
    setOrderItems([]);
    setOrderCombos([]);
    form.setFieldsValue({
      code: order.code,
      recipient_id: order.recipient_id,
      order_date: order.order_date,
      note: order.note
    });

    const items = await getInstallationOrderItems(order.id);
    const mappedItems = items.map(item => ({
      product_id: item.product_id,
      quantity: item.quantity,
      price: item.price
    }));
    setOrderItems(mappedItems);

    setIsModalOpen(true);
  };

  const addOrderItem = () => {
    setOrderItems([...orderItems, { product_id: null, quantity: 1, price: 0 }]);
  };

  const updateOrderItem = (index, field, value) => {
    const newItems = [...orderItems];
    newItems[index][field] = value;
    if (field === 'product_id') {
      const product = products.find(p => p.id === value);
      if (product) newItems[index].price = product.price;
    }
    setOrderItems(newItems);
  };

  const removeOrderItem = (index) => {
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  const handleComboChange = async (comboId) => {
    if (comboId) {
      const items = await getComboItems(comboId);
      setComboItems(items);
    } else {
      setComboItems([]);
    }
  };

  const addComboToOrder = async () => {
    const comboId = form.getFieldValue('combo_id');
    if (!comboId) {
      message.warning('Vui lòng chọn Combo');
      return;
    }
    const quantity = form.getFieldValue('combo_quantity') || 1;
    const combo = combos.find(c => c.id === comboId);
    const items = await getComboItems(comboId);
    setOrderCombos([...orderCombos, { combo_id: comboId, quantity, unit_price: combo?.price || 0, items }]);
    setComboItems([]);
    form.setFieldsValue({ combo_id: undefined, combo_quantity: 1 });
    message.success('Đã thêm Combo vào phiếu');
  };

  const removeCombo = (index) => {
    setOrderCombos(orderCombos.filter((_, i) => i !== index));
  };

  const calculateTotal = () => {
    const itemsTotal = orderItems.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    const combosTotal = orderCombos.reduce((sum, c) => sum + (c.unit_price * c.quantity), 0);
    return itemsTotal + combosTotal;
  };

  const calculateTotalQty = () => {
    const itemsQty = orderItems.reduce((sum, item) => sum + item.quantity, 0);
    const combosQty = orderCombos.reduce((sum, c) => {
      const comboItemsQty = (c.items || []).reduce((s, i) => s + i.quantity * c.quantity, 0);
      return sum + comboItemsQty;
    }, 0);
    return itemsQty + combosQty;
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (orderItems.length === 0 && orderCombos.length === 0) {
        message.warning('Vui lòng thêm ít nhất một sản phẩm hoặc combo');
        return;
      }

      const allItems = [
        ...orderItems.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          price: item.price
        })),
        ...orderCombos.flatMap(combo => (combo.items || []).map(item => ({
          product_id: item.product_id,
          quantity: item.quantity * combo.quantity,
          price: item.product?.price || 0
        })))
      ];

      if (editingOrder) {
        await updateInstallationOrder(editingOrder.id, {
          ...values,
          total_quantity: calculateTotalQty(),
          total_value: calculateTotal()
        }, allItems);
        message.success('Cập nhật phiếu thành công');
      } else {
        await addInstallationOrder({
          ...values,
          total_quantity: calculateTotalQty(),
          total_value: calculateTotal()
        }, allItems);
        message.success('Tạo phiếu lắp đặt thành công');
      }

      setIsModalOpen(false);
      loadData();
    } catch (error) {
      console.error(error);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteInstallationOrder(id);
      message.success('Đã xóa phiếu');
      loadData();
    } catch (error) {
      message.error('Lỗi khi xóa phiếu: ' + error.message);
      console.error(error);
    }
  };

  const handleViewDetail = async (order) => {
    setSelectedOrder(order);
    const items = await getInstallationOrderItems(order.id);
    setDetailItems(items);
    setIsDetailOpen(true);
  };

  const columns = [
    { title: 'Mã', dataIndex: 'code', key: 'code' },
    { title: 'Người nhận', key: 'recipient_name', render: (_, record) => record.recipient?.name },
    { title: 'Loại', key: 'recipient_type', render: (_, record) => record.recipient?.type === 'technician' ? 'KTV' : record.recipient?.type === 'collaborator' ? 'CTV' : 'KH' },
    { title: 'Ngày', dataIndex: 'order_date', key: 'order_date' },
    { title: 'SL', dataIndex: 'total_quantity', key: 'total_quantity' },
    { title: 'Giá trị', dataIndex: 'total_value', key: 'total_value', render: (val) => val?.toLocaleString('vi-VN') + ' đ' },
    { title: 'Ghi chú', dataIndex: 'note', key: 'note', ellipsis: true },
    {
      title: 'Thao tác',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)}>Sửa</Button>
          <Button type="link" onClick={() => handleViewDetail(record)}>Chi tiết</Button>
          <Popconfirm title="Xóa phiếu?" onConfirm={() => handleDelete(record.id)} okText="Xóa" cancelText="Hủy">
            <Button type="link" danger icon={<DeleteOutlined />}>Xóa</Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>Tạo phiếu lắp đặt</Button>
      </div>

      <Table dataSource={orders} columns={columns} rowKey="id" pagination={{ pageSize: 10 }} />

      <Modal
        title={editingOrder ? 'Sửa phiếu lắp đặt' : 'Tạo phiếu lắp đặt mới'}
        open={isModalOpen}
        onOk={handleSubmit}
        onCancel={() => setIsModalOpen(false)}
        okText="Lưu"
        cancelText="Hủy"
        width={800}
      >
        <Form form={form} layout="vertical" onValuesChange={(changedValues) => {
          if (changedValues.combo_id !== undefined) {
            handleComboChange(changedValues.combo_id);
          }
        }}>
          <Form.Item name="code" label="Mã phiếu" rules={[{ required: true }]}>
            <Input placeholder="Nhập mã phiếu" />
          </Form.Item>
          <Form.Item name="recipient_id" label="Người nhận" rules={[{ required: true }]}>
            <Select placeholder="Chọn người nhận" showSearch optionFilterProp="children">
              {recipients.map(r => <Select.Option key={r.id} value={r.id}>{r.code} - {r.name}</Select.Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="order_date" label="Ngày lắp đặt" rules={[{ required: true }]}>
            <Input type="date" />
          </Form.Item>
          <Form.Item name="note" label="Ghi chú">
            <Input.TextArea rows={2} />
          </Form.Item>

          <Card title="Sản phẩm & Combo" size="small">
            <div style={{ marginBottom: 16, padding: 16, background: '#fafafa', borderRadius: 8 }}>
              <Row gutter={8} align="middle" style={{ marginBottom: 8 }}>
                <Col span={8}>
                  <Form.Item name="combo_id" style={{ marginBottom: 0 }}>
                    <Select
                      placeholder="Chọn Combo"
                      allowClear
                      showSearch
                      optionFilterProp="children"
                      style={{ width: '100%' }}
                    >
                      {combos.map(c => (
                        <Select.Option key={c.id} value={c.id}>{c.code} - {c.name}</Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name="combo_quantity" initialValue={1} style={{ marginBottom: 0 }}>
                    <InputNumber min={1} placeholder="SL Combo" style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col span={4}>
                  <Button type="dashed" onClick={addComboToOrder}>Thêm Combo</Button>
                </Col>
                <Col span={6}>
                  <Button size="small" type="dashed" onClick={addOrderItem} style={{ width: '100%' }}>+ Thêm SP lẻ</Button>
                </Col>
              </Row>
              {comboItems.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <Text strong>Chi tiết Combo:</Text>
                  {comboItems.map((item, idx) => (
                    <div key={idx} style={{ marginTop: 4 }}>
                      {item.product?.code} - {item.product?.name}: {item.quantity} {item.product?.unit}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {orderItems.map((item, index) => (
              <Row gutter={8} key={`item-${index}`} style={{ marginBottom: 8 }}>
                <Col span={10}>
                  <Select
                    placeholder="Chọn SP"
                    value={item.product_id}
                    onChange={(val) => updateOrderItem(index, 'product_id', val)}
                    style={{ width: '100%' }}
                    showSearch
                  >
                    {products.map(p => <Select.Option key={p.id} value={p.id}>{p.code} - {p.name}</Select.Option>)}
                  </Select>
                </Col>
                <Col span={6}>
                  <InputNumber
                    min={1}
                    value={item.quantity}
                    onChange={(val) => updateOrderItem(index, 'quantity', val)}
                    style={{ width: '100%' }}
                    placeholder="SL"
                  />
                </Col>
                <Col span={6}>
                  <InputNumber
                    min={0}
                    value={item.price}
                    onChange={(val) => updateOrderItem(index, 'price', val)}
                    style={{ width: '100%' }}
                    placeholder="Giá"
                  />
                </Col>
                <Col span={2}>
                  <Button type="text" danger icon={<DeleteOutlined />} onClick={() => removeOrderItem(index)} />
                </Col>
              </Row>
            ))}

            {orderCombos.map((combo, index) => (
              <div key={`combo-${index}`} style={{ marginBottom: 8, padding: 8, background: '#e6f7ff', borderRadius: 4 }}>
                <Row gutter={8} align="middle">
                  <Col span={20}>
                    <Text strong>{combos.find(c => c.id === combo.combo_id)?.code} - {combos.find(c => c.id === combo.combo_id)?.name}</Text>
                    <Text type="secondary"> (SL: {combo.quantity} x {combo.unit_price?.toLocaleString('vi-VN')} đ = {(combo.quantity * combo.unit_price)?.toLocaleString('vi-VN')} đ)</Text>
                  </Col>
                  <Col span={4} style={{ textAlign: 'right' }}>
                    <Button type="text" danger icon={<DeleteOutlined />} onClick={() => removeCombo(index)} />
                  </Col>
                </Row>
                {(combo.items || []).map((item, idx) => (
                  <div key={idx} style={{ marginTop: 4, marginLeft: 16 }}>
                    {item.product?.code} - {item.product?.name}: {item.quantity * combo.quantity} {item.product?.unit} (Giá lẻ: {item.product?.price?.toLocaleString('vi-VN')} đ)
                  </div>
                ))}
              </div>
            ))}

            <Row gutter={8} style={{ marginTop: 8 }}>
              <Col span={12}><strong>Tổng SL: {calculateTotalQty()}</strong></Col>
              <Col span={12} style={{ textAlign: 'right' }}><strong>Tổng tiền: {calculateTotal().toLocaleString('vi-VN')} đ</strong></Col>
            </Row>
          </Card>
        </Form>
      </Modal>

      <Modal
        title={`Chi tiết phiếu: ${selectedOrder?.code || ''}`}
        open={isDetailOpen}
        onCancel={() => setIsDetailOpen(false)}
        footer={null}
        width={600}
      >
        {detailItems.map((item, index) => (
          <div key={index} style={{ marginBottom: 8, padding: 8, background: '#f5f5f5', borderRadius: 4 }}>
            <strong>{item.product?.code} - {item.product?.name}</strong><br />
            SL: {item.quantity} x {item.price?.toLocaleString('vi-VN')} đ = {(item.quantity * item.price)?.toLocaleString('vi-VN')} đ
          </div>
        ))}
      </Modal>
    </div>
  );
};

export default InstallationOrders;
