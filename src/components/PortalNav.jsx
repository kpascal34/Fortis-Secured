import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { isFeatureEnabled } from '../config/features.ts';
import {
  AiOutlineHome,
  AiOutlineUser,
  AiOutlineCalendar,
  AiOutlineClockCircle,
  AiOutlineCheckSquare,
  AiOutlineWarning,
  AiOutlineInbox,
  AiOutlineMessage,
  AiOutlineDollar,
  AiOutlineRobot,
  AiOutlineTeam,
  AiOutlineAudit,
  AiOutlineBarChart,
  AiOutlineSetting,
  AiOutlineLogout,
  AiOutlineReload,
  AiOutlineFileDone,
} from 'react-icons/ai';

const ROLES = {
  ADMIN: 'admin',
  STAFF: 'staff',
  CLIENT: 'client',
};

const allNavigation = [
  { name: 'Dashboard', href: '/portal', icon: AiOutlineHome, feature: 'DASHBOARD', roles: [ROLES.ADMIN, ROLES.STAFF, ROLES.CLIENT] },
  { name: 'My Profile', href: '/portal/profile', icon: AiOutlineUser, feature: 'PROFILE', roles: [ROLES.ADMIN, ROLES.STAFF, ROLES.CLIENT] },

  // Staff/Admin operational modules
  { name: 'Clients / CRM', href: '/portal/clients', icon: AiOutlineTeam, feature: 'CRM', roles: [ROLES.ADMIN, ROLES.STAFF] },
  { name: 'Scheduling', href: '/portal/scheduling', icon: AiOutlineCalendar, feature: 'SCHEDULING', roles: [ROLES.ADMIN, ROLES.STAFF] },
  { name: 'Scheduling Board', href: '/portal/scheduling-board', icon: AiOutlineCalendar, feature: 'SCHEDULING', roles: [ROLES.ADMIN, ROLES.STAFF] },
  { name: 'Recurring Patterns', href: '/portal/recurring-patterns', icon: AiOutlineReload, feature: 'RECURRING_PATTERNS', roles: [ROLES.ADMIN, ROLES.STAFF] },
  { name: 'My Schedule', href: '/portal/my-schedule', icon: AiOutlineUser, feature: 'MY_SCHEDULE', roles: [ROLES.ADMIN, ROLES.STAFF] },
  { name: 'Open Shifts', href: '/portal/open-shifts', icon: AiOutlineCalendar, feature: 'OPEN_SHIFTS', roles: [ROLES.ADMIN, ROLES.STAFF] },
  { name: 'Shift Applications', href: '/portal/shift-applications', icon: AiOutlineFileDone, feature: 'SHIFT_APPLICATIONS', roles: [ROLES.ADMIN, ROLES.STAFF] },
  { name: 'Sites', href: '/portal/sites', icon: AiOutlineInbox, feature: 'SITES', roles: [ROLES.ADMIN, ROLES.STAFF] },
  { name: 'Posts', href: '/portal/posts', icon: AiOutlineCheckSquare, feature: 'POSTS', roles: [ROLES.ADMIN, ROLES.STAFF] },
  { name: 'Guards', href: '/portal/guards', icon: AiOutlineUser, feature: 'GUARDS', roles: [ROLES.ADMIN, ROLES.STAFF] },
  { name: 'Time Tracking', href: '/portal/time', icon: AiOutlineClockCircle, feature: 'TIME_TRACKING', roles: [ROLES.ADMIN, ROLES.STAFF] },
  { name: 'Tasks', href: '/portal/tasks', icon: AiOutlineCheckSquare, feature: 'TASKS', roles: [ROLES.ADMIN, ROLES.STAFF] },
  { name: 'Incidents', href: '/portal/incidents', icon: AiOutlineWarning, feature: 'INCIDENTS', roles: [ROLES.ADMIN, ROLES.STAFF] },
  { name: 'Assets', href: '/portal/assets', icon: AiOutlineInbox, feature: 'ASSETS', roles: [ROLES.ADMIN, ROLES.STAFF] },
  { name: 'Messages', href: '/portal/messages', icon: AiOutlineMessage, feature: 'MESSAGES', roles: [ROLES.ADMIN, ROLES.STAFF] },

  // Compliance (staff + admin), with admin-only submodules
  { name: 'HR & Compliance', href: '/portal/hr', icon: AiOutlineAudit, feature: 'COMPLIANCE', roles: [ROLES.ADMIN, ROLES.STAFF] },
  { name: 'Compliance Wizard', href: '/portal/compliance', icon: AiOutlineAudit, feature: 'COMPLIANCE', roles: [ROLES.ADMIN, ROLES.STAFF] },
  { name: 'Admin Grading', href: '/portal/admin-grading', icon: AiOutlineFileDone, feature: 'COMPLIANCE', roles: [ROLES.ADMIN] },
  { name: 'Invite Management', href: '/portal/invite-management', icon: AiOutlineFileDone, feature: 'COMPLIANCE', roles: [ROLES.ADMIN] },
  { name: 'Drive Sync Status', href: '/portal/drive-sync', icon: AiOutlineAudit, feature: 'COMPLIANCE', roles: [ROLES.ADMIN] },

  // Admin-only modules
  { name: 'Invoices & Financial', href: '/portal/finance', icon: AiOutlineDollar, feature: 'FINANCE', roles: [ROLES.ADMIN] },
  { name: 'Payroll', href: '/portal/payroll', icon: AiOutlineDollar, feature: 'PAYROLL', roles: [ROLES.ADMIN] },
  { name: 'Reports', href: '/portal/reports', icon: AiOutlineBarChart, feature: 'REPORTS', roles: [ROLES.ADMIN] },
  { name: 'Analytics', href: '/portal/analytics', icon: AiOutlineBarChart, feature: 'ANALYTICS', roles: [ROLES.ADMIN] },
  { name: 'Audit Log', href: '/portal/audit', icon: AiOutlineAudit, feature: 'AUDIT_LOG', roles: [ROLES.ADMIN] },
  { name: 'AI Assistant', href: '/portal/ai', icon: AiOutlineRobot, feature: 'AI_ASSISTANT', roles: [ROLES.ADMIN] },
  { name: 'User Management', href: '/portal/users', icon: AiOutlineTeam, feature: 'USER_MANAGEMENT', roles: [ROLES.ADMIN] },
  { name: 'Settings', href: '/portal/settings', icon: AiOutlineSetting, feature: 'SETTINGS', roles: [ROLES.ADMIN] },

  // Client portal
  { name: 'Client Portal', href: '/portal/client-portal', icon: AiOutlineTeam, feature: 'CRM', roles: [ROLES.CLIENT, ROLES.ADMIN] },
];

const isRoleAllowed = (role, allowedRoles) => {
  if (!allowedRoles || allowedRoles.length === 0) return true;
  return allowedRoles.includes(role);
};

const getEnabledNavigation = (role) =>
  allNavigation.filter((item) => isFeatureEnabled(item.feature) && isRoleAllowed(role, item.roles));

const NavItem = ({ item, isActive }) => {
  const Icon = item.icon;

  return (
    <Link
      to={item.href}
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
  const role = user?.role || ROLES.CLIENT;

  return (
    <>
      {/* Mobile menu toggle */}
      <div className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border bg-bg px-4 lg:hidden">
        <h2 className="text-sm font-bold text-white">FORTIS</h2>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="inline-flex items-center rounded-lg p-2 text-text-2 hover:bg-surface focus:outline-none focus:ring-2 focus:ring-brand"
          aria-expanded={mobileOpen}
          aria-label="Toggle navigation menu"
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Navigation */}
      <nav
        className={`${
          mobileOpen ? 'fixed inset-0 z-40 top-16 w-full overflow-y-auto' : 'hidden lg:block lg:flex-shrink-0'
        } lg:static lg:h-screen lg:w-64 lg:border-r lg:border-border bg-bg p-4 overflow-y-auto`}
      >
        <div className="mb-8 hidden lg:block">
          <h2 className="px-3 text-lg font-bold text-text">FORTIS SECURED</h2>
          <p className="px-3 text-xs text-text-3">Internal Portal</p>
        </div>

        <div className="space-y-1" onClick={() => setMobileOpen(false)}>
          {getEnabledNavigation(role).map((item) => (
            <NavItem key={item.name} item={item} isActive={location.pathname === item.href} />
          ))}
        </div>

        <div className="mt-8 border-t border-border pt-4">
          <button onClick={onSignOut} className="fs-nav-item" aria-label="Sign out of portal">
            <AiOutlineLogout className="mr-3 h-5 w-5" aria-hidden="true" />
            Sign Out
          </button>
        </div>
      </nav>

      {/* Mobile overlay backdrop */}
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
