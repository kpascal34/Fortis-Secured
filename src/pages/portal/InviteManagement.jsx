import React, { useState, useEffect } from 'react';
import GlassPanel from '../../components/GlassPanel.jsx';
import PortalHeader from '../../components/PortalHeader.jsx';
import { useCurrentUser, useRole } from '../../hooks/useRBAC';
import { createStaffInvite } from '../../services/staffInviteService.js';
import { databases, config } from '../../lib/appwrite.js';
import { Query } from 'appwrite';

const InviteManagement = () => {
  const { user, loading: userLoading } = useCurrentUser();
  const { isAdmin, loading: roleLoading } = useRole();
  const [email, setEmail] = useState('');
  const [expiresInDays, setExpiresInDays] = useState(30);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [invites, setInvites] = useState([]);
  const [loadingInvites, setLoadingInvites] = useState(true);
  const [resending, setResending] = useState(null);

  const loadInvites = async () => {
    try {
      setLoadingInvites(true);
      const response = await databases.listDocuments(
        config.databaseId,
        import.meta.env.VITE_APPWRITE_STAFF_INVITES_COLLECTION_ID,
        [Query.orderDesc('createdAt'), Query.limit(50)]
      );
      setInvites(response.documents);
    } catch (err) {
      console.error('Failed to load invites:', err);
    } finally {
      setLoadingInvites(false);
    }
  };

  useEffect(() => {
    if (user && isAdmin) {
      loadInvites();
    }
  }, [user, isAdmin]);

  const handleResend = async (invite) => {
    try {
      setResending(invite.$id);
      const signupUrl = `${window.location.origin}/signup?code=${invite.code}`;
      
      const response = await fetch('/api/send-invite-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: invite.email,
          inviteCode: invite.code,
          signupUrl,
        }),
      });

      if (response.ok) {
        alert('Invite email resent successfully!');
      } else {
        throw new Error('Failed to resend email');
      }
    } catch (err) {
      console.error('Failed to resend invite:', err);
      alert('Failed to resend invite email: ' + err.message);
    } finally {
      setResending(null);
    }
  };

  const getStatusColor = (status, expiresAt) => {
    if (status === 'used') return 'text-gray-400';
    if (status === 'expired' || new Date(expiresAt) < new Date()) return 'text-red-400';
    return 'text-green-400';
  };

  const getStatusLabel = (status, expiresAt) => {
    if (status === 'used') return 'Used';
    if (status === 'expired' || new Date(expiresAt) < new Date()) return 'Expired';
    return 'Active';
  };

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
      loadInvites(); // Reload the list
    } catch (err) {
      console.error('Failed to create invite:', err);
      setError(err.message || 'Failed to create invite');
    } finally {
      setLoading(false);
    }
  };

  // Show loading state while checking auth
  if (userLoading || roleLoading) {
    return (
      <div className="min-h-screen bg-night-sky p-6 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-accent border-t-transparent mx-auto"></div>
          <p className="text-white/70">Loading...</p>
        </div>
      </div>
    );
  }

  // Show login prompt if no user
  if (!user) {
    return (
      <div className="min-h-screen bg-night-sky p-6 text-white">
        <GlassPanel className="bg-white/5 border-white/10">
          <p className="text-yellow-200">Please log in to access this page.</p>
        </GlassPanel>
      </div>
    );
  }

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

        <GlassPanel className="border-white/10 bg-[#1a1f2e] backdrop-blur-md">
          <form className="space-y-4" onSubmit={handleCreate}>
            <div>
              <label className="block text-sm text-white/80">Staff email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-lg bg-[#0f1419] px-3 py-3 text-white outline-none ring-1 ring-white/20 focus:ring-accent"
              />
            </div>
            <div>
              <label className="block text-sm text-white/80">Expiry (days)</label>
              <input
                type="number"
                min={1}
                value={expiresInDays}
                onChange={(e) => setExpiresInDays(e.target.value)}
                className="mt-1 w-full rounded-lg bg-[#0f1419] px-3 py-3 text-white outline-none ring-1 ring-white/20 focus:ring-accent"
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

        {/* Existing Invites List */}
        <div className="mt-8">
          <h2 className="text-2xl font-bold mb-4">Existing Invites</h2>
          
          {loadingInvites ? (
            <GlassPanel className="border-white/10 bg-[#1a1f2e] backdrop-blur-md">
              <p className="text-white/70 text-center py-8">Loading invites...</p>
            </GlassPanel>
          ) : invites.length === 0 ? (
            <GlassPanel className="border-white/10 bg-[#1a1f2e] backdrop-blur-md">
              <p className="text-white/70 text-center py-8">No invites created yet.</p>
            </GlassPanel>
          ) : (
            <GlassPanel className="border-white/10 bg-[#1a1f2e] backdrop-blur-md">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-3 px-4 text-white/80 font-semibold">Email</th>
                      <th className="text-left py-3 px-4 text-white/80 font-semibold">Code</th>
                      <th className="text-left py-3 px-4 text-white/80 font-semibold">Status</th>
                      <th className="text-left py-3 px-4 text-white/80 font-semibold">Expires</th>
                      <th className="text-left py-3 px-4 text-white/80 font-semibold">Created</th>
                      <th className="text-right py-3 px-4 text-white/80 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invites.map((invite) => {
                      const status = getStatusLabel(invite.status, invite.expiresAt);
                      const statusColor = getStatusColor(invite.status, invite.expiresAt);
                      
                      return (
                        <tr key={invite.$id} className="border-b border-white/5 hover:bg-white/5">
                          <td className="py-3 px-4 text-white">{invite.email}</td>
                          <td className="py-3 px-4">
                            <code className="text-sm bg-white/10 px-2 py-1 rounded text-white/90">
                              {invite.code}
                            </code>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`text-sm font-semibold ${statusColor}`}>
                              {status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-white/70 text-sm">
                            {new Date(invite.expiresAt).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4 text-white/70 text-sm">
                            {new Date(invite.createdAt).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {status === 'Active' && (
                              <button
                                onClick={() => handleResend(invite)}
                                disabled={resending === invite.$id}
                                className="text-sm bg-accent/20 hover:bg-accent/30 text-accent px-3 py-1 rounded transition-colors disabled:opacity-50"
                              >
                                {resending === invite.$id ? 'Sending...' : 'Resend'}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </GlassPanel>
          )}
        </div>
      </div>
    </div>
  );
};

export default InviteManagement;
