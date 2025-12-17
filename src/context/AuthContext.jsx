import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { account, config } from '../lib/appwrite.js';
import { trackEvent, EVENT_CATEGORIES, EVENT_TYPES } from '../lib/analyticsUtils.js';

const AuthContext = createContext({
  user: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    try {
      // Skip auth if in demo mode or Appwrite not configured
      if (config.isDemoMode || !account) {
        console.log('Running in demo mode - no authentication required');
        setUser(null);
        setLoading(false);
        return;
      }
      
      // Only attempt to fetch user if Appwrite is properly configured
      if (!config.endpoint || 
          !config.projectId ||
          config.projectId === 'demo-project' ||
          config.projectId === 'your_project_id') {
        setUser(null);
        setLoading(false);
        return;
      }
      
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 5000)
      );
      
      const result = await Promise.race([account.get(), timeoutPromise]);
      setUser(result);
    } catch (error) {
      // Silently fail in demo mode
      if (!config.isDemoMode) {
        console.error('Auth fetch error:', error);
      }
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const login = useCallback(async ({ email, password }) => {
    if (config.isDemoMode || !account) {
      console.log('Demo mode - login skipped');
      return;
    }
    await account.createEmailSession(email, password);
    await fetchUser();
    
    // Track login event
    trackEvent(EVENT_CATEGORIES.USER, EVENT_TYPES.LOGIN, { email });
  }, [fetchUser]);

  const logout = useCallback(async () => {
    try {
      if (account && !config.isDemoMode) {
        await account.deleteSession('current');
      }
      
      // Track logout event
      trackEvent(EVENT_CATEGORIES.USER, EVENT_TYPES.LOGOUT, { userId: user?.$id });
    } finally {
      setUser(null);
    }
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
