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
  subject: (data = {}) => `Timesheet submitted: ${data.staffName || data.guardId || 'Staff'}`,
  html: (data = {}) => `
    <p>A timesheet has been submitted and is awaiting approval.</p>
    <p><strong>Staff:</strong> ${data.staffName || data.guardId || 'Unknown'}</p>
    <p><strong>Week:</strong> ${fmt(data.weekStart)} - ${fmt(data.weekEnd)}</p>
    <p><strong>Total payable hours:</strong> ${data.totalPayHours ?? 'N/A'}</p>
    <p><a href="${data.appUrl || '#'}">Open portal</a></p>
  `,
  text: (data = {}) =>
    `A timesheet has been submitted.\nStaff: ${data.staffName || data.guardId || 'Unknown'}\nWeek: ${fmt(data.weekStart)} - ${fmt(data.weekEnd)}\nTotal payable hours: ${data.totalPayHours ?? 'N/A'}\nPortal: ${data.appUrl || ''}`,
};
