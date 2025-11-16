/**
 * useAuth Hook
 * Lấy thông tin user, role từ Redux store
 */

import { useSelector } from 'react-redux';
import type { RootState } from '../store';

export const useAuth = () => {
  const auth = useSelector((state: RootState) => state.auth);
  
  return {
    user: auth.user,
    isAuthenticated: auth.isAuthenticated,
    token: auth.token,
    refreshToken: auth.refreshToken,
    role: auth.role,
    rememberMe: auth.rememberMe,
  };
};

