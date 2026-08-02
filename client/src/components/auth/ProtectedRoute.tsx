import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import type { Role } from '../../types/auth.types';

interface ProtectedRouteProps {
  children: React.ReactElement;
  allowedRoles?: Role[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { isAuthenticated, isLoading, role } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg-dark flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        <p className="text-xs font-bold uppercase tracking-widest text-text-muted">
          Authenticating Session...
        </p>
      </div>
    );
  }

  if (!isAuthenticated || !role) {
    // User is not logged in -> redirect to single login page
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const userRole = role.toUpperCase() as Role;

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
    // Authenticated user attempting to access unauthorized role route
    // Redirect based on user's actual role:
    if (userRole === 'ADMIN') {
      return <Navigate to="/admin/dashboard" replace />;
    } else if (userRole === 'RESTAURANT') {
      return <Navigate to="/restaurant/dashboard" replace />;
    } else {
      return <Navigate to="/" replace />;
    }
  }

  return children;
};

export default ProtectedRoute;
