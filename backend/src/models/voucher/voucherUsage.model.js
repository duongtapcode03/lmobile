import mongoose from "mongoose";

/**
 * Voucher Usage Model
 * Track usage của voucher theo từng user để:
 * - Kiểm tra giới hạn sử dụng per user
 * - Rollback khi order bị cancel/return
 * - Audit trail
 */
const voucherUsageSchema = new mongoose.Schema(
  {
    voucher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Voucher",
      required: true,
      index: true
    },
    voucherCode: {
      type: String,
      required: true,
      uppercase: true,
      index: true
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: function() {
        // Chỉ required khi status là "used" (đã commit)
        return this.status === "used";
      },
      index: true
    },
    orderNumber: {
      type: String,
      required: true,
      index: true
    },
    discountAmount: {
      type: Number,
      required: true,
      min: 0
    },
    orderAmount: {
      type: Number,
      required: true,
      min: 0
    },
    finalAmount: {
      type: Number,
      required: true,
      min: 0
    },
    status: {
      type: String,
      enum: ["pending", "used", "cancelled", "refunded"],
      default: "pending",
      index: true
    },
    cancelledAt: {
      type: Date
    },
    refundedAt: {
      type: Date
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Compound index để tìm nhanh usage của user với voucher
voucherUsageSchema.index({ user: 1, voucher: 1, status: 1 });
voucherUsageSchema.index({ voucherCode: 1, user: 1, status: 1 });
voucherUsageSchema.index({ order: 1 });
voucherUsageSchema.index({ createdAt: -1 });

// Virtual để kiểm tra có thể rollback không
voucherUsageSchema.virtual("canRollback").get(function() {
  return this.status === "used" && 
         (this.cancelledAt === null || this.refundedAt === null);
});

export const VoucherUsage = mongoose.model("VoucherUsage", voucherUsageSchema);


