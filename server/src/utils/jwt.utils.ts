import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'foodway-super-secret-jwt-key-2026';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

export interface JwtUserPayload {
  id: string;
  email: string;
  role: 'ADMIN' | 'RESTAURANT' | 'USER';
  name: string;
  restaurantId?: string;
}

export const generateToken = (payload: JwtUserPayload, expiresIn: string = JWT_EXPIRES_IN): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: expiresIn as any });
};

export const verifyToken = (token: string): JwtUserPayload => {
  return jwt.verify(token, JWT_SECRET) as JwtUserPayload;
};
