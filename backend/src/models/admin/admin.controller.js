import { adminService } from "./admin.service.js";
import { catchAsync } from "../../core/middleware/errorHandler.js";
import { successResponse } from "../../core/utils/response.js";

export const adminController = {
  // Dashboard stats
  getDashboardStats: catchAsync(async (req, res) => {
    console.log('[Admin Controller] getDashboardStats called');
    const { startDate, endDate } = req.query;
    const stats = await adminService.getDashboardStats({ startDate, endDate });
    console.log('[Admin Controller] Stats retrieved:', stats);
    successResponse(res, stats);
  }),

  // Users management
  getAllUsers: catchAsync(async (req, res) => {
    console.log('[Admin Controller] getAllUsers called');
    console.log('[Admin Controller] Query params:', req.query);
    const result = await adminService.getAllUsers(req.query);
    console.log('[Admin Controller] Result:', result);
    successResponse(res, result);
  }),

  getUserById: catchAsync(async (req, res) => {
    console.log('[Admin Controller] getUserById called with userId:', req.params.userId);
    const user = await adminService.getUserById(req.params.userId);
    console.log('[Admin Controller] User found:', user ? user._id : 'null');
    successResponse(res, user);
  }),

  updateUserStatus: catchAsync(async (req, res) => {
    console.log('[Admin Controller] updateUserStatus called with userId:', req.params.userId, 'isActive:', req.body.isActive);
    const { isActive } = req.body;
    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'isActive phải là boolean'
      });
    }
    const user = await adminService.updateUserStatus(req.params.userId, isActive);
    console.log('[Admin Controller] User status updated:', user ? user._id : 'null');
    successResponse(res, user, "Cập nhật trạng thái user thành công");
  }),

  // Products management
  getAllProducts: catchAsync(async (req, res) => {
    const result = await adminService.getAllProducts(req.query);
    successResponse(res, result);
  }),

  updateProductStatus: catchAsync(async (req, res) => {
    const { isActive } = req.body;
    const product = await adminService.updateProductStatus(req.params.productId, isActive);
    successResponse(res, product, "Cập nhật trạng thái sản phẩm thành công");
  }),

  // Orders management
  getAllOrders: catchAsync(async (req, res) => {
    const result = await adminService.getAllOrders(req.query);
    successResponse(res, result);
  }),

  updateOrderStatus: catchAsync(async (req, res) => {
    const { status } = req.body;
    const order = await adminService.updateOrderStatus(req.params.orderId, status);
    successResponse(res, order, "Cập nhật trạng thái đơn hàng thành công");
  }),

  // Categories management
  getAllCategories: catchAsync(async (req, res) => {
    const result = await adminService.getAllCategories(req.query);
    successResponse(res, result);
  }),

  // Brands management
  getAllBrands: catchAsync(async (req, res) => {
    const result = await adminService.getAllBrands(req.query);
    successResponse(res, result);
  })
};

