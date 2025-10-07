import { User } from "./user.model.js";
import { generateTokens, generateAccessToken } from "../../core/utils/generateToken.js";
import jwt from "jsonwebtoken";

export const userService = {
  async register(data) {
    const existing = await User.findOne({ email: data.email });
    if (existing) throw new Error("Email đã tồn tại");

    const user = new User(data);
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

    const { accessToken, refreshToken } = generateTokens(user._id, user.role);
    await user.addRefreshToken(refreshToken);
    
    // Cập nhật thời gian đăng nhập cuối
    user.lastLogin = new Date();
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
    const validRoles = ['customer', 'seller', 'admin'];
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
  }
};
