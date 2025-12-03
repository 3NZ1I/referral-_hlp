import React, { createContext, useContext, useState, useEffect } from 'react';
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

// User roles: 'admin', 'internal', 'external'
const ROLES = {
  ADMIN: 'admin',
  INTERNAL: 'internal',
  EXTERNAL: 'external',
};

// Initial users (in a real app, this would come from a backend)
const initialUsers = [
  {
    id: '1',
    username: 'admin',
    password: 'admin123',
    role: ROLES.ADMIN,
    name: 'System Admin',
    email: 'admin@hlp.org',
    title: 'Administrator',
    organization: 'HLP',
    avatar: generateAvatar('System Admin'),
  },
  {
    id: '2',
    username: 'internal',
    password: 'internal123',
    role: ROLES.INTERNAL,
    name: 'Internal User',
    email: 'internal@hlp.org',
    title: 'Case Worker',
    organization: 'HLP',
    avatar: generateAvatar('Internal User'),
  },
  {
    id: '3',
    username: 'external',
    password: 'external123',
    role: ROLES.EXTERNAL,
    name: 'External User',
    email: 'external@partner.org',
    title: 'Partner Liaison',
    organization: 'Partner Org',
    avatar: generateAvatar('External User'),
  },
];

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('currentUser');
    return saved ? JSON.parse(saved) : null;
  });

  const [users, setUsers] = useState(() => {
    const saved = localStorage.getItem('users');
    return saved ? JSON.parse(saved) : initialUsers;
  });

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('currentUser');
    }
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem('users', JSON.stringify(users));
  }, [users]);

  const login = (username, password) => {
    const user = users.find((u) => u.username === username && u.password === password);
    if (user) {
      const { password: _, ...userWithoutPassword } = user;
      setCurrentUser(userWithoutPassword);
      return { success: true };
    }
    return { success: false, message: 'Invalid credentials' };
  };

  const logout = () => {
    setCurrentUser(null);
  };

  const addUser = (userData) => {
    const newUser = {
      id: Date.now().toString(),
      ...userData,
      avatar: userData.avatar || generateAvatar(userData.name),
    };
    setUsers((prev) => [...prev, newUser]);
    return newUser;
  };

  const updateUser = (userId, updates) => {
    setUsers((prev) =>
      prev.map((user) =>
        user.id === userId ? { ...user, ...updates } : user
      )
    );
    // If the current user updated their own profile, reflect changes in currentUser too
    setCurrentUser((cu) => (cu && cu.id === userId ? { ...cu, ...updates } : cu));
  };

  const deleteUser = (userId) => {
    setUsers((prev) => prev.filter((user) => user.id !== userId));
  };

  const isAdmin = currentUser?.role === ROLES.ADMIN;
  const isInternal = currentUser?.role === ROLES.INTERNAL;
  const isExternal = currentUser?.role === ROLES.EXTERNAL;

  const canAccessStatistics = isAdmin;
  const canAccessData = isAdmin;
  const canImportData = isAdmin;
  const canSeeHiddenFields = isAdmin;

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        users: users.map(({ password, ...user }) => user), // Don't expose passwords
        login,
        logout,
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
