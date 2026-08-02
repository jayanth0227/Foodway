import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { User, Role, AuthState } from '../types/auth.types';
import { saveSession, clearSession, getToken, getCurrentUser } from '../utils/auth.utils';
import authService from '../services/auth.service';

interface AuthContextType extends AuthState {
  login: (email: string, password?: string) => Promise<{ success: boolean; role?: Role; error?: string }>;
  logout: () => void;
  register: (name: string, email: string, password?: string, phone?: string) => Promise<{ success: boolean; error?: string }>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize auth from SessionStorage and validate with backend on app load
  useEffect(() => {
    const initializeAuth = async () => {
      setIsLoading(true);
      const existingToken = getToken();
      const storedUser = getCurrentUser();

      if (existingToken && storedUser) {
        setToken(existingToken);
        setUser(storedUser);
        setRole(storedUser.role);

        // Validate token with backend /api/auth/me
        try {
          const res = await authService.getCurrentUser();
          if (res.success && res.user) {
            setUser(res.user);
            setRole(res.user.role);
            saveSession(existingToken, res.user);
          } else {
            handleLogout();
          }
        } catch (error) {
          console.warn('Session verification failed on backend:', error);
          // If backend validation fails (e.g. 401), handleLogout
          handleLogout();
        }
      } else {
        clearSession();
      }
      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  const handleLogin = async (email: string, password?: string) => {
    try {
      setIsLoading(true);
      const res = await authService.login({ email, password });

      if (res.success && res.token && res.user) {
        saveSession(res.token, res.user, res.expiresIn);
        setToken(res.token);
        setUser(res.user);
        setRole(res.user.role);
        setIsLoading(false);
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

  const handleLogout = () => {
    clearSession();
    setUser(null);
    setRole(null);
    setToken(null);
  };

  const handleRegister = async (name: string, email: string, password?: string, phone?: string) => {
    try {
      setIsLoading(true);
      const res = await authService.register({ name, email, password, phone });
      if (res.success && res.token && res.user) {
        saveSession(res.token, res.user, res.expiresIn);
        setToken(res.token);
        setUser(res.user);
        setRole(res.user.role);
        setIsLoading(false);
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
    const existingToken = getToken();
    if (!existingToken) {
      handleLogout();
      return;
    }
    try {
      const res = await authService.getCurrentUser();
      if (res.success && res.user) {
        setUser(res.user);
        setRole(res.user.role);
      }
    } catch (e) {
      handleLogout();
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
        restaurantId: user?.restaurantId || null,
        userId: user?.id || null,
        login: handleLogin,
        logout: handleLogout,
        register: handleRegister,
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
