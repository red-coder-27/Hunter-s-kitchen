import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { db } from '../db';
import { auditService } from './auditService';
import { config } from '../config/config';
import { emailService } from './emailService';
import { UnauthorizedError, ForbiddenError, ValidationError, NotFoundError } from '../errors/AppError';
import { User, UserRole, StaffSubRole, Address } from '../../types';
import { sanitizeAndValidateRegistration, validateAndSanitizeEmail, normalizeEmail } from '../utils/sanitizer';
import { redisService } from './redisService';

export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  staffRole?: StaffSubRole;
  restaurantId: string;
  iat?: number;
  exp?: number;
}

export interface AuthSessionResult {
  user: User;
  token: string;
  expiresAt: string;
}

export interface GoogleVerifiedIdentity {
  sub: string;
  email: string;
  emailVerified: boolean;
  name?: string;
  picture?: string;
}

export class AuthService {
  // In-memory revoked token set (cleared on server restart or expired naturally)
  private revokedTokens = new Set<string>();

  // Helper to sanitize user object for API responses (never exposes credentials or tokens)
  public sanitizeUser(user: User): User {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      staffRole: user.staffRole,
      avatar: user.avatar,
      status: user.status,
      partnerStatus: user.partnerStatus,
      vehicleNumber: user.vehicleNumber,
      vehicleType: user.vehicleType,
      currentRating: user.currentRating,
      totalDeliveries: user.totalDeliveries,
      joinedAt: user.joinedAt,
      permissions: user.permissions || [],
      restaurantId: user.restaurantId || 'rest_hunter_01',
      googleId: user.googleId,
      emailVerified: user.emailVerified
    };
  }

  // Issue signed JWT token
  public generateToken(user: User): { token: string; expiresAt: string } {
    const payload: JWTPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      staffRole: user.staffRole,
      restaurantId: user.restaurantId || 'rest_hunter_01'
    };

    const expiresIn = '24h';
    const token = jwt.sign(payload, config.jwtSecret, { expiresIn });
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    return { token, expiresAt };
  }

  // Synchronous token verification (with L1 memory revocation check)
  public verifyToken(token: string): JWTPayload {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    if (this.revokedTokens.has(token) || this.revokedTokens.has(tokenHash)) {
      throw new UnauthorizedError('Session has been revoked. Please log in again.');
    }

    try {
      const decoded = jwt.verify(token, config.jwtSecret) as JWTPayload;
      return decoded;
    } catch (err: any) {
      if (err.name === 'TokenExpiredError') {
        throw new UnauthorizedError('Session expired. Please log in again.');
      }
      throw new UnauthorizedError('Invalid authentication token.');
    }
  }

  // Asynchronous token verification with persistent Redis L2 revocation check
  public async verifyTokenAsync(token: string): Promise<JWTPayload> {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    if (this.revokedTokens.has(token) || this.revokedTokens.has(tokenHash)) {
      throw new UnauthorizedError('Session has been revoked. Please log in again.');
    }

    const isRevokedInRedis = await redisService.exists(`revoked_jwt:${tokenHash}`);
    if (isRevokedInRedis) {
      this.revokedTokens.add(tokenHash);
      throw new UnauthorizedError('Session has been revoked. Please log in again.');
    }

    return this.verifyToken(token);
  }

  // Customer registration / sign-up with password, contact details & initial delivery address
  public async register(
    payload: {
      name: string;
      email: string;
      phone: string;
      password: string;
      address?: Partial<Address>;
    },
    context: { ip: string; requestId: string; userAgent?: string }
  ): Promise<AuthSessionResult> {
    // Enterprise-grade sanitization and strict format validation
    const sanitized = sanitizeAndValidateRegistration(payload);

    // Prevent duplicate accounts by email
    const existingUser = await db.getUserByEmail(sanitized.email);
    if (existingUser) {
      throw new ValidationError('An account with this email address already exists. Please sign in instead.');
    }

    // Prevent duplicate accounts by phone number
    const allUsers = await db.getUsers();
    const existingPhone = allUsers.find((u) => u.phone === sanitized.phone);
    if (existingPhone) {
      throw new ValidationError('This mobile number is already linked to an existing account. Please sign in or use another number.');
    }

    // Create user in PostgreSQL with hashed credentials
    const newUser = await db.createUser({
      name: sanitized.name,
      email: sanitized.email,
      phone: sanitized.phone,
      role: 'CUSTOMER',
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(sanitized.name)}&background=ea4335&color=fff`,
      status: 'ACTIVE',
      restaurantId: 'rest_hunter_01',
      permissions: [],
      password: sanitized.password
    });

    // Save initial validated delivery address if provided
    if (sanitized.address) {
      await db.saveAddress(newUser.id, sanitized.address as Omit<Address, 'id'>);
    }

    const { token, expiresAt } = this.generateToken(newUser);

    await auditService.log({
      actorId: newUser.id,
      actorName: newUser.name,
      actorRole: newUser.role,
      action: 'USER_REGISTERED',
      resource: 'AUTH',
      resourceId: newUser.id,
      requestId: context.requestId,
      ipAddress: context.ip,
      newValue: { userAgent: context.userAgent, email: newUser.email }
    });

    return {
      user: this.sanitizeUser(newUser),
      token,
      expiresAt
    };
  }

  // Authenticate user with email and password
  public async login(
    emailRaw: string,
    passwordRaw: string,
    context: { ip: string; requestId: string; userAgent?: string }
  ): Promise<AuthSessionResult> {
    const email = (emailRaw || '').trim().toLowerCase();
    const password = passwordRaw || '';

    if (!email || !password) {
      throw new ValidationError('Email and password are required');
    }

    const user = await db.getUserByEmail(email);
    const cred = await db.getAuthCredentialsByEmail(email);

    if (!user) {
      await auditService.log({
        actorId: 'unknown',
        actorName: 'Unknown User',
        actorRole: 'CUSTOMER',
        action: 'LOGIN_FAILED',
        resource: 'AUTH',
        resourceId: email,
        requestId: context.requestId,
        ipAddress: context.ip,
        newValue: { reason: 'USER_NOT_FOUND' }
      });

      throw new UnauthorizedError('No account found with this email address. Please check your email or click "Register as New Customer" below.');
    }

    // Rate-limiting / brute-force lockout check:
    // If more than 5 consecutive failed attempts in the last 15 minutes
    if (cred && cred.failedLoginAttempts && cred.failedLoginAttempts >= 5) {
      const lockWindowMs = 15 * 60 * 1000;
      if (cred.lastFailedLogin && Date.now() - cred.lastFailedLogin < lockWindowMs) {
        const remainingMinutes = Math.ceil((lockWindowMs - (Date.now() - cred.lastFailedLogin)) / 60000);
        throw new ForbiddenError(
          `Account is temporarily locked due to multiple failed login attempts. Please try again in ${remainingMinutes} minute(s) or reset your password.`
        );
      }
    }

    // Secure timing comparison
    let isPasswordValid = false;
    if (cred && cred.passwordHash) {
      isPasswordValid = await bcrypt.compare(password, cred.passwordHash);
    }

    if (!cred || !isPasswordValid) {
      if (cred) {
        await db.recordLoginAttempt(email, false);
      }

      await auditService.log({
        actorId: user.id,
        actorName: user.name,
        actorRole: user.role,
        action: 'LOGIN_FAILED',
        resource: 'AUTH',
        resourceId: email,
        requestId: context.requestId,
        ipAddress: context.ip,
        newValue: { reason: 'INVALID_CREDENTIALS' }
      });

      const failedCount = (cred?.failedLoginAttempts || 0);
      const remaining = Math.max(0, 5 - failedCount);
      const attemptsNote = remaining > 0 && remaining <= 3 ? ` (${remaining} attempt${remaining === 1 ? '' : 's'} remaining before temporary lock)` : '';

      throw new UnauthorizedError(`Incorrect password. Please verify your password and try again, or click "Forgot password?" to reset.${attemptsNote}`);
    }

    // Account Status Authorization Checks
    if (user.status === 'SUSPENDED') {
      throw new ForbiddenError('Your account has been suspended. Please contact management.');
    }
    if (user.status === 'INVITED') {
      throw new ForbiddenError('Your account invitation is pending activation. Please use your activation link.');
    }
    if (user.status === 'INACTIVE') {
      throw new ForbiddenError('Your account is currently inactive. Please contact support.');
    }

    // Reset failed attempts on success
    await db.recordLoginAttempt(email, true);

    const { token, expiresAt } = this.generateToken(user);

    await auditService.log({
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      action: 'USER_LOGIN',
      resource: 'AUTH',
      resourceId: user.id,
      requestId: context.requestId,
      ipAddress: context.ip,
      newValue: { userAgent: context.userAgent }
    });

    return {
      user: this.sanitizeUser(user),
      token,
      expiresAt
    };
  }

  // Revoke session token
  public async logout(
    token?: string,
    user?: User,
    context?: { ip?: string; requestId?: string }
  ): Promise<void> {
    if (token) {
      this.revokedTokens.add(token);
      try {
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        this.revokedTokens.add(tokenHash);
        // Persist revoked token hash in Redis cache for 24h
        await redisService.set(`revoked_jwt:${tokenHash}`, '1', 24 * 60 * 60);
      } catch {
        // Fallback gracefully if Redis is momentarily unavailable
      }
    }

    if (user) {
      await auditService.log({
        actorId: user.id,
        actorName: user.name,
        actorRole: user.role,
        action: 'USER_LOGOUT',
        resource: 'AUTH',
        resourceId: user.id,
        requestId: context?.requestId || 'req_logout',
        ipAddress: context?.ip
      });
    }
  }

  // Request password reset token
  public async forgotPassword(
    emailRaw: string,
    context: { ip: string; requestId: string }
  ): Promise<{ message: string; resetToken?: string }> {
    const email = (emailRaw || '').trim().toLowerCase();
    if (!email) {
      throw new ValidationError('Email is required');
    }

    const user = await db.getUserByEmail(email);
    let generatedToken: string | undefined;

    if (user && user.status === 'ACTIVE') {
      generatedToken = crypto.randomBytes(24).toString('hex');
      const oneHourMs = 60 * 60 * 1000;
      await db.setResetPasswordToken(email, generatedToken, oneHourMs);

      await auditService.log({
        actorId: user.id,
        actorName: user.name,
        actorRole: user.role,
        action: 'PASSWORD_RESET_REQUESTED',
        resource: 'AUTH',
        resourceId: user.id,
        requestId: context.requestId,
        ipAddress: context.ip
      });
    }

    // Security best practice: Always return generic success message to prevent user enumeration
    return {
      message: 'If the provided email is registered, password reset instructions have been dispatched.',
      resetToken: config.env !== 'production' ? generatedToken : undefined
    };
  }

  // Complete password reset with token
  public async resetPassword(
    tokenRaw: string,
    newPasswordRaw: string,
    context: { ip: string; requestId: string }
  ): Promise<{ message: string }> {
    const token = (tokenRaw || '').trim();
    const newPassword = newPasswordRaw || '';

    if (!token) {
      throw new ValidationError('Reset token is required');
    }
    if (!newPassword || newPassword.length < 8) {
      throw new ValidationError('Password must be at least 8 characters long');
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    const userId = await db.verifyAndConsumeResetToken(token, newHash);

    if (!userId) {
      throw new ValidationError('Invalid or expired password reset token');
    }

    const user = await db.getUserById(userId);
    if (user) {
      await auditService.log({
        actorId: user.id,
        actorName: user.name,
        actorRole: user.role,
        action: 'PASSWORD_RESET_COMPLETED',
        resource: 'AUTH',
        resourceId: user.id,
        requestId: context.requestId,
        ipAddress: context.ip
      });
    }

    return { message: 'Password has been reset successfully. You can now log in.' };
  }

  // Complete staff invitation activation
  public async acceptInvite(
    inviteTokenRaw: string,
    passwordRaw: string,
    context: { ip: string; requestId: string }
  ): Promise<{ user: User; message: string }> {
    const token = (inviteTokenRaw || '').trim();
    const password = passwordRaw || '';

    if (!token) {
      throw new ValidationError('Invitation token is required');
    }
    if (!password || password.length < 8) {
      throw new ValidationError('Password must be at least 8 characters long');
    }

    const newHash = await bcrypt.hash(password, 10);
    const activatedUser = await db.acceptInvite(token, newHash);

    if (!activatedUser) {
      throw new ValidationError('Invalid or expired invitation token');
    }

    await auditService.log({
      actorId: activatedUser.id,
      actorName: activatedUser.name,
      actorRole: activatedUser.role,
      action: 'ACCOUNT_ACTIVATED',
      resource: 'AUTH',
      resourceId: activatedUser.id,
      requestId: context.requestId,
      ipAddress: context.ip
    });

    return {
      user: this.sanitizeUser(activatedUser),
      message: 'Account activated successfully. You can now log in.'
    };
  }

  // Real-time OTP dispatch via Gmail service
  public async sendGmailOtp(
    emailRaw: string,
    purpose: 'LOGIN' | 'FORGOT_PASSWORD' | 'EMAIL_CHANGE' = 'FORGOT_PASSWORD',
    context: { ip: string; requestId: string }
  ) {
    const emailValidation = validateAndSanitizeEmail(emailRaw);
    if (!emailValidation.isValid) {
      throw new ValidationError(emailValidation.error || 'Please enter a valid Gmail address');
    }

    const email = emailValidation.value;
    if (!email.endsWith('@gmail.com') && !email.endsWith('@googlemail.com')) {
      throw new ValidationError('Please enter a valid Gmail address');
    }

    // Gmail username cannot start with dot, end with dot, or have consecutive dots
    const [localPart] = email.split('@');
    if (localPart.startsWith('.') || localPart.endsWith('.') || localPart.includes('..')) {
      throw new ValidationError('Please enter a valid Gmail address');
    }

    // Normalize Gmail address by stripping dots (e.g., john.smith@gmail.com -> johnsmith@gmail.com)
    const normalizedEmail = normalizeEmail(email);

    const user = await db.getUserByEmail(normalizedEmail);
    const dispatch = await emailService.sendOtpEmail({
      email: normalizedEmail,
      purpose,
      userName: user?.name
    });

    if (user) {
      await auditService.log({
        actorId: user.id,
        actorName: user.name,
        actorRole: user.role,
        action: 'OTP_DISPATCHED',
        resource: 'AUTH',
        resourceId: user.id,
        requestId: context.requestId,
        ipAddress: context.ip,
        newValue: { channel: dispatch.channel, purpose, targetEmail: normalizedEmail }
      });
    }

    return dispatch;
  }

  // Direct Login with OTP (Gmail Verification)
  public async loginWithOtp(
    emailRaw: string,
    otpRaw: string,
    context: { ip: string; requestId: string; userAgent?: string }
  ): Promise<AuthSessionResult> {
    const emailValidation = validateAndSanitizeEmail(emailRaw);
    if (!emailValidation.isValid) {
      throw new ValidationError(emailValidation.error || 'Please enter a valid Gmail address');
    }

    const email = emailValidation.value;
    const otp = (otpRaw || '').trim();

    if (!otp) {
      throw new ValidationError('6-digit verification PIN code is required');
    }

    // Normalize Gmail address so dots resolve to the same single account
    const normalizedEmail = normalizeEmail(email);

    const verification = await emailService.verifyOtpDetailed(normalizedEmail, otp, 'LOGIN');
    if (!verification.valid) {
      throw new ValidationError(verification.message || 'Incorrect verification code. Please check your Gmail and try again.');
    }

    let user = await db.getUserByEmail(normalizedEmail);
    if (!user) {
      // Auto-provision verified customer account if logging in for the first time
      user = await db.createUser({
        name: normalizedEmail.split('@')[0],
        email: normalizedEmail,
        phone: '+91 90000 00000',
        role: 'CUSTOMER',
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(normalizedEmail.split('@')[0])}&background=ea4335&color=fff`,
        status: 'ACTIVE',
        restaurantId: 'rest_hunter_01',
        permissions: [],
        password: `Otp#User_${crypto.randomBytes(8).toString('hex')}`
      });
    }

    // Account Status Authorization Checks
    if (user.status === 'SUSPENDED') {
      throw new ForbiddenError('Your account has been suspended. Please contact management.');
    }
    if (user.status === 'INACTIVE') {
      throw new ForbiddenError('Your account is currently inactive. Please contact support.');
    }

    const { token, expiresAt } = this.generateToken(user);

    await auditService.log({
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      action: 'LOGIN_OTP_SUCCESS',
      resource: 'AUTH',
      resourceId: user.id,
      requestId: context.requestId,
      ipAddress: context.ip,
      newValue: { userAgent: context.userAgent }
    });

    return {
      user: this.sanitizeUser(user),
      token,
      expiresAt
    };
  }

  // Real-time OTP verification against Redis for password reset
  public async verifyGmailOtp(
    emailRaw: string,
    otpRaw: string,
    context: { ip: string; requestId: string }
  ) {
    const email = (emailRaw || '').trim().toLowerCase();
    const otp = (otpRaw || '').trim();

    if (!email || !otp) {
      throw new ValidationError('Email and 6-digit OTP are required');
    }

    const verification = await emailService.verifyOtpDetailed(email, otp, 'FORGOT_PASSWORD');
    if (!verification.valid) {
      throw new ValidationError(verification.message || 'Incorrect verification code. Please check your Gmail and try again.');
    }

    // Generate single-use password reset authorization token valid for 15 mins
    const resetToken = `otp_rst_${crypto.randomBytes(20).toString('hex')}`;
    await db.setResetPasswordToken(email, resetToken, 15 * 60 * 1000);

    const user = await db.getUserByEmail(email);
    if (user) {
      await auditService.log({
        actorId: user.id,
        actorName: user.name,
        actorRole: user.role,
        action: 'OTP_VERIFIED_SUCCESSFULLY',
        resource: 'AUTH',
        resourceId: user.id,
        requestId: context.requestId,
        ipAddress: context.ip
      });
    }

    return {
      success: true,
      message: 'Verification code confirmed. Please set your new password.',
      resetToken
    };
  }

  // Google OpenID Connect (OIDC) authentication with verified Google identity
  public async loginWithVerifiedGoogle(
    identity: GoogleVerifiedIdentity,
    context: { ip: string; requestId: string; userAgent?: string }
  ): Promise<AuthSessionResult> {
    if (!identity.sub || !identity.sub.trim()) {
      throw new ValidationError('Google subject identifier (sub) is required');
    }
    if (!identity.email || !identity.email.trim()) {
      throw new ValidationError('Google email address is required');
    }
    if (!identity.emailVerified) {
      throw new ForbiddenError('Google account email has not been verified by Google');
    }

    const email = identity.email.trim().toLowerCase();
    const sub = identity.sub.trim();

    // 1. Authoritative lookup by googleId (sub)
    let user = await db.getUserByGoogleId(sub);

    if (!user) {
      // 2. Lookup by verified email for account linking
      const existingUserByEmail = await db.getUserByEmail(email);

      if (existingUserByEmail) {
        // If already linked to a different googleId, reject with ForbiddenError to prevent account collision
        if (existingUserByEmail.googleId && existingUserByEmail.googleId !== sub) {
          throw new ForbiddenError('This email is already associated with a different Google account identity');
        }

        // Link verified Google identity to existing local account
        await db.updateUser(existingUserByEmail.id, {
          googleId: sub,
          emailVerified: true,
          avatar: existingUserByEmail.avatar || identity.picture
        });
        user = (await db.getUserById(existingUserByEmail.id))!;
      } else {
        // 3. Auto-provision new customer account with verified Google identity
        user = await db.createUser({
          name: identity.name || email.split('@')[0],
          email: email,
          phone: '+91 90000 00000',
          role: 'CUSTOMER',
          avatar: identity.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(identity.name || email.split('@')[0])}&background=ea4335&color=fff`,
          status: 'ACTIVE',
          restaurantId: 'rest_hunter_01',
          googleId: sub,
          emailVerified: true,
          permissions: [],
          password: `G#Auth_${crypto.randomBytes(16).toString('hex')}`
        });
      }
    }

    // Account Status Authorization Checks
    if (user.status === 'SUSPENDED') {
      throw new ForbiddenError('Your account has been suspended. Please contact management.');
    }
    if (user.status === 'INACTIVE') {
      throw new ForbiddenError('Your account is currently inactive. Please contact support.');
    }

    const { token, expiresAt } = this.generateToken(user);

    // Audit log only non-sensitive metadata (never log tokens, codes, or secrets)
    await auditService.log({
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      action: 'LOGIN_GOOGLE_OAUTH_SUCCESS',
      resource: 'AUTH',
      resourceId: user.id,
      requestId: context.requestId,
      ipAddress: context.ip,
      newValue: {
        provider: 'google',
        googleSub: sub,
        email: user.email,
        userAgent: context.userAgent
      }
    });

    return {
      user: this.sanitizeUser(user),
      token,
      expiresAt
    };
  }
}

export const authService = new AuthService();
