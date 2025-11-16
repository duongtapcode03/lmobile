/**
 * Authenticated API Client (Authentication Required)
 * Sử dụng cho các API cần đăng nhập: wishlist, cart, orders, profile, etc.
 */

import axios, { AxiosError } from 'axios';
import type { AxiosRequestConfig, AxiosResponse } from 'axios';
import type { ApiResponse } from '../types/api.types';

/**
 * API Version Configuration
 */
const API_VERSION = import.meta.env.VITE_API_VERSION || 'v1';

/**
 * Get base URL with versioning
 */
const getBaseURL = (): string => {
  const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  
  if (baseURL.includes('/api')) {
    const cleanBaseURL = baseURL.replace(/\/$/, '');
    if (cleanBaseURL.match(/\/v\d+$/)) {
      return cleanBaseURL;
    }
    return `${cleanBaseURL}/${API_VERSION}`;
  }
  
  const cleanBaseURL = baseURL.replace(/\/$/, '');
  return `${cleanBaseURL}/api/${API_VERSION}`;
};

/**
 * Helper function to get token from Redux Persist
 */
const getToken = (): string | null => {
  try {
    const persistAuth = localStorage.getItem('persist:auth');
    if (persistAuth) {
      const parsed = JSON.parse(persistAuth);
      let token = parsed.token;
      if (token && typeof token === 'string') {
        if (token.startsWith('"') && token.endsWith('"')) {
          token = JSON.parse(token);
        }
        if (token && token !== 'null' && token !== 'undefined') {
          return token;
        }
      }
    }
  } catch (e) {
    if (import.meta.env.DEV) {
      console.debug('[authApi] Error parsing persist:auth:', e);
    }
  }
  return null;
};

/**
 * Helper function to get refreshToken from Redux Persist
 */
const getRefreshToken = (): string | null => {
  try {
    const persistAuth = localStorage.getItem('persist:auth');
    if (persistAuth) {
      const parsed = JSON.parse(persistAuth);
      let refreshToken = parsed.refreshToken;
      if (refreshToken && typeof refreshToken === 'string') {
        if (refreshToken.startsWith('"') && refreshToken.endsWith('"')) {
          refreshToken = JSON.parse(refreshToken);
        }
        if (refreshToken && refreshToken !== 'null' && refreshToken !== 'undefined') {
          return refreshToken;
        }
      }
    }
  } catch (e) {
    if (import.meta.env.DEV) {
      console.debug('[authApi] Error parsing refreshToken:', e);
    }
  }
  return null;
};

/**
 * Authenticated API Client - Có authentication
 * Tự động thêm Bearer token vào header
 */
export const authApi = axios.create({
  baseURL: getBaseURL(),
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Request interceptor - Kiểm tra token trước khi gọi API
authApi.interceptors.request.use(
  (config) => {
    const token = getToken();
    
    if (!token) {
      // Cancel request nếu không có token
      if (import.meta.env.DEV) {
        console.warn('[authApi] No token found, canceling request:', config.url);
      }
      // Use AbortController to cancel request
      const controller = new AbortController();
      config.signal = controller.signal;
      controller.abort();
      // Reject với AbortError
      const error = new Error('No token, cancel request');
      error.name = 'AbortError';
      return Promise.reject(error);
    }
    
    // Thêm Bearer token vào header
    config.headers.Authorization = `Bearer ${token}`;
    
    if (import.meta.env.DEV) {
      console.log(`[Auth API Request] ${config.method?.toUpperCase()} ${config.url}`);
    }
    
    return config;
  },
  (error) => {
    console.error('[Auth API Request Error]', error);
    return Promise.reject(error);
  }
);

// Response interceptor - Xử lý 401 toàn cục
authApi.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>) => {
    if (import.meta.env.DEV) {
      console.log(`[Auth API Response] ${response.config.method?.toUpperCase()} ${response.config.url}`, {
        status: response.status,
      });
    }
    return response;
  },
  async (error: AxiosError<ApiResponse>) => {
    const originalRequest = error.config as (AxiosRequestConfig & {
      _retry?: boolean;
    }) | undefined;

    // Log error
    if (import.meta.env.DEV) {
      console.error('[Auth API Error]', {
        url: error.config?.url,
        method: error.config?.method,
        status: error.response?.status,
        message: error.message,
      });
    }

    // Handle 401 (Unauthorized) - Token expired or invalid
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      const url = originalRequest.url || 'unknown';
      
      // Don't retry refresh token endpoint to avoid infinite loop
      if (url.includes('/refresh-token') || url.includes('/login')) {
        await handleLogout();
        return Promise.reject(error);
      }

      originalRequest._retry = true;

      try {
        // Try to refresh token
        const refreshToken = getRefreshToken();
        if (refreshToken) {
          const refreshResponse = await axios.post(`${getBaseURL()}/users/refresh-token`, {
            refreshToken,
          }, {
            headers: {
              'Content-Type': 'application/json',
            }
          });

          // Backend trả về: { success, message, data: { tokens: { accessToken }, user } }
          // Hoặc format cũ: { success, message, data: { accessToken, user } }
          const newAccessToken = refreshResponse.data?.data?.tokens?.accessToken 
            || refreshResponse.data?.data?.accessToken;
            
          if (newAccessToken) {
            
            // Update persist:auth with new token
            try {
              const persistAuth = localStorage.getItem('persist:auth');
              if (persistAuth) {
                const parsed = JSON.parse(persistAuth);
                parsed.token = JSON.stringify(newAccessToken);
                localStorage.setItem('persist:auth', JSON.stringify(parsed));
              }
            } catch (e) {
              console.warn('[authApi] Failed to update persist:auth with new token:', e);
            }
            
            // Update authorization header and retry original request
            originalRequest.headers = originalRequest.headers || {};
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            
            return authApi(originalRequest);
          }
        }
      } catch (refreshError) {
        // Refresh failed, logout user
        console.warn('[authApi] Token refresh failed');
        await handleLogout();
        return Promise.reject(refreshError);
      }
    }

    // Handle other errors
    if (error.response) {
      const errorMessage = error.response.data?.message || error.response.data?.error || error.message;
      console.error('[Auth API Error Response]', errorMessage);
    } else if (error.request) {
      console.error('[Auth API Network Error]', 'No response from server');
    } else {
      console.error('[Auth API Error]', error.message);
    }

    return Promise.reject(error);
  }
);

/**
 * Handle logout when token is invalid or expired
 */
const handleLogout = async () => {
  try {
    // Purge Redux Persist - lazy load to avoid circular dependency
    try {
      const { persistor } = await import('../store');
      await persistor.purge();
    } catch (e) {
      // If persistor not available, just remove from localStorage
      console.debug('[authApi] Could not purge persistor:', e);
    }
    // Fallback: manually remove persist:auth
    localStorage.removeItem('persist:auth');
    
    // Redirect to login
    const currentPath = window.location.pathname;
    if (currentPath !== '/login') {
      window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}`;
    }
  } catch (error) {
    console.error('[authApi] Error during logout:', error);
    // Fallback: manually remove and redirect
    localStorage.removeItem('persist:auth');
    window.location.href = '/login';
  }
};

export default authApi;

