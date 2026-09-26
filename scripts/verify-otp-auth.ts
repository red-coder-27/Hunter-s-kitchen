process.env.NODE_ENV = 'test';
import { authService } from '../src/server/services/authService';
import { db } from '../src/server/db';
import { redisService } from '../src/server/services/redisService';

async function runOtpVerification() {
  console.log('================================================================');
  console.log('🔐 HUNTER\'S KITCHEN — GMAIL OTP VERIFICATION SUITE');
  console.log('================================================================');

  const context = {
    ip: '127.0.0.1',
    requestId: 'req_otp_test_01',
    userAgent: 'test-runner'
  };

  // 1. Send OTP for Login
  console.log('\n👉 [TEST 1] Dispatching OTP for Login');
  const targetEmail = 'customer1@hunterskitchen.com';
  const dispatchRes = await authService.sendGmailOtp(targetEmail, 'LOGIN', context);

  if (!dispatchRes.success) {
    throw new Error('Failed to dispatch login OTP');
  }
  console.log(`  ✓ OTP dispatched via channel: ${dispatchRes.channel}`);
  console.log(`  ✓ Target: ${dispatchRes.email}`);

  // Retrieve the generated OTP from secure Redis store for testing
  const otpCode = await redisService.get(`otp:login:${targetEmail}`);
  if (!otpCode) {
    throw new Error('OTP was not stored in Redis');
  }
  console.log(`  ✓ Retrieved OTP from Redis: ${otpCode}`);

  // 2. Reject Wrong OTP for Login
  console.log('\n👉 [TEST 2] Rejection of Invalid Login OTP');
  try {
    await authService.loginWithOtp(targetEmail, '999999', context);
    throw new Error('Should have rejected invalid OTP');
  } catch (err: any) {
    if (err.name === 'ValidationError') {
      console.log('  ✓ Invalid OTP correctly rejected with ValidationError');
    } else {
      throw err;
    }
  }

  // 3. Successful Login with Correct OTP
  console.log('\n👉 [TEST 3] Successful Login with Correct OTP');
  const loginRes = await authService.loginWithOtp(targetEmail, otpCode, context);
  if (!loginRes.token || !loginRes.user) {
    throw new Error('Failed to obtain user session from OTP login');
  }
  console.log(`  ✓ User logged in successfully: ${loginRes.user.name} (${loginRes.user.email})`);
  console.log(`  ✓ User role: ${loginRes.user.role}`);
  console.log(`  ✓ Session token issued: ${loginRes.token.substring(0, 16)}...`);

  // 4. Test Replay Prevention (OTP should be single-use)
  console.log('\n👉 [TEST 4] OTP Replay Prevention (Single-Use Guarantee)');
  try {
    await authService.loginWithOtp(targetEmail, otpCode, context);
    throw new Error('Should not allow re-using consumed OTP');
  } catch (err: any) {
    if (err.name === 'ValidationError') {
      console.log('  ✓ Replayed OTP correctly rejected (already consumed)');
    } else {
      throw err;
    }
  }

  // 5. Auto-provisioning new customer via OTP
  console.log('\n👉 [TEST 5] Auto-provisioning new user via OTP login');
  const newEmail = `guest_${Date.now()}@gmail.com`;
  await authService.sendGmailOtp(newEmail, 'LOGIN', context);
  const newOtp = await redisService.get(`otp:login:${newEmail}`);
  if (!newOtp) {
    throw new Error('New user OTP not stored in Redis');
  }
  const newLogin = await authService.loginWithOtp(newEmail, newOtp, context);
  if (!newLogin.user || newLogin.user.email !== newEmail) {
    throw new Error('Failed to auto-provision new customer via OTP');
  }
  console.log(`  ✓ New customer auto-provisioned: ${newLogin.user.id} (${newLogin.user.email})`);
  console.log(`  ✓ Role assigned: ${newLogin.user.role}`);

  // 6. Forgot Password OTP Verification & Reset
  console.log('\n👉 [TEST 6] Forgot Password OTP & Password Reset');
  const resetEmail = 'staff@hunterskitchen.com';
  await authService.sendGmailOtp(resetEmail, 'FORGOT_PASSWORD', context);
  const resetOtp = await redisService.get(`otp:pwd_reset:${resetEmail}`);
  if (!resetOtp) {
    throw new Error('Reset OTP not stored in Redis');
  }
  const verifyReset = await authService.verifyGmailOtp(resetEmail, resetOtp, context);
  if (!verifyReset.resetToken) {
    throw new Error('Did not receive resetToken from verifyGmailOtp');
  }
  console.log(`  ✓ Forgot password OTP verified, reset token: ${verifyReset.resetToken.substring(0, 12)}...`);

  const resetResult = await authService.resetPassword(verifyReset.resetToken, 'Hunter@2026!', context);
  console.log(`  ✓ ${resetResult.message}`);

  console.log('\n================================================================');
  console.log('🎉 ALL GMAIL OTP & AUTHENTICATION TESTS PASSED 100%!');
  console.log('================================================================\n');
}

runOtpVerification().catch((err) => {
  console.error('❌ OTP verification suite failed:', err);
  process.exit(1);
});
