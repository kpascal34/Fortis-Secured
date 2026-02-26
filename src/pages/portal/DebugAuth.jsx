import React from 'react';
import PortalHeader from '../../components/PortalHeader';
import { useAuth } from '../../context/AuthContext';

const JsonBlock = ({ title, value }) => (
  <div className="glass-panel p-6">
    <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/70">{title}</h3>
    <pre className="max-h-[420px] overflow-auto rounded-xl border border-white/10 bg-black/30 p-4 text-xs text-green-300">
      {JSON.stringify(value, null, 2)}
    </pre>
  </div>
);

const DebugAuth = () => {
  const { user, role, permissions, authDebug } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-dark via-night-sky to-night-sky px-6 py-10 text-white">
      <div className="mx-auto max-w-7xl space-y-6">
        <PortalHeader
          title="Auth Resolution Debug"
          description="Admin-only troubleshooting view for resolved role/permissions and raw auth payload."
          eyebrow="Authentication"
        />

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="glass-panel p-5">
            <p className="text-sm text-white/70">Resolved Role</p>
            <p className="mt-2 text-2xl font-semibold text-accent">{role || 'none'}</p>
          </div>
          <div className="glass-panel p-5">
            <p className="text-sm text-white/70">Role Source</p>
            <p className="mt-2 text-2xl font-semibold text-white">{authDebug?.roleSource || 'unknown'}</p>
          </div>
          <div className="glass-panel p-5">
            <p className="text-sm text-white/70">Permission Count</p>
            <p className="mt-2 text-2xl font-semibold text-white">{permissions?.length || 0}</p>
          </div>
        </div>

        <JsonBlock title="Resolved auth object" value={{ role, permissions, authDebug }} />
        <JsonBlock title="Raw Appwrite user" value={user} />
      </div>
    </div>
  );
};

export default DebugAuth;
