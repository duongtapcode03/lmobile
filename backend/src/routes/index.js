import express from "express";
import userRoutes from "../models/user/user.routers.js";
import categoryRoutes from "../models/category/category.routers.js";
import productRoutes from "../models/product/product.routers.js";
import cartRoutes from "../models/cart/cart.routers.js";
import orderRoutes from "../models/order/order.routers.js";
import voucherRoutes from "../models/voucher/voucher.routers.js";
import blogRoutes from "../models/blog/blog.routers.js";
import feedbackRoutes from "../models/feedback/feedback.routers.js";
import commentRoutes from "../models/comment/comment.routers.js";

const router = express.Router();

// User routes
router.use("/users", userRoutes);

// Category routes
router.use("/categories", categoryRoutes);

// Product routes
router.use("/products", productRoutes);

// Cart routes
router.use("/cart", cartRoutes);

// Order routes
router.use("/orders", orderRoutes);

// Voucher routes
router.use("/vouchers", voucherRoutes);

// Blog routes
router.use("/blogs", blogRoutes);

// Feedback routes
router.use("/feedbacks", feedbackRoutes);

// Comment routes
router.use("/comments", commentRoutes);

export default router;