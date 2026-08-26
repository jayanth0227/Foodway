import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import type { Role } from '../../types/auth.types';

interface PublicCustomerRouteProps {
  children: React.ReactElement;
}

export const PublicCustomerRoute: React.FC<PublicCustomerRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading, role } = useAuth();

  if (isLoading) {
    return children;
  }

  // Guests (unauthenticated users) can freely view public customer pages
  if (!isAuthenticated || !role) {
    return children;
  }

  const userRole = (role || '').toUpperCase() as Role;
  const isShopVendor = ['RESTAURANT', 'SHOP', 'VENDOR'].includes(userRole as string);

  // Management roles (ADMIN, SHOP/RESTAURANT, DELIVERY_PARTNER) are redirected to their respective dashboards when logged in
  if (userRole === 'ADMIN') {
    return <Navigate to="/admin/dashboard" replace />;
  } else if (isShopVendor) {
    return <Navigate to="/shop/dashboard" replace />;
  } else if (userRole === 'DELIVERY_PARTNER' || (userRole as string) === 'DELIVERY' || (userRole as string) === 'RIDER') {
    return <Navigate to="/delivery/dashboard" replace />;
  }

  // Regular USER customers can freely view public pages while logged in
  return children;
};

export default PublicCustomerRoute;
