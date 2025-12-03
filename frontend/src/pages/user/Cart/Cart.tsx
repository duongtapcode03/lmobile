/**
 * CartPage Component
 * Trang hiển thị giỏ hàng của user
 */

import React, { useState, useEffect, useRef } from 'react';
import { Row, Col, Card, Button, Input, Empty, Spin, Typography, Space, Divider, Checkbox } from 'antd';
import { DeleteOutlined, ShoppingCartOutlined, SyncOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { userService } from '../../../api/userService';
import type { Cart, CartItem } from '../../../api/cartService.types';
import { PageWrapper, VoucherInput, useToast } from '../../../components';
import voucherService from '../../../api/voucherService';
import './Cart.scss';

const { Title, Text } = Typography;

const CartPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<Cart | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [tempQuantities, setTempQuantities] = useState<Record<string, number>>({});
  const [quantityErrors, setQuantityErrors] = useState<Record<string, string>>({});
  const messageShownRef = useRef<Record<string, boolean>>({});
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadCart();
  }, []);

  // Khởi tạo: chọn tất cả items khi cart được load
  useEffect(() => {
    if (cart && cart.items && cart.items.length > 0) {
      const allItemIds = new Set(cart.items.map((item: CartItem) => item._id));
      setSelectedItems(allItemIds);
    }
  }, [cart]);

  const loadCart = async () => {
    try {
      setLoading(true);
      const cartData = await userService.getCart();
      setCart(cartData);
      // Clear all errors khi load cart mới
      setQuantityErrors({});
    } catch (error: any) {
      console.error('Error loading cart:', error);
      toast.error('Không thể tải giỏ hàng');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateQuantity = async (itemId: string, quantity: number, showMessage: boolean = true, skipSuccessMessage: boolean = false) => {
    if (quantity < 1) {
      if (showMessage) {
        toast.warning('Số lượng phải lớn hơn 0');
      }
      return;
    }

    // Tìm item trong cart để lấy thông tin stock
    const item = cart?.items.find(i => i._id === itemId);
    if (!item) {
      if (showMessage) {
        toast.error('Không tìm thấy sản phẩm trong giỏ hàng');
      }
      return;
    }

    // Kiểm tra số lượng tồn kho
    const availableStock = item.product.stock || 0;
    const originalQuantity = quantity; // Lưu giá trị gốc để so sánh
    
    console.log('[Cart] handleUpdateQuantity - Stock check:', {
      itemId,
      quantity,
      originalQuantity,
      availableStock,
      showMessage,
      condition: quantity > availableStock && availableStock > 0
    });
    
    if (quantity > availableStock && availableStock > 0) {
      console.log('[Cart] handleUpdateQuantity - Quantity exceeds stock, adjusting...');
      // Tự động điều chỉnh về stock
      // Cập nhật tempQuantities để input hiển thị giá trị đã điều chỉnh
      setTempQuantities(prev => ({
        ...prev,
        [itemId]: availableStock
      }));
      // Set error message
      const errorMsg = `Số lượng vượt quá tồn kho (${originalQuantity} > ${availableStock}). Đã tự động điều chỉnh về ${availableStock} sản phẩm.`;
      setQuantityErrors(prev => ({
        ...prev,
        [itemId]: errorMsg
      }));
      // Hiển thị thông báo nếu được yêu cầu
      if (showMessage) {
        console.log('[Cart] handleUpdateQuantity - Showing warning message');
        toast.warning(errorMsg, 3000);
      } else {
        console.log('[Cart] handleUpdateQuantity - showMessage is false, skipping message');
      }
      // Gọi API với số lượng đã điều chỉnh
      quantity = availableStock;
    } else if (availableStock === 0) {
      const errorMsg = 'Sản phẩm đã hết hàng';
      setQuantityErrors(prev => ({
        ...prev,
        [itemId]: errorMsg
      }));
      if (showMessage) {
        toast.error(errorMsg, 3000);
      }
      // Xóa tempQuantities
      setTempQuantities(prev => {
        const newState = { ...prev };
        delete newState[itemId];
        return newState;
      });
      return;
    }

    try {
      setUpdating(itemId);
      console.log('[Cart] Updating quantity:', { itemId, quantity, stock: availableStock });
      const updatedCart = await userService.updateCartItem(itemId, quantity);
      console.log('[Cart] Updated cart response:', updatedCart);
      
      // Kiểm tra xem quantity có bị thay đổi không (backend có thể tự động điều chỉnh)
      const updatedItem = updatedCart?.items?.find((i: CartItem) => i._id === itemId);
      if (updatedItem && updatedItem.quantity !== quantity) {
        console.warn('[Cart] Quantity was changed by backend:', {
          requested: quantity,
          received: updatedItem.quantity,
          stock: updatedItem.product?.stock
        });
        
        // Nếu backend tự động điều chỉnh (thường do vượt quá stock)
        const stock = updatedItem.product?.stock || 0;
        if (updatedItem.quantity === stock && quantity > stock) {
          const errorMsg = `Số lượng vượt quá tồn kho. Đã tự động điều chỉnh về ${updatedItem.quantity} sản phẩm.`;
          setQuantityErrors(prev => ({
            ...prev,
            [itemId]: errorMsg
          }));
          toast.warning(errorMsg);
        } else {
          const errorMsg = `Số lượng đã được điều chỉnh từ ${quantity} về ${updatedItem.quantity}.`;
          setQuantityErrors(prev => ({
            ...prev,
            [itemId]: errorMsg
          }));
          toast.warning(errorMsg);
        }
        
        // Cập nhật tempQuantities để input hiển thị giá trị đã điều chỉnh
        setTempQuantities(prev => ({
          ...prev,
          [itemId]: updatedItem.quantity
        }));
        
        setCart(updatedCart);
        return;
      }
      
      // Clear error khi update thành công
      setQuantityErrors(prev => {
        const newState = { ...prev };
        delete newState[itemId];
        return newState;
      });
      
      setCart(updatedCart);
      
      // Kiểm tra và remove voucher nếu orderAmount < minOrderAmount
      if (updatedCart.couponCode && updatedCart.totalAmount > 0) {
        // Revalidate voucher với số tiền mới
        try {
          const validation = await voucherService.validateVoucher(
            updatedCart.couponCode,
            updatedCart.totalAmount,
            updatedCart.items,
            updatedCart.shippingFee || 0
          );
          
          if (!validation.success) {
            // Voucher không còn hợp lệ, remove
            await userService.removeCoupon();
            const cartWithoutVoucher = await userService.getCart();
            setCart(cartWithoutVoucher);
            toast.warning('Voucher đã được gỡ bỏ do không đủ điều kiện');
          }
        } catch (error) {
          // Ignore validation error, chỉ log
          console.error('[Cart] Voucher validation error after quantity update:', error);
        }
      }
      
      // Chỉ hiển thị success message nếu không có warning message trước đó
      if (!skipSuccessMessage) {
        toast.success('Đã cập nhật số lượng');
      }
      
      // Chỉ xóa tempQuantities và quantityErrors nếu không có error về stock
      // Giữ lại error nếu đang có cảnh báo về stock để toast không bị mất
      const hasStockError = quantityErrors[itemId]?.includes('tồn kho') || 
                           quantityErrors[itemId]?.includes('vượt quá') ||
                           quantityErrors[itemId]?.includes('hết hàng');
      
      if (!hasStockError) {
      // Xóa tempQuantities sau khi cập nhật thành công để input hiển thị giá trị từ cart
      setTempQuantities(prev => {
        const newState = { ...prev };
        delete newState[itemId];
        return newState;
      });
        
        // Clear error sau khi cập nhật thành công
        setQuantityErrors(prev => {
          const newState = { ...prev };
          delete newState[itemId];
          return newState;
        });
      } else {
        // Nếu có error về stock, chỉ xóa tempQuantities để input hiển thị giá trị từ cart
        // Nhưng giữ lại error message để toast cảnh báo không bị mất
        setTempQuantities(prev => {
          const newState = { ...prev };
          delete newState[itemId];
          return newState;
        });
      }
    } catch (error: any) {
      console.error('Error updating quantity:', error);
      const errorMessage = error.response?.data?.message || 'Không thể cập nhật số lượng';
      
      // Kiểm tra nếu lỗi liên quan đến giới hạn 10 từ backend
      if (errorMessage.includes('10') || 
          errorMessage.toLowerCase().includes('không được quá 10') ||
          errorMessage.toLowerCase().includes('tối đa 10')) {
        const errorMsg = `Hệ thống chỉ cho phép tối đa 10 sản phẩm mỗi loại. ${errorMessage}`;
        setQuantityErrors(prev => ({
          ...prev,
          [itemId]: errorMsg
        }));
        toast.error(errorMsg);
        // Giữ giá trị người dùng nhập trong tempQuantities để họ thấy
        // Không xóa tempQuantities để người dùng biết họ đã nhập số lớn hơn
      } else if (errorMessage.toLowerCase().includes('stock') || 
          errorMessage.toLowerCase().includes('tồn kho') ||
          errorMessage.toLowerCase().includes('không đủ') ||
          errorMessage.toLowerCase().includes('hết hàng')) {
        // Nếu lỗi về stock, tự động điều chỉnh về stock và cập nhật input
        const availableStock = item.product.stock || 0;
        if (availableStock > 0) {
          const errorMsg = `Số lượng vượt quá tồn kho. Đã tự động điều chỉnh về ${availableStock} sản phẩm.`;
          setQuantityErrors(prev => ({
            ...prev,
            [itemId]: errorMsg
          }));
          toast.warning(errorMsg, 3000);
          // Cập nhật tempQuantities để input hiển thị giá trị stock
          setTempQuantities(prev => ({
            ...prev,
            [itemId]: availableStock
          }));
          // Thử lại với số lượng stock (không hiển thị message vì đã hiển thị ở trên)
          handleUpdateQuantity(itemId, availableStock, false);
        } else {
          const errorMsg = 'Sản phẩm đã hết hàng';
          setQuantityErrors(prev => ({
            ...prev,
            [itemId]: errorMsg
          }));
          toast.error(errorMsg);
          // Xóa tempQuantities nếu hết hàng
          setTempQuantities(prev => {
            const newState = { ...prev };
            delete newState[itemId];
            return newState;
          });
        }
      } else {
        setQuantityErrors(prev => ({
          ...prev,
          [itemId]: errorMessage
        }));
        toast.error(errorMessage);
      }
      
      // Nếu có lỗi, reload cart để đồng bộ lại
      loadCart();
    } finally {
      setUpdating(null);
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    try {
      setUpdating(itemId);
      const updatedCart = await userService.removeFromCart(itemId);
      
      // Kiểm tra và remove voucher nếu orderAmount < minOrderAmount
      if (updatedCart.couponCode && updatedCart.totalAmount > 0) {
        try {
          const validation = await voucherService.validateVoucher(
            updatedCart.couponCode,
            updatedCart.totalAmount,
            updatedCart.items,
            updatedCart.shippingFee || 0
          );
          
          if (!validation.success) {
            // Voucher không còn hợp lệ, remove
            await userService.removeCoupon();
            const cartWithoutVoucher = await userService.getCart();
            setCart(cartWithoutVoucher);
            toast.warning('Voucher đã được gỡ bỏ do không đủ điều kiện');
            return;
          }
        } catch (error) {
          console.error('[Cart] Voucher validation error after remove item:', error);
        }
      }
      
      setCart(updatedCart);
      toast.success('Đã xóa sản phẩm khỏi giỏ hàng');
    } catch (error: any) {
      console.error('Error removing item:', error);
      toast.error('Không thể xóa sản phẩm');
    } finally {
      setUpdating(null);
    }
  };

  const handleClearCart = async () => {
    try {
      await userService.clearCart();
      setCart(null);
      toast.success('Đã xóa toàn bộ giỏ hàng');
    } catch (error: any) {
      console.error('Error clearing cart:', error);
      toast.error('Không thể xóa giỏ hàng');
    }
  };

  const handleSyncPrices = async () => {
    try {
      setLoading(true);
      const updatedCart = await userService.syncCartPrices();
      setCart(updatedCart);
      toast.success('Đã đồng bộ giá sản phẩm');
    } catch (error: any) {
      console.error('Error syncing prices:', error);
      toast.error('Không thể đồng bộ giá');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price);
  };

  // Tính toán tổng tiền cho các sản phẩm đã chọn
  const calculateSelectedTotal = () => {
    if (!cart || !cart.items) return { subtotal: 0, totalItems: 0 };
    
    const selectedCartItems = cart.items.filter((item: CartItem) => selectedItems.has(item._id));
    const subtotal = selectedCartItems.reduce((sum: number, item: CartItem) => {
      return sum + (item.price * item.quantity);
    }, 0);
    
    return {
      subtotal,
      totalItems: selectedCartItems.reduce((sum: number, item: CartItem) => sum + item.quantity, 0)
    };
  };

  const handleSelectItem = (itemId: string, checked: boolean) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(itemId);
      } else {
        newSet.delete(itemId);
      }
      return newSet;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (!cart || !cart.items) return;
    
    if (checked) {
      const allItemIds = new Set(cart.items.map((item: CartItem) => item._id));
      setSelectedItems(allItemIds);
    } else {
      setSelectedItems(new Set());
    }
  };

  const handleCheckout = () => {
    if (selectedItems.size === 0) {
      toast.warning('Vui lòng chọn ít nhất một sản phẩm để thanh toán');
      return;
    }

    // Lưu selectedItems vào localStorage để checkout page có thể đọc
    localStorage.setItem('selectedCartItems', JSON.stringify(Array.from(selectedItems)));
    navigate('/checkout');
  };

  const isAllSelected = !!(cart && cart.items && cart.items.length > 0 && 
    cart.items.every((item: CartItem) => selectedItems.has(item._id)));
  const isIndeterminate = !!(cart && cart.items && cart.items.length > 0 && 
    selectedItems.size > 0 && selectedItems.size < cart.items.length);

  if (loading) {
    return (
      <PageWrapper loading={true}>
        <div className="cart-page">
          <div className="container">
            <Spin size="large" />
          </div>
        </div>
      </PageWrapper>
    );
  }

  if (!cart || cart.isEmpty) {
    return (
      <PageWrapper>
        <div className="cart-page">
          <div className="container">
            <Empty
              image={<ShoppingCartOutlined style={{ fontSize: 64, color: '#ccc' }} />}
              description="Giỏ hàng của bạn đang trống"
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
      <div className="cart-page">
        <div className="container">
          <Row gutter={[24, 24]}>
            <Col xs={24} lg={16}>
              <Card
                title={
                  <Space>
                    <Checkbox
                      checked={isAllSelected}
                      indeterminate={isIndeterminate}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                    >
                      <ShoppingCartOutlined />
                      <span style={{ marginLeft: 8 }}>Giỏ hàng của tôi ({cart.totalItems} sản phẩm)</span>
                    </Checkbox>
                  </Space>
                }
                extra={
                  <Space>
                    <Button
                      icon={<SyncOutlined />}
                      onClick={handleSyncPrices}
                      loading={loading}
                    >
                      Đồng bộ giá
                    </Button>
                    {cart.items.length > 0 && (
                      <Button danger onClick={handleClearCart}>
                        Xóa tất cả
                      </Button>
                    )}
                  </Space>
                }
              >
                {cart.items.map((item: CartItem) => (
                  <div key={item._id} className="cart-item">
                    <Row gutter={[16, 16]} align="middle">
                      <Col xs={24} sm={2}>
                        <Checkbox
                          checked={selectedItems.has(item._id)}
                          onChange={(e) => handleSelectItem(item._id, e.target.checked)}
                        />
                      </Col>
                      <Col xs={24} sm={4}>
                        <div
                          className="cart-item-image"
                          onClick={() => navigate(`/products/${item.product._id}`)}
                        >
                          <img
                            src={item.product.thumbnail || '/placeholder-product.png'}
                            alt={item.product.name}
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '/placeholder-product.png';
                            }}
                          />
                        </div>
                      </Col>
                      <Col xs={24} sm={10}>
                        <div className="cart-item-info">
                          <Title level={5} className="cart-item-name">
                            {item.product.name}
                          </Title>
                          {item.variant && (
                            <div className="cart-item-variant">
                              {item.variant.color && <Text type="secondary">Màu: {item.variant.color}</Text>}
                              {item.variant.storage && <Text type="secondary"> | Bộ nhớ: {item.variant.storage}</Text>}
                              {item.variant.ram && <Text type="secondary"> | RAM: {item.variant.ram}</Text>}
                            </div>
                          )}
                          <div className="cart-item-price">
                            <Text strong>{formatPrice(item.price)}</Text>
                          </div>
                          {item.quantity > (item.product.stock || 0) && (
                            <div style={{ marginTop: '4px' }}>
                              <Text type="danger" style={{ fontSize: '12px' }}>
                                ⚠️ Số lượng trong giỏ hàng ({item.quantity}) vượt quá tồn kho ({item.product.stock || 0})
                              </Text>
                            </div>
                          )}
                        </div>
                      </Col>
                      <Col xs={12} sm={4}>
                        <div>
                          <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            border: quantityErrors[item._id] ? '1px solid #ff4d4f' : '1px solid #d9d9d9', 
                            borderRadius: '4px', 
                            overflow: 'hidden',
                            width: '100%'
                          }}>
                            <button
                              type="button"
                              onClick={() => {
                                const currentValue = tempQuantities[item._id] !== undefined 
                                  ? tempQuantities[item._id] 
                                  : item.quantity;
                                if (currentValue > 1) {
                                  const newValue = currentValue - 1;
                                  setTempQuantities(prev => ({
                                    ...prev,
                                    [item._id]: newValue
                                  }));
                                  setQuantityErrors(prev => {
                                    const newState = { ...prev };
                                    delete newState[item._id];
                                    return newState;
                                  });
                                  handleUpdateQuantity(item._id, newValue);
                                }
                              }}
                              disabled={updating === item._id || (item.product.stock || 0) === 0 || (tempQuantities[item._id] !== undefined ? tempQuantities[item._id] : item.quantity) <= 1}
                              style={{
                                width: '36px',
                                height: '40px',
                                border: 'none',
                                background: '#f5f5f5',
                                cursor: (tempQuantities[item._id] !== undefined ? tempQuantities[item._id] : item.quantity) > 1 ? 'pointer' : 'not-allowed',
                                fontSize: '18px',
                                fontWeight: 'bold',
                                color: (tempQuantities[item._id] !== undefined ? tempQuantities[item._id] : item.quantity) > 1 ? '#333' : '#ccc',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                userSelect: 'none'
                              }}
                            >
                              −
                            </button>
                          <Input
                              type="text"
                            value={tempQuantities[item._id] !== undefined 
                              ? String(tempQuantities[item._id]) 
                              : String(item.quantity)}
                              status={quantityErrors[item._id] ? 'error' : undefined}
                            onChange={(e) => {
                              const value = e.target.value;
                                const availableStock = item.product.stock || 0;
                                
                              // Cho phép nhập tự do, không giới hạn
                              if (value === '') {
                                setTempQuantities(prev => ({
                                  ...prev,
                                  [item._id]: 0
                                }));
                                  setQuantityErrors(prev => {
                                    const newState = { ...prev };
                                    delete newState[item._id];
                                    return newState;
                                  });
                              } else {
                                const numValue = parseInt(value, 10);
                                  
                                if (!isNaN(numValue) && numValue >= 0) {
                                    console.log('[Cart] Input onChange:', { itemId: item._id, value: numValue, stock: availableStock });
                                    
                                    // Validate số lượng không vượt quá stock
                                    if (numValue > availableStock && availableStock > 0) {
                                      // Vượt quá stock, tự động điều chỉnh về stock
                                      setTempQuantities(prev => ({
                                        ...prev,
                                        [item._id]: availableStock
                                      }));
                                      const errorMsg = `Số lượng không được vượt quá ${availableStock} sản phẩm. Đã tự động điều chỉnh về ${availableStock}.`;
                                      setQuantityErrors(prev => ({
                                        ...prev,
                                        [item._id]: errorMsg
                                      }));
                                      // Hiển thị thông báo (chỉ 1 lần)
                                      if (!messageShownRef.current[item._id]) {
                                        toast.warning(errorMsg, 3000);
                                        messageShownRef.current[item._id] = true;
                                        setTimeout(() => {
                                          messageShownRef.current[item._id] = false;
                                        }, 3000);
                                      }
                                    } else if (availableStock === 0 && numValue > 0) {
                                      // Hết hàng
                                      const errorMsg = 'Sản phẩm đã hết hàng';
                                      setQuantityErrors(prev => ({
                                        ...prev,
                                        [item._id]: errorMsg
                                      }));
                                      toast.error(errorMsg, 2000);
                                      setTempQuantities(prev => {
                                        const newState = { ...prev };
                                        delete newState[item._id];
                                        return newState;
                                      });
                                    } else {
                                      // Giá trị hợp lệ
                                  setTempQuantities(prev => ({
                                    ...prev,
                                    [item._id]: numValue
                                  }));
                                      setQuantityErrors(prev => {
                                        const newState = { ...prev };
                                        delete newState[item._id];
                                        return newState;
                                      });
                                      // Clear messageShownRef khi giá trị hợp lệ
                                      messageShownRef.current[item._id] = false;
                                    }
                                }
                              }
                            }}
                            onBlur={() => {
                              // Khi blur, validate và cập nhật
                              const tempValue = tempQuantities[item._id];
                              const availableStock = item.product.stock || 0;
                              
                              console.log('[Cart] Input onBlur - START:', { 
                                itemId: item._id, 
                                tempValue, 
                                currentQuantity: item.quantity, 
                                stock: availableStock,
                                tempValueDefined: tempValue !== undefined,
                                condition1: tempValue >= 1,
                                condition2: tempValue > availableStock && availableStock > 0
                              });
                              
                              if (tempValue !== undefined) {
                                // Nếu giá trị hợp lệ (>= 1)
                                if (tempValue >= 1) {
                                  // Nếu vượt quá stock, tự động điều chỉnh về stock
                                  if (tempValue > availableStock && availableStock > 0) {
                                      const errorMsg = `Số lượng vượt quá tồn kho (${tempValue} > ${availableStock}). Đã tự động điều chỉnh về ${availableStock} sản phẩm.`;
                                      setQuantityErrors(prev => ({
                                        ...prev,
                                        [item._id]: errorMsg
                                      }));
                                      
                                    // Kiểm tra xem đã hiển thị message chưa (tránh hiển thị 2 lần khi cả onPressEnter và onBlur đều chạy)
                                    if (!messageShownRef.current[item._id]) {
                                      console.log('[Cart] Input onBlur - Quantity exceeds stock, showing message...');
                                        toast.warning(errorMsg, 4000);
                                          messageShownRef.current[item._id] = true;
                                          setTimeout(() => {
                                            messageShownRef.current[item._id] = false;
                                          }, 1000);
                                    }
                                    
                                      // Cập nhật tempQuantities về stock (không reset, giữ lại để hiển thị error)
                                    setTempQuantities(prev => ({
                                      ...prev,
                                      [item._id]: availableStock
                                    }));
                                    console.log('[Cart] Input onBlur - Calling handleUpdateQuantity with adjusted quantity');
                                      // Gọi handleUpdateQuantity với showMessage: false để không hiển thị toast success
                                      // skipSuccessMessage: true để không hiển thị success message
                                    handleUpdateQuantity(item._id, availableStock, false, true);
                                  } else if (availableStock === 0) {
                                    // Hết hàng
                                      const errorMsg = 'Sản phẩm đã hết hàng';
                                      setQuantityErrors(prev => ({
                                        ...prev,
                                        [item._id]: errorMsg
                                      }));
                                      toast.error(errorMsg);
                                    setTempQuantities(prev => {
                                      const newState = { ...prev };
                                      delete newState[item._id];
                                      return newState;
                                    });
                                  } else {
                                      // Giá trị hợp lệ, cập nhật và clear error
                                      setQuantityErrors(prev => {
                                        const newState = { ...prev };
                                        delete newState[item._id];
                                        return newState;
                                      });
                                      // Clear messageShownRef khi giá trị hợp lệ
                                      messageShownRef.current[item._id] = false;
                                    if (tempValue !== item.quantity) {
                                      handleUpdateQuantity(item._id, tempValue);
                                    } else {
                                      // Giá trị không thay đổi, chỉ xóa temp
                                      setTempQuantities(prev => {
                                        const newState = { ...prev };
                                        delete newState[item._id];
                                        return newState;
                                      });
                                    }
                                  }
                                } else {
                                    // Giá trị không hợp lệ (< 1), xóa temp và clear error
                                  setTempQuantities(prev => {
                                    const newState = { ...prev };
                                    delete newState[item._id];
                                    return newState;
                                  });
                                    setQuantityErrors(prev => {
                                      const newState = { ...prev };
                                      delete newState[item._id];
                                      return newState;
                                    });
                                }
                              }
                            }}
                            onPressEnter={(e) => {
                              // Khi nhấn Enter, validate và cập nhật
                              const tempValue = tempQuantities[item._id];
                              const availableStock = item.product.stock || 0;
                              
                              console.log('[Cart] Input onPressEnter - START:', { 
                                itemId: item._id, 
                                tempValue, 
                                currentQuantity: item.quantity, 
                                stock: availableStock,
                                tempValueDefined: tempValue !== undefined,
                                condition1: tempValue >= 1,
                                condition2: tempValue > availableStock && availableStock > 0
                              });
                              
                              if (tempValue !== undefined && tempValue >= 1) {
                                // Nếu vượt quá stock, tự động điều chỉnh về stock
                                if (tempValue > availableStock && availableStock > 0) {
                                    const errorMsg = `Số lượng vượt quá tồn kho (${tempValue} > ${availableStock}). Đã tự động điều chỉnh về ${availableStock} sản phẩm.`;
                                    setQuantityErrors(prev => ({
                                      ...prev,
                                      [item._id]: errorMsg
                                    }));
                                    
                                  // Kiểm tra xem đã hiển thị message chưa (tránh hiển thị 2 lần khi cả onPressEnter và onBlur đều chạy)
                                  if (!messageShownRef.current[item._id]) {
                                      toast.warning(errorMsg, 4000);
                                        messageShownRef.current[item._id] = true;
                                        setTimeout(() => {
                                          messageShownRef.current[item._id] = false;
                                        }, 1000);
                                  }
                                  
                                    // Cập nhật tempQuantities về stock (không reset, giữ lại để hiển thị error)
                                  setTempQuantities(prev => ({
                                    ...prev,
                                    [item._id]: availableStock
                                  }));
                                  console.log('[Cart] Input onPressEnter - Calling handleUpdateQuantity with adjusted quantity');
                                    // Gọi handleUpdateQuantity với showMessage: false để không hiển thị toast success
                                    // skipSuccessMessage: true để không hiển thị success message
                                  handleUpdateQuantity(item._id, availableStock, false, true);
                                } else if (availableStock === 0) {
                                    const errorMsg = 'Sản phẩm đã hết hàng';
                                    setQuantityErrors(prev => ({
                                      ...prev,
                                      [item._id]: errorMsg
                                    }));
                                    toast.error(errorMsg);
                                  setTempQuantities(prev => {
                                    const newState = { ...prev };
                                    delete newState[item._id];
                                    return newState;
                                  });
                                } else {
                                    // Clear error khi hợp lệ
                                    setQuantityErrors(prev => {
                                      const newState = { ...prev };
                                      delete newState[item._id];
                                      return newState;
                                    });
                                    // Clear messageShownRef khi giá trị hợp lệ
                                    messageShownRef.current[item._id] = false;
                                  handleUpdateQuantity(item._id, tempValue);
                                }
                                // Blur input
                                (e.target as HTMLInputElement).blur();
                              }
                            }}
                            disabled={updating === item._id || (item.product.stock || 0) === 0}
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
                            placeholder="1"
                          />
                            <button
                              type="button"
                              onClick={() => {
                                const currentValue = tempQuantities[item._id] !== undefined 
                                  ? tempQuantities[item._id] 
                                  : item.quantity;
                                const availableStock = item.product.stock || 0;
                                const maxStock = availableStock || 1;
                                
                                if (currentValue < maxStock && maxStock > 0) {
                                  const newValue = currentValue + 1;
                                  setTempQuantities(prev => ({
                                    ...prev,
                                    [item._id]: newValue
                                  }));
                                  setQuantityErrors(prev => {
                                    const newState = { ...prev };
                                    delete newState[item._id];
                                    return newState;
                                  });
                                  handleUpdateQuantity(item._id, newValue);
                                } else if (maxStock === 0) {
                                  const errorMsg = 'Sản phẩm đã hết hàng';
                                  setQuantityErrors(prev => ({
                                    ...prev,
                                    [item._id]: errorMsg
                                  }));
                                  toast.error(errorMsg);
                                } else if (currentValue >= maxStock) {
                                  const errorMsg = `Số lượng không được vượt quá ${maxStock} sản phẩm`;
                                  setQuantityErrors(prev => ({
                                    ...prev,
                                    [item._id]: errorMsg
                                  }));
                                  toast.warning(errorMsg);
                                }
                              }}
                              disabled={updating === item._id || (item.product.stock || 0) === 0 || (tempQuantities[item._id] !== undefined ? tempQuantities[item._id] : item.quantity) >= (item.product.stock || 1)}
                              style={{
                                width: '36px',
                                height: '40px',
                                border: 'none',
                                background: '#f5f5f5',
                                cursor: (tempQuantities[item._id] !== undefined ? tempQuantities[item._id] : item.quantity) < (item.product.stock || 1) ? 'pointer' : 'not-allowed',
                                fontSize: '18px',
                                fontWeight: 'bold',
                                color: (tempQuantities[item._id] !== undefined ? tempQuantities[item._id] : item.quantity) < (item.product.stock || 1) ? '#333' : '#ccc',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                userSelect: 'none'
                              }}
                            >
                              +
                            </button>
                          </div>
                          {/* Validation Error Message */}
                          {quantityErrors[item._id] && (
                            <div style={{ 
                              color: '#ff4d4f', 
                              fontSize: '12px', 
                              marginTop: '4px',
                              lineHeight: '1.5'
                            }}>
                              {quantityErrors[item._id]}
                            </div>
                          )}
                          {!quantityErrors[item._id] && item.product.stock !== undefined && item.product.stock !== null && (
                            <Text 
                              type="secondary" 
                              style={{ 
                                fontSize: '12px', 
                                display: 'block', 
                                marginTop: '4px',
                                color: item.product.stock < 5 ? '#ff4d4f' : '#666'
                              }}
                            >
                              Còn {item.product.stock} sản phẩm
                            </Text>
                          )}
                        </div>
                      </Col>
                      <Col xs={12} sm={4}>
                        <Space direction="vertical" align="end" style={{ width: '100%' }}>
                          <Text strong className="cart-item-total">
                            {formatPrice(item.price * item.quantity)}
                          </Text>
                          <Button
                            type="text"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={() => handleRemoveItem(item._id)}
                            loading={updating === item._id}
                            size="small"
                          >
                            Xóa
                          </Button>
                        </Space>
                      </Col>
                    </Row>
                    <Divider />
                  </div>
                ))}
              </Card>
            </Col>

            <Col xs={24} lg={8}>
              <Card title="Tóm tắt đơn hàng" className="cart-summary">
                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                  <div className="summary-row">
                    <Text>Sản phẩm đã chọn:</Text>
                    <Text>{calculateSelectedTotal().totalItems} sản phẩm</Text>
                  </div>
                  <div className="summary-row">
                    <Text>Tạm tính:</Text>
                    <Text>{formatPrice(calculateSelectedTotal().subtotal)}</Text>
                  </div>
                  <div className="summary-row">
                    <Text>Phí vận chuyển:</Text>
                    <Text>{formatPrice(cart.shippingFee)}</Text>
                  </div>
                  
                  {/* Voucher Input */}
                  <Divider style={{ margin: '12px 0' }}>Mã giảm giá</Divider>
                  <VoucherInput
                    cartItems={cart.items.filter((item: CartItem) => selectedItems.has(item._id))}
                    orderAmount={calculateSelectedTotal().subtotal}
                    shippingFee={cart.shippingFee}
                    currentVoucherCode={cart.couponCode}
                    onCartUpdate={loadCart}
                    onVoucherApplied={(voucher, discountAmount) => {
                      console.log('[Cart] Voucher applied:', voucher, discountAmount);
                    }}
                    onVoucherRemoved={() => {
                      console.log('[Cart] Voucher removed');
                    }}
                  />
                  
                  {cart.discountAmount > 0 && (
                    <div className="summary-row">
                      <Text>Giảm giá:</Text>
                      <Text type="success">-{formatPrice(cart.discountAmount)}</Text>
                    </div>
                  )}
                  <Divider />
                  <div className="summary-row total">
                    <Text strong>Tổng cộng:</Text>
                    <Text strong style={{ fontSize: '18px', color: '#ff4d4f' }}>
                      {formatPrice(calculateSelectedTotal().subtotal + cart.shippingFee - (cart.discountAmount || 0))}
                    </Text>
                  </div>
                  <Button
                    type="primary"
                    size="large"
                    block
                    onClick={handleCheckout}
                    disabled={selectedItems.size === 0}
                    style={{ marginTop: '16px' }}
                  >
                    Thanh toán ({selectedItems.size} sản phẩm)
                  </Button>
                </Space>
              </Card>
            </Col>
          </Row>
        </div>
      </div>
    </PageWrapper>
  );
};

export default CartPage;



