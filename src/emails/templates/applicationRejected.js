const safe = (value, fallback = '') => {
  if (value === undefined || value === null) return fallback;
  return String(value);
};

export default {
  subject(data = {}) {
    const siteName = safe(data.siteName, 'Shift');
    return `Application update: ${siteName}`;
  },

  html(data = {}) {
    const siteName = safe(data.siteName, 'Shift');
    const date = safe(data.date, 'N/A');
    const reviewerName = safe(data.reviewerName, 'Manager');
    const reason = safe(data.rejectionReason, 'No reason provided');

    return `
      <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111827;">
        <h2>Shift Application Not Approved</h2>
        <p>Your application was reviewed by ${reviewerName}.</p>
        <p><strong>Site:</strong> ${siteName}</p>
        <p><strong>Date:</strong> ${date}</p>
        <p><strong>Reason:</strong> ${reason}</p>
      </div>
    `;
  },

  text(data = {}) {
    const siteName = safe(data.siteName, 'Shift');
    const date = safe(data.date, 'N/A');
    const reviewerName = safe(data.reviewerName, 'Manager');
    const reason = safe(data.rejectionReason, 'No reason provided');

    return [
      'Shift Application Not Approved',
      '',
      `Reviewed by: ${reviewerName}`,
      `Site: ${siteName}`,
      `Date: ${date}`,
      `Reason: ${reason}`,
    ].join('\n');
  },
};
