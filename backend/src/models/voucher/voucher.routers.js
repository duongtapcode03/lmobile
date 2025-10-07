import express from "express";
import { voucherController } from "./voucher.controller.js";
import { protect, authorize } from "../../core/middleware/auth.middleware.js";

const router = express.Router();

// Public routes (không cần xác thực)
router.get("/code/:code", voucherController.getByCode);
router.get("/available", voucherController.getAvailable);

// Protected routes (cần xác thực)
router.use(protect);

// User routes
router.post("/validate", voucherController.validate);

// Admin routes
router.post("/", authorize("admin"), voucherController.create);
router.get("/", authorize("admin"), voucherController.getAll);
router.get("/stats", authorize("admin"), voucherController.getStats);
router.get("/:id", authorize("admin"), voucherController.getById);
router.put("/:id", authorize("admin"), voucherController.update);
router.delete("/:id", authorize("admin"), voucherController.delete);
router.put("/:id/toggle", authorize("admin"), voucherController.toggleActive);

export default router;
