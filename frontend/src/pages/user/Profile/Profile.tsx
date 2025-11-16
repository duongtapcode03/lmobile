/**
 * ProfilePage Component
 * Trang quản lý thông tin cá nhân
 */

import React, { useState, useEffect } from 'react';
import {
  Row,
  Col,
  Card,
  Form,
  Input,
  Button,
  Space,
  Typography,
  Divider,
  Spin,
  message,
  Avatar,
  Upload,
  Tabs,
  Statistic,
  Tag
} from 'antd';
import {
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  HomeOutlined,
  LockOutlined,
  EditOutlined,
  SaveOutlined,
  ShoppingOutlined,
  DollarOutlined
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { authService } from '../../../api/authService';
import orderService from '../../../api/orderService';
import { PageWrapper } from '../../../components';
import type { UploadFile } from 'antd/es/upload/interface';
import './Profile.scss';

const { Title, Text } = Typography;

interface UserProfile {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  avatar?: string;
  role: string;
  emailVerified: boolean;
  createdAt: string;
  lastLogin?: string;
}

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [orderStats, setOrderStats] = useState<any>(null);
  const [profileForm] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [activeTab, setActiveTab] = useState('profile');

  useEffect(() => {
    loadProfile();
    loadOrderStats();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const response = await authService.getProfile();
      const userData = response.data;
      setProfile(userData);
      profileForm.setFieldsValue({
        name: userData.name,
        phone: userData.phone || '',
        address: userData.address || ''
      });
    } catch (error: any) {
      console.error('Error loading profile:', error);
      message.error('Không thể tải thông tin cá nhân');
      if (error.response?.status === 401) {
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadOrderStats = async () => {
    try {
      const stats = await orderService.getStats();
      setOrderStats(stats);
    } catch (error) {
      console.error('Error loading order stats:', error);
    }
  };

  const handleUpdateProfile = async (values: any) => {
    try {
      setSaving(true);
      const response = await authService.updateProfile(values);
      const updatedProfile = response.data;
      setProfile(updatedProfile);
      
      message.success('Cập nhật thông tin thành công');
      
      // Redirect về trang chủ sau 1.5 giây để user thấy message
      setTimeout(() => {
        navigate('/');
      }, 1500);
    } catch (error: any) {
      console.error('Error updating profile:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Không thể cập nhật thông tin';
      message.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (values: { currentPassword: string; newPassword: string; confirmPassword: string }) => {
    if (values.newPassword !== values.confirmPassword) {
      message.error('Mật khẩu mới không khớp');
      return;
    }

    try {
      setChangingPassword(true);
      await authService.changePassword(values.currentPassword, values.newPassword);
      passwordForm.resetFields();
      
      message.success('Đổi mật khẩu thành công');
      
      // Redirect về trang chủ sau 1.5 giây để user thấy message
      setTimeout(() => {
        navigate('/');
      }, 1500);
    } catch (error: any) {
      console.error('Error changing password:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Không thể đổi mật khẩu';
      message.error(errorMessage);
    } finally {
      setChangingPassword(false);
    }
  };

  const handleAvatarChange = async (file: UploadFile) => {
    // TODO: Implement avatar upload
    // For now, just show a message
    message.info('Tính năng upload avatar đang được phát triển');
    return false;
  };

  const formatDate = (date: string | Date | undefined) => {
    if (!date) return 'Chưa có';
    return new Date(date).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <PageWrapper loading={true}>
        <div className="profile-page">
          <div className="container">
            <Spin size="large" />
          </div>
        </div>
      </PageWrapper>
    );
  }

  if (!profile) {
    return (
      <PageWrapper>
        <div className="profile-page">
          <div className="container">
            <Card>
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <Text type="secondary">Không thể tải thông tin cá nhân</Text>
              </div>
            </Card>
          </div>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <div className="profile-page">
        <div className="container">
          <Title level={2} style={{ marginBottom: 24 }}>
            Thông tin cá nhân
          </Title>

          <Row gutter={[24, 24]}>
            {/* Left Column - Profile Info */}
            <Col xs={24} lg={16}>
              <Card>
                <Tabs
                  activeKey={activeTab}
                  onChange={setActiveTab}
                  items={[
                    {
                      key: 'profile',
                      label: (
                        <Space>
                          <UserOutlined />
                          <span>Thông tin cá nhân</span>
                        </Space>
                      ),
                      children: (
                        <Form
                          form={profileForm}
                          layout="vertical"
                          onFinish={handleUpdateProfile}
                          initialValues={{
                            name: profile.name,
                            phone: profile.phone || '',
                            address: profile.address || ''
                          }}
                        >
                          <Row gutter={[16, 16]}>
                            <Col xs={24} sm={12}>
                              <Form.Item
                                label="Họ và tên"
                                name="name"
                                rules={[{ required: true, message: 'Vui lòng nhập họ và tên' }]}
                              >
                                <Input prefix={<UserOutlined />} placeholder="Nhập họ và tên" />
                              </Form.Item>
                            </Col>
                            <Col xs={24} sm={12}>
                              <Form.Item label="Email">
                                <Input
                                  prefix={<MailOutlined />}
                                  value={profile.email}
                                  disabled
                                  suffix={
                                    profile.emailVerified ? (
                                      <Tag color="success">Đã xác thực</Tag>
                                    ) : (
                                      <Tag color="warning">Chưa xác thực</Tag>
                                    )
                                  }
                                />
                              </Form.Item>
                            </Col>
                            <Col xs={24} sm={12}>
                              <Form.Item
                                label="Số điện thoại"
                                name="phone"
                              >
                                <Input prefix={<PhoneOutlined />} placeholder="Nhập số điện thoại" />
                              </Form.Item>
                            </Col>
                            <Col xs={24}>
                              <Form.Item
                                label="Địa chỉ"
                                name="address"
                              >
                                <Input prefix={<HomeOutlined />} placeholder="Nhập địa chỉ" />
                              </Form.Item>
                            </Col>
                            <Col xs={24}>
                              <Form.Item>
                                <Button
                                  type="primary"
                                  htmlType="submit"
                                  icon={<SaveOutlined />}
                                  loading={saving}
                                >
                                  Lưu thay đổi
                                </Button>
                              </Form.Item>
                            </Col>
                          </Row>
                        </Form>
                      )
                    },
                    {
                      key: 'password',
                      label: (
                        <Space>
                          <LockOutlined />
                          <span>Đổi mật khẩu</span>
                        </Space>
                      ),
                      children: (
                        <Form
                          form={passwordForm}
                          layout="vertical"
                          onFinish={handleChangePassword}
                        >
                          <Form.Item
                            label="Mật khẩu hiện tại"
                            name="currentPassword"
                            rules={[{ required: true, message: 'Vui lòng nhập mật khẩu hiện tại' }]}
                          >
                            <Input.Password prefix={<LockOutlined />} placeholder="Nhập mật khẩu hiện tại" />
                          </Form.Item>
                          <Form.Item
                            label="Mật khẩu mới"
                            name="newPassword"
                            rules={[
                              { required: true, message: 'Vui lòng nhập mật khẩu mới' },
                              { min: 6, message: 'Mật khẩu phải có ít nhất 6 ký tự' }
                            ]}
                          >
                            <Input.Password prefix={<LockOutlined />} placeholder="Nhập mật khẩu mới" />
                          </Form.Item>
                          <Form.Item
                            label="Xác nhận mật khẩu mới"
                            name="confirmPassword"
                            dependencies={['newPassword']}
                            rules={[
                              { required: true, message: 'Vui lòng xác nhận mật khẩu mới' },
                              ({ getFieldValue }) => ({
                                validator(_, value) {
                                  if (!value || getFieldValue('newPassword') === value) {
                                    return Promise.resolve();
                                  }
                                  return Promise.reject(new Error('Mật khẩu xác nhận không khớp'));
                                }
                              })
                            ]}
                          >
                            <Input.Password prefix={<LockOutlined />} placeholder="Xác nhận mật khẩu mới" />
                          </Form.Item>
                          <Form.Item>
                            <Button
                              type="primary"
                              htmlType="submit"
                              icon={<SaveOutlined />}
                              loading={changingPassword}
                            >
                              Đổi mật khẩu
                            </Button>
                          </Form.Item>
                        </Form>
                      )
                    }
                  ]}
                />
              </Card>
            </Col>

            {/* Right Column - Avatar & Stats */}
            <Col xs={24} lg={8}>
              {/* Avatar Card */}
              <Card className="avatar-card">
                <div style={{ textAlign: 'center' }}>
                  <Upload
                    name="avatar"
                    listType="picture-circle"
                    showUploadList={false}
                    beforeUpload={handleAvatarChange}
                    accept="image/*"
                  >
                    <Avatar
                      size={120}
                      src={profile.avatar}
                      icon={<UserOutlined />}
                      style={{ cursor: 'pointer' }}
                    />
                  </Upload>
                  <Title level={4} style={{ marginTop: 16, marginBottom: 8 }}>
                    {profile.name}
                  </Title>
                  <Text type="secondary">{profile.email}</Text>
                  <Divider />
                  <Space direction="vertical" size="small" style={{ width: '100%', textAlign: 'left' }}>
                    <div>
                      <Text type="secondary">Vai trò: </Text>
                      <Text strong>
                        {profile.role === 'customer' ? 'Khách hàng' : 
                         profile.role === 'staff' ? 'Nhân viên' : 
                         profile.role === 'admin' ? 'Quản trị viên' : profile.role}
                      </Text>
                    </div>
                    <div>
                      <Text type="secondary">Thành viên từ: </Text>
                      <Text>{formatDate(profile.createdAt)}</Text>
                    </div>
                    {profile.lastLogin && (
                      <div>
                        <Text type="secondary">Đăng nhập lần cuối: </Text>
                        <Text>{formatDate(profile.lastLogin)}</Text>
                      </div>
                    )}
                  </Space>
                </div>
              </Card>

              {/* Order Stats Card */}
              {orderStats && (
                <Card title="Thống kê đơn hàng" style={{ marginTop: 16 }}>
                  <Row gutter={[16, 16]}>
                    <Col span={12}>
                      <Statistic
                        title="Tổng đơn hàng"
                        value={orderStats.totalOrders || 0}
                        prefix={<ShoppingOutlined />}
                      />
                    </Col>
                    <Col span={12}>
                      <Statistic
                        title="Đã giao"
                        value={orderStats.deliveredOrders || 0}
                        valueStyle={{ color: '#3f8600' }}
                      />
                    </Col>
                    <Col span={12}>
                      <Statistic
                        title="Đang xử lý"
                        value={orderStats.processingOrders || 0}
                        valueStyle={{ color: '#1890ff' }}
                      />
                    </Col>
                    <Col span={12}>
                      <Statistic
                        title="Đã hủy"
                        value={orderStats.cancelledOrders || 0}
                        valueStyle={{ color: '#cf1322' }}
                      />
                    </Col>
                  </Row>
                  <Divider />
                  <Button
                    type="link"
                    block
                    onClick={() => navigate('/orders')}
                  >
                    Xem tất cả đơn hàng →
                  </Button>
                </Card>
              )}
            </Col>
          </Row>
        </div>
      </div>
    </PageWrapper>
  );
};

export default ProfilePage;



