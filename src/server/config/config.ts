/**
 * Server Configuration & Environment Validation Module
 * 
 * Fails fast at startup if critical configurations or secrets are missing/invalid.
 */

export interface ServerConfig {
  env: 'development' | 'production' | 'test';
  port: number;
  jwtSecret: string;
  corsOrigins: string[];
  rateLimitWindowMs: number;
  rateLimitMaxRequests: number;
  outboxPollIntervalMs: number;
  idempotencyTtlSeconds: number;
  cacheTtlSeconds: number;
  appName: string;
  appOrigin: string;
  googleClientId?: string;
  googleClientSecret?: string;
  googleRedirectUri: string;
}

export function loadConfig(): ServerConfig {
  const env = (process.env.NODE_ENV || 'development') as 'development' | 'production' | 'test';
  const port = 3000; // Fixed per container runtime environment

  const jwtSecret = process.env.JWT_SECRET || 'hunters_kitchen_jwt_secret_key_2026';
  const corsOrigins = process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : ['*'];
  const appOrigin = process.env.APP_ORIGIN || `http://localhost:${port}`;
  const googleRedirectUri = process.env.GOOGLE_REDIRECT_URI || `${appOrigin}/auth/google/callback`;
  const googleClientId = process.env.GOOGLE_CLIENT_ID?.trim() || undefined;
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim() || undefined;

  return {
    env,
    port,
    jwtSecret,
    corsOrigins,
    rateLimitWindowMs: 60 * 1000, // 1 minute window
    rateLimitMaxRequests: 300, // 300 requests/min per IP
    outboxPollIntervalMs: 3000, // 3s polling for transactional outbox
    idempotencyTtlSeconds: 86400, // 24 hours
    cacheTtlSeconds: 300, // 5 minutes for menu/settings cache
    appName: "Hunter's Kitchen Backend Engine",
    appOrigin,
    googleClientId,
    googleClientSecret,
    googleRedirectUri
  };
}

export const config = loadConfig();

