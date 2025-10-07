import { Order } from "./order.model.js";
import { Cart } from "../cart/cart.model.js";
import { Product } from "../product/product.model.js";
import { cartService } from "../cart/cart.service.js";

export const orderService = {
  // Tạo đơn hàng từ giỏ hàng
  async createOrderFromCart(userId, orderData) {
    const { 
      shippingAddress, 
      paymentMethod, 
      shippingMethod = "standard",
      notes = "",
      isGift = false,
      giftMessage = ""
    } = orderData;

    // Lấy giỏ hàng
    const cart = await cartService.getCart(userId);
    if (cart.isEmpty) {
      throw new Error("Giỏ hàng trống");
    }

    // Kiểm tra lại tồn kho và giá
    for (let item of cart.items) {
      const product = await Product.findById(item.product);
      if (!product || !product.isActive) {
        throw new Error(`Sản phẩm ${item.productName || 'không xác định'} không còn bán`);
      }

      if (product.stock < item.quantity) {
        throw new Error(`Sản phẩm ${product.name} không đủ hàng`);
      }

      // Cập nhật giá mới nhất
      item.price = product.price;
    }

    // Tính phí vận chuyển
    const shippingFee = cartService.calculateShippingFee(
      cart.totalAmount, 
      shippingMethod, 
      shippingAddress.province
    );

    // Tạo items cho đơn hàng
    const orderItems = cart.items.map(item => ({
      product: item.product,
      productName: item.product.name,
      productImage: item.product.thumbnail || "",
      quantity: item.quantity,
      variant: item.variant,
      price: item.price,
      totalPrice: item.price * item.quantity
    }));

    // Tính tổng tiền
    const subtotal = orderItems.reduce((total, item) => total + item.totalPrice, 0);
    const totalAmount = subtotal + shippingFee - cart.discountAmount;

    // Tạo đơn hàng
    const order = new Order({
      user: userId,
      items: orderItems,
      shippingAddress,
      paymentInfo: {
        method: paymentMethod,
        status: "pending"
      },
      subtotal,
      shippingFee,
      discountAmount: cart.discountAmount,
      couponCode: cart.couponCode,
      totalAmount,
      shippingMethod,
      notes,
      isGift,
      giftMessage,
      statusHistory: [{
        status: "pending",
        note: "Đơn hàng được tạo",
        updatedAt: new Date()
      }]
    });

    await order.save();

    // Cập nhật tồn kho sản phẩm
    for (let item of orderItems) {
      await Product.findByIdAndUpdate(
        item.product,
        { 
          $inc: { 
            stock: -item.quantity,
            sold: item.quantity 
          } 
        }
      );
    }

    // Xóa giỏ hàng sau khi tạo đơn hàng thành công
    await cartService.clearCart(userId);

    // Populate thông tin
    await order.populate([
      { path: "user", select: "name email phone" },
      { path: "items.product", select: "name thumbnail" }
    ]);

    return order;
  },

  // Lấy đơn hàng theo ID
  async getOrderById(orderId, userId) {
    const order = await Order.findOne({ 
      _id: orderId, 
      user: userId 
    }).populate([
      { path: "user", select: "name email phone" },
      { path: "items.product", select: "name thumbnail slug" }
    ]);

    if (!order) {
      throw new Error("Đơn hàng không tồn tại");
    }

    return order;
  },

  // Lấy đơn hàng theo orderNumber
  async getOrderByNumber(orderNumber, userId) {
    const order = await Order.findOne({ 
      orderNumber, 
      user: userId 
    }).populate([
      { path: "user", select: "name email phone" },
      { path: "items.product", select: "name thumbnail slug" }
    ]);

    if (!order) {
      throw new Error("Đơn hàng không tồn tại");
    }

    return order;
  },

  // Lấy tất cả đơn hàng của user
  async getUserOrders(userId, query = {}) {
    const {
      page = 1,
      limit = 10,
      status,
      sortBy = "createdAt",
      sortOrder = "desc"
    } = query;

    const filter = { user: userId };
    if (status) {
      filter.status = status;
    }

    const sort = {};
    sort[sortBy] = sortOrder === "desc" ? -1 : 1;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const orders = await Order.find(filter)
      .populate([
        { path: "user", select: "name email phone" },
        { path: "items.product", select: "name thumbnail slug" }
      ])
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Order.countDocuments(filter);

    return {
      orders,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    };
  },

  // Cập nhật trạng thái đơn hàng
  async updateOrderStatus(orderId, newStatus, userId, note = "") {
    const validStatuses = [
      "pending", "confirmed", "processing", 
      "shipping", "delivered", "cancelled", "returned"
    ];

    if (!validStatuses.includes(newStatus)) {
      throw new Error("Trạng thái không hợp lệ");
    }

    const order = await Order.findById(orderId);
    if (!order) {
      throw new Error("Đơn hàng không tồn tại");
    }

    // Kiểm tra quyền (user chỉ có thể hủy đơn hàng của mình)
    if (order.user.toString() !== userId && !["admin", "seller"].includes(userId.role)) {
      throw new Error("Không có quyền cập nhật đơn hàng này");
    }

    // Kiểm tra logic chuyển trạng thái
    if (newStatus === "cancelled" && !order.canCancel) {
      throw new Error("Không thể hủy đơn hàng ở trạng thái này");
    }

    const oldStatus = order.status;
    order.status = newStatus;

    // Cập nhật thời gian giao hàng
    if (newStatus === "delivered") {
      order.deliveredAt = new Date();
    }

    // Thêm vào lịch sử
    order.statusHistory.push({
      status: newStatus,
      note: note || `Chuyển từ ${oldStatus} sang ${newStatus}`,
      updatedAt: new Date()
    });

    await order.save();

    // Nếu hủy đơn hàng, hoàn lại tồn kho
    if (newStatus === "cancelled" && oldStatus !== "cancelled") {
      for (let item of order.items) {
        await Product.findByIdAndUpdate(
          item.product,
          { 
            $inc: { 
              stock: item.quantity,
              sold: -item.quantity 
            } 
          }
        );
      }
    }

    await order.populate([
      { path: "user", select: "name email phone" },
      { path: "items.product", select: "name thumbnail slug" }
    ]);

    return order;
  },

  // Cập nhật thông tin thanh toán
  async updatePaymentInfo(orderId, paymentData, userId) {
    const { status, transactionId } = paymentData;

    const order = await Order.findById(orderId);
    if (!order) {
      throw new Error("Đơn hàng không tồn tại");
    }

    if (order.user.toString() !== userId) {
      throw new Error("Không có quyền cập nhật đơn hàng này");
    }

    order.paymentInfo.status = status;
    if (transactionId) {
      order.paymentInfo.transactionId = transactionId;
    }

    if (status === "paid") {
      order.paymentInfo.paidAt = new Date();
    }

    await order.save();

    return order;
  },

  // Cập nhật tracking number
  async updateTrackingNumber(orderId, trackingNumber, userId) {
    const order = await Order.findById(orderId);
    if (!order) {
      throw new Error("Đơn hàng không tồn tại");
    }

    // Chỉ admin hoặc seller mới có thể cập nhật tracking
    if (!["admin", "seller"].includes(userId.role)) {
      throw new Error("Không có quyền cập nhật tracking");
    }

    order.trackingNumber = trackingNumber;
    order.status = "shipping";

    order.statusHistory.push({
      status: "shipping",
      note: `Cập nhật mã vận đơn: ${trackingNumber}`,
      updatedAt: new Date()
    });

    await order.save();

    return order;
  },

  // Lấy tất cả đơn hàng (Admin)
  async getAllOrders(query = {}) {
    const {
      page = 1,
      limit = 20,
      status,
      paymentStatus,
      search,
      sortBy = "createdAt",
      sortOrder = "desc"
    } = query;

    const filter = {};
    
    if (status) {
      filter.status = status;
    }

    if (paymentStatus) {
      filter["paymentInfo.status"] = paymentStatus;
    }

    if (search) {
      filter.$or = [
        { orderNumber: { $regex: search, $options: "i" } },
        { "shippingAddress.fullName": { $regex: search, $options: "i" } },
        { "shippingAddress.phone": { $regex: search, $options: "i" } }
      ];
    }

    const sort = {};
    sort[sortBy] = sortOrder === "desc" ? -1 : 1;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const orders = await Order.find(filter)
      .populate([
        { path: "user", select: "name email phone" },
        { path: "items.product", select: "name thumbnail slug" }
      ])
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Order.countDocuments(filter);

    return {
      orders,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    };
  },

  // Lấy thống kê đơn hàng
  async getOrderStats(userId = null) {
    const filter = userId ? { user: userId } : {};

    const stats = await Order.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: "$totalAmount" },
          pendingOrders: {
            $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] }
          },
          confirmedOrders: {
            $sum: { $cond: [{ $eq: ["$status", "confirmed"] }, 1, 0] }
          },
          shippingOrders: {
            $sum: { $cond: [{ $eq: ["$status", "shipping"] }, 1, 0] }
          },
          deliveredOrders: {
            $sum: { $cond: [{ $eq: ["$status", "delivered"] }, 1, 0] }
          },
          cancelledOrders: {
            $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] }
          }
        }
      }
    ]);

    return stats[0] || {
      totalOrders: 0,
      totalRevenue: 0,
      pendingOrders: 0,
      confirmedOrders: 0,
      shippingOrders: 0,
      deliveredOrders: 0,
      cancelledOrders: 0
    };
  },

  // Hủy đơn hàng
  async cancelOrder(orderId, userId, reason = "") {
    return this.updateOrderStatus(orderId, "cancelled", userId, reason);
  },

  // Xác nhận đơn hàng (Admin/Seller)
  async confirmOrder(orderId, userId) {
    return this.updateOrderStatus(orderId, "confirmed", userId, "Đơn hàng đã được xác nhận");
  },

  // Đánh dấu đã giao hàng
  async markAsDelivered(orderId, userId) {
    return this.updateOrderStatus(orderId, "delivered", userId, "Đơn hàng đã được giao");
  }
};
