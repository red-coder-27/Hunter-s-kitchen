/**
 * Server Configuration & Strict Production Security Validation Module
 * 
 * Fails fast at startup if critical configurations or secrets are missing or weak in production.
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
  // PostgreSQL Database Configurations
  dbHost: string;
  dbPort: number;
  dbDatabase: string;
  dbUsername: string;
  dbPassword: string;
  dbPoolMin: number;
  dbPoolMax: number;
  dbSsl: boolean;
  databaseUrl?: string;
  redisUrl?: string;
  webhookSecret: string;
  razorpayKeyId: string;
  razorpayKeySecret: string;
}

function required(name: string, minLen = 32): string {
  const v = process.env[name];
  if (!v || v.trim().length < minLen) {
    throw new Error(
      `[SECURITY AUDIT FAILURE] Missing or weak environment variable "${name}" (must be at least ${minLen} characters in production).`
    );
  }
  return v.trim();
}

export function loadConfig(): ServerConfig {
  const env = (process.env.NODE_ENV || 'development') as 'development' | 'production' | 'test';
  const isProd = env === 'production';
  const port = parseInt(process.env.PORT || '3000', 10);

  // 1. JWT SECRET VALIDATION (Mandate 32+ characters in production)
  const jwtSecret = isProd
    ? required('JWT_SECRET', 32)
    : (process.env.JWT_SECRET || 'dev_secret_key_testing_min_32_characters_long_hunter_2026');

  // 2. WEBHOOK SECRET VALIDATION (Mandate 24+ characters in production)
  const webhookSecret = isProd
    ? required('WEBHOOK_SECRET', 24)
    : (process.env.WEBHOOK_SECRET || 'dev_webhook_secret_key_hunter_2026');

  // 3. RAZORPAY GATEWAY CREDENTIALS VALIDATION (Mandate in production)
  const razorpayKeyId = isProd
    ? required('RAZORPAY_KEY_ID', 8)
    : (process.env.RAZORPAY_KEY_ID || 'rzp_test_hunter_kitchen_dev');

  const razorpayKeySecret = isProd
    ? required('RAZORPAY_KEY_SECRET', 16)
    : (process.env.RAZORPAY_KEY_SECRET || 'dev_razorpay_secret_hunter_2026');

  // 3. CORS ORIGINS VALIDATION (Block wildcard with credentials in production)
  let corsOrigins: string[];
  if (isProd) {
    const rawCors = process.env.CORS_ORIGINS?.trim();
    if (!rawCors) {
      // Default to appOrigin if CORS_ORIGINS is unset in production
      corsOrigins = [process.env.APP_ORIGIN || `http://localhost:${port}`];
    } else {
      corsOrigins = rawCors.split(',').map((o) => o.trim());
      if (corsOrigins.includes('*')) {
        throw new Error(
          '[SECURITY AUDIT FAILURE] CORS_ORIGINS cannot contain wildcard "*" in production when session cookies/credentials are enabled.'
        );
      }
    }
  } else {
    corsOrigins = process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim()) : ['*'];
  }

  const appOrigin = process.env.APP_ORIGIN || `http://localhost:${port}`;
  const googleRedirectUri = process.env.GOOGLE_REDIRECT_URI || `${appOrigin}/auth/google/callback`;
  const googleClientId = process.env.GOOGLE_CLIENT_ID?.trim() || undefined;
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim() || undefined;

  // 4. DATABASE VALIDATION
  const databaseUrl = process.env.DATABASE_URL || undefined;
  const dbHost = process.env.DB_HOST || 'localhost';
  const dbPort = parseInt(process.env.DB_PORT || '5432', 10);
  const dbDatabase = process.env.DB_DATABASE || 'hunters_kitchen';
  const dbUsername = process.env.DB_USERNAME || 'postgres';
  const dbPassword = process.env.DB_PASSWORD || 'postgres';

  if (isProd) {
    if (!databaseUrl && dbPassword === 'postgres') {
      throw new Error(
        '[SECURITY AUDIT FAILURE] Default database password "postgres" is not permitted in production. Provide a strong DB_PASSWORD or DATABASE_URL.'
      );
    }
  }

  const dbPoolMin = parseInt(process.env.DB_POOL_MIN || '2', 10);
  const dbPoolMax = parseInt(process.env.DB_POOL_MAX || '20', 10);
  const dbSsl = process.env.DB_SSL === 'true';
  const redisUrl = process.env.REDIS_URL || undefined;

  return {
    env,
    port,
    jwtSecret,
    corsOrigins,
    rateLimitWindowMs: 60 * 1000,
    rateLimitMaxRequests: 300,
    outboxPollIntervalMs: 3000,
    idempotencyTtlSeconds: 86400,
    cacheTtlSeconds: 300,
    appName: "Hunter's Kitchen Backend Engine",
    appOrigin,
    googleClientId,
    googleClientSecret,
    googleRedirectUri,
    dbHost,
    dbPort,
    dbDatabase,
    dbUsername,
    dbPassword,
    dbPoolMin,
    dbPoolMax,
    dbSsl,
    databaseUrl,
    redisUrl,
    webhookSecret,
    razorpayKeyId,
    razorpayKeySecret
  };
}

export const config = loadConfig();
