import React, { useState } from "react";
import { Layout, Menu, theme } from "antd";
import {
  DashboardOutlined,
  InboxOutlined,
  DatabaseOutlined,
  ToolOutlined,
  BoxPlotOutlined,
  TeamOutlined,
  FileTextOutlined,
  BankOutlined,
  ReconciliationOutlined,
  BarChartOutlined,
  SwapOutlined
} from "@ant-design/icons";
import { Outlet, useNavigate, useLocation } from "react-router-dom";

const { Header, Sider, Content } = Layout;

const AppLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { token: { colorBgContainer, borderRadiusLG } } = theme.useToken();

  const menuItems = [
    { key: "/dashboard", icon: <DashboardOutlined />, label: "Dashboard" },
    { key: "/physical-stock", icon: <InboxOutlined />, label: "Kho vat ly" },
    { key: "/total-stock", icon: <DatabaseOutlined />, label: "Tong kho" },
    { key: "/products", icon: <ToolOutlined />, label: "San pham" },
    { key: "/combos", icon: <BoxPlotOutlined />, label: "Combo" },
    { key: "/recipients", icon: <TeamOutlined />, label: "Nguoi nhan" },
    { key: "/installation-orders", icon: <FileTextOutlined />, label: "Phieu lap dat" },
    { key: "/banking-slips", icon: <BankOutlined />, label: "Phieu ngan hang" },
    { key: "/reconciliation", icon: <ReconciliationOutlined />, label: "Doi soat" },
    { key: "/drop-stock", icon: <SwapOutlined />, label: "Drop Stock" },
    { key: "/reports", icon: <BarChartOutlined />, label: "Bao cao" }
  ];

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed}>
        <div style={{ height: 64, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <h1 style={{ color: "white", fontSize: collapsed ? 16 : 20, margin: 0 }}>
            {collapsed ? "QLLK" : "Quan Ly Linh Kien"}
          </h1>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout>
        <Header style={{ padding: "0 16px", background: colorBgContainer }}>
          <h2 style={{ margin: 0 }}>Quan Ly Kho Linh Kien</h2>
        </Header>
        <Content style={{ margin: 16 }}>
          <div style={{ padding: 24, background: colorBgContainer, borderRadius: borderRadiusLG, minHeight: 360 }}>
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default AppLayout;
