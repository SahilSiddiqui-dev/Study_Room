import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import authApi from '../api/auth.api';
import { extractErrorDetails } from '../utils/errors';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [avatars, setAvatars] = useState(['owl', 'fox', 'panda', 'cat', 'bear']);

  // Bootstrap authentication status via GET /api/auth/me
  const checkAuth = useCallback(async () => {
    try {
      const result = await authApi.getMe();
      if (result.success && result.data?.user) {
        setUser(result.data.user);
        if (result.data?.token) {
          setToken(result.data.token);
        }
      } else {
        setUser(null);
        setToken(null);
      }
    } catch (err) {
      // 401 or network error simply means not logged in
      setUser(null);
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch supported avatars from backend
  const loadAvatars = useCallback(async () => {
    try {
      const result = await authApi.getAvatars();
      if (result.success && Array.isArray(result.data?.avatars)) {
        setAvatars(result.data.avatars);
      }
    } catch (err) {
      // Fallback kept
    }
  }, []);

  useEffect(() => {
    checkAuth();
    loadAvatars();
  }, [checkAuth, loadAvatars]);

  const login = async (credentials) => {
    const result = await authApi.login(credentials);
    if (result.success && result.data?.user) {
      setUser(result.data.user);
      if (result.data?.token) {
        setToken(result.data.token);
      }
      return result.data.user;
    }
    throw new Error(result.message || 'Login failed');
  };

  const register = async (userData) => {
    const result = await authApi.register(userData);
    if (result.success && result.data?.user) {
      setUser(result.data.user);
      if (result.data?.token) {
        setToken(result.data.token);
      }
      return result.data.user;
    }
    throw new Error(result.message || 'Registration failed');
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (err) {
      // Still clear local user on error
    } finally {
      setUser(null);
      setToken(null);
    }
  };

  const updateUser = (updatedFields) => {
    setUser((prev) => (prev ? { ...prev, ...updatedFields } : null));
  };

  const value = {
    user,
    token,
    isLoading,
    isAuthenticated: Boolean(user),
    avatars,
    login,
    register,
    logout,
    updateUser,
    refreshUser: checkAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
