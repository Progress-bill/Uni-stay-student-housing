import React, { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('unistay_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const login = async (phone, password) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password })
      });

      const data = await res.json();
      if (data.success && data.user) {
        setUser(data.user);
        localStorage.setItem('unistay_user', JSON.stringify(data.user));
        return { success: true, user: data.user };
      } else {
        return { 
          success: false, 
          message: data.message || 'Login failed',
          status: data.status || (res.status === 403 ? 'pending_approval' : 'error'),
          suspendedUntil: data.suspendedUntil,
          reason: data.reason
        };
      }
    } catch (err) {
      console.error(err);
      return { success: false, message: 'Could not connect to authentication server' };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('unistay_user');
  };

  const isAdmin = user?.role === 'admin';
  const isAgent = user?.role === 'agent';
  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{ user, login, logout, isAdmin, isAgent, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
