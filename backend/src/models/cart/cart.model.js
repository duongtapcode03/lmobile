import mongoose from "mongoose";

const cartItemSchema = new mongoose.Schema({
  product: {
    type: Number, // Number ID instead of ObjectId
    ref: "Product",
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, "Số lượng phải lớn hơn 0"]
    // Không giới hạn max ở schema level, validation sẽ kiểm tra theo stock ở service layer
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
  addedAt: {
    type: Date,
    default: Date.now
  }
});

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true
    },
    items: [cartItemSchema],
    totalItems: {
      type: Number,
      default: 0
    },
    totalAmount: {
      type: Number,
      default: 0
    },
    shippingFee: {
      type: Number,
      default: 0
    },
    discountAmount: {
      type: Number,
      default: 0
    },
    couponCode: {
      type: String,
      trim: true
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual để tính tổng tiền cuối cùng
cartSchema.virtual("finalAmount").get(function() {
  return this.totalAmount + this.shippingFee - this.discountAmount;
});

// Virtual để kiểm tra giỏ hàng có trống không
cartSchema.virtual("isEmpty").get(function() {
  return this.items.length === 0;
});

// Middleware để tự động cập nhật totalItems và totalAmount
cartSchema.pre("save", function(next) {
  this.totalItems = this.items.reduce((total, item) => total + item.quantity, 0);
  this.totalAmount = this.items.reduce((total, item) => total + (item.price * item.quantity), 0);
  this.lastUpdated = new Date();
  
  // Reset shippingFee về 0 nếu cart trống (không có sản phẩm thì không cần tính phí vận chuyển)
  if (this.items.length === 0) {
    this.shippingFee = 0;
  }
  
  next();
});

// Index để tối ưu truy vấn
cartSchema.index({ user: 1 });
cartSchema.index({ lastUpdated: -1 });

export const Cart = mongoose.model("Cart", cartSchema);
