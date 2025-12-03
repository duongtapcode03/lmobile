/**
 * Phone/Product TypeScript Types
 * Types cho React frontend khi làm việc với phone data
 */

import type { Brand } from './brand.types';
import type { Category } from '../api/categoryService';

export interface PhoneImage {
  _id?: number;
  productId?: number;
  url: string;
  highResUrl?: string;
  alt?: string;
  color?: string;
  sortOrder?: number;
  isPrimary?: boolean;
}

export interface ColorVariant {
  name: string;
  imageUrl?: string;
}

export interface PhoneVersion {
  _id?: number;
  productId?: number;
  type?: 'storage' | 'color' | 'default' | 'other';
  sku?: string;
  label?: string;
  price?: string;
  priceNumber?: number;
  imageUrl?: string;
  isDefault?: boolean;
  sortOrder?: number;
}

export interface PhoneColor {
  name: string;
  sku?: string;
  price?: string;
  imageUrl?: string;
}

export interface Warranty {
  text: string;
}

export interface ContentToc {
  id: string;
  title: string;
}

export interface PhoneDetail {
  _id?: number;
  name: string;
  sku: string;
  brandRef: number | Brand; // Reference to Brand model - Number ID hoặc populated Brand object
  categoryRefs?: number[] | Category[]; // References to Category models - Number IDs hoặc populated Category objects
  
  // Pricing
  price?: string | null;
  oldPrice?: string | null;
  discount?: number | null; // Giảm giá (%)
  importPrice?: number; // Giá nhập
  memberPrice?: string | null;
  lastPrice?: string | null;
  discountRate?: string | null;
  installmentPrice?: string | null;
  memberDiscount?: string | null;
  points?: string | null;
  extraPoints?: string | null;
  
  // Product Details
  imageUrl?: string | null;
  thumbnail?: string | null; // Thumbnail image URL
  availability: number;
  cpu?: string | null;
  storage?: string | null;
  screenSize?: string | null;
  description?: string | null; // Mô tả chi tiết
  shortDescription?: string | null; // Mô tả ngắn
  
  // Stock & Stats
  stock?: number; // Số lượng tồn kho
  sold?: number; // Số lượng đã bán
  
  // Nested Arrays
  images?: PhoneImage[];
  colorVariants?: ColorVariant[];
  versions?: PhoneVersion[];
  colors?: PhoneColor[];
  promotions?: string[];
  morePromotionsCount?: number;
  warranty?: Warranty[];
  highlights?: string[];
  contentToc?: ContentToc[];
  
  // Specifications (Map/Record format)
  specifications?: Record<string, string>;
  
  // Metadata
  isActive?: boolean;
  sourceUrl?: string | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  
  // Quick Sale fields
  isQuickSale?: boolean;
  quickSaleImageUrl?: string;
  quickSaleTitle?: string;
  quickSaleAlt?: string;
  quickSaleUtmSource?: string;
  quickSaleUtmMedium?: string;
  quickSaleUtmCampaign?: string;
  quickSaleOrder?: number;
  slug?: string;
  linkUrl?: string;
  
  // Computed fields (from virtuals)
  priceNumber?: number;
  oldPriceNumber?: number;
  discountRateNumber?: number;
  hasDiscount?: boolean;
}

export interface PhoneListResponse {
  data: PhoneDetail[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PhoneFilter {
  category?: number | string; // Category ID (number or string for backward compatibility)
  brand?: number[] | string[] | string; // Brand IDs (numbers, strings, or comma-separated string)
  minPrice?: number;
  maxPrice?: number;
  storage?: string[];
  cpu?: string[];
  availability?: number; // 0 = out of stock, 1 = in stock
  search?: string;
  sortBy?: 'price' | 'name' | 'createdAt' | 'sold';
  sortOrder?: 'asc' | 'desc';
  featured?: boolean | string; // Filter featured products
  page?: number;
  limit?: number;
  // Additional filters (có thể được xử lý qua specifications)
  nfc?: string[];
  screenSize?: string[];
}

export interface PhoneStats {
  total: number;
  inStock: number;
  outOfStock: number;
  brands: string[];
  priceRange: {
    min: number;
    max: number;
  };
}


