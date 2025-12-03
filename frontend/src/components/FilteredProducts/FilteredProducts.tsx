/**
 * FilteredProducts Component
 * Component để hiển thị products với filters từ CategorySidebar
 */

import React from 'react';
import { useSelector } from 'react-redux';
import { Row, Col, Pagination, Spin, Empty } from 'antd';
import { useProductFilters } from '../../hooks/useProductFilters';
import type { RootState } from '../../store';
import ProductCard from '../ProductCard';
import './FilteredProducts.scss';

interface FilteredProductsProps {
  filters?: any; // FilterState from parent (deprecated, use Redux instead)
  searchQuery?: string;
  sortBy?: string;
  featured?: boolean | string;
  productType?: 'featured' | 'new' | 'bestSeller'; // Deprecated: lấy từ Redux filters.productType
  onAddToCart?: (productId: string) => void;
  onAddToWishlist?: (productId: string) => void;
}

const FilteredProducts: React.FC<FilteredProductsProps> = ({
  filters: propsFilters,
  searchQuery,
  sortBy,
  featured,
  productType,
  onAddToCart,
  onAddToWishlist,
}) => {
  // Luôn dùng Redux filters (source of truth)
  const reduxFilters = useSelector((state: RootState) => state.filter.filters);
  const filters = reduxFilters;
  
  console.log('🔴 FilteredProducts - Using Redux filters:', filters);
  console.log('🔴 FilteredProducts - Redux filters:', reduxFilters);
  console.log('🔴 FilteredProducts - Props filters (ignored):', propsFilters);
  
  // Lấy productType từ Redux filters, fallback về props nếu không có trong Redux
  const productTypeFromRedux = filters.productType;
  const finalProductType = productTypeFromRedux || productType;
  
  const {
    products,
    loading,
    error,
    total,
    page,
    totalPages,
    limit,
    setPage,
    setLimit,
  } = useProductFilters({
    initialFilters: filters,
    searchQuery,
    sortBy,
    featured,
    productType: finalProductType,
    limit: 12,
    debounceMs: 500,
  });

  if (loading && products.length === 0) {
    return (
      <div className="filtered-products-loading">
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="filtered-products-error">
        <Empty description={error} />
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="filtered-products-empty">
        <Empty description="Không tìm thấy sản phẩm nào" />
      </div>
    );
  }

  return (
    <div className="filtered-products">
      <div className="products-grid">
        <Row gutter={[16, 16]}>
          {products.map((product) => (
            <Col xs={12} sm={12} md={8} lg={6} xl={6} key={product._id || product.sku}>
              <ProductCard
                product={product}
                onAddToCart={onAddToCart}
                onAddToWishlist={onAddToWishlist}
              />
            </Col>
          ))}
        </Row>
      </div>

      {totalPages > 1 && (
        <div className="products-pagination">
          <Pagination
            current={page}
            total={total}
            pageSize={limit}
            showSizeChanger={true}
            pageSizeOptions={['12', '24', '36', '48']}
            showQuickJumper
            showTotal={(total, range) =>
              `${range[0]}-${range[1]} của ${total} sản phẩm`
            }
            onChange={(page, pageSize) => {
              setPage(page);
              if (pageSize !== limit) {
                setLimit(pageSize);
                setPage(1); // Reset về trang 1 khi thay đổi limit
              }
            }}
            onShowSizeChange={(current, size) => {
              setLimit(size);
              setPage(1); // Reset về trang 1 khi thay đổi limit
            }}
          />
        </div>
      )}
    </div>
  );
};

export default FilteredProducts;

