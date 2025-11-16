/**
 * useProductFilters Hook
 * Hook để handle product filtering với debounce và API integration
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { message } from 'antd';
import phoneService from '../api/phoneService';
import type { PhoneDetail, PhoneListResponse, PhoneFilter } from '../types';
import type { FilterState } from '../components/CategorySidebar';

interface UseProductFiltersOptions {
  initialFilters?: FilterState;
  searchQuery?: string;
  sortBy?: string;
  featured?: boolean | string;
  productType?: 'featured' | 'new' | 'bestSeller'; // API mới: type từ URL
  page?: number;
  limit?: number;
  debounceMs?: number;
  onFilterChange?: (filters: FilterState) => void;
}

interface UseProductFiltersReturn {
  products: PhoneDetail[];
  loading: boolean;
  error: string | null;
  total: number;
  page: number;
  totalPages: number;
  limit: number;
  filters: FilterState;
  setFilters: (filters: FilterState) => void;
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;
  refetch: () => Promise<void>;
}

export const useProductFilters = (
  options: UseProductFiltersOptions = {}
): UseProductFiltersReturn => {
  const {
    initialFilters = {
      category: undefined,
      brands: [],
      priceRange: [0, 50000000],
    },
    searchQuery = '',
    sortBy = 'default',
    featured,
    productType,
    page: initialPage = 1,
    limit: initialLimit = 12,
    debounceMs = 500,
    onFilterChange,
  } = options;

  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [products, setProducts] = useState<PhoneDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(initialPage);
  const [limit, setLimit] = useState(initialLimit);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevInitialFiltersRef = useRef<string>('');
  const prevFiltersStrRef = useRef<string>('');

  // Sync initialFilters (from Redux) to local filters state
  useEffect(() => {
    if (initialFilters) {
      const currentFiltersStr = JSON.stringify(initialFilters);
      
      // Only update if filters actually changed
      if (prevInitialFiltersRef.current !== currentFiltersStr) {
        prevInitialFiltersRef.current = currentFiltersStr;
        console.log('🔄 Syncing filters from Redux:', initialFilters);
        setFilters(initialFilters);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    // Use JSON.stringify to compare objects, but only trigger when string changes
    JSON.stringify(initialFilters),
  ]);

  const fetchProducts = useCallback(async () => {
    // Include searchQuery and sortBy in dependencies
    try {
      setLoading(true);
      setError(null);

      // Convert FilterState to PhoneFilter (từ Redux state)
      // Map sortBy to PhoneFilter format
      let mappedSortBy: 'price' | 'name' | 'createdAt' | undefined;
      let sortOrder: 'asc' | 'desc' | undefined;
      
      if (sortBy && sortBy !== 'default') {
        if (sortBy === 'price_asc') {
          mappedSortBy = 'price';
          sortOrder = 'asc';
        } else if (sortBy === 'price_desc') {
          mappedSortBy = 'price';
          sortOrder = 'desc';
        } else if (sortBy === 'name_asc') {
          mappedSortBy = 'name';
          sortOrder = 'asc';
        } else if (sortBy === 'name_desc') {
          mappedSortBy = 'name';
          sortOrder = 'desc';
        } else if (sortBy === 'newest' || sortBy === 'oldest') {
          mappedSortBy = 'createdAt';
          sortOrder = sortBy === 'newest' ? 'desc' : 'asc';
        }
      }
      
      const phoneFilter: PhoneFilter = {
        page,
        limit,
        // Search
        ...(searchQuery && { search: searchQuery }),
        // Sort
        ...(mappedSortBy && { sortBy: mappedSortBy }),
        ...(sortOrder && { sortOrder }),
        // Featured
        ...(featured === true || featured === 'true' ? { featured: true } : {}),
        // Category
        ...(filters.category && { category: filters.category }),
        // Brands: Convert array to comma-separated string để backend dễ xử lý
        ...(filters.brands && filters.brands.length > 0 && { brand: filters.brands.join(',') }),
        // Price Range
        ...(filters.priceRange && {
          minPrice: filters.priceRange[0],
          maxPrice: filters.priceRange[1],
        }),
        // Storage: Convert array to comma-separated string để backend dễ xử lý
        ...(filters.storage && filters.storage.length > 0 && { storage: filters.storage.join(',') }),
        // Screen Size: Convert array to comma-separated string để backend dễ xử lý
        ...(filters.screenSize && filters.screenSize.length > 0 && { screenSize: filters.screenSize.join(',') }),
      };

      // Debug: Log filter để kiểm tra category có được truyền
      console.log('🔍 useProductFilters - Current filters:', filters);
      console.log('🔍 useProductFilters - PhoneFilter:', phoneFilter);
      console.log('🔍 useProductFilters - productType:', productType);

      let response: PhoneListResponse;

      // API mới: Nếu có productType, dùng API getPhonesByType (ưu tiên cao nhất)
      if (productType && ['featured', 'new', 'bestSeller'].includes(productType)) {
        console.log('✅ Using getPhonesByType API for type:', productType);
        
        response = await phoneService.getPhonesByType(productType, {
          page,
          limit,
          ...(mappedSortBy && { sortBy: mappedSortBy }),
          ...(sortOrder && { sortOrder }),
        });
      }
      // Kiểm tra xem có filter nào khác ngoài category không
      else {
        const hasOtherFilters = 
          (filters.brands && filters.brands.length > 0) ||
          (filters.priceRange && (filters.priceRange[0] > 0 || filters.priceRange[1] < 50000000)) ||
          filters.inStock !== undefined ||
          (filters.storage && filters.storage.length > 0) ||
          (filters.nfc && filters.nfc.length > 0) ||
          (filters.screenSize && filters.screenSize.length > 0);

        // Nếu có category và KHÔNG có filter khác, dùng API mới getPhonesByCategoryId
        if (filters.category && !hasOtherFilters && !searchQuery && sortBy === 'default') {
        console.log('✅ Using getPhonesByCategoryId API for category:', filters.category);
        
        // Convert category to number for API call
        const categoryId = typeof filters.category === 'number' 
          ? filters.category 
          : parseInt(String(filters.category), 10);
        
        response = await phoneService.getPhonesByCategoryId(categoryId, {
          page,
          limit
        });
      }
      // Nếu có category và KHÔNG có filter khác nhưng có search/sort, dùng API category đơn giản
      else if (filters.category && !hasOtherFilters) {
        console.log('✅ Using simple categoryRefs API for category:', filters.category);
        
        const categoryId = typeof filters.category === 'number' 
          ? filters.category 
          : filters.category;
        
        response = await phoneService.getPhonesByCategory(categoryId, {
          page,
          limit
        });
      }
      // Nếu có category và có filter khác, dùng API category với filters
      else if (filters.category) {
        console.log('✅ Using category API with filters for category:', filters.category);
        
        // Tách category ra khỏi filter để gọi API category
        const { category, ...otherFilters } = phoneFilter;
        
        response = await phoneService.getPhonesByCategory(filters.category, {
          ...otherFilters,
          page,
          limit,
        });
        } else {
          // Không có category, dùng API chung
          console.log('📋 Using general products API');
          response = await phoneService.getPhones(phoneFilter);
        }
      }

      setProducts(response.data || []);
      setTotal(response.total || 0);
      setTotalPages(response.totalPages || 1);
    } catch (err: any) {
      console.error('Error fetching filtered products:', err);
      setError(err.message || 'Không thể tải danh sách sản phẩm');
      message.error('Không thể tải danh sách sản phẩm');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [filters, searchQuery, sortBy, featured, productType, page, limit]);

  // Debounced filter change
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      fetchProducts();
      if (onFilterChange) {
        onFilterChange(filters);
      }
    }, debounceMs);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
    // Remove onFilterChange from dependencies to prevent infinite loop
    // onFilterChange is optional callback and may change on every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, searchQuery, sortBy, featured, productType, debounceMs, fetchProducts]);

  // Reset page when filters change (using JSON.stringify to compare objects)
  useEffect(() => {
    const filtersStr = JSON.stringify(filters);
    
    if (prevFiltersStrRef.current !== filtersStr && prevFiltersStrRef.current !== '') {
      // Only reset page if filters actually changed (not on initial mount)
      if (page !== 1) {
        setPage(1);
      }
    }
    prevFiltersStrRef.current = filtersStr;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(filters)]);

  // Fetch on page or limit change
  useEffect(() => {
    fetchProducts();
    // fetchProducts is already memoized with useCallback and includes all necessary dependencies
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit]);

  const refetch = useCallback(async () => {
    await fetchProducts();
  }, [fetchProducts]);

  return {
    products,
    loading,
    error,
    total,
    page,
    totalPages,
    limit,
    filters,
    setFilters,
    setPage,
    setLimit,
    refetch,
  };
};

