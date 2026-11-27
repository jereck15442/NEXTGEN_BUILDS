import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../api/auth.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load saved user on startup
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser && token) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (_e) {
        // Invalid saved user
      }
    }
    setLoading(false);
  }, [token]);

  // The API client clears storage on 401; mirror that into state so the UI
  // stops treating the user as signed in when the token is no longer valid.
  useEffect(() => {
    const handleForcedLogout = () => {
      setToken(null);
      setUser(null);
    };
    window.addEventListener('auth:logout', handleForcedLogout);
    return () => window.removeEventListener('auth:logout', handleForcedLogout);
  }, []);

  const handleAuthSuccess = (data) => {
    setToken(data.token);
    setUser(data.user);
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    return data;
  };

  const register = useCallback(async (userData) => {
    setLoading(true);
    setError(null);
    try {
      await authAPI.register(userData);
      // Register returns no token — sign in with the new credentials.
      const data = await authAPI.login({
        email: userData.email,
        password: userData.password,
      });
      return handleAuthSuccess(data);
    } catch (err) {
      setError(err.message || 'Registration failed');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (credentials) => {
    setLoading(true);
    setError(null);
    try {
      const data = await authAPI.login(credentials);
      return handleAuthSuccess(data);
    } catch (err) {
      setError(err.message || 'Login failed');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setLoading(true);
    try {
      await authAPI.logout();
    } catch (_e) {
      // Ignore
    } finally {
      setToken(null);
      setUser(null);
      setError(null);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setLoading(false);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    if (!token) return;
    try {
      const data = await authAPI.me();
      setUser(data.user || data);
      localStorage.setItem('user', JSON.stringify(data.user || data));
    } catch (_e) {
      // Token may be expired — clear it
      logout();
    }
  }, [token, logout]);

  const value = {
    user,
    token,
    isAuthenticated: !!token && !!user,
    loading,
    error,
    register,
    login,
    logout,
    refreshUser,
    clearError: () => setError(null),
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};