/**
 * useFetch Hook
 * Gọi API với loading/error state management
 */

import { useState, useEffect, useCallback } from 'react';

interface UseFetchOptions<T> {
  immediate?: boolean;
  onSuccess?: (data: T) => void;
  onError?: (error: any) => void;
}

interface UseFetchReturn<T> {
  data: T | null;
  loading: boolean;
  error: any;
  execute: (...args: any[]) => Promise<T | undefined>;
  reset: () => void;
}

export const useFetch = <T = any>(
  fetchFn: (...args: any[]) => Promise<T>,
  options: UseFetchOptions<T> = {}
): UseFetchReturn<T> => {
  const { immediate = false, onSuccess, onError } = options;
  
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<any>(null);

  const execute = useCallback(
    async (...args: any[]): Promise<T | undefined> => {
      try {
        setLoading(true);
        setError(null);
        const result = await fetchFn(...args);
        setData(result);
        if (onSuccess) {
          onSuccess(result);
        }
        return result;
      } catch (err) {
        setError(err);
        if (onError) {
          onError(err);
        }
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [fetchFn, onSuccess, onError]
  );

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [immediate, execute]);

  return {
    data,
    loading,
    error,
    execute,
    reset,
  };
};

