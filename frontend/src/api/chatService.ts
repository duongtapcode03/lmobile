/**
 * Chat Service API
 * Service để gọi API chat từ React
 */

import { authApi } from './authApi';

export interface ChatMessage {
  _id: string;
  conversationId: string;
  senderId: string;
  senderType: 'user' | 'admin' | 'system';
  senderName: string;
  message: string;
  messageType: 'text' | 'image' | 'file' | 'system';
  attachments?: Array<{
    type: string;
    url: string;
    filename?: string;
    size?: number;
  }>;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatConversation {
  _id: string;
  userId: string;
  userName: string;
  userEmail?: string;
  adminId?: string;
  adminName?: string;
  status: 'open' | 'pending' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  subject?: string;
  lastMessage?: string;
  lastMessageAt: string;
  unreadCount: {
    user: number;
    admin: number;
  };
  tags?: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatListResponse {
  data: ChatConversation[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ChatMessagesResponse {
  data: ChatMessage[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const chatService = {
  /**
   * Lấy danh sách conversations
   */
  getConversations: async (params?: {
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<ChatListResponse> => {
    const response = await authApi.get('/chat/conversations', { params });
    return {
      data: response.data.data || [],
      pagination: response.data.pagination
    };
  },

  /**
   * Lấy chi tiết conversation
   */
  getConversation: async (conversationId: string): Promise<ChatConversation> => {
    const response = await authApi.get(`/chat/conversations/${conversationId}`);
    return response.data.data;
  },

  /**
   * Lấy tin nhắn của conversation
   */
  getMessages: async (
    conversationId: string,
    params?: {
      page?: number;
      limit?: number;
    }
  ): Promise<ChatMessagesResponse> => {
    const response = await authApi.get(`/chat/conversations/${conversationId}/messages`, { params });
    return {
      data: response.data.data || [],
      pagination: response.data.pagination
    };
  },

  /**
   * Gửi tin nhắn
   */
  sendMessage: async (
    conversationId: string,
    data: {
      message?: string;
      messageType?: 'text' | 'image' | 'file';
      attachments?: Array<{
        type: string;
        url: string;
        filename?: string;
        size?: number;
      }>;
    }
  ): Promise<ChatMessage> => {
    const response = await authApi.post(`/chat/conversations/${conversationId}/messages`, data);
    return response.data.data;
  },

  /**
   * Đánh dấu đã đọc
   */
  markAsRead: async (conversationId: string): Promise<void> => {
    await authApi.post(`/chat/conversations/${conversationId}/read`);
  }
};

export default chatService;



