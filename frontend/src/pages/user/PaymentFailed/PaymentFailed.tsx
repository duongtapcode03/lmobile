/**
 * PaymentFailedPage Component
 * Trang hiển thị sau khi thanh toán MoMo thất bại
 */

import React from 'react';
import { Result, Button } from 'antd';
import { CloseCircleOutlined, HomeOutlined, ReloadOutlined } from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageWrapper } from '../../../components';
import './PaymentFailed.scss';

const PaymentFailedPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId');
  const errorMessage = searchParams.get('message') || 'Thanh toán thất bại';

  return (
    <PageWrapper>
      <div className="payment-failed-page">
        <div className="container">
          <Result
            icon={<CloseCircleOutlined style={{ color: '#ff4d4f' }} />}
            status="error"
            title="Thanh toán thất bại"
            subTitle={errorMessage}
            extra={[
              <Button
                type="primary"
                key="retry"
                icon={<ReloadOutlined />}
                onClick={() => {
                  if (orderId) {
                    navigate(`/orders?orderId=${orderId}`);
                  } else {
                    navigate('/orders');
                  }
                }}
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

export default PaymentFailedPage;

