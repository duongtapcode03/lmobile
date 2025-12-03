import express from "express";
import { feedbackController } from "./feedback.controller.js";
import { protect, authorize } from "../../core/middleware/auth.middleware.js";

const router = express.Router();

// Public routes (không cần xác thực)
router.get("/product/:productId", feedbackController.getByProduct);

// Protected routes (cần xác thực)
router.use(protect);

// Seller và Admin routes
router.post("/:id/respond", authorize("seller", "admin"), feedbackController.respond);
router.get("/", authorize("seller", "admin"), feedbackController.getAll);
router.get("/pending", authorize("seller", "admin"), feedbackController.getPending);
router.get("/stats", authorize("seller", "admin"), feedbackController.getStats);
router.get("/:id", authorize("seller", "admin"), feedbackController.getById);
router.put("/:id/status", authorize("seller", "admin"), feedbackController.updateStatus);

// User routes (delete route chung cho cả user và seller/admin, logic xử lý trong service)
router.post("/", feedbackController.create);
router.get("/my-feedback", feedbackController.getUserFeedback);
router.put("/:id", feedbackController.update);
router.delete("/:id", feedbackController.delete);
router.post("/:id/helpful", feedbackController.markHelpful);
router.post("/:id/report", feedbackController.report);

export default router;
