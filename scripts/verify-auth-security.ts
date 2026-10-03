/**
 * Comprehensive Auth Security & HttpOnly Cookie Verification Suite
 * Tests:
 * 1. Centralized Session Cookie Security Attributes (HttpOnly, Path, SameSite, Secure)
 * 2. Token Generation & Verification
 * 3. Token Revocation via Redis L1/L2 Persistence & Lockout
 * 4. CSRF Protection Middleware (Origin Verification + Anti-CSRF Header Requirements)
 * 5. Frontend Clean State (Zero localStorage/sessionStorage Token Leakage)
 */

import { postgresDb } from '../src/server/db/postgres';
import { authService } from '../src/server/services/authService';
import {
  SESSION_COOKIE_NAME,
  getSessionCookieOptions,
  getClearCookieOptions,
  csrfProtection,
  extractToken
} from '../src/server/middleware/auth';
import { db } from '../src/server/db';
import { User } from '../src/types';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    throw new Error(`Assertion failure: ${message}`);
  }
  console.log(`  ✓ ${message}`);
}

async function runAuthSecuritySuite() {
  await postgresDb.initialize();
  console.log('================================================================');
  console.log('🔒 HUNTER\'S KITCHEN — AUTH & HTTPONLY COOKIE SECURITY TEST SUITE');
  console.log('================================================================\n');

  // -----------------------------------------------------------------
  // 1. Session Cookie Specification & Directives
  // -----------------------------------------------------------------
  console.log('👉 [TEST 1] Session Cookie Options & Enterprise Directives');
  assert(SESSION_COOKIE_NAME === 'hk_session', 'Session cookie name matches standard "hk_session"');
  
  const cookieOpts = getSessionCookieOptions();
  assert(cookieOpts.httpOnly === true, 'Session cookie MUST be httpOnly: true (blocks JavaScript theft via XSS)');
  assert(cookieOpts.path === '/', 'Session cookie path is root-scoped ("/")');
  assert(cookieOpts.maxAge === 24 * 60 * 60 * 1000, 'Session cookie maxAge is 24 hours');
  assert(cookieOpts.sameSite === 'lax' || cookieOpts.sameSite === 'none' || cookieOpts.sameSite === 'strict', 'Session cookie has SameSite protection configured');

  const clearOpts = getClearCookieOptions();
  assert(clearOpts.httpOnly === true, 'Clear cookie retains httpOnly: true');
  assert(clearOpts.path === '/', 'Clear cookie retains path: "/"');

  // -----------------------------------------------------------------
  // 2. Token Generation & Dual-Layer Verification
  // -----------------------------------------------------------------
  console.log('\n👉 [TEST 2] Token Generation & Verification');
  const testUser: User = {
    id: 'usr_sec_test_01',
    name: 'Security Test User',
    email: 'sec-test@hunterskitchen.com',
    phone: '+91 99999 11111',
    role: 'CUSTOMER',
    status: 'ACTIVE',
    restaurantId: 'rest_hunter_01',
    joinedAt: new Date().toISOString(),
    permissions: []
  };

  const { token, expiresAt } = authService.generateToken(testUser);
  assert(typeof token === 'string' && token.split('.').length === 3, 'JWT structure contains 3 valid base64url segments');

  const syncPayload = authService.verifyToken(token);
  assert(syncPayload.userId === testUser.id, 'Sync verification successfully unpacked userId');

  const asyncPayload = await authService.verifyTokenAsync(token);
  assert(asyncPayload.userId === testUser.id, 'Async L2 Redis verification successfully unpacked userId');

  // -----------------------------------------------------------------
  // 3. Persistent Token Revocation & Immediate Session Lockout
  // -----------------------------------------------------------------
  console.log('\n👉 [TEST 3] Token Revocation & Redis Persistence');
  await authService.logout(token, testUser, { ip: '127.0.0.1', requestId: 'req_sec_logout' });

  let syncRevoked = false;
  try {
    authService.verifyToken(token);
  } catch (err: any) {
    syncRevoked = err.message.includes('revoked');
  }
  assert(syncRevoked, 'Sync verification immediately rejects revoked token');

  let asyncRevoked = false;
  try {
    await authService.verifyTokenAsync(token);
  } catch (err: any) {
    asyncRevoked = err.message.includes('revoked');
  }
  assert(asyncRevoked, 'Async Redis verification rejects revoked token');

  // -----------------------------------------------------------------
  // 4. CSRF Middleware Verification (Origin Alignment & Custom Headers)
  // -----------------------------------------------------------------
  console.log('\n👉 [TEST 4] CSRF Defense Against State-Mutating Attacks');

  // 4a. Read-only method (GET) should always bypass CSRF check
  let getPassed = false;
  csrfProtection({ method: 'GET' } as any, {} as any, (err?: any) => {
    getPassed = !err;
  });
  assert(getPassed, 'GET requests bypass CSRF (read-only safe method)');

  // 4b. Mutating POST with cookie session but without anti-CSRF custom header
  let missingHeaderBlocked = false;
  csrfProtection(
    {
      method: 'POST',
      cookies: { [SESSION_COOKIE_NAME]: 'fake_token' },
      headers: {}
    } as any,
    {} as any,
    (err?: any) => {
      if (err && err.statusCode === 403 && err.message.includes('CSRF protection')) {
        missingHeaderBlocked = true;
      }
    }
  );
  assert(missingHeaderBlocked, 'POST with cookie session but NO custom header is blocked (403 Forbidden)');

  // 4c. Mutating POST with cookie session + X-Requested-With header
  let customHeaderPassed = false;
  csrfProtection(
    {
      method: 'POST',
      cookies: { [SESSION_COOKIE_NAME]: 'fake_token' },
      headers: {
        'x-requested-with': 'XMLHttpRequest',
        origin: 'http://localhost:3000',
        host: 'localhost:3000'
      }
    } as any,
    {} as any,
    (err?: any) => {
      customHeaderPassed = !err;
    }
  );
  assert(customHeaderPassed, 'POST with cookie session + X-Requested-With + matching Origin passes CSRF validation');

  // 4d. Mutating POST from an untrusted malicious cross-origin
  let evilOriginBlocked = false;
  csrfProtection(
    {
      method: 'POST',
      cookies: { [SESSION_COOKIE_NAME]: 'fake_token' },
      headers: {
        'x-requested-with': 'XMLHttpRequest',
        origin: 'https://evil-attacker-site.com',
        host: 'hunterskitchen.com'
      }
    } as any,
    {} as any,
    (err?: any) => {
      if (err && err.statusCode === 403 && err.message.includes('untrusted origin')) {
        evilOriginBlocked = true;
      }
    }
  );
  assert(evilOriginBlocked, 'POST from untrusted foreign origin (evil-attacker-site.com) is blocked by Origin check (403)');

  // -----------------------------------------------------------------
  // 5. Frontend Codebase Audit: Zero Token Infiltration into Web Storage
  // -----------------------------------------------------------------
  console.log('\n👉 [TEST 5] Frontend Code Audit for Web Storage Token Leaks');
  const apiTsPath = path.resolve(__dirname, '../src/services/api.ts');
  const apiTsContent = fs.readFileSync(apiTsPath, 'utf8');

  const hasLocalStorageTokenSet = apiTsContent.includes("localStorage.setItem('hk_auth_token'");
  const hasSessionStorageTokenSet = apiTsContent.includes("sessionStorage.setItem('hk_auth_token'");
  const hasLocalStorageTokenGet = apiTsContent.includes("localStorage.getItem('hk_auth_token')");
  const hasSessionStorageTokenGet = apiTsContent.includes("sessionStorage.getItem('hk_auth_token')");

  assert(!hasLocalStorageTokenSet, 'src/services/api.ts NEVER calls localStorage.setItem(\'hk_auth_token\')');
  assert(!hasSessionStorageTokenSet, 'src/services/api.ts NEVER calls sessionStorage.setItem(\'hk_auth_token\')');
  assert(!hasLocalStorageTokenGet, 'src/services/api.ts NEVER reads token from localStorage');
  assert(!hasSessionStorageTokenGet, 'src/services/api.ts NEVER reads token from sessionStorage');

  const hasCredentialsInclude = apiTsContent.includes("credentials: 'include'");
  assert(hasCredentialsInclude, 'src/services/api.ts mandates credentials: \'include\' for automatic HttpOnly cookie transmission');

  console.log('\n================================================================');
  console.log('🎉 ALL AUTH & HTTPONLY COOKIE SECURITY AUDITS PASSED 100%!');
  console.log('================================================================\n');
}

runAuthSecuritySuite().catch((err) => {
  console.error('\n❌ Security verification suite failed:', err);
  process.exit(1);
});
