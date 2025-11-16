import React from 'react';
import { Row, Col, Typography, Button } from 'antd';
import { RightOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import ProductCard from '../ProductCard';
import type { PhoneDetail } from '../../types';
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
          <Link to={viewAllLink} className="view-all-link">
            <Button
              type="primary"
              size="large"
              icon={<RightOutlined />}
              className="view-all-button"
            >
              Xem tất cả
            </Button>
          </Link>
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






