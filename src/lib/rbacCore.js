import { Query } from 'appwrite';
import { databases, config } from './appwrite.js';
import { resolveActor } from './serviceSecurity.js';
import { ROLES as CANONICAL_ROLES, normalizeRole } from './rbac.ts';
import { RESOURCES, PERMISSIONS, hasPermission, canAccess, PermissionError } from './permissions.js';
import { getScope, RESOURCE_TYPES, scopeQueries } from './tenancyScope.js';
import { STATUSES } from './rbacValidation.js';

export class AuthError extends Error {
  constructor(message = 'Authentication required') {
    super(message);
    this.name = 'AuthError';
    this.statusCode = 401;
  }
}

const toRole = (value) => normalizeRole(value || null);

export async function getCurrentUserWithProfile() {
  try {
    return await resolveActor();
  } catch (error) {
    throw new AuthError(error?.message || 'Failed to authenticate');
  }
}

export async function requireAuth() {
  const user = await getCurrentUserWithProfile();
  if (!user?.$id) {
    throw new AuthError('Authentication required');
  }
  return user;
}

export async function requireRole(allowedRoles, actor = null) {
  const user = actor?.$id ? actor : await requireAuth();
  const allowed = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  const normalizedAllowed = allowed.map((role) => toRole(role));
  const userRole = toRole(user?.role);

  if (!userRole || !normalizedAllowed.includes(userRole)) {
    throw new PermissionError(`This action requires one of the following roles: ${allowed.join(', ')}`);
  }

  return user;
}

export async function requireScope(resource, permission, context = {}, actor = null) {
  const user = actor?.$id ? actor : await requireAuth();

  if (!canAccess(user, resource, permission, context)) {
    throw new PermissionError(`You don't have access to this ${resource}`);
  }

  return user;
}

export function userHasPermission(user, resource, permission) {
  if (!user?.role) return false;
  return hasPermission(user.role, resource, permission);
}

export function userCanAccess(user, resource, permission, context = {}) {
  if (!user?.role) return false;
  return canAccess(user, resource, permission, context);
}

const toTenancyResourceType = (resource) => {
  switch (resource) {
    case RESOURCES.CLIENTS:
      return RESOURCE_TYPES.CLIENTS;
    case RESOURCES.SITES:
      return RESOURCE_TYPES.SITES;
    case RESOURCES.SHIFTS:
      return RESOURCE_TYPES.SHIFTS;
    case RESOURCES.AUDIT_LOGS:
      return RESOURCE_TYPES.AUDIT_LOGS;
    case RESOURCES.APPLICATIONS:
      return RESOURCE_TYPES.APPLICATIONS;
    case RESOURCES.COMPLIANCE:
      return RESOURCE_TYPES.STAFF_COMPLIANCE;
    default:
      return null;
  }
};

export function applyScopeToQuery(user, resource, existingQueries = []) {
  const type = toTenancyResourceType(resource);
  if (!type) return existingQueries;

  const scope = getScope(user, user?.profile || {});
  return [...existingQueries, ...scopeQueries(type, scope)];
}

export async function updateLastLogin(userId) {
  if (!userId || !databases || !config.databaseId || !config.usersCollectionId) return;

  try {
    const response = await databases.listDocuments(config.databaseId, config.usersCollectionId, [
      Query.equal('externalId', userId),
      Query.limit(1),
    ]);

    if (response.documents.length > 0) {
      await databases.updateDocument(config.databaseId, config.usersCollectionId, response.documents[0].$id, {
        lastLoginAt: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error('Failed to update last login:', error);
  }
}

export function isUserActive(user) {
  return user?.status === STATUSES.ACTIVE;
}

export function isAdmin(user) {
  return toRole(user?.role) === CANONICAL_ROLES.ADMIN;
}

export function isManager(user) {
  return toRole(user?.role) === CANONICAL_ROLES.MANAGER;
}

export function isStaff(user) {
  return toRole(user?.role) === CANONICAL_ROLES.STAFF;
}

export function isClient(user) {
  return toRole(user?.role) === CANONICAL_ROLES.CLIENT;
}

export const ROLES = CANONICAL_ROLES;
export { STATUSES, RESOURCES, PERMISSIONS };
