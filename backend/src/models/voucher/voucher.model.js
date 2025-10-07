import mongoose from "mongoose";

const voucherSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      maxlength: [20, "Mã voucher không được quá 20 ký tự"]
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: [100, "Tên voucher không được quá 100 ký tự"]
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Mô tả không được quá 500 ký tự"]
    },
    type: {
      type: String,
      enum: ["percentage", "fixed_amount", "free_shipping"],
      required: true,
      default: "percentage"
    },
    value: {
      type: Number,
      required: true,
      min: [0, "Giá trị voucher không được âm"]
    },
    minOrderAmount: {
      type: Number,
      default: 0,
      min: [0, "Giá trị đơn hàng tối thiểu không được âm"]
    },
    maxDiscountAmount: {
      type: Number,
      min: [0, "Số tiền giảm giá tối đa không được âm"]
    },
    usageLimit: {
      type: Number,
      default: 1,
      min: [1, "Giới hạn sử dụng phải lớn hơn 0"]
    },
    usedCount: {
      type: Number,
      default: 0,
      min: [0, "Số lần đã sử dụng không được âm"]
    },
    validFrom: {
      type: Date,
      required: true,
      default: Date.now
    },
    validTo: {
      type: Date,
      required: true
    },
    isActive: {
      type: Boolean,
      default: true
    },
    applicableProducts: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product"
    }],
    applicableCategories: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category"
    }],
    applicableUsers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }],
    excludeProducts: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product"
    }],
    excludeCategories: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category"
    }],
    conditions: {
      firstTimeOnly: {
        type: Boolean,
        default: false
      },
      newUserOnly: {
        type: Boolean,
        default: false
      },
      minQuantity: {
        type: Number,
        default: 1
      },
      maxQuantity: {
        type: Number
      }
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    tags: [{
      type: String,
      trim: true
    }],
    image: {
      type: String,
      default: ""
    },
    priority: {
      type: Number,
      default: 0,
      min: [0, "Độ ưu tiên không được âm"]
    }
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual để kiểm tra voucher còn hiệu lực không
voucherSchema.virtual("isValid").get(function() {
  const now = new Date();
  return this.isActive && 
         this.validFrom <= now && 
         this.validTo >= now && 
         this.usedCount < this.usageLimit;
});

// Virtual để kiểm tra voucher còn sử dụng được không
voucherSchema.virtual("canUse").get(function() {
  return this.isValid && this.usedCount < this.usageLimit;
});

// Virtual để tính số lần còn lại có thể sử dụng
voucherSchema.virtual("remainingUses").get(function() {
  return Math.max(0, this.usageLimit - this.usedCount);
});

// Virtual để kiểm tra voucher đã hết hạn chưa
voucherSchema.virtual("isExpired").get(function() {
  return new Date() > this.validTo;
});

// Virtual để kiểm tra voucher chưa bắt đầu
voucherSchema.virtual("isNotStarted").get(function() {
  return new Date() < this.validFrom;
});

// Middleware để tự động tạo code nếu chưa có
voucherSchema.pre("save", function(next) {
  if (!this.code) {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substr(2, 4).toUpperCase();
    this.code = `VOUCHER-${timestamp}-${random}`;
  }
  next();
});

// Middleware để validate giá trị voucher
voucherSchema.pre("save", function(next) {
  if (this.type === "percentage" && this.value > 100) {
    return next(new Error("Phần trăm giảm giá không được quá 100%"));
  }
  
  if (this.type === "fixed_amount" && this.value <= 0) {
    return next(new Error("Số tiền giảm giá cố định phải lớn hơn 0"));
  }
  
  if (this.validTo <= this.validFrom) {
    return next(new Error("Ngày kết thúc phải sau ngày bắt đầu"));
  }
  
  next();
});

// Index để tối ưu truy vấn
voucherSchema.index({ code: 1 });
voucherSchema.index({ isActive: 1 });
voucherSchema.index({ validFrom: 1, validTo: 1 });
voucherSchema.index({ type: 1 });
voucherSchema.index({ createdBy: 1 });
voucherSchema.index({ tags: 1 });

export const Voucher = mongoose.model("Voucher", voucherSchema);
