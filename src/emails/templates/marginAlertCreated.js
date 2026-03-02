export default {
  subject: (data = {}) => `Margin alert (${data.severity || 'warning'}): ${data.alertType || 'low_margin'}`,
  html: (data = {}) => `
    <p>A margin anomaly alert has been created.</p>
    <p><strong>Client:</strong> ${data.clientId || 'N/A'}</p>
    <p><strong>Site:</strong> ${data.siteId || 'N/A'}</p>
    <p><strong>Alert Type:</strong> ${data.alertType || 'N/A'}</p>
    <p><strong>Severity:</strong> ${data.severity || 'warning'}</p>
    <p><strong>Threshold:</strong> ${data.thresholdValue ?? 'N/A'}</p>
    <p><strong>Actual:</strong> ${data.actualValue ?? 'N/A'}</p>
    <p><strong>Period:</strong> ${data.periodStart || 'N/A'} to ${data.periodEnd || 'N/A'}</p>
    <p><a href="${data.appUrl || '#'}">Open executive dashboard</a></p>
  `,
  text: (data = {}) =>
    `A margin anomaly alert has been created.\nClient: ${data.clientId || 'N/A'}\nSite: ${data.siteId || 'N/A'}\nAlert Type: ${data.alertType || 'N/A'}\nSeverity: ${data.severity || 'warning'}\nThreshold: ${data.thresholdValue ?? 'N/A'}\nActual: ${data.actualValue ?? 'N/A'}\nPeriod: ${data.periodStart || 'N/A'} to ${data.periodEnd || 'N/A'}\nPortal: ${data.appUrl || ''}`,
};
