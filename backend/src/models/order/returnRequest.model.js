import mongoose from "mongoose";

/**
 * Return Request Model
 * Quản lý yêu cầu hoàn hàng của khách hàng
 */
const returnRequestSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true
    },
    orderNumber: {
      type: String,
      required: true,
      index: true
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    
    // Sản phẩm yêu cầu hoàn
    items: [{
      product: {
        type: Number,
        ref: "Product",
        required: true
      },
      productName: {
        type: String,
        required: true
      },
      quantity: {
        type: Number,
        required: true,
        min: 1
      },
      price: {
        type: Number,
        required: true,
        min: 0
      },
      reason: {
        type: String,
        enum: [
          "defective",        // Hàng lỗi
          "wrong_item",      // Sai sản phẩm
          "not_as_described", // Không đúng mô tả
          "damaged",         // Hàng bị hỏng
          "size_issue",      // Vấn đề về kích thước
          "color_issue",     // Vấn đề về màu sắc
          "other"            // Lý do khác
        ],
        required: true
      },
      reasonDetail: {
        type: String,
        trim: true,
        maxlength: [500, "Chi tiết lý do không được quá 500 ký tự"]
      }
    }],
    
    // Trạng thái yêu cầu
    status: {
      type: String,
      enum: [
        "pending",      // Chờ xử lý
        "approved",     // Đã duyệt
        "rejected",     // Từ chối
        "processing",   // Đang xử lý
        "completed",    // Hoàn thành
        "cancelled"     // Đã hủy
      ],
      default: "pending",
      index: true
    },
    
    // Thông tin hoàn tiền
    refundAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    // Chi tiết tính toán refund (để hiển thị cho user và admin)
    refundCalculation: {
      returnItemsSubtotal: Number,    // Giá trị sản phẩm được hoàn
      returnDiscountAmount: Number,    // Discount được hoàn
      returnShippingFee: Number,       // Shipping fee bị trừ
      restockingFee: Number,           // Phí xử lý hoàn hàng
      totalRefundAmount: Number,       // Tổng số tiền được hoàn
      returnRatio: Number,             // Tỷ lệ hoàn (0-1)
      isFullReturn: Boolean,          // Có phải hoàn toàn bộ không
      shippingPolicy: String           // Policy xử lý shipping fee
    },
    refundMethod: {
      type: String,
      enum: ["original", "store_credit", "bank_transfer"],
      default: "original"
    },
    refundStatus: {
      type: String,
      enum: ["pending", "processing", "completed", "failed"],
      default: "pending"
    },
    refundedAt: {
      type: Date
    },
    refundTransactionId: {
      type: String,
      trim: true
    },
    
    // Ghi chú và lịch sử
    customerNote: {
      type: String,
      trim: true,
      maxlength: [1000, "Ghi chú không được quá 1000 ký tự"]
    },
    adminNote: {
      type: String,
      trim: true,
      maxlength: [1000, "Ghi chú admin không được quá 1000 ký tự"]
    },
    statusHistory: [{
      status: {
        type: String,
        required: true
      },
      note: String,
      updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      },
      updatedAt: {
        type: Date,
        default: Date.now
      }
    }],
    
    // Thông tin vận chuyển (nếu cần gửi lại hàng)
    returnShippingAddress: {
      fullName: String,
      phone: String,
      address: String,
      ward: String,
      district: String,
      province: String,
      postalCode: String
    },
    returnTrackingNumber: {
      type: String,
      trim: true
    },
    receivedAt: {
      type: Date
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual để tính tổng số lượng sản phẩm
returnRequestSchema.virtual("totalItems").get(function() {
  if (!this.items || !Array.isArray(this.items)) {
    return 0;
  }
  return this.items.reduce((total, item) => total + (item.quantity || 0), 0);
});

// Virtual để tính tổng tiền hoàn
returnRequestSchema.virtual("totalRefundAmount").get(function() {
  if (!this.items || !Array.isArray(this.items)) {
    return 0;
  }
  return this.items.reduce((total, item) => total + (item.price * item.quantity || 0), 0);
});

// Middleware để thêm vào statusHistory khi status thay đổi
returnRequestSchema.pre("save", function(next) {
  if (this.isModified("status")) {
    this.statusHistory.push({
      status: this.status,
      updatedAt: new Date()
    });
  }
  next();
});

// Indexes
returnRequestSchema.index({ order: 1, status: 1 });
returnRequestSchema.index({ user: 1, status: 1 });
returnRequestSchema.index({ createdAt: -1 });
returnRequestSchema.index({ status: 1, createdAt: -1 });

export const ReturnRequest = mongoose.model("ReturnRequest", returnRequestSchema);

