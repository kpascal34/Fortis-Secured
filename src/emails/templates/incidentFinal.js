export default {
  subject: (data = {}) => `Final incident report: ${data.summary || data.incidentId || 'Incident'}`,
  html: (data = {}) => `
    <p>A final incident report has been issued.</p>
    <p><strong>Incident:</strong> ${data.incidentId || 'N/A'}</p>
    <p><strong>Summary:</strong> ${data.summary || 'N/A'}</p>
    <p><strong>Outcome:</strong> ${data.outcome || 'Approved and closed.'}</p>
    <p><a href="${data.appUrl || '#'}">Open portal</a></p>
  `,
  text: (data = {}) =>
    `A final incident report has been issued.\nIncident: ${data.incidentId || 'N/A'}\nSummary: ${data.summary || 'N/A'}\nOutcome: ${data.outcome || 'Approved and closed.'}\nPortal: ${data.appUrl || ''}`,
};
