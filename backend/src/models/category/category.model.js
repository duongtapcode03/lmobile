import mongoose from "mongoose";

/**
 * Category Model
 * Danh mục sản phẩm
 */
const categorySchema = new mongoose.Schema(
  {
    _id: {
      type: Number,
      required: true
    },
    name: { 
      type: String,
      required: true, 
      trim: true,
      maxlength: [100, "Tên danh mục không được quá 100 ký tự"],
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
    description: { 
      type: String, 
      trim: true,
      maxlength: [500, "Mô tả không được quá 500 ký tự"]
    },
    image: { 
      type: String,
      trim: true
    },
    icon: { 
      type: String,
      trim: true
    },
    isActive: { 
      type: Boolean, 
      default: true,
      index: true
    },
    sortOrder: { 
      type: Number, 
      default: 0,
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
    parentCategory: {
      type: Number,
      ref: "Category",
      default: null,
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
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes
categorySchema.index({ isActive: 1, sortOrder: 1 });
categorySchema.index({ slug: 1 }, { unique: true });
categorySchema.index({ parentCategory: 1 });

// Virtual: số lượng products
categorySchema.virtual("productCount", {
  ref: "Product",
  localField: "_id",
  foreignField: "categoryRefs",
  count: true
});

// Virtual: danh mục con
categorySchema.virtual("subCategories", {
  ref: "Category",
  localField: "_id",
  foreignField: "parentCategory"
});

// Pre-save middleware
categorySchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

export const Category = mongoose.model("Category", categorySchema);
