export default {
  subject: (data = {}) => `Compliance escalation: ${data.type || 'document'} overdue`,
  html: (data = {}) => `
    <p>A compliance issue requires escalation.</p>
    <p><strong>Staff:</strong> ${data.staffName || data.guardId || 'N/A'}</p>
    <p><strong>Type:</strong> ${data.type || 'N/A'}</p>
    <p><strong>Due:</strong> ${data.dueAt || 'N/A'}</p>
    <p><strong>Overdue days:</strong> ${data.overdueDays ?? 'N/A'}</p>
    <p><a href="${data.appUrl || '#'}">Review in portal</a></p>
  `,
  text: (data = {}) =>
    `A compliance issue requires escalation.\nStaff: ${data.staffName || data.guardId || 'N/A'}\nType: ${data.type || 'N/A'}\nDue: ${data.dueAt || 'N/A'}\nOverdue days: ${data.overdueDays ?? 'N/A'}\nPortal: ${data.appUrl || ''}`,
};
