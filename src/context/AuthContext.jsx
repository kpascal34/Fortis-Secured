import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { account, config } from '../lib/appwrite.js';
import { trackEvent, EVENT_CATEGORIES, EVENT_TYPES } from '../lib/analyticsUtils.js';
import { resolveUserRole, getPermissions } from '../lib/rbac.ts';

const AuthContext = createContext({
  user: null,
  resolvedRole: null,
  permissions: {},
  memberships: [],
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

const adminEmails = normalizeCsv(config.adminEmails);
const internalDomains = normalizeCsv(config.internalEmailDomains);

const getEffectiveAdminEmails = () => (adminEmails.length ? adminEmails : DEFAULT_ADMIN_EMAILS);
const getEffectiveInternalDomains = () => (internalDomains.length ? internalDomains : DEFAULT_INTERNAL_DOMAINS);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [resolvedRole, setResolvedRole] = useState(null);
  const [permissions, setPermissions] = useState({});
  const [memberships, setMemberships] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    try {
      // Skip auth if in demo mode or Appwrite not configured
      if (config.isDemoMode || !account) {
        console.log('Running in demo mode - no authentication required');
        setUser(null);
        setResolvedRole(null);
        setPermissions({});
        setMemberships([]);
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
        setResolvedRole(null);
        setPermissions({});
        setMemberships([]);
        setLoading(false);
        return;
      }

      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), 5000)
      );

      const result = await Promise.race([account.get(), timeoutPromise]);
      const membershipsResult = await account.listMemberships();
      const userMemberships = membershipsResult?.memberships || [];

      const roleFromAccessControls = resolveUserRole(result, userMemberships);
      const email = String(result.email || '').toLowerCase();
      const domain = email.split('@')[1] || '';
      const role = getEffectiveAdminEmails().includes(email)
        ? 'admin'
        : roleFromAccessControls === 'customer' && getEffectiveInternalDomains().includes(domain)
        ? 'staff'
        : roleFromAccessControls;

      const computedPermissions = getPermissions(role);
      setUser({ ...result, role });
      setResolvedRole(role);
      setPermissions(computedPermissions);
      setMemberships(userMemberships);
    } catch (error) {
      console.error('Auth fetch error:', error);
      setUser(null);
      setResolvedRole(null);
      setPermissions({});
      setMemberships([]);
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

      const normalizedEmail = String(email || '').trim().toLowerCase();
      const rawPassword = String(password || '');
      if (!normalizedEmail || !rawPassword.trim()) {
        const validationError = new Error('Email and password are required.');
        validationError.type = 'auth_validation_error';
        validationError.code = 400;
        throw validationError;
      }

      try {
        await account.createEmailSession(normalizedEmail, rawPassword);
      } catch (error) {
        const authError = new Error(error?.message || 'Unable to sign in. Please try again.');
        authError.type = error?.type || 'auth_login_failed';
        authError.code = error?.code || 500;
        authError.response = error?.response || null;
        throw authError;
      }

      await fetchUser();

      // Track login event
      trackEvent(EVENT_CATEGORIES.USER, EVENT_TYPES.LOGIN, { email: normalizedEmail });
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
      setResolvedRole(null);
      setPermissions({});
      setMemberships([]);
    }
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, resolvedRole, permissions, memberships, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
