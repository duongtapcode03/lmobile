import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export const sendOTPEmail = async (email, otp) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Mã OTP xác thực đăng ký tài khoản LMobile',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #1890ff 0%, #096dd9 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">LMobile</h1>
        </div>
        <div style="padding: 40px 30px; background: #f9f9f9;">
          <h2 style="color: #333; margin-top: 0;">Mã xác thực đăng ký</h2>
          <p style="color: #666; font-size: 16px; line-height: 1.6;">
            Cảm ơn bạn đã đăng ký tài khoản tại LMobile!<br>
            Vui lòng sử dụng mã OTP sau để hoàn tất đăng ký:
          </p>
          <div style="background: white; border: 2px solid #1890ff; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0;">
            <h1 style="color: #1890ff; font-size: 48px; letter-spacing: 8px; margin: 0;">${otp}</h1>
          </div>
          <p style="color: #999; font-size: 14px;">
            Mã OTP có hiệu lực trong 10 phút.<br>
            Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email này.
          </p>
        </div>
        <div style="background: #333; padding: 20px; text-align: center; color: #999; font-size: 12px;">
          © 2024 LMobile. All rights reserved.
        </div>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error('Không thể gửi email OTP');
  }
};

