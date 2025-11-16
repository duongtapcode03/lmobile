/**
 * useRole Hook
 * Check role để render component
 */

import { useAuth } from './useAuth';
import { ROLES, type Role } from '../utils/constants';
import { hasRole, isAdmin, isSeller, isUser, isAdminOrSeller, canAccessAdmin, canAccessSeller } from '../utils/roleCheck';

export const useRole = () => {
  const { role } = useAuth();
  
  return {
    role,
    hasRole: (requiredRole: Role) => hasRole(role, requiredRole),
    isAdmin: () => isAdmin(role),
    isSeller: () => isSeller(role),
    isUser: () => isUser(role),
    isAdminOrSeller: () => isAdminOrSeller(role),
    canAccessAdmin: () => canAccessAdmin(role),
    canAccessSeller: () => canAccessSeller(role),
    ROLES,
  };
};

