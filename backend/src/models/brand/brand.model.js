import mongoose from "mongoose";

/**
 * Brand Model - Lưu trữ thông tin các thương hiệu điện thoại
 * Model này match với cấu trúc brands_data.json
 */
const brandSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      maxlength: [100, "Tên thương hiệu không được quá 100 ký tự"],
      index: true
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
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
    sortOrder: {
      type: Number,
      default: 0
    },
    // SEO fields
    metaTitle: {
      type: String,
      trim: true,
      maxlength: [60, "Meta title không được quá 60 ký tự"]
    },
    metaDescription: {
      type: String,
      trim: true,
      maxlength: [160, "Meta description không được quá 160 ký tự"]
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual để lấy số lượng products của brand (từ Product collection)
brandSchema.virtual("productCount", {
  ref: "Product",
  localField: "_id",
  foreignField: "brandRef",
  count: true
});


// Tự động tạo slug từ name nếu chưa có
brandSchema.pre("save", function(next) {
  if (this.isModified("name") && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim("-");
  }
  next();
});

// Indexes để tối ưu query
brandSchema.index({ name: "text", description: "text" });
brandSchema.index({ slug: 1 });
brandSchema.index({ isActive: 1, sortOrder: 1 });
brandSchema.index({ createdAt: -1 });

export const Brand = mongoose.model("Brand", brandSchema);

