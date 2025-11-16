import jwt from "jsonwebtoken";
import { User } from "../../models/user/user.model.js";

export const protect = async (req, res, next) => {
  let token;

  // Log request details for debugging
  const authHeader = req.headers.authorization;
  console.error(`[Auth Middleware] ${req.method} ${req.path}`);
  console.error(`[Auth Middleware] Authorization header: ${authHeader ? 'Present' : 'Missing'}`);
  
  if (authHeader && authHeader.startsWith("Bearer")) {
    try {
      token = authHeader.split(" ")[1];
      console.error(`[Auth Middleware] Token extracted: ${token ? token.substring(0, 20) + '...' : 'null'}`);
      
      if (!token) {
        console.error(`[Auth Middleware] Token is empty after split`);
        return res.status(401).json({ message: "Token không hợp lệ" });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.error(`[Auth Middleware] Token decoded successfully. ID: ${decoded.id}, Type: ${decoded.type}, Role: ${decoded.role}`);
      
      // Kiểm tra loại token
      if (decoded.type && decoded.type !== 'access') {
        console.error(`[Auth Middleware] Invalid token type: ${decoded.type}`);
        return res.status(401).json({ message: "Token không hợp lệ" });
      }

      const user = await User.findById(decoded.id).select("-password");
      
      if (!user) {
        console.error(`[Auth Middleware] User not found: ${decoded.id}`);
        return res.status(401).json({ message: "Người dùng không tồn tại" });
      }

      if (!user.isActive) {
        console.error(`[Auth Middleware] User account is inactive: ${decoded.id}`);
        return res.status(401).json({ message: "Tài khoản đã bị khóa" });
      }

      console.error(`[Auth Middleware] Authentication successful for user: ${user._id}`);
      req.user = user;
      return next();
    } catch (error) {
      console.error(`[Auth Middleware] Token verification failed:`, error.message);
      console.error(`[Auth Middleware] Error details:`, error.name, error.expiredAt ? `Expired at: ${error.expiredAt}` : '');
      return res.status(401).json({ message: "Token không hợp lệ" });
    }
  }

  // No token provided - đây là protected route nên cần token
  console.error(`[Auth Middleware] No token provided`);
  return res.status(401).json({ message: "Không có token, truy cập bị từ chối" });
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

// Middleware kiểm tra quyền user, seller hoặc admin
export const anyRole = authorize("user", "seller", "admin");

// Backward compatibility aliases
export const staffOrAdmin = sellerOrAdmin; // Alias for backward compatibility
