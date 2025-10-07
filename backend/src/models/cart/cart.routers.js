import express from "express";
import { cartController } from "./cart.controller.js";
import { protect } from "../../core/middleware/auth.middleware.js";

const router = express.Router();

// Tất cả routes đều cần xác thực
router.use(protect);

// Cart routes
router.get("/", cartController.getCart);
router.post("/add", cartController.addToCart);
router.put("/item/:itemId", cartController.updateCartItem);
router.delete("/item/:itemId", cartController.removeFromCart);
router.delete("/clear", cartController.clearCart);

// Shipping và coupon
router.put("/shipping-fee", cartController.updateShippingFee);
router.post("/apply-coupon", cartController.applyCoupon);
router.delete("/remove-coupon", cartController.removeCoupon);

// Utilities
router.post("/sync-prices", cartController.syncCartPrices);
router.get("/stats", cartController.getCartStats);
router.post("/calculate-shipping", cartController.calculateShippingFee);

export default router;
