/**
 * Role-Based Access Control (RBAC) Core
 * Simplified RBAC system for user management and profiles
 */

import { account, databases, config } from './appwrite.js';
import { ROLES, STATUSES } from './rbacValidation.js';
import { hasPermission, canAccess, getScopeFilters, PermissionError } from './permissions.js';
import { Query } from 'appwrite';

/**
 * Authentication error class
 */
export class AuthError extends Error {
  constructor(message = 'Authentication required') {
    super(message);
    this.name = 'AuthError';
    this.statusCode = 401;
  }
}

/**
 * Get current authenticated user with role and profile
 * @returns {Promise<object>} User object with profile
 * @throws {AuthError} If not authenticated
 */
export async function getCurrentUserWithProfile() {
  try {
    if (config.isDemoMode || !account) {
      throw new AuthError('Authentication not configured');
    }
    
    const appwriteUser = await account.get();
    
    // Check if collections are configured
    if (!config.databaseId || !config.usersCollectionId) {
      // Interim mode: return basic user with admin role
      return {
        $id: appwriteUser.$id,
        email: appwriteUser.email,
        role: 'admin',
        status: 'active',
      };
    }
    
    // Get user record from users collection
    const userResponse = await databases.listDocuments(
      config.databaseId,
      config.usersCollectionId,
      [Query.equal('externalId', appwriteUser.$id)]
    );
    
    // If user doesn't exist, bootstrap them as admin
    if (userResponse.documents.length === 0) {
      console.log('Bootstrapping first admin user...');
      try {
        const newUser = await databases.createDocument(
          config.databaseId,
          config.usersCollectionId,
          'unique()',
          {
            externalId: appwriteUser.$id,
            email: appwriteUser.email,
            role: 'admin',
            status: 'active',
            createdAt: new Date().toISOString(),
          }
        );
        
        // Return bootstrapped user
        return {
          $id: appwriteUser.$id,
          email: appwriteUser.email,
          role: 'admin',
          status: 'active',
          userId: newUser.$id,
        };
      } catch (createError) {
        console.error('Failed to bootstrap user:', createError);
        // Fallback to basic user if collection doesn't exist
        return {
          $id: appwriteUser.$id,
          email: appwriteUser.email,
          role: 'admin',
          status: 'active',
        };
      }
    }
    
    const user = userResponse.documents[0];
    
    // Check if user is active
    if (user.status !== STATUSES.ACTIVE) {
      throw new AuthError(`Account is ${user.status}`);
    }
    
    // Attach Appwrite user ID
    user.$id = appwriteUser.$id;
    user.email = appwriteUser.email;
    
    // Load role profile
    user.profile = await getUserProfile(user);
    
    return user;
  } catch (error) {
    if (error instanceof AuthError) throw error;
    throw new AuthError('Failed to authenticate');
  }
}

/**
 * Get user profile based on role
 * @param {object} user - User object
 * @returns {Promise<object|null>} Profile object
 */
async function getUserProfile(user) {
  if (!user || !user.role) return null;
  
  let collectionId;
  
  switch (user.role) {
    case ROLES.ADMIN:
      collectionId = config.adminProfilesCollectionId;
      break;
    case ROLES.MANAGER:
      collectionId = config.managerProfilesCollectionId;
      break;
    case ROLES.STAFF:
      collectionId = config.staffProfilesCollectionId;
      break;
    case ROLES.CLIENT:
      collectionId = config.clientProfilesCollectionId;
      break;
    default:
      return null;
  }
  
  if (!collectionId) return null;
  
  try {
    const response = await databases.listDocuments(
      config.databaseId,
      collectionId,
      [Query.equal('userId', user.$id)]
    );
    
    return response.documents[0] || null;
  } catch (error) {
    console.error('Error fetching profile:', error);
    return null;
  }
}

/**
 * Require authentication middleware
 * @returns {Promise<object>} Authenticated user
 * @throws {AuthError} If not authenticated
 */
export async function requireAuth() {
  const user = await getCurrentUserWithProfile();
  if (!user) {
    throw new AuthError('Authentication required');
  }
  return user;
}

/**
 * Require specific role(s)
 * @param {string|string[]} allowedRoles - Role or array of roles
 * @returns {Promise<object>} Authenticated user
 * @throws {AuthError|PermissionError} If not authenticated or wrong role
 */
export async function requireRole(allowedRoles) {
  const user = await requireAuth();
  
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  
  if (!roles.includes(user.role)) {
    throw new PermissionError(
      `This action requires one of the following roles: ${roles.join(', ')}`
    );
  }
  
  return user;
}

/**
 * Require scope access
 * Validates user has access to resource with given context
 * @param {string} resource - Resource type
 * @param {string} permission - Permission required
 * @param {object} context - Context (clientId, siteId, etc.)
 * @returns {Promise<object>} Authenticated user
 * @throws {AuthError|PermissionError} If not authorized
 */
export async function requireScope(resource, permission, context = {}) {
  const user = await requireAuth();
  
  if (!canAccess(user, resource, permission, context)) {
    throw new PermissionError(
      `You don't have access to this ${resource}`
    );
  }
  
  return user;
}

/**
 * Check if current user has permission
 * Non-throwing version for conditional UI
 * @param {object} user - User object
 * @param {string} resource - Resource type
 * @param {string} permission - Permission to check
 * @returns {boolean} Whether user has permission
 */
export function userHasPermission(user, resource, permission) {
  if (!user || !user.role) return false;
  return hasPermission(user.role, resource, permission);
}

/**
 * Check if current user can access resource
 * Non-throwing version for conditional UI
 * @param {object} user - User object
 * @param {string} resource - Resource type
 * @param {string} permission - Permission to check
 * @param {object} context - Context
 * @returns {boolean} Whether user can access
 */
export function userCanAccess(user, resource, permission, context = {}) {
  if (!user || !user.role) return false;
  return canAccess(user, resource, permission, context);
}

/**
 * Apply scope filters to Appwrite query
 * @param {object} user - User object
 * @param {string} resource - Resource type
 * @param {array} existingQueries - Existing Appwrite queries
 * @returns {array} Queries with scope filters applied
 */
export function applyScopeToQuery(user, resource, existingQueries = []) {
  const filters = getScopeFilters(user, resource);
  
  if (!filters) {
    // No filters needed (admin or no restrictions)
    return existingQueries;
  }
  
  const queries = [...existingQueries];
  
  // Apply client filter
  if (filters.clientId) {
    queries.push(Query.equal('clientId', filters.clientId));
  }
  
  // Apply client IDs filter (for managers)
  if (filters.clientIds && filters.clientIds.length > 0) {
    queries.push(Query.equal('clientId', filters.clientIds));
  }
  
  // Apply site IDs filter (for managers)
  if (filters.siteIds && filters.siteIds.length > 0) {
    queries.push(Query.equal('siteId', filters.siteIds));
  }
  
  // Apply user ID filter (for staff)
  if (filters.userId) {
    queries.push(Query.equal('userId', filters.userId));
  }
  
  return queries;
}

/**
 * Update user last login timestamp
 * @param {string} userId - User ID
 */
export async function updateLastLogin(userId) {
  if (!userId) return;
  
  try {
    const userResponse = await databases.listDocuments(
      config.databaseId,
      config.usersCollectionId,
      [Query.equal('externalId', userId)]
    );
    
    if (userResponse.documents.length > 0) {
      const userDoc = userResponse.documents[0];
      await databases.updateDocument(
        config.databaseId,
        config.usersCollectionId,
        userDoc.$id,
        { lastLoginAt: new Date().toISOString() }
      );
    }
  } catch (error) {
    console.error('Failed to update last login:', error);
  }
}

/**
 * Check if user status allows access
 * @param {object} user - User object
 * @returns {boolean} Whether user can access
 */
export function isUserActive(user) {
  return user && user.status === STATUSES.ACTIVE;
}

/**
 * Check if user has admin role
 * @param {object} user - User object
 * @returns {boolean} Whether user is admin
 */
export function isAdmin(user) {
  return user && user.role === ROLES.ADMIN;
}

/**
 * Check if user has manager role
 * @param {object} user - User object
 * @returns {boolean} Whether user is manager
 */
export function isManager(user) {
  return user && user.role === ROLES.MANAGER;
}

/**
 * Check if user has staff role
 * @param {object} user - User object
 * @returns {boolean} Whether user is staff
 */
export function isStaff(user) {
  return user && user.role === ROLES.STAFF;
}

/**
 * Check if user has client role
 * @param {object} user - User object
 * @returns {boolean} Whether user is client
 */
export function isClient(user) {
  return user && user.role === ROLES.CLIENT;
}

// Re-export for convenience
export { ROLES, STATUSES } from './rbacValidation.js';
export { RESOURCES, PERMISSIONS } from './permissions.js';
