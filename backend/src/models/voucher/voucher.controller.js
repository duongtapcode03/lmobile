import { voucherService } from "./voucher.service.js";
import { voucherIntegrationService } from "./voucherIntegration.service.js";

export const voucherController = {
  // Tạo voucher mới
  create: async (req, res) => {
    try {
      const voucherData = {
        ...req.body,
        createdBy: req.user.id
      };
      
      const voucher = await voucherService.createVoucher(voucherData);
      res.status(201).json({
        success: true,
        message: "Tạo voucher thành công",
        data: voucher
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  },

  // Lấy tất cả voucher
  getAll: async (req, res) => {
    try {
      const result = await voucherService.getAllVouchers(req.query);
      res.json({
        success: true,
        data: result.vouchers,
        pagination: result.pagination
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  // Lấy voucher theo ID
  getById: async (req, res) => {
    try {
      const voucher = await voucherService.getVoucherById(req.params.id);
      res.json({
        success: true,
        data: voucher
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        message: error.message
      });
    }
  },

  // Lấy voucher theo code
  getByCode: async (req, res) => {
    try {
      const voucher = await voucherService.getVoucherByCode(req.params.code);
      res.json({
        success: true,
        data: voucher
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        message: error.message
      });
    }
  },

  // Kiểm tra voucher có thể sử dụng không (sử dụng integration service)
  validate: async (req, res) => {
    try {
      const { code, cartItems = [], orderAmount = 0, shippingFee = 0 } = req.body;
      
      if (!code) {
        return res.status(400).json({
          success: false,
          errorCode: "VOUCHER_INVALID_CODE",
          message: "Vui lòng nhập mã voucher"
        });
      }

      // Sử dụng voucher integration service
      const result = await voucherIntegrationService.applyVoucherToCart(
        code,
        req.user.id,
        cartItems,
        orderAmount,
        shippingFee
      );

      if (!result.success) {
        return res.status(400).json({
          success: false,
          errorCode: result.errorCode || "VOUCHER_VALIDATION_FAILED",
          message: result.message
        });
      }

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        errorCode: "VOUCHER_SYSTEM_ERROR",
        message: error.message || "Lỗi hệ thống khi kiểm tra voucher"
      });
    }
  },

  // Lấy voucher có thể sử dụng
  getAvailable: async (req, res) => {
    try {
      const { cartItems = [], orderAmount = 0 } = req.query;
      
      const vouchers = await voucherService.getAvailableVouchers(
        req.user.id, 
        JSON.parse(cartItems || "[]"), 
        parseFloat(orderAmount || 0)
      );
      
      res.json({
        success: true,
        data: vouchers
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  // Cập nhật voucher
  update: async (req, res) => {
    try {
      const voucher = await voucherService.updateVoucher(req.params.id, req.body);
      res.json({
        success: true,
        message: "Cập nhật voucher thành công",
        data: voucher
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  },

  // Xóa voucher
  delete: async (req, res) => {
    try {
      const result = await voucherService.deleteVoucher(req.params.id);
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
      const voucher = await voucherService.toggleActive(req.params.id);
      res.json({
        success: true,
        message: `Voucher đã được ${voucher.isActive ? 'kích hoạt' : 'vô hiệu hóa'}`,
        data: voucher
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  },

  // Lấy thống kê voucher
  getStats: async (req, res) => {
    try {
      const stats = await voucherService.getVoucherStats();
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

  // Lấy usage stats của một voucher cụ thể
  getUsageStats: async (req, res) => {
    try {
      const { voucherUsageService } = await import("./voucherUsage.service.js");
      const stats = await voucherUsageService.getVoucherUsageStats(req.params.id);
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

  // Lấy danh sách usage của voucher
  getUsages: async (req, res) => {
    try {
      const { voucherUsageService } = await import("./voucherUsage.service.js");
      const result = await voucherUsageService.getVoucherUsages(req.params.id, req.query);
      res.json({
        success: true,
        data: result.usages,
        pagination: result.pagination
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  // Lấy danh sách voucher có sẵn (public)
  getAvailablePublic: async (req, res) => {
    try {
      const result = await voucherService.getAvailableVouchersPublic(req.query);
      res.json({
        success: true,
        data: result.vouchers,
        pagination: result.pagination
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  // Lưu voucher vào danh sách đã lưu
  saveVoucher: async (req, res) => {
    try {
      const voucher = await voucherService.saveVoucher(req.params.id, req.user.id);
      res.json({
        success: true,
        message: "Đã lưu voucher",
        data: voucher
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  },

  // Bỏ lưu voucher
  removeSavedVoucher: async (req, res) => {
    try {
      const result = await voucherService.removeSavedVoucher(req.params.id, req.user.id);
      res.json({
        success: true,
        message: result.message || "Đã bỏ lưu voucher"
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  },

  // Lấy danh sách voucher đã lưu
  getSavedVouchers: async (req, res) => {
    try {
      const vouchers = await voucherService.getSavedVouchers(req.user.id);
      res.json({
        success: true,
        data: vouchers
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
};
