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
import { ACTIONS, ROLES, can } from '../lib/authz.js';

const allNavigation = [
  { name: 'Dashboard', href: '/portal', icon: AiOutlineHome, feature: 'DASHBOARD', action: ACTIONS.DASHBOARD_VIEW },
  { name: 'My Profile', href: '/portal/profile', icon: AiOutlineUser, feature: 'PROFILE', action: ACTIONS.PROFILE_VIEW },

  // Staff/Admin operational modules
  { name: 'Clients / CRM', href: '/portal/clients', icon: AiOutlineTeam, feature: 'CRM', action: ACTIONS.CLIENTS_VIEW },
  { name: 'Scheduling', href: '/portal/scheduling', icon: AiOutlineCalendar, feature: 'SCHEDULING', action: ACTIONS.SCHEDULING_VIEW },
  { name: 'Scheduling Board', href: '/portal/scheduling-board', icon: AiOutlineCalendar, feature: 'SCHEDULING', action: ACTIONS.SCHEDULING_VIEW },
  { name: 'Recurring Patterns', href: '/portal/recurring-patterns', icon: AiOutlineReload, feature: 'RECURRING_PATTERNS', action: ACTIONS.SCHEDULING_VIEW },
  { name: 'My Schedule', href: '/portal/my-schedule', icon: AiOutlineUser, feature: 'MY_SCHEDULE', action: ACTIONS.SCHEDULING_VIEW },
  { name: 'Open Shifts', href: '/portal/open-shifts', icon: AiOutlineCalendar, feature: 'OPEN_SHIFTS', action: ACTIONS.SCHEDULING_VIEW },
  { name: 'Shift Applications', href: '/portal/shift-applications', icon: AiOutlineFileDone, feature: 'SHIFT_APPLICATIONS', action: ACTIONS.SCHEDULING_VIEW },
  { name: 'Sites', href: '/portal/sites', icon: AiOutlineInbox, feature: 'SITES', action: ACTIONS.SCHEDULING_VIEW },
  { name: 'Posts', href: '/portal/posts', icon: AiOutlineCheckSquare, feature: 'POSTS', action: ACTIONS.SCHEDULING_VIEW },
  { name: 'Guards', href: '/portal/guards', icon: AiOutlineUser, feature: 'GUARDS', action: ACTIONS.SCHEDULING_VIEW },
  { name: 'Time Tracking', href: '/portal/time', icon: AiOutlineClockCircle, feature: 'TIME_TRACKING', action: ACTIONS.SCHEDULING_VIEW },
  { name: 'Tasks', href: '/portal/tasks', icon: AiOutlineCheckSquare, feature: 'TASKS', action: ACTIONS.SCHEDULING_VIEW },
  { name: 'Incidents', href: '/portal/incidents', icon: AiOutlineWarning, feature: 'INCIDENTS', action: ACTIONS.SCHEDULING_VIEW },
  { name: 'Assets', href: '/portal/assets', icon: AiOutlineInbox, feature: 'ASSETS', action: ACTIONS.SCHEDULING_VIEW },
  { name: 'Messages', href: '/portal/messages', icon: AiOutlineMessage, feature: 'MESSAGES', action: ACTIONS.SCHEDULING_VIEW },

  // Compliance (staff + admin), with admin-only submodules
  { name: 'HR & Compliance', href: '/portal/hr', icon: AiOutlineAudit, feature: 'COMPLIANCE', action: ACTIONS.COMPLIANCE_VIEW },
  { name: 'Compliance Wizard', href: '/portal/compliance', icon: AiOutlineAudit, feature: 'COMPLIANCE', action: ACTIONS.COMPLIANCE_VIEW },
  { name: 'Admin Grading', href: '/portal/admin-grading', icon: AiOutlineFileDone, feature: 'COMPLIANCE', action: ACTIONS.ADMIN_GRADING_VIEW },
  { name: 'Invite Management', href: '/portal/invite-management', icon: AiOutlineFileDone, feature: 'COMPLIANCE', action: ACTIONS.INVITE_MANAGEMENT_VIEW },
  { name: 'Drive Sync Status', href: '/portal/drive-sync', icon: AiOutlineAudit, feature: 'COMPLIANCE', action: ACTIONS.DRIVE_SYNC_VIEW },

  // Admin-only modules
  { name: 'Invoices & Financial', href: '/portal/finance', icon: AiOutlineDollar, feature: 'FINANCE', action: ACTIONS.FINANCE_VIEW },
  { name: 'Payroll', href: '/portal/payroll', icon: AiOutlineDollar, feature: 'PAYROLL', action: ACTIONS.PAYROLL_VIEW },
  { name: 'Reports', href: '/portal/reports', icon: AiOutlineBarChart, feature: 'REPORTS', action: ACTIONS.REPORTS_VIEW },
  { name: 'Analytics', href: '/portal/analytics', icon: AiOutlineBarChart, feature: 'ANALYTICS', action: ACTIONS.ANALYTICS_VIEW },
  { name: 'Audit Log', href: '/portal/audit', icon: AiOutlineAudit, feature: 'AUDIT_LOG', action: ACTIONS.AUDIT_LOG_VIEW },
  { name: 'AI Assistant', href: '/portal/ai', icon: AiOutlineRobot, feature: 'AI_ASSISTANT', action: ACTIONS.AI_ASSISTANT_VIEW },
  { name: 'User Management', href: '/portal/users', icon: AiOutlineTeam, feature: 'USER_MANAGEMENT', action: ACTIONS.USER_MANAGEMENT_VIEW },
  { name: 'Settings', href: '/portal/settings', icon: AiOutlineSetting, feature: 'SETTINGS', action: ACTIONS.SETTINGS_VIEW },
  { name: 'Debug Auth', href: '/portal/admin/debug-auth', icon: AiOutlineSetting, feature: 'USER_MANAGEMENT', action: ACTIONS.DEBUG_AUTH_VIEW },

  // Client portal
  { name: 'Client Portal', href: '/portal/client-portal', icon: AiOutlineTeam, feature: 'CRM', action: ACTIONS.CLIENT_PORTAL_VIEW },
];

const getEnabledNavigation = (role) =>
  allNavigation.filter((item) => isFeatureEnabled(item.feature) && can(role, item.action));

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
