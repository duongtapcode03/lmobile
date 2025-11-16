import React from 'react';
import { Link } from 'react-router-dom';
import type { Brand } from '../../types';
import './CategorySidebar.scss';

interface BrandFilterProps {
  brands: Brand[];
  loading: boolean;
  selectedBrands: (number | string)[];
  onBrandToggle: (brandId: number | string) => void;
}

/**
 * BrandFilter Component
 * Hiển thị danh sách brands dạng logo grid
 * Single Responsibility: Chỉ render brand filter
 */
const BrandFilter: React.FC<BrandFilterProps> = ({
  brands,
  loading,
  selectedBrands,
  onBrandToggle,
}) => {
  if (brands.length === 0 && !loading) {
    return null;
  }

  const handleBrandClick = (e: React.MouseEvent, brandId: number | string) => {
    e.preventDefault();
    onBrandToggle(brandId);
  };

  return (
    <div className="sidebar-section v5-filter">
      <div className="sidebar-title">
        <h3>Lựa chọn hãng</h3>
      </div>
      <div className="slick-padding">
        <div className="v5-brand-list">
          {loading ? (
            <div className="loading-placeholder">
              {Array.from({ length: 12 }).map((_, index) => (
                <div key={index} className="skeleton-brand-item" />
              ))}
            </div>
          ) : (
            brands.map((brand) => {
              const brandId = brand._id;
              const brandIdStr = brandId !== undefined ? String(brandId) : '';
              const isSelected = brandId !== undefined && selectedBrands.some(id => String(id) === String(brandId));
              
              return (
              <div key={brandId || brand.slug} className="brand-logo-item">
                <Link
                  to={`/products?brand=${brand.slug}`}
                  title={brand.name}
                  className={isSelected ? 'active' : ''}
                  onClick={(e) => {
                    if (brandId !== undefined) {
                      handleBrandClick(e, brandId);
                    }
                  }}
                  aria-label={`Filter by ${brand.name}`}
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
  );
};

export default React.memo(BrandFilter);





