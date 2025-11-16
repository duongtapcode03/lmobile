import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import phoneService from '../../api/phoneService';
import type { PhoneDetail } from '../../types';
import './QuickSaleSection.scss';

interface QuickSaleSectionProps {
  products?: PhoneDetail[]; // Optional - nếu không có sẽ tự fetch
  loading?: boolean;
  limit?: number;
}

const QuickSaleSection: React.FC<QuickSaleSectionProps> = ({ 
  products: propsProducts, 
  loading: propsLoading,
  limit = 8 
}) => {
  const [products, setProducts] = useState<PhoneDetail[]>(propsProducts || []);
  const [loading, setLoading] = useState(propsLoading || false);

  // Fetch data từ API nếu không có props
  useEffect(() => {
    // Nếu có props, sử dụng props
    if (propsProducts) {
      setProducts(propsProducts);
      setLoading(propsLoading || false);
      return;
    }

    // Nếu không có props, fetch từ API
    if (!propsLoading) {
      const fetchQuickSaleProducts = async () => {
        try {
          setLoading(true);
          const quickSaleResponse = await phoneService.getQuickSalePhones(limit);
          setProducts(quickSaleResponse);
        } catch (error) {
          console.warn('Failed to load quick sale products:', error);
          setProducts([]);
        } finally {
          setLoading(false);
        }
      };

      fetchQuickSaleProducts();
    }
    // Depend on propsProducts length and limit to detect changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propsProducts?.length, limit, propsLoading]);
  if (loading) {
    return (
      <div className="quick-sales">
        <div className="quick-sales-loading">
          {[...Array(4)].map((_, index) => (
            <div key={index} className="item skeleton-item"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!products || products.length === 0) {
    return null;
  }

  // Filter only products with quick sale data, active, and in stock
  const quickSaleProducts = products.filter(
    (product: any) => 
      product.isQuickSale && 
      product.quickSaleImageUrl &&
      product.isActive !== false &&
      (product.availability === undefined || product.availability > 0)
  );

  if (quickSaleProducts.length === 0) {
    return null;
  }

  return (
    <div className="quick-sales">
      {quickSaleProducts.map((product: any, index) => {
        // Build link URL giống ProductCard
        const productUrl = product.slug 
          ? `/products/slug/${product.slug}` 
          : `/products/${product._id || product.sku}`;

        // Add UTM parameters if available
        let finalUrl = productUrl;
        if (product.quickSaleUtmSource && product.quickSaleUtmMedium && product.quickSaleUtmCampaign) {
          const utmParams = new URLSearchParams({
            utm_source: product.quickSaleUtmSource,
            utm_medium: product.quickSaleUtmMedium,
            utm_campaign: product.quickSaleUtmCampaign
          });
          finalUrl = `${productUrl}?${utmParams.toString()}`;
        }

        const title = product.quickSaleTitle || product.name || '';
        const alt = product.quickSaleAlt || product.quickSaleTitle || product.name || '';
        const imageUrl = product.quickSaleImageUrl || product.thumbnail || '';

        return (
          <div key={product._id || product.sku || index} className="item">
            <Link 
              to={finalUrl}
              title={title}
            >
              <img 
                src={imageUrl} 
                title={title} 
                alt={alt}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/placeholder-product.png';
                }}
              />
            </Link>
          </div>
        );
      })}
    </div>
  );
};

export default QuickSaleSection;

