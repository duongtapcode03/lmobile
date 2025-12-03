import mongoose from "mongoose";

/**
 * Flash Sale User Usage Model - Bảng flash_sale_user_usage
 * Theo dõi số lượng sản phẩm user đã mua trong flash sale
 */
const flashSaleUserUsageSchema = new mongoose.Schema(
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
flashSaleUserUsageSchema.index({ user_id: 1, flash_sale_id: 1, product_id: 1 });
flashSaleUserUsageSchema.index({ flash_sale_id: 1, product_id: 1 });
flashSaleUserUsageSchema.index({ user_id: 1 });
flashSaleUserUsageSchema.index({ order_id: 1 });

// Unique constraint: Mỗi user chỉ có 1 record cho mỗi sản phẩm trong flash sale
flashSaleUserUsageSchema.index(
  { user_id: 1, flash_sale_id: 1, product_id: 1 },
  { unique: true }
);

// Virtual: user info
flashSaleUserUsageSchema.virtual("user", {
  ref: "User",
  localField: "user_id",
  foreignField: "_id",
  justOne: true
});

// Virtual: product info
flashSaleUserUsageSchema.virtual("product", {
  ref: "Product",
  localField: "product_id",
  foreignField: "_id",
  justOne: true
});

// Virtual: flash sale info
flashSaleUserUsageSchema.virtual("flashSale", {
  ref: "FlashSale",
  localField: "flash_sale_id",
  foreignField: "_id",
  justOne: true
});

export const FlashSaleUserUsage = mongoose.model("FlashSaleUserUsage", flashSaleUserUsageSchema);








