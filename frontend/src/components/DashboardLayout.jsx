import React from 'react';
import { Layout, Menu, Switch } from 'antd';
import {
  UnorderedListOutlined,
  BarChartOutlined,
  FileExcelOutlined,
  SearchOutlined,
  TableOutlined,
  MoonOutlined,
  SunOutlined,
  LogoutOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import './DashboardLayout.css';

const { Header, Sider, Content } = Layout;

const DashboardLayout = ({ children, selectedKey = 'cases', onMenuClick, hideLayout = false }) => {
  const { isDarkMode, toggleTheme } = useTheme();
  const { currentUser, logout, canAccessStatistics, canAccessData } = useAuth();

  // If hideLayout is true, render children without sidebar
  if (hideLayout) {
    return <>{children}</>;
  }

  const menuItems = [
    { key: 'cases', icon: <UnorderedListOutlined />, label: 'Cases' },
    canAccessStatistics && { key: 'statistics', icon: <BarChartOutlined />, label: 'Statistics' },
    { key: 'search', icon: <SearchOutlined />, label: 'Search' },
    // XLSX Import removed
    canAccessData && { key: 'data', icon: <TableOutlined />, label: 'Data' },
  ].filter(Boolean);

  return (
  <Layout className="dashboard-shell">
    <Sider width={300} className="dashboard-sider">
      <div className="sider-brand">
        <img src="/logo.png" alt="Logo" className="brand-logo" />
        <div className="brand-title">Syrbanism Referral System for HLP</div>
        <p className="brand-caption">Referral Tracker</p>
      </div>
      <div className="sider-section">
        <p className="section-label">Cases</p>
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={({ key }) => onMenuClick && onMenuClick(key)}
        />
      </div>
      <div className="sider-section">
        <p className="section-label">Settings</p>
        <div style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 8 }} className="theme-toggle">
          <SunOutlined style={{ fontSize: 16 }} className="theme-icon" />
          <Switch checked={isDarkMode} onChange={toggleTheme} />
          <MoonOutlined style={{ fontSize: 16 }} className="theme-icon" />
        </div>
        {currentUser && (
          <div style={{ padding: '8px 16px', marginTop: 8 }} className="user-info">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              {currentUser.avatar ? (
                <img
                  src={currentUser.avatar}
                  alt="avatar"
                  style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }}
                  onError={(e) => {
                    e.currentTarget.src = 'data:image/svg+xml;utf8,\
<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">\
  <circle cx="16" cy="16" r="16" fill="%23ddd"/>\
  <circle cx="16" cy="12" r="6" fill="%23bbb"/>\
  <path d="M4 28c2.5-6 9-8 12-8s9.5 2 12 8" fill="%23bbb"/>\
</svg>';
                  }}
                />
              ) : (
                <UserOutlined className="user-icon" />
              )}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 14 }} className="user-name">{currentUser.name}</span>
                {(currentUser.title || currentUser.organization) && (
                  <span style={{ fontSize: 12, color: '#888' }}>{[currentUser.title, currentUser.organization].filter(Boolean).join(' • ')}</span>
                )}
              </div>
            </div>
            <div style={{ fontSize: 12, marginLeft: 24 }} className="user-role">
              {currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1)}
            </div>
          </div>
        )}
      </div>
      <div className="sider-section muted">
        <p className="section-label">{currentUser?.role === 'admin' ? 'Admin' : 'User'}</p>
        <p className="section-link" onClick={() => onMenuClick && onMenuClick('settings')} style={{ cursor: 'pointer' }}>
          {currentUser?.role === 'admin' ? 'User Management' : 'Account Settings'}
        </p>
        <p className="section-link" onClick={logout} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
          <LogoutOutlined /> Logout
        </p>
      </div>
    </Sider>
    <Layout className="dashboard-main">
      <Content className="dashboard-content">
        {children}
      </Content>
    </Layout>
  </Layout>
);
};

export default DashboardLayout;
