/**
 * Phone/Product TypeScript Types
 * Types cho React frontend khi làm việc với phone data
 */

export interface PhoneImage {
  url: string;
  highResUrl?: string;
  alt?: string;
  color?: string;
}

export interface ColorVariant {
  name: string;
  imageUrl?: string;
}

export interface PhoneVersion {
  sku?: string;
  label?: string;
  price?: string;
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
  _id?: string;
  name: string;
  sku: string;
  brandRef: string; // Reference to Brand model (required, many-to-one)
  categoryRefs?: string[]; // References to Category models (many-to-many)
  
  // Pricing
  price?: string | null;
  oldPrice?: string | null;
  discount?: string | null;
  memberPrice?: string | null;
  lastPrice?: string | null;
  discountRate?: string | null;
  installmentPrice?: string | null;
  memberDiscount?: string | null;
  points?: string | null;
  extraPoints?: string | null;
  
  // Product Details
  imageUrl?: string | null;
  availability: number;
  cpu?: string | null;
  storage?: string | null;
  screenSize?: string | null;
  
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
  brand?: string[];
  minPrice?: number;
  maxPrice?: number;
  storage?: string[];
  cpu?: string[];
  availability?: number; // 0 = out of stock, 1 = in stock
  search?: string;
  sortBy?: 'price' | 'name' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
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


