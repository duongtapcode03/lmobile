/**
 * PaymentSuccessPage Component
 * Trang hiển thị sau khi thanh toán MoMo thành công
 */

import React, { useEffect, useState } from 'react';
import { Result, Button, Spin, message } from 'antd';
import { CheckCircleOutlined, HomeOutlined, ShoppingOutlined } from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import orderService from '../../../api/orderService';
import paymentService from '../../../api/paymentService';
import type { Order } from '../../../api/orderService';
import { fetchCart } from '../../../features/cart/cartSlice';
import { PageWrapper } from '../../../components';
import './PaymentSuccess.scss';

const PaymentSuccessPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<Order | null>(null);
  const orderId = searchParams.get('orderId');
  const createOrder = searchParams.get('createOrder') === 'true';

  useEffect(() => {
    const loadOrder = async () => {
      console.log('[PaymentSuccess] Starting loadOrder:', { orderId, createOrder });
      
      // Bước 1: Kiểm tra pendingOrderData trong localStorage (ưu tiên cao nhất)
      const pendingOrderDataStr = localStorage.getItem('pendingOrderData');
      if (pendingOrderDataStr) {
        try {
          const cartData = JSON.parse(pendingOrderDataStr);
          // Lấy orderNumber: ưu tiên orderId từ URL, sau đó tempOrderNumber từ cartData
          const targetOrderNumber = orderId || cartData.tempOrderNumber;
          
          if (!targetOrderNumber) {
            console.error('[PaymentSuccess] No orderNumber found in URL or cartData');
            message.error('Không tìm thấy thông tin đơn hàng');
            setLoading(false);
            return;
          }

          console.log('[PaymentSuccess] Found pendingOrderData, processing:', {
            targetOrderNumber,
            orderId,
            hasTempOrderNumber: !!cartData.tempOrderNumber,
            cartDataKeys: Object.keys(cartData)
          });

          // Thử load order từ database trước
          try {
            const existingOrder = await orderService.getOrderByNumber(targetOrderNumber);
            console.log('[PaymentSuccess] Order already exists:', existingOrder.orderNumber);
            setOrder(existingOrder);
            localStorage.removeItem('pendingOrderData');
            localStorage.removeItem('selectedCartItems');
            // Refresh cart để cập nhật số sản phẩm
            dispatch(fetchCart() as any);
            setLoading(false);
            return;
          } catch (error: any) {
            // Order không tồn tại, tạo mới
            console.log('[PaymentSuccess] Order not found, creating from pendingOrderData');
            try {
              const result = await paymentService.createOrderAfterPayment(targetOrderNumber, cartData);
              
              if (result.success && result.data.order) {
                console.log('[PaymentSuccess] Order created successfully:', result.data.order.orderNumber);
                setOrder(result.data.order);
                localStorage.removeItem('pendingOrderData');
                localStorage.removeItem('selectedCartItems');
                // Refresh cart để cập nhật số sản phẩm sau khi order được tạo
                dispatch(fetchCart() as any);
                message.success('Đơn hàng đã được tạo thành công');
                setLoading(false);
                return;
              } else {
                throw new Error(result.data?.message || 'Không thể tạo đơn hàng');
              }
            } catch (createError: any) {
              console.error('[PaymentSuccess] Error creating order:', createError);
              message.error(createError.message || 'Không thể tạo đơn hàng. Vui lòng liên hệ hỗ trợ.');
              setLoading(false);
              return;
            }
          }
        } catch (error: any) {
          console.error('[PaymentSuccess] Error processing pendingOrderData:', error);
          message.error('Lỗi xử lý thông tin đơn hàng. Vui lòng liên hệ hỗ trợ.');
          setLoading(false);
          return;
        }
      }

      // Bước 2: Nếu không có pendingOrderData, thử load order từ orderId
      if (!orderId) {
        message.error('Không tìm thấy thông tin đơn hàng');
        setLoading(false);
        return;
      }

      try {
        // Thử load order từ database
        try {
          const orderData = await orderService.getOrderByNumber(orderId);
          console.log('[PaymentSuccess] Order loaded from database:', orderData.orderNumber);
          setOrder(orderData);
          // Xóa pendingOrderData nếu order đã tồn tại (cleanup)
          localStorage.removeItem('pendingOrderData');
          localStorage.removeItem('selectedCartItems');
          // Refresh cart để cập nhật số sản phẩm
          dispatch(fetchCart() as any);
          setLoading(false);
          return;
        } catch (error: any) {
          // Order không tồn tại
          console.log('[PaymentSuccess] Order not found in database:', {
            orderId,
            createOrder,
            isTempOrder: orderId.startsWith('TEMP-')
          });

          // Nếu có flag createOrder hoặc orderId là TEMP-xxx, nhưng không có pendingOrderData
          // Thì không thể tạo order (thiếu cartData)
          if (createOrder || orderId.startsWith('TEMP-')) {
            message.error('Không tìm thấy thông tin đơn hàng. Vui lòng liên hệ hỗ trợ.');
          } else {
            message.error('Không tìm thấy thông tin đơn hàng');
          }
        }
      } catch (error: any) {
        console.error('[PaymentSuccess] Error loading order:', error);
        message.error('Không thể tải thông tin đơn hàng');
      } finally {
        setLoading(false);
      }
    };

    loadOrder();
  }, [orderId, createOrder]);

  if (loading) {
    return (
      <PageWrapper loading={true}>
        <div style={{ textAlign: 'center', padding: '100px 0' }}>
          <Spin size="large" />
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <div className="payment-success-page">
        <div className="container">
          <Result
            icon={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
            status="success"
            title="Thanh toán thành công!"
            subTitle={
              order ? (
                <>
                  Đơn hàng <strong>{order.orderNumber}</strong> đã được thanh toán thành công.
                  <br />
                  Tổng tiền: <strong>{formatPrice(order.totalAmount)}</strong>
                </>
              ) : (
                'Đơn hàng đã được thanh toán thành công.'
              )
            }
            extra={[
              <Button
                type="primary"
                key="orders"
                icon={<ShoppingOutlined />}
                onClick={() => navigate('/orders')}
              >
                Xem đơn hàng
              </Button>,
              <Button
                key="home"
                icon={<HomeOutlined />}
                onClick={() => navigate('/')}
              >
                Về trang chủ
              </Button>
            ]}
          />
        </div>
      </div>
    </PageWrapper>
  );
};

const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  }).format(price);
};

export default PaymentSuccessPage;






