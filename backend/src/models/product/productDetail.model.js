import mongoose from "mongoose";

/**
 * Product Detail Model
 * Chi tiết sản phẩm - Lazy load, chỉ cần khi xem chi tiết
 */
const contentTocSchema = new mongoose.Schema({
  id: {
    type: String,
    trim: true
  },
  title: {
    type: String,
    trim: true
  }
}, { _id: false });

const warrantyItemSchema = new mongoose.Schema({
  text: {
    type: String,
    trim: true
  }
}, { _id: false });

const productDetailSchema = new mongoose.Schema(
  {
    _id: {
      type: Number,
      required: true
    },
    productId: {
      type: Number,
      ref: "Product",
      required: true,
      unique: true,
      index: true
    },
    description: {
      type: String,
      trim: true,
      maxlength: [10000, "Mô tả không được quá 10000 ký tự"]
    },
    contentToc: {
      type: [contentTocSchema],
      default: []
    },
    highlights: {
      type: [String],
      default: []
    },
    promotions: {
      type: [String],
      default: []
    },
    warranty: {
      type: [warrantyItemSchema],
      default: []
    },
    specifications: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    sourceUrl: {
      type: String,
      trim: true
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: false, // Chỉ có updatedAt
    _id: true, // Sử dụng _id là Number
    collection: "product_details"
  }
);

// Indexes
productDetailSchema.index({ productId: 1 }, { unique: true });

// Virtual: product info
productDetailSchema.virtual("product", {
  ref: "Product",
  localField: "productId",
  foreignField: "_id",
  justOne: true
});

// Pre-save middleware
productDetailSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

export const ProductDetail = mongoose.model("ProductDetail", productDetailSchema);

