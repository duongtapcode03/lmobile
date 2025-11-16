/**
 * FlashSaleSection Component
 * Hiển thị section flash sales trên trang chủ
 */

import React, { useState, useEffect } from 'react';
import { Row, Col, Typography, Button, Tag } from 'antd';
import { RightOutlined, ThunderboltOutlined, FireOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import ProductCard from '../ProductCard';
import flashSaleService, { type FlashSale } from '../../api/flashSaleService';
import type { PhoneDetail } from '../../types';
import './FlashSaleSection.scss';

const { Title } = Typography;

interface FlashSaleSectionProps {
  limit?: number;
  sessionId?: string;
}

const FlashSaleSection: React.FC<FlashSaleSectionProps> = ({ 
  limit = 4,
  sessionId 
}) => {
  const [flashSales, setFlashSales] = useState<FlashSale[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentSession, setCurrentSession] = useState<string>('');

  useEffect(() => {
    loadFlashSales();
  }, [limit, sessionId]);

  const loadFlashSales = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: 1,
        limit: limit,
        sortBy: 'sort_order',
        sortOrder: 'asc',
      };

      if (sessionId) {
        params.session_id = sessionId;
      }

      const response = await flashSaleService.getActiveFlashSales(params);
      
      // Convert flash sales to products format
      const products = response.data
        .filter(item => item.product && item.product._id)
        .map(item => {
          const product = item.product!;
          const remaining = item.total_stock - item.sold;
          const soldPercent = item.total_stock > 0 
            ? Math.round((item.sold / item.total_stock) * 100) 
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
              id: item.id,
              flash_price: item.flash_price,
              total_stock: item.total_stock,
              sold: item.sold,
              remaining: remaining,
              soldPercent: soldPercent,
              limit_per_user: item.limit_per_user,
              session_id: item.session_id,
            },
            stock: remaining,
            isFlashSale: true,
          } as PhoneDetail & { flashSale: any };
        });

      setFlashSales(response.data);
      
      // Set current session if available
      if (response.data.length > 0 && !sessionId) {
        setCurrentSession(response.data[0].session_id);
      } else if (sessionId) {
        setCurrentSession(sessionId);
      }
    } catch (error) {
      console.warn('Failed to load flash sales:', error);
      setFlashSales([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flash-sale-section">
        <div className="section-header">
          <Title level={2} className="section-title">
            <ThunderboltOutlined /> Flash Sales
          </Title>
        </div>
        <div className="flash-sales-loading">
          {[...Array(4)].map((_, index) => (
            <div key={index} className="item skeleton-item"></div>
          ))}
        </div>
      </div>
    );
  }

  if (flashSales.length === 0) {
    return null;
  }

  // Convert flash sales to products for ProductCard
  const products = flashSales
    .filter(item => item.product && item.product._id)
    .map(item => {
      const product = item.product!;
      const remaining = item.total_stock - item.sold;
      const soldPercent = item.total_stock > 0 
        ? Math.round((item.sold / item.total_stock) * 100) 
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
          id: item.id,
          flash_price: item.flash_price,
          total_stock: item.total_stock,
          sold: item.sold,
          remaining: remaining,
          soldPercent: soldPercent,
          limit_per_user: item.limit_per_user,
          session_id: item.session_id,
        },
        stock: remaining,
        isFlashSale: true,
      } as PhoneDetail & { flashSale: any };
    });

  const getSessionLabel = (sessionId: string) => {
    const sessionMap: Record<string, string> = {
      morning: 'Sáng',
      afternoon: 'Chiều',
      evening: 'Tối',
      night: 'Đêm',
    };
    return sessionMap[sessionId] || sessionId;
  };

  return (
    <div className="flash-sale-section">
      <div className="section-header">
        <div className="header-left">
          <Title level={2} className="section-title">
            <ThunderboltOutlined /> Flash Sales
          </Title>
          {currentSession && (
            <Tag color="red" icon={<FireOutlined />} className="session-tag">
              {getSessionLabel(currentSession)}
            </Tag>
          )}
        </div>
        <Link to="/flash-sales" className="view-all-link">
          <Button
            type="primary"
            size="large"
            icon={<RightOutlined />}
            className="view-all-button"
          >
            Xem tất cả
          </Button>
        </Link>
      </div>

      <div className="flash-sales-scroll-container">
        <div className="flash-sales-scroll">
          {products.map((product) => {
            const flashSale = (product as any).flashSale;
            
            return (
              <div key={product._id || product.sku} className="flash-sale-item">
                <div className="flash-sale-product-wrapper">
                  {flashSale && flashSale.remaining <= 5 && flashSale.remaining > 0 && (
                    <Tag color="red" className="low-stock-badge">
                      Còn {flashSale.remaining} sản phẩm
                    </Tag>
                  )}
                  {flashSale && flashSale.remaining === 0 && (
                    <Tag color="default" className="sold-out-badge">
                      Hết hàng
                    </Tag>
                  )}
                  {flashSale && flashSale.soldPercent > 0 && (
                    <div className="sold-progress-bar">
                      <div className="progress-label">
                        Đã bán {flashSale.sold}/{flashSale.total_stock}
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
                    onAddToCart={() => {}}
                    onAddToWishlist={() => {}}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default FlashSaleSection;

