export default {
  subject: (data = {}) => `Interim incident update: ${data.summary || data.incidentId || 'Incident'}`,
  html: (data = {}) => `
    <p>An incident has been reported and an interim update is available.</p>
    <p><strong>Incident:</strong> ${data.incidentId || 'N/A'}</p>
    <p><strong>Summary:</strong> ${data.summary || 'N/A'}</p>
    <p><strong>Site:</strong> ${data.siteName || data.siteId || 'N/A'}</p>
    <p>Further review is in progress.</p>
    <p><a href="${data.appUrl || '#'}">Open portal</a></p>
  `,
  text: (data = {}) =>
    `An incident has been reported.\nIncident: ${data.incidentId || 'N/A'}\nSummary: ${data.summary || 'N/A'}\nSite: ${data.siteName || data.siteId || 'N/A'}\nFurther review is in progress.\nPortal: ${data.appUrl || ''}`,
};
