import { orderService } from "./order.service.js";
import { Order } from "./order.model.js";

export const orderController = {
  // Tạo đơn hàng từ giỏ hàng
  createFromCart: async (req, res) => {
    try {
      const { 
        shippingAddress, 
        paymentMethod, 
        shippingMethod,
        notes,
        isGift,
        giftMessage
      } = req.body;

      // Validate dữ liệu đầu vào
      if (!shippingAddress || !shippingAddress.fullName || !shippingAddress.phone || !shippingAddress.address) {
        return res.status(400).json({
          success: false,
          message: "Vui lòng điền đầy đủ thông tin giao hàng"
        });
      }

      if (!paymentMethod) {
        return res.status(400).json({
          success: false,
          message: "Vui lòng chọn phương thức thanh toán"
        });
      }

      const order = await orderService.createOrderFromCart(req.user.id, {
        shippingAddress,
        paymentMethod,
        shippingMethod,
        notes,
        isGift,
        giftMessage
      });

      res.status(201).json({
        success: true,
        message: "Tạo đơn hàng thành công",
        data: order
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  },

  // Lấy đơn hàng theo ID
  getById: async (req, res) => {
    try {
      const order = await orderService.getOrderById(req.params.id, req.user.id, req.user.role);
      res.json({
        success: true,
        data: order
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        message: error.message
      });
    }
  },

  // Lấy đơn hàng theo orderNumber
  getByNumber: async (req, res) => {
    try {
      const order = await orderService.getOrderByNumber(req.params.orderNumber, req.user.id);
      res.json({
        success: true,
        data: order
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        message: error.message
      });
    }
  },

  // Lấy tất cả đơn hàng của user
  getUserOrders: async (req, res) => {
    try {
      const result = await orderService.getUserOrders(req.user.id, req.query);
      res.json({
        success: true,
        data: result.orders,
        pagination: result.pagination
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  // Cập nhật trạng thái đơn hàng
  updateStatus: async (req, res) => {
    try {
      const { orderId } = req.params;
      const { status, note } = req.body;

      if (!status) {
        return res.status(400).json({
          success: false,
          message: "Vui lòng chọn trạng thái"
        });
      }

      const order = await orderService.updateOrderStatus(orderId, status, req.user.id, req.user.role, note);

      res.json({
        success: true,
        message: "Cập nhật trạng thái đơn hàng thành công",
        data: order
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  },

  // Cập nhật thông tin thanh toán
  updatePaymentInfo: async (req, res) => {
    try {
      const { orderId } = req.params;
      const { status, transactionId } = req.body;

      if (!status) {
        return res.status(400).json({
          success: false,
          message: "Vui lòng chọn trạng thái thanh toán"
        });
      }

      const order = await orderService.updatePaymentInfo(orderId, { status, transactionId }, req.user.id);

      res.json({
        success: true,
        message: "Cập nhật thông tin thanh toán thành công",
        data: order
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  },

  // Cập nhật tracking number
  updateTracking: async (req, res) => {
    try {
      const { orderId } = req.params;
      const { trackingNumber } = req.body;

      if (!trackingNumber) {
        return res.status(400).json({
          success: false,
          message: "Vui lòng nhập mã vận đơn"
        });
      }

      const order = await orderService.updateTrackingNumber(orderId, trackingNumber, req.user);

      res.json({
        success: true,
        message: "Cập nhật mã vận đơn thành công",
        data: order
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  },

  // Hủy đơn hàng
  cancelOrder: async (req, res) => {
    try {
      const { orderId } = req.params;
      const { reason } = req.body;

      const order = await orderService.cancelOrder(orderId, req.user.id, req.user.role, reason);

      res.json({
        success: true,
        message: "Hủy đơn hàng thành công",
        data: order
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  },

  // Xác nhận đơn hàng (Admin/Seller)
  confirmOrder: async (req, res) => {
    try {
      const { orderId } = req.params;
      const order = await orderService.confirmOrder(orderId, req.user);

      res.json({
        success: true,
        message: "Xác nhận đơn hàng thành công",
        data: order
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  },

  // Đánh dấu đã giao hàng
  markAsDelivered: async (req, res) => {
    try {
      const { orderId } = req.params;
      const order = await orderService.markAsDelivered(orderId, req.user);

      res.json({
        success: true,
        message: "Đánh dấu đã giao hàng thành công",
        data: order
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  },

  // Lấy tất cả đơn hàng (Admin)
  getAllOrders: async (req, res) => {
    try {
      const result = await orderService.getAllOrders(req.query);
      res.json({
        success: true,
        data: result.orders,
        pagination: result.pagination
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  // Lấy thống kê đơn hàng
  getStats: async (req, res) => {
    try {
      // Nếu là admin, lấy thống kê tổng quan
      // Nếu là user thường, lấy thống kê của user đó
      const userId = req.user.role === "admin" ? null : req.user.id;
      const stats = await orderService.getOrderStats(userId);

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  // Tìm kiếm đơn hàng theo orderNumber (Public)
  searchByOrderNumber: async (req, res) => {
    try {
      const { orderNumber } = req.params;
      const { phone } = req.query;

      if (!phone) {
        return res.status(400).json({
          success: false,
          message: "Vui lòng nhập số điện thoại để tra cứu"
        });
      }

      const order = await Order.findOne({ 
        orderNumber,
        "shippingAddress.phone": phone
      }).populate([
        { path: "user", select: "name email phone" },
        { path: "items.product", select: "name thumbnail slug" }
      ]);

      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy đơn hàng"
        });
      }

      res.json({
        success: true,
        data: order
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
};
