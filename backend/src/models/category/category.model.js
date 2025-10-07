import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    name: { 
      type: String, 
      required: true, 
      unique: true,
      trim: true,
      maxlength: [50, "Tên danh mục không được quá 50 ký tự"]
    },
    description: { 
      type: String, 
      trim: true,
      maxlength: [500, "Mô tả không được quá 500 ký tự"]
    },
    slug: { 
      type: String, 
      unique: true,
      lowercase: true,
      trim: true
    },
    image: { 
      type: String,
      default: ""
    },
    icon: { 
      type: String,
      default: ""
    },
    isActive: { 
      type: Boolean, 
      default: true 
    },
    sortOrder: { 
      type: Number, 
      default: 0 
    },
    parentCategory: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Category",
      default: null
    },
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

// Virtual để lấy số lượng sản phẩm trong danh mục
categorySchema.virtual("productCount", {
  ref: "Product",
  localField: "_id",
  foreignField: "category",
  count: true
});

// Virtual để lấy danh sách sản phẩm con
categorySchema.virtual("subCategories", {
  ref: "Category",
  localField: "_id",
  foreignField: "parentCategory"
});

// Tự động tạo slug từ name
categorySchema.pre("save", function(next) {
  if (this.isModified("name") && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim("-");
  }
  next();
});

// Index để tối ưu tìm kiếm
categorySchema.index({ name: "text", description: "text" });
categorySchema.index({ slug: 1 });
categorySchema.index({ isActive: 1 });
categorySchema.index({ parentCategory: 1 });

export const Category = mongoose.model("Category", categorySchema);
