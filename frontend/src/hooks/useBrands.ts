import { useState, useEffect } from 'react';
import brandService from '../api/brandService';
import type { Brand } from '../types';

interface UseBrandsReturn {
  brands: Brand[];
  loading: boolean;
  error: Error | null;
}

/**
 * Custom hook để load và quản lý brands
 * Tách logic ra khỏi component
 */
export const useBrands = (isActive = true): UseBrandsReturn => {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchBrands = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await brandService.getBrands({ isActive });
        
        if (isMounted) {
          setBrands(response.data || []);
        }
      } catch (err) {
        if (isMounted) {
          const error = err instanceof Error ? err : new Error('Failed to load brands');
          setError(error);
          setBrands([]);
          console.warn('Failed to load brands:', err);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchBrands();

    return () => {
      isMounted = false;
    };
  }, [isActive]);

  return { brands, loading, error };
};
















