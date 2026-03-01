export type Role = 'admin' | 'manager' | 'customer' | 'staff';

export const PERMISSION_MATRIX = {
  viewAllStaff: ['admin', 'manager'],
  editCompliance: ['admin', 'manager'],
  submitOwnCompliance: ['staff'],
  viewOwnCompliance: ['staff'],
  viewCustomerPortal: ['customer'],
  manageUsers: ['admin'],
} as const;

export type PermissionKey = keyof typeof PERMISSION_MATRIX;

const ROLE_ALIASES: Record<string, Role> = {
  admin: 'admin',
  manager: 'manager',
  customer: 'customer',
  client: 'customer',
  staff: 'staff',
  guard: 'staff',
  employee: 'staff',
};

const normalizeRole = (role?: string | null): Role | null => {
  if (!role) return null;
  return ROLE_ALIASES[String(role).toLowerCase()] || null;
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

  if (membershipRoles.includes('admin')) return 'admin';
  if (membershipRoles.includes('manager')) return 'manager';

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
    if (domain.includes('fortissecured')) return 'staff';
  }

  return 'customer';
};

export const getPermissions = (role: Role | null | undefined): Record<PermissionKey, boolean> => {
  const safeRole = role || null;
  return (Object.keys(PERMISSION_MATRIX) as PermissionKey[]).reduce((acc, permission) => {
    acc[permission] = safeRole ? PERMISSION_MATRIX[permission].includes(safeRole) : false;
    return acc;
  }, {} as Record<PermissionKey, boolean>);
};

export const can = (
  permissionKey: PermissionKey,
  userContext: { role?: string | null; resolvedRole?: Role | null; permissions?: Partial<Record<PermissionKey, boolean>> } | null | undefined
): boolean => {
  if (!userContext) return false;

  if (userContext.permissions && permissionKey in userContext.permissions) {
    return Boolean(userContext.permissions[permissionKey]);
  }

  const resolvedRole = userContext.resolvedRole || normalizeRole(userContext.role || null);
  if (!resolvedRole) return false;

  return PERMISSION_MATRIX[permissionKey].includes(resolvedRole);
};
