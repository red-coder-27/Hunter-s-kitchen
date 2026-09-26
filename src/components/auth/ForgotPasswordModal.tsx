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
  EyeOff
} from 'lucide-react';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [step, setStep] = useState<'EMAIL' | 'OTP' | 'NEW_PASSWORD'>('EMAIL');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number>(600); // 10 minutes in seconds

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (step === 'OTP' && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [step, countdown]);

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
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await apiService.sendOtp(cleanEmail, 'FORGOT_PASSWORD');
      setSuccessMsg(res.message || `A 6-digit OTP code has been dispatched to ${cleanEmail}`);
      setCountdown(res.expiresInSeconds || 600);
      setStep('OTP');
    } catch (err: any) {
      setError(err.message || 'Failed to dispatch verification code');
    } finally {
      setIsLoading(false);
    }
  };

  // STEP 2: Verify 6-digit OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanOtp = otp.trim();
    if (cleanOtp.length < 6) {
      setError('Please enter the full 6-digit verification code');
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
      setError(err.message || 'Invalid or expired OTP code');
    } finally {
      setIsLoading(false);
    }
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
        {error && (
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

        {/* STEP 1: Enter Email */}
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
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@hunterskitchen.com"
                  className="w-full rounded-xl bg-stone-50 border border-stone-300 pl-10 pr-4 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:bg-white focus:border-red-600 focus:ring-2 focus:ring-red-600/10 focus:outline-hidden transition-all"
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
                className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex items-center space-x-2 rounded-xl bg-red-600 hover:bg-red-700 px-5 py-2.5 text-xs font-bold text-white shadow-sm transition-all disabled:opacity-50"
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
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                  Enter 6-Digit Code
                </label>
                <span className="text-[11px] font-mono text-stone-600 flex items-center gap-1 bg-stone-100 px-2 py-0.5 rounded-md border border-stone-200">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  Expires in {formatTime(countdown)}
                </span>
              </div>
              
              <div className="py-2">
                <OtpInput
                  length={6}
                  value={otp}
                  onChange={(val) => {
                    setOtp(val);
                    if (error) setError(null);
                  }}
                  disabled={isLoading}
                  hasError={Boolean(error)}
                  autoFocus={true}
                />
              </div>

              <p className="mt-2 text-center text-[11px] text-stone-500">
                Enter the 6-digit verification code dispatched to your Gmail
              </p>
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <button
                type="button"
                onClick={() => setStep('EMAIL')}
                className="inline-flex items-center text-stone-500 hover:text-stone-800 font-medium"
              >
                <ArrowLeft className="h-3 w-3 mr-1" /> Change Email
              </button>
              <button
                type="button"
                disabled={isLoading}
                onClick={() => handleSendOtp()}
                className="text-red-600 hover:text-red-700 font-semibold"
              >
                Resend Code
              </button>
            </div>

            <div className="pt-2 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading || otp.length < 6}
                className="inline-flex items-center space-x-2 rounded-xl bg-red-600 hover:bg-red-700 px-5 py-2.5 text-xs font-bold text-white shadow-sm transition-all disabled:opacity-50"
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
                  className="w-full rounded-xl bg-stone-50 border border-stone-300 pl-10 pr-10 py-2.5 text-sm text-stone-900 focus:bg-white focus:border-red-600 focus:ring-2 focus:ring-red-600/10 focus:outline-hidden transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
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
                  className="w-full rounded-xl bg-stone-50 border border-stone-300 pl-10 pr-4 py-2.5 text-sm text-stone-900 focus:bg-white focus:border-red-600 focus:ring-2 focus:ring-red-600/10 focus:outline-hidden transition-all"
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
