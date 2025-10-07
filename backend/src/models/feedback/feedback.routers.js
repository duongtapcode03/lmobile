import express from "express";
import { feedbackController } from "./feedback.controller.js";
import { protect, authorize } from "../../core/middleware/auth.middleware.js";

const router = express.Router();

// Public routes (không cần xác thực)
router.get("/product/:productId", feedbackController.getByProduct);

// Protected routes (cần xác thực)
router.use(protect);

// User routes
router.post("/", feedbackController.create);
router.get("/my-feedback", feedbackController.getUserFeedback);
router.put("/:id", feedbackController.update);
router.delete("/:id", feedbackController.delete);
router.post("/:id/helpful", feedbackController.markHelpful);
router.post("/:id/report", feedbackController.report);

// Seller và Admin routes
router.post("/:id/respond", authorize("seller", "admin"), feedbackController.respond);

// Admin routes
router.get("/", authorize("admin"), feedbackController.getAll);
router.get("/pending", authorize("admin"), feedbackController.getPending);
router.get("/stats", authorize("admin"), feedbackController.getStats);
router.get("/:id", authorize("admin"), feedbackController.getById);
router.put("/:id/status", authorize("admin"), feedbackController.updateStatus);

export default router;
