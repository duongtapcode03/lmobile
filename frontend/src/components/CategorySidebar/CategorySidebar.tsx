import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Menu, Slider, Collapse, Input } from 'antd';
import { Link, useNavigate } from 'react-router-dom';
import type { MenuProps } from 'antd';
import type { Category } from '../../api/categoryService';
import type { Brand } from '../../types';
import brandService from '../../api/brandService';
import { setFilters } from '../../features/filter/filterSlice';
import type { RootState } from '../../store';
import './CategorySidebar.scss';

interface CategorySidebarProps {
  categories: Category[];
  loading?: boolean;
}

export interface FilterState {
  category?: number | string; // Category ID (number or string for backward compatibility)
  brands: (number | string)[]; // Brand IDs (numbers or strings for backward compatibility)
  priceRange: [number, number];
}



const CategorySidebar: React.FC<CategorySidebarProps> = ({ 
  categories, 
  loading
}) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const selectedCategoryId = useSelector((state: RootState) => state.filter.selectedCategoryId);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [brandsLoading, setBrandsLoading] = useState(false);
  const [selectedBrands, setSelectedBrands] = useState<(number | string)[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 50000000]);
  const [priceMin, setPriceMin] = useState<string>('0');
  const [priceMax, setPriceMax] = useState<string>('50000000');

  // Load brands
  useEffect(() => {
    const fetchBrands = async () => {
      try {
        setBrandsLoading(true);
        const response = await brandService.getBrands({ isActive: true });
        setBrands(response.data || []);
      } catch (error) {
        console.warn('Failed to load brands:', error);
        setBrands([]);
      } finally {
        setBrandsLoading(false);
      }
    };

    fetchBrands();
  }, []);

  // Track previous filters to avoid infinite loops
  const prevFiltersRef = useRef<string>('');
  
  // Update Redux store when filters change
  useEffect(() => {
    const currentFilters: FilterState = {
      category: selectedCategoryId || undefined,
      brands: selectedBrands,
      priceRange: priceRange,
    };
    
    // Serialize to compare
    const currentFiltersStr = JSON.stringify(currentFilters);
    
    // Only dispatch if filters actually changed
    if (currentFiltersStr !== prevFiltersRef.current) {
      prevFiltersRef.current = currentFiltersStr;
      console.log('🟢 CategorySidebar - useEffect filters changed, dispatching:', currentFilters);
      dispatch(setFilters(currentFilters));
    }
    // Use JSON.stringify for arrays to prevent infinite loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selectedCategoryId,
    JSON.stringify(selectedBrands),
    JSON.stringify(priceRange),
    dispatch,
  ]);

  const handlePriceRangeChange = (value: number | number[]) => {
    if (Array.isArray(value) && value.length === 2) {
      const range = [value[0], value[1]] as [number, number];
      setPriceRange(range);
      setPriceMin(range[0].toString());
      setPriceMax(range[1].toString());
      
      // Dispatch ngay lập tức khi price range thay đổi
      dispatch(setFilters({
        category: selectedCategoryId || undefined,
        brands: selectedBrands,
        priceRange: range,
      }));
    }
  };


  const handlePriceInputChange = () => {
    const min = parseInt(priceMin.replace(/\D/g, '')) || 0;
    const max = parseInt(priceMax.replace(/\D/g, '')) || 50000000;
    const range = [min, max] as [number, number];
    setPriceRange(range);
    
    // Dispatch khi user nhập giá vào input
    dispatch(setFilters({
      category: selectedCategoryId || undefined,
      brands: selectedBrands,
      priceRange: range,
    }));
  };


  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat('vi-VN').format(price) + ' ₫';
  };

  const formatPriceInput = (value: string): string => {
    return value.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const handleCategoryClick = async (category: Category, index: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const totalCategories = categories.length;
    const isLastItem = index === totalCategories - 1;
    
    // Item cuối cùng: navigate sang trang tin tức
    if (isLastItem) {
      navigate('/news');
      return;
    }
    
    // 3 item đầu tiên: chỉ update state, không navigate
    if (index < 3) {
      // Dispatch action để lưu categoryId vào Redux
      dispatch(setFilters({
        category: category._id,
        brands: [],
        priceRange: [0, 50000000]
      }));
      
      // Navigate đến trang products (không có params, chỉ dùng state)
      navigate('/products');
    } else {
      // Các item khác: navigate như bình thường
      if (category.slug) {
        navigate(`/category/${category.slug}`);
      }
    }
  };

  const menuItems: MenuProps['items'] = categories.map((category, index) => ({
    key: String(category._id), // Convert to string for menu key
    label: (
      <Link
        to={index === categories.length - 1 ? '/news' : `/products?category=${category._id}`}
        className={`category-menu-item ${selectedCategoryId === String(category._id) ? 'active' : ''}`}
        onClick={(e) => handleCategoryClick(category, index, e)}
      >
        {category.icon && <span className="category-icon">{category.icon}</span>}
        <span className="category-name">{category.name}</span>
      </Link>
    ),
  }));

  if (loading) {
    return (
      <div className="category-sidebar loading">
        <div className="sidebar-title">Danh mục</div>
        <div className="loading-placeholder">
          <div className="skeleton-item"></div>
          <div className="skeleton-item"></div>
          <div className="skeleton-item"></div>
        </div>
      </div>
    );
  }

  if (categories.length === 0) {
    return null;
  }

  return (
    <div className="category-sidebar">
      {/* Categories Section */}
      <div className="sidebar-section">
        <div className="sidebar-title">
          <h3>Danh mục sản phẩm</h3>
        </div>
        <Menu
          mode="vertical"
          items={menuItems}
          className="category-menu"
          selectedKeys={selectedCategoryId ? [String(selectedCategoryId)] : []}
        />
      </div>

      {/* Brands Section - Logo Grid */}
      {brands.length > 0 && (
        <div className="sidebar-section v5-filter">
          <div className="sidebar-title">
            <h3>Lựa chọn hãng</h3>
          </div>
          <div className="slick-padding">
            <div className="v5-brand-list">
              {brandsLoading ? (
                <div className="loading-placeholder">
                  {[...Array(12)].map((_, index) => (
                    <div key={index} className="skeleton-brand-item"></div>
                  ))}
                </div>
              ) : (
                brands.map((brand) => {
                  const brandId = brand._id;
                  const isSelected = brandId !== undefined && selectedBrands.some(id => String(id) === String(brandId));
                  
                  return (
                  <div key={brandId || brand.slug} className="brand-logo-item">
                    <Link
                      to={`/products?brand=${brandId}`}
                      title={brand.name}
                      className={isSelected ? 'active' : ''}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        
                        if (brandId !== undefined) {
                          let newSelectedBrands: (number | string)[];
                          
                          if (isSelected) {
                            // Remove brand from selection
                            newSelectedBrands = selectedBrands.filter(id => String(id) !== String(brandId));
                          } else {
                            // Add brand to selection
                            newSelectedBrands = [...selectedBrands, brandId];
                          }
                          
                          // Update state
                          setSelectedBrands(newSelectedBrands);
                          
                          // Dispatch to Redux
                          const newFilters = {
                            category: selectedCategoryId || undefined,
                            brands: newSelectedBrands,
                            priceRange: priceRange,
                          };
                          console.log('🔵 CategorySidebar - Toggle brand, dispatching filters:', newFilters);
                          dispatch(setFilters(newFilters));
                          
                          // Navigate to products page (không có params, chỉ dùng state)
                          navigate('/products');
                        }
                      }}
                    >
                      {brand.logoUrl ? (
                        <img
                          alt={brand.name}
                          title={brand.name}
                          src={brand.logoUrl}
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/placeholder-brand.png';
                          }}
                        />
                      ) : (
                        <span className="brand-name-fallback">{brand.name}</span>
                      )}
                    </Link>
                  </div>
                );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Price Range Filter */}
      <Collapse
        ghost
        defaultActiveKey={['price']}
        className="v5-filter-collapse"
        items={[{
          key: 'price',
          label: <h3>Mức giá</h3>,
          className: 'v5-filter',
          children: (
            <div className="price-range">
              <section className="range-slider">
                <Slider
                  range
                  min={0}
                  max={500000000}
                  step={100000}
                  value={priceRange}
                  onChange={handlePriceRangeChange}
                  tooltip={{
                    formatter: (value) => formatPrice(value || 0),
                  }}
                />
              </section>
              <div className="form-price-range">
                <Input
                  className="js-price"
                  value={formatPriceInput(priceMin)}
                  placeholder="Từ"
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    setPriceMin(value);
                  }}
                  onBlur={handlePriceInputChange}
                />
                <Input
                  className="js-price"
                  value={formatPriceInput(priceMax)}
                  placeholder="Đến"
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    setPriceMax(value);
                  }}
                  onBlur={handlePriceInputChange}
                />
              </div>
            </div>
          ),
        }]}
      />


    </div>
  );
};

export default CategorySidebar;

