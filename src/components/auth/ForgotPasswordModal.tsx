import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { OtpInput } from './OtpInput';
import {
  KeyRound,
  Mail,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  Loader2,
  Clock,
  ShieldCheck,
  Send,
  Lock,
  Eye,
  EyeOff,
  RotateCcw,
  X
} from 'lucide-react';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialEmail?: string;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialEmail = ''
}) => {
  const [step, setStep] = useState<'EMAIL' | 'OTP' | 'NEW_PASSWORD'>('EMAIL');
  const [email, setEmail] = useState(initialEmail.trim().toLowerCase());
  const [otp, setOtp] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState<number>(0);
  const [resendSuccess, setResendSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number>(600); // 10 minutes in seconds

  const FORGOT_OTP_STORAGE_KEY = 'hunters_forgot_pwd_otp_session';

  // Automatically sync with initialEmail from login form when modal opens
  useEffect(() => {
    if (isOpen && initialEmail) {
      setEmail(initialEmail.trim().toLowerCase());
      setError(null);
    }
  }, [isOpen, initialEmail]);

  // Restore active verification session on mount/open
  useEffect(() => {
    try {
      const rawSession = sessionStorage.getItem(FORGOT_OTP_STORAGE_KEY);
      if (rawSession) {
        const session = JSON.parse(rawSession);
        const now = Date.now();
        if (session && session.expiresAt && session.expiresAt > now && session.email) {
          const remainingSec = Math.max(1, Math.ceil((session.expiresAt - now) / 1000));
          setEmail(session.email);
          setCountdown(remainingSec);
          setStep('OTP');
          setSuccessMsg(`Resumed password verification session for ${session.email}`);
        } else {
          sessionStorage.removeItem(FORGOT_OTP_STORAGE_KEY);
        }
      }
    } catch (e) {
      console.warn('Failed to restore forgot password session:', e);
    }
  }, [isOpen]);

  // Main Expiry Countdown
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (step === 'OTP' && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => {
          const next = Math.max(0, prev - 1);
          if (next <= 0) {
            sessionStorage.removeItem(FORGOT_OTP_STORAGE_KEY);
          }
          return next;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [step, countdown]);

  // Dedicated Resend Cooldown Timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  if (!isOpen) return null;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // STEP 1: Send OTP to Gmail
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    
    if (!cleanEmail) {
      setError('Please enter your Gmail address');
      return;
    }

    if (cleanEmail.startsWith('.') || cleanEmail.includes('.@') || cleanEmail.includes('..')) {
      setError('Please enter a valid Gmail address');
      return;
    }

    if (!cleanEmail.endsWith('@gmail.com') && !cleanEmail.endsWith('@googlemail.com')) {
      setError('Please enter a valid Gmail address');
      return;
    }

    const gmailRegex = /^[a-zA-Z0-9]+(\.[a-zA-Z0-9]+)*@(gmail\.com|googlemail\.com)$/;
    if (!gmailRegex.test(cleanEmail)) {
      setError('Please enter a valid Gmail address');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccessMsg(null);
    setResendSuccess(null);

    try {
      const res = await apiService.sendOtp(cleanEmail, 'FORGOT_PASSWORD');
      const ttlSeconds = res.expiresInSeconds || 600;
      setSuccessMsg(res.message || `A 6-digit OTP code has been dispatched to ${cleanEmail}`);
      setCountdown(ttlSeconds);
      setResendCooldown(20);
      setOtp('');
      setStep('OTP');

      // Persist active session
      try {
        sessionStorage.setItem(
          FORGOT_OTP_STORAGE_KEY,
          JSON.stringify({
            email: cleanEmail,
            expiresAt: Date.now() + ttlSeconds * 1000,
            dispatchedAt: Date.now()
          })
        );
      } catch (err) {
        console.warn('Failed to store forgot password session:', err);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to dispatch verification code');
    } finally {
      setIsLoading(false);
    }
  };

  // Dedicated Resend Handler with instant feedback and cooldown
  const handleResendOtp = async () => {
    if (isResending || resendCooldown > 0) return;
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setError('Please enter a valid Gmail address');
      return;
    }

    if (cleanEmail.startsWith('.') || cleanEmail.includes('.@') || cleanEmail.includes('..')) {
      setError('Please enter a valid Gmail address');
      return;
    }

    if (!cleanEmail.endsWith('@gmail.com') && !cleanEmail.endsWith('@googlemail.com')) {
      setError('Please enter a valid Gmail address');
      return;
    }

    const gmailRegex = /^[a-zA-Z0-9]+(\.[a-zA-Z0-9]+)*@(gmail\.com|googlemail\.com)$/;
    if (!gmailRegex.test(cleanEmail)) {
      setError('Please enter a valid Gmail address');
      return;
    }

    setIsResending(true);
    setError(null);
    setResendSuccess(null);

    try {
      const res = await apiService.sendOtp(cleanEmail, 'FORGOT_PASSWORD');
      const ttlSeconds = res.expiresInSeconds || 600;
      setCountdown(ttlSeconds);
      setResendCooldown(20);
      setOtp('');
      setResendSuccess(res.message || `A fresh 6-digit verification code has been dispatched to ${cleanEmail}`);

      try {
        sessionStorage.setItem(
          FORGOT_OTP_STORAGE_KEY,
          JSON.stringify({
            email: cleanEmail,
            expiresAt: Date.now() + ttlSeconds * 1000,
            dispatchedAt: Date.now()
          })
        );
      } catch (err) {
        console.warn('Failed to refresh forgot password session:', err);
      }

      setTimeout(() => {
        setResendSuccess(null);
      }, 6000);
    } catch (err: any) {
      setError(err.message || 'Failed to dispatch new verification code. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  // STEP 2: Verify 6-digit OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanOtp = otp.trim();
    if (cleanOtp.length < 6) {
      setError('Please enter the full 6-digit verification code sent to your Gmail.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await apiService.verifyOtp(email.trim().toLowerCase(), cleanOtp);
      setResetToken(res.resetToken);
      setSuccessMsg('OTP verified successfully! Please set your new password.');
      setStep('NEW_PASSWORD');
    } catch (err: any) {
      setError(err.message || 'Incorrect verification PIN. Please check your Gmail and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearAndRetryOtp = () => {
    setOtp('');
    setError(null);
  };

  // STEP 3: Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await apiService.resetPasswordWithOtp(resetToken, newPassword);
      setSuccessMsg(res.message || 'Password successfully updated! Redirecting to sign in...');
      sessionStorage.removeItem(FORGOT_OTP_STORAGE_KEY);
      setTimeout(() => {
        onSuccess();
        onClose();
        // Reset local state
        setStep('EMAIL');
        setOtp('');
        setNewPassword('');
        setConfirmPassword('');
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to update password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-2xl bg-white border border-stone-200 shadow-2xl p-6 text-stone-900 transition-all">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-stone-100">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600 border border-red-100">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900">
                {step === 'EMAIL' && 'Reset Password'}
                {step === 'OTP' && 'Verify 6-Digit OTP'}
                {step === 'NEW_PASSWORD' && 'Create New Password'}
              </h2>
              <p className="text-xs text-stone-500">
                {step === 'EMAIL' && 'Send instant verification code via Gmail system'}
                {step === 'OTP' && `Code dispatched to ${email}`}
                {step === 'NEW_PASSWORD' && 'Enter a strong password of 8+ characters'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-stone-400 hover:text-stone-700 p-1.5 rounded-lg hover:bg-stone-100 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Feedback Alerts */}
        {error && step !== 'OTP' && (
          <div className="mt-4 flex items-start space-x-2.5 rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mt-4 flex items-start space-x-2.5 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* STEP 1: Auto-Entered Gmail Verification */}
        {step === 'EMAIL' && (
          <form onSubmit={handleSendOtp} className="mt-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                Registered Account Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                <input
                  type="email"
                  readOnly={Boolean(email)}
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="yourname@gmail.com"
                  className="w-full rounded-xl bg-stone-50 border border-stone-200 pl-10 pr-4 py-2.5 text-sm text-stone-900 font-medium cursor-default select-all focus:outline-hidden"
                />
              </div>
              <p className="mt-1.5 text-[11px] text-stone-500">
                A 6-digit real-time OTP will be generated and dispatched through our Gmail security transporter.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading || !email}
                className="inline-flex items-center space-x-2 rounded-xl bg-red-600 hover:bg-red-700 px-5 py-2.5 text-xs font-bold text-white shadow-sm transition-all disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Dispatching OTP...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" />
                    <span>Send Verification Code</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* STEP 2: Enter OTP */}
        {step === 'OTP' && (
          <form onSubmit={handleVerifyOtp} className="mt-5 space-y-4">
            <div className="flex items-center justify-between bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2">
              <div className="flex items-center space-x-2 truncate">
                <Mail className="h-4 w-4 text-stone-400 shrink-0" />
                <span className="text-xs text-stone-600 font-medium truncate">
                  Sent to: <strong className="text-stone-900 font-semibold">{email}</strong>
                </span>
              </div>
            </div>

            {/* Clean Professional Error Alert */}
            {error && (
              <div className="flex items-center justify-between rounded-xl bg-red-50 border border-red-200/90 px-3.5 py-2.5 text-xs text-red-800 shadow-2xs animate-shake">
                <div className="flex items-center space-x-2 min-w-0">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                  <span className="font-semibold">{error}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setError(null)}
                  className="text-red-400 hover:text-red-700 p-0.5 cursor-pointer transition-colors shrink-0 ml-2"
                  title="Dismiss"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {/* Dedicated Fresh Resend Success Notification */}
            {resendSuccess && (
              <div className="rounded-2xl bg-emerald-50 border border-emerald-200/90 p-3 text-xs text-emerald-900 shadow-sm flex items-start justify-between gap-2">
                <div className="flex items-center space-x-2.5">
                  <div className="p-1 rounded-lg bg-emerald-100 text-emerald-700 shrink-0">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </div>
                  <p className="font-semibold text-emerald-950 text-xs">{resendSuccess}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setResendSuccess(null)}
                  className="text-emerald-400 hover:text-emerald-700 p-0.5 cursor-pointer shrink-0"
                  title="Dismiss"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                  Enter 6-Digit Code
                </label>
                <div className="flex items-center text-xs font-mono text-stone-700 gap-1.5 bg-amber-50 border border-amber-200/80 px-2.5 py-1 rounded-lg">
                  <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span className="font-semibold">{formatTime(countdown)}</span>
                </div>
              </div>
              
              <div className="py-2">
                <OtpInput
                  length={6}
                  value={otp}
                  onChange={(val) => {
                    setOtp(val);
                    if (error) setError(null);
                  }}
                  disabled={isLoading || isResending}
                  hasError={Boolean(error)}
                  autoFocus={true}
                />
              </div>

              <div className="flex items-center justify-between mt-2 text-[11px] text-stone-500">
                <span>Enter the 6 digits sent to your Gmail inbox</span>
                {otp.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAndRetryOtp}
                    className="text-stone-500 hover:text-red-700 font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Clear</span>
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-1 border-t border-stone-100">
              <span className="text-stone-400 text-[11px]">Didn't receive the code?</span>
              <button
                type="button"
                disabled={isResending || resendCooldown > 0}
                onClick={handleResendOtp}
                className="text-xs text-red-700 hover:text-red-800 font-bold disabled:text-stone-400 cursor-pointer transition-colors inline-flex items-center gap-1.5"
              >
                {isResending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-red-600" />
                    <span>Sending code...</span>
                  </>
                ) : resendCooldown > 0 ? (
                  <span>Resend in {resendCooldown}s</span>
                ) : (
                  <>
                    <Send className="w-3 h-3" />
                    <span>Resend Code</span>
                  </>
                )}
              </button>
            </div>

            <div className="pt-2 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading || isResending || otp.length < 6}
                className="inline-flex items-center space-x-2 rounded-xl bg-red-600 hover:bg-red-700 px-5 py-2.5 text-xs font-bold text-white shadow-sm transition-all disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <span>Verify OTP</span>
                )}
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: Enter New Password */}
        {step === 'NEW_PASSWORD' && (
          <form onSubmit={handleResetPassword} className="mt-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full rounded-xl bg-stone-50 border border-stone-300 pl-10 pr-10 py-2.5 text-sm text-stone-900 focus:bg-white focus:border-red-600 focus:ring-2 focus:ring-red-600/10 focus:outline-hidden transition-all [&::-ms-reveal]:hidden [&::-ms-clear]:hidden"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 cursor-pointer"
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="w-full rounded-xl bg-stone-50 border border-stone-300 pl-10 pr-4 py-2.5 text-sm text-stone-900 focus:bg-white focus:border-red-600 focus:ring-2 focus:ring-red-600/10 focus:outline-hidden transition-all [&::-ms-reveal]:hidden [&::-ms-clear]:hidden"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end space-x-3">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full inline-flex items-center justify-center space-x-2 rounded-xl bg-red-600 hover:bg-red-700 px-5 py-2.5 text-xs font-bold text-white shadow-sm transition-all disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Updating Password...</span>
                  </>
                ) : (
                  <span>Update Password & Return to Login</span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
