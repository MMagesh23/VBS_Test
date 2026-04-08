import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  // Track whether current session was freshly logged in (vs token-restored)
  const [freshLogin, setFreshLogin] = useState(false);

  const initAuth = useCallback(async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) { setLoading(false); return; }
    try {
      const { data } = await authAPI.me();
      // On token-restore, DON'T trigger mustChangePassword redirect
      // The redirect only happens on explicit login() call
      setUser(data.data);
    } catch {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { initAuth(); }, [initAuth]);

  const login = async (userID, password) => {
    const { data } = await authAPI.login({ userID, password });
    localStorage.setItem('accessToken', data.data.accessToken);
    localStorage.setItem('refreshToken', data.data.refreshToken);
    const loggedInUser = data.data.user;
    setUser(loggedInUser);
    setFreshLogin(true); // Mark as fresh login so mustChangePassword redirect can fire
    return loggedInUser;
  };

  const logout = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      await authAPI.logout(refreshToken);
    } catch { /* ignore */ }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
    setFreshLogin(false);
    toast.success('Logged out successfully');
  };

  const clearMustChangePassword = () => {
    setUser(prev => prev ? { ...prev, mustChangePassword: false } : prev);
    setFreshLogin(false);
  };

  const updateUser = (updates) => setUser(prev => ({ ...prev, ...updates }));

  return (
    <AuthContext.Provider value={{ user, loading, freshLogin, login, logout, updateUser, clearMustChangePassword }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};