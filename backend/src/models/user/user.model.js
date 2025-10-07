import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["customer", "seller", "admin"], default: "customer" },
    phone: { type: String },
    address: { type: String },
    avatar: { type: String },
    refreshTokens: [{ type: String }],
    isActive: { type: Boolean, default: true },
    lastLogin: { type: Date },
  },
  { timestamps: true }
);

// 🔐 Auto encrypt password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password when login
userSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

// Add refresh token
userSchema.methods.addRefreshToken = function (token) {
  this.refreshTokens.push(token);
  // Giới hạn số lượng refresh token để tránh spam
  if (this.refreshTokens.length > 5) {
    this.refreshTokens = this.refreshTokens.slice(-5);
  }
  return this.save();
};

// Remove refresh token
userSchema.methods.removeRefreshToken = function (token) {
  this.refreshTokens = this.refreshTokens.filter(t => t !== token);
  return this.save();
};

// Clear all refresh tokens
userSchema.methods.clearRefreshTokens = function () {
  this.refreshTokens = [];
  return this.save();
};

export const User = mongoose.model("User", userSchema);
