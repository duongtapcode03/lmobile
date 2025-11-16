/**
 * CheckoutPage Component
 * Trang thanh toán - tạo đơn hàng từ giỏ hàng
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import {
  Row,
  Col,
  Card,
  Form,
  Input,
  Button,
  Radio,
  Space,
  Typography,
  Divider,
  Spin,
  message,
  Modal,
  Checkbox,
  Tag
} from 'antd';
import {
  ShoppingCartOutlined,
  EnvironmentOutlined,
  TruckOutlined,
  CreditCardOutlined,
  PlusOutlined,
  CheckOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { userService } from '../../../api/userService';
import type { Cart } from '../../../api/cartService.types';
import addressService from '../../../api/addressService';
import type { Address } from '../../../types';
import orderService from '../../../api/orderService';
import paymentService from '../../../api/paymentService';
import voucherService from '../../../api/voucherService';
import { fetchCart } from '../../../features/cart/cartSlice';
import { PageWrapper } from '../../../components';
import './Checkout.scss';

const { Title, Text } = Typography;
const { TextArea } = Input;

interface CheckoutFormData {
  shippingAddressId?: string;
  shippingAddress?: Address;
  paymentMethod: 'cod' | 'bank_transfer' | 'credit_card' | 'momo' | 'zalopay';
  shippingMethod: 'standard' | 'express' | 'same_day';
  couponCode?: string;
  note?: string;
  isGift?: boolean;
  giftMessage?: string;
}

const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [cart, setCart] = useState<Cart | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [addressForm] = Form.useForm();
  const [couponCode, setCouponCode] = useState('');
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [savedVouchers, setSavedVouchers] = useState<any[]>([]);
  const [displayShippingFee, setDisplayShippingFee] = useState<number | null>(null);

  useEffect(() => {
    loadData();
    loadSavedVouchers();
  }, []);

  const loadSavedVouchers = async () => {
    try {
      const vouchers = await voucherService.getSavedVouchers();
      setSavedVouchers(vouchers);
    } catch (error) {
      console.error('Failed to load saved vouchers:', error);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [cartData, addressesData] = await Promise.all([
        userService.getCart(),
        addressService.getAddresses()
      ]);

      console.log('[Checkout] Loaded cart data:', {
        totalAmount: cartData?.totalAmount,
        totalItems: cartData?.totalItems,
        isEmpty: cartData?.isEmpty,
        items: cartData?.items?.length,
        cart: cartData
      });
      
      setCart(cartData);
      setAddresses(addressesData);

      // Set default address
      const defaultAddress = addressesData.find(addr => addr.isDefault) || addressesData[0];
      if (defaultAddress) {
        setSelectedAddressId(defaultAddress._id || null);
        form.setFieldsValue({
          shippingAddressId: defaultAddress._id,
          shippingMethod: 'standard',
          paymentMethod: 'cod'
        });
      }

      // Set initial shipping fee display (standard: 30000)
      setDisplayShippingFee(cartData?.shippingFee || 30000);

      // Cập nhật phí vận chuyển mặc định (standard: 30000) nếu chưa có
      if (cartData && (!cartData.shippingFee || cartData.shippingFee === 0)) {
        try {
          await userService.updateShippingFee(30000);
          const updatedCart = await userService.getCart();
          setCart(updatedCart);
          setDisplayShippingFee(30000);
        } catch (error) {
          console.error('[Checkout] Error setting default shipping fee:', error);
        }
      }
    } catch (error: any) {
      console.error('Error loading checkout data:', error);
      message.error('Không thể tải dữ liệu thanh toán');
      if (error.response?.status === 401) {
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };


  const handleAddressChange = (addressId: string) => {
    setSelectedAddressId(addressId);
    const address = addresses.find(addr => addr._id === addressId);
    if (address) {
      const method = form.getFieldValue('shippingMethod') || 'standard';
      // Phí vận chuyển theo phương thức đã chọn
      const shippingFees: Record<string, number> = {
        'standard': 30000,
        'express': 50000,
        'same_day': 80000
      };
      const shippingFee = shippingFees[method] || 30000;
      
      // Cập nhật phí hiển thị
      setDisplayShippingFee(shippingFee);
      
      // Cập nhật phí vận chuyển trong cart
      if (cart) {
        userService.updateShippingFee(shippingFee).then(() => {
          userService.getCart().then(updatedCart => {
            setCart(updatedCart);
          });
        }).catch(error => {
          console.error('[Checkout] Error updating shipping fee:', error);
        });
      }
    }
  };

  const handleShippingMethodChange = async (method: string) => {
    // Cập nhật giá trị form
    form.setFieldsValue({ shippingMethod: method });
    
    // Phí vận chuyển theo phương thức (dùng giá đã hiển thị)
    const shippingFees: Record<string, number> = {
      'standard': 30000,
      'express': 50000,
      'same_day': 80000
    };
    const shippingFee = shippingFees[method] || 30000;
    
    // Cập nhật phí hiển thị ngay lập tức
    setDisplayShippingFee(shippingFee);
    
    // Cập nhật phí vận chuyển trong cart
    if (cart) {
      try {
        await userService.updateShippingFee(shippingFee);
        const updatedCart = await userService.getCart();
        setCart(updatedCart);
      } catch (error) {
        console.error('[Checkout] Error updating shipping fee:', error);
        message.error('Không thể cập nhật phí vận chuyển');
      }
    }
  };

  const handleApplyCoupon = async (code?: string) => {
    const codeToApply = code || couponCode;
    
    if (!codeToApply.trim()) {
      message.warning('Vui lòng nhập mã giảm giá');
      return;
    }

    if (!cart || cart.totalAmount === 0) {
      message.warning('Giỏ hàng trống');
      return;
    }

    try {
      setApplyingCoupon(true);
      
      // Tính totalAmount (giá gốc, không có discount)
      // Nếu đã có voucher trong cart, cần tính lại giá gốc
      let currentTotal = cart.totalAmount;
      if (cart.discountAmount && cart.discountAmount > 0) {
        // Nếu đã có discount, cộng lại để có giá gốc
        currentTotal = cart.totalAmount + cart.discountAmount;
      }
      
      // Validate voucher - chỉ kiểm tra, chưa apply vào cart
      const result = await voucherService.validateVoucher(
        codeToApply, 
        currentTotal,
        cart.items
      );

      if (result.valid && result.voucher) {
        // Áp dụng voucher vào cart ngay lập tức
        await userService.applyCoupon(codeToApply, result.discountAmount);
        
        // Reload cart để cập nhật giá
        const updatedCart = await userService.getCart();
        if (updatedCart) {
          setCart(updatedCart);
        }
        
        // Reload cart trong Redux để đồng bộ
        await dispatch(fetchCart() as any);
        
        // Hiển thị thông báo với thông tin chi tiết
        const discountInfo = result.discountPercent 
          ? `Giảm ${result.discountPercent}% (${formatPrice(result.discountAmount)})`
          : formatPrice(result.discountAmount);
        
        message.success(`Áp dụng mã giảm giá thành công! ${discountInfo}`);
        setCouponCode('');
      } else {
        message.error(result.message || 'Mã giảm giá không hợp lệ');
      }
    } catch (error: any) {
      console.error('Error validating coupon:', error);
      message.error(error.response?.data?.message || 'Không thể áp dụng mã giảm giá');
    } finally {
      setApplyingCoupon(false);
    }
  };

  const handleRemoveCoupon = async () => {
    try {
      await userService.removeCoupon();
      
      // Reload cart để cập nhật giá
      const updatedCart = await userService.getCart();
      setCart(updatedCart);
      
      // Reload cart trong Redux để đồng bộ
      await dispatch(fetchCart() as any);
      
      message.success('Đã xóa mã giảm giá');
    } catch (error) {
      console.error('Error removing coupon:', error);
      message.error('Không thể xóa mã giảm giá');
    }
  };

  const handleCreateAddress = async (values: Address) => {
    try {
      const newAddress = await addressService.createAddress(values);
      setAddresses([...addresses, newAddress]);
      setSelectedAddressId(newAddress._id || null);
      form.setFieldsValue({ shippingAddressId: newAddress._id });
      setShowAddressModal(false);
      addressForm.resetFields();
      message.success('Đã thêm địa chỉ mới');
    } catch (error: any) {
      console.error('Error creating address:', error);
      message.error(error.response?.data?.message || 'Không thể tạo địa chỉ');
    }
  };

  const handleSubmit = async (values: CheckoutFormData) => {
    if (!cart || cart.isEmpty) {
      message.warning('Giỏ hàng trống');
      return;
    }

    if (!selectedAddressId) {
      message.warning('Vui lòng chọn địa chỉ giao hàng');
      return;
    }

    try {
      setSubmitting(true);
      const selectedAddress = addresses.find(addr => addr._id === selectedAddressId);

      if (!selectedAddress) {
        message.error('Địa chỉ không hợp lệ');
        return;
      }

      const order = await orderService.createFromCart({
        shippingAddress: {
          fullName: selectedAddress.fullName,
          phone: selectedAddress.phone,
          email: selectedAddress.email,
          address: selectedAddress.address,
          ward: selectedAddress.ward,
          district: selectedAddress.district,
          province: selectedAddress.province,
          postalCode: selectedAddress.postalCode,
          note: selectedAddress.note
        },
        paymentMethod: values.paymentMethod,
        shippingMethod: values.shippingMethod || 'standard',
        notes: values.note,
        isGift: values.isGift,
        giftMessage: values.giftMessage
      });

      // Nếu là thanh toán MoMo, tạo payment request và redirect
      if (values.paymentMethod === 'momo') {
        try {
          const paymentResult = await paymentService.createMomoPayment({
            orderNumber: order.orderNumber
          });

          if (paymentResult.success && paymentResult.data.payUrl) {
            // Clear cart
            await userService.clearCart();
            await dispatch(fetchCart() as any);

            // Redirect đến MoMo payment page
            window.location.href = paymentResult.data.payUrl;
            setSubmitting(false);
            return;
          } else {
            throw new Error('Không thể tạo payment link thanh toán MoMo');
          }
        } catch (error: any) {
          console.error('MoMo Payment Error:', error);
          message.error(error.response?.data?.message || 'Không thể tạo yêu cầu thanh toán MoMo');
          setSubmitting(false);
          return;
        }
      }

      // Clear cart after successful order (cho COD và các phương thức khác)
      await userService.clearCart();
      
      // Cập nhật Redux cart state để icon giỏ hàng được cập nhật
      await dispatch(fetchCart() as any);

      message.success('Đặt hàng thành công!');
      navigate(`/orders/${order._id}`, {
        state: { order }
      });
    } catch (error: any) {
      console.error('Error creating order:', error);
      message.error(error.response?.data?.message || 'Không thể tạo đơn hàng');
    } finally {
      setSubmitting(false);
    }
  };


  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price);
  };

  const currentShippingFee = displayShippingFee !== null ? displayShippingFee : (cart?.shippingFee || 0);
  
  // Tính finalAmount với useMemo để đảm bảo tính lại khi cart hoặc shippingFee thay đổi
  const finalAmount = useMemo(() => {
    if (!cart) return 0;
    const subtotal = cart.totalAmount || 0;
    const shipping = currentShippingFee || 0;
    const discount = cart.discountAmount || 0;
    const final = subtotal + shipping - discount;
    
    console.log('[Checkout] Calculating finalAmount:', {
      subtotal,
      shipping,
      discount,
      final,
      couponCode: cart.couponCode
    });
    
    return final;
  }, [cart, currentShippingFee]);

  if (loading) {
    return (
      <PageWrapper loading={true}>
        <div className="checkout-page">
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
        <div className="checkout-page">
          <div className="container">
            <Card>
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <ShoppingCartOutlined style={{ fontSize: 64, color: '#ccc' }} />
                <Title level={4} style={{ marginTop: 16 }}>
                  Giỏ hàng trống
                </Title>
                <Button type="primary" onClick={() => navigate('/cart')}>
                  Quay lại giỏ hàng
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <div className="checkout-page">
        <div className="container">
          <Title level={2} style={{ marginBottom: 24 }}>
            Thanh toán
          </Title>

          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            initialValues={{
              shippingMethod: 'standard',
              paymentMethod: 'cod'
            }}
          >
            <Row gutter={[24, 24]}>
              {/* Left Column - Form */}
              <Col xs={24} lg={16}>
                {/* Cart Items */}
                <Card
                  title={
                    <Space>
                      <ShoppingCartOutlined />
                      <span>Sản phẩm trong đơn hàng ({cart.totalItems} sản phẩm)</span>
                    </Space>
                  }
                  style={{ marginBottom: 16 }}
                >
                  {cart.items && cart.items.length > 0 ? (
                    <div>
                      {cart.items.map((item: any) => (
                        <div
                          key={item._id}
                          style={{
                            display: 'flex',
                            padding: '16px 0',
                            borderBottom: '1px solid #f0f0f0'
                          }}
                        >
                          <div
                            style={{
                              width: '80px',
                              height: '80px',
                              marginRight: '16px',
                              flexShrink: 0
                            }}
                          >
                            <img
                              src={item.product?.thumbnail || item.product?.imageUrl || '/placeholder-product.png'}
                              alt={item.product?.name || 'Sản phẩm'}
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                borderRadius: '4px'
                              }}
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = '/placeholder-product.png';
                              }}
                            />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <Text strong style={{ fontSize: '16px', display: 'block', marginBottom: '8px' }}>
                              {item.product?.name || item.productName || 'Sản phẩm'}
                            </Text>
                            {item.variant && (
                              <div style={{ marginBottom: '8px' }}>
                                {item.variant.storage && (
                                  <Tag style={{ marginRight: '8px' }}>Dung lượng: {item.variant.storage}</Tag>
                                )}
                                {item.variant.color && (
                                  <Tag style={{ marginRight: '8px' }}>Màu: {item.variant.color}</Tag>
                                )}
                                {item.variant.ram && (
                                  <Tag>RAM: {item.variant.ram}</Tag>
                                )}
                              </div>
                            )}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Text type="secondary">Số lượng: {item.quantity}</Text>
                              <Text strong style={{ fontSize: '16px', color: '#ff4d4f' }}>
                                {formatPrice(item.price * item.quantity)}
                              </Text>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <Text type="secondary">Không có sản phẩm trong giỏ hàng</Text>
                  )}
                </Card>

                {/* Shipping Address */}
                <Card
                  title={
                    <Space>
                      <EnvironmentOutlined />
                      <span>Địa chỉ giao hàng</span>
                    </Space>
                  }
                  extra={
                    <Button
                      type="link"
                      icon={<PlusOutlined />}
                      onClick={() => setShowAddressModal(true)}
                    >
                      Thêm địa chỉ mới
                    </Button>
                  }
                >
                  {addresses.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '20px 0' }}>
                      <Text type="secondary">Bạn chưa có địa chỉ nào</Text>
                      <br />
                      <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => setShowAddressModal(true)}
                        style={{ marginTop: 16 }}
                      >
                        Thêm địa chỉ mới
                      </Button>
                    </div>
                  ) : (
                    <Form.Item name="shippingAddressId" rules={[{ required: true }]}>
                      <Radio.Group
                        value={selectedAddressId || undefined}
                        onChange={(e) => {
                          handleAddressChange(e.target.value);
                          form.setFieldsValue({ shippingAddressId: e.target.value });
                        }}
                      >
                        <Space direction="vertical" style={{ width: '100%' }}>
                          {addresses.map((address) => (
                            <Radio key={address._id} value={address._id}>
                              <div className="address-card">
                                <div className="address-header">
                                  <Text strong>{address.fullName}</Text>
                                  {address.isDefault && (
                                    <Tag color="blue">Mặc định</Tag>
                                  )}
                                </div>
                                <Text type="secondary">
                                  {address.phone}
                                </Text>
                                <br />
                                <Text type="secondary">
                                  {address.address}, {address.ward}, {address.district}, {address.province}
                                </Text>
                              </div>
                            </Radio>
                          ))}
                        </Space>
                      </Radio.Group>
                    </Form.Item>
                  )}
                </Card>

                {/* Shipping Method */}
                <Card
                  title={
                    <Space>
                      <TruckOutlined />
                      <span>Phương thức vận chuyển</span>
                    </Space>
                  }
                  style={{ marginTop: 16 }}
                >
                  <Form.Item name="shippingMethod" rules={[{ required: true }]}>
                    <Radio.Group onChange={(e) => handleShippingMethodChange(e.target.value)}>
                      <Space direction="vertical">
                        <Radio value="standard">
                          <div>
                            <Text strong>Giao hàng tiêu chuẩn</Text>
                            <br />
                            <Text type="secondary">3-5 ngày làm việc - {formatPrice(30000)}</Text>
                          </div>
                        </Radio>
                        <Radio value="express">
                          <div>
                            <Text strong>Giao hàng nhanh</Text>
                            <br />
                            <Text type="secondary">1-2 ngày làm việc - {formatPrice(50000)}</Text>
                          </div>
                        </Radio>
                        <Radio value="same_day">
                          <div>
                            <Text strong>Giao trong ngày</Text>
                            <br />
                            <Text type="secondary">Trong ngày - {formatPrice(80000)}</Text>
                          </div>
                        </Radio>
                      </Space>
                    </Radio.Group>
                  </Form.Item>
                </Card>

                {/* Payment Method */}
                <Card
                  title={
                    <Space>
                      <CreditCardOutlined />
                      <span>Phương thức thanh toán</span>
                    </Space>
                  }
                  style={{ marginTop: 16 }}
                >
                  <Form.Item name="paymentMethod" rules={[{ required: true }]}>
                    <Radio.Group>
                      <Space direction="vertical">
                        <Radio value="cod">
                          <Text strong>Thanh toán khi nhận hàng (COD)</Text>
                        </Radio>
                        <Radio value="bank_transfer">
                          <Text strong>Chuyển khoản ngân hàng</Text>
                        </Radio>
                        <Radio value="momo">
                          <Text strong>Ví điện tử MoMo</Text>
                        </Radio>
                        <Radio value="zalopay">
                          <Text strong>Ví điện tử ZaloPay</Text>
                        </Radio>
                        <Radio value="credit_card">
                          <Text strong>Thẻ tín dụng/Ghi nợ</Text>
                        </Radio>
                      </Space>
                    </Radio.Group>
                  </Form.Item>
                </Card>

                {/* Coupon Code */}
                <Card title="Mã giảm giá" style={{ marginTop: 16 }}>
                  {cart.couponCode ? (
                    <Space>
                      <Text>Mã đã áp dụng: <Text strong>{cart.couponCode}</Text></Text>
                      <Text type="success">-{formatPrice(cart.discountAmount || 0)}</Text>
                      <Button type="link" danger onClick={handleRemoveCoupon}>
                        Xóa
                      </Button>
                    </Space>
                  ) : (
                    <Space direction="vertical" style={{ width: '100%' }} size="middle">
                      {/* Danh sách voucher đã lưu */}
                      {savedVouchers.length > 0 && (
                        <div>
                          <Text strong style={{ display: 'block', marginBottom: 8 }}>
                            Voucher đã lưu:
                          </Text>
                          <Space direction="vertical" style={{ width: '100%' }} size="small">
                            {savedVouchers.map((voucher) => {
                              const formatDiscount = () => {
                                if (voucher.type === 'percentage') {
                                  return `Giảm ${voucher.value}%`;
                                } else if (voucher.type === 'fixed_amount') {
                                  return `Giảm ${formatPrice(voucher.value)}`;
                                } else {
                                  return 'Miễn phí vận chuyển';
                                }
                              };

                              const isVoucherValid = () => {
                                const now = new Date();
                                const validFrom = new Date(voucher.validFrom);
                                const validTo = new Date(voucher.validTo);
                                return now >= validFrom && now <= validTo && voucher.isActive;
                              };

                              return (
                                <Card
                                  key={voucher._id}
                                  size="small"
                                  style={{
                                    border: isVoucherValid() ? '1px solid #52c41a' : '1px solid #d9d9d9',
                                    cursor: isVoucherValid() ? 'pointer' : 'not-allowed',
                                    opacity: isVoucherValid() ? 1 : 0.6,
                                  }}
                                  onClick={() => {
                                    if (isVoucherValid()) {
                                      handleApplyCoupon(voucher.code);
                                    }
                                  }}
                                >
                                  <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                                    <div>
                                      <Text strong style={{ fontFamily: 'monospace' }}>
                                        {voucher.code}
                                      </Text>
                                      <div>
                                        <Text type="secondary" style={{ fontSize: '12px' }}>
                                          {voucher.name}
                                        </Text>
                                      </div>
                                      <div>
                                        <Text strong style={{ color: '#52c41a' }}>
                                          {formatDiscount()}
                                        </Text>
                                      </div>
                                    </div>
                                    {isVoucherValid() ? (
                                      <Button
                                        type="primary"
                                        size="small"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleApplyCoupon(voucher.code);
                                        }}
                                        loading={applyingCoupon && couponCode === voucher.code}
                                      >
                                        Áp dụng
                                      </Button>
                                    ) : (
                                      <Tag color="default">Không khả dụng</Tag>
                                    )}
                                  </Space>
                                </Card>
                              );
                            })}
                          </Space>
                        </div>
                      )}

                      {/* Nhập mã thủ công */}
                      <Divider>Hoặc nhập mã</Divider>
                      <Space.Compact style={{ width: '100%' }}>
                        <Input
                          placeholder="Nhập mã giảm giá"
                          value={couponCode}
                          onChange={(e) => setCouponCode(e.target.value)}
                          onPressEnter={() => handleApplyCoupon()}
                        />
                        <Button
                          type="primary"
                          onClick={() => handleApplyCoupon()}
                          loading={applyingCoupon}
                        >
                          Áp dụng
                        </Button>
                      </Space.Compact>
                    </Space>
                  )}
                </Card>

                {/* Additional Notes */}
                <Card title="Ghi chú" style={{ marginTop: 16 }}>
                  <Form.Item name="note">
                    <TextArea
                      rows={3}
                      placeholder="Ghi chú cho đơn hàng (tùy chọn)"
                    />
                  </Form.Item>
                  <Form.Item name="isGift" valuePropName="checked">
                    <Checkbox>Đây là đơn hàng quà tặng</Checkbox>
                  </Form.Item>
                  <Form.Item
                    noStyle
                    shouldUpdate={(prevValues, currentValues) =>
                      prevValues.isGift !== currentValues.isGift
                    }
                  >
                    {({ getFieldValue }) =>
                      getFieldValue('isGift') ? (
                        <Form.Item name="giftMessage">
                          <TextArea
                            rows={2}
                            placeholder="Lời nhắn gửi kèm (tùy chọn)"
                          />
                        </Form.Item>
                      ) : null
                    }
                  </Form.Item>
                </Card>
              </Col>

              {/* Right Column - Order Summary */}
              <Col xs={24} lg={8}>
                <Card
                  title={
                    <Space>
                      <ShoppingCartOutlined />
                      <span>Tóm tắt đơn hàng</span>
                    </Space>
                  }
                  className="order-summary"
                >
                  <div className="summary-section">
                    <div className="summary-item">
                      <Text>Tạm tính:</Text>
                      <Text>{formatPrice(cart.totalAmount)}</Text>
                    </div>
                    <div className="summary-item">
                      <Text>Phí vận chuyển:</Text>
                      <Text>{formatPrice(displayShippingFee !== null ? displayShippingFee : (cart?.shippingFee || 0))}</Text>
                    </div>
                    {cart.discountAmount && cart.discountAmount > 0 && (
                      <div className="summary-item">
                        <Text>Giảm giá:</Text>
                        <Text type="success">-{formatPrice(cart.discountAmount)}</Text>
                      </div>
                    )}
                    <Divider />
                    <div className="summary-item total">
                      <Text strong>Tổng cộng:</Text>
                      <Text strong style={{ fontSize: '20px', color: '#ff4d4f' }}>
                        {formatPrice(finalAmount)}
                      </Text>
                    </div>
                  </div>

                  <Button
                    type="primary"
                    size="large"
                    block
                    htmlType="submit"
                    loading={submitting}
                    icon={<CheckOutlined />}
                    style={{ marginTop: 16 }}
                  >
                    Đặt hàng
                  </Button>

                  <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginTop: 16 }}>
                    Bằng cách đặt hàng, bạn đồng ý với các điều khoản và điều kiện của chúng tôi
                  </Text>
                </Card>
              </Col>
            </Row>
          </Form>
        </div>
      </div>

      {/* Address Modal */}
      <Modal
        title="Thêm địa chỉ mới"
        open={showAddressModal}
        onCancel={() => {
          setShowAddressModal(false);
          addressForm.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={addressForm}
          layout="vertical"
          onFinish={handleCreateAddress}
        >
          <Form.Item
            name="fullName"
            label="Họ và tên"
            rules={[
              { required: true, message: 'Vui lòng nhập họ và tên' },
              { min: 2, message: 'Họ và tên phải có ít nhất 2 ký tự' },
              { max: 100, message: 'Họ và tên không được quá 100 ký tự' }
            ]}
          >
            <Input placeholder="Nhập họ và tên" />
          </Form.Item>
          <Form.Item
            name="phone"
            label="Số điện thoại"
            rules={[
              { required: true, message: 'Vui lòng nhập số điện thoại' },
              { 
                pattern: /^[0-9]{8,11}$/, 
                message: 'Số điện thoại phải có 8-11 chữ số' 
              },
              {
                validator: (_, value) => {
                  if (!value) {
                    return Promise.resolve();
                  }
                  // Cho phép số điện thoại Việt Nam: bắt đầu bằng 0 (10-11 chữ số)
                  if (value.startsWith('0') && value.length >= 10) {
                    return Promise.resolve();
                  }
                  // Cho phép số điện thoại quốc tế hoặc số test (8-11 chữ số, không bắt đầu bằng 0)
                  if (/^[1-9][0-9]{7,10}$/.test(value)) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('Số điện thoại không hợp lệ'));
                }
              }
            ]}
          >
            <Input placeholder="Nhập số điện thoại (8-11 chữ số)" />
          </Form.Item>
          <Form.Item 
            name="email" 
            label="Email"
            rules={[
              { type: 'email', message: 'Email không hợp lệ' },
              { max: 100, message: 'Email không được quá 100 ký tự' }
            ]}
          >
            <Input type="email" placeholder="Nhập email (tùy chọn)" />
          </Form.Item>
          <Form.Item
            name="address"
            label="Địa chỉ"
            rules={[
              { required: true, message: 'Vui lòng nhập địa chỉ' },
              { max: 200, message: 'Địa chỉ không được quá 200 ký tự' }
            ]}
          >
            <Input placeholder="Nhập địa chỉ chi tiết" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="ward"
                label="Phường/Xã"
                rules={[
                  { required: true, message: 'Vui lòng nhập phường/xã' },
                  { max: 50, message: 'Phường/Xã không được quá 50 ký tự' }
                ]}
              >
                <Input placeholder="Phường/Xã" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="district"
                label="Quận/Huyện"
                rules={[
                  { required: true, message: 'Vui lòng nhập quận/huyện' },
                  { max: 50, message: 'Quận/Huyện không được quá 50 ký tự' }
                ]}
              >
                <Input placeholder="Quận/Huyện" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="province"
                label="Tỉnh/Thành phố"
                rules={[
                  { required: true, message: 'Vui lòng nhập tỉnh/thành phố' },
                  { max: 50, message: 'Tỉnh/Thành phố không được quá 50 ký tự' }
                ]}
              >
                <Input placeholder="Tỉnh/Thành phố" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item 
            name="postalCode" 
            label="Mã bưu điện"
            rules={[
              { max: 10, message: 'Mã bưu điện không được quá 10 ký tự' }
            ]}
          >
            <Input placeholder="Mã bưu điện (tùy chọn)" />
          </Form.Item>
          <Form.Item name="isDefault" valuePropName="checked">
            <Checkbox>Đặt làm địa chỉ mặc định</Checkbox>
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                Thêm địa chỉ
              </Button>
              <Button onClick={() => {
                setShowAddressModal(false);
                addressForm.resetFields();
              }}>
                Hủy
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </PageWrapper>
  );
};

export default CheckoutPage;



