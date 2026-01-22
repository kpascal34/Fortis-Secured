import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import GlassPanel from '../components/GlassPanel.jsx';
import PortalHeader from '../components/PortalHeader.jsx';
import { account } from '../lib/appwrite.js';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [step, setStep] = useState('email'); // email, check-inbox, reset-code

  const handleSendReset = async (e) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // Send password recovery email via Appwrite using configured base URL
      const baseUrl = (import.meta.env.VITE_PUBLIC_BASE_URL || window.location.origin).replace(/\/$/, '');
      await account.createRecovery(email, `${baseUrl}/reset-password`);
      setSuccess('Check your email for a password reset link. It expires in 1 hour.');
      setStep('check-inbox');
      setEmail('');
    } catch (err) {
      setError(err.message || 'Failed to send reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-dark via-night-sky to-night-sky px-4 py-10 text-white">
      <div className="mx-auto max-w-3xl">
        <PortalHeader
          eyebrow="Account Recovery"
          title="Reset Your Password"
          description="Enter your email to receive a password reset link."
        />

        <GlassPanel className="border-white/10 bg-white/5">
          {step === 'check-inbox' && success ? (
            <div className="space-y-6">
              <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-6 text-center">
                <p className="text-lg font-semibold text-green-200">Check your email</p>
                <p className="mt-2 text-green-100/80">{success}</p>
              </div>
              <div className="space-y-3">
                <p className="text-sm text-white/70">
                  Didn't receive the email? Check your spam folder or try a different approach.
                </p>
                <button
                  onClick={() => {
                    setStep('email');
                    setSuccess(null);
                    setError(null);
                  }}
                  className="w-full rounded-lg bg-accent px-4 py-3 font-semibold text-night-sky hover:bg-accent/90 focus:outline-none focus:ring-2 focus:ring-white/50"
                >
                  Try Another Email
                </button>
              </div>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={handleSendReset}>
              <div>
                <label className="block text-sm text-white/70">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-black bg-white px-3 py-3 text-black outline-none ring-1 ring-black focus:ring-accent"
                  placeholder="you@fortissecured.com"
                  required
                />
              </div>

              {error && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-red-200 text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-accent px-4 py-3 font-semibold text-night-sky hover:bg-accent/90 focus:outline-none focus:ring-2 focus:ring-white/50 disabled:opacity-50"
              >
                {loading ? 'Sending reset link…' : 'Send Reset Link'}
              </button>
            </form>
          )}

          <div className="mt-6 text-sm text-white/70">
            <p>
              Remember your password? <Link to="/portal" className="text-accent hover:underline">Sign in</Link>
            </p>
          </div>
        </GlassPanel>
      </div>
    </div>
  );
};

export default ForgotPassword;
