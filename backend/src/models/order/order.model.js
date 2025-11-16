import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema({
  product: {
    type: Number, // Product model sử dụng Number ID
    ref: "Product",
    required: true
  },
  productName: {
    type: String,
    required: true
  },
  productImage: {
    type: String,
    default: ""
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, "Số lượng phải lớn hơn 0"]
  },
  variant: {
    color: String,
    storage: String,
    ram: String
  },
  price: {
    type: Number,
    required: true,
    min: [0, "Giá không được âm"]
  },
  importPrice: {
    type: Number,
    default: 0,
    min: [0, "Giá nhập không được âm"]
  },
  totalPrice: {
    type: Number,
    required: true,
    min: [0, "Tổng giá không được âm"]
  }
}, {
  _id: false // Tắt _id tự động cho order items để tránh nhầm lẫn với product ID
});

const shippingAddressSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    trim: true
  },
  address: {
    type: String,
    required: true,
    trim: true
  },
  ward: {
    type: String,
    required: true,
    trim: true
  },
  district: {
    type: String,
    required: true,
    trim: true
  },
  province: {
    type: String,
    required: true,
    trim: true
  },
  postalCode: {
    type: String,
    trim: true
  },
  note: {
    type: String,
    trim: true,
    maxlength: [500, "Ghi chú không được quá 500 ký tự"]
  }
});

const paymentInfoSchema = new mongoose.Schema({
  method: {
    type: String,
    enum: ["cod", "bank_transfer", "credit_card", "momo", "zalopay"],
    required: true
  },
  status: {
    type: String,
    enum: ["pending", "paid", "failed", "refunded"],
    default: "pending"
  },
  transactionId: {
    type: String,
    trim: true
  },
  paidAt: {
    type: Date
  },
  refundedAt: {
    type: Date
  }
});

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      unique: true,
      required: true
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    items: [orderItemSchema],
    shippingAddress: shippingAddressSchema,
    paymentInfo: paymentInfoSchema,
    
    // Tính toán giá
    subtotal: {
      type: Number,
      required: true,
      min: [0, "Tổng tiền không được âm"]
    },
    shippingFee: {
      type: Number,
      default: 0,
      min: [0, "Phí vận chuyển không được âm"]
    },
    discountAmount: {
      type: Number,
      default: 0,
      min: [0, "Số tiền giảm giá không được âm"]
    },
    couponCode: {
      type: String,
      trim: true
    },
    totalAmount: {
      type: Number,
      required: true,
      min: [0, "Tổng tiền không được âm"]
    },
    
    // Trạng thái đơn hàng
    status: {
      type: String,
      enum: [
        "pending",      // Chờ xử lý
        "confirmed",    // Đã xác nhận
        "processing",   // Đang xử lý
        "shipping",     // Đang giao hàng
        "delivered",    // Đã giao hàng
        "cancelled",    // Đã hủy
        "returned"      // Đã trả hàng
      ],
      default: "pending"
    },
    
    // Thông tin vận chuyển
    shippingMethod: {
      type: String,
      enum: ["standard", "express", "same_day"],
      default: "standard"
    },
    trackingNumber: {
      type: String,
      trim: true
    },
    estimatedDelivery: {
      type: Date
    },
    deliveredAt: {
      type: Date
    },
    
    // Ghi chú và lịch sử
    notes: {
      type: String,
      trim: true,
      maxlength: [1000, "Ghi chú không được quá 1000 ký tự"]
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
    
    // Thông tin bổ sung
    isGift: {
      type: Boolean,
      default: false
    },
    giftMessage: {
      type: String,
      trim: true
    },
    source: {
      type: String,
      enum: ["web", "mobile", "admin"],
      default: "web"
    }
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual để tính tổng số lượng sản phẩm
orderSchema.virtual("totalItems").get(function() {
  if (!this.items || !Array.isArray(this.items)) {
    return 0;
  }
  return this.items.reduce((total, item) => total + (item.quantity || 0), 0);
});

// Virtual để kiểm tra có thể hủy không (chỉ cho phép khi đang chờ xử lý)
orderSchema.virtual("canCancel").get(function() {
  return this.status === "pending";
});

// Virtual để kiểm tra có thể trả hàng không
orderSchema.virtual("canReturn").get(function() {
  return this.status === "delivered" && 
         this.deliveredAt && 
         (Date.now() - this.deliveredAt.getTime()) <= (7 * 24 * 60 * 60 * 1000); // 7 ngày
});

// Middleware để tự động tạo orderNumber
orderSchema.pre("save", function(next) {
  if (!this.orderNumber) {
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.random().toString(36).substr(2, 4).toUpperCase();
    this.orderNumber = `ORD-${timestamp}-${random}`;
  }
  next();
});

// Middleware để tự động tính totalAmount
orderSchema.pre("save", function(next) {
  this.totalAmount = this.subtotal + this.shippingFee - this.discountAmount;
  next();
});

// Middleware để thêm vào statusHistory khi status thay đổi
orderSchema.pre("save", function(next) {
  if (this.isModified("status")) {
    this.statusHistory.push({
      status: this.status,
      updatedAt: new Date()
    });
  }
  next();
});

// Index để tối ưu truy vấn
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ user: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ "paymentInfo.status": 1 });
orderSchema.index({ trackingNumber: 1 });

export const Order = mongoose.model("Order", orderSchema);
