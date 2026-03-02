const safe = (value, fallback = '') => {
  if (value === undefined || value === null) return fallback;
  return String(value);
};

export default {
  subject() {
    return 'Compliance update required';
  },

  html(data = {}) {
    const reviewerName = safe(data.reviewerName, 'Reviewer');
    const reason = safe(data.rejectionReason || data.reason, 'No reason provided');

    return `
      <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111827;">
        <h2>Compliance Requires Updates</h2>
        <p>Your compliance submission was reviewed by ${reviewerName} and requires updates.</p>
        <p><strong>Reason:</strong> ${reason}</p>
      </div>
    `;
  },

  text(data = {}) {
    const reviewerName = safe(data.reviewerName, 'Reviewer');
    const reason = safe(data.rejectionReason || data.reason, 'No reason provided');

    return [
      'Compliance Requires Updates',
      '',
      `Reviewed by: ${reviewerName}`,
      `Reason: ${reason}`,
    ].join('\n');
  },
};
