/**
 * Wishlist Service API
 * Service để gọi API wishlist từ React
 */

import axiosClient from './axiosClient';
import { Wishlist, WishlistResponse } from '../types';

const wishlistService = {
  /**
   * Lấy wishlist của user hiện tại
   */
  getMyWishlist: async (): Promise<Wishlist> => {
    const response = await axiosClient.get('/api/wishlist');
    return response.data.data;
  },

  /**
   * Thêm sản phẩm vào wishlist
   */
  addProduct: async (productId: string, note?: string): Promise<Wishlist> => {
    const response = await axiosClient.post(`/api/wishlist/products/${productId}`, { note });
    return response.data.data;
  },

  /**
   * Xóa sản phẩm khỏi wishlist
   */
  removeProduct: async (productId: string): Promise<Wishlist> => {
    const response = await axiosClient.delete(`/api/wishlist/products/${productId}`);
    return response.data.data;
  },

  /**
   * Xóa tất cả sản phẩm khỏi wishlist
   */
  clearWishlist: async (): Promise<void> => {
    await axiosClient.delete('/api/wishlist/clear');
  },

  /**
   * Kiểm tra sản phẩm có trong wishlist không
   */
  checkProduct: async (productId: string): Promise<boolean> => {
    const response = await axiosClient.get(`/api/wishlist/products/${productId}/check`);
    return response.data.data.inWishlist;
  },

  /**
   * Tạo share token
   */
  generateShareToken: async (): Promise<string> => {
    const response = await axiosClient.post('/api/wishlist/share');
    return response.data.data.shareToken;
  },

  /**
   * Toggle public/private wishlist
   */
  togglePublic: async (isPublic: boolean): Promise<Wishlist> => {
    const response = await axiosClient.put('/api/wishlist/public', { isPublic });
    return response.data.data;
  },

  /**
   * Lấy wishlist theo share token (public)
   */
  getWishlistByToken: async (token: string): Promise<Wishlist> => {
    const response = await axiosClient.get(`/api/wishlist/share/${token}`);
    return response.data.data;
  }
};

export default wishlistService;

