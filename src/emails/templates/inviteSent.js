const safe = (value, fallback = '') => {
  if (value === undefined || value === null) return fallback;
  return String(value);
};

export default {
  subject(data = {}) {
    return `You're invited to Fortis Secured`;
  },

  html(data = {}) {
    const inviteCode = safe(data.inviteCode, 'N/A');
    const signupUrl = safe(data.signupUrl, '#');
    const expiresAt = safe(data.expiresAt, 'N/A');

    return `
      <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111827;">
        <h2 style="margin-bottom: 8px;">Fortis Secured Invitation</h2>
        <p>You have been invited to access the Fortis Secured portal.</p>
        <p><strong>Invite code:</strong> ${inviteCode}</p>
        <p><strong>Expires:</strong> ${expiresAt}</p>
        <p><a href="${signupUrl}">Complete your registration</a></p>
      </div>
    `;
  },

  text(data = {}) {
    const inviteCode = safe(data.inviteCode, 'N/A');
    const signupUrl = safe(data.signupUrl, '#');
    const expiresAt = safe(data.expiresAt, 'N/A');

    return [
      'Fortis Secured Invitation',
      '',
      'You have been invited to access the Fortis Secured portal.',
      `Invite code: ${inviteCode}`,
      `Expires: ${expiresAt}`,
      `Registration link: ${signupUrl}`,
    ].join('\n');
  },
};
