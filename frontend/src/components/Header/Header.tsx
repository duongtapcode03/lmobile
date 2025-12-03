// @ts-nocheck
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { SearchOutlined, ShoppingCartOutlined, UserOutlined, MenuOutlined, LogoutOutlined, HeartOutlined, FileTextOutlined } from '@ant-design/icons';
import { Input, Button, Badge, Dropdown, Avatar, message, Spin } from 'antd';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { logout } from '../../features/auth/authSlice';
import { fetchCart } from '../../features/cart/cartSlice';
import { authService } from '../../api/authService';
import { userService } from '../../api/userService';
import phoneService from '../../api/phoneService';
import { persistor } from '../../store';
import LanguageSwitcher from '../LanguageSwitcher';
import './Header.scss';

const Header: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchValue, setSearchValue] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const [wishlistCount, setWishlistCount] = useState(0);
  
  // Get auth state from Redux
  const isAuthenticated = useSelector((state) => state?.auth?.isAuthenticated || false);
  const user = useSelector((state) => state?.auth?.user);
  
  // Get cart state from Redux
  const cartTotalItems = useSelector((state: any) => state?.cart?.totalItems || 0);

  // Get token from Redux state
  const token = useSelector((state) => state?.auth?.token);

  // Load wishlist count
  const loadWishlistCount = React.useCallback(async () => {
    // Check Redux state only
    if (!isAuthenticated || !token) {
      setWishlistCount(0);
      return;
    }

    try {
      const wishlist = await userService.getWishlist({ page: 1, limit: 1 }); // Only need count, so limit=1
      // Get totalItems from pagination if available, otherwise use items.length
      const count = wishlist?.pagination?.totalItems || wishlist?.items?.length || 0;
      setWishlistCount(count);
    } catch (error: any) {
      // Silent fail - user might not have wishlist yet
      // Don't log 401 errors as they're handled by axiosClient
      if (error.response?.status !== 401 && error.code !== 'NO_TOKEN') {
        console.debug('Could not load wishlist count:', error);
      }
      setWishlistCount(0);
    }
  }, [isAuthenticated, token]);

  useEffect(() => {
    loadWishlistCount();
  }, [loadWishlistCount]);

  // Listen to wishlist update events
  useEffect(() => {
    const handleWishlistUpdate = () => {
      // Reload wishlist count when wishlist is updated
      loadWishlistCount();
    };

    window.addEventListener('wishlistUpdated', handleWishlistUpdate);
    
    return () => {
      window.removeEventListener('wishlistUpdated', handleWishlistUpdate);
    };
  }, [loadWishlistCount]);

  // Load cart count
  useEffect(() => {
    const loadCart = async () => {
      if (!isAuthenticated || !token) {
        return;
      }

      try {
        await dispatch(fetchCart());
      } catch (error: any) {
        // Silent fail - cart might not exist yet
        if (error.response?.status !== 401 && error.code !== 'NO_TOKEN') {
          console.debug('Could not load cart:', error);
        }
      }
    };

    loadCart();
  }, [isAuthenticated, token, dispatch]);

  // Handle search với debounce
  const handleSearch = useCallback(async (value: string) => {
    if (!value || value.trim().length < 2) {
      setSearchResults([]);
      setShowSearchDropdown(false);
      return;
    }

    setSearchLoading(true);
    setShowSearchDropdown(true);

    try {
      const results = await phoneService.quickSearchPhones(value.trim(), 4);
      setSearchResults(results || []);
    } catch (error: any) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  // Debounce search input
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchValue.trim().length >= 2) {
      searchTimeoutRef.current = setTimeout(() => {
        handleSearch(searchValue);
      }, 300);
    } else {
      setSearchResults([]);
      setShowSearchDropdown(false);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchValue, handleSearch]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSearchDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle product click in dropdown
  const handleProductClick = (product: any) => {
    setShowSearchDropdown(false);
    setSearchValue('');
    if (product.slug) {
      navigate(`/products/slug/${product.slug}`);
    } else {
      navigate(`/products/${product._id}`);
    }
  };

  // Handle search button click
  const handleSearchButtonClick = () => {
    if (searchValue.trim().length >= 2) {
      navigate(`/products?search=${encodeURIComponent(searchValue.trim())}`);
      setShowSearchDropdown(false);
      setSearchValue('');
    }
  };

  // Handle Enter key in search input
  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && searchValue.trim().length >= 2) {
      handleSearchButtonClick();
    }
  };

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
    } else if (e.key === 'logout') {
      try {
        // Call logout API
        await authService.logout();
      } catch (err) {
        console.error('Logout failed:', err);
        // Continue with local logout even if API call fails
      } finally {
        // Dispatch logout action to clear Redux state
        dispatch(logout());
        
        // Purge Redux Persist to completely clear persist:auth
        try {
          await persistor.purge();
          if (process.env.NODE_ENV === 'development') {
            console.log('[Header] Redux Persist purged successfully');
          }
        } catch (purgeError) {
          console.error('[Header] Failed to purge Redux Persist:', purgeError);
          // Manually remove persist:auth as fallback
          localStorage.removeItem('persist:auth');
        }
        
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
      icon: <FileTextOutlined />,
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

      {/* Main header */}
      <div className="header-main">
        <div className="container">
          <div className="header-content">
            {/* Logo */}
            <Link to="/" className="logo">
              <img src="/logo.jpg" alt="LMobile" className="logo-image" />
            </Link>

            {/* Search bar */}
            <div className="search-container" ref={searchContainerRef}>
              <div className="search-input-wrapper">
                <Input
                  placeholder={t('common.searchPlaceholder')}
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  onKeyPress={handleSearchKeyPress}
                  onFocus={() => {
                    if (searchResults.length > 0) {
                      setShowSearchDropdown(true);
                    }
                  }}
                  prefix={<SearchOutlined />}
                  className="search-input"
                  size="large"
                />
                {showSearchDropdown && (searchResults.length > 0 || searchLoading) && (
                  <div className="search-dropdown">
                    {searchLoading ? (
                      <div className="search-dropdown-loading">
                        <Spin size="small" />
                        <span>Đang tìm kiếm...</span>
                      </div>
                    ) : (
                      <div className="search-dropdown-results">
                        {searchResults.map((product) => (
                          <div
                            key={product._id}
                            className="search-dropdown-item"
                            onClick={() => handleProductClick(product)}
                          >
                            <img
                              src={product.thumbnail || product.imageUrl || '/placeholder-product.png'}
                              alt={product.name}
                              className="search-dropdown-item-image"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = '/placeholder-product.png';
                              }}
                            />
                            <div className="search-dropdown-item-info">
                              <div className="search-dropdown-item-name">{product.name}</div>
                              <div className="search-dropdown-item-price">{product.price}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <Button 
                type="primary" 
                size="large" 
                className="search-btn"
                onClick={handleSearchButtonClick}
              >
                {t('common.search')}
              </Button>
            </div>

            {/* Right side actions */}
            <div className="header-actions">

              {/* Wishlist */}
              {isAuthenticated && (
                <div className="wishlist">
                  <Link to="/wishlist">
                    <Badge count={wishlistCount} showZero={false}>
                      <Button type="text" icon={<HeartOutlined />} size="large">
                        {'Yêu thích'}
                      </Button>
                    </Badge>
                  </Link>
                </div>
              )}

              {/* Cart */}
              <div className="cart">
                <Link to="/cart">
                  <Badge count={cartTotalItems} showZero={false}>
                    <Button type="text" icon={<ShoppingCartOutlined />} size="large">
                      {t('common.cart')}
                    </Button>
                  </Badge>
                </Link>
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
    </header>
  );
};

export default Header;
