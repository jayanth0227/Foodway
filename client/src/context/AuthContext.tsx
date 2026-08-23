import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { User, Role, AuthState } from '../types/auth.types';
import { saveSession, clearSession, cleanupObsoleteStorage, setCurrentUser, setToken as setInMemoryToken, getToken, getCurrentUser } from '../utils/auth.utils';
import authService from '../services/auth.service';
import notificationService from '../services/notification.service';

interface AuthContextType extends AuthState {
  login: (email: string, password?: string) => Promise<{ success: boolean; role?: Role; error?: string }>;
  logout: () => void;
  register: (name: string, email: string, password?: string, phone?: string) => Promise<{ success: boolean; error?: string }>;
  updateProfile: (data: { name?: string; email?: string; phone?: string; profileImage?: string; addresses?: any[] }) => Promise<{ success: boolean; user?: User; error?: string }>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize auth & restore session securely from backend HttpOnly cookie on app startup
  useEffect(() => {
    const initializeAuth = async () => {
      setIsLoading(true);

      // Purge obsolete sensitive credentials from localStorage/sessionStorage
      cleanupObsoleteStorage();

      // Guard: If user explicitly logged out, DO NOT restore old session automatically
      const isLoggedOut = typeof window !== 'undefined' && localStorage.getItem('foodway_explicit_logout') === 'true';
      if (isLoggedOut) {
        setUser(null);
        setRole(null);
        setToken(null);
        setIsLoading(false);
        return;
      }

      // Immediately restore stored session from persistent storage
      const storedToken = getToken();
      const storedUser = getCurrentUser();

      if (storedUser) {
        setUser(storedUser);
        setRole(storedUser.role);
        setToken(storedToken || 'active_session');
      }

      try {
        const res = await authService.getCurrentUser();
        if (res && res.success && res.user && localStorage.getItem('foodway_explicit_logout') !== 'true') {
          const activeToken = res.token || storedToken || 'active_session';
          saveSession(activeToken, res.user);
          setUser(res.user);
          setRole(res.user.role);
          setToken(activeToken);

          // Asynchronously sync FCM push notification token post-restoration
          notificationService.syncFcmTokenAfterLogin();
        } else {
          clearSession();
          setUser(null);
          setRole(null);
          setToken(null);
        }
      } catch (error) {
        clearSession();
        setUser(null);
        setRole(null);
        setToken(null);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const handleLogin = async (email: string, password?: string) => {
    try {
      setIsLoading(true);
      const res = await authService.login({ email, password });

      if (res.success && res.user) {
        const activeToken = res.token || 'active_session';
        saveSession(activeToken, res.user, res.expiresIn);
        setToken(activeToken);
        setUser(res.user);
        setRole(res.user.role);
        setIsLoading(false);

        // Sync FCM token with backend post-login asynchronously
        notificationService.syncFcmTokenAfterLogin();
        return { success: true, role: res.user.role };
      } else {
        setIsLoading(false);
        return { success: false, error: res.error || res.message || 'Login failed.' };
      }
    } catch (error: any) {
      setIsLoading(false);
      const errorMsg = error.response?.data?.error || error.response?.data?.message || 'Invalid login credentials.';
      return { success: false, error: errorMsg };
    }
  };

  const handleLogout = async () => {
    clearSession();
    setUser(null);
    setRole(null);
    setToken(null);
    try {
      await authService.logout();
    } catch (e) {}
    if (typeof window !== 'undefined') {
      localStorage.setItem('foodway_explicit_logout', 'true');
      window.location.href = '/login';
    }
  };

  const handleRegister = async (name: string, email: string, password?: string, phone?: string) => {
    try {
      setIsLoading(true);
      const res = await authService.register({ name, email, password, phone });
      if (res.success && res.user) {
        const activeToken = res.token || 'active_session';
        saveSession(activeToken, res.user, res.expiresIn);
        setToken(activeToken);
        setUser(res.user);
        setRole(res.user.role);
        setIsLoading(false);

        // Sync FCM token with backend post-registration asynchronously
        notificationService.syncFcmTokenAfterLogin();
        return { success: true };
      } else {
        setIsLoading(false);
        return { success: false, error: res.error || res.message || 'Registration failed.' };
      }
    } catch (error: any) {
      setIsLoading(false);
      const errorMsg = error.response?.data?.error || error.response?.data?.message || 'Failed to register account.';
      return { success: false, error: errorMsg };
    }
  };

  const refreshAuth = async () => {
    try {
      const res = await authService.getCurrentUser();
      if (res && res.success && res.user) {
        const activeToken = res.token || token || 'active_session';
        saveSession(activeToken, res.user);
        setUser(res.user);
        setRole(res.user.role);
        setToken(activeToken);
      }
    } catch (e) {
      // Preserve existing authenticated session on network or API error
    }
  };

  const handleUpdateProfile = async (data: { name?: string; email?: string; phone?: string; profileImage?: string; addresses?: any[] }) => {
    try {
      const res = await authService.updateProfile(data);
      if (res.success && res.user) {
        const activeToken = res.token || token || 'active_session';
        saveSession(activeToken, res.user);
        setUser(res.user);
        setRole(res.user.role);
        if (res.token) {
          setToken(res.token);
        }
        return { success: true, user: res.user };
      }
      return { success: false, error: res.error || 'Failed to update profile' };
    } catch (err: any) {
      return {
        success: false,
        error: err.response?.data?.error || err.message || 'Error updating profile'
      };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        token,
        isAuthenticated: !!user && !!token,
        isLoading,
        shopId: user?.shopId || user?.restaurantId || null,
        restaurantId: user?.shopId || user?.restaurantId || null,
        userId: user?.id || null,
        login: handleLogin,
        logout: handleLogout,
        register: handleRegister,
        updateProfile: handleUpdateProfile,
        refreshAuth
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};

export const useAuth = useAuthContext;
