import express from "express";
import { categoryController } from "./category.controller.js";
import { protect, authorize } from "../../core/middleware/auth.middleware.js";
import { convertIdToNumber } from "../../core/middleware/convertId.middleware.js";

const router = express.Router();

// Public routes (không cần xác thực)
router.get("/", categoryController.getAll);
router.get("/active", categoryController.getActiveCategories);
router.get("/parents", categoryController.getParentCategories);
router.get("/sub/:parentId", convertIdToNumber, categoryController.getSubCategories);
router.get("/slug/:slug", categoryController.getBySlug);
router.get("/:id", convertIdToNumber, categoryController.getById);

// Protected routes (cần xác thực)
router.use(protect);

// Admin only routes
router.post("/", authorize("admin"), categoryController.create);
router.put("/:id", authorize("admin"), convertIdToNumber, categoryController.update);
router.delete("/:id", authorize("admin"), convertIdToNumber, categoryController.delete);
router.put("/:id/toggle", authorize("admin"), convertIdToNumber, categoryController.toggleActive);
router.put("/sort-order", authorize("admin"), categoryController.updateSortOrder);
router.get("/stats/overview", authorize("admin"), categoryController.getStats);

export default router;
