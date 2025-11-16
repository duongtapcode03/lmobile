/**
 * ProtectedRoute Component
 * Bảo vệ routes yêu cầu authentication
 */

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Spin } from 'antd';
import type { RootState } from '../../store';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'user' | 'seller' | 'admin';
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRole 
}) => {
  const location = useLocation();
  
  // Sử dụng Redux state thay vì localStorage
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  const user = useSelector((state: RootState) => state.auth.user);
  const token = useSelector((state: RootState) => state.auth.token);
  const role = useSelector((state: RootState) => (state.auth as any).role);
  
  // Check if Redux Persist has finished rehydrating
  // Redux Persist adds a _persist key to the state
  const persistState = useSelector((state: RootState) => (state.auth as any)?._persist);
  const isRehydrated = persistState?.rehydrated === true;
  
  // Check if we have auth data in Redux Persist
  const hasPersistData = !!localStorage.getItem('persist:auth');
  
  // Show loading while rehydrating (if we have persisted data but not yet rehydrated)
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

  // Check authentication from Redux state only
  const hasAuth = isAuthenticated && token && user;

  if (!hasAuth) {
    // Redirect to login với returnUrl
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role if required
  if (requiredRole) {
    const userRole = role || user?.role;
    if (userRole !== requiredRole) {
      // Redirect to appropriate dashboard based on actual role
      if (userRole === 'admin') {
        return <Navigate to="/admin" replace />;
      } else if (userRole === 'seller') {
        return <Navigate to="/seller" replace />;
      } else if (userRole === 'user') {
        return <Navigate to="/user" replace />;
      }
      // No role or invalid role, redirect to login
      return <Navigate to="/login" state={{ from: location }} replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;

