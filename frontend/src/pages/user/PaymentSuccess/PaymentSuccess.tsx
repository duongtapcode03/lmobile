/**
 * PaymentSuccessPage Component
 * Trang hiển thị sau khi thanh toán MoMo thành công
 */

import React, { useEffect, useState } from 'react';
import { Result, Button, Spin, message } from 'antd';
import { CheckCircleOutlined, HomeOutlined, ShoppingOutlined } from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import orderService from '../../../api/orderService';
import type { Order } from '../../../api/orderService';
import { PageWrapper } from '../../../components';
import './PaymentSuccess.scss';

const PaymentSuccessPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<Order | null>(null);
  const orderId = searchParams.get('orderId');

  useEffect(() => {
    const loadOrder = async () => {
      if (!orderId) {
        message.error('Không tìm thấy thông tin đơn hàng');
        setLoading(false);
        return;
      }

      try {
        const orderData = await orderService.getOrderByNumber(orderId);
        setOrder(orderData);
      } catch (error: any) {
        console.error('Error loading order:', error);
        message.error('Không thể tải thông tin đơn hàng');
      } finally {
        setLoading(false);
      }
    };

    loadOrder();
  }, [orderId]);

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

