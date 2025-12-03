/**
 * AdminLayout
 * Layout cho admin dashboard với sidebar navigation
 */

import React, { useState } from 'react';
import { Layout, Menu, Avatar, Dropdown } from 'antd';
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
  GiftOutlined,
  StarOutlined,
  ThunderboltOutlined,
  UndoOutlined,
  CustomerServiceOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { persistor } from '../../../store';
import { logout } from '../../../features/auth/authSlice';
import { resetCart } from '../../../features/cart/cartSlice';
import { authService } from '../../../api/authService';
import { useToast } from '../../../contexts/ToastContext';
import type { RootState } from '../../../store';
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
  const toast = useToast();
  
  const user = useSelector((state: RootState) => (state.auth as any).user);

  // Menu items
  const menuItems = [
    {
      key: '/admin',
      icon: <DashboardOutlined />,
      label: <Link to="/admin">Thống kê</Link>,
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
      key: '/admin/return-requests',
      icon: <UndoOutlined />,
      label: <Link to="/admin/return-requests">Hoàn hàng</Link>,
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
      key: '/admin/vouchers',
      icon: <GiftOutlined />,
      label: <Link to="/admin/vouchers">Mã giảm giá</Link>,
    },
    {
      key: '/admin/reviews',
      icon: <StarOutlined />,
      label: <Link to="/admin/reviews">Đánh giá</Link>,
    },
    {
      key: '/admin/flash-sales',
      icon: <ThunderboltOutlined />,
      label: <Link to="/admin/flash-sales">Flash Sales</Link>,
    },
    {
      key: '/admin/support',
      icon: <CustomerServiceOutlined />,
      label: <Link to="/admin/support">Hỗ trợ</Link>,
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
      dispatch(resetCart());
      try {
        await persistor.purge();
      } catch (purgeError) {
        console.error('Failed to purge Redux Persist:', purgeError);
        localStorage.removeItem('persist:auth');
      }
      toast.success('Đăng xuất thành công!');
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
            {collapsed ? 'QT' : 'Trang quản trị'}
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

