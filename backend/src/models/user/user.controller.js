import { userService } from "./user.service.js";
import { otpService } from "./user.otp.service.js";

export const userController = {
  register: async (req, res) => {
    try {
      const result = await userService.register(req.body);
      res.status(201).json(result);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  },

  login: async (req, res) => {
    try {
      const { email, password } = req.body;
      const { user, accessToken, refreshToken } = await userService.login(email, password);
      res.status(200).json({
        user,
        tokens: {
          accessToken,
          refreshToken
        }
      });
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  },

  profile: async (req, res) => {
    try {
      const user = await userService.getProfile(req.user.id);
      res.json(user);
    } catch (error) {
      res.status(401).json({ message: "Unauthorized" });
    }
  },

  updateProfile: async (req, res) => {
    try {
      const user = await userService.updateProfile(req.user.id, req.body);
      res.json(user);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  },

  changePassword: async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const result = await userService.changePassword(req.user.id, currentPassword, newPassword);
      res.json(result);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  },

  updateRole: async (req, res) => {
    try {
      const { userId } = req.params;
      const { role } = req.body;
      const result = await userService.updateRole(userId, role, req.user.id);
      res.json(result);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  },

  refreshToken: async (req, res) => {
    try {
      const { refreshToken } = req.body;
      const result = await userService.refreshToken(refreshToken);
      res.json(result);
    } catch (error) {
      res.status(401).json({ message: error.message });
    }
  },

  logout: async (req, res) => {
    try {
      const { refreshToken } = req.body;
      const result = await userService.logout(req.user.id, refreshToken);
      res.json(result);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  },

  getAllUsers: async (req, res) => {
    try {
      const users = await userService.getAllUsers(req.user.id);
      res.json(users);
    } catch (error) {
      res.status(403).json({ message: error.message });
    }
  },

  // OTP endpoints
  sendOTP: async (req, res) => {
    try {
      const { email } = req.body;
      const result = await otpService.sendOTP(email);
      res.json(result);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  },

  verifyOTP: async (req, res) => {
    try {
      const { email, otp } = req.body;
      const result = await otpService.verifyOTP(email, otp);
      res.json(result);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  },

  resendOTP: async (req, res) => {
    try {
      const { email } = req.body;
      const result = await otpService.resendOTP(email);
      res.json(result);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  },

  // Password reset endpoints
  forgotPassword: async (req, res) => {
    try {
      const { email } = req.body;
      const result = await userService.forgotPassword(email);
      res.json(result);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  },

  resetPassword: async (req, res) => {
    try {
      const { token, password } = req.body;
      const result = await userService.resetPassword(token, password);
      res.json(result);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  },

  verifyResetToken: async (req, res) => {
    try {
      const { token } = req.params;
      const result = await userService.verifyResetToken(token);
      res.json(result);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  },
};
