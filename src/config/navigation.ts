export type NavigationRole = 'admin' | 'entity_admin' | 'manager' | 'staff' | 'client';

export interface NavigationItem {
  label: string;
  path: string;
  feature?: string;
}

export interface NavigationGroup {
  label: string;
  roles: NavigationRole[];
  children: NavigationItem[];
}

export const navigationGroups: NavigationGroup[] = [
  {
    label: 'Overview',
    roles: ['admin', 'entity_admin', 'manager', 'staff', 'client'],
    children: [
      { label: 'Dashboard', path: '/portal', feature: 'DASHBOARD' },
      { label: 'Profile', path: '/profile', feature: 'PROFILE' },
    ],
  },
  {
    label: 'Operations',
    roles: ['admin', 'entity_admin', 'manager', 'staff'],
    children: [
      { label: 'Scheduling', path: '/scheduling', feature: 'SCHEDULING' },
      { label: 'My Timesheets', path: '/time', feature: 'TIME_TRACKING' },
      { label: 'Open Shifts', path: '/open-shifts', feature: 'OPEN_SHIFTS' },
      { label: 'My Schedule', path: '/my-schedule', feature: 'MY_SCHEDULE' },
      { label: 'Shift Applications', path: '/shift-applications', feature: 'SHIFT_APPLICATIONS' },
    ],
  },
  {
    label: 'Approvals & Reports',
    roles: ['admin', 'entity_admin', 'manager'],
    children: [
      { label: 'Timesheet Approvals', path: '/time-approvals', feature: 'TIME_TRACKING' },
      { label: 'Incidents', path: '/incidents', feature: 'INCIDENTS' },
    ],
  },
  {
    label: 'Finance',
    roles: ['admin', 'entity_admin'],
    children: [
      { label: 'Exports', path: '/payroll', feature: 'PAYROLL' },
      { label: 'Executive Dashboard', path: '/reports', feature: 'REPORTS' },
      { label: 'Entities', path: '/entities', feature: 'ENTITY_MANAGEMENT' },
      { label: 'Enterprise Alerts', path: '/enterprise-alerts', feature: 'ENTERPRISE_ALERTS' },
      { label: 'Cashflow', path: '/cashflow', feature: 'CASHFLOW_DASHBOARD' },
      { label: 'Resilience', path: '/resilience', feature: 'RESILIENCE_DASHBOARD' },
      { label: 'Tender Workbench', path: '/tender-workbench', feature: 'TENDER_WORKBENCH' },
      { label: 'Employment Risk', path: '/employment-risk', feature: 'EMPLOYMENT_RISK' },
    ],
  },
  {
    label: 'Clients & Sites',
    roles: ['admin', 'entity_admin', 'manager'],
    children: [
      { label: 'Clients', path: '/clients', feature: 'CRM' },
      { label: 'Sites', path: '/sites', feature: 'SITES' },
      { label: 'Guards', path: '/guards', feature: 'GUARDS' },
      { label: 'Invite Management', path: '/invite-management', feature: 'COMPLIANCE' },
    ],
  },
  {
    label: 'Compliance',
    roles: ['admin', 'entity_admin', 'manager', 'staff'],
    children: [
      { label: 'Compliance Wizard', path: '/compliance', feature: 'COMPLIANCE' },
      { label: 'Compliance Flags', path: '/compliance-flags', feature: 'COMPLIANCE' },
      { label: 'Admin Grading', path: '/admin-grading', feature: 'COMPLIANCE' },
      { label: 'Drive Sync', path: '/drive-sync', feature: 'COMPLIANCE' },
    ],
  },
  {
    label: 'Client View',
    roles: ['client'],
    children: [
      { label: 'Client Portal', path: '/client-portal', feature: 'CRM' },
    ],
  },
];
