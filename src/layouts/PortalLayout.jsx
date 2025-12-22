import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import PortalNav from '../components/PortalNav';
import LoginForm from '../components/LoginForm';
import { useSEO } from '../lib/seo.js';

const PortalLayout = () => {
  const { user, loading, logout } = useAuth();

  const title = loading
    ? 'Loading Portal | Fortis Secured'
    : !user
    ? 'Portal Login | Fortis Secured'
    : 'Portal | Fortis Secured';
  const description = !user
    ? 'Sign in to the Fortis Secured portal to manage operations.'
    : 'Fortis Secured portal for operations, reporting and management.';
  useSEO({ title, description, noIndex: true });

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-dark via-night-sky to-night-sky text-white">
        <p className="text-sm text-white/70">Loading portal…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-primary-dark via-night-sky to-night-sky px-6 py-24 text-white">
        <div className="absolute inset-0 -z-10 pointer-events-none">
          <div className="absolute left-1/3 top-20 h-72 w-72 rounded-full bg-accent/20 blur-3xl" />
          <div className="absolute right-10 bottom-10 h-80 w-80 rounded-full bg-primary/30 blur-3xl" />
        </div>
        <div className="mx-auto max-w-4xl text-center">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-accent">
            ← Back to public site
          </Link>
          <h1 className="mt-10 text-4xl font-bold">Fortis Secured Portal</h1>
          <p className="mt-4 text-white/70">
            Access incident management, guard operations, asset tracking and realtime reporting tailored to your role.
          </p>
        </div>
        <div className="mt-16">
          <LoginForm />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <PortalNav onSignOut={logout} />
      <div className="flex-1 overflow-y-auto">
        <Outlet />
      </div>
    </div>
  );
};

export default PortalLayout;