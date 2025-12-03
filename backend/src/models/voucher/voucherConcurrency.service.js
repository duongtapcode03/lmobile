import mongoose from "mongoose";
import { Voucher } from "./voucher.model.js";
import { VoucherUsage } from "./voucherUsage.model.js";

/**
 * Voucher Concurrency Service
 * Xử lý race condition khi nhiều user cùng sử dụng voucher
 * Sử dụng MongoDB atomic operations (có thể nâng cấp lên Redis sau)
 */
export const voucherConcurrencyService = {
  /**
   * Lock và reserve voucher usage (atomic operation)
   * @param {string} voucherId - Voucher ID
   * @param {string} userId - User ID
   * @param {string} orderId - Order ID (temporary)
   * @returns {Object} Lock result
   */
  async lockVoucherUsage(voucherId, userId, orderId) {
    try {
      // Lấy voucher để kiểm tra điều kiện
      const voucher = await Voucher.findById(voucherId);
      
      if (!voucher) {
        return {
          success: false,
          error: "Voucher không tồn tại"
        };
      }

      // Kiểm tra điều kiện
      if (!voucher.isActive) {
        return {
          success: false,
          error: "Voucher đã bị vô hiệu hóa"
        };
      }

      const now = new Date();
      if (now < voucher.validFrom || now > voucher.validTo) {
        return {
          success: false,
          error: "Voucher không còn hiệu lực"
        };
      }

      if (voucher.usedCount >= voucher.usageLimit) {
        return {
          success: false,
          error: "Voucher đã hết lượt sử dụng"
        };
      }

      // Atomic increment usedCount - chỉ update nếu usedCount < usageLimit
      // Sử dụng findOneAndUpdate với condition để đảm bảo atomic
      const updatedVoucher = await Voucher.findOneAndUpdate(
        {
          _id: voucherId,
          usedCount: { $lt: voucher.usageLimit }, // Chỉ update nếu chưa đạt limit
          isActive: true,
          validFrom: { $lte: now },
          validTo: { $gte: now }
        },
        { $inc: { usedCount: 1 } },
        { 
          new: true,
          runValidators: true
        }
      );

      if (!updatedVoucher) {
        // Không update được (có thể do condition không thỏa mãn hoặc đã bị update bởi request khác)
        // Kiểm tra lại voucher hiện tại
        const currentVoucher = await Voucher.findById(voucherId);
        if (currentVoucher.usedCount >= currentVoucher.usageLimit) {
          return {
            success: false,
            error: "Voucher đã hết lượt sử dụng (concurrency)"
          };
        }
        return {
          success: false,
          error: "Không thể khóa voucher, vui lòng thử lại"
        };
      }

      if (updatedVoucher.usedCount > updatedVoucher.usageLimit) {
        // Rollback nếu vượt quá limit (should not happen, but safety check)
        await Voucher.findByIdAndUpdate(voucherId, { $inc: { usedCount: -1 } });
        return {
          success: false,
          error: "Voucher đã hết lượt sử dụng (concurrency)"
        };
      }

      // Tạo usage record với status pending
      // order có thể là null khi pending (sẽ được update khi commit)
      // orderId có thể là cartId (string) hoặc tempId, không phải ObjectId hợp lệ
      const usage = await VoucherUsage.create({
        voucher: voucherId,
        voucherCode: voucher.code,
        user: userId,
        order: null, // Không lưu order khi pending, sẽ update khi commit
        orderNumber: `TEMP-${Date.now()}`,
        discountAmount: 0, // Sẽ update sau
        orderAmount: 0,
        finalAmount: 0,
        status: "pending"
      });

      return {
        success: true,
        voucher: updatedVoucher,
        usageId: usage._id
      };

    } catch (error) {
      console.error("[Voucher Concurrency] Lock error:", error);
      return {
        success: false,
        error: error.message || "Lỗi khi khóa voucher"
      };
    }
  },

  /**
   * Commit voucher usage (sau khi order được tạo thành công)
   * @param {string} usageId - VoucherUsage ID
   * @param {Object} orderData - Order data
   * @returns {Object} Commit result
   */
  async commitVoucherUsage(usageId, orderData) {
    try {
      const { orderId, orderNumber, discountAmount, orderAmount, finalAmount } = orderData;

      // Update usage record - chỉ update nếu status là pending
      const usage = await VoucherUsage.findOneAndUpdate(
        {
          _id: usageId,
          status: "pending" // Chỉ commit nếu còn pending
        },
        {
          order: orderId,
          orderNumber: orderNumber,
          discountAmount: discountAmount,
          orderAmount: orderAmount,
          finalAmount: finalAmount,
          status: "used"
        },
        { new: true }
      );

      if (!usage) {
        return {
          success: false,
          error: "Không tìm thấy usage record hoặc đã được commit"
        };
      }

      // Usage đã được tăng ở lockVoucherUsage, không cần tăng lại
      // Chỉ cần update status

      return {
        success: true,
        usage
      };

    } catch (error) {
      console.error("[Voucher Concurrency] Commit error:", error);
      return {
        success: false,
        error: error.message || "Lỗi khi commit voucher usage"
      };
    }
  },

  /**
   * Rollback voucher usage (khi order bị cancel hoặc fail)
   * @param {string} usageId - VoucherUsage ID
   * @param {string} reason - Rollback reason
   * @returns {Object} Rollback result
   */
  async rollbackVoucherUsage(usageId, reason = "order_cancelled") {
    try {
      // Tìm usage record
      const usage = await VoucherUsage.findById(usageId);

      if (!usage) {
        return {
          success: false,
          error: "Không tìm thấy usage record"
        };
      }

      // Chỉ rollback nếu status là pending hoặc used
      if (!["pending", "used"].includes(usage.status)) {
        return {
          success: false,
          error: `Không thể rollback usage với status: ${usage.status}`
        };
      }

      // Decrement voucher usedCount (atomic operation)
      await Voucher.findByIdAndUpdate(
        usage.voucher,
        { $inc: { usedCount: -1 } }
      );

      // Update usage status
      const updateData = {
        status: reason === "order_cancelled" ? "cancelled" : "refunded",
        [reason === "order_cancelled" ? "cancelledAt" : "refundedAt"]: new Date()
      };

      await VoucherUsage.findByIdAndUpdate(
        usageId,
        updateData
      );

      return {
        success: true,
        message: "Đã hoàn lại voucher usage"
      };

    } catch (error) {
      console.error("[Voucher Concurrency] Rollback error:", error);
      return {
        success: false,
        error: error.message || "Lỗi khi rollback voucher usage"
      };
    }
  },

  /**
   * Rollback voucher usage by order (khi order bị cancel)
   * @param {string} orderId - Order ID
   * @returns {Object} Rollback result
   */
  async rollbackVoucherUsageByOrder(orderId) {
    try {
      // Tìm tất cả usage records của order này
      const usages = await VoucherUsage.find({
        order: orderId,
        status: { $in: ["pending", "used"] }
      });

      if (usages.length === 0) {
        return {
          success: true,
          message: "Không có voucher usage cần rollback"
        };
      }

      // Rollback từng voucher
      for (const usage of usages) {
        // Decrement voucher usedCount (atomic operation)
        await Voucher.findByIdAndUpdate(
          usage.voucher,
          { $inc: { usedCount: -1 } }
        );

        // Update usage status
        await VoucherUsage.findByIdAndUpdate(
          usage._id,
          {
            status: "cancelled",
            cancelledAt: new Date()
          }
        );
      }

      return {
        success: true,
        message: `Đã rollback ${usages.length} voucher usage`,
        count: usages.length
      };

    } catch (error) {
      console.error("[Voucher Concurrency] Rollback by order error:", error);
      return {
        success: false,
        error: error.message || "Lỗi khi rollback voucher usage"
      };
    }
  },

  /**
   * Kiểm tra và cleanup pending usages (cron job)
   * Xóa các pending usage quá lâu (có thể do user abandon checkout)
   */
  async cleanupPendingUsages(maxAgeMinutes = 30) {
    try {
      const cutoffTime = new Date(Date.now() - maxAgeMinutes * 60 * 1000);

      const pendingUsages = await VoucherUsage.find({
        status: "pending",
        createdAt: { $lt: cutoffTime }
      });

      let rollbackCount = 0;

      for (const usage of pendingUsages) {
        const result = await this.rollbackVoucherUsage(usage._id, "timeout");
        if (result.success) {
          rollbackCount++;
        }
      }

      return {
        success: true,
        cleaned: rollbackCount,
        total: pendingUsages.length
      };

    } catch (error) {
      console.error("[Voucher Concurrency] Cleanup error:", error);
      return {
        success: false,
        error: error.message
      };
    }
  }
};


