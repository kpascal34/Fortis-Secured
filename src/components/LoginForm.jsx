import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

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
    <div className="mx-auto max-w-md rounded-3xl border border-white/10 bg-white/5 p-10 text-white shadow-glass">
      <h1 className="text-2xl font-semibold">Client portal login</h1>
      <p className="mt-2 text-sm text-white/70">
        {mfaRequired ? 'Enter your 2FA code to complete sign in.' : 'Sign in with your Appwrite credentials to access the Fortis portal.'}
      </p>
      <form className="mt-8 space-y-5" onSubmit={handleSubmit} noValidate>
        {!mfaRequired ? (
          <>
            <div>
              <label htmlFor={emailId} className="block text-sm text-white/70 mb-2">
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
                className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white placeholder:text-white/40 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-night-sky transition-all"
                placeholder="you@fortissecured.com"
              />
            </div>
            <div>
              <label htmlFor={passwordId} className="block text-sm text-white/70 mb-2">
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
                className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white placeholder:text-white/40 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-night-sky transition-all"
                placeholder="Enter your password"
              />
            </div>
          </>
        ) : (
          <div>
            <label htmlFor={mfaCodeId} className="block text-sm text-white/70 mb-2">
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
              className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white placeholder:text-white/40 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-night-sky transition-all"
              placeholder="Enter 6-digit code"
              maxLength={6}
            />
          </div>
        )}
        {error && (
          <div id={errorId} role="alert" className="text-sm text-rose-400 p-3 bg-rose-400/10 rounded-lg border border-rose-400/20">
            {error}
          </div>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-accent px-6 py-3 text-sm font-semibold text-night-sky shadow-lg shadow-accent/40 hover:bg-accent/90 disabled:cursor-not-allowed disabled:bg-accent/50 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-night-sky transition-all"
          aria-busy={loading}
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
        {mfaRequired && (
          <button
            type="button"
            onClick={() => { setMfaRequired(false); setError(''); }}
            className="text-xs text-white/50 hover:text-white/70 underline focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-night-sky rounded px-2 py-1 transition-all"
            aria-label="Return to email and password login"
          >
            Back to login
          </button>
        )}
        <p className="text-xs text-white/50">
          Fortis Secured supports email/password, SSO and 2FA. Contact your administrator if you need assistance.
        </p>
      </form>
    </div>
  );
};

export default LoginForm;