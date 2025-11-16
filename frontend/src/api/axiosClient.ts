/**
 * Public API Client (No Authentication Required)
 * Sử dụng cho các API công khai không cần đăng nhập
 */

import axios, { AxiosError } from 'axios';
import type { AxiosResponse } from 'axios';
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
 * Public API Client - Không có authentication
 * Sử dụng cho: banners, categories, products, blogs, brands, login, register, etc.
 */
export const axiosClient = axios.create({
  baseURL: getBaseURL(),
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Response interceptor for public API
axiosClient.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>) => {
    if (import.meta.env.DEV) {
      console.log(`[Public API] ${response.config.method?.toUpperCase()} ${response.config.url}`, {
        status: response.status,
      });
    }
    return response;
  },
  (error: AxiosError<ApiResponse>) => {
    if (import.meta.env.DEV) {
      console.error('[Public API Error]', {
        url: error.config?.url,
        method: error.config?.method,
        status: error.response?.status,
        message: error.message,
      });
    }

    // Handle errors
    if (error.response) {
      const errorData = error.response.data as any;
      const errorMessage = errorData?.message || errorData?.error || error.message;
      
      // Log validation errors in detail
      if (errorData?.errors && Array.isArray(errorData.errors)) {
        console.error('[Public API Validation Errors]', errorData.errors);
        const validationMessages = errorData.errors.map((err: any) => 
          `${err.path || err.param}: ${err.msg || err.message}`
        ).join(', ');
        console.error('[Public API Error Response]', `Validation error: ${validationMessages}`);
      } else {
        console.error('[Public API Error Response]', errorMessage);
      }
      
      // Log full error response in dev mode
      if (import.meta.env.DEV) {
        console.error('[Public API Full Error Response]', errorData);
      }
    } else if (error.request) {
      console.error('[Public API Network Error]', 'No response from server');
    } else {
      console.error('[Public API Error]', error.message);
    }

    return Promise.reject(error);
  }
);

export default axiosClient;
