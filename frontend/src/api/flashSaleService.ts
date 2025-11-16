/**
 * Flash Sale Service API
 * Service để gọi API flash sale từ React
 */

import { authApi } from './authApi';
import { axiosClient } from './axiosClient';

export interface FlashSale {
  _id?: string;
  id: number;
  session_id: string;
  product_id: number;
  flash_price: number;
  total_stock: number;
  sold: number;
  limit_per_user: number;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
  product?: {
    _id: number;
    name: string;
    price?: string;
    priceNumber?: number;
    thumbnail?: string;
    slug?: string;
    stock?: number;
  };
}

export interface FlashSaleListResponse {
  data: FlashSale[];
  pagination?: {
    currentPage: number;
    itemsPerPage: number;
    totalItems: number;
    totalPages: number;
  };
}

export interface FlashSaleStats {
  total: number;
  available: number;
  soldOut: number;
  sessions: number;
}

const flashSaleService = {
  /**
   * Lấy danh sách flash sales (Admin - tất cả)
   */
  getFlashSales: async (params?: {
    page?: number;
    limit?: number;
    session_id?: string;
    status?: 'all' | 'available' | 'soldOut';
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<FlashSaleListResponse> => {
    const response = await authApi.get('/flash-sales', { 
      params: { ...params, admin: 'true' } 
    });
    return {
      data: response.data.data || [],
      pagination: response.data.pagination
    };
  },

  /**
   * Lấy flash sale theo ID
   */
  getFlashSaleById: async (id: number | string): Promise<FlashSale> => {
    const response = await authApi.get(`/flash-sales/${id}`);
    return response.data.data;
  },

  /**
   * Lấy flash sales theo session
   */
  getFlashSalesBySession: async (
    sessionId: string,
    params?: {
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    }
  ): Promise<FlashSaleListResponse> => {
    const response = await authApi.get(`/flash-sales/session/${sessionId}`, { params });
    return {
      data: response.data.data || [],
      pagination: response.data.pagination
    };
  },

  /**
   * Tạo flash sale mới (Admin)
   */
  createFlashSale: async (flashSaleData: {
    session_id: string;
    product_id: number;
    flash_price: number;
    total_stock: number;
    sold?: number;
    limit_per_user?: number;
    sort_order?: number;
  }): Promise<FlashSale> => {
    const response = await authApi.post('/flash-sales', flashSaleData);
    return response.data.data;
  },

  /**
   * Cập nhật flash sale (Admin)
   */
  updateFlashSale: async (
    id: number | string,
    flashSaleData: Partial<FlashSale>
  ): Promise<FlashSale> => {
    const response = await authApi.put(`/flash-sales/${id}`, flashSaleData);
    return response.data.data;
  },

  /**
   * Xóa flash sale (Admin)
   */
  deleteFlashSale: async (id: number | string): Promise<void> => {
    await authApi.delete(`/flash-sales/${id}`);
  },

  /**
   * Lấy thống kê flash sale
   */
  getStats: async (): Promise<FlashSaleStats> => {
    const response = await authApi.get('/flash-sales/stats');
    return response.data.data;
  },

  /**
   * Kiểm tra flash sale availability
   */
  checkAvailability: async (
    productId: number | string,
    quantity?: number
  ): Promise<{
    available: boolean;
    reason?: string;
    flash_price?: number;
    remaining?: number;
    limitPerUser?: number;
    item?: FlashSale;
  }> => {
    const response = await authApi.get(`/flash-sales/product/${productId}/check`, {
      params: { quantity: quantity || 1 }
    });
    return response.data.data;
  },

  /**
   * Lấy danh sách flash sales active (Public - không cần auth)
   */
  getActiveFlashSales: async (params?: {
    page?: number;
    limit?: number;
    session_id?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<FlashSaleListResponse> => {
    const response = await axiosClient.get('/flash-sales', { params });
    return {
      data: response.data.data || [],
      pagination: response.data.pagination
    };
  }
};

export default flashSaleService;

