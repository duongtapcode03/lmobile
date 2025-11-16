/**
 * ProductsPage
 * Trang hiển thị danh sách sản phẩm với filters, search, sort
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Row, Col, message, Select, Input, Space, Button, Breadcrumb } from 'antd';
import { SearchOutlined, SortAscendingOutlined, SortDescendingOutlined, HomeOutlined } from '@ant-design/icons';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { PageWrapper, CategorySidebar, FilteredProducts } from '../../../components';
import categoryService from '../../../api/categoryService';
import { userService } from '../../../api/userService';
import type { Category } from '../../../api/categoryService';
import type { FilterState } from '../../../components/CategorySidebar';
import type { RootState } from '../../../store';
import { setFilters as setReduxFilters } from '../../../features/filter/filterSlice';
import './Products.scss';

const { Option } = Select;
const { Search } = Input;

// Sort options
const SORT_OPTIONS = [
  { value: 'default', label: 'Mặc định' },
  { value: 'price_asc', label: 'Giá tăng dần' },
  { value: 'price_desc', label: 'Giá giảm dần' },
  { value: 'name_asc', label: 'Tên A-Z' },
  { value: 'name_desc', label: 'Tên Z-A' },
  { value: 'newest', label: 'Mới nhất' },
  { value: 'oldest', label: 'Cũ nhất' },
  { value: 'rating', label: 'Đánh giá cao' },
  { value: 'sold', label: 'Bán chạy' },
];

const ProductsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchInput, setSearchInput] = useState<string>(''); // Local state for input (not debounced)
  const [sortBy, setSortBy] = useState<string>('default');
  const [featured, setFeatured] = useState<boolean | string>(false);
  const [productType, setProductType] = useState<'featured' | 'new' | 'bestSeller' | undefined>(undefined);
  const [filters, setFilters] = useState<FilterState>({
    category: undefined,
    brands: [],
    priceRange: [0, 50000000],
    storage: undefined,
    screenSize: undefined,
  });
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Load categories
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await categoryService.getActiveCategories();
        setCategories(response.data);
      } catch (error) {
        console.error('Failed to load categories:', error);
        message.error('Không thể tải danh mục sản phẩm');
      } finally {
        setLoading(false);
      }
    };

    loadCategories();
  }, []);

  // Get filters from Redux
  const reduxFilters = useSelector((state: RootState) => state.filter.filters);
  
  // Load filters from URL params on mount and when URL changes
  useEffect(() => {
    const categoryParam = searchParams.get('category');
    const brandParam = searchParams.get('brand');
    const minPriceParam = searchParams.get('minPrice');
    const maxPriceParam = searchParams.get('maxPrice');
    const searchParam = searchParams.get('search');
    const sortParam = searchParams.get('sort');
    const featuredParam = searchParams.get('featured');
    const sortByParam = searchParams.get('sortBy');
    const sortOrderParam = searchParams.get('sortOrder');
    const typeParam = searchParams.get('type') as 'featured' | 'new' | 'bestSeller' | null;

    // Handle type param (API mới)
    if (typeParam && ['featured', 'new', 'bestSeller'].includes(typeParam)) {
      if (productType !== typeParam) {
        console.log('🔍 Products.tsx - Setting productType from URL:', typeParam);
        setProductType(typeParam);
      }
    } else if (typeParam === null && productType) {
      console.log('🔍 Products.tsx - Clearing productType');
      setProductType(undefined);
    }

    const storageParam = searchParams.get('storage');
    const screenSizeParam = searchParams.get('screenSize');
    
    const newFilters: FilterState = {
      category: categoryParam || undefined,
      brands: brandParam ? brandParam.split(',') : [],
      priceRange: [
        minPriceParam ? parseInt(minPriceParam) : 0,
        maxPriceParam ? parseInt(maxPriceParam) : 50000000,
      ],
      storage: storageParam ? storageParam.split(',') : undefined,
      screenSize: screenSizeParam ? screenSizeParam.split(',') : undefined,
    };

    // Only update if different from current state
    const filtersChanged = 
      newFilters.category !== filters.category ||
      JSON.stringify(newFilters.brands) !== JSON.stringify(filters.brands) ||
      newFilters.priceRange[0] !== filters.priceRange[0] ||
      newFilters.priceRange[1] !== filters.priceRange[1];
    
    if (filtersChanged || isInitialLoad) {
      setFilters(newFilters);
      dispatch(setReduxFilters(newFilters));
    }
    
    if (searchParam !== searchQuery) {
      const searchValue = searchParam || '';
      setSearchQuery(searchValue);
      setSearchInput(searchValue); // Sync input with URL param
    }
    
    // Handle sort params: priority: sortBy/sortOrder > sort
    if (sortByParam && sortOrderParam) {
      // Map sortBy/sortOrder to sort format
      let mappedSort = 'default';
      if (sortByParam === 'createdAt' && sortOrderParam === 'desc') {
        mappedSort = 'newest';
      } else if (sortByParam === 'createdAt' && sortOrderParam === 'asc') {
        mappedSort = 'oldest';
      } else if (sortByParam === 'sold' && sortOrderParam === 'desc') {
        mappedSort = 'sold';
      } else if (sortByParam === 'price' && sortOrderParam === 'asc') {
        mappedSort = 'price_asc';
      } else if (sortByParam === 'price' && sortOrderParam === 'desc') {
        mappedSort = 'price_desc';
      }
      if (mappedSort !== sortBy) {
        setSortBy(mappedSort);
      }
    } else if (sortParam !== sortBy) {
      setSortBy(sortParam || 'default');
    }
    
    // Handle featured param
    if (featuredParam === 'true') {
      if (featured !== 'true') {
        setFeatured('true');
      }
    } else if (featuredParam === null && featured) {
      setFeatured(false);
    }
    
    if (isInitialLoad) {
      setIsInitialLoad(false);
    }
  }, [searchParams]); // Run when URL params change
  
  // Sync Redux filters to local state
  useEffect(() => {
    if (!isInitialLoad) {
      setFilters(reduxFilters);
    }
  }, [reduxFilters, isInitialLoad]);
  
  // Sync state to URL params when filters/search/sort change (skip initial load)
  useEffect(() => {
    if (isInitialLoad) return;
    
    // Giữ lại type param nếu có (API mới) - lấy từ current URL
    const existingType = searchParams.get('type');
    
    const params = new URLSearchParams();
    
    // Giữ lại type param nếu có (quan trọng: phải giữ lại để không mất khi sync)
    if (existingType && ['featured', 'new', 'bestSeller'].includes(existingType)) {
      params.set('type', existingType);
    }

    if (filters.category) {
      params.set('category', String(filters.category));
    }
    if (filters.brands && filters.brands.length > 0) {
      params.set('brand', filters.brands.join(','));
    }

    if (filters.priceRange) {
      if (filters.priceRange[0] > 0) {
        params.set('minPrice', filters.priceRange[0].toString());
      }
      if (filters.priceRange[1] < 50000000) {
        params.set('maxPrice', filters.priceRange[1].toString());
      }
    }
    if (filters.storage && filters.storage.length > 0) {
      params.set('storage', filters.storage.join(','));
    }
    if (filters.screenSize && filters.screenSize.length > 0) {
      params.set('screenSize', filters.screenSize.join(','));
    }
    if (searchQuery) {
      params.set('search', searchQuery);
    }
    if (sortBy !== 'default') {
      params.set('sort', sortBy);
    }
    
    // Chỉ update nếu params thực sự thay đổi (tránh infinite loop)
    const newParamsStr = params.toString();
    const currentParamsStr = searchParams.toString();
    
    if (newParamsStr !== currentParamsStr) {
      setSearchParams(params, { replace: true });
    }
  }, [filters, searchQuery, sortBy, setSearchParams, isInitialLoad, searchParams]);

  // Handle search input change (only update local state, no API call)
  const handleSearchInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchInput(value); // Chỉ update input, không gọi API
  }, []);
  
  // Handle search button click or Enter key (trigger search)
  const handleSearch = useCallback((value: string) => {
    setSearchQuery(value);
    setSearchInput(value); // Sync input với query
    
    const params = new URLSearchParams(searchParams);
    
    // Giữ lại type param nếu có
    const existingType = searchParams.get('type');
    if (existingType && ['featured', 'new', 'bestSeller'].includes(existingType)) {
      params.set('type', existingType);
    }
    
    if (value.trim()) {
      params.set('search', value.trim());
    } else {
      params.delete('search');
    }
    setSearchParams(params, { replace: true });
  }, [searchParams, setSearchParams]);

  // Handle sort change
  const handleSortChange = (value: string) => {
    setSortBy(value);
    
    const params = new URLSearchParams(searchParams);
    
    // Giữ lại type param nếu có
    const existingType = searchParams.get('type');
    if (existingType && ['featured', 'new', 'bestSeller'].includes(existingType)) {
      params.set('type', existingType);
    }
    
    if (value !== 'default') {
      params.set('sort', value);
    } else {
      params.delete('sort');
    }
    setSearchParams(params, { replace: true });
  };

  // Handle add to cart (API mới - chỉ cần productId và quantity)
  const handleAddToCart = async (productId: string) => {
    try {
      await userService.addToCart({
        productId,
        quantity: 1
      });
      message.success('Đã thêm vào giỏ hàng');
      // Tự động redirect đến trang giỏ hàng
      navigate('/user/cart');
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Không thể thêm vào giỏ hàng';
      message.error(errorMessage);
      
      // If 401, redirect to login
      if (error.response?.status === 401) {
        navigate('/login', { state: { from: window.location.pathname } });
      }
    }
  };

  // Handle add to wishlist (ProductCard handles this internally, but we can add callback)
  const handleAddToWishlist = (_productId: string) => {
    // ProductCard handles wishlist internally
    // This is just for callback if needed
  };

  // Clear all filters
  const handleClearFilters = () => {
    const defaultFilters: FilterState = {
      category: undefined,
      brands: [],
      priceRange: [0, 50000000],
      storage: undefined,
      screenSize: undefined,
    };
    setFilters(defaultFilters);
    dispatch(setReduxFilters(defaultFilters));
    setSearchQuery('');
    setSearchInput('');
    setSortBy('default');
    setSearchParams({}, { replace: true });
  };

  return (
    <div className="products-page">
      <PageWrapper loading={loading}>
        <div className="container">
          {/* Breadcrumb */}
          <Breadcrumb
            className="products-breadcrumb"
            items={[
              {
                title: (
                  <Link to="/">
                    <HomeOutlined /> Trang chủ
                  </Link>
                ),
              },
              {
                title: 'Sản phẩm',
              },
            ]}
          />

          {/* Header với Search và Sort */}
          <div className="products-page-header">
            <Row gutter={[16, 16]} align="middle">
              <Col xs={24} sm={12} md={10}>
                <Search
                  placeholder="Tìm kiếm sản phẩm..."
                  allowClear
                  enterButton={<SearchOutlined />}
                  size="large"
                  value={searchInput}
                  onChange={handleSearchInputChange}
                  onSearch={handleSearch}
                  className="products-search"
                />
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Space>
                  <Select
                    value={sortBy}
                    onChange={handleSortChange}
                    size="large"
                    style={{ width: 200 }}
                    suffixIcon={
                      sortBy.includes('asc') ? (
                        <SortAscendingOutlined />
                      ) : sortBy.includes('desc') ? (
                        <SortDescendingOutlined />
                      ) : null
                    }
                  >
                    {SORT_OPTIONS.map((option) => (
                      <Option key={option.value} value={option.value}>
                        {option.label}
                      </Option>
                    ))}
                  </Select>
                </Space>
              </Col>
              <Col xs={24} sm={24} md={6}>
                <Button
                  onClick={handleClearFilters}
                  size="large"
                  style={{ width: '100%' }}
                >
                  Xóa bộ lọc
                </Button>
              </Col>
            </Row>
          </div>

          <Row gutter={[24, 24]}>
            {/* Sidebar với Filters */}
            <Col xs={24} md={7} lg={6} xl={6}>
              <CategorySidebar
                categories={categories}
                loading={loading}
              />
            </Col>

            {/* Products List */}
            <Col xs={24} md={17} lg={18} xl={18}>
              <FilteredProducts
                filters={filters}
                searchQuery={searchQuery}
                sortBy={sortBy}
                featured={featured}
                productType={productType}
                onAddToCart={handleAddToCart}
                onAddToWishlist={handleAddToWishlist}
              />
              {/* Debug: Log productType */}
              {import.meta.env.DEV && productType && (
                <div style={{ display: 'none' }}>
                  {(() => {
                    console.log('🔍 Products.tsx - Passing productType to FilteredProducts:', productType);
                    return null;
                  })()}
                </div>
              )}
            </Col>
          </Row>
        </div>
      </PageWrapper>
    </div>
  );
};

export default ProductsPage;



