const fmt = (value) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export default {
  subject: (data = {}) => `Timesheet approved: ${fmt(data.weekStart)} - ${fmt(data.weekEnd)}`,
  html: (data = {}) => `
    <p>Your timesheet has been approved and locked.</p>
    <p><strong>Week:</strong> ${fmt(data.weekStart)} - ${fmt(data.weekEnd)}</p>
    <p><strong>Total payable hours:</strong> ${data.totalPayHours ?? 'N/A'}</p>
    <p><a href="${data.appUrl || '#'}">View in portal</a></p>
  `,
  text: (data = {}) =>
    `Your timesheet has been approved and locked.\nWeek: ${fmt(data.weekStart)} - ${fmt(data.weekEnd)}\nTotal payable hours: ${data.totalPayHours ?? 'N/A'}\nPortal: ${data.appUrl || ''}`,
};
