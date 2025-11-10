import { productService } from "./product.service.js";
import { catchAsync } from "../../core/middleware/errorHandler.js";
import { AppError } from "../../core/errors/AppError.js";
import { createdResponse, paginatedResponse, successResponse, notFoundResponse } from "../../core/utils/response.js";

export const productController = {
  // Tạo sản phẩm mới
  create: catchAsync(async (req, res) => {
    const product = await productService.createProduct(req.body);
    createdResponse(res, product, "Tạo sản phẩm thành công");
  }),

  // Lấy tất cả sản phẩm với phân trang, lọc và tìm kiếm
  getAll: catchAsync(async (req, res) => {
    const result = await productService.getAllProducts(req.query);
    paginatedResponse(res, result.products, result.pagination);
  }),

  // Lấy sản phẩm theo ID
  getById: catchAsync(async (req, res) => {
    const product = await productService.getProductById(req.params.id);
    if (!product) {
      throw new AppError('Sản phẩm không tồn tại', 404);
    }
    successResponse(res, product);
  }),

  // Lấy sản phẩm theo slug
  getBySlug: catchAsync(async (req, res) => {
    const product = await productService.getProductBySlug(req.params.slug);
    if (!product) {
      throw new AppError('Sản phẩm không tồn tại', 404);
    }
    successResponse(res, product);
  }),

  // Cập nhật sản phẩm
  update: catchAsync(async (req, res) => {
    const product = await productService.updateProduct(req.params.id, req.body);
    successResponse(res, product, "Cập nhật sản phẩm thành công");
  }),

  // Xóa sản phẩm
  delete: catchAsync(async (req, res) => {
    const result = await productService.deleteProduct(req.params.id);
    successResponse(res, null, result.message);
  }),

  // Lấy sản phẩm theo danh mục
  getByCategory: catchAsync(async (req, res) => {
    const result = await productService.getProductsByCategory(req.params.categoryId, req.query);
    paginatedResponse(res, result.products, result.pagination);
  }),

  // Lấy sản phẩm nổi bật
  getFeatured: catchAsync(async (req, res) => {
    const limit = req.query.limit || 8;
    const products = await productService.getFeaturedProducts(limit);
    successResponse(res, products);
  }),

  // Lấy sản phẩm mới
  getNew: catchAsync(async (req, res) => {
    const limit = req.query.limit || 8;
    const products = await productService.getNewProducts(limit);
    successResponse(res, products);
  }),

  // Lấy sản phẩm bán chạy
  getBestSeller: catchAsync(async (req, res) => {
    const limit = req.query.limit || 8;
    const products = await productService.getBestSellerProducts(limit);
    successResponse(res, products);
  }),

  // Lấy sản phẩm liên quan
  getRelated: catchAsync(async (req, res) => {
    const limit = req.query.limit || 4;
    const products = await productService.getRelatedProducts(req.params.id, limit);
    successResponse(res, products);
  }),

  // Tìm kiếm sản phẩm
  search: catchAsync(async (req, res) => {
    const { q } = req.query;
    if (!q) {
      throw new AppError("Vui lòng nhập từ khóa tìm kiếm", 400);
    }

    const result = await productService.searchProducts(q, req.query);
    paginatedResponse(res, result.products, result.pagination);
  }),

  // Cập nhật số lượng tồn kho
  updateStock: catchAsync(async (req, res) => {
    const { quantity, operation = "set" } = req.body;
    const product = await productService.updateStock(req.params.id, quantity, operation);
    successResponse(res, product, "Cập nhật tồn kho thành công");
  }),

  // Cập nhật số lượng đã bán
  updateSold: catchAsync(async (req, res) => {
    const { quantity } = req.body;
    const product = await productService.updateSold(req.params.id, quantity);
    successResponse(res, product, "Cập nhật số lượng bán thành công");
  }),

  // Cập nhật đánh giá
  updateRating: catchAsync(async (req, res) => {
    const { rating, reviewCount } = req.body;
    const product = await productService.updateRating(req.params.id, rating, reviewCount);
    successResponse(res, product, "Cập nhật đánh giá thành công");
  }),

  // Toggle trạng thái active
  toggleActive: catchAsync(async (req, res) => {
    const product = await productService.toggleActive(req.params.id);
    successResponse(res, product, `Sản phẩm đã được ${product.isActive ? 'kích hoạt' : 'vô hiệu hóa'}`);
  }),

  // Lấy thống kê sản phẩm
  getStats: catchAsync(async (req, res) => {
    const stats = await productService.getProductStats();
    successResponse(res, stats);
  }),

  // Lấy danh sách thương hiệu
  getBrands: catchAsync(async (req, res) => {
    const brands = await productService.getBrands();
    successResponse(res, brands);
  }),

  // Lấy danh sách tags
  getTags: catchAsync(async (req, res) => {
    const tags = await productService.getTags();
    successResponse(res, tags);
  }),

  // ==================== FLASH SALE ENDPOINTS ====================
  
  // Lấy tất cả flash sale đang active
  getFlashSales: catchAsync(async (req, res) => {
    const result = await productService.getFlashSaleProducts(req.query);
    paginatedResponse(res, result.products, result.pagination);
  }),

  // Lấy flash sale sắp tới
  getUpcomingFlashSales: catchAsync(async (req, res) => {
    const limit = req.query.limit || 10;
    const products = await productService.getUpcomingFlashSales(limit);
    successResponse(res, products);
  }),

  // Kiểm tra flash sale availability
  checkFlashSaleAvailability: catchAsync(async (req, res) => {
    const { productId } = req.params;
    const { quantity = 1 } = req.query;
    const result = await productService.checkFlashSaleAvailability(productId, parseInt(quantity));
    successResponse(res, result);
  }),

  // Lấy thống kê flash sale
  getFlashSaleStats: catchAsync(async (req, res) => {
    const stats = await productService.getFlashSaleStats();
    successResponse(res, stats);
  }),

  // ==================== QUICK SALE ENDPOINTS ====================
  
  // Lấy tất cả sản phẩm quick sale (cho homepage widget)
  getQuickSales: catchAsync(async (req, res) => {
    const result = await productService.getQuickSaleProducts(req.query);
    successResponse(res, {
      products: result.products,
      total: result.total,
      limit: result.limit
    });
  })
};
