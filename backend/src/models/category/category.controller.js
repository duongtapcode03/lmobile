import { categoryService } from "./category.service.js";

export const categoryController = {
  // Tạo danh mục mới
  create: async (req, res) => {
    try {
      const category = await categoryService.createCategory(req.body);
      res.status(201).json({
        success: true,
        message: "Tạo danh mục thành công",
        data: category
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  },

  // Lấy tất cả danh mục với phân trang và lọc
  getAll: async (req, res) => {
    try {
      const result = await categoryService.getAllCategories(req.query);
      res.json({
        success: true,
        data: result.categories,
        pagination: result.pagination
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  // Lấy danh mục theo ID
  getById: async (req, res) => {
    try {
      const category = await categoryService.getCategoryById(req.params.id);
      res.json({
        success: true,
        data: category
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        message: error.message
      });
    }
  },

  // Lấy danh mục theo slug
  getBySlug: async (req, res) => {
    try {
      const category = await categoryService.getCategoryBySlug(req.params.slug);
      res.json({
        success: true,
        data: category
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        message: error.message
      });
    }
  },

  // Cập nhật danh mục
  update: async (req, res) => {
    try {
      const category = await categoryService.updateCategory(req.params.id, req.body);
      res.json({
        success: true,
        message: "Cập nhật danh mục thành công",
        data: category
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  },

  // Xóa danh mục
  delete: async (req, res) => {
    try {
      const result = await categoryService.deleteCategory(req.params.id);
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

  // Lấy danh mục cấp cha
  getParentCategories: async (req, res) => {
    try {
      const categories = await categoryService.getParentCategories();
      res.json({
        success: true,
        data: categories
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  // Lấy danh mục con
  getSubCategories: async (req, res) => {
    try {
      const categories = await categoryService.getSubCategories(req.params.parentId);
      res.json({
        success: true,
        data: categories
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  // Lấy tất cả danh mục active (cho dropdown, menu)
  getActiveCategories: async (req, res) => {
    try {
      const categories = await categoryService.getActiveCategories();
      res.json({
        success: true,
        data: categories
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  // Cập nhật thứ tự sắp xếp
  updateSortOrder: async (req, res) => {
    try {
      const result = await categoryService.updateSortOrder(req.body.categories);
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

  // Toggle trạng thái active
  toggleActive: async (req, res) => {
    try {
      const category = await categoryService.toggleActive(req.params.id);
      res.json({
        success: true,
        message: `Danh mục đã được ${category.isActive ? 'kích hoạt' : 'vô hiệu hóa'}`,
        data: category
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  },

  // Lấy thống kê danh mục
  getStats: async (req, res) => {
    try {
      const stats = await categoryService.getCategoryStats();
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
  }
};
