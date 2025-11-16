import express from "express";
import { productController } from "./product.controller.js";
import { protect, authorize } from "../../core/middleware/auth.middleware.js";
import { productValidators } from "../../core/validators/product.validator.js";
import { validate } from "../../core/validators/validator.js";
import { convertIdToNumber } from "../../core/middleware/convertId.middleware.js";

const router = express.Router();

// Public routes (không cần xác thực)
// Các route tĩnh phải đặt trước route động (/:id, /:slug, etc.)
router.get("/", 
  // productValidators.getAll,  // Validator disabled
  // validate,  // Validator disabled
  productController.getAll
);
router.get("/featured", productController.getFeatured);
router.get("/new", productController.getNew);
router.get("/bestseller", productController.getBestSeller);
router.get("/search", productController.search);
router.get("/search/quick", productController.quickSearch);
router.get("/brands", productController.getBrands);
router.get("/tags", productController.getTags);
// by-category phải đặt trước tất cả route có params để tránh conflict
router.get("/by-category", productController.getByCategoryRefs);
// Đặt route by-category-id TRƯỚC route /:id để tránh conflict
router.get("/by-category-id/:categoryId", convertIdToNumber, productController.getByCategoryId);
router.get("/category/:categoryId", convertIdToNumber, productController.getByCategory);
// API mới: Lấy sản phẩm theo loại (featured, new, bestSeller) với pagination
router.get("/by-type/:type", productController.getByType);
router.get("/slug/:slug", 
  // productValidators.getBySlug,  // Validator disabled
  // validate,  // Validator disabled
  productController.getBySlug
);
router.get("/:id/related", convertIdToNumber, productController.getRelated);
// Route /:id phải đặt CUỐI CÙNG trong các public routes
router.get("/:id", 
  convertIdToNumber,  // Convert ID from string to number
  // productValidators.getById,  // Validator disabled
  // validate,  // Validator disabled
  productController.getById
);

// Protected routes (cần xác thực)
router.use(protect);

// Seller và Admin routes
router.post("/", 
  authorize("seller", "admin"), 
  // productValidators.create,  // Validator disabled
  // validate,  // Validator disabled
  productController.create
);
router.put("/:id", 
  authorize("seller", "admin"), 
  convertIdToNumber,  // Convert ID from string to number
  // productValidators.update,  // Validator disabled
  // validate,  // Validator disabled
  productController.update
);
router.delete("/:id", 
  authorize("seller", "admin"), 
  convertIdToNumber,  // Convert ID from string to number
  // productValidators.getById,  // Validator disabled
  // validate,  // Validator disabled
  productController.delete
);
router.put("/:id/toggle", 
  authorize("seller", "admin"), 
  convertIdToNumber,  // Convert ID from string to number
  // productValidators.getById,  // Validator disabled
  // validate,  // Validator disabled
  productController.toggleActive
);

// Stock management (Seller và Admin)
router.put("/:id/stock", 
  authorize("seller", "admin"), 
  convertIdToNumber,  // Convert ID from string to number
  // productValidators.getById,  // Validator disabled
  // validate,  // Validator disabled
  productController.updateStock
);
router.put("/:id/sold", 
  authorize("seller", "admin"), 
  convertIdToNumber,  // Convert ID from string to number
  // productValidators.getById,  // Validator disabled
  // validate,  // Validator disabled
  productController.updateSold
);

// Rating management (Admin only)
router.put("/:id/rating", 
  authorize("admin"), 
  convertIdToNumber,  // Convert ID from string to number
  // productValidators.getById,  // Validator disabled
  // validate,  // Validator disabled
  productController.updateRating
);

// Admin only routes
router.get("/stats/overview", authorize("admin"), productController.getStats);

export default router;
