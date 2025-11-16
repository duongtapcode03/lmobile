import express from "express";
import userRoutes from "../models/user/user.routers.js";
import { userController } from "../models/user/user.controller.js";
import { userValidators } from "../core/validators/user.validator.js";
import { validate } from "../core/validators/validator.js";
import categoryRoutes from "../models/category/category.routers.js";
import brandRoutes from "../models/brand/brand.routers.js";
import productRoutes from "../models/product/product.routers.js";
import cartRoutes from "../models/cart/cart.routers.js";
import orderRoutes from "../models/order/order.routers.js";
import paymentRoutes from "../models/payment/payment.routers.js";
import voucherRoutes from "../models/voucher/voucher.routers.js";
import blogRoutes from "../models/blog/blog.routers.js";
import feedbackRoutes from "../models/feedback/feedback.routers.js";
import commentRoutes from "../models/comment/comment.routers.js";
import wishlistRoutes from "../models/wishlist/wishlist.routers.js";
import addressRoutes from "../models/address/address.routers.js";
import flashSaleRoutes from "../models/flashSale/flashSale.routers.js";
import bannerRoutes from "../models/banner/banner.routers.js";
import adminRoutes from "../models/admin/admin.routers.js";
import sellerRoutes from "../models/seller/seller.routers.js";
import { catchAsync } from "../core/middleware/errorHandler.js";

const router = express.Router();

// Auth routes (new format: /auth/login)
router.post("/auth/login", 
  userValidators.login, 
  validate, 
  userController.login
);

// User routes (keep for backward compatibility)
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

// Payment routes
router.use("/payment", paymentRoutes);

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

// Banner routes
router.use("/banners", bannerRoutes);

// Admin routes
router.use("/admin", (req, res, next) => {
  console.log('[Routes] Admin route hit:', req.method, req.path, req.url);
  next();
}, adminRoutes);

// Seller routes
router.use("/seller", sellerRoutes);

export default router;