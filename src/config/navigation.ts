export type NavigationRole = 'admin' | 'manager' | 'staff' | 'client';

export interface NavigationItem {
  label: string;
  path: string;
}

export interface NavigationGroup {
  label: string;
  roles: NavigationRole[];
  children: NavigationItem[];
}

export const navigationGroups: NavigationGroup[] = [
  {
    label: 'Operations',
    roles: ['admin', 'manager'],
    children: [
      { label: 'Scheduling', path: '/scheduling' },
      { label: 'Incidents', path: '/incidents' },
    ],
  },
  {
    label: 'Compliance',
    roles: ['admin', 'manager', 'staff'],
    children: [
      { label: 'Compliance Wizard', path: '/compliance' },
      { label: 'Vetting Tracker', path: '/vetting' },
    ],
  },
];
