import { voucherService } from "./voucher.service.js";

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

  // Kiểm tra voucher có thể sử dụng không
  validate: async (req, res) => {
    try {
      const { code, cartItems = [], orderAmount = 0 } = req.body;
      
      if (!code) {
        return res.status(400).json({
          success: false,
          message: "Vui lòng nhập mã voucher"
        });
      }

      const result = await voucherService.validateVoucher(code, req.user.id, cartItems, orderAmount);
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
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
  }
};
