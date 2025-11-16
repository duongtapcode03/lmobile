/**
 * AdminLayout
 * Layout cho admin dashboard với sidebar navigation
 */

import React, { useState } from 'react';
import { Layout, Menu, Avatar, Dropdown, message } from 'antd';
import {
  DashboardOutlined,
  ShoppingOutlined,
  FolderOutlined,
  ShoppingCartOutlined,
  UserOutlined,
  PictureOutlined,
  TagsOutlined,
  FileTextOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { persistor } from '../../store';
import { logout } from '../../features/auth/authSlice';
import { authService } from '../../api/authService';
import type { RootState } from '../../store';
import './AdminLayout.scss';

const { Header, Sider, Content } = Layout;

interface AdminLayoutProps {
  children: React.ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  
  const user = useSelector((state: RootState) => (state.auth as any).user);
  const isAuthenticated = useSelector((state: RootState) => (state.auth as any).isAuthenticated);

  // Menu items
  const menuItems = [
    {
      key: '/admin',
      icon: <DashboardOutlined />,
      label: <Link to="/admin">Tổng quan</Link>,
    },
    {
      key: '/admin/products',
      icon: <ShoppingOutlined />,
      label: <Link to="/admin/products">Sản phẩm</Link>,
    },
    {
      key: '/admin/categories',
      icon: <FolderOutlined />,
      label: <Link to="/admin/categories">Danh mục</Link>,
    },
    {
      key: '/admin/orders',
      icon: <ShoppingCartOutlined />,
      label: <Link to="/admin/orders">Đơn hàng</Link>,
    },
    {
      key: '/admin/users',
      icon: <UserOutlined />,
      label: <Link to="/admin/users">Người dùng</Link>,
    },
    {
      key: '/admin/banners',
      icon: <PictureOutlined />,
      label: <Link to="/admin/banners">Banners</Link>,
    },
    {
      key: '/admin/brands',
      icon: <TagsOutlined />,
      label: <Link to="/admin/brands">Thương hiệu</Link>,
    },
    {
      key: '/admin/blogs',
      icon: <FileTextOutlined />,
      label: <Link to="/admin/blogs">Bài viết</Link>,
    },
    {
      key: '/admin/settings',
      icon: <SettingOutlined />,
      label: <Link to="/admin/settings">Cài đặt</Link>,
    },
  ];

  // User menu dropdown
  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'Thông tin cá nhân',
      onClick: () => navigate('/profile'),
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Đăng xuất',
      danger: true,
      onClick: handleLogout,
    },
  ];

  async function handleLogout() {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout API call failed:', error);
    } finally {
      dispatch(logout());
      try {
        await persistor.purge();
      } catch (purgeError) {
        console.error('Failed to purge Redux Persist:', purgeError);
        localStorage.removeItem('persist:auth');
      }
      message.success('Đăng xuất thành công!');
      navigate('/login');
    }
  }

  // Get selected menu key from current path
  const selectedKey = location.pathname;

  return (
    <Layout className="admin-layout">
      <Sider 
        trigger={null} 
        collapsible 
        collapsed={collapsed}
        className="admin-sidebar"
        width={250}
      >
        <div className="admin-logo">
          <Link to="/admin">
            {collapsed ? 'A' : 'Admin Panel'}
          </Link>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          className="admin-menu"
        />
      </Sider>
      <Layout className="admin-content-layout" style={{ marginLeft: collapsed ? 80 : 250 }}>
        <Header className="admin-header">
          <div className="admin-header-left">
            {React.createElement(collapsed ? MenuUnfoldOutlined : MenuFoldOutlined, {
              className: 'trigger',
              onClick: () => setCollapsed(!collapsed),
            })}
          </div>
          <div className="admin-header-right">
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <div className="admin-user-info">
                <Avatar icon={<UserOutlined />} src={user?.avatar} />
                <span className="admin-user-name">{user?.name || user?.email || 'Admin'}</span>
              </div>
            </Dropdown>
          </div>
        </Header>
        <Content className="admin-content">
          {children}
        </Content>
      </Layout>
    </Layout>
  );
};

export default AdminLayout;

