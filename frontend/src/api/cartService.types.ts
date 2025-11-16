/**
 * Cart Service Types
 * Types for cart service (extracted for reuse)
 */

export interface CartItem {
  _id: string;
  product: {
    _id: string;
    name: string;
    price: number;
    thumbnail: string;
    stock: number;
    isActive: boolean;
  };
  quantity: number;
  variant?: {
    color?: string;
    storage?: string;
    ram?: string;
  };
  price: number;
  addedAt: string;
}

export interface Cart {
  _id: string;
  user: string;
  items: CartItem[];
  totalItems: number;
  totalAmount: number;
  shippingFee: number;
  discountAmount: number;
  couponCode?: string;
  lastUpdated: string;
  finalAmount: number;
  isEmpty: boolean;
}

export interface CartStats {
  totalItems: number;
  totalAmount: number;
  shippingFee: number;
  discountAmount: number;
  finalAmount: number;
  isEmpty: boolean;
}

export interface AddToCartData {
  productId: string;
  quantity?: number;
  variant?: {
    color?: string;
    storage?: string;
    ram?: string;
  };
}

export interface ShippingFeeCalculation {
  totalAmount: number;
  shippingMethod?: 'standard' | 'express' | 'same_day';
  province?: string;
}

