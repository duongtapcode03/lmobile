import { useState, useEffect } from 'react';
import { message } from 'antd';
import phoneService from '../api/phoneService';
import categoryService from '../api/categoryService';
import bannerService from '../api/bannerService';
import flashSaleService from '../api/flashSaleService';
import type { Category } from '../api/categoryService';
import type { PhoneDetail } from '../types';
import type { Banner } from '../components/BannerCarousel';
import type { FlashSale } from '../api/flashSaleService';

interface UseHomePageDataReturn {
  loading: boolean;
  error: string | null;
  banners: Banner[];
  categories: Category[];
  quickSaleProducts: PhoneDetail[];
  flashSales: FlashSale[];
  featuredProducts: PhoneDetail[];
  newProducts: PhoneDetail[];
  bestSellerProducts: PhoneDetail[];
}

/**
 * Custom hook để load data cho HomePage
 * Tách logic load data ra khỏi component để dễ test và tái sử dụng
 */
export const useHomePageData = (): UseHomePageDataReturn => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [quickSaleProducts, setQuickSaleProducts] = useState<PhoneDetail[]>([]);
  const [flashSales, setFlashSales] = useState<FlashSale[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<PhoneDetail[]>([]);
  const [newProducts, setNewProducts] = useState<PhoneDetail[]>([]);
  const [bestSellerProducts, setBestSellerProducts] = useState<PhoneDetail[]>([]);

  useEffect(() => {
    let isMounted = true;
    let isCancelled = false;

    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Load banners từ API (try-catch để không block các API khác)
        // Sử dụng cache và deduplication để tránh gọi API nhiều lần
        try {
          const bannersData = await bannerService.getActiveBanners(true); // useCache = true
          if (isMounted && !isCancelled) {
            setBanners(bannersData);
          }
        } catch (bannerError: any) {
          // Xử lý lỗi 429 (Too Many Requests) - cache sẽ tự động fallback
          if (bannerError?.response?.status !== 429) {
            console.warn('Failed to load banners:', bannerError);
          }
          // Không set error để không block các API khác
          if (isMounted && !isCancelled) {
            setBanners([]);
          }
        }

        // Delay nhỏ giữa các API calls để tránh rate limit
        await new Promise(resolve => setTimeout(resolve, 100));

        // Load categories (với cache và deduplication)
        try {
          const categoriesResponse = await categoryService.getActiveCategories(true); // useCache = true
          if (isMounted && !isCancelled) {
            setCategories(categoriesResponse.data);
          }
        } catch (categoryError: any) {
          // Xử lý lỗi 429 - cache sẽ tự động fallback
          if (categoryError?.response?.status !== 429) {
            console.warn('Failed to load categories:', categoryError);
          }
          if (isMounted && !isCancelled) {
            setCategories([]);
          }
        }

        // Delay nhỏ giữa các API calls
        await new Promise(resolve => setTimeout(resolve, 100));

        // Load quick sale products (try-catch để không block các API khác)
        try {
          const quickSaleResponse = await phoneService.getQuickSalePhones(8);
          if (isMounted && !isCancelled) {
            setQuickSaleProducts(quickSaleResponse);
          }
        } catch (quickSaleError) {
          console.warn('Failed to load quick sale products:', quickSaleError);
          // Không set error để không block các API khác
          if (isMounted && !isCancelled) {
            setQuickSaleProducts([]);
          }
        }

        // Delay giữa các product API calls
        await new Promise(resolve => setTimeout(resolve, 100));

        // Load flash sales (try-catch để không block các API khác)
        try {
          const flashSaleResponse = await flashSaleService.getActiveFlashSales({
            page: 1,
            limit: 8,
            sortBy: 'sort_order',
            sortOrder: 'asc',
          });
          if (isMounted && !isCancelled) {
            setFlashSales(flashSaleResponse.data || []);
          }
        } catch (flashSaleError) {
          console.warn('Failed to load flash sales:', flashSaleError);
          if (isMounted && !isCancelled) {
            setFlashSales([]);
          }
        }

        // Delay giữa các product API calls
        await new Promise(resolve => setTimeout(resolve, 100));

        // Load featured products (API mới: /products/by-type/featured)
        try {
          const featuredResponse = await phoneService.getPhonesByType('featured', { page: 1, limit: 8 });
          if (isMounted && !isCancelled) {
            setFeaturedProducts(featuredResponse.data || []);
          }
        } catch (featuredError) {
          console.warn('Failed to load featured products:', featuredError);
          if (isMounted && !isCancelled) {
            setFeaturedProducts([]);
          }
        }

        // Delay giữa các product API calls
        await new Promise(resolve => setTimeout(resolve, 100));

        // Load new products (API mới: /products/by-type/new)
        try {
          const newProductsResponse = await phoneService.getPhonesByType('new', { page: 1, limit: 8 });
          if (isMounted && !isCancelled) {
            setNewProducts(newProductsResponse.data || []);
          }
        } catch (newProductsError) {
          console.warn('Failed to load new products:', newProductsError);
          if (isMounted && !isCancelled) {
            setNewProducts([]);
          }
        }

        // Delay giữa các product API calls
        await new Promise(resolve => setTimeout(resolve, 100));

        // Load best seller products (API mới: /products/by-type/bestSeller)
        try {
          const bestSellerResponse = await phoneService.getPhonesByType('bestSeller', { page: 1, limit: 8 });
          if (isMounted && !isCancelled) {
            setBestSellerProducts(bestSellerResponse.data || []);
          }
        } catch (bestSellerError) {
          console.warn('Failed to load best seller products:', bestSellerError);
          if (isMounted && !isCancelled) {
            setBestSellerProducts([]);
          }
        }

      } catch (err: any) {
        console.error('Error loading homepage data:', err);
        if (isMounted && !isCancelled) {
          setError(err.message || 'Không thể tải dữ liệu trang chủ');
          message.error('Không thể tải dữ liệu trang chủ');
        }
      } finally {
        if (isMounted && !isCancelled) {
          setLoading(false);
        }
      }
    };

    loadData();

    // Cleanup function
    return () => {
      isMounted = false;
      isCancelled = true;
    };
  }, []);

  return {
    loading,
    error,
    banners,
    categories,
    quickSaleProducts,
    flashSales,
    featuredProducts,
    newProducts,
    bestSellerProducts,
  };
};






