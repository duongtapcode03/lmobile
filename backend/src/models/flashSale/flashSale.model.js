import mongoose from "mongoose";

/**
 * Flash Sale Model - Quản lý các chương trình flash sale
 */
const flashSaleProductSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true
  },
  flashPrice: {
    type: Number,
    required: true,
    min: [0, "Giá flash sale không được âm"]
  },
  originalPrice: {
    type: Number,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, "Số lượng phải lớn hơn 0"]
  },
  sold: {
    type: Number,
    default: 0,
    min: [0, "Số lượng đã bán không được âm"]
  },
  limitPerUser: {
    type: Number,
    default: 1,
    min: [1, "Giới hạn mỗi user ít nhất là 1"]
  },
  order: {
    type: Number,
    default: 0
  }
}, { _id: false });

const flashSaleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: [200, "Tên flash sale không được quá 200 ký tự"],
      index: true
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, "Mô tả không được quá 1000 ký tự"]
    },
    
    // Thời gian
    startDate: {
      type: Date,
      required: true,
      index: true
    },
    endDate: {
      type: Date,
      required: true,
      index: true,
      validate: {
        validator: function(value) {
          return value > this.startDate;
        },
        message: "Ngày kết thúc phải sau ngày bắt đầu"
      }
    },
    
    // Trạng thái
    status: {
      type: String,
      enum: ["upcoming", "active", "ended", "cancelled"],
      default: "upcoming",
      index: true
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    
    // Cấu hình
    maxQuantityPerUser: {
      type: Number,
      default: 2,
      min: [1, "Số lượng tối đa mỗi user phải lớn hơn 0"]
    },
    totalSlots: {
      type: Number,
      default: 0
    },
    
    // Sản phẩm tham gia
    products: [flashSaleProductSchema],
    
    // Thống kê
    totalSold: {
      type: Number,
      default: 0,
      min: [0, "Tổng số lượng bán không được âm"]
    },
    totalRevenue: {
      type: Number,
      default: 0,
      min: [0, "Tổng doanh thu không được âm"]
    },
    viewCount: {
      type: Number,
      default: 0
    },
    clickCount: {
      type: Number,
      default: 0
    },
    
    // SEO
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
    }],
    
    // Banner/Image
    bannerImage: {
      type: String,
      trim: true
    },
    thumbnail: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual để kiểm tra flash sale đang active
flashSaleSchema.virtual("isActiveNow").get(function() {
  const now = new Date();
  return (
    this.status === "active" &&
    this.isActive &&
    this.startDate <= now &&
    this.endDate >= now
  );
});

// Virtual để tính thời gian còn lại (seconds)
flashSaleSchema.virtual("timeRemaining").get(function() {
  const now = new Date();
  if (this.endDate <= now) return 0;
  return Math.floor((this.endDate - now) / 1000);
});

// Virtual để tính % đã bán
flashSaleSchema.virtual("soldPercentage").get(function() {
  if (this.totalSlots === 0) return 0;
  return Math.floor((this.totalSold / this.totalSlots) * 100);
});

// Tự động tạo slug từ name
flashSaleSchema.pre("save", function(next) {
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

// Auto-update status based on dates
flashSaleSchema.pre("save", function(next) {
  const now = new Date();
  
  if (this.status === "cancelled") {
    return next();
  }
  
  if (this.endDate < now) {
    this.status = "ended";
  } else if (this.startDate <= now && this.endDate >= now) {
    this.status = "active";
  } else if (this.startDate > now) {
    this.status = "upcoming";
  }
  
  // Calculate totalSlots from products
  if (this.products && this.products.length > 0) {
    this.totalSlots = this.products.reduce((sum, p) => sum + p.quantity, 0);
  }
  
  next();
});

// Indexes để tối ưu query
flashSaleSchema.index({ startDate: 1, endDate: 1 });
flashSaleSchema.index({ status: 1, isActive: 1 });
flashSaleSchema.index({ slug: 1 });
flashSaleSchema.index({ "products.productId": 1 });
flashSaleSchema.index({ createdAt: -1 });

export const FlashSale = mongoose.model("FlashSale", flashSaleSchema);









