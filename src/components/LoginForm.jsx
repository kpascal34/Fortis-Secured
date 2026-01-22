import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { config } from '../lib/appwrite.js';

const LoginForm = () => {
  const { login } = useAuth();
  const [formState, setFormState] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
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

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(formState);
    } catch (err) {
      const errorMessage = err?.message || '';
      // Check if MFA is required
      if (errorMessage.includes('factor') || errorMessage.includes('MFA') || errorMessage.includes('challenge')) {
        setMfaRequired(true);
        setError('Please enter your 2FA code to continue.');
      } else {
        setError(errorMessage || 'Unable to sign in. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel mx-auto max-w-md p-10 text-white">
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
          disabled={loading}
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