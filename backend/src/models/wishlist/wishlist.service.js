import mongoose from "mongoose";
import { Wishlist } from "./wishlist.model.js";
import { Product } from "../product/product.model.js";
import { AppError } from "../../core/errors/AppError.js";

// Helper function to populate wishlist items manually (since Number ID might not work with mongoose populate)
async function populateWishlistItems(wishlist) {
  if (!wishlist || !wishlist.items || wishlist.items.length === 0) {
    return wishlist;
  }

  const productIds = wishlist.items.map(item => item.product).filter(Boolean);
  if (productIds.length === 0) {
    return wishlist;
  }

  const products = await Product.find({ _id: { $in: productIds } })
    .select("name price priceNumber thumbnail imageUrl stock isActive sku slug brand availability rating reviewCount");

  const productMap = new Map();
  products.forEach(product => {
    productMap.set(product._id, product);
  });

  wishlist.items.forEach(item => {
    // item.product có thể là Number ID hoặc đã được populate thành Product object
    const productId = typeof item.product === 'number' ? item.product : item.product?._id;
    if (productId && productMap.has(productId)) {
      item.product = productMap.get(productId);
    } else if (productId && !productMap.has(productId)) {
      // Product không tìm thấy trong DB - giữ nguyên Number ID để không bị xóa nhầm
      // Chỉ set về Number ID nếu đã bị populate thành object
      if (typeof item.product !== 'number') {
        item.product = productId;
      }
    }
  });

  return wishlist;
}

export const wishlistService = {
  /**
   * Lấy hoặc tạo wishlist của user
   */
  async getOrCreateWishlist(userId) {
    let wishlist = await Wishlist.findOne({ user: userId });
    
    if (!wishlist) {
      wishlist = new Wishlist({ user: userId });
      await wishlist.save();
    }
    
    return wishlist;
  },

  /**
   * Lấy wishlist của user với products populated (manual populate vì Product dùng Number ID)
   * Hỗ trợ pagination
   */
  async getWishlist(userId, query = {}) {
    const wishlist = await this.getOrCreateWishlist(userId);
    
    // Populate products manually (vì Product dùng Number ID, Mongoose không populate được)
    await populateWishlistItems(wishlist);
    
    // Lọc bỏ sản phẩm không còn tồn tại hoặc không active
    const itemsToKeep = [];
    for (let item of wishlist.items) {
      const product = item.product;
      
      // Nếu product là Number ID, query từ DB
      let productData = product;
      if (typeof product === 'number') {
        productData = await Product.findOne({ _id: product });
      }
      
      // Chỉ giữ lại item nếu product tồn tại và active
      if (productData && productData.isActive) {
        // Đảm bảo item.product là Number ID trước khi save
        item.product = typeof productData._id === 'number' ? productData._id : parseInt(productData._id.toString(), 10);
        itemsToKeep.push(item);
      }
    }
    
    // Cập nhật items nếu có thay đổi
    if (itemsToKeep.length !== wishlist.items.length) {
      wishlist.items = itemsToKeep;
      await wishlist.save();
    }
    
    // Populate lại để trả về đầy đủ thông tin
    await populateWishlistItems(wishlist);
    
    // Pagination
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 8;
    const totalItems = wishlist.items.length;
    const totalPages = Math.ceil(totalItems / limit);
    const skip = (page - 1) * limit;
    
    // Slice items theo pagination
    const paginatedItems = wishlist.items.slice(skip, skip + limit);
    
    return {
      ...wishlist.toObject(),
      items: paginatedItems,
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        totalItems: totalItems,
        itemsPerPage: limit
      }
    };
  },

  /**
   * Thêm sản phẩm vào wishlist
   */
  async addProduct(userId, productId, note) {
    try {
      const wishlist = await this.getOrCreateWishlist(userId);
      
      // Normalize productId
      if (productId) {
        productId = String(productId).trim();
      } else {
        throw new AppError("ProductId không hợp lệ", 400);
      }
      
      // Tìm product để lấy _id thực tế (Number)
      let product = null;
      let actualProductId = productId;
      
      // Ưu tiên tìm bằng SKU trước
      product = await Product.findOne({ sku: productId });
      if (product) {
        actualProductId = typeof product._id === 'number' ? product._id : parseInt(product._id.toString(), 10);
      } else {
        // Thử tìm bằng _id Number
        const numericId = parseInt(productId, 10);
        if (!isNaN(numericId)) {
          product = await Product.findOne({ _id: numericId });
          if (product) {
            actualProductId = typeof product._id === 'number' ? product._id : parseInt(product._id.toString(), 10);
          }
        }
      }
      
      if (!product) {
        throw new AppError(`Sản phẩm không tồn tại (ID: ${productId})`, 404);
      }
      
      // Đảm bảo actualProductId là Number (Product model sử dụng Number ID)
      actualProductId = typeof actualProductId === 'number' ? actualProductId : parseInt(actualProductId.toString(), 10);
      
      if (isNaN(actualProductId)) {
        throw new AppError("Không thể xác định ID sản phẩm", 400);
      }
      
      // Kiểm tra đã có trong wishlist chưa (so sánh bằng Number)
      if (wishlist.hasProduct(actualProductId)) {
        throw new AppError("Sản phẩm đã có trong wishlist", 400);
      }
      
      // Lưu vào wishlist với Number ID
      await wishlist.addProduct(actualProductId, note);
      
      return await this.getWishlist(userId);
    } catch (error) {
      // Convert model errors to AppError
      if (error instanceof AppError) {
        throw error;
      }
      if (error.message === "Sản phẩm đã có trong wishlist") {
        throw new AppError(error.message, 400);
      }
      throw new AppError(error.message || "Không thể thêm sản phẩm vào wishlist", 500);
    }
  },

  /**
   * Xóa sản phẩm khỏi wishlist
   */
  async removeProduct(userId, productId) {
    try {
      const wishlist = await this.getOrCreateWishlist(userId);
      
      // Normalize productId
      productId = String(productId).trim();
      
      // Tìm product để lấy _id thực tế
      let actualProductId = productId;
      
      // Ưu tiên tìm bằng SKU trước
      const productBySku = await Product.findOne({ sku: productId });
      if (productBySku) {
        actualProductId = typeof productBySku._id === 'number' ? productBySku._id : parseInt(productBySku._id.toString(), 10);
      } else {
        // Thử tìm bằng _id Number
        const numericId = parseInt(productId, 10);
        if (!isNaN(numericId)) {
          const product = await Product.findOne({ _id: numericId });
          if (product) {
            actualProductId = typeof product._id === 'number' ? product._id : parseInt(product._id.toString(), 10);
          }
        }
      }
      
      // Đảm bảo actualProductId là Number
      const numericProductId = typeof actualProductId === 'number' ? actualProductId : parseInt(actualProductId.toString(), 10);
      
      if (isNaN(numericProductId)) {
        throw new AppError("ProductId không hợp lệ", 400);
      }
      
      await wishlist.removeProduct(numericProductId);
      
      return await this.getWishlist(userId);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      if (error.message === "Sản phẩm không có trong wishlist") {
        throw new AppError(error.message, 404);
      }
      throw new AppError(error.message || "Không thể xóa sản phẩm khỏi wishlist", 500);
    }
  },

  /**
   * Xóa tất cả sản phẩm khỏi wishlist
   */
  async clearWishlist(userId) {
    const wishlist = await this.getOrCreateWishlist(userId);
    wishlist.items = [];
    await wishlist.save();
    
    return wishlist;
  },

  /**
   * Kiểm tra sản phẩm có trong wishlist không
   */
  async checkProductInWishlist(userId, productId) {
    const wishlist = await Wishlist.findOne({ user: userId });
    
    if (!wishlist) {
      return false;
    }
    
      // Normalize productId
      productId = String(productId).trim();
      
      // Tìm product để lấy _id thực tế (Number)
      let actualProductId = productId;
      
      // Ưu tiên tìm bằng SKU trước
      const productBySku = await Product.findOne({ sku: productId });
      if (productBySku) {
        actualProductId = typeof productBySku._id === 'number' ? productBySku._id : parseInt(productBySku._id.toString(), 10);
      } else {
        // Thử tìm bằng _id Number
        const numericId = parseInt(productId, 10);
        if (!isNaN(numericId)) {
          const product = await Product.findOne({ _id: numericId });
          if (product) {
            actualProductId = typeof product._id === 'number' ? product._id : parseInt(product._id.toString(), 10);
          }
        }
      }
      
      // Đảm bảo actualProductId là Number
      const numericProductId = typeof actualProductId === 'number' ? actualProductId : parseInt(actualProductId.toString(), 10);
      
      if (isNaN(numericProductId)) {
        return false;
      }
      
      return wishlist.hasProduct(numericProductId);
  },

  /**
   * Lấy wishlist theo share token
   */
  async getWishlistByShareToken(shareToken) {
    const wishlist = await Wishlist.findOne({ shareToken })
      .populate("user", "name avatar")
      .populate("items.product", "name price thumbnail imageUrl slug brand availability stock rating");
    
    if (!wishlist) {
      throw new AppError("Wishlist không tồn tại hoặc đã hết hạn", 404);
    }
    
    if (!wishlist.isPublic) {
      throw new AppError("Wishlist này không được chia sẻ công khai", 403);
    }
    
    return wishlist;
  },

  /**
   * Tạo share token cho wishlist
   */
  async generateShareToken(userId) {
    const wishlist = await this.getOrCreateWishlist(userId);
    await wishlist.generateShareToken();
    wishlist.isPublic = true;
    await wishlist.save();
    
    return wishlist.shareToken;
  },

  /**
   * Toggle public/private wishlist
   */
  async togglePublic(userId, isPublic) {
    const wishlist = await this.getOrCreateWishlist(userId);
    wishlist.isPublic = isPublic;
    
    if (!isPublic) {
      wishlist.shareToken = undefined;
    } else if (!wishlist.shareToken) {
      await wishlist.generateShareToken();
    }
    
    await wishlist.save();
    return wishlist;
  },

  /**
   * Toggle wishlist - thêm nếu chưa có, xóa nếu đã có (API mới)
   */
  async toggleProduct(userId, productId) {
    try {
      const wishlist = await this.getOrCreateWishlist(userId);
      
      // Normalize productId
      if (productId) {
        productId = String(productId).trim();
      } else {
        throw new AppError("ProductId không hợp lệ", 400);
      }
      
      // Tìm product để lấy _id thực tế
      let product = null;
      let actualProductId = productId;
      
      // Ưu tiên tìm bằng SKU trước
      product = await Product.findOne({ sku: productId });
      if (product) {
        actualProductId = product._id ? product._id.toString() : productId;
      } else {
        // Thử tìm bằng _id (Number hoặc ObjectId)
        if (mongoose.Types.ObjectId.isValid(productId)) {
          try {
            const objectId = new mongoose.Types.ObjectId(productId);
            product = await Product.findById(objectId);
            if (product) {
              actualProductId = product._id ? product._id.toString() : productId;
            }
          } catch (err) {
            // Continue
          }
        }
        
        // Nếu không tìm thấy, thử tìm bằng _id Number
        if (!product) {
          const numericId = parseInt(productId, 10);
          if (!isNaN(numericId)) {
            product = await Product.findOne({ _id: numericId });
            if (product) {
              actualProductId = product._id ? product._id.toString() : productId;
            }
          }
        }
      }
      
      if (!product) {
        throw new AppError(`Sản phẩm không tồn tại (ID: ${productId})`, 404);
      }
      
      // Đảm bảo actualProductId là Number (Product model sử dụng Number ID)
      actualProductId = product._id ? (typeof product._id === 'number' ? product._id : parseInt(product._id.toString(), 10)) : parseInt(actualProductId, 10);
      
      if (isNaN(actualProductId)) {
        throw new AppError("Không thể xác định ID sản phẩm", 400);
      }
      
      // Kiểm tra đã có trong wishlist chưa (so sánh bằng Number)
      const isInWishlist = wishlist.hasProduct(actualProductId);
      
      if (isInWishlist) {
        // Xóa khỏi wishlist
        await wishlist.removeProduct(actualProductId);
        return {
          inWishlist: false,
          message: "Đã xóa sản phẩm khỏi wishlist"
        };
      } else {
        // Thêm vào wishlist
        await wishlist.addProduct(actualProductId);
        return {
          inWishlist: true,
          message: "Đã thêm sản phẩm vào wishlist"
        };
      }
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(error.message || "Không thể cập nhật wishlist", 500);
    }
  },

  /**
   * Di chuyển sản phẩm từ wishlist sang cart (optional feature)
   */
  async moveToCart(userId, productId, cartService) {
    const wishlist = await this.getOrCreateWishlist(userId);
    
    if (!wishlist.hasProduct(productId)) {
      throw new AppError("Sản phẩm không có trong wishlist", 404);
    }
    
    // Xóa khỏi wishlist
    await wishlist.removeProduct(productId);
    
    // Thêm vào cart (cần import cartService)
    // await cartService.addItem(userId, productId, 1);
    
    return { success: true, message: "Đã chuyển sản phẩm vào giỏ hàng" };
  }
};

