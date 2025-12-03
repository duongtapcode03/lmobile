/**
 * ProductsPage
 * Trang hiển thị danh sách sản phẩm với filters, search, sort
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Row, Col, Select, Input, Space, Button, Breadcrumb } from 'antd';
import { SearchOutlined, SortAscendingOutlined, SortDescendingOutlined, HomeOutlined } from '@ant-design/icons';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { PageWrapper, CategorySidebar, FilteredProducts, useToast } from '../../../components';
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
  const toast = useToast();
  
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
        toast.error('Không thể tải danh mục sản phẩm');
      } finally {
        setLoading(false);
      }
    };

    loadCategories();
  }, []);

  // Get filters from Redux
  const reduxFilters = useSelector((state: RootState) => state.filter.filters);
  
  // Chỉ load filters từ URL params khi mount lần đầu (khi navigate từ bên ngoài)
  useEffect(() => {
    const categoryParam = searchParams.get('category');
    const brandParam = searchParams.get('brand');
    const minPriceParam = searchParams.get('minPrice');
    const maxPriceParam = searchParams.get('maxPrice');
    const searchParam = searchParams.get('search');
    const sortParam = searchParams.get('sort');
    const typeParam = searchParams.get('type') as 'featured' | 'new' | 'bestSeller' | null;
    // Load filters từ URL chỉ khi mount (isInitialLoad = true)
    if (isInitialLoad) {
      const newFilters: FilterState = {
        category: categoryParam || undefined,
        brands: brandParam ? brandParam.split(',') : [],
        priceRange: [
          minPriceParam ? parseInt(minPriceParam) : 0,
          maxPriceParam ? parseInt(maxPriceParam) : 50000000,
        ],
      };
      
      setFilters(newFilters);
      dispatch(setReduxFilters(newFilters));
      
      // Load search, sort, type từ URL
      if (searchParam) {
        setSearchQuery(searchParam);
        setSearchInput(searchParam);
      }
      
      if (sortParam) {
        setSortBy(sortParam);
      }
      
      if (typeParam && ['featured', 'new', 'bestSeller'].includes(typeParam)) {
        setProductType(typeParam);
      }
      
      setIsInitialLoad(false);
    }
  }, [isInitialLoad]); // Chỉ chạy khi isInitialLoad thay đổi (từ true -> false)
  
  // Sync Redux filters to local state (chỉ khi không phải initial load)
  // Note: Không nên sync từ Redux về local state vì có thể gây conflict với URL params
  // URL params là source of truth, Redux chỉ để share state giữa components
  // useEffect(() => {
  //   if (!isInitialLoad) {
  //     const reduxFiltersStr = JSON.stringify(reduxFilters);
  //     const currentFiltersStr = JSON.stringify(filters);
  //     
  //     // Chỉ update nếu filters thực sự thay đổi
  //     if (reduxFiltersStr !== currentFiltersStr) {
  //       console.log('🔄 Syncing Redux filters to local state:', reduxFilters);
  //       setFilters(reduxFilters);
  //     }
  //   }
  // }, [reduxFilters, isInitialLoad, filters]);
  
  // Không sync state lên URL nữa - chỉ dùng state để lưu filter
  // URL chỉ dùng để load initial state khi mount hoặc khi navigate từ bên ngoài

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
      toast.success('Đã thêm vào giỏ hàng');
      // Tự động redirect đến trang giỏ hàng
      navigate('/user/cart');
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Không thể thêm vào giỏ hàng';
      toast.error(errorMessage);
      
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
    };
    setFilters(defaultFilters);
    dispatch(setReduxFilters(defaultFilters));
    setSearchQuery('');
    setSearchInput('');
    setSortBy('default');
    setProductType(undefined);
    setFeatured(false);
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
                // Không truyền filters từ props nữa, để FilteredProducts tự lấy từ Redux
                searchQuery={searchQuery}
                sortBy={sortBy}
                featured={featured}
                productType={productType}
                onAddToCart={handleAddToCart}
                onAddToWishlist={handleAddToWishlist}
              />
            </Col>
          </Row>
        </div>
      </PageWrapper>
    </div>
  );
};

export default ProductsPage;



