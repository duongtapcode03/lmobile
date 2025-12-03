/**
 * Flash Sales Page
 * Trang danh sách tất cả sản phẩm flash sale
 */

import React, { useState, useEffect } from 'react';
import { Row, Col, Typography, Select, Spin, message, Tag } from 'antd';
import { ThunderboltOutlined, FireOutlined } from '@ant-design/icons';
import { PageWrapper } from '../../../components';
import ProductCard from '../../../components/ProductCard';
import flashSaleService, { type FlashSale } from '../../../api/flashSaleService';
import type { PhoneDetail } from '../../../types';
import './FlashSales.scss';

const { Title } = Typography;
const { Option } = Select;

const FlashSalesPage: React.FC = () => {
  const [flashSales, setFlashSales] = useState<FlashSale[]>([]);
  const [loading, setLoading] = useState(false);
  const [sessionFilter, setSessionFilter] = useState<string>('all');
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });

  useEffect(() => {
    loadFlashSales();
  }, [pagination.current, pagination.pageSize, sessionFilter]);

  const loadFlashSales = async () => {
    try {
      setLoading(true);
      // Lấy danh sách flash sales đang active
      const flashSalesResponse = await flashSaleService.getActiveFlashSales({
        page: pagination.current,
        limit: pagination.pageSize,
      });

      // Lấy items của từng flash sale
      const flashSalesWithItems = await Promise.all(
        (flashSalesResponse.data || []).map(async (flashSale: FlashSale) => {
          try {
            const itemsResponse = await flashSaleService.getFlashSaleItems(flashSale._id!, {
              page: 1,
              limit: 100, // Lấy tất cả items
            });
            return {
              ...flashSale,
              items: itemsResponse.data || [],
            };
          } catch (error) {
            console.error(`Failed to load items for flash sale ${flashSale._id}:`, error);
            return { ...flashSale, items: [] };
          }
        })
      );

      setFlashSales(flashSalesWithItems);
      
      if (flashSalesResponse.pagination) {
        setPagination(prev => ({
          ...prev,
          total: flashSalesResponse.pagination!.totalItems,
        }));
      }
    } catch (error) {
      console.error('Failed to load flash sales:', error);
      message.error('Không thể tải danh sách flash sales');
    } finally {
      setLoading(false);
    }
  };

  // Remove session filter since new structure doesn't use sessions
  // const getSessionLabel = (sessionId: string) => {
  //   const sessionMap: Record<string, string> = {
  //     morning: 'Sáng',
  //     afternoon: 'Chiều',
  //     evening: 'Tối',
  //     night: 'Đêm',
  //   };
  //   return sessionMap[sessionId] || sessionId;
  // };

  // Convert flash sale items to products for ProductCard
  const products = flashSales
    .flatMap(flashSale => (flashSale.items || []).map(item => ({ flashSale, item })))
    .filter(({ item }) => item.product && item.product._id)
    .map(({ flashSale, item }) => {
      const product = item.product!;
      const availableStock = item.availableStock ?? (item.flash_stock - item.sold - (item.reserved || 0));
      const remaining = item.flash_stock - item.sold;
      const soldPercent = item.flash_stock > 0 
        ? Math.round((item.sold / item.flash_stock) * 100) 
        : 0;

      return {
        ...product,
        _id: product._id.toString(),
        priceNumber: item.flash_price,
        price: new Intl.NumberFormat('vi-VN', {
          style: 'currency',
          currency: 'VND',
        }).format(item.flash_price),
        oldPrice: product.priceNumber 
          ? new Intl.NumberFormat('vi-VN', {
              style: 'currency',
              currency: 'VND',
            }).format(product.priceNumber)
          : undefined,
        oldPriceNumber: product.priceNumber,
        discount: product.priceNumber && item.flash_price < product.priceNumber
          ? Math.round(((product.priceNumber - item.flash_price) / product.priceNumber) * 100)
          : 0,
        flashSale: {
          flashSaleId: flashSale._id,
          itemId: item._id,
          flash_price: item.flash_price,
          flash_stock: item.flash_stock,
          sold: item.sold,
          reserved: item.reserved || 0,
          remaining: remaining,
          availableStock: availableStock, // Số lượng còn lại có thể mua
          soldPercent: soldPercent,
          limit_per_user: item.limit_per_user,
        },
        stock: availableStock, // Sử dụng availableStock thay vì remaining
        isFlashSale: true,
      } as PhoneDetail & { flashSale: any };
    });

  const handleAddToCart = (productId: string) => {
    message.success('Đã thêm vào giỏ hàng');
  };

  const handleAddToWishlist = (productId: string) => {
    message.success('Đã thêm vào yêu thích');
  };

  return (
    <PageWrapper loading={loading}>
      <div className="flash-sales-page">
        <div className="container">
          <div className="page-header">
            <Title level={1} className="page-title">
              <ThunderboltOutlined /> Flash Sales
            </Title>
            {/* Session filter removed - new structure doesn't use sessions */}
          </div>

          {loading && flashSales.length === 0 ? (
            <div className="loading-container">
              <Spin size="large" />
            </div>
          ) : products.length === 0 ? (
            <div className="empty-container">
              <p>Không có sản phẩm flash sale nào</p>
            </div>
          ) : (
            <>
              <Row gutter={[16, 16]}>
                {products.map((product) => {
                  const flashSale = (product as any).flashSale;
                  
                  return (
                    <Col xs={12} sm={12} md={8} lg={6} xl={6} key={product._id || product.sku}>
                      <div className="flash-sale-product-wrapper">
                        {flashSale && flashSale.availableStock <= 5 && flashSale.availableStock > 0 && (
                          <Tag color="red" className="low-stock-badge">
                            Còn {flashSale.availableStock} sản phẩm
                          </Tag>
                        )}
                        {flashSale && flashSale.availableStock === 0 && (
                          <Tag color="default" className="sold-out-badge">
                            Hết hàng
                          </Tag>
                        )}
                        {flashSale && flashSale.soldPercent > 0 && (
                          <div className="sold-progress-bar">
                            <div className="progress-label">
                              Đã bán {flashSale.sold}/{flashSale.flash_stock}
                            </div>
                            <div className="progress-bar">
                              <div 
                                className="progress-fill" 
                                style={{ width: `${flashSale.soldPercent}%` }}
                              />
                            </div>
                          </div>
                        )}
                        <ProductCard
                          product={product}
                          onAddToCart={handleAddToCart}
                          onAddToWishlist={handleAddToWishlist}
                        />
                      </div>
                    </Col>
                  );
                })}
              </Row>

              {pagination.total > pagination.pageSize && (
                <div className="pagination-container">
                  <button
                    className="pagination-btn"
                    disabled={pagination.current === 1}
                    onClick={() => setPagination(prev => ({ ...prev, current: prev.current - 1 }))}
                  >
                    Trước
                  </button>
                  <span className="pagination-info">
                    Trang {pagination.current} / {Math.ceil(pagination.total / pagination.pageSize)}
                  </span>
                  <button
                    className="pagination-btn"
                    disabled={pagination.current >= Math.ceil(pagination.total / pagination.pageSize)}
                    onClick={() => setPagination(prev => ({ ...prev, current: prev.current + 1 }))}
                  >
                    Sau
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </PageWrapper>
  );
};

export default FlashSalesPage;

