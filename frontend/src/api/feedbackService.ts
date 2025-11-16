/**
 * Feedback Service API
 * Service để gọi API feedback/review từ React
 */

import { authApi } from './authApi';
import { axiosClient } from './axiosClient';

export interface Feedback {
  _id: string;
  user: {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  product: {
    _id: string;
    name: string;
    price?: string;
    thumbnail?: string;
    slug?: string;
  };
  order?: {
    _id: string;
    orderNumber: string;
  };
  rating: number;
  title?: string;
  content: string;
  images?: string[];
  pros?: string[];
  cons?: string[];
  verified: boolean;
  helpful: number;
  notHelpful: number;
  status: 'pending' | 'approved' | 'rejected' | 'hidden';
  isAnonymous: boolean;
  response?: {
    content: string;
    respondedBy?: {
      _id: string;
      name: string;
      email: string;
    };
    respondedAt: string;
  };
  tags?: string[];
  deviceInfo?: {
    model?: string;
    color?: string;
    storage?: string;
    ram?: string;
  };
  purchaseDate?: string;
  usageDuration?: string;
  recommend?: boolean;
  reportedCount: number;
  moderatedBy?: string;
  moderatedAt?: string;
  moderationNote?: string;
  createdAt: string;
  updatedAt: string;
  canEdit?: boolean;
  canDelete?: boolean;
}

export interface FeedbackListResponse {
  data: Feedback[];
  pagination?: {
    currentPage: number;
    itemsPerPage: number;
    totalItems: number;
    totalPages: number;
  };
}

export interface FeedbackStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  hidden: number;
  averageRating: number;
  ratingDistribution: {
    rating: number;
    count: number;
  }[];
}

const feedbackService = {
  /**
   * Lấy danh sách feedbacks (Admin)
   */
  getFeedbacks: async (params?: {
    page?: number;
    limit?: number;
    product?: string;
    user?: string;
    rating?: number;
    status?: string;
    verified?: boolean;
    search?: string;
    searchText?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<FeedbackListResponse> => {
    const response = await authApi.get('/feedbacks', { params });
    return {
      data: response.data.data || [],
      pagination: response.data.pagination
    };
  },

  /**
   * Lấy feedback theo ID (Admin)
   */
  getFeedbackById: async (id: string): Promise<Feedback> => {
    const response = await authApi.get(`/feedbacks/${id}`);
    return response.data.data;
  },

  /**
   * Lấy feedbacks đang chờ duyệt (Admin)
   */
  getPendingFeedbacks: async (params?: {
    page?: number;
    limit?: number;
  }): Promise<FeedbackListResponse> => {
    const response = await authApi.get('/feedbacks/pending', { params });
    return {
      data: response.data.data || [],
      pagination: response.data.pagination
    };
  },

  /**
   * Cập nhật trạng thái feedback (Admin)
   */
  updateFeedbackStatus: async (
    id: string,
    status: 'pending' | 'approved' | 'rejected' | 'hidden',
    note?: string
  ): Promise<Feedback> => {
    const response = await authApi.put(`/feedbacks/${id}/status`, { status, note });
    return response.data.data;
  },

  /**
   * Phản hồi feedback (Admin/Seller)
   */
  respondToFeedback: async (id: string, content: string): Promise<Feedback> => {
    const response = await authApi.post(`/feedbacks/${id}/respond`, { content });
    return response.data.data;
  },

  /**
   * Xóa feedback (Admin)
   */
  deleteFeedback: async (id: string): Promise<void> => {
    await authApi.delete(`/feedbacks/${id}`);
  },

  /**
   * Lấy thống kê feedbacks (Admin)
   */
  getStats: async (productId?: string): Promise<FeedbackStats> => {
    const params = productId ? { productId } : {};
    const response = await authApi.get('/feedbacks/stats', { params });
    return response.data.data;
  },

  /**
   * Lấy feedbacks theo sản phẩm (Public)
   */
  getFeedbacksByProduct: async (
    productId: string,
    params?: {
      page?: number;
      limit?: number;
      rating?: number;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    }
  ): Promise<FeedbackListResponse & {
    ratingStats?: any;
    averageRating?: number;
    totalReviews?: number;
  }> => {
    const response = await axiosClient.get(`/feedbacks/product/${productId}`, { params });
    return {
      data: response.data.data || [],
      pagination: response.data.pagination,
      ratingStats: response.data.ratingStats,
      averageRating: response.data.averageRating,
      totalReviews: response.data.totalReviews
    };
  },

  /**
   * Tạo feedback mới (User)
   */
  createFeedback: async (feedbackData: {
    product: string;
    order?: string;
    rating: number;
    title?: string;
    content: string;
    images?: string[];
    pros?: string[];
    cons?: string[];
    isAnonymous?: boolean;
    deviceInfo?: {
      model?: string;
      color?: string;
      storage?: string;
      ram?: string;
    };
    purchaseDate?: string;
    usageDuration?: string;
    recommend?: boolean;
  }): Promise<Feedback> => {
    const response = await authApi.post('/feedbacks', feedbackData);
    return response.data.data;
  },

  /**
   * Cập nhật feedback (User)
   */
  updateFeedback: async (id: string, feedbackData: Partial<Feedback>): Promise<Feedback> => {
    const response = await authApi.put(`/feedbacks/${id}`, feedbackData);
    return response.data.data;
  },

  /**
   * Lấy feedbacks của user hiện tại
   */
  getMyFeedbacks: async (params?: {
    page?: number;
    limit?: number;
    product?: string;
    rating?: number;
    status?: string;
  }): Promise<FeedbackListResponse> => {
    const response = await authApi.get('/feedbacks/my-feedback', { params });
    return {
      data: response.data.data || [],
      pagination: response.data.pagination
    };
  },

  /**
   * Đánh dấu feedback hữu ích (User)
   */
  markHelpful: async (id: string, isHelpful: boolean = true): Promise<Feedback> => {
    const response = await authApi.post(`/feedbacks/${id}/helpful`, { isHelpful });
    return response.data.data;
  },

  /**
   * Báo cáo feedback (User)
   */
  reportFeedback: async (id: string, reason?: string): Promise<void> => {
    await authApi.post(`/feedbacks/${id}/report`, { reason });
  }
};

export default feedbackService;

