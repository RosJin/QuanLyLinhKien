import { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Input, Select, Space, Popconfirm, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { getAllRecipients, addRecipient, updateRecipient, deleteRecipient, searchRecipients } from '../utils/dbUtils';
import useMobile from '../hooks/useMobile';

const Recipients = () => {
  const isMobile = useMobile();
  const [recipients, setRecipients] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecipient, setEditingRecipient] = useState(null);
  const [form] = Form.useForm();

  useEffect(() => {
    loadRecipients();
  }, []);

  const loadRecipients = async () => {
    const data = await getAllRecipients();
    setRecipients(data);
  };

  const handleAdd = () => {
    setEditingRecipient(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const handleEdit = (record) => {
    setEditingRecipient(record);
    form.setFieldsValue(record);
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    await deleteRecipient(id);
    message.success('Đã xóa người nhận');
    loadRecipients();
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editingRecipient) {
        await updateRecipient(editingRecipient.id, values);
        message.success('Cập nhật thành công');
      } else {
        await addRecipient(values);
        message.success('Thêm người nhận thành công');
      }
      setIsModalOpen(false);
      loadRecipients();
    } catch (error) {
      console.error(error);
    }
  };

  const columns = [
    { title: 'Mã', dataIndex: 'code', key: 'code', width: isMobile ? 80 : 100 },
    { title: 'Tên', dataIndex: 'name', key: 'name', width: isMobile ? 120 : 200 },
    {
      title: 'Loại',
      dataIndex: 'type',
      key: 'type',
      width: isMobile ? 60 : 80,
      render: (type) => (
        <span>{type === 'customer' ? 'Khách hàng' : type === 'technician' ? 'KTV' : type === 'collaborator' ? 'CTV' : type}</span>
      )
    },
    { title: 'SĐT', dataIndex: 'phone', key: 'phone', width: isMobile ? 100 : 120 },
    { title: 'Tỉnh', dataIndex: 'province', key: 'province', width: isMobile ? 80 : 100 },
    { title: 'Khu vực', dataIndex: 'region', key: 'region', width: isMobile ? 60 : 80 },
    { title: 'Địa chỉ', dataIndex: 'address', key: 'address', ellipsis: true, width: isMobile ? 100 : 150 },
    {
      title: 'Thao tác',
      key: 'actions',
      width: isMobile ? 90 : 180,
      render: (_, record) => (
        <Space size="small" wrap>
          <Button type="link" size={isMobile ? 'small' : 'middle'} icon={<EditOutlined />} onClick={() => handleEdit(record)}>{isMobile ? '' : 'Sửa'}</Button>
          <Popconfirm
            title="Xóa người nhận"
            description="Bạn có chắc muốn xóa?"
            onConfirm={() => handleDelete(record.id)}
            okText="Xóa"
            cancelText="Hủy"
          >
            <Button type="link" danger size={isMobile ? 'small' : 'middle'} icon={<DeleteOutlined />}>{isMobile ? '' : 'Xóa'}</Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <Input.Search
          placeholder="Tìm kiếm theo mã, tên, SĐT, tỉnh..."
          allowClear
          style={{ width: isMobile ? '100%' : 300 }}
          onSearch={async (keyword) => {
            if (keyword) {
              const results = await searchRecipients(keyword);
              setRecipients(results);
            } else {
              loadRecipients();
            }
          }}
        />
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd} style={isMobile ? { width: '100%' } : {}}>
          Thêm người nhận
        </Button>
      </div>

      <Table dataSource={recipients} columns={columns} rowKey="id" pagination={{ pageSize: 10 }} scroll={{ x: 800 }} />

      <Modal
        title={editingRecipient ? 'Sửa người nhận' : 'Thêm người nhận mới'}
        open={isModalOpen}
        onOk={handleSubmit}
        onCancel={() => setIsModalOpen(false)}
        okText="Lưu"
        cancelText="Hủy"
        width={isMobile ? '95%' : 520}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="code" label="Mã người nhận" rules={[{ required: true, message: 'Vui lòng nhập mã' }]}>
            <Input placeholder="Nhập mã người nhận" />
          </Form.Item>
          <Form.Item name="name" label="Tên người nhận" rules={[{ required: true, message: 'Vui lòng nhập tên' }]}>
            <Input placeholder="Nhập tên người nhận" />
          </Form.Item>
          <Form.Item name="type" label="Loại" rules={[{ required: true, message: 'Vui lòng chọn loại' }]}>
            <Select placeholder="Chọn loại">
              <Select.Option value="customer">Khách hàng</Select.Option>
              <Select.Option value="technician">KTV</Select.Option>
              <Select.Option value="collaborator">CTV</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="phone" label="Số điện thoại">
            <Input placeholder="Nhập SĐT" />
          </Form.Item>
          <Form.Item name="province" label="Tỉnh/Thành phố">
            <Input placeholder="Nhập tỉnh/TP" />
          </Form.Item>
          <Form.Item name="region" label="Khu vực">
            <Select placeholder="Chọn Miền">
              <Select.Option value="Bắc">Miền Bắc</Select.Option>
              <Select.Option value="Trung">Miền Trung</Select.Option>
              <Select.Option value="Nam">Miền Nam</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="address" label="Địa chỉ">
            <Input.TextArea rows={3} placeholder="Nhập địa chỉ" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Recipients;
