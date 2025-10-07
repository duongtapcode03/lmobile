import jwt from "jsonwebtoken";

// Generate access token (short-lived)
export const generateAccessToken = (userId, role) => {
  return jwt.sign(
    { id: userId, role, type: "access" },
    process.env.JWT_SECRET,
    { expiresIn: "15m" }
  );
};

// Generate refresh token (long-lived)
export const generateRefreshToken = (userId, role) => {
  return jwt.sign(
    { id: userId, role, type: "refresh" },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

// Generate both tokens
export const generateTokens = (userId, role) => {
  const accessToken = generateAccessToken(userId, role);
  const refreshToken = generateRefreshToken(userId, role);
  return { accessToken, refreshToken };
};

// Legacy function for backward compatibility
export const generateToken = (userId, role) => {
  return generateAccessToken(userId, role);
};
