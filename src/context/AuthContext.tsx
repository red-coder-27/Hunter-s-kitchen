import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { User, UserRole, Permission, RestaurantSettings } from '../types';
import { apiService } from '../services/api';

interface AuthContextType {
  currentUser: User | null;
  currentRole: UserRole | null;
  isAuthenticated: boolean;
  settings: RestaurantSettings | null;
  isLoading: boolean;
  loginSuccessUser: User | null;
  setLoginSuccessUser: (user: User | null) => void;
  register: (payload: {
    name: string;
    phone: string;
    email: string;
    password: string;
    address?: Partial<import('../types').Address>;
  }) => Promise<User>;
  login: (email: string, password: string) => Promise<User>;
  loginWithOtp: (email: string, otp: string) => Promise<User>;
  logout: () => Promise<void>;
  checkSession: () => Promise<User | null>;
  forgotPassword: (email: string) => Promise<{ message: string; resetToken?: string }>;
  resetPassword: (token: string, newPassword: string) => Promise<{ message: string }>;
  acceptInvite: (inviteToken: string, password: string) => Promise<{ user: User; message: string }>;
  hasPermission: (permission: Permission) => boolean;
  hasRole: (...roles: UserRole[]) => boolean;
  refreshSettings: () => Promise<void>;
  updateUserStatus: (status: User['status']) => Promise<void>;
  updateUserProfile: (data: { name: string; phone: string; email: string; password?: string; otp?: string }) => Promise<User>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loginSuccessUser, setLoginSuccessUser] = useState<User | null>(null);
  const [settings, setSettings] = useState<RestaurantSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check current session from backend (/api/auth/me)
  const checkSession = useCallback(async (): Promise<User | null> => {
    try {
      const user = await apiService.getCurrentUser();
      setCurrentUser(user);
      return user;
    } catch (err) {
      setCurrentUser(null);
      return null;
    }
  }, []);

  // Load initial settings and verify authenticated session
  useEffect(() => {
    async function init() {
      let retries = 3;
      let delay = 1000;
      let settingsData: RestaurantSettings | null = null;

      while (retries > 0) {
        try {
          settingsData = await apiService.getSettings();
          break;
        } catch (err) {
          console.warn(`Settings fetch failed, retrying in ${delay}ms...`, err);
          retries--;
          if (retries === 0) {
            settingsData = {
              restaurantName: "Hunter's Kitchen",
              phone: "+91 98765 00000",
              email: "contact@hunterskitchen.com",
              address: "42 Richmond Road, Shanthi Nagar, Bengaluru",
              isOpen: true,
              temporaryPause: false,
              openingTime: "11:00 AM",
              closingTime: "11:00 PM",
              deliveryRadiusKm: 10,
              baseDeliveryFee: 35,
              freeDeliveryThreshold: 500,
              codEnabled: true,
              onlinePaymentEnabled: true,
              announcement: ""
            };
            break;
          }
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay = Math.min(delay * 1.5, 3000);
        }
      }

      setSettings(settingsData);

      // Verify server session
      try {
        await checkSession();
      } catch (e) {
        // Unauthenticated is a valid state on launch
      } finally {
        setIsLoading(false);
      }
    }

    init();

    // Listen for global 401 unauthorized events to immediately reset state
    const handleUnauthorized = () => {
      setCurrentUser(null);
    };
    window.addEventListener('hk:unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('hk:unauthorized', handleUnauthorized);
    };
  }, [checkSession]);

  const register = async (payload: {
    name: string;
    phone: string;
    email: string;
    password: string;
    address?: Partial<import('../types').Address>;
  }): Promise<User> => {
    setIsLoading(true);
    try {
      const res = await apiService.register(payload);
      if (!res?.user) {
        throw new Error('Registration failed. No user returned.');
      }
      setLoginSuccessUser(res.user);
      setCurrentUser(res.user);
      return res.user;
    } catch (err) {
      setLoginSuccessUser(null);
      setCurrentUser(null);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<User> => {
    setIsLoading(true);
    try {
      const res = await apiService.login(email, password);
      if (!res?.user) {
        throw new Error('Invalid credentials or session could not be established.');
      }
      setLoginSuccessUser(res.user);
      setCurrentUser(res.user);
      return res.user;
    } catch (err) {
      setLoginSuccessUser(null);
      setCurrentUser(null);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithOtp = async (email: string, otp: string): Promise<User> => {
    setIsLoading(true);
    try {
      const res = await apiService.loginWithOtp(email, otp);
      if (!res?.user) {
        throw new Error('Verification failed. No user returned.');
      }
      setLoginSuccessUser(res.user);
      setCurrentUser(res.user);
      return res.user;
    } catch (err) {
      setLoginSuccessUser(null);
      setCurrentUser(null);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    setIsLoading(true);
    try {
      await apiService.logout();
    } catch (err) {
      console.warn('Logout API error, clearing local state:', err);
    } finally {
      setLoginSuccessUser(null);
      setCurrentUser(null);
      setIsLoading(false);
    }
  };

  const forgotPassword = async (email: string) => {
    return apiService.forgotPassword(email);
  };

  const resetPassword = async (token: string, newPassword: string) => {
    return apiService.resetPassword(token, newPassword);
  };

  const acceptInvite = async (inviteToken: string, password: string) => {
    return apiService.acceptInvite(inviteToken, password);
  };

  const hasRole = (...roles: UserRole[]): boolean => {
    if (!currentUser) return false;
    const userRole = currentUser.role;
    const effectiveRoles = (userRole === 'OWNER' || userRole === 'ADMIN') ? ['OWNER', 'ADMIN'] : [userRole];
    return roles.some((r) => effectiveRoles.includes(r));
  };

  const hasPermission = (permission: Permission): boolean => {
    if (!currentUser) return false;
    if (currentUser.role === 'OWNER' || currentUser.role === 'ADMIN') return true;
    return currentUser.permissions?.includes(permission) || false;
  };

  const refreshSettings = async () => {
    try {
      const data = await apiService.getSettings();
      setSettings(data);
    } catch (err) {
      console.error('Error refreshing settings:', err);
    }
  };

  const updateUserStatus = async (status: User['status']) => {
    if (currentUser) {
      setCurrentUser({ ...currentUser, status });
      await apiService.updateDeliveryPartnerStatus(currentUser.id, status);
    }
  };

  const updateUserProfile = async (data: { name: string; phone: string; email: string; password?: string; otp?: string }) => {
    if (!currentUser) throw new Error('No current user authenticated');
    const res = await apiService.updateUserProfile(currentUser.id, data);
    const updated = (res as any).data || res.user || (res as any);
    setCurrentUser(updated);
    return updated;
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        currentRole: currentUser?.role || null,
        isAuthenticated: !!currentUser,
        settings,
        isLoading,
        loginSuccessUser,
        setLoginSuccessUser,
        register,
        login,
        loginWithOtp,
        logout,
        checkSession,
        forgotPassword,
        resetPassword,
        acceptInvite,
        hasPermission,
        hasRole,
        refreshSettings,
        updateUserStatus,
        updateUserProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
