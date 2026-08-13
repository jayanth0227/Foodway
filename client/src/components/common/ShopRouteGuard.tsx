import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export const ShopRouteGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { role, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg-dark flex items-center justify-center text-primary font-bold">
        Loading Shop Console...
      </div>
    );
  }

  if (!isAuthenticated || (role !== 'SHOP' && role !== 'RESTAURANT' && role !== 'ADMIN')) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export const RestaurantRouteGuard = ShopRouteGuard;
export default ShopRouteGuard;
