import crypto from 'crypto';
import axios from 'axios';
import { Order } from '../order/order.model.js';
import { Product } from '../product/product.model.js';

/**
 * MoMo Payment Service
 * Tích hợp thanh toán qua MoMo Payment Gateway
 */
class MomoPaymentService {
  constructor() {
    // MoMo API Configuration (lấy từ environment variables)
    this.partnerCode = process.env.MOMO_PARTNER_CODE || 'MOMOBKUN20180529';
    this.accessKey = process.env.MOMO_ACCESS_KEY || 'klm05TvNBzhg7h7j';
    this.secretKey = process.env.MOMO_SECRET_KEY || 'at67qH6mk8w5Y1nAyMoYKMWACiEi2bsa';
    this.endpoint = process.env.MOMO_ENDPOINT || 'https://test-payment.momo.vn/v2/gateway/api/create';
    this.returnUrl = process.env.MOMO_RETURN_URL || 'http://localhost:5173/payment/momo/return';
    this.notifyUrl = process.env.MOMO_NOTIFY_URL || `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/v1/payment/momo/ipn`;
  }

  /**
   * Tạo chữ ký HMAC SHA256
   */
  createSignature(data) {
    const rawSignature = `accessKey=${this.accessKey}&amount=${data.amount}&extraData=${data.extraData}&ipnUrl=${this.notifyUrl}&orderId=${data.orderId}&orderInfo=${data.orderInfo}&partnerCode=${this.partnerCode}&redirectUrl=${this.returnUrl}&requestId=${data.requestId}&requestType=${data.requestType}`;
    return crypto.createHmac('sha256', this.secretKey).update(rawSignature).digest('hex');
  }

  /**
   * Tạo QR code URL cho thanh toán MoMo
   */
  createQRCodeUrl(orderId, amount) {
    const storeId = process.env.MOMO_STORE_ID || 'LMobile';
    const storeSlug = `${this.partnerCode}_${storeId}`;
    
    // Tạo signature cho QR code
    const signatureData = `storeSlug=${storeSlug}&amount=${amount}&billId=${orderId}`;
    const signature = crypto.createHmac('sha256', this.secretKey).update(signatureData).digest('hex');
    
    // Tạo QR code URL
    const qrCodeUrl = `https://test-payment.momo.vn/pay/store/${storeSlug}?a=${amount}&b=${orderId}&s=${signature}`;
    
    return {
      qrCodeUrl,
      storeSlug,
      signature
    };
  }

  /**
   * Tạo payment request với MoMo (Payment Link - Redirect)
   * Theo code mẫu: sử dụng payWithMethod và signature đơn giản hơn
   */
  async createPaymentRequest(orderId, amount, orderInfo, extraData = '') {
    // Mock mode: Nếu không có credentials hoặc set MOCK_MOMO=true
    const useMock = process.env.MOCK_MOMO === 'true' || !this.accessKey || !this.secretKey;
    
    if (useMock) {
      console.log('[MoMo Payment] Using MOCK mode (no real credentials)');
      return this.createMockPaymentRequest(orderId, amount, orderInfo, extraData);
    }

    try {
      // Tạo orderId và requestId theo code mẫu
      const requestId = orderId;
      const requestType = 'payWithMethod'; // Theo code mẫu
      
      // Đảm bảo amount là số nguyên (integer) - MoMo yêu cầu
      const amountInt = Math.round(Number(amount));
      if (isNaN(amountInt) || amountInt <= 0) {
        throw new Error('Số tiền thanh toán không hợp lệ');
      }

      // Theo code mẫu: extraData không cần base64 trong signature, chỉ trong request body
      const extraDataBase64 = extraData ? Buffer.from(extraData).toString('base64') : '';
      
      // Tạo raw signature theo code mẫu
      const rawSignature = 
        'accessKey=' + this.accessKey +
        '&amount=' + amountInt +
        '&extraData=' + extraData +
        '&ipnUrl=' + this.notifyUrl +
        '&orderId=' + orderId +
        '&orderInfo=' + orderInfo +
        '&partnerCode=' + this.partnerCode +
        '&redirectUrl=' + this.returnUrl +
        '&requestId=' + requestId +
        '&requestType=' + requestType;

      const signature = crypto.createHmac('sha256', this.secretKey)
        .update(rawSignature)
        .digest('hex');
      
      const requestData = {
        partnerCode: this.partnerCode,
        partnerName: 'LMobile',
        storeId: 'LMobile',
        requestId: requestId,
        amount: amountInt,
        orderId: orderId,
        orderInfo: orderInfo,
        redirectUrl: this.returnUrl,
        ipnUrl: this.notifyUrl,
        lang: 'vi',
        requestType: requestType,
        autoCapture: true,
        extraData: extraDataBase64,
        orderGroupId: '',
        signature: signature
      };

      // Gọi API MoMo
      const response = await axios.post(this.endpoint, requestData, {
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(JSON.stringify(requestData))
        }
      });

      if (response.data.resultCode === 0) {
        return {
          payUrl: response.data.payUrl,
          deeplink: response.data.deeplink,
          qrCodeUrl: response.data.qrCodeUrl,
          appLink: response.data.appLink,
          requestId: requestId,
          orderId: orderId
        };
      } else {
        throw new Error(`MoMo payment failed: ${response.data.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('[MoMo Payment] Error:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Mock payment request (dùng khi không có credentials)
   */
  createMockPaymentRequest(orderId, amount, orderInfo, extraData) {
    const mockPayUrl = `${this.returnUrl}?orderId=${orderId}&resultCode=0&message=Mock%20payment%20success`;
    return {
      payUrl: mockPayUrl,
      deeplink: mockPayUrl,
      qrCodeUrl: mockPayUrl,
      appLink: mockPayUrl,
      requestId: `${orderId}_${Date.now()}`,
      orderId: orderId
    };
  }

  /**
   * Verify callback từ MoMo
   */
  verifyCallback(callbackData) {
    try {
      const {
        partnerCode,
        orderId,
        requestId,
        amount,
        orderInfo,
        orderType,
        transId,
        resultCode,
        message,
        payType,
        responseTime,
        extraData,
        signature
      } = callbackData;

      // Tạo signature để verify
      const rawSignature = `accessKey=${this.accessKey}&amount=${amount}&extraData=${extraData || ''}&message=${message || ''}&orderId=${orderId}&orderInfo=${orderInfo}&orderType=${orderType || 'momo_wallet'}&partnerCode=${partnerCode}&payType=${payType || ''}&requestId=${requestId}&responseTime=${responseTime}&resultCode=${resultCode}&transId=${transId}`;
      const checkSum = crypto.createHmac('sha256', this.secretKey).update(rawSignature).digest('hex');

      if (signature !== checkSum) {
        return {
          valid: false,
          error: 'Invalid signature'
        };
      }

      return {
        valid: true,
        partnerCode,
        orderId,
        requestId,
        amount: parseFloat(amount),
        orderInfo,
        orderType,
        transId,
        resultCode: parseInt(resultCode),
        message,
        payType,
        responseTime,
        extraData: extraData ? Buffer.from(extraData, 'base64').toString('utf-8') : ''
      };
    } catch (error) {
      console.error('[MoMo Payment] Verify callback error:', error);
      return {
        valid: false,
        error: error.message
      };
    }
  }

  /**
   * Xử lý kết quả thanh toán từ MoMo
   */
  async handlePaymentResult(verifiedData) {
    if (!verifiedData.valid) {
      throw new Error('Invalid payment data');
    }

    const { orderId, resultCode, amount, transId } = verifiedData;

    // Tìm order
    const order = await Order.findOne({ orderNumber: orderId });

    if (!order) {
      throw new Error(`Order not found: ${orderId}`);
    }

    // Kiểm tra số tiền
    if (Math.abs(order.totalAmount - amount) > 0.01) {
      throw new Error(`Amount mismatch: order=${order.totalAmount}, payment=${amount}`);
    }

    if (resultCode === 0) {
      // Thanh toán thành công
      order.paymentInfo.status = 'paid';
      order.paymentInfo.transactionId = transId;
      order.paymentInfo.paidAt = new Date();
      if (order.status === 'pending') {
        order.status = 'confirmed';
      }
      await order.save();

      return {
        success: true,
        message: 'Thanh toán thành công',
        order: order
      };
    } else {
      // Thanh toán thất bại
      order.paymentInfo.status = 'failed';
      await order.save();

      return {
        success: false,
        message: verifiedData.message || 'Thanh toán thất bại',
        order: order
      };
    }
  }
}

export const momoPaymentService = new MomoPaymentService();

