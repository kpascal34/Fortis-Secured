import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { account, config } from '../lib/appwrite.js';
import { trackEvent, EVENT_CATEGORIES, EVENT_TYPES } from '../lib/analyticsUtils.js';
import { can, getRoleFromAuthData, getRolePermissions } from '../lib/authz.js';

const AuthContext = createContext({
  user: null,
  role: null,
  permissions: [],
  authDebug: null,
  loading: true,
  can: () => false,
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

const buildResolvedAuthState = (appwriteUser) => {
  const roleResult = getRoleFromAuthData(appwriteUser, {
    adminEmails: getEffectiveAdminEmails(),
    internalDomains: getEffectiveInternalDomains(),
  });

  const permissions = [
    ...new Set([...(getRolePermissions(roleResult.role) || []), ...(roleResult.inputs?.prefsPermissions || [])]),
  ];

  return {
    user: appwriteUser ? { ...appwriteUser, role: roleResult.role } : null,
    role: roleResult.role,
    permissions,
    authDebug: {
      roleSource: roleResult.source,
      resolvedRole: roleResult.role,
      raw: appwriteUser || null,
      inputs: roleResult.inputs,
      allowlists: {
        adminEmails: getEffectiveAdminEmails(),
        internalDomains: getEffectiveInternalDomains(),
      },
    },
  };
};

const clearAuthState = (setters, roleSource) => {
  const { setUser, setRole, setPermissions, setAuthDebug } = setters;
  setUser(null);
  setRole(null);
  setPermissions([]);
  setAuthDebug({ roleSource, resolvedRole: null, raw: null, inputs: {} });
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [authDebug, setAuthDebug] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    try {
      if (config.isDemoMode || !account) {
        clearAuthState({ setUser, setRole, setPermissions, setAuthDebug }, 'demo_mode');
        setLoading(false);
        return;
      }

      const misconfigured =
        !config.endpoint ||
        !config.projectId ||
        config.projectId === 'demo-project' ||
        config.projectId === 'your_project_id';

      if (misconfigured) {
        clearAuthState({ setUser, setRole, setPermissions, setAuthDebug }, 'misconfigured');
        setLoading(false);
        return;
      }

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), 5000)
      );

      const result = await Promise.race([account.get(), timeoutPromise]);
      const resolved = buildResolvedAuthState(result);
      setUser(resolved.user);
      setRole(resolved.role);
      setPermissions(resolved.permissions);
      setAuthDebug(resolved.authDebug);
    } catch (error) {
      if (!config.isDemoMode) {
        console.error('Auth fetch error:', error);
      }
      clearAuthState({ setUser, setRole, setPermissions, setAuthDebug }, 'fetch_error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const login = useCallback(
    async ({ email, password }) => {
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
      trackEvent(EVENT_CATEGORIES.USER, EVENT_TYPES.LOGIN, { email });
    },
    [fetchUser]
  );

  const logout = useCallback(async () => {
    try {
      if (account && !config.isDemoMode) {
        await account.deleteSession('current');
      }
      trackEvent(EVENT_CATEGORIES.USER, EVENT_TYPES.LOGOUT, { userId: user?.$id });
    } finally {
      clearAuthState({ setUser, setRole, setPermissions, setAuthDebug }, 'logged_out');
    }
  }, [user]);

  const canAccess = useCallback((action) => can(role, action), [role]);

  return (
    <AuthContext.Provider
      value={{ user, role, permissions, authDebug, loading, can: canAccess, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
