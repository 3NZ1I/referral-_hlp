/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect } from 'react';
import request from '../api/http';

// Generate a simple initials-based SVG avatar data URL
const generateAvatar = (name = '') => {
  const initials = (name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
  const bgColors = ['#3b82f6', '#06b6d4', '#a855f7', '#ef4444', '#10b981', '#f59e0b'];
  const color = bgColors[(name || '').length % bgColors.length];
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
  <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
    <rect width="64" height="64" rx="12" fill="${color}"/>
    <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="24" fill="#ffffff" font-weight="700">${initials}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

// User roles: 'admin', 'internal', 'external', 'user'
const ROLES = {
  ADMIN: 'admin',
  INTERNAL: 'internal',
  EXTERNAL: 'external',
  USER: 'user',
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('currentUser');
    return saved ? JSON.parse(saved) : null;
  });

  const [users, setUsers] = useState([]);

  // Fetch users list from backend
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const list = await request('/users');
        if (Array.isArray(list)) {
          setUsers(list.map(u => ({
            ...u,
            name: u.name || u.username,
            avatar: u.avatar || generateAvatar(u.name || u.username),
          })));
        }
      } catch (err) {
        // Ignore silently - user list is optional
        console.warn('Failed to fetch users list:', err);
      }
    };
    fetchUsers();
  }, []);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('currentUser');
      localStorage.removeItem('authToken');
    }
  }, [currentUser]);

  const login = async (username, password) => {
    try {
      const response = await request('/auth/login', {
        method: 'POST',
        body: { username, password },
      });
      
      if (response.token && response.user) {
        // Store token
        localStorage.setItem('authToken', response.token);
        
        // Create user object with avatar
        const userWithAvatar = {
          ...response.user,
          name: response.user.name || response.user.username,
          avatar: generateAvatar(response.user.name || response.user.username),
          title: response.user.role === 'admin' ? 'Administrator' : 'User',
          organization: 'HLP',
        };
        
        setCurrentUser(userWithAvatar);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
    localStorage.removeItem('authToken');
  };

  const register = async (userData) => {
    try {
      const response = await request('/auth/register', {
        method: 'POST',
        body: userData,
      });
      
      if (response.token && response.user) {
        localStorage.setItem('authToken', response.token);
        
        const userWithAvatar = {
          ...response.user,
          name: response.user.name || response.user.username,
          avatar: generateAvatar(response.user.name || response.user.username),
          title: response.user.role === 'admin' ? 'Administrator' : 'User',
          organization: 'HLP',
        };
        
        setCurrentUser(userWithAvatar);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  };

  const addUser = async (userData) => {
    try {
      const response = await request('/auth/register', {
        method: 'POST',
        body: userData,
      });
      const u = response.user;
      // update local list
      setUsers(prev => prev ? [...prev, u] : [u]);
      return u;
    } catch (error) {
      console.error('Add user error:', error);
      throw error;
    }
  };

  const updateUser = (userId, updates) => {
    // Update current user if editing self
    setCurrentUser((cu) => (cu && cu.id === userId ? { ...cu, ...updates } : cu));
    setUsers(prev => prev.map(u => (u.id === userId ? { ...u, ...updates } : u)));
  };

  const deleteUser = async (userId) => {
    try {
      await request(`/users/${userId}`, { method: 'DELETE' });
      setUsers(prev => prev.filter(u => u.id !== userId));
      if (currentUser?.id === userId) logout();
      return true;
    } catch (err) {
      console.warn('Delete user failed (backend may not implement):', err);
      return false;
    }
  };

  const isAdmin = currentUser?.role === ROLES.ADMIN || currentUser?.role === 'admin';
  const isInternal = currentUser?.role === ROLES.INTERNAL || currentUser?.role === 'internal';
  const isExternal = currentUser?.role === ROLES.EXTERNAL || currentUser?.role === 'external';

  const canAccessStatistics = isAdmin;
  const canAccessData = isAdmin;
  const canImportData = isAdmin;
  const canSeeHiddenFields = isAdmin;

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        users, // Backend users list
        login,
        logout,
        register,
        addUser,
        updateUser,
        deleteUser,
        isAdmin,
        isInternal,
        isExternal,
        canAccessStatistics,
        canAccessData,
        canImportData,
        canSeeHiddenFields,
        ROLES,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
