import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import GlassPanel from '../components/GlassPanel.jsx';
import PortalHeader from '../components/PortalHeader.jsx';
import { validateInviteCode, signupStaffMember } from '../services/staffInviteService.js';

const StaffSignup = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const code = searchParams.get('code') || '';

  const [invite, setInvite] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({ firstName: '', lastName: '', password: '', confirm: '' });
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    const fetchInvite = async () => {
      if (!code) return;
      try {
        setLoading(true);
        const result = await validateInviteCode(code);
        setInvite(result);
        setError(null);
      } catch (err) {
        setError(err.message || 'Invalid invite code');
        setInvite(null);
      } finally {
        setLoading(false);
      }
    };
    fetchInvite();
  }, [code]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!code) {
      setError('Invite code is required');
      return;
    }
    if (form.password !== form.confirm) {
      setError('Passwords do not match');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const res = await signupStaffMember(code, form.password, form.firstName, form.lastName);
      setSuccess(res);
      setTimeout(() => navigate('/portal'), 1500);
    } catch (err) {
      setError(err.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-dark via-night-sky to-night-sky px-4 py-10 text-white">
      <div className="mx-auto max-w-3xl">
        <PortalHeader
          eyebrow="Staff Onboarding"
          title="Join Fortis Secured"
          description="Invite-only signup. Complete your account to start compliance."
        />

        <GlassPanel className="border-white/10 bg-white/5">
          {!code && (
            <p className="text-red-300">Missing invite code. Please use the link from your invitation.</p>
          )}

          {invite && (
            <div className="mb-6 rounded-lg border border-green-500/30 bg-green-500/10 p-4 text-sm text-green-200">
              <p className="font-semibold">Invite for {invite.email}</p>
              <p className="text-green-100/80">Expires: {new Date(invite.expiresAt).toLocaleString()}</p>
            </div>
          )}

          {error && (
            <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-red-200 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-green-200 text-sm">
              Account created! Username {success.username} · Employee #{success.employeeNumber}. Redirecting…
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm text-white/70">First Name</label>
              <input
                name="firstName"
                value={form.firstName}
                onChange={handleChange}
                className="mt-1 w-full rounded-lg border border-black bg-white px-3 py-3 text-black outline-none ring-1 ring-black focus:ring-accent"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-white/70">Last Name</label>
              <input
                name="lastName"
                value={form.lastName}
                onChange={handleChange}
                className="mt-1 w-full rounded-lg border border-black bg-white px-3 py-3 text-black outline-none ring-1 ring-black focus:ring-accent"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-white/70">Password (12+ chars)</label>
              <input
                name="password"
                type="password"
                value={form.password}
                onChange={handleChange}
                className="mt-1 w-full rounded-lg border border-black bg-white px-3 py-3 text-black outline-none ring-1 ring-black focus:ring-accent"
                required
                minLength={12}
              />
            </div>
            <div>
              <label className="block text-sm text-white/70">Confirm Password</label>
              <input
                name="confirm"
                type="password"
                value={form.confirm}
                onChange={handleChange}
                className="mt-1 w-full rounded-lg border border-black bg-white px-3 py-3 text-black outline-none ring-1 ring-black focus:ring-accent"
                required
                minLength={12}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-accent px-4 py-3 font-semibold text-night-sky hover:bg-accent/90 focus:outline-none focus:ring-2 focus:ring-white/50"
            >
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>

          <div className="mt-6 text-sm text-white/70">
            <p>
              Have an account? <Link to="/portal" className="text-accent hover:underline">Sign in</Link>
            </p>
          </div>
        </GlassPanel>
      </div>
    </div>
  );
};

export default StaffSignup;
