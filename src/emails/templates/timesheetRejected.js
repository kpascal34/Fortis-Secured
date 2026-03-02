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
  subject: (data = {}) => `Timesheet rejected: ${fmt(data.weekStart)} - ${fmt(data.weekEnd)}`,
  html: (data = {}) => `
    <p>Your submitted timesheet has been rejected and returned for edits.</p>
    <p><strong>Week:</strong> ${fmt(data.weekStart)} - ${fmt(data.weekEnd)}</p>
    <p><strong>Reason:</strong> ${data.reason || 'No reason provided.'}</p>
    <p><a href="${data.appUrl || '#'}">Edit timesheet</a></p>
  `,
  text: (data = {}) =>
    `Your submitted timesheet has been rejected.\nWeek: ${fmt(data.weekStart)} - ${fmt(data.weekEnd)}\nReason: ${data.reason || 'No reason provided.'}\nPortal: ${data.appUrl || ''}`,
};
