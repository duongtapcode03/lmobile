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
  Tag,
  Modal,
  Popconfirm,
  Empty,
  Select
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
  DollarOutlined,
  PlusOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  EnvironmentOutlined
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { authService } from '../../../api/authService';
import orderService from '../../../api/orderService';
import addressService from '../../../api/addressService';
import { PageWrapper } from '../../../components';
import type { UploadFile } from 'antd/es/upload/interface';
import type { Address } from '../../../types';
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
  const [orderStatsLoading, setOrderStatsLoading] = useState(false);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [addressModalVisible, setAddressModalVisible] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [profileForm] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [addressForm] = Form.useForm();
  const [activeTab, setActiveTab] = useState('profile');

  useEffect(() => {
    loadProfile();
    loadOrderStats();
  }, []);

  useEffect(() => {
    if (activeTab === 'addresses') {
      loadAddresses();
    }
  }, [activeTab]);

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
      setOrderStatsLoading(true);
      const stats = await orderService.getStats();
      setOrderStats(stats);
    } catch (error: any) {
      console.error('Error loading order stats:', error);
      message.error('Không thể tải thống kê đơn hàng');
    } finally {
      setOrderStatsLoading(false);
    }
  };

  const loadAddresses = async () => {
    try {
      setLoadingAddresses(true);
      const data = await addressService.getAddresses();
      setAddresses(data);
    } catch (error: any) {
      console.error('Error loading addresses:', error);
      message.error('Không thể tải danh sách địa chỉ');
    } finally {
      setLoadingAddresses(false);
    }
  };

  const handleAddAddress = () => {
    setEditingAddress(null);
    addressForm.resetFields();
    setAddressModalVisible(true);
  };

  const handleEditAddress = (address: Address) => {
    setEditingAddress(address);
    addressForm.setFieldsValue({
      fullName: address.fullName,
      phone: address.phone,
      province: address.province,
      district: address.district,
      ward: address.ward,
      address: address.address,
      isDefault: address.isDefault
    });
    setAddressModalVisible(true);
  };

  const handleDeleteAddress = async (id: string) => {
    try {
      await addressService.deleteAddress(id);
      message.success('Đã xóa địa chỉ thành công');
      loadAddresses();
    } catch (error: any) {
      console.error('Error deleting address:', error);
      message.error(error.response?.data?.message || 'Không thể xóa địa chỉ');
    }
  };

  const handleSetDefaultAddress = async (id: string) => {
    try {
      await addressService.setDefaultAddress(id);
      message.success('Đã đặt địa chỉ làm mặc định');
      loadAddresses();
    } catch (error: any) {
      console.error('Error setting default address:', error);
      message.error(error.response?.data?.message || 'Không thể đặt địa chỉ mặc định');
    }
  };

  const handleSaveAddress = async (values: any) => {
    try {
      if (editingAddress) {
        await addressService.updateAddress(editingAddress._id, values);
        message.success('Đã cập nhật địa chỉ thành công');
      } else {
        await addressService.createAddress(values);
        message.success('Đã thêm địa chỉ thành công');
      }
      setAddressModalVisible(false);
      loadAddresses();
    } catch (error: any) {
      console.error('Error saving address:', error);
      message.error(error.response?.data?.message || 'Không thể lưu địa chỉ');
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
                      key: 'addresses',
                      label: (
                        <Space>
                          <EnvironmentOutlined />
                          <span>Địa chỉ</span>
                        </Space>
                      ),
                      children: (
                        <div>
                          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Title level={4} style={{ margin: 0 }}>
                              Danh sách địa chỉ
                            </Title>
                            <Button
                              type="primary"
                              icon={<PlusOutlined />}
                              onClick={handleAddAddress}
                            >
                              Thêm địa chỉ
                            </Button>
                          </div>

                          {loadingAddresses ? (
                            <div style={{ textAlign: 'center', padding: '40px 0' }}>
                              <Spin size="large" />
                            </div>
                          ) : addresses.length === 0 ? (
                            <Empty
                              description="Chưa có địa chỉ nào"
                              image={Empty.PRESENTED_IMAGE_SIMPLE}
                            >
                              <Button type="primary" icon={<PlusOutlined />} onClick={handleAddAddress}>
                                Thêm địa chỉ đầu tiên
                              </Button>
                            </Empty>
                          ) : (
                            <Row gutter={[16, 16]}>
                              {addresses.map((address) => (
                                <Col span={24} key={address._id}>
                                  <Card
                                    style={{
                                      border: address.isDefault ? '2px solid #22c55e' : '1px solid #d9d9d9',
                                      position: 'relative'
                                    }}
                                  >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                      <div style={{ flex: 1 }}>
                                        {address.isDefault && (
                                          <Tag
                                            color="success"
                                            icon={<CheckCircleOutlined />}
                                            style={{ marginBottom: 12 }}
                                          >
                                            Mặc định
                                          </Tag>
                                        )}
                                        <Space direction="vertical" size="small" style={{ width: '100%' }}>
                                          <div>
                                            <Text strong>{address.fullName}</Text>
                                          </div>
                                          <div>
                                            <Text type="secondary">
                                              <PhoneOutlined /> {address.phone}
                                            </Text>
                                          </div>
                                          <div>
                                            <Text>
                                              {address.address && `${address.address}, `}
                                              {address.ward && `${address.ward}, `}
                                              {address.district && `${address.district}, `}
                                              {address.province}
                                            </Text>
                                          </div>
                                          {!address.isDefault && (
                                            <Button
                                              type="link"
                                              size="small"
                                              style={{ padding: 0 }}
                                              onClick={() => handleSetDefaultAddress(address._id!)}
                                            >
                                              Đặt làm mặc định
                                            </Button>
                                          )}
                                        </Space>
                                      </div>
                                      <div style={{ marginLeft: 16 }}>
                                        <Space>
                                          <Button
                                            type="link"
                                            icon={<EditOutlined />}
                                            onClick={() => handleEditAddress(address)}
                                          >
                                            Sửa
                                          </Button>
                                          <Popconfirm
                                            title="Xóa địa chỉ"
                                            description="Bạn có chắc chắn muốn xóa địa chỉ này?"
                                            onConfirm={() => handleDeleteAddress(address._id!)}
                                            okText="Xóa"
                                            cancelText="Hủy"
                                          >
                                            <Button
                                              type="link"
                                              danger
                                              icon={<DeleteOutlined />}
                                            >
                                              Xóa
                                            </Button>
                                          </Popconfirm>
                                        </Space>
                                      </div>
                                    </div>
                                  </Card>
                                </Col>
                              ))}
                            </Row>
                          )}
                        </div>
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
              {orderStatsLoading ? (
                <Card title="Thống kê đơn hàng" style={{ marginTop: 16 }}>
                  <div style={{ textAlign: 'center', padding: '20px 0' }}>
                    <Spin />
                    <div style={{ marginTop: 16 }}>
                      <Text type="secondary">Đang tải thống kê...</Text>
                    </div>
                  </div>
                </Card>
              ) : orderStats ? (
                <Card 
                  title={
                    <Space>
                      <ShoppingOutlined />
                      <span>Thống kê đơn hàng</span>
                    </Space>
                  } 
                  style={{ marginTop: 16 }}
                >
                  <Row gutter={[16, 16]}>
                    <Col span={24}>
                      <Statistic
                        title="Tổng đơn hàng"
                        value={orderStats.totalOrders || 0}
                        prefix={<ShoppingOutlined />}
                        valueStyle={{ fontSize: 24 }}
                      />
                    </Col>
                    {orderStats.totalRevenue !== undefined && orderStats.totalRevenue !== null && (
                      <Col span={24}>
                        <Divider style={{ margin: '12px 0' }} />
                        <Statistic
                          title="Tổng tiền đã chi"
                          value={orderStats.totalRevenue || 0}
                          prefix={<DollarOutlined />}
                          precision={0}
                          valueStyle={{ color: '#ff4d4f', fontSize: 20 }}
                          formatter={(value) => {
                            const numValue = Number(value);
                            return new Intl.NumberFormat('vi-VN', {
                              style: 'currency',
                              currency: 'VND'
                            }).format(numValue);
                          }}
                        />
                      </Col>
                    )}
                    <Col span={24}>
                      <Divider style={{ margin: '12px 0' }} />
                      <Text strong style={{ fontSize: 14, marginBottom: 12, display: 'block' }}>
                        Theo trạng thái:
                      </Text>
                    </Col>
                    <Col span={12}>
                      <Statistic
                        title="Chờ xử lý"
                        value={orderStats.pendingOrders || 0}
                        valueStyle={{ color: '#faad14', fontSize: 18 }}
                      />
                    </Col>
                    <Col span={12}>
                      <Statistic
                        title="Đã xác nhận"
                        value={orderStats.confirmedOrders || 0}
                        valueStyle={{ color: '#1890ff', fontSize: 18 }}
                      />
                    </Col>
                    <Col span={12}>
                      <Statistic
                        title="Đang xử lý"
                        value={orderStats.processingOrders || 0}
                        valueStyle={{ color: '#13c2c2', fontSize: 18 }}
                      />
                    </Col>
                    <Col span={12}>
                      <Statistic
                        title="Đang giao"
                        value={orderStats.shippingOrders || 0}
                        valueStyle={{ color: '#722ed1', fontSize: 18 }}
                      />
                    </Col>
                    <Col span={12}>
                      <Statistic
                        title="Đã giao"
                        value={orderStats.deliveredOrders || 0}
                        valueStyle={{ color: '#3f8600', fontSize: 18 }}
                      />
                    </Col>
                    <Col span={12}>
                      <Statistic
                        title="Đã hủy"
                        value={orderStats.cancelledOrders || 0}
                        valueStyle={{ color: '#cf1322', fontSize: 18 }}
                      />
                    </Col>
                    {orderStats.returnedOrders !== undefined && orderStats.returnedOrders !== null && (
                      <Col span={12}>
                        <Statistic
                          title="Đã trả hàng"
                          value={orderStats.returnedOrders || 0}
                          valueStyle={{ color: '#8c8c8c', fontSize: 18 }}
                        />
                      </Col>
                    )}
                  </Row>
                  <Divider />
                  <Button
                    type="primary"
                    block
                    icon={<ShoppingOutlined />}
                    onClick={() => navigate('/orders')}
                  >
                    Xem tất cả đơn hàng
                  </Button>
                </Card>
              ) : (
                <Card title="Thống kê đơn hàng" style={{ marginTop: 16 }}>
                  <div style={{ textAlign: 'center', padding: '20px 0' }}>
                    <Text type="secondary">Đang tải thống kê...</Text>
                  </div>
                </Card>
              )}
            </Col>
          </Row>
        </div>
      </div>

      {/* Address Modal */}
      <Modal
        title={editingAddress ? 'Sửa địa chỉ' : 'Thêm địa chỉ mới'}
        open={addressModalVisible}
        onCancel={() => {
          setAddressModalVisible(false);
          setEditingAddress(null);
          addressForm.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={addressForm}
          layout="vertical"
          onFinish={handleSaveAddress}
        >
          <Form.Item
            label="Họ và tên người nhận"
            name="fullName"
            rules={[{ required: true, message: 'Vui lòng nhập họ và tên' }]}
          >
            <Input placeholder="Nhập họ và tên" />
          </Form.Item>

          <Form.Item
            label="Số điện thoại"
            name="phone"
            rules={[
              { required: true, message: 'Vui lòng nhập số điện thoại' },
              { pattern: /^[0-9]{10,11}$/, message: 'Số điện thoại không hợp lệ' }
            ]}
          >
            <Input placeholder="Nhập số điện thoại" />
          </Form.Item>

          <Form.Item
            label="Tỉnh/Thành phố"
            name="province"
            rules={[{ required: true, message: 'Vui lòng nhập tỉnh/thành phố' }]}
          >
            <Input placeholder="Nhập tỉnh/thành phố" />
          </Form.Item>

          <Form.Item
            label="Quận/Huyện"
            name="district"
            rules={[{ required: true, message: 'Vui lòng nhập quận/huyện' }]}
          >
            <Input placeholder="Nhập quận/huyện" />
          </Form.Item>

          <Form.Item
            label="Phường/Xã"
            name="ward"
            rules={[{ required: true, message: 'Vui lòng nhập phường/xã' }]}
          >
            <Input placeholder="Nhập phường/xã" />
          </Form.Item>

          <Form.Item
            label="Đường/Số nhà"
            name="address"
            rules={[{ required: true, message: 'Vui lòng nhập đường/số nhà' }]}
          >
            <Input placeholder="Nhập đường/số nhà" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button
                onClick={() => {
                  setAddressModalVisible(false);
                  setEditingAddress(null);
                  addressForm.resetFields();
                }}
              >
                Hủy
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                icon={<SaveOutlined />}
              >
                {editingAddress ? 'Cập nhật' : 'Thêm mới'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </PageWrapper>
  );
};

export default ProfilePage;



