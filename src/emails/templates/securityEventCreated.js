export default {
  subject: (data = {}) => `Security event (${data.severity || 'info'}): ${data.eventType || 'update'}`,
  html: (data = {}) => `
    <p>A security event was recorded in Fortis Secured.</p>
    <p><strong>Severity:</strong> ${data.severity || 'info'}</p>
    <p><strong>Event type:</strong> ${data.eventType || 'N/A'}</p>
    <p><strong>Actor:</strong> ${data.actorId || 'system'}</p>
    <p><strong>Entity:</strong> ${data.entityId || 'N/A'}</p>
    <p><strong>Timestamp:</strong> ${data.createdAt || new Date().toISOString()}</p>
    <p><a href="${data.appUrl || '#'}">Open portal</a></p>
  `,
  text: (data = {}) =>
    `Security event recorded.\nSeverity: ${data.severity || 'info'}\nEvent type: ${data.eventType || 'N/A'}\nActor: ${data.actorId || 'system'}\nEntity: ${data.entityId || 'N/A'}\nTimestamp: ${data.createdAt || new Date().toISOString()}\nPortal: ${data.appUrl || ''}`,
};
