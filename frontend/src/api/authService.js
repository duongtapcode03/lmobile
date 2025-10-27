// @ts-nocheck
import axiosClient from './axiosClient';

export const authService = {
  sendOTP: async (email) => {
    const response = await axiosClient.post('/users/send-otp', { email });
    return response.data;
  },

  verifyOTP: async (email, otp) => {
    const response = await axiosClient.post('/users/verify-otp', { email, otp });
    return response.data;
  },

  resendOTP: async (email) => {
    const response = await axiosClient.post('/users/resend-otp', { email });
    return response.data;
  },

  register: async (data) => {
    const response = await axiosClient.post('/users/register', {
      name: data.fullName,
      email: data.email,
      phone: data.phone,
      password: data.password,
    });
    return response.data;
  },

  login: async (email, password) => {
    const response = await axiosClient.post('/users/login', {
      email,
      password,
    });
    return response.data;
  },

  logout: async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        await axiosClient.post('/users/logout', { refreshToken });
      }
    } catch (error) {
      console.error('Logout API call failed:', error);
      // Continue with local logout even if API call fails
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    }
  },

  getProfile: async () => {
    const response = await axiosClient.get('/users/profile');
    return response.data;
  },

  refreshToken: async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) throw new Error('No refresh token');
    
    const response = await axiosClient.post('/users/refresh-token', {
      refreshToken,
    });
    return response.data;
  },

  forgotPassword: async (email) => {
    const response = await axiosClient.post('/users/forgot-password', { email });
    return response.data;
  },

  resetPassword: async (token, password) => {
    const response = await axiosClient.post('/users/reset-password', { token, password });
    return response.data;
  },

  verifyResetToken: async (token) => {
    const response = await axiosClient.get(`/users/verify-reset-token/${token}`);
    return response.data;
  },
};

