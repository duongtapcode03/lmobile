import { bannerService } from "./banner.service.js";
import { successResponse, paginatedResponse } from "../../core/utils/response.js";

export const bannerController = {
  // Tạo banner mới
  create: async (req, res) => {
    try {
      const banner = await bannerService.createBanner(req.body);
      return successResponse(res, banner, "Tạo banner thành công", 201);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
  },

  // Lấy tất cả banners với phân trang và lọc
  getAll: async (req, res) => {
    try {
      const result = await bannerService.getAllBanners(req.query);
      return paginatedResponse(
        res,
        result.banners,
        result.pagination,
        "Lấy danh sách banner thành công"
      );
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  // Lấy banner theo ID
  getById: async (req, res) => {
    try {
      const banner = await bannerService.getBannerById(req.params.id);
      return successResponse(res, banner, "Lấy banner thành công");
    } catch (error) {
      // Invalid ID format returns 400, banner not found returns 404
      const statusCode = error.message.includes("không hợp lệ") ? 400 : 404;
      return res.status(statusCode).json({
        success: false,
        message: error.message
      });
    }
  },

  // Lấy tất cả banners đang active
  getActive: async (req, res) => {
    try {
      const banners = await bannerService.getActiveBanners();
      return successResponse(res, banners, "Lấy danh sách banner active thành công");
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  // Cập nhật banner
  update: async (req, res) => {
    try {
      const banner = await bannerService.updateBanner(req.params.id, req.body);
      return successResponse(res, banner, "Cập nhật banner thành công");
    } catch (error) {
      // Invalid ID format or validation error returns 400, banner not found returns 404
      const statusCode = error.message.includes("không tồn tại") ? 404 : 400;
      return res.status(statusCode).json({
        success: false,
        message: error.message
      });
    }
  },

  // Xóa banner
  delete: async (req, res) => {
    try {
      await bannerService.deleteBanner(req.params.id);
      return successResponse(res, null, "Xóa banner thành công");
    } catch (error) {
      // Invalid ID format returns 400, banner not found returns 404
      const statusCode = error.message.includes("không hợp lệ") ? 400 : 404;
      return res.status(statusCode).json({
        success: false,
        message: error.message
      });
    }
  },

  // Toggle active status
  toggleActive: async (req, res) => {
    try {
      const banner = await bannerService.toggleActive(req.params.id);
      return successResponse(res, banner, "Cập nhật trạng thái banner thành công");
    } catch (error) {
      // Invalid ID format returns 400, banner not found returns 404
      const statusCode = error.message.includes("không hợp lệ") ? 400 : 404;
      return res.status(statusCode).json({
        success: false,
        message: error.message
      });
    }
  },

  // Cập nhật sort order
  updateSortOrder: async (req, res) => {
    try {
      const result = await bannerService.updateSortOrder(req.body.banners);
      return successResponse(res, result, "Cập nhật thứ tự banner thành công");
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
};

