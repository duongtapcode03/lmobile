import express from "express";
import { returnRequestController } from "./returnRequest.controller.js";
import { protect, authorize } from "../../core/middleware/auth.middleware.js";

const router = express.Router();

// Tất cả routes đều cần xác thực
router.use(protect);

// User routes
router.post("/", returnRequestController.create);
router.get("/my-requests", returnRequestController.getMyReturnRequests);
router.get("/:id", returnRequestController.getById);
router.put("/:id/cancel", returnRequestController.cancel);

// Admin routes
router.get("/", authorize("admin"), returnRequestController.getAll);
router.get("/admin/:id", authorize("admin"), returnRequestController.getByIdAdmin);
router.put("/:id/approve", authorize("admin"), returnRequestController.approve);
router.put("/:id/reject", authorize("admin"), returnRequestController.reject);
router.put("/:id/process", authorize("admin"), returnRequestController.process);
router.put("/:id/complete", authorize("admin"), returnRequestController.complete);

export default router;

