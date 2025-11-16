import mongoose from "mongoose";

/**
 * Brand Model
 * Thương hiệu sản phẩm
 */
const brandSchema = new mongoose.Schema(
  {
    _id: {
      type: Number,
      required: true
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: [100, "Tên thương hiệu không được quá 100 ký tự"],
      index: true
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true
    },
    logoUrl: {
      type: String,
      trim: true
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Mô tả không được quá 500 ký tự"]
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    metaTitle: {
      type: String,
      trim: true,
      maxlength: [200, "Meta title không được quá 200 ký tự"]
    },
    metaDescription: {
      type: String,
      trim: true,
      maxlength: [500, "Meta description không được quá 500 ký tự"]
    },
    sortOrder: {
      type: Number,
      default: 0,
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
    _id: true // Sử dụng _id là Number
  }
);

// Indexes
brandSchema.index({ isActive: 1, sortOrder: 1 });
brandSchema.index({ slug: 1 }, { unique: true });

// Virtual: số lượng products
brandSchema.virtual("productCount", {
  ref: "Product",
  localField: "_id",
  foreignField: "brandRef",
  count: true
});

// Pre-save middleware
brandSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

export const Brand = mongoose.model("Brand", brandSchema);
