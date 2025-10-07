import express from "express";
import { productController } from "./product.controller.js";
import { protect, authorize } from "../../core/middleware/auth.middleware.js";

const router = express.Router();

// Public routes (không cần xác thực)
router.get("/", productController.getAll);
router.get("/featured", productController.getFeatured);
router.get("/new", productController.getNew);
router.get("/bestseller", productController.getBestSeller);
router.get("/search", productController.search);
router.get("/brands", productController.getBrands);
router.get("/tags", productController.getTags);
router.get("/category/:categoryId", productController.getByCategory);
router.get("/slug/:slug", productController.getBySlug);
router.get("/:id", productController.getById);
router.get("/:id/related", productController.getRelated);

// Protected routes (cần xác thực)
router.use(protect);

// Seller và Admin routes
router.post("/", authorize("seller", "admin"), productController.create);
router.put("/:id", authorize("seller", "admin"), productController.update);
router.delete("/:id", authorize("seller", "admin"), productController.delete);
router.put("/:id/toggle", authorize("seller", "admin"), productController.toggleActive);

// Stock management (Seller và Admin)
router.put("/:id/stock", authorize("seller", "admin"), productController.updateStock);
router.put("/:id/sold", authorize("seller", "admin"), productController.updateSold);

// Rating management (Admin only)
router.put("/:id/rating", authorize("admin"), productController.updateRating);

// Admin only routes
router.get("/stats/overview", authorize("admin"), productController.getStats);

export default router;
