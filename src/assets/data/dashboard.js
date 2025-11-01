export const sampleStats = [
  { label: 'Total Clients', value: 3, helper: '2 Active, 1 Pending' },
  { label: 'Active Shifts', value: 0, helper: 'No shifts today' },
  { label: 'Pending Tasks', value: 3, helper: '1 Overdue' },
  { label: 'Total Guards', value: 7, helper: 'All active' },
];

export const sampleClients = [
  {
    name: 'Industrial Park Ltd',
    status: 'Pending',
    location: 'Birmingham, UK',
    billing: '£18,000/year',
  },
  {
    name: 'Metro Shopping Centre',
    status: 'Active',
    location: 'London, UK',
    billing: '£45,000/year',
  },
  {
    name: 'Riverside Office Complex',
    status: 'Active',
    location: 'Manchester, UK',
    billing: '£32,000/year',
  },
];

export const sampleTasks = [
  {
    title: 'Patrol Main Entrance',
    status: 'In Progress',
    meta: 'Guard: John Smith',
    due: 'Due: Today, 18:00',
  },
  {
    title: 'Equipment Check',
    status: 'Pending',
    meta: 'All security equipment',
    due: 'Due: Tomorrow, 09:00',
  },
  {
    title: 'Security Training',
    status: 'Completed',
    meta: 'Monthly training session',
    due: 'Completed: Yesterday',
  },
  {
    title: 'Incident Report Review',
    status: 'Overdue',
    meta: 'Review pending incidents',
    due: 'Was due: 2 days ago',
  },
];

export const sampleIncidents = [
  {
    title: 'Unauthorized Access Attempt',
    status: 'Investigating',
    location: 'Metro Shopping Centre',
    timestamp: 'Reported: 2 hours ago',
    summary: 'Suspicious individual at rear entrance',
  },
  {
    title: 'Equipment Malfunction',
    status: 'Resolved',
    location: 'Industrial Park Ltd',
    timestamp: 'Reported: Yesterday',
    summary: 'CCTV camera #3 repaired',
  },
  {
    title: 'Suspicious Activity',
    status: 'Investigating',
    location: 'Riverside Office Complex',
    timestamp: 'Reported: 5 hours ago',
    summary: 'Unidentified vehicle in parking lot',
  },
];
