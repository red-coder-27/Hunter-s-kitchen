import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/authService';
import { db } from '../db';
import { UnauthorizedError, ForbiddenError } from '../errors/AppError';
import { User, UserRole, StaffSubRole } from '../../types';

declare global {
  namespace Express {
    interface Request {
      user?: User;
      authToken?: string;
      restaurantId?: string;
    }
  }
}

/**
 * Extracts session token from cookie (hk_session) or Authorization: Bearer <token>
 */
export function extractToken(req: Request): string | null {
  // 1. Check HTTP-only cookie
  if (req.cookies && req.cookies.hk_session) {
    return req.cookies.hk_session;
  }

  // 2. Check Authorization Bearer header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }

  // 3. Fallback check for query token (SSE event streams / websocket connect)
  if (req.query && typeof req.query.token === 'string') {
    return req.query.token;
  }

  return null;
}

/**
 * Middleware: Strictly requires authenticated user session
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const token = extractToken(req);
    if (!token) {
      throw new UnauthorizedError('Authentication required. Please log in.');
    }

    const payload = authService.verifyToken(token);
    const user = db.getUserById(payload.userId);

    if (!user) {
      throw new UnauthorizedError('User account not found or removed.');
    }

    if (user.status === 'SUSPENDED') {
      throw new ForbiddenError('Account has been suspended. Please contact management.');
    }
    if (user.status === 'INACTIVE') {
      throw new ForbiddenError('Account is inactive.');
    }
    if (user.status === 'INVITED') {
      throw new ForbiddenError('Account invitation pending activation.');
    }

    req.user = user;
    req.authToken = token;
    req.restaurantId = user.restaurantId || payload.restaurantId || 'rest_hunter_01';

    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Middleware: Optional authentication (loads user if token present)
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const token = extractToken(req);
    if (token) {
      const payload = authService.verifyToken(token);
      const user = db.getUserById(payload.userId);
      if (user && user.status === 'ACTIVE') {
        req.user = user;
        req.authToken = token;
        req.restaurantId = user.restaurantId || payload.restaurantId || 'rest_hunter_01';
      }
    }
  } catch (err) {
    // Ignore invalid token for optional auth
  }
  next();
}

/**
 * Middleware: Authorize by Role
 */
export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    const userRole = req.user.role;
    const effectiveRoles = userRole === 'OWNER' || userRole === 'ADMIN' ? ['OWNER', 'ADMIN'] : [userRole];
    const isAllowed = roles.some((r) => effectiveRoles.includes(r));

    if (!isAllowed) {
      return next(
        new ForbiddenError(`Access denied: Requires role ${roles.join(' or ')}`)
      );
    }

    next();
  };
}

/**
 * Middleware: Authorize by Staff Sub-Role (Admin/Owner is always permitted)
 */
export function requireStaffSubRole(...subRoles: StaffSubRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    if (req.user.role === 'OWNER' || req.user.role === 'ADMIN') {
      return next(); // Admin has universal clearance
    }

    if (req.user.role === 'STAFF' && req.user.staffRole && subRoles.includes(req.user.staffRole)) {
      return next();
    }

    return next(new ForbiddenError('Access denied: Insufficient staff permissions for this action.'));
  };
}

/**
 * Middleware: Authorize by fine-grained Permission (Admin/Owner is always permitted)
 */
export function requirePermission(...permissions: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    if (req.user.role === 'OWNER' || req.user.role === 'ADMIN') {
      return next(); // Admin has universal clearance
    }

    const userPermissions = req.user.permissions || [];
    const hasAll = permissions.every((p) => userPermissions.includes(p));

    if (!hasAll) {
      return next(new ForbiddenError(`Access denied: Missing required permission(s)`));
    }

    next();
  };
}

/**
 * Middleware: CSRF Protection for state-mutating requests
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  const mutatingMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
  if (!mutatingMethods.includes(req.method)) {
    return next();
  }

  // If using Authorization Bearer token, CSRF is not applicable
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return next();
  }

  // If using cookies, ensure request includes custom anti-CSRF header
  const isCookieAuth = req.cookies && req.cookies.hk_session;
  if (isCookieAuth) {
    const requestedWith = req.headers['x-requested-with'];
    const csrfToken = req.headers['x-csrf-token'];
    if (!requestedWith && !csrfToken) {
      return next(new ForbiddenError('CSRF protection: missing required request header'));
    }
  }

  next();
}
