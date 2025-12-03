/**
 * Flash Sale Service API
 * Service để gọi API flash sale từ React
 */

import { authApi } from './authApi';
import { axiosClient } from './axiosClient';

export interface FlashSale {
  _id?: string;
  name: string;
  start_time: string;
  end_time: string;
  status: 'active' | 'inactive';
  description?: string;
  created_by?: string;
  actualStatus?: 'scheduled' | 'active' | 'ended' | 'inactive';
  itemsCount?: number;
  items?: FlashSaleItem[];
  createdAt?: string;
  updatedAt?: string;
}

export interface FlashSaleItem {
  _id?: string;
  flash_sale_id: string;
  product_id: number;
  flash_price: number;
  flash_stock: number;
  sold: number;
  reserved?: number;
  limit_per_user: number;
  sort_order: number;
  remainingStock?: number;
  availableStock?: number; // Số lượng còn lại có thể mua (trừ reserved)
  isAvailable?: boolean;
  product?: {
    _id: number;
    name: string;
    price?: string;
    priceNumber?: number;
    thumbnail?: string;
    slug?: string;
    stock?: number;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface FlashSaleReservation {
  _id?: string;
  user_id: string;
  flash_sale_id: string;
  product_id: number;
  quantity: number;
  flash_price: number;
  expires_at: string;
  status: 'pending' | 'confirmed' | 'expired' | 'cancelled';
  order_id?: string;
  createdAt?: string;
  updatedAt?: string;
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
    status?: 'all' | 'scheduled' | 'active' | 'ended' | 'inactive';
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
  getFlashSaleById: async (id: string, includeItems: boolean = true): Promise<FlashSale> => {
    const response = await authApi.get(`/flash-sales/${id}`, {
      params: { includeItems: includeItems.toString() }
    });
    return response.data.data;
  },

  /**
   * Lấy danh sách items trong flash sale (yêu cầu auth - dùng cho admin/user đã đăng nhập)
   */
  getFlashSaleItems: async (
    flashSaleId: string,
    params?: {
      page?: number;
      limit?: number;
      availableOnly?: boolean;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    }
  ): Promise<{ data: FlashSaleItem[]; pagination?: any }> => {
    const response = await authApi.get(`/flash-sales/${flashSaleId}/items`, { params });
    return {
      data: response.data.data || [],
      pagination: response.data.pagination
    };
  },

  /**
   * Lấy danh sách items trong flash sale (Public - không cần auth)
   */
  getPublicFlashSaleItems: async (
    flashSaleId: string,
    params?: {
      page?: number;
      limit?: number;
      availableOnly?: boolean;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    }
  ): Promise<{ data: FlashSaleItem[]; pagination?: any }> => {
    const response = await axiosClient.get(`/flash-sales/${flashSaleId}/items`, { params });
    return {
      data: response.data.data || [],
      pagination: response.data.pagination
    };
  },

  /**
   * Tạo flash sale mới (Admin)
   */
  createFlashSale: async (flashSaleData: {
    name: string;
    start_time: string;
    end_time: string;
    description?: string;
    status?: 'active' | 'inactive';
  }): Promise<FlashSale> => {
    const response = await authApi.post('/flash-sales', flashSaleData);
    return response.data.data;
  },

  /**
   * Thêm sản phẩm vào flash sale (Admin)
   */
  addProductToFlashSale: async (
    flashSaleId: string,
    productData: {
      product_id: number;
      flash_price: number;
      flash_stock: number;
      limit_per_user?: number;
      sort_order?: number;
    }
  ): Promise<FlashSaleItem> => {
    const response = await authApi.post(`/flash-sales/${flashSaleId}/products`, productData);
    return response.data.data;
  },

  /**
   * Cập nhật flash sale (Admin)
   */
  updateFlashSale: async (
    id: string,
    flashSaleData: Partial<FlashSale>
  ): Promise<FlashSale> => {
    const response = await authApi.put(`/flash-sales/${id}`, flashSaleData);
    return response.data.data;
  },

  /**
   * Cập nhật flash sale item (Admin)
   */
  updateFlashSaleItem: async (
    itemId: string,
    itemData: Partial<FlashSaleItem>
  ): Promise<FlashSaleItem> => {
    const response = await authApi.put(`/flash-sales/items/${itemId}`, itemData);
    return response.data.data;
  },

  /**
   * Xóa sản phẩm khỏi flash sale (Admin)
   */
  removeProductFromFlashSale: async (
    flashSaleId: string,
    productId: number
  ): Promise<void> => {
    await authApi.delete(`/flash-sales/${flashSaleId}/products`, {
      data: { productId }
    });
  },

  /**
   * Xóa flash sale (Admin)
   */
  deleteFlashSale: async (id: string): Promise<void> => {
    await authApi.delete(`/flash-sales/${id}`);
  },

  /**
   * Cập nhật trạng thái flash sale (Admin)
   */
  updateFlashSaleStatus: async (
    id: string,
    status: 'active' | 'inactive'
  ): Promise<FlashSale> => {
    const response = await authApi.put(`/flash-sales/${id}/status`, { status });
    return response.data.data;
  },

  /**
   * Lấy thống kê flash sale
   */
  getStats: async (flashSaleId?: string): Promise<any> => {
    const url = flashSaleId 
      ? `/flash-sales/${flashSaleId}/stats`
      : '/flash-sales/stats/all';
    const response = await authApi.get(url);
    return response.data.data;
  },

  /**
   * Kiểm tra flash sale availability
   */
  checkAvailability: async (
    flashSaleId: string,
    productId: number,
    quantity?: number
  ): Promise<{
    available: boolean;
    reason?: string;
    flash_price?: number;
    remaining?: number;
    limitPerUser?: number;
    item?: FlashSaleItem;
  }> => {
    const response = await authApi.get(`/flash-sales/${flashSaleId}/product/${productId}/check`, {
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
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<FlashSaleListResponse> => {
    const response = await axiosClient.get('/flash-sales', { params });
    return {
      data: response.data.data || [],
      pagination: response.data.pagination
    };
  },

  /**
   * Tạo reservation (giữ chỗ) flash sale (User)
   */
  createReservation: async (data: {
    flash_sale_id: string;
    product_id: number;
    quantity: number;
    expiresInMinutes?: number;
  }): Promise<FlashSaleReservation> => {
    const response = await authApi.post('/flash-sales/reservations', data);
    return response.data.data;
  },

  /**
   * Xác nhận reservation (User)
   */
  confirmReservation: async (reservationId: string, orderId: string): Promise<FlashSaleReservation> => {
    const response = await authApi.post(`/flash-sales/reservations/${reservationId}/confirm`, { orderId });
    return response.data.data;
  },

  /**
   * Hủy reservation (User)
   */
  cancelReservation: async (reservationId: string): Promise<void> => {
    await authApi.delete(`/flash-sales/reservations/${reservationId}`);
  },

  /**
   * Lấy reservations của user
   */
  getUserReservations: async (flashSaleId?: string): Promise<FlashSaleReservation[]> => {
    const params = flashSaleId ? { flash_sale_id: flashSaleId } : {};
    const response = await authApi.get('/flash-sales/reservations', { params });
    return response.data.data || [];
  },

  /**
   * Validate reservation (re-check trước khi thanh toán)
   */
  validateReservation: async (reservationId: string): Promise<{
    valid: boolean;
    reason?: string;
    reservation?: FlashSaleReservation;
    flash_price?: number;
    availableStock?: number;
  }> => {
    const response = await authApi.get(`/flash-sales/reservations/${reservationId}/validate`);
    return response.data.data;
  }
};

export default flashSaleService;

