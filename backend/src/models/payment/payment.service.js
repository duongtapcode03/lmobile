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
   * Format: https://test-payment.momo.vn/pay/store/{storeSlug}?a={amount}&b={billId}&s={signature}
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
   */
  async createPaymentRequest(orderId, amount, orderInfo, extraData = '') {
    try {
      const requestId = `${orderId}_${Date.now()}`;
      const requestType = 'captureWallet'; // Payment Link
      
      // Tạo request body
      const requestBody = {
        partnerCode: this.partnerCode,
        partnerName: "LMobile",
        storeId: process.env.MOMO_STORE_ID || 'LMobile',
        requestId: requestId,
        amount: amount,
        orderId: orderId,
        orderInfo: orderInfo,
        redirectUrl: this.returnUrl,
        ipnUrl: this.notifyUrl,
        lang: 'vi',
        extraData: extraData,
        requestType: requestType,
        autoCapture: true,
        orderExpireTime: 15 // 15 phút
      };

      // Tạo signature
      requestBody.signature = this.createSignature({
        amount: amount,
        extraData: extraData,
        orderId: orderId,
        orderInfo: orderInfo,
        requestId: requestId,
        requestType: requestType
      });

      // Gọi MoMo API
      const response = await axios.post(this.endpoint, requestBody, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.data.resultCode === 0) {
        // Thành công - trả về payment URL để redirect
        return {
          success: true,
          payUrl: response.data.payUrl, // URL để redirect user đến MoMo
          orderId: orderId,
          amount: amount,
          orderInfo: orderInfo,
          requestId: requestId
        };
      } else {
        throw new Error(response.data.message || 'Lỗi khi tạo payment link MoMo');
      }
    } catch (error) {
      console.error('MoMo Payment Link Error:', error);
      throw new Error(error.response?.data?.message || error.message || 'Lỗi khi tạo payment link thanh toán MoMo');
    }
  }

  /**
   * Xác thực callback từ MoMo
   */
  verifyCallback(data) {
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
      } = data;

      // Tạo signature để verify
      const rawSignature = `accessKey=${this.accessKey}&amount=${amount}&extraData=${extraData}&message=${message}&orderId=${orderId}&orderInfo=${orderInfo}&orderType=${orderType}&partnerCode=${partnerCode}&payType=${payType}&requestId=${requestId}&responseTime=${responseTime}&resultCode=${resultCode}&transId=${transId}`;
      const calculatedSignature = crypto.createHmac('sha256', this.secretKey).update(rawSignature).digest('hex');

      // Verify signature
      if (calculatedSignature !== signature) {
        return { valid: false, error: 'Invalid signature' };
      }

      // Verify partner code
      if (partnerCode !== this.partnerCode) {
        return { valid: false, error: 'Invalid partner code' };
      }

      return {
        valid: true,
        orderId,
        requestId,
        amount,
        transId,
        resultCode,
        message,
        extraData
      };
    } catch (error) {
      console.error('MoMo Callback Verification Error:', error);
      return { valid: false, error: error.message };
    }
  }

  /**
   * Xử lý kết quả thanh toán và cập nhật order
   */
  async handlePaymentResult(verifiedData) {
    try {
      const { orderId, resultCode, transId, amount, message } = verifiedData;

      // Tìm order theo orderId (có thể là orderNumber)
      const order = await Order.findOne({ 
        $or: [
          { orderNumber: orderId },
          { _id: orderId }
        ]
      });

      if (!order) {
        throw new Error(`Order not found: ${orderId}`);
      }

      // MoMo resultCode: 0 = success, khác 0 = failed
      if (resultCode === 0) {
        // Thanh toán thành công
        order.paymentInfo.status = 'paid';
        order.paymentInfo.transactionId = transId;
        order.paymentInfo.paidAt = new Date();
        order.status = 'confirmed'; // Chuyển sang trạng thái đã xác nhận
        
        // Trừ tồn kho
        for (let item of order.items) {
          await Product.findOneAndUpdate(
            { _id: item.product },
            { 
              $inc: { 
                stock: -item.quantity,
                sold: item.quantity 
              } 
            }
          );
        }

        await order.save();
        return { success: true, order, message: 'Thanh toán thành công' };
      } else {
        // Thanh toán thất bại
        order.paymentInfo.status = 'failed';
        await order.save();
        return { success: false, order, message: message || 'Thanh toán thất bại' };
      }
    } catch (error) {
      console.error('Handle Payment Result Error:', error);
      throw error;
    }
  }
}

export const momoPaymentService = new MomoPaymentService();

