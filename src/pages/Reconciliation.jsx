import React, { useEffect, useState } from "react";
import { Table, Select, Statistic, Card, Row, Col, Typography, Tag, DatePicker, Button, Modal, List, Input, Divider } from "antd";
import { getAllDropStocks, getDropStockDetail, getAllBankingSlips, getAllRecipients, getBankingSlipOrders } from "../utils/dbUtils";
import dayjs from "dayjs";
import useMobile from '../hooks/useMobile';

const { Text, Title } = Typography;
const { RangePicker } = DatePicker;

const Reconciliation = () => {
  const isMobile = useMobile();
  const [dropStocks, setDropStocks] = useState([]);
  const [bankingSlips, setBankingSlips] = useState([]);
  const [recipients, setRecipients] = useState([]);
  const [selectedRecipient, setSelectedRecipient] = useState(null);
  const [dateRange, setDateRange] = useState(null);
  const [reconData, setReconData] = useState([]);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailData, setDetailData] = useState(null);
  const [detailSlip, setDetailSlip] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [dropStocksData, bankingSlipsData, recipientsData] = await Promise.all([
      getAllDropStocks(),
      getAllBankingSlips(),
      getAllRecipients()
    ]);
    setDropStocks(dropStocksData || []);
    setBankingSlips(bankingSlipsData || []);
    setRecipients(recipientsData.filter(r => r.type === "technician" || r.type === "collaborator"));
    buildReconciliationData(dropStocksData, bankingSlipsData, recipientsData);
  };

  const buildReconciliationData = (dropStocksData, bankingSlipsData, recipientsData) => {
    const techMap = {};
    recipientsData
      .filter(r => r.type === "technician" || r.type === "collaborator")
      .forEach(r => {
        techMap[r.id] = {
          recipient: r,
          dropStockTotal: 0,
          bankingTotal: 0,
          dropStockCount: 0,
          bankingCount: 0,
          dropStockIds: [],
          bankingIds: []
        };
      });

    (dropStocksData || []).forEach(ds => {
      if (!ds.grouped_by_technician) return;
      ds.grouped_by_technician.forEach(group => {
        const recipientId = group.recipient?.id;
        if (!recipientId || !techMap[recipientId]) return;
        techMap[recipientId].dropStockTotal += group.total_amount || 0;
        techMap[recipientId].dropStockCount += 1;
        techMap[recipientId].dropStockIds.push(ds.id);
      });
    });

    (bankingSlipsData || []).forEach(slip => {
      const recipientId = slip.recipient_id;
      if (!recipientId || !techMap[recipientId]) return;
      techMap[recipientId].bankingTotal += slip.amount || 0;
      techMap[recipientId].bankingCount += 1;
      techMap[recipientId].bankingIds.push(slip.id);
    });

    const data = Object.keys(techMap)
      .map(recipientId => {
        const info = techMap[recipientId];
        const diff = (info.dropStockTotal || 0) - (info.bankingTotal || 0);
        return {
          key: recipientId,
          recipient: info.recipient,
          dropStockTotal: info.dropStockTotal || 0,
          bankingTotal: info.bankingTotal || 0,
          diff: diff,
          dropStockCount: info.dropStockCount || 0,
          bankingCount: info.bankingCount || 0,
          dropStockIds: info.dropStockIds,
          bankingIds: info.bankingIds,
          status: diff > 0 ? "Thieu tien" : diff < 0 ? "Thua tien" : "Du tien"
        };
      })
      .filter(item => item.dropStockCount > 0 || item.bankingCount > 0);

    setReconData(data);
  };

  const handleFilter = async () => {
    let filteredDropStocks = dropStocks;
    let filteredBankingSlips = bankingSlips;

    if (dateRange && dateRange[0] && dateRange[1]) {
      const start = dateRange[0].startOf('day');
      const end = dateRange[1].endOf('day');
      filteredDropStocks = dropStocks.filter(ds => {
        const d = dayjs(ds.date);
        return d.isAfter(start) && d.isBefore(end);
      });
      filteredBankingSlips = bankingSlips.filter(slip => {
        const d = dayjs(slip.transfer_date);
        return d.isAfter(start) && d.isBefore(end);
      });
    }

    if (selectedRecipient) {
      filteredDropStocks = filteredDropStocks.filter(ds => {
        if (!ds.grouped_by_technician) return false;
        return ds.grouped_by_technician.some(g => g.recipient?.id === selectedRecipient);
      });
      filteredBankingSlips = filteredBankingSlips.filter(slip => slip.recipient_id === selectedRecipient);
    }

    buildReconciliationData(filteredDropStocks, filteredBankingSlips, recipients);
  };

  const handleViewDetail = async (record) => {
    setDetailData(record);
    const slipDetails = [];
    for (const slipId of record.bankingIds || []) {
      const slip = bankingSlips.find(s => s.id === slipId);
      if (slip) {
        const linkedOrders = await getBankingSlipOrders(slipId);
        slipDetails.push({
          ...slip,
          linkedOrders: linkedOrders || []
        });
      }
    }
    setDetailSlip(slipDetails);
    setIsDetailOpen(true);
  };

  const columns = [
    {
      title: "Ky thuat vien",
      dataIndex: "recipient",
      key: "recipient",
      render: (recipient) => recipient?.name || "N/A"
    },
    {
      title: "Tong tien (Drop Stock)",
      dataIndex: "dropStockTotal",
      key: "dropStockTotal",
      render: (val) => (val || 0).toLocaleString("vi-VN") + " d"
    },
    {
      title: "Tien da nhan (Banking)",
      dataIndex: "bankingTotal",
      key: "bankingTotal",
      render: (val) => (val || 0).toLocaleString("vi-VN") + " d"
    },
    {
      title: "Chenh lech",
      dataIndex: "diff",
      key: "diff",
      render: (val) => {
        const color = val > 0 ? "#cf1322" : val < 0 ? "#3f8600" : "#000";
        return <span style={{ color }}>{(val || 0).toLocaleString("vi-VN") + " d"}</span>;
      }
    },
    {
      title: "Trang thai",
      dataIndex: "status",
      key: "status",
      render: (status) => {
        const color = status === "Thieu tien" ? "red" : status === "Thua tien" ? "green" : "blue";
        return <Tag color={color}>{status}</Tag>;
      }
    },
    { title: "So Drop Stock", dataIndex: "dropStockCount", key: "dropStockCount" },
    { title: "So Banking Slip", dataIndex: "bankingCount", key: "bankingCount" },
    {
      title: "Chi tiet",
      key: "actions",
      render: (_, record) => (
        <Button type="link" onClick={() => handleViewDetail(record)}>Xem chi tiet</Button>
      )
    }
  ];

  const totalDropStock = reconData.reduce((sum, item) => sum + item.dropStockTotal, 0);
  const totalBanking = reconData.reduce((sum, item) => sum + item.bankingTotal, 0);
  const totalDiff = totalDropStock - totalBanking;

  return (
    <div>
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Tong (Drop Stock)"
              value={totalDropStock}
              precision={0}
              suffix="d"
              formatter={(val) => val.toLocaleString("vi-VN")}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Tong (Banking Slips)"
              value={totalBanking}
              precision={0}
              suffix="d"
              formatter={(val) => val.toLocaleString("vi-VN")}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Chenh lech"
              value={totalDiff}
              precision={0}
              suffix="d"
              valueStyle={{ color: totalDiff > 0 ? "#cf1322" : totalDiff < 0 ? "#3f8600" : "#000" }}
              formatter={(val) => val.toLocaleString("vi-VN")}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Button type="primary" onClick={loadData} style={{ width: "100%", height: "100%" }}>
              Lam moi du lieu
            </Button>
          </Card>
        </Col>
      </Row>

      <Card title="Bo loc" style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={8}>
            <RangePicker
              style={{ width: "100%" }}
              onChange={(dates) => setDateRange(dates)}
              placeholder={["Tu ngay", "Den ngay"]}
            />
          </Col>
          <Col xs={24} sm={8}>
            <Select
              placeholder="Chon KTV/CTV"
              allowClear
              style={{ width: "100%" }}
              value={selectedRecipient}
              onChange={setSelectedRecipient}
              showSearch
              optionFilterProp="children"
            >
              {recipients.map(r => (
                <Select.Option key={r.id} value={r.id}>{r.code} - {r.name}</Select.Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={8}>
            <Button type="primary" onClick={handleFilter} style={{ width: isMobile ? '100%' : 'auto' }}>Loc du lieu</Button>
          </Col>
        </Row>
      </Card>

      <Card title="Doi soat: Drop Stock vs Banking Slips">
        <Table dataSource={reconData} columns={columns} rowKey="key" pagination={{ pageSize: 10 }} scroll={{ x: 800 }} />
      </Card>

      <Modal
        title={`Chi tiet doi soat: ${detailData?.recipient?.name || ''}`}
        open={isDetailOpen}
        onCancel={() => { setIsDetailOpen(false); setDetailData(null); setDetailSlip(null); }}
        footer={null}
        width={isMobile ? '95%' : 800}
      >
        {detailData && (
          <div>
            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
              <Col xs={24} sm={8}>
                <Statistic title="Tong Drop Stock" value={detailData.dropStockTotal} precision={0} suffix="d" formatter={(val) => val.toLocaleString("vi-VN")} />
              </Col>
              <Col xs={24} sm={8}>
                <Statistic title="Tien da nhan" value={detailData.bankingTotal} precision={0} suffix="d" formatter={(val) => val.toLocaleString("vi-VN")} />
              </Col>
              <Col xs={24} sm={8}>
                <Statistic
                  title="Chenh lech"
                  value={detailData.diff}
                  precision={0}
                  suffix="d"
                  valueStyle={{ color: detailData.diff > 0 ? "#cf1322" : detailData.diff < 0 ? "#3f8600" : "#000" }}
                  formatter={(val) => val.toLocaleString("vi-VN")}
                />
              </Col>
            </Row>

            <Divider orientation="left">Chi tiet Banking Slips & Phieu lien ket</Divider>
            {detailSlip && detailSlip.map((slip, idx) => (
              <Card key={idx} size="small" style={{ marginBottom: 8 }}>
                <p><strong>Ma phieu:</strong> {slip.code} | <strong>Ngay:</strong> {slip.transfer_date} | <strong>So tien:</strong> {(slip.amount || 0).toLocaleString("vi-VN")} d</p>
                <List
                  size="small"
                  bordered
                  dataSource={slip.linkedOrders || []}
                  renderItem={(item) => (
                    <List.Item>
                      {item.order?.code} - {item.order?.recipient?.name}
                      <span style={{ float: 'right' }}>{(item.order?.total_value || 0).toLocaleString("vi-VN")} d</span>
                    </List.Item>
                  )}
                  locale={{ emptyText: 'Chua lien ket phieu nao' }}
                />
              </Card>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Reconciliation;
