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
  RotateCcw,
  X,
  Home,
  Briefcase,
  Building
} from 'lucide-react';



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

  // Registration Validation & Touched Field Tracking
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});

  // OTP Login State
  const [otpEmail, setOtpEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpStep, setOtpStep] = useState<'REQUEST' | 'VERIFY'>('REQUEST');
  const [otpCountdown, setOtpCountdown] = useState<number>(600);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState<number>(0);
  const [resendSuccess, setResendSuccess] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modals
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);

  // Storage key for persisting active OTP verification session across page reloads
  const LOGIN_OTP_STORAGE_KEY = 'hunters_login_otp_session';

  // Restore active unexpired OTP verification session on page reload/mount
  useEffect(() => {
    try {
      const rawSession = sessionStorage.getItem(LOGIN_OTP_STORAGE_KEY);
      if (rawSession) {
        const session = JSON.parse(rawSession);
        const now = Date.now();
        if (session && session.expiresAt && session.expiresAt > now && session.email) {
          const remainingSec = Math.max(1, Math.ceil((session.expiresAt - now) / 1000));
          setMainMode('SIGN_IN');
          setAuthMode('OTP');
          setOtpStep('VERIFY');
          setOtpEmail(session.email);
          setOtpCountdown(remainingSec);
          setSuccessMessage(`Restored active verification session for ${session.email}`);
        } else {
          sessionStorage.removeItem(LOGIN_OTP_STORAGE_KEY);
        }
      }
    } catch (err) {
      console.warn('Failed to restore OTP session from storage:', err);
    }
  }, []);

  // OTP Countdown Timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (mainMode === 'SIGN_IN' && authMode === 'OTP' && otpStep === 'VERIFY' && otpCountdown > 0) {
      timer = setInterval(() => {
        setOtpCountdown((prev) => {
          const next = Math.max(0, prev - 1);
          if (next <= 0) {
            sessionStorage.removeItem(LOGIN_OTP_STORAGE_KEY);
          }
          return next;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [mainMode, authMode, otpStep, otpCountdown]);

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
          setFormErrors((prev) => ({
            ...prev,
            street: '',
            area: '',
            pincode: ''
          }));
        } catch (err) {
          console.warn('Geocoding failed, falling back:', err);
          setRegAddrStreet('Avinashi Road');
          setRegAddrArea('Peelamedu');
          setRegAddrCity('Coimbatore');
          setRegAddrPincode('641018');
          setFormErrors((prev) => ({
            ...prev,
            street: '',
            area: '',
            pincode: ''
          }));
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
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setErrorMessage('Please enter your email address to sign in.');
      return;
    }
    if (
      cleanEmail.startsWith('.') ||
      cleanEmail.includes('.@') ||
      cleanEmail.includes('..') ||
      !cleanEmail.includes('@') ||
      !cleanEmail.includes('.')
    ) {
      setErrorMessage('Please enter a valid Gmail address');
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
      const rawMsg = err.message || '';
      let friendlyMsg = 'Invalid email or password. Please check your credentials and try again.';
      if (rawMsg.includes('No account found')) {
        friendlyMsg = 'No account found with this email address. Please register as a new customer or check for typos.';
      } else if (rawMsg.includes('Incorrect password')) {
        friendlyMsg = rawMsg;
      } else if (rawMsg.includes('locked')) {
        friendlyMsg = rawMsg;
      } else if (rawMsg.includes('suspended') || rawMsg.includes('inactive')) {
        friendlyMsg = rawMsg;
      } else if (rawMsg) {
        friendlyMsg = rawMsg;
      }
      setErrorMessage(friendlyMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // Real-time Field Validation Logic
  const validateField = (field: string, val: string): string | null => {
    switch (field) {
      case 'name': {
        const trimmed = val.trim();
        if (!trimmed) return 'Full name is required';
        if (trimmed.length < 2) return 'Full name must be at least 2 characters';
        if (trimmed.length > 70) return 'Name cannot exceed 70 characters';
        if (!/^[a-zA-Z\u00C0-\u024F\s.'-]+$/.test(trimmed)) {
          return 'Only alphabetic letters and spaces are allowed';
        }
        return null;
      }
      case 'phone': {
        const digits = val.replace(/\D/g, '');
        if (!digits) return 'Mobile number is required';
        if (digits.length !== 10) return 'Mobile number must be exactly 10 digits';
        if (!/^[6-9]/.test(digits)) return 'Indian mobile number must start with 6, 7, 8, or 9';
        if (/^(\d)\1{9}$/.test(digits)) return 'Please enter a valid, non-repeating mobile number';
        return null;
      }
      case 'email': {
        const trimmed = val.trim().toLowerCase();
        if (!trimmed) return 'Email address is required';
        if (trimmed.startsWith('.') || trimmed.includes('.@') || trimmed.includes('..')) {
          return 'Please enter a valid Gmail address';
        }
        const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
        if (!emailRegex.test(trimmed)) {
          return 'Please enter a valid Gmail address';
        }
        const parts = trimmed.split('@');
        if (parts.length === 2 && (parts[1] === 'gmail.com' || parts[1] === 'googlemail.com')) {
          const gmailUsernameRegex = /^[a-zA-Z0-9]+(\.[a-zA-Z0-9]+)*$/;
          if (!gmailUsernameRegex.test(parts[0])) {
            return 'Please enter a valid Gmail address';
          }
        }
        return null;
      }
      case 'password': {
        if (!val) return 'Password is required';
        if (val.length < 6) return 'Password must be at least 6 characters';
        if (val.length > 128) return 'Password cannot exceed 128 characters';
        return null;
      }
      case 'street': {
        const trimmed = val.trim();
        if (!trimmed) return 'Street / Road name is required';
        if (trimmed.length < 3) return 'Street name must be at least 3 characters';
        return null;
      }
      case 'area': {
        const trimmed = val.trim();
        if (!trimmed) return 'Area / Landmark is required';
        if (trimmed.length < 2) return 'Area must be at least 2 characters';
        return null;
      }
      case 'pincode': {
        const digits = val.replace(/\D/g, '');
        if (!digits) return 'Pincode is required';
        if (digits.length !== 6) return 'Pincode must be exactly 6 digits';
        if (digits === '000000') return 'Please enter a valid pincode';
        return null;
      }
      default:
        return null;
    }
  };

  // Sanitized Input Change Handlers
  const handleRegNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow letters, spaces, dots, hyphens, and apostrophes
    const filtered = e.target.value.replace(/[^a-zA-Z\u00C0-\u024F\s.'-]/g, '').slice(0, 70);
    setRegName(filtered);
    if (touchedFields.name) {
      const err = validateField('name', filtered);
      setFormErrors((prev) => ({ ...prev, name: err || '' }));
    }
  };

  const handleRegPhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Strictly strip non-digits. User can never enter 'e', letters, or symbols!
    let digits = e.target.value.replace(/\D/g, '');
    if (digits.length === 12 && digits.startsWith('91')) {
      digits = digits.slice(2);
    }
    digits = digits.slice(0, 10);
    setRegPhone(digits);
    if (touchedFields.phone) {
      const err = validateField('phone', digits);
      setFormErrors((prev) => ({ ...prev, phone: err || '' }));
    }
  };

  const handleRegEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\s+/g, '');
    setRegEmail(val);
    if (touchedFields.email) {
      const err = validateField('email', val);
      setFormErrors((prev) => ({ ...prev, email: err || '' }));
    }
  };

  const handleRegPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setRegPassword(val);
    if (touchedFields.password) {
      const err = validateField('password', val);
      setFormErrors((prev) => ({ ...prev, password: err || '' }));
    }
  };

  const handleRegDoorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/<[^>]*>?/gm, '').slice(0, 50);
    setRegAddrDoor(val);
  };

  const handleRegStreetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/<[^>]*>?/gm, '').slice(0, 120);
    setRegAddrStreet(val);
    if (touchedFields.street) {
      const err = validateField('street', val);
      setFormErrors((prev) => ({ ...prev, street: err || '' }));
    }
  };

  const handleRegAreaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/<[^>]*>?/gm, '').slice(0, 100);
    setRegAddrArea(val);
    if (touchedFields.area) {
      const err = validateField('area', val);
      setFormErrors((prev) => ({ ...prev, area: err || '' }));
    }
  };

  const handleRegPincodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 6);
    setRegAddrPincode(digits);
    if (touchedFields.pincode) {
      const err = validateField('pincode', digits);
      setFormErrors((prev) => ({ ...prev, pincode: err || '' }));
    }
  };

  const handleFieldBlur = (field: string) => {
    setTouchedFields((prev) => ({ ...prev, [field]: true }));
    let val = '';
    if (field === 'name') val = regName;
    else if (field === 'phone') val = regPhone;
    else if (field === 'email') val = regEmail;
    else if (field === 'password') val = regPassword;
    else if (field === 'street') val = regAddrStreet;
    else if (field === 'area') val = regAddrArea;
    else if (field === 'pincode') val = regAddrPincode;

    const err = validateField(field, val);
    setFormErrors((prev) => ({ ...prev, [field]: err || '' }));
  };

  // Register / Sign-Up Submission
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Touch all required fields
    const allTouched = {
      name: true,
      phone: true,
      email: true,
      password: true,
      street: true,
      area: true,
      pincode: true
    };
    setTouchedFields(allTouched);

    const errors: Record<string, string> = {
      name: validateField('name', regName) || '',
      phone: validateField('phone', regPhone) || '',
      email: validateField('email', regEmail) || '',
      password: validateField('password', regPassword) || '',
      street: validateField('street', regAddrStreet) || '',
      area: validateField('area', regAddrArea) || '',
      pincode: validateField('pincode', regAddrPincode) || ''
    };
    setFormErrors(errors);

    const firstError = Object.values(errors).find(Boolean);
    if (firstError) {
      setErrorMessage(firstError);
      return;
    }

    setIsLoading(true);

    try {
      // Clean and sanitize data before sending to backend
      const cleanName = regName.trim().replace(/\s+/g, ' ');
      const cleanPhone = `+91 ${regPhone.trim()}`;
      const cleanEmail = regEmail.trim().toLowerCase();
      const addressPayload: Partial<Address> = {
        name: cleanName,
        phone: cleanPhone,
        doorNo: regAddrDoor.trim() || 'N/A',
        street: regAddrStreet.trim(),
        area: regAddrArea.trim(),
        city: regAddrCity.trim() || 'Coimbatore',
        pincode: regAddrPincode.trim(),
        type: regAddrType,
        coordinates: regAddrCoordinates.trim() || undefined,
        isDefault: true
      };

      await register({
        name: cleanName,
        phone: cleanPhone,
        email: cleanEmail,
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
    
    if (!cleanEmail) {
      setErrorMessage('Please enter your Gmail address');
      return;
    }

    if (cleanEmail.startsWith('.') || cleanEmail.includes('.@') || cleanEmail.includes('..')) {
      setErrorMessage('Please enter a valid Gmail address');
      return;
    }

    if (!cleanEmail.endsWith('@gmail.com') && !cleanEmail.endsWith('@googlemail.com')) {
      setErrorMessage('Please enter a valid Gmail address');
      return;
    }

    // Strict Gmail address validation (must be alphanumeric with non-consecutive dots)
    const gmailRegex = /^[a-zA-Z0-9]+(\.[a-zA-Z0-9]+)*@(gmail\.com|googlemail\.com)$/;
    if (!gmailRegex.test(cleanEmail)) {
      setErrorMessage('Please enter a valid Gmail address');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setResendSuccess(null);

    try {
      const res = await apiService.sendOtp(cleanEmail, 'LOGIN');
      const ttlSeconds = res.expiresInSeconds || 600;
      setSuccessMessage(res.message || `A 6-digit verification code has been dispatched to ${cleanEmail}`);
      setOtpCountdown(ttlSeconds);
      setResendCooldown(20);
      setOtpCode('');
      setOtpStep('VERIFY');

      // Persist active verification session in sessionStorage across browser reloads
      try {
        sessionStorage.setItem(
          LOGIN_OTP_STORAGE_KEY,
          JSON.stringify({
            email: cleanEmail,
            expiresAt: Date.now() + ttlSeconds * 1000,
            dispatchedAt: Date.now()
          })
        );
      } catch (err) {
        console.warn('Failed to store OTP session:', err);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to dispatch verification code');
    } finally {
      setIsLoading(false);
    }
  };

  // Dedicated Resend OTP Handler with real-time feedback and cooldown
  const handleResendOtp = async () => {
    if (isResending || resendCooldown > 0) return;
    const cleanEmail = otpEmail.trim().toLowerCase();
    if (!cleanEmail) {
      setErrorMessage('Please enter a valid Gmail address');
      return;
    }

    if (cleanEmail.startsWith('.') || cleanEmail.includes('.@') || cleanEmail.includes('..')) {
      setErrorMessage('Please enter a valid Gmail address');
      return;
    }

    if (!cleanEmail.endsWith('@gmail.com') && !cleanEmail.endsWith('@googlemail.com')) {
      setErrorMessage('Please enter a valid Gmail address');
      return;
    }

    const gmailRegex = /^[a-zA-Z0-9]+(\.[a-zA-Z0-9]+)*@(gmail\.com|googlemail\.com)$/;
    if (!gmailRegex.test(cleanEmail)) {
      setErrorMessage('Please enter a valid Gmail address');
      return;
    }

    setIsResending(true);
    setErrorMessage(null);
    setResendSuccess(null);

    try {
      const res = await apiService.sendOtp(cleanEmail, 'LOGIN');
      const ttlSeconds = res.expiresInSeconds || 600;
      setOtpCountdown(ttlSeconds);
      setResendCooldown(20); // 20s friendly cooldown
      setOtpCode('');
      setResendSuccess(res.message || `A fresh 6-digit verification code has been sent to ${cleanEmail}`);

      // Persist refreshed session in sessionStorage
      try {
        sessionStorage.setItem(
          LOGIN_OTP_STORAGE_KEY,
          JSON.stringify({
            email: cleanEmail,
            expiresAt: Date.now() + ttlSeconds * 1000,
            dispatchedAt: Date.now()
          })
        );
      } catch (err) {
        console.warn('Failed to refresh OTP session storage:', err);
      }

      // Auto clear resend success notification after 6s
      setTimeout(() => {
        setResendSuccess(null);
      }, 6000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to dispatch new verification code. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  // OTP Step 2: Verify Code and Sign In
  const handleVerifyOtpLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = otpEmail.trim().toLowerCase();
    const cleanOtp = otpCode.trim();

    if (cleanOtp.length < 6) {
      setErrorMessage('Please enter the full 6-digit verification code sent to your Gmail.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      await loginWithOtp(cleanEmail, cleanOtp);
      // Clean up session storage on successful login
      sessionStorage.removeItem(LOGIN_OTP_STORAGE_KEY);
    } catch (err: any) {
      setErrorMessage(err.message || 'Incorrect verification PIN. Please check your Gmail and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearAndRetryOtp = () => {
    setOtpCode('');
    setErrorMessage(null);
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
    <div className="min-h-screen bg-stone-50 text-stone-900 flex flex-col justify-center py-6 sm:py-10 px-4 sm:px-6 lg:px-8">
      {/* Top Left Navigation - Back to Sign In button (when registering) */}
      {mainMode === 'REGISTER' && (
        <div className="w-full sm:mx-auto sm:max-w-lg md:max-w-xl mb-3 flex items-center justify-start">
          <button
            type="button"
            onClick={() => {
              setMainMode('SIGN_IN');
              setErrorMessage(null);
              setSuccessMessage(null);
              setFormErrors({});
              setTouchedFields({});
            }}
            className="group inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-stone-100 text-stone-700 hover:text-stone-950 font-bold text-xs sm:text-sm border border-stone-200/90 shadow-xs hover:shadow-sm hover:border-stone-300 transition-all duration-150 cursor-pointer active:scale-95"
            title="Back to Sign In"
          >
            <ArrowLeft className="w-4 h-4 text-stone-500 group-hover:text-red-600 group-hover:-translate-x-1 transition-all" />
            <span>Back to Sign In</span>
          </button>
        </div>
      )}

      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-lg md:max-w-xl text-center">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-to-tr from-red-600 to-amber-500 shadow-lg shadow-red-500/25 mb-3.5 ring-4 ring-white">
          <Flame className="h-9 w-9 text-white" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-stone-900 font-serif">
          Hunter's Kitchen
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-stone-600 font-medium">
          Fresh Gourmet Cloud Kitchen &amp; Instant Delivery Platform
        </p>
      </div>

      {/* Main Authentication Card */}
      <div className={`mt-6 sm:mx-auto sm:w-full ${mainMode === 'REGISTER' ? 'sm:max-w-xl' : 'sm:max-w-lg'} transition-all duration-200`}>
        <div className="bg-white border border-stone-200/90 rounded-3xl p-6 sm:p-8 shadow-xl shadow-stone-200/60">
          
          {/* Error Message Banner */}
          {errorMessage && !(mainMode === 'SIGN_IN' && authMode === 'OTP' && otpStep === 'VERIFY') && (
            <div className="mb-5 flex items-center justify-between rounded-2xl bg-red-50 border border-red-200/90 px-4 py-3 text-xs sm:text-sm text-red-900 shadow-xs animate-shake">
              <div className="flex items-center space-x-2.5">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                <span className="font-semibold text-red-800">{errorMessage}</span>
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
              <div className="pb-4 mb-4 border-b border-stone-100">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200/60 mb-2">
                  <Sparkles className="w-3.5 h-3.5 text-red-600" />
                  <span>Customer Registration</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-stone-900 font-serif tracking-tight">
                  New Customer Sign Up
                </h2>
                <p className="text-xs sm:text-sm text-stone-500 mt-1">
                  Create your account with your delivery address to start ordering fresh gourmet dishes.
                </p>
              </div>

              {/* SECTION 1: ACCOUNT DETAILS */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 pb-1.5 border-b border-stone-100">
                  <div className="w-5 h-5 rounded-full bg-red-600 text-white font-extrabold text-[11px] flex items-center justify-center shrink-0">
                    1
                  </div>
                  <h3 className="text-xs sm:text-sm font-black text-stone-900 uppercase tracking-wider">
                    Account Details
                  </h3>
                </div>

                {/* Full Name */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    {touchedFields.name && !formErrors.name && regName.trim().length >= 2 && (
                      <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5">
                        <Check className="w-3 h-3" /> Valid
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                    <input
                      type="text"
                      required
                      value={regName}
                      onChange={handleRegNameChange}
                      onBlur={() => handleFieldBlur('name')}
                      placeholder="e.g. Sanjay M"
                      autoComplete="name"
                      maxLength={70}
                      className={`w-full rounded-xl pl-9 pr-9 py-2 text-xs sm:text-sm text-stone-900 placeholder:text-stone-400 focus:outline-hidden transition-all ${
                        touchedFields.name && formErrors.name
                          ? 'border-2 border-red-500 bg-red-50/20 focus:border-red-600 focus:ring-2 focus:ring-red-600/10'
                          : touchedFields.name && !formErrors.name && regName.trim().length >= 2
                          ? 'border-2 border-emerald-500/80 bg-emerald-50/10 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/10'
                          : 'bg-stone-50 border border-stone-300 focus:bg-white focus:border-red-600 focus:ring-2 focus:ring-red-600/10'
                      }`}
                    />
                    {touchedFields.name && !formErrors.name && regName.trim().length >= 2 && (
                      <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-600" />
                    )}
                  </div>
                  {touchedFields.name && formErrors.name && (
                    <p className="mt-1 text-[11px] text-red-600 font-medium flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{formErrors.name}</span>
                    </p>
                  )}
                </div>

                {/* Phone & Email Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider">
                        Phone Number <span className="text-red-500">*</span>
                      </label>
                      <span className="text-[10px] text-stone-400 font-semibold">10-digit mobile</span>
                    </div>
                    <div className="relative flex items-center">
                      <div className="absolute left-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1 text-stone-400 pointer-events-none">
                        <Phone className="h-3.5 w-3.5" />
                        <span className="text-xs font-black text-stone-600 pl-0.5 border-r border-stone-300 pr-1.5">+91</span>
                      </div>
                      <input
                        type="tel"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={10}
                        required
                        value={regPhone}
                        onChange={handleRegPhoneChange}
                        onBlur={() => handleFieldBlur('phone')}
                        placeholder="98765 43210"
                        autoComplete="tel"
                        className={`w-full rounded-xl pl-16 pr-8 py-2 text-xs sm:text-sm text-stone-900 placeholder:text-stone-400 focus:outline-hidden transition-all ${
                          touchedFields.phone && formErrors.phone
                            ? 'border-2 border-red-500 bg-red-50/20 focus:border-red-600 focus:ring-2 focus:ring-red-600/10'
                            : touchedFields.phone && !formErrors.phone && regPhone.length === 10
                            ? 'border-2 border-emerald-500/80 bg-emerald-50/10 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/10'
                            : 'bg-stone-50 border border-stone-300 focus:bg-white focus:border-red-600 focus:ring-2 focus:ring-red-600/10'
                        }`}
                      />
                      {touchedFields.phone && !formErrors.phone && regPhone.length === 10 && (
                        <Check className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-600" />
                      )}
                    </div>
                    {touchedFields.phone && formErrors.phone && (
                      <p className="mt-1 text-[11px] text-red-600 font-medium flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{formErrors.phone}</span>
                      </p>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider">
                        Email Address <span className="text-red-500">*</span>
                      </label>
                      {touchedFields.email && !formErrors.email && regEmail.includes('@') && (
                        <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5">
                          <Check className="w-3 h-3" /> Valid
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                      <input
                        type="email"
                        required
                        value={regEmail}
                        onChange={handleRegEmailChange}
                        onBlur={() => handleFieldBlur('email')}
                        placeholder="name@gmail.com"
                        autoComplete="email"
                        className={`w-full rounded-xl pl-9 pr-9 py-2 text-xs sm:text-sm text-stone-900 placeholder:text-stone-400 focus:outline-hidden transition-all ${
                          touchedFields.email && formErrors.email
                            ? 'border-2 border-red-500 bg-red-50/20 focus:border-red-600 focus:ring-2 focus:ring-red-600/10'
                            : touchedFields.email && !formErrors.email && regEmail.includes('@')
                            ? 'border-2 border-emerald-500/80 bg-emerald-50/10 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/10'
                            : 'bg-stone-50 border border-stone-300 focus:bg-white focus:border-red-600 focus:ring-2 focus:ring-red-600/10'
                        }`}
                      />
                      {touchedFields.email && !formErrors.email && regEmail.includes('@') && (
                        <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-600" />
                      )}
                    </div>
                    {touchedFields.email && formErrors.email && (
                      <p className="mt-1 text-[11px] text-red-600 font-medium flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{formErrors.email}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Password */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider">
                      Password <span className="text-red-500">*</span>{' '}
                      <span className="text-[10px] text-stone-400 font-normal lowercase">(min. 6 characters)</span>
                    </label>
                    {regPassword.length >= 6 && (
                      <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5">
                        <Check className="w-3 h-3" /> Secure
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      maxLength={128}
                      value={regPassword}
                      onChange={handleRegPasswordChange}
                      onBlur={() => handleFieldBlur('password')}
                      placeholder="Min. 6 characters password"
                      autoComplete="new-password"
                      className={`w-full rounded-xl pl-9 pr-16 py-2 text-xs sm:text-sm text-stone-900 placeholder:text-stone-400 focus:outline-hidden transition-all [&::-ms-reveal]:hidden [&::-ms-clear]:hidden ${
                        touchedFields.password && formErrors.password
                          ? 'border-2 border-red-500 bg-red-50/20 focus:border-red-600 focus:ring-2 focus:ring-red-600/10'
                          : touchedFields.password && !formErrors.password && regPassword.length >= 6
                          ? 'border-2 border-emerald-500/80 bg-emerald-50/10 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/10'
                          : 'bg-stone-50 border border-stone-300 focus:bg-white focus:border-red-600 focus:ring-2 focus:ring-red-600/10'
                      }`}
                    />
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      {touchedFields.password && !formErrors.password && regPassword.length >= 6 && (
                        <Check className="h-4 w-4 text-emerald-600 mr-1" />
                      )}
                      <button
                        type="button"
                        onClick={() => setShowRegPassword(!showRegPassword)}
                        className="text-stone-400 hover:text-stone-600 p-1 cursor-pointer transition-colors"
                        title={showRegPassword ? "Hide password" : "Show password"}
                      >
                        {showRegPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  {touchedFields.password && formErrors.password && (
                    <p className="mt-1 text-[11px] text-red-600 font-medium flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{formErrors.password}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* SECTION 2: DELIVERY ADDRESS */}
              <div className="pt-3 mt-3 border-t border-stone-100 space-y-3">
                <div className="flex items-center justify-between pb-1.5 border-b border-stone-100">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-red-600 text-white font-extrabold text-[11px] flex items-center justify-center shrink-0">
                      2
                    </div>
                    <h3 className="text-xs sm:text-sm font-black text-stone-900 uppercase tracking-wider">
                      Delivery Address
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={handleDetectRegisterLocation}
                    disabled={isLocatingReg}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs border border-red-200/80 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                  >
                    {isLocatingReg ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-red-600" />
                    ) : (
                      <Crosshair className="w-3.5 h-3.5 text-red-600" />
                    )}
                    <span>{isLocatingReg ? 'Locating...' : 'Use GPS'}</span>
                  </button>
                </div>

                {/* Address Type Selector */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1 uppercase tracking-wider">
                    Address Type
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {[
                      { id: 'HOME', label: 'Home', icon: Home },
                      { id: 'WORK', label: 'Work', icon: Briefcase },
                      { id: 'OTHER', label: 'Other', icon: MapPin }
                    ].map((item) => {
                      const IconComponent = item.icon;
                      const isSelected = regAddrType === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setRegAddrType(item.id as any)}
                          className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-red-600 text-white shadow-xs'
                              : 'bg-stone-50 border border-stone-200/90 text-stone-600 hover:bg-stone-100 hover:text-stone-900'
                          }`}
                        >
                          <IconComponent className="w-3.5 h-3.5" />
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Row 1: Flat/Door No (5 cols) & Street / Road (7 cols) */}
                <div className="grid grid-cols-12 gap-2.5">
                  <div className="col-span-5">
                    <label className="block text-xs font-bold text-stone-700 mb-1 uppercase tracking-wider truncate" title="Flat / Door No">
                      Flat / Door No
                    </label>
                    <input
                      type="text"
                      maxLength={50}
                      value={regAddrDoor}
                      onChange={handleRegDoorChange}
                      placeholder="#42-B, Flat 3"
                      className="w-full rounded-xl bg-stone-50 border border-stone-300 px-3 py-2 text-xs sm:text-sm text-stone-900 placeholder:text-stone-400 focus:bg-white focus:border-red-600 focus:ring-2 focus:ring-red-600/10 focus:outline-hidden transition-all"
                    />
                  </div>

                  <div className="col-span-7">
                    <label className="block text-xs font-bold text-stone-700 mb-1 uppercase tracking-wider truncate" title="Street / Road">
                      Street / Road <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={120}
                      value={regAddrStreet}
                      onChange={handleRegStreetChange}
                      onBlur={() => handleFieldBlur('street')}
                      placeholder="e.g. Richmond Road"
                      className={`w-full rounded-xl px-3 py-2 text-xs sm:text-sm text-stone-900 placeholder:text-stone-400 focus:outline-hidden transition-all ${
                        touchedFields.street && formErrors.street
                          ? 'border-2 border-red-500 bg-red-50/20 focus:border-red-600 focus:ring-2 focus:ring-red-600/10'
                          : touchedFields.street && !formErrors.street && regAddrStreet.trim().length >= 3
                          ? 'border-2 border-emerald-500/80 bg-emerald-50/10 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/10'
                          : 'bg-stone-50 border border-stone-300 focus:bg-white focus:border-red-600 focus:ring-2 focus:ring-red-600/10'
                      }`}
                    />
                    {touchedFields.street && formErrors.street && (
                      <p className="mt-1 text-[11px] text-red-600 font-medium flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{formErrors.street}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Row 2: Area / Landmark (7 cols) & Pincode (5 cols) */}
                <div className="grid grid-cols-12 gap-2.5">
                  <div className="col-span-7">
                    <label className="block text-xs font-bold text-stone-700 mb-1 uppercase tracking-wider truncate" title="Area / Landmark">
                      Area / Landmark <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={100}
                      value={regAddrArea}
                      onChange={handleRegAreaChange}
                      onBlur={() => handleFieldBlur('area')}
                      placeholder="e.g. Peelamedu"
                      className={`w-full rounded-xl px-3 py-2 text-xs sm:text-sm text-stone-900 placeholder:text-stone-400 focus:outline-hidden transition-all ${
                        touchedFields.area && formErrors.area
                          ? 'border-2 border-red-500 bg-red-50/20 focus:border-red-600 focus:ring-2 focus:ring-red-600/10'
                          : touchedFields.area && !formErrors.area && regAddrArea.trim().length >= 2
                          ? 'border-2 border-emerald-500/80 bg-emerald-50/10 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/10'
                          : 'bg-stone-50 border border-stone-300 focus:bg-white focus:border-red-600 focus:ring-2 focus:ring-red-600/10'
                      }`}
                    />
                    {touchedFields.area && formErrors.area && (
                      <p className="mt-1 text-[11px] text-red-600 font-medium flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{formErrors.area}</span>
                      </p>
                    )}
                  </div>

                  <div className="col-span-5">
                    <label className="block text-xs font-bold text-stone-700 mb-1 uppercase tracking-wider truncate" title="Pincode">
                      Pincode <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      required
                      value={regAddrPincode}
                      onChange={handleRegPincodeChange}
                      onBlur={() => handleFieldBlur('pincode')}
                      placeholder="641018"
                      maxLength={6}
                      className={`w-full rounded-xl px-3 py-2 text-xs sm:text-sm text-stone-900 placeholder:text-stone-400 focus:outline-hidden transition-all ${
                        touchedFields.pincode && formErrors.pincode
                          ? 'border-2 border-red-500 bg-red-50/20 focus:border-red-600 focus:ring-2 focus:ring-red-600/10'
                          : touchedFields.pincode && !formErrors.pincode && regAddrPincode.length === 6
                          ? 'border-2 border-emerald-500/80 bg-emerald-50/10 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/10'
                          : 'bg-stone-50 border border-stone-300 focus:bg-white focus:border-red-600 focus:ring-2 focus:ring-red-600/10'
                      }`}
                    />
                    {touchedFields.pincode && formErrors.pincode && (
                      <p className="mt-1 text-[11px] text-red-600 font-medium flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{formErrors.pincode}</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Submit Registration CTA */}
              <div className="pt-3 space-y-2.5">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 px-5 rounded-2xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-extrabold text-sm sm:text-base shadow-lg shadow-red-700/20 flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer"
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
                        setFormErrors({});
                        setTouchedFields({});
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
              {/* Segmented Sub-tab: Password vs Gmail OTP (Hidden once user enters OTP verification code entry) */}
              {!(authMode === 'OTP' && otpStep === 'VERIFY') && (
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
              )}

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
                        className={`w-full rounded-xl pl-10 pr-4 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-hidden transition-all ${
                          errorMessage
                            ? 'bg-red-50/20 border border-red-400 focus:bg-white focus:border-red-600 focus:ring-2 focus:ring-red-600/20'
                            : 'bg-stone-50 border border-stone-300 focus:bg-white focus:border-red-600 focus:ring-2 focus:ring-red-600/10'
                        }`}
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
                        className={`w-full rounded-xl pl-10 pr-11 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-hidden transition-all [&::-ms-reveal]:hidden [&::-ms-clear]:hidden ${
                          errorMessage
                            ? 'bg-red-50/20 border border-red-400 focus:bg-white focus:border-red-600 focus:ring-2 focus:ring-red-600/20'
                            : 'bg-stone-50 border border-stone-300 focus:bg-white focus:border-red-600 focus:ring-2 focus:ring-red-600/10'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-1 cursor-pointer"
                        title={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
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
                          setFormErrors({});
                          setTouchedFields({});
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
                          <Mail className={`absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors ${
                            errorMessage ? 'text-red-500' : 'text-stone-400'
                          }`} />
                          <input
                            type="email"
                            required
                            value={otpEmail}
                            onChange={(e) => {
                              setOtpEmail(e.target.value);
                              if (errorMessage) setErrorMessage(null);
                            }}
                            placeholder="yourname@gmail.com"
                            className={`w-full rounded-xl bg-stone-50 border pl-10 pr-4 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:bg-white focus:outline-hidden transition-all ${
                              errorMessage
                                ? 'border-red-500 bg-red-50/30 focus:border-red-600 focus:ring-2 focus:ring-red-600/20'
                                : 'border-stone-300 focus:border-red-600 focus:ring-2 focus:ring-red-600/10'
                            }`}
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
                              setFormErrors({});
                              setTouchedFields({});
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
                      {/* Email Info Bar */}
                      <div className="flex items-center justify-between bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2">
                        <div className="flex items-center space-x-2 truncate">
                          <Mail className="h-4 w-4 text-stone-400 shrink-0" />
                          <span className="text-xs text-stone-600 font-medium truncate">
                            Code sent to: <strong className="text-stone-900 font-semibold">{otpEmail}</strong>
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            try {
                              sessionStorage.removeItem(LOGIN_OTP_STORAGE_KEY);
                            } catch (e) {}
                            setOtpStep('REQUEST');
                            setOtpCode('');
                            setErrorMessage(null);
                            setSuccessMessage(null);
                            setResendSuccess(null);
                          }}
                          className="text-xs text-red-600 hover:text-red-700 font-bold shrink-0 ml-2 cursor-pointer inline-flex items-center gap-1 hover:underline"
                        >
                          <ArrowLeft className="h-3 w-3" /> Change
                        </button>
                      </div>

                      {/* Real-Time Resend Success Confirmation */}
                      {resendSuccess && (
                        <div className="rounded-2xl bg-emerald-50 border border-emerald-200/90 p-3.5 text-xs text-emerald-800 shadow-xs flex items-center justify-between gap-2 animate-in fade-in">
                          <div className="flex items-center space-x-2.5">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                            <span className="font-semibold">{resendSuccess}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setResendSuccess(null)}
                            className="text-emerald-500 hover:text-emerald-800 p-0.5 cursor-pointer"
                            title="Dismiss"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}

                      {/* Clean Professional Error Alert */}
                      {errorMessage && (
                        <div className="flex items-center justify-between rounded-xl bg-red-50 border border-red-200/90 px-3.5 py-2.5 text-xs text-red-800 shadow-2xs animate-shake">
                          <div className="flex items-center space-x-2 min-w-0">
                            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                            <span className="font-semibold">{errorMessage}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setErrorMessage(null)}
                            className="text-red-400 hover:text-red-700 p-0.5 cursor-pointer transition-colors shrink-0 ml-2"
                            title="Dismiss"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}

                      {/* OTP Inputs Card */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider">
                            6-Digit Verification Code
                          </label>
                          <div className="flex items-center text-xs font-mono text-stone-700 gap-1.5 bg-amber-50 border border-amber-200/80 px-2.5 py-1 rounded-lg">
                            <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span className="font-semibold">{formatCountdown(otpCountdown)}</span>
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
                            disabled={isLoading || isResending}
                            hasError={Boolean(errorMessage)}
                            autoFocus={true}
                          />
                        </div>

                        <div className="flex items-center justify-between mt-2 text-xs text-stone-500">
                          <span>Enter the 6-digit code sent to your Gmail</span>
                          {otpCode.length > 0 && (
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

                      {/* Resend & Help Options */}
                      <div className="flex items-center justify-between text-xs pt-1 border-t border-stone-100">
                        <span className="text-stone-500 text-[11px]">Didn't receive the code?</span>
                        <button
                          type="button"
                          disabled={isResending || resendCooldown > 0}
                          onClick={handleResendOtp}
                          className="text-xs text-red-700 hover:text-red-800 font-bold disabled:text-stone-400 disabled:cursor-not-allowed cursor-pointer transition-colors inline-flex items-center gap-1.5"
                        >
                          {isResending ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-red-600" />
                              <span>Sending fresh code...</span>
                            </>
                          ) : resendCooldown > 0 ? (
                            <span>Resend in {resendCooldown}s</span>
                          ) : (
                            <>
                              <Send className="w-3.5 h-3.5" />
                              <span>Resend Code</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Submit Verification Button */}
                      <button
                        type="submit"
                        disabled={isLoading || isResending || otpCode.length < 6}
                        className="w-full inline-flex items-center justify-center space-x-2 rounded-2xl bg-red-700 hover:bg-red-800 px-5 py-3 text-sm sm:text-base font-extrabold text-white shadow-md shadow-red-700/20 transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="h-5 w-5 animate-spin" />
                            <span>Verifying code...</span>
                          </>
                        ) : (
                          <span>Verify &amp; Sign In</span>
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
                              setFormErrors({});
                              setTouchedFields({});
                            }}
                            className="font-bold text-red-700 hover:text-red-800 underline underline-offset-2 cursor-pointer transition-colors"
                          >
                            Register as New Customer
                          </button>
                        </p>
                      </div>

                      {/* Switch back to Password Sign In */}
                      <div className="pt-1 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setAuthMode('PASSWORD');
                            setOtpStep('REQUEST');
                            setOtpCode('');
                            setErrorMessage(null);
                            setSuccessMessage(null);
                          }}
                          className="text-xs text-stone-500 hover:text-stone-800 font-medium cursor-pointer inline-flex items-center gap-1.5 transition-colors"
                        >
                          <Lock className="h-3 w-3 text-stone-400" />
                          <span>Use Password Sign In instead</span>
                        </button>
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
        initialEmail={email || otpEmail}
        onClose={() => setIsForgotModalOpen(false)}
        onSuccess={() => {
          setIsForgotModalOpen(false);
          setPassword('');
        }}
      />
    </div>
  );
};
