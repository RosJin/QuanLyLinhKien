import { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Select, Input, InputNumber, Space, Popconfirm, message } from 'antd';
import { PlusOutlined, DeleteOutlined, LinkOutlined, EditOutlined } from '@ant-design/icons';
import { getAllBankingSlips, addBankingSlip, updateBankingSlip, deleteBankingSlip, getAllRecipients } from '../utils/dbUtils';
import dayjs from 'dayjs';

const BankingSlips = () => {
  const [slips, setSlips] = useState([]);
  const [recipients, setRecipients] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSlip, setEditingSlip] = useState(null);
  const [form] = Form.useForm();

  const loadData = async () => {
    const [slipsData, recipientsData] = await Promise.all([getAllBankingSlips(), getAllRecipients()]);
    setSlips(slipsData);
    setRecipients(recipientsData);
  };

  useEffect(() => { loadData(); }, []);

  const handleAdd = () => {
    setEditingSlip(null);
    form.resetFields();
    form.setFieldsValue({ transfer_date: dayjs().format('YYYY-MM-DD') });
    setIsModalOpen(true);
  };

  const handleEdit = (record) => {
    setEditingSlip(record);
    form.setFieldsValue({ ...record, transfer_date: record.transfer_date });
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    await deleteBankingSlip(id);
    message.success('Đã xóa phiếu');
    loadData();
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editingSlip) {
        await updateBankingSlip(editingSlip.id, { ...values, transfer_date: values.transfer_date });
        message.success('Cập nhật thành công');
      } else {
        await addBankingSlip({ ...values, transfer_date: values.transfer_date });
        message.success('Thêm phiếu thành công');
      }
      setIsModalOpen(false);
      loadData();
    } catch (error) { console.error(error); }
  };

  const columns = [
    { title: 'Mã', dataIndex: 'code', key: 'code' },
    { title: 'Người nhận', key: 'recipient_name', render: (_, r) => r.recipient?.name },
    { title: 'Ngày', dataIndex: 'transfer_date', key: 'transfer_date' },
    { title: 'Số tiền', dataIndex: 'amount', key: 'amount', render: (val) => val?.toLocaleString('vi-VN') + ' đ' },
    { title: 'Ghi chú', dataIndex: 'note', key: 'note', ellipsis: true },
    { title: 'Đã đối soát', key: 'reconciled', render: () => <span style={{ color: '#52c41a' }}>Chưa</span> },
    {
      title: 'Thao tác', key: 'actions',
      render: (_, record) => (
        <Space>
          <Button type="link" icon={<LinkOutlined />} onClick={() => {}}>Đối soát</Button>
          <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)}>Sửa</Button>
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
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>Thêm phiếu ngân hàng</Button>
      </div>
      <Table dataSource={slips} columns={columns} rowKey="id" pagination={{ pageSize: 10 }} />

      <Modal title={editingSlip ? 'Sửa phiếu' : 'Thêm phiếu ngân hàng'} open={isModalOpen} onOk={handleSubmit} onCancel={() => setIsModalOpen(false)} okText="Lưu" cancelText="Hủy" width={600}>
        <Form form={form} layout="vertical">
          <Form.Item name="code" label="Mã phiếu" rules={[{ required: true }]}><Input placeholder="Nhập mã phiếu" /></Form.Item>
          <Form.Item name="recipient_id" label="Người nhận" rules={[{ required: true }]}>
            <Select placeholder="Chọn người nhận" showSearch optionFilterProp="children">
              {recipients.map(r => <Select.Option key={r.id} value={r.id}>{r.code} - {r.name}</Select.Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="transfer_date" label="Ngày chuyển" rules={[{ required: true }]}>
            <Input type="date" />
          </Form.Item>
          <Form.Item name="amount" label="Số tiền" rules={[{ required: true }]}>
            <InputNumber min={0} style={{ width: '100%' }} placeholder="Nhập số tiền" />
          </Form.Item>
          <Form.Item name="note" label="Ghi chú"><Input.TextArea rows={3} /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default BankingSlips;
