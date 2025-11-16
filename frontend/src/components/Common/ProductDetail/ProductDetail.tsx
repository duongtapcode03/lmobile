import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Row, 
  Col, 
  Typography, 
  Spin, 
  Button, 
  Carousel, 
  message
} from 'antd';
import type { CarouselRef } from 'antd/es/carousel';
import { 
  ShoppingCartOutlined, 
  ArrowLeftOutlined,
  LeftOutlined,
  RightOutlined,
  GiftOutlined,
  CaretDownOutlined,
  FileTextOutlined
} from '@ant-design/icons';
import phoneService from '../../../api/phoneService';
import type { PhoneDetail } from '../../../types';
import { PageWrapper } from '../CommonComponents';
import ProductReviews from '../ProductReviews/ProductReviews';
import { useSelector, useDispatch } from 'react-redux';
import { addToCart as addToCartAction, fetchCart } from '../../../features/cart/cartSlice';
import './ProductDetail.scss';

const { Title } = Typography;

interface ProductDetailProps {
  className?: string;
}

const ProductDetail: React.FC<ProductDetailProps> = ({ className = 'product-detail-page' }) => {
  const { id, slug } = useParams<{ id?: string; slug?: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [product, setProduct] = useState<PhoneDetail | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [showAllPromotions, setShowAllPromotions] = useState(false);
  const [showFullContent, setShowFullContent] = useState(false);
  const [isContentOverflowing, setIsContentOverflowing] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);
  const carouselRef = useRef<CarouselRef>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const dispatch = useDispatch();
  
  // Get auth state from Redux
  const isAuthenticated = useSelector((state: any) => state?.auth?.isAuthenticated || false);

  useEffect(() => {
    const loadProduct = async () => {
      if (!id && !slug) {
        setError('Product ID or slug is required');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        let productData: PhoneDetail;
        if (slug) {
          productData = await phoneService.getPhoneBySlug(slug);
        } else if (id) {
          productData = await phoneService.getPhoneById(id);
        } else {
          throw new Error('Product identifier is required');
        }

        console.log('[ProductDetail] Product loaded:', {
          _id: productData._id,
          name: productData.name,
          hasVersions: !!productData.versions,
          versionsCount: productData.versions?.length || 0,
          versions: productData.versions?.map(v => ({ sku: v.sku, _id: v._id, keys: Object.keys(v) })) || []
        });
        setProduct(productData);
        // Reset quantity về 1 khi load sản phẩm mới
        setQuantity(1);
      } catch (err: any) {
        console.error('Error loading product:', err);
        setError(err.message || 'Không thể tải thông tin sản phẩm');
        message.error('Không thể tải thông tin sản phẩm');
      } finally {
        setLoading(false);
      }
    };

    loadProduct();
  }, [id, slug]);

  // Check if content is overflowing
  useEffect(() => {
    const checkContentOverflow = () => {
      if (contentRef.current) {
        const element = contentRef.current;
        const originalMaxHeight = element.style.maxHeight;
        const originalOverflow = element.style.overflow;
        
        element.style.maxHeight = 'none';
        element.style.overflow = 'visible';
        const fullHeight = element.scrollHeight;
        
        element.style.maxHeight = originalMaxHeight;
        element.style.overflow = originalOverflow;
        
        setIsContentOverflowing(fullHeight > 500);
      }
    };

    if (product) {
      const timer = setTimeout(() => {
        checkContentOverflow();
      }, 300);

      window.addEventListener('resize', checkContentOverflow);

      return () => {
        clearTimeout(timer);
        window.removeEventListener('resize', checkContentOverflow);
      };
    }
  }, [product]);

  const formatPrice = (price: string | number | null | undefined): string => {
    if (!price) return 'Liên hệ';
    if (typeof price === 'number') {
      return new Intl.NumberFormat('vi-VN').format(price) + ' đ';
    }
    return price;
  };

  const getMainImage = (): string => {
    if (!product) return '/placeholder-product.png';
    if (product.imageUrl) return product.imageUrl;
    if (product.images && product.images.length > 0) {
      const firstImage = product.images[0];
      return typeof firstImage === 'string' ? firstImage : firstImage.url;
    }
    return '/placeholder-product.png';
  };

  const getAllImages = (): string[] => {
    if (!product) return [];
    const images: string[] = [];
    
    if (product.imageUrl) {
      images.push(product.imageUrl);
    }
    
    if (product.images && product.images.length > 0) {
      product.images.forEach(img => {
        const url = typeof img === 'string' ? img : img.url;
        if (url && !images.includes(url)) {
          images.push(url);
        }
      });
    }
    
    return images.length > 0 ? images : [getMainImage()];
  };

  const handleBuyNow = useCallback(async (e?: React.MouseEvent) => {
    // Ngăn chặn event propagation
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    // Ngăn chặn gọi nhiều lần khi đang xử lý
    if (addingToCart) {
      console.log('[BuyNow] Already processing, skipping...');
      return;
    }

    if (!product) {
      console.log('[BuyNow] No product');
      message.warning('Sản phẩm không tồn tại');
      return;
    }

    console.log('[BuyNow] Starting...', {
      isAuthenticated,
      hasVersions: (product.versions && product.versions.length > 0),
      selectedVersion,
      hasColors: (product.colors && product.colors.length > 0),
      selectedColor,
      quantity,
      stock: product.stock
    });

    // Kiểm tra đăng nhập - BẮT BUỘC
    if (!isAuthenticated) {
      console.log('[BuyNow] Not authenticated, redirecting to login');
      message.warning('Vui lòng đăng nhập để mua hàng');
      navigate('/login', { state: { from: `/product/${product.slug || product._id}` } });
      return;
    }

    // Kiểm tra sản phẩm còn hàng
    const stock = product.stock || 0;
    const availability = product.availability || 0;
    if (stock === 0 || availability === 0) {
      message.error('Sản phẩm đã hết hàng');
      return;
    }

    // BẮT BUỘC chọn version nếu sản phẩm có versions
    if (product.versions && product.versions.length > 0 && !selectedVersion) {
      console.log('[BuyNow] Version required but not selected');
      message.warning('Vui lòng chọn phiên bản sản phẩm');
      return;
    }

    // BẮT BUỘC chọn màu nếu sản phẩm có colors
    if (product.colors && product.colors.length > 0 && !selectedColor) {
      console.log('[BuyNow] Color required but not selected');
      message.warning('Vui lòng chọn màu sản phẩm');
      return;
    }

    try {
      setAddingToCart(true);

      // Lấy productId (ưu tiên _id, nếu không có thì dùng sku)
      const productId = product._id || product.sku;
      if (!productId) {
        throw new Error('Không tìm thấy ID sản phẩm');
      }

      // Validate quantity không vượt quá stock
      if (quantity > stock) {
        message.error(`Số lượng không được vượt quá ${stock} sản phẩm`);
        setAddingToCart(false);
        return;
      }

      if (quantity < 1) {
        message.error('Số lượng phải lớn hơn 0');
        setAddingToCart(false);
        return;
      }

      // Tìm variantId từ selectedVersion (SKU của variant) - BẮT BUỘC nếu có versions
      let variantId: number | undefined = undefined;
      
      if (product.versions && product.versions.length > 0) {
        if (!selectedVersion) {
          message.warning('Vui lòng chọn phiên bản sản phẩm');
          setAddingToCart(false);
          return;
        }
        
        // Ưu tiên tìm trong variants (có _id) nếu có, nếu không thì tìm trong versions
        let selectedVersionData: any = null;
        
        if ((product as any).variants && Array.isArray((product as any).variants)) {
          // Tìm trong variants array (có đầy đủ thông tin bao gồm _id)
          selectedVersionData = (product as any).variants.find((v: any) => 
            v.sku === selectedVersion && v.type === 'storage'
          );
          console.log('[BuyNow] Found in variants:', selectedVersionData);
        }
        
        if (!selectedVersionData && product.versions) {
          // Fallback: tìm trong versions array
          selectedVersionData = product.versions.find((v: any) => v.sku === selectedVersion);
          console.log('[BuyNow] Found in versions:', selectedVersionData);
        }
        
        if (selectedVersionData && selectedVersionData._id) {
          variantId = selectedVersionData._id;
          console.log('[BuyNow] Using variantId:', variantId);
        } else {
          console.log('[BuyNow] Variant not found or missing _id:', {
            selectedVersion,
            found: !!selectedVersionData,
            hasId: selectedVersionData?._id ? true : false
          });
        }
      }

      // Dispatch Redux action để thêm vào giỏ hàng (API mới - chỉ cần productId, quantity, variantId)
      const addToCartResult = await dispatch(addToCartAction({
        productId: productId,
        quantity: quantity,
        variantId: variantId
      }) as any);
      
      console.log('[BuyNow] Result:', addToCartResult);
      
      if (addToCartResult.type === 'cart/addToCart/rejected') {
        console.error('[BuyNow] Rejected:', addToCartResult.payload);
        throw new Error(addToCartResult.payload || 'Không thể thêm sản phẩm vào giỏ hàng');
      }

      // Fetch lại giỏ hàng để cập nhật số lượng
      await dispatch(fetchCart() as any);

      console.log('[BuyNow] Success! Redirecting to checkout...');
      
      // Redirect đến trang checkout ngay lập tức
      navigate('/user/checkout');
    } catch (err: any) {
      console.error('Error in buy now:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Không thể thêm sản phẩm vào giỏ hàng';
      message.error(errorMessage);
    } finally {
      setAddingToCart(false);
    }
  }, [addingToCart, product, isAuthenticated, navigate, selectedColor, selectedVersion, quantity, dispatch]);

  const handleAddToCart = useCallback(async (e?: React.MouseEvent) => {
    // Ngăn chặn event propagation
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    // Ngăn chặn gọi nhiều lần khi đang xử lý
    if (addingToCart) {
      console.log('[AddToCart] Already processing, skipping...');
      return;
    }

    if (!product) {
      console.log('[AddToCart] No product');
      message.warning('Sản phẩm không tồn tại');
      return;
    }

    console.log('[AddToCart] Starting...', {
      isAuthenticated,
      hasVersions: (product.versions && product.versions.length > 0),
      selectedVersion,
      hasColors: (product.colors && product.colors.length > 0),
      selectedColor,
      quantity,
      stock: product.stock
    });

    // Kiểm tra đăng nhập - BẮT BUỘC
    if (!isAuthenticated) {
      console.log('[AddToCart] Not authenticated, redirecting to login');
      message.warning('Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng');
      navigate('/login', { state: { from: `/product/${product.slug || product._id}` } });
      return;
    }

    // Kiểm tra sản phẩm còn hàng
    const stock = product.stock || 0;
    const availability = product.availability || 0;
    if (stock === 0 || availability === 0) {
      message.error('Sản phẩm đã hết hàng');
      return;
    }

    // BẮT BUỘC chọn version nếu sản phẩm có versions
    if (product.versions && product.versions.length > 0 && !selectedVersion) {
      console.log('[AddToCart] Version required but not selected');
      message.warning('Vui lòng chọn phiên bản sản phẩm');
      return;
    }

    // BẮT BUỘC chọn màu nếu sản phẩm có colors
    if (product.colors && product.colors.length > 0 && !selectedColor) {
      console.log('[AddToCart] Color required but not selected');
      message.warning('Vui lòng chọn màu sản phẩm');
      return;
    }

    try {
      setAddingToCart(true);

      // Lấy productId (ưu tiên _id, nếu không có thì dùng sku)
      const productId = product._id || product.sku;
      if (!productId) {
        throw new Error('Không tìm thấy ID sản phẩm');
      }

      // Validate quantity không vượt quá stock
      if (quantity > stock) {
        message.error(`Số lượng không được vượt quá ${stock} sản phẩm`);
        setAddingToCart(false);
        return;
      }

      if (quantity < 1) {
        message.error('Số lượng phải lớn hơn 0');
        setAddingToCart(false);
        return;
      }

      // Tìm variantId từ selectedVersion (SKU của variant) - BẮT BUỘC nếu có versions
      let variantId: number | undefined = undefined;
      
      if (product.versions && product.versions.length > 0) {
        if (!selectedVersion) {
          message.warning('Vui lòng chọn phiên bản sản phẩm');
          setAddingToCart(false);
          return;
        }
        
        // Ưu tiên tìm trong variants (có _id) nếu có, nếu không thì tìm trong versions
        let selectedVersionData: any = null;
        
        if ((product as any).variants && Array.isArray((product as any).variants)) {
          // Tìm trong variants array (có đầy đủ thông tin bao gồm _id)
          selectedVersionData = (product as any).variants.find((v: any) => 
            v.sku === selectedVersion && v.type === 'storage'
          );
          console.log('[AddToCart] Found in variants:', selectedVersionData);
        }
        
        // Nếu không tìm thấy trong variants, thử tìm trong versions
        if (!selectedVersionData) {
          selectedVersionData = product.versions.find(v => v.sku === selectedVersion);
          console.log('[AddToCart] Found in versions:', selectedVersionData);
        }
        
        console.log('[AddToCart] Final variant data:', selectedVersionData);
        
        if (selectedVersionData && selectedVersionData._id) {
          variantId = selectedVersionData._id;
          console.log('[AddToCart] Using variantId:', variantId);
        } else {
          console.error('[AddToCart] Variant not found or missing _id:', {
            selectedVersion,
            found: !!selectedVersionData,
            hasId: selectedVersionData?._id ? true : false,
            variantData: selectedVersionData,
            hasVariantsArray: !!(product as any).variants
          });
          message.error('Phiên bản đã chọn không hợp lệ');
          setAddingToCart(false);
          return;
        }
      }

      console.log('[AddToCart] Dispatching action with:', {
        productId,
        quantity,
        variantId
      });

      // Dispatch Redux action để thêm vào giỏ hàng (API mới - chỉ cần productId, quantity, variantId)
      const addToCartResult = await dispatch(addToCartAction({
        productId: productId,
        quantity: quantity,
        variantId: variantId
      }) as any);
      
      console.log('[AddToCart] Result:', addToCartResult);
      
      if (addToCartResult.type === 'cart/addToCart/rejected') {
        console.error('[AddToCart] Rejected:', addToCartResult.payload);
        throw new Error(addToCartResult.payload || 'Không thể thêm sản phẩm vào giỏ hàng');
      }

      // Fetch lại giỏ hàng để cập nhật số lượng
      await dispatch(fetchCart() as any);

      console.log('[AddToCart] Success!');
      message.success('Đã thêm sản phẩm vào giỏ hàng');
      
      // Tự động redirect đến trang giỏ hàng
      navigate('/user/cart');
    } catch (err: any) {
      console.error('Error adding to cart:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Không thể thêm sản phẩm vào giỏ hàng';
      message.error(errorMessage);
    } finally {
      setAddingToCart(false);
    }
  }, [addingToCart, product, isAuthenticated, navigate, selectedColor, selectedVersion, quantity, dispatch]);

  if (loading) {
    return (
      <div className={className}>
        <PageWrapper loading={true} error={null}>
          <div className="container">
            <div style={{ textAlign: 'center', padding: '100px 0' }}>
              <Spin size="large" />
            </div>
          </div>
        </PageWrapper>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className={className}>
        <PageWrapper loading={false} error={error || 'Sản phẩm không tồn tại'}>
          <div className="container">
            <div style={{ textAlign: 'center', padding: '100px 0' }}>
              <Title level={3}>Không tìm thấy sản phẩm</Title>
              <Button onClick={() => navigate('/')}>Về trang chủ</Button>
            </div>
          </div>
        </PageWrapper>
      </div>
    );
  }

  const images = getAllImages();
  const hasDiscount = product.hasDiscount || 
    (product.discount !== null && 
     product.discount !== undefined && 
     product.discount !== 0);

  return (
    <div className={className}>
      <PageWrapper loading={loading} error={error}>
        <div className="container">
          <Button 
            type="link" 
            icon={<ArrowLeftOutlined />} 
            onClick={() => navigate(-1)}
            className="back-button"
          >
            Quay lại
          </Button>

          <Row gutter={[32, 32]}>
          {/* Left Side: Product Images & Content */}
          <Col xs={24} md={12} lg={10}>
            <div className="product-left-side">
              {/* Product Images */}
              <div className="product-images">
                <div className="position-relative">
                  <div className="slider-banner slick-init">
                    <button 
                      type="button"
                      className="slick-product-prev slick-arrow"
                      onClick={() => carouselRef.current?.prev()}
                      aria-label="Previous"
                    >
                      <LeftOutlined />
                    </button>

                    <Carousel
                      ref={carouselRef}
                      dots={false}
                      infinite={true}
                      afterChange={() => {}}
                      className="product-image-carousel"
                    >
                      {images.map((img, index) => (
                        <div key={index} className="left-info-image background-img">
                          <a 
                            className="img" 
                            href={img} 
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <img 
                              src={img} 
                              title={product.name} 
                              alt={product.name}
                              style={{ padding: 0, margin: 0 }}
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = '/placeholder-product.png';
                              }}
                            />
                          </a>
                        </div>
                      ))}
                    </Carousel>

                    <button 
                      type="button"
                      className="slick-product-next slick-arrow"
                      onClick={() => carouselRef.current?.next()}
                      aria-label="Next"
                    >
                      <RightOutlined />
                    </button>
                  </div>

                  {hasDiscount && (
                    <div className="discount-badge">
                      {typeof product.discount === 'number' 
                        ? `-${product.discount}%` 
                        : product.discountRate || product.discount}
                    </div>
                  )}
                </div>
              </div>

              {/* Product Content Section */}
              {(product.description || product.highlights) && (
                <div className="product-content-wrapper" style={{ marginTop: 32 }}>
                  <div className="box-content" id="box-content-modal">
                    <div className="item-site-banner">
                      <div className="site-banner-content">
                        <FileTextOutlined />
                        <div className="description">
                          <span>THÔNG TIN SẢN PHẨM</span>
                        </div>
                      </div>
                    </div>

                    <div className="box-content-description">
                      <div 
                        ref={contentRef}
                        className={`product-content-text box-content-text no-after ${showFullContent ? 'expanded' : ''}`}
                        id="productContent"
                        style={{ maxHeight: showFullContent ? 'unset' : '500px' }}
                      >
                        {/* Product Description */}
                        {product.description && (
                          <div className="product-description-content">
                            <div dangerouslySetInnerHTML={{ __html: product.description }} />
                          </div>
                        )}

                        {/* Highlights */}
                        {product.highlights && product.highlights.length > 0 && (
                          <div className="product-highlights-content">
                            <p><strong>Đặc điểm nổi bật</strong></p>
                            <ul>
                              {product.highlights.map((highlight, index) => (
                                <li key={index}>
                                  <p dangerouslySetInnerHTML={{ __html: highlight }} />
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Specifications Table */}
                        {product.specifications && Object.keys(product.specifications).length > 0 && (
                          <div className="product-specifications-content">
                            <h2><strong>Bảng thông số kỹ thuật chi tiết</strong></h2>
                            <div className="specs-table-container">
                              <table className="table-content-border">
                                <colgroup>
                                  <col width="187" />
                                  <col width="415" />
                                </colgroup>
                                <tbody>
                                  {Object.entries(product.specifications).map(([key, value]) => (
                                    <tr key={key}>
                                      <td><strong>{key}</strong></td>
                                      <td>
                                        <span dangerouslySetInnerHTML={{ __html: value }} />
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* View More/Less Button - Only show when content is overflowing */}
                      {isContentOverflowing && (
                        <div 
                          className="view-box-content btn-view" 
                          id="see-more-content"
                          onClick={() => setShowFullContent(!showFullContent)}
                          style={{ cursor: 'pointer' }}
                        >
                          <span>
                            {showFullContent ? 'Thu gọn bài viết' : 'Xem toàn bộ bài viết'}
                          </span>
                          <CaretDownOutlined style={{ transform: showFullContent ? 'rotate(180deg)' : 'none' }} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Col>

          {/* Right Side: Product Info */}
          <Col xs={24} md={12} lg={14}>
            <div className="detail-info-right">
              <Title level={1} className="product-name">{product.name}</Title>

              {/* Box Price with SKU */}
              <div className="position-relative box-price-section">
                <div className="box-price">
                  {product.price && (
                    <strong className="price">
                      {formatPrice(product.price)}
                    </strong>
                  )}
                  {product.oldPrice && (
                    <span className="LastPrice">{formatPrice(product.oldPrice)}</span>
                  )}
                </div>
                {product.sku && (
                  <div className="sku-info">
                    <label>SKU:</label> <strong id="dfSKU">{product.sku}</strong>
                  </div>
                )}
              </div>

              {/* Installment Link */}
              {product.installmentPrice && (
                <strong className="installment-link">
                  <a href={`/tra-gop/dien-thoai/${product.slug || product._id}`} target="_blank">
                    Chỉ từ {formatPrice(product.installmentPrice)} x 6 tháng (0% lãi suất, trả trước từ 30%) &gt;
                  </a>
                </strong>
              )}

              {/* Version Options - BẮT BUỘC chọn nếu có */}
              {product.versions && product.versions.length > 0 && (
                <div className="box-product-option version">
                  <strong className="label">Lựa chọn phiên bản <span style={{ color: 'red' }}>*</span></strong>
                  <div className="list-option" id="option-version">
                    {product.versions.map((version, index) => (
                      <div
                        key={index}
                        className={`item-option btn-active ${selectedVersion === version.sku ? 'selected' : ''}`}
                        data-sku={version.sku}
                        onClick={() => setSelectedVersion(version.sku || null)}
                      >
                        <span>{version.label || 'N/A'}</span>
                        {version.price && <p>{formatPrice(version.price)}</p>}
                      </div>
                    ))}
                  </div>
                  {!selectedVersion && (
                    <div style={{ color: 'red', fontSize: '12px', marginTop: '8px' }}>
                      Vui lòng chọn phiên bản
                    </div>
                  )}
                </div>
              )}

              {/* Color Options - BẮT BUỘC chọn nếu có */}
              {product.colors && product.colors.length > 0 && (
                <div className="box-product-option color">
                  <strong className="label">Lựa chọn màu <span style={{ color: 'red' }}>*</span></strong>
                  <div className="list-option" id="option-color">
                    {product.colors.map((color, index) => (
                      <div
                        key={index}
                        className={`item-option btn-active ${selectedColor === color.sku ? 'selected' : ''}`}
                        data-name={color.name}
                        data-sku={color.sku}
                        onClick={() => setSelectedColor(color.sku || null)}
                      >
                        {color.imageUrl && (
                          <img 
                            src={color.imageUrl} 
                            title={`${product.name} - ${color.name}`}
                            alt={`${product.name} - ${color.name}`}
                          />
                        )}
                        <div className="color-price">
                          <span>{color.name}</span>
                          {color.price && <p>{formatPrice(color.price)}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                  {!selectedColor && (
                    <div style={{ color: 'red', fontSize: '12px', marginTop: '8px' }}>
                      Vui lòng chọn màu sản phẩm
                    </div>
                  )}
                </div>
              )}

              {/* Member Price & Trade-in */}
              <div className="btn-event">
                <div className="event member-price member">
                  {product.memberPrice && (
                    <a className="member-price-wrapper" href="https://member.hoanghamobile.com" target="_blank" title="Truy cập trang thành viên">
                      <div className="title eventPrice">
                        Dành riêng cho Lmobile Member
                      </div>
                      <div className="member-price-value eventValue bestPrice price-tags-none">
                        <strong className="valuePriceMember none">{formatPrice(product.memberPrice)}</strong>
                      </div>
                      {product.price && (
                        <div className="member-price-strike">
                          <del className="valueBestPrice">{formatPrice(product.priceNumber || product.price)}</del>
                          {product.memberDiscount && (
                            <span className="valueRate">{product.memberDiscount}</span>
                          )}
                        </div>
                      )}
                      {product.extraPoints && (
                        <div className="extra-point">
                          <span className="valueCollectionPoint">{product.extraPoints} Điểm thưởng</span>
                        </div>
                      )}
                    </a>
                  )}
                </div>
              </div>

              {/* Quantity Selector */}
              <div className="box-quantity" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #d9d9d9', borderRadius: '4px', overflow: 'hidden' }}>
                  <button
                    type="button"
                    onClick={() => {
                      if (quantity > 1) {
                        setQuantity(quantity - 1);
                      }
                    }}
                    disabled={addingToCart || (product.stock === 0) || quantity <= 1}
                    style={{
                      width: '36px',
                      height: '40px',
                      border: 'none',
                      background: '#f5f5f5',
                      cursor: quantity > 1 ? 'pointer' : 'not-allowed',
                      fontSize: '18px',
                      fontWeight: 'bold',
                      color: quantity > 1 ? '#333' : '#ccc',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      userSelect: 'none'
                    }}
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min={1}
                    max={product.stock || 1}
                    value={quantity}
                    onChange={(e) => {
                      const value = parseInt(e.target.value, 10);
                      if (!isNaN(value) && value > 0) {
                        const maxStock = product.stock || 1;
                        setQuantity(Math.min(Math.max(1, value), maxStock));
                      } else if (e.target.value === '') {
                        setQuantity(1);
                      }
                    }}
                    onBlur={(e) => {
                      const value = parseInt(e.target.value, 10);
                      if (isNaN(value) || value < 1) {
                        setQuantity(1);
                      }
                    }}
                    disabled={addingToCart || (product.stock === 0)}
                    style={{
                      width: '60px',
                      height: '40px',
                      border: 'none',
                      borderLeft: '1px solid #d9d9d9',
                      borderRight: '1px solid #d9d9d9',
                      textAlign: 'center',
                      fontSize: '16px',
                      outline: 'none',
                      padding: '0 8px'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const maxStock = product.stock || 1;
                      if (quantity < maxStock) {
                        setQuantity(quantity + 1);
                      }
                    }}
                    disabled={addingToCart || (product.stock === 0) || quantity >= (product.stock || 1)}
                    style={{
                      width: '36px',
                      height: '40px',
                      border: 'none',
                      background: '#f5f5f5',
                      cursor: quantity < (product.stock || 1) ? 'pointer' : 'not-allowed',
                      fontSize: '18px',
                      fontWeight: 'bold',
                      color: quantity < (product.stock || 1) ? '#333' : '#ccc',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      userSelect: 'none'
                    }}
                  >
                    +
                  </button>
                </div>
                <span style={{ color: '#666' }}>
                  (Còn {product.stock || 0} sản phẩm)
                </span>
              </div>

              {/* Order Buttons */}
              <div className="box-order product-action">
                <div className="box-order-btn">
                  <Button
                    title="Thêm giỏ hàng"
                    data-sku={product.sku}
                    className="add-buy add-cart inventory"
                    onClick={handleAddToCart}
                    icon={<ShoppingCartOutlined />}
                    loading={addingToCart}
                    disabled={
                      addingToCart || 
                      (product.stock === 0) || 
                      quantity < 1 ||
                      !isAuthenticated ||
                      (product.versions && product.versions.length > 0 && !selectedVersion) ||
                      (product.colors && product.colors.length > 0 && !selectedColor)
                    }
                    size="large"
                  >
                    Thêm giỏ hàng
                  </Button>
                  <Button
                    title="MUA NGAY"
                    data-sku={product.sku}
                    className="add-buy order-btn btnQuickOrder inventory"
                    onClick={handleBuyNow}
                    type="primary"
                    size="large"
                    loading={addingToCart}
                    disabled={
                      addingToCart || 
                      (product.stock === 0) || 
                      (product.availability === 0) || 
                      quantity < 1 ||
                      !isAuthenticated ||
                      (product.versions && product.versions.length > 0 && !selectedVersion) ||
                      (product.colors && product.colors.length > 0 && !selectedColor)
                    }
                  >
                    <strong>MUA NGAY</strong>
                    <span>(Giao tận nhà hoặc nhận tại cửa hàng)</span>
                  </Button>
                </div>
              </div>

              {/* Lmobile Promotions */}
              {product.promotions && product.promotions.length > 0 && (
                <div className="box-promotion promotion-hoangha non-after">
                  <div className="item-site-banner">
                    <div className="site-banner-content">
                      <GiftOutlined />
                      <div className="description">
                        <span>ƯU ĐÃI LMOBILE</span>
                      </div>
                    </div>
                  </div>
                  <div className={`box-promotion-content box-content-text ${showAllPromotions ? 'expanded' : ''}`} id="product-promotion-content">
                    {product.promotions.map((promo, index) => (
                      <div key={index} className="promotion-item">
                        <strong className="promotion-count">{index + 1}</strong>
                        <div className="item-container">
                          <span dangerouslySetInnerHTML={{ __html: promo }} />
                        </div>
                      </div>
                    ))}
                  </div>
                  {product.promotions.length > 3 && (
                    <div 
                      className="view-promotion-content btn-view" 
                      id="see-promotion-content"
                      onClick={() => setShowAllPromotions(!showAllPromotions)}
                      style={{ cursor: 'pointer' }}
                    >
                      <span>{showAllPromotions ? 'THU GỌN ƯU ĐÃI' : 'XEM THÊM ƯU ĐÃI'}</span>
                      <CaretDownOutlined style={{ transform: showAllPromotions ? 'rotate(180deg)' : 'none' }} />
                    </div>
                  )}
                </div>
              )}

            </div>
          </Col>
        </Row>

        {/* Product Reviews Section */}
        {product && product._id && (
          <Row>
            <Col span={24}>
              <ProductReviews 
                productId={product._id} 
                productName={product.name}
              />
            </Col>
          </Row>
        )}
        </div>
      </PageWrapper>
    </div>
  );
};

export default ProductDetail;

