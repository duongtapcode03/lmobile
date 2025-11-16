import { User } from "./user.model.js";
import { generateTokens, generateAccessToken } from "../../core/utils/generateToken.js";
import { otpService } from "./user.otp.service.js";
import { sendResetPasswordEmail } from "../../config/resetPasswordEmail.js";
import jwt from "jsonwebtoken";
import crypto from "crypto";

export const userService = {
  async register(data) {
    // Check if email is verified
    const emailVerified = await otpService.checkEmailVerified(data.email);
    if (!emailVerified) {
      throw new Error("Email chưa được xác thực");
    }

    const existing = await User.findOne({ email: data.email });
    if (existing && existing.password !== 'temp') {
      throw new Error("Email đã tồn tại");
    }

    // If temporary user exists, update it with real data
    if (existing) {
      existing.name = data.name;
      existing.password = data.password;
      existing.phone = data.phone;
      existing.emailVerified = true;
      await existing.save();
      
      const { accessToken, refreshToken } = generateTokens(existing._id, existing.role);
      await existing.addRefreshToken(refreshToken);
      
      return { user: existing, accessToken, refreshToken };
    }

    // Create new user
    const user = new User({
      ...data,
      emailVerified: true,
    });
    await user.save();

    const { accessToken, refreshToken } = generateTokens(user._id, user.role);
    await user.addRefreshToken(refreshToken);
    
    return { user, accessToken, refreshToken };
  },

  async login(email, password) {
    const user = await User.findOne({ email });
    if (!user) throw new Error("Email không tồn tại");
    if (!user.isActive) throw new Error("Tài khoản đã bị khóa");

    const isMatch = await user.matchPassword(password);
    if (!isMatch) throw new Error("Sai mật khẩu");

    // Lưu role gốc để đảm bảo không bị thay đổi
    const originalRole = user.role;
    
    // Validate role trước khi tiếp tục
    const validRoles = ['user', 'seller', 'admin'];
    if (!validRoles.includes(originalRole)) {
      throw new Error(`Invalid role in database: ${originalRole}. Expected one of: ${validRoles.join(', ')}`);
    }
    
    const { accessToken, refreshToken } = generateTokens(user._id, originalRole);
    await user.addRefreshToken(refreshToken);
    
    // Cập nhật thời gian đăng nhập cuối
    user.lastLogin = new Date();
    
    // Đảm bảo role vẫn là giá trị gốc từ database (defensive)
    // Nếu role bị thay đổi từ đâu đó, restore lại
    if (user.role !== originalRole) {
      console.warn(`[Login] Role was modified from ${originalRole} to ${user.role}. Restoring original role.`);
      user.role = originalRole;
    }
    
    // Save với validation đầy đủ
    await user.save();

    return { user, accessToken, refreshToken };
  },

  async getProfile(userId) {
    return User.findById(userId).select("-password -refreshTokens");
  },

  async updateProfile(userId, updateData) {
    const allowedFields = ['name', 'phone', 'address', 'avatar'];
    const filteredData = {};
    
    Object.keys(updateData).forEach(key => {
      if (allowedFields.includes(key)) {
        filteredData[key] = updateData[key];
      }
    });

    const user = await User.findByIdAndUpdate(
      userId, 
      filteredData, 
      { new: true, runValidators: true }
    ).select("-password -refreshTokens");
    
    if (!user) throw new Error("Người dùng không tồn tại");
    return user;
  },

  async changePassword(userId, currentPassword, newPassword) {
    const user = await User.findById(userId);
    if (!user) throw new Error("Người dùng không tồn tại");

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) throw new Error("Mật khẩu hiện tại không đúng");

    user.password = newPassword;
    await user.save();
    
    // Xóa tất cả refresh token khi đổi mật khẩu
    await user.clearRefreshTokens();
    
    return { message: "Đổi mật khẩu thành công" };
  },

  async updateRole(userId, newRole, adminId) {
    const validRoles = ['user', 'seller', 'admin'];
    if (!validRoles.includes(newRole)) {
      throw new Error("Vai trò không hợp lệ");
    }

    const user = await User.findById(userId);
    if (!user) throw new Error("Người dùng không tồn tại");

    // Chỉ admin mới có thể thay đổi vai trò
    const admin = await User.findById(adminId);
    if (!admin || admin.role !== 'admin') {
      throw new Error("Không có quyền thay đổi vai trò");
    }

    user.role = newRole;
    await user.save();
    
    return { message: `Cập nhật vai trò thành ${newRole} thành công` };
  },

  async refreshToken(refreshToken) {
    try {
      const decoded = jwt.verify(
        refreshToken, 
        process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET
      );
      
      if (decoded.type !== 'refresh') {
        throw new Error("Token không hợp lệ");
      }

      const user = await User.findById(decoded.id);
      if (!user || !user.isActive) {
        throw new Error("Người dùng không tồn tại hoặc đã bị khóa");
      }

      // Kiểm tra refresh token có trong danh sách không
      if (!user.refreshTokens.includes(refreshToken)) {
        throw new Error("Refresh token không hợp lệ");
      }

      // Tạo access token mới
      const accessToken = generateAccessToken(user._id, user.role);
      
      return { accessToken, user };
    } catch (error) {
      throw new Error("Refresh token không hợp lệ hoặc đã hết hạn");
    }
  },

  async logout(userId, refreshToken) {
    const user = await User.findById(userId);
    if (user && refreshToken) {
      await user.removeRefreshToken(refreshToken);
    }
    return { message: "Đăng xuất thành công" };
  },

  async getAllUsers(adminId) {
    const admin = await User.findById(adminId);
    if (!admin || admin.role !== 'admin') {
      throw new Error("Không có quyền truy cập");
    }
    
    return User.find({}).select("-password -refreshTokens");
  },

  // Forgot password
  async forgotPassword(email) {
    const user = await User.findOne({ email });
    if (!user) {
      throw new Error("Email không tồn tại");
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetPasswordExpires = new Date();
    resetPasswordExpires.setHours(resetPasswordExpires.getHours() + 1); // 1 hour

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = resetPasswordExpires;
    await user.save();

    // Send reset email
    try {
      await sendResetPasswordEmail(email, resetToken);
    } catch (error) {
      // Remove token if email failed
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();
      throw new Error("Không thể gửi email đặt lại mật khẩu");
    }

    return { message: "Email đặt lại mật khẩu đã được gửi" };
  },

  // Reset password
  async resetPassword(token, newPassword) {
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() }
    });

    if (!user) {
      throw new Error("Token không hợp lệ hoặc đã hết hạn");
    }

    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    return { message: "Đặt lại mật khẩu thành công" };
  },

  // Verify reset token
  async verifyResetToken(token) {
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() }
    });

    if (!user) {
      throw new Error("Token không hợp lệ hoặc đã hết hạn");
    }

    return { valid: true, message: "Token hợp lệ" };
  }
};
