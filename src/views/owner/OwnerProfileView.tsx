import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { apiService } from '../../services/api';
import { OtpInput } from '../../components/auth/OtpInput';
import {
  User,
  Store,
  Phone,
  Mail,
  Shield,
  Bell,
  LogOut,
  Save,
  Check,
  Power,
  Clock,
  MapPin,
  IndianRupee,
  CreditCard,
  Banknote,
  AlertTriangle,
  Megaphone,
  ShieldCheck,
  Activity,
  Edit2,
  X,
  Volume2,
  VolumeX,
  Loader2,
  CheckCircle2,
  Lock,
  Eye,
  EyeOff,
  KeyRound
} from 'lucide-react';

export const OwnerProfileView: React.FC = () => {
  const { currentUser, settings, refreshSettings, updateUserProfile, logout } = useAuth();
  const { webPushPermission, requestWebPushPermission, isPushAlertsEnabled, togglePushAlerts } = useNotification();

  // Navigation tab inside Profile & Store Ops
  const [activeTab, setActiveTab] = useState<'profile' | 'store_settings' | 'audit_logs'>('profile');

  // --- Admin Profile State ---
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [adminName, setAdminName] = useState(currentUser?.name || 'Karthik Raja');
  const [adminEmail, setAdminEmail] = useState(currentUser?.email || 'karthik@hunterskitchen.com');
  const [adminPhone, setAdminPhone] = useState(currentUser?.phone || '+91 98765 43210');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminConfirmPassword, setAdminConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // --- Email Change OTP Modal State ---
  const [showEmailOtpModal, setShowEmailOtpModal] = useState(false);
  const [emailOtpCode, setEmailOtpCode] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingEmailOtp, setIsVerifyingEmailOtp] = useState(false);
  const [otpModalError, setOtpModalError] = useState<string | null>(null);
  const [otpCountdown, setOtpCountdown] = useState<number>(600);
  const [resendCooldown, setResendCooldown] = useState<number>(0);

  // --- Notification Preferences ---
  const [orderAudioAlerts, setOrderAudioAlerts] = useState(true);
  const [emailDigestAlerts, setEmailDigestAlerts] = useState(true);
  const [smsCriticalAlerts, setSmsCriticalAlerts] = useState(true);

  // --- Store Operations & Master Open/Close State ---
  const [isStoreOpen, setIsStoreOpen] = useState(settings?.isOpen ?? true);
  const [temporaryPause, setTemporaryPause] = useState(settings?.temporaryPause ?? false);
  const [restaurantName, setRestaurantName] = useState(settings?.restaurantName || "Hunter's Kitchen");
  const [supportPhone, setSupportPhone] = useState(settings?.phone || '+91 98765 00000');
  const [storeAddress, setStoreAddress] = useState(settings?.address || '42 Richmond Road, Shanthi Nagar, Bengaluru');
  const [openingTime, setOpeningTime] = useState(settings?.openingTime || '11:00 AM');
  const [closingTime, setClosingTime] = useState(settings?.closingTime || '11:00 PM');
  const [baseDeliveryFee, setBaseDeliveryFee] = useState(settings?.baseDeliveryFee ?? 35);
  const [freeDeliveryThreshold, setFreeDeliveryThreshold] = useState(settings?.freeDeliveryThreshold ?? 500);
  const [codEnabled, setCodEnabled] = useState(settings?.codEnabled ?? true);
  const [onlinePaymentEnabled, setOnlinePaymentEnabled] = useState(settings?.onlinePaymentEnabled ?? true);
  const [announcement, setAnnouncement] = useState(settings?.announcement || '');
  
  const [isSavingStore, setIsSavingStore] = useState(false);
  const [storeSavedMsg, setStoreSavedMsg] = useState<string | null>(null);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);

  // --- Audit & Outbox States ---
  const [integrityReport, setIntegrityReport] = useState<any | null>(null);
  const [isVerifyingChain, setIsVerifyingChain] = useState(false);
  const [reconciliationReport, setReconciliationReport] = useState<any | null>(null);
  const [outboxEvents, setOutboxEvents] = useState<any[]>([]);
  const [isLoadingOutbox, setIsLoadingOutbox] = useState(false);

  // Synchronize state when settings or currentUser change
  useEffect(() => {
    if (settings) {
      setIsStoreOpen(settings.isOpen ?? true);
      setTemporaryPause(settings.temporaryPause ?? false);
      setRestaurantName(settings.restaurantName || "Hunter's Kitchen");
      setSupportPhone(settings.phone || '+91 98765 00000');
      setStoreAddress(settings.address || '42 Richmond Road, Shanthi Nagar, Bengaluru');
      setOpeningTime(settings.openingTime || '11:00 AM');
      setClosingTime(settings.closingTime || '11:00 PM');
      setBaseDeliveryFee(settings.baseDeliveryFee ?? 35);
      setFreeDeliveryThreshold(settings.freeDeliveryThreshold ?? 500);
      setCodEnabled(settings.codEnabled ?? true);
      setOnlinePaymentEnabled(settings.onlinePaymentEnabled ?? true);
      setAnnouncement(settings.announcement || '');
    }
  }, [settings]);

  useEffect(() => {
    if (currentUser) {
      setAdminName(currentUser.name || '');
      setAdminEmail(currentUser.email || '');
      setAdminPhone(currentUser.phone || '');
      setAdminPassword('');
      setAdminConfirmPassword('');
    }
  }, [currentUser]);

  // Countdown timer for OTP validity
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (showEmailOtpModal && otpCountdown > 0) {
      timer = setInterval(() => {
        setOtpCountdown((prev) => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [showEmailOtpModal, otpCountdown]);

  // Cooldown timer for resending OTP
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Master Store Open/Closed Toggle
  const handleToggleStoreStatus = async () => {
    setIsTogglingStatus(true);
    const newStatus = !isStoreOpen;
    try {
      await apiService.updateSettings({ isOpen: newStatus });
      await refreshSettings();
      setIsStoreOpen(newStatus);
      setStoreSavedMsg(newStatus ? '🟢 Shop is now OPEN for customer orders!' : '🔴 Shop is now CLOSED. Ordering disabled.');
      setTimeout(() => setStoreSavedMsg(null), 4000);
    } catch (err: any) {
      console.error('Failed to toggle store status', err);
      alert('Error updating store status: ' + (err.message || 'Please try again.'));
    } finally {
      setIsTogglingStatus(false);
    }
  };

  // Master Pause Toggle
  const handleToggleTemporaryPause = async () => {
    setIsTogglingStatus(true);
    const newPause = !temporaryPause;
    try {
      await apiService.updateSettings({ temporaryPause: newPause });
      await refreshSettings();
      setTemporaryPause(newPause);
      setStoreSavedMsg(newPause ? '⏸️ Kitchen rush pause activated (New orders paused)' : '▶️ Kitchen pause resumed. Ready for orders.');
      setTimeout(() => setStoreSavedMsg(null), 4000);
    } catch (err: any) {
      console.error('Failed to update pause status', err);
    } finally {
      setIsTogglingStatus(false);
    }
  };

  // Save Store Settings Form
  const handleSaveStoreSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingStore(true);
    try {
      await apiService.updateSettings({
        restaurantName,
        phone: supportPhone,
        address: storeAddress,
        openingTime,
        closingTime,
        baseDeliveryFee: Number(baseDeliveryFee),
        freeDeliveryThreshold: Number(freeDeliveryThreshold),
        codEnabled,
        onlinePaymentEnabled,
        announcement
      });
      await refreshSettings();
      setStoreSavedMsg('Store configuration updated successfully!');
      setTimeout(() => setStoreSavedMsg(null), 3500);
    } catch (err: any) {
      console.error(err);
      alert('Failed to save settings: ' + (err.message || 'Server error'));
    } finally {
      setIsSavingStore(false);
    }
  };

  // Save Admin Personal Profile (Requires Gmail OTP if email changed)
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminName.trim() || !adminEmail.trim() || !adminPhone.trim()) {
      setProfileMsg({ type: 'error', text: 'All profile fields (Name, Gmail, Phone) are required.' });
      return;
    }

    if (!adminEmail.includes('@') || !adminEmail.includes('.')) {
      setProfileMsg({ type: 'error', text: 'Please enter a valid Gmail / Email address.' });
      return;
    }

    if (adminPassword) {
      if (adminPassword.length < 6) {
        setProfileMsg({ type: 'error', text: 'Password must be at least 6 characters.' });
        return;
      }
      if (adminPassword !== adminConfirmPassword) {
        setProfileMsg({ type: 'error', text: 'Passwords do not match. Please verify your confirm password.' });
        return;
      }
    }

    const isEmailChanging = adminEmail.trim().toLowerCase() !== (currentUser?.email || '').toLowerCase();

    // If email is changing, OTP verification through Gmail is mandatory!
    if (isEmailChanging) {
      setIsSendingOtp(true);
      setProfileMsg(null);
      setOtpModalError(null);
      setEmailOtpCode('');
      try {
        const res = await apiService.sendOtp(adminEmail.trim().toLowerCase(), 'EMAIL_CHANGE');
        setOtpCountdown(res.expiresInSeconds || 600);
        setResendCooldown(60);
        setShowEmailOtpModal(true);
      } catch (err: any) {
        console.error(err);
        setProfileMsg({ type: 'error', text: err.message || 'Failed to dispatch verification code to new Gmail.' });
      } finally {
        setIsSendingOtp(false);
      }
      return;
    }

    // Email unchanged -> Save directly
    setIsSavingProfile(true);
    setProfileMsg(null);
    try {
      await updateUserProfile({
        name: adminName.trim(),
        email: adminEmail.trim(),
        phone: adminPhone.trim(),
        password: adminPassword.trim() || undefined
      });
      setIsEditingProfile(false);
      setAdminPassword('');
      setAdminConfirmPassword('');
      setProfileMsg({ type: 'success', text: 'Admin profile and credentials updated successfully!' });
      setTimeout(() => setProfileMsg(null), 4000);
    } catch (err: any) {
      console.error(err);
      setProfileMsg({ type: 'error', text: err.message || 'Failed to update admin profile.' });
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Resend OTP code to the new Gmail
  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setOtpModalError(null);
    try {
      const res = await apiService.sendOtp(adminEmail.trim().toLowerCase(), 'EMAIL_CHANGE');
      setOtpCountdown(res.expiresInSeconds || 600);
      setResendCooldown(60);
    } catch (err: any) {
      setOtpModalError(err.message || 'Failed to resend code');
    }
  };

  // Confirm OTP and commit email + password changes
  const handleConfirmEmailOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailOtpCode.trim() || emailOtpCode.trim().length !== 6) {
      setOtpModalError('Please enter the full 6-digit verification code.');
      return;
    }

    setIsVerifyingEmailOtp(true);
    setOtpModalError(null);
    try {
      await updateUserProfile({
        name: adminName.trim(),
        phone: adminPhone.trim(),
        email: adminEmail.trim().toLowerCase(),
        password: adminPassword.trim() || undefined,
        otp: emailOtpCode.trim()
      });

      setShowEmailOtpModal(false);
      setIsEditingProfile(false);
      setAdminPassword('');
      setAdminConfirmPassword('');
      setEmailOtpCode('');
      setProfileMsg({
        type: 'success',
        text: `Gmail address verified and updated to ${adminEmail.trim().toLowerCase()}! From now on, you must log in using this new Gmail and your password.`
      });
      setTimeout(() => setProfileMsg(null), 6000);
    } catch (err: any) {
      console.error(err);
      setOtpModalError(err.message || 'Invalid or expired verification code. Please try again.');
    } finally {
      setIsVerifyingEmailOtp(false);
    }
  };

  // Audit Verification
  const handleVerifyAudit = async () => {
    setIsVerifyingChain(true);
    try {
      const data = await apiService.verifyAuditIntegrity();
      setIntegrityReport(data);
      const recon = await apiService.runReconciliation();
      setReconciliationReport(recon);
    } catch (err) {
      console.error(err);
    } finally {
      setIsVerifyingChain(false);
    }
  };

  const handleLoadOutbox = async () => {
    setIsLoadingOutbox(true);
    try {
      const data = await apiService.getOutboxEvents(20);
      setOutboxEvents(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingOutbox(false);
    }
  };

  return (
    <div className="pb-28 md:pb-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-stone-900 text-white p-5 rounded-3xl shadow-xl relative overflow-hidden">
        <div className="absolute -right-8 -bottom-8 w-36 h-36 bg-red-600/20 rounded-full blur-2xl pointer-events-none"></div>
        <div className="flex items-center gap-3.5 z-10">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-red-600 to-amber-500 text-white font-black text-2xl flex items-center justify-center shadow-lg shadow-red-600/30">
            {currentUser?.name?.charAt(0).toUpperCase() || 'A'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black tracking-tight">{currentUser?.name || 'Administrator'}</h2>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-stone-950 font-black text-[10px] uppercase tracking-wider">
                Super Admin
              </span>
            </div>
            <p className="text-xs text-stone-400 mt-0.5 flex items-center gap-2">
              <span>{currentUser?.email}</span> • <span>{currentUser?.phone}</span>
            </p>
          </div>
        </div>

        {/* Quick Sign Out Header Action */}
        <button
          onClick={() => logout()}
          className="z-10 self-start sm:self-center px-4 py-2 rounded-xl bg-white/10 hover:bg-red-600/80 text-white text-xs font-bold transition-all flex items-center gap-1.5 border border-white/10 cursor-pointer shadow-sm"
        >
          <LogOut className="w-3.5 h-3.5" /> Sign Out
        </button>
      </div>

      {/* SPECIAL ADMIN MASTER SETTING: SHOP OPEN / CLOSE CARD */}
      <div className={`rounded-3xl border-2 p-5 transition-all shadow-md ${
        isStoreOpen
          ? 'bg-gradient-to-br from-emerald-50 via-white to-emerald-50/40 border-emerald-300'
          : 'bg-gradient-to-br from-rose-50 via-white to-stone-50 border-rose-300'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-stone-500 flex items-center gap-1">
                <Store className="w-4 h-4 text-stone-600" /> Master Kitchen & Online Ordering Control
              </span>
              <span className={`w-2.5 h-2.5 rounded-full ${isStoreOpen ? 'bg-emerald-500 animate-ping' : 'bg-rose-500'}`}></span>
            </div>

            <div className="flex items-center gap-3">
              <h3 className="text-2xl font-black text-stone-900">
                {isStoreOpen ? (
                  <span className="text-emerald-800 flex items-center gap-2">
                    🟢 Restaurant is OPEN
                  </span>
                ) : (
                  <span className="text-rose-800 flex items-center gap-2">
                    🔴 Restaurant is CLOSED
                  </span>
                )}
              </h3>
            </div>

            <p className="text-xs text-stone-600 font-medium max-w-lg">
              {isStoreOpen
                ? 'The store is live. Customers can browse the full menu, customize items, and place real-time delivery and takeaway orders.'
                : 'Ordering is temporarily paused for all customers. Menu items will show as unavailable for checkout until re-opened.'}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
            {/* Master Open/Close Toggle Button */}
            <button
              type="button"
              disabled={isTogglingStatus}
              onClick={handleToggleStoreStatus}
              className={`px-5 py-3 rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 cursor-pointer ${
                isStoreOpen
                  ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/25'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/25'
              }`}
            >
              {isTogglingStatus ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Power className="w-5 h-5" />
              )}
              <span>{isStoreOpen ? 'Close Shop Now' : 'Open Shop Now'}</span>
            </button>

            {/* Quick Kitchen Rush Pause */}
            <button
              type="button"
              disabled={isTogglingStatus}
              onClick={handleToggleTemporaryPause}
              className={`px-3.5 py-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                temporaryPause
                  ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                  : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-50'
              }`}
              title="Pause new orders temporarily during kitchen rush"
            >
              <Clock className="w-4 h-4" />
              <span>{temporaryPause ? 'Kitchen Paused (Resume)' : 'Pause Orders (Rush)'}</span>
            </button>
          </div>
        </div>

        {storeSavedMsg && (
          <div className="mt-4 p-3 bg-emerald-100/90 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>{storeSavedMsg}</span>
          </div>
        )}
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex bg-stone-100 p-1.5 rounded-2xl gap-1 border border-stone-200 text-xs font-bold">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex-1 py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'profile'
              ? 'bg-white text-stone-900 shadow-sm font-extrabold'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <User className="w-4 h-4 text-red-600" /> Admin Profile & Alerts
        </button>

        <button
          onClick={() => setActiveTab('store_settings')}
          className={`flex-1 py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'store_settings'
              ? 'bg-white text-stone-900 shadow-sm font-extrabold'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <Store className="w-4 h-4 text-amber-600" /> Store Configuration
        </button>

        <button
          onClick={() => {
            setActiveTab('audit_logs');
            handleVerifyAudit();
            handleLoadOutbox();
          }}
          className={`flex-1 py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'audit_logs'
              ? 'bg-white text-stone-900 shadow-sm font-extrabold'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-emerald-600" /> Integrity & Outbox
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SUB-TAB 1: ADMIN PROFILE & NOTIFICATION PREFERENCES */}
      {/* ========================================================================= */}
      {activeTab === 'profile' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {profileMsg && (
            <div
              className={`p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2 border ${
                profileMsg.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              {profileMsg.type === 'success' ? (
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{profileMsg.text}</span>
            </div>
          )}

          {/* Personal Account Information */}
          <div className="bg-white rounded-3xl border border-stone-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div>
                <h4 className="font-extrabold text-sm text-stone-900">Personal Information</h4>
                <p className="text-xs text-stone-500 font-medium">Manage your administrator account credentials</p>
              </div>

              {!isEditingProfile ? (
                <button
                  type="button"
                  onClick={() => setIsEditingProfile(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5 text-stone-600" /> Edit Details
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsEditingProfile(false)}
                  className="px-3.5 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-600 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" /> Cancel
                </button>
              )}
            </div>

            {isEditingProfile ? (
              <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
                <div>
                  <label className="font-bold text-stone-700 block mb-1">Full Name / Receiver Name</label>
                  <input
                    type="text"
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    placeholder="e.g. Karthik Raja"
                    className="w-full p-3 border border-stone-300 rounded-xl font-semibold text-stone-900 focus:ring-2 focus:ring-red-600/20 focus:border-red-600 outline-none"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-stone-700 block mb-1">Gmail / Email Address</label>
                    <input
                      type="email"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      placeholder="name@gmail.com"
                      className="w-full p-3 border border-stone-300 rounded-xl font-semibold text-stone-900 focus:ring-2 focus:ring-red-600/20 focus:border-red-600 outline-none"
                      required
                    />
                    {adminEmail.trim().toLowerCase() !== (currentUser?.email || '').toLowerCase() && (
                      <p className="text-[11px] text-amber-700 font-medium mt-1 flex items-center gap-1">
                        <span>⚠️ Changing Gmail requires mandatory OTP verification before saving.</span>
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="font-bold text-stone-700 block mb-1">Phone Number</label>
                    <input
                      type="tel"
                      value={adminPhone}
                      onChange={(e) => setAdminPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full p-3 border border-stone-300 rounded-xl font-semibold text-stone-900 focus:ring-2 focus:ring-red-600/20 focus:border-red-600 outline-none"
                      required
                    />
                  </div>
                </div>

                {/* Password Fields for this Gmail Account */}
                <div className="pt-2 border-t border-stone-100">
                  <div className="mb-2">
                    <span className="font-bold text-stone-800 text-xs flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-stone-600" /> Account Password
                    </span>
                    <p className="text-[11px] text-stone-500">
                      Set a password for your changed Gmail account (min 6 characters). Next time you sign in, you can log in with this new Gmail and password.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-stone-700 block mb-1">
                        Password
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={adminPassword}
                          onChange={(e) => setAdminPassword(e.target.value)}
                          placeholder="Leave blank to keep existing"
                          className="w-full p-3 pr-10 border border-stone-300 rounded-xl font-semibold text-stone-900 focus:ring-2 focus:ring-red-600/20 focus:border-red-600 outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 cursor-pointer"
                          tabIndex={-1}
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="font-bold text-stone-700 block mb-1">
                        Confirm Password
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          value={adminConfirmPassword}
                          onChange={(e) => setAdminConfirmPassword(e.target.value)}
                          placeholder="Re-type new password"
                          className="w-full p-3 pr-10 border border-stone-300 rounded-xl font-semibold text-stone-900 focus:ring-2 focus:ring-red-600/20 focus:border-red-600 outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 cursor-pointer"
                          tabIndex={-1}
                        >
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingProfile(false);
                      setAdminPassword('');
                      setAdminConfirmPassword('');
                      setAdminEmail(currentUser?.email || '');
                      setAdminName(currentUser?.name || '');
                      setAdminPhone(currentUser?.phone || '');
                    }}
                    className="px-4 py-2.5 rounded-xl border border-stone-200 text-stone-700 font-bold hover:bg-stone-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingProfile || isSendingOtp}
                    className="px-5 py-2.5 rounded-xl bg-red-700 hover:bg-red-800 text-white font-bold flex items-center gap-1.5 shadow-md shadow-red-700/20 cursor-pointer transition-all active:scale-95"
                  >
                    {isSavingProfile || isSendingOtp ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    <span>
                      {isSendingOtp
                        ? 'Sending OTP...'
                        : adminEmail.trim().toLowerCase() !== (currentUser?.email || '').toLowerCase()
                        ? 'Verify & Save Changes'
                        : 'Save Changes'}
                    </span>
                  </button>
                </div>
              </form>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200/80">
                  <span className="text-[10px] font-bold text-stone-400 block uppercase tracking-wider mb-1">
                    Receiver / Admin Name
                  </span>
                  <p className="font-extrabold text-stone-900 text-sm flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-red-600" />
                    {currentUser?.name}
                  </p>
                </div>

                <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200/80">
                  <span className="text-[10px] font-bold text-stone-400 block uppercase tracking-wider mb-1">
                    Gmail / Email Address
                  </span>
                  <p className="font-extrabold text-stone-900 text-sm flex items-center gap-1.5 truncate">
                    <Mail className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span className="truncate">{currentUser?.email}</span>
                  </p>
                </div>

                <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200/80">
                  <span className="text-[10px] font-bold text-stone-400 block uppercase tracking-wider mb-1">
                    Phone Number
                  </span>
                  <p className="font-extrabold text-stone-900 text-sm flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-emerald-600" />
                    {currentUser?.phone}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* NOTIFICATION SETTINGS */}
          <div className="bg-white rounded-3xl border border-stone-200 p-5 shadow-xs space-y-4">
            <div>
              <h4 className="font-extrabold text-sm text-stone-900 flex items-center gap-2">
                <Bell className="w-4 h-4 text-red-600" /> Notification & Alert Preferences
              </h4>
              <p className="text-xs text-stone-500 font-medium">Control audio alerts and push notifications for high-priority restaurant events</p>
            </div>

            <div className="space-y-3 pt-1">
              {/* Web Push Notification */}
              <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="font-bold text-stone-900 text-xs flex items-center gap-1.5">
                    <span>Web Push Alerts</span>
                    {webPushPermission === 'granted' && isPushAlertsEnabled && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold">Active</span>
                    )}
                  </span>
                  <p className="text-[11px] text-stone-500">Receive instant desktop/mobile notification when a new order arrives</p>
                </div>

                <button
                  type="button"
                  onClick={async () => {
                    if (webPushPermission !== 'granted') {
                      await requestWebPushPermission();
                    } else {
                      togglePushAlerts();
                    }
                  }}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-colors cursor-pointer ${
                    webPushPermission === 'granted' && isPushAlertsEnabled
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                      : 'bg-stone-200 text-stone-700 hover:bg-stone-300'
                  }`}
                >
                  {webPushPermission === 'granted' && isPushAlertsEnabled ? 'Enabled' : 'Enable'}
                </button>
              </div>

              {/* Order Ringtone / Audio Alert */}
              <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="font-bold text-stone-900 text-xs flex items-center gap-1.5">
                    {orderAudioAlerts ? <Volume2 className="w-4 h-4 text-emerald-600" /> : <VolumeX className="w-4 h-4 text-stone-400" />}
                    <span>Kitchen Bell & Order Sound</span>
                  </span>
                  <p className="text-[11px] text-stone-500">Play continuous audio chime when new orders enter the kitchen dispatch</p>
                </div>

                <button
                  type="button"
                  onClick={() => setOrderAudioAlerts(!orderAudioAlerts)}
                  className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                    orderAudioAlerts ? 'bg-red-600 justify-end' : 'bg-stone-300 justify-start'
                  }`}
                >
                  <div className="w-4 h-4 bg-white rounded-full shadow-md"></div>
                </button>
              </div>

              {/* SMS & Critical Alerts */}
              <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="font-bold text-stone-900 text-xs">SMS & WhatsApp Critical Dispatch Alerts</span>
                  <p className="text-[11px] text-stone-500">Send urgent fallback SMS when delivery drivers do not accept orders within 5 mins</p>
                </div>

                <button
                  type="button"
                  onClick={() => setSmsCriticalAlerts(!smsCriticalAlerts)}
                  className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                    smsCriticalAlerts ? 'bg-red-600 justify-end' : 'bg-stone-300 justify-start'
                  }`}
                >
                  <div className="w-4 h-4 bg-white rounded-full shadow-md"></div>
                </button>
              </div>

              {/* Daily Revenue Email Summary */}
              <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="font-bold text-stone-900 text-xs">Daily Midnight Revenue Summary Email</span>
                  <p className="text-[11px] text-stone-500">Send automated financial ledger and order breakdown to {currentUser?.email}</p>
                </div>

                <button
                  type="button"
                  onClick={() => setEmailDigestAlerts(!emailDigestAlerts)}
                  className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                    emailDigestAlerts ? 'bg-red-600 justify-end' : 'bg-stone-300 justify-start'
                  }`}
                >
                  <div className="w-4 h-4 bg-white rounded-full shadow-md"></div>
                </button>
              </div>
            </div>
          </div>

          {/* SIGN OUT ACTION */}
          <div className="bg-white rounded-3xl border border-stone-200 p-5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <h4 className="font-extrabold text-sm text-stone-900">Session Management</h4>
              <p className="text-xs text-stone-500 font-medium">Terminate current administrator access session on this device</p>
            </div>

            <button
              type="button"
              onClick={() => logout()}
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs active:scale-95"
            >
              <LogOut className="w-4 h-4 text-red-600" />
              <span>Sign Out of Admin Account</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 2: STORE CONFIGURATION & OPERATING HOURS */}
      {/* ========================================================================= */}
      {activeTab === 'store_settings' && (
        <form onSubmit={handleSaveStoreSettings} className="space-y-4 animate-in fade-in duration-200 text-xs">
          {storeSavedMsg && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl font-bold flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" /> {storeSavedMsg}
            </div>
          )}

          <div className="bg-white rounded-3xl border border-stone-200 p-5 shadow-xs space-y-4">
            <h4 className="font-extrabold text-sm text-stone-900 flex items-center gap-2">
              <Store className="w-4 h-4 text-amber-600" /> Store Profile & Public Details
            </h4>

            <div>
              <label className="font-bold text-stone-700 block mb-1">Restaurant Brand Name</label>
              <input
                type="text"
                value={restaurantName}
                onChange={(e) => setRestaurantName(e.target.value)}
                className="w-full p-3 border border-stone-300 rounded-xl font-semibold text-stone-900 focus:border-red-600 outline-none"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-stone-700 block mb-1">Customer Support Helpline Phone</label>
                <input
                  type="text"
                  value={supportPhone}
                  onChange={(e) => setSupportPhone(e.target.value)}
                  className="w-full p-3 border border-stone-300 rounded-xl font-semibold text-stone-900 focus:border-red-600 outline-none"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-stone-700 block mb-1">Physical Kitchen Address</label>
                <input
                  type="text"
                  value={storeAddress}
                  onChange={(e) => setStoreAddress(e.target.value)}
                  className="w-full p-3 border border-stone-300 rounded-xl font-semibold text-stone-900 focus:border-red-600 outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="font-bold text-stone-700 block mb-1 flex items-center gap-1.5">
                <Megaphone className="w-3.5 h-3.5 text-red-600" /> Top Customer Announcement Banner (Optional)
              </label>
              <input
                type="text"
                value={announcement}
                onChange={(e) => setAnnouncement(e.target.value)}
                placeholder="e.g. Free Dessert on all orders above ₹499 today!"
                className="w-full p-3 border border-stone-300 rounded-xl font-semibold text-stone-900 focus:border-red-600 outline-none"
              />
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-stone-200 p-5 shadow-xs space-y-4">
            <h4 className="font-extrabold text-sm text-stone-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" /> Operational Hours & Delivery Pricing
            </h4>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-stone-700 block mb-1">Opening Time</label>
                <input
                  type="text"
                  value={openingTime}
                  onChange={(e) => setOpeningTime(e.target.value)}
                  className="w-full p-3 border border-stone-300 rounded-xl font-semibold text-stone-900"
                />
              </div>
              <div>
                <label className="font-bold text-stone-700 block mb-1">Closing Time</label>
                <input
                  type="text"
                  value={closingTime}
                  onChange={(e) => setClosingTime(e.target.value)}
                  className="w-full p-3 border border-stone-300 rounded-xl font-semibold text-stone-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-stone-700 block mb-1">Base Delivery Fee (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={baseDeliveryFee}
                  onChange={(e) => setBaseDeliveryFee(Number(e.target.value))}
                  className="w-full p-3 border border-stone-300 rounded-xl font-semibold text-stone-900"
                />
              </div>
              <div>
                <label className="font-bold text-stone-700 block mb-1">Free Delivery Above (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={freeDeliveryThreshold}
                  onChange={(e) => setFreeDeliveryThreshold(Number(e.target.value))}
                  className="w-full p-3 border border-stone-300 rounded-xl font-semibold text-stone-900"
                />
              </div>
            </div>

            {/* Payment Gateways Toggle */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <label className="flex items-center gap-3 p-3.5 bg-stone-50 rounded-2xl border border-stone-200 cursor-pointer hover:bg-stone-100/80 transition-colors">
                <input
                  type="checkbox"
                  checked={codEnabled}
                  onChange={(e) => setCodEnabled(e.target.checked)}
                  className="w-4 h-4 rounded text-red-600 focus:ring-red-600"
                />
                <div>
                  <span className="font-bold text-stone-900 block flex items-center gap-1">
                    <Banknote className="w-3.5 h-3.5 text-emerald-600" /> Cash on Delivery (COD)
                  </span>
                  <span className="text-[11px] text-stone-500">Allow customers to pay at door</span>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3.5 bg-stone-50 rounded-2xl border border-stone-200 cursor-pointer hover:bg-stone-100/80 transition-colors">
                <input
                  type="checkbox"
                  checked={onlinePaymentEnabled}
                  onChange={(e) => setOnlinePaymentEnabled(e.target.checked)}
                  className="w-4 h-4 rounded text-red-600 focus:ring-red-600"
                />
                <div>
                  <span className="font-bold text-stone-900 block flex items-center gap-1">
                    <CreditCard className="w-3.5 h-3.5 text-blue-600" /> UPI & Online Cards
                  </span>
                  <span className="text-[11px] text-stone-500">Allow instant digital payment</span>
                </div>
              </label>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSavingStore}
              className="px-6 py-3.5 rounded-2xl bg-red-700 hover:bg-red-800 text-white font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-red-700/25 active:scale-95 transition-all cursor-pointer"
            >
              {isSavingStore ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>Save Store Configuration</span>
            </button>
          </div>
        </form>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 3: INTEGRITY & OUTBOX */}
      {/* ========================================================================= */}
      {activeTab === 'audit_logs' && (
        <div className="space-y-4 animate-in fade-in duration-200 text-xs">
          <div className="bg-white rounded-3xl border border-stone-200 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-extrabold text-sm text-stone-900 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" /> Cryptographic Audit Ledger
                </h4>
                <p className="text-xs text-stone-500 font-medium">Verify blockchain-style SHA-256 tamper-proof log</p>
              </div>

              <button
                type="button"
                onClick={handleVerifyAudit}
                disabled={isVerifyingChain}
                className="px-3.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl font-bold text-xs flex items-center gap-1.5"
              >
                {isVerifyingChain ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />}
                <span>Verify Ledger</span>
              </button>
            </div>

            {integrityReport ? (
              <div className={`p-3.5 rounded-2xl border ${integrityReport.valid ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'}`}>
                <p className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Ledger Integrity: {integrityReport.valid ? 'VERIFIED (100% Tamper Proof)' : 'COMPROMISED'}</span>
                </p>
                <p className="text-[11px] text-stone-600 mt-1">
                  Inspected {integrityReport.totalChecked || 0} event chains across user actions and financial settlements.
                </p>
              </div>
            ) : (
              <p className="text-stone-400 italic">Click Verify Ledger to inspect cryptographic event chains.</p>
            )}
          </div>

          <div className="bg-white rounded-3xl border border-stone-200 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-extrabold text-sm text-stone-900 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-600" /> Real-time Outbox Queue
                </h4>
                <p className="text-xs text-stone-500 font-medium">Background transactional worker queue</p>
              </div>

              <button
                type="button"
                onClick={handleLoadOutbox}
                disabled={isLoadingOutbox}
                className="px-3.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl font-bold text-xs"
              >
                Refresh Queue
              </button>
            </div>

            {outboxEvents.length === 0 ? (
              <p className="text-stone-400 italic">All queued messages dispatched cleanly.</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {outboxEvents.map((evt) => (
                  <div key={evt.id} className="p-2.5 bg-stone-50 rounded-xl border border-stone-200 flex justify-between items-center text-[11px]">
                    <div>
                      <span className="font-bold text-stone-800">{evt.eventType}</span>
                      <span className="text-stone-400 ml-2">Attempts: {evt.retryCount || 0}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-extrabold text-[10px]">
                      {evt.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Real-Time Gmail OTP Verification Modal for Admin Email Change */}
      {showEmailOtpModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-700 flex items-center justify-center mx-auto shadow-sm">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-stone-900">Verify Your New Gmail</h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                A 6-digit verification code was dispatched to <strong className="text-stone-900">{adminEmail}</strong>. Enter it below to confirm your new administrator credentials.
              </p>
            </div>

            {otpModalError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{otpModalError}</span>
              </div>
            )}

            <form onSubmit={handleConfirmEmailOtp} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 text-center mb-3">
                  Enter 6-Digit OTP Code
                </label>
                <div className="py-2">
                  <OtpInput
                    length={6}
                    value={emailOtpCode}
                    onChange={(val) => {
                      setEmailOtpCode(val);
                      if (otpModalError) setOtpModalError(null);
                    }}
                    disabled={isVerifyingEmailOtp}
                    hasError={Boolean(otpModalError)}
                    autoFocus={true}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-stone-500 font-medium">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> Expires in {Math.floor(otpCountdown / 60)}:{(otpCountdown % 60).toString().padStart(2, '0')}
                </span>
                <button
                  type="button"
                  disabled={resendCooldown > 0}
                  onClick={handleResendOtp}
                  className={`font-bold transition-colors ${
                    resendCooldown > 0 ? 'text-stone-400 cursor-not-allowed' : 'text-red-700 hover:text-red-800 cursor-pointer'
                  }`}
                >
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
                </button>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 leading-tight">
                <strong>Important:</strong> Once verified, your administrator email changes to <strong>{adminEmail}</strong>. You must use this new Gmail and your password to sign in next time.
              </div>

              <div className="flex gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setShowEmailOtpModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-stone-300 text-stone-700 font-bold text-xs hover:bg-stone-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isVerifyingEmailOtp || emailOtpCode.length !== 6}
                  className="flex-1 py-2.5 rounded-xl bg-red-700 hover:bg-red-800 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-red-700/20 transition-colors cursor-pointer"
                >
                  {isVerifyingEmailOtp ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  <span>Verify & Save</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
