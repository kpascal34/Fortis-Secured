import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

const LoginForm = () => {
  const { login } = useAuth();
  const [formState, setFormState] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
      setError(err?.message || 'Unable to sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md rounded-3xl border border-white/10 bg-white/5 p-10 text-white shadow-glass">
      <h2 className="text-2xl font-semibold">Client portal login</h2>
      <p className="mt-2 text-sm text-white/70">Sign in with your Appwrite credentials to access the Fortis portal.</p>
      <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
        <label className="flex flex-col text-sm text-white/70">
          Email address
          <input
            required
            type="email"
            name="email"
            value={formState.email}
            onChange={handleChange}
            className="mt-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white placeholder:text-white/40 focus:border-accent focus:outline-none"
            placeholder="you@fortissecured.com"
          />
        </label>
        <label className="flex flex-col text-sm text-white/70">
          Password
          <input
            required
            type="password"
            name="password"
            value={formState.password}
            onChange={handleChange}
            className="mt-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white placeholder:text-white/40 focus:border-accent focus:outline-none"
            placeholder="Enter your password"
          />
        </label>
        {error && <p className="text-sm text-rose-400">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-accent px-6 py-3 text-sm font-semibold text-night-sky shadow-lg shadow-accent/40 hover:bg-accent/90 disabled:cursor-not-allowed disabled:bg-accent/50"
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
        <p className="text-xs text-white/50">
          Fortis Secured supports email/password, SSO and 2FA. Contact your administrator if you need assistance.
        </p>
      </form>
    </div>
  );
};

export default LoginForm;
