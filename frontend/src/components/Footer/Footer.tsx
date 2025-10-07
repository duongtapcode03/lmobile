import React, { useState } from 'react';
import { MailOutlined, PhoneOutlined, EnvironmentOutlined } from '@ant-design/icons';
import { Input, Button, Row, Col, Typography } from 'antd';
import './Footer.scss';

const { Title, Text } = Typography;

const Footer: React.FC = () => {
  const [email, setEmail] = useState('');

  const handleSubscribe = () => {
    if (email) {
      console.log('Subscribe email:', email);
      setEmail('');
    }
  };

  return (
    <footer className="footer">
      {/* Newsletter section */}
      <div className="newsletter-section">
        <div className="container">
          <div className="newsletter-content">
            <div className="newsletter-text">
              <Title level={3} className="newsletter-title">
                ĐĂNG KÝ NHẬN TIN KHUYẾN MÃI
              </Title>
              <Text className="newsletter-subtitle">
                Nhận ngay voucher 10%
              </Text>
              <Text className="newsletter-note">
                Voucher sẽ được gửi sau 24h, chỉ áp dụng cho khách hàng mới
              </Text>
            </div>
            <div className="newsletter-form">
              <Input
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                prefix={<MailOutlined />}
                size="large"
                className="email-input"
              />
              <Button 
                type="primary" 
                size="large" 
                onClick={handleSubscribe}
                className="subscribe-btn"
              >
                ĐĂNG KÝ NGAY
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main footer content */}
      <div className="footer-main">
        <div className="container">
          <Row gutter={[32, 32]}>
            {/* Company info */}
            <Col xs={24} sm={12} md={6}>
              <div className="footer-section">
                <Title level={4} className="section-title">Về LMobile</Title>
                <div className="contact-info">
                  <div className="contact-item">
                    <PhoneOutlined />
                    <span>Hotline: <strong>1800.2097</strong></span>
                  </div>
                  <div className="contact-item">
                    <EnvironmentOutlined />
                    <span>350-352 Võ Văn Kiệt, Q.1, TP.HCM</span>
                  </div>
                  <div className="contact-item">
                    <MailOutlined />
                    <span>support@lmobile.com</span>
                  </div>
                </div>
                <div className="social-links">
                  <a href="#" className="social-link">Facebook</a>
                  <a href="#" className="social-link">Instagram</a>
                  <a href="#" className="social-link">YouTube</a>
                  <a href="#" className="social-link">TikTok</a>
                </div>
              </div>
            </Col>

            {/* Product categories */}
            <Col xs={24} sm={12} md={6}>
              <div className="footer-section">
                <Title level={4} className="section-title">Sản phẩm</Title>
                <ul className="footer-links">
                  <li><a href="/phones">Điện thoại</a></li>
                  <li><a href="/tablets">Máy tính bảng</a></li>
                  <li><a href="/laptops">Laptop</a></li>
                  <li><a href="/audio">Âm thanh</a></li>
                  <li><a href="/watches">Đồng hồ</a></li>
                  <li><a href="/accessories">Phụ kiện</a></li>
                  <li><a href="/home">Đồ gia dụng</a></li>
                </ul>
              </div>
            </Col>

            {/* Services */}
            <Col xs={24} sm={12} md={6}>
              <div className="footer-section">
                <Title level={4} className="section-title">Dịch vụ</Title>
                <ul className="footer-links">
                  <li><a href="/trade-in">Thu cũ đổi mới</a></li>
                  <li><a href="/warranty">Bảo hành</a></li>
                  <li><a href="/repair">Sửa chữa</a></li>
                  <li><a href="/installment">Trả góp</a></li>
                  <li><a href="/delivery">Giao hàng</a></li>
                  <li><a href="/support">Hỗ trợ</a></li>
                </ul>
              </div>
            </Col>

            {/* Policies */}
            <Col xs={24} sm={12} md={6}>
              <div className="footer-section">
                <Title level={4} className="section-title">Chính sách</Title>
                <ul className="footer-links">
                  <li><a href="/privacy">Chính sách bảo mật</a></li>
                  <li><a href="/terms">Điều khoản sử dụng</a></li>
                  <li><a href="/return">Đổi trả hàng</a></li>
                  <li><a href="/shipping">Chính sách giao hàng</a></li>
                  <li><a href="/warranty-policy">Chính sách bảo hành</a></li>
                  <li><a href="/payment">Phương thức thanh toán</a></li>
                </ul>
              </div>
            </Col>
          </Row>
        </div>
      </div>

      {/* Payment methods */}
      <div className="payment-section">
        <div className="container">
          <div className="payment-content">
            <Text className="payment-title">Phương thức thanh toán</Text>
            <div className="payment-methods">
              <div className="payment-item">Visa</div>
              <div className="payment-item">Mastercard</div>
              <div className="payment-item">VnPay</div>
              <div className="payment-item">MoMo</div>
              <div className="payment-item">ZaloPay</div>
              <div className="payment-item">COD</div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom footer */}
      <div className="footer-bottom">
        <div className="container">
          <div className="bottom-content">
            <div className="copyright">
              <Text>
                © 2024 LMobile. Tất cả quyền được bảo lưu.
              </Text>
            </div>
            <div className="certification">
              <Text>
                Giấy phép ĐKKD: 0316172372 | Đã thông báo Bộ Công Thương
              </Text>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
