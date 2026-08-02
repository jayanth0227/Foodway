import { useAuthContext } from '../context/AuthContext';
import type { Role } from '../types/auth.types';

export const useRole = () => {
  const { role } = useAuthContext();

  const normalizedRole = role ? (role.toUpperCase() as Role) : null;

  return {
    role: normalizedRole,
    isAdmin: normalizedRole === 'ADMIN',
    isRestaurant: normalizedRole === 'RESTAURANT',
    isUser: normalizedRole === 'USER',
    hasRole: (requiredRole: Role | Role[]) => {
      if (!normalizedRole) return false;
      if (Array.isArray(requiredRole)) {
        return requiredRole.includes(normalizedRole);
      }
      return normalizedRole === requiredRole;
    }
  };
};

export default useRole;
