/**
 * VNPay Return Callback Handler
 * Xử lý callback từ VNPay sau khi thanh toán
 * Frontend nhận callback từ VNPay và redirect về success page
 * PaymentSuccess component sẽ tự động tạo order nếu chưa tồn tại
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Spin } from 'antd';
import { PageWrapper } from '../../../components';

const VnpayReturnPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [processing, setProcessing] = useState(true);

  useEffect(() => {
    const handleReturn = async () => {
      try {
        // Lấy tất cả params từ VNPay
        const vnpParams: Record<string, string> = {};
        searchParams.forEach((value, key) => {
          vnpParams[key] = value;
        });

        console.log('[VNPay Return Frontend] Received params from VNPay:', vnpParams);

        // Lấy orderNumber từ vnp_TxnRef
        const orderNumber = vnpParams.vnp_TxnRef;
        const responseCode = vnpParams.vnp_ResponseCode;
        const transactionStatus = vnpParams.vnp_TransactionStatus;

        if (!orderNumber) {
          console.error('[VNPay Return Frontend] No orderNumber found in params');
          navigate('/payment/failed?error=' + encodeURIComponent('Không tìm thấy thông tin đơn hàng'));
          return;
        }

        // Kiểm tra thanh toán thành công
        if (responseCode === '00' && transactionStatus === '00') {
          console.log('[VNPay Return Frontend] Payment successful:', {
            orderNumber,
            responseCode,
            transactionStatus
          });

          // Kiểm tra xem có pendingOrderData trong localStorage không
          const pendingOrderDataStr = localStorage.getItem('pendingOrderData');
          if (pendingOrderDataStr) {
            console.log('[VNPay Return Frontend] Found pendingOrderData, will be processed by PaymentSuccess component');
          } else {
            console.warn('[VNPay Return Frontend] No pendingOrderData found in localStorage');
          }

          // Redirect về success page với orderNumber
          // PaymentSuccess component sẽ tự động tạo order nếu chưa tồn tại
          navigate(`/payment/success?orderId=${orderNumber}`, { replace: true });
        } else {
          console.error('[VNPay Return Frontend] Payment failed:', {
            orderNumber,
            responseCode,
            transactionStatus
          });
          const errorMessage = vnpParams.vnp_ResponseCode || 'Thanh toán thất bại';
          navigate(`/payment/failed?orderId=${orderNumber}&message=${encodeURIComponent(errorMessage)}`, { replace: true });
        }
      } catch (error: any) {
        console.error('[VNPay Return Frontend] Error processing return:', error);
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

export default VnpayReturnPage;
