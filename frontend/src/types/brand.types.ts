/**
 * Brand TypeScript Types
 * Types cho React frontend khi làm việc với brand data
 */

export interface Brand {
  _id?: number; // Number ID instead of ObjectId string
  name: string;
  slug: string;
  logoUrl?: string | null;
  description?: string | null;
  isActive?: boolean;
  sortOrder?: number;
  metaTitle?: string | null;
  metaDescription?: string | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  
  // Computed fields (from virtuals)
  productCount?: number;
  phoneDetailCount?: number;
}

export interface BrandListResponse {
  data: Brand[];
  total: number;
}

export interface BrandStats {
  brand: Brand;
  productCount: number;
  phoneDetailCount: number;
  totalItems: number;
}


