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

export const sendResetPasswordEmail = async (email, resetToken) => {
  const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;
  
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Đặt lại mật khẩu tài khoản LMobile',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #1890ff 0%, #096dd9 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">LMobile</h1>
        </div>
        <div style="padding: 40px 30px; background: #f9f9f9;">
          <h2 style="color: #333; margin-top: 0;">Đặt lại mật khẩu</h2>
          <p style="color: #666; font-size: 16px; line-height: 1.6;">
            Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.<br>
            Nếu bạn không yêu cầu điều này, vui lòng bỏ qua email này.
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" 
               style="background: #1890ff; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px;">
              Đặt lại mật khẩu
            </a>
          </div>
          <p style="color: #999; font-size: 13px; margin-top: 30px;">
            Hoặc copy link sau vào trình duyệt:<br>
            <span style="color: #1890ff; word-break: break-all;">${resetLink}</span>
          </p>
          <p style="color: #999; font-size: 14px; margin-top: 30px;">
            Link này có hiệu lực trong 1 giờ.<br>
            Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.
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
    throw new Error('Không thể gửi email đặt lại mật khẩu');
  }
};

