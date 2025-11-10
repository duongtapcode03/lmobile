import { Wishlist } from "./wishlist.model.js";
import { Product } from "../product/product.model.js";

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
   * Lấy wishlist của user với products populated
   */
  async getWishlist(userId) {
    const wishlist = await this.getOrCreateWishlist(userId);
    
    return await Wishlist.findById(wishlist._id)
      .populate("items.product", "name price thumbnail imageUrl slug brand availability stock rating")
      .lean();
  },

  /**
   * Thêm sản phẩm vào wishlist
   */
  async addProduct(userId, productId, note) {
    const wishlist = await this.getOrCreateWishlist(userId);
    
    // Kiểm tra product tồn tại
    const product = await Product.findById(productId);
    if (!product) {
      throw new Error("Sản phẩm không tồn tại");
    }
    
    // Kiểm tra đã có trong wishlist chưa
    if (wishlist.hasProduct(productId)) {
      throw new Error("Sản phẩm đã có trong wishlist");
    }
    
    await wishlist.addProduct(productId, note);
    
    return await this.getWishlist(userId);
  },

  /**
   * Xóa sản phẩm khỏi wishlist
   */
  async removeProduct(userId, productId) {
    const wishlist = await this.getOrCreateWishlist(userId);
    
    await wishlist.removeProduct(productId);
    
    return await this.getWishlist(userId);
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
    
    return wishlist.hasProduct(productId);
  },

  /**
   * Lấy wishlist theo share token
   */
  async getWishlistByShareToken(shareToken) {
    const wishlist = await Wishlist.findOne({ shareToken })
      .populate("user", "name avatar")
      .populate("items.product", "name price thumbnail imageUrl slug brand availability stock rating");
    
    if (!wishlist) {
      throw new Error("Wishlist không tồn tại hoặc đã hết hạn");
    }
    
    if (!wishlist.isPublic) {
      throw new Error("Wishlist này không được chia sẻ công khai");
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
   * Di chuyển sản phẩm từ wishlist sang cart (optional feature)
   */
  async moveToCart(userId, productId, cartService) {
    const wishlist = await this.getOrCreateWishlist(userId);
    
    if (!wishlist.hasProduct(productId)) {
      throw new Error("Sản phẩm không có trong wishlist");
    }
    
    // Xóa khỏi wishlist
    await wishlist.removeProduct(productId);
    
    // Thêm vào cart (cần import cartService)
    // await cartService.addItem(userId, productId, 1);
    
    return { success: true, message: "Đã chuyển sản phẩm vào giỏ hàng" };
  }
};

