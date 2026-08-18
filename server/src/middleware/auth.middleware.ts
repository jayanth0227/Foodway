import { Request, Response, NextFunction } from 'express';
import { verifyToken, JwtUserPayload } from '../utils/jwt.utils';

export interface AuthenticatedRequest extends Request {
  user?: JwtUserPayload;
}

export const authenticate = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required. No token provided.',
      code: 'UNAUTHORIZED'
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (error: any) {
    const isExpired = error?.name === 'TokenExpiredError';
    return res.status(401).json({
      success: false,
      message: isExpired ? 'Token has expired. Please log in again.' : 'Invalid or malformed token.',
      code: isExpired ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN'
    });
  }
};

export type AppRole = 'ADMIN' | 'SHOP' | 'RESTAURANT' | 'USER' | 'DELIVERY_PARTNER' | 'DELIVERY';

export const authorize = (allowedRoles: (AppRole | string)[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
        code: 'UNAUTHORIZED'
      });
    }

    const normalizedUserRole = (req.user.role || '').toUpperCase();
    const normalizedAllowedRoles = allowedRoles.map(r => r.toUpperCase());

    // Super Admin / Admin bypasses role checks
    if (normalizedUserRole === 'ADMIN') {
      return next();
    }

    if (!normalizedAllowedRoles.includes(normalizedUserRole)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Access restricted to [${allowedRoles.join(', ')}] roles.`,
        code: 'FORBIDDEN'
      });
    }

    next();
  };
};

/**
 * IDOR / Resource Ownership Verification Helper
 * Verifies that the authenticated user owns the requested resource or is an Admin.
 */
export const verifyOwnership = (
  user: JwtUserPayload | undefined,
  resourceOwnerId: string | undefined
): boolean => {
  if (!user) return false;

  const role = (user.role || '').toUpperCase();
  if (role === 'ADMIN') return true;

  if (!resourceOwnerId) return false;

  const cleanOwnerId = resourceOwnerId.trim().toLowerCase();
  const cleanUserId = (user.id || '').trim().toLowerCase();
  const cleanUserEmail = (user.email || '').trim().toLowerCase();
  const cleanUserRestId = (user.restaurantId || '').trim().toLowerCase();

  return Boolean(
    cleanUserId === cleanOwnerId ||
    cleanUserEmail === cleanOwnerId ||
    (cleanUserRestId && cleanUserRestId === cleanOwnerId)
  );
};

