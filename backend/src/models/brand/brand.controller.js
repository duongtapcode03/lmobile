import { brandService } from "./brand.service.js";

export const brandController = {
  /**
   * Tạo brand mới
   */
  create: async (req, res) => {
    try {
      const brand = await brandService.createBrand(req.body);
      res.status(201).json({
        success: true,
        message: "Tạo thương hiệu thành công",
        data: brand
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  },

  /**
   * Lấy tất cả brands
   */
  getAll: async (req, res) => {
    try {
      const brands = await brandService.getAllBrands(req.query);
      res.json({
        success: true,
        data: brands,
        total: brands.length
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  /**
   * Lấy brand theo ID
   */
  getById: async (req, res) => {
    try {
      const brand = await brandService.getBrandById(req.params.id);
      res.json({
        success: true,
        data: brand
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        message: error.message
      });
    }
  },

  /**
   * Lấy brand theo slug
   */
  getBySlug: async (req, res) => {
    try {
      const brand = await brandService.getBrandBySlug(req.params.slug);
      res.json({
        success: true,
        data: brand
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        message: error.message
      });
    }
  },

  /**
   * Update brand
   */
  update: async (req, res) => {
    try {
      const brand = await brandService.updateBrand(req.params.id, req.body);
      res.json({
        success: true,
        message: "Cập nhật thương hiệu thành công",
        data: brand
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        message: error.message
      });
    }
  },

  /**
   * Delete brand
   */
  delete: async (req, res) => {
    try {
      await brandService.deleteBrand(req.params.id);
      res.json({
        success: true,
        message: "Xóa thương hiệu thành công"
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        message: error.message
      });
    }
  },

  /**
   * Lấy statistics cho brand
   */
  getStats: async (req, res) => {
    try {
      const stats = await brandService.getBrandStats(req.params.id);
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        message: error.message
      });
    }
  },

  /**
   * Sync brands từ phone details
   */
  syncFromPhoneDetails: async (req, res) => {
    try {
      const result = await brandService.syncBrandsFromPhoneDetails();
      res.json({
        success: true,
        message: result.message,
        data: result
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
};


