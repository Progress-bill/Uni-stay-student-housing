import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

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

  const [token, setToken] = useState(() => {
    try {
      return localStorage.getItem('unistay_token') || '';
    } catch {
      return '';
    }
  });

  // State to show high-priority session revocation modal if kicked out while active
  const [revocationNotice, setRevocationNotice] = useState(null);
  const isRevokingRef = useRef(false);

  // Auto-logout and show revocation notice
  const handleSessionRevoked = useCallback((notice) => {
    if (isRevokingRef.current) return;
    isRevokingRef.current = true;

    console.warn('[Security] Session revoked by server:', notice);

    setUser(null);
    setToken('');
    try {
      localStorage.removeItem('unistay_user');
      localStorage.removeItem('unistay_token');
    } catch {}

    setRevocationNotice({
      code: notice.code || 'SESSION_REVOKED',
      message: notice.message || 'Your session has been terminated by the administrator.',
      reason: notice.reason,
      suspendedUntil: notice.suspendedUntil,
      timestamp: Date.now()
    });

    setTimeout(() => {
      isRevokingRef.current = false;
    }, 2000);
  }, []);

  const clearRevocationNotice = useCallback(() => {
    setRevocationNotice(null);
  }, []);

  // Global fetch interceptor:
  // 1. Injects Authorization Bearer token to all /api/ requests.
  // 2. Intercepts 401/403 responses and triggers real-time auto-logout if account is suspended/removed.
  useEffect(() => {
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      let [resource, config] = args;
      const currentToken = localStorage.getItem('unistay_token');

      if (typeof resource === 'string' && resource.startsWith('/api') && currentToken) {
        config = config || {};
        const headers = new Headers(config.headers || {});
        if (!headers.has('Authorization') && !headers.has('authorization')) {
          headers.set('Authorization', `Bearer ${currentToken}`);
        }
        config.headers = headers;
      }

      const response = await originalFetch(resource, config);

      if (response.status === 401 || response.status === 403) {
        try {
          const clone = response.clone();
          const data = await clone.json();
          if (data && (data.code === 'ACCOUNT_SUSPENDED' || data.code === 'ACCOUNT_REMOVED' || data.code === 'SESSION_REVOKED')) {
            handleSessionRevoked(data);
          }
        } catch {}
      }

      return response;
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, [handleSessionRevoked]);

  // Real-time Session Heartbeat:
  // Regularly queries /api/auth/verify-session every 10 seconds and on tab focus to detect suspension/removal immediately
  useEffect(() => {
    if (!user || user.role !== 'agent') return;

    const checkLiveSession = async () => {
      const activeToken = localStorage.getItem('unistay_token');
      if (!activeToken) return;

      try {
        const res = await fetch('/api/auth/verify-session', {
          headers: { Authorization: `Bearer ${activeToken}` }
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          if (data.code === 'ACCOUNT_SUSPENDED' || data.code === 'ACCOUNT_REMOVED' || data.code === 'SESSION_REVOKED') {
            handleSessionRevoked(data);
          }
        }
      } catch (err) {
        console.warn('Live session verification failed:', err);
      }
    };

    window.addEventListener('focus', checkLiveSession);
    const interval = setInterval(checkLiveSession, 10000);

    return () => {
      window.removeEventListener('focus', checkLiveSession);
      clearInterval(interval);
    };
  }, [user, handleSessionRevoked]);

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
        setToken(data.token || '');
        setRevocationNotice(null);
        localStorage.setItem('unistay_user', JSON.stringify(data.user));
        if (data.token) {
          localStorage.setItem('unistay_token', data.token);
        }
        return { success: true, user: data.user, token: data.token };
      } else {
        return { 
          success: false, 
          message: data.message || 'Login failed',
          code: data.code,
          status: data.status || (res.status === 403 ? 'pending_approval' : 'error'),
          suspendedUntil: data.suspendedUntil,
          reason: data.reason
        };
      }
    } catch (err) {
      console.error('Login error:', err);
      return { success: false, message: 'Could not connect to authentication server' };
    }
  };

  const logout = () => {
    setUser(null);
    setToken('');
    localStorage.removeItem('unistay_user');
    localStorage.removeItem('unistay_token');
  };

  const isAdmin = user?.role === 'admin';
  const isAgent = user?.role === 'agent';
  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{ 
      user, 
      token, 
      login, 
      logout, 
      isAdmin, 
      isAgent, 
      isAuthenticated,
      revocationNotice,
      clearRevocationNotice 
    }}>
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
