import inviteSent from './inviteSent.js';
import shiftAssigned from './shiftAssigned.js';
import applicationApproved from './applicationApproved.js';
import applicationRejected from './applicationRejected.js';
import complianceSubmitted from './complianceSubmitted.js';
import complianceApproved from './complianceApproved.js';
import complianceRejected from './complianceRejected.js';
import timesheetSubmitted from './timesheetSubmitted.js';
import timesheetApproved from './timesheetApproved.js';
import timesheetRejected from './timesheetRejected.js';
import incidentInterim from './incidentInterim.js';
import incidentFinal from './incidentFinal.js';
import complianceExpiryWarning from './complianceExpiryWarning.js';
import complianceEscalation from './complianceEscalation.js';
import marginAlertCreated from './marginAlertCreated.js';
import securityEventCreated from './securityEventCreated.js';

const TEMPLATE_MAP = {
  inviteSent,
  shiftAssigned,
  applicationApproved,
  applicationRejected,
  complianceSubmitted,
  complianceApproved,
  complianceRejected,
  timesheetSubmitted,
  timesheetApproved,
  timesheetRejected,
  incidentInterim,
  incidentFinal,
  complianceExpiryWarning,
  complianceEscalation,
  marginAlertCreated,
  securityEventCreated,
};

export const NOTIFICATION_EVENT_TYPES = Object.freeze(Object.keys(TEMPLATE_MAP));

export const getEmailTemplate = (eventType) => TEMPLATE_MAP[eventType] || null;

export const renderEmailTemplate = ({ eventType, payload = {}, subjectOverride = '' }) => {
  const template = getEmailTemplate(eventType);
  if (!template) {
    throw new Error(`Unsupported notification event type: ${eventType}`);
  }

  const subject = subjectOverride || template.subject(payload);
  const html = template.html(payload);
  const text = template.text(payload);

  if (!subject || !html || !text) {
    throw new Error(`Email template for '${eventType}' returned an empty part.`);
  }

  return { subject, html, text };
};
