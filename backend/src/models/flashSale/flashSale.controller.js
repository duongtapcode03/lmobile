import { flashSaleService } from "./flashSale.service.js";
import { catchAsync } from "../../core/middleware/errorHandler.js";
import { createdResponse, paginatedResponse, successResponse } from "../../core/utils/response.js";
import { convertIdToNumber } from "../../core/middleware/convertId.middleware.js";
import { protect, authorize } from "../../core/middleware/auth.middleware.js";

export const flashSaleController = {
  // Lấy tất cả flash sales (Admin - bao gồm cả đã hết hàng)
  getAll: catchAsync(async (req, res) => {
    // Nếu là admin và có query param admin=true, lấy tất cả
    if (req.user && req.user.role === 'admin' && req.query.admin === 'true') {
      const result = await flashSaleService.getAllFlashSales(req.query);
      paginatedResponse(res, result.items, result.pagination);
    } else {
      // Public: chỉ lấy active
      const result = await flashSaleService.getActiveFlashSales(req.query);
      paginatedResponse(res, result.items, result.pagination);
    }
  }),

  // Lấy flash sales theo session
  getBySession: catchAsync(async (req, res) => {
    const { sessionId } = req.params;
    const result = await flashSaleService.getFlashSalesBySession(sessionId, req.query);
    paginatedResponse(res, result.items, result.pagination);
  }),

  // Kiểm tra flash sale availability
  checkAvailability: catchAsync(async (req, res) => {
    const { productId } = req.params;
    const { quantity = 1 } = req.query;
    const result = await flashSaleService.checkAvailability(productId, parseInt(quantity));
    successResponse(res, result);
  }),

  // Lấy thống kê flash sale
  getStats: catchAsync(async (req, res) => {
    const stats = await flashSaleService.getStats();
    successResponse(res, stats);
  }),

  // Tạo flash sale mới (Admin only)
  create: catchAsync(async (req, res) => {
    const item = await flashSaleService.create(req.body);
    createdResponse(res, item, "Tạo flash sale thành công");
  }),

  // Cập nhật flash sale (Admin only)
  update: catchAsync(async (req, res) => {
    const item = await flashSaleService.update(req.params.id, req.body);
    successResponse(res, item, "Cập nhật flash sale thành công");
  }),

  // Xóa flash sale (Admin only)
  delete: catchAsync(async (req, res) => {
    const result = await flashSaleService.delete(req.params.id);
    successResponse(res, null, result.message);
  })
};

