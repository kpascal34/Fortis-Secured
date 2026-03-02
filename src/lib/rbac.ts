export const ROLES = {
  ADMIN: 'admin',
  ENTITY_ADMIN: 'entity_admin',
  MANAGER: 'manager',
  CLIENT: 'client',
  STAFF: 'staff',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const PERMISSIONS = {
  VIEW_DASHBOARD: 'viewDashboard',
  VIEW_PROFILE: 'viewProfile',
  VIEW_SCHEDULING: 'viewScheduling',
  MANAGE_SHIFTS: 'manageShifts',
  VIEW_RECURRING_PATTERNS: 'viewRecurringPatterns',
  VIEW_MY_SCHEDULE: 'viewMySchedule',
  VIEW_OPEN_SHIFTS: 'viewOpenShifts',
  APPLY_SHIFT: 'applyShift',
  REVIEW_SHIFT_APPLICATIONS: 'reviewShiftApplications',

  VIEW_COMPLIANCE: 'viewCompliance',
  SUBMIT_COMPLIANCE: 'submitCompliance',
  MANAGE_COMPLIANCE: 'manageCompliance',
  MANAGE_INVITES: 'manageInvites',
  VIEW_DRIVE_SYNC: 'viewDriveSync',
  VIEW_AUDIT_LOG: 'viewAuditLog',

  VIEW_CLIENTS: 'viewClients',
  MANAGE_CLIENTS: 'manageClients',
  VIEW_SITES: 'viewSites',
  MANAGE_SITES: 'manageSites',
  VIEW_POSTS: 'viewPosts',
  MANAGE_POSTS: 'managePosts',
  VIEW_GUARDS: 'viewGuards',
  MANAGE_GUARDS: 'manageGuards',
  VIEW_TIME_TRACKING: 'viewTimeTracking',
  VIEW_TASKS: 'viewTasks',
  VIEW_INCIDENTS: 'viewIncidents',
  VIEW_ASSETS: 'viewAssets',
  VIEW_MESSAGES: 'viewMessages',

  VIEW_FINANCE: 'viewFinance',
  USE_AI_ASSISTANT: 'useAiAssistant',
  MANAGE_USERS: 'manageUsers',
  DEBUG_ADMIN: 'debugAdmin',
  VIEW_PAYROLL: 'viewPayroll',
  VIEW_REPORTS: 'viewReports',
  VIEW_ANALYTICS: 'viewAnalytics',
  VIEW_CUSTOMER_PORTAL: 'viewCustomerPortal',
  MANAGE_SETTINGS: 'manageSettings',
  MANAGE_DEPARTMENTS: 'manageDepartments',

  // Legacy aliases still used by existing UI checks
  VIEW_ALL_STAFF: 'viewAllStaff',
  EDIT_COMPLIANCE: 'editCompliance',
  SUBMIT_OWN_COMPLIANCE: 'submitOwnCompliance',
  VIEW_OWN_COMPLIANCE: 'viewOwnCompliance',
} as const;

export type CanonicalPermission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

const LEGACY_PERMISSION_ALIASES = {
  viewAllStaff: PERMISSIONS.VIEW_ALL_STAFF,
  editCompliance: PERMISSIONS.EDIT_COMPLIANCE,
  submitOwnCompliance: PERMISSIONS.SUBMIT_OWN_COMPLIANCE,
  viewOwnCompliance: PERMISSIONS.VIEW_OWN_COMPLIANCE,
  viewCustomerPortal: PERMISSIONS.VIEW_CUSTOMER_PORTAL,
  manageUsers: PERMISSIONS.MANAGE_USERS,
} as const;

export type PermissionKey = CanonicalPermission | keyof typeof LEGACY_PERMISSION_ALIASES;

const allPermissions = Object.values(PERMISSIONS) as CanonicalPermission[];

export const roleGrants: Record<Role, CanonicalPermission[]> = {
  [ROLES.ADMIN]: [...allPermissions],
  [ROLES.ENTITY_ADMIN]: [
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.VIEW_PROFILE,
    PERMISSIONS.VIEW_SCHEDULING,
    PERMISSIONS.MANAGE_SHIFTS,
    PERMISSIONS.VIEW_RECURRING_PATTERNS,
    PERMISSIONS.VIEW_MY_SCHEDULE,
    PERMISSIONS.VIEW_OPEN_SHIFTS,
    PERMISSIONS.REVIEW_SHIFT_APPLICATIONS,
    PERMISSIONS.VIEW_COMPLIANCE,
    PERMISSIONS.MANAGE_COMPLIANCE,
    PERMISSIONS.MANAGE_INVITES,
    PERMISSIONS.VIEW_DRIVE_SYNC,
    PERMISSIONS.VIEW_AUDIT_LOG,
    PERMISSIONS.VIEW_CLIENTS,
    PERMISSIONS.MANAGE_CLIENTS,
    PERMISSIONS.VIEW_SITES,
    PERMISSIONS.MANAGE_SITES,
    PERMISSIONS.VIEW_POSTS,
    PERMISSIONS.MANAGE_POSTS,
    PERMISSIONS.VIEW_GUARDS,
    PERMISSIONS.MANAGE_GUARDS,
    PERMISSIONS.VIEW_TIME_TRACKING,
    PERMISSIONS.VIEW_TASKS,
    PERMISSIONS.VIEW_INCIDENTS,
    PERMISSIONS.VIEW_ASSETS,
    PERMISSIONS.VIEW_MESSAGES,
    PERMISSIONS.VIEW_FINANCE,
    PERMISSIONS.VIEW_PAYROLL,
    PERMISSIONS.VIEW_REPORTS,
    PERMISSIONS.VIEW_ANALYTICS,
    PERMISSIONS.VIEW_CUSTOMER_PORTAL,
    PERMISSIONS.MANAGE_SETTINGS,
    PERMISSIONS.MANAGE_DEPARTMENTS,
    PERMISSIONS.VIEW_ALL_STAFF,
    PERMISSIONS.EDIT_COMPLIANCE,
  ],
  [ROLES.MANAGER]: [
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.VIEW_PROFILE,
    PERMISSIONS.VIEW_SCHEDULING,
    PERMISSIONS.MANAGE_SHIFTS,
    PERMISSIONS.VIEW_RECURRING_PATTERNS,
    PERMISSIONS.VIEW_MY_SCHEDULE,
    PERMISSIONS.VIEW_OPEN_SHIFTS,
    PERMISSIONS.REVIEW_SHIFT_APPLICATIONS,
    PERMISSIONS.VIEW_COMPLIANCE,
    PERMISSIONS.MANAGE_COMPLIANCE,
    PERMISSIONS.VIEW_DRIVE_SYNC,
    PERMISSIONS.VIEW_AUDIT_LOG,
    PERMISSIONS.VIEW_CLIENTS,
    PERMISSIONS.MANAGE_CLIENTS,
    PERMISSIONS.VIEW_SITES,
    PERMISSIONS.MANAGE_SITES,
    PERMISSIONS.VIEW_POSTS,
    PERMISSIONS.MANAGE_POSTS,
    PERMISSIONS.VIEW_GUARDS,
    PERMISSIONS.MANAGE_GUARDS,
    PERMISSIONS.VIEW_TIME_TRACKING,
    PERMISSIONS.VIEW_TASKS,
    PERMISSIONS.VIEW_INCIDENTS,
    PERMISSIONS.VIEW_ASSETS,
    PERMISSIONS.VIEW_MESSAGES,
    PERMISSIONS.VIEW_REPORTS,
    PERMISSIONS.VIEW_ANALYTICS,
    PERMISSIONS.VIEW_ALL_STAFF,
    PERMISSIONS.EDIT_COMPLIANCE,
  ],
  [ROLES.CLIENT]: [
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.VIEW_PROFILE,
    PERMISSIONS.VIEW_CUSTOMER_PORTAL,
    PERMISSIONS.VIEW_CLIENTS,
    PERMISSIONS.VIEW_SITES,
    PERMISSIONS.VIEW_INCIDENTS,
    PERMISSIONS.VIEW_ASSETS,
    PERMISSIONS.VIEW_REPORTS,
  ],
  [ROLES.STAFF]: [
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.VIEW_PROFILE,
    PERMISSIONS.VIEW_SCHEDULING,
    PERMISSIONS.VIEW_MY_SCHEDULE,
    PERMISSIONS.VIEW_OPEN_SHIFTS,
    PERMISSIONS.APPLY_SHIFT,
    PERMISSIONS.VIEW_COMPLIANCE,
    PERMISSIONS.SUBMIT_COMPLIANCE,
    PERMISSIONS.SUBMIT_OWN_COMPLIANCE,
    PERMISSIONS.VIEW_OWN_COMPLIANCE,
    PERMISSIONS.VIEW_MESSAGES,
    PERMISSIONS.VIEW_TIME_TRACKING,
    PERMISSIONS.VIEW_INCIDENTS,
  ],
};

export const PERMISSION_MATRIX = roleGrants;

const ROLE_ALIASES: Record<string, Role> = {
  admin: ROLES.ADMIN,
  entity_admin: ROLES.ENTITY_ADMIN,
  'entity-admin': ROLES.ENTITY_ADMIN,
  entityadmin: ROLES.ENTITY_ADMIN,
  manager: ROLES.MANAGER,
  client: ROLES.CLIENT,
  customer: ROLES.CLIENT,
  staff: ROLES.STAFF,
  guard: ROLES.STAFF,
  employee: ROLES.STAFF,
};

export const normalizeRole = (role?: string | null): Role | null => {
  if (!role) return null;
  return ROLE_ALIASES[String(role).toLowerCase()] || null;
};

const normalizePermission = (permission: PermissionKey): CanonicalPermission | null => {
  if (!permission) return null;
  if ((Object.values(PERMISSIONS) as string[]).includes(permission)) {
    return permission as CanonicalPermission;
  }
  return LEGACY_PERMISSION_ALIASES[permission as keyof typeof LEGACY_PERMISSION_ALIASES] || null;
};

const extractMembershipRoles = (memberships: unknown): Role[] => {
  if (!Array.isArray(memberships)) return [];

  return memberships
    .flatMap((membership) => {
      if (!membership || typeof membership !== 'object') return [];
      const maybeRoles = (membership as Record<string, unknown>).roles;
      if (!Array.isArray(maybeRoles)) return [];
      return maybeRoles
        .map((value) => normalizeRole(String(value || '')))
        .filter((value): value is Role => Boolean(value));
    });
};

export const resolveUserRole = (user: any, memberships: unknown = []): Role => {
  const membershipRoles = extractMembershipRoles(memberships);

  if (membershipRoles.includes(ROLES.ADMIN)) return ROLES.ADMIN;
  if (membershipRoles.includes(ROLES.ENTITY_ADMIN)) return ROLES.ENTITY_ADMIN;
  if (membershipRoles.includes(ROLES.MANAGER)) return ROLES.MANAGER;

  const fromUserRole = normalizeRole(user?.role || user?.prefs?.role);
  if (fromUserRole) return fromUserRole;

  const labels = Array.isArray(user?.labels) ? user.labels : [];
  const labelRole = labels
    .map((value: unknown) => normalizeRole(String(value || '')))
    .find((value: Role | null): value is Role => Boolean(value));
  if (labelRole) return labelRole;

  const email = String(user?.email || '').toLowerCase();
  if (email.includes('@')) {
    const domain = email.split('@')[1];
    if (domain.includes('fortissecured')) return ROLES.STAFF;
  }

  return ROLES.CLIENT;
};

export const hasPermission = (roleOrUser: Role | { role?: string | null } | null | undefined, permission: PermissionKey): boolean => {
  const normalizedPermission = normalizePermission(permission);
  if (!normalizedPermission) return false;

  const role =
    typeof roleOrUser === 'string'
      ? normalizeRole(roleOrUser)
      : normalizeRole(roleOrUser?.role || null);

  if (!role) return false;
  return roleGrants[role].includes(normalizedPermission);
};

export const assertPermission = (
  roleOrUser: Role | { role?: string | null } | null | undefined,
  permission: PermissionKey,
  message = 'Permission denied'
): void => {
  if (!hasPermission(roleOrUser, permission)) {
    throw new Error(message);
  }
};

export const getPermissions = (role: Role | null | undefined): Record<CanonicalPermission, boolean> => {
  const safeRole = role || null;
  return (Object.values(PERMISSIONS) as CanonicalPermission[]).reduce((acc, permission) => {
    acc[permission] = safeRole ? roleGrants[safeRole].includes(permission) : false;
    return acc;
  }, {} as Record<CanonicalPermission, boolean>);
};

export const can = (
  permissionKey: PermissionKey,
  userContext:
    | {
        role?: string | null;
        resolvedRole?: Role | null;
        permissions?: Partial<Record<CanonicalPermission, boolean>>;
      }
    | null
    | undefined
): boolean => {
  if (!userContext) return false;

  const normalizedPermission = normalizePermission(permissionKey);
  if (!normalizedPermission) return false;

  if (userContext.permissions && normalizedPermission in userContext.permissions) {
    return Boolean(userContext.permissions[normalizedPermission]);
  }

  const resolvedRole = userContext.resolvedRole || normalizeRole(userContext.role || null);
  if (!resolvedRole) return false;

  return roleGrants[resolvedRole].includes(normalizedPermission);
};
