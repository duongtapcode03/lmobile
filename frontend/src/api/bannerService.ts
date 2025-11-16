import { axiosClient } from './axiosClient'; // Public APIs
import { authApi } from './authApi'; // Auth APIs (admin only)
import { apiCache } from '../utils/apiCache';
import { requestDeduplication } from '../utils/requestDeduplication';
import { validatePagination, validateId } from '../utils/apiValidators';
import type { Banner } from '../components/BannerCarousel';

export interface BannerListResponse {
  data: Banner[];
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
}

const bannerService = {
  // Lấy tất cả banners với phân trang và lọc
  getBanners: async (query?: {
    page?: number;
    limit?: number;
    search?: string;
    isActive?: boolean;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<BannerListResponse> => {
    // Validate input
    if (query) {
      validatePagination(query.page, query.limit);
    }

    const response = await axiosClient.get('/banners', { params: query });
    return {
      data: response.data.data || [],
      total: response.data.pagination?.total || 0,
      page: response.data.pagination?.currentPage || 1,
      limit: response.data.pagination?.itemsPerPage || 10,
      totalPages: response.data.pagination?.totalPages || 1
    };
  },

  // Lấy tất cả banners đang active (với cache và deduplication)
  getActiveBanners: async (useCache = true): Promise<Banner[]> => {
    const cacheKey = 'banners:active';
    const requestKey = 'api:banners:active';
    
    // Check cache first
    if (useCache) {
      const cached = apiCache.get<Banner[]>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // Use request deduplication to avoid duplicate requests
    return requestDeduplication.deduplicate(requestKey, async () => {
      try {
        const response = await axiosClient.get('/banners/active');
        const data = response.data.data || [];
        
        // Cache for 5 minutes
        apiCache.set(cacheKey, data, 5 * 60 * 1000);
        
        return data;
      } catch (error: any) {
        // If 429 error, try to return cached data if available
        if (error.response?.status === 429) {
          const cached = apiCache.get<Banner[]>(cacheKey);
          if (cached) {
            console.warn('Using cached banners due to rate limit');
            return cached;
          }
        }
        throw error;
      }
    });
  },

  // Lấy banner theo ID
  getBannerById: async (id: string): Promise<Banner> => {
    validateId(id);
    const response = await axiosClient.get(`/banners/${id}`);
    return response.data.data;
  },

  // Tạo banner mới (admin only - cần auth)
  createBanner: async (bannerData: Partial<Banner>): Promise<Banner> => {
    const response = await authApi.post('/banners', bannerData);
    return response.data.data;
  },

  // Cập nhật banner (admin only - cần auth)
  updateBanner: async (id: string, bannerData: Partial<Banner>): Promise<Banner> => {
    const response = await authApi.put(`/banners/${id}`, bannerData);
    return response.data.data;
  },

  // Xóa banner (admin only - cần auth)
  deleteBanner: async (id: string): Promise<void> => {
    await authApi.delete(`/banners/${id}`);
  },

  // Toggle active status (admin only - cần auth)
  toggleActive: async (id: string): Promise<Banner> => {
    const response = await authApi.put(`/banners/${id}/toggle`);
    return response.data.data;
  },

  // Cập nhật sort order (admin only - cần auth)
  updateSortOrder: async (banners: Array<{ id: string; sortOrder: number }>): Promise<void> => {
    await authApi.put('/banners/sort-order', { banners });
  }
};

export default bannerService;


