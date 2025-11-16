import { wishlistService } from "./wishlist.service.js";
import { catchAsync } from "../../core/middleware/errorHandler.js";
import { successResponse } from "../../core/utils/response.js";

export const wishlistController = {
  /**
   * Lấy wishlist của user hiện tại (hỗ trợ pagination)
   */
  getMyWishlist: catchAsync(async (req, res) => {
    const wishlist = await wishlistService.getWishlist(req.user.id, req.query);
    successResponse(res, wishlist);
  }),

  /**
   * Thêm sản phẩm vào wishlist
   */
  addProduct: catchAsync(async (req, res) => {
    const { productId } = req.params;
    const { note } = req.body;
    
    const wishlist = await wishlistService.addProduct(req.user.id, productId, note);
    successResponse(res, wishlist, "Đã thêm sản phẩm vào wishlist");
  }),

  /**
   * Xóa sản phẩm khỏi wishlist
   */
  removeProduct: catchAsync(async (req, res) => {
    const { productId } = req.params;
    const wishlist = await wishlistService.removeProduct(req.user.id, productId);
    successResponse(res, wishlist, "Đã xóa sản phẩm khỏi wishlist");
  }),

  /**
   * Xóa tất cả sản phẩm khỏi wishlist
   */
  clearWishlist: catchAsync(async (req, res) => {
    await wishlistService.clearWishlist(req.user.id);
    successResponse(res, null, "Đã xóa tất cả sản phẩm khỏi wishlist");
  }),

  /**
   * Kiểm tra sản phẩm có trong wishlist không
   */
  checkProduct: catchAsync(async (req, res) => {
    const { productId } = req.params;
    const inWishlist = await wishlistService.checkProductInWishlist(req.user.id, productId);
    successResponse(res, { inWishlist });
  }),

  /**
   * Lấy wishlist theo share token (public)
   */
  getWishlistByToken: catchAsync(async (req, res) => {
    const { token } = req.params;
    const wishlist = await wishlistService.getWishlistByShareToken(token);
    successResponse(res, wishlist);
  }),

  /**
   * Tạo share token
   */
  generateShareToken: catchAsync(async (req, res) => {
    const token = await wishlistService.generateShareToken(req.user.id);
    successResponse(res, { shareToken: token }, "Đã tạo link chia sẻ wishlist");
  }),

  /**
   * Toggle public/private wishlist
   */
  togglePublic: catchAsync(async (req, res) => {
    const { isPublic } = req.body;
    const wishlist = await wishlistService.togglePublic(req.user.id, isPublic);
    successResponse(res, wishlist, isPublic ? "Wishlist đã được công khai" : "Wishlist đã được ẩn");
  }),

  /**
   * Toggle product in wishlist - thêm nếu chưa có, xóa nếu đã có (API mới)
   */
  toggleProduct: catchAsync(async (req, res) => {
    const { productId } = req.params;
    const result = await wishlistService.toggleProduct(req.user.id, productId);
    successResponse(res, result, result.message);
  })
};

