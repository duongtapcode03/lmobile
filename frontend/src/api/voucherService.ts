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
  valid: boolean;
  discountAmount: number;
  discountPercent?: number;
  maxDiscount?: number | null;
  finalPrice?: number;
  message?: string;
  voucher?: Voucher;
}

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
   * Validate mã giảm giá
   */
  validateVoucher: async (
    code: string, 
    orderAmount: number,
    cartItems?: any[]
  ): Promise<ValidateVoucherResponse> => {
    try {
      const response = await authApi.post('/vouchers/validate', {
        code,
        orderAmount,
        cartItems: cartItems || []
      });
      // Backend trả về: { voucher, discountAmount, discountPercent, maxDiscount, finalPrice }
      const data = response.data.data;
      return {
        valid: true,
        discountAmount: data.discountAmount || 0,
        discountPercent: data.discountPercent,
        maxDiscount: data.maxDiscount,
        finalPrice: data.finalPrice,
        voucher: data.voucher,
        message: 'Voucher hợp lệ'
      };
    } catch (error: any) {
      return {
        valid: false,
        discountAmount: 0,
        message: error.response?.data?.message || 'Mã giảm giá không hợp lệ'
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
  }
};

export default voucherService;

