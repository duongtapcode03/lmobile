/**
 * Wishlist TypeScript Types
 * Types cho React frontend khi làm việc với wishlist data
 */

export interface WishlistItem {
  product: any; // Product object (populated)
  addedAt: string | Date;
  note?: string;
}

export interface Wishlist {
  _id?: string;
  user?: string; // ObjectId reference
  items: WishlistItem[];
  isPublic?: boolean;
  shareToken?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  
  // Computed fields (from virtuals)
  totalItems?: number;
  isEmpty?: boolean;
}

export interface WishlistResponse {
  success: boolean;
  data: Wishlist;
  message?: string;
}

