/**
 * Constants
 * Các hằng số dùng chung trong app
 */

// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
export const API_VERSION = import.meta.env.VITE_API_VERSION || 'v1';

// Pagination
export const DEFAULT_PAGE_SIZE = 12;
export const MAX_PAGE_SIZE = 100;

// Roles
export const ROLES = {
  USER: 'user',
  SELLER: 'seller',
  ADMIN: 'admin',
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

// Routes
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  PROFILE: '/profile',
  CART: '/cart',
  WISHLIST: '/wishlist',
  CHECKOUT: '/checkout',
  ORDERS: '/orders',
  PRODUCTS: '/products',
  ADMIN: '/admin',
  SELLER: '/seller',
} as const;

// Local Storage Keys
export const STORAGE_KEYS = {
  AUTH: 'persist:auth',
  LANGUAGE: 'i18nextLng',
  CART: 'cart',
} as const;

// Date Formats
export const DATE_FORMATS = {
  DISPLAY: 'DD/MM/YYYY',
  DISPLAY_WITH_TIME: 'DD/MM/YYYY HH:mm',
  API: 'YYYY-MM-DD',
} as const;

