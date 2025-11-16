/**
 * Auth Service API
 * Tách riêng Public APIs (không cần auth) và Auth APIs (cần auth)
 */

import { axiosClient } from './axiosClient'; // Public API - không cần auth
import { authApi } from './authApi'; // Auth API - cần auth

// ========== PUBLIC APIs (Không cần đăng nhập) ==========

export const publicAuthAPI = {
  // OTP APIs
  sendOTP: async (email: string) => {
    const response = await axiosClient.post('/users/send-otp', { email });
    return response.data;
  },

  verifyOTP: async (email: string, otp: string) => {
    const response = await axiosClient.post('/users/verify-otp', { email, otp });
    return response.data;
  },

  resendOTP: async (email: string) => {
    const response = await axiosClient.post('/users/resend-otp', { email });
    return response.data;
  },

  // Register & Login
  register: async (data: { fullName: string; email: string; phone: string; password: string }) => {
    const response = await axiosClient.post('/users/register', {
      name: data.fullName,
      email: data.email,
      phone: data.phone,
      password: data.password,
    });
    return response.data;
  },

  login: async (email: string, password: string) => {
    const response = await axiosClient.post('/users/login', {
      email,
      password,
    });
    return response.data;
  },

  // Password Reset (Public)
  forgotPassword: async (email: string) => {
    const response = await axiosClient.post('/users/forgot-password', { email });
    return response.data;
  },

  resetPassword: async (token: string, password: string) => {
    const response = await axiosClient.post('/users/reset-password', { token, password });
    return response.data;
  },

  verifyResetToken: async (token: string) => {
    const response = await axiosClient.get(`/users/verify-reset-token/${token}`);
    return response.data;
  },
};

// ========== AUTH APIs (Cần đăng nhập) ==========

export const authAPI = {
  logout: async () => {
    try {
      // Get refreshToken from persist:auth
      const persistAuth = localStorage.getItem('persist:auth');
      if (persistAuth) {
        const parsed = JSON.parse(persistAuth);
        let refreshToken = parsed.refreshToken;
        if (refreshToken && typeof refreshToken === 'string') {
          if (refreshToken.startsWith('"') && refreshToken.endsWith('"')) {
            refreshToken = JSON.parse(refreshToken);
          }
          if (refreshToken && refreshToken !== 'null' && refreshToken !== 'undefined') {
            await authApi.post('/users/logout', { refreshToken });
          }
        }
      }
    } catch (error) {
      console.error('Logout API call failed:', error);
      // Continue with local logout even if API call fails
    }
    // Note: Redux logout action will clear persist:auth automatically
  },

  getProfile: async () => {
    const response = await authApi.get('/users/profile');
    return response.data;
  },

  updateProfile: async (data: any) => {
    const response = await authApi.put('/users/profile', data);
    return response.data;
  },

  changePassword: async (currentPassword: string, newPassword: string) => {
    const response = await authApi.put('/users/change-password', {
      currentPassword,
      newPassword
    });
    return response.data;
  },
};

// ========== Backward Compatibility ==========
// Giữ lại authService để không break code cũ
export const authService = {
  // Public APIs
  ...publicAuthAPI,
  
  // Auth APIs
  ...authAPI,
  
  // refreshToken được xử lý tự động bởi authApi interceptor
  refreshToken: async () => {
    throw new Error('refreshToken is handled automatically by authApi interceptor');
  },
};

export default authService;

