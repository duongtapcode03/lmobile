import express from "express";
// import rateLimit from "express-rate-limit"; // Disabled - rate limiting is off
import { userController } from "./user.controller.js";
import { protect, authorize } from "../../core/middleware/auth.middleware.js";
import { userValidators } from "../../core/validators/user.validator.js";
import { validate } from "../../core/validators/validator.js";

const router = express.Router();

// Stricter rate limit cho auth routes
// DISABLED - Rate limiting is disabled in all environments
// Uncomment below to enable rate limiting
/*
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: {
    success: false,
    message: 'Quá nhiều lần thử đăng nhập/đăng ký, vui lòng thử lại sau 15 phút.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});
*/
// Skip rate limiting - no-op middleware
const authLimiter = (req, res, next) => next();

// Public routes với rate limiting (disabled in development)
router.post("/send-otp", authLimiter, userController.sendOTP);
router.post("/verify-otp", authLimiter, userController.verifyOTP);
router.post("/resend-otp", authLimiter, userController.resendOTP);
router.post("/register", 
  authLimiter, 
  userValidators.register, 
  validate, 
  userController.register
);
router.post("/login", 
  authLimiter, 
  userValidators.login, 
  validate, 
  userController.login
);
router.post("/refresh-token", userController.refreshToken);
router.post("/forgot-password", authLimiter, userController.forgotPassword);
router.post("/reset-password", authLimiter, userController.resetPassword);
router.get("/verify-reset-token/:token", userController.verifyResetToken);

// Protected routes (require authentication)
router.get("/profile", protect, userController.profile);
router.put("/profile", 
  protect, 
  userValidators.updateProfile, 
  validate, 
  userController.updateProfile
);
router.put("/change-password", 
  protect, 
  userValidators.changePassword, 
  validate, 
  userController.changePassword
);
router.post("/logout", protect, userController.logout);

// Admin only routes
router.get("/all", protect, authorize("admin"), userController.getAllUsers);
router.put("/role/:userId", protect, authorize("admin"), userController.updateRole);

export default router;
