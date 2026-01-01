/**
 * Permission definitions and RBAC utilities
 * Centralized permission management for Fortis Secured
 */

import { ROLES } from './rbacValidation.js';

/**
 * Resource types in the system
 */
export const RESOURCES = {
  USERS: 'users',
  PROFILES: 'profiles',
  CLIENTS: 'clients',
  SITES: 'sites',
  GUARDS: 'guards',
  SHIFTS: 'shifts',
  INCIDENTS: 'incidents',
  ASSETS: 'assets',
  REPORTS: 'reports',
  AUDIT_LOGS: 'audit_logs',
  SETTINGS: 'settings',
};

/**
 * Actions that can be performed on resources
 */
export const PERMISSIONS = {
  CREATE: 'create',
  READ: 'read',
  UPDATE: 'update',
  DELETE: 'delete',
  APPROVE: 'approve',
  ASSIGN: 'assign',
};

/**
 * Permission matrix defining what each role can do
 * Format: { role: { resource: [permissions] } }
 */
export const PERMISSION_MATRIX = {
  [ROLES.ADMIN]: {
    [RESOURCES.USERS]: [PERMISSIONS.CREATE, PERMISSIONS.READ, PERMISSIONS.UPDATE, PERMISSIONS.DELETE],
    [RESOURCES.PROFILES]: [PERMISSIONS.CREATE, PERMISSIONS.READ, PERMISSIONS.UPDATE, PERMISSIONS.DELETE],
    [RESOURCES.CLIENTS]: [PERMISSIONS.CREATE, PERMISSIONS.READ, PERMISSIONS.UPDATE, PERMISSIONS.DELETE],
    [RESOURCES.SITES]: [PERMISSIONS.CREATE, PERMISSIONS.READ, PERMISSIONS.UPDATE, PERMISSIONS.DELETE],
    [RESOURCES.GUARDS]: [PERMISSIONS.CREATE, PERMISSIONS.READ, PERMISSIONS.UPDATE, PERMISSIONS.DELETE, PERMISSIONS.ASSIGN],
    [RESOURCES.SHIFTS]: [PERMISSIONS.CREATE, PERMISSIONS.READ, PERMISSIONS.UPDATE, PERMISSIONS.DELETE, PERMISSIONS.ASSIGN, PERMISSIONS.APPROVE],
    [RESOURCES.INCIDENTS]: [PERMISSIONS.CREATE, PERMISSIONS.READ, PERMISSIONS.UPDATE, PERMISSIONS.DELETE],
    [RESOURCES.ASSETS]: [PERMISSIONS.CREATE, PERMISSIONS.READ, PERMISSIONS.UPDATE, PERMISSIONS.DELETE],
    [RESOURCES.REPORTS]: [PERMISSIONS.CREATE, PERMISSIONS.READ],
    [RESOURCES.AUDIT_LOGS]: [PERMISSIONS.READ],
    [RESOURCES.SETTINGS]: [PERMISSIONS.READ, PERMISSIONS.UPDATE],
  },

  [ROLES.MANAGER]: {
    [RESOURCES.USERS]: [PERMISSIONS.READ], // Can view staff
    [RESOURCES.PROFILES]: [PERMISSIONS.READ], // Can view staff profiles
    [RESOURCES.CLIENTS]: [PERMISSIONS.READ], // Scope: assigned only
    [RESOURCES.SITES]: [PERMISSIONS.READ, PERMISSIONS.UPDATE], // Scope: assigned only
    [RESOURCES.GUARDS]: [PERMISSIONS.READ, PERMISSIONS.ASSIGN], // Scope: assigned sites
    [RESOURCES.SHIFTS]: [PERMISSIONS.CREATE, PERMISSIONS.READ, PERMISSIONS.UPDATE, PERMISSIONS.ASSIGN, PERMISSIONS.APPROVE], // Scope: assigned sites
    [RESOURCES.INCIDENTS]: [PERMISSIONS.CREATE, PERMISSIONS.READ, PERMISSIONS.UPDATE], // Scope: assigned sites
    [RESOURCES.ASSETS]: [PERMISSIONS.READ, PERMISSIONS.UPDATE], // Scope: assigned sites
    [RESOURCES.REPORTS]: [PERMISSIONS.READ], // Scope: assigned sites
    [RESOURCES.AUDIT_LOGS]: [], // No access
    [RESOURCES.SETTINGS]: [], // No access
  },

  [ROLES.STAFF]: {
    [RESOURCES.USERS]: [], // No access to other users
    [RESOURCES.PROFILES]: [PERMISSIONS.READ, PERMISSIONS.UPDATE], // Own profile only
    [RESOURCES.CLIENTS]: [], // No direct client access
    [RESOURCES.SITES]: [PERMISSIONS.READ], // Scope: assigned shifts only
    [RESOURCES.GUARDS]: [], // No guard management
    [RESOURCES.SHIFTS]: [PERMISSIONS.READ], // Scope: own shifts
    [RESOURCES.INCIDENTS]: [PERMISSIONS.CREATE, PERMISSIONS.READ], // Scope: own shifts
    [RESOURCES.ASSETS]: [PERMISSIONS.READ], // Scope: assigned shifts
    [RESOURCES.REPORTS]: [], // No reports
    [RESOURCES.AUDIT_LOGS]: [], // No access
    [RESOURCES.SETTINGS]: [], // No settings
  },

  [ROLES.CLIENT]: {
    [RESOURCES.USERS]: [], // No user access
    [RESOURCES.PROFILES]: [PERMISSIONS.READ, PERMISSIONS.UPDATE], // Own profile only
    [RESOURCES.CLIENTS]: [PERMISSIONS.READ, PERMISSIONS.UPDATE], // Own client only
    [RESOURCES.SITES]: [PERMISSIONS.READ, PERMISSIONS.UPDATE], // Own sites only
    [RESOURCES.GUARDS]: [PERMISSIONS.READ], // Assigned to their sites
    [RESOURCES.SHIFTS]: [PERMISSIONS.READ], // Their sites only
    [RESOURCES.INCIDENTS]: [PERMISSIONS.READ], // Their sites only
    [RESOURCES.ASSETS]: [PERMISSIONS.READ], // Their sites only
    [RESOURCES.REPORTS]: [PERMISSIONS.READ], // Their sites only
    [RESOURCES.AUDIT_LOGS]: [], // No access
    [RESOURCES.SETTINGS]: [], // No access
  },
};

/**
 * Check if a role has permission for a resource action
 * @param {string} role - User role
 * @param {string} resource - Resource type
 * @param {string} permission - Permission to check
 * @returns {boolean} Whether permission is granted
 */
export function hasPermission(role, resource, permission) {
  if (!role || !resource || !permission) return false;
  
  const rolePermissions = PERMISSION_MATRIX[role];
  if (!rolePermissions) return false;
  
  const resourcePermissions = rolePermissions[resource];
  if (!resourcePermissions) return false;
  
  return resourcePermissions.includes(permission);
}

/**
 * Check if a role has any of the specified permissions
 * @param {string} role - User role
 * @param {string} resource - Resource type
 * @param {string[]} permissions - Permissions to check
 * @returns {boolean} Whether any permission is granted
 */
export function hasAnyPermission(role, resource, permissions) {
  return permissions.some(permission => hasPermission(role, resource, permission));
}

/**
 * Check if a role has all of the specified permissions
 * @param {string} role - User role
 * @param {string} resource - Resource type
 * @param {string[]} permissions - Permissions to check
 * @returns {boolean} Whether all permissions are granted
 */
export function hasAllPermissions(role, resource, permissions) {
  return permissions.every(permission => hasPermission(role, resource, permission));
}

/**
 * Get all permissions for a role on a resource
 * @param {string} role - User role
 * @param {string} resource - Resource type
 * @returns {string[]} Array of permissions
 */
export function getPermissions(role, resource) {
  if (!role || !resource) return [];
  
  const rolePermissions = PERMISSION_MATRIX[role];
  if (!rolePermissions) return [];
  
  return rolePermissions[resource] || [];
}

/**
 * Check if user can access resource
 * Considers both permission and scope
 * @param {object} user - User object with role and profile
 * @param {string} resource - Resource type
 * @param {string} permission - Permission to check
 * @param {object} context - Additional context (clientId, siteId, etc.)
 * @returns {boolean} Whether access is granted
 */
export function canAccess(user, resource, permission, context = {}) {
  if (!user || !user.role) return false;
  
  // Check base permission
  if (!hasPermission(user.role, resource, permission)) {
    return false;
  }
  
  // Admin has global access
  if (user.role === ROLES.ADMIN) {
    return true;
  }
  
  // Manager scope check
  if (user.role === ROLES.MANAGER) {
    return checkManagerScope(user, resource, context);
  }
  
  // Staff scope check
  if (user.role === ROLES.STAFF) {
    return checkStaffScope(user, resource, context);
  }
  
  // Client scope check
  if (user.role === ROLES.CLIENT) {
    return checkClientScope(user, resource, context);
  }
  
  return false;
}

/**
 * Check manager scope
 * Managers are limited to assigned clients and sites
 */
function checkManagerScope(user, resource, context) {
  const profile = user.profile;
  if (!profile) return false;
  
  // Parse assigned clients and sites from JSON strings
  const assignedClients = profile.assignedClients 
    ? (typeof profile.assignedClients === 'string' 
        ? JSON.parse(profile.assignedClients) 
        : profile.assignedClients)
    : [];
    
  const assignedSites = profile.assignedSites 
    ? (typeof profile.assignedSites === 'string' 
        ? JSON.parse(profile.assignedSites) 
        : profile.assignedSites)
    : [];
  
  // Check client scope
  if (context.clientId && !assignedClients.includes(context.clientId)) {
    return false;
  }
  
  // Check site scope
  if (context.siteId && !assignedSites.includes(context.siteId)) {
    return false;
  }
  
  return true;
}

/**
 * Check staff scope
 * Staff can only access their own data
 */
function checkStaffScope(user, resource, context) {
  // Staff can only access their own profile
  if (resource === RESOURCES.PROFILES) {
    return context.userId === user.$id;
  }
  
  // For other resources, check if related to their shifts
  // This would need additional logic based on shift assignments
  return true;
}

/**
 * Check client scope
 * Clients can only access their own client data
 */
function checkClientScope(user, resource, context) {
  const profile = user.profile;
  if (!profile || !profile.clientId) return false;
  
  // Check if accessing own client data
  if (context.clientId && context.clientId !== profile.clientId) {
    return false;
  }
  
  return true;
}

/**
 * Get scope filters for database queries
 * Returns filters to apply based on user role and scope
 */
export function getScopeFilters(user, resource) {
  if (!user || !user.role) return null;
  
  // Admin has no scope restrictions
  if (user.role === ROLES.ADMIN) {
    return null;
  }
  
  // Manager filters
  if (user.role === ROLES.MANAGER) {
    const profile = user.profile;
    if (!profile) return null;
    
    const assignedClients = profile.assignedClients 
      ? (typeof profile.assignedClients === 'string' 
          ? JSON.parse(profile.assignedClients) 
          : profile.assignedClients)
      : [];
      
    const assignedSites = profile.assignedSites 
      ? (typeof profile.assignedSites === 'string' 
          ? JSON.parse(profile.assignedSites) 
          : profile.assignedSites)
      : [];
    
    return {
      clientIds: assignedClients,
      siteIds: assignedSites,
    };
  }
  
  // Staff filters - own data only
  if (user.role === ROLES.STAFF) {
    return {
      userId: user.$id,
    };
  }
  
  // Client filters - own client only
  if (user.role === ROLES.CLIENT) {
    const profile = user.profile;
    if (!profile || !profile.clientId) return null;
    
    return {
      clientId: profile.clientId,
    };
  }
  
  return null;
}

/**
 * Permission error class
 */
export class PermissionError extends Error {
  constructor(message = 'Permission denied') {
    super(message);
    this.name = 'PermissionError';
    this.statusCode = 403;
  }
}

/**
 * Require permission middleware
 * Throws error if user doesn't have permission
 */
export function requirePermission(user, resource, permission, context = {}) {
  if (!canAccess(user, resource, permission, context)) {
    throw new PermissionError(
      `You don't have permission to ${permission} ${resource}`
    );
  }
}
