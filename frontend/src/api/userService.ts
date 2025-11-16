/**
 * User Service API
 * API cho user (customer) - cần authentication
 */

import { authApi } from './authApi';
import { axiosClient } from './axiosClient';

// Public APIs (không cần auth)
export const publicUserAPI = {
  // Get public user info (if needed)
  getPublicProfile: async (userId: string) => {
    const response = await axiosClient.get(`/users/${userId}/public`);
    return response.data;
  },
};

// Auth APIs (cần auth)
export const userAPI = {
  // Profile
  getProfile: async () => {
    const response = await authApi.get('/users/profile');
    // Backend returns: { success: true, data: {...}, message: 'Success' }
    return response.data?.data || response.data;
  },

  updateProfile: async (data: any) => {
    const response = await authApi.put('/users/profile', data);
    // Backend returns: { success: true, data: {...}, message: '...' }
    return response.data?.data || response.data;
  },

  changePassword: async (currentPassword: string, newPassword: string) => {
    const response = await authApi.put('/users/change-password', {
      currentPassword,
      newPassword
    });
    // Backend returns: { success: true, data: {...}, message: '...' }
    return response.data?.data || response.data;
  },

  // Orders
  getOrders: async (params?: { page?: number; limit?: number; status?: string }) => {
    const response = await authApi.get('/orders', { params });
    // Backend returns: { success: true, data: { data: [...], pagination: {...} }, message: 'Success' }
    const result = response.data?.data || response.data;
    return result;
  },

  getOrderById: async (orderId: string) => {
    const response = await authApi.get(`/orders/${orderId}`);
    // Backend returns: { success: true, data: {...}, message: 'Success' }
    return response.data?.data || response.data;
  },

  cancelOrder: async (orderId: string) => {
    const response = await authApi.post(`/orders/${orderId}/cancel`);
    // Backend returns: { success: true, data: {...}, message: '...' }
    return response.data?.data || response.data;
  },

  // Cart
  getCart: async () => {
    const response = await authApi.get('/cart');
    // Backend returns: { success: true, data: {...}, message: 'Success' }
    return response.data?.data || response.data;
  },

  // API mới: chỉ cần productId, quantity, và optional variantId
  addToCart: async (data: { productId: number | string; quantity?: number; variantId?: number | string }) => {
    const response = await authApi.post('/cart/add', {
      productId: data.productId,
      quantity: data.quantity || 1,
      variantId: data.variantId
    });
    // Backend returns: { success: true, data: {...}, message: '...' }
    return response.data?.data || response.data;
  },

  updateCartItem: async (itemId: string, quantity: number) => {
    const response = await authApi.put(`/cart/item/${itemId}`, { quantity });
    // Backend returns: { success: true, data: {...}, message: '...' }
    return response.data?.data || response.data;
  },

  removeFromCart: async (itemId: string) => {
    const response = await authApi.delete(`/cart/item/${itemId}`);
    // Backend returns: { success: true, data: {...}, message: '...' }
    return response.data?.data || response.data;
  },

  clearCart: async () => {
    const response = await authApi.delete('/cart/clear');
    // Backend returns: { success: true, data: {...}, message: '...' }
    return response.data?.data || response.data;
  },

  syncCartPrices: async () => {
    const response = await authApi.post('/cart/sync-prices');
    // Backend returns: { success: true, data: {...}, message: '...' }
    return response.data?.data || response.data;
  },

  updateShippingFee: async (shippingFee: number) => {
    const response = await authApi.put('/cart/shipping-fee', { shippingFee });
    // Backend returns: { success: true, data: {...}, message: '...' }
    return response.data?.data || response.data;
  },

  applyCoupon: async (couponCode: string, discountAmount: number) => {
    const response = await authApi.post('/cart/apply-coupon', {
      couponCode,
      discountAmount
    });
    // Backend returns: { success: true, data: {...}, message: '...' }
    return response.data?.data || response.data;
  },

  removeCoupon: async () => {
    const response = await authApi.delete('/cart/remove-coupon');
    // Backend returns: { success: true, data: {...}, message: '...' }
    return response.data?.data || response.data;
  },

  calculateShippingFee: async (data: {
    totalAmount: number;
    shippingMethod?: 'standard' | 'express' | 'same_day';
    province?: string;
  }) => {
    const response = await authApi.post('/cart/calculate-shipping', data);
    // Backend returns: { success: true, data: {...}, message: '...' }
    return response.data?.data || response.data;
  },

  // Wishlist
  getWishlist: async (params?: { page?: number; limit?: number }) => {
    const response = await authApi.get('/wishlist', { params });
    // Backend returns: { success: true, data: {... items: [...], pagination: {...} }, message: 'Success' }
    return response.data?.data || response.data;
  },

  addToWishlist: async (productId: string, note?: string) => {
    const response = await authApi.post(`/wishlist/products/${productId}`, { note });
    // Backend returns: { success: true, data: {...}, message: '...' }
    return response.data?.data || response.data;
  },

  removeFromWishlist: async (productId: string) => {
    const response = await authApi.delete(`/wishlist/products/${productId}`);
    // Backend returns: { success: true, data: {...}, message: '...' }
    return response.data?.data || response.data;
  },

  checkProductInWishlist: async (productId: string) => {
    const response = await authApi.get(`/wishlist/products/${productId}/check`);
    // Backend returns: { success: true, data: { inWishlist: boolean }, message: '...' }
    return response.data?.data?.inWishlist || response.data?.inWishlist || false;
  },

  // API mới: Toggle wishlist (thêm nếu chưa có, xóa nếu đã có)
  toggleWishlist: async (productId: string) => {
    const response = await authApi.post(`/wishlist/products/${productId}/toggle`);
    // Backend returns: { success: true, data: { inWishlist: boolean, message: string }, message: '...' }
    return response.data?.data || response.data;
  },

  clearWishlist: async () => {
    await authApi.delete('/wishlist/clear');
  },
};

// Combined service
export const userService = {
  ...publicUserAPI,
  ...userAPI,
};

export default userService;

