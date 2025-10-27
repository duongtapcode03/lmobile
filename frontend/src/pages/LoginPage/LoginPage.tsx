// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Checkbox, Alert, Space, message } from 'antd';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { FormField, PasswordInput } from '../../components/Common/Form';
import { setCredentials } from '../../features/auth/authSlice';
import { authService } from '../../api/authService';
import AuthLayout from '../../layouts/AuthLayout';
import './LoginPage.scss';

const LoginPage = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
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
      
      // Dispatch credentials to Redux
      dispatch(setCredentials({
        user: response.user,
        accessToken: response.tokens.accessToken,
        refreshToken: response.tokens.refreshToken,
        rememberMe: values.remember || false,
      }));
      
      message.success('Đăng nhập thành công!');
      
      // Redirect to home
      navigate('/');
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

