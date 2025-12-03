import { voucherValidationService, VOUCHER_ERROR_CODES } from "./voucherValidation.service.js";
import { voucherCalculationService } from "./voucherCalculation.service.js";
import { voucherConcurrencyService } from "./voucherConcurrency.service.js";
import { Voucher } from "./voucher.model.js";
import { VoucherUsage } from "./voucherUsage.model.js";

/**
 * Voucher Integration Service
 * Service chính tích hợp tất cả các chức năng voucher
 * Sử dụng trong cart và order flow
 */
export const voucherIntegrationService = {
  /**
   * Apply voucher vào cart (Phase: Apply)
   * @param {string} code - Voucher code
   * @param {string} userId - User ID
   * @param {Array} cartItems - Cart items
   * @param {number} orderAmount - Order amount (subtotal)
   * @param {number} shippingFee - Shipping fee
   * @param {string} cartId - Cart ID (optional, để tạo temporary order reference)
   * @returns {Object} Result với discount info và usageId
   */
  async applyVoucherToCart(code, userId, cartItems, orderAmount, shippingFee = 0, cartId = null) {
    try {
      // 1. Validate voucher
      const validation = await voucherValidationService.validateVoucher(
        code,
        userId,
        cartItems,
        orderAmount,
        { skipUserCheck: false }
      );

      if (!validation.valid) {
        return {
          success: false,
          errorCode: validation.errorCode,
          message: validation.message
        };
      }

      const voucher = validation.voucher;

      // 2. Kiểm tra xem user đã có pending usage với voucher này chưa
      // Nếu có, rollback usage cũ trước (trường hợp user apply lại)
      const existingPendingUsage = await VoucherUsage.findOne({
        user: userId,
        voucher: voucher._id,
        voucherCode: code.toUpperCase(),
        status: "pending"
      });

      if (existingPendingUsage) {
        // Rollback usage cũ
        await voucherConcurrencyService.rollbackVoucherUsage(
          existingPendingUsage._id,
          "reapplied"
        );
      }

      // 3. Lock và reserve voucher usage (tạo pending VoucherUsage và cập nhật usedCount)
      // Sử dụng cartId hoặc tạo temporary orderId
      const tempOrderId = cartId || `CART-${userId}-${Date.now()}`;
      const lockResult = await voucherConcurrencyService.lockVoucherUsage(
        voucher._id,
        userId,
        tempOrderId
      );

      if (!lockResult.success) {
        return {
          success: false,
          errorCode: VOUCHER_ERROR_CODES.CONCURRENCY_ERROR,
          message: lockResult.error || "Voucher đã hết lượt sử dụng hoặc bạn đã sử dụng voucher này"
        };
      }

      // 4. Calculate discount
      const calculation = voucherCalculationService.calculateDiscount(
        voucher,
        orderAmount,
        shippingFee
      );

      return {
        success: true,
        voucher: {
          code: voucher.code,
          name: voucher.name,
          type: voucher.type,
          value: voucher.value
        },
        discountAmount: calculation.discountAmount,
        discountPercent: calculation.discountPercent,
        freeShipping: calculation.freeShipping,
        finalPrice: calculation.finalPrice,
        totalAmount: calculation.totalAmount,
        message: calculation.message,
        usageId: lockResult.usageId.toString() // Trả về usageId để có thể rollback sau
      };

    } catch (error) {
      console.error("[Voucher Integration] Apply error:", error);
      return {
        success: false,
        errorCode: VOUCHER_ERROR_CODES.SYSTEM_ERROR,
        message: error.message || "Lỗi hệ thống khi áp dụng voucher"
      };
    }
  },

  /**
   * Pre-checkout revalidation (Phase: Pre-Checkout)
   * Validate lại voucher trước khi tạo order
   * @param {string} code - Voucher code
   * @param {string} userId - User ID
   * @param {Array} cartItems - Cart items
   * @param {number} orderAmount - Order amount
   * @param {number} shippingFee - Shipping fee
   * @param {boolean} skipUserCheck - Skip user check nếu đã có pending usage từ cart
   * @returns {Object} Revalidation result
   */
  async preCheckoutRevalidate(code, userId, cartItems, orderAmount, shippingFee = 0, skipUserCheck = false) {
    try {
      // Validate lại
      // Nếu đã có pending usage từ cart (skipUserCheck = true), chỉ skip user limit check
      // Vẫn check các điều kiện user khác (newUserOnly, firstTimeOnly, etc.)
      const validation = await voucherValidationService.validateVoucher(
        code,
        userId,
        cartItems,
        orderAmount,
        { 
          skipUserCheck: skipUserCheck,
          skipUserLimitCheck: skipUserCheck // Nếu có pending usage, skip user limit check
        }
      );

      if (!validation.valid) {
        return {
          success: false,
          errorCode: validation.errorCode,
          message: validation.message,
          shouldRemove: true // Flag để frontend remove voucher
        };
      }

      const voucher = validation.voucher;

      // Recalculate discount với số tiền mới
      const calculation = voucherCalculationService.recalculateDiscount(
        voucher,
        orderAmount,
        shippingFee
      );

      if (!calculation.valid) {
        return {
          success: false,
          errorCode: calculation.errorCode,
          message: calculation.message,
          shouldRemove: true
        };
      }

      return {
        success: true,
        voucher: {
          code: voucher.code,
          name: voucher.name
        },
        discountAmount: calculation.discountAmount,
        finalPrice: calculation.finalPrice,
        totalAmount: calculation.totalAmount,
        message: calculation.message
      };

    } catch (error) {
      console.error("[Voucher Integration] Pre-checkout revalidate error:", error);
      return {
        success: false,
        errorCode: VOUCHER_ERROR_CODES.SYSTEM_ERROR,
        message: error.message || "Lỗi hệ thống khi kiểm tra lại voucher",
        shouldRemove: true
      };
    }
  },

  /**
   * Lock và reserve voucher cho order (Phase: Checkout - Concurrency)
   * @param {string} code - Voucher code
   * @param {string} userId - User ID
   * @param {string} tempOrderId - Temporary order ID (có thể là cart ID hoặc session ID)
   * @returns {Object} Lock result với usageId
   */
  async lockVoucherForOrder(code, userId, tempOrderId) {
    try {
      // Lấy voucher
      const voucher = await Voucher.findOne({ code: code.toUpperCase() });
      if (!voucher) {
        return {
          success: false,
          errorCode: VOUCHER_ERROR_CODES.NOT_FOUND,
          message: "Voucher không tồn tại"
        };
      }

      // Lock voucher usage
      const lockResult = await voucherConcurrencyService.lockVoucherUsage(
        voucher._id,
        userId,
        tempOrderId
      );

      if (!lockResult.success) {
        return {
          success: false,
          errorCode: VOUCHER_ERROR_CODES.CONCURRENCY_ERROR,
          message: lockResult.error || "Voucher đã hết lượt sử dụng"
        };
      }

      return {
        success: true,
        usageId: lockResult.usageId.toString(),
        voucher: {
          code: voucher.code,
          name: voucher.name
        }
      };

    } catch (error) {
      console.error("[Voucher Integration] Lock error:", error);
      return {
        success: false,
        errorCode: VOUCHER_ERROR_CODES.SYSTEM_ERROR,
        message: error.message || "Lỗi hệ thống khi khóa voucher"
      };
    }
  },

  /**
   * Commit voucher usage sau khi order được tạo thành công (Phase: Commit)
   * @param {string} usageId - VoucherUsage ID từ lock
   * @param {Object} orderData - Order data
   * @returns {Object} Commit result
   */
  async commitVoucherUsage(usageId, orderData) {
    try {
      const { orderId, orderNumber, discountAmount, orderAmount, finalAmount } = orderData;

      const commitResult = await voucherConcurrencyService.commitVoucherUsage(usageId, {
        orderId,
        orderNumber,
        discountAmount,
        orderAmount,
        finalAmount
      });

      if (!commitResult.success) {
        return {
          success: false,
          error: commitResult.error || "Lỗi khi commit voucher usage"
        };
      }

      return {
        success: true,
        usage: commitResult.usage
      };

    } catch (error) {
      console.error("[Voucher Integration] Commit error:", error);
      return {
        success: false,
        error: error.message || "Lỗi hệ thống khi commit voucher usage"
      };
    }
  },

  /**
   * Rollback voucher usage khi order bị cancel (Phase: Post-Order)
   * @param {string} orderId - Order ID
   * @returns {Object} Rollback result
   */
  async rollbackVoucherUsageByOrder(orderId) {
    try {
      const rollbackResult = await voucherConcurrencyService.rollbackVoucherUsageByOrder(orderId);

      if (!rollbackResult.success) {
        return {
          success: false,
          error: rollbackResult.error || "Lỗi khi rollback voucher usage"
        };
      }

      return {
        success: true,
        message: rollbackResult.message,
        count: rollbackResult.count || 0
      };

    } catch (error) {
      console.error("[Voucher Integration] Rollback error:", error);
      return {
        success: false,
        error: error.message || "Lỗi hệ thống khi rollback voucher usage"
      };
    }
  },

  /**
   * Remove voucher từ cart (khi cart thay đổi)
   * @param {string} userId - User ID
   * @param {string} code - Voucher code
   * @returns {Object} Remove result
   */
  async removeVoucherFromCart(userId, code) {
    try {
      // Tìm pending usage của user với voucher này
      const pendingUsage = await VoucherUsage.findOne({
        user: userId,
        voucherCode: code.toUpperCase(),
        status: "pending"
      });

      if (pendingUsage) {
        // Rollback pending usage
        await voucherConcurrencyService.rollbackVoucherUsage(
          pendingUsage._id,
          "cart_changed"
        );
      }

      return {
        success: true,
        message: "Đã xóa voucher khỏi giỏ hàng"
      };

    } catch (error) {
      console.error("[Voucher Integration] Remove error:", error);
      return {
        success: false,
        error: error.message || "Lỗi khi xóa voucher"
      };
    }
  },

  /**
   * Validate multiple vouchers (stacking)
   * @param {Array} codes - Array of voucher codes
   * @param {string} userId - User ID
   * @param {Array} cartItems - Cart items
   * @param {number} orderAmount - Order amount
   * @returns {Object} Validation result
   */
  async validateMultipleVouchers(codes, userId, cartItems, orderAmount) {
    const results = [];
    const appliedVouchers = [];

    for (const code of codes) {
      const validation = await voucherValidationService.validateVoucher(
        code,
        userId,
        cartItems,
        orderAmount,
        {
          allowStacking: true,
          existingVouchers: appliedVouchers
        }
      );

      if (validation.valid) {
        appliedVouchers.push(validation.voucher);
        results.push({
          code,
          valid: true,
          voucher: validation.voucher
        });
      } else {
        results.push({
          code,
          valid: false,
          errorCode: validation.errorCode,
          message: validation.message
        });
      }
    }

    return {
      success: results.every(r => r.valid),
      results,
      appliedVouchers
    };
  }
};


