import React, { useState, useEffect } from "react";
import { Layout, Menu, theme, Button, Drawer } from "antd";
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
  SwapOutlined,
  MenuOutlined
} from "@ant-design/icons";
import { Outlet, useNavigate, useLocation } from "react-router-dom";

const { Header, Sider, Content } = Layout;

const AppLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { token: { colorBgContainer, borderRadiusLG } } = theme.useToken();

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

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

  const handleMenuClick = ({ key }) => {
    navigate(key);
    setMobileDrawerOpen(false);
  };

  const renderMenu = () => (
    <>
      <div style={{ height: 64, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <h1 style={{ color: "white", fontSize: isMobile ? 20 : collapsed ? 16 : 20, margin: 0 }}>
          {"Quan Ly Linh Kien"}
        </h1>
      </div>
      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={[location.pathname]}
        items={menuItems}
        onClick={handleMenuClick}
      />
    </>
  );

  return (
    <Layout style={{ minHeight: "100vh" }}>
      {!isMobile && (
        <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed}>
          {renderMenu()}
        </Sider>
      )}

      <Drawer
        placement="left"
        open={isMobile && mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
        styles={{ body: { padding: 0 } }}
        width={250}
      >
        {renderMenu()}
      </Drawer>

      <Layout>
        <Header style={{ padding: "0 16px", background: colorBgContainer, display: "flex", alignItems: "center" }}>
          {isMobile && (
            <Button
              type="text"
              icon={<MenuOutlined />}
              onClick={() => setMobileDrawerOpen(true)}
              style={{ marginRight: 12 }}
            />
          )}
          <h2 style={{ margin: 0, fontSize: isMobile ? 16 : 20, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            Quan Ly Kho Linh Kien
          </h2>
        </Header>
        <Content style={{ margin: isMobile ? 8 : 16 }}>
          <div style={{ padding: isMobile ? 12 : 24, background: colorBgContainer, borderRadius: borderRadiusLG, minHeight: 360 }}>
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default AppLayout;
