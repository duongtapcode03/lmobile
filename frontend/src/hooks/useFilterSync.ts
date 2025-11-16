import { useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { setFilters } from '../features/filter/filterSlice';
import type { FilterState } from '../features/filter/filterSlice';

interface UseFilterSyncParams {
  selectedCategoryId: string | null;
  selectedBrands: string[];
  priceRange: [number, number];
  inStock: boolean;
  selectedStorage: string[];
  selectedNfc: string[];
  selectedScreenSize: string[];
}

/**
 * Custom hook để đồng bộ filter state với Redux
 * Tránh dispatch không cần thiết bằng cách so sánh JSON
 */
export const useFilterSync = (filters: UseFilterSyncParams): void => {
  const dispatch = useDispatch();
  const prevFiltersRef = useRef<string>('');

  useEffect(() => {
    const currentFilters: FilterState = {
      category: filters.selectedCategoryId || undefined,
      brands: filters.selectedBrands,
      priceRange: filters.priceRange,
      inStock: filters.inStock || undefined,
      storage: filters.selectedStorage.length > 0 ? filters.selectedStorage : undefined,
      nfc: filters.selectedNfc.length > 0 ? filters.selectedNfc : undefined,
      screenSize: filters.selectedScreenSize.length > 0 ? filters.selectedScreenSize : undefined,
    };

    // Serialize to compare
    const currentFiltersStr = JSON.stringify(currentFilters);

    // Only dispatch if filters actually changed
    if (currentFiltersStr !== prevFiltersRef.current) {
      prevFiltersRef.current = currentFiltersStr;
      dispatch(setFilters(currentFilters));
    }
    // Use JSON.stringify for arrays to prevent infinite loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    dispatch,
    filters.selectedCategoryId,
    JSON.stringify(filters.selectedBrands),
    JSON.stringify(filters.priceRange),
    filters.inStock,
    JSON.stringify(filters.selectedStorage),
    JSON.stringify(filters.selectedNfc),
    JSON.stringify(filters.selectedScreenSize),
  ]);
};

