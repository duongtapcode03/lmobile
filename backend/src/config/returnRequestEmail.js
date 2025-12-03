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

/**
 * Gửi email thông báo khi return request status thay đổi
 */
export const sendReturnRequestStatusEmail = async (userEmail, userName, returnRequest, status, adminNote = '') => {
  const statusMessages = {
    pending: {
      subject: 'Yêu cầu hoàn hàng đã được gửi thành công - LMobile',
      title: 'Yêu cầu hoàn hàng đã được gửi',
      message: 'Yêu cầu hoàn hàng của bạn đã được gửi thành công và đang chờ xử lý.',
      color: '#1890ff'
    },
    approved: {
      subject: 'Yêu cầu hoàn hàng đã được duyệt - LMobile',
      title: 'Yêu cầu hoàn hàng đã được duyệt',
      message: 'Yêu cầu hoàn hàng của bạn đã được duyệt. Vui lòng gửi hàng về địa chỉ được chỉ định.',
      color: '#52c41a'
    },
    rejected: {
      subject: 'Yêu cầu hoàn hàng bị từ chối - LMobile',
      title: 'Yêu cầu hoàn hàng bị từ chối',
      message: 'Rất tiếc, yêu cầu hoàn hàng của bạn đã bị từ chối.',
      color: '#ff4d4f'
    },
    processing: {
      subject: 'Đang xử lý hoàn tiền cho yêu cầu hoàn hàng - LMobile',
      title: 'Đang xử lý hoàn tiền',
      message: 'Chúng tôi đã nhận được hàng và đang xử lý hoàn tiền cho bạn.',
      color: '#13c2c2'
    },
    completed: {
      subject: 'Hoàn tiền đã hoàn thành - LMobile',
      title: 'Hoàn tiền đã hoàn thành',
      message: 'Số tiền hoàn đã được xử lý thành công.',
      color: '#52c41a'
    },
    cancelled: {
      subject: 'Yêu cầu hoàn hàng đã được hủy - LMobile',
      title: 'Yêu cầu hoàn hàng đã được hủy',
      message: 'Yêu cầu hoàn hàng của bạn đã được hủy.',
      color: '#999'
    }
  };

  const statusInfo = statusMessages[status] || statusMessages.pending;
  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: userEmail,
    subject: statusInfo.subject,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #1890ff 0%, #096dd9 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">LMobile</h1>
        </div>
        <div style="padding: 40px 30px; background: #f9f9f9;">
          <h2 style="color: #333; margin-top: 0;">${statusInfo.title}</h2>
          <p style="color: #666; font-size: 16px; line-height: 1.6;">
            Xin chào <strong>${userName}</strong>,<br><br>
            ${statusInfo.message}
          </p>
          
          <div style="background: white; border-radius: 8px; padding: 20px; margin: 30px 0; border-left: 4px solid ${statusInfo.color};">
            <h3 style="color: #333; margin-top: 0;">Thông tin yêu cầu hoàn hàng</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #666; width: 40%;">Mã đơn hàng:</td>
                <td style="padding: 8px 0; color: #333; font-weight: 600;">${returnRequest.orderNumber}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;">Mã yêu cầu:</td>
                <td style="padding: 8px 0; color: #333; font-weight: 600; font-family: monospace;">${returnRequest._id.toString().slice(-8)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;">Trạng thái:</td>
                <td style="padding: 8px 0;">
                  <span style="background: ${statusInfo.color}; color: white; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: 600;">
                    ${status === 'pending' ? 'Chờ xử lý' : 
                      status === 'approved' ? 'Đã duyệt' : 
                      status === 'rejected' ? 'Từ chối' : 
                      status === 'processing' ? 'Đang xử lý' : 
                      status === 'completed' ? 'Hoàn thành' : 
                      status === 'cancelled' ? 'Đã hủy' : status}
                  </span>
                </td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;">Số tiền hoàn:</td>
                <td style="padding: 8px 0; color: #ff4d4f; font-weight: 600; font-size: 16px;">
                  ${formatPrice(returnRequest.refundAmount || 0)}
                </td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;">Số sản phẩm:</td>
                <td style="padding: 8px 0; color: #333;">${returnRequest.items?.length || 0} sản phẩm</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;">Ngày tạo:</td>
                <td style="padding: 8px 0; color: #333;">${formatDate(returnRequest.createdAt)}</td>
              </tr>
            </table>
          </div>

          ${returnRequest.items && returnRequest.items.length > 0 ? `
            <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <h3 style="color: #333; margin-top: 0;">Sản phẩm hoàn</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <thead>
                  <tr style="background: #f5f5f5;">
                    <th style="padding: 10px; text-align: left; border-bottom: 1px solid #ddd;">Sản phẩm</th>
                    <th style="padding: 10px; text-align: center; border-bottom: 1px solid #ddd;">Số lượng</th>
                    <th style="padding: 10px; text-align: right; border-bottom: 1px solid #ddd;">Giá</th>
                  </tr>
                </thead>
                <tbody>
                  ${returnRequest.items.map(item => `
                    <tr>
                      <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.productName}</td>
                      <td style="padding: 10px; text-align: center; border-bottom: 1px solid #eee;">${item.quantity}</td>
                      <td style="padding: 10px; text-align: right; border-bottom: 1px solid #eee;">${formatPrice(item.price * item.quantity)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : ''}

          ${adminNote ? `
            <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <strong style="color: #856404;">Ghi chú từ admin:</strong>
              <p style="color: #856404; margin: 8px 0 0 0; line-height: 1.6;">${adminNote}</p>
            </div>
          ` : ''}

          ${returnRequest.refundCalculation ? `
            <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <h3 style="color: #333; margin-top: 0;">Chi tiết tính toán hoàn tiền</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #666;">Giá trị sản phẩm:</td>
                  <td style="padding: 8px 0; text-align: right; color: #333;">${formatPrice(returnRequest.refundCalculation.returnItemsSubtotal || 0)}</td>
                </tr>
                ${returnRequest.refundCalculation.returnDiscountAmount > 0 ? `
                  <tr>
                    <td style="padding: 8px 0; color: #666;">Discount được hoàn:</td>
                    <td style="padding: 8px 0; text-align: right; color: #52c41a;">+${formatPrice(returnRequest.refundCalculation.returnDiscountAmount)}</td>
                  </tr>
                ` : ''}
                ${returnRequest.refundCalculation.returnShippingFee > 0 ? `
                  <tr>
                    <td style="padding: 8px 0; color: #666;">Phí vận chuyển bị trừ:</td>
                    <td style="padding: 8px 0; text-align: right; color: #ff4d4f;">-${formatPrice(returnRequest.refundCalculation.returnShippingFee)}</td>
                  </tr>
                ` : ''}
                ${returnRequest.refundCalculation.restockingFee > 0 ? `
                  <tr>
                    <td style="padding: 8px 0; color: #666;">Phí xử lý hoàn hàng:</td>
                    <td style="padding: 8px 0; text-align: right; color: #ff4d4f;">-${formatPrice(returnRequest.refundCalculation.restockingFee)}</td>
                  </tr>
                ` : ''}
                <tr style="border-top: 2px solid #333;">
                  <td style="padding: 12px 0; font-weight: 600; color: #333;">Tổng số tiền được hoàn:</td>
                  <td style="padding: 12px 0; text-align: right; font-weight: 600; color: #ff4d4f; font-size: 18px;">
                    ${formatPrice(returnRequest.refundCalculation.totalRefundAmount || returnRequest.refundAmount || 0)}
                  </td>
                </tr>
              </table>
            </div>
          ` : ''}

          ${status === 'approved' ? `
            <div style="background: #e6f7ff; border-left: 4px solid #1890ff; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <strong style="color: #0050b3;">Hướng dẫn tiếp theo:</strong>
              <ul style="color: #0050b3; margin: 8px 0 0 0; padding-left: 20px; line-height: 1.8;">
                <li>Vui lòng đóng gói sản phẩm cẩn thận</li>
                <li>Gửi hàng về địa chỉ được chỉ định (sẽ được thông báo sau)</li>
                <li>Giữ lại mã vận đơn để theo dõi</li>
              </ul>
            </div>
          ` : ''}

          ${status === 'processing' ? `
            <div style="background: #e6f7ff; border-left: 4px solid #13c2c2; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <strong style="color: #0050b3;">Thông tin:</strong>
              <p style="color: #0050b3; margin: 8px 0 0 0; line-height: 1.6;">
                Chúng tôi đã nhận được hàng và đang xử lý hoàn tiền. Số tiền sẽ được hoàn về phương thức thanh toán gốc của bạn trong vòng 3-5 ngày làm việc.
              </p>
            </div>
          ` : ''}

          ${status === 'completed' && returnRequest.refundTransactionId ? `
            <div style="background: #f6ffed; border-left: 4px solid #52c41a; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <strong style="color: #389e0d;">Mã giao dịch hoàn tiền:</strong>
              <p style="color: #389e0d; margin: 8px 0 0 0; font-family: monospace; font-size: 14px;">
                ${returnRequest.refundTransactionId}
              </p>
            </div>
          ` : ''}

          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/orders/${typeof returnRequest.order === 'object' && returnRequest.order?._id ? returnRequest.order._id : returnRequest.order}" 
               style="background: #1890ff; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px;">
              Xem chi tiết đơn hàng
            </a>
          </div>

          <p style="color: #999; font-size: 14px; margin-top: 30px; line-height: 1.6;">
            Nếu bạn có bất kỳ câu hỏi nào, vui lòng liên hệ với chúng tôi qua email hoặc hotline.<br>
            Cảm ơn bạn đã tin tưởng và sử dụng dịch vụ của LMobile!
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
    console.log(`[Email] Return request status email sent to ${userEmail}:`, info.messageId);
    return info;
  } catch (error) {
    console.error('[Email] Error sending return request status email:', error);
    // Không throw error để không làm gián đoạn flow chính
    return null;
  }
};

