/**
 * Router Configuration
 * Tổ chức routes theo role: customer, admin, auth
 */

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { UserLayout } from '../layouts';
import { AdminLayout } from '../admin/layouts';
import SellerLayout from '../admin/layouts/SellerLayout/SellerLayout';
import { ProtectedRoute } from '../components';
import AdminRedirect from '../components/AdminRedirect';

// Auth Pages
import LoginPage from '../pages/auth/Login/Login';
import RegisterPage from '../pages/auth/Register/Register';
import ForgotPasswordPage from '../pages/auth/ForgotPassword/ForgotPassword';
import ResetPasswordPage from '../pages/auth/ResetPassword/ResetPassword';

// User Pages (migrated from customer)
import HomePage from '../pages/user/Home/Home';
import ProductsPage from '../pages/user/Products/Products';
import CategoryPage from '../pages/user/Category/Category';
import ProductDetailPage from '../pages/ProductDetailPage/ProductDetailPage';
import NewsListPage from '../pages/user/NewsList/NewsList';
import NewsDetailPage from '../pages/user/NewsDetail/NewsDetail';
import CartPage from '../pages/user/Cart/Cart';
import WishlistPage from '../pages/user/Wishlist/Wishlist';
import OrderHistoryPage from '../pages/user/OrderHistory/OrderHistory';
import OrderDetailPage from '../pages/user/OrderDetail/OrderDetail';
import CheckoutPage from '../pages/user/Checkout/Checkout';
import ProfilePage from '../pages/user/Profile/Profile';
import PaymentSuccessPage from '../pages/user/PaymentSuccess/PaymentSuccess';
import PaymentFailedPage from '../pages/user/PaymentFailed/PaymentFailed';
import FlashSalesPage from '../pages/user/FlashSales/FlashSales';

// Admin Pages
import AdminDashboard from '../pages/admin/Dashboard/Dashboard';
import AdminProducts from '../pages/admin/Products/Products';
import AdminCategories from '../pages/admin/Categories/Categories';
import AdminOrders from '../pages/admin/Orders/Orders';
import AdminUsers from '../pages/admin/Users/Users';
import AdminBanners from '../pages/admin/Banners/Banners';
import AdminBrands from '../pages/admin/Brands/Brands';
import AdminBlogs from '../pages/admin/Blogs/Blogs';
import AdminVouchers from '../pages/admin/Vouchers/Vouchers';
import AdminReviews from '../pages/admin/Reviews/Reviews';
import AdminFlashSales from '../pages/admin/FlashSales/FlashSales';

// Seller Pages
import SellerDashboard from '../pages/seller/Dashboard/Dashboard';
import SellerProducts from '../pages/seller/Products/Products';
import SellerOrders from '../pages/seller/Orders/Orders';
import SellerCategories from '../pages/seller/Categories/Categories';
import SellerBlogs from '../pages/seller/Blogs/Blogs';

const AppRouter: React.FC = () => {
  return (
    <Routes>
      {/* Auth Routes - AuthLayout is already wrapped in each page component */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* Customer Routes - UserLayout */}
      <Route
        path="/"
        element={
          <AdminRedirect>
            <UserLayout>
              <HomePage />
            </UserLayout>
          </AdminRedirect>
        }
      />
      <Route
        path="/products"
        element={
          <AdminRedirect>
            <UserLayout>
              <ProductsPage />
            </UserLayout>
          </AdminRedirect>
        }
      />
      <Route
        path="/flash-sales"
        element={
          <AdminRedirect>
            <UserLayout>
              <FlashSalesPage />
            </UserLayout>
          </AdminRedirect>
        }
      />
      <Route
        path="/category/:slug"
        element={
          <AdminRedirect>
            <UserLayout>
              <CategoryPage />
            </UserLayout>
          </AdminRedirect>
        }
      />
      <Route
        path="/products/:id"
        element={
          <AdminRedirect>
            <UserLayout>
              <ProductDetailPage />
            </UserLayout>
          </AdminRedirect>
        }
      />
      <Route
        path="/products/slug/:slug"
        element={
          <AdminRedirect>
            <UserLayout>
              <ProductDetailPage />
            </UserLayout>
          </AdminRedirect>
        }
      />
      <Route
        path="/news"
        element={
          <AdminRedirect>
            <UserLayout>
              <NewsListPage />
            </UserLayout>
          </AdminRedirect>
        }
      />
      <Route
        path="/news/id/:id"
        element={
          <AdminRedirect>
            <UserLayout>
              <NewsDetailPage />
            </UserLayout>
          </AdminRedirect>
        }
      />
      <Route
        path="/news/:slug"
        element={
          <AdminRedirect>
            <UserLayout>
              <NewsDetailPage />
            </UserLayout>
          </AdminRedirect>
        }
      />

      {/* User Routes - Protected */}
      <Route
        path="/user/*"
        element={
          <UserLayout>
            <ProtectedRoute requiredRole="user">
              <Routes>
                <Route path="dashboard" element={<HomePage />} />
                <Route path="cart" element={<CartPage />} />
                <Route path="wishlist" element={<WishlistPage />} />
                <Route path="orders" element={<OrderHistoryPage />} />
                <Route path="orders/:id" element={<OrderDetailPage />} />
                <Route path="checkout" element={<CheckoutPage />} />
                <Route path="profile" element={<ProfilePage />} />
                <Route path="*" element={<Navigate to="/user/dashboard" replace />} />
              </Routes>
            </ProtectedRoute>
          </UserLayout>
        }
      />

      {/* Seller Routes - Protected */}
      <Route
        path="/seller/*"
        element={
          <SellerLayout>
            <ProtectedRoute requiredRole="seller">
              <Routes>
                <Route path="dashboard" element={<SellerDashboard />} />
                <Route path="products" element={<SellerProducts />} />
                <Route path="orders" element={<SellerOrders />} />
                <Route path="categories" element={<SellerCategories />} />
                <Route path="blogs" element={<SellerBlogs />} />
                <Route path="*" element={<Navigate to="/seller/dashboard" replace />} />
              </Routes>
            </ProtectedRoute>
          </SellerLayout>
        }
      />

      {/* Protected Customer Routes - Backward compatibility */}
      <Route
        path="/cart"
        element={
          <AdminRedirect>
            <UserLayout>
              <ProtectedRoute requiredRole="user">
                <CartPage />
              </ProtectedRoute>
            </UserLayout>
          </AdminRedirect>
        }
      />
      <Route
        path="/checkout"
        element={
          <AdminRedirect>
            <UserLayout>
              <ProtectedRoute requiredRole="user">
                <CheckoutPage />
              </ProtectedRoute>
            </UserLayout>
          </AdminRedirect>
        }
      />
      <Route
        path="/wishlist"
        element={
          <AdminRedirect>
            <UserLayout>
              <ProtectedRoute requiredRole="user">
                <WishlistPage />
              </ProtectedRoute>
            </UserLayout>
          </AdminRedirect>
        }
      />
      <Route
        path="/orders"
        element={
          <AdminRedirect>
            <UserLayout>
              <ProtectedRoute requiredRole="user">
                <OrderHistoryPage />
              </ProtectedRoute>
            </UserLayout>
          </AdminRedirect>
        }
      />
      <Route
        path="/orders/:id"
        element={
          <AdminRedirect>
            <UserLayout>
              <ProtectedRoute requiredRole="user">
                <OrderDetailPage />
              </ProtectedRoute>
            </UserLayout>
          </AdminRedirect>
        }
      />
      <Route
        path="/profile"
        element={
          <AdminRedirect>
            <UserLayout>
              <ProtectedRoute requiredRole="user">
                <ProfilePage />
              </ProtectedRoute>
            </UserLayout>
          </AdminRedirect>
        }
      />
      <Route
        path="/payment/success"
        element={
          <AdminRedirect>
            <UserLayout>
              <PaymentSuccessPage />
            </UserLayout>
          </AdminRedirect>
        }
      />
      <Route
        path="/payment/failed"
        element={
          <AdminRedirect>
            <UserLayout>
              <PaymentFailedPage />
            </UserLayout>
          </AdminRedirect>
        }
      />

      {/* Admin Routes - AdminLayout */}
      {/* Đặt các route con trước route /admin để tránh match sai */}
      <Route
        path="/admin/products"
        element={
          <AdminLayout>
            <ProtectedRoute requiredRole="admin">
              <AdminProducts />
            </ProtectedRoute>
          </AdminLayout>
        }
      />
      <Route
        path="/admin/categories"
        element={
          <AdminLayout>
            <ProtectedRoute requiredRole="admin">
              <AdminCategories />
            </ProtectedRoute>
          </AdminLayout>
        }
      />
      <Route
        path="/admin/orders"
        element={
          <AdminLayout>
            <ProtectedRoute requiredRole="admin">
              <AdminOrders />
            </ProtectedRoute>
          </AdminLayout>
        }
      />
      <Route
        path="/admin/users"
        element={
          <AdminLayout>
            <ProtectedRoute requiredRole="admin">
              <AdminUsers />
            </ProtectedRoute>
          </AdminLayout>
        }
      />
      <Route
        path="/admin/banners"
        element={
          <AdminLayout>
            <ProtectedRoute requiredRole="admin">
              <AdminBanners />
            </ProtectedRoute>
          </AdminLayout>
        }
      />
      <Route
        path="/admin/brands"
        element={
          <AdminLayout>
            <ProtectedRoute requiredRole="admin">
              <AdminBrands />
            </ProtectedRoute>
          </AdminLayout>
        }
      />
      <Route
        path="/admin/blogs"
        element={
          <AdminLayout>
            <ProtectedRoute requiredRole="admin">
              <AdminBlogs />
            </ProtectedRoute>
          </AdminLayout>
        }
      />
      <Route
        path="/admin/vouchers"
        element={
          <AdminLayout>
            <ProtectedRoute requiredRole="admin">
              <AdminVouchers />
            </ProtectedRoute>
          </AdminLayout>
        }
      />
      <Route
        path="/admin/reviews"
        element={
          <AdminLayout>
            <ProtectedRoute requiredRole="admin">
              <AdminReviews />
            </ProtectedRoute>
          </AdminLayout>
        }
      />
      <Route
        path="/admin/flash-sales"
        element={
          <AdminLayout>
            <ProtectedRoute requiredRole="admin">
              <AdminFlashSales />
            </ProtectedRoute>
          </AdminLayout>
        }
      />
      <Route
        path="/admin/settings"
        element={
          <AdminLayout>
            <ProtectedRoute requiredRole="admin">
              <div>Settings - Coming soon</div>
            </ProtectedRoute>
          </AdminLayout>
        }
      />
      {/* Route /admin phải đặt cuối cùng để không match các route con */}
      <Route
        path="/admin"
        element={
          <AdminLayout>
            <ProtectedRoute requiredRole="admin">
              <AdminDashboard />
            </ProtectedRoute>
          </AdminLayout>
        }
      />

      {/* 404 - Redirect to home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRouter;

