import { ROLES as ROLE_ENUM, PERMISSIONS as PORTAL_PERMISSIONS, hasPermission as hasPortalPermission } from './rbac.ts';
import { getScope } from './tenancyScope.js';

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
  COMPLIANCE: 'compliance',
  INVITES: 'invites',
  APPLICATIONS: 'applications',
};

export const PERMISSIONS = {
  CREATE: 'create',
  READ: 'read',
  UPDATE: 'update',
  DELETE: 'delete',
  APPROVE: 'approve',
  ASSIGN: 'assign',
};

const ACTION_PERMISSION_MAP = {
  [`${RESOURCES.USERS}:${PERMISSIONS.READ}`]: PORTAL_PERMISSIONS.MANAGE_USERS,
  [`${RESOURCES.USERS}:${PERMISSIONS.CREATE}`]: PORTAL_PERMISSIONS.MANAGE_USERS,
  [`${RESOURCES.USERS}:${PERMISSIONS.UPDATE}`]: PORTAL_PERMISSIONS.MANAGE_USERS,
  [`${RESOURCES.USERS}:${PERMISSIONS.DELETE}`]: PORTAL_PERMISSIONS.MANAGE_USERS,

  [`${RESOURCES.PROFILES}:${PERMISSIONS.READ}`]: PORTAL_PERMISSIONS.VIEW_PROFILE,
  [`${RESOURCES.PROFILES}:${PERMISSIONS.UPDATE}`]: PORTAL_PERMISSIONS.VIEW_PROFILE,

  [`${RESOURCES.CLIENTS}:${PERMISSIONS.READ}`]: PORTAL_PERMISSIONS.VIEW_CLIENTS,
  [`${RESOURCES.CLIENTS}:${PERMISSIONS.CREATE}`]: PORTAL_PERMISSIONS.MANAGE_CLIENTS,
  [`${RESOURCES.CLIENTS}:${PERMISSIONS.UPDATE}`]: PORTAL_PERMISSIONS.MANAGE_CLIENTS,
  [`${RESOURCES.CLIENTS}:${PERMISSIONS.DELETE}`]: PORTAL_PERMISSIONS.MANAGE_CLIENTS,

  [`${RESOURCES.SITES}:${PERMISSIONS.READ}`]: PORTAL_PERMISSIONS.VIEW_SITES,
  [`${RESOURCES.SITES}:${PERMISSIONS.CREATE}`]: PORTAL_PERMISSIONS.MANAGE_SITES,
  [`${RESOURCES.SITES}:${PERMISSIONS.UPDATE}`]: PORTAL_PERMISSIONS.MANAGE_SITES,
  [`${RESOURCES.SITES}:${PERMISSIONS.DELETE}`]: PORTAL_PERMISSIONS.MANAGE_SITES,

  [`${RESOURCES.GUARDS}:${PERMISSIONS.READ}`]: PORTAL_PERMISSIONS.VIEW_GUARDS,
  [`${RESOURCES.GUARDS}:${PERMISSIONS.CREATE}`]: PORTAL_PERMISSIONS.MANAGE_GUARDS,
  [`${RESOURCES.GUARDS}:${PERMISSIONS.UPDATE}`]: PORTAL_PERMISSIONS.MANAGE_GUARDS,
  [`${RESOURCES.GUARDS}:${PERMISSIONS.DELETE}`]: PORTAL_PERMISSIONS.MANAGE_GUARDS,

  [`${RESOURCES.SHIFTS}:${PERMISSIONS.READ}`]: PORTAL_PERMISSIONS.VIEW_SCHEDULING,
  [`${RESOURCES.SHIFTS}:${PERMISSIONS.CREATE}`]: PORTAL_PERMISSIONS.MANAGE_SHIFTS,
  [`${RESOURCES.SHIFTS}:${PERMISSIONS.UPDATE}`]: PORTAL_PERMISSIONS.MANAGE_SHIFTS,
  [`${RESOURCES.SHIFTS}:${PERMISSIONS.DELETE}`]: PORTAL_PERMISSIONS.MANAGE_SHIFTS,
  [`${RESOURCES.SHIFTS}:${PERMISSIONS.APPROVE}`]: PORTAL_PERMISSIONS.REVIEW_SHIFT_APPLICATIONS,
  [`${RESOURCES.SHIFTS}:${PERMISSIONS.ASSIGN}`]: PORTAL_PERMISSIONS.MANAGE_SHIFTS,

  [`${RESOURCES.APPLICATIONS}:${PERMISSIONS.READ}`]: PORTAL_PERMISSIONS.REVIEW_SHIFT_APPLICATIONS,
  [`${RESOURCES.APPLICATIONS}:${PERMISSIONS.CREATE}`]: PORTAL_PERMISSIONS.APPLY_SHIFT,
  [`${RESOURCES.APPLICATIONS}:${PERMISSIONS.UPDATE}`]: PORTAL_PERMISSIONS.REVIEW_SHIFT_APPLICATIONS,
  [`${RESOURCES.APPLICATIONS}:${PERMISSIONS.APPROVE}`]: PORTAL_PERMISSIONS.REVIEW_SHIFT_APPLICATIONS,

  [`${RESOURCES.INCIDENTS}:${PERMISSIONS.READ}`]: PORTAL_PERMISSIONS.VIEW_INCIDENTS,
  [`${RESOURCES.INCIDENTS}:${PERMISSIONS.CREATE}`]: PORTAL_PERMISSIONS.VIEW_INCIDENTS,
  [`${RESOURCES.INCIDENTS}:${PERMISSIONS.UPDATE}`]: PORTAL_PERMISSIONS.VIEW_INCIDENTS,
  [`${RESOURCES.INCIDENTS}:${PERMISSIONS.DELETE}`]: PORTAL_PERMISSIONS.VIEW_INCIDENTS,

  [`${RESOURCES.ASSETS}:${PERMISSIONS.READ}`]: PORTAL_PERMISSIONS.VIEW_ASSETS,
  [`${RESOURCES.ASSETS}:${PERMISSIONS.CREATE}`]: PORTAL_PERMISSIONS.VIEW_ASSETS,
  [`${RESOURCES.ASSETS}:${PERMISSIONS.UPDATE}`]: PORTAL_PERMISSIONS.VIEW_ASSETS,
  [`${RESOURCES.ASSETS}:${PERMISSIONS.DELETE}`]: PORTAL_PERMISSIONS.VIEW_ASSETS,

  [`${RESOURCES.REPORTS}:${PERMISSIONS.READ}`]: PORTAL_PERMISSIONS.VIEW_REPORTS,
  [`${RESOURCES.AUDIT_LOGS}:${PERMISSIONS.READ}`]: PORTAL_PERMISSIONS.VIEW_AUDIT_LOG,
  [`${RESOURCES.SETTINGS}:${PERMISSIONS.READ}`]: PORTAL_PERMISSIONS.MANAGE_SETTINGS,
  [`${RESOURCES.SETTINGS}:${PERMISSIONS.UPDATE}`]: PORTAL_PERMISSIONS.MANAGE_SETTINGS,
  [`${RESOURCES.COMPLIANCE}:${PERMISSIONS.READ}`]: PORTAL_PERMISSIONS.VIEW_COMPLIANCE,
  [`${RESOURCES.COMPLIANCE}:${PERMISSIONS.UPDATE}`]: PORTAL_PERMISSIONS.MANAGE_COMPLIANCE,
  [`${RESOURCES.COMPLIANCE}:${PERMISSIONS.APPROVE}`]: PORTAL_PERMISSIONS.MANAGE_COMPLIANCE,
  [`${RESOURCES.INVITES}:${PERMISSIONS.CREATE}`]: PORTAL_PERMISSIONS.MANAGE_INVITES,
  [`${RESOURCES.INVITES}:${PERMISSIONS.READ}`]: PORTAL_PERMISSIONS.MANAGE_INVITES,
};

const resolvePortalPermission = (resource, permission) => ACTION_PERMISSION_MAP[`${resource}:${permission}`] || null;

const toRole = (role) => {
  if (!role) return null;
  const normalized = String(role).toLowerCase();
  if (normalized === ROLE_ENUM.ADMIN) return ROLE_ENUM.ADMIN;
  if (normalized === ROLE_ENUM.MANAGER) return ROLE_ENUM.MANAGER;
  if (normalized === ROLE_ENUM.CLIENT || normalized === 'customer') return ROLE_ENUM.CLIENT;
  if (normalized === ROLE_ENUM.STAFF || normalized === 'guard' || normalized === 'employee') return ROLE_ENUM.STAFF;
  return null;
};

const toArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed;
    } catch (_) {
      return value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }
  return [];
};

export function hasPermission(role, resource, permission) {
  const mapped = resolvePortalPermission(resource, permission);
  if (!mapped) return false;
  return hasPortalPermission(toRole(role), mapped);
}

export function hasAnyPermission(role, resource, permissions) {
  return permissions.some((permission) => hasPermission(role, resource, permission));
}

export function hasAllPermissions(role, resource, permissions) {
  return permissions.every((permission) => hasPermission(role, resource, permission));
}

export function getPermissions(role, resource) {
  return Object.values(PERMISSIONS).filter((permission) => hasPermission(role, resource, permission));
}

const clientScopePasses = (scope, context) => {
  if (!context.clientId) return true;
  return String(context.clientId) === String(scope.clientId || '');
};

const managerScopePasses = (scope, context) => {
  if (!context.clientId && !context.siteId) return true;
  const siteIds = toArray(scope.assignedSiteIds);
  const clientIds = toArray(scope.assignedClientIds);

  if (context.siteId && siteIds.includes(context.siteId)) return true;
  if (context.clientId && clientIds.includes(context.clientId)) return true;
  return false;
};

const staffScopePasses = (scope, context) => {
  if (!scope.userId) return false;
  const scopedUserId = context.userId || context.staffId || context.guardId || context.actorId;
  if (!scopedUserId) return true;
  return String(scopedUserId) === String(scope.userId);
};

export function canAccess(user, resource, permission, context = {}) {
  const role = toRole(user?.role);
  if (!role) return false;
  if (!hasPermission(role, resource, permission)) return false;

  if (role === ROLE_ENUM.ADMIN) return true;

  const scope = getScope({ ...user, role }, user?.profile || {});

  if (role === ROLE_ENUM.CLIENT) return clientScopePasses(scope, context);
  if (role === ROLE_ENUM.MANAGER) return managerScopePasses(scope, context);
  return staffScopePasses(scope, context);
}

export function getScopeFilters(user, resource) {
  const role = toRole(user?.role);
  if (!role) return { deny: true };
  if (role === ROLE_ENUM.ADMIN) return null;

  const scope = getScope({ ...user, role }, user?.profile || {});

  if (role === ROLE_ENUM.CLIENT) {
    return {
      clientId: scope.clientId,
      userId: scope.userId,
      resource,
    };
  }

  if (role === ROLE_ENUM.MANAGER) {
    const clientIds = toArray(scope.assignedClientIds);
    const siteIds = toArray(scope.assignedSiteIds);

    if (clientIds.length === 0 && siteIds.length === 0) {
      return { deny: true };
    }

    return {
      clientIds,
      siteIds,
      userId: scope.userId,
      resource,
    };
  }

  return {
    userId: scope.userId,
    staffId: scope.userId,
    guardId: scope.userId,
    actorId: scope.userId,
    resource,
  };
}

export class PermissionError extends Error {
  constructor(message = 'Permission denied') {
    super(message);
    this.name = 'PermissionError';
    this.statusCode = 403;
  }
}

// Compatibility export: authority now lives in src/lib/rbac.ts.
export const PERMISSION_MATRIX = {};
