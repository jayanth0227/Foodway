import jwt from 'jsonwebtoken';

const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      console.warn('⚠️ SECURITY WARNING: JWT_SECRET is not set in environment variables! Using default fallback.');
    }
    return 'foodway-super-secret-jwt-key-2026';
  }
  return secret;
};

const JWT_SECRET = getJwtSecret();
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

export interface JwtUserPayload {
  id: string;
  email: string;
  role: 'ADMIN' | 'SHOP' | 'RESTAURANT' | 'USER' | 'DELIVERY_PARTNER' | 'DELIVERY' | string;
  name: string;
  restaurantId?: string;
  shopId?: string;
}

export const generateToken = (payload: JwtUserPayload, expiresIn: string = JWT_EXPIRES_IN): string => {
  // Sanitize payload: avoid putting secrets in JWT
  const cleanPayload = {
    id: payload.id,
    email: payload.email,
    role: payload.role,
    name: payload.name,
    ...(payload.restaurantId ? { restaurantId: payload.restaurantId } : {}),
    ...(payload.shopId ? { shopId: payload.shopId } : {})
  };

  return jwt.sign(cleanPayload, JWT_SECRET, {
    expiresIn: expiresIn as any,
    algorithm: 'HS256'
  });
};

export const verifyToken = (token: string): JwtUserPayload => {
  return jwt.verify(token, JWT_SECRET, {
    algorithms: ['HS256']
  }) as JwtUserPayload;
};

