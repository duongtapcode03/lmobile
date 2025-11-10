/**
 * Brand Service API
 * Service để gọi API brand từ React
 */

import axiosClient from './axiosClient';
import { Brand, BrandListResponse, BrandStats } from '../types';

const brandService = {
  /**
   * Lấy danh sách brands
   */
  getBrands: async (query?: { isActive?: boolean; search?: string }): Promise<BrandListResponse> => {
    const response = await axiosClient.get('/api/brands', { params: query });
    return response.data;
  },

  /**
   * Lấy brand theo ID
   */
  getBrandById: async (id: string): Promise<Brand> => {
    const response = await axiosClient.get(`/api/brands/${id}`);
    return response.data;
  },

  /**
   * Lấy brand theo slug
   */
  getBrandBySlug: async (slug: string): Promise<Brand> => {
    const response = await axiosClient.get(`/api/brands/slug/${slug}`);
    return response.data;
  },

  /**
   * Lấy brand statistics
   */
  getBrandStats: async (id: string): Promise<BrandStats> => {
    const response = await axiosClient.get(`/api/brands/${id}/stats`);
    return response.data;
  },

  /**
   * Sync brands từ phone details
   */
  syncFromPhoneDetails: async (): Promise<any> => {
    const response = await axiosClient.get('/api/brands/sync');
    return response.data;
  },

  /**
   * Tạo brand mới (Admin only)
   */
  createBrand: async (data: Partial<Brand>): Promise<Brand> => {
    const response = await axiosClient.post('/api/brands', data);
    return response.data;
  },

  /**
   * Update brand (Admin only)
   */
  updateBrand: async (id: string, data: Partial<Brand>): Promise<Brand> => {
    const response = await axiosClient.put(`/api/brands/${id}`, data);
    return response.data;
  },

  /**
   * Delete brand (Admin only)
   */
  deleteBrand: async (id: string): Promise<void> => {
    await axiosClient.delete(`/api/brands/${id}`);
  }
};

export default brandService;


