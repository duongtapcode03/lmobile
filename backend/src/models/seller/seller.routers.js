import express from "express";
import { sellerController } from "./seller.controller.js";
import { protect, sellerOrAdmin } from "../../core/middleware/auth.middleware.js";
import { convertIdToNumber } from "../../core/middleware/convertId.middleware.js";

const router = express.Router();

// Tất cả routes đều yêu cầu seller hoặc admin role
router.use(protect, sellerOrAdmin);

// Dashboard
router.get("/dashboard/stats", sellerController.getDashboardStats);

// Products management
router.get("/products", sellerController.getMyProducts);
router.post("/products", sellerController.createProduct);
router.put("/products/:productId", convertIdToNumber, sellerController.updateMyProduct);
router.delete("/products/:productId", convertIdToNumber, sellerController.deleteMyProduct);

// Orders management
router.get("/orders", sellerController.getMyOrders);
router.put("/orders/:orderId/status", sellerController.updateMyOrderStatus);

export default router;

