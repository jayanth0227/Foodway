import React from 'react';
import { ProtectedRoute } from '../auth/ProtectedRoute';

interface AdminRouteGuardProps {
  children: React.ReactElement;
}

export const AdminRouteGuard: React.FC<AdminRouteGuardProps> = ({ children }) => {
  return <ProtectedRoute allowedRoles={['ADMIN']}>{children}</ProtectedRoute>;
};

export default AdminRouteGuard;
