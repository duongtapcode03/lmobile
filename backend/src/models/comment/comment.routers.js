import express from "express";
import { commentController } from "./comment.controller.js";
import { protect, authorize } from "../../core/middleware/auth.middleware.js";

const router = express.Router();

// Public routes (không cần xác thực)
router.get("/blog/:blogId", commentController.getByBlog);

// Protected routes (cần xác thực)
router.use(protect);

// User routes
router.post("/", commentController.create);
router.get("/my-comments", commentController.getUserComments);
router.put("/:id", commentController.update);
router.delete("/:id", commentController.delete);
router.post("/:id/like", commentController.toggleLike);
router.post("/:id/report", commentController.report);

// Admin routes
router.get("/", authorize("admin"), commentController.getAll);
router.get("/pending", authorize("admin"), commentController.getPending);
router.get("/search", authorize("admin"), commentController.search);
router.get("/stats", authorize("admin"), commentController.getStats);
router.get("/:id", authorize("admin"), commentController.getById);
router.put("/:id/status", authorize("admin"), commentController.updateStatus);
router.put("/:id/toggle-pin", authorize("admin"), commentController.togglePin);

export default router;
