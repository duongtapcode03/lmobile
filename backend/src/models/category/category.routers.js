import express from "express";
import { categoryController } from "./category.controller.js";
import { protect, authorize } from "../../core/middleware/auth.middleware.js";

const router = express.Router();

// Public routes (không cần xác thực)
router.get("/", categoryController.getAll);
router.get("/active", categoryController.getActiveCategories);
router.get("/parents", categoryController.getParentCategories);
router.get("/sub/:parentId", categoryController.getSubCategories);
router.get("/slug/:slug", categoryController.getBySlug);
router.get("/:id", categoryController.getById);

// Protected routes (cần xác thực)
router.use(protect);

// Admin only routes
router.post("/", authorize("admin"), categoryController.create);
router.put("/:id", authorize("admin"), categoryController.update);
router.delete("/:id", authorize("admin"), categoryController.delete);
router.put("/:id/toggle", authorize("admin"), categoryController.toggleActive);
router.put("/sort-order", authorize("admin"), categoryController.updateSortOrder);
router.get("/stats/overview", authorize("admin"), categoryController.getStats);

export default router;
