/**
 * SellerLayout
 * Layout cho seller dashboard với sidebar navigation
 */

import React, { useState } from 'react';
import { Layout, Menu, Avatar, Dropdown, message } from 'antd';
import {
  DashboardOutlined,
  ShoppingOutlined,
  FolderOutlined,
  ShoppingCartOutlined,
  FileTextOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UserOutlined,
  CustomerServiceOutlined,
  StarOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { persistor } from '../../../store';
import { logout } from '../../../features/auth/authSlice';
import { authService } from '../../../api/authService';
import type { RootState } from '../../../store';
import './SellerLayout.scss';

const { Header, Sider, Content } = Layout;

interface SellerLayoutProps {
  children: React.ReactNode;
}

const SellerLayout: React.FC<SellerLayoutProps> = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  
  const user = useSelector((state: RootState) => (state.auth as any).user);

  // Menu items for seller
  const menuItems = [
    {
      key: '/seller/dashboard',
      icon: <DashboardOutlined />,
      label: <Link to="/seller/dashboard">Tổng quan</Link>,
    },
    {
      key: '/seller/products',
      icon: <ShoppingOutlined />,
      label: <Link to="/seller/products">Sản phẩm</Link>,
    },
    {
      key: '/seller/orders',
      icon: <ShoppingCartOutlined />,
      label: <Link to="/seller/orders">Đơn hàng</Link>,
    },
    {
      key: '/seller/categories',
      icon: <FolderOutlined />,
      label: <Link to="/seller/categories">Danh mục</Link>,
    },
    {
      key: '/seller/blogs',
      icon: <FileTextOutlined />,
      label: <Link to="/seller/blogs">Bài viết</Link>,
    },
    {
      key: '/seller/reviews',
      icon: <StarOutlined />,
      label: <Link to="/seller/reviews">Đánh giá</Link>,
    },
    {
      key: '/seller/support',
      icon: <CustomerServiceOutlined />,
      label: <Link to="/seller/support">Hỗ trợ</Link>,
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
    <Layout className="seller-layout">
      <Sider 
        trigger={null} 
        collapsible 
        collapsed={collapsed}
        className="seller-sidebar"
        width={250}
      >
        <div className="seller-logo">
          <Link to="/seller/dashboard">
            {collapsed ? 'QL' : 'Trang quản lý'}
          </Link>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          className="seller-menu"
        />
      </Sider>
      <Layout className="seller-content-layout" style={{ marginLeft: collapsed ? 80 : 250 }}>
        <Header className="seller-header">
          <div className="seller-header-left">
            {React.createElement(collapsed ? MenuUnfoldOutlined : MenuFoldOutlined, {
              className: 'trigger',
              onClick: () => setCollapsed(!collapsed),
            })}
          </div>
          <div className="seller-header-right">
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <div className="seller-user-info">
                <Avatar icon={<UserOutlined />} src={user?.avatar} />
                <span className="seller-user-name">{user?.name || user?.email || 'Seller'}</span>
              </div>
            </Dropdown>
          </div>
        </Header>
        <Content className="seller-content">
          {children}
        </Content>
      </Layout>
    </Layout>
  );
};

export default SellerLayout;

