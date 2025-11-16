/**
 * CartPage Component
 * Trang hiển thị giỏ hàng của user
 */

import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Button, InputNumber, Empty, Spin, message, Typography, Space, Divider } from 'antd';
import { DeleteOutlined, ShoppingCartOutlined, SyncOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { userService } from '../../../api/userService';
import type { Cart, CartItem } from '../../../api/cartService.types';
import { PageWrapper } from '../../../components';
import './Cart.scss';

const { Title, Text } = Typography;

const CartPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<Cart | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    loadCart();
  }, []);

  const loadCart = async () => {
    try {
      setLoading(true);
      const cartData = await userService.getCart();
      setCart(cartData);
    } catch (error: any) {
      console.error('Error loading cart:', error);
      message.error('Không thể tải giỏ hàng');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateQuantity = async (itemId: string, quantity: number) => {
    if (quantity < 1 || quantity > 10) {
      message.warning('Số lượng phải từ 1 đến 10');
      return;
    }

    try {
      setUpdating(itemId);
      const updatedCart = await userService.updateCartItem(itemId, quantity);
      setCart(updatedCart);
      message.success('Đã cập nhật số lượng');
    } catch (error: any) {
      console.error('Error updating quantity:', error);
      message.error(error.response?.data?.message || 'Không thể cập nhật số lượng');
    } finally {
      setUpdating(null);
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    try {
      setUpdating(itemId);
      const updatedCart = await userService.removeFromCart(itemId);
      setCart(updatedCart);
      message.success('Đã xóa sản phẩm khỏi giỏ hàng');
    } catch (error: any) {
      console.error('Error removing item:', error);
      message.error('Không thể xóa sản phẩm');
    } finally {
      setUpdating(null);
    }
  };

  const handleClearCart = async () => {
    try {
      await userService.clearCart();
      setCart(null);
      message.success('Đã xóa toàn bộ giỏ hàng');
    } catch (error: any) {
      console.error('Error clearing cart:', error);
      message.error('Không thể xóa giỏ hàng');
    }
  };

  const handleSyncPrices = async () => {
    try {
      setLoading(true);
      const updatedCart = await userService.syncCartPrices();
      setCart(updatedCart);
      message.success('Đã đồng bộ giá sản phẩm');
    } catch (error: any) {
      console.error('Error syncing prices:', error);
      message.error('Không thể đồng bộ giá');
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
                    <ShoppingCartOutlined />
                    <span>Giỏ hàng của tôi ({cart.totalItems} sản phẩm)</span>
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
                      <Col xs={24} sm={6}>
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
                        </div>
                      </Col>
                      <Col xs={12} sm={4}>
                        <InputNumber
                          min={1}
                          max={10}
                          value={item.quantity}
                          onChange={(value) => {
                            if (value) {
                              handleUpdateQuantity(item._id, value);
                            }
                          }}
                          disabled={updating === item._id}
                          style={{ width: '100%' }}
                        />
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
                    <Text>Tạm tính:</Text>
                    <Text>{formatPrice(cart.totalAmount)}</Text>
                  </div>
                  <div className="summary-row">
                    <Text>Phí vận chuyển:</Text>
                    <Text>{formatPrice(cart.shippingFee)}</Text>
                  </div>
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
                      {formatPrice(cart.finalAmount)}
                    </Text>
                  </div>
                  <Button
                    type="primary"
                    size="large"
                    block
                    onClick={() => navigate('/checkout')}
                    style={{ marginTop: '16px' }}
                  >
                    Thanh toán
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



