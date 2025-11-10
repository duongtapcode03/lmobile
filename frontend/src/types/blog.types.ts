/**
 * Blog TypeScript Types
 * Types cho React frontend khi làm việc với blog data
 */

export interface BlogImageSrcset {
  url: string;
  width: string;
  type?: string;
}

export interface BlogImage {
  url: string;
  alt?: string;
  width?: number;
  height?: number;
  srcset?: BlogImageSrcset[];
}

export interface BlogItem {
  title?: string | null;
  lstDescription: string[];
  image?: BlogImage | null;
}

export interface FeaturedImageData {
  original?: string;
  sizes?: string[];
}

export interface Blog {
  _id?: string;
  url?: string | null;
  title: string;
  subtitle?: string | null;
  slug?: string | null;
  
  // Author
  author?: string; // ObjectId reference
  authorName?: string | null;
  avatar?: string | null;
  
  // Content
  content?: string | null;
  excerpt?: string;
  blog_items?: BlogItem[];
  
  // Images
  featuredImage?: string;
  featuredImageData?: FeaturedImageData | null;
  images?: string[];
  
  // Metadata
  category?: 'news' | 'review' | 'guide' | 'promotion' | 'technology' | 'tips';
  tags?: string[];
  
  // Publishing
  status?: 'draft' | 'published' | 'archived';
  publishDate?: string | null;
  publishedAt?: string | Date;
  isFeatured?: boolean;
  isPinned?: boolean;
  
  // Statistics
  viewCount?: number;
  likeCount?: number;
  commentCount?: number;
  shareCount?: number;
  readingTime?: number;
  
  // SEO
  seoTitle?: string | null;
  seoDescription?: string | null;
  seoKeywords?: string[];
  
  // Relations
  relatedProducts?: string[]; // ObjectId references
  relatedBlogs?: string[]; // ObjectId references
  
  // Settings
  allowComments?: boolean;
  isPublic?: boolean;
  scheduledAt?: string | Date | null;
  lastModifiedBy?: string | null; // ObjectId reference
  
  // Metadata
  sourceUrl?: string | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  
  // Computed fields (from virtuals)
  isPublished?: boolean;
  canView?: boolean;
  estimatedReadingTime?: number;
  authorInfo?: any; // User object from populate
}

export interface BlogListResponse {
  data: Blog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface BlogFilter {
  category?: string[];
  status?: 'draft' | 'published' | 'archived';
  author?: string;
  search?: string;
  tags?: string[];
  isFeatured?: boolean;
  isPinned?: boolean;
  sortBy?: 'publishedAt' | 'createdAt' | 'viewCount' | 'title';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface BlogStats {
  total: number;
  published: number;
  draft: number;
  archived: number;
  categories: string[];
  tags: string[];
}


