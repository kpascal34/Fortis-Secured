import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AiOutlineLogout, AiOutlineDown } from 'react-icons/ai';
import { navigationGroups } from '../config/navigation.ts';
import { isFeatureEnabled } from '../config/features.ts';

const SIDEBAR_STATE_KEY = 'fortis_sidebar_state';

const normalizeRole = (role) => role?.toLowerCase?.() || 'client';

const resolvePortalPath = (path) => {
  if (path.startsWith('/portal/')) return path;
  if (path === '/portal') return path;
  if (path.startsWith('/')) return `/portal${path}`;
  return `/portal/${path}`;
};

const isItemActive = (pathname, href) => pathname === href || pathname.startsWith(`${href}/`);

const getInitialCollapsedState = () => {
  if (typeof window === 'undefined') {
    return {};
  }

  const rawState = window.localStorage.getItem(SIDEBAR_STATE_KEY);
  if (!rawState) {
    return {};
  }

  try {
    const parsed = JSON.parse(rawState);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (error) {
    console.error('[PortalNav] Failed to parse persisted sidebar state.', error);
    return {};
  }
};

const GroupNavItem = ({ item, isActive }) => (
  <Link
    to={resolvePortalPath(item.path)}
    aria-current={isActive ? 'page' : undefined}
    className={`fs-nav-item ${isActive ? 'fs-nav-item-active' : ''}`}
  >
    {item.label}
  </Link>
);

const PortalNav = ({ user, onSignOut }) => {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [collapsedGroups, setCollapsedGroups] = React.useState(getInitialCollapsedState);
  const role = normalizeRole(user?.role);

  const visibleGroups = React.useMemo(() => {
    return navigationGroups
      .filter((group) => group.roles.includes(role))
      .map((group) => ({
        ...group,
        children: group.children.filter((item) => !item.feature || isFeatureEnabled(item.feature)),
      }))
      .filter((group) => group.children.length > 0);
  }, [role]);

  React.useEffect(() => {
    if (mobileOpen) {
      setMobileOpen(false);
    }
  }, [location.pathname]);

  React.useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      window.localStorage.setItem(SIDEBAR_STATE_KEY, JSON.stringify(collapsedGroups));
    } catch (error) {
      console.error('[PortalNav] Failed to persist sidebar state.', error);
    }
  }, [collapsedGroups]);

  const toggleGroup = (groupLabel) => {
    setCollapsedGroups((previousState) => ({
      ...previousState,
      [groupLabel]: !previousState[groupLabel],
    }));
  };

  return (
    <>
      <div className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border bg-bg px-4 lg:hidden">
        <h2 className="text-sm font-bold text-text">FORTIS</h2>
        <button
          onClick={() => setMobileOpen((current) => !current)}
          className="inline-flex items-center rounded-lg p-2 text-text-2 hover:bg-surface focus:outline-none focus:ring-2 focus:ring-brand"
          aria-expanded={mobileOpen}
          aria-label="Toggle navigation menu"
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      <nav
        className={`${
          mobileOpen ? 'fixed inset-0 z-40 top-16 w-full overflow-y-auto' : 'hidden lg:block lg:flex-shrink-0'
        } lg:static lg:h-screen lg:w-64 fs-sidebar p-4 overflow-y-auto`}
      >
        <div className="mb-8 hidden lg:block">
          <h2 className="px-3 text-lg font-bold text-text">FORTIS SECURED</h2>
          <p className="px-3 text-xs text-text-2">Internal Portal</p>
        </div>

        <div className="space-y-3">
          {visibleGroups.map((group) => {
            const isCollapsed = Boolean(collapsedGroups[group.label]);

            return (
              <section key={group.label} className="rounded-xl border border-border/80 bg-surface/30 p-2">
                <button
                  type="button"
                  className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-sm font-semibold text-text hover:bg-surface-2/80"
                  onClick={() => toggleGroup(group.label)}
                  aria-expanded={!isCollapsed}
                  aria-controls={`group-${group.label}`}
                >
                  <span>{group.label}</span>
                  <AiOutlineDown
                    aria-hidden="true"
                    className={`h-4 w-4 transition-transform duration-300 ${isCollapsed ? '-rotate-90' : 'rotate-0'}`}
                  />
                </button>

                <div
                  id={`group-${group.label}`}
                  className={`grid transition-all duration-300 ease-in-out ${isCollapsed ? 'grid-rows-[0fr] opacity-70' : 'grid-rows-[1fr] opacity-100'}`}
                >
                  <div className="overflow-hidden">
                    <div className="mt-1 space-y-1 pl-1">
                      {group.children.map((item) => {
                        const href = resolvePortalPath(item.path);
                        return <GroupNavItem key={item.label} item={item} isActive={isItemActive(location.pathname, href)} />;
                      })}
                    </div>
                  </div>
                </div>
              </section>
            );
          })}
        </div>

        <div className="mt-8 border-t border-border pt-4">
          <button onClick={onSignOut} className="fs-nav-item" aria-label="Sign out of portal">
            <AiOutlineLogout className="mr-3 h-5 w-5" aria-hidden="true" />
            Sign Out
          </button>
        </div>
      </nav>

      {mobileOpen && <div className="fixed inset-0 z-30 bg-[var(--overlay)] lg:hidden" onClick={() => setMobileOpen(false)} style={{ top: '64px' }} />}
    </>
  );
};

export default PortalNav;
