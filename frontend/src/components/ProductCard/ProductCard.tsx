import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { userService } from '../../api/userService';
import { useToast } from '../../contexts/ToastContext';
import type { PhoneDetail } from '../../types';
import type { RootState } from '../../store';
import './ProductCard.scss';

interface ProductCardProps {
  product: PhoneDetail;
  onAddToCart?: (productId: string) => void;
  onAddToWishlist?: (productId: string) => void;
  skipWishlistCheck?: boolean; // Skip wishlist check (useful in wishlist page)
}

const ProductCard: React.FC<ProductCardProps> = ({ 
  product, 
  onAddToCart, 
  onAddToWishlist,
  skipWishlistCheck = false
}) => {
  const toast = useToast();
  const navigate = useNavigate();
  const [isFavorite, setIsFavorite] = useState(false);
  const [checkingWishlist, setCheckingWishlist] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Get auth state from Redux
  const isAuthenticated = useSelector((state: RootState) => (state.auth as any).isAuthenticated);
  const token = useSelector((state: RootState) => (state.auth as any).token);
  
  // Use _id for wishlist operations (backend will find product by _id)
  const productId = product._id 
    ? (typeof product._id === 'string' ? product._id : product._id.toString())
    : (product.sku || '');
  
  // Debug: Log product info
  if (import.meta.env.DEV) {
    console.debug('[ProductCard] Product info:', {
      _id: product._id,
      sku: product.sku,
      name: product.name,
      productId: productId
    });
  }

  // Check if user is authenticated - use Redux state
  const checkAuth = React.useCallback(() => {
    return isAuthenticated && !!token;
  }, [isAuthenticated, token]);

  // Check if product is in wishlist on mount
  // Use ref to prevent multiple calls for the same productId + token combination
  const hasCheckedRef = React.useRef<string | null>(null);
  
  // Skip wishlist check if skipWishlistCheck is true (e.g., in wishlist page)
  useEffect(() => {
    if (skipWishlistCheck) {
      // If in wishlist page, assume product is in wishlist
      setIsFavorite(true);
      return;
    }
    
    // Create unique key for this check (productId + token)
    const checkKey = `${productId}-${token || 'no-token'}`;
    
    // Skip if already checked for this combination
    if (hasCheckedRef.current === checkKey) {
      return;
    }
    
    // Double check authentication before calling API
    if (!checkAuth() || !productId || !token) {
      setIsFavorite(false);
      hasCheckedRef.current = null;
      return;
    }
    
    // Mark as checked for this combination
    hasCheckedRef.current = checkKey;
    
    // Debounce: wait a bit before making the request
    const timeoutId = setTimeout(async () => {
      try {
        setCheckingWishlist(true);
        const inWishlist = await userService.checkProductInWishlist(productId);
        setIsFavorite(inWishlist);
      } catch (error: any) {
        // Silent fail - user might not have wishlist yet
        // Don't log 401 errors as they're handled by axiosClient
        if (error.response?.status !== 401) {
          console.debug('Could not check wishlist status:', error);
        }
        setIsFavorite(false);
        // Reset on error so it can retry if needed
        hasCheckedRef.current = null;
      } finally {
        setCheckingWishlist(false);
      }
    }, 100); // 100ms debounce to batch requests
    
    return () => {
      clearTimeout(timeoutId);
    };
  }, [productId, checkAuth, token, skipWishlistCheck]);
  
  // Listen to wishlist update events from other components
  useEffect(() => {
    const handleWishlistUpdate = (event: CustomEvent) => {
      const updatedProductId = event.detail?.productId;
      // If this product was updated, reset check and re-check
      if (updatedProductId && (updatedProductId === productId || updatedProductId === product.sku)) {
        hasCheckedRef.current = null;
        // Re-check wishlist status
        if (checkAuth() && productId && token && !skipWishlistCheck) {
          userService.checkProductInWishlist(productId)
            .then(inWishlist => setIsFavorite(inWishlist))
            .catch(() => setIsFavorite(false));
        }
      }
    };
    
    window.addEventListener('wishlistUpdated', handleWishlistUpdate as EventListener);
    
    return () => {
      window.removeEventListener('wishlistUpdated', handleWishlistUpdate as EventListener);
    };
  }, [productId, product.sku, checkAuth, token, skipWishlistCheck]);
  const formatPrice = (price: string | number | null | undefined): string => {
    if (!price) return 'Liên hệ';
    if (typeof price === 'number') {
      return new Intl.NumberFormat('vi-VN').format(price) + ' ₫';
    }
    return price;
  };

  const getMainImage = (): string => {
    if (product.imageUrl) return product.imageUrl;
    if (product.images && product.images.length > 0) {
      const firstImage = product.images[0];
      return typeof firstImage === 'string' ? firstImage : firstImage.url;
    }
    return '/placeholder-product.png';
  };

  const hasDiscount = product.hasDiscount || 
    (product.discount && 
     (typeof product.discount === 'string' 
       ? product.discount !== '0' && (product.discount as string).trim() !== ''
       : product.discount !== 0));

  const getDiscountPercent = (): string | null => {
    if (!hasDiscount) return null;
    if (typeof product.discount === 'number') {
      return `- ${product.discount}%`;
    }
    if (product.discountRate) {
      return `- ${product.discountRate}`;
    }
    if (typeof product.discount === 'string' && product.discount) {
      return `- ${product.discount}`;
    }
    return null;
  };

  // Get refresh rate from specifications
  const getRefreshRate = (): string | null => {
    if (product.specifications) {
      // Try to find refresh rate in specifications
      const refreshRateKeys = ['Tần số quét', 'Refresh Rate', 'Hz', 'Tần số quét (Hz)'];
      for (const key of refreshRateKeys) {
        const value = product.specifications[key];
        if (value) {
          // Extract Hz value (e.g., "120Hz" or "120 Hz")
          const match = value.match(/(\d+)\s*Hz/i);
          if (match) {
            return `${match[1]}Hz`;
          }
          return value;
        }
      }
    }
    return null;
  };

  const productUrl = product.slug ? `/products/slug/${product.slug}` : `/products/${product._id || product.sku}`;
  const installmentUrl = product.slug ? `/tra-gop/dien-thoai/${product.slug}` : `/tra-gop/dien-thoai/${product._id || product.sku}`;

  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Check authentication - use Redux state
    if (!checkAuth() || !token) {
      const currentPath = window.location.pathname;
      // Hiển thị message nhưng không block navigation
      toast.warning('Vui lòng đăng nhập để thêm sản phẩm vào yêu thích', 2);
      
      // Lưu path hiện tại vào sessionStorage để có thể redirect lại sau khi login
      try {
        sessionStorage.setItem('redirectAfterLogin', currentPath);
      } catch (err) {
        console.warn('Could not save redirect path:', err);
      }
      
      // Sử dụng window.location.href để đảm bảo page reload đúng cách và tránh màn hình trắng
      setTimeout(() => {
        window.location.href = '/login';
      }, 200);
      return;
    }

    if (!productId) {
      toast.error('Không tìm thấy sản phẩm');
      return;
    }

    // Optimistic Update: Cập nhật UI ngay lập tức
    const previousFavoriteState = isFavorite;
    const newFavoriteState = !isFavorite;
    
    // Cập nhật UI ngay lập tức (optimistic update)
    setIsFavorite(newFavoriteState);
    setLoading(true);

    try {
      // Sử dụng API mới: toggleWishlist (thêm nếu chưa có, xóa nếu đã có)
      const normalizedProductId = String(productId).trim();
      
      if (!normalizedProductId || normalizedProductId === '') {
        // Rollback nếu productId không hợp lệ
        setIsFavorite(previousFavoriteState);
        setLoading(false);
        toast.error('Không tìm thấy ID sản phẩm');
        return;
      }
      
      if (import.meta.env.DEV) {
        console.log('[ProductCard] Toggling wishlist (optimistic update):', {
          productId: normalizedProductId,
          productName: product.name,
          productSku: product.sku,
          product_id: product._id,
          previousState: previousFavoriteState,
          newState: newFavoriteState
        });
      }
      
      // Gọi API (UI đã được cập nhật trước đó)
      const result = await userService.toggleWishlist(normalizedProductId);
      
      // Xác nhận trạng thái từ server (đảm bảo đồng bộ)
      const confirmedState = result.inWishlist || false;
      setIsFavorite(confirmedState);
      
      // Hiển thị message
      if (confirmedState) {
        toast.success('Đã thêm vào yêu thích');
      } else {
        toast.success('Đã xóa khỏi yêu thích');
      }

      // Dispatch custom event to notify other components (e.g., Header)
      window.dispatchEvent(new CustomEvent('wishlistUpdated', {
        detail: { productId: normalizedProductId }
      }));

      // Call parent callback if provided
      onAddToWishlist?.(productId);
    } catch (error: any) {
      console.error('Error toggling wishlist:', error);
      
      // Rollback: Khôi phục trạng thái cũ nếu API call thất bại
      setIsFavorite(previousFavoriteState);
      
      // Handle 401 - Token expired/invalid (axiosClient will handle refresh/redirect)
      if (error.response?.status === 401) {
        // Don't show error message, axiosClient will handle redirect to login
        // Just reset loading state
        setLoading(false);
        return;
      }
      
      const errorMessage = error.response?.data?.message || 'Không thể cập nhật yêu thích';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Get rating (default to 0 if not available)
  const rating = (product as any).rating || (product as any).averageRating || 0;
  const reviewCount = (product as any).reviewCount || (product as any).reviewsCount || 0;

  return (
    <div className="pj16-item-info">
      <div className="img">
        <div className="img-info">

          <Link 
            title={product.name} 
            to={productUrl}
            data-id={product._id || product.sku}
          >
            <img 
              alt={product.name} 
              src={getMainImage()} 
              id={`product-img-${product._id || product.sku}`}
              className="product-main-image"
              style={{ maxWidth: '180px', maxHeight: '180px' }}
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/placeholder-product.png';
              }}
            />
            <div className="bottom-sticker-wrapper"></div>

            {/* Specs - Overlay on image */}
            <div className="specs">
              <ul>
                {product.cpu && (
                  <li className="spec-item item-1-0 type-">
                    <label className="icon jstooltip" title="Vi xử lý">
                      <span className="icon-CPU"></span>
                    </label>
                    <div>
                      <span>{product.cpu}</span>
                    </div>
                  </li>
                )}
                {product.storage && (
                  <li className="spec-item item-1-1 type-">
                    <label className="icon jstooltip" title="Bộ nhớ trong">
                      <span className="icon-HardDrive"></span>
                    </label>
                    <div>
                      <span>{product.storage}</span>
                    </div>
                  </li>
                )}
                                {product.screenSize && (
                  <li className="spec-item item-1-1 type-">
                    <label className="icon jstooltip" title="Bộ nhớ trong">
                      <span className="icon-HardDrive"></span>
                    </label>
                    <div>
                      <span>{product.screenSize}</span>
                    </div>
                  </li>
                )}
                {getRefreshRate() && (
                  <li className="spec-item item-1-1 type-">
                    <label className="icon jstooltip" title="Tần số quét (Hz)">
                      <span className="icon-tivi"></span>
                    </label>
                    <div>
                      <span>{getRefreshRate()}</span>
                    </div>
                  </li>
                )}
              </ul>
            </div>
          </Link>
        </div>
      </div>

      <h3>
        <Link 
          title={product.name} 
          to={productUrl} 
          className="text-limit"
        >
          {product.name}
        </Link>
      </h3>

      <div className="item-gap8px">
        {product.oldPrice && hasDiscount && (
          <div className="price price-last">
            <s>{formatPrice(product.oldPrice)}</s>
            {getDiscountPercent() && <span>{getDiscountPercent()}</span>}
          </div>
        )}

        <div className="price">
          {product.price && (
            <strong>{formatPrice(product.price)}</strong>
          )}
        </div>

        {product.installmentPrice && (
          <Link to={installmentUrl}>
            Hoặc {formatPrice(product.installmentPrice)} x 6 tháng
          </Link>
        )}
      </div>

      {/* Rating and Favorite Button */}
      <div className="product-footer">
        {rating > 0 && (
          <div className="product-rating">
            <svg 
              stroke="currentColor" 
              fill="currentColor" 
              strokeWidth="0" 
              viewBox="0 0 576 512" 
              className="star-icon"
              height="1em" 
              width="1em" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M259.3 17.8L194 150.2 47.9 171.5c-26.2 3.8-36.7 36.1-17.7 54.6l105.7 103-25 145.5c-4.5 26.3 23.2 46 46.4 33.7L288 439.6l130.7 68.7c23.2 12.2 50.9-7.4 46.4-33.7l-25-145.5 105.7-103c19-18.5 8.5-50.8-17.7-54.6L382 150.2 316.7 17.8c-11.7-23.6-45.6-23.9-57.4 0z"></path>
            </svg>
            <span className="rating-value">{rating.toFixed(1)}</span>
          </div>
        )}
        <button 
          className="favorite-button"
          onClick={handleFavoriteClick}
          aria-label="Yêu thích"
          disabled={loading || checkingWishlist}
                  title={checkAuth() ? (isFavorite ? 'Xóa khỏi yêu thích' : 'Thêm vào yêu thích') : 'Đăng nhập để yêu thích'}
        >
          <svg 
            stroke="currentColor" 
            fill={isFavorite ? "currentColor" : "none"} 
            strokeWidth="2" 
            viewBox="0 0 24 24" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            className={`heart-icon ${isFavorite ? 'filled' : ''}`}
            height="1em" 
            width="1em" 
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
          </svg>
          <span className="favorite-text">Yêu thích</span>
        </button>
      </div>
    </div>
  );
};

export default ProductCard;

