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
    const productMap = new Map(); // Lưu product info để dùng sau
    for (let item of cart.items) {
      // Đảm bảo product ID là Number
      const productId = typeof item.product === 'number' 
        ? item.product 
        : (typeof item.product === 'object' ? item.product._id : parseInt(item.product, 10));
      
      if (isNaN(productId)) {
        throw new Error(`Product ID không hợp lệ: ${item.product}`);
      }

      const product = await Product.findOne({ _id: productId });
      if (!product || !product.isActive) {
        throw new Error(`Sản phẩm ${item.productName || 'không xác định'} không còn bán`);
      }

      if (product.stock < item.quantity) {
        throw new Error(`Sản phẩm ${product.name} không đủ hàng`);
      }

      // Cập nhật giá mới nhất
      item.price = product.priceNumber || product.price;
      // Lưu product info để dùng khi tạo order items (sử dụng Number ID làm key)
      productMap.set(productId, product);
    }

    // Tính phí vận chuyển
    const shippingFee = cartService.calculateShippingFee(
      cart.totalAmount, 
      shippingMethod, 
      shippingAddress.province
    );

    // Tạo items cho đơn hàng
    const orderItems = cart.items.map(item => {
      // item.product có thể là Number ID hoặc Product object (đã populate)
      const productId = typeof item.product === 'number' 
        ? item.product 
        : (typeof item.product === 'object' ? item.product._id : parseInt(item.product, 10));
      
      // Lấy product từ Map (đảm bảo sử dụng Number ID)
      const product = productMap.get(productId) || (typeof item.product === 'object' ? item.product : null);
      
      if (!product) {
        throw new Error(`Không tìm thấy thông tin sản phẩm với ID: ${productId}`);
      }
      
      return {
        product: productId,
        productName: product.name || 'Sản phẩm không xác định',
        productImage: product.thumbnail || "",
        quantity: item.quantity,
        variant: item.variant,
        price: item.price,
        importPrice: product.importPrice || 0, // Lấy importPrice từ product
        totalPrice: item.price * item.quantity
      };
    });

    // Tính tổng tiền
    const subtotal = orderItems.reduce((total, item) => total + item.totalPrice, 0);
    const totalAmount = subtotal + shippingFee - cart.discountAmount;

    // Tạo orderNumber tự động (đảm bảo unique)
    let orderNumber;
    let isUnique = false;
    let attempts = 0;
    while (!isUnique && attempts < 10) {
      const timestamp = Date.now().toString().slice(-8);
      const random = Math.random().toString(36).substr(2, 4).toUpperCase();
      orderNumber = `ORD-${timestamp}-${random}`;
      
      // Kiểm tra xem orderNumber đã tồn tại chưa
      const existingOrder = await Order.findOne({ orderNumber });
      if (!existingOrder) {
        isUnique = true;
      }
      attempts++;
    }
    
    if (!isUnique) {
      throw new Error("Không thể tạo orderNumber, vui lòng thử lại");
    }

    // Tạo đơn hàng
    const order = new Order({
      orderNumber, // Tự tạo orderNumber trước khi save
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

    // Cập nhật tồn kho sản phẩm (chỉ giảm stock, chưa tăng sold)
    // sold sẽ được cập nhật khi đơn hàng chuyển sang trạng thái "delivered"
    for (let item of orderItems) {
      await Product.findOneAndUpdate(
        { _id: item.product },
        { 
          $inc: { 
            stock: -item.quantity
          } 
        }
      );
    }

    // Xóa giỏ hàng sau khi tạo đơn hàng thành công
    await cartService.clearCart(userId);

    // Populate thông tin (chỉ populate user, không populate items.product vì Product dùng Number ID)
    await order.populate([
      { path: "user", select: "name email phone" }
    ]);

    return order;
  },

  // Lấy đơn hàng theo ID
  async getOrderById(orderId, userId, userRole = null) {
    // Admin và Seller có thể xem bất kỳ đơn hàng nào
    const filter = { _id: orderId };
    if (!["admin", "seller"].includes(userRole)) {
      filter.user = userId;
    }

    const order = await Order.findOne(filter).populate([
      { path: "user", select: "name email phone" }
      // Không populate items.product vì Product dùng Number ID
    ]);

    if (!order) {
      throw new Error("Đơn hàng không tồn tại");
    }

    // Populate importPrice từ product hiện tại cho các order items thiếu importPrice
    if (order.items && order.items.length > 0) {
      const productIds = order.items
        .filter(item => !item.importPrice || item.importPrice === 0)
        .map(item => {
          // Đảm bảo product ID là Number
          const productId = typeof item.product === 'number' ? item.product : parseInt(item.product, 10);
          return isNaN(productId) ? null : productId;
        })
        .filter(id => id !== null);
      
      if (productIds.length > 0) {
        const products = await Product.find({ _id: { $in: productIds } })
          .select("_id importPrice");
        
        const productMap = new Map();
        products.forEach(p => {
          // Đảm bảo _id là Number khi set vào Map
          const productId = typeof p._id === 'number' ? p._id : parseInt(p._id, 10);
          productMap.set(productId, p.importPrice || 0);
        });
        
        // Cập nhật importPrice cho các items thiếu (chỉ trong memory, không save)
        order.items.forEach(item => {
          if (!item.importPrice || item.importPrice === 0) {
            const productId = typeof item.product === 'number' ? item.product : parseInt(item.product, 10);
            if (!isNaN(productId) && productMap.has(productId)) {
              item.importPrice = productMap.get(productId);
            }
          }
        });
      }
    }

    return order;
  },

  // Lấy đơn hàng theo orderNumber
  async getOrderByNumber(orderNumber, userId) {
    const order = await Order.findOne({ 
      orderNumber, 
      user: userId 
    }).populate([
      { path: "user", select: "name email phone" }
      // Không populate items.product vì Product dùng Number ID
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
        { path: "user", select: "name email phone" }
        // Không populate items.product vì Product dùng Number ID
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
  async updateOrderStatus(orderId, newStatus, userId, userRole = null, note = "") {
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

    // Kiểm tra quyền (admin và seller có thể cập nhật bất kỳ đơn hàng nào)
    if (!["admin", "seller"].includes(userRole)) {
      // User thường chỉ có thể cập nhật đơn hàng của mình
      if (order.user.toString() !== userId.toString()) {
        throw new Error("Không có quyền cập nhật đơn hàng này");
      }
    }

    // Kiểm tra logic chuyển trạng thái
    if (newStatus === "cancelled" && !order.canCancel) {
      throw new Error("Không thể hủy đơn hàng ở trạng thái này");
    }

    const oldStatus = order.status;
    order.status = newStatus;

    // Cập nhật thời gian giao hàng và trạng thái thanh toán
    if (newStatus === "delivered") {
      order.deliveredAt = new Date();
      
      // Tự động cập nhật trạng thái thanh toán thành "paid" khi giao hàng thành công
      // Đặc biệt quan trọng với COD (thanh toán khi nhận hàng)
      if (order.paymentInfo.status === "pending") {
        order.paymentInfo.status = "paid";
        order.paymentInfo.paidAt = new Date();
      }

      // Cập nhật số lượng đã bán (sold) của sản phẩm khi đơn hàng được giao
      // Chỉ cập nhật nếu đơn hàng chưa được giao trước đó (tránh cập nhật trùng lặp)
      if (oldStatus !== "delivered") {
        for (let item of order.items) {
          await Product.findOneAndUpdate(
            { _id: item.product },
            { 
              $inc: { 
                sold: item.quantity 
              } 
            }
          );
        }
      }
    }

    // Thêm vào lịch sử
    order.statusHistory.push({
      status: newStatus,
      note: note || `Chuyển từ ${oldStatus} sang ${newStatus}`,
      updatedAt: new Date()
    });

    await order.save();

    // Xử lý cập nhật stock và sold khi thay đổi trạng thái
    if (newStatus === "cancelled" || newStatus === "returned") {
      // Nếu đơn hàng đã được giao trước đó, cần giảm sold và hoàn lại stock
      if (oldStatus === "delivered") {
        for (let item of order.items) {
          await Product.findOneAndUpdate(
            { _id: item.product },
            { 
              $inc: { 
                sold: -item.quantity,
                stock: item.quantity // Hoàn lại tồn kho
              } 
            }
          );
        }
      } 
      // Nếu đơn hàng chưa được giao, chỉ hoàn lại stock (không giảm sold vì chưa tăng)
      else if (oldStatus !== "cancelled" && oldStatus !== "returned") {
        for (let item of order.items) {
          await Product.findOneAndUpdate(
            { _id: item.product },
            { 
              $inc: { 
                stock: item.quantity
              } 
            }
          );
        }
      }
    }

    // Populate thông tin (chỉ populate user, không populate items.product vì Product dùng Number ID)
    await order.populate([
      { path: "user", select: "name email phone" }
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
        { path: "user", select: "name email phone" }
        // Không populate items.product vì Product dùng Number ID
      ])
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    // Populate importPrice từ product hiện tại cho các order items thiếu importPrice
    // Thu thập tất cả productIds từ tất cả orders để query một lần (tối ưu performance)
    const allProductIds = new Set();
    for (let order of orders) {
      if (order.items && order.items.length > 0) {
        order.items.forEach(item => {
          if (!item.importPrice || item.importPrice === 0) {
            const productId = typeof item.product === 'number' ? item.product : parseInt(item.product, 10);
            if (!isNaN(productId)) {
              allProductIds.add(productId);
            }
          }
        });
      }
    }
    
    // Query tất cả products một lần
    if (allProductIds.size > 0) {
      const productIdsArray = Array.from(allProductIds);
      const products = await Product.find({ _id: { $in: productIdsArray } })
        .select("_id importPrice");
      
      const productMap = new Map();
      products.forEach(p => {
        const productId = typeof p._id === 'number' ? p._id : parseInt(p._id, 10);
        productMap.set(productId, p.importPrice || 0);
      });
      
      // Cập nhật importPrice cho tất cả items thiếu
      for (let order of orders) {
        if (order.items && order.items.length > 0) {
          order.items.forEach(item => {
            if (!item.importPrice || item.importPrice === 0) {
              const productId = typeof item.product === 'number' ? item.product : parseInt(item.product, 10);
              if (!isNaN(productId) && productMap.has(productId)) {
                item.importPrice = productMap.get(productId);
              }
            }
          });
        }
      }
    }

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
  async cancelOrder(orderId, userId, userRole = null, reason = "") {
    return this.updateOrderStatus(orderId, "cancelled", userId, userRole, reason);
  },

  // Xác nhận đơn hàng (Admin/Seller)
  async confirmOrder(orderId, user) {
    const userId = typeof user === 'string' ? user : user.id;
    const userRole = typeof user === 'object' ? user.role : null;
    return this.updateOrderStatus(orderId, "confirmed", userId, userRole, "Đơn hàng đã được xác nhận");
  },

  // Đánh dấu đã giao hàng
  async markAsDelivered(orderId, user) {
    const userId = typeof user === 'string' ? user : user.id;
    const userRole = typeof user === 'object' ? user.role : null;
    return this.updateOrderStatus(orderId, "delivered", userId, userRole, "Đơn hàng đã được giao");
  }
};
