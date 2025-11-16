import express from "express";
import { adminController } from "./admin.controller.js";
import { protect, adminOnly } from "../../core/middleware/auth.middleware.js";
import { convertIdToNumber } from "../../core/middleware/convertId.middleware.js";

const router = express.Router();

// Test route (before auth middleware to verify routing works)
router.get("/test", (req, res) => {
  console.log('[Admin Router] Test route hit');
  res.json({ message: "Admin routes are working", path: req.path, url: req.url });
});

// Test route for users (before auth middleware to verify routing works)
router.get("/users/test", (req, res) => {
  console.log('[Admin Router] Test /users route hit');
  res.json({ message: "Admin /users route is accessible", path: req.path, url: req.url });
});

// Tất cả routes đều yêu cầu admin role
router.use(protect, adminOnly);

// Dashboard
router.get("/dashboard/stats", (req, res, next) => {
  console.log('[Admin Router] GET /dashboard/stats hit');
  next();
}, adminController.getDashboardStats);

// Users management
// Note: User model vẫn dùng ObjectId, không dùng Number ID, nên không cần convertIdToNumber
router.get("/users", (req, res, next) => {
  console.log('[Admin Router] GET /users hit');
  console.log('[Admin Router] Query:', req.query);
  next();
}, adminController.getAllUsers);
router.get("/users/:userId", adminController.getUserById);
router.put("/users/:userId/status", adminController.updateUserStatus);

// Products management
router.get("/products", adminController.getAllProducts);
router.put("/products/:productId/status", convertIdToNumber, adminController.updateProductStatus);

// Orders management
router.get("/orders", adminController.getAllOrders);
router.put("/orders/:orderId/status", adminController.updateOrderStatus);

// Categories management
router.get("/categories", adminController.getAllCategories);

// Brands management
router.get("/brands", adminController.getAllBrands);

export default router;

