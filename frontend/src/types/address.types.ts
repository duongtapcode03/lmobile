/**
 * Address TypeScript Types
 * Types cho React frontend khi làm việc với address data
 */

export interface Address {
  _id?: string;
  user?: string; // ObjectId reference
  fullName: string;
  phone: string;
  email?: string;
  address: string;
  ward: string;
  district: string;
  province: string;
  postalCode?: string;
  isDefault?: boolean;
  label?: "home" | "work" | "other" | "";
  note?: string;
  isActive?: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  
  // Computed fields (from virtuals)
  fullAddress?: string;
}

export interface AddressListResponse {
  success: boolean;
  data: Address[];
  total: number;
}

export interface AddressResponse {
  success: boolean;
  data: Address;
  message?: string;
}

