import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ForgotPasswordModal } from './ForgotPasswordModal';
import { OtpInput } from './OtpInput';
import { apiService } from '../../services/api';
import { Address } from '../../types';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  Flame,
  ShieldCheck,
  Utensils,
  Bike,
  User,
  AlertCircle,
  Loader2,
  KeyRound,
  CheckCircle2,
  Clock,
  Send,
  ArrowLeft,
  Phone,
  MapPin,
  Crosshair,
  UserPlus,
  LogIn,
  Check,
  Sparkles,
  Navigation,
  X
} from 'lucide-react';

interface QuickRoleAccount {
  roleName: string;
  roleKey: 'ADMIN' | 'STAFF' | 'DELIVERY_PARTNER' | 'CUSTOMER';
  email: string;
  desc: string;
  icon: React.ReactNode;
  badgeStyle: string;
  accentBorder: string;
}

// Strictly 4 roles: Admin, Staff, Delivery Partner, Customer
const STRICT_4_ROLES: QuickRoleAccount[] = [
  {
    roleName: 'Admin',
    roleKey: 'ADMIN',
    email: 'admin@hunterskitchen.com',
    desc: 'Full administrative control, menu management & business analytics',
    icon: <ShieldCheck className="h-4 w-4 text-amber-700" />,
    badgeStyle: 'bg-amber-100 text-amber-900 border-amber-300',
    accentBorder: 'hover:border-amber-400'
  },
  {
    roleName: 'Staff',
    roleKey: 'STAFF',
    email: 'staff@hunterskitchen.com',
    desc: 'Live Kitchen Display (KDS), preparation stations & order handoff',
    icon: <Utensils className="h-4 w-4 text-blue-700" />,
    badgeStyle: 'bg-blue-100 text-blue-900 border-blue-300',
    accentBorder: 'hover:border-blue-400'
  },
  {
    roleName: 'Delivery Partner',
    roleKey: 'DELIVERY_PARTNER',
    email: 'delivery@hunterskitchen.com',
    desc: 'Live dispatch, active delivery routes & COD cash collection',
    icon: <Bike className="h-4 w-4 text-orange-700" />,
    badgeStyle: 'bg-orange-100 text-orange-900 border-orange-300',
    accentBorder: 'hover:border-orange-400'
  },
  {
    roleName: 'Customer',
    roleKey: 'CUSTOMER',
    email: 'customer@hunterskitchen.com',
    desc: 'Explore menu, order food with COD, real-time GPS tracking',
    icon: <User className="h-4 w-4 text-emerald-700" />,
    badgeStyle: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    accentBorder: 'hover:border-emerald-400'
  }
];

export const LoginPage: React.FC = () => {
  const { login, register, loginWithOtp, checkSession, setLoginSuccessUser } = useAuth();

  // Top Mode: Sign In vs Create Account
  const [mainMode, setMainMode] = useState<'SIGN_IN' | 'REGISTER'>('SIGN_IN');

  // Sign In Sub-mode: Password vs Gmail OTP
  const [authMode, setAuthMode] = useState<'PASSWORD' | 'OTP'>('PASSWORD');

  // Password Sign In State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Register State
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  
  // Register Address State
  const [regAddrDoor, setRegAddrDoor] = useState('');
  const [regAddrStreet, setRegAddrStreet] = useState('');
  const [regAddrArea, setRegAddrArea] = useState('');
  const [regAddrCity, setRegAddrCity] = useState('Coimbatore');
  const [regAddrPincode, setRegAddrPincode] = useState('641018');
  const [regAddrType, setRegAddrType] = useState<'HOME' | 'WORK' | 'OTHER'>('HOME');
  const [regAddrCoordinates, setRegAddrCoordinates] = useState('');
  const [isLocatingReg, setIsLocatingReg] = useState(false);

  // OTP Login State
  const [otpEmail, setOtpEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpStep, setOtpStep] = useState<'REQUEST' | 'VERIFY'>('REQUEST');
  const [otpCountdown, setOtpCountdown] = useState<number>(600);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modals
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);

  // OTP Countdown Timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (mainMode === 'SIGN_IN' && authMode === 'OTP' && otpStep === 'VERIFY' && otpCountdown > 0) {
      timer = setInterval(() => {
        setOtpCountdown((prev) => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [mainMode, authMode, otpStep, otpCountdown]);

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Detect GPS Location for Register Address Form
  const handleDetectRegisterLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      setRegAddrStreet('Greenways Road, Sector 3');
      setRegAddrArea('Race Course');
      setRegAddrCity('Coimbatore');
      setRegAddrPincode('641018');
      setRegAddrCoordinates('11.0045, 76.9612');
      return;
    }

    setIsLocatingReg(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const coordsStr = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        setRegAddrCoordinates(coordsStr);

        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
            {
              headers: {
                'Accept-Language': 'en',
                'User-Agent': 'HuntersKitchenApp/1.0'
              }
            }
          );
          if (!response.ok) throw new Error('Geocoding error');
          const data = await response.json();
          if (data && data.address) {
            const addr = data.address;
            setRegAddrDoor(addr.house_number || addr.building || '');
            setRegAddrStreet(addr.road || addr.pedestrian || addr.cycleway || addr.footway || addr.path || addr.suburb || addr.neighbourhood || 'Main Road');
            setRegAddrArea(addr.suburb || addr.neighbourhood || addr.city_district || addr.residential || addr.village || addr.quarter || 'Central District');
            setRegAddrCity(addr.city || addr.town || addr.village || 'Coimbatore');
            setRegAddrPincode(addr.postcode || '641018');
          } else {
            setRegAddrStreet('Avinashi Road');
            setRegAddrArea('Peelamedu');
            setRegAddrCity('Coimbatore');
            setRegAddrPincode('641018');
          }
        } catch (err) {
          console.warn('Geocoding failed, falling back:', err);
          setRegAddrStreet('Avinashi Road');
          setRegAddrArea('Peelamedu');
          setRegAddrCity('Coimbatore');
          setRegAddrPincode('641018');
        } finally {
          setIsLocatingReg(false);
        }
      },
      (error) => {
        console.warn('Geolocation error:', error);
        setRegAddrStreet('Avinashi Road');
        setRegAddrArea('Peelamedu');
        setRegAddrCity('Coimbatore');
        setRegAddrPincode('641018');
        setRegAddrCoordinates('11.0045, 76.9612');
        setIsLocatingReg(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Listen for Google OAuth 2.0 / OIDC popup callback messages
  useEffect(() => {
    const handleGoogleMessage = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;

      if (event.data?.type === 'GOOGLE_AUTH_SUCCESS') {
        setIsLoading(true);
        try {
          const user = await checkSession();
          if (user) {
            setLoginSuccessUser(user);
          } else {
            setErrorMessage('Google authentication succeeded but session could not be established. Please try again.');
          }
        } catch (err: any) {
          setErrorMessage(err.message || 'Failed to initialize session after Google authentication');
        } finally {
          setIsLoading(false);
        }
      } else if (event.data?.type === 'GOOGLE_AUTH_ERROR') {
        setIsLoading(false);
        setErrorMessage(event.data.message || 'Google authentication failed or was cancelled');
      }
    };

    window.addEventListener('message', handleGoogleMessage);
    return () => window.removeEventListener('message', handleGoogleMessage);
  }, [checkSession, setLoginSuccessUser]);

  // Standard Email/Password Sign In
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorMessage('Please enter your email address to sign in.');
      return;
    }
    if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setErrorMessage('Please enter a valid email address (e.g. name@gmail.com).');
      return;
    }
    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await login(cleanEmail, password);
    } catch (err: any) {
      console.warn('Authentication rejected:', err);
      setErrorMessage(err.message || 'Incorrect email or password. Please check your credentials and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Register / Sign-Up Submission
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!regName.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }
    if (!regPhone.trim()) {
      setErrorMessage('Please enter your phone number.');
      return;
    }
    if (!regEmail.trim() || !regEmail.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    if (!regPassword || regPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }
    if (!regAddrStreet.trim() || !regAddrArea.trim()) {
      setErrorMessage('Please enter your delivery street and area.');
      return;
    }

    setIsLoading(true);

    try {
      const addressPayload: Partial<Address> = {
        name: regName.trim(),
        phone: regPhone.trim(),
        doorNo: regAddrDoor.trim() || 'N/A',
        street: regAddrStreet.trim(),
        area: regAddrArea.trim(),
        city: regAddrCity.trim() || 'Coimbatore',
        pincode: regAddrPincode.trim() || '641018',
        type: regAddrType,
        coordinates: regAddrCoordinates.trim() || undefined,
        isDefault: true
      };

      await register({
        name: regName.trim(),
        phone: regPhone.trim(),
        email: regEmail.trim().toLowerCase(),
        password: regPassword,
        address: addressPayload
      });
      // The tick animation will automatically trigger via setLoginSuccessUser!
    } catch (err: any) {
      console.error('Registration error:', err);
      setErrorMessage(err.message || 'Failed to register account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // OTP Step 1: Send Verification Code
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanEmail = otpEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMessage('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await apiService.sendOtp(cleanEmail, 'LOGIN');
      setSuccessMessage(res.message || `A 6-digit verification code has been dispatched to ${cleanEmail}`);
      setOtpCountdown(res.expiresInSeconds || 600);
      setOtpStep('VERIFY');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to dispatch verification code');
    } finally {
      setIsLoading(false);
    }
  };

  // OTP Step 2: Verify Code and Sign In
  const handleVerifyOtpLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = otpEmail.trim().toLowerCase();
    const cleanOtp = otpCode.trim();

    if (cleanOtp.length < 6) {
      setErrorMessage('Please enter the full 6-digit verification code');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      await loginWithOtp(cleanEmail, cleanOtp);
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid or expired verification code');
    } finally {
      setIsLoading(false);
    }
  };

  // 1-Click Role Sign In
  const handleQuickLogin = async (accEmail: string) => {
    setMainMode('SIGN_IN');
    setAuthMode('PASSWORD');
    setEmail(accEmail);
    setPassword('Hunter@2026!');
    setErrorMessage(null);
    setIsLoading(true);

    try {
      await login(accEmail, 'Hunter@2026!');
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  // Google Single Sign-On Handler (Authorization Code Flow)
  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await apiService.getGoogleAuthUrl();

      if (!res.url) {
        throw new Error('Failed to obtain Google authorization URL from server');
      }

      const width = 500;
      const height = 650;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      const popup = window.open(
        res.url,
        'google_oauth_popup',
        `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,status=1`
      );

      if (!popup) {
        setIsLoading(false);
        setErrorMessage('Popup was blocked by your browser. Please enable popups for this site to sign in with Google.');
        return;
      }

      const popupCheckInterval = setInterval(() => {
        if (popup.closed) {
          clearInterval(popupCheckInterval);
          setIsLoading(false);
        }
      }, 1000);
    } catch (err: any) {
      setIsLoading(false);
      setErrorMessage(
        err.message ||
          'Google Sign-In is not configured. Please configure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.'
      );
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8">
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-lg text-center">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-to-tr from-red-600 to-amber-500 shadow-lg shadow-red-500/25 mb-3.5 ring-4 ring-white">
          <Flame className="h-9 w-9 text-white" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-stone-900 font-serif">
          Hunter's Kitchen
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-stone-600 font-medium">
          Fresh Gourmet Cloud Kitchen & Instant Delivery Platform
        </p>
      </div>

      {/* Main Authentication Card */}
      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-lg">
        <div className="bg-white border border-stone-200/90 rounded-3xl p-6 sm:p-8 shadow-xl shadow-stone-200/60">
          
          {/* Professional Error Message Banner */}
          {errorMessage && (
            <div className="mb-5 flex items-start justify-between rounded-2xl bg-red-50 border border-red-200/90 p-4 text-xs sm:text-sm text-red-900 shadow-sm animate-shake">
              <div className="flex items-start space-x-3">
                <div className="p-1.5 rounded-xl bg-red-100 text-red-600 shrink-0 mt-0.5">
                  <AlertCircle className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-bold text-red-950 text-xs sm:text-sm">Authentication Notice</h4>
                  <p className="font-medium text-red-800 text-xs mt-0.5 leading-relaxed">{errorMessage}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setErrorMessage(null)}
                className="text-red-400 hover:text-red-700 p-1 cursor-pointer transition-colors shrink-0 ml-2"
                title="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Success Message Banner */}
          {successMessage && (
            <div className="mb-5 flex items-start space-x-2.5 rounded-2xl bg-emerald-50 border border-emerald-200 p-3.5 text-xs sm:text-sm text-emerald-800">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 mt-0.5" />
              <span className="font-semibold">{successMessage}</span>
            </div>
          )}

          {/* ============================================================ */}
          {/* MODE 1: NEW CUSTOMER SIGN UP / REGISTRATION                 */}
          {/* ============================================================ */}
          {mainMode === 'REGISTER' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div className="flex items-center justify-between pb-3 mb-2 border-b border-stone-100">
                <div>
                  <h2 className="text-base sm:text-lg font-black text-stone-900 font-serif">
                    New Customer Sign Up
                  </h2>
                  <p className="text-xs text-stone-500">Create your account with delivery address</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setMainMode('SIGN_IN');
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  className="text-xs font-bold text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Sign In</span>
                </button>
              </div>

              <div className="border-b border-stone-100 pb-2 mb-3">
                <h3 className="text-sm sm:text-base font-extrabold text-stone-900 uppercase tracking-wide flex items-center gap-2">
                  <User className="w-4 h-4 text-red-600" />
                  <span>1. Your Account Details</span>
                </h3>
                <p className="text-xs text-stone-400 font-medium">Create your password for future login</p>
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1 uppercase tracking-wider">
                  Full Name *
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                  <input
                    type="text"
                    required
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="e.g. Sanjay M"
                    className="w-full rounded-xl bg-stone-50 border border-stone-300 pl-10 pr-4 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:bg-white focus:border-red-600 focus:ring-2 focus:ring-red-600/10 focus:outline-hidden transition-all"
                  />
                </div>
              </div>

              {/* Phone & Email Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1 uppercase tracking-wider">
                    Phone Number *
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                    <input
                      type="tel"
                      required
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full rounded-xl bg-stone-50 border border-stone-300 pl-10 pr-4 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:bg-white focus:border-red-600 focus:ring-2 focus:ring-red-600/10 focus:outline-hidden transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1 uppercase tracking-wider">
                    Email Address *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                    <input
                      type="email"
                      required
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="name@gmail.com"
                      className="w-full rounded-xl bg-stone-50 border border-stone-300 pl-10 pr-4 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:bg-white focus:border-red-600 focus:ring-2 focus:ring-red-600/10 focus:outline-hidden transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Password for future logins */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1 uppercase tracking-wider">
                  Create Password (for future login) *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                  <input
                    type={showRegPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Min. 6 characters password"
                    className="w-full rounded-xl bg-stone-50 border border-stone-300 pl-10 pr-11 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:bg-white focus:border-red-600 focus:ring-2 focus:ring-red-600/10 focus:outline-hidden transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPassword(!showRegPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-1 cursor-pointer"
                  >
                    {showRegPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Delivery Address Details */}
              <div className="border-t border-stone-100 pt-4 mt-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-sm sm:text-base font-extrabold text-stone-900 uppercase tracking-wide flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-red-600" />
                      <span>2. Your Delivery Address</span>
                    </h3>
                    <p className="text-xs text-stone-400 font-medium">Required for home deliveries & drop-off</p>
                  </div>

                  <button
                    type="button"
                    onClick={handleDetectRegisterLocation}
                    disabled={isLocatingReg}
                    className="text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200/80 px-2.5 py-1 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                  >
                    {isLocatingReg ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-red-600" />
                    ) : (
                      <Crosshair className="w-3.5 h-3.5 text-red-600" />
                    )}
                    <span>{isLocatingReg ? 'Locating...' : 'Use GPS'}</span>
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1 uppercase tracking-wider">Type</label>
                      <select
                        value={regAddrType}
                        onChange={(e) => setRegAddrType(e.target.value as any)}
                        className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs sm:text-sm font-semibold text-stone-900 focus:bg-white focus:border-red-600 outline-none"
                      >
                        <option value="HOME">Home</option>
                        <option value="WORK">Work</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </div>

                    <div className="col-span-2">
                      <label className="block text-xs font-bold text-stone-700 mb-1 uppercase tracking-wider">
                        Flat / Door / Building No
                      </label>
                      <input
                        type="text"
                        value={regAddrDoor}
                        onChange={(e) => setRegAddrDoor(e.target.value)}
                        placeholder="e.g. #42-B, Flat 3"
                        className="w-full rounded-xl bg-stone-50 border border-stone-300 px-3 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:bg-white focus:border-red-600 focus:ring-2 focus:ring-red-600/10 focus:outline-hidden transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1 uppercase tracking-wider">
                      Street / Road *
                    </label>
                    <input
                      type="text"
                      required
                      value={regAddrStreet}
                      onChange={(e) => setRegAddrStreet(e.target.value)}
                      placeholder="e.g. Richmond Road / Avinashi Road"
                      className="w-full rounded-xl bg-stone-50 border border-stone-300 px-3 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:bg-white focus:border-red-600 focus:ring-2 focus:ring-red-600/10 focus:outline-hidden transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1 uppercase tracking-wider">
                        Area / Landmark *
                      </label>
                      <input
                        type="text"
                        required
                        value={regAddrArea}
                        onChange={(e) => setRegAddrArea(e.target.value)}
                        placeholder="e.g. Race Course / Peelamedu"
                        className="w-full rounded-xl bg-stone-50 border border-stone-300 px-3 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:bg-white focus:border-red-600 focus:ring-2 focus:ring-red-600/10 focus:outline-hidden transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1 uppercase tracking-wider">
                        Pincode *
                      </label>
                      <input
                        type="text"
                        required
                        value={regAddrPincode}
                        onChange={(e) => setRegAddrPincode(e.target.value)}
                        placeholder="641018"
                        className="w-full rounded-xl bg-stone-50 border border-stone-300 px-3 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:bg-white focus:border-red-600 focus:ring-2 focus:ring-red-600/10 focus:outline-hidden transition-all"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit Registration CTA */}
              <div className="pt-3 space-y-2.5">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 px-5 rounded-2xl bg-red-700 hover:bg-red-800 text-white font-extrabold text-sm sm:text-base shadow-lg shadow-red-700/20 flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Creating Your Account...</span>
                    </>
                  ) : (
                    <>
                      <Check className="h-5 w-5" />
                      <span>Complete Sign Up & Continue</span>
                    </>
                  )}
                </button>

                <div className="text-center pt-1">
                  <p className="text-xs sm:text-sm text-stone-600">
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setMainMode('SIGN_IN');
                        setErrorMessage(null);
                        setSuccessMessage(null);
                      }}
                      className="font-bold text-red-700 hover:text-red-800 underline underline-offset-2 cursor-pointer transition-colors"
                    >
                      Sign In here
                    </button>
                  </p>
                </div>
              </div>
            </form>
          )}

          {/* ============================================================ */}
          {/* MODE 2: EXISTING USER SIGN IN                                */}
          {/* ============================================================ */}
          {mainMode === 'SIGN_IN' && (
            <div className="space-y-4">
              {/* Segmented Sub-tab: Password vs Gmail OTP */}
              <div className="flex rounded-xl bg-stone-100 p-1 mb-4 border border-stone-200/60">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('PASSWORD');
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    authMode === 'PASSWORD'
                      ? 'bg-white text-stone-900 shadow-xs'
                      : 'text-stone-500 hover:text-stone-800'
                  }`}
                >
                  <Lock className="h-3.5 w-3.5" />
                  <span>Password Sign In</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('OTP');
                    setErrorMessage(null);
                    setSuccessMessage(null);
                    if (!otpEmail && email) {
                      setOtpEmail(email);
                    }
                  }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    authMode === 'OTP'
                      ? 'bg-white text-stone-900 shadow-xs'
                      : 'text-stone-500 hover:text-stone-800'
                  }`}
                >
                  <Mail className="h-3.5 w-3.5" />
                  <span>Gmail OTP Sign In</span>
                </button>
              </div>

              {/* Password Form */}
              {authMode === 'PASSWORD' && (
                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1.5 uppercase tracking-wider">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (errorMessage) setErrorMessage(null);
                        }}
                        placeholder="name@example.com"
                        className="w-full rounded-xl bg-stone-50 border border-stone-300 pl-10 pr-4 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:bg-white focus:border-red-600 focus:ring-2 focus:ring-red-600/10 focus:outline-hidden transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider">
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={() => setIsForgotModalOpen(true)}
                        className="text-xs text-red-600 hover:text-red-700 font-semibold cursor-pointer"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          if (errorMessage) setErrorMessage(null);
                        }}
                        placeholder="••••••••••••"
                        className="w-full rounded-xl bg-stone-50 border border-stone-300 pl-10 pr-11 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:bg-white focus:border-red-600 focus:ring-2 focus:ring-red-600/10 focus:outline-hidden transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-1 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full mt-2 inline-flex items-center justify-center space-x-2 rounded-2xl bg-red-700 hover:bg-red-800 px-5 py-3 text-sm sm:text-base font-extrabold text-white shadow-md shadow-red-700/20 transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Signing in...</span>
                      </>
                    ) : (
                      <span>Sign In to Hunter's Kitchen</span>
                    )}
                  </button>

                  {/* Professional Register Link under Sign In button */}
                  <div className="pt-2 text-center">
                    <p className="text-xs sm:text-sm text-stone-600">
                      Don't have an account?{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setMainMode('REGISTER');
                          setErrorMessage(null);
                          setSuccessMessage(null);
                        }}
                        className="font-bold text-red-700 hover:text-red-800 underline underline-offset-2 cursor-pointer transition-colors"
                      >
                        Register as New Customer
                      </button>
                    </p>
                  </div>
                </form>
              )}

              {/* Gmail OTP Sign In */}
              {authMode === 'OTP' && (
                <div>
                  {otpStep === 'REQUEST' ? (
                    <form onSubmit={handleSendOtp} className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-stone-700 mb-1.5 uppercase tracking-wider">
                          Gmail Address
                        </label>
                        <div className="relative">
                          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                          <input
                            type="email"
                            required
                            value={otpEmail}
                            onChange={(e) => setOtpEmail(e.target.value)}
                            placeholder="yourname@gmail.com"
                            className="w-full rounded-xl bg-stone-50 border border-stone-300 pl-10 pr-4 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:bg-white focus:border-red-600 focus:ring-2 focus:ring-red-600/10 focus:outline-hidden transition-all"
                          />
                        </div>
                        <p className="mt-1.5 text-xs text-stone-500">
                          We'll send a 6-digit verification code directly to your Gmail inbox.
                        </p>
                      </div>

                      <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full inline-flex items-center justify-center space-x-2 rounded-2xl bg-red-700 hover:bg-red-800 px-5 py-3 text-sm sm:text-base font-extrabold text-white shadow-md shadow-red-700/20 transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="h-5 w-5 animate-spin" />
                            <span>Sending code to Gmail...</span>
                          </>
                        ) : (
                          <>
                            <Send className="h-4 w-4" />
                            <span>Send Verification Code</span>
                          </>
                        )}
                      </button>

                      {/* Register Link */}
                      <div className="pt-2 text-center">
                        <p className="text-xs sm:text-sm text-stone-600">
                          Don't have an account?{' '}
                          <button
                            type="button"
                            onClick={() => {
                              setMainMode('REGISTER');
                              setErrorMessage(null);
                              setSuccessMessage(null);
                            }}
                            className="font-bold text-red-700 hover:text-red-800 underline underline-offset-2 cursor-pointer transition-colors"
                          >
                            Register as New Customer
                          </button>
                        </p>
                      </div>
                    </form>
                  ) : (
                    <form onSubmit={handleVerifyOtpLogin} className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-stone-600 font-medium truncate max-w-[240px]">
                          Code sent to: <strong className="text-stone-900">{otpEmail}</strong>
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setOtpStep('REQUEST');
                            setOtpCode('');
                            setErrorMessage(null);
                            setSuccessMessage(null);
                          }}
                          className="text-xs text-red-600 hover:text-red-700 font-semibold cursor-pointer inline-flex items-center gap-1"
                        >
                          <ArrowLeft className="h-3 w-3" /> Change
                        </button>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider">
                            6-Digit Verification Code
                          </label>
                          <div className="flex items-center text-xs font-mono text-stone-600 gap-1 bg-stone-100 px-2 py-0.5 rounded-md border border-stone-200">
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            <span>{formatCountdown(otpCountdown)}</span>
                          </div>
                        </div>

                        <div className="py-2">
                          <OtpInput
                            length={6}
                            value={otpCode}
                            onChange={(val) => {
                              setOtpCode(val);
                              if (errorMessage) setErrorMessage(null);
                            }}
                            disabled={isLoading}
                            hasError={Boolean(errorMessage)}
                            autoFocus={true}
                          />
                        </div>

                        <p className="mt-2 text-center text-xs text-stone-500">
                          Enter the 6-digit code sent to your Gmail inbox
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <button
                          type="button"
                          disabled={isLoading || otpCountdown > 540}
                          onClick={() => handleSendOtp()}
                          className="text-xs text-stone-600 hover:text-red-600 font-semibold disabled:opacity-50 disabled:hover:text-stone-600 cursor-pointer"
                        >
                          Resend code
                        </button>
                      </div>

                      <button
                        type="submit"
                        disabled={isLoading || otpCode.length < 6}
                        className="w-full inline-flex items-center justify-center space-x-2 rounded-2xl bg-red-700 hover:bg-red-800 px-5 py-3 text-sm sm:text-base font-extrabold text-white shadow-md shadow-red-700/20 transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="h-5 w-5 animate-spin" />
                            <span>Verifying code...</span>
                          </>
                        ) : (
                          <span>Verify & Sign In</span>
                        )}
                      </button>

                      {/* Register Link */}
                      <div className="pt-2 text-center">
                        <p className="text-xs sm:text-sm text-stone-600">
                          Don't have an account?{' '}
                          <button
                            type="button"
                            onClick={() => {
                              setMainMode('REGISTER');
                              setErrorMessage(null);
                              setSuccessMessage(null);
                            }}
                            className="font-bold text-red-700 hover:text-red-800 underline underline-offset-2 cursor-pointer transition-colors"
                          >
                            Register as New Customer
                          </button>
                        </p>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* Divider */}
              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-stone-200" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-3 text-stone-400 font-semibold tracking-wider">
                    Or continue with
                  </span>
                </div>
              </div>

              {/* Google Sign In Button */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-stone-300 hover:border-stone-400 rounded-2xl bg-white hover:bg-stone-50 text-stone-700 font-semibold text-sm shadow-xs transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Continue with Google</span>
              </button>

              {/* Quick Direct 1-Click Role Login */}
              <div className="mt-6 pt-5 border-t border-stone-100">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1">
                    <ShieldCheck className="h-4 w-4 text-red-600" /> Quick Demo Roles
                  </span>
                  <span className="text-xs text-stone-400 font-medium">1-Click Sign In</span>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  {STRICT_4_ROLES.map((role) => {
                    const isCurrent = email === role.email && authMode === 'PASSWORD';
                    return (
                      <button
                        key={role.roleKey}
                        type="button"
                        disabled={isLoading}
                        onClick={() => handleQuickLogin(role.email)}
                        className={`flex flex-col p-3 rounded-2xl text-left border transition-all text-xs cursor-pointer ${
                          isCurrent
                            ? 'bg-red-50/70 border-red-400 ring-2 ring-red-500/20 shadow-xs'
                            : `bg-stone-50/70 border-stone-200 hover:bg-stone-100/80 ${role.accentBorder}`
                        }`}
                      >
                        <div className="flex items-center justify-between w-full mb-1">
                          <div className="flex items-center gap-1.5 font-bold text-stone-900">
                            {role.icon}
                            <span>{role.roleName}</span>
                          </div>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold border ${role.badgeStyle}`}>
                            {role.roleKey}
                          </span>
                        </div>
                        <span className="text-[11px] text-stone-500 line-clamp-1">
                          {role.email}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Clean, Professional Footer */}
        <div className="mt-8 text-center text-xs text-stone-400">
          <p>
            Hunter's Kitchen &copy; 2026 &bull; Cloud Kitchen Operations & Delivery Platform
          </p>
        </div>
      </div>

      {/* Real-Time Gmail OTP Password Reset Modal */}
      <ForgotPasswordModal
        isOpen={isForgotModalOpen}
        onClose={() => setIsForgotModalOpen(false)}
        onSuccess={() => {
          setIsForgotModalOpen(false);
          setPassword('');
        }}
      />
    </div>
  );
};
