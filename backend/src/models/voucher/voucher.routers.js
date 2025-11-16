import express from "express";
import { voucherController } from "./voucher.controller.js";
import { protect, authorize } from "../../core/middleware/auth.middleware.js";

const router = express.Router();

// Public routes (không cần xác thực)
router.get("/code/:code", voucherController.getByCode);
router.get("/available", voucherController.getAvailablePublic);

// Protected routes (cần xác thực)
router.use(protect);

// User routes
router.post("/validate", voucherController.validate);
router.get("/saved", voucherController.getSavedVouchers);
router.post("/:id/save", voucherController.saveVoucher);
router.delete("/:id/save", voucherController.removeSavedVoucher);

// Admin routes
router.post("/", authorize("admin"), voucherController.create);
router.get("/", authorize("admin"), voucherController.getAll);
router.get("/stats", authorize("admin"), voucherController.getStats);
router.get("/:id", authorize("admin"), voucherController.getById);
router.put("/:id", authorize("admin"), voucherController.update);
router.delete("/:id", authorize("admin"), voucherController.delete);
router.put("/:id/toggle", authorize("admin"), voucherController.toggleActive);

export default router;
