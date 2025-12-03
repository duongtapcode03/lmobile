/**
 * Return Request Service API
 * Service để gọi API return requests từ React
 */

import { authApi } from './authApi';

export interface ReturnRequestItem {
  productId: number;
  variantId?: number;
  quantity: number;
  reason: 'defective' | 'wrong_item' | 'not_as_described' | 'damaged' | 'size_issue' | 'color_issue' | 'other';
  reasonDetail?: string;
}

export interface ReturnRequest {
  _id: string;
  order: string | {
    _id: string;
    orderNumber: string;
    status: string;
    totalAmount: number;
    deliveredAt?: string;
  };
  orderNumber: string;
  user: string | {
    _id: string;
    name: string;
    email: string;
    phone?: string;
  };
  items: Array<{
    product: number;
    productName: string;
    quantity: number;
    price: number;
    reason: string;
    reasonDetail?: string;
  }>;
  status: 'pending' | 'approved' | 'rejected' | 'processing' | 'completed' | 'cancelled';
  refundAmount: number;
  refundMethod: 'original' | 'store_credit' | 'bank_transfer';
  refundStatus: 'pending' | 'processing' | 'completed' | 'failed';
  refundedAt?: string;
  refundTransactionId?: string;
  customerNote?: string;
  adminNote?: string;
  statusHistory: Array<{
    status: string;
    note?: string;
    updatedBy?: string;
    updatedAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface ReturnRequestListResponse {
  data: ReturnRequest[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
}

const returnRequestService = {
  /**
   * Tạo yêu cầu hoàn hàng
   */
  createReturnRequest: async (orderId: string, data: {
    items: ReturnRequestItem[];
    customerNote?: string;
  }): Promise<ReturnRequest> => {
    const response = await authApi.post(`/return-requests`, {
      orderId,
      ...data
    });
    return response.data.data;
  },

  /**
   * Lấy danh sách return requests của user
   */
  getMyReturnRequests: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
  }): Promise<ReturnRequestListResponse> => {
    const response = await authApi.get('/return-requests/my-requests', { params });
    return {
      data: response.data.data || [],
      pagination: response.data.pagination || {}
    };
  },

  /**
   * Lấy chi tiết return request
   */
  getReturnRequestById: async (id: string): Promise<ReturnRequest> => {
    const response = await authApi.get(`/return-requests/${id}`);
    return response.data.data;
  },

  /**
   * Hủy yêu cầu hoàn hàng
   */
  cancelReturnRequest: async (id: string): Promise<ReturnRequest> => {
    const response = await authApi.put(`/return-requests/${id}/cancel`);
    return response.data.data;
  },

  /**
   * Admin: Lấy tất cả return requests
   */
  getAllReturnRequests: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
    orderNumber?: string;
  }): Promise<ReturnRequestListResponse> => {
    const response = await authApi.get('/return-requests', { params });
    return {
      data: response.data.data || [],
      pagination: response.data.pagination || {}
    };
  },

  /**
   * Admin: Lấy chi tiết return request
   */
  getReturnRequestByIdAdmin: async (id: string): Promise<ReturnRequest> => {
    const response = await authApi.get(`/return-requests/admin/${id}`);
    return response.data.data;
  },

  /**
   * Admin: Duyệt yêu cầu hoàn hàng
   */
  approveReturnRequest: async (id: string, adminNote?: string): Promise<ReturnRequest> => {
    const response = await authApi.put(`/return-requests/${id}/approve`, { adminNote });
    return response.data.data;
  },

  /**
   * Admin: Từ chối yêu cầu hoàn hàng
   */
  rejectReturnRequest: async (id: string, adminNote?: string): Promise<ReturnRequest> => {
    const response = await authApi.put(`/return-requests/${id}/reject`, { adminNote });
    return response.data.data;
  },

  /**
   * Admin: Xác nhận đã nhận hàng và bắt đầu xử lý
   */
  processReturnRequest: async (id: string, adminNote?: string): Promise<ReturnRequest> => {
    const response = await authApi.put(`/return-requests/${id}/process`, { adminNote });
    return response.data.data;
  },

  /**
   * Admin: Hoàn thành hoàn tiền
   */
  completeReturnRequest: async (id: string, data: {
    refundTransactionId?: string;
    adminNote?: string;
  }): Promise<ReturnRequest> => {
    const response = await authApi.put(`/return-requests/${id}/complete`, data);
    return response.data.data;
  }
};

export default returnRequestService;

