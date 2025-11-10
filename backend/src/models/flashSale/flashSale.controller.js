import { flashSaleService } from "./flashSale.service.js";
import { catchAsync } from "../../core/middleware/errorHandler.js";
import { AppError } from "../../core/errors/AppError.js";
import { successResponse, createdResponse, paginatedResponse } from "../../core/utils/response.js";

export const flashSaleController = {
  // Tạo flash sale mới
  create: catchAsync(async (req, res) => {
    const flashSale = await flashSaleService.createFlashSale(req.body);
    createdResponse(res, flashSale, "Tạo flash sale thành công");
  }),

  // Lấy tất cả flash sale
  getAll: catchAsync(async (req, res) => {
    const result = await flashSaleService.getAllFlashSales(req.query);
    paginatedResponse(res, result.flashSales, result.pagination);
  }),

  // Lấy flash sale đang active
  getActive: catchAsync(async (req, res) => {
    const limit = req.query.limit || 10;
    const flashSales = await flashSaleService.getActiveFlashSales(limit);
    successResponse(res, flashSales);
  }),

  // Lấy flash sale sắp tới
  getUpcoming: catchAsync(async (req, res) => {
    const limit = req.query.limit || 10;
    const flashSales = await flashSaleService.getUpcomingFlashSales(limit);
    successResponse(res, flashSales);
  }),

  // Lấy flash sale theo ID
  getById: catchAsync(async (req, res) => {
    const flashSale = await flashSaleService.getFlashSaleById(req.params.id);
    successResponse(res, flashSale);
  }),

  // Lấy flash sale theo slug
  getBySlug: catchAsync(async (req, res) => {
    const flashSale = await flashSaleService.getFlashSaleBySlug(req.params.slug);
    successResponse(res, flashSale);
  }),

  // Cập nhật flash sale
  update: catchAsync(async (req, res) => {
    const flashSale = await flashSaleService.updateFlashSale(req.params.id, req.body);
    successResponse(res, flashSale, "Cập nhật flash sale thành công");
  }),

  // Xóa flash sale
  delete: catchAsync(async (req, res) => {
    const result = await flashSaleService.deleteFlashSale(req.params.id);
    successResponse(res, null, result.message);
  }),

  // Thống kê flash sale
  getStats: catchAsync(async (req, res) => {
    const stats = await flashSaleService.getFlashSaleStats();
    successResponse(res, stats);
  })
};









