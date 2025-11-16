import mongoose from "mongoose";

/**
 * Flash Sale Model
 * Sản phẩm trong flash sale
 * Collection name: flashsales
 */
const flashSaleSchema = new mongoose.Schema(
  {
    id: {
      type: Number,
      required: true,
      unique: true
    },
    session_id: {
      type: String,
      required: true,
      trim: true,
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
    total_stock: {
      type: Number,
      required: true,
      min: [0, "Số lượng phải >= 0"],
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
    },
    created_at: {
      type: Date,
      default: Date.now
    },
    updated_at: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: false, // Sử dụng created_at và updated_at thủ công
    // _id sẽ là ObjectId mặc định của MongoDB, id là field riêng để query
    collection: "flashsales"
  }
);

// Indexes
flashSaleSchema.index({ session_id: 1, sort_order: 1 });
flashSaleSchema.index({ product_id: 1 });
flashSaleSchema.index({ flash_price: 1 });
flashSaleSchema.index({ id: 1 }, { unique: true });

// Virtual: product info
flashSaleSchema.virtual("product", {
  ref: "Product",
  localField: "product_id",
  foreignField: "_id",
  justOne: true
});

// Methods
flashSaleSchema.methods.isAvailable = function () {
  return this.sold < this.total_stock;
};

flashSaleSchema.methods.getRemainingStock = function () {
  return Math.max(0, this.total_stock - this.sold);
};

flashSaleSchema.methods.canPurchase = function (quantity = 1) {
  return this.isAvailable() && quantity <= this.limit_per_user && quantity <= this.getRemainingStock();
};

// Pre-save middleware
flashSaleSchema.pre("save", function (next) {
  this.updated_at = Date.now();
  
  // Validate sold <= total_stock
  if (this.sold > this.total_stock) {
    return next(new Error("Số lượng đã bán không được vượt quá tổng số lượng"));
  }
  
  next();
});

const FlashSale = mongoose.model("FlashSale", flashSaleSchema, "flashsales");

export default FlashSale;

