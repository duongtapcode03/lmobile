/**
 * Phone/Product Service API
 * Service để gọi API products từ React (unified model)
 */

import { axiosClient } from './axiosClient'; // Public APIs (get methods)
import { authApi } from './authApi'; // Auth APIs (admin methods)
import type { PhoneDetail, PhoneListResponse, PhoneFilter, PhoneStats } from '../types';

const phoneService = {
  /**
   * Lấy danh sách products với filter và pagination
   */
  getPhones: async (filter?: PhoneFilter): Promise<PhoneListResponse> => {
    const response = await axiosClient.get('/products', { params: filter });
    return {
      data: response.data.data || [],
      total: response.data.pagination?.totalItems || response.data.pagination?.total || 0,
      page: response.data.pagination?.currentPage || response.data.pagination?.page || 1,
      limit: response.data.pagination?.itemsPerPage || response.data.pagination?.limit || 10,
      totalPages: response.data.pagination?.totalPages || 1
    };
  },

  /**
   * Lấy chi tiết product theo ID (number hoặc string)
   * Tự động include detail, images, và variants cho product detail page
   */
  getPhoneById: async (id: number | string, includeAll: boolean = true): Promise<PhoneDetail> => {
    const params: any = {};
    if (includeAll) {
      params.includeDetail = 'true';
      params.includeImages = 'true';
      params.includeVariants = 'true';
    }
    const response = await axiosClient.get(`/products/${id}`, { params });
    return response.data.data;
  },

  /**
   * Lấy product theo SKU
   */
  getPhoneBySku: async (sku: string): Promise<PhoneDetail> => {
    const response = await axiosClient.get(`/products/sku/${sku}`);
    return response.data.data;
  },

  /**
   * Lấy product theo slug
   * Tự động include detail, images, và variants cho product detail page
   */
  getPhoneBySlug: async (slug: string, includeAll: boolean = true): Promise<PhoneDetail> => {
    const params: any = {};
    if (includeAll) {
      params.includeDetail = 'true';
      params.includeImages = 'true';
      params.includeVariants = 'true';
    }
    const response = await axiosClient.get(`/products/slug/${slug}`, { params });
    return response.data.data;
  },

  /**
   * Tìm kiếm products
   */
  searchPhones: async (query: string, filter?: Omit<PhoneFilter, 'search'>): Promise<PhoneListResponse> => {
    const response = await axiosClient.get('/products/search', {
      params: { ...filter, q: query }
    });
    return {
      data: response.data.data || [],
      total: response.data.pagination?.total || 0,
      page: response.data.pagination?.page || 1,
      limit: response.data.pagination?.limit || 10,
      totalPages: response.data.pagination?.totalPages || 1
    };
  },

  /**
   * Search nhanh cho dropdown header (tối đa 4 sản phẩm, sort theo bán chạy)
   */
  quickSearchPhones: async (query: string, limit: number = 4): Promise<PhoneDetail[]> => {
    if (!query || query.trim().length < 2) {
      return [];
    }
    const response = await axiosClient.get('/products/search/quick', {
      params: {
        q: query.trim(),
        limit
      }
    });
    return response.data.data || [];
  },

  /**
   * Lấy products theo brand
   */
  getPhonesByBrand: async (brand: string, filter?: Omit<PhoneFilter, 'brand'>): Promise<PhoneListResponse> => {
    const response = await axiosClient.get(`/products/brand/${brand}`, {
      params: filter
    });
    return {
      data: response.data.data || [],
      total: response.data.pagination?.total || 0,
      page: response.data.pagination?.page || 1,
      limit: response.data.pagination?.limit || 10,
      totalPages: response.data.pagination?.totalPages || 1
    };
  },

  /**
   * Lấy product statistics
   */
  getPhoneStats: async (): Promise<PhoneStats> => {
    const response = await axiosClient.get('/products/stats');
    return response.data.data;
  },

  /**
   * Lấy các brands có sẵn
   */
  getBrands: async (): Promise<string[]> => {
    const response = await axiosClient.get('/products/brands');
    return response.data.data || [];
  },

  /**
   * Lấy products featured/trending
   */
  getFeaturedPhones: async (limit: number = 10): Promise<PhoneDetail[]> => {
    const response = await axiosClient.get('/products/featured', {
      params: { limit }
    });
    return response.data.data || [];
  },

  /**
   * Lấy products mới
   */
  getNewPhones: async (limit: number = 10): Promise<PhoneDetail[]> => {
    const response = await axiosClient.get('/products/new', {
      params: { limit }
    });
    return response.data.data || [];
  },

  /**
   * Lấy products bán chạy
   */
  getBestSellerPhones: async (limit: number = 10): Promise<PhoneDetail[]> => {
    const response = await axiosClient.get('/products/bestseller', {
      params: { limit }
    });
    return response.data.data || [];
  },

  /**
   * Lấy sản phẩm tương tự
   */
  getRelatedProducts: async (productId: number | string, limit: number = 8): Promise<PhoneDetail[]> => {
    const response = await axiosClient.get(`/products/${productId}/related`, {
      params: { limit }
    });
    return response.data.data || [];
  },

  /**
   * Lấy products quick sale (API đã bị xóa, sử dụng featured products thay thế)
   */
  getQuickSalePhones: async (limit: number = 10): Promise<PhoneDetail[]> => {
    // API quick-sale không còn tồn tại, sử dụng featured products thay thế
    return await phoneService.getFeaturedPhones(limit);
  },

  /**
   * Lấy danh sách products theo categoryId với filter và pagination
   */
  getPhonesByCategory: async (
    categoryId: number | string,
    filter?: Omit<PhoneFilter, 'category'>
  ): Promise<PhoneListResponse> => {
    const response = await axiosClient.get(`/products/category/${categoryId}`, {
      params: filter
    });
    return {
      data: response.data.data || [],
      total: response.data.pagination?.total || 0,
      page: response.data.pagination?.currentPage || 1,
      limit: response.data.pagination?.itemsPerPage || 10,
      totalPages: response.data.pagination?.totalPages || 1
    };
  },

  /**
   * Lấy danh sách products chỉ filter theo categoryRefs (đơn giản, không có filter khác)
   * Hỗ trợ một hoặc nhiều category IDs (phân cách bằng dấu phẩy, hoặc array)
   */
  /**
   * Lấy danh sách products theo categoryId (API mới cho CategorySidebar)
   */
  getPhonesByCategoryId: async (
    categoryId: number | string,
    filter?: Omit<PhoneFilter, 'category'>
  ): Promise<PhoneListResponse> => {
    const response = await axiosClient.get(`/products/by-category-id/${categoryId}`, { params: filter });
    return {
      data: response.data.data || [],
      total: response.data.pagination?.totalItems || 0,
      page: response.data.pagination?.currentPage || 1,
      limit: response.data.pagination?.itemsPerPage || 12,
      totalPages: response.data.pagination?.totalPages || 1
    };
  },

  /**
   * Lấy sản phẩm theo loại (featured, new, bestSeller) với pagination (API mới)
   */
  getPhonesByType: async (
    type: 'featured' | 'new' | 'bestSeller',
    filter?: Omit<PhoneFilter, 'type'>
  ): Promise<PhoneListResponse> => {
    const response = await axiosClient.get(`/products/by-type/${type}`, { params: filter });
    return {
      data: response.data.data || [],
      total: response.data.pagination?.totalItems || response.data.pagination?.total || 0,
      page: response.data.pagination?.currentPage || response.data.pagination?.page || 1,
      limit: response.data.pagination?.itemsPerPage || response.data.pagination?.limit || 10,
      totalPages: response.data.pagination?.totalPages || 1
    };
  },

  getPhonesByCategoryRefs: async (
    categoryRefs: number | string | (number | string)[],
    options?: {
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    }
  ): Promise<PhoneListResponse> => {
    // Convert to comma-separated string if needed
    let categoryRefsStr: string;
    if (Array.isArray(categoryRefs)) {
      categoryRefsStr = categoryRefs.map(id => String(id)).join(',');
    } else {
      categoryRefsStr = String(categoryRefs);
    }
    
    const response = await axiosClient.get('/products/by-category', {
      params: {
        categoryRefs: categoryRefsStr,
        ...options
      }
    });
    return {
      data: response.data.data || [],
      total: response.data.pagination?.totalItems || 0,
      page: response.data.pagination?.currentPage || 1,
      limit: response.data.pagination?.itemsPerPage || 10,
      totalPages: response.data.pagination?.totalPages || 1
    };
  },

  /**
   * Tạo sản phẩm mới (Admin/Seller only)
   */
  createProduct: async (productData: Partial<PhoneDetail>): Promise<PhoneDetail> => {
    const response = await authApi.post('/products', productData);
    return response.data.data || response.data;
  },

  /**
   * Cập nhật sản phẩm (Admin/Seller only)
   */
  updateProduct: async (id: number | string, productData: Partial<PhoneDetail>): Promise<PhoneDetail> => {
    const response = await authApi.put(`/products/${id}`, productData);
    return response.data.data || response.data;
  },

  /**
   * Xóa sản phẩm (Admin/Seller only)
   */
  deleteProduct: async (id: number | string): Promise<void> => {
    await authApi.delete(`/products/${id}`);
  }
};

export default phoneService;

