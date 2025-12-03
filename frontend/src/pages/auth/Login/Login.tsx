/**
 * Login Page
 * Trang đăng nhập
 */

// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Checkbox, Alert, Space, message } from 'antd';
import { Link, useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { FormField, PasswordInput } from '../../../components/Common/Form';
import { setCredentials } from '../../../features/auth/authSlice';
import { authService } from '../../../api/authService';
import { AuthLayout } from '../../../shared/layouts';
import './Login.scss';

const LoginPage = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [form] = Form.useForm();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Auto-fill email from query params
  useEffect(() => {
    const email = searchParams.get('email');
    if (email) {
      form.setFieldsValue({ email });
      // Show success message if coming from registration
      message.success(t('auth.registerSuccessMessage') || 'Đăng ký thành công! Vui lòng đăng nhập.');
    }
  }, [searchParams, form, t]);

  const onFinish = async (values) => {
    setLoading(true);
    setError('');
    
    try {
      const response = await authService.login(values.email, values.password);
      
      // Backend response format: { success, message, data: { user, tokens: { accessToken, refreshToken } } }
      // authService.login returns response.data, so response = { user, tokens: { accessToken, refreshToken } }
      // Also support legacy format: { token, role }
      let accessToken, refreshToken, role, userData;
      
      if (response.tokens) {
        // New format: { user, tokens: { accessToken, refreshToken } }
        accessToken = response.tokens.accessToken;
        refreshToken = response.tokens.refreshToken;
        userData = response.user;
        role = userData?.role;
      } else if (response.token) {
        // Legacy format: { token, role }
        accessToken = response.token;
        refreshToken = null;
        role = response.role;
        userData = { role, email: values.email };
      } else {
        // Fallback: try nested structure
        accessToken = response.data?.tokens?.accessToken || response.data?.token;
        refreshToken = response.data?.tokens?.refreshToken || null;
        userData = response.data?.user || response.user;
        role = userData?.role || response.data?.role || response.role;
      }
      
      // Backend và Frontend đều dùng: "user", "seller", "admin"
      // Không cần mapping nữa vì backend đã được cập nhật
      
      // Validate response
      if (!accessToken || !role) {
        console.error('[LoginPage] Invalid login response:', response);
        throw new Error('Đăng nhập thất bại: Thiếu thông tin xác thực');
      }
      
      if (process.env.NODE_ENV === 'development') {
        console.log('[LoginPage] Login successful, role:', role, 'token:', accessToken.substring(0, 20) + '...');
      }
      
      // Create user object for Redux
      const user = userData ? {
        ...userData,
        role,
        email: userData.email || values.email
      } : { role, email: values.email };
      
      // Dispatch credentials to Redux
      dispatch(setCredentials({
        user,
        accessToken,
        refreshToken,
        role,
        rememberMe: values.remember || false,
      }));
      
      // Dispatch event để Header component biết đã đăng nhập và load cart/wishlist
      window.dispatchEvent(new Event('userLoggedIn'));
      
      message.success('Đăng nhập thành công!');
      
      // Redirect based on user role
      const from = searchParams.get('from') || location.state?.from?.pathname;
      
      if (role === 'admin') {
        // Admin always goes to admin dashboard
        navigate('/admin', { replace: true });
      } else if (role === 'seller') {
        // Seller goes to seller dashboard
        navigate('/seller', { replace: true });
      } else if (role === 'user') {
        // User goes to user dashboard or home
        if (from && from !== '/login') {
          navigate(from, { replace: true });
        } else {
          navigate('/user', { replace: true });
        }
      } else {
        // Default redirect to home
        navigate('/', { replace: true });
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Đăng nhập thất bại';
      setError(errorMessage);
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title={t('auth.loginTitle')}
      subtitle={t('auth.loginSubtitle')}
    >
      <Form
        form={form}
        name="login"
        onFinish={onFinish}
        autoComplete="off"
        layout="vertical"
        size="large"
      >
        {error && (
          <Alert
            message={error}
            type="error"
            showIcon
            closable
            onClose={() => setError('')}
            style={{ marginBottom: 20 }}
          />
        )}

        <FormField
          label={t('auth.email')}
          name="email"
          rules={[
            { required: true, message: t('auth.emailRequired') },
            { type: 'email', message: t('auth.emailInvalid') }
          ]}
        >
          <Input
            prefix={<UserOutlined />}
            placeholder={t('auth.emailPlaceholder')}
          />
        </FormField>

        <FormField
          label={t('auth.password')}
          name="password"
          rules={[
            { required: true, message: t('auth.passwordRequired') },
            { min: 6, message: t('auth.passwordMin') }
          ]}
        >
          <PasswordInput
            prefix={<LockOutlined />}
            placeholder={t('auth.passwordPlaceholder')}
          />
        </FormField>

        <div className="form-options">
          <Form.Item name="remember" valuePropName="checked">
            <Checkbox>{t('auth.rememberMe')}</Checkbox>
          </Form.Item>
          <Link to="/forgot-password" className="forgot-password">
            {t('auth.forgotPassword')}
          </Link>
        </div>

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            block
            className="submit-button"
          >
            {t('auth.loginButton')}
          </Button>
        </Form.Item>

        <div className="form-footer">
          <Space>
            <span>{t('auth.noAccount')}</span>
            <Link to="/register" className="link-button">
              {t('auth.registerNow')}
            </Link>
          </Space>
        </div>
      </Form>
    </AuthLayout>
  );
};

export default LoginPage;

