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
      const { data } = await api.login(email, password);
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
      return { success: false, error: 'Invalid credentials' };
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
