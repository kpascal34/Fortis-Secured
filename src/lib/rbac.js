/**
 * Role-Based Access Control (RBAC)
 * Manages user roles, permissions, and access control
 */

// System roles
export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  MANAGER: 'manager',
  SUPERVISOR: 'supervisor',
  GUARD: 'guard',
  CLIENT: 'client',
  READONLY: 'readonly',
};

// Permission categories
export const PERMISSIONS = {
  // User Management
  USERS_VIEW: 'users:view',
  USERS_CREATE: 'users:create',
  USERS_EDIT: 'users:edit',
  USERS_DELETE: 'users:delete',
  USERS_ROLES: 'users:roles',
  
  // Schedule Management
  SCHEDULE_VIEW: 'schedule:view',
  SCHEDULE_VIEW_ALL: 'schedule:view_all',
  SCHEDULE_CREATE: 'schedule:create',
  SCHEDULE_EDIT: 'schedule:edit',
  SCHEDULE_DELETE: 'schedule:delete',
  SCHEDULE_PUBLISH: 'schedule:publish',
  SCHEDULE_ASSIGN: 'schedule:assign',
  SCHEDULE_BULK: 'schedule:bulk',
  
  // Guard Management
  GUARDS_VIEW: 'guards:view',
  GUARDS_CREATE: 'guards:create',
  GUARDS_EDIT: 'guards:edit',
  GUARDS_DELETE: 'guards:delete',
  GUARDS_COMPLIANCE: 'guards:compliance',
  
  // Client/Site Management
  CLIENTS_VIEW: 'clients:view',
  CLIENTS_CREATE: 'clients:create',
  CLIENTS_EDIT: 'clients:edit',
  CLIENTS_DELETE: 'clients:delete',
  SITES_VIEW: 'sites:view',
  SITES_CREATE: 'sites:create',
  SITES_EDIT: 'sites:edit',
  SITES_DELETE: 'sites:delete',
  
  // Financial
  FINANCE_VIEW: 'finance:view',
  FINANCE_CREATE: 'finance:create',
  FINANCE_EDIT: 'finance:edit',
  FINANCE_APPROVE: 'finance:approve',
  PAYROLL_VIEW: 'payroll:view',
  PAYROLL_PROCESS: 'payroll:process',
  PAYROLL_APPROVE: 'payroll:approve',
  
  // Incidents
  INCIDENTS_VIEW: 'incidents:view',
  INCIDENTS_VIEW_ALL: 'incidents:view_all',
  INCIDENTS_CREATE: 'incidents:create',
  INCIDENTS_EDIT: 'incidents:edit',
  INCIDENTS_DELETE: 'incidents:delete',
  
  // Reports
  REPORTS_VIEW: 'reports:view',
  REPORTS_EXPORT: 'reports:export',
  REPORTS_FINANCIAL: 'reports:financial',
  
  // Audit Logs
  AUDIT_VIEW: 'audit:view',
  AUDIT_EXPORT: 'audit:export',
  
  // Settings
  SETTINGS_VIEW: 'settings:view',
  SETTINGS_EDIT: 'settings:edit',
  SETTINGS_SYSTEM: 'settings:system',
  
  // Data Operations
  DATA_EXPORT: 'data:export',
  DATA_IMPORT: 'data:import',
  DATA_DELETE: 'data:delete',
};

// Role-Permission mapping
export const ROLE_PERMISSIONS = {
  [ROLES.SUPER_ADMIN]: Object.values(PERMISSIONS), // All permissions
  
  [ROLES.ADMIN]: [
    PERMISSIONS.USERS_VIEW,
    PERMISSIONS.USERS_CREATE,
    PERMISSIONS.USERS_EDIT,
    PERMISSIONS.USERS_ROLES,
    PERMISSIONS.SCHEDULE_VIEW_ALL,
    PERMISSIONS.SCHEDULE_CREATE,
    PERMISSIONS.SCHEDULE_EDIT,
    PERMISSIONS.SCHEDULE_DELETE,
    PERMISSIONS.SCHEDULE_PUBLISH,
    PERMISSIONS.SCHEDULE_ASSIGN,
    PERMISSIONS.SCHEDULE_BULK,
    PERMISSIONS.GUARDS_VIEW,
    PERMISSIONS.GUARDS_CREATE,
    PERMISSIONS.GUARDS_EDIT,
    PERMISSIONS.GUARDS_COMPLIANCE,
    PERMISSIONS.CLIENTS_VIEW,
    PERMISSIONS.CLIENTS_CREATE,
    PERMISSIONS.CLIENTS_EDIT,
    PERMISSIONS.SITES_VIEW,
    PERMISSIONS.SITES_CREATE,
    PERMISSIONS.SITES_EDIT,
    PERMISSIONS.FINANCE_VIEW,
    PERMISSIONS.FINANCE_CREATE,
    PERMISSIONS.FINANCE_EDIT,
    PERMISSIONS.FINANCE_APPROVE,
    PERMISSIONS.PAYROLL_VIEW,
    PERMISSIONS.PAYROLL_PROCESS,
    PERMISSIONS.PAYROLL_APPROVE,
    PERMISSIONS.INCIDENTS_VIEW_ALL,
    PERMISSIONS.INCIDENTS_CREATE,
    PERMISSIONS.INCIDENTS_EDIT,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.REPORTS_EXPORT,
    PERMISSIONS.REPORTS_FINANCIAL,
    PERMISSIONS.AUDIT_VIEW,
    PERMISSIONS.AUDIT_EXPORT,
    PERMISSIONS.SETTINGS_VIEW,
    PERMISSIONS.SETTINGS_EDIT,
    PERMISSIONS.DATA_EXPORT,
    PERMISSIONS.DATA_IMPORT,
  ],
  
  [ROLES.MANAGER]: [
    PERMISSIONS.USERS_VIEW,
    PERMISSIONS.SCHEDULE_VIEW_ALL,
    PERMISSIONS.SCHEDULE_CREATE,
    PERMISSIONS.SCHEDULE_EDIT,
    PERMISSIONS.SCHEDULE_PUBLISH,
    PERMISSIONS.SCHEDULE_ASSIGN,
    PERMISSIONS.GUARDS_VIEW,
    PERMISSIONS.GUARDS_EDIT,
    PERMISSIONS.GUARDS_COMPLIANCE,
    PERMISSIONS.CLIENTS_VIEW,
    PERMISSIONS.CLIENTS_EDIT,
    PERMISSIONS.SITES_VIEW,
    PERMISSIONS.SITES_EDIT,
    PERMISSIONS.FINANCE_VIEW,
    PERMISSIONS.PAYROLL_VIEW,
    PERMISSIONS.INCIDENTS_VIEW_ALL,
    PERMISSIONS.INCIDENTS_CREATE,
    PERMISSIONS.INCIDENTS_EDIT,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.REPORTS_EXPORT,
    PERMISSIONS.SETTINGS_VIEW,
    PERMISSIONS.DATA_EXPORT,
  ],
  
  [ROLES.SUPERVISOR]: [
    PERMISSIONS.SCHEDULE_VIEW_ALL,
    PERMISSIONS.SCHEDULE_EDIT,
    PERMISSIONS.SCHEDULE_ASSIGN,
    PERMISSIONS.GUARDS_VIEW,
    PERMISSIONS.GUARDS_EDIT,
    PERMISSIONS.SITES_VIEW,
    PERMISSIONS.INCIDENTS_VIEW_ALL,
    PERMISSIONS.INCIDENTS_CREATE,
    PERMISSIONS.INCIDENTS_EDIT,
    PERMISSIONS.REPORTS_VIEW,
  ],
  
  [ROLES.GUARD]: [
    PERMISSIONS.SCHEDULE_VIEW, // Own schedule only
    PERMISSIONS.GUARDS_VIEW, // Own profile only
    PERMISSIONS.INCIDENTS_VIEW, // Own incidents only
    PERMISSIONS.INCIDENTS_CREATE,
  ],
  
  [ROLES.CLIENT]: [
    PERMISSIONS.SCHEDULE_VIEW, // Own sites only
    PERMISSIONS.SITES_VIEW, // Own sites only
    PERMISSIONS.INCIDENTS_VIEW, // Own sites only
    PERMISSIONS.REPORTS_VIEW, // Own sites only
  ],
  
  [ROLES.READONLY]: [
    PERMISSIONS.SCHEDULE_VIEW_ALL,
    PERMISSIONS.GUARDS_VIEW,
    PERMISSIONS.CLIENTS_VIEW,
    PERMISSIONS.SITES_VIEW,
    PERMISSIONS.INCIDENTS_VIEW_ALL,
    PERMISSIONS.REPORTS_VIEW,
  ],
};

/**
 * Check if user has specific permission
 * @param {Object} user - User object with role
 * @param {string} permission - Permission to check
 * @returns {boolean} Has permission
 */
export const hasPermission = (user, permission) => {
  if (!user || !user.role) return false;
  
  const role = user.role;
  const rolePermissions = ROLE_PERMISSIONS[role] || [];
  
  return rolePermissions.includes(permission);
};

/**
 * Check if user has any of the specified permissions
 * @param {Object} user - User object
 * @param {Array} permissions - Array of permissions
 * @returns {boolean} Has any permission
 */
export const hasAnyPermission = (user, permissions) => {
  return permissions.some(permission => hasPermission(user, permission));
};

/**
 * Check if user has all specified permissions
 * @param {Object} user - User object
 * @param {Array} permissions - Array of permissions
 * @returns {boolean} Has all permissions
 */
export const hasAllPermissions = (user, permissions) => {
  return permissions.every(permission => hasPermission(user, permission));
};

/**
 * Get all permissions for a user's role
 * @param {Object} user - User object
 * @returns {Array} List of permissions
 */
export const getUserPermissions = (user) => {
  if (!user || !user.role) return [];
  return ROLE_PERMISSIONS[user.role] || [];
};

/**
 * Check if user can access resource
 * @param {Object} user - User object
 * @param {string} resource - Resource type
 * @param {string} action - Action (view, create, edit, delete)
 * @param {Object} resourceData - Resource data for ownership check
 * @returns {boolean} Can access
 */
export const canAccess = (user, resource, action, resourceData = null) => {
  if (!user) return false;
  
  const permission = `${resource}:${action}`;
  
  // Check basic permission
  if (!hasPermission(user, permission)) {
    // Check for view_all variant
    if (action === 'view' && hasPermission(user, `${resource}:view_all`)) {
      return true;
    }
    return false;
  }
  
  // Additional ownership checks for guards and clients
  if (user.role === ROLES.GUARD && resourceData) {
    // Guards can only access their own data
    if (resource === 'schedule' && resourceData.guardId !== user.$id) return false;
    if (resource === 'guards' && resourceData.$id !== user.$id) return false;
    if (resource === 'incidents' && resourceData.guardId !== user.$id) return false;
  }
  
  if (user.role === ROLES.CLIENT && resourceData) {
    // Clients can only access their own sites
    if (resource === 'schedule' && resourceData.clientId !== user.$id) return false;
    if (resource === 'sites' && resourceData.clientId !== user.$id) return false;
    if (resource === 'incidents' && resourceData.clientId !== user.$id) return false;
  }
  
  return true;
};

/**
 * Filter data based on user access level
 * @param {Object} user - User object
 * @param {Array} data - Data to filter
 * @param {string} resource - Resource type
 * @returns {Array} Filtered data
 */
export const filterByAccess = (user, data, resource) => {
  if (!user || !data) return [];
  
  // Admins and managers see everything
  if ([ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER, ROLES.SUPERVISOR, ROLES.READONLY].includes(user.role)) {
    return data;
  }
  
  // Guards see only their own data
  if (user.role === ROLES.GUARD) {
    return data.filter(item => {
      if (resource === 'schedule') return item.guardId === user.$id;
      if (resource === 'guards') return item.$id === user.$id;
      if (resource === 'incidents') return item.guardId === user.$id;
      return false;
    });
  }
  
  // Clients see only their sites
  if (user.role === ROLES.CLIENT) {
    return data.filter(item => {
      if (resource === 'schedule') return item.clientId === user.$id;
      if (resource === 'sites') return item.clientId === user.$id;
      if (resource === 'incidents') return item.clientId === user.$id;
      return false;
    });
  }
  
  return [];
};

/**
 * Get accessible navigation items for user
 * @param {Object} user - User object
 * @returns {Array} Navigation items
 */
export const getAccessibleNavigation = (user) => {
  if (!user) return [];
  
  const nav = [];
  
  // Dashboard - all roles
  nav.push({ name: 'Dashboard', href: '/portal', permission: null });
  
  // Clients/CRM
  if (hasPermission(user, PERMISSIONS.CLIENTS_VIEW)) {
    nav.push({ name: 'Clients / CRM', href: '/portal/clients' });
  }
  
  // Scheduling
  if (hasAnyPermission(user, [PERMISSIONS.SCHEDULE_VIEW, PERMISSIONS.SCHEDULE_VIEW_ALL])) {
    nav.push({ name: 'Scheduling', href: '/portal/scheduling' });
  }
  
  // My Schedule (Guards)
  if (user.role === ROLES.GUARD) {
    nav.push({ name: 'My Schedule', href: '/portal/my-schedule' });
  }
  
  // Open Shifts (Guards)
  if (user.role === ROLES.GUARD) {
    nav.push({ name: 'Open Shifts', href: '/portal/open-shifts' });
  }
  
  // Sites
  if (hasPermission(user, PERMISSIONS.SITES_VIEW)) {
    nav.push({ name: 'Sites', href: '/portal/sites' });
  }
  
  // Guards
  if (hasPermission(user, PERMISSIONS.GUARDS_VIEW)) {
    nav.push({ name: 'Guards', href: '/portal/guards' });
  }
  
  // Time Tracking
  if (hasAnyPermission(user, [PERMISSIONS.SCHEDULE_VIEW, PERMISSIONS.SCHEDULE_VIEW_ALL])) {
    nav.push({ name: 'Time Tracking', href: '/portal/time' });
  }
  
  // Incidents
  if (hasAnyPermission(user, [PERMISSIONS.INCIDENTS_VIEW, PERMISSIONS.INCIDENTS_VIEW_ALL])) {
    nav.push({ name: 'Incidents', href: '/portal/incidents' });
  }
  
  // Finance
  if (hasPermission(user, PERMISSIONS.FINANCE_VIEW)) {
    nav.push({ name: 'Invoices & Financial', href: '/portal/finance' });
  }
  
  // HR & Compliance
  if (hasPermission(user, PERMISSIONS.GUARDS_COMPLIANCE)) {
    nav.push({ name: 'HR & Compliance', href: '/portal/hr' });
  }
  
  // Payroll
  if (hasPermission(user, PERMISSIONS.PAYROLL_VIEW)) {
    nav.push({ name: 'Payroll', href: '/portal/payroll' });
  }
  
  // Reports
  if (hasPermission(user, PERMISSIONS.REPORTS_VIEW)) {
    nav.push({ name: 'Reports', href: '/portal/reports' });
  }
  
  // Audit Log
  if (hasPermission(user, PERMISSIONS.AUDIT_VIEW)) {
    nav.push({ name: 'Audit Log', href: '/portal/audit' });
  }
  
  // AI Assistant
  if (hasAnyPermission(user, [PERMISSIONS.SCHEDULE_VIEW_ALL, PERMISSIONS.REPORTS_VIEW])) {
    nav.push({ name: 'AI Assistant', href: '/portal/ai' });
  }
  
  // User Management
  if (hasPermission(user, PERMISSIONS.USERS_VIEW)) {
    nav.push({ name: 'User Management', href: '/portal/users' });
  }
  
  // Settings
  if (hasPermission(user, PERMISSIONS.SETTINGS_VIEW)) {
    nav.push({ name: 'Settings', href: '/portal/settings' });
  }
  
  // Client Portal (Clients only)
  if (user.role === ROLES.CLIENT) {
    nav.push({ name: 'My Schedule', href: '/portal/client-portal' });
  }
  
  return nav;
};

/**
 * Check if action requires elevated permissions
 * @param {string} action - Action identifier
 * @returns {boolean} Requires elevation
 */
export const requiresElevation = (action) => {
  const criticalActions = [
    PERMISSIONS.USERS_DELETE,
    PERMISSIONS.USERS_ROLES,
    PERMISSIONS.SCHEDULE_DELETE,
    PERMISSIONS.GUARDS_DELETE,
    PERMISSIONS.FINANCE_APPROVE,
    PERMISSIONS.PAYROLL_APPROVE,
    PERMISSIONS.SETTINGS_SYSTEM,
    PERMISSIONS.DATA_DELETE,
  ];
  
  return criticalActions.includes(action);
};

/**
 * Audit access attempt
 * @param {Object} user - User object
 * @param {string} resource - Resource accessed
 * @param {string} action - Action attempted
 * @param {boolean} granted - Whether access was granted
 */
export const auditAccess = async (user, resource, action, granted) => {
  const { createAuditLog, AUDIT_CATEGORY, AUDIT_ACTION } = await import('./auditLog');
  
  if (!granted) {
    await createAuditLog({
      category: AUDIT_CATEGORY.ACCESS_CONTROL,
      action: AUDIT_ACTION.ACCESS_DENIED,
      severity: 'security',
      status: 'failure',
      description: `Access denied for ${user.name || user.email} to ${resource}:${action}`,
      metadata: {
        userId: user.$id,
        role: user.role,
        resource,
        action,
      },
    });
  }
};

/**
 * Create default admin user
 */
export const getDefaultAdminUser = () => ({
  $id: 'admin-1',
  email: 'admin@fortissecured.com',
  name: 'Admin User',
  role: ROLES.ADMIN,
});

/**
 * Create demo users for testing
 */
export const getDemoUsers = () => ([
  {
    $id: 'admin-1',
    email: 'admin@fortissecured.com',
    name: 'Admin User',
    role: ROLES.ADMIN,
  },
  {
    $id: 'manager-1',
    email: 'manager@fortissecured.com',
    name: 'Manager User',
    role: ROLES.MANAGER,
  },
  {
    $id: 'guard-1',
    email: 'guard@fortissecured.com',
    name: 'Guard User',
    role: ROLES.GUARD,
  },
  {
    $id: 'client-1',
    email: 'client@example.com',
    name: 'Client User',
    role: ROLES.CLIENT,
  },
]);

export default {
  ROLES,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  getUserPermissions,
  canAccess,
  filterByAccess,
  getAccessibleNavigation,
  requiresElevation,
  auditAccess,
  getDefaultAdminUser,
  getDemoUsers,
};
