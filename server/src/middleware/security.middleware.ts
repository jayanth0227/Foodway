import { Request, Response, NextFunction } from 'express';

/**
 * Production-grade Security Headers Middleware
 * Protects against MIME-sniffing, clickjacking, XSS, and unencrypted transport.
 * Removes technology identification headers (X-Powered-By).
 */
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Hide Express server identification
  res.removeHeader('X-Powered-By');

  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Clickjacking protection
  res.setHeader('X-Frame-Options', 'DENY');

  // XSS protection filter
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Strict Transport Security (HSTS) in production
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  next();
};
