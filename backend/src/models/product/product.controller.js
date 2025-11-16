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
    console.log('[Product Controller] getById called with id:', req.params.id, 'req.path:', req.path);
    const { includeDetail, includeImages, includeVariants } = req.query;
    const options = {
      includeDetail: includeDetail === 'true' || includeDetail === true,
      includeImages: includeImages === 'true' || includeImages === true,
      includeVariants: includeVariants === 'true' || includeVariants === true
    };
    const product = await productService.getProductById(req.params.id, options);
    if (!product) {
      throw new AppError('Sản phẩm không tồn tại', 404);
    }
    successResponse(res, product);
  }),

  // Lấy sản phẩm theo loại với pagination (API mới)
  getByType: catchAsync(async (req, res) => {
    const { type } = req.params;
    const result = await productService.getProductsByType(type, req.query);
    paginatedResponse(res, result.products, result.pagination);
  }),

  // Lấy sản phẩm theo slug
  getBySlug: catchAsync(async (req, res) => {
    const { includeDetail, includeImages, includeVariants } = req.query;
    const options = {
      includeDetail: includeDetail === 'true' || includeDetail === true,
      includeImages: includeImages === 'true' || includeImages === true,
      includeVariants: includeVariants === 'true' || includeVariants === true
    };
    const product = await productService.getProductBySlug(req.params.slug, options);
    if (!product) {
      throw new AppError('Sản phẩm không tồn tại', 404);
    }
    
    // Flatten detail data into product object for backward compatibility
    if (product.detail) {
      product.description = product.detail.description;
      product.highlights = product.detail.highlights;
      product.promotions = product.detail.promotions;
      product.warranty = product.detail.warranty;
      product.specifications = product.detail.specifications;
      product.contentToc = product.detail.contentToc;
      product.sourceUrl = product.detail.sourceUrl;
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
    console.log('[Product Controller] getByCategory called with categoryId:', req.params.categoryId);
    console.log('[Product Controller] getByCategory query params:', req.query);
    try {
      const result = await productService.getProductsByCategory(req.params.categoryId, req.query);
      paginatedResponse(res, result.products, result.pagination);
    } catch (error) {
      console.error('[Product Controller] getByCategory error:', error);
      throw error;
    }
  }),

  // Lấy sản phẩm theo categoryId (API mới cho CategorySidebar)
  getByCategoryId: catchAsync(async (req, res) => {
    console.log('[Product Controller] getByCategoryId called with categoryId:', req.params.categoryId);
    const result = await productService.getProductsByCategoryId(req.params.categoryId, req.query);
    paginatedResponse(res, result.products, result.pagination);
  }),

  // Lấy sản phẩm chỉ filter theo categoryRefs (đơn giản)
  getByCategoryRefs: catchAsync(async (req, res) => {
    const { categoryRefs } = req.query;
    
    if (!categoryRefs) {
      throw new AppError("Vui lòng cung cấp categoryRefs (có thể là một ID hoặc nhiều ID phân cách bằng dấu phẩy)", 400);
    }

    const result = await productService.getProductsByCategoryRefs(categoryRefs, req.query);
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

  // API search nhanh cho dropdown header (tối đa 4 sản phẩm)
  quickSearch: catchAsync(async (req, res) => {
    const { q, limit = 4 } = req.query;
    if (!q || q.trim().length < 2) {
      return res.json({
        success: true,
        data: [],
        total: 0
      });
    }

    const result = await productService.quickSearchProducts(q, limit);
    res.json({
      success: true,
      data: result.products,
      total: result.total
    });
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

};
