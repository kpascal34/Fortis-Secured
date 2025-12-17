import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getIconAriaLabel } from '../lib/accessibility.jsx';
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
  AiOutlineDown
} from 'react-icons/ai';

const navigation = [
  { name: 'Dashboard', href: '/portal', icon: AiOutlineHome },
  { name: 'Clients / CRM', href: '/portal/clients', icon: AiOutlineTeam },
  { name: 'Scheduling', href: '/portal/scheduling', icon: AiOutlineCalendar },
  { name: 'My Schedule', href: '/portal/my-schedule', icon: AiOutlineUser },
  { name: 'Open Shifts', href: '/portal/open-shifts', icon: AiOutlineCalendar },
  { name: 'Sites', href: '/portal/sites', icon: AiOutlineInbox },
  { name: 'Posts', href: '/portal/posts', icon: AiOutlineCheckSquare },
  { name: 'Guards', href: '/portal/guards', icon: AiOutlineUser },
  { name: 'Time Tracking', href: '/portal/time', icon: AiOutlineClockCircle },
  { name: 'Tasks', href: '/portal/tasks', icon: AiOutlineCheckSquare },
  { name: 'Incidents', href: '/portal/incidents', icon: AiOutlineWarning },
  { name: 'Assets', href: '/portal/assets', icon: AiOutlineInbox },
  { name: 'Messages', href: '/portal/messages', icon: AiOutlineMessage },
  { name: 'Invoices & Financial', href: '/portal/finance', icon: AiOutlineDollar },
  { name: 'HR & Compliance', href: '/portal/hr', icon: AiOutlineAudit },
  { name: 'Payroll', href: '/portal/payroll', icon: AiOutlineDollar },
  { name: 'Reports', href: '/portal/reports', icon: AiOutlineBarChart },
  { name: 'Analytics', href: '/portal/analytics', icon: AiOutlineBarChart },
  { name: 'Audit Log', href: '/portal/audit', icon: AiOutlineAudit },
  { name: 'AI Assistant', href: '/portal/ai', icon: AiOutlineRobot },
  { name: 'User Management', href: '/portal/users', icon: AiOutlineTeam },
  { name: 'Settings', href: '/portal/settings', icon: AiOutlineSetting },
];

const NavItem = ({ item, isActive }) => {
  const Icon = item.icon;

  return (
    <Link
      to={item.href}
      aria-current={isActive ? 'page' : undefined}
      className={`flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-night-sky ${
        isActive
          ? 'bg-accent text-white'
          : 'text-white/70 hover:bg-white/10 hover:text-white'
      }`}
    >
      <Icon className="mr-3 h-5 w-5" aria-hidden="true" />
      {item.name}
    </Link>
  );
};

export const PortalNav = ({ onSignOut }) => {
  const location = useLocation();

  return (
    <nav className="h-full w-64 overflow-y-auto bg-night-sky p-4">
      <div className="mb-8">
        <h2 className="px-3 text-lg font-bold text-white">FORTIS SECURED</h2>
        <p className="px-3 text-xs text-white/50">Internal Portal</p>
      </div>

      <div className="space-y-1">
        {navigation.map((item) => (
          <NavItem
            key={item.name}
            item={item}
            isActive={location.pathname === item.href}
          />
        ))}
      </div>

      <div className="mt-8 border-t border-white/10 pt-4">
        <button
          onClick={onSignOut}
          className="flex w-full items-center rounded-lg px-3 py-2 text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-night-sky"
          aria-label="Sign out of portal"
        >
          <AiOutlineLogout className="mr-3 h-5 w-5" aria-hidden="true" />
          Sign Out
        </button>
      </div>
    </nav>
  );
};

export default PortalNav;