import { flashSaleService } from "./flashSale.service.js";
import { flashSaleReservationService } from "./flashSaleReservation.service.js";
import { flashSaleActivationService } from "./flashSaleActivation.service.js";
import { catchAsync } from "../../core/middleware/errorHandler.js";
import { createdResponse, paginatedResponse, successResponse } from "../../core/utils/response.js";
import { convertIdToNumber } from "../../core/middleware/convertId.middleware.js";

export const flashSaleController = {
  /**
   * Lấy tất cả Flash Sale (Admin - bao gồm cả scheduled/active/ended)
   * Public - chỉ lấy active
   */
  getAll: catchAsync(async (req, res) => {
    console.log(`[FlashSaleController] getAll called. User:`, req.user?.role, `Admin param:`, req.query.admin);
    
    // Nếu có query param admin=true, lấy tất cả (cho admin page)
    // Hoặc nếu user là admin và có query param admin=true
    if (req.query.admin === 'true' || (req.user && req.user.role === 'admin' && req.query.admin === 'true')) {
      console.log(`[FlashSaleController] Calling getAllFlashSales with query:`, req.query);
      const result = await flashSaleService.getAllFlashSales(req.query);
      console.log(`[FlashSaleController] getAllFlashSales returned ${result.items.length} items`);
      paginatedResponse(res, result.items, result.pagination);
    } else {
      // Public: chỉ lấy active
      console.log(`[FlashSaleController] Calling getActiveFlashSales`);
      const result = await flashSaleService.getActiveFlashSales(req.query);
      paginatedResponse(res, result.items, result.pagination);
    }
  }),

  /**
   * Lấy chi tiết Flash Sale với danh sách sản phẩm
   */
  getById: catchAsync(async (req, res) => {
    const { id } = req.params;
    const includeItems = req.query.includeItems !== 'false';
    const flashSale = await flashSaleService.getFlashSaleById(id, includeItems);
    successResponse(res, flashSale);
  }),

  /**
   * Lấy danh sách sản phẩm trong Flash Sale
   */
  getItems: catchAsync(async (req, res) => {
    const { id } = req.params;
    const result = await flashSaleService.getFlashSaleItems(id, req.query);
    paginatedResponse(res, result.items, result.pagination);
  }),

  /**
   * (1) TẠO FLASH SALE - Tạo khung thời gian Flash Sale (Admin only)
   */
  createFlashSale: catchAsync(async (req, res) => {
    // Loại bỏ _id nếu có trong req.body để tránh lỗi "id đã tồn tại"
    const { _id, ...bodyWithoutId } = req.body;
    
    const data = {
      ...bodyWithoutId,
      created_by: req.user._id
    };
    
    console.log('[FlashSaleController] Creating flash sale with data:', {
      ...data,
      created_by: data.created_by?.toString()
    });
    
    const flashSale = await flashSaleService.createFlashSale(data);
    createdResponse(res, flashSale, "Tạo Flash Sale thành công");
  }),

  /**
   * (2) THÊM SẢN PHẨM VÀO FLASH SALE (Admin only)
   */
  addProduct: catchAsync(async (req, res) => {
    const { id } = req.params;
    const item = await flashSaleService.addProductToFlashSale(id, req.body);
    createdResponse(res, item, "Thêm sản phẩm vào Flash Sale thành công");
  }),

  /**
   * Cập nhật Flash Sale (Admin only)
   */
  updateFlashSale: catchAsync(async (req, res) => {
    const { id } = req.params;
    const flashSale = await flashSaleService.updateFlashSale(id, req.body);
    successResponse(res, flashSale, "Cập nhật Flash Sale thành công");
  }),

  /**
   * (3) KIỂM SOÁT TRẠNG THÁI FLASH SALE (Admin only)
   */
  updateStatus: catchAsync(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const flashSale = await flashSaleService.updateFlashSaleStatus(id, status);
    successResponse(res, flashSale, "Cập nhật trạng thái Flash Sale thành công");
  }),

  /**
   * Cập nhật Flash Sale Item (Admin only)
   */
  updateItem: catchAsync(async (req, res) => {
    const { itemId } = req.params;
    const item = await flashSaleService.updateFlashSaleItem(itemId, req.body);
    successResponse(res, item, "Cập nhật sản phẩm Flash Sale thành công");
  }),

  /**
   * Xóa sản phẩm khỏi Flash Sale (Admin only)
   */
  removeProduct: catchAsync(async (req, res) => {
    const { id } = req.params;
    const { productId } = req.body;
    const result = await flashSaleService.removeProductFromFlashSale(id, productId);
    successResponse(res, null, result.message);
  }),

  /**
   * Xóa Flash Sale (Admin only)
   */
  deleteFlashSale: catchAsync(async (req, res) => {
    const { id } = req.params;
    const result = await flashSaleService.deleteFlashSale(id);
    successResponse(res, null, result.message);
  }),

  /**
   * Kiểm tra availability của sản phẩm trong flash sale
   */
  checkAvailability: catchAsync(async (req, res) => {
    const { id, productId } = req.params;
    const { quantity = 1 } = req.query;
    const userId = req.user ? req.user._id : null;
    const result = await flashSaleService.checkAvailability(
      id, 
      productId, 
      userId, 
      parseInt(quantity)
    );
    successResponse(res, result);
  }),

  /**
   * (4) THEO DÕI HIỆU SUẤT FLASH SALE (Admin only)
   */
  getStats: catchAsync(async (req, res) => {
    const { id } = req.params;
    if (id) {
      // Stats cho 1 flash sale cụ thể
      const stats = await flashSaleService.getFlashSaleStats(id);
      successResponse(res, stats);
    } else {
      // Stats tổng quan
      const stats = await flashSaleService.getAllStats();
      successResponse(res, stats);
    }
  }),

  /**
   * Tạo reservation (giữ chỗ) flash sale (User)
   */
  createReservation: catchAsync(async (req, res) => {
    const { flash_sale_id, product_id, quantity, expiresInMinutes } = req.body;
    const userId = req.user._id;

    // Lấy flash_price từ item
    const availability = await flashSaleService.checkAvailability(
      flash_sale_id,
      product_id,
      userId,
      quantity
    );

    if (!availability.available) {
      return res.status(400).json({
        success: false,
        message: availability.reason || 'Không thể tạo reservation'
      });
    }

    const reservation = await flashSaleReservationService.createReservation({
      user_id: userId,
      flash_sale_id,
      product_id,
      quantity,
      flash_price: availability.flash_price,
      expiresInMinutes: expiresInMinutes || 15
    });

    createdResponse(res, reservation, 'Giữ chỗ flash sale thành công');
  }),

  /**
   * Xác nhận reservation (khi thanh toán thành công)
   */
  confirmReservation: catchAsync(async (req, res) => {
    const { reservationId, orderId } = req.body;
    const reservation = await flashSaleReservationService.confirmReservation(reservationId, orderId);
    successResponse(res, reservation, 'Xác nhận reservation thành công');
  }),

  /**
   * Hủy reservation
   */
  cancelReservation: catchAsync(async (req, res) => {
    const { reservationId } = req.params;
    const reservation = await flashSaleReservationService.cancelReservation(reservationId);
    successResponse(res, reservation, 'Hủy reservation thành công');
  }),

  /**
   * Lấy reservations của user
   */
  getUserReservations: catchAsync(async (req, res) => {
    const userId = req.user._id;
    const { flash_sale_id } = req.query;
    const reservations = await flashSaleReservationService.getUserReservations(userId, flash_sale_id);
    successResponse(res, reservations);
  }),

  /**
   * Validate reservation (re-check trước khi thanh toán)
   */
  validateReservation: catchAsync(async (req, res) => {
    const { reservationId } = req.params;
    const result = await flashSaleReservationService.validateReservation(reservationId);
    successResponse(res, result);
  }),

  /**
   * Tự động kích hoạt và đóng flash sale (Cron job - Admin only)
   */
  runScheduledTasks: catchAsync(async (req, res) => {
    const result = await flashSaleActivationService.runScheduledTasks();
    successResponse(res, result, 'Đã chạy scheduled tasks');
  }),

  /**
   * Kích hoạt flash sale đã đến thời gian (Cron job - Admin only)
   */
  activateScheduled: catchAsync(async (req, res) => {
    const result = await flashSaleActivationService.activateScheduledFlashSales();
    successResponse(res, result, 'Đã kích hoạt flash sale');
  }),

  /**
   * Đóng flash sale đã hết thời gian (Cron job - Admin only)
   */
  closeExpired: catchAsync(async (req, res) => {
    const result = await flashSaleActivationService.closeExpiredFlashSales();
    successResponse(res, result, 'Đã đóng flash sale');
  }),

  /**
   * Cleanup reservations hết hạn (Cron job - Admin only)
   */
  cleanupExpiredReservations: catchAsync(async (req, res) => {
    const result = await flashSaleReservationService.cleanupExpiredReservations();
    successResponse(res, result, 'Đã cleanup reservations hết hạn');
  })
};
