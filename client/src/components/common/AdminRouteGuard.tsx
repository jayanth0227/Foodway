import React from 'react';
import { Navigate } from 'react-router-dom';

interface AdminRouteGuardProps {
  children: React.ReactElement;
}

export const AdminRouteGuard: React.FC<AdminRouteGuardProps> = ({ children }) => {
  const adminAuthRaw = localStorage.getItem('adminAuth') || sessionStorage.getItem('adminAuth');
  
  if (!adminAuthRaw) {
    // Not logged in, redirect to Admin Login
    return <Navigate to="/admin" replace />;
  }

  try {
    const auth = JSON.parse(adminAuthRaw);
    if (auth.isLoggedIn && auth.role === 'admin') {
      return children;
    }
  } catch (error) {
    console.error('Error parsing admin authentication data:', error);
  }

  // Not authorized, redirect to Admin Login
  return <Navigate to="/admin" replace />;
};

export default AdminRouteGuard;
