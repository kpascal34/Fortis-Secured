const safe = (value, fallback = '') => {
  if (value === undefined || value === null) return fallback;
  return String(value);
};

export default {
  subject(data = {}) {
    const staffName = safe(data.staffName, data.staffId || 'Staff');
    return `Compliance submitted: ${staffName}`;
  },

  html(data = {}) {
    const staffName = safe(data.staffName, data.staffId || 'Staff');
    const staffId = safe(data.staffId, 'N/A');
    const submissionId = safe(data.submissionId || data.complianceId, 'N/A');

    return `
      <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111827;">
        <h2>Compliance Submission Received</h2>
        <p>A staff compliance package has been submitted.</p>
        <ul>
          <li><strong>Staff:</strong> ${staffName}</li>
          <li><strong>Staff ID:</strong> ${staffId}</li>
          <li><strong>Submission ID:</strong> ${submissionId}</li>
        </ul>
      </div>
    `;
  },

  text(data = {}) {
    const staffName = safe(data.staffName, data.staffId || 'Staff');
    const staffId = safe(data.staffId, 'N/A');
    const submissionId = safe(data.submissionId || data.complianceId, 'N/A');

    return [
      'Compliance Submission Received',
      '',
      `Staff: ${staffName}`,
      `Staff ID: ${staffId}`,
      `Submission ID: ${submissionId}`,
    ].join('\n');
  },
};
