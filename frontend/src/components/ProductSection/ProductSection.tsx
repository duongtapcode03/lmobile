import React from 'react';
import { Row, Col, Typography, Button } from 'antd';
import { RightOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import ProductCard from '../ProductCard';
import { setFilters } from '../../features/filter/filterSlice';
import type { PhoneDetail } from '../../types';
import type { FilterState } from '../CategorySidebar';
import './ProductSection.scss';

const { Title } = Typography;

interface ProductSectionProps {
  title: string;
  products: PhoneDetail[];
  viewAllLink?: string;
  onAddToCart: (productId: string) => void;
  onAddToWishlist: (productId: string) => void;
}

/**
 * ProductSection Component
 * Hiển thị một section sản phẩm với title và "Xem tất cả" link
 */
const ProductSection: React.FC<ProductSectionProps> = ({
  title,
  products,
  viewAllLink,
  onAddToCart,
  onAddToWishlist,
}) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const handleViewAll = () => {
    if (!viewAllLink) return;

    // Parse productType từ URL (ví dụ: /products?type=featured)
    const url = new URL(viewAllLink, window.location.origin);
    const typeParam = url.searchParams.get('type') as 'featured' | 'new' | 'bestSeller' | null;
    
    // Set filter vào Redux
    const filters: FilterState = {
      category: undefined,
      brands: [],
      priceRange: [0, 50000000],
      productType: typeParam && ['featured', 'new', 'bestSeller'].includes(typeParam) 
        ? typeParam 
        : undefined,
    };
    
    dispatch(setFilters(filters));
    
    // Navigate với URL params để dễ nhìn và share
    const params = new URLSearchParams();
    if (filters.productType) {
      params.set('type', filters.productType);
    }
    
    navigate(`/products?${params.toString()}`);
  };

  if (products.length === 0) {
    return null;
  }

  return (
    <div className="product-section">
      <div className="section-header">
        <Title level={2} className="section-title">
          {title}
        </Title>
        {viewAllLink && (
          <Button
            type="primary"
            size="large"
            icon={<RightOutlined />}
            className="view-all-button"
            onClick={handleViewAll}
          >
            Xem tất cả
          </Button>
        )}
      </div>
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
  );
};

export default React.memo(ProductSection);














