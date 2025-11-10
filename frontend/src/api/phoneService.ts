/**
 * Phone/Product Service API
 * Service để gọi API products từ React (unified model)
 */

import axiosClient from './axiosClient';
import { PhoneDetail, PhoneListResponse, PhoneFilter, PhoneStats } from '../types';

const phoneService = {
  /**
   * Lấy danh sách products với filter và pagination
   */
  getPhones: async (filter?: PhoneFilter): Promise<PhoneListResponse> => {
    const response = await axiosClient.get('/api/products', { params: filter });
    return response.data;
  },

  /**
   * Lấy chi tiết product theo ID
   */
  getPhoneById: async (id: string): Promise<PhoneDetail> => {
    const response = await axiosClient.get(`/api/products/${id}`);
    return response.data;
  },

  /**
   * Lấy product theo SKU
   */
  getPhoneBySku: async (sku: string): Promise<PhoneDetail> => {
    const response = await axiosClient.get(`/api/products/sku/${sku}`);
    return response.data;
  },

  /**
   * Lấy product theo slug
   */
  getPhoneBySlug: async (slug: string): Promise<PhoneDetail> => {
    const response = await axiosClient.get(`/api/products/slug/${slug}`);
    return response.data;
  },

  /**
   * Tìm kiếm products
   */
  searchPhones: async (query: string, filter?: Omit<PhoneFilter, 'search'>): Promise<PhoneListResponse> => {
    const response = await axiosClient.get('/api/products/search', {
      params: { ...filter, q: query }
    });
    return response.data;
  },

  /**
   * Lấy products theo brand
   */
  getPhonesByBrand: async (brand: string, filter?: Omit<PhoneFilter, 'brand'>): Promise<PhoneListResponse> => {
    const response = await axiosClient.get(`/api/products/brand/${brand}`, {
      params: filter
    });
    return response.data;
  },

  /**
   * Lấy product statistics
   */
  getPhoneStats: async (): Promise<PhoneStats> => {
    const response = await axiosClient.get('/api/products/stats');
    return response.data;
  },

  /**
   * Lấy các brands có sẵn
   */
  getBrands: async (): Promise<string[]> => {
    const response = await axiosClient.get('/api/products/brands');
    return response.data;
  },

  /**
   * Lấy products featured/trending
   */
  getFeaturedPhones: async (limit: number = 10): Promise<PhoneDetail[]> => {
    const response = await axiosClient.get('/api/products/featured', {
      params: { limit }
    });
    return response.data;
  }
};

export default phoneService;

