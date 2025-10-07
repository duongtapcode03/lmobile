import { productService } from "./product.service.js";

export const productController = {
  // Tạo sản phẩm mới
  create: async (req, res) => {
    try {
      const product = await productService.createProduct(req.body);
      res.status(201).json({
        success: true,
        message: "Tạo sản phẩm thành công",
        data: product
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  },

  // Lấy tất cả sản phẩm với phân trang, lọc và tìm kiếm
  getAll: async (req, res) => {
    try {
      const result = await productService.getAllProducts(req.query);
      res.json({
        success: true,
        data: result.products,
        pagination: result.pagination
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  // Lấy sản phẩm theo ID
  getById: async (req, res) => {
    try {
      const product = await productService.getProductById(req.params.id);
      res.json({
        success: true,
        data: product
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        message: error.message
      });
    }
  },

  // Lấy sản phẩm theo slug
  getBySlug: async (req, res) => {
    try {
      const product = await productService.getProductBySlug(req.params.slug);
      res.json({
        success: true,
        data: product
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        message: error.message
      });
    }
  },

  // Cập nhật sản phẩm
  update: async (req, res) => {
    try {
      const product = await productService.updateProduct(req.params.id, req.body);
      res.json({
        success: true,
        message: "Cập nhật sản phẩm thành công",
        data: product
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  },

  // Xóa sản phẩm
  delete: async (req, res) => {
    try {
      const result = await productService.deleteProduct(req.params.id);
      res.json({
        success: true,
        message: result.message
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  },

  // Lấy sản phẩm theo danh mục
  getByCategory: async (req, res) => {
    try {
      const result = await productService.getProductsByCategory(req.params.categoryId, req.query);
      res.json({
        success: true,
        data: result.products,
        pagination: result.pagination
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  // Lấy sản phẩm nổi bật
  getFeatured: async (req, res) => {
    try {
      const limit = req.query.limit || 8;
      const products = await productService.getFeaturedProducts(limit);
      res.json({
        success: true,
        data: products
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  // Lấy sản phẩm mới
  getNew: async (req, res) => {
    try {
      const limit = req.query.limit || 8;
      const products = await productService.getNewProducts(limit);
      res.json({
        success: true,
        data: products
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  // Lấy sản phẩm bán chạy
  getBestSeller: async (req, res) => {
    try {
      const limit = req.query.limit || 8;
      const products = await productService.getBestSellerProducts(limit);
      res.json({
        success: true,
        data: products
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  // Lấy sản phẩm liên quan
  getRelated: async (req, res) => {
    try {
      const limit = req.query.limit || 4;
      const products = await productService.getRelatedProducts(req.params.id, limit);
      res.json({
        success: true,
        data: products
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  // Tìm kiếm sản phẩm
  search: async (req, res) => {
    try {
      const { q } = req.query;
      if (!q) {
        return res.status(400).json({
          success: false,
          message: "Vui lòng nhập từ khóa tìm kiếm"
        });
      }

      const result = await productService.searchProducts(q, req.query);
      res.json({
        success: true,
        data: result.products,
        pagination: result.pagination
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  // Cập nhật số lượng tồn kho
  updateStock: async (req, res) => {
    try {
      const { quantity, operation = "set" } = req.body;
      const product = await productService.updateStock(req.params.id, quantity, operation);
      res.json({
        success: true,
        message: "Cập nhật tồn kho thành công",
        data: product
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  },

  // Cập nhật số lượng đã bán
  updateSold: async (req, res) => {
    try {
      const { quantity } = req.body;
      const product = await productService.updateSold(req.params.id, quantity);
      res.json({
        success: true,
        message: "Cập nhật số lượng bán thành công",
        data: product
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  },

  // Cập nhật đánh giá
  updateRating: async (req, res) => {
    try {
      const { rating, reviewCount } = req.body;
      const product = await productService.updateRating(req.params.id, rating, reviewCount);
      res.json({
        success: true,
        message: "Cập nhật đánh giá thành công",
        data: product
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  },

  // Toggle trạng thái active
  toggleActive: async (req, res) => {
    try {
      const product = await productService.toggleActive(req.params.id);
      res.json({
        success: true,
        message: `Sản phẩm đã được ${product.isActive ? 'kích hoạt' : 'vô hiệu hóa'}`,
        data: product
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  },

  // Lấy thống kê sản phẩm
  getStats: async (req, res) => {
    try {
      const stats = await productService.getProductStats();
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  // Lấy danh sách thương hiệu
  getBrands: async (req, res) => {
    try {
      const brands = await productService.getBrands();
      res.json({
        success: true,
        data: brands
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  // Lấy danh sách tags
  getTags: async (req, res) => {
    try {
      const tags = await productService.getTags();
      res.json({
        success: true,
        data: tags
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
};
