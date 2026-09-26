import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Lock,
  Mail,
  KeyRound,
  ShieldCheck,
  ChefHat,
  Bike,
  Store,
  User,
  ArrowRight,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  HelpCircle
} from 'lucide-react';

interface LoginViewProps {
  onLoginSuccess?: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const { login, forgotPassword, resetPassword, acceptInvite } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modals for Forgot Password and Staff Invite
  const [activeModal, setActiveModal] = useState<'FORGOT' | 'INVITE' | null>(null);
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [modalSuccessMsg, setModalSuccessMsg] = useState<string | null>(null);
  const [modalErrorMsg, setModalErrorMsg] = useState<string | null>(null);
  const [isModalSubmitting, setIsModalSubmitting] = useState(false);

  // Preset demo accounts for seamless evaluation
  const demoAccounts = [
    {
      role: 'Owner (Admin)',
      email: 'owner@hunterskitchen.com',
      badge: 'All Permissions',
      icon: Store,
      color: 'border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100'
    },
    {
      role: 'Kitchen Manager',
      email: 'staff1@hunterskitchen.com',
      badge: 'Order & Staff Ops',
      icon: ChefHat,
      color: 'border-blue-200 bg-blue-50 text-blue-900 hover:bg-blue-100'
    },
    {
      role: 'Head Chef',
      email: 'chef@hunterskitchen.com',
      badge: 'Kitchen & Menu',
      icon: ChefHat,
      color: 'border-emerald-200 bg-emerald-50 text-emerald-900 hover:bg-emerald-100'
    },
    {
      role: 'Delivery Partner',
      email: 'delivery1@hunterskitchen.com',
      badge: 'Rider Logistics',
      icon: Bike,
      color: 'border-rose-200 bg-rose-50 text-rose-900 hover:bg-rose-100'
    },
    {
      role: 'Customer',
      email: 'customer1@hunterskitchen.com',
      badge: 'Food Ordering',
      icon: User,
      color: 'border-stone-200 bg-stone-50 text-stone-900 hover:bg-stone-100'
    }
  ];

  const handleSelectDemoAccount = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('Hunter@2026!');
    setErrorMessage(null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMessage('Please enter your email address');
      return;
    }
    if (!password) {
      setErrorMessage('Please enter your password');
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      await login(email.trim(), password);
      if (onLoginSuccess) {
        onLoginSuccess();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication failed. Please check credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) {
      setModalErrorMsg('Please enter your registered email');
      return;
    }
    setIsModalSubmitting(true);
    setModalErrorMsg(null);
    setModalSuccessMsg(null);

    try {
      const res = await forgotPassword(forgotEmail);
      if (res.resetToken) {
        setResetToken(res.resetToken);
        setModalSuccessMsg(`Reset token generated: ${res.resetToken}`);
      } else {
        setModalSuccessMsg(res.message);
      }
    } catch (err: any) {
      setModalErrorMsg(err.message || 'Failed to request password reset');
    } finally {
      setIsModalSubmitting(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetToken || !newPassword) {
      setModalErrorMsg('Reset token and new password are required');
      return;
    }
    if (newPassword.length < 8) {
      setModalErrorMsg('Password must be at least 8 characters long');
      return;
    }

    setIsModalSubmitting(true);
    setModalErrorMsg(null);

    try {
      const res = await resetPassword(resetToken, newPassword);
      setModalSuccessMsg(res.message);
      setTimeout(() => {
        setActiveModal(null);
        setModalSuccessMsg(null);
        setPassword(newPassword);
        setEmail(forgotEmail);
      }, 1500);
    } catch (err: any) {
      setModalErrorMsg(err.message || 'Password reset failed');
    } finally {
      setIsModalSubmitting(false);
    }
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetToken || !newPassword) {
      setModalErrorMsg('Invitation token and new password are required');
      return;
    }
    if (newPassword.length < 8) {
      setModalErrorMsg('Password must be at least 8 characters long');
      return;
    }

    setIsModalSubmitting(true);
    setModalErrorMsg(null);

    try {
      const res = await acceptInvite(resetToken, newPassword);
      setModalSuccessMsg(`Welcome, ${res.user.name}! Account activated.`);
      setTimeout(() => {
        setActiveModal(null);
        setModalSuccessMsg(null);
        setEmail(res.user.email);
        setPassword(newPassword);
      }, 1500);
    } catch (err: any) {
      setModalErrorMsg(err.message || 'Failed to activate account');
    } finally {
      setIsModalSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col justify-center py-8 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-red-800 text-white shadow-md shadow-red-900/20 mb-3">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900">
            Hunter's Kitchen
          </h1>
          <p className="mt-1 text-sm text-stone-600">
            Server-Authoritative Authentication & Role Authorization
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white py-7 px-6 shadow-sm border border-stone-200 rounded-2xl sm:px-8">
          <div className="mb-5 pb-4 border-b border-stone-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-stone-900">Sign In</h2>
              <p className="text-xs text-stone-500">Enter your credentials to access your portal</p>
            </div>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-stone-100 text-stone-700 border border-stone-200">
              HTTP-Only Cookies
            </span>
          </div>

          {errorMessage && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{errorMessage}</div>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. owner@hunterskitchen.com"
                  autoComplete="email"
                  required
                  className="block w-full pl-9 pr-3 py-2 text-sm border border-stone-300 rounded-xl bg-white text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-red-700 focus:border-red-700 transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-stone-700">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setActiveModal('FORGOT');
                    setForgotEmail(email);
                    setModalErrorMsg(null);
                    setModalSuccessMsg(null);
                  }}
                  className="text-xs font-medium text-red-700 hover:text-red-800 transition-colors"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  className="block w-full pl-9 pr-10 py-2 text-sm border border-stone-300 rounded-xl bg-white text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-red-700 focus:border-red-700 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-stone-400 hover:text-stone-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 px-4 border border-transparent rounded-xl text-sm font-semibold text-white bg-red-700 hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-700 shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In Securely</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Credentials Switcher */}
          <div className="mt-6 pt-5 border-t border-stone-100">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-stone-700 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                Select Pre-Configured Role Account:
              </span>
              <span className="text-[11px] text-stone-500">Pw: Hunter@2026!</span>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {demoAccounts.map((acc) => {
                const IconComponent = acc.icon;
                const isSelected = email.toLowerCase() === acc.email.toLowerCase();
                return (
                  <button
                    key={acc.email}
                    type="button"
                    onClick={() => handleSelectDemoAccount(acc.email)}
                    className={`flex items-center justify-between p-2 rounded-xl border text-left transition-all ${
                      isSelected ? 'ring-2 ring-red-700 border-red-700 bg-red-50/50' : acc.color
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <IconComponent className="w-4 h-4 shrink-0" />
                      <div className="truncate">
                        <div className="text-xs font-semibold text-stone-900 leading-tight">
                          {acc.role}
                        </div>
                        <div className="text-[11px] text-stone-500 truncate">
                          {acc.email}
                        </div>
                      </div>
                    </div>
                    <span className="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white border border-stone-200 text-stone-700">
                      {acc.badge}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-3 flex items-center justify-between text-xs text-stone-500">
              <button
                type="button"
                onClick={() => {
                  setActiveModal('INVITE');
                  setResetToken('invite_chef_token_123');
                  setModalErrorMsg(null);
                  setModalSuccessMsg(null);
                }}
                className="text-stone-600 hover:text-stone-900 underline underline-offset-2"
              >
                Have a staff invitation token?
              </button>
              <span>Test aliases: @test.local</span>
            </div>
          </div>
        </div>

        {/* Security & Architecture Guarantees */}
        <div className="mt-6 p-4 rounded-xl bg-white border border-stone-200 text-xs text-stone-600 space-y-2">
          <div className="flex items-center gap-2 font-semibold text-stone-900">
            <Lock className="w-4 h-4 text-red-700" />
            <span>Zero Client-Side Trust Architecture</span>
          </div>
          <p className="text-[11px] leading-relaxed text-stone-500">
            Your role, sub-role, permissions, and session are validated server-side on every request using signed HTTP-only cookies and bcrypt password hashing. Client cannot spoof roles.
          </p>
        </div>
      </div>

      {/* Forgot Password / Reset Modal */}
      {activeModal === 'FORGOT' && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-stone-200 shadow-xl">
            <h3 className="text-base font-bold text-stone-900 mb-1">
              Reset Password
            </h3>
            <p className="text-xs text-stone-600 mb-4">
              Enter your email to obtain a password reset token.
            </p>

            {modalErrorMsg && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="flex-1">{modalErrorMsg}</div>
              </div>
            )}
            {modalSuccessMsg && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                <div className="flex-1 font-mono text-[11px] break-all">{modalSuccessMsg}</div>
              </div>
            )}

            {!resetToken ? (
              <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Registered Email
                  </label>
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    required
                    placeholder="e.g. owner@hunterskitchen.com"
                    className="block w-full px-3 py-2 text-sm border border-stone-300 rounded-xl focus:ring-2 focus:ring-red-700"
                  />
                </div>
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    className="px-3 py-2 text-xs font-semibold text-stone-600 hover:text-stone-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isModalSubmitting}
                    className="px-4 py-2 bg-red-700 text-white rounded-xl text-xs font-semibold hover:bg-red-800 disabled:opacity-50"
                  >
                    {isModalSubmitting ? 'Requesting...' : 'Get Reset Token'}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Reset Token
                  </label>
                  <input
                    type="text"
                    value={resetToken}
                    onChange={(e) => setResetToken(e.target.value)}
                    required
                    className="block w-full px-3 py-2 text-sm font-mono border border-stone-300 rounded-xl focus:ring-2 focus:ring-red-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    New Password (Min 8 chars)
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    placeholder="Enter new strong password"
                    className="block w-full px-3 py-2 text-sm border border-stone-300 rounded-xl focus:ring-2 focus:ring-red-700"
                  />
                </div>
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    className="px-3 py-2 text-xs font-semibold text-stone-600 hover:text-stone-800"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    disabled={isModalSubmitting}
                    className="px-4 py-2 bg-red-700 text-white rounded-xl text-xs font-semibold hover:bg-red-800 disabled:opacity-50"
                  >
                    {isModalSubmitting ? 'Updating...' : 'Set New Password'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Staff Invitation Activation Modal */}
      {activeModal === 'INVITE' && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-stone-200 shadow-xl">
            <h3 className="text-base font-bold text-stone-900 mb-1">
              Activate Staff Invitation
            </h3>
            <p className="text-xs text-stone-600 mb-4">
              Enter your invitation token and set your account password.
            </p>

            {modalErrorMsg && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="flex-1">{modalErrorMsg}</div>
              </div>
            )}
            {modalSuccessMsg && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                <div className="flex-1 font-medium">{modalSuccessMsg}</div>
              </div>
            )}

            <form onSubmit={handleInviteSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Invitation Token
                </label>
                <input
                  type="text"
                  value={resetToken}
                  onChange={(e) => setResetToken(e.target.value)}
                  placeholder="e.g. invite_chef_token_123"
                  required
                  className="block w-full px-3 py-2 text-sm font-mono border border-stone-300 rounded-xl focus:ring-2 focus:ring-red-700"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Create Password (Min 8 chars)
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Create your personal password"
                  required
                  className="block w-full px-3 py-2 text-sm border border-stone-300 rounded-xl focus:ring-2 focus:ring-red-700"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-3 py-2 text-xs font-semibold text-stone-600 hover:text-stone-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isModalSubmitting}
                  className="px-4 py-2 bg-red-700 text-white rounded-xl text-xs font-semibold hover:bg-red-800 disabled:opacity-50"
                >
                  {isModalSubmitting ? 'Activating...' : 'Activate & Sign In'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
