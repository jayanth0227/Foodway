import React from 'react';
import { Navigate } from 'react-router-dom';

interface RestaurantRouteGuardProps {
  children: React.ReactElement;
}

export const RestaurantRouteGuard: React.FC<RestaurantRouteGuardProps> = ({ children }) => {
  const authRaw = localStorage.getItem('restaurantAuth') || sessionStorage.getItem('restaurantAuth');

  if (!authRaw) {
    // Not logged in as restaurant, redirect to Restaurant Login
    return <Navigate to="/restaurant/login" replace />;
  }

  try {
    const auth = JSON.parse(authRaw);
    if (auth.isLoggedIn && (auth.role === 'RESTAURANT' || auth.role === 'restaurant')) {
      return children;
    }
  } catch (error) {
    console.error('Error parsing restaurant authentication data:', error);
  }

  // Not authorized, redirect to Restaurant Login
  return <Navigate to="/restaurant/login" replace />;
};

export default RestaurantRouteGuard;
