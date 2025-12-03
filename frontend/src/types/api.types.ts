/**
 * API Response Types
 * Định nghĩa format response thống nhất từ backend
 */

export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
  pagination?: PaginationMeta;
}

export interface PaginationMeta {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}

export interface ApiError {
  success: false;
  error: string;
  message?: string;
  statusCode?: number;
  details?: any;
}

/**
 * Standard API response format
 */
export type StandardApiResponse<T> = ApiResponse<T> | ApiError;














