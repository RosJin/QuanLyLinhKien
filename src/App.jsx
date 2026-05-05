import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ConfigProvider } from "antd";
import viVN from "antd/locale/vi_VN";
import AppLayout from "./components/AppLayout";

import Dashboard from "./pages/Dashboard";
import PhysicalStock from "./pages/PhysicalStock";
import TotalStock from "./pages/TotalStock";
import Products from "./pages/Products";
import Combos from "./pages/Combos";
import Recipients from "./pages/Recipients";
import InstallationOrders from "./pages/InstallationOrders";
import BankingSlips from "./pages/BankingSlips";
import Reconciliation from "./pages/Reconciliation";
import Reports from "./pages/Reports";
import DropStock from "./pages/DropStock";

function App() {
  return (
    <ConfigProvider locale={viVN}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AppLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="physical-stock" element={<PhysicalStock />} />
            <Route path="total-stock" element={<TotalStock />} />
            <Route path="products" element={<Products />} />
            <Route path="combos" element={<Combos />} />
            <Route path="recipients" element={<Recipients />} />
            <Route path="installation-orders" element={<InstallationOrders />} />
            <Route path="banking-slips" element={<BankingSlips />} />
            <Route path="reconciliation" element={<Reconciliation />} />
            <Route path="drop-stock" element={<DropStock />} />
            <Route path="reports" element={<Reports />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  );
}

export default App;
