/**
 * Category Service API
 * Service để gọi API categories từ React
 * Get methods: Public (axiosClient)
 * Admin methods: Auth required (authApi)
 */

import { axiosClient } from './axiosClient'; // Public APIs
import { authApi } from './authApi'; // Auth APIs (admin only)
import { apiCache } from '../utils/apiCache';
import { requestDeduplication } from '../utils/requestDeduplication';

export interface Category {
  _id: number; // Number ID instead of ObjectId string
  name: string;
  description?: string;
  slug: string;
  image?: string;
  icon?: string;
  isActive: boolean;
  sortOrder?: number;
  parentCategory?: number | Category | null; // Number ID or populated Category
  subCategories?: Category[]; // Danh mục con (populated)
  productCount?: number; // Số lượng sản phẩm
  metaTitle?: string;
  metaDescription?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CategoryListResponse {
  data: Category[];
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
}

const categoryService = {
  /**
   * Lấy tất cả categories với phân trang và lọc
   */
  getCategories: async (query?: {
    page?: number;
    limit?: number;
    search?: string;
    isActive?: boolean;
    parentCategory?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<CategoryListResponse> => {
    const response = await axiosClient.get('/categories', { params: query });
    return {
      data: response.data.data || [],
      total: response.data.pagination?.total || 0,
      page: response.data.pagination?.currentPage || 1,
      limit: response.data.pagination?.itemsPerPage || 10,
      totalPages: response.data.pagination?.totalPages || 1
    };
  },

  /**
   * Lấy tất cả categories đang active (với cache và deduplication)
   */
  getActiveCategories: async (useCache = true): Promise<CategoryListResponse> => {
    const cacheKey = 'categories:active';
    const requestKey = 'api:categories:active';
    
    // Check cache first
    if (useCache) {
      const cached = apiCache.get<CategoryListResponse>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // Use request deduplication to avoid duplicate requests
    return requestDeduplication.deduplicate(requestKey, async () => {
      try {
        const response = await axiosClient.get('/categories/active');
        // getActiveCategories trả về array trực tiếp, không có pagination
        const categories = response.data.data || [];
        const result = {
          data: Array.isArray(categories) ? categories : [],
          total: categories.length,
          page: 1,
          limit: categories.length,
          totalPages: 1
        };
        
        // Cache for 10 minutes (categories ít thay đổi hơn banners)
        apiCache.set(cacheKey, result, 10 * 60 * 1000);
        
        return result;
      } catch (error: any) {
        // If 429 error, try to return cached data if available
        if (error.response?.status === 429) {
          const cached = apiCache.get<CategoryListResponse>(cacheKey);
          if (cached) {
            console.warn('Using cached categories due to rate limit');
            return cached;
          }
        }
        throw error;
      }
    });
  },

  /**
   * Lấy category theo ID (number hoặc string)
   */
  getCategoryById: async (id: number | string): Promise<Category> => {
    const response = await axiosClient.get(`/categories/${id}`);
    return response.data.data;
  },

  /**
   * Lấy category theo slug
   */
  getCategoryBySlug: async (slug: string): Promise<Category> => {
    const response = await axiosClient.get(`/categories/slug/${slug}`);
    return response.data.data;
  },

  /**
   * Lấy parent categories
   */
  getParentCategories: async (): Promise<Category[]> => {
    const response = await axiosClient.get('/categories/parents');
    return response.data.data || [];
  },

  /**
   * Lấy sub categories theo parent ID (number hoặc string)
   */
  getSubCategories: async (parentId: number | string): Promise<Category[]> => {
    const response = await axiosClient.get(`/categories/sub/${parentId}`);
    return response.data.data || [];
  },

  /**
   * Tạo category mới (admin only - cần auth)
   */
  createCategory: async (categoryData: Partial<Category>): Promise<Category> => {
    const response = await authApi.post('/categories', categoryData);
    return response.data.data;
  },

  /**
   * Cập nhật category (admin only - cần auth)
   */
  updateCategory: async (id: number | string, categoryData: Partial<Category>): Promise<Category> => {
    const response = await authApi.put(`/categories/${id}`, categoryData);
    return response.data.data;
  },

  /**
   * Xóa category (admin only - cần auth)
   */
  deleteCategory: async (id: number | string): Promise<void> => {
    await authApi.delete(`/categories/${id}`);
  },

  /**
   * Toggle active status (admin only - cần auth)
   */
  toggleActive: async (id: number | string): Promise<Category> => {
    const response = await authApi.put(`/categories/${id}/toggle`);
    return response.data.data;
  },

  /**
   * Cập nhật sort order (admin only - cần auth)
   */
  updateSortOrder: async (categories: Array<{ id: number | string; sortOrder: number }>): Promise<void> => {
    await authApi.put('/categories/sort-order', { categories });
  }
};

export default categoryService;










