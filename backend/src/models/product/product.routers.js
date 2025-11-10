import express from "express";
import { productController } from "./product.controller.js";
import { protect, authorize } from "../../core/middleware/auth.middleware.js";
import { productValidators } from "../../core/validators/product.validator.js";
import { validate } from "../../core/validators/validator.js";

const router = express.Router();

// Public routes (không cần xác thực)
router.get("/", 
  productValidators.getAll, 
  validate, 
  productController.getAll
);
router.get("/featured", productController.getFeatured);
router.get("/new", productController.getNew);
router.get("/bestseller", productController.getBestSeller);
router.get("/search", productController.search);
router.get("/brands", productController.getBrands);
router.get("/tags", productController.getTags);
router.get("/category/:categoryId", productController.getByCategory);
router.get("/slug/:slug", 
  productValidators.getBySlug, 
  validate, 
  productController.getBySlug
);
router.get("/:id/related", productController.getRelated);
router.get("/:id", 
  productValidators.getById, 
  validate, 
  productController.getById
);

// Protected routes (cần xác thực)
router.use(protect);

// Seller và Admin routes
router.post("/", 
  authorize("seller", "admin"), 
  productValidators.create, 
  validate, 
  productController.create
);
router.put("/:id", 
  authorize("seller", "admin"), 
  productValidators.update, 
  validate, 
  productController.update
);
router.delete("/:id", 
  authorize("seller", "admin"), 
  productValidators.getById, 
  validate, 
  productController.delete
);
router.put("/:id/toggle", 
  authorize("seller", "admin"), 
  productValidators.getById, 
  validate, 
  productController.toggleActive
);

// Stock management (Seller và Admin)
router.put("/:id/stock", 
  authorize("seller", "admin"), 
  productValidators.getById, 
  validate, 
  productController.updateStock
);
router.put("/:id/sold", 
  authorize("seller", "admin"), 
  productValidators.getById, 
  validate, 
  productController.updateSold
);

// Rating management (Admin only)
router.put("/:id/rating", 
  authorize("admin"), 
  productValidators.getById, 
  validate, 
  productController.updateRating
);

// Admin only routes
router.get("/stats/overview", authorize("admin"), productController.getStats);

// Flash Sale routes (public)
router.get("/flash-sale", productController.getFlashSales);
router.get("/flash-sale/upcoming", productController.getUpcomingFlashSales);
router.get("/flash-sale/stats", productController.getFlashSaleStats);
router.get("/:id/flash-sale/check", productController.checkFlashSaleAvailability);

// Quick Sale routes (public)
router.get("/quick-sale", productController.getQuickSales);

export default router;
