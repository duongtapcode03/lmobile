// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Alert, message } from 'antd';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { LockOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { authService } from '../../../api/authService';
import { FormField, PasswordInput } from '../../../components/Common/Form';
import { AuthLayout } from '../../../shared/layouts';
import './ResetPassword.scss';

const ResetPasswordPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [verifying, setVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const token = searchParams.get('token');

  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setError(t('auth.invalidToken') || 'Token không hợp lệ');
        setVerifying(false);
        return;
      }

      try {
        await authService.verifyResetToken(token);
        setTokenValid(true);
      } catch (err) {
        setError(err.response?.data?.message || err.message || t('auth.tokenExpired') || 'Token không hợp lệ hoặc đã hết hạn');
        setTokenValid(false);
      } finally {
        setVerifying(false);
      }
    };

    verifyToken();
  }, [token, t]);

  const onFinish = async (values) => {
    if (!token) {
      setError(t('auth.invalidToken') || 'Token không hợp lệ');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      await authService.resetPassword(token, values.password);
      message.success(t('auth.resetPasswordSuccess') || 'Đặt lại mật khẩu thành công!');
      navigate('/login');
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || t('auth.resetPasswordFailed') || 'Đặt lại mật khẩu thất bại';
      setError(errorMessage);
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <AuthLayout
        title={t('auth.verifyingToken')}
        subtitle={t('auth.pleaseWait')}
      >
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <p style={{ color: '#666' }}>{t('auth.checkingToken')}</p>
        </div>
      </AuthLayout>
    );
  }

  if (!tokenValid) {
    return (
      <AuthLayout
        title={t('auth.tokenInvalid')}
        subtitle={t('auth.tokenExpiredOrInvalid')}
      >
        <div className="reset-password-error">
          <Alert
            message={error}
            type="error"
            showIcon
            style={{ marginBottom: 24 }}
          />
          <Link to="/forgot-password">
            <Button type="primary" size="large" block>
              {t('auth.requestNewLink')}
            </Button>
          </Link>
          <div className="form-footer">
            <Link to="/login" className="back-to-login">
              {t('auth.backToLogin')}
            </Link>
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title={t('auth.resetPasswordTitle')}
      subtitle={t('auth.resetPasswordSubtitle')}
    >
      <Form
        form={form}
        name="reset-password"
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
          label={t('auth.newPassword')}
          name="password"
          rules={[
            { required: true, message: t('auth.passwordRequired') },
            { min: 6, message: t('auth.passwordMin') }
          ]}
        >
          <PasswordInput
            prefix={<LockOutlined />}
            placeholder={t('auth.newPasswordPlaceholder')}
          />
        </FormField>

        <FormField
          label={t('auth.confirmPassword')}
          name="confirmPassword"
          dependencies={['password']}
          rules={[
            { required: true, message: t('auth.confirmPasswordRequired') },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('password') === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error(t('auth.confirmPasswordNotMatch')));
              },
            }),
          ]}
        >
          <PasswordInput
            prefix={<LockOutlined />}
            placeholder={t('auth.confirmPasswordPlaceholder')}
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
            {t('auth.resetPassword')}
          </Button>
        </Form.Item>

        <div className="form-footer">
          <Link to="/login" className="back-to-login">
            {t('auth.backToLogin')}
          </Link>
        </div>
      </Form>
    </AuthLayout>
  );
};

export default ResetPasswordPage;

