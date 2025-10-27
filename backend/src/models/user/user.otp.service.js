import { User } from "./user.model.js";
import { sendOTPEmail } from "../../config/emailService.js";

// Generate random 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const otpService = {
  // Send OTP to email
  async sendOTP(email) {
    // Check if email exists
    const existingUser = await User.findOne({ email });
    if (existingUser && existingUser.emailVerified) {
      throw new Error("Email đã được xác thực");
    }

    // Generate OTP
    const otp = generateOTP();
    const otpExpires = new Date();
    otpExpires.setMinutes(otpExpires.getMinutes() + 10); // OTP expires in 10 minutes

    if (existingUser) {
      // Update existing user
      existingUser.otp = otp;
      existingUser.otpExpires = otpExpires;
      await existingUser.save();
    } else {
      // Create temporary user record
      const newUser = new User({
        email,
        name: 'Temporary',
        password: 'temp',
        otp,
        otpExpires,
        emailVerified: false,
      });
      await newUser.save();
    }

    // Send OTP via email
    await sendOTPEmail(email, otp);

    return {
      message: "OTP đã được gửi đến email của bạn",
      email,
    };
  },

  // Verify OTP
  async verifyOTP(email, otp) {
    const user = await User.findOne({ email });
    if (!user) {
      throw new Error("Email không tồn tại");
    }

    // Check if OTP is valid
    if (user.otp !== otp) {
      throw new Error("Mã OTP không đúng");
    }

    // Check if OTP is expired
    if (user.otpExpires < new Date()) {
      throw new Error("Mã OTP đã hết hạn");
    }

    // Mark email as verified
    user.emailVerified = true;
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    return {
      message: "Email đã được xác thực",
      email,
    };
  },

  // Resend OTP
  async resendOTP(email) {
    return await this.sendOTP(email);
  },

  // Check if email is verified before registration
  async checkEmailVerified(email) {
    const user = await User.findOne({ email });
    if (!user) {
      return false;
    }
    return user.emailVerified === true;
  },
};

