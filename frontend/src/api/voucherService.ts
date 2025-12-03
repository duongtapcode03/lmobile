/**
 * Voucher Service API
 * Service để gọi API voucher từ React
 */

import { authApi } from './authApi';
import { axiosClient } from './axiosClient';

export interface Voucher {
  _id: string;
  code: string;
  name: string;
  description?: string;
  type: 'percentage' | 'fixed_amount' | 'free_shipping';
  value: number;
  minOrderAmount: number;
  maxDiscountAmount?: number;
  usageLimit: number;
  usedCount: number;
  validFrom: string;
  validTo: string;
  isActive: boolean;
  isValid?: boolean;
  canUse?: boolean;
  remainingUses?: number;
  applicableProducts?: string[];
  applicableCategories?: string[];
  applicableUsers?: string[];
  excludeProducts?: string[];
  excludeCategories?: string[];
  conditions?: {
    firstTimeOnly?: boolean;
    newUserOnly?: boolean;
    minQuantity?: number;
    maxQuantity?: number;
  };
  tags?: string[];
  image?: string;
  priority?: number;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ValidateVoucherResponse {
  success: boolean;
  errorCode?: string;
  message?: string;
  voucher?: {
    code: string;
    name: string;
    type: string;
    value: number;
  };
  discountAmount: number;
  discountPercent?: number;
  freeShipping?: boolean;
  finalPrice?: number;
  totalAmount?: number;
}

// Error codes từ backend
export const VOUCHER_ERROR_CODES = {
  NOT_FOUND: "VOUCHER_NOT_FOUND",
  INVALID_CODE: "VOUCHER_INVALID_CODE",
  INACTIVE: "VOUCHER_INACTIVE",
  EXPIRED: "VOUCHER_EXPIRED",
  NOT_STARTED: "VOUCHER_NOT_STARTED",
  OUT_OF_STOCK: "VOUCHER_OUT_OF_STOCK",
  MIN_ORDER_NOT_MET: "VOUCHER_MIN_ORDER_NOT_MET",
  USER_NOT_ELIGIBLE: "VOUCHER_USER_NOT_ELIGIBLE",
  NEW_USER_ONLY: "VOUCHER_NEW_USER_ONLY",
  FIRST_TIME_ONLY: "VOUCHER_FIRST_TIME_ONLY",
  USER_LIMIT_EXCEEDED: "VOUCHER_USER_LIMIT_EXCEEDED",
  PRODUCT_NOT_APPLICABLE: "VOUCHER_PRODUCT_NOT_APPLICABLE",
  PRODUCT_EXCLUDED: "VOUCHER_PRODUCT_EXCLUDED",
  STACKING_NOT_ALLOWED: "VOUCHER_STACKING_NOT_ALLOWED",
  SYSTEM_ERROR: "VOUCHER_SYSTEM_ERROR",
  CONCURRENCY_ERROR: "VOUCHER_CONCURRENCY_ERROR"
};

export interface VoucherListResponse {
  data: Voucher[];
  pagination?: {
    currentPage: number;
    itemsPerPage: number;
    totalItems: number;
    totalPages: number;
  };
}

const voucherService = {
  /**
   * Lấy danh sách vouchers (Admin)
   */
  getVouchers: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    type?: string;
    isActive?: boolean;
  }): Promise<VoucherListResponse> => {
    const response = await authApi.get('/vouchers', { params });
    return {
      data: response.data.data || [],
      pagination: response.data.pagination
    };
  },

  /**
   * Lấy voucher theo ID (Admin)
   */
  getVoucherById: async (id: string): Promise<Voucher> => {
    const response = await authApi.get(`/vouchers/${id}`);
    return response.data.data;
  },

  /**
   * Tạo voucher mới (Admin)
   */
  createVoucher: async (voucherData: Partial<Voucher>): Promise<Voucher> => {
    const response = await authApi.post('/vouchers', voucherData);
    return response.data.data;
  },

  /**
   * Cập nhật voucher (Admin)
   */
  updateVoucher: async (id: string, voucherData: Partial<Voucher>): Promise<Voucher> => {
    const response = await authApi.put(`/vouchers/${id}`, voucherData);
    return response.data.data;
  },

  /**
   * Xóa voucher (Admin)
   */
  deleteVoucher: async (id: string): Promise<void> => {
    await authApi.delete(`/vouchers/${id}`);
  },

  /**
   * Toggle trạng thái active (Admin)
   */
  toggleActive: async (id: string): Promise<Voucher> => {
    const response = await authApi.put(`/vouchers/${id}/toggle`);
    return response.data.data;
  },

  /**
   * Lấy thống kê vouchers (Admin)
   */
  getStats: async (): Promise<any> => {
    const response = await authApi.get('/vouchers/stats');
    return response.data.data;
  },

  /**
   * Validate mã giảm giá (sử dụng integration service mới)
   */
  validateVoucher: async (
    code: string, 
    orderAmount: number,
    cartItems?: any[],
    shippingFee: number = 0
  ): Promise<ValidateVoucherResponse> => {
    try {
      const response = await authApi.post('/vouchers/validate', {
        code,
        orderAmount,
        cartItems: cartItems || [],
        shippingFee
      });
      
      const data = response.data.data;
      
      if (data.success) {
        return {
          success: true,
          voucher: data.voucher,
          discountAmount: data.discountAmount || 0,
          discountPercent: data.discountPercent,
          freeShipping: data.freeShipping,
          finalPrice: data.finalPrice,
          totalAmount: data.totalAmount,
          message: data.message || 'Voucher hợp lệ'
        };
      } else {
        return {
          success: false,
          errorCode: data.errorCode,
          message: data.message || 'Mã giảm giá không hợp lệ',
          discountAmount: 0
        };
      }
    } catch (error: any) {
      const errorData = error.response?.data;
      return {
        success: false,
        errorCode: errorData?.errorCode || VOUCHER_ERROR_CODES.SYSTEM_ERROR,
        message: errorData?.message || 'Mã giảm giá không hợp lệ',
        discountAmount: 0
      };
    }
  },

  /**
   * Lấy thông tin voucher theo code (public)
   */
  getVoucherByCode: async (code: string): Promise<Voucher> => {
    const response = await authApi.get(`/vouchers/code/${code}`);
    return response.data.data;
  },

  /**
   * Lấy danh sách voucher có sẵn (public)
   */
  getAvailableVouchers: async (params?: {
    limit?: number;
    page?: number;
  }): Promise<VoucherListResponse> => {
    const response = await axiosClient.get('/vouchers/available', { params });
    return {
      data: response.data.data || [],
      pagination: response.data.pagination
    };
  },

  /**
   * Lưu voucher vào danh sách đã lưu (User)
   */
  saveVoucher: async (voucherId: string): Promise<void> => {
    await authApi.post(`/vouchers/${voucherId}/save`);
  },

  /**
   * Bỏ lưu voucher (User)
   */
  removeSavedVoucher: async (voucherId: string): Promise<void> => {
    await authApi.delete(`/vouchers/${voucherId}/save`);
  },

  /**
   * Lấy danh sách voucher đã lưu (User)
   */
  getSavedVouchers: async (): Promise<Voucher[]> => {
    const response = await authApi.get('/vouchers/saved');
    return response.data.data || [];
  },

  /**
   * Lấy usage stats của voucher (Admin)
   */
  getUsageStats: async (voucherId: string): Promise<any> => {
    const response = await authApi.get(`/vouchers/${voucherId}/usage-stats`);
    return response.data.data;
  },

  /**
   * Lấy danh sách usage của voucher (Admin)
   */
  getUsages: async (voucherId: string, params?: {
    page?: number;
    limit?: number;
    status?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<any> => {
    const response = await authApi.get(`/vouchers/${voucherId}/usages`, { params });
    return {
      usages: response.data.data || [],
      pagination: response.data.pagination
    };
  }
};

export default voucherService;

