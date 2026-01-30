import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { account, config } from '../lib/appwrite.js';
import { trackEvent, EVENT_CATEGORIES, EVENT_TYPES } from '../lib/analyticsUtils.js';

const AuthContext = createContext({
  user: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
});

const normalizeCsv = (value) => {
  if (!value || typeof value !== 'string') return [];
  return value
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
};

const DEFAULT_ADMIN_EMAILS = ['k.pascal@fortissecured.co.uk'];
const DEFAULT_INTERNAL_DOMAINS = ['fortissecured.co.uk', 'fortissecured.com'];

const adminEmails = normalizeCsv(import.meta.env.VITE_ADMIN_EMAILS);
const internalDomains = normalizeCsv(import.meta.env.VITE_INTERNAL_EMAIL_DOMAINS);

const getEffectiveAdminEmails = () => (adminEmails.length ? adminEmails : DEFAULT_ADMIN_EMAILS);
const getEffectiveInternalDomains = () => (internalDomains.length ? internalDomains : DEFAULT_INTERNAL_DOMAINS);

const inferRole = (appwriteUser) => {
  if (!appwriteUser) return null;

  const email = String(appwriteUser.email || '').toLowerCase();
  const labels = Array.isArray(appwriteUser.labels)
    ? appwriteUser.labels.map((l) => String(l).toLowerCase())
    : [];

  // 1) Prefer explicit Appwrite labels (if present)
  if (labels.includes('admin')) return 'admin';
  if (labels.includes('staff')) return 'staff';
  if (labels.includes('client')) return 'client';

  // 2) Allowlist admin emails
  if (getEffectiveAdminEmails().includes(email)) return 'admin';

  // 3) Internal domains => staff
  const domain = email.split('@')[1] || '';
  if (getEffectiveInternalDomains().includes(domain)) return 'staff';

  // 4) Default
  return 'client';
};

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
      if (
        !config.endpoint ||
        !config.projectId ||
        config.projectId === 'demo-project' ||
        config.projectId === 'your_project_id'
      ) {
        setUser(null);
        setLoading(false);
        return;
      }

      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), 5000)
      );

      const result = await Promise.race([account.get(), timeoutPromise]);
      const role = inferRole(result);
      setUser({ ...result, role });
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

  const login = useCallback(
    async ({ email, password }) => {
      // Prevent silent failures when auth is disabled or misconfigured
      const misconfigured =
        !config.endpoint ||
        !config.projectId ||
        config.projectId === 'demo-project' ||
        config.projectId === 'your_project_id';

      if (config.isDemoMode || !account || misconfigured) {
        const msg =
          'Login is disabled in this environment. Set VITE_ENABLE_DEMO_MODE=false and configure VITE_APPWRITE_ENDPOINT and VITE_APPWRITE_PROJECT_ID.';
        console.warn(msg);
        throw new Error(msg);
      }

      await account.createEmailSession(email, password);
      await fetchUser();

      // Track login event
      trackEvent(EVENT_CATEGORIES.USER, EVENT_TYPES.LOGIN, { email });
    },
    [fetchUser]
  );

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

  return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
