import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { account } from '../lib/appwrite';
import GlassPanel from '../components/GlassPanel';
import { AiOutlineLoading3Quarters, AiOutlineMail } from 'react-icons/ai';

const PasswordReset = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState('request'); // request, check-email, reset
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [resetForm, setResetForm] = useState({
    userId: '',
    token: '',
    password: '',
    confirmPassword: '',
  });

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (!email.trim()) {
        setError('Please enter a valid email address');
        setLoading(false);
        return;
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setError('Please enter a valid email address');
        setLoading(false);
        return;
      }

      // Request password reset
      await account.createRecovery(email, `${window.location.origin}/portal/password-reset`);

      setSuccess('Reset link sent! Check your email for instructions.');
      setStep('check-email');
      
      setTimeout(() => {
        setSuccess('');
      }, 5000);
    } catch (err) {
      console.error('Error requesting password reset:', err);
      // Don't reveal if email exists or not for security
      setError('If an account exists with this email, you will receive reset instructions. Check your spam folder if you don\'t see it.');
      setSuccess('');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!resetForm.userId || !resetForm.token) {
      setError('Invalid reset link. Please request a new password reset.');
      return;
    }

    if (!resetForm.password || resetForm.password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    if (resetForm.password !== resetForm.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      // Update password with recovery token
      await account.updateRecovery(
        resetForm.userId,
        resetForm.token,
        resetForm.password,
        resetForm.confirmPassword
      );

      setSuccess('Password reset successfully! Redirecting to login...');
      
      setTimeout(() => {
        navigate('/portal');
      }, 2000);
    } catch (err) {
      console.error('Error resetting password:', err);
      setError(err.message || 'Failed to reset password. The link may have expired. Please request a new one.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetFormChange = (e) => {
    const { name, value } = e.target;
    setResetForm((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-dark via-night-sky to-night-sky px-4 py-20 text-white">
      <div className="mx-auto max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Reset Password</h1>
          <p className="text-white/70">
            {step === 'request' && 'Enter your email to receive a reset link'}
            {step === 'check-email' && 'Check your email for reset instructions'}
            {step === 'reset' && 'Enter your new password'}
          </p>
        </div>

        <GlassPanel className="border-white/10 bg-[#1a1f2e] backdrop-blur-md p-8">
          {/* Error Message */}
          {error && (
            <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="mb-4 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-200">
              {success}
            </div>
          )}

          {/* Step 1: Request Reset */}
          {step === 'request' && (
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-white/80 mb-2">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@company.com"
                  className="mt-1 w-full rounded-lg bg-[#0f1419] px-3 py-3 text-white outline-none ring-1 ring-white/20 focus:ring-accent"
                  disabled={loading}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-accent px-4 py-3 font-semibold text-night-sky hover:bg-accent/90 focus:outline-none focus:ring-2 focus:ring-white/50 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
              >
                {loading ? (
                  <>
                    <AiOutlineLoading3Quarters className="animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Send Reset Link'
                )}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => navigate('/portal')}
                  className="text-sm text-accent hover:underline"
                >
                  Back to login
                </button>
              </div>
            </form>
          )}

          {/* Step 2: Check Email */}
          {step === 'check-email' && (
            <div className="text-center py-8">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent/20">
                <AiOutlineMail className="text-3xl text-accent" />
              </div>
              <p className="text-white/80 mb-6">
                We've sent a password reset link to <strong>{email}</strong>
              </p>
              <p className="text-sm text-white/60 mb-6">
                Click the link in the email to reset your password. The link expires in 24 hours.
              </p>
              
              <div className="space-y-2">
                <p className="text-xs text-white/50">Didn't receive the email?</p>
                <button
                  onClick={() => {
                    setStep('request');
                    setEmail('');
                  }}
                  className="text-sm text-accent hover:underline"
                >
                  Try another email
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Reset Password (for manual token input) */}
          {step === 'reset' && (
            <form onSubmit={handlePasswordReset} className="space-y-4">
              <div>
                <label className="block text-sm text-white/80 mb-2">User ID</label>
                <input
                  type="text"
                  name="userId"
                  value={resetForm.userId}
                  onChange={handleResetFormChange}
                  placeholder="From reset link"
                  className="mt-1 w-full rounded-lg bg-[#0f1419] px-3 py-3 text-white outline-none ring-1 ring-white/20 focus:ring-accent"
                />
              </div>

              <div>
                <label className="block text-sm text-white/80 mb-2">Token</label>
                <input
                  type="text"
                  name="token"
                  value={resetForm.token}
                  onChange={handleResetFormChange}
                  placeholder="From reset link"
                  className="mt-1 w-full rounded-lg bg-[#0f1419] px-3 py-3 text-white outline-none ring-1 ring-white/20 focus:ring-accent"
                />
              </div>

              <div>
                <label className="block text-sm text-white/80 mb-2">New Password</label>
                <input
                  type="password"
                  name="password"
                  value={resetForm.password}
                  onChange={handleResetFormChange}
                  placeholder="At least 8 characters"
                  className="mt-1 w-full rounded-lg bg-[#0f1419] px-3 py-3 text-white outline-none ring-1 ring-white/20 focus:ring-accent"
                />
              </div>

              <div>
                <label className="block text-sm text-white/80 mb-2">Confirm Password</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={resetForm.confirmPassword}
                  onChange={handleResetFormChange}
                  placeholder="Confirm your password"
                  className="mt-1 w-full rounded-lg bg-[#0f1419] px-3 py-3 text-white outline-none ring-1 ring-white/20 focus:ring-accent"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-accent px-4 py-3 font-semibold text-night-sky hover:bg-accent/90 focus:outline-none focus:ring-2 focus:ring-white/50 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
              >
                {loading ? (
                  <>
                    <AiOutlineLoading3Quarters className="animate-spin" />
                    Resetting...
                  </>
                ) : (
                  'Reset Password'
                )}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => navigate('/portal')}
                  className="text-sm text-accent hover:underline"
                >
                  Back to login
                </button>
              </div>
            </form>
          )}
        </GlassPanel>

        <p className="mt-8 text-center text-xs text-white/50">
          Password reset links expire after 24 hours. If your link has expired, please request a new one.
        </p>
      </div>
    </div>
  );
};

export default PasswordReset;
