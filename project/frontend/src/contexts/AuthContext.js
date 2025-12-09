import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../utils/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in from localStorage
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      const e = (email || '').trim();
      const p = (password || '').trim();
      const { data } = await api.login(e, p);
      const userData = data?.user || null;
      const token = data?.access_token || null;
      if (userData && token) {
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('token', token);
        return { success: true, user: userData };
      }
      return { success: false, error: 'Invalid credentials' };
    } catch (e) {
      const status = e?.response?.status;
      const detail = e?.response?.data?.detail || e?.response?.data?.message;
      if (status === 401) return { success: false, error: detail || 'Invalid credentials' };
      if (status === 400 || status === 409) return { success: false, error: detail || 'Request error' };
      if (e?.response) return { success: false, error: 'Server error. Please try again.' };
      return { success: false, error: 'Network error. Check server connection.' };
    }
  };

  const register = async (name, email, password) => {
    try {
      const { data } = await api.register(name, email, password);
      const userData = data?.user || null;
      const token = data?.access_token || null;
      if (userData && token) {
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('token', token);
        return { success: true, user: userData };
      }
      return { success: false, error: 'Registration failed' };
    } catch (e) {
      return { success: false, error: 'Registration failed' };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    isContestant: user?.role === 'contestant'
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
