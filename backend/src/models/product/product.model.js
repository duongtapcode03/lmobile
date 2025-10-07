import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: { 
      type: String, 
      required: true,
      trim: true,
      maxlength: [100, "Tên sản phẩm không được quá 100 ký tự"]
    },
    description: { 
      type: String, 
      required: true,
      trim: true,
      maxlength: [2000, "Mô tả không được quá 2000 ký tự"]
    },
    shortDescription: { 
      type: String,
      trim: true,
      maxlength: [300, "Mô tả ngắn không được quá 300 ký tự"]
    },
    slug: { 
      type: String, 
      unique: true,
      lowercase: true,
      trim: true
    },
    sku: { 
      type: String, 
      unique: true,
      required: true,
      trim: true,
      uppercase: true
    },
    price: { 
      type: Number, 
      required: true,
      min: [0, "Giá không được âm"]
    },
    originalPrice: { 
      type: Number,
      min: [0, "Giá gốc không được âm"]
    },
    discount: { 
      type: Number,
      min: [0, "Giảm giá không được âm"],
      max: [100, "Giảm giá không được quá 100%"],
      default: 0
    },
    category: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Category",
      required: true
    },
    brand: { 
      type: String,
      required: true,
      trim: true,
      maxlength: [50, "Tên thương hiệu không được quá 50 ký tự"]
    },
    model: { 
      type: String,
      trim: true,
      maxlength: [50, "Model không được quá 50 ký tự"]
    },
    images: [{ 
      type: String,
      validate: {
        validator: function(v) {
          return v.length <= 10;
        },
        message: "Không được quá 10 hình ảnh"
      }
    }],
    thumbnail: { 
      type: String,
      default: ""
    },
    specifications: {
      screen: {
        size: String,
        resolution: String,
        technology: String
      },
      processor: {
        chipset: String,
        cpu: String,
        gpu: String
      },
      memory: {
        ram: String,
        storage: String,
        expandable: Boolean
      },
      camera: {
        rear: String,
        front: String,
        features: [String]
      },
      battery: {
        capacity: String,
        charging: String,
        wireless: Boolean
      },
      connectivity: {
        network: [String],
        wifi: String,
        bluetooth: String,
        gps: Boolean
      },
      os: String,
      colors: [String],
      weight: String,
      dimensions: String
    },
    variants: [{
      name: String,
      price: Number,
      stock: Number,
      sku: String,
      attributes: {
        color: String,
        storage: String,
        ram: String
      }
    }],
    stock: { 
      type: Number, 
      required: true,
      min: [0, "Số lượng tồn kho không được âm"],
      default: 0
    },
    sold: { 
      type: Number, 
      default: 0,
      min: [0, "Số lượng đã bán không được âm"]
    },
    rating: { 
      type: Number, 
      default: 0,
      min: [0, "Đánh giá không được âm"],
      max: [5, "Đánh giá không được quá 5"]
    },
    reviewCount: { 
      type: Number, 
      default: 0,
      min: [0, "Số lượng đánh giá không được âm"]
    },
    tags: [{ 
      type: String,
      trim: true
    }],
    isActive: { 
      type: Boolean, 
      default: true 
    },
    isFeatured: { 
      type: Boolean, 
      default: false 
    },
    isNew: { 
      type: Boolean, 
      default: true 
    },
    isBestSeller: { 
      type: Boolean, 
      default: false 
    },
    warranty: { 
      type: String,
      default: "12 tháng"
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
    },
    seoKeywords: [{ 
      type: String,
      trim: true
    }]
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual để tính giá sau giảm giá
productSchema.virtual("finalPrice").get(function() {
  if (this.discount > 0) {
    return this.price * (1 - this.discount / 100);
  }
  return this.price;
});

// Virtual để tính số lượng còn lại
productSchema.virtual("availableStock").get(function() {
  return this.stock - this.sold;
});

// Virtual để lấy danh mục
productSchema.virtual("categoryInfo", {
  ref: "Category",
  localField: "category",
  foreignField: "_id",
  justOne: true
});

// Tự động tạo slug từ name
productSchema.pre("save", function(next) {
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

// Tự động tạo SKU nếu chưa có
productSchema.pre("save", function(next) {
  if (!this.sku) {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substr(2, 3).toUpperCase();
    this.sku = `PHONE-${timestamp}-${random}`;
  }
  next();
});

// Index để tối ưu tìm kiếm
productSchema.index({ name: "text", description: "text", brand: "text", tags: "text" });
productSchema.index({ slug: 1 });
productSchema.index({ sku: 1 });
productSchema.index({ category: 1 });
productSchema.index({ brand: 1 });
productSchema.index({ price: 1 });
productSchema.index({ isActive: 1 });
productSchema.index({ isFeatured: 1 });
productSchema.index({ isNew: 1 });
productSchema.index({ isBestSeller: 1 });
productSchema.index({ rating: -1 });
productSchema.index({ sold: -1 });
productSchema.index({ createdAt: -1 });

export const Product = mongoose.model("Product", productSchema);
