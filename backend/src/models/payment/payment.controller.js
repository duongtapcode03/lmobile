import { momoPaymentService } from './payment.service.js';
import { paymentService } from './paymentUnified.service.js';
import { orderService } from '../order/order.service.js';
import { Order } from '../order/order.model.js';
import { Cart } from '../cart/cart.model.js';
import { catchAsync } from '../../core/middleware/errorHandler.js';
import { AppError } from '../../core/errors/AppError.js';
import crypto from 'crypto';
import https from 'https';

export const paymentController = {
  /**
   * Tạo payment request với MoMo
   * POST /api/v1/payment/momo/create
   * Theo code mẫu: tạo payment từ cart, tạo order sau khi thanh toán thành công
   */
  createMomoPayment: catchAsync(async (req, res) => {
    const { typePayment } = req.body;
    const userId = req.user?.id;

    // Tìm cart của user
    const findCartUser = await Cart.findOne({ user: userId });
    if (!findCartUser) {
      throw new AppError('Giỏ hàng không tồn tại', 404);
    }

    if (findCartUser.items.length === 0) {
      throw new AppError('Giỏ hàng không có sản phẩm', 400);
    }

    // Tính toán tổng tiền
    const totalPrice = findCartUser.totalAmount || 0;
    const finalPrice = findCartUser.finalAmount || totalPrice;

    // Tạo orderId theo code mẫu
    const partnerCode = process.env.MOMO_PARTNER_CODE || 'MOMO';
    const orderId = partnerCode + new Date().getTime();
    const requestId = orderId;
    const orderInfo = `Thanh toan don hang ${userId}`;
    const redirectUrl = process.env.MOMO_RETURN_URL || `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment/momo/return`;
    const ipnUrl = process.env.MOMO_NOTIFY_URL || `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/v1/payment/momo/ipn`;
    const requestType = 'payWithMethod';
    const amount = Math.round(Number(finalPrice));
    const extraData = '';

    // Lấy credentials từ env
    const accessKey = process.env.MOMO_ACCESS_KEY || 'F8BBA842ECF85';
    const secretKey = process.env.MOMO_SECRET_KEY || 'K951B6PE1waDMi640xX08PD3vg6EkVlz';

    // Tạo signature theo code mẫu
    const rawSignature =
      'accessKey=' + accessKey +
      '&amount=' + amount +
      '&extraData=' + extraData +
      '&ipnUrl=' + ipnUrl +
      '&orderId=' + orderId +
      '&orderInfo=' + orderInfo +
      '&partnerCode=' + partnerCode +
      '&redirectUrl=' + redirectUrl +
      '&requestId=' + requestId +
      '&requestType=' + requestType;

    const signature = crypto.createHmac('sha256', secretKey)
      .update(rawSignature)
      .digest('hex');

    const requestBody = JSON.stringify({
      partnerCode,
      partnerName: 'LMobile',
      storeId: 'LMobile',
      requestId,
      amount,
      orderId,
      orderInfo,
      redirectUrl,
      ipnUrl,
      lang: 'vi',
      requestType,
      autoCapture: true,
      extraData,
      orderGroupId: '',
      signature
    });

    const options = {
      hostname: 'test-payment.momo.vn',
      port: 443,
      path: '/v2/gateway/api/create',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(requestBody)
      }
    };

    // Gọi API MoMo
    return new Promise((resolve, reject) => {
      const req1 = https.request(options, (res1) => {
        let data = '';

        res1.on('data', (chunk) => {
          data += chunk;
        });

        res1.on('end', () => {
          try {
            const response = JSON.parse(data);
            
            if (response.resultCode === 0) {
              // Lưu thông tin cart vào memory để dùng khi callback (hoặc dùng Redis trong production)
              global.momoPendingCarts = global.momoPendingCarts || new Map();
              global.momoPendingCarts.set(orderId, {
                userId,
                cart: findCartUser,
                createdAt: new Date()
              });

              return res.json({
                success: true,
                message: 'Tạo đơn hàng thành công',
                data: {
                  payUrl: response.payUrl,
                  orderId: orderId,
                  amount: amount
                }
              });
            } else {
              throw new AppError(response.message || 'Tạo thanh toán MoMo thất bại', 400);
            }
          } catch (err) {
            console.error('[MoMo Create] Error parsing response:', err);
            reject(new AppError('Lỗi xử lý phản hồi từ MoMo', 500));
          }
        });
      });

      req1.on('error', (e) => {
        console.error('[MoMo Create] Request error:', e);
        reject(new AppError('Lỗi kết nối đến MoMo', 500));
      });

      req1.write(requestBody);
      req1.end();
    });
  }),

  /**
   * Xử lý callback từ MoMo (IPN - Instant Payment Notification)
   * POST /api/v1/payment/momo/ipn
   * Theo code mẫu: parse userId từ orderInfo, tạo order từ cart
   */
  momoIPN: catchAsync(async (req, res) => {
    const { resultCode, orderInfo } = req.body;

    if (resultCode !== '0') {
      return res.json({
        partnerCode: process.env.MOMO_PARTNER_CODE || 'MOMO',
        orderId: req.body.orderId,
        resultCode: resultCode,
        message: 'Payment failed'
      });
    }

    // Parse userId từ orderInfo theo code mẫu: "Thanh toan don hang {userId}"
    const userId = orderInfo.split(' ')[4];
    if (!userId) {
      return res.json({
        partnerCode: process.env.MOMO_PARTNER_CODE || 'MOMO',
        orderId: req.body.orderId,
        resultCode: '99',
        message: 'Invalid orderInfo'
      });
    }

    // Tìm cart của user
    const findCartUser = await Cart.findOne({ user: userId });
    if (!findCartUser) {
      return res.json({
        partnerCode: process.env.MOMO_PARTNER_CODE || 'MOMO',
        orderId: req.body.orderId,
        resultCode: '99',
        message: 'Cart not found'
      });
    }

    try {
      // Tạo order từ cart (cần có orderService.createOrderFromCart)
      // Tạm thời tạo order đơn giản
      const order = await orderService.createOrderFromCart(userId, {
        paymentMethod: 'momo',
        shippingMethod: 'standard'
      });

      // Cập nhật order với payment info
      order.paymentInfo.status = 'paid';
      order.paymentInfo.transactionId = req.body.transId;
      order.paymentInfo.paidAt = new Date();
      if (order.status === 'pending') {
        order.status = 'confirmed';
      }
      await order.save();

      // Xóa cart và tạo cart mới
      await findCartUser.deleteOne();
      await Cart.create({
        user: userId,
        items: []
      });

      // Giảm số lượng coupon nếu có
      if (findCartUser.couponCode) {
        // TODO: Implement coupon logic
      }

      console.log('[MoMo IPN] Order created successfully:', order.orderNumber);

      return res.json({
        partnerCode: process.env.MOMO_PARTNER_CODE || 'MOMO',
        orderId: req.body.orderId,
        resultCode: '0',
        message: 'Success'
      });
    } catch (error) {
      console.error('[MoMo IPN] Error creating order:', error);
      return res.json({
        partnerCode: process.env.MOMO_PARTNER_CODE || 'MOMO',
        orderId: req.body.orderId,
        resultCode: '99',
        message: error.message || 'Error creating order'
      });
    }
  }),

  /**
   * Xử lý return URL từ MoMo (sau khi user thanh toán xong)
   * GET /api/v1/payment/momo/return
   * Theo code mẫu: parse userId từ orderInfo, tạo order từ cart
   */
  momoReturn: catchAsync(async (req, res) => {
    const { resultCode, orderInfo } = req.query;

    if (resultCode !== '0') {
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment/failed?message=${encodeURIComponent('Thanh toán thất bại')}`);
    }

    // Parse userId từ orderInfo theo code mẫu: "Thanh toan don hang {userId}"
    const userId = orderInfo.split(' ')[4];
    if (!userId) {
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment/failed?message=${encodeURIComponent('Thông tin đơn hàng không hợp lệ')}`);
    }

    // Tìm cart của user
    const findCartUser = await Cart.findOne({ user: userId });
    if (!findCartUser) {
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment/failed?message=${encodeURIComponent('Giỏ hàng không tồn tại')}`);
    }

    try {
      // Tạo order từ cart
      const order = await orderService.createOrderFromCart(userId, {
        paymentMethod: 'momo',
        shippingMethod: 'standard'
      });

      // Cập nhật order với payment info
      order.paymentInfo.status = 'paid';
      order.paymentInfo.transactionId = req.query.transId;
      order.paymentInfo.paidAt = new Date();
      if (order.status === 'pending') {
        order.status = 'confirmed';
      }
      await order.save();

      // Xóa cart và tạo cart mới
      await findCartUser.deleteOne();
      await Cart.create({
        user: userId,
        items: []
      });

      // Giảm số lượng coupon nếu có
      if (findCartUser.couponCode) {
        // TODO: Implement coupon logic
      }

      console.log('[MoMo Return] Order created successfully:', order.orderNumber);

      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment/success/${order._id}`);
    } catch (error) {
      console.error('[MoMo Return] Error creating order:', error);
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment/failed?message=${encodeURIComponent(error.message || 'Lỗi tạo đơn hàng')}`);
    }
  }),

  /**
   * Tạo payment request với VNPay
   * POST /api/v1/payment/vnpay/create
   * Chỉ tạo order sau khi thanh toán thành công
   */
  createVNPayPayment: catchAsync(async (req, res) => {
    const { orderId, orderNumber, cartData } = req.body;
    const userId = req.user?.id;
    
    // Lấy IP address - VNPay yêu cầu IPv4, không chấp nhận IPv6 (::1)
    let ipAddr = req.ip || req.connection.remoteAddress || req.socket.remoteAddress || '127.0.0.1';
    
    // Chuyển IPv6 localhost (::1) sang IPv4
    if (ipAddr === '::1' || ipAddr === '::ffff:127.0.0.1') {
      ipAddr = '127.0.0.1';
    }
    
    // Nếu là IPv6, lấy phần cuối hoặc dùng 127.0.0.1
    if (ipAddr.includes('::')) {
      ipAddr = '127.0.0.1';
    }

    let order = null;
    let totalAmount = 0;
    let tempOrderNumber = null;

    // Nếu có cartData, tính toán từ cart (chưa tạo order)
    if (cartData) {
      totalAmount = cartData.totalAmount || 0;
      // Tạo temporary order number để dùng cho payment
      tempOrderNumber = `TEMP-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      
      // Tạo payment request
      const now = new Date();
      const timeStr = now.toISOString().replace('T', ' ').substring(0, 19);
      const orderInfo = `Thanh toan don hang ${tempOrderNumber} thoi gian: ${timeStr}`;
      
      // Lưu cartData vào orderInfo hoặc dùng cách khác để lưu
      // VNPay không hỗ trợ extraData như MoMo, nên cần lưu vào database tạm thời
      // Hoặc encode vào orderInfo (nhưng có giới hạn 255 ký tự)
      // Tạm thời lưu vào một collection tạm hoặc dùng Redis
      // Ở đây tôi sẽ lưu vào một Map trong memory (không production-ready, cần dùng Redis)
      
      const paymentResult = await paymentService.createVNPayPayment(
        tempOrderNumber,
        totalAmount,
        orderInfo,
        ipAddr
      );

      // Lưu cartData tạm thời (cần implement proper storage)
      // TODO: Dùng Redis hoặc database để lưu cartData với key = tempOrderNumber
      global.vnpayPendingOrders = global.vnpayPendingOrders || new Map();
      global.vnpayPendingOrders.set(tempOrderNumber, {
        userId,
        cartData,
        createdAt: new Date()
      });
      
      console.log('[VNPay Create] Stored pending order:', {
        tempOrderNumber,
        userId,
        cartDataKeys: Object.keys(cartData),
        pendingOrdersSize: global.vnpayPendingOrders.size,
        pendingOrderKeys: Array.from(global.vnpayPendingOrders.keys())
      });

      return res.json({
        success: true,
        data: {
          paymentUrl: paymentResult.paymentUrl,
          qrCodeUrl: paymentResult.qrCodeUrl,
          orderNumber: tempOrderNumber,
          amount: totalAmount,
          createDate: paymentResult.createDate,
          expireDate: paymentResult.expireDate
        }
      });
    }

    // Legacy: Nếu có orderId/orderNumber, tìm order (backward compatibility)
    if (!orderId && !orderNumber) {
      throw new AppError('Vui lòng cung cấp cartData hoặc orderId/orderNumber', 400);
    }

    if (orderNumber) {
      order = await orderService.getOrderByNumber(orderNumber, userId);
    } else {
      order = await orderService.getOrderById(orderId, userId);
    }

    if (!order) {
      throw new AppError('Không tìm thấy đơn hàng', 404);
    }

    if (order.paymentInfo.status === 'paid') {
      throw new AppError('Đơn hàng đã được thanh toán', 400);
    }

    if (order.paymentInfo.method !== 'vnpay') {
      throw new AppError('Đơn hàng không sử dụng phương thức thanh toán VNPay', 400);
    }

    const now = new Date();
    const timeStr = now.toISOString().replace('T', ' ').substring(0, 19);
    const orderInfo = `Thanh toan don hang ${order.orderNumber} thoi gian: ${timeStr}`;
    const paymentResult = await paymentService.createVNPayPayment(
      order.orderNumber,
      order.totalAmount,
      orderInfo,
      ipAddr
    );

    res.json({
      success: true,
      data: {
        paymentUrl: paymentResult.paymentUrl,
        qrCodeUrl: paymentResult.qrCodeUrl,
        orderNumber: order.orderNumber,
        amount: order.totalAmount,
        createDate: paymentResult.createDate,
        expireDate: paymentResult.expireDate
      }
    });
  }),

  /**
   * Xử lý callback từ VNPay (IPN - Instant Payment Notification)
   * GET /api/v1/payment/vnpay/ipn
   * Tạo order sau khi thanh toán thành công
   */
  vnpayIPN: catchAsync(async (req, res) => {
    const vnpParams = req.query;

    console.log('[VNPay IPN] Received callback:', {
      orderNumber: vnpParams.vnp_TxnRef,
      responseCode: vnpParams.vnp_ResponseCode,
      transactionStatus: vnpParams.vnp_TransactionStatus,
      amount: vnpParams.vnp_Amount
    });

    try {
      // Verify và xử lý IPN
      const result = await paymentService.handleVNPayIpn(vnpParams);

      const orderNumber = result.orderId;

      console.log('[VNPay IPN] Verified result:', {
        orderNumber,
        responseCode: result.responseCode,
        transactionStatus: result.transactionStatus,
        isValid: result.responseCode === '00' && result.transactionStatus === '00'
      });

      // Kiểm tra xem có phải temporary order (chưa tạo order) không
      const pendingOrder = global.vnpayPendingOrders?.get(orderNumber);
      
      console.log('[VNPay IPN] Pending order check:', {
        orderNumber,
        hasPendingOrder: !!pendingOrder,
        pendingOrdersSize: global.vnpayPendingOrders?.size || 0,
        pendingOrderKeys: global.vnpayPendingOrders ? Array.from(global.vnpayPendingOrders.keys()) : []
      });
      
      if (pendingOrder && result.responseCode === '00' && result.transactionStatus === '00') {
        // Tạo order từ cartData sau khi thanh toán thành công
        try {
          const { userId, cartData } = pendingOrder;
          console.log('[VNPay IPN] Creating order from cartData after successful payment');
          
          const order = await orderService.createOrderFromCart(userId, {
            shippingAddress: cartData.shippingAddress,
            paymentMethod: cartData.paymentMethod || 'vnpay',
            shippingMethod: cartData.shippingMethod || 'standard',
            notes: cartData.notes || '',
            isGift: cartData.isGift || false,
            giftMessage: cartData.giftMessage || '',
            selectedItemIds: cartData.selectedItemIds,
            flashSaleReservationIds: cartData.flashSaleReservationIds
          });

          // Cập nhật order với payment info
          order.paymentInfo.status = 'paid';
          order.paymentInfo.transactionId = vnpParams.vnp_TransactionNo;
          if (vnpParams.vnp_BankCode) order.paymentInfo.bankCode = vnpParams.vnp_BankCode;
          if (vnpParams.vnp_CardType) order.paymentInfo.cardType = vnpParams.vnp_CardType;
          if (vnpParams.vnp_PayDate) order.paymentInfo.payDate = vnpParams.vnp_PayDate;
          order.paymentInfo.paidAt = new Date();
          order.status = 'confirmed'; // Luôn set confirmed khi thanh toán thành công
          
          // Mark paymentInfo và status là modified để đảm bảo save
          order.markModified('paymentInfo');
          order.markModified('status');
          
          await order.save();
          
          console.log('[VNPay IPN] Order updated - paymentStatus:', order.paymentInfo.status, 'orderStatus:', order.status);

          // Xóa pending order khỏi memory
          global.vnpayPendingOrders.delete(orderNumber);

          console.log('[VNPay IPN] Order created successfully:', order.orderNumber);
          return res.status(200).json({ RspCode: '00', Message: 'Success' });
        } catch (error) {
          console.error('[VNPay IPN] Error creating order from cartData:', error);
          return res.status(200).json({ RspCode: '99', Message: error.message || 'Error creating order' });
        }
      }

      // Legacy: Tìm order đã tồn tại
      const order = await Order.findOne({ orderNumber });

      if (!order) {
        return res.status(200).json({ RspCode: '01', Message: 'Order not found' });
      }

      // Xử lý kết quả thanh toán
      if (result.responseCode === '00' && result.transactionStatus === '00') {
        order.paymentInfo.status = 'paid';
        order.paymentInfo.transactionId = vnpParams.vnp_TransactionNo;
        if (vnpParams.vnp_BankCode) order.paymentInfo.bankCode = vnpParams.vnp_BankCode;
        if (vnpParams.vnp_CardType) order.paymentInfo.cardType = vnpParams.vnp_CardType;
        if (vnpParams.vnp_PayDate) order.paymentInfo.payDate = vnpParams.vnp_PayDate;
        order.paymentInfo.paidAt = new Date();
        order.status = 'confirmed'; // Luôn set confirmed khi thanh toán thành công
        
        // Mark paymentInfo và status là modified để đảm bảo save
        order.markModified('paymentInfo');
        order.markModified('status');
        
        await order.save();
        
        console.log('[VNPay IPN] Legacy order updated - paymentStatus:', order.paymentInfo.status, 'orderStatus:', order.status);

        return res.status(200).json({ RspCode: '00', Message: 'Success' });
      } else {
        order.paymentInfo.status = 'failed';
        if (result.responseCode) order.paymentInfo.errorCode = result.responseCode;
        if (result.message) order.paymentInfo.errorMessage = result.message;
        await order.save();

        return res.status(200).json({ RspCode: '00', Message: 'Success' });
      }
    } catch (error) {
      console.error('[VNPay IPN] Error:', error);
      return res.status(200).json({ RspCode: '99', Message: error.message || 'Unknown error' });
    }
  }),

  /**
   * Xử lý return URL từ VNPay (sau khi user thanh toán xong)
   * GET /api/v1/payment/vnpay/return
   * Tạo order sau khi thanh toán thành công (nếu chưa tạo)
   */
  vnpayReturn: catchAsync(async (req, res) => {
    const vnpParams = req.query;

    console.log('[VNPay Return] Received callback:', {
      orderNumber: vnpParams.vnp_TxnRef,
      responseCode: vnpParams.vnp_ResponseCode,
      transactionStatus: vnpParams.vnp_TransactionStatus,
      amount: vnpParams.vnp_Amount
    });

    try {
      // Verify callback
      const result = await paymentService.handleVNPayIpn(vnpParams);

      const orderNumber = result.orderId;

      console.log('[VNPay Return] Verified result:', {
        orderNumber,
        responseCode: result.responseCode,
        transactionStatus: result.transactionStatus,
        isValid: result.responseCode === '00' && result.transactionStatus === '00'
      });

      // Kiểm tra xem có phải temporary order (chưa tạo order) không
      const pendingOrder = global.vnpayPendingOrders?.get(orderNumber);
      
      console.log('[VNPay Return] Pending order check:', {
        orderNumber,
        hasPendingOrder: !!pendingOrder,
        pendingOrdersSize: global.vnpayPendingOrders?.size || 0,
        pendingOrderKeys: global.vnpayPendingOrders ? Array.from(global.vnpayPendingOrders.keys()) : []
      });
      
      let finalOrderNumber = orderNumber;

      if (pendingOrder && result.responseCode === '00' && result.transactionStatus === '00') {
        // Tạo order từ cartData sau khi thanh toán thành công
        try {
          const { userId, cartData } = pendingOrder;
          console.log('[VNPay Return] Creating order from cartData after successful payment');
          
          const order = await orderService.createOrderFromCart(userId, {
            shippingAddress: cartData.shippingAddress,
            paymentMethod: cartData.paymentMethod || 'vnpay',
            shippingMethod: cartData.shippingMethod || 'standard',
            notes: cartData.notes || '',
            isGift: cartData.isGift || false,
            giftMessage: cartData.giftMessage || '',
            selectedItemIds: cartData.selectedItemIds,
            flashSaleReservationIds: cartData.flashSaleReservationIds
          });

          // Cập nhật order với payment info
          order.paymentInfo.status = 'paid';
          order.paymentInfo.transactionId = vnpParams.vnp_TransactionNo;
          if (vnpParams.vnp_BankCode) order.paymentInfo.bankCode = vnpParams.vnp_BankCode;
          if (vnpParams.vnp_CardType) order.paymentInfo.cardType = vnpParams.vnp_CardType;
          if (vnpParams.vnp_PayDate) order.paymentInfo.payDate = vnpParams.vnp_PayDate;
          order.paymentInfo.paidAt = new Date();
          order.status = 'confirmed'; // Luôn set confirmed khi thanh toán thành công
          
          // Mark paymentInfo và status là modified để đảm bảo save
          order.markModified('paymentInfo');
          order.markModified('status');
          
          await order.save();
          
          console.log('[VNPay Return] Order created and updated - paymentStatus:', order.paymentInfo.status, 'orderStatus:', order.status);

          // Xóa pending order khỏi memory
          global.vnpayPendingOrders.delete(orderNumber);
          finalOrderNumber = order.orderNumber;

          console.log('[VNPay Return] Order created successfully:', order.orderNumber);
        } catch (error) {
          console.error('[VNPay Return] Error creating order from cartData:', error);
        }
      } else if (result.responseCode === '00' && result.transactionStatus === '00') {
        // Order đã được tạo từ IPN trước, chỉ cần cập nhật payment status
        // Hoặc pendingOrder không tồn tại, cần tìm order bằng orderNumber
        try {
          console.log('[VNPay Return] Looking for existing order with orderNumber:', orderNumber);
          const order = await Order.findOne({ orderNumber });
          
          if (order) {
            console.log('[VNPay Return] Order found, updating payment status');
            
            order.paymentInfo.status = 'paid';
            order.paymentInfo.transactionId = vnpParams.vnp_TransactionNo;
            if (vnpParams.vnp_BankCode) order.paymentInfo.bankCode = vnpParams.vnp_BankCode;
            if (vnpParams.vnp_CardType) order.paymentInfo.cardType = vnpParams.vnp_CardType;
            if (vnpParams.vnp_PayDate) order.paymentInfo.payDate = vnpParams.vnp_PayDate;
            order.paymentInfo.paidAt = new Date();
            order.status = 'confirmed'; // Luôn set confirmed khi thanh toán thành công
            
            // Mark paymentInfo và status là modified để đảm bảo save
            order.markModified('paymentInfo');
            order.markModified('status');
            
            await order.save();
            
            console.log('[VNPay Return] Order updated - paymentStatus:', order.paymentInfo.status, 'orderStatus:', order.status);
            finalOrderNumber = order.orderNumber;
          } else {
            console.error('[VNPay Return] Order not found with orderNumber:', orderNumber);
            console.error('[VNPay Return] Cannot create order - pendingOrder is missing and order does not exist');
            console.error('[VNPay Return] Frontend should send cartData to create order');
            // Redirect về frontend với flag để frontend tự tạo order
            return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment/success?orderId=${orderNumber}&createOrder=true`);
          }
        } catch (error) {
          console.error('[VNPay Return] Error updating existing order:', error);
        }
      } else {
        console.log('[VNPay Return] Payment failed or invalid:', {
          responseCode: result.responseCode,
          transactionStatus: result.transactionStatus,
          message: result.message
        });
      }

      // Redirect về frontend
      // Luôn redirect về success với orderNumber (kể cả khi order chưa được tạo)
      // Frontend sẽ tự động tạo order từ pendingOrderData trong localStorage
      if (result.responseCode === '00' && result.transactionStatus === '00') {
        // Nếu order đã được tạo, dùng finalOrderNumber
        // Nếu chưa, dùng orderNumber từ VNPay (TEMP-xxx) để frontend tự tạo
        const redirectOrderNumber = finalOrderNumber || orderNumber;
        console.log('[VNPay Return] Redirecting to success page with orderNumber:', redirectOrderNumber);
        return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment/success?orderId=${redirectOrderNumber}`);
      } else {
        const errorMessage = encodeURIComponent(result.message || 'Thanh toán thất bại');
        return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment/failed?orderId=${orderNumber}&message=${errorMessage}`);
      }
    } catch (error) {
      console.error('[VNPay Return] Error:', error);
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment/failed?error=${encodeURIComponent(error.message)}`);
    }
  }),

  /**
   * Tạo order sau khi thanh toán thành công (fallback khi pendingOrder bị mất)
   * POST /api/v1/payment/vnpay/create-order
   * Frontend gửi cartData từ localStorage để tạo order
   */
  createOrderAfterPayment: catchAsync(async (req, res) => {
    const { orderNumber, cartData } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError('Vui lòng đăng nhập', 401);
    }

    if (!orderNumber) {
      throw new AppError('Vui lòng cung cấp orderNumber', 400);
    }

    if (!cartData) {
      throw new AppError('Vui lòng cung cấp cartData', 400);
    }

    console.log('[VNPay CreateOrder] Creating order after payment:', {
      orderNumber,
      userId,
      cartDataKeys: Object.keys(cartData)
    });

    try {
      // Kiểm tra xem order đã tồn tại chưa
      const existingOrder = await Order.findOne({ orderNumber });
      if (existingOrder) {
        console.log('[VNPay CreateOrder] Order already exists:', existingOrder.orderNumber);
        return res.json({
          success: true,
          data: {
            order: existingOrder,
            message: 'Order đã tồn tại'
          }
        });
      }

      // Tạo order từ cartData
      // Note: createOrderFromCart sẽ tạo orderNumber mới (ORD-xxx)
      // Nhưng chúng ta cần dùng orderNumber từ VNPay (TEMP-xxx)
      // Giải pháp: Tạo order trước, sau đó cập nhật orderNumber nếu cần
      let order = await orderService.createOrderFromCart(userId, {
        shippingAddress: cartData.shippingAddress,
        paymentMethod: cartData.paymentMethod || 'vnpay',
        shippingMethod: cartData.shippingMethod || 'standard',
        notes: cartData.notes || '',
        isGift: cartData.isGift || false,
        giftMessage: cartData.giftMessage || '',
        selectedItemIds: cartData.selectedItemIds,
        flashSaleReservationIds: cartData.flashSaleReservationIds
      });

      // Nếu orderNumber từ VNPay là TEMP-xxx và khác với orderNumber vừa tạo
      // Cập nhật lại orderNumber (nhưng cần đảm bảo unique)
      if (orderNumber.startsWith('TEMP-') && order.orderNumber !== orderNumber) {
        // Kiểm tra xem orderNumber đã tồn tại chưa (có thể đã được tạo từ IPN)
        const existingOrderWithTempNumber = await Order.findOne({ orderNumber });
        if (existingOrderWithTempNumber) {
          console.log('[VNPay CreateOrder] Order with temp number already exists, deleting duplicate and using existing');
          // Xóa order vừa tạo (orderNumber tự động) vì đã có order với temp number
          await Order.deleteOne({ _id: order._id });
          // Sử dụng order đã tồn tại
          order = existingOrderWithTempNumber;
        } else {
          // Cập nhật orderNumber thành temp number từ VNPay
          // Cần kiểm tra unique trước khi update
          const checkUnique = await Order.findOne({ orderNumber });
          if (!checkUnique) {
            order.orderNumber = orderNumber;
            order.markModified('orderNumber');
            console.log('[VNPay CreateOrder] Updated orderNumber to:', orderNumber);
          } else {
            console.log('[VNPay CreateOrder] OrderNumber already exists, keeping auto-generated:', order.orderNumber);
          }
        }
      }
      
      // Cập nhật order với payment info
      order.paymentInfo.status = 'paid';
      order.paymentInfo.method = cartData.paymentMethod || 'vnpay';
      order.status = 'confirmed';
      
      order.markModified('paymentInfo');
      order.markModified('status');
      
      await order.save();

      console.log('[VNPay CreateOrder] Order created successfully:', order.orderNumber);

      return res.json({
        success: true,
        data: {
          order,
          message: 'Order đã được tạo thành công'
        }
      });
    } catch (error) {
      console.error('[VNPay CreateOrder] Error creating order:', error);
      throw new AppError(error.message || 'Không thể tạo order', 500);
    }
  })
};

