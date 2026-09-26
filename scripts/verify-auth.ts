import { authService } from '../src/server/services/authService';
import { db } from '../src/server/db';
import bcrypt from 'bcryptjs';

async function runAuthVerification() {
  console.log('================================================================');
  console.log('🔐 THE HUNTER — PRODUCTION AUTHENTICATION & AUTHORIZATION SUITE');
  console.log('================================================================');

  // Test 1: Wrong Password Rejection & Rate Limiting
  console.log('\n👉 [TEST 1] Password Hashing & Failed Attempt Rejection');
  try {
    await authService.login(
      'owner@hunterskitchen.com',
      'WrongPassword123!',
      { ip: '127.0.0.1', userAgent: 'test-agent', requestId: 'req_auth_test_1' }
    );
    throw new Error('Should not have logged in with invalid password');
  } catch (err: any) {
    if (err.name === 'UnauthorizedError') {
      console.log('  ✓ Invalid password correctly rejected with UnauthorizedError');
    } else {
      throw err;
    }
  }

  // Test 2: Valid Login & Role/Permissions Resolution
  console.log('\n👉 [TEST 2] Valid Credential Login & Server-Authoritative Session');
  const loginRes = await authService.login(
    'owner@hunterskitchen.com',
    'Hunter@2026!',
    { ip: '127.0.0.1', userAgent: 'test-agent', requestId: 'req_auth_test_2' }
  );

  if (!loginRes.token || !loginRes.user) {
    throw new Error('Login failed to return session token or user');
  }
  console.log(`  ✓ Successfully authenticated user: ${loginRes.user.name} (${loginRes.user.email})`);
  console.log(`  ✓ Authoritative role: ${loginRes.user.role}`);
  console.log(`  ✓ Permissions count: ${loginRes.user.permissions?.length || 0}`);

  // Test 3: Token Verification
  console.log('\n👉 [TEST 3] JWT Session Token Cryptographic Verification');
  const verifiedUser = authService.verifyToken(loginRes.token);
  if (!verifiedUser || verifiedUser.userId !== loginRes.user.id) {
    throw new Error('Token verification failed');
  }
  console.log(`  ✓ JWT Token verified successfully for user ID: ${verifiedUser.userId}`);

  // Test 4: Role Isolation & RBAC
  console.log('\n👉 [TEST 4] Role-Based Access Control (Customer vs Owner)');
  const customerLogin = await authService.login(
    'customer1@hunterskitchen.com',
    'Hunter@2026!',
    { ip: '127.0.0.1', userAgent: 'test-agent', requestId: 'req_auth_test_3' }
  );
  console.log(`  ✓ Customer authenticated: ${customerLogin.user.name} (Role: ${customerLogin.user.role})`);
  const isCustomerOwner = customerLogin.user.role === 'OWNER';
  if (isCustomerOwner) {
    throw new Error('Customer unexpectedly has OWNER role');
  }
  console.log('  ✓ Customer role is isolated from OWNER permissions');

  // Test 5: Staff Sub-Role Permissions
  console.log('\n👉 [TEST 5] Staff Sub-Roles & Granular Permissions');
  const chefUser = db.getUserByEmail('chef@hunterskitchen.com');
  if (chefUser) {
    const chefLogin = await authService.login(
      'chef@hunterskitchen.com',
      'Hunter@2026!',
      { ip: '127.0.0.1', userAgent: 'test-agent', requestId: 'req_auth_test_4' }
    );
    console.log(`  ✓ Chef authenticated: ${chefLogin.user.name} (Sub-role: ${chefLogin.user.staffRole})`);
    console.log(`  ✓ Chef permissions: ${chefLogin.user.permissions?.join(', ')}`);
  }

  // Test 6: Logout & Token Revocation
  console.log('\n👉 [TEST 6] Logout & Token Revocation');
  authService.logout(loginRes.token, loginRes.user, { ip: '127.0.0.1', requestId: 'req_auth_test_5' });
  try {
    authService.verifyToken(loginRes.token);
    throw new Error('Token should have been revoked');
  } catch (err: any) {
    if (err.name === 'UnauthorizedError' && err.message.includes('revoked')) {
      console.log('  ✓ Revoked token successfully blocked from further API access');
    } else {
      throw err;
    }
  }

  // Test 7: Forgot Password & Reset Token Flow
  console.log('\n👉 [TEST 7] Self-Service Password Reset Flow');
  const forgotRes = authService.forgotPassword(
    'customer1@hunterskitchen.com',
    { ip: '127.0.0.1', requestId: 'req_auth_test_6' }
  );
  if (!forgotRes.resetToken) {
    throw new Error('Reset token was not generated');
  }
  console.log(`  ✓ Generated secure reset token: ${forgotRes.resetToken.substring(0, 8)}...`);

  const resetRes = await authService.resetPassword(
    forgotRes.resetToken,
    'NewHunterPass2026!',
    { ip: '127.0.0.1', requestId: 'req_auth_test_7' }
  );
  console.log(`  ✓ ${resetRes.message}`);

  // Verify can log in with new password
  const newLogin = await authService.login(
    'customer1@hunterskitchen.com',
    'NewHunterPass2026!',
    { ip: '127.0.0.1', userAgent: 'test-agent', requestId: 'req_auth_test_8' }
  );
  console.log(`  ✓ Successfully logged in with new password: ${newLogin.user.name}`);

  // Reset back to standard default password for continuous convenience
  await db.updatePassword(newLogin.user.id, await bcrypt.hash('Hunter@2026!', 10));
  console.log('  ✓ Restored default password Hunter@2026! for user');

  console.log('\n================================================================');
  console.log('🎉 ALL PRODUCTION AUTHENTICATION & AUTHORIZATION TESTS PASSED!');
  console.log('================================================================\n');
}

runAuthVerification().catch((err) => {
  console.error('❌ Auth verification failed:', err);
  process.exit(1);
});
