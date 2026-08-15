import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../api/auth';
import type { User, LoginInput, RegisterInput } from '../types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
    const initAuth = async () => {
      try {
        await refreshUser();
      } catch {
        // Not authenticated
      } finally {
        setIsLoading(false);
      }
    };
    initAuth();
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
    isLoading,
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