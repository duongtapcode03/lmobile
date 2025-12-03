import mongoose from "mongoose";

/**
 * Flash Sale Reservation Model - Bảng flash_sale_reservations
 * Quản lý giữ chỗ flash sale với timeout
 */
const flashSaleReservationSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    flash_sale_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FlashSale",
      required: true,
      index: true
    },
    product_id: {
      type: Number,
      ref: "Product",
      required: true,
      index: true
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, "Số lượng phải >= 1"],
      default: 1
    },
    flash_price: {
      type: Number,
      required: true,
      min: [0, "Giá flash sale phải >= 0"]
    },
    expires_at: {
      type: Date,
      required: true,
      index: true,
      expires: 0 // Tự động xóa khi expires_at đã qua
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "expired", "cancelled"],
      default: "pending",
      index: true
    },
    order_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      index: true
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes
flashSaleReservationSchema.index({ user_id: 1, flash_sale_id: 1, product_id: 1 });
flashSaleReservationSchema.index({ flash_sale_id: 1, product_id: 1 });
flashSaleReservationSchema.index({ status: 1, expires_at: 1 });
flashSaleReservationSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

// Virtual: user info
flashSaleReservationSchema.virtual("user", {
  ref: "User",
  localField: "user_id",
  foreignField: "_id",
  justOne: true
});

// Virtual: product info
flashSaleReservationSchema.virtual("product", {
  ref: "Product",
  localField: "product_id",
  foreignField: "_id",
  justOne: true
});

// Virtual: flash sale info
flashSaleReservationSchema.virtual("flashSale", {
  ref: "FlashSale",
  localField: "flash_sale_id",
  foreignField: "_id",
  justOne: true
});

// Methods
flashSaleReservationSchema.methods.isExpired = function () {
  return new Date() > this.expires_at;
};

flashSaleReservationSchema.methods.isValid = function () {
  return this.status === "pending" && !this.isExpired();
};

export const FlashSaleReservation = mongoose.model("FlashSaleReservation", flashSaleReservationSchema);


