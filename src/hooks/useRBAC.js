/**
 * RBAC React Hooks
 * Custom hooks for role-based access control in React components
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { getCurrentUserWithProfile, userHasPermission, userCanAccess } from '../lib/rbacCore.js';
import { ROLES, RESOURCES, PERMISSIONS } from '../lib/rbacCore.js';
import * as userService from '../services/userService.js';

/**
 * Hook to get current user with profile
 * @returns {object} { user, profile, loading, error, refetch }
 */
export function useCurrentUser() {
  const { user: authUser } = useAuth();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const fetchUser = useCallback(async () => {
    if (!authUser) {
      setUser(null);
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      const userData = await getCurrentUserWithProfile();
      setUser(userData);
    } catch (err) {
      console.error('Error fetching user:', err);
      setError(err.message);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [authUser]);
  
  useEffect(() => {
    fetchUser();
  }, [fetchUser]);
  
  return {
    user,
    profile: user?.profile,
    loading,
    error,
    refetch: fetchUser,
  };
}

/**
 * Hook to check if user has permission
 * @param {string} resource - Resource type
 * @param {string} permission - Permission to check
 * @returns {boolean} Whether user has permission
 */
export function usePermission(resource, permission) {
  const { user } = useCurrentUser();
  
  if (!user || !user.role) return false;
  
  return userHasPermission(user, resource, permission);
}

/**
 * Hook to check if user can access resource with context
 * @param {string} resource - Resource type
 * @param {string} permission - Permission to check
 * @param {object} context - Context (clientId, siteId, etc.)
 * @returns {boolean} Whether user can access
 */
export function useAccess(resource, permission, context = {}) {
  const { user } = useCurrentUser();
  
  if (!user || !user.role) return false;
  
  return userCanAccess(user, resource, permission, context);
}

/**
 * Hook to check user role
 * @returns {object} Role check functions
 */
export function useRole() {
  const { user } = useCurrentUser();
  
  return {
    isAdmin: user?.role === ROLES.ADMIN,
    isManager: user?.role === ROLES.MANAGER,
    isStaff: user?.role === ROLES.STAFF,
    isClient: user?.role === ROLES.CLIENT,
    role: user?.role,
  };
}

/**
 * Hook to manage user profile
 * @returns {object} Profile data and update function
 */
export function useProfile() {
  const { user, profile, loading, error, refetch } = useCurrentUser();
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState(null);
  
  const updateProfile = useCallback(async (updates) => {
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    try {
      setUpdating(true);
      setUpdateError(null);
      await userService.updateMyProfile(user, updates);
      await refetch();
    } catch (err) {
      console.error('Error updating profile:', err);
      setUpdateError(err.message);
      throw err;
    } finally {
      setUpdating(false);
    }
  }, [user, refetch]);
  
  return {
    profile,
    loading,
    error: error || updateError,
    updating,
    updateProfile,
    refetch,
  };
}

/**
 * Hook to manage users (admin only)
 * @param {object} filters - Filter options
 * @returns {object} Users data and management functions
 */
export function useUsers(filters = {}) {
  const { user } = useCurrentUser();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [total, setTotal] = useState(0);
  
  const fetchUsers = useCallback(async () => {
    if (!user || user.role !== ROLES.ADMIN) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      const response = await userService.getUsers(user, filters);
      setUsers(response.documents);
      setTotal(response.total);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user, JSON.stringify(filters)]);
  
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);
  
  const createUser = useCallback(async (userData, profileData) => {
    try {
      await userService.createUser(user, userData, profileData);
      await fetchUsers();
    } catch (err) {
      console.error('Error creating user:', err);
      throw err;
    }
  }, [user, fetchUsers]);
  
  const updateUser = useCallback(async (userId, updates) => {
    try {
      await userService.updateUser(user, userId, updates);
      await fetchUsers();
    } catch (err) {
      console.error('Error updating user:', err);
      throw err;
    }
  }, [user, fetchUsers]);
  
  const deleteUser = useCallback(async (userId) => {
    try {
      await userService.deleteUser(user, userId);
      await fetchUsers();
    } catch (err) {
      console.error('Error deleting user:', err);
      throw err;
    }
  }, [user, fetchUsers]);
  
  return {
    users,
    total,
    loading,
    error,
    refetch: fetchUsers,
    createUser,
    updateUser,
    deleteUser,
  };
}

/**
 * Hook to get staff list (manager scope)
 * @param {object} filters - Filter options
 * @returns {object} Staff data
 */
export function useStaff(filters = {}) {
  const { user } = useCurrentUser();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const fetchStaff = useCallback(async () => {
    if (!user || (user.role !== ROLES.ADMIN && user.role !== ROLES.MANAGER)) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      const response = await userService.getStaff(user, filters);
      setStaff(response.documents);
    } catch (err) {
      console.error('Error fetching staff:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user, JSON.stringify(filters)]);
  
  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);
  
  return {
    staff,
    loading,
    error,
    refetch: fetchStaff,
  };
}

// Re-export constants for convenience
export { ROLES, RESOURCES, PERMISSIONS };
