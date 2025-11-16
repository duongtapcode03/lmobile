/**
 * Price Formatter Utilities
 * Tách logic format price ra khỏi component
 */

/**
 * Format price number to Vietnamese currency string
 */
export const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('vi-VN').format(price) + ' ₫';
};

/**
 * Format price input string (add thousand separators)
 */
export const formatPriceInput = (value: string): string => {
  return value.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

/**
 * Parse price string to number (remove formatting)
 */
export const parsePrice = (value: string): number => {
  return parseInt(value.replace(/\D/g, '')) || 0;
};






