import { userService } from "./user.service.js";
import { otpService } from "./user.otp.service.js";
import { catchAsync } from "../../core/middleware/errorHandler.js";
import { successResponse, createdResponse } from "../../core/utils/response.js";

export const userController = {
  register: catchAsync(async (req, res) => {
    const result = await userService.register(req.body);
    createdResponse(res, result, "Đăng ký thành công");
  }),

  login: catchAsync(async (req, res) => {
    const { email, password } = req.body;
    
    // Debug: Log request body để kiểm tra có role không
    if (process.env.NODE_ENV === 'development' && req.body.role) {
      console.warn('[Login Controller] Warning: Request body contains role field:', req.body.role);
    }
    
    const { user, accessToken, refreshToken } = await userService.login(email, password);
    
    // Trả về format đầy đủ: { user, tokens: { accessToken, refreshToken } }
    // Backend và Frontend đều dùng role: "user", "seller", "admin"
    successResponse(res, {
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      tokens: {
        accessToken,
        refreshToken
      }
    }, "Đăng nhập thành công");
  }),

  profile: catchAsync(async (req, res) => {
    const user = await userService.getProfile(req.user.id);
    successResponse(res, user);
  }),

  updateProfile: catchAsync(async (req, res) => {
    const user = await userService.updateProfile(req.user.id, req.body);
    successResponse(res, user, "Cập nhật thông tin thành công");
  }),

  changePassword: catchAsync(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const result = await userService.changePassword(req.user.id, currentPassword, newPassword);
    successResponse(res, result, "Đổi mật khẩu thành công");
  }),

  updateRole: catchAsync(async (req, res) => {
    const { userId } = req.params;
    const { role } = req.body;
    const result = await userService.updateRole(userId, role, req.user.id);
    successResponse(res, result, "Cập nhật vai trò thành công");
  }),

  refreshToken: catchAsync(async (req, res) => {
    const { refreshToken } = req.body;
    const { accessToken, user } = await userService.refreshToken(refreshToken);
    
    // Trả về format nhất quán với login: { tokens: { accessToken }, user }
    successResponse(res, {
      tokens: {
        accessToken
      },
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        emailVerified: user.emailVerified,
      }
    }, "Làm mới token thành công");
  }),

  logout: catchAsync(async (req, res) => {
    const { refreshToken } = req.body;
    const result = await userService.logout(req.user.id, refreshToken);
    successResponse(res, result, "Đăng xuất thành công");
  }),

  getAllUsers: catchAsync(async (req, res) => {
    const users = await userService.getAllUsers(req.user.id);
    successResponse(res, users);
  }),

  // OTP endpoints
  sendOTP: catchAsync(async (req, res) => {
    const { email } = req.body;
    const result = await otpService.sendOTP(email);
    successResponse(res, result, "Gửi OTP thành công");
  }),

  verifyOTP: catchAsync(async (req, res) => {
    const { email, otp } = req.body;
    const result = await otpService.verifyOTP(email, otp);
    successResponse(res, result, "Xác thực OTP thành công");
  }),

  resendOTP: catchAsync(async (req, res) => {
    const { email } = req.body;
    const result = await otpService.resendOTP(email);
    successResponse(res, result, "Gửi lại OTP thành công");
  }),

  // Password reset endpoints
  forgotPassword: catchAsync(async (req, res) => {
    const { email } = req.body;
    const result = await userService.forgotPassword(email);
    successResponse(res, result, "Email reset password đã được gửi");
  }),

  resetPassword: catchAsync(async (req, res) => {
    const { token, password } = req.body;
    const result = await userService.resetPassword(token, password);
    successResponse(res, result, "Đặt lại mật khẩu thành công");
  }),

  verifyResetToken: catchAsync(async (req, res) => {
    const { token } = req.params;
    const result = await userService.verifyResetToken(token);
    successResponse(res, result);
  }),
};
