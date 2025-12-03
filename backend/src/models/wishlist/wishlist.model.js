import mongoose from "mongoose";

/**
 * Wishlist Model - Lưu danh sách sản phẩm yêu thích của user
 */
const wishlistItemSchema = new mongoose.Schema({
  product: {
    type: Number, // Product model sử dụng Number ID
    ref: "Product",
    required: true
  },
  addedAt: {
    type: Date,
    default: Date.now
  },
  note: {
    type: String,
    trim: true,
    maxlength: [200, "Ghi chú không được quá 200 ký tự"]
  }
}, { _id: false });

const wishlistSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true
    },
    items: [wishlistItemSchema],
    isPublic: {
      type: Boolean,
      default: false
    },
    shareToken: {
      type: String,
      unique: true,
      sparse: true
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual để tính tổng số sản phẩm
wishlistSchema.virtual("totalItems").get(function() {
  return this.items.length;
});

// Virtual để kiểm tra wishlist có trống không
wishlistSchema.virtual("isEmpty").get(function() {
  return this.items.length === 0;
});

// Virtual để kiểm tra sản phẩm đã có trong wishlist chưa
wishlistSchema.methods.hasProduct = function(productId) {
  // Normalize productId to Number for comparison (Product model sử dụng Number ID)
  const normalizedProductId = productId ? (typeof productId === 'number' ? productId : parseInt(String(productId), 10)) : null;
  if (!normalizedProductId || isNaN(normalizedProductId)) return false;
  
  return this.items.some(item => {
    // Normalize item.product to Number for comparison
    const itemProductId = item.product ? (typeof item.product === 'number' ? item.product : parseInt(String(item.product), 10)) : null;
    return itemProductId === normalizedProductId;
  });
};

// Method để thêm sản phẩm vào wishlist
wishlistSchema.methods.addProduct = function(productId, note) {
  // Normalize productId to Number để đảm bảo nhất quán
  const normalizedProductId = productId ? (typeof productId === 'number' ? productId : parseInt(String(productId), 10)) : null;
  if (!normalizedProductId || isNaN(normalizedProductId)) {
    throw new Error("ProductId không hợp lệ");
  }
  
  if (this.hasProduct(normalizedProductId)) {
    throw new Error("Sản phẩm đã có trong wishlist");
  }
  
  console.log('[addProduct Model] Adding productId:', normalizedProductId, 'Type:', typeof normalizedProductId);
  
  this.items.push({
    product: normalizedProductId, // Lưu dưới dạng Number
    addedAt: new Date(),
    note: note || ""
  });
  
  console.log('[addProduct Model] Items after add:', this.items.map(item => ({
    product: item.product,
    productType: typeof item.product
  })));
  
  return this.save();
};

// Method để xóa sản phẩm khỏi wishlist
wishlistSchema.methods.removeProduct = function(productId) {
  // Normalize productId to Number for comparison (Product model sử dụng Number ID)
  const normalizedProductId = productId ? (typeof productId === 'number' ? productId : parseInt(String(productId), 10)) : null;
  if (!normalizedProductId || isNaN(normalizedProductId)) {
    console.log('[removeProduct Model] Invalid productId:', productId, 'Type:', typeof productId);
    throw new Error("ProductId không hợp lệ");
  }
  
  console.log('[removeProduct Model] Looking for productId:', normalizedProductId, 'Type:', typeof normalizedProductId);
  console.log('[removeProduct Model] Current items:', this.items.map(item => ({
    product: item.product,
    productType: typeof item.product,
    productString: String(item.product),
    normalized: item.product ? (typeof item.product === 'number' ? item.product : parseInt(String(item.product), 10)) : null
  })));
  
  const index = this.items.findIndex(item => {
    // Normalize item.product to Number for comparison
    const itemProductId = item.product ? (typeof item.product === 'number' ? item.product : parseInt(String(item.product), 10)) : null;
    const match = itemProductId === normalizedProductId;
    console.log('[removeProduct Model] Comparing:', {
      itemProductId,
      itemProductIdType: typeof itemProductId,
      normalizedProductId,
      normalizedProductIdType: typeof normalizedProductId,
      match
    });
    return match;
  });
  
  if (index === -1) {
    console.log('[removeProduct Model] Product not found in wishlist');
    throw new Error("Sản phẩm không có trong wishlist");
  }
  
  console.log('[removeProduct Model] Found product at index:', index);
  this.items.splice(index, 1);
  return this.save();
};

// Method để tạo share token
wishlistSchema.methods.generateShareToken = function() {
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.random().toString(36).substr(2, 6).toUpperCase();
  this.shareToken = `WL-${timestamp}-${random}`;
  return this.save();
};

// Middleware để tự động tạo wishlist khi user được tạo (optional - có thể tạo khi cần)
// Index để tối ưu truy vấn
wishlistSchema.index({ user: 1 });
wishlistSchema.index({ "items.product": 1 });
wishlistSchema.index({ shareToken: 1 });
wishlistSchema.index({ createdAt: -1 });
wishlistSchema.index({ updatedAt: -1 });

export const Wishlist = mongoose.model("Wishlist", wishlistSchema);

