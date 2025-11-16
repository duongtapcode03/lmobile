/**
 * Format Utilities
 * Các hàm format dữ liệu: date, price, number, etc.
 */

/**
 * Format price to Vietnamese currency
 */
export const formatPrice = (price: string | number | null | undefined): string => {
  if (!price) return 'Liên hệ';
  if (typeof price === 'number') {
    return new Intl.NumberFormat('vi-VN').format(price) + ' đ';
  }
  return price;
};

/**
 * Format date to Vietnamese format
 */
export const formatDate = (date: string | Date | null | undefined, format: string = 'DD/MM/YYYY'): string => {
  if (!date) return '';
  
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  
  return format
    .replace('DD', day)
    .replace('MM', month)
    .replace('YYYY', year)
    .replace('HH', hours)
    .replace('mm', minutes);
};

/**
 * Format number with thousand separators
 */
export const formatNumber = (num: number | string | null | undefined): string => {
  if (num === null || num === undefined) return '0';
  const n = typeof num === 'string' ? parseFloat(num) : num;
  if (isNaN(n)) return '0';
  return new Intl.NumberFormat('vi-VN').format(n);
};

/**
 * Format phone number
 */
export const formatPhone = (phone: string | null | undefined): string => {
  if (!phone) return '';
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  // Format: 0xxx xxx xxx
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
  }
  return phone;
};

