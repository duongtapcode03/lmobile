/**
 * Momo Return Callback Handler
 * Xử lý callback từ Momo sau khi thanh toán
 * Frontend nhận callback từ Momo và redirect về success page
 * PaymentSuccess component sẽ tự động tạo order nếu chưa tồn tại
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Spin } from 'antd';
import { PageWrapper } from '../../../components';

const MomoReturnPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [processing, setProcessing] = useState(true);

  useEffect(() => {
    const handleReturn = async () => {
      try {
        // Lấy tất cả params từ Momo
        const momoParams: Record<string, string> = {};
        searchParams.forEach((value, key) => {
          momoParams[key] = value;
        });

        console.log('[Momo Return Frontend] Received params from Momo:', momoParams);

        // Lấy orderId từ Momo callback
        const orderId = momoParams.orderId;
        const resultCode = momoParams.resultCode;
        const message = momoParams.message;

        if (!orderId) {
          console.error('[Momo Return Frontend] No orderId found in params');
          navigate('/payment/failed?error=' + encodeURIComponent('Không tìm thấy thông tin đơn hàng'));
          return;
        }

        // Kiểm tra thanh toán thành công (resultCode === '0')
        if (resultCode === '0') {
          console.log('[Momo Return Frontend] Payment successful:', {
            orderId,
            resultCode,
            message
          });

          // Kiểm tra xem có pendingOrderData trong localStorage không
          const pendingOrderDataStr = localStorage.getItem('pendingOrderData');
          if (pendingOrderDataStr) {
            console.log('[Momo Return Frontend] Found pendingOrderData, will be processed by PaymentSuccess component');
          } else {
            console.warn('[Momo Return Frontend] No pendingOrderData found in localStorage');
          }

          // Redirect về success page với orderId
          // PaymentSuccess component sẽ tự động tạo order nếu chưa tồn tại
          // Backend sẽ redirect về /payment/success/{orderId} hoặc /payment/success?orderId={orderId}
          // Nếu backend redirect về /payment/success?orderId={orderId}&createOrder=true thì frontend sẽ tự tạo
          navigate(`/payment/success?orderId=${orderId}`, { replace: true });
        } else {
          console.error('[Momo Return Frontend] Payment failed:', {
            orderId,
            resultCode,
            message
          });
          const errorMessage = message || 'Thanh toán thất bại';
          navigate(`/payment/failed?orderId=${orderId}&message=${encodeURIComponent(errorMessage)}`, { replace: true });
        }
      } catch (error: any) {
        console.error('[Momo Return Frontend] Error processing return:', error);
        navigate('/payment/failed?error=' + encodeURIComponent(error.message || 'Lỗi xử lý thanh toán'), { replace: true });
      } finally {
        setProcessing(false);
      }
    };

    handleReturn();
  }, [searchParams, navigate]);

  return (
    <PageWrapper>
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" />
        <p style={{ marginTop: 20 }}>Đang xử lý kết quả thanh toán...</p>
      </div>
    </PageWrapper>
  );
};

export default MomoReturnPage;

