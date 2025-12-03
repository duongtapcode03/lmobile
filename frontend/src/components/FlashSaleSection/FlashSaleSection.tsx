/**
 * FlashSaleSection Component
 * Hiển thị section flash sales trên trang chủ
 */

import React, { useState, useEffect } from 'react';
import { Typography, Button, Tag } from 'antd';
import { RightOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import ProductCard from '../ProductCard';
import flashSaleService, { type FlashSaleItem } from '../../api/flashSaleService';
import type { PhoneDetail } from '../../types';
import './FlashSaleSection.scss';

const { Title } = Typography;

interface FlashSaleSectionProps {
  limit?: number;
}

const FlashSaleSection: React.FC<FlashSaleSectionProps> = ({ 
  limit = 4
}) => {
  const [products, setProducts] = useState<(PhoneDetail & { flashSale: any })[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadFlashSales();
  }, [limit]);

  const loadFlashSales = async () => {
    try {
      setLoading(true);
      // Lấy danh sách flash sales đang active
      const flashSalesResponse = await flashSaleService.getActiveFlashSales({
        page: 1,
        limit: 10, // Lấy nhiều flash sales để có đủ items
      });

      // Lấy items của từng flash sale và lấy limit items đầu tiên
      const allItems: FlashSaleItem[] = [];
      for (const flashSale of flashSalesResponse.data || []) {
        try {
          // Sử dụng public API để không cần đăng nhập
          const itemsResponse = await flashSaleService.getPublicFlashSaleItems(flashSale._id!, {
            page: 1,
            limit: 100, // Lấy tất cả items
            sortBy: 'sort_order',
            sortOrder: 'asc',
          });
          const items = (itemsResponse.data || []).map((item: FlashSaleItem) => ({
            ...item,
            flashSaleId: flashSale._id,
            flashSaleName: flashSale.name,
          }));
          allItems.push(...items);
          
          // Nếu đã đủ limit items, dừng lại
          if (allItems.length >= limit) {
            break;
          }
        } catch (error) {
          console.error(`Failed to load items for flash sale ${flashSale._id}:`, error);
        }
      }

      // Chỉ lấy limit items đầu tiên
      const limitedItems = allItems.slice(0, limit);

      // Convert flash sale items to products format
      const productsData = limitedItems
        .filter(item => item.product && item.product._id)
        .map(item => {
          const product = item.product!;
          const availableStock = item.availableStock ?? (item.flash_stock - item.sold - (item.reserved || 0));
          const remaining = item.flash_stock - item.sold;
          const soldPercent = item.flash_stock > 0 
            ? Math.round((item.sold / item.flash_stock) * 100) 
            : 0;

          // Lấy flashSaleId từ item (có thể là flashSaleId hoặc flash_sale_id)
          const flashSaleId = (item as any).flashSaleId || item.flash_sale_id;

          return {
            ...product,
            _id: product._id, // Giữ nguyên number
            // Đảm bảo các thuộc tính bắt buộc có mặt
            sku: (product as any).sku || `FS-${product._id}` || '',
            brandRef: (product as any).brandRef || 0,
            availability: availableStock > 0 ? 1 : 0,
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
              flashSaleId: flashSaleId,
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
          } as unknown as PhoneDetail & { flashSale: any };
        });

      setProducts(productsData);
    } catch (error) {
      console.warn('Failed to load flash sales:', error);
      setProducts([]);
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

  if (products.length === 0 && !loading) {
    return null;
  }

  return (
    <div className="flash-sale-section">
      <div className="section-header">
        <div className="header-left">
          <Title level={2} className="section-title">
            <ThunderboltOutlined /> Flash Sales
          </Title>
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

