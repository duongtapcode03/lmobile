import mongoose from "mongoose";

/**
 * Product Image Model
 * Hình ảnh sản phẩm - Tách riêng để giảm document size
 */
const productImageSchema = new mongoose.Schema(
  {
    _id: {
      type: Number,
      required: true
    },
    productId: {
      type: Number,
      ref: "Product",
      required: true,
      index: true
    },
    url: {
      type: String,
      required: true,
      trim: true
    },
    highResUrl: {
      type: String,
      trim: true
    },
    alt: {
      type: String,
      trim: true,
      maxlength: [200, "Alt text không được quá 200 ký tự"]
    },
    color: {
      type: String,
      trim: true,
      default: null
    },
    sortOrder: {
      type: Number,
      default: 1,
      min: [1, "Sort order phải >= 1"]
    },
    isPrimary: {
      type: Boolean,
      default: false,
      index: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true,
    _id: true, // Sử dụng _id là Number
    collection: "product_images"
  }
);

// Indexes
productImageSchema.index({ productId: 1, sortOrder: 1 });
productImageSchema.index({ productId: 1, isPrimary: 1 });

// Virtual: product info
productImageSchema.virtual("product", {
  ref: "Product",
  localField: "productId",
  foreignField: "_id",
  justOne: true
});

// Pre-save middleware
productImageSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

export const ProductImage = mongoose.model("ProductImage", productImageSchema);

