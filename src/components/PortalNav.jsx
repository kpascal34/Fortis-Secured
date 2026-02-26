import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { isFeatureEnabled } from '../config/features.ts';
import {
  AiOutlineHome,
  AiOutlineUser,
  AiOutlineCalendar,
  AiOutlineTeam,
  AiOutlineAudit,
  AiOutlineSetting,
  AiOutlineLogout,
  AiOutlineFileDone,
  AiOutlineMenu,
  AiOutlineDown,
  AiOutlineRight,
} from 'react-icons/ai';

const STORAGE_KEY = 'fortis:portal-nav-expanded-groups';

const ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  STAFF: 'staff',
  CLIENT: 'client',
};

const navigationGroups = [
  {
    id: 'overview',
    label: 'Overview',
    items: [
      { name: 'Dashboard', href: '/portal', icon: AiOutlineHome, feature: 'DASHBOARD', roles: [ROLES.ADMIN, ROLES.MANAGER, ROLES.STAFF, ROLES.CLIENT] },
    ],
  },
  {
    id: 'operations',
    label: 'Operations',
    items: [
      { name: 'Clients', href: '/portal/clients', icon: AiOutlineTeam, feature: 'CRM', roles: [ROLES.ADMIN, ROLES.MANAGER, ROLES.STAFF] },
      { name: 'Sites', href: '/portal/sites', icon: AiOutlineTeam, feature: 'SITES', roles: [ROLES.ADMIN, ROLES.MANAGER, ROLES.STAFF] },
      { name: 'Scheduling (Calendar)', href: '/portal/scheduling', icon: AiOutlineCalendar, feature: 'SCHEDULING', roles: [ROLES.ADMIN, ROLES.MANAGER, ROLES.STAFF] },
      { name: 'Scheduling Board', href: '/portal/scheduling-board', icon: AiOutlineCalendar, feature: 'SCHEDULING', roles: [ROLES.ADMIN, ROLES.MANAGER, ROLES.STAFF] },
      { name: 'People', href: '/portal/guards', icon: AiOutlineUser, feature: 'GUARDS', roles: [ROLES.ADMIN, ROLES.MANAGER, ROLES.STAFF] },
      { name: 'Leave', href: '/portal/open-shifts', icon: AiOutlineCalendar, feature: 'OPEN_SHIFTS', roles: [ROLES.ADMIN, ROLES.MANAGER, ROLES.STAFF] },
      { name: 'Training', href: '/portal/recurring-patterns', icon: AiOutlineCalendar, feature: 'RECURRING_PATTERNS', roles: [ROLES.ADMIN, ROLES.MANAGER, ROLES.STAFF] },
      { name: 'Documents', href: '/portal/assets', icon: AiOutlineFileDone, feature: 'ASSETS', roles: [ROLES.ADMIN, ROLES.MANAGER, ROLES.STAFF] },
    ],
  },
  {
    id: 'compliance',
    label: 'Compliance',
    items: [
      { name: 'Staff (HR & Compliance)', href: '/portal/hr', icon: AiOutlineAudit, feature: 'COMPLIANCE', roles: [ROLES.ADMIN, ROLES.MANAGER, ROLES.STAFF] },
      { name: 'Admin Grading', href: '/portal/admin-grading', icon: AiOutlineFileDone, feature: 'COMPLIANCE', roles: [ROLES.ADMIN] },
      { name: 'Compliance Wizard', href: '/portal/compliance', icon: AiOutlineAudit, feature: 'COMPLIANCE', roles: [ROLES.ADMIN, ROLES.MANAGER, ROLES.STAFF] },
      { name: 'Drive Sync Status', href: '/portal/drive-sync', icon: AiOutlineAudit, feature: 'COMPLIANCE', roles: [ROLES.ADMIN] },
    ],
  },
  {
    id: 'admin',
    label: 'Admin',
    items: [
      { name: 'Invite Management', href: '/portal/invite-management', icon: AiOutlineTeam, feature: 'COMPLIANCE', roles: [ROLES.ADMIN] },
      { name: 'Settings (Departments, Roles)', href: '/portal/settings', icon: AiOutlineSetting, feature: 'SETTINGS', roles: [ROLES.ADMIN] },
    ],
  },
  {
    id: 'account',
    label: 'Account',
    items: [
      { name: 'My Profile', href: '/portal/profile', icon: AiOutlineUser, feature: 'PROFILE', roles: [ROLES.ADMIN, ROLES.MANAGER, ROLES.STAFF, ROLES.CLIENT] },
    ],
  },
];

const isRoleAllowed = (role, allowedRoles) => {
  if (!allowedRoles || allowedRoles.length === 0) return true;
  return allowedRoles.includes(role);
};

const isGroupRouteActive = (group, pathname) =>
  group.items.some((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));

const getInitialExpandedGroups = (groups, pathname) => {
  const defaults = groups.reduce((acc, group) => {
    acc[group.id] = isGroupRouteActive(group, pathname);
    return acc;
  }, {});

  if (typeof window === 'undefined') return defaults;

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return defaults;

    const parsed = JSON.parse(stored);
    return groups.reduce((acc, group) => {
      const storedValue = parsed?.[group.id];
      acc[group.id] = typeof storedValue === 'boolean' ? storedValue : defaults[group.id];
      return acc;
    }, {});
  } catch {
    return defaults;
  }
};

const getVisibleNavigationGroups = (role) =>
  navigationGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => isFeatureEnabled(item.feature) && isRoleAllowed(role, item.roles)),
    }))
    .filter((group) => group.items.length > 0);

const NavItem = ({ item, isActive, onClick }) => {
  const Icon = item.icon;

  return (
    <Link
      to={item.href}
      onClick={onClick}
      aria-current={isActive ? 'page' : undefined}
      className={`fs-nav-item ${isActive ? 'fs-nav-item-active' : ''}`}
    >
      <Icon className="mr-3 h-5 w-5" aria-hidden="true" />
      {item.name}
    </Link>
  );
};

export const PortalNav = ({ user, onSignOut }) => {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const role = user?.role?.toLowerCase?.() || ROLES.CLIENT;
  const visibleGroups = React.useMemo(() => getVisibleNavigationGroups(role), [role]);

  const [expandedGroups, setExpandedGroups] = React.useState(() =>
    getInitialExpandedGroups(visibleGroups, location.pathname)
  );

  React.useEffect(() => {
    setExpandedGroups((prev) => {
      const next = visibleGroups.reduce((acc, group) => {
        const hasValue = Object.prototype.hasOwnProperty.call(prev, group.id);
        acc[group.id] = hasValue ? prev[group.id] : isGroupRouteActive(group, location.pathname);
        return acc;
      }, {});

      return JSON.stringify(prev) === JSON.stringify(next) ? prev : next;
    });
  }, [visibleGroups, location.pathname]);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(expandedGroups));
  }, [expandedGroups]);

  const toggleGroup = (groupId) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  return (
    <>
      <div className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border bg-bg px-4 lg:hidden">
        <h2 className="text-sm font-bold text-white">FORTIS</h2>
        <button
          onClick={() => setMobileOpen((prev) => !prev)}
          className="inline-flex items-center rounded-lg p-2 text-text-2 hover:bg-surface focus:outline-none focus:ring-2 focus:ring-brand"
          aria-expanded={mobileOpen}
          aria-label="Toggle navigation menu"
        >
          <AiOutlineMenu className="h-6 w-6" aria-hidden="true" />
        </button>
      </div>

      <nav
        className={`${
          mobileOpen ? 'fixed inset-0 z-40 top-16 w-full overflow-y-auto' : 'hidden lg:block lg:flex-shrink-0'
        } lg:static lg:h-screen lg:w-64 lg:border-r lg:border-border bg-bg p-4 overflow-y-auto`}
      >
        <div className="mb-8 hidden lg:block">
          <h2 className="px-3 text-lg font-bold text-text">FORTIS SECURED</h2>
          <p className="px-3 text-xs text-text-3">Internal Portal</p>
        </div>

        <div className="space-y-3">
          {visibleGroups.map((group) => {
            const isExpanded = Boolean(expandedGroups[group.id]);
            const isActiveGroup = isGroupRouteActive(group, location.pathname);

            return (
              <section key={group.id} className="rounded-xl border border-border/60 bg-surface/20">
                <button
                  type="button"
                  onClick={() => toggleGroup(group.id)}
                  className={`flex w-full items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wide ${
                    isActiveGroup ? 'text-brand' : 'text-text-3'
                  }`}
                  aria-expanded={isExpanded}
                  aria-controls={`nav-group-${group.id}`}
                >
                  <span>{group.label}</span>
                  {isExpanded ? (
                    <AiOutlineDown className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <AiOutlineRight className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>

                {isExpanded && (
                  <div id={`nav-group-${group.id}`} className="space-y-1 pb-2" onClick={() => setMobileOpen(false)}>
                    {group.items.map((item) => (
                      <NavItem
                        key={item.name}
                        item={item}
                        isActive={location.pathname === item.href || location.pathname.startsWith(`${item.href}/`)}
                        onClick={() => setMobileOpen(false)}
                      />
                    ))}
                  </div>
                )}
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

      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
          style={{ top: '64px' }}
        />
      )}
    </>
  );
};

export default PortalNav;
