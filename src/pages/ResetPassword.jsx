import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import GlassPanel from '../components/GlassPanel.jsx';
import PageHeader from '../components/PageHeader.jsx';
import { account } from '../lib/appwrite.js';

const ResetPassword = () => {
  const [userId, setUserId] = useState('');
  const [secret, setSecret] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);

  const { token } = useParams();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    let uid = params.get('userId') || '';
    let sec = params.get('secret') || '';

    // Legacy path-style token support: attempt to parse into userId + secret
    if ((!uid || !sec) && token) {
      // Try base64 JSON: eyJ1c2VySWQiOiAi...", "secret": "..."}
      try {
        const json = JSON.parse(atob(token));
        uid = json.userId || uid;
        sec = json.secret || sec;
      } catch (_) {
        // Try delimited formats: userId.secret or userId:secret
        const parts = token.split(/[:.]/);
        if (parts.length === 2) {
          uid = parts[0];
          sec = parts[1];
        }
      }
    }

    setUserId(uid || '');
    setSecret(sec || '');
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!userId || !secret) {
      setError('Missing recovery parameters. Please use the link from your email.');
      return;
    }
    if (!password || password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setLoading(true);
      await account.updateRecovery(userId, secret, password, confirm);
      setSuccess('Password reset successful. You can now log in.');
    } catch (err) {
      console.error('Password reset failed:', err);
      setError(err.message || 'Password reset failed. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-dark via-night-sky to-night-sky px-4 py-8 text-white">
      <div className="mx-auto max-w-xl">
        <PageHeader
          eyebrow="Account Recovery"
          title="Reset Password"
          description="Enter a new password to regain access to your account."
        />

        <GlassPanel className="border-white/10 bg-[#1a1f2e] backdrop-blur-md">
          {error && (
            <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>
          )}
          {success && (
            <div className="mb-4 rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-200">{success}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-white/80">New password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-lg bg-[#0f1419] px-3 py-3 text-white outline-none ring-1 ring-white/20 focus:ring-accent"
              />
            </div>
            <div>
              <label className="block text-sm text-white/80">Confirm password</label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="mt-1 w-full rounded-lg bg-[#0f1419] px-3 py-3 text-white outline-none ring-1 ring-white/20 focus:ring-accent"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-accent px-4 py-3 font-semibold text-night-sky"
            >
              {loading ? 'Resetting…' : 'Reset Password'}
            </button>
          </form>
        </GlassPanel>

        <p className="mt-4 text-sm text-white/60">Trouble? Request a new link from the <a className="text-accent" href="/forgot-password">Forgot Password</a> page.</p>
      </div>
    </div>
  );
};

export default ResetPassword;
