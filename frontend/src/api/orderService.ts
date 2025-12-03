/**
 * Order Service API
 * Service để gọi API order từ React
 */

import { authApi } from './authApi'; // Tất cả APIs cần authentication

export interface OrderItem {
  product: {
    _id: string;
    name: string;
    imageUrl?: string;
  };
  productName: string;
  productImage: string;
  quantity: number;
  variant?: {
    color?: string;
    storage?: string;
    ram?: string;
  };
  price: number;
  importPrice?: number;
  totalPrice: number;
}

export interface ShippingAddress {
  fullName: string;
  phone: string;
  email?: string;
  address: string;
  ward: string;
  district: string;
  province: string;
  postalCode?: string;
  note?: string;
}

export interface PaymentInfo {
  method: 'cod' | 'bank_transfer' | 'credit_card' | 'momo' | 'zalopay' | 'vnpay';
  status: 'pending' | 'paid' | 'failed' | 'refunded';
  transactionId?: string;
  paidAt?: string;
  refundedAt?: string;
}

export interface Order {
  _id: string;
  orderNumber: string;
  user: string | {
    _id: string;
    name: string;
    email: string;
    phone: string;
  };
  items: OrderItem[];
  shippingAddress: ShippingAddress;
  paymentInfo: PaymentInfo;
  subtotal: number;
  shippingFee: number;
  discountAmount: number;
  couponCode?: string;
  totalAmount: number;
  status: 'pending' | 'confirmed' | 'processing' | 'shipping' | 'delivered' | 'cancelled' | 'returned';
  shippingMethod: 'standard' | 'express' | 'same_day';
  trackingNumber?: string;
  estimatedDelivery?: string;
  deliveredAt?: string;
  notes?: string;
  statusHistory: Array<{
    status: string;
    note?: string;
    updatedBy?: string;
    updatedAt: string;
  }>;
  isGift?: boolean;
  giftMessage?: string;
  source: 'web' | 'mobile' | 'admin';
  createdAt: string;
  updatedAt: string;
  canCancel: boolean;
  canReturn: boolean;
  totalItems: number;
}

export interface CreateOrderFromCartData {
  shippingAddress: ShippingAddress;
  paymentMethod: 'cod' | 'bank_transfer' | 'credit_card' | 'momo' | 'zalopay' | 'vnpay';
  shippingMethod?: 'standard' | 'express' | 'same_day';
  notes?: string;
  isGift?: boolean;
  giftMessage?: string;
  selectedItemIds?: string[]; // Danh sách item IDs được chọn để thanh toán
  flashSaleReservationIds?: string[]; // Danh sách reservation IDs nếu có flash sale items
}

export interface UpdatePaymentInfoData {
  status: 'pending' | 'paid' | 'failed' | 'refunded';
  transactionId?: string;
}

export interface OrderStats {
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
  confirmedOrders: number;
  processingOrders?: number;
  shippingOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  returnedOrders?: number;
}

const orderService = {
  /**
   * Tạo đơn hàng từ giỏ hàng
   */
  createFromCart: async (data: CreateOrderFromCartData): Promise<Order> => {
    const response = await authApi.post('/orders/create-from-cart', data);
    return response.data.data;
  },

  /**
   * Lấy danh sách đơn hàng của user
   */
  getMyOrders: async (params?: {
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    data: Order[];
    pagination?: {
      currentPage: number;
      totalPages: number;
      totalItems: number;
      itemsPerPage: number;
    };
  }> => {
    const response = await authApi.get('/orders/my-orders', { params });
    // Backend trả về: { success: true, data: [...], pagination: {...} }
    return {
      data: response.data.data || [],
      pagination: response.data.pagination
    };
  },

  /**
   * Lấy chi tiết đơn hàng theo ID
   */
  getOrderById: async (orderId: string): Promise<Order> => {
    const response = await authApi.get(`/orders/${orderId}`);
    return response.data.data;
  },

  /**
   * Lấy đơn hàng theo order number
   */
  getOrderByNumber: async (orderNumber: string): Promise<Order> => {
    const response = await authApi.get(`/orders/number/${orderNumber}`);
    return response.data.data;
  },

  /**
   * Tìm kiếm đơn hàng theo order number (public, không cần auth)
   */
  searchByOrderNumber: async (orderNumber: string): Promise<Order> => {
    const response = await authApi.get(`/orders/search/${orderNumber}`);
    return response.data.data;
  },

  /**
   * Hủy đơn hàng
   */
  cancelOrder: async (orderId: string, reason?: string): Promise<Order> => {
    const response = await authApi.put(`/orders/${orderId}/cancel`, { reason });
    return response.data.data;
  },

  /**
   * Cập nhật thông tin thanh toán
   */
  updatePaymentInfo: async (orderId: string, data: UpdatePaymentInfoData): Promise<Order> => {
    const response = await authApi.put(`/orders/${orderId}/payment`, data);
    return response.data.data;
  },

  /**
   * Lấy thống kê đơn hàng của user
   */
  getStats: async (): Promise<OrderStats> => {
    const response = await authApi.get('/orders/stats');
    return response.data.data;
  },

  /**
   * Lấy tất cả đơn hàng (Admin/Seller)
   */
  getAllOrders: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
    paymentStatus?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{
    data: Order[];
    pagination?: {
      currentPage: number;
      totalPages: number;
      totalItems: number;
      itemsPerPage: number;
    };
  }> => {
    const response = await authApi.get('/orders', { params });
    return {
      data: response.data.data || [],
      pagination: response.data.pagination
    };
  },

  /**
   * Cập nhật trạng thái đơn hàng (Admin/Seller)
   */
  updateOrderStatus: async (orderId: string, status: string, note?: string): Promise<Order> => {
    const response = await authApi.put(`/orders/${orderId}/status`, { status, note });
    return response.data.data;
  },

  /**
   * Cập nhật mã vận đơn (Admin/Seller)
   */
  updateTrackingNumber: async (orderId: string, trackingNumber: string): Promise<Order> => {
    const response = await authApi.put(`/orders/${orderId}/tracking`, { trackingNumber });
    return response.data.data;
  },

  /**
   * Xác nhận đơn hàng (Admin/Seller)
   */
  confirmOrder: async (orderId: string): Promise<Order> => {
    const response = await authApi.put(`/orders/${orderId}/confirm`);
    return response.data.data;
  },

  /**
   * Đánh dấu đã giao hàng (Admin/Seller)
   */
  markAsDelivered: async (orderId: string): Promise<Order> => {
    const response = await authApi.put(`/orders/${orderId}/delivered`);
    return response.data.data;
  }
};

export default orderService;

