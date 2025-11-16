import express from "express";
import { blogController } from "./blog.controller.js";
import { protect, authorize } from "../../core/middleware/auth.middleware.js";

const router = express.Router();

// Public routes (không cần xác thực)
router.get("/list", blogController.getList); // API mới cho trang tin tức
router.get("/", blogController.getAll);
router.get("/featured", blogController.getFeatured);
router.get("/pinned", blogController.getPinned);
router.get("/latest", blogController.getLatest);
router.get("/popular", blogController.getPopular);
router.get("/category/:category", blogController.getByCategory);
router.get("/author/:authorId", blogController.getByAuthor);
router.get("/search", blogController.search);
router.get("/slug/:slug", blogController.getBySlug);
router.get("/:id", blogController.getById);
router.get("/:id/related", blogController.getRelated);

// Protected routes (cần xác thực)
router.use(protect);

// User routes
router.post("/:id/like", blogController.like);
router.post("/:id/unlike", blogController.unlike);
router.post("/:id/share", blogController.share);

// Seller và Admin routes
router.post("/", authorize("seller", "admin"), blogController.create);
router.put("/:id", authorize("seller", "admin"), blogController.update);
router.delete("/:id", authorize("seller", "admin"), blogController.delete);

// Admin only routes
router.get("/stats/overview", authorize("admin"), blogController.getStats);
router.put("/:id/toggle-featured", authorize("admin"), blogController.toggleFeatured);
router.put("/:id/toggle-pinned", authorize("admin"), blogController.togglePinned);

export default router;
