import mongoose from "mongoose";

/**
 * Product Variant Model
 * Các biến thể của sản phẩm (storage, color, etc.)
 */
const productVariantSchema = new mongoose.Schema(
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
    type: {
      type: String,
      required: true,
      enum: ["storage", "color", "default", "other"],
      index: true
    },
    sku: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      index: true
    },
    label: {
      type: String,
      required: true,
      trim: true,
      maxlength: [100, "Label không được quá 100 ký tự"]
    },
    price: {
      type: String,
      required: true,
      trim: true
    },
    priceNumber: {
      type: Number,
      required: true,
      min: [0, "Giá phải >= 0"],
      index: true
    },
    imageUrl: {
      type: String,
      trim: true,
      default: null
    },
    isDefault: {
      type: Boolean,
      default: false,
      index: true
    },
    sortOrder: {
      type: Number,
      default: 1,
      min: [1, "Sort order phải >= 1"]
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
    collection: "product_variants"
  }
);

// Indexes
productVariantSchema.index({ productId: 1, type: 1 });
productVariantSchema.index({ productId: 1, isDefault: 1 });
productVariantSchema.index({ productId: 1, sortOrder: 1 });
productVariantSchema.index({ priceNumber: 1 });
productVariantSchema.index({ sku: 1 });

// Virtual: product info
productVariantSchema.virtual("product", {
  ref: "Product",
  localField: "productId",
  foreignField: "_id",
  justOne: true
});

// Pre-save middleware
productVariantSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

// Validation: chỉ có 1 default variant per product
productVariantSchema.pre("save", async function (next) {
  if (this.isDefault) {
    const ProductVariant = mongoose.model("ProductVariant");
    await ProductVariant.updateMany(
      { productId: this.productId, _id: { $ne: this._id } },
      { $set: { isDefault: false } }
    );
  }
  next();
});

export const ProductVariant = mongoose.model("ProductVariant", productVariantSchema);

