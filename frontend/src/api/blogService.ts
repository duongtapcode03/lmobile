/**
 * Blog Service API
 * Service để gọi API blog từ React
 */

import axiosClient from './axiosClient';
import { Blog, BlogListResponse, BlogFilter, BlogStats } from '../types';

const blogService = {
  /**
   * Lấy danh sách blog với filter và pagination
   */
  getBlogs: async (filter?: BlogFilter): Promise<BlogListResponse> => {
    const response = await axiosClient.get('/api/blogs', { params: filter });
    return response.data;
  },

  /**
   * Lấy chi tiết blog theo ID
   */
  getBlogById: async (id: string): Promise<Blog> => {
    const response = await axiosClient.get(`/api/blogs/${id}`);
    return response.data;
  },

  /**
   * Lấy blog theo slug
   */
  getBlogBySlug: async (slug: string): Promise<Blog> => {
    const response = await axiosClient.get(`/api/blogs/slug/${slug}`);
    return response.data;
  },

  /**
   * Tìm kiếm blog
   */
  searchBlogs: async (query: string, filter?: Omit<BlogFilter, 'search'>): Promise<BlogListResponse> => {
    const response = await axiosClient.get('/api/blogs/search', {
      params: { ...filter, q: query }
    });
    return response.data;
  },

  /**
   * Lấy blog theo category
   */
  getBlogsByCategory: async (
    category: string, 
    filter?: Omit<BlogFilter, 'category'>
  ): Promise<BlogListResponse> => {
    const response = await axiosClient.get(`/api/blogs/category/${category}`, {
      params: filter
    });
    return response.data;
  },

  /**
   * Lấy blog statistics
   */
  getBlogStats: async (): Promise<BlogStats> => {
    const response = await axiosClient.get('/api/blogs/stats');
    return response.data;
  },

  /**
   * Lấy các categories có sẵn
   */
  getCategories: async (): Promise<string[]> => {
    const response = await axiosClient.get('/api/blogs/categories');
    return response.data;
  },

  /**
   * Lấy blog featured/pinned
   */
  getFeaturedBlogs: async (limit: number = 10): Promise<Blog[]> => {
    const response = await axiosClient.get('/api/blogs/featured', {
      params: { limit }
    });
    return response.data;
  },

  /**
   * Increment view count
   */
  incrementViewCount: async (id: string): Promise<void> => {
    await axiosClient.post(`/api/blogs/${id}/view`);
  },

  /**
   * Like blog
   */
  likeBlog: async (id: string): Promise<Blog> => {
    const response = await axiosClient.post(`/api/blogs/${id}/like`);
    return response.data;
  }
};

export default blogService;


