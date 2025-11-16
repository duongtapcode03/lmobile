import express from "express";
import { flashSaleController } from "./flashSale.controller.js";
import { protect, authorize } from "../../core/middleware/auth.middleware.js";
import { convertIdToNumber } from "../../core/middleware/convertId.middleware.js";

const router = express.Router();

// ==================== PUBLIC ROUTES ====================

/**
 * GET /api/flash-sales
 * Lấy danh sách Flash Sale đang active (Public)
 */
router.get("/", flashSaleController.getAll);

/**
 * GET /api/flash-sales/:id
 * Lấy chi tiết Flash Sale với danh sách sản phẩm (Public)
 */
router.get("/:id", flashSaleController.getById);

/**
 * GET /api/flash-sales/:id/items
 * Lấy danh sách sản phẩm trong Flash Sale (Public)
 */
router.get("/:id/items", flashSaleController.getItems);

/**
 * GET /api/flash-sales/:id/product/:productId/check
 * Kiểm tra availability của sản phẩm trong flash sale (Public)
 */
router.get(
  "/:id/product/:productId/check", 
  convertIdToNumber, 
  flashSaleController.checkAvailability
);

/**
 * GET /api/flash-sales/stats
 * Lấy thống kê tổng quan (Public - có thể giới hạn cho admin)
 */
router.get("/stats/all", flashSaleController.getStats);

// ==================== PROTECTED ROUTES (ADMIN ONLY) ====================

router.use(protect);
router.use(authorize("admin"));

/**
 * POST /api/flash-sales
 * (1) TẠO FLASH SALE - Tạo khung thời gian Flash Sale
 */
router.post("/", flashSaleController.createFlashSale);

/**
 * POST /api/flash-sales/:id/products
 * (2) THÊM SẢN PHẨM VÀO FLASH SALE
 */
router.post("/:id/products", flashSaleController.addProduct);

/**
 * PUT /api/flash-sales/:id
 * Cập nhật Flash Sale
 */
router.put("/:id", flashSaleController.updateFlashSale);

/**
 * PUT /api/flash-sales/:id/status
 * (3) KIỂM SOÁT TRẠNG THÁI FLASH SALE
 */
router.put("/:id/status", flashSaleController.updateStatus);

/**
 * PUT /api/flash-sales/items/:itemId
 * Cập nhật Flash Sale Item
 */
router.put("/items/:itemId", flashSaleController.updateItem);

/**
 * DELETE /api/flash-sales/:id/products
 * Xóa sản phẩm khỏi Flash Sale
 */
router.delete("/:id/products", flashSaleController.removeProduct);

/**
 * DELETE /api/flash-sales/:id
 * Xóa Flash Sale
 */
router.delete("/:id", flashSaleController.deleteFlashSale);

/**
 * GET /api/flash-sales/:id/stats
 * (4) THEO DÕI HIỆU SUẤT FLASH SALE
 */
router.get("/:id/stats", flashSaleController.getStats);

/**
 * GET /api/flash-sales?admin=true
 * Lấy tất cả Flash Sale (bao gồm scheduled/active/ended) - Admin only
 */
// Route này đã được xử lý trong getAll controller

export default router;
