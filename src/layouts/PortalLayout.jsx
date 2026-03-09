import React, { useState } from 'react';
import { Outlet, Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import PortalNav from '../components/PortalNav';
import NotificationBell from '../components/NotificationBell';
import MobileBottomNav from '../components/MobileBottomNav';
import LoginForm from '../components/LoginForm';
import Breadcrumb from '../components/Breadcrumb';
import { useSEO } from '../lib/seo.js';
import { can } from '../lib/rbac.ts';

const PortalTopBar = ({ user, resolvedRole, onSignOut }) => {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const navigate = useNavigate();
  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.[0]?.toUpperCase() || '?';

  const roleBadge = resolvedRole || 'user';

  return (
    <header className="hidden lg:flex h-14 items-center justify-between border-b border-border bg-bg/80 backdrop-blur-sm px-6 shrink-0">
      {/* Quick search placeholder */}
      <button
        type="button"
        onClick={() => navigate('/portal/dashboard')}
        className="flex items-center gap-2 rounded-lg border border-border/60 bg-surface/30 px-3 py-1.5 text-xs text-text-3 hover:border-brand/40 hover:text-text-2 transition-colors"
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <span>Search portal...</span>
        <kbd className="ml-4 rounded border border-border/60 bg-surface/50 px-1.5 py-0.5 text-[10px] font-mono text-text-3">
          /
        </kbd>
      </button>

      <div className="flex items-center gap-3">
        {/* Role badge */}
        <span className="rounded-full border border-accent/20 bg-accent/5 px-3 py-1 text-xs font-medium capitalize text-accent">
          {roleBadge}
        </span>

        {/* Notification bell */}
        <NotificationBell userId={user?.$id} />

        {/* User menu */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setUserMenuOpen((o) => !o)}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-surface/50 transition-colors"
            aria-expanded={userMenuOpen}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">
              {initials}
            </div>
            <div className="text-left hidden xl:block">
              <p className="text-xs font-medium text-text truncate max-w-[140px]">{user?.name || user?.email}</p>
            </div>
            <svg className={`h-3.5 w-3.5 text-text-3 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {userMenuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
              <div className="absolute right-0 top-full mt-1 z-50 w-52 rounded-xl border border-border bg-bg shadow-xl">
                <div className="border-b border-border p-3">
                  <p className="text-xs font-medium text-text truncate">{user?.name || 'User'}</p>
                  <p className="text-xs text-text-3 truncate">{user?.email}</p>
                </div>
                <div className="p-1">
                  <button
                    type="button"
                    onClick={() => { setUserMenuOpen(false); navigate('/portal/settings'); }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-text-2 hover:bg-surface/50 transition-colors"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Settings
                  </button>
                  <button
                    type="button"
                    onClick={() => { setUserMenuOpen(false); onSignOut(); }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-rose-400 hover:bg-rose-500/10 transition-colors"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Sign Out
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

const PortalLayout = () => {
  const { user, loading, logout, resolvedRole, permissions } = useAuth();
  const location = useLocation();

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

  // Convenience redirect for client users
  if (
    can('viewCustomerPortal', { role: user?.role, resolvedRole, permissions }) &&
    (location.pathname === '/portal' || location.pathname === '/portal/')
  ) {
    return <Navigate to="/portal/client-portal" replace />;
  }

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <PortalNav user={user} onSignOut={logout} resolvedRole={resolvedRole} permissions={permissions} />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Portal top bar */}
        <PortalTopBar user={user} resolvedRole={resolvedRole} onSignOut={logout} />
        <div className="flex-1 overflow-y-auto pb-20 lg:pb-0">
          <div className="p-4 lg:p-8">
            <Breadcrumb />
            <Outlet />
          </div>
        </div>
      </div>
      {/* Mobile bottom navigation */}
      <MobileBottomNav resolvedRole={resolvedRole} />
    </div>
  );
};

export default PortalLayout;
