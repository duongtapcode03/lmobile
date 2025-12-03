import { vnpayService } from './vnpay.service.js';

/**
 * Payment Service - Unified payment service
 * Tập trung các phương thức thanh toán
 */
export const paymentService = {
  /**
   * Tạo VNPay payment request
   */
  async createVNPayPayment(orderId, amount, orderInfo, ipAddr = '127.0.0.1') {
    try {
      const result = await vnpayService.createQRCode(
        orderId,
        amount,
        orderInfo,
        ipAddr
      );
      return {
        paymentMethod: 'vnpay',
        qrCodeUrl: result.qrCodeUrl,
        paymentUrl: result.paymentUrl,
        orderId: result.orderId,
        amount: result.amount,
        createDate: result.createDate,
        expireDate: result.expireDate
      };
    } catch (error) {
      console.error('[Payment] VNPay error:', error);
      throw error;
    }
  },

  /**
   * Xử lý VNPay IPN callback
   */
  async handleVNPayIpn(vnpParams) {
    const isValid = vnpayService.verifyIpnCallback(vnpParams);
    
    if (!isValid) {
      throw new Error('Invalid VNPay signature');
    }

    const orderId = vnpParams.vnp_TxnRef;
    const responseCode = vnpParams.vnp_ResponseCode;
    const transactionStatus = vnpParams.vnp_TransactionStatus;
    const amount = parseFloat(vnpParams.vnp_Amount) / 100; // Convert từ xu về VND

    return {
      orderId,
      responseCode,
      transactionStatus,
      amount,
      message: vnpayService.getResponseMessage(responseCode),
      vnpParams
    };
  }
};

