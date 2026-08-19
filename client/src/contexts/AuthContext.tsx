import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../api/auth';
import type { User, LoginInput, RegisterInput } from '../types';

interface AuthContextType {
  user: User | null;
  /** True while a session probe is in flight for a visitor who looks logged in. */
  isLoading: boolean;
  /** True once the session probe has finished, whether or not it found a user. */
  isSessionResolved: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isEmployee: boolean;
  isCustomer: boolean;
  login: (data: LoginInput) => Promise<User | undefined>;
  register: (data: RegisterInput) => Promise<User | undefined>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * A stored access token means this browser has signed in before, so the
 * session probe is worth waiting for. Without one the visitor is almost
 * certainly a guest, and blocking the first paint on a round trip to a
 * cold-started API just to confirm that costs seconds for nothing.
 */
function hasStoredSession(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return Boolean(localStorage.getItem('accessToken') || localStorage.getItem('refreshToken'));
  } catch {
    return false;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isSessionResolved, setIsSessionResolved] = useState(false);
  const [isProbing, setIsProbing] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const response = await authApi.getMe();
      if (response.success && response.data) {
        setUser(response.data);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    // Guests are released immediately; the probe below still runs so a
    // cookie-only session (token cleared from storage, cookie still valid) is
    // picked up as soon as the API answers.
    const likelyAuthenticated = hasStoredSession();
    if (!likelyAuthenticated) {
      setIsProbing(false);
      setIsSessionResolved(true);
    }

    const initAuth = async () => {
      try {
        await refreshUser();
      } catch {
        // Not authenticated
      } finally {
        if (!cancelled) {
          setIsProbing(false);
          setIsSessionResolved(true);
        }
      }
    };

    void initAuth();

    return () => {
      cancelled = true;
    };
  }, [refreshUser]);

  const login = async (data: LoginInput) => {
    const response = await authApi.login(data);
    if (response.success && response.data) {
      setUser(response.data.user);
      return response.data.user;
    }
  };

  const register = async (data: RegisterInput) => {
    const response = await authApi.register(data);
    if (response.success && response.data) {
      setUser(response.data.user);
      return response.data.user;
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } finally {
      setUser(null);
    }
  };

  const value: AuthContextType = {
    user,
    isLoading: isProbing,
    isSessionResolved,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'ADMIN',
    isEmployee: user?.role === 'STAFF',
    isCustomer: user?.role === 'CUSTOMER',
    login,
    register,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
