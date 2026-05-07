import { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Select, Input, InputNumber, Space, Popconfirm, message, Upload, Image, Tag, List, Divider, Spin } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined, EyeOutlined, UploadOutlined, DeleteFilled } from '@ant-design/icons';
import { getAllBankingSlips, addBankingSlip, updateBankingSlip, deleteBankingSlip, getAllRecipients, getAllInstallationOrders, getBankingSlipOrders, addBankingSlipOrder, deleteBankingSlipOrder } from '../utils/dbUtils';
import { uploadToCloudinary } from '../utils/cloudinaryUtils';
import dayjs from 'dayjs';
import useMobile from '../hooks/useMobile';

const BankingSlips = () => {
  const isMobile = useMobile();
  const [slips, setSlips] = useState([]);
  const [recipients, setRecipients] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSlip, setEditingSlip] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);
  const [linkedOrders, setLinkedOrders] = useState([]);
  const [availableOrders, setAvailableOrders] = useState([]);
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailSlip, setDetailSlip] = useState(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [form] = Form.useForm();

  const loadData = async () => {
    const [slipsData, recipientsData] = await Promise.all([getAllBankingSlips(), getAllRecipients()]);
    setSlips(slipsData);
    setRecipients(recipientsData);
  };

  useEffect(() => { loadData(); }, []);

  const handleAdd = () => {
    setEditingSlip(null);
    setImageUrl(null);
    setLinkedOrders([]);
    setSelectedOrderIds([]);
    form.resetFields();
    form.setFieldsValue({ transfer_date: dayjs().format('YYYY-MM-DD') });
    loadAvailableOrders();
    setIsModalOpen(true);
  };

  const handleEdit = async (record) => {
    setEditingSlip(record);
    setImageUrl(record.image_path || null);
    form.setFieldsValue({ ...record, transfer_date: record.transfer_date });
    loadAvailableOrders();
    const orders = await getBankingSlipOrders(record.id);
    setLinkedOrders(orders || []);
    setIsModalOpen(true);
  };

  const loadAvailableOrders = async () => {
    const orders = await getAllInstallationOrders();
    setAvailableOrders(orders || []);
  };

  const handleDelete = async (id) => {
    await deleteBankingSlip(id);
    message.success('Da xoa phieu');
    loadData();
  };

  const handleImageUpload = (options) => {
    const { onSuccess, onError, file } = options;
    setImageUploading(true);
    uploadToCloudinary(file).then(result => {
      setImageUrl(result.url);
      message.success('Upload anh thanh cong');
      setImageUploading(false);
      onSuccess(result, file);
    }).catch(error => {
      message.error(error.message);
      setImageUploading(false);
      onError(error);
    });
  };

  const handleRemoveImage = () => { setImageUrl(null); };

  const handleAddOrderLink = async () => {
    if (!editingSlip) {
      message.warning('Vui long luu phieu truoc khi lien ket don hang');
      return;
    }
    if (selectedOrderIds.length === 0) {
      message.warning('Chon it nhat mot phieu lap dat');
      return;
    }
    try {
      for (const orderId of selectedOrderIds) {
        await addBankingSlipOrder(editingSlip.id, orderId);
      }
      message.success('Da lien ket phieu lap dat');
      const orders = await getBankingSlipOrders(editingSlip.id);
      setLinkedOrders(orders || []);
      setSelectedOrderIds([]);
      loadData();
    } catch (error) {
      message.error('Loi lien ket: ' + error.message);
    }
  };

  const handleRemoveOrderLink = async (bsoId) => {
    try {
      await deleteBankingSlipOrder(bsoId);
      message.success('Da go lien ket');
      if (editingSlip) {
        const orders = await getBankingSlipOrders(editingSlip.id);
        setLinkedOrders(orders || []);
      }
      loadData();
    } catch (error) {
      message.error('Loi go lien ket: ' + error.message);
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const slipData = {
        ...values,
        transfer_date: values.transfer_date,
        image_path: imageUrl
      };
      if (editingSlip) {
        await updateBankingSlip(editingSlip.id, slipData);
        message.success('Cap nhat thanh cong');
      } else {
        const newId = await addBankingSlip(slipData);
        message.success('Them phieu thanh cong');
        if (selectedOrderIds.length > 0) {
          for (const orderId of selectedOrderIds) {
            await addBankingSlipOrder(newId, orderId);
          }
        }
      }
      setIsModalOpen(false);
      loadData();
    } catch (error) { console.error(error); }
  };

  const handleViewDetail = async (record) => {
    setDetailSlip(record);
    const orders = await getBankingSlipOrders(record.id);
    setLinkedOrders(orders || []);
    setIsDetailOpen(true);
  };

  const getReconciliationStatus = (slip) => {
    const linkedOrdersCount = slip.linked_orders_count || 0;
    if (linkedOrdersCount === 0) return { text: 'Chua doi soat', color: 'red' };
    return { text: 'Da doi soat', color: 'green' };
  };

  const columns = [
    { title: 'Ma', dataIndex: 'code', key: 'code' },
    { title: 'Nguoi nhan', key: 'recipient_name', render: (_, r) => r.recipient?.name },
    { title: 'Ngay', dataIndex: 'transfer_date', key: 'transfer_date' },
    { title: 'So tien', dataIndex: 'amount', key: 'amount', render: (val) => (val || 0).toLocaleString('vi-VN') + ' d' },
    {
      title: 'Chung tu',
      key: 'image',
      render: (_, record) => record.image_path ?
        <Button type="link" size="small" onClick={() => { setDetailSlip(record); handleViewDetail(record); }}>Xem anh</Button> :
        <span style={{ color: '#999' }}>Khong co</span>
    },
    {
      title: 'Da doi soat',
      key: 'reconced',
      render: (_, record) => {
        const status = getReconciliationStatus(record);
        return <Tag color={status.color}>{status.text}</Tag>;
      }
    },
    { title: 'Ghi chu', dataIndex: 'note', key: 'note', ellipsis: true },
    {
      title: 'Thao tac',
      key: 'actions',
      width: isMobile ? 90 : 200,
      render: (_, record) => (
        <Space size="small" wrap>
          <Button type="link" size={isMobile ? 'small' : 'middle'} icon={<EyeOutlined />} onClick={() => handleViewDetail(record)}>{isMobile ? '' : 'Chi tiet'}</Button>
          <Button type="link" size={isMobile ? 'small' : 'middle'} icon={<EditOutlined />} onClick={() => handleEdit(record)}>{isMobile ? '' : 'Sua'}</Button>
          <Popconfirm title="Xoa phieu?" onConfirm={() => handleDelete(record.id)} okText="Xoa" cancelText="Huy">
            <Button type="link" danger size={isMobile ? 'small' : 'middle'} icon={<DeleteOutlined />}>{isMobile ? '' : 'Xoa'}</Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>Them phieu ngan hang</Button>
      </div>
      <Table dataSource={slips} columns={columns} rowKey="id" pagination={{ pageSize: 10 }} scroll={{ x: 900 }} />

      <Modal
        title={editingSlip ? 'Sua phieu ngan hang' : 'Them phieu ngan hang'}
        open={isModalOpen}
        onOk={handleSubmit}
        onCancel={() => setIsModalOpen(false)}
        okText="Luu"
        cancelText="Huy"
        width={isMobile ? '95%' : 800}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="code" label="Ma phieu" rules={[{ required: true }]}>
            <Input placeholder="Nhap ma phieu" />
          </Form.Item>
          <Form.Item name="recipient_id" label="Nguoi nhan" rules={[{ required: true }]}>
            <Select placeholder="Chon nguoi nhan" showSearch optionFilterProp="children">
              {recipients.map(r => <Select.Option key={r.id} value={r.id}>{r.code} - {r.name}</Select.Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="transfer_date" label="Ngay chuyen" rules={[{ required: true }]}>
            <Input type="date" />
          </Form.Item>
          <Form.Item name="amount" label="So tien" rules={[{ required: true }]}>
            <InputNumber min={0} style={{ width: '100%' }} placeholder="Nhap so tien" />
          </Form.Item>
          <Form.Item name="note" label="Ghi chu">
            <Input.TextArea rows={3} />
          </Form.Item>

          <Divider orientation="left">Upload chung tu chuyen khoan</Divider>
          {imageUploading ? (
            <div style={{ marginBottom: 16, textAlign: 'center' }}>
              <Spin size="large" />
              <p>Dang upload anh len Cloudinary...</p>
            </div>
          ) : imageUrl ? (
            <div style={{ marginBottom: 16, textAlign: 'center' }}>
              <Image src={imageUrl} alt="Chung tu" style={{ maxHeight: 200 }} />
              <br />
              <Button type="link" danger icon={<DeleteFilled />} onClick={handleRemoveImage}>Xoa anh</Button>
            </div>
          ) : (
            <Upload
              accept="image/*"
              maxCount={1}
              customRequest={handleImageUpload}
              showUploadList={false}
            >
              <Button icon={<UploadOutlined />}>Chon anh chung tu</Button>
            </Upload>
          )}

          {editingSlip && (
            <>
              <Divider orientation="left">Lien ket phieu lap dat</Divider>
              <div style={{ marginBottom: 16 }}>
                <Select
                  mode="multiple"
                  placeholder="Chon phieu lap dat de lien ket"
                  value={selectedOrderIds}
                  onChange={(value) => setSelectedOrderIds(value)}
                  style={{ width: '100%' }}
                  showSearch
                  optionFilterProp="children"
                >
                  {availableOrders
                    .filter(o => o.recipient_id === form.getFieldValue('recipient_id'))
                    .map(o => (
                      <Select.Option key={o.id} value={o.id}>
                        {o.code} - {o.recipient?.name} ({(o.total_value || 0).toLocaleString('vi-VN')} d)
                      </Select.Option>
                    ))}
                </Select>
                <Button type="primary" size="small" style={{ marginTop: 8 }} onClick={handleAddOrderLink}>
                  Lien ket
                </Button>
              </div>

              <List
                size="small"
                bordered
                dataSource={linkedOrders}
                renderItem={(item) => (
                  <List.Item
                    actions={[
                      <Button type="link" danger size="small" icon={<DeleteOutlined />} onClick={() => handleRemoveOrderLink(item.id)}>Go</Button>
                    ]}
                  >
                    {item.order?.code} - {item.order?.recipient?.name} ({(item.order?.total_value || 0).toLocaleString('vi-VN')} d)
                  </List.Item>
                )}
                locale={{ emptyText: 'Chua lien ket phieu nao' }}
              />
            </>
          )}
        </Form>
      </Modal>

      <Modal
        title={`Chi tiet: ${detailSlip?.code || ''}`}
        open={isDetailOpen}
        onCancel={() => { setIsDetailOpen(false); setDetailSlip(null); }}
        footer={null}
        width={isMobile ? '95%' : 700}
      >
        {detailSlip && (
          <div>
            <p><strong>Nguoi nhan:</strong> {detailSlip.recipient?.name}</p>
            <p><strong>Ngay chuyen:</strong> {detailSlip.transfer_date}</p>
            <p><strong>So tien:</strong> {(detailSlip.amount || 0).toLocaleString('vi-VN')} d</p>
            <p><strong>Ghi chu:</strong> {detailSlip.note || 'Khong co'}</p>

            {detailSlip.image_path && (
              <div style={{ margin: '16px 0', textAlign: 'center' }}>
                <Image src={detailSlip.image_path} alt="Chung tu" style={{ maxHeight: 300 }} />
              </div>
            )}

            <Divider orientation="left">Phieu lap dat da lien ket</Divider>
            <List
              size="small"
              bordered
              dataSource={linkedOrders}
              renderItem={(item) => (
                <List.Item>
                  {item.order?.code} - {item.order?.recipient?.name}
                  <span style={{ float: 'right' }}>{(item.order?.total_value || 0).toLocaleString('vi-VN')} d</span>
                </List.Item>
              )}
              locale={{ emptyText: 'Chua lien ket phieu nao' }}
            />
          </div>
        )}
      </Modal>
    </div>
  );
};

export default BankingSlips;
