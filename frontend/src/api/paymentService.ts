/**
 * Payment Service API
 * Service để gọi API payment từ React
 */

import { authApi } from './authApi';

export interface MomoPaymentRequest {
  orderId?: string;
  orderNumber?: string;
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

const paymentService = {
  /**
   * Tạo payment request với MoMo
   */
  createMomoPayment: async (data: MomoPaymentRequest): Promise<MomoPaymentResponse> => {
    const response = await authApi.post('/payment/momo/create', data);
    return response.data;
  }
};

export default paymentService;

