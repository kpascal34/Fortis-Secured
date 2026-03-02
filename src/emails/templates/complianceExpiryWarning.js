export default {
  subject: (data = {}) => `Compliance warning: ${data.type || 'document'} expires soon`,
  html: (data = {}) => `
    <p>A compliance item is approaching expiry.</p>
    <p><strong>Staff:</strong> ${data.staffName || data.guardId || 'N/A'}</p>
    <p><strong>Type:</strong> ${data.type || 'N/A'}</p>
    <p><strong>Due:</strong> ${data.dueAt || 'N/A'}</p>
    <p><strong>Days remaining:</strong> ${data.daysRemaining ?? 'N/A'}</p>
    <p><a href="${data.appUrl || '#'}">Review in portal</a></p>
  `,
  text: (data = {}) =>
    `A compliance item is approaching expiry.\nStaff: ${data.staffName || data.guardId || 'N/A'}\nType: ${data.type || 'N/A'}\nDue: ${data.dueAt || 'N/A'}\nDays remaining: ${data.daysRemaining ?? 'N/A'}\nPortal: ${data.appUrl || ''}`,
};
