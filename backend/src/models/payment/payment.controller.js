import { momoPaymentService } from './payment.service.js';
import { orderService } from '../order/order.service.js';
import { catchAsync } from '../../core/middleware/errorHandler.js';
import { AppError } from '../../core/errors/AppError.js';

export const paymentController = {
  /**
   * Tạo payment request với MoMo
   * POST /api/v1/payment/momo/create
   */
  createMomoPayment: catchAsync(async (req, res) => {
    const { orderId, orderNumber } = req.body;
    const userId = req.user?.id;

    if (!orderId && !orderNumber) {
      throw new AppError('Vui lòng cung cấp orderId hoặc orderNumber', 400);
    }

    // Tìm order
    let order;
    if (orderNumber) {
      order = await orderService.getOrderByNumber(orderNumber, userId);
    } else {
      order = await orderService.getOrderById(orderId, userId);
    }

    if (!order) {
      throw new AppError('Không tìm thấy đơn hàng', 404);
    }

    // Kiểm tra order đã được thanh toán chưa
    if (order.paymentInfo.status === 'paid') {
      throw new AppError('Đơn hàng đã được thanh toán', 400);
    }

    // Kiểm tra payment method
    if (order.paymentInfo.method !== 'momo') {
      throw new AppError('Đơn hàng không sử dụng phương thức thanh toán MoMo', 400);
    }

    // Tạo payment request (Payment Link - Redirect)
    const orderInfo = `Thanh toán đơn hàng ${order.orderNumber}`;
    const extraData = JSON.stringify({ userId, orderId: order._id.toString() });

    const paymentResult = await momoPaymentService.createPaymentRequest(
      order.orderNumber,
      order.totalAmount,
      orderInfo,
      extraData
    );

    res.json({
      success: true,
      data: {
        payUrl: paymentResult.payUrl, // URL để redirect
        orderNumber: order.orderNumber,
        amount: order.totalAmount,
        shippingAddress: order.shippingAddress
      }
    });
  }),

  /**
   * Xử lý callback từ MoMo (IPN - Instant Payment Notification)
   * POST /api/v1/payment/momo/ipn
   */
  momoIPN: catchAsync(async (req, res) => {
    const callbackData = req.body;

    // Verify callback
    const verifiedData = momoPaymentService.verifyCallback(callbackData);

    if (!verifiedData.valid) {
      return res.status(400).json({
        success: false,
        message: verifiedData.error || 'Invalid callback data'
      });
    }

    // Xử lý kết quả thanh toán
    const result = await momoPaymentService.handlePaymentResult(verifiedData);

    // MoMo yêu cầu trả về JSON với format cụ thể
    res.json({
      partnerCode: process.env.MOMO_PARTNER_CODE || 'MOMOBKUN20180529',
      orderId: verifiedData.orderId,
      resultCode: verifiedData.resultCode,
      message: result.message
    });
  }),

  /**
   * Xử lý return URL từ MoMo (sau khi user thanh toán xong)
   * GET /api/v1/payment/momo/return
   */
  momoReturn: catchAsync(async (req, res) => {
    const { orderId, resultCode, message } = req.query;

    // Verify callback
    const verifiedData = momoPaymentService.verifyCallback(req.query);

    if (!verifiedData.valid) {
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment/failed?error=invalid_signature`);
    }

    // Xử lý kết quả thanh toán
    const result = await momoPaymentService.handlePaymentResult(verifiedData);

    // orderId từ MoMo là orderNumber, dùng trực tiếp
    const orderNumber = verifiedData.orderId;

    // Redirect về frontend
    if (resultCode === '0' || verifiedData.resultCode === 0) {
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment/success?orderId=${orderNumber}`);
    } else {
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment/failed?orderId=${orderNumber}&message=${encodeURIComponent(message || verifiedData.message || 'Thanh toán thất bại')}`);
    }
  })
};

