const safe = (value, fallback = '') => {
  if (value === undefined || value === null) return fallback;
  return String(value);
};

export default {
  subject(data = {}) {
    const date = safe(data.date, 'upcoming shift');
    return `Shift assigned: ${date}`;
  },

  html(data = {}) {
    const siteName = safe(data.siteName, 'Site');
    const date = safe(data.date, 'N/A');
    const startTime = safe(data.startTime, 'N/A');
    const endTime = safe(data.endTime, 'N/A');
    const appUrl = safe(data.appUrl, '');

    return `
      <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111827;">
        <h2>New Shift Assignment</h2>
        <p>You have been assigned to a shift.</p>
        <ul>
          <li><strong>Site:</strong> ${siteName}</li>
          <li><strong>Date:</strong> ${date}</li>
          <li><strong>Time:</strong> ${startTime} - ${endTime}</li>
        </ul>
        ${appUrl ? `<p><a href="${appUrl}">Open portal</a></p>` : ''}
      </div>
    `;
  },

  text(data = {}) {
    const siteName = safe(data.siteName, 'Site');
    const date = safe(data.date, 'N/A');
    const startTime = safe(data.startTime, 'N/A');
    const endTime = safe(data.endTime, 'N/A');
    const appUrl = safe(data.appUrl, '');

    return [
      'New Shift Assignment',
      '',
      `Site: ${siteName}`,
      `Date: ${date}`,
      `Time: ${startTime} - ${endTime}`,
      appUrl ? `Portal: ${appUrl}` : '',
    ].filter(Boolean).join('\n');
  },
};
