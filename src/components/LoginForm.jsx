import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { config } from '../lib/appwrite.js';

const LoginForm = () => {
  const { login } = useAuth();
  const [formState, setFormState] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const errorId = 'login-error';
  const emailId = 'email-input';
  const passwordId = 'password-input';
  const mfaCodeId = 'mfa-code-input';

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setToast(null);
    if (!String(formState.email || '').trim() || !String(formState.password || '').trim()) {
      const message = 'Email and password are required.';
      setError(message);
      setToast({ type: 'error', message });
      return;
    }
    setLoading(true);
    try {
      await login(formState);
      setToast({ type: 'success', message: 'Signed in successfully. Redirecting…' });
    } catch (err) {
      const errorMessage = err?.message || '';
      const normalizedMessage = errorMessage.toLowerCase();
      const errorType = String(err?.type || '').toLowerCase();
      // Check if MFA is required
      if (errorMessage.includes('factor') || errorMessage.includes('MFA') || errorMessage.includes('challenge')) {
        setMfaRequired(true);
        setError('Please enter your 2FA code to continue.');
      } else if (errorType === 'user_invalid_credentials' || normalizedMessage.includes('invalid credentials')) {
        setError('Invalid email or password. Use "Forgot password?" to reset access.');
      } else if (errorType === 'user_blocked') {
        setError('Your account is disabled. Contact an administrator.');
      } else if (normalizedMessage.includes('network request failed')) {
        setError(
          'Sign-in request was blocked by browser privacy/content settings. Disable content blockers for this site and fra.cloud.appwrite.io, then retry.'
        );
      } else {
        setError(errorMessage || 'Unable to sign in. Please try again.');
      }
      setToast({
        type: 'error',
        message:
          errorType === 'user_invalid_credentials' || normalizedMessage.includes('invalid credentials')
            ? 'Login failed: invalid email or password.'
            : errorType === 'user_blocked'
            ? 'Login failed: account is blocked.'
            : 'Login failed. Check details and try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  const submitDisabled = loading || !String(formState.email || '').trim() || !String(formState.password || '').trim();

  return (
    <div className="glass-panel mx-auto max-w-md p-10 text-white">
      {toast && (
        <div
          className={`mb-4 rounded-xl border px-4 py-3 text-sm font-medium ${
            toast.type === 'success'
              ? 'border-green-500/50 bg-green-500/10 text-green-300'
              : 'border-red-500/50 bg-red-500/10 text-red-300'
          }`}
          role="status"
          aria-live="polite"
        >
          {toast.message}
        </div>
      )}
      <h1 className="text-2xl font-semibold">Client portal login</h1>
      {(config.isDemoMode || !config.projectId || config.projectId === 'demo-project' || !config.endpoint) && (
        <div className="badge-warning mt-3 text-xs p-3">
          Authentication is disabled on this dev server. Configure Appwrite and set <span className="font-semibold">VITE_ENABLE_DEMO_MODE=false</span> with
          <span className="font-semibold"> VITE_APPWRITE_ENDPOINT</span> and <span className="font-semibold">VITE_APPWRITE_PROJECT_ID</span>.
        </div>
      )}
      <p className="mt-2 text-sm text-secondary">
        {mfaRequired ? 'Enter your 2FA code to complete sign in.' : 'Sign in with your Appwrite credentials to access the Fortis portal.'}
      </p>
      <form className="mt-8 space-y-5" onSubmit={handleSubmit} noValidate>
        {!mfaRequired ? (
          <>
            <div>
              <label htmlFor={emailId} className="block text-sm text-secondary mb-2">
                Email address
              </label>
              <input
                id={emailId}
                required
                type="email"
                name="email"
                autoComplete="email"
                value={formState.email}
                onChange={handleChange}
                aria-invalid={!!error && !mfaRequired}
                aria-describedby={error && !mfaRequired ? errorId : undefined}
                className="input-glass w-full rounded-2xl"
                placeholder="you@fortissecured.com"
              />
            </div>
            <div>
              <label htmlFor={passwordId} className="block text-sm text-secondary mb-2">
                Password
              </label>
              <input
                id={passwordId}
                required
                type="password"
                name="password"
                autoComplete="current-password"
                value={formState.password}
                onChange={handleChange}
                aria-invalid={!!error && !mfaRequired}
                aria-describedby={error && !mfaRequired ? errorId : undefined}
                className="input-glass w-full rounded-2xl"
                placeholder="Enter your password"
              />
            </div>
          </>
        ) : (
          <div>
            <label htmlFor={mfaCodeId} className="block text-sm text-secondary mb-2">
              2FA Code
            </label>
            <input
              id={mfaCodeId}
              required
              type="text"
              inputMode="numeric"
              value={mfaCode}
              onChange={(e) => setMfaCode(e.target.value)}
              aria-invalid={!!error && mfaRequired}
              aria-describedby={error && mfaRequired ? errorId : undefined}
              className="input-glass w-full rounded-2xl"
              placeholder="Enter 6-digit code"
              maxLength={6}
            />
          </div>
        )}
        {error && (
          <div id={errorId} role="alert" className="badge-error text-sm p-3">
            {error}
          </div>
        )}
        <button
          type="submit"
          disabled={submitDisabled}
          className="btn-primary w-full rounded-full shadow-lg shadow-accent/40"
          aria-busy={loading}
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
        {mfaRequired && (
          <button
            type="button"
            onClick={() => { setMfaRequired(false); setError(''); }}
            className="link text-xs px-2 py-1"
            aria-label="Return to email and password login"
          >
            Back to login
          </button>
        )}
        <div className="flex items-center justify-between gap-2 text-xs">
          <Link to="/forgot-password" className="link">
            Forgot password?
          </Link>
          <p className="text-muted">
            Fortis Secured supports email/password, SSO and 2FA.
          </p>
        </div>
      </form>
    </div>
  );
};

export default LoginForm;
