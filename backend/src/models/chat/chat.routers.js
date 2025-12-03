import express from "express";
import { chatController } from "./chat.controller.js";
import { protect, adminOnly, sellerOrAdmin } from "../../core/middleware/auth.middleware.js";

const router = express.Router();

// User routes - cần đăng nhập
router.get("/conversations", protect, chatController.getConversations);
router.get("/conversations/:id", protect, chatController.getConversation);
router.get("/conversations/:id/messages", protect, chatController.getMessages);
router.post("/conversations/:id/messages", protect, chatController.sendMessage);
router.post("/conversations/:id/read", protect, chatController.markAsRead);

// Admin routes - cần đăng nhập admin
router.get("/admin/conversations", protect, adminOnly, chatController.getConversations);
router.get("/admin/conversations/:id", protect, adminOnly, chatController.getConversation);
router.get("/admin/conversations/:id/messages", protect, adminOnly, chatController.getMessages);
router.post("/admin/conversations/:id/messages", protect, adminOnly, chatController.sendMessage);
router.post("/admin/conversations/:id/read", protect, adminOnly, chatController.markAsRead);
router.put("/admin/conversations/:id/status", protect, adminOnly, chatController.updateStatus);
router.post("/admin/conversations/:id/assign", protect, adminOnly, chatController.assignToAdmin);

// Seller routes - cần đăng nhập seller hoặc admin
router.get("/seller/conversations", protect, sellerOrAdmin, chatController.getConversations);
router.get("/seller/conversations/:id", protect, sellerOrAdmin, chatController.getConversation);
router.get("/seller/conversations/:id/messages", protect, sellerOrAdmin, chatController.getMessages);
router.post("/seller/conversations/:id/messages", protect, sellerOrAdmin, chatController.sendMessage);
router.post("/seller/conversations/:id/read", protect, sellerOrAdmin, chatController.markAsRead);
router.put("/seller/conversations/:id/status", protect, sellerOrAdmin, chatController.updateStatus);
router.post("/seller/conversations/:id/assign-seller", protect, sellerOrAdmin, chatController.assignToSeller);

export default router;

