import express from "express";
import { orderController } from "./order.controller.js";
import { protect, authorize } from "../../core/middleware/auth.middleware.js";

const router = express.Router();

// Public routes (không cần xác thực)
router.get("/search/:orderNumber", orderController.searchByOrderNumber);

// Protected routes (cần xác thực)
router.use(protect);

// User routes
router.post("/create-from-cart", orderController.createFromCart);
router.get("/my-orders", orderController.getUserOrders);
router.get("/stats", orderController.getStats);
router.get("/:id", orderController.getById);
router.get("/number/:orderNumber", orderController.getByNumber);
router.put("/:orderId/cancel", orderController.cancelOrder);
router.put("/:orderId/payment", orderController.updatePaymentInfo);

// Admin và Seller routes
router.get("/", authorize("admin", "seller"), orderController.getAllOrders);
router.put("/:orderId/status", authorize("admin", "seller"), orderController.updateStatus);
router.put("/:orderId/tracking", authorize("admin", "seller"), orderController.updateTracking);
router.put("/:orderId/confirm", authorize("admin", "seller"), orderController.confirmOrder);
router.put("/:orderId/delivered", authorize("admin", "seller"), orderController.markAsDelivered);

export default router;
