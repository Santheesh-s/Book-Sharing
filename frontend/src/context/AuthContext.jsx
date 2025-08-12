import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userStats, setUserStats] = useState({
    booksListed: 0,
    booksBorrowed: 0,
    booksSold: 0,
    reviewsGiven: 0,
  });

  const checkAuthStatus = async () => {
    try {
      const token = localStorage.getItem('bookshare-token');
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      const response = await authAPI.getCurrentUser();
      if (response.data.loggedIn) {
        setUser(response.data);
        // Fetch user stats
        const statsResponse = await authAPI.getUserStats();
        setUserStats(statsResponse.data);
      } else {
        setUser(null);
        localStorage.removeItem('bookshare-token');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(null);
      localStorage.removeItem('bookshare-token');
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials) => {
    try {
      const response = await authAPI.login(credentials);
      if (response.data.token) {
        // Store token in localStorage
        localStorage.setItem('bookshare-token', response.data.token);
        await checkAuthStatus();
        return { success: true };
      }
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Login failed'
      };
    }
  };

  const register = async (userData) => {
    try {
      const response = await authAPI.register(userData);
      return { success: true, message: response.data.message };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.error || 'Registration failed' 
      };
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
      setUser(null);
      setUserStats({
        booksListed: 0,
        booksBorrowed: 0,
        booksSold: 0,
        reviewsGiven: 0,
      });
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const refreshUserStats = async () => {
    if (user) {
      try {
        const response = await authAPI.getUserStats();
        setUserStats(response.data);
      } catch (error) {
        console.error('Failed to refresh user stats:', error);
      }
    }
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const value = {
    user,
    userStats,
    loading,
    login,
    register,
    logout,
    refreshUserStats,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
