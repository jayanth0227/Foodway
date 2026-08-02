import React from 'react';
import { ProtectedRoute } from '../auth/ProtectedRoute';

interface RestaurantRouteGuardProps {
  children: React.ReactElement;
}

export const RestaurantRouteGuard: React.FC<RestaurantRouteGuardProps> = ({ children }) => {
  return <ProtectedRoute allowedRoles={['RESTAURANT']}>{children}</ProtectedRoute>;
};

export default RestaurantRouteGuard;
