import { Request, Response, NextFunction } from 'express';
import { config } from '../config/config';
import { logger } from '../utils/logger';

// In-Memory Multi-Tier Rate Limiting Bucket
interface RateLimitBucket {
  count: number;
  resetTime: number;
}

const generalRateLimitStore = new Map<string, RateLimitBucket>();
const authRateLimitStore = new Map<string, RateLimitBucket>();
const orderRateLimitStore = new Map<string, RateLimitBucket>();
const activeSSEConnections = new Map<string, number>();

// Periodic cleanup of expired rate limit keys
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of generalRateLimitStore.entries()) {
    if (now > bucket.resetTime) generalRateLimitStore.delete(key);
  }
  for (const [key, bucket] of authRateLimitStore.entries()) {
    if (now > bucket.resetTime) authRateLimitStore.delete(key);
  }
  for (const [key, bucket] of orderRateLimitStore.entries()) {
    if (now > bucket.resetTime) orderRateLimitStore.delete(key);
  }
}, 60000);

export function securityHeadersMiddleware(req: Request, res: Response, next: NextFunction) {
  // 1. Content Security Policy (SPA & AI Studio iframe embedding compliant)
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: blob: https:; connect-src 'self' https: wss:; frame-ancestors 'self' https://*.google.com https://*.aistudio.google.com https://ai.studio https://*.run.app *;"
  );

  // 2. HTTP Strict Transport Security (HSTS)
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');

  // 3. Prevent MIME-sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // 4. Modern Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // 5. Restrictive Permissions Policy
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self)');

  next();
}

/**
 * Multi-Tier Rate Limiting Middleware
 * - Auth endpoints: 15 req/15 min (strictly defends against credential stuffing & brute-force)
 * - Order placement: 30 orders/10 min (defends against automated order flooding)
 * - General APIs: 300 req/min (high throughput for menu, categories, browsing)
 */
export function rateLimiterMiddleware(req: Request, res: Response, next: NextFunction) {
  // Skip rate limiting for static assets or health checks
  if (req.path.startsWith('/assets') || req.path === '/api/health' || req.path === '/api/events/stream') {
    return next();
  }

  const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || '127.0.0.1';
  const now = Date.now();

  // Tier 1: Authentication Endpoints (/api/auth/login, /api/auth/register, etc.)
  if (req.path.startsWith('/api/auth/login') || req.path.startsWith('/api/auth/register')) {
    const authLimit = 15;
    const authWindowMs = 15 * 60 * 1000; // 15 mins
    const key = `auth_${clientIp}`;
    const bucket = authRateLimitStore.get(key);

    if (!bucket || now > bucket.resetTime) {
      authRateLimitStore.set(key, { count: 1, resetTime: now + authWindowMs });
      res.setHeader('X-RateLimit-Limit', authLimit);
      res.setHeader('X-RateLimit-Remaining', authLimit - 1);
      return next();
    }

    bucket.count++;
    const remaining = Math.max(0, authLimit - bucket.count);
    res.setHeader('X-RateLimit-Limit', authLimit);
    res.setHeader('X-RateLimit-Remaining', remaining);

    if (bucket.count > authLimit) {
      const retryAfterSec = Math.ceil((bucket.resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfterSec);
      logger.warn(`Auth rate limit exceeded for IP: ${clientIp}`, { requestId: req.requestId, path: req.path });
      return res.status(429).json({
        success: false,
        error: {
          code: 'AUTH_RATE_LIMIT_EXCEEDED',
          message: `Too many authentication attempts. Please retry after ${Math.ceil(retryAfterSec / 60)} minutes.`
        },
        requestId: req.requestId,
        timestamp: new Date().toISOString()
      });
    }
    return next();
  }

  // Tier 2: Order Mutation Endpoints (POST /api/orders)
  if (req.path === '/api/orders' && req.method === 'POST') {
    const orderLimit = 30;
    const orderWindowMs = 10 * 60 * 1000; // 10 mins
    const key = `orders_${clientIp}`;
    const bucket = orderRateLimitStore.get(key);

    if (!bucket || now > bucket.resetTime) {
      orderRateLimitStore.set(key, { count: 1, resetTime: now + orderWindowMs });
      res.setHeader('X-RateLimit-Limit', orderLimit);
      res.setHeader('X-RateLimit-Remaining', orderLimit - 1);
      return next();
    }

    bucket.count++;
    const remaining = Math.max(0, orderLimit - bucket.count);
    res.setHeader('X-RateLimit-Limit', orderLimit);
    res.setHeader('X-RateLimit-Remaining', remaining);

    if (bucket.count > orderLimit) {
      const retryAfterSec = Math.ceil((bucket.resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfterSec);
      logger.warn(`Order placement rate limit exceeded for IP: ${clientIp}`, { requestId: req.requestId });
      return res.status(429).json({
        success: false,
        error: {
          code: 'ORDER_RATE_LIMIT_EXCEEDED',
          message: `Order placement rate limit exceeded. Please wait ${retryAfterSec} seconds before submitting again.`
        },
        requestId: req.requestId,
        timestamp: new Date().toISOString()
      });
    }
    return next();
  }

  // Tier 3: General API Endpoints
  const generalLimit = config.rateLimitMaxRequests || 300;
  const generalWindowMs = config.rateLimitWindowMs || 60000;
  const bucket = generalRateLimitStore.get(clientIp);

  if (!bucket || now > bucket.resetTime) {
    generalRateLimitStore.set(clientIp, {
      count: 1,
      resetTime: now + generalWindowMs
    });
    res.setHeader('X-RateLimit-Limit', generalLimit);
    res.setHeader('X-RateLimit-Remaining', generalLimit - 1);
    return next();
  }

  bucket.count++;
  const remaining = Math.max(0, generalLimit - bucket.count);
  res.setHeader('X-RateLimit-Limit', generalLimit);
  res.setHeader('X-RateLimit-Remaining', remaining);

  if (bucket.count > generalLimit) {
    const retryAfterSec = Math.ceil((bucket.resetTime - now) / 1000);
    res.setHeader('Retry-After', retryAfterSec);
    logger.warn(`General rate limit exceeded for IP: ${clientIp}`, { requestId: req.requestId, path: req.path });
    return res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: `Too many requests from this IP. Please retry after ${retryAfterSec} seconds.`
      },
      requestId: req.requestId,
      timestamp: new Date().toISOString()
    });
  }

  next();
}

/**
 * SSE Connection Limiter to prevent socket exhaustion (max 5 active streams per IP)
 */
export function sseConnectionTracker(req: Request, res: Response): boolean {
  const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || '127.0.0.1';
  const current = activeSSEConnections.get(clientIp) || 0;
  if (current >= 5) {
    return false; // Exceeded max concurrent streams
  }
  activeSSEConnections.set(clientIp, current + 1);
  res.on('close', () => {
    const active = activeSSEConnections.get(clientIp) || 1;
    if (active <= 1) {
      activeSSEConnections.delete(clientIp);
    } else {
      activeSSEConnections.set(clientIp, active - 1);
    }
  });
  return true;
}

export function requestLoggerMiddleware(req: Request, res: Response, next: NextFunction) {
  res.on('finish', () => {
    const durationMs = Date.now() - (req.startTime || Date.now());
    if (!req.path.startsWith('/assets') && req.path !== '/api/events/stream') {
      logger.info(`${req.method} ${req.originalUrl} -> ${res.statusCode} (${durationMs}ms)`, {
        requestId: req.requestId,
        method: req.method,
        path: req.originalUrl,
        statusCode: res.statusCode,
        durationMs,
        ip: req.ip
      });
    }
  });
  next();
}

export function getRateLimitMetrics() {
  return {
    authRateLimit: {
      maxRequests: 15,
      windowMinutes: 15,
      activeTrackingIps: authRateLimitStore.size
    },
    orderRateLimit: {
      maxRequests: 30,
      windowMinutes: 10,
      activeTrackingIps: orderRateLimitStore.size
    },
    generalApiRateLimit: {
      maxRequests: config.rateLimitMaxRequests || 300,
      windowMinutes: 1,
      activeTrackingIps: generalRateLimitStore.size
    },
    activeSSEStreams: Array.from(activeSSEConnections.values()).reduce((a, b) => a + b, 0)
  };
}
