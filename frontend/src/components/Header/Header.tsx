import React, { useState } from 'react';
import { SearchOutlined, ShoppingCartOutlined, UserOutlined, MenuOutlined } from '@ant-design/icons';
import { Input, Button, Badge, Dropdown } from 'antd';
import './Header.scss';

const Header: React.FC = () => {
  const [searchValue, setSearchValue] = useState('');

  const menuItems = [
    {
      key: 'phones',
      label: 'Điện thoại',
      children: [
        { key: 'iphone', label: 'iPhone' },
        { key: 'samsung', label: 'Samsung' },
        { key: 'xiaomi', label: 'Xiaomi' },
        { key: 'oppo', label: 'OPPO' },
        { key: 'vivo', label: 'vivo' },
      ]
    },
    {
      key: 'tablets',
      label: 'Máy tính bảng',
    },
    {
      key: 'laptops',
      label: 'Laptop',
    },
    {
      key: 'audio',
      label: 'Âm thanh',
    },
    {
      key: 'watches',
      label: 'Đồng hồ',
    },
    {
      key: 'accessories',
      label: 'Phụ kiện',
    },
    {
      key: 'home',
      label: 'Đồ gia dụng',
    },
  ];

  const userMenuItems = [
    {
      key: 'login',
      label: 'Đăng nhập',
    },
    {
      key: 'register',
      label: 'Đăng ký',
    },
    {
      key: 'profile',
      label: 'Tài khoản',
    },
    {
      key: 'orders',
      label: 'Đơn hàng',
    },
  ];

  return (
    <header className="header">
      {/* Top banner */}
      <div className="header-banner">
        <div className="container">
          <div className="banner-content">
            <span>Sản phẩm <strong>Chính hãng - Xuất VAT</strong> đầy đủ</span>
            <span><strong>Giao nhanh - Miễn phí</strong> cho đơn 300k</span>
            <span><strong>Thu cũ</strong> giá ngon - <strong>Lên đời</strong> tiết kiệm</span>
          </div>
        </div>
      </div>

      {/* Main header */}
      <div className="header-main">
        <div className="container">
          <div className="header-content">
            {/* Logo */}
            <div className="logo">
              <h1>LMobile</h1>
            </div>

            {/* Search bar */}
            <div className="search-container">
              <Input
                placeholder="Tìm kiếm điện thoại, laptop, phụ kiện..."
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                prefix={<SearchOutlined />}
                className="search-input"
                size="large"
              />
              <Button type="primary" size="large" className="search-btn">
                Tìm kiếm
              </Button>
            </div>

            {/* Right side actions */}
            <div className="header-actions">
              {/* Location */}
              <div className="location">
                <span>Cửa hàng gần bạn</span>
              </div>

              {/* Cart */}
              <div className="cart">
                <Badge count={0} showZero>
                  <Button type="text" icon={<ShoppingCartOutlined />} size="large">
                    Giỏ hàng
                  </Button>
                </Badge>
              </div>

              {/* User menu */}
              <div className="user-menu">
                <Dropdown
                  menu={{ items: userMenuItems }}
                  placement="bottomRight"
                  trigger={['click']}
                >
                  <Button type="text" icon={<UserOutlined />} size="large">
                    Đăng nhập
                  </Button>
                </Dropdown>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="header-nav">
        <div className="container">
          <div className="nav-content">
            <div className="nav-menu">
              <Dropdown
                menu={{ items: menuItems }}
                placement="bottomLeft"
                trigger={['hover']}
                overlayClassName="category-dropdown"
              >
                <Button type="text" icon={<MenuOutlined />} size="large">
                  Danh mục
                </Button>
              </Dropdown>

              <div className="nav-links">
                <a href="/phones">Điện thoại</a>
                <a href="/tablets">Máy tính bảng</a>
                <a href="/laptops">Laptop</a>
                <a href="/audio">Âm thanh</a>
                <a href="/watches">Đồng hồ</a>
                <a href="/accessories">Phụ kiện</a>
                <a href="/home">Đồ gia dụng</a>
              </div>
            </div>

            <div className="nav-promotions">
              <a href="/trade-in">Thu cũ đổi mới</a>
              <a href="/used">Hàng cũ</a>
              <a href="/promotions">Khuyến mãi</a>
              <a href="/news">Tin công nghệ</a>
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
};

export default Header;
