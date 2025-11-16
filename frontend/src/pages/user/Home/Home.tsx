import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Row, Col, Typography, message } from 'antd';
import { PageWrapper, CategorySidebar, QuickSaleSection, ScrollToTop, FilteredProducts, ProductSection } from '../../../components';
import FlashSaleSection from '../../../components/FlashSaleSection/FlashSaleSection';
import VoucherSection from '../../../components/VoucherSection/VoucherSection';
import BannerCarousel from '../../../components/BannerCarousel';
import CategoryCard from '../../../components/CategoryCard';
import { useHomePageData } from '../../../hooks/useHomePageData';
import { resetFilters } from '../../../features/filter/filterSlice';
import type { RootState } from '../../../store';
import './Home.scss';

const { Title } = Typography;

const HomePage: React.FC = () => {
  const dispatch = useDispatch();
  
  // Load data using custom hook
  const {
    loading,
    error,
    banners,
    categories,
    quickSaleProducts,
    flashSales,
    featuredProducts,
    newProducts,
    bestSellerProducts,
  } = useHomePageData();

  // Redux state
  const selectedCategoryId = useSelector((state: RootState) => state.filter.selectedCategoryId);

  // Clear selectedCategoryId khi vào trang Home để hiển thị đúng danh sách sản phẩm
  useEffect(() => {
    // Luôn reset filters khi vào trang Home để đảm bảo hiển thị đúng
    dispatch(resetFilters());
  }, [dispatch]); // Chỉ chạy một lần khi component mount

  const handleAddToCart = (_productId: string) => {
    // TODO: Implement add to cart
    message.success('Đã thêm vào giỏ hàng');
  };

  const handleAddToWishlist = (_productId: string) => {
    // TODO: Implement add to wishlist
    message.success('Đã thêm vào yêu thích');
  };

  return (
    <div className="home-page">
      <PageWrapper loading={loading} error={error}>
        <div className="container">
          <Row gutter={[24, 24]}>
            {/* Sidebar với Categories */}
            <Col xs={24} md={7} lg={6} xl={6}>
              <CategorySidebar
                categories={categories}
                loading={loading}
              />
            </Col>

            {/* Main Content */}
            <Col xs={24} md={17} lg={18} xl={18}>
              {/* Nếu có category được chọn, hiển thị FilteredProducts */}
              {selectedCategoryId ? (
                <div className="category-products-section">
                  <Title level={2} className="section-title">
                    {categories.find(c => c._id === selectedCategoryId)?.name || 'Sản phẩm'}
                  </Title>
                  <FilteredProducts
                    onAddToCart={handleAddToCart}
                    onAddToWishlist={handleAddToWishlist}
                  />
                </div>
              ) : (
                <>
                  {/* Banner Section */}
                  {banners.length > 0 && (
                    <div className="banner-section">
                      <BannerCarousel banners={banners} />
                    </div>
                  )}

                  {/* Quick Sale Section */}
                  <QuickSaleSection products={quickSaleProducts} loading={loading} />

                  {/* Flash Sales Section */}
                  <FlashSaleSection limit={4} />

                  {/* Voucher Section */}
                  <VoucherSection limit={6} />

                  {/* Categories Grid Section (for mobile/tablet) */}
                  {categories.length > 0 && (
                    <div className="categories-section">
                      <Title level={2} className="section-title">
                        Danh mục sản phẩm
                      </Title>
                      <Row gutter={[16, 16]}>
                        {categories.slice(0, 8).map((category) => (
                          <Col xs={12} sm={8} md={6} lg={4} xl={3} key={category._id}>
                            <CategoryCard category={category} />
                          </Col>
                        ))}
                      </Row>
                    </div>
                  )}

                  {/* Featured Products Section */}
                  <ProductSection
                    title="Sản phẩm nổi bật"
                    products={featuredProducts}
                    viewAllLink="/products?type=featured"
                    onAddToCart={handleAddToCart}
                    onAddToWishlist={handleAddToWishlist}
                  />

                  {/* New Products Section */}
                  <ProductSection
                    title="Sản phẩm mới"
                    products={newProducts}
                    viewAllLink="/products?type=new"
                    onAddToCart={handleAddToCart}
                    onAddToWishlist={handleAddToWishlist}
                  />

                  {/* Best Seller Products Section */}
                  <ProductSection
                    title="Sản phẩm bán chạy"
                    products={bestSellerProducts}
                    viewAllLink="/products?type=bestSeller"
                    onAddToCart={handleAddToCart}
                    onAddToWishlist={handleAddToWishlist}
                  />
                </>
              )}
            </Col>
          </Row>
        </div>
      </PageWrapper>
      <ScrollToTop />
    </div>
  );
};

export default HomePage;



