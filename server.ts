import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { OAuth2Client } from 'google-auth-library';

import { config } from './src/server/config/config';
import { logger } from './src/server/utils/logger';
import { requestIdMiddleware } from './src/server/middleware/requestId';
import {
  securityHeadersMiddleware,
  rateLimiterMiddleware,
  requestLoggerMiddleware,
  sseConnectionTracker,
  getRateLimitMetrics
} from './src/server/middleware/security';
import { idempotencyMiddleware } from './src/server/middleware/idempotency';
import { errorHandler } from './src/server/middleware/errorHandler';
import { setupGracefulShutdown } from './src/server/utils/shutdown';
import {
  requireAuth,
  optionalAuth,
  requireRole,
  requirePermission,
  csrfProtection,
  extractToken
} from './src/server/middleware/auth';

import { db } from './src/server/db';
import { authService } from './src/server/services/authService';
import { orderService } from './src/server/services/orderService';
import { auditService } from './src/server/services/auditService';
import { outboxRepository } from './src/server/repositories/outboxRepository';
import { outboxWorker } from './src/server/workers/outboxWorker';
import { reconciliationService } from './src/server/services/reconciliationService';
import { eventHub } from './src/server/services/eventHub';
import { cacheService } from './src/server/services/cacheService';
import { redisService } from './src/server/services/redisService';
import { emailService } from './src/server/services/emailService';

import { User, UserRole } from './src/types';
import { ValidationError, UnauthorizedError, ForbiddenError, NotFoundError } from './src/server/errors/AppError';

async function startServer() {
  const app = express();
  const PORT = config.port;

  // Configure reverse proxy / load balancer IP forwarding
  app.set('trust proxy', true);

  // 1. OBSERVABILITY & SECURITY MIDDLEWARE PIPELINE
  app.use(requestIdMiddleware);
  app.use(securityHeadersMiddleware);
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (curl/mobile/internal) or any origin in browser
        callback(null, true);
      },
      credentials: true
    })
  );
  app.use(cookieParser());
  app.use(express.json({ limit: '2mb' }));
  app.use(rateLimiterMiddleware);
  app.use(requestLoggerMiddleware);
  app.use(idempotencyMiddleware);
  app.use(csrfProtection);

  // 2. REAL-TIME SERVER-SENT EVENTS (SSE) ENDPOINT
  app.get('/api/events/stream', (req: Request, res: Response) => {
    // Connection limiter check (max 5 active streams per IP)
    if (!sseConnectionTracker(req, res)) {
      return res.status(429).json({
        success: false,
        error: {
          code: 'SSE_CONNECTION_LIMIT_EXCEEDED',
          message: 'Maximum active real-time connections exceeded for this client IP.'
        }
      });
    }

    // Resolve authenticated user from session cookie or token parameter
    const token = extractToken(req);
    let user: User | undefined;
    if (token) {
      try {
        const payload = authService.verifyToken(token);
        user = db.getUserById(payload.userId);
      } catch {
        // Invalid token; stream connects unauthenticated
      }
    }

    const role = user ? user.role : (req.query.role as string);
    const userId = user ? user.id : (req.query.userId as string);
    const lastEventId = (req.headers['last-event-id'] as string) || (req.query.lastEventId as string);
    const clientId = `sse_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    });

    eventHub.addClient(clientId, res, role, userId, lastEventId);

    req.on('close', () => {
      eventHub.removeClient(clientId);
    });
  });

  // 3. HEALTH & METRICS CHECK
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      activeSSEClients: eventHub.getClientCount()
    });
  });

  // 4. RESTAURANT SETTINGS (Public Read, Owner Write)
  app.get('/api/settings', (req: Request, res: Response) => {
    const cached = cacheService.get('settings');
    if (cached) {
      return res.json({ success: true, data: cached });
    }
    const settings = db.getSettings();
    cacheService.set('settings', settings, 300, ['settings']);
    res.json({ success: true, data: settings });
  });

  app.patch(
    '/api/owner/settings',
    requireAuth,
    requireRole('OWNER'),
    (req: Request, res: Response, next: NextFunction) => {
      try {
        const oldSettings = db.getSettings();
        const updated = db.updateSettings(req.body);

        cacheService.invalidateTag('settings');

        auditService.log({
          actorId: req.user!.id,
          actorName: req.user!.name,
          actorRole: req.user!.role,
          action: 'UPDATE_SETTINGS',
          resource: 'SETTINGS',
          resourceId: 'restaurant_settings',
          oldValue: oldSettings,
          newValue: updated,
          requestId: req.requestId
        });

        res.json({ success: true, data: updated });
      } catch (err) {
        next(err);
      }
    }
  );

  // 5. PRODUCTION AUTHENTICATION APIS
  app.post('/api/auth/register', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, email, phone, password, address } = req.body;
      const result = await authService.register(
        { name, email, phone, password, address },
        {
          ip: req.ip || req.socket.remoteAddress || '',
          requestId: req.requestId,
          userAgent: req.headers['user-agent']
        }
      );

      // Set secure HTTP-only session cookie
      const isProd = process.env.NODE_ENV === 'production';
      res.cookie('hk_session', result.token, {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? 'none' : 'lax',
        maxAge: 24 * 60 * 60 * 1000
      });

      res.json({
        success: true,
        data: result
      });
    } catch (err) {
      next(err);
    }
  });

  app.post('/api/auth/login', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body;
      const result = await authService.login(email, password, {
        ip: req.ip || req.socket.remoteAddress || '',
        requestId: req.requestId,
        userAgent: req.headers['user-agent']
      });

      // Set secure HTTP-only session cookie (support cross-site iframes with sameSite: none in production)
      const isProd = process.env.NODE_ENV === 'production';
      res.cookie('hk_session', result.token, {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? 'none' : 'lax',
        maxAge: 24 * 60 * 60 * 1000
      });

      res.json({
        success: true,
        data: result
      });
    } catch (err) {
      next(err);
    }
  });

  app.get('/api/auth/me', optionalAuth, (req: Request, res: Response) => {
    if (!req.user) {
      return res.json({
        success: true,
        data: null
      });
    }
    res.json({
      success: true,
      data: authService.sanitizeUser(req.user)
    });
  });

  app.post('/api/auth/logout', optionalAuth, (req: Request, res: Response) => {
    authService.logout(req.authToken, req.user, {
      ip: req.ip || '',
      requestId: req.requestId
    });

    const isProd = process.env.NODE_ENV === 'production';
    res.clearCookie('hk_session', {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax'
    });

    res.json({ success: true, message: 'Logged out successfully' });
  });

  // REAL-TIME OTP DISPATCH VIA GMAIL & REDIS (LOGIN OR PASSWORD RESET)
  app.post('/api/auth/otp/send', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, purpose } = req.body;
      const result = await authService.sendGmailOtp(email, purpose || 'FORGOT_PASSWORD', {
        ip: req.ip || '',
        requestId: req.requestId
      });
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  });

  // REAL-TIME OTP DIRECT LOGIN
  app.post('/api/auth/otp/login', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, otp } = req.body;
      const result = await authService.loginWithOtp(email, otp, {
        ip: req.ip || req.socket.remoteAddress || '',
        requestId: req.requestId,
        userAgent: req.headers['user-agent']
      });

      // Set secure HTTP-only session cookie
      const isProd = process.env.NODE_ENV === 'production';
      res.cookie('hk_session', result.token, {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? 'none' : 'lax',
        maxAge: 24 * 60 * 60 * 1000
      });

      res.json({
        success: true,
        data: result
      });
    } catch (err) {
      next(err);
    }
  });

  // REAL-TIME OTP VERIFICATION AGAINST REDIS (FOR PASSWORD RESET)
  app.post('/api/auth/otp/verify', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, otp } = req.body;
      const result = await authService.verifyGmailOtp(email, otp, {
        ip: req.ip || '',
        requestId: req.requestId
      });
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  });

  // COMPLETE PASSWORD RESET AFTER OTP CONFIRMATION
  app.post('/api/auth/otp/reset-password', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token, password } = req.body;
      const result = await authService.resetPassword(token, password, {
        ip: req.ip || '',
        requestId: req.requestId
      });
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  });

  // GOOGLE OAUTH 2.0 / OIDC AUTHORIZATION CODE FLOW
  app.get('/api/auth/google/url', async (req: Request, res: Response) => {
    if (!config.googleClientId) {
      return res.status(503).json({
        success: false,
        code: 'GOOGLE_OAUTH_NOT_CONFIGURED',
        message: 'Google Sign-In is not configured. Please configure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.',
        redirectUri: config.googleRedirectUri
      });
    }

    // Generate cryptographically secure state (CSRF protection) and nonce (OIDC replay protection)
    const state = crypto.randomBytes(32).toString('hex');
    const nonce = crypto.randomBytes(32).toString('hex');

    // Store OAuth transaction server-side in Redis/memory with 10-minute TTL
    const txData = {
      nonce,
      redirectUri: config.googleRedirectUri,
      createdAt: Date.now()
    };
    await redisService.set(`oauth_state:${state}`, JSON.stringify(txData), 600);

    // Set HttpOnly, SameSite=Lax cookie with state token
    const isProd = config.env === 'production';
    res.cookie('hk_oauth_state', state, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge: 10 * 60 * 1000,
      path: '/'
    });

    const params = new URLSearchParams({
      client_id: config.googleClientId,
      redirect_uri: config.googleRedirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      prompt: 'select_account',
      state: state,
      nonce: nonce
    });

    res.json({
      success: true,
      url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
      redirectUri: config.googleRedirectUri,
      configured: true
    });
  });

  // GOOGLE OAUTH 2.0 / OIDC SERVER CALLBACK HANDLER
  app.get('/auth/google/callback', async (req: Request, res: Response) => {
    const isProd = config.env === 'production';
    const targetOrigin = config.appOrigin;

    // Helper to render popup callback HTML with origin-restricted postMessage (NO application JWT in postMessage)
    const renderCallbackHtml = (status: 'SUCCESS' | 'ERROR', user?: any, errorMsg?: string) => {
      res.clearCookie('hk_oauth_state', { httpOnly: true, secure: isProd, sameSite: 'lax', path: '/' });
      const safeUserJson = user ? JSON.stringify(user) : 'null';
      const safeErrorMsg = errorMsg ? JSON.stringify(errorMsg) : 'null';

      return `
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="utf-8">
            <title>Google Authentication - Hunter's Kitchen</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #fafaf9; color: #1c1917; }
              .card { background: white; padding: 32px 28px; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.08); text-align: center; max-width: 380px; width: 90%; border: 1px solid #e7e5e4; }
              .spinner { width: 28px; height: 28px; border: 3px solid #fecaca; border-top-color: #b91c1c; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 16px auto; }
              @keyframes spin { to { transform: rotate(360deg); } }
              .error-msg { color: #b91c1c; font-size: 13px; font-weight: 600; margin-top: 12px; }
              .success-msg { color: #16a34a; font-size: 13px; font-weight: 600; margin-top: 12px; }
            </style>
          </head>
          <body>
            <div class="card">
              <h3 style="margin: 6px 0; font-size: 18px; font-weight: 800;">Google Authentication</h3>
              ${status === 'SUCCESS' ? `
                <p class="success-msg">&#x2713; Authentication verified! Returning to application...</p>
                <div class="spinner"></div>
              ` : `
                <p class="error-msg">Authentication failed: ${errorMsg || 'Unknown error'}</p>
                <p style="font-size: 12px; color: #78716c; margin-top: 8px;">You may close this window and try again.</p>
              `}
            </div>
            <script>
              (function() {
                var targetOrigin = ${JSON.stringify(targetOrigin)};
                var status = ${JSON.stringify(status)};
                var user = ${safeUserJson};
                var errorMsg = ${safeErrorMsg};

                if (window.opener && !window.opener.closed) {
                  if (status === 'SUCCESS') {
                    window.opener.postMessage({ type: 'GOOGLE_AUTH_SUCCESS', user: user }, targetOrigin);
                  } else {
                    window.opener.postMessage({ type: 'GOOGLE_AUTH_ERROR', message: errorMsg }, targetOrigin);
                  }
                  setTimeout(function() { window.close(); }, 800);
                } else {
                  // Fallback for full-tab redirection
                  setTimeout(function() { window.location.href = '/'; }, 1200);
                }
              })();
            </script>
          </body>
        </html>
      `;
    };

    // 1. Check for Google OAuth error in query (e.g. access_denied when user cancels)
    if (req.query.error) {
      const googleError = String(req.query.error_description || req.query.error);
      logger.warn(`[OAuth] Google returned error: ${googleError}`);
      return res.status(400).send(renderCallbackHtml('ERROR', undefined, googleError));
    }

    const code = req.query.code as string | undefined;
    const incomingState = req.query.state as string | undefined;
    const cookieState = req.cookies.hk_oauth_state as string | undefined;

    // 2. Validate state against cookie (CSRF check)
    if (!incomingState || !cookieState || incomingState !== cookieState) {
      logger.warn('[OAuth] State mismatch or missing state cookie (potential CSRF).');
      return res.status(403).send(renderCallbackHtml('ERROR', undefined, 'Invalid or expired state session (CSRF protection).'));
    }

    // 3. Fetch and validate server-side transaction from Redis / memory
    const rawTx = await redisService.get(`oauth_state:${incomingState}`);
    if (!rawTx) {
      return res.status(403).send(renderCallbackHtml('ERROR', undefined, 'OAuth transaction expired. Please try again.'));
    }
    await redisService.del(`oauth_state:${incomingState}`);

    let txData: { nonce: string; redirectUri: string };
    try {
      txData = JSON.parse(rawTx);
    } catch {
      return res.status(500).send(renderCallbackHtml('ERROR', undefined, 'Malformed OAuth transaction state.'));
    }

    if (!code) {
      return res.status(400).send(renderCallbackHtml('ERROR', undefined, 'Missing authorization code from Google.'));
    }

    if (!config.googleClientId || !config.googleClientSecret) {
      return res.status(503).send(renderCallbackHtml('ERROR', undefined, 'Server missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET.'));
    }

    try {
      // 4. Exchange authorization code with Google token endpoint
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: config.googleClientId,
          client_secret: config.googleClientSecret,
          redirect_uri: config.googleRedirectUri,
          grant_type: 'authorization_code'
        }).toString()
      });

      const tokenData = await tokenResponse.json();
      if (!tokenResponse.ok || !tokenData.id_token) {
        const errDetail = tokenData.error_description || tokenData.error || 'Failed to exchange authorization code';
        logger.error(`[OAuth] Token exchange error: ${errDetail}`);
        return res.status(400).send(renderCallbackHtml('ERROR', undefined, `Google token error: ${errDetail}`));
      }

      // 5. Cryptographically verify ID Token using Google OAuth2Client
      const oauthClient = new OAuth2Client(config.googleClientId);
      const ticket = await oauthClient.verifyIdToken({
        idToken: tokenData.id_token,
        audience: config.googleClientId
      });

      const payload = ticket.getPayload();
      if (!payload) {
        throw new UnauthorizedError('Failed to decode verified Google ID Token payload');
      }

      // Explicit OIDC claims verification
      if (payload.iss !== 'accounts.google.com' && payload.iss !== 'https://accounts.google.com') {
        throw new UnauthorizedError(`Invalid token issuer: ${payload.iss}`);
      }
      if (payload.aud !== config.googleClientId) {
        throw new UnauthorizedError('Token audience mismatch');
      }
      if (payload.nonce && payload.nonce !== txData.nonce) {
        throw new UnauthorizedError('OIDC nonce mismatch (replay protection)');
      }
      if (!payload.email_verified) {
        throw new ForbiddenError('Google account email has not been verified');
      }
      if (!payload.sub) {
        throw new UnauthorizedError('Missing Google subject identifier (sub)');
      }

      // 6. Authoritative account lookup and session creation in authService
      const sessionResult = await authService.loginWithVerifiedGoogle(
        {
          sub: payload.sub,
          email: payload.email || '',
          emailVerified: Boolean(payload.email_verified),
          name: payload.name,
          picture: payload.picture
        },
        {
          ip: req.ip || req.socket.remoteAddress || '',
          requestId: req.requestId,
          userAgent: req.headers['user-agent']
        }
      );

      // 7. Set secure HttpOnly session cookie (SameSite=Lax, Path=/)
      res.cookie('hk_session', sessionResult.token, {
        httpOnly: true,
        secure: isProd,
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000,
        path: '/'
      });

      // 8. Render callback HTML posting success (no JWT exposed in message payload)
      return res.send(renderCallbackHtml('SUCCESS', sessionResult.user));
    } catch (err: any) {
      logger.error(`[OAuth] Google authentication exception: ${err.message}`);
      return res.status(500).send(renderCallbackHtml('ERROR', undefined, err.message || 'Authentication error'));
    }
  });


  // INFRASTRUCTURE & ARCHITECTURAL SECURITY STATUS
  app.get('/api/infra/status', (req: Request, res: Response) => {
    const memory = process.memoryUsage();
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      loadBalancer: {
        reverseProxy: 'Nginx Cloud Ingress',
        trustProxyEnabled: true,
        clientIp: req.ip || '127.0.0.1',
        forwardedFor: req.headers['x-forwarded-for'] || null,
        forwardedProto: req.headers['x-forwarded-proto'] || req.protocol,
        instanceId: `node_worker_${process.pid}_${process.arch}`,
        uptimeSeconds: Math.floor(process.uptime()),
        healthStatus: 'HEALTHY'
      },
      redisCache: redisService.getStats(),
      rateLimiting: getRateLimitMetrics(),
      securityProtocols: {
        contentSecurityPolicy: 'ACTIVE',
        httpStrictTransportSecurity: 'ACTIVE (max-age=31536000)',
        xContentTypeOptions: 'nosniff',
        antiCsrfHeaderCheck: 'ACTIVE (SameSite None Secure HTTP-Only Cookie)',
        jwtAlgorithm: 'HS256',
        passwordHashing: 'Bcrypt 10 rounds'
      },
      rbacRolesEnforced: ['ADMIN', 'STAFF', 'DELIVERY_PARTNER', 'CUSTOMER'],
      emailOtpService: {
        channel: process.env.GMAIL_USER ? 'GMAIL_SMTP_LIVE' : 'GMAIL_REALTIME_SANDBOX',
        configured: Boolean(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD)
      },
      googleOAuth: {
        configured: Boolean(process.env.GOOGLE_CLIENT_ID),
        mode: process.env.GOOGLE_CLIENT_ID ? 'PRODUCTION_OAUTH' : 'SANDBOX_SSO'
      }
    });
  });

  app.post('/api/auth/forgot-password', (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email } = req.body;
      const result = authService.forgotPassword(email, {
        ip: req.ip || '',
        requestId: req.requestId
      });
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  });

  app.post('/api/auth/reset-password', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token, password } = req.body;
      const result = await authService.resetPassword(token, password, {
        ip: req.ip || '',
        requestId: req.requestId
      });
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  });

  app.post('/api/auth/invite/accept', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token, password } = req.body;
      const result = await authService.acceptInvite(token, password, {
        ip: req.ip || '',
        requestId: req.requestId
      });
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  });

  // 6. USERS & STAFF MANAGEMENT (Protected by Role/Permissions)
  app.get('/api/users', requireAuth, requireRole('OWNER', 'STAFF'), (req: Request, res: Response) => {
    const role = req.query.role as UserRole | undefined;
    let users = db.getUsers();
    if (role) {
      users = users.filter((u) => u.role === role);
    }
    res.json({ success: true, data: users.map((u) => authService.sanitizeUser(u)) });
  });

  app.patch('/api/users/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id;
      // Allow users to update their own profile, or Owner to update any profile
      if (req.user!.id !== id && req.user!.role !== 'OWNER') {
        throw new ForbiddenError('Access denied: You can only update your own user profile');
      }

      const currentUser = db.getUserById(id);
      if (!currentUser) {
        throw new NotFoundError('User', id);
      }

      const { name, phone, email, password, otp } = req.body;
      const isEmailChanging = Boolean(email && email.trim().toLowerCase() !== currentUser.email.toLowerCase());

      if (isEmailChanging) {
        const normalizedNewEmail = email.trim().toLowerCase();

        // Check if new email is already registered to someone else
        const existing = db.getUserByEmail(normalizedNewEmail);
        if (existing && existing.id !== id) {
          throw new ValidationError('This Gmail address is already registered to another account.');
        }

        // OTP verification through Gmail is mandatory to save email change
        if (!otp || !String(otp).trim()) {
          throw new ValidationError('Gmail verification code (OTP) is mandatory to confirm and save your changed email address.');
        }

        const isOtpValid = await emailService.verifyOtp(normalizedNewEmail, String(otp).trim(), 'EMAIL_CHANGE');
        if (!isOtpValid) {
          throw new ValidationError('Invalid or expired 6-digit verification code. Please check your Gmail or request a new code.');
        }
      }

      const updates: Partial<User> = {};
      if (name) updates.name = name.trim();
      if (phone) updates.phone = phone.trim();
      if (isEmailChanging) updates.email = email.trim().toLowerCase();

      const updated = db.updateUser(id, updates);
      if (!updated) {
        throw new NotFoundError('User', id);
      }

      // If password provided (for changed Gmail or profile update), update authentication credentials
      if (password && String(password).trim().length >= 6) {
        const hash = bcrypt.hashSync(String(password).trim(), 10);
        db.updatePassword(id, hash);
      }

      auditService.log({
        actorId: req.user!.id,
        actorName: req.user!.name,
        actorRole: req.user!.role,
        action: isEmailChanging ? 'USER_EMAIL_AND_CREDENTIALS_CHANGED' : 'USER_PROFILE_UPDATED',
        resource: 'USER',
        resourceId: id,
        requestId: (req as any).id || `req_${Date.now()}`
      });

      // Issue refreshed JWT token containing updated email/credentials
      const { token: newToken } = authService.generateToken(updated);

      res.json({
        success: true,
        data: authService.sanitizeUser(updated),
        token: newToken,
        message: isEmailChanging
          ? 'Gmail address and account password updated successfully! Please use this new Gmail to log in next time.'
          : 'Profile updated successfully!'
      });
    } catch (err) {
      next(err);
    }
  });

  app.post(
    '/api/owner/staff',
    requireAuth,
    requireRole('OWNER'),
    (req: Request, res: Response, next: NextFunction) => {
      try {
        const { name, email, phone, role, staffRole, password } = req.body;
        if (!name || !email || !phone) {
          throw new ValidationError('Name, email, and phone are required');
        }
        const existing = db.getUserByEmail(email);
        if (existing) {
          throw new ValidationError('Email is already registered');
        }

        const newStaff = db.createUser({
          name,
          email,
          phone,
          role: role || 'STAFF',
          staffRole: staffRole || 'KITCHEN_MANAGER',
          status: 'ACTIVE',
          password: password || 'Hunter@2026!'
        });

        auditService.log({
          actorId: req.user!.id,
          actorName: req.user!.name,
          actorRole: req.user!.role,
          action: 'CREATE_STAFF_MEMBER',
          resource: 'USER',
          resourceId: newStaff.id,
          newValue: { name, email, role: newStaff.role, staffRole: newStaff.staffRole },
          requestId: req.requestId
        });

        res.json({
          success: true,
          data: authService.sanitizeUser(newStaff),
          message: 'Staff member added successfully'
        });
      } catch (err) {
        next(err);
      }
    }
  );

  app.patch(
    '/api/owner/staff/:id/role',
    requireAuth,
    requireRole('OWNER'),
    (req: Request, res: Response, next: NextFunction) => {
      try {
        const { staffRole } = req.body;
        const updated = db.updateUser(req.params.id, { staffRole });
        if (!updated) throw new NotFoundError('Staff member', req.params.id);

        auditService.log({
          actorId: req.user!.id,
          actorName: req.user!.name,
          actorRole: req.user!.role,
          action: 'UPDATE_STAFF_ROLE',
          resource: 'USER',
          resourceId: req.params.id,
          newValue: { staffRole },
          requestId: req.requestId
        });

        res.json({ success: true, data: authService.sanitizeUser(updated) });
      } catch (err) {
        next(err);
      }
    }
  );

  app.delete(
    '/api/owner/staff/:id',
    requireAuth,
    requireRole('OWNER'),
    (req: Request, res: Response, next: NextFunction) => {
      try {
        const id = req.params.id;
        if (id === req.user!.id) {
          throw new ValidationError('Cannot delete your own account');
        }
        const success = db.deleteUser(id);
        if (!success) throw new NotFoundError('Staff member', id);

        auditService.log({
          actorId: req.user!.id,
          actorName: req.user!.name,
          actorRole: req.user!.role,
          action: 'DELETE_STAFF_MEMBER',
          resource: 'USER',
          resourceId: id,
          requestId: req.requestId
        });

        res.json({ success: true, message: 'User deleted successfully' });
      } catch (err) {
        next(err);
      }
    }
  );

  app.post(
    '/api/owner/delivery-partners',
    requireAuth,
    requireRole('OWNER'),
    (req: Request, res: Response, next: NextFunction) => {
      try {
        const { name, email, phone, vehicleNumber, vehicleType, password } = req.body;
        if (!name || !email || !phone) {
          throw new ValidationError('Name, email, and phone are required');
        }

        const newPartner = db.createUser({
          name,
          email,
          phone,
          role: 'DELIVERY_PARTNER',
          status: 'ACTIVE',
          vehicleNumber: vehicleNumber || 'TN-37-XX-9999',
          vehicleType: vehicleType || 'Bike',
          currentRating: 5.0,
          totalDeliveries: 0,
          password: password || 'Hunter@2026!'
        });

        res.json({
          success: true,
          data: authService.sanitizeUser(newPartner),
          message: 'Delivery partner added successfully'
        });
      } catch (err) {
        next(err);
      }
    }
  );

  app.patch(
    '/api/delivery-partners/:id/status',
    requireAuth,
    (req: Request, res: Response, next: NextFunction) => {
      try {
        if (req.user!.role !== 'OWNER' && req.user!.id !== req.params.id) {
          throw new ForbiddenError('Access denied: Cannot update other delivery partner status');
        }

        const { status } = req.body;
        const updated = db.updateUser(req.params.id, { partnerStatus: status });
        if (!updated) throw new NotFoundError('Partner', req.params.id);
        res.json({ success: true, data: authService.sanitizeUser(updated) });
      } catch (err) {
        next(err);
      }
    }
  );

  // 7. MENU & CATEGORIES (Public Read, Authorized Write)
  app.get('/api/categories', (req: Request, res: Response) => {
    const cached = cacheService.get('categories');
    if (cached) return res.json({ success: true, data: cached });

    const categories = db.getCategories();
    cacheService.set('categories', categories, 300, ['menu']);
    res.json({ success: true, data: categories });
  });

  app.get('/api/menu', (req: Request, res: Response) => {
    const cached = cacheService.get('menu');
    if (cached) return res.json({ success: true, data: cached });

    const menu = db.getMenuItems();
    cacheService.set('menu', menu, 300, ['menu']);
    res.json({ success: true, data: menu });
  });

  app.post(
    '/api/owner/menu-items',
    requireAuth,
    requirePermission('menu.create'),
    (req: Request, res: Response, next: NextFunction) => {
      try {
        const newItem = db.createMenuItem(req.body);
        cacheService.invalidateTag('menu');

        auditService.log({
          actorId: req.user!.id,
          actorName: req.user!.name,
          actorRole: req.user!.role,
          action: 'CREATE_MENU_ITEM',
          resource: 'MENU',
          resourceId: newItem.id,
          newValue: newItem,
          requestId: req.requestId
        });

        res.json({ success: true, data: newItem, message: 'Menu item created successfully' });
      } catch (err) {
        next(err);
      }
    }
  );

  app.put(
    '/api/owner/menu-items/:id',
    requireAuth,
    requirePermission('menu.update'),
    (req: Request, res: Response, next: NextFunction) => {
      try {
        const updated = db.updateMenuItem(req.params.id, req.body);
        if (!updated) throw new NotFoundError('Menu item', req.params.id);
        cacheService.invalidateTag('menu');
        res.json({ success: true, data: updated });
      } catch (err) {
        next(err);
      }
    }
  );

  app.patch(
    '/api/owner/menu-items/:id/availability',
    requireAuth,
    requirePermission('menu.availability'),
    (req: Request, res: Response, next: NextFunction) => {
      try {
        const { isAvailable } = req.body;
        const updated = db.updateMenuItem(req.params.id, { isAvailable });
        if (!updated) throw new NotFoundError('Item', req.params.id);
        cacheService.invalidateTag('menu');

        auditService.log({
          actorId: req.user!.id,
          actorName: req.user!.name,
          actorRole: req.user!.role,
          action: 'UPDATE_ITEM_AVAILABILITY',
          resource: 'MENU',
          resourceId: req.params.id,
          newValue: { isAvailable },
          requestId: req.requestId
        });

        res.json({ success: true, data: updated, message: 'Item availability updated' });
      } catch (err) {
        next(err);
      }
    }
  );

  app.delete(
    '/api/owner/menu-items/:id',
    requireAuth,
    requirePermission('menu.delete'),
    (req: Request, res: Response, next: NextFunction) => {
      try {
        const success = db.deleteMenuItem(req.params.id);
        if (!success) throw new NotFoundError('Item', req.params.id);
        cacheService.invalidateTag('menu');
        res.json({ success: true, message: 'Menu item deleted' });
      } catch (err) {
        next(err);
      }
    }
  );

  // 8. CUSTOMER ADDRESSES (Resource-level Customer Scoping)
  app.get('/api/addresses/:customerId', requireAuth, (req: Request, res: Response) => {
    if (req.user!.role === 'CUSTOMER' && req.user!.id !== req.params.customerId) {
      throw new ForbiddenError('Access denied: Cannot view another customer\'s address book');
    }
    res.json({ success: true, data: db.getAddresses(req.params.customerId) });
  });

  app.post('/api/addresses/:customerId', requireAuth, (req: Request, res: Response) => {
    if (req.user!.role === 'CUSTOMER' && req.user!.id !== req.params.customerId) {
      throw new ForbiddenError('Access denied: Cannot add address to another customer profile');
    }
    const newAddress = db.saveAddress(req.params.customerId, req.body);
    res.json({ success: true, data: newAddress });
  });

  app.patch(
    '/api/addresses/:customerId/:addressId',
    requireAuth,
    (req: Request, res: Response, next: NextFunction) => {
      try {
        if (req.user!.role === 'CUSTOMER' && req.user!.id !== req.params.customerId) {
          throw new ForbiddenError('Access denied: Cannot modify another customer address');
        }
        const updated = db.updateAddress(req.params.customerId, req.params.addressId, req.body);
        if (!updated) throw new NotFoundError('Address', req.params.addressId);
        res.json({ success: true, data: updated });
      } catch (err) {
        next(err);
      }
    }
  );

  app.delete(
    '/api/addresses/:customerId/:addressId',
    requireAuth,
    (req: Request, res: Response, next: NextFunction) => {
      try {
        if (req.user!.role === 'CUSTOMER' && req.user!.id !== req.params.customerId) {
          throw new ForbiddenError('Access denied: Cannot delete another customer address');
        }
        const deleted = db.deleteAddress(req.params.customerId, req.params.addressId);
        if (!deleted) throw new NotFoundError('Address', req.params.addressId);
        res.json({ success: true, message: 'Address deleted successfully' });
      } catch (err) {
        next(err);
      }
    }
  );

  // 9. CART REVALIDATION (Public Anti-Tamper Pricing Check)
  app.post('/api/cart/validate', (req: Request, res: Response) => {
    try {
      const { items } = req.body;
      const calculation = orderService.validateAndCalculateCart(items);
      res.json({
        success: true,
        valid: true,
        data: {
          subtotal: calculation.subtotal,
          deliveryFee: calculation.deliveryFee,
          tax: calculation.tax,
          grandTotal: calculation.grandTotal,
          items: calculation.orderItemSnapshots
        }
      });
    } catch (err: any) {
      res.json({
        success: true,
        valid: false,
        message: err.message
      });
    }
  });

  // 10. ORDERS MANAGEMENT (Strictly scoped by Authenticated Role)
  app.get('/api/orders', requireAuth, (req: Request, res: Response) => {
    let orders = db.getOrders();
    const { status } = req.query;

    if (req.user!.role === 'CUSTOMER') {
      // Customer can strictly ONLY see their own orders
      orders = orders.filter((o) => o.customerId === req.user!.id);
    } else if (req.user!.role === 'DELIVERY_PARTNER') {
      // Delivery partner sees assigned orders or available ready orders
      orders = orders.filter(
        (o) =>
          o.assignedDeliveryPartnerId === req.user!.id ||
          (o.status === 'READY' && !o.assignedDeliveryPartnerId)
      );
    } else {
      // STAFF or OWNER sees restaurant-wide orders
      if (status) {
        orders = orders.filter((o) => o.status === status);
      }
    }

    res.json({ success: true, data: orders });
  });

  app.get('/api/orders/:id', requireAuth, (req: Request, res: Response, next: NextFunction) => {
    try {
      const order = db.getOrderById(req.params.id);
      if (!order) throw new NotFoundError('Order', req.params.id);

      // Verify access permission
      if (req.user!.role === 'CUSTOMER' && order.customerId !== req.user!.id) {
        throw new ForbiddenError('Access denied: You do not own this order');
      }
      if (
        req.user!.role === 'DELIVERY_PARTNER' &&
        order.assignedDeliveryPartnerId !== req.user!.id &&
        order.status !== 'READY'
      ) {
        throw new ForbiddenError('Access denied: Order is not assigned to you');
      }

      res.json({ success: true, data: order });
    } catch (err) {
      next(err);
    }
  });

  app.post(
    '/api/orders',
    requireAuth,
    requireRole('CUSTOMER', 'OWNER', 'STAFF'),
    (req: Request, res: Response, next: NextFunction) => {
      try {
        const orderData = { ...req.body };

        // For customers, enforce authentic session identity so customer cannot spoof another customer
        if (req.user!.role === 'CUSTOMER') {
          orderData.customerId = req.user!.id;
          orderData.customerName = req.user!.name;
          orderData.customerPhone = req.user!.phone;
        }

        const newOrder = orderService.createOrder(orderData, req.requestId);
        res.json({ success: true, data: newOrder, message: 'Order placed successfully!' });
      } catch (err) {
        next(err);
      }
    }
  );

  // 11. FINITE STATE TRANSITIONS FOR ORDERS (Role & Permission Gated)
  app.post(
    '/api/orders/:id/accept',
    requireAuth,
    requirePermission('orders.update'),
    (req: Request, res: Response, next: NextFunction) => {
      try {
        const updated = orderService.transitionStatus(req.params.id, 'ACCEPTED', req.user!, req.requestId);
        res.json({ success: true, data: updated });
      } catch (err) {
        next(err);
      }
    }
  );

  app.post(
    '/api/orders/:id/reject',
    requireAuth,
    requirePermission('orders.update'),
    (req: Request, res: Response, next: NextFunction) => {
      try {
        const { reason } = req.body;
        const updated = orderService.transitionStatus(
          req.params.id,
          'REJECTED',
          req.user!,
          req.requestId,
          { rejectionReason: reason }
        );
        res.json({ success: true, data: updated });
      } catch (err) {
        next(err);
      }
    }
  );

  app.post(
    '/api/orders/:id/prepare',
    requireAuth,
    requirePermission('orders.update'),
    (req: Request, res: Response, next: NextFunction) => {
      try {
        const updated = orderService.transitionStatus(req.params.id, 'PREPARING', req.user!, req.requestId);
        res.json({ success: true, data: updated });
      } catch (err) {
        next(err);
      }
    }
  );

  app.post(
    '/api/orders/:id/ready',
    requireAuth,
    requirePermission('orders.update'),
    (req: Request, res: Response, next: NextFunction) => {
      try {
        const updated = orderService.transitionStatus(req.params.id, 'READY', req.user!, req.requestId);
        res.json({ success: true, data: updated });
      } catch (err) {
        next(err);
      }
    }
  );

  app.post(
    '/api/orders/:id/assign-delivery',
    requireAuth,
    requirePermission('orders.assign'),
    (req: Request, res: Response, next: NextFunction) => {
      try {
        const { deliveryPartnerId } = req.body;
        if (!deliveryPartnerId) {
          throw new ValidationError('Delivery partner ID required');
        }
        const updated = orderService.transitionStatus(
          req.params.id,
          'ASSIGNED',
          req.user!,
          req.requestId,
          { deliveryPartnerId }
        );
        res.json({ success: true, data: updated });
      } catch (err) {
        next(err);
      }
    }
  );

  app.post(
    '/api/orders/:id/pickup',
    requireAuth,
    requirePermission('orders.deliver'),
    (req: Request, res: Response, next: NextFunction) => {
      try {
        const order = db.getOrderById(req.params.id);
        if (!order) throw new NotFoundError('Order', req.params.id);

        if (req.user!.role === 'DELIVERY_PARTNER' && order.assignedDeliveryPartnerId !== req.user!.id) {
          throw new ForbiddenError('Access denied: You are not assigned to this delivery order');
        }

        const updated = orderService.transitionStatus(req.params.id, 'PICKED_UP', req.user!, req.requestId);
        res.json({ success: true, data: updated });
      } catch (err) {
        next(err);
      }
    }
  );

  app.post(
    '/api/orders/:id/out-for-delivery',
    requireAuth,
    requirePermission('orders.deliver'),
    (req: Request, res: Response, next: NextFunction) => {
      try {
        const order = db.getOrderById(req.params.id);
        if (!order) throw new NotFoundError('Order', req.params.id);

        if (req.user!.role === 'DELIVERY_PARTNER' && order.assignedDeliveryPartnerId !== req.user!.id) {
          throw new ForbiddenError('Access denied: You are not assigned to this delivery order');
        }

        const updated = orderService.transitionStatus(
          req.params.id,
          'OUT_FOR_DELIVERY',
          req.user!,
          req.requestId
        );
        res.json({ success: true, data: updated });
      } catch (err) {
        next(err);
      }
    }
  );

  app.post(
    '/api/orders/:id/deliver',
    requireAuth,
    requirePermission('orders.deliver'),
    (req: Request, res: Response, next: NextFunction) => {
      try {
        const order = db.getOrderById(req.params.id);
        if (!order) throw new NotFoundError('Order', req.params.id);

        if (req.user!.role === 'DELIVERY_PARTNER' && order.assignedDeliveryPartnerId !== req.user!.id) {
          throw new ForbiddenError('Access denied: You are not assigned to this delivery order');
        }

        const updated = orderService.transitionStatus(req.params.id, 'DELIVERED', req.user!, req.requestId);
        res.json({ success: true, data: updated });
      } catch (err) {
        next(err);
      }
    }
  );

  app.post(
    '/api/orders/:id/cancel',
    requireAuth,
    (req: Request, res: Response, next: NextFunction) => {
      try {
        const order = db.getOrderById(req.params.id);
        if (!order) throw new NotFoundError('Order', req.params.id);

        // Authorization: Customer can only cancel their own PLACED order; staff/owner needs orders.cancel
        if (req.user!.role === 'CUSTOMER') {
          if (order.customerId !== req.user!.id) {
            throw new ForbiddenError('Access denied: You do not own this order');
          }
          if (order.status !== 'PLACED') {
            throw new ForbiddenError('Order can no longer be cancelled as kitchen has started preparation');
          }
        } else if (req.user!.role !== 'OWNER' && !req.user!.permissions?.includes('orders.cancel')) {
          throw new ForbiddenError('Access denied: Missing orders.cancel permission');
        }

        const { reason } = req.body;
        const updated = orderService.transitionStatus(
          req.params.id,
          'CANCELLED',
          req.user!,
          req.requestId,
          { cancellationReason: reason || 'Cancelled by user' }
        );
        res.json({ success: true, data: updated });
      } catch (err) {
        next(err);
      }
    }
  );

  // 12. DELIVERY BATCHING
  app.post(
    '/api/delivery/batches',
    requireAuth,
    requireRole('OWNER', 'STAFF'),
    (req: Request, res: Response, next: NextFunction) => {
      try {
        const { deliveryPartnerId, orderIds } = req.body;
        if (!deliveryPartnerId || !orderIds || orderIds.length === 0) {
          throw new ValidationError('Delivery partner and order list required');
        }
        const batch = db.createDeliveryBatch(deliveryPartnerId, orderIds);
        res.json({ success: true, data: batch, message: `Created Delivery Batch ${batch.batchNumber}` });
      } catch (err) {
        next(err);
      }
    }
  );

  app.get('/api/delivery/batches', requireAuth, (req: Request, res: Response) => {
    let batches = db.getDeliveryBatches();
    if (req.user!.role === 'DELIVERY_PARTNER') {
      batches = batches.filter((b) => b.deliveryPartnerId === req.user!.id);
    }
    res.json({ success: true, data: batches });
  });

  // 13. REVIEWS & RATINGS
  app.get('/api/reviews', (req: Request, res: Response) => {
    res.json({ success: true, data: db.getReviews() });
  });

  app.get('/api/menu-items/:id/reviews', (req: Request, res: Response) => {
    const data = db.getMenuItemReviews(req.params.id);
    res.json({ success: true, data });
  });

  app.post('/api/reviews', requireAuth, (req: Request, res: Response, next: NextFunction) => {
    try {
      const reviewData = {
        ...req.body,
        customerId: req.user!.id,
        customerName: req.user!.name
      };
      const review = db.createReview(reviewData);
      res.json({ success: true, data: review, message: 'Thank you for your feedback!' });
    } catch (err) {
      next(err);
    }
  });

  // 14. NOTIFICATIONS
  app.get('/api/notifications/:userId', requireAuth, (req: Request, res: Response) => {
    if (req.user!.role === 'CUSTOMER' && req.user!.id !== req.params.userId) {
      throw new ForbiddenError('Access denied');
    }
    res.json({ success: true, data: db.getNotifications(req.params.userId) });
  });

  app.patch('/api/notifications/:id/read', requireAuth, (req: Request, res: Response) => {
    db.markNotificationAsRead(req.params.id);
    res.json({ success: true });
  });

  // 15. ANALYTICS & PRODUCTION OBSERVABILITY APIS (Strictly Owner-Only)
  app.get('/api/owner/analytics', requireAuth, requireRole('OWNER'), (req: Request, res: Response) => {
    res.json({ success: true, data: db.getAnalytics() });
  });

  // Production Audit Trail Endpoint
  app.get('/api/owner/audit-logs', requireAuth, requireRole('OWNER'), (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 100;
    res.json({ success: true, data: auditService.getLogs(limit) });
  });

  // Cryptographic Chain Integrity Verification Endpoint
  app.get('/api/owner/audit-logs/verify', requireAuth, requireRole('OWNER'), (req: Request, res: Response) => {
    const integrityReport = auditService.verifyIntegrity();
    res.json({ success: true, data: integrityReport });
  });

  // Production Outbox Monitor Endpoint
  app.get('/api/owner/outbox', requireAuth, requireRole('OWNER'), (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 50;
    res.json({ success: true, data: outboxRepository.getAll(limit) });
  });

  // Production Data Integrity & Reconciliation Audit Endpoint
  app.get('/api/owner/reconciliation', requireAuth, requireRole('OWNER'), (req: Request, res: Response) => {
    const report = reconciliationService.runAudit();
    res.json({ success: true, data: report });
  });

  // 16. GLOBAL ERROR HANDLER
  app.use(errorHandler);

  // 17. VITE MIDDLEWARE FOR DEV & STATIC SERVING FOR PRODUCTION
  if (process.env.NODE_ENV !== 'production') {
    const isHmrDisabled = process.env.DISABLE_HMR === 'true';
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: isHmrDisabled ? false : undefined
      },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // 18. SERVER BOOT & BACKGROUND WORKER INITIALIZATION
  const server = app.listen(PORT, '0.0.0.0', () => {
    logger.info(`Hunter's Kitchen Server booted on port ${PORT} [ENV: ${config.env}]`);
    outboxWorker.start();
  });

  // 19. GRACEFUL SHUTDOWN HANDLERS
  setupGracefulShutdown(server);
}

startServer();
