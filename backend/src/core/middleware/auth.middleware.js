import jwt from "jsonwebtoken";
import { User } from "../../models/user/user.model.js";

export const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Kiểm tra loại token
      if (decoded.type && decoded.type !== 'access') {
        return res.status(401).json({ message: "Token không hợp lệ" });
      }

      const user = await User.findById(decoded.id).select("-password");
      
      if (!user) {
        return res.status(401).json({ message: "Người dùng không tồn tại" });
      }

      if (!user.isActive) {
        return res.status(401).json({ message: "Tài khoản đã bị khóa" });
      }

      req.user = user;
      next();
    } catch (error) {
      res.status(401).json({ message: "Token không hợp lệ" });
    }
  }

  if (!token) {
    res.status(401).json({ message: "Không có token, truy cập bị từ chối" });
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Chưa xác thực" });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: `Không có quyền truy cập. Yêu cầu vai trò: ${roles.join(", ")}` 
      });
    }
    next();
  };
};

// Middleware kiểm tra quyền admin
export const adminOnly = authorize("admin");

// Middleware kiểm tra quyền seller hoặc admin
export const sellerOrAdmin = authorize("seller", "admin");

// Middleware kiểm tra quyền customer, seller hoặc admin
export const anyRole = authorize("customer", "seller", "admin");
