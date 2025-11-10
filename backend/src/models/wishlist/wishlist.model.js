import mongoose from "mongoose";

/**
 * Wishlist Model - Lưu danh sách sản phẩm yêu thích của user
 */
const wishlistItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
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
  return this.items.some(
    item => item.product.toString() === productId.toString()
  );
};

// Method để thêm sản phẩm vào wishlist
wishlistSchema.methods.addProduct = function(productId, note) {
  if (this.hasProduct(productId)) {
    throw new Error("Sản phẩm đã có trong wishlist");
  }
  
  this.items.push({
    product: productId,
    addedAt: new Date(),
    note: note || ""
  });
  
  return this.save();
};

// Method để xóa sản phẩm khỏi wishlist
wishlistSchema.methods.removeProduct = function(productId) {
  const index = this.items.findIndex(
    item => item.product.toString() === productId.toString()
  );
  
  if (index === -1) {
    throw new Error("Sản phẩm không có trong wishlist");
  }
  
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

