/**
 * Service Helpers
 * Logic chung gọi API, formatDate, constant, validate
 */

import { formatPrice, formatDate, formatNumber, formatPhone } from '../utils/format';
import { ROLES, ROUTES, STORAGE_KEYS, DATE_FORMATS } from '../utils/constants';
import { hasRole, isAdmin, isSeller, isUser, isAdminOrSeller } from '../utils/roleCheck';

// Re-export format functions
export { formatPrice, formatDate, formatNumber, formatPhone };

// Re-export constants
export { ROLES, ROUTES, STORAGE_KEYS, DATE_FORMATS };

// Re-export role check functions
export { hasRole, isAdmin, isSeller, isUser, isAdminOrSeller };

/**
 * Validate email format
 */
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate phone number (Vietnamese format)
 */
export const validatePhone = (phone: string): boolean => {
  const phoneRegex = /^(0|\+84)[3|5|7|8|9][0-9]{8}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
};

/**
 * Validate password strength
 */
export const validatePassword = (password: string): { valid: boolean; message?: string } => {
  if (password.length < 6) {
    return { valid: false, message: 'Mật khẩu phải có ít nhất 6 ký tự' };
  }
  if (password.length > 50) {
    return { valid: false, message: 'Mật khẩu không được vượt quá 50 ký tự' };
  }
  return { valid: true };
};

/**
 * Get error message from API error
 */
export const getErrorMessage = (error: any): string => {
  if (error?.response?.data?.message) {
    return error.response.data.message;
  }
  if (error?.response?.data?.error) {
    return error.response.data.error;
  }
  if (error?.message) {
    return error.message;
  }
  return 'Có lỗi xảy ra, vui lòng thử lại sau';
};

/**
 * Debounce function
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

