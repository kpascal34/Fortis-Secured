import React from 'react';
import PortalHeader from '../../components/PortalHeader.jsx';
import GlassPanel from '../../components/GlassPanel.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

const AdminDebug = () => {
  const { user, resolvedRole, permissions, memberships } = useAuth();

  const activePermissions = Object.entries(permissions || {})
    .filter(([, allowed]) => Boolean(allowed))
    .map(([permission]) => permission);

  const membershipIds = Array.isArray(memberships)
    ? memberships.map((membership) => membership?.$id).filter(Boolean)
    : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-dark via-night-sky to-night-sky px-4 py-8 text-white">
      <div className="mx-auto max-w-4xl space-y-6">
        <PortalHeader
          eyebrow="Admin"
          title="Authentication Debug"
          description="Review safe authentication metadata for troubleshooting without exposing secrets."
        />

        <GlassPanel className="border-white/10 bg-white/5">
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-white/60">User ID</dt>
              <dd className="font-mono text-sm text-white">{user?.$id || 'Unavailable'}</dd>
            </div>
            <div>
              <dt className="text-sm text-white/60">Email</dt>
              <dd className="text-sm text-white">{user?.email || 'Unavailable'}</dd>
            </div>
            <div>
              <dt className="text-sm text-white/60">Resolved Role</dt>
              <dd className="text-sm text-white capitalize">{resolvedRole || 'Unavailable'}</dd>
            </div>
            <div>
              <dt className="text-sm text-white/60">Membership IDs</dt>
              <dd className="text-sm text-white">{membershipIds.length ? membershipIds.join(', ') : 'None found'}</dd>
            </div>
          </dl>
        </GlassPanel>

        <GlassPanel className="border-white/10 bg-white/5">
          <h2 className="text-lg font-semibold">Active Permissions</h2>
          {activePermissions.length > 0 ? (
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-white/80">
              {activePermissions.map((permission) => (
                <li key={permission}>{permission}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-white/70">No active permissions for the current user context.</p>
          )}
        </GlassPanel>
      </div>
    </div>
  );
};

export default AdminDebug;
