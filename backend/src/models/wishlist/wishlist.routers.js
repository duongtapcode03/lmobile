import express from "express";
import { wishlistController } from "./wishlist.controller.js";
import { protect } from "../../core/middleware/auth.middleware.js";
import { wishlistValidators } from "../../core/validators/wishlist.validator.js";
import { validate } from "../../core/validators/validator.js";

const router = express.Router();

// Tất cả routes đều cần authentication
router.use(protect);

// My wishlist
router.get("/", wishlistController.getMyWishlist);
router.delete("/clear", wishlistController.clearWishlist);
router.post("/share", wishlistController.generateShareToken);
router.put("/public", 
  wishlistValidators.togglePublic, 
  validate, 
  wishlistController.togglePublic
);

// Product operations
router.post("/products/:productId", 
  wishlistValidators.addProduct, 
  validate, 
  wishlistController.addProduct
);
router.delete("/products/:productId", 
  wishlistValidators.removeProduct, 
  validate, 
  wishlistController.removeProduct
);
router.get("/products/:productId/check", 
  wishlistValidators.checkProduct, 
  validate, 
  wishlistController.checkProduct
);
// API mới: Toggle wishlist (thêm nếu chưa có, xóa nếu đã có)
router.post("/products/:productId/toggle", 
  wishlistController.toggleProduct
);

// Public route - get wishlist by share token
router.get("/share/:token", wishlistController.getWishlistByToken);

export default router;

