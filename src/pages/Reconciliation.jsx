import React, { useEffect, useState } from "react";
import { Table, Select, Statistic, Card, Row, Col, Typography, Tag } from "antd";
import { getAllDropStocks, getDropStockDetail, getAllBankingSlips, getAllRecipients } from "../utils/dbUtils";

const { Text } = Typography;

const Reconciliation = () => {
  const [dropStocks, setDropStocks] = useState([]);
  const [bankingSlips, setBankingSlips] = useState([]);
  const [recipients, setRecipients] = useState([]);
  const [selectedRecipient, setSelectedRecipient] = useState(null);

  useEffect(() => {
    loadRecipients();
    loadDropStocks();
    loadBankingSlips();
  }, []);

  const loadRecipients = async () => {
    const data = await getAllRecipients();
    setRecipients(data.filter(r => r.type === "technician" || r.type === "collaborator"));
  };

  const loadDropStocks = async () => {
    try {
      const data = await getAllDropStocks();
      setDropStocks(data || []);
    } catch (error) {
      console.error(error);
    }
  };

  const loadBankingSlips = async () => {
    try {
      const data = await getAllBankingSlips();
      setBankingSlips(data || []);
    } catch (error) {
      console.error(error);
    }
  };

  // Calculate per-tech totals from Drop Stocks
  const getTechTotalsFromDropStocks = () => {
    const techTotals = {};

    dropStocks.forEach(ds => {
      if (!ds.grouped_by_technician) return;
      ds.grouped_by_technician.forEach(group => {
        const recipientId = group.recipient?.id;
        if (!recipientId) return;
        if (!techTotals[recipientId]) {
          techTotals[recipientId] = {
            recipient: group.recipient,
            dropStockTotal: 0,
            bankingTotal: 0,
            dropStockCount: 0
          };
        }
        techTotals[recipientId].dropStockTotal += group.total_amount || 0;
        techTotals[recipientId].dropStockCount += 1;
      });
    });

    return techTotals;
  };

  // Calculate per-tech totals from Banking Slips
  const getTechTotalsFromBanking = () => {
    const techTotals = {};

    bankingSlips.forEach(slip => {
      const recipientId = slip.recipient_id;
      if (!recipientId) return;
      if (!techTotals[recipientId]) {
        techTotals[recipientId] = 0;
      }
      techTotals[recipientId] += slip.amount || 0;
    });

    return techTotals;
  };

  const techDropTotals = getTechTotalsFromDropStocks();
  const techBankingTotals = getTechTotalsFromBanking();

  // Build reconciliation data
  const reconciliationData = Object.keys(techDropTotals).map(recipientId => {
    const dropInfo = techDropTotals[recipientId];
    const bankingTotal = techBankingTotals[recipientId] || 0;
    const diff = (dropInfo.dropStockTotal || 0) - bankingTotal;

    return {
      key: recipientId,
      recipient: dropInfo.recipient,
      dropStockTotal: dropInfo.dropStockTotal || 0,
      bankingTotal: bankingTotal,
      diff: diff,
      dropStockCount: dropInfo.dropStockCount || 0,
      status: diff > 0 ? "Thieu tien" : diff < 0 ? "Thua tien" : "Du tien"
    };
  });

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
    { title: "So Drop Stock", dataIndex: "dropStockCount", key: "dropStockCount" }
  ];

  const totalDropStock = reconciliationData.reduce((sum, item) => sum + item.dropStockTotal, 0);
  const totalBanking = reconciliationData.reduce((sum, item) => sum + item.bankingTotal, 0);
  const totalDiff = totalDropStock - totalBanking;

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Card><Statistic title="Tong (Drop Stock)" value={totalDropStock} precision={0} suffix="d" formatter={(val) => val.toLocaleString("vi-VN")} /></Card>
        </Col>
        <Col span={8}>
          <Card><Statistic title="Tong (Banking Slips)" value={totalBanking} precision={0} suffix="d" formatter={(val) => val.toLocaleString("vi-VN")} /></Card>
        </Col>
        <Col span={8}>
          <Card><Statistic title="Chenh lech" value={totalDiff} precision={0} suffix="d" valueStyle={{ color: totalDiff > 0 ? "#cf1322" : totalDiff < 0 ? "#3f8600" : "#000" }} formatter={(val) => val.toLocaleString("vi-VN")} /></Card>
        </Col>
      </Row>

      <Card title="Doi soat: Drop Stock vs Banking Slips">
        <Table dataSource={reconciliationData} columns={columns} rowKey="key" pagination={{ pageSize: 10 }} />
      </Card>
    </div>
  );
};

export default Reconciliation;
