/**
 * Payment Service API
 * Service để gọi API payment từ React
 */

import { authApi } from './authApi';

export interface MomoPaymentRequest {
  orderId?: string;
  orderNumber?: string;
  // Thông tin để tạo order sau khi thanh toán thành công
  cartData?: {
    selectedItemIds: string[];
    shippingAddress: any;
    paymentMethod: string;
    shippingMethod: string;
    notes?: string;
    isGift?: boolean;
    giftMessage?: string;
    flashSaleReservationIds?: string[];
  };
}

export interface MomoPaymentResponse {
  success: boolean;
  data: {
    payUrl: string; // Payment Link để redirect
    orderNumber: string;
    amount: number;
    shippingAddress?: {
      fullName: string;
      phone: string;
      email?: string;
      address: string;
      ward: string;
      district: string;
      province: string;
      postalCode?: string;
    };
  };
}

export interface VNPayPaymentRequest {
  orderId?: string;
  orderNumber?: string;
  // Thông tin để tạo order sau khi thanh toán thành công
  cartData?: {
    selectedItemIds: string[];
    shippingAddress: any;
    paymentMethod: string;
    shippingMethod: string;
    notes?: string;
    isGift?: boolean;
    giftMessage?: string;
    flashSaleReservationIds?: string[];
  };
}

export interface VNPayPaymentResponse {
  success: boolean;
  data: {
    paymentUrl: string; // Payment URL để redirect hoặc tạo QR code
    qrCodeUrl: string; // URL để tạo QR code
    orderNumber: string;
    amount: number;
    createDate: string;
    expireDate: string;
  };
}

const paymentService = {
  /**
   * Tạo payment request với MoMo
   */
  createMomoPayment: async (data: MomoPaymentRequest): Promise<MomoPaymentResponse> => {
    const response = await authApi.post('/payment/momo/create', data);
    return response.data;
  },

  /**
   * Tạo payment request với VNPay
   */
  createVNPayPayment: async (data: VNPayPaymentRequest): Promise<VNPayPaymentResponse> => {
    const response = await authApi.post('/payment/vnpay/create', data);
    return response.data;
  },

  /**
   * Tạo order sau khi thanh toán thành công (fallback khi pendingOrder bị mất)
   */
  createOrderAfterPayment: async (orderNumber: string, cartData: any): Promise<any> => {
    const response = await authApi.post('/payment/vnpay/create-order', {
      orderNumber,
      cartData
    });
    return response.data;
  }
};

export default paymentService;
