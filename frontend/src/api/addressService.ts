/**
 * Address Service API
 * Service để gọi API address từ React
 */

import axiosClient from './axiosClient';
import { Address, AddressListResponse, AddressResponse } from '../types';

const addressService = {
  /**
   * Lấy tất cả địa chỉ của user
   */
  getAddresses: async (): Promise<Address[]> => {
    const response = await axiosClient.get<AddressListResponse>('/api/addresses');
    return response.data.data;
  },

  /**
   * Lấy địa chỉ mặc định
   */
  getDefaultAddress: async (): Promise<Address | null> => {
    try {
      const response = await axiosClient.get<AddressResponse>('/api/addresses/default');
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
    const response = await axiosClient.get<AddressResponse>(`/api/addresses/${id}`);
    return response.data.data;
  },

  /**
   * Tạo địa chỉ mới
   */
  createAddress: async (data: Partial<Address>): Promise<Address> => {
    const response = await axiosClient.post<AddressResponse>('/api/addresses', data);
    return response.data.data;
  },

  /**
   * Update địa chỉ
   */
  updateAddress: async (id: string, data: Partial<Address>): Promise<Address> => {
    const response = await axiosClient.put<AddressResponse>(`/api/addresses/${id}`, data);
    return response.data.data;
  },

  /**
   * Xóa địa chỉ
   */
  deleteAddress: async (id: string): Promise<void> => {
    await axiosClient.delete(`/api/addresses/${id}`);
  },

  /**
   * Set địa chỉ làm mặc định
   */
  setDefaultAddress: async (id: string): Promise<Address> => {
    const response = await axiosClient.put<AddressResponse>(`/api/addresses/${id}/default`);
    return response.data.data;
  }
};

export default addressService;

