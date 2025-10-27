import express from "express";
import { userController } from "./user.controller.js";
import { protect, authorize } from "../../core/middleware/auth.middleware.js";

const router = express.Router();

// Public routes
router.post("/send-otp", userController.sendOTP);
router.post("/verify-otp", userController.verifyOTP);
router.post("/resend-otp", userController.resendOTP);
router.post("/register", userController.register);
router.post("/login", userController.login);
router.post("/refresh-token", userController.refreshToken);
router.post("/forgot-password", userController.forgotPassword);
router.post("/reset-password", userController.resetPassword);
router.get("/verify-reset-token/:token", userController.verifyResetToken);

// Protected routes (require authentication)
router.get("/profile", protect, userController.profile);
router.put("/profile", protect, userController.updateProfile);
router.put("/change-password", protect, userController.changePassword);
router.post("/logout", protect, userController.logout);

// Admin only routes
router.get("/all", protect, authorize("admin"), userController.getAllUsers);
router.put("/role/:userId", protect, authorize("admin"), userController.updateRole);

export default router;
