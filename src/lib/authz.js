export const ROLES = {
  ADMIN: 'admin',
  STAFF: 'staff',
  CLIENT: 'client',
};

export const ACTIONS = {
  DASHBOARD_VIEW: 'dashboard:view',
  PROFILE_VIEW: 'profile:view',
  CLIENTS_VIEW: 'clients:view',
  CLIENTS_MANAGE: 'clients:manage',
  SCHEDULING_VIEW: 'scheduling:view',
  COMPLIANCE_VIEW: 'compliance:view',
  ADMIN_GRADING_VIEW: 'admin-grading:view',
  INVITE_MANAGEMENT_VIEW: 'invite-management:view',
  DRIVE_SYNC_VIEW: 'drive-sync:view',
  AUDIT_LOG_VIEW: 'audit-log:view',
  FINANCE_VIEW: 'finance:view',
  AI_ASSISTANT_VIEW: 'ai-assistant:view',
  USER_MANAGEMENT_VIEW: 'user-management:view',
  PAYROLL_VIEW: 'payroll:view',
  REPORTS_VIEW: 'reports:view',
  ANALYTICS_VIEW: 'analytics:view',
  CLIENT_PORTAL_VIEW: 'client-portal:view',
  SETTINGS_VIEW: 'settings:view',
  DEBUG_AUTH_VIEW: 'debug-auth:view',
};

const ACTION_ROLE_MAP = {
  [ACTIONS.DASHBOARD_VIEW]: [ROLES.ADMIN, ROLES.STAFF, ROLES.CLIENT],
  [ACTIONS.PROFILE_VIEW]: [ROLES.ADMIN, ROLES.STAFF, ROLES.CLIENT],
  [ACTIONS.CLIENTS_VIEW]: [ROLES.ADMIN, ROLES.STAFF],
  [ACTIONS.CLIENTS_MANAGE]: [ROLES.ADMIN],
  [ACTIONS.SCHEDULING_VIEW]: [ROLES.ADMIN, ROLES.STAFF],
  [ACTIONS.COMPLIANCE_VIEW]: [ROLES.ADMIN, ROLES.STAFF],
  [ACTIONS.ADMIN_GRADING_VIEW]: [ROLES.ADMIN],
  [ACTIONS.INVITE_MANAGEMENT_VIEW]: [ROLES.ADMIN],
  [ACTIONS.DRIVE_SYNC_VIEW]: [ROLES.ADMIN],
  [ACTIONS.AUDIT_LOG_VIEW]: [ROLES.ADMIN],
  [ACTIONS.FINANCE_VIEW]: [ROLES.ADMIN],
  [ACTIONS.AI_ASSISTANT_VIEW]: [ROLES.ADMIN],
  [ACTIONS.USER_MANAGEMENT_VIEW]: [ROLES.ADMIN],
  [ACTIONS.PAYROLL_VIEW]: [ROLES.ADMIN],
  [ACTIONS.REPORTS_VIEW]: [ROLES.ADMIN],
  [ACTIONS.ANALYTICS_VIEW]: [ROLES.ADMIN],
  [ACTIONS.CLIENT_PORTAL_VIEW]: [ROLES.CLIENT, ROLES.ADMIN],
  [ACTIONS.SETTINGS_VIEW]: [ROLES.ADMIN],
  [ACTIONS.DEBUG_AUTH_VIEW]: [ROLES.ADMIN],
};

const ROLE_PERMISSION_MAP = {
  [ROLES.ADMIN]: Object.values(ACTIONS),
  [ROLES.STAFF]: [
    ACTIONS.DASHBOARD_VIEW,
    ACTIONS.PROFILE_VIEW,
    ACTIONS.CLIENTS_VIEW,
    ACTIONS.SCHEDULING_VIEW,
    ACTIONS.COMPLIANCE_VIEW,
  ],
  [ROLES.CLIENT]: [ACTIONS.DASHBOARD_VIEW, ACTIONS.PROFILE_VIEW, ACTIONS.CLIENT_PORTAL_VIEW],
};

export const getRolePermissions = (role) => ROLE_PERMISSION_MAP[role] || [];

export const can = (role, action) => {
  if (!role || !action) return false;

  const actionRoles = ACTION_ROLE_MAP[action];
  if (!actionRoles) return false;

  return actionRoles.includes(role);
};

export const getRoleFromAuthData = (appwriteUser, options = {}) => {
  if (!appwriteUser) {
    return {
      role: null,
      source: 'anonymous',
      inputs: {},
    };
  }

  const email = String(appwriteUser.email || '').toLowerCase();
  const labels = Array.isArray(appwriteUser.labels)
    ? appwriteUser.labels.map((label) => String(label).toLowerCase())
    : [];
  const prefsRole = String(appwriteUser?.prefs?.role || '').toLowerCase().trim();
  const prefsPermissions = Array.isArray(appwriteUser?.prefs?.permissions)
    ? appwriteUser.prefs.permissions.map((permission) => String(permission).toLowerCase())
    : [];

  const adminEmails = options.adminEmails || [];
  const internalDomains = options.internalDomains || [];
  const domain = email.split('@')[1] || '';

  let role = ROLES.CLIENT;
  let source = 'default_client';

  if ([ROLES.ADMIN, ROLES.STAFF, ROLES.CLIENT].includes(prefsRole)) {
    role = prefsRole;
    source = 'prefs.role';
  } else if (labels.includes(ROLES.ADMIN) || labels.includes('super_admin')) {
    role = ROLES.ADMIN;
    source = 'labels';
  } else if (labels.includes(ROLES.STAFF) || labels.includes('manager') || labels.includes('guard')) {
    role = ROLES.STAFF;
    source = 'labels';
  } else if (labels.includes(ROLES.CLIENT)) {
    role = ROLES.CLIENT;
    source = 'labels';
  } else if (adminEmails.includes(email)) {
    role = ROLES.ADMIN;
    source = 'admin_email_allowlist';
  } else if (internalDomains.includes(domain)) {
    role = ROLES.STAFF;
    source = 'internal_domain';
  }

  return {
    role,
    source,
    inputs: {
      email,
      domain,
      labels,
      prefsRole: prefsRole || null,
      prefsPermissions,
      jwtClaims: appwriteUser?.prefs?.jwtClaims || null,
    },
  };
};
