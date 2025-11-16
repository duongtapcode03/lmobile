/**
 * Seller Service API
 * API cho seller - cần authentication và seller/admin role
 */

import { authApi } from './authApi';
import type { PhoneDetail } from '../types';

export interface SellerDashboardStats {
  overview: {
    totalProducts: number;
    totalOrders: number;
    totalRevenue: number;
  };
  recentOrders: any[];
}

export interface SellerFilters {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
  status?: string;
}

export const sellerService = {
  // Dashboard
  getDashboardStats: async (): Promise<SellerDashboardStats> => {
    const response = await authApi.get('/seller/dashboard/stats');
    return response.data.data || response.data;
  },

  // Products management
  getMyProducts: async (filters?: SellerFilters) => {
    const response = await authApi.get('/seller/products', { params: filters });
    return response.data.data || response.data;
  },

  createProduct: async (productData: Partial<PhoneDetail>) => {
    const response = await authApi.post('/seller/products', productData);
    return response.data.data || response.data;
  },

  updateMyProduct: async (productId: number | string, productData: Partial<PhoneDetail>) => {
    const response = await authApi.put(`/seller/products/${productId}`, productData);
    return response.data.data || response.data;
  },

  deleteMyProduct: async (productId: number | string) => {
    const response = await authApi.delete(`/seller/products/${productId}`);
    return response.data.data || response.data;
  },

  // Orders management
  getMyOrders: async (filters?: SellerFilters) => {
    const response = await authApi.get('/seller/orders', { params: filters });
    return response.data.data || response.data;
  },

  updateMyOrderStatus: async (orderId: string, status: string) => {
    const response = await authApi.put(`/seller/orders/${orderId}/status`, { status });
    return response.data.data || response.data;
  }
};

export default sellerService;
