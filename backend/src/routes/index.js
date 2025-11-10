import express from "express";
import userRoutes from "../models/user/user.routers.js";
import categoryRoutes from "../models/category/category.routers.js";
import brandRoutes from "../models/brand/brand.routers.js";
import productRoutes from "../models/product/product.routers.js";
import cartRoutes from "../models/cart/cart.routers.js";
import orderRoutes from "../models/order/order.routers.js";
import voucherRoutes from "../models/voucher/voucher.routers.js";
import blogRoutes from "../models/blog/blog.routers.js";
import feedbackRoutes from "../models/feedback/feedback.routers.js";
import commentRoutes from "../models/comment/comment.routers.js";
import wishlistRoutes from "../models/wishlist/wishlist.routers.js";
import addressRoutes from "../models/address/address.routers.js";
import flashSaleRoutes from "../models/flashSale/flashSale.routers.js";

const router = express.Router();

// User routes
router.use("/users", userRoutes);

// Category routes
router.use("/categories", categoryRoutes);

// Brand routes
router.use("/brands", brandRoutes);

// Product routes (unified - includes phone details)
router.use("/products", productRoutes);

// Cart routes
router.use("/cart", cartRoutes);

// Wishlist routes
router.use("/wishlist", wishlistRoutes);

// Address routes
router.use("/addresses", addressRoutes);

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

// Flash Sale routes
router.use("/flash-sales", flashSaleRoutes);

export default router;