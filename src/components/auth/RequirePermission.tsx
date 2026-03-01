import React from 'react';
import AccessDenied from '../AccessDenied.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { can, type PermissionKey } from '../../lib/rbac.ts';

type RequirePermissionProps = {
  permission: PermissionKey;
  children: React.ReactNode;
  fallback?: React.ReactNode;
};

const RequirePermission = ({ permission, children, fallback }: RequirePermissionProps) => {
  const { user, resolvedRole, permissions } = useAuth();
  const allowed = can(permission, {
    role: user?.role,
    resolvedRole,
    permissions,
  });

  if (!allowed) {
    return (
      fallback || (
        <AccessDenied
          title="Access denied"
          message="You do not have permission to view this area. Contact an administrator if this is unexpected."
        />
      )
    );
  }

  return <>{children}</>;
};

export default RequirePermission;
