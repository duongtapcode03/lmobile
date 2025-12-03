import { cartService } from "./cart.service.js";

export const cartController = {
  // Lấy giỏ hàng
  getCart: async (req, res) => {
    try {
      const cart = await cartService.getCart(req.user.id);
      res.json({
        success: true,
        data: cart
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  // Thêm sản phẩm vào giỏ hàng (API mới - chỉ cần productId, quantity, và optional variantId)
  addToCart: async (req, res) => {
    try {
      const { productId, quantity = 1, variantId } = req.body;
      
      if (!productId) {
        return res.status(400).json({
          success: false,
          message: "Vui lòng chọn sản phẩm"
        });
      }

      if (quantity < 1) {
        return res.status(400).json({
          success: false,
          message: "Số lượng phải lớn hơn 0"
        });
      }

      const cart = await cartService.addToCart(req.user.id, {
        productId,
        quantity: parseInt(quantity, 10),
        variantId: variantId ? parseInt(variantId, 10) : undefined
      });

      res.json({
        success: true,
        message: "Thêm vào giỏ hàng thành công",
        data: cart
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  },

  // Cập nhật số lượng sản phẩm trong giỏ
  updateCartItem: async (req, res) => {
    try {
      const { itemId } = req.params;
      const { quantity } = req.body;

      if (!quantity || quantity < 1) {
        return res.status(400).json({
          success: false,
          message: "Số lượng phải lớn hơn 0"
        });
      }

      const cart = await cartService.updateCartItem(req.user.id, itemId, quantity);

      res.json({
        success: true,
        message: "Cập nhật giỏ hàng thành công",
        data: cart
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  },

  // Xóa sản phẩm khỏi giỏ hàng
  removeFromCart: async (req, res) => {
    try {
      const { itemId } = req.params;
      const cart = await cartService.removeFromCart(req.user.id, itemId);

      res.json({
        success: true,
        message: "Xóa sản phẩm khỏi giỏ hàng thành công",
        data: cart
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  },

  // Xóa tất cả sản phẩm khỏi giỏ hàng
  clearCart: async (req, res) => {
    try {
      const cart = await cartService.clearCart(req.user.id);

      res.json({
        success: true,
        message: "Xóa giỏ hàng thành công",
        data: cart
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  },

  // Cập nhật phí vận chuyển
  updateShippingFee: async (req, res) => {
    try {
      const { shippingFee } = req.body;

      if (shippingFee < 0) {
        return res.status(400).json({
          success: false,
          message: "Phí vận chuyển không được âm"
        });
      }

      const cart = await cartService.updateShippingFee(req.user.id, shippingFee);

      res.json({
        success: true,
        message: "Cập nhật phí vận chuyển thành công",
        data: cart
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  },

  // Áp dụng mã giảm giá
  applyCoupon: async (req, res) => {
    try {
      const { couponCode } = req.body;

      if (!couponCode) {
        return res.status(400).json({
          success: false,
          message: "Vui lòng nhập mã giảm giá"
        });
      }

      // Cart service sẽ tự validate và tính discountAmount
      const result = await cartService.applyCoupon(req.user.id, couponCode);

      res.json({
        success: true,
        message: result.message || "Áp dụng mã giảm giá thành công",
        data: {
          cart: result.cart,
          voucher: result.voucher,
          discountAmount: result.discountAmount,
          message: result.message
        }
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  },

  // Xóa mã giảm giá
  removeCoupon: async (req, res) => {
    try {
      const cart = await cartService.removeCoupon(req.user.id);

      res.json({
        success: true,
        message: "Xóa mã giảm giá thành công",
        data: cart
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  },

  // Đồng bộ giá sản phẩm trong giỏ
  syncCartPrices: async (req, res) => {
    try {
      const cart = await cartService.syncCartPrices(req.user.id);

      res.json({
        success: true,
        message: "Đồng bộ giá sản phẩm thành công",
        data: cart
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  },

  // Lấy thống kê giỏ hàng
  getCartStats: async (req, res) => {
    try {
      const stats = await cartService.getCartStats(req.user.id);

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

  // Tính phí vận chuyển
  calculateShippingFee: async (req, res) => {
    try {
      const { totalAmount, shippingMethod, province } = req.body;

      if (!totalAmount || totalAmount < 0) {
        return res.status(400).json({
          success: false,
          message: "Tổng tiền không hợp lệ"
        });
      }

      const shippingFee = cartService.calculateShippingFee(
        totalAmount, 
        shippingMethod, 
        province
      );

      res.json({
        success: true,
        data: {
          shippingFee,
          totalAmount,
          finalAmount: totalAmount + shippingFee
        }
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
};
