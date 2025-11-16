import mongoose from "mongoose";

/**
 * Flash Sale Item Model - Bảng flash_sale_items
 * Quản lý sản phẩm trong Flash Sale
 */
const flashSaleItemSchema = new mongoose.Schema(
  {
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
    flash_price: {
      type: Number,
      required: true,
      min: [0, "Giá flash sale phải >= 0"],
      index: true
    },
    flash_stock: {
      type: Number,
      required: true,
      min: [0, "Số lượng flash stock phải >= 0"],
      default: 0
    },
    sold: {
      type: Number,
      min: [0, "Số lượng đã bán phải >= 0"],
      default: 0
    },
    limit_per_user: {
      type: Number,
      min: [1, "Giới hạn mỗi người phải >= 1"],
      default: 1
    },
    sort_order: {
      type: Number,
      default: 1,
      min: [1, "Sort order phải >= 1"]
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes
flashSaleItemSchema.index({ flash_sale_id: 1, sort_order: 1 });
flashSaleItemSchema.index({ flash_sale_id: 1, product_id: 1 }, { unique: true });
flashSaleItemSchema.index({ product_id: 1 });
flashSaleItemSchema.index({ flash_price: 1 });

// Virtual: product info
flashSaleItemSchema.virtual("product", {
  ref: "Product",
  localField: "product_id",
  foreignField: "_id",
  justOne: true
});

// Virtual: flash sale info
flashSaleItemSchema.virtual("flashSale", {
  ref: "FlashSale",
  localField: "flash_sale_id",
  foreignField: "_id",
  justOne: true
});

// Methods
flashSaleItemSchema.methods.isAvailable = function () {
  return this.sold < this.flash_stock;
};

flashSaleItemSchema.methods.getRemainingStock = function () {
  return Math.max(0, this.flash_stock - this.sold);
};

flashSaleItemSchema.methods.canPurchase = function (quantity = 1) {
  return this.isAvailable() && 
         quantity <= this.limit_per_user && 
         quantity <= this.getRemainingStock();
};

// Pre-save middleware
flashSaleItemSchema.pre("save", function(next) {
  // Validate sold <= flash_stock
  if (this.sold > this.flash_stock) {
    return next(new Error("Số lượng đã bán không được vượt quá flash stock"));
  }
  next();
});

export const FlashSaleItem = mongoose.model("FlashSaleItem", flashSaleItemSchema);


