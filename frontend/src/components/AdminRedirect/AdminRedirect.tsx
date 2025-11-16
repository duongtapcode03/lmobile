/**
 * AdminRedirect Component
 * Tự động redirect admin về /admin nếu họ truy cập trang customer
 */

import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Spin } from 'antd';
import type { RootState } from '../../store';

interface AdminRedirectProps {
  children: React.ReactNode;
}

const AdminRedirect: React.FC<AdminRedirectProps> = ({ children }) => {
  const location = useLocation();
  const user = useSelector((state: RootState) => (state.auth as any).user);
  const isAuthenticated = useSelector((state: RootState) => (state.auth as any).isAuthenticated);
  
  // Check if Redux Persist has finished rehydrating
  const persistState = useSelector((state: RootState) => (state.auth as any)?._persist);
  const isRehydrated = persistState?.rehydrated === true;
  const hasPersistData = !!localStorage.getItem('persist:auth');
  const isRehydrating = !isRehydrated && hasPersistData;

  // Show loading while rehydrating
  if (isRehydrating) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '400px' 
      }}>
        <Spin size="large" />
      </div>
    );
  }

  // If user is admin and trying to access customer pages, redirect to admin
  if (isAuthenticated && user?.role === 'admin') {
    const isAdminRoute = location.pathname.startsWith('/admin');
    const isAuthRoute = ['/login', '/register', '/forgot-password', '/reset-password'].includes(location.pathname);
    
    // If admin is on customer pages (not admin routes and not auth routes), redirect to admin
    if (!isAdminRoute && !isAuthRoute) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[AdminRedirect] Redirecting admin from', location.pathname, 'to /admin');
      }
      return <Navigate to="/admin" replace />;
    }
  }

  return <>{children}</>;
};

export default AdminRedirect;

