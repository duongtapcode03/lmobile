import mongoose from "mongoose";

/**
 * Product Model - Unified model cho products/phones
 * Merge PhoneDetail và Product thành một model duy nhất
 */

// Nested schemas từ PhoneDetail
const productImageSchema = new mongoose.Schema({
  url: {
    type: String,
    required: true
  },
  highResUrl: {
    type: String
  },
  alt: {
    type: String
  },
  color: {
    type: String
  }
}, { _id: false });

const colorVariantSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  imageUrl: {
    type: String
  }
}, { _id: false });

const versionSchema = new mongoose.Schema({
  sku: {
    type: String
  },
  label: {
    type: String
  },
  price: {
    type: String
  }
}, { _id: false });

const colorSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  sku: {
    type: String
  },
  price: {
    type: String
  },
  imageUrl: {
    type: String
  }
}, { _id: false });

const warrantyItemSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true
  }
}, { _id: false });

const contentTocSchema = new mongoose.Schema({
  id: {
    type: String
  },
  title: {
    type: String
  }
}, { _id: false });

const productSchema = new mongoose.Schema(
  {
    // Basic Information
    name: { 
      type: String, 
      required: true,
      trim: true,
      maxlength: [200, "Tên sản phẩm không được quá 200 ký tự"],
      index: true
    },
    description: { 
      type: String, 
      trim: true,
      maxlength: [5000, "Mô tả không được quá 5000 ký tự"]
    },
    shortDescription: { 
      type: String,
      trim: true,
      maxlength: [500, "Mô tả ngắn không được quá 500 ký tự"]
    },
    slug: { 
      type: String, 
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
      index: true
    },
    sku: { 
      type: String, 
      unique: true,
      sparse: true,
      required: true,
      trim: true,
      uppercase: true,
      index: true
    },
    
    // Pricing Information (hỗ trợ cả Number và String)
    price: { 
      type: mongoose.Schema.Types.Mixed, // Có thể là Number hoặc String
      index: true
    },
    priceNumber: {
      type: Number,
      min: [0, "Giá không được âm"],
      index: true
    },
    originalPrice: { 
      type: mongoose.Schema.Types.Mixed
    },
    oldPrice: {
      type: String
    },
    discount: { 
      type: mongoose.Schema.Types.Mixed,
      min: [0, "Giảm giá không được âm"],
      max: [100, "Giảm giá không được quá 100%"],
      default: 0
    },
    discountRate: {
      type: String
    },
    memberPrice: {
      type: String
    },
    lastPrice: {
      type: String
    },
    installmentPrice: {
      type: String
    },
    memberDiscount: {
      type: String
    },
    points: {
      type: String
    },
    extraPoints: {
      type: String
    },
    
    // Category and Brand - Many-to-Many relationships
    // Product belongs to ONE brand (many-to-one)
    brandRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Brand",
      required: true,
      index: true
    },
    // Product belongs to MANY categories (many-to-many)
    categoryRefs: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      index: true
    }],
    model: { 
      type: String,
      trim: true,
      maxlength: [100, "Model không được quá 100 ký tự"]
    },
    sourceUrl: {
      type: String,
      trim: true
    },
    
    // Images - hỗ trợ cả simple strings và objects
    images: [{
      type: mongoose.Schema.Types.Mixed // Có thể là String hoặc productImageSchema
    }],
    imageUrl: {
      type: String
    },
    thumbnail: { 
      type: String,
      default: ""
    },
    
    // Product Details from PhoneDetail
    availability: {
      type: Number,
      default: 0,
      index: true
    },
    cpu: {
      type: String,
      index: true
    },
    storage: {
      type: String,
      index: true
    },
    screenSize: {
      type: String,
      index: true
    },
    
    // Complex Nested Arrays from PhoneDetail
    colorVariants: [colorVariantSchema],
    versions: [versionSchema],
    colors: [colorSchema],
    promotions: [{
      type: String
    }],
    morePromotionsCount: {
      type: Number,
      default: 0
    },
    highlights: [{
      type: String
    }],
    contentToc: [contentTocSchema],
    
    // Warranty - hỗ trợ cả String và Array
    warranty: {
      type: mongoose.Schema.Types.Mixed // Có thể là String hoặc Array
    },
    warrantyItems: [warrantyItemSchema], // Chi tiết warranty từ PhoneDetail
    
    // Specifications - hỗ trợ cả Object và Map
    specifications: {
      type: mongoose.Schema.Types.Mixed, // Có thể là structured object hoặc Map
      default: {}
    },
    
    // Variants (từ Product cũ)
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
    
    // Stock Management
    stock: { 
      type: Number, 
      min: [0, "Số lượng tồn kho không được âm"],
      default: 0
    },
    sold: { 
      type: Number, 
      default: 0,
      min: [0, "Số lượng đã bán không được âm"]
    },
    
    // Ratings and Reviews
    rating: { 
      type: Number, 
      default: 0,
      min: [0, "Đánh giá không được âm"],
      max: [5, "Đánh giá không được quá 5"],
      index: true
    },
    reviewCount: { 
      type: Number, 
      default: 0,
      min: [0, "Số lượng đánh giá không được âm"]
    },
    
    // Tags
    tags: [{ 
      type: String,
      trim: true
    }],
    
    // Status Flags
    isActive: { 
      type: Boolean, 
      default: true,
      index: true
    },
    isFeatured: { 
      type: Boolean, 
      default: false,
      index: true
    },
    isNew: { 
      type: Boolean, 
      default: true,
      index: true
    },
    isBestSeller: { 
      type: Boolean, 
      default: false,
      index: true
    },
    
    // Flash Sale Fields
    isFlashSale: {
      type: Boolean,
      default: false,
      index: true
    },
    flashPrice: {
      type: Number,
      min: [0, "Giá flash sale không được âm"]
    },
    flashOriginalPrice: {
      type: Number,
      min: [0, "Giá gốc flash sale không được âm"]
    },
    flashQuantity: {
      type: Number,
      min: [0, "Số lượng flash sale không được âm"]
    },
    flashSold: {
      type: Number,
      default: 0,
      min: [0, "Số lượng đã bán flash sale không được âm"]
    },
    flashStartDate: {
      type: Date,
      index: true
    },
    flashEndDate: {
      type: Date,
      index: true
    },
    flashDiscount: {
      type: Number,
      min: [0, "Phần trăm giảm giá không được âm"],
      max: [100, "Phần trăm giảm giá không được quá 100"]
    },
    flashLimitPerUser: {
      type: Number,
      default: 1,
      min: [1, "Giới hạn mỗi user ít nhất là 1"]
    },
    flashSaleName: {
      type: String,
      trim: true
    },
    
    // Quick Sale Fields (for homepage quick sales widget)
    isQuickSale: {
      type: Boolean,
      default: false,
      index: true
    },
    quickSaleImageUrl: {
      type: String,
      trim: true
    },
    quickSaleTitle: {
      type: String,
      trim: true,
      maxlength: [200, "Quick sale title không được quá 200 ký tự"]
    },
    quickSaleAlt: {
      type: String,
      trim: true
    },
    quickSaleUtmSource: {
      type: String,
      trim: true,
      default: "QTwebsite"
    },
    quickSaleUtmMedium: {
      type: String,
      trim: true,
      default: "Banner_web"
    },
    quickSaleUtmCampaign: {
      type: String,
      trim: true
    },
    quickSaleOrder: {
      type: Number,
      default: 0,
      min: [0, "Thứ tự quick sale không được âm"]
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
  if (this.priceNumber) {
    return this.priceNumber;
  }
  if (typeof this.price === 'number') {
    if (this.discount && typeof this.discount === 'number' && this.discount > 0) {
      return this.price * (1 - this.discount / 100);
    }
    return this.price;
  }
  // Nếu price là string, parse nó
  if (typeof this.price === 'string') {
    const priceNum = parseFloat(this.price.replace(/[^\d.]/g, "")) || 0;
    if (this.discount && typeof this.discount === 'number' && this.discount > 0) {
      return priceNum * (1 - this.discount / 100);
    }
    return priceNum;
  }
  return 0;
});

// Virtual để tính giá dạng số từ string price
productSchema.virtual("priceNumberValue").get(function() {
  if (this.priceNumber) return this.priceNumber;
  if (typeof this.price === 'number') return this.price;
  if (typeof this.price === 'string') {
    return parseFloat(this.price.replace(/[^\d.]/g, "")) || 0;
  }
  return 0;
});

// Virtual để tính oldPriceNumber
productSchema.virtual("oldPriceNumber").get(function() {
  if (this.originalPrice && typeof this.originalPrice === 'number') {
    return this.originalPrice;
  }
  if (this.oldPrice && typeof this.oldPrice === 'string') {
    return parseFloat(this.oldPrice.replace(/[^\d.]/g, "")) || 0;
  }
  return 0;
});

// Virtual để kiểm tra có discount không
productSchema.virtual("hasDiscount").get(function() {
  if (this.discount && typeof this.discount === 'number' && this.discount > 0) {
    return true;
  }
  if (this.discount && typeof this.discount === 'string' && this.discount !== null) {
    return true;
  }
  return false;
});

// Virtual để tính số lượng còn lại
productSchema.virtual("availableStock").get(function() {
  const stock = this.stock || 0;
  const sold = this.sold || 0;
  return Math.max(0, stock - sold);
});

// Virtual để kiểm tra còn hàng
productSchema.virtual("inStock").get(function() {
  return this.availability === 1 || (this.stock && this.stock > 0);
});

// Virtual để kiểm tra flash sale đang active
productSchema.virtual("isFlashSaleActive").get(function() {
  if (!this.isFlashSale) return false;
  const now = new Date();
  return (
    this.flashStartDate &&
    this.flashEndDate &&
    new Date(this.flashStartDate) <= now &&
    new Date(this.flashEndDate) >= now &&
    (this.flashSold || 0) < (this.flashQuantity || 0)
  );
});

// Virtual để tính số lượng flash sale còn lại
productSchema.virtual("flashSaleRemaining").get(function() {
  if (!this.isFlashSale || !this.flashQuantity) return 0;
  return Math.max(0, this.flashQuantity - (this.flashSold || 0));
});

// Virtual để tính thời gian còn lại flash sale (seconds)
productSchema.virtual("flashSaleTimeRemaining").get(function() {
  if (!this.isFlashSale || !this.flashEndDate) return 0;
  const now = new Date();
  const endDate = new Date(this.flashEndDate);
  if (endDate <= now) return 0;
  return Math.floor((endDate - now) / 1000);
});

// Virtual để lấy danh sách categories (many-to-many)
productSchema.virtual("categories", {
  ref: "Category",
  localField: "categoryRefs",
  foreignField: "_id"
});

// Virtual để lấy brand info
productSchema.virtual("brandInfo", {
  ref: "Brand",
  localField: "brandRef",
  foreignField: "_id",
  justOne: true
});

// Tự động tạo slug từ name
productSchema.pre("save", function(next) {
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

// Tự động tạo SKU nếu chưa có
productSchema.pre("save", function(next) {
  if (!this.sku) {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substr(2, 3).toUpperCase();
    this.sku = `PHONE-${timestamp}-${random}`;
  }
  next();
});

// Auto-parse price string to priceNumber
productSchema.pre("save", function(next) {
  if (this.isModified("price") && !this.priceNumber) {
    if (typeof this.price === 'string') {
      this.priceNumber = parseFloat(this.price.replace(/[^\d.]/g, "")) || 0;
    } else if (typeof this.price === 'number') {
      this.priceNumber = this.price;
    }
  }
  next();
});

// Index để tối ưu tìm kiếm
productSchema.index({ name: "text", description: "text", tags: "text", cpu: "text" });
productSchema.index({ slug: 1 });
productSchema.index({ sku: 1 });
productSchema.index({ categoryRefs: 1 });
productSchema.index({ brandRef: 1 });
productSchema.index({ price: 1 });
productSchema.index({ priceNumber: 1 });
productSchema.index({ availability: 1 });
productSchema.index({ isActive: 1 });
productSchema.index({ isFeatured: 1 });
productSchema.index({ isNew: 1 });
productSchema.index({ isBestSeller: 1 });
productSchema.index({ rating: -1 });
productSchema.index({ sold: -1 });
productSchema.index({ isFlashSale: 1, flashStartDate: 1, flashEndDate: 1 });
productSchema.index({ flashStartDate: 1, flashEndDate: 1 });
productSchema.index({ isQuickSale: 1, quickSaleOrder: 1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ updatedAt: -1 });

export const Product = mongoose.model("Product", productSchema);
