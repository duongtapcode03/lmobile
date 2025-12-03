/**
 * Admin Service API
 * API cho admin - cần authentication và admin role
 */

import { authApi } from './authApi';

export interface DashboardStats {
  overview: {
    totalUsers: number;
    totalProducts: number;
    totalOrders: number;
    totalCategories: number;
    totalBrands: number;
    totalRevenue: number;
  };
  ordersByStatus: Record<string, number>;
  recentOrders: any[];
  topProducts: any[];
  revenueByMonth: any[];
  revenueByDay: Array<{
    date: Date | string;
    total: number;
    label: string;
  }>;
  revenueByWeek: Array<{
    date: Date | string;
    total: number;
    label: string;
  }>;
  revenueComparison: {
    currentMonth: number;
    lastMonth: number;
    change: number;
    changePercent: string;
  };
  topSellingProducts: Array<{
    _id: number;
    name: string;
    stock: number;
    sold: number;
    soldFromOrders: number;
    revenue: number;
    price: string;
    priceNumber: number;
    importPrice: number;
    thumbnail?: string;
  }>;
  highStockProducts: Array<{
    _id: number;
    name: string;
    stock: number;
    sold: number;
    price: string;
    priceNumber: number;
    importPrice: number;
    thumbnail?: string;
  }>;
  ordersByStatusDetail: Array<{
    status: string;
    count: number;
  }>;
}

export interface AdminFilters {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  isActive?: boolean;
  status?: string;
  brand?: number | string;
  category?: number | string;
  startDate?: string;
  endDate?: string;
}

export const adminService = {
  // Dashboard
  getDashboardStats: async (params?: { startDate?: string; endDate?: string }): Promise<DashboardStats> => {
    const response = await authApi.get('/admin/dashboard/stats', { params });
    console.log('Raw API response:', response.data);
    
    // Handle both response formats: { data: {...} } or direct object
    const data = response.data?.data || response.data;
    console.log('Extracted data:', data);
    console.log('Overview data:', data?.overview);
    
    // Ensure all fields are present with defaults
    const result = {
      overview: {
        totalUsers: Number(data?.overview?.totalUsers) || 0,
        totalProducts: Number(data?.overview?.totalProducts) || 0,
        totalOrders: Number(data?.overview?.totalOrders) || 0,
        totalCategories: Number(data?.overview?.totalCategories) || 0,
        totalBrands: Number(data?.overview?.totalBrands) || 0,
        totalRevenue: Number(data?.overview?.totalRevenue) || 0,
      },
      ordersByStatus: data?.ordersByStatus || {},
      recentOrders: Array.isArray(data?.recentOrders) ? data.recentOrders : [],
      topProducts: Array.isArray(data?.topProducts) ? data.topProducts : [],
      revenueByMonth: Array.isArray(data?.revenueByMonth) ? data.revenueByMonth : [],
      revenueByDay: Array.isArray(data?.revenueByDay) ? data.revenueByDay : [],
      revenueByWeek: Array.isArray(data?.revenueByWeek) ? data.revenueByWeek : [],
      revenueComparison: data?.revenueComparison || {
        currentMonth: 0,
        lastMonth: 0,
        change: 0,
        changePercent: '0'
      },
      topSellingProducts: Array.isArray(data?.topSellingProducts) ? data.topSellingProducts : [],
      highStockProducts: Array.isArray(data?.highStockProducts) ? data.highStockProducts : [],
      ordersByStatusDetail: Array.isArray(data?.ordersByStatusDetail) ? data.ordersByStatusDetail : [],
    };
    
    console.log('Final result:', result);
    return result;
  },

  // Users management
  getAllUsers: async (filters?: AdminFilters) => {
    const response = await authApi.get('/admin/users', { params: filters });
    console.log('[AdminService] getAllUsers raw response:', response.data);
    // Backend controller uses successResponse(res, result)
    // result = { data: users[], pagination: {...} }
    // Response: { success: true, data: { data: [...], pagination: {...} }, message: 'Success' }
    // We need to extract the inner data object
    const innerData = response.data?.data;
    if (innerData && typeof innerData === 'object' && 'data' in innerData && 'pagination' in innerData) {
      // Nested structure: { data: { data: [...], pagination: {...} } }
      return innerData;
    }
    // Fallback: assume response.data is already the correct structure
    return response.data || { data: [], pagination: {} };
  },

  getUserById: async (userId: number | string) => {
    const response = await authApi.get(`/admin/users/${userId}`);
    // Response format: { success: true, data: {...} }
    return response.data?.data || response.data;
  },

  updateUserStatus: async (userId: number | string, isActive: boolean) => {
    const response = await authApi.put(`/admin/users/${userId}/status`, { isActive });
    // Response format: { success: true, data: {...}, message: '...' }
    return response.data?.data || response.data;
  },

  // Products management
  getAllProducts: async (filters?: AdminFilters) => {
    const response = await authApi.get('/admin/products', { params: filters });
    // Backend returns: { success: true, data: { data: [...], pagination: {...} }, message: 'Success' }
    const result = response.data?.data || response.data;
    return result;
  },

  updateProductStatus: async (productId: number | string, isActive: boolean) => {
    const response = await authApi.put(`/admin/products/${productId}/status`, { isActive });
    // Backend returns: { success: true, data: {...}, message: '...' }
    return response.data?.data || response.data;
  },

  // Orders management
  getAllOrders: async (filters?: AdminFilters) => {
    const response = await authApi.get('/admin/orders', { params: filters });
    // Backend returns: { success: true, data: { data: [...], pagination: {...} }, message: 'Success' }
    const result = response.data?.data || response.data;
    return result;
  },

  updateOrderStatus: async (orderId: string, status: string) => {
    const response = await authApi.put(`/admin/orders/${orderId}/status`, { status });
    // Backend returns: { success: true, data: {...}, message: '...' }
    return response.data?.data || response.data;
  },

  // Categories management
  getAllCategories: async (filters?: AdminFilters) => {
    const response = await authApi.get('/admin/categories', { params: filters });
    // Backend returns: { success: true, data: { data: [...], pagination: {...} }, message: 'Success' }
    const result = response.data?.data || response.data;
    return result;
  },

  // Brands management
  getAllBrands: async (filters?: AdminFilters) => {
    const response = await authApi.get('/admin/brands', { params: filters });
    // Backend returns: { success: true, data: { data: [...], pagination: {...} }, message: 'Success' }
    const result = response.data?.data || response.data;
    return result;
  }
};

export default adminService;
