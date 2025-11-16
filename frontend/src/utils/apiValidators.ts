/**
 * API Input Validators
 * Validate dữ liệu đầu vào trước khi gọi API để tránh lỗi server
 */

/**
 * Validate pagination parameters
 */
export const validatePagination = (page?: number, limit?: number): void => {
  if (page !== undefined && (page < 1 || !Number.isInteger(page))) {
    throw new Error('Page must be a positive integer');
  }
  if (limit !== undefined && (limit < 1 || limit > 100 || !Number.isInteger(limit))) {
    throw new Error('Limit must be between 1 and 100');
  }
};

/**
 * Validate ID parameter
 */
export const validateId = (id: string | undefined): void => {
  if (!id || typeof id !== 'string' || id.trim().length === 0) {
    throw new Error('ID is required and must be a non-empty string');
  }
};

/**
 * Validate slug parameter
 */
export const validateSlug = (slug: string | undefined): void => {
  if (!slug || typeof slug !== 'string' || slug.trim().length === 0) {
    throw new Error('Slug is required and must be a non-empty string');
  }
  // Slug should only contain lowercase letters, numbers, and hyphens
  if (!/^[a-z0-9-]+$/.test(slug)) {
    throw new Error('Slug must contain only lowercase letters, numbers, and hyphens');
  }
};

/**
 * Validate email
 */
export const validateEmail = (email: string | undefined): void => {
  if (!email || typeof email !== 'string') {
    throw new Error('Email is required');
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new Error('Invalid email format');
  }
};

/**
 * Validate price range
 */
export const validatePriceRange = (minPrice?: number, maxPrice?: number): void => {
  if (minPrice !== undefined && (minPrice < 0 || !Number.isFinite(minPrice))) {
    throw new Error('Min price must be a non-negative number');
  }
  if (maxPrice !== undefined && (maxPrice < 0 || !Number.isFinite(maxPrice))) {
    throw new Error('Max price must be a non-negative number');
  }
  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
    throw new Error('Min price must be less than or equal to max price');
  }
};

/**
 * Validate search query
 */
export const validateSearchQuery = (query: string | undefined): void => {
  if (query !== undefined && typeof query !== 'string') {
    throw new Error('Search query must be a string');
  }
  if (query && query.length > 200) {
    throw new Error('Search query must be less than 200 characters');
  }
};








