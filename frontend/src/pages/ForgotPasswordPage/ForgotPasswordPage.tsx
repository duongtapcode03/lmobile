// @ts-nocheck
import React, { useState } from 'react';
import { Form, Input, Button, Alert, message } from 'antd';
import { Link } from 'react-router-dom';
import { MailOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { authService } from '../../api/authService';
import { FormField } from '../../components/Common/Form';
import AuthLayout from '../../layouts/AuthLayout';
import './ForgotPasswordPage.scss';

const ForgotPasswordPage = () => {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const onFinish = async (values) => {
    setLoading(true);
    setError('');
    setSuccess(false);
    
    try {
      await authService.forgotPassword(values.email);
      setSuccess(true);
      message.success(t('auth.forgotPasswordSuccess') || 'Email đặt lại mật khẩu đã được gửi!');
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || t('auth.forgotPasswordFailed') || 'Không thể gửi email';
      setError(errorMessage);
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <AuthLayout
        title={t('auth.checkEmailTitle')}
        subtitle={t('auth.checkEmailSubtitle')}
      >
        <div className="forgot-password-success">
          <MailOutlined style={{ fontSize: 64, color: '#1890ff', marginBottom: 24 }} />
          <p style={{ fontSize: 16, color: '#666', marginBottom: 24 }}>
            {t('auth.emailInstructions')}
          </p>
          <Link to="/login">
            <Button type="primary" size="large" block>
              {t('common.login')}
            </Button>
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title={t('auth.forgotPasswordTitle')}
      subtitle={t('auth.forgotPasswordSubtitle')}
    >
      <Form
        form={form}
        name="forgot-password"
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
            prefix={<MailOutlined />}
            placeholder={t('auth.emailPlaceholder')}
          />
        </FormField>

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            block
            className="submit-button"
          >
            {t('auth.sendResetLink')}
          </Button>
        </Form.Item>

        <div className="form-footer">
          <Link to="/login" className="back-to-login">
            <ArrowLeftOutlined /> {t('auth.backToLogin')}
          </Link>
        </div>
      </Form>
    </AuthLayout>
  );
};

export default ForgotPasswordPage;

