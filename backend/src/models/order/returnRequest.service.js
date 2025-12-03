import { ReturnRequest } from "./returnRequest.model.js";
import { Order } from "./order.model.js";
import { Product } from "../product/product.model.js";
import { VoucherUsage } from "../voucher/voucherUsage.model.js";
import { voucherIntegrationService } from "../voucher/voucherIntegration.service.js";

export const returnRequestService = {
  /**
   * Tính toán refund amount chính xác
   * @param {Object} params - Thông tin để tính toán
   * @param {Object} params.order - Order object
   * @param {Number} params.totalReturnItemsPrice - Tổng giá trị sản phẩm được hoàn
   * @param {Number} params.totalReturnItemsQuantity - Tổng số lượng sản phẩm được hoàn
   * @param {Number} params.totalOrderItemsQuantity - Tổng số lượng sản phẩm trong đơn hàng
   * @returns {Object} - Thông tin tính toán refund
   */
  calculateRefundAmount({ order, totalReturnItemsPrice, totalReturnItemsQuantity, totalOrderItemsQuantity }) {
    // Tỷ lệ hoàn (0-1): số lượng hoàn / tổng số lượng đơn hàng
    const returnRatio = totalOrderItemsQuantity > 0 
      ? totalReturnItemsQuantity / totalOrderItemsQuantity 
      : 0;

    // 1. Tính giá trị sản phẩm được hoàn
    const returnItemsSubtotal = totalReturnItemsPrice;

    // 2. Tính lại discount theo tỷ lệ hoàn (nếu hoàn một phần)
    // Nếu hoàn toàn bộ (returnRatio = 1), hoàn toàn bộ discount
    // Nếu hoàn một phần, tính discount theo tỷ lệ
    let returnDiscountAmount = 0;
    if (order.discountAmount && order.discountAmount > 0) {
      // Tính discount theo tỷ lệ giá trị sản phẩm
      const itemsValueRatio = order.subtotal > 0 
        ? returnItemsSubtotal / order.subtotal 
        : 0;
      returnDiscountAmount = Math.round(order.discountAmount * itemsValueRatio);
    }

    // 3. Tính lại shipping fee (nếu hoàn một phần)
    // Policy: Nếu hoàn toàn bộ đơn hàng, không trừ shipping fee
    // Nếu hoàn một phần, có thể trừ một phần shipping fee (tùy policy)
    let returnShippingFee = 0;
    const RETURN_SHIPPING_POLICY = {
      FULL_RETURN: 'full_return', // Hoàn toàn bộ: không trừ shipping
      PARTIAL_RETURN: 'partial_return', // Hoàn một phần: trừ shipping theo tỷ lệ
      NO_REFUND: 'no_refund' // Không hoàn shipping fee
    };
    
    // Mặc định: Nếu hoàn toàn bộ (returnRatio >= 0.95), không trừ shipping
    // Nếu hoàn một phần, trừ shipping theo tỷ lệ (có thể điều chỉnh policy)
    const shippingPolicy = returnRatio >= 0.95 
      ? RETURN_SHIPPING_POLICY.FULL_RETURN 
      : RETURN_SHIPPING_POLICY.PARTIAL_RETURN;

    if (shippingPolicy === RETURN_SHIPPING_POLICY.PARTIAL_RETURN && order.shippingFee > 0) {
      // Trừ shipping fee theo tỷ lệ (có thể điều chỉnh: trừ 50% hoặc 100%)
      const shippingDeductionRatio = 0.5; // Trừ 50% shipping fee khi hoàn một phần
      returnShippingFee = Math.round(order.shippingFee * returnRatio * shippingDeductionRatio);
    }

    // 4. Restocking fee (phí xử lý hoàn hàng) - tùy chọn
    // Có thể tính dựa trên lý do hoàn hoặc giá trị đơn hàng
    const RESTOCKING_FEE_RATIO = 0.05; // 5% của giá trị sản phẩm hoàn (có thể điều chỉnh)
    const restockingFee = Math.round(returnItemsSubtotal * RESTOCKING_FEE_RATIO);

    // 5. Tính tổng refund amount
    // Refund = Giá sản phẩm + Discount (theo tỷ lệ) - Shipping fee (nếu có) - Restocking fee
    const totalRefundAmount = Math.max(0, 
      returnItemsSubtotal + 
      returnDiscountAmount - 
      returnShippingFee - 
      restockingFee
    );

    return {
      returnItemsSubtotal,        // Giá trị sản phẩm được hoàn
      returnDiscountAmount,       // Discount được hoàn (theo tỷ lệ)
      returnShippingFee,          // Shipping fee bị trừ (nếu có)
      restockingFee,              // Phí xử lý hoàn hàng
      totalRefundAmount,          // Tổng số tiền được hoàn
      returnRatio,                // Tỷ lệ hoàn (0-1)
      isFullReturn: returnRatio >= 0.95, // Có phải hoàn toàn bộ không
      shippingPolicy               // Policy xử lý shipping fee
    };
  },

  /**
   * Tạo yêu cầu hoàn hàng
   */
  async createReturnRequest(userId, orderId, returnData) {
    const { items, customerNote } = returnData;

    // Kiểm tra order tồn tại và thuộc về user
    const order = await Order.findById(orderId);
    if (!order) {
      throw new Error("Đơn hàng không tồn tại");
    }

    if (order.user.toString() !== userId.toString()) {
      throw new Error("Bạn không có quyền hoàn hàng cho đơn hàng này");
    }

    // Kiểm tra order đã được giao chưa
    if (order.status !== "delivered") {
      throw new Error("Chỉ có thể hoàn hàng cho đơn hàng đã được giao");
    }

    // Kiểm tra thời gian (7 ngày từ khi giao hàng)
    if (!order.deliveredAt) {
      throw new Error("Không thể xác định thời gian giao hàng");
    }

    const daysSinceDelivery = (Date.now() - order.deliveredAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceDelivery > 7) {
      throw new Error("Chỉ có thể hoàn hàng trong vòng 7 ngày kể từ khi nhận hàng");
    }

    // Kiểm tra đã có return request chưa
    const existingRequest = await ReturnRequest.findOne({
      order: orderId,
      status: { $in: ["pending", "approved", "processing"] }
    });

    if (existingRequest) {
      throw new Error("Đã có yêu cầu hoàn hàng đang được xử lý cho đơn hàng này");
    }

    // Validate items
    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new Error("Vui lòng chọn ít nhất một sản phẩm để hoàn");
    }

    // Validate từng item
    const returnItems = [];
    let totalReturnItemsPrice = 0; // Tổng giá trị sản phẩm được hoàn
    let totalReturnItemsQuantity = 0; // Tổng số lượng sản phẩm được hoàn
    let totalOrderItemsQuantity = 0; // Tổng số lượng sản phẩm trong đơn hàng

    // Tính tổng số lượng sản phẩm trong đơn hàng
    for (const orderItem of order.items) {
      totalOrderItemsQuantity += orderItem.quantity || 0;
    }

    for (const item of items) {
      // Tìm item trong order
      const orderItem = order.items.find(
        oi => oi.product === item.productId && 
              (!item.variantId || oi.variant?._id === item.variantId)
      );

      if (!orderItem) {
        throw new Error(`Sản phẩm ${item.productId} không có trong đơn hàng`);
      }

      // Kiểm tra số lượng
      if (item.quantity > orderItem.quantity) {
        throw new Error(`Số lượng hoàn không được vượt quá số lượng đã mua (${orderItem.quantity})`);
      }

      // Kiểm tra lý do
      if (!item.reason) {
        throw new Error("Vui lòng chọn lý do hoàn hàng");
      }

      returnItems.push({
        product: item.productId,
        productName: orderItem.productName,
        quantity: item.quantity,
        price: orderItem.price,
        reason: item.reason,
        reasonDetail: item.reasonDetail || ""
      });

      totalReturnItemsPrice += orderItem.price * item.quantity;
      totalReturnItemsQuantity += item.quantity;
    }

    // Tính toán refund amount chính xác
    const refundCalculation = this.calculateRefundAmount({
      order,
      totalReturnItemsPrice,
      totalReturnItemsQuantity,
      totalOrderItemsQuantity
    });

    // Tạo return request
    const returnRequest = new ReturnRequest({
      order: orderId,
      orderNumber: order.orderNumber,
      user: userId,
      items: returnItems,
      refundAmount: refundCalculation.totalRefundAmount,
      refundMethod: "original", // Mặc định hoàn về phương thức thanh toán gốc
      customerNote: customerNote || "",
      status: "pending",
      statusHistory: [{
        status: "pending",
        updatedAt: new Date()
      }],
      // Lưu thông tin tính toán chi tiết (sẽ được lưu vào refundCalculation field)
      refundCalculation: refundCalculation
    });

    await returnRequest.save();

    return returnRequest;
  },

  /**
   * Lấy danh sách return requests của user
   */
  async getMyReturnRequests(userId, query = {}) {
    const { page = 1, limit = 10, status } = query;

    const filter = { user: userId };
    if (status) {
      filter.status = status;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [returnRequests, total] = await Promise.all([
      ReturnRequest.find(filter)
        .populate("order", "orderNumber status totalAmount deliveredAt")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      ReturnRequest.countDocuments(filter)
    ]);

    return {
      items: returnRequests,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    };
  },

  /**
   * Lấy chi tiết return request
   */
  async getReturnRequestById(returnRequestId, userId = null) {
    const filter = { _id: returnRequestId };
    if (userId) {
      filter.user = userId; // Nếu có userId, chỉ lấy của user đó
    }

    const returnRequest = await ReturnRequest.findOne(filter)
      .populate("order")
      .populate("user", "name email phone")
      .lean();

    if (!returnRequest) {
      throw new Error("Yêu cầu hoàn hàng không tồn tại");
    }

    return returnRequest;
  },

  /**
   * Admin: Duyệt yêu cầu hoàn hàng
   */
  async approveReturnRequest(returnRequestId, adminId, adminNote = "") {
    const returnRequest = await ReturnRequest.findById(returnRequestId)
      .populate("order");

    if (!returnRequest) {
      throw new Error("Yêu cầu hoàn hàng không tồn tại");
    }

    if (returnRequest.status !== "pending") {
      throw new Error(`Yêu cầu đã ở trạng thái: ${returnRequest.status}`);
    }

    // Cập nhật trạng thái
    returnRequest.status = "approved";
    returnRequest.adminNote = adminNote;
    returnRequest.statusHistory.push({
      status: "approved",
      note: adminNote,
      updatedBy: adminId,
      updatedAt: new Date()
    });

    await returnRequest.save();

    return returnRequest;
  },

  /**
   * Admin: Từ chối yêu cầu hoàn hàng
   */
  async rejectReturnRequest(returnRequestId, adminId, adminNote = "") {
    const returnRequest = await ReturnRequest.findById(returnRequestId);

    if (!returnRequest) {
      throw new Error("Yêu cầu hoàn hàng không tồn tại");
    }

    if (returnRequest.status !== "pending") {
      throw new Error(`Yêu cầu đã ở trạng thái: ${returnRequest.status}`);
    }

    // Cập nhật trạng thái
    returnRequest.status = "rejected";
    returnRequest.adminNote = adminNote;
    returnRequest.statusHistory.push({
      status: "rejected",
      note: adminNote,
      updatedBy: adminId,
      updatedAt: new Date()
    });

    await returnRequest.save();

    return returnRequest;
  },

  /**
   * Admin: Xác nhận đã nhận hàng và bắt đầu xử lý hoàn tiền
   */
  async processReturnRequest(returnRequestId, adminId, adminNote = "") {
    const returnRequest = await ReturnRequest.findById(returnRequestId)
      .populate("order");

    if (!returnRequest) {
      throw new Error("Yêu cầu hoàn hàng không tồn tại");
    }

    if (returnRequest.status !== "approved") {
      throw new Error(`Yêu cầu phải ở trạng thái "approved" để xử lý`);
    }

    const order = returnRequest.order;

    // Cập nhật stock cho các sản phẩm được hoàn
    for (const item of returnRequest.items) {
      await Product.findOneAndUpdate(
        { _id: item.product },
        { $inc: { stock: item.quantity } }
      );
    }

    // Cập nhật trạng thái order
    order.status = "returned";
    order.statusHistory.push({
      status: "returned",
      note: `Hoàn hàng: ${returnRequest.items.length} sản phẩm`,
      updatedAt: new Date()
    });
    await order.save();

    // Cập nhật trạng thái return request
    returnRequest.status = "processing";
    returnRequest.refundStatus = "processing";
    returnRequest.adminNote = adminNote;
    returnRequest.statusHistory.push({
      status: "processing",
      note: adminNote,
      updatedBy: adminId,
      updatedAt: new Date()
    });

    await returnRequest.save();

    return returnRequest;
  },

  /**
   * Admin: Hoàn thành hoàn tiền
   */
  async completeReturnRequest(returnRequestId, adminId, refundData = {}) {
    const { refundTransactionId, adminNote } = refundData;

    const returnRequest = await ReturnRequest.findById(returnRequestId)
      .populate("order");

    if (!returnRequest) {
      throw new Error("Yêu cầu hoàn hàng không tồn tại");
    }

    if (returnRequest.status !== "processing") {
      throw new Error(`Yêu cầu phải ở trạng thái "processing" để hoàn thành`);
    }

    const order = returnRequest.order;

    // Xử lý hoàn tiền (tùy vào payment method)
    // TODO: Implement actual refund logic based on payment method
    // Ví dụ: Nếu là MoMo, gọi API refund của MoMo
    // Nếu là COD, có thể hoàn bằng store credit hoặc bank transfer

    // Cập nhật payment info của order
    if (order.paymentInfo) {
      order.paymentInfo.status = "refunded";
      order.paymentInfo.refundedAt = new Date();
      await order.save();
    }

    // Cập nhật trạng thái return request
    returnRequest.status = "completed";
    returnRequest.refundStatus = "completed";
    returnRequest.refundedAt = new Date();
    returnRequest.refundTransactionId = refundTransactionId || "";
    returnRequest.adminNote = adminNote || returnRequest.adminNote;
    returnRequest.statusHistory.push({
      status: "completed",
      note: adminNote || "Hoàn tiền thành công",
      updatedBy: adminId,
      updatedAt: new Date()
    });

    await returnRequest.save();

    // Rollback voucher usage nếu có
    if (order.couponCode) {
      try {
        await voucherIntegrationService.rollbackVoucherUsageByOrder(order._id);
      } catch (error) {
        console.error(`[ReturnRequest] Error rolling back voucher:`, error);
        // Không throw error, chỉ log
      }
    }

    return returnRequest;
  },

  /**
   * Admin: Lấy tất cả return requests (với filter)
   */
  async getAllReturnRequests(query = {}) {
    const { page = 1, limit = 20, status, orderNumber } = query;

    const filter = {};
    if (status) {
      filter.status = status;
    }
    if (orderNumber) {
      filter.orderNumber = orderNumber;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [returnRequests, total] = await Promise.all([
      ReturnRequest.find(filter)
        .populate("order", "orderNumber status totalAmount deliveredAt")
        .populate("user", "name email phone")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      ReturnRequest.countDocuments(filter)
    ]);

    return {
      items: returnRequests,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    };
  },

  /**
   * User: Hủy yêu cầu hoàn hàng (chỉ khi pending)
   */
  async cancelReturnRequest(returnRequestId, userId) {
    const returnRequest = await ReturnRequest.findOne({
      _id: returnRequestId,
      user: userId
    });

    if (!returnRequest) {
      throw new Error("Yêu cầu hoàn hàng không tồn tại");
    }

    if (returnRequest.status !== "pending") {
      throw new Error("Chỉ có thể hủy yêu cầu đang chờ xử lý");
    }

    returnRequest.status = "cancelled";
    returnRequest.statusHistory.push({
      status: "cancelled",
      note: "Người dùng hủy yêu cầu",
      updatedAt: new Date()
    });

    await returnRequest.save();

    return returnRequest;
  }
};

