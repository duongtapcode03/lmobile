import express from "express";
import { brandController } from "./brand.controller.js";
import { protect, authorize } from "../../core/middleware/auth.middleware.js";
import { convertIdToNumber } from "../../core/middleware/convertId.middleware.js";

const router = express.Router();

// Public routes
router.get("/", brandController.getAll);
router.get("/sync", brandController.syncFromPhoneDetails); // Sync từ phone details
router.get("/:id/stats", convertIdToNumber, brandController.getStats);
router.get("/slug/:slug", brandController.getBySlug);
router.get("/:id", convertIdToNumber, brandController.getById);

// Protected routes (cần authentication)
router.use(protect);

// Admin only routes
router.post("/", authorize("admin"), brandController.create);
router.put("/:id", authorize("admin"), convertIdToNumber, brandController.update);
router.delete("/:id", authorize("admin"), convertIdToNumber, brandController.delete);

export default router;


