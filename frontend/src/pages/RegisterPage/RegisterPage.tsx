// @ts-nocheck
import React, { useState } from 'react';
import { Form, Input, Button, Alert, message } from 'antd';
import { Link, useNavigate } from 'react-router-dom';
import { UserOutlined, LockOutlined, PhoneOutlined, MailOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';
import { setCredentials } from '../../features/auth/authSlice';
import { authService } from '../../api/authService';
import { FormField, PasswordInput } from '../../components/Common/Form';
import OTPInput from '../../components/OTPInput';
import AuthLayout from '../../layouts/AuthLayout';
import './RegisterPage.scss';

const RegisterPage = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState('form'); // 'form' or 'otp'
  const [formData, setFormData] = useState(null);
  const [otp, setOtp] = useState('');
  const [countdown, setCountdown] = useState(0);

  // Step 1: Submit form and send OTP
  const onFinish = async (values) => {
    setLoading(true);
    setError('');
    
    try {
      setFormData(values);
      await authService.sendOTP(values.email);
      setStep('otp');
      setCountdown(60);
      
      // Start countdown
      const interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      message.success(t('auth.otpSent') || 'Mã OTP đã được gửi đến email của bạn!');
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Không thể gửi OTP';
      setError(errorMessage);
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP and complete registration
  const handleVerifyOTP = async () => {
    if (otp.length !== 6) {
      setError(t('auth.otpInvalid') || 'Mã OTP phải có 6 chữ số');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      // Verify OTP
      await authService.verifyOTP(formData.email, otp);
      
      // Register user
      const response = await authService.register(formData);
      
      // Store credentials
      dispatch(setCredentials({
        user: response.user,
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
      }));
      
      message.success(t('auth.registerSuccess') || 'Đăng ký thành công!');
      // Navigate to login page with email pre-filled
      navigate(`/login?email=${encodeURIComponent(formData.email)}`);
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || t('auth.verifyOTPFailed') || 'Xác thực thất bại';
      setError(errorMessage);
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (countdown > 0) return;
    
    setLoading(true);
    setError('');
    
    try {
      await authService.resendOTP(formData.email);
      setCountdown(60);
      
      const interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      message.success(t('auth.otpSent') || 'Mã OTP đã được gửi lại!');
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Không thể gửi lại OTP';
      setError(errorMessage);
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title={step === 'otp' ? t('auth.verifyOTPTitle') : t('auth.registerTitle')}
      subtitle={step === 'otp' ? t('auth.verifyOTPSubtitle') : t('auth.registerSubtitle')}
    >
      {step === 'otp' ? (
        // OTP Verification Step
        <div className="otp-verification">
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

          <div className="otp-info">
            <MailOutlined style={{ fontSize: 48, color: '#1890ff', marginBottom: 16 }} />
            <p style={{ fontSize: 16, color: '#666', marginBottom: 8 }}>
              {t('auth.otpSentTo')} <strong>{formData?.email}</strong>
            </p>
            <p style={{ fontSize: 14, color: '#999' }}>
              {t('auth.enterOTPBelow')}
            </p>
          </div>

          <OTPInput value={otp} onChange={setOtp} length={6} />

          <div className="resend-otp">
            {countdown > 0 ? (
              <span style={{ color: '#999' }}>
                {t('auth.resendOTPIn')} {countdown}s
              </span>
            ) : (
              <Button type="link" onClick={handleResendOTP} loading={loading}>
                {t('auth.resendOTP')}
              </Button>
            )}
          </div>

          <Button
            type="primary"
            block
            size="large"
            onClick={handleVerifyOTP}
            loading={loading}
            disabled={otp.length !== 6}
            className="verify-button"
          >
            {t('auth.verifyOTP')}
          </Button>
        </div>
      ) : (
        // Registration Form Step
      <Form
        form={form}
        name="register"
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
          label={t('auth.fullName')}
          name="fullName"
          rules={[{ required: true, message: t('auth.fullNameRequired') }]}
        >
          <Input
            prefix={<UserOutlined />}
            placeholder={t('auth.fullNamePlaceholder')}
          />
        </FormField>

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
          label={t('auth.phone')}
          name="phone"
          rules={[
            { required: true, message: t('auth.phoneRequired') },
            { pattern: /^[0-9]{10,11}$/, message: t('auth.phoneInvalid') }
          ]}
        >
          <Input
            prefix={<PhoneOutlined />}
            placeholder={t('auth.phonePlaceholder')}
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
            {t('auth.registerButton')}
          </Button>
        </Form.Item>

        <div className="form-footer">
          <span>
            {t('auth.haveAccount')}{' '}
            <Link to="/login" className="link-button">
              {t('auth.loginNow')}
            </Link>
          </span>
        </div>
      </Form>
      )}
    </AuthLayout>
  );
};

export default RegisterPage;

