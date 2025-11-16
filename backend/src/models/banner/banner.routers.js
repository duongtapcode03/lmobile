import express from "express";
import { bannerController } from "./banner.controller.js";
import { protect, authorize } from "../../core/middleware/auth.middleware.js";

const router = express.Router();

// Public routes (không cần xác thực)
// Lưu ý: route /active phải đặt trước /:id để tránh conflict
router.get("/active", bannerController.getActive);
router.get("/", bannerController.getAll);
router.get("/:id", bannerController.getById);

// Protected routes (cần xác thực)
router.use(protect);

// Admin only routes
router.post("/", authorize("admin"), bannerController.create);
router.put("/:id", authorize("admin"), bannerController.update);
router.delete("/:id", authorize("admin"), bannerController.delete);
router.put("/:id/toggle", authorize("admin"), bannerController.toggleActive);
router.put("/sort-order", authorize("admin"), bannerController.updateSortOrder);

export default router;

