// @ts-nocheck
import React, { useState } from 'react';
import { SearchOutlined, ShoppingCartOutlined, UserOutlined, MenuOutlined, LogoutOutlined, SettingOutlined } from '@ant-design/icons';
import { Input, Button, Badge, Dropdown, Avatar, message } from 'antd';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { logout } from '../../features/auth/authSlice';
import { authService } from '../../api/authService';
import LanguageSwitcher from '../LanguageSwitcher';
import './Header.scss';

const Header: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchValue, setSearchValue] = useState('');
  
  // Get auth state from Redux
  const isAuthenticated = useSelector((state) => state?.auth?.isAuthenticated || false);
  const user = useSelector((state) => state?.auth?.user);

  const menuItems = [
    {
      key: 'phones',
      label: t('menu.phones'),
      children: [
        { key: 'iphone', label: t('menu.iphone') },
        { key: 'samsung', label: t('menu.samsung') },
        { key: 'xiaomi', label: t('menu.xiaomi') },
        { key: 'oppo', label: t('menu.oppo') },
        { key: 'vivo', label: t('menu.vivo') },
      ]
    },
    {
      key: 'tablets',
      label: t('menu.tablets'),
    },
    {
      key: 'laptops',
      label: t('menu.laptops'),
    },
    {
      key: 'audio',
      label: t('menu.audio'),
    },
    {
      key: 'watches',
      label: t('menu.watches'),
    },
    {
      key: 'accessories',
      label: t('menu.accessories'),
    },
    {
      key: 'home',
      label: t('menu.homeAppliances'),
    },
  ];

  // @ts-ignore
  const handleMenuClick = async (e) => {
    if (e.key === 'login') {
      navigate('/login');
    } else if (e.key === 'register') {
      navigate('/register');
    } else if (e.key === 'profile') {
      navigate('/profile');
    } else if (e.key === 'orders') {
      navigate('/orders');
    } else if (e.key === 'settings') {
      navigate('/settings');
    } else if (e.key === 'logout') {
      try {
        await authService.logout();
      } catch (err) {
        console.error('Logout failed:', err);
      } finally {
        dispatch(logout());
        message.success('Đăng xuất thành công!');
        navigate('/');
      }
    }
  };

  // User menu items based on authentication status
  const userMenuItems = isAuthenticated ? [
    {
      key: 'user-info',
      label: (
        <div style={{ padding: '8px 0', borderBottom: '1px solid #e5e7eb', marginBottom: '8px' }}>
          <div style={{ fontWeight: 600, color: '#333' }}>{user?.name || 'User'}</div>
          <div style={{ fontSize: '12px', color: '#999' }}>{user?.email || ''}</div>
        </div>
      ),
      disabled: true,
    },
    {
      key: 'profile',
      label: t('common.profile'),
      icon: <UserOutlined />,
    },
    {
      key: 'orders',
      label: t('common.orders'),
    },
    {
      key: 'settings',
      label: 'Cài đặt',
      icon: <SettingOutlined />,
    },
    { type: 'divider' },
    {
      key: 'logout',
      label: 'Đăng xuất',
      icon: <LogoutOutlined />,
      danger: true,
    },
  ] : [
    {
      key: 'login',
      label: t('common.login'),
    },
    {
      key: 'register',
      label: t('common.register'),
    },
  ];

  return (
    <header className="header">
      {/* Top banner */}
      <div className="header-banner">
        <div className="container">
          <div className="banner-content">
            <span><strong>{t('banner.genuineProducts')}</strong></span>
            <span><strong>{t('banner.fastShipping')}</strong></span>
            <span><strong>{t('banner.tradeIn')}</strong></span>
          </div>
        </div>
      </div>

      {/* Main header */}
      <div className="header-main">
        <div className="container">
          <div className="header-content">
            {/* Logo */}
            <Link to="/" className="logo">
              <h1>LMobile</h1>
            </Link>

            {/* Search bar */}
            <div className="search-container">
              <Input
                placeholder={t('common.searchPlaceholder')}
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                prefix={<SearchOutlined />}
                className="search-input"
                size="large"
              />
              <Button type="primary" size="large" className="search-btn">
                {t('common.search')}
              </Button>
            </div>

            {/* Right side actions */}
            <div className="header-actions">
              {/* Location */}
              <div className="location">
                <span>{t('common.nearbyStore')}</span>
              </div>

              {/* Language Switcher */}
              <LanguageSwitcher />

              {/* Cart */}
              <div className="cart">
                <Badge count={0} showZero>
                  <Button type="text" icon={<ShoppingCartOutlined />} size="large">
                    {t('common.cart')}
                  </Button>
                </Badge>
              </div>

              {/* User menu */}
              <div className="user-menu">
                <Dropdown
                  menu={{ items: userMenuItems, onClick: handleMenuClick }}
                  placement="bottomRight"
                  trigger={['click']}
                >
                  <Button type="text" size="large" className="user-menu-button">
                    {isAuthenticated ? (
                      <div className="user-info">
                        <Avatar style={{ backgroundColor: '#1890ff' }}>
                          {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                        </Avatar>
                        <span className="user-name">{user?.name || 'User'}</span>
                      </div>
                    ) : (
                      <>
                        <UserOutlined />
                        {t('common.login')}
                      </>
                    )}
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
                  {t('common.categories')}
                </Button>
              </Dropdown>

              <div className="nav-links">
                <a href="/phones">{t('menu.phones')}</a>
                <a href="/tablets">{t('menu.tablets')}</a>
                <a href="/laptops">{t('menu.laptops')}</a>
                <a href="/audio">{t('menu.audio')}</a>
                <a href="/watches">{t('menu.watches')}</a>
                <a href="/accessories">{t('menu.accessories')}</a>
                <a href="/home">{t('menu.homeAppliances')}</a>
              </div>
            </div>

            <div className="nav-promotions">
              <a href="/trade-in">{t('menu.tradeInNew')}</a>
              <a href="/used">{t('menu.usedItems')}</a>
              <a href="/promotions">{t('menu.promotions')}</a>
              <a href="/news">{t('menu.techNews')}</a>
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
};

export default Header;
