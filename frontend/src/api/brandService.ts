/**
 * Brand Service API
 * Service để gọi API brand từ React
 */

import { axiosClient } from './axiosClient'; // Public APIs (get methods)
import { authApi } from './authApi'; // Auth APIs (admin methods)
import type { Brand, BrandListResponse, BrandStats } from '../types';

const brandService = {
  /**
   * Lấy danh sách brands
   */
  getBrands: async (query?: { isActive?: boolean; search?: string; sortBy?: string; sortOrder?: string }): Promise<BrandListResponse> => {
    const response = await axiosClient.get('/brands', { params: query });
    // Backend returns: { success: true, data: brands[], total: number }
    const result = response.data;
    return {
      data: result?.data || (Array.isArray(result) ? result : []),
      total: result?.total || (Array.isArray(result) ? result.length : 0)
    };
  },

  /**
   * Lấy brand theo ID (number hoặc string)
   */
  getBrandById: async (id: number | string): Promise<Brand> => {
    const response = await axiosClient.get(`/brands/${id}`);
    // Backend returns: { success: true, data: brand }
    return response.data?.data || response.data;
  },

  /**
   * Lấy brand theo slug
   */
  getBrandBySlug: async (slug: string): Promise<Brand> => {
    const response = await axiosClient.get(`/brands/slug/${slug}`);
    return response.data;
  },

  /**
   * Lấy brand statistics
   */
  getBrandStats: async (id: number | string): Promise<BrandStats> => {
    const response = await axiosClient.get(`/brands/${id}/stats`);
    return response.data;
  },

  /**
   * Sync brands từ phone details
   */
  syncFromPhoneDetails: async (): Promise<any> => {
    const response = await axiosClient.get('/brands/sync');
    return response.data;
  },

  /**
   * Tạo brand mới (Admin only - cần auth)
   */
  createBrand: async (data: Partial<Brand>): Promise<Brand> => {
    const response = await authApi.post('/brands', data);
    // Backend returns: { success: true, message: "...", data: brand }
    return response.data?.data || response.data;
  },

  /**
   * Update brand (Admin only - cần auth)
   */
  updateBrand: async (id: number | string, data: Partial<Brand>): Promise<Brand> => {
    const response = await authApi.put(`/brands/${id}`, data);
    // Backend returns: { success: true, message: "...", data: brand }
    return response.data?.data || response.data;
  },

  /**
   * Delete brand (Admin only - cần auth)
   */
  deleteBrand: async (id: number | string): Promise<void> => {
    await authApi.delete(`/brands/${id}`);
  }
};

export default brandService;


