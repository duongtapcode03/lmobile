/**
 * Blog Service API
 * Service để gọi API blog từ React
 */

import { axiosClient } from './axiosClient'; // Public APIs
import { authApi } from './authApi'; // Auth APIs (admin/seller methods)
import type { Blog, BlogListResponse, BlogFilter, BlogStats } from '../types';

const blogService = {
  /**
   * Lấy danh sách blog (API mới cho trang tin tức)
   */
  getBlogList: async (filter?: Omit<BlogFilter, 'status'>): Promise<BlogListResponse> => {
    const response = await axiosClient.get('/blogs/list', { params: filter });
    const blogs = response.data?.data || [];
    const pagination = response.data?.pagination || {};
    return {
      data: Array.isArray(blogs) ? blogs : [],
      total: pagination.totalItems || 0,
      page: pagination.currentPage || 1,
      limit: pagination.itemsPerPage || 12,
      totalPages: pagination.totalPages || 1
    };
  },

  /**
   * Lấy danh sách blog với filter và pagination
   * Có thể dùng public API hoặc auth API (nếu cần filter status draft/archived)
   */
  getBlogs: async (filter?: BlogFilter, useAuth = false): Promise<BlogListResponse> => {
    const api = useAuth ? authApi : axiosClient;
    const response = await api.get('/blogs', { params: filter });
    // Backend returns: { success: true, data: blogs[], pagination: {...} }
    const blogs = response.data?.data || [];
    const pagination = response.data?.pagination || {};
    return {
      data: Array.isArray(blogs) ? blogs : [],
      total: pagination.totalItems || 0,
      page: pagination.currentPage || 1,
      limit: pagination.itemsPerPage || 10,
      totalPages: pagination.totalPages || 1
    };
  },

  /**
   * Lấy chi tiết blog theo ID
   */
  getBlogById: async (id: string): Promise<Blog> => {
    const response = await axiosClient.get(`/blogs/${id}`);
    return response.data.data;
  },

  /**
   * Lấy blog theo slug
   */
  getBlogBySlug: async (slug: string): Promise<Blog> => {
    const response = await axiosClient.get(`/blogs/slug/${slug}`);
    return response.data.data;
  },

  /**
   * Tìm kiếm blog
   */
  searchBlogs: async (query: string, filter?: Omit<BlogFilter, 'search'>): Promise<BlogListResponse> => {
    const response = await axiosClient.get('/blogs/search', {
      params: { ...filter, q: query }
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
   * Lấy blog theo category
   */
  getBlogsByCategory: async (
    category: string, 
    filter?: Omit<BlogFilter, 'category'>
  ): Promise<BlogListResponse> => {
    const response = await axiosClient.get(`/blogs/category/${category}`, {
      params: filter
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
   * Lấy blog statistics
   */
  getBlogStats: async (): Promise<BlogStats> => {
    const response = await axiosClient.get('/blogs/stats/overview');
    return response.data.data;
  },

  /**
   * Lấy các categories có sẵn
   */
  getCategories: async (): Promise<string[]> => {
    const response = await axiosClient.get('/blogs/categories');
    return response.data.data || [];
  },

  /**
   * Lấy blog featured/pinned
   */
  getFeaturedBlogs: async (limit: number = 10): Promise<Blog[]> => {
    const response = await axiosClient.get('/blogs/featured', {
      params: { limit }
    });
    return response.data.data || [];
  },

  /**
   * Increment view count
   */
  incrementViewCount: async (id: string): Promise<void> => {
    await axiosClient.post(`/blogs/${id}/view`);
  },

  /**
   * Like blog
   */
  likeBlog: async (id: string): Promise<Blog> => {
    const response = await axiosClient.post(`/blogs/${id}/like`);
    return response.data.data;
  },

  // Admin/Seller methods (cần auth)
  /**
   * Tạo blog mới (Admin/Seller only - cần auth)
   */
  createBlog: async (data: Partial<Blog>): Promise<Blog> => {
    const response = await authApi.post('/blogs', data);
    // Backend returns: { success: true, message: "...", data: blog }
    return response.data?.data || response.data;
  },

  /**
   * Update blog (Admin/Seller only - cần auth)
   */
  updateBlog: async (id: string, data: Partial<Blog>): Promise<Blog> => {
    const response = await authApi.put(`/blogs/${id}`, data);
    // Backend returns: { success: true, message: "...", data: blog }
    return response.data?.data || response.data;
  },

  /**
   * Delete blog (Admin/Seller only - cần auth)
   */
  deleteBlog: async (id: string): Promise<void> => {
    await authApi.delete(`/blogs/${id}`);
  },

  /**
   * Toggle featured status (Admin only - cần auth)
   */
  toggleFeatured: async (id: string): Promise<Blog> => {
    const response = await authApi.put(`/blogs/${id}/toggle-featured`);
    return response.data?.data || response.data;
  },

  /**
   * Toggle pinned status (Admin only - cần auth)
   */
  togglePinned: async (id: string): Promise<Blog> => {
    const response = await authApi.put(`/blogs/${id}/toggle-pinned`);
    return response.data?.data || response.data;
  },

  /**
   * Get blog stats (Admin only - cần auth)
   */
  getBlogStats: async (): Promise<BlogStats> => {
    const response = await authApi.get('/blogs/stats/overview');
    return response.data?.data || response.data;
  }
};

export default blogService;


