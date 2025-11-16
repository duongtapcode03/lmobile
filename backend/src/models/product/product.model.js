import mongoose from "mongoose";

/**
 * Product Model - Core Data (Normalized)
 * Dữ liệu cơ bản của sản phẩm, tối ưu cho list view và query
 */
const productSchema = new mongoose.Schema(
  {
    _id: {
      type: Number,
      required: true
    },
    // Basic Information
    name: { 
      type: String, 
      required: true,
      trim: true,
      maxlength: [200, "Tên sản phẩm không được quá 200 ký tự"],
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
    sku: { 
      type: String, 
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      index: true
    },
    shortDescription: {
      type: String,
      trim: true,
      maxlength: [500, "Mô tả ngắn không được quá 500 ký tự"]
    },
    model: {
      type: String,
      trim: true,
      maxlength: [100, "Model không được quá 100 ký tự"]
    },
    
    // References
    brandRef: {
      type: Number,
      ref: "Brand",
      required: true,
      index: true
    },
    categoryRefs: {
      type: [Number],
      ref: "Category",
      default: [],
      index: true
    },
    
    // Pricing
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
    oldPrice: {
      type: String,
      trim: true
    },
    oldPriceNumber: {
      type: Number,
      min: [0, "Giá cũ phải >= 0"],
      index: true
    },
    importPrice: {
      type: Number,
      min: [0, "Giá nhập phải >= 0"],
      default: 0
    },
    discount: {
      type: Number,
      min: [0, "Giảm giá phải >= 0"],
      max: [100, "Giảm giá không được quá 100%"],
      default: null
    },
    
    // Images (chỉ thumbnail và imageUrl chính)
    thumbnail: {
      type: String,
      trim: true
    },
    imageUrl: {
      type: String,
      trim: true
    },
    
    // Stock & Stats
    stock: { 
      type: Number, 
      required: true,
      min: [0, "Số lượng tồn kho phải >= 0"],
      default: 0,
      index: true
    },
    sold: { 
      type: Number, 
      min: [0, "Số lượng đã bán phải >= 0"],
      default: 0
    },
    rating: { 
      type: Number, 
      min: [0, "Đánh giá phải >= 0"],
      max: [5, "Đánh giá không được quá 5"],
      default: 0
    },
    reviewCount: { 
      type: Number, 
      min: [0, "Số lượng đánh giá phải >= 0"],
      default: 0
    },
    
    // Flags
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
      default: false,
      index: true
    },
    isBestSeller: { 
      type: Boolean, 
      default: false,
      index: true
    },
    availability: {
      type: Number,
      default: 1,
      enum: [0, 1, 2], // 0: Out of stock, 1: In stock, 2: Pre-order
      index: true
    },
    
    // Tech Specs (chỉ các trường filter được)
    cpu: {
      type: String,
      trim: true,
      index: true
    },
    storage: {
      type: String,
      trim: true,
      index: true
    },
    screenSize: {
      type: String,
      trim: true
    },
    
    // SEO
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
    seoKeywords: {
      type: [String],
      default: []
    },
    tags: {
      type: [String],
      default: [],
      index: true
    },
    
    createdAt: {
      type: Date,
      default: Date.now,
      index: true
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

// Indexes - Tối ưu cho query
productSchema.index({ priceNumber: 1 });
productSchema.index({ brandRef: 1, isActive: 1 });
productSchema.index({ categoryRefs: 1, isActive: 1 });
productSchema.index({ isFeatured: 1, isActive: 1 });
productSchema.index({ isNew: 1, isActive: 1 });
productSchema.index({ isBestSeller: 1, isActive: 1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ slug: 1 }, { unique: true });
productSchema.index({ sku: 1 }, { unique: true });
productSchema.index({ tags: 1 });

// Compound indexes cho filter phổ biến
productSchema.index({ brandRef: 1, priceNumber: 1, isActive: 1 });
productSchema.index({ categoryRefs: 1, priceNumber: 1, isActive: 1 });

// Virtual: brand info
productSchema.virtual("brand", {
  ref: "Brand",
  localField: "brandRef",
  foreignField: "_id",
  justOne: true
});

// Virtual: categories info
productSchema.virtual("categories", {
  ref: "Category",
  localField: "categoryRefs",
  foreignField: "_id"
});

// Virtual: images count
productSchema.virtual("imagesCount", {
  ref: "ProductImage",
  localField: "_id",
  foreignField: "productId",
  count: true
});

// Virtual: variants count
productSchema.virtual("variantsCount", {
  ref: "ProductVariant",
  localField: "_id",
  foreignField: "productId",
  count: true
});

// Methods
productSchema.methods.isInStock = function () {
  return this.stock > 0 && this.isActive;
};

productSchema.methods.getDiscountPercent = function () {
  if (!this.oldPriceNumber || this.oldPriceNumber <= this.priceNumber) {
    return 0;
  }
  return Math.round(((this.oldPriceNumber - this.priceNumber) / this.oldPriceNumber) * 100);
};

// Pre-save middleware
productSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  
  // Auto calculate discount if not set
  if (this.discount === null && this.oldPriceNumber && this.oldPriceNumber > this.priceNumber) {
    this.discount = this.getDiscountPercent();
  }
  
  // Auto set availability based on stock
  if (this.stock === 0) {
    this.availability = 0;
  } else if (this.availability === 0 && this.stock > 0) {
    this.availability = 1;
    }
  
  next();
});

export const Product = mongoose.model("Product", productSchema);
