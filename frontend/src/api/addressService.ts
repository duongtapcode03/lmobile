/**
 * Address Service API
 * Service để gọi API address từ React
 */

import { authApi } from './authApi'; // Tất cả APIs cần authentication
import type { Address, AddressListResponse, AddressResponse } from '../types';

const addressService = {
  /**
   * Lấy tất cả địa chỉ của user
   */
  getAddresses: async (): Promise<Address[]> => {
    const response = await authApi.get<AddressListResponse>('/addresses');
    return response.data.data;
  },

  /**
   * Lấy địa chỉ mặc định
   */
  getDefaultAddress: async (): Promise<Address | null> => {
    try {
      const response = await authApi.get<AddressResponse>('/addresses/default');
      return response.data.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  /**
   * Lấy địa chỉ theo ID
   */
  getAddressById: async (id: string): Promise<Address> => {
    const response = await authApi.get<AddressResponse>(`/addresses/${id}`);
    return response.data.data;
  },

  /**
   * Tạo địa chỉ mới
   */
  createAddress: async (data: Partial<Address>): Promise<Address> => {
    const response = await authApi.post<AddressResponse>('/addresses', data);
    return response.data.data;
  },

  /**
   * Update địa chỉ
   */
  updateAddress: async (id: string, data: Partial<Address>): Promise<Address> => {
    const response = await authApi.put<AddressResponse>(`/addresses/${id}`, data);
    return response.data.data;
  },

  /**
   * Xóa địa chỉ
   */
  deleteAddress: async (id: string): Promise<void> => {
    await authApi.delete(`/addresses/${id}`);
  },

  /**
   * Set địa chỉ làm mặc định
   */
  setDefaultAddress: async (id: string): Promise<Address> => {
    const response = await authApi.put<AddressResponse>(`/addresses/${id}/default`);
    return response.data.data;
  }
};

export default addressService;

