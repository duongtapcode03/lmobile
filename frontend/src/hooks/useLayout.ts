import { useState, useCallback } from 'react';

interface LayoutState {
  loading: boolean;
  error: string | null;
  empty: boolean;
}

interface UseLayoutReturn {
  layoutState: LayoutState;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setEmpty: (empty: boolean) => void;
  resetLayout: () => void;
  handleAsync: <T>(asyncFn: () => Promise<T>) => Promise<T | null>;
}

export const useLayout = (): UseLayoutReturn => {
  const [layoutState, setLayoutState] = useState<LayoutState>({
    loading: false,
    error: null,
    empty: false,
  });

  const setLoading = useCallback((loading: boolean) => {
    setLayoutState(prev => ({
      ...prev,
      loading,
      error: loading ? null : prev.error, // Clear error when loading
    }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setLayoutState(prev => ({
      ...prev,
      error,
      loading: false,
    }));
  }, []);

  const setEmpty = useCallback((empty: boolean) => {
    setLayoutState(prev => ({
      ...prev,
      empty,
      loading: false,
      error: null,
    }));
  }, []);

  const resetLayout = useCallback(() => {
    setLayoutState({
      loading: false,
      error: null,
      empty: false,
    });
  }, []);

  const handleAsync = useCallback(async <T>(asyncFn: () => Promise<T>): Promise<T | null> => {
    try {
      setLoading(true);
      setError(null);
      const result = await asyncFn();
      setLoading(false);
      return result;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Đã xảy ra lỗi');
      setLoading(false);
      return null;
    }
  }, [setLoading, setError]);

  return {
    layoutState,
    setLoading,
    setError,
    setEmpty,
    resetLayout,
    handleAsync,
  };
};
