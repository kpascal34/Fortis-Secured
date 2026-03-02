// Legacy RBAC compatibility shim.
// Canonical RBAC authority is src/lib/rbac.ts.

import { ROLES, PERMISSIONS, hasPermission, assertPermission, getPermissions, can } from './rbac.ts';

export { ROLES, PERMISSIONS, hasPermission, assertPermission, getPermissions, can };

export const ROLE_PERMISSIONS = {};

export const hasAnyPermission = (user, permissions) =>
  permissions.some((permission) => hasPermission(user?.role || null, permission));

export const hasAllPermissions = (user, permissions) =>
  permissions.every((permission) => hasPermission(user?.role || null, permission));

export const getUserPermissions = (user) => getPermissions(user?.role || null);

export const canAccess = (user, resource, action) => {
  const legacyPermission = `${resource}:${action}`;
  return can(legacyPermission, { role: user?.role, resolvedRole: user?.role, permissions: user?.permissions || {} });
};
