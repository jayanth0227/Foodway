import { Request, Response, NextFunction } from 'express';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

/**
 * Clean up expired rate limit entries every 5 minutes to prevent memory leak
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Generic sliding window rate limiter factory function.
 * @param windowMs Time window in milliseconds (e.g. 15 mins = 15 * 60 * 1000)
 * @param maxHits Maximum requests allowed per window per IP
 * @param message Custom message on rate limit exceeded
 */
export const createRateLimiter = (
  windowMs: number = 15 * 60 * 1000,
  maxHits: number = 100,
  message: string = 'Too many requests from this IP, please try again later.'
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Session check endpoint (/api/auth/me) must never be blocked by strict 429 login rate limiters
    if (req.path === '/me' || req.path === '/api/auth/me' || req.originalUrl?.includes('/api/auth/me')) {
      return next();
    }

    // Determine client IP
    const clientIp =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket.remoteAddress ||
      'unknown-ip';

    const key = `${req.path}_${clientIp}`;
    const now = Date.now();
    const record = rateLimitStore.get(key);

    if (!record || now > record.resetTime) {
      rateLimitStore.set(key, {
        count: 1,
        resetTime: now + windowMs,
      });
      return next();
    }

    if (record.count >= maxHits) {
      const retryAfterSeconds = Math.ceil((record.resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfterSeconds);
      return res.status(429).json({
        success: false,
        error: message,
        code: 'TOO_MANY_REQUESTS',
        retryAfterSeconds,
      });
    }

    record.count += 1;
    next();
  };
};

/**
 * Strict Rate Limiter for Authentication Endpoints (15 attempts per 15 minutes)
 */
export const authRateLimiter = createRateLimiter(
  15 * 60 * 1000,
  15,
  'Too many login/registration attempts. Please try again after 15 minutes.'
);

/**
 * General API Rate Limiter (300 requests per 15 minutes)
 */
export const apiRateLimiter = createRateLimiter(
  15 * 60 * 1000,
  300,
  'API rate limit exceeded. Please slow down your requests.'
);
