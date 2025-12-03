/**
 * WishlistPage Component
 * Trang hiển thị wishlist của user
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Row, Col, Button, Empty, Spin, Typography, Pagination } from 'antd';
import { HeartOutlined } from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { userService } from '../../../api/userService';
import type { Wishlist } from '../../../types';
import { PageWrapper, useToast } from '../../../components';
import ProductCard from '../../../components/ProductCard';
import './Wishlist.scss';

const { Title } = Typography;

const WishlistPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [wishlist, setWishlist] = useState<Wishlist | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 8,
    total: 0
  });

  // Get pagination params from URL
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '8', 10);

  useEffect(() => {
    loadWishlist();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit]); // Reload when page or limit changes

  const loadWishlist = useCallback(async () => {
    try {
      setLoading(true);
      const data = await userService.getWishlist({ page, limit });
      setWishlist(data);
      
      // Update pagination state
      if (data.pagination) {
        setPagination({
          current: data.pagination.currentPage || page,
          pageSize: data.pagination.itemsPerPage || limit,
          total: data.pagination.totalItems || 0
        });
      }
    } catch (error: any) {
      console.error('Error loading wishlist:', error);
      toast.error('Không thể tải wishlist');
    } finally {
      setLoading(false);
    }
  }, [page, limit]);

  const handleRemoveProduct = useCallback(async (productId: string) => {
    if (!productId) return;

    try {
      setRemoving(productId);
      await userService.removeFromWishlist(productId);
      // Reload wishlist to get updated pagination
      await loadWishlist();
      
      // Dispatch custom event to notify other components (e.g., Header, ProductCard)
      window.dispatchEvent(new CustomEvent('wishlistUpdated', {
        detail: { productId }
      }));
      
      toast.success('Đã xóa sản phẩm khỏi wishlist');
    } catch (error: any) {
      console.error('Error removing product:', error);
      toast.error('Không thể xóa sản phẩm');
      // Reload on error
      await loadWishlist();
    } finally {
      setRemoving(null);
    }
  }, [loadWishlist]);

  const handleClearWishlist = useCallback(async () => {
    try {
      await userService.clearWishlist();
      setWishlist(null);
      setPagination({ current: 1, pageSize: 8, total: 0 });
      // Reset URL params
      setSearchParams({});
      
      // Dispatch custom event to notify other components (e.g., Header, ProductCard)
      window.dispatchEvent(new CustomEvent('wishlistUpdated', {
        detail: { productId: 'all' } // Special flag for clear all
      }));
      
      toast.success('Đã xóa toàn bộ wishlist');
    } catch (error: any) {
      console.error('Error clearing wishlist:', error);
      toast.error('Không thể xóa wishlist');
    }
  }, [setSearchParams]);

  const handlePageChange = useCallback((newPage: number, newPageSize?: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', newPage.toString());
    if (newPageSize) {
      params.set('limit', newPageSize.toString());
    }
    setSearchParams(params);
    // Scroll to top when page changes
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [searchParams, setSearchParams]);

  // Memoize product list - MUST be called before early returns (Rules of Hooks)
  const productList = useMemo(() => {
    if (!wishlist || !wishlist.items || wishlist.items.length === 0) {
      return [];
    }
    
    return wishlist.items.map((item: any, index: number) => {
      const product = item.product?._id ? item.product : { _id: item.product };
      // Use SKU if available, otherwise fallback to _id
      // Use _id for wishlist operations (backend will find product by _id)
      const productId = product._id 
        ? (typeof product._id === 'string' ? product._id : product._id.toString())
        : (product.sku || item.product || `item-${index}`);
      
      // Ensure unique key - use index as fallback if productId is null/undefined
      const uniqueKey = productId || `wishlist-item-${index}`;
      
      return (
        <Col xs={12} sm={12} md={8} lg={6} xl={6} key={uniqueKey}>
          <ProductCard
            product={{
              _id: product._id || productId,
              sku: product.sku || productId,
              name: product.name || 'Sản phẩm',
              price: product.price || 0,
              thumbnail: product.thumbnail || product.imageUrl,
              slug: product.slug,
              brand: product.brand,
              imageUrl: product.imageUrl || product.thumbnail,
              images: product.images || []
            } as any}
            // Disable wishlist check since we're already in wishlist page
            skipWishlistCheck={true}
            // Pass remove handler so ProductCard can handle removal via favorite button
            onAddToWishlist={handleRemoveProduct}
          />
        </Col>
      );
    });
  }, [wishlist?.items, handleRemoveProduct]);

  if (loading) {
    return (
      <PageWrapper loading={true}>
        <div className="wishlist-page">
          <div className="container">
            <Spin size="large" />
          </div>
        </div>
      </PageWrapper>
    );
  }

  if (!wishlist || !wishlist.items || wishlist.items.length === 0) {
    return (
      <PageWrapper>
        <div className="wishlist-page">
          <div className="container">
            <Empty
              image={<HeartOutlined style={{ fontSize: 64, color: '#ccc' }} />}
              description="Wishlist của bạn đang trống"
            >
              <Button type="primary" onClick={() => navigate('/')}>
                Tiếp tục mua sắm
              </Button>
            </Empty>
          </div>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <div className="wishlist-page">
        <div className="container">
          <div className="wishlist-header" style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Title level={2} style={{ margin: 0 }}>
              <HeartOutlined /> Danh sách sản phẩm yêu thích
            </Title>
            {wishlist.items && wishlist.items.length > 0 && (
                <Button danger onClick={handleClearWishlist}>
                  Xóa tất cả
                </Button>
            )}
          </div>
          <Row gutter={[16, 16]}>
            {productList}
          </Row>
          {wishlist.items && wishlist.items.length > 0 && pagination.total > pagination.pageSize && (
            <div style={{ marginTop: 24, display: 'flex', justifyContent: 'center' }}>
              <Pagination
                current={pagination.current}
                pageSize={pagination.pageSize}
                total={pagination.total}
                showSizeChanger
                pageSizeOptions={['8', '12', '24', '36']}
                showTotal={(total, range) => `${range[0]}-${range[1]} của ${total} sản phẩm`}
                onChange={handlePageChange}
                onShowSizeChange={handlePageChange}
              />
            </div>
          )}
        </div>
      </div>
    </PageWrapper>
  );
};

export default WishlistPage;



