/**
 * Role Check Utilities
 * Các hàm kiểm tra role nhanh
 */

import { ROLES, type Role } from './constants';

/**
 * Check if user has specific role
 */
export const hasRole = (userRole: Role | null | undefined, requiredRole: Role): boolean => {
  return userRole === requiredRole;
};

/**
 * Check if user is admin
 */
export const isAdmin = (userRole: Role | null | undefined): boolean => {
  return userRole === ROLES.ADMIN;
};

/**
 * Check if user is seller
 */
export const isSeller = (userRole: Role | null | undefined): boolean => {
  return userRole === ROLES.SELLER;
};

/**
 * Check if user is regular user
 */
export const isUser = (userRole: Role | null | undefined): boolean => {
  return userRole === ROLES.USER;
};

/**
 * Check if user has admin or seller role
 */
export const isAdminOrSeller = (userRole: Role | null | undefined): boolean => {
  return userRole === ROLES.ADMIN || userRole === ROLES.SELLER;
};

/**
 * Check if user can access admin routes
 */
export const canAccessAdmin = (userRole: Role | null | undefined): boolean => {
  return userRole === ROLES.ADMIN;
};

/**
 * Check if user can access seller routes
 */
export const canAccessSeller = (userRole: Role | null | undefined): boolean => {
  return userRole === ROLES.SELLER || userRole === ROLES.ADMIN;
};

