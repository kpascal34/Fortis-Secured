const safe = (value, fallback = '') => {
  if (value === undefined || value === null) return fallback;
  return String(value);
};

export default {
  subject() {
    return 'Compliance approved';
  },

  html(data = {}) {
    const reviewerName = safe(data.reviewerName, 'Reviewer');
    const note = safe(data.note || data.reviewNotes, '');

    return `
      <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111827;">
        <h2>Compliance Approved</h2>
        <p>Your compliance submission has been approved by ${reviewerName}.</p>
        ${note ? `<p><strong>Note:</strong> ${note}</p>` : ''}
      </div>
    `;
  },

  text(data = {}) {
    const reviewerName = safe(data.reviewerName, 'Reviewer');
    const note = safe(data.note || data.reviewNotes, '');

    return [
      'Compliance Approved',
      '',
      `Approved by: ${reviewerName}`,
      note ? `Note: ${note}` : '',
    ].filter(Boolean).join('\n');
  },
};
