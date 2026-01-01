import React, { useState } from 'react';
import GlassPanel from '../../components/GlassPanel.jsx';
import PortalHeader from '../../components/PortalHeader.jsx';
import { useCurrentUser, useRole } from '../../hooks/useRBAC';
import { createStaffInvite } from '../../services/staffInviteService.js';

const InviteManagement = () => {
  const { user } = useCurrentUser();
  const { isAdmin } = useRole();
  const [email, setEmail] = useState('');
  const [expiresInDays, setExpiresInDays] = useState(30);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleCreate = async (e) => {
    e.preventDefault();
    console.log('Create invite clicked, user:', user);
    
    if (!user?.$id) {
      setError('You must be logged in to create invites');
      return;
    }
    
    if (!email) {
      setError('Email is required');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      setResult(null);
      console.log('Calling createStaffInvite with:', { userId: user.$id, email, expiresInDays });
      const res = await createStaffInvite(user.$id, email, Number(expiresInDays || 30));
      console.log('Invite created:', res);
      setResult(res);
      setEmail('');
    } catch (err) {
      console.error('Failed to create invite:', err);
      setError(err.message || 'Failed to create invite');
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-night-sky p-6 text-white">
        <GlassPanel className="bg-white/5 border-white/10">
          <p className="text-red-200">Admins only.</p>
        </GlassPanel>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-dark via-night-sky to-night-sky px-4 py-8 text-white">
      <div className="mx-auto max-w-4xl">
        <PortalHeader
          eyebrow="Invites"
          title="Staff Invites"
          description="Generate single-use invite codes for staff onboarding."
        />

        {error && <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>}
        {result && (
          <div className="mb-4 rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-200">
            Invite created for {email || result.email || 'user'}.<br />
            Code: <span className="font-mono">{result.inviteCode}</span><br />
            Signup URL: <span className="font-mono break-all">{result.signupUrl}</span>
          </div>
        )}

        <GlassPanel className="border-white/10 bg-white/5">
          <form className="space-y-4" onSubmit={handleCreate}>
            <div>
              <label className="block text-sm text-white/80">Staff email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-lg bg-white/5 px-3 py-3 text-white outline-none ring-1 ring-white/10 focus:ring-accent"
              />
            </div>
            <div>
              <label className="block text-sm text-white/80">Expiry (days)</label>
              <input
                type="number"
                min={1}
                value={expiresInDays}
                onChange={(e) => setExpiresInDays(e.target.value)}
                className="mt-1 w-full rounded-lg bg-white/5 px-3 py-3 text-white outline-none ring-1 ring-white/10 focus:ring-accent"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-accent px-4 py-3 font-semibold text-night-sky"
            >
              {loading ? 'Creating…' : 'Create Invite'}
            </button>
          </form>
        </GlassPanel>
      </div>
    </div>
  );
};

export default InviteManagement;
