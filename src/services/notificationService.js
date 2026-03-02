import { ID, Query } from 'appwrite';
import { databases, config } from '../lib/appwrite.js';
import { ensureDatabaseConfig } from '../lib/serviceSecurity.js';
import { NOTIFICATION_EVENT_TYPES, renderEmailTemplate } from '../emails/templates/index.js';

const dbId = config.databaseId;
const outboxCol = config.notificationOutboxCollectionId || 'notification_outbox';
const staffProfilesCol = config.staffProfilesCollectionId || 'staff_profiles';
const guardsCol = config.guardsCollectionId || 'guards';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ensureOutbox = () => {
  ensureDatabaseConfig(outboxCol, 'notification outbox collection');
};

const parseAdminEmails = () =>
  String(config.adminEmails || '')
    .split(',')
    .map((email) => email.trim())
    .filter(Boolean);

const toEventType = (value) => {
  if (!value) return null;
  return String(value).trim();
};

const resolveRecipientProfile = async (userId) => {
  if (!userId || !databases || !dbId) {
    return null;
  }

  if (staffProfilesCol) {
    try {
      const staffDocs = await databases.listDocuments(dbId, staffProfilesCol, [
        Query.equal('userId', userId),
        Query.limit(1),
      ]);

      if (staffDocs.documents.length > 0) {
        return staffDocs.documents[0];
      }
    } catch (error) {
      console.error('[notificationService] Failed to query staff profile by userId.', error);
    }

    try {
      const profile = await databases.getDocument(dbId, staffProfilesCol, userId);
      if (profile) return profile;
    } catch (_) {
      // No profile by document ID
    }
  }

  if (guardsCol) {
    try {
      const guard = await databases.getDocument(dbId, guardsCol, userId);
      if (guard) {
        return {
          ...guard,
          userId,
          fullName:
            guard.fullName || `${guard.firstName || ''} ${guard.lastName || ''}`.trim() || null,
        };
      }
    } catch (_) {
      // No guard document by ID
    }
  }

  return null;
};

const resolveRecipientEmail = async ({ toEmail, userId }) => {
  if (toEmail && EMAIL_RE.test(String(toEmail))) {
    return {
      toEmail: String(toEmail).trim().toLowerCase(),
      profile: null,
    };
  }

  const profile = await resolveRecipientProfile(userId);
  const candidateEmail = profile?.email || null;

  if (!candidateEmail || !EMAIL_RE.test(String(candidateEmail))) {
    throw new Error(`Missing valid recipient email for user '${userId || 'unknown'}'.`);
  }

  return {
    toEmail: String(candidateEmail).trim().toLowerCase(),
    profile,
  };
};

const withCommonPayload = (payload = {}, profile = null) => {
  const appUrl = config.publicBaseUrl || (typeof window !== 'undefined' ? window.location.origin : '');
  return {
    ...payload,
    appUrl,
    staffName:
      payload.staffName ||
      profile?.fullName ||
      [profile?.firstName, profile?.lastName].filter(Boolean).join(' ') ||
      payload.guardName ||
      null,
  };
};

export async function enqueueNotification(eventType, toEmail, payload, { clientId = null, siteId = null, userId = null } = {}) {
  ensureOutbox();

  const normalizedEventType = toEventType(eventType);
  if (!normalizedEventType || !NOTIFICATION_EVENT_TYPES.includes(normalizedEventType)) {
    throw new Error(`Unsupported notification eventType: ${eventType}`);
  }

  if (!toEmail || !EMAIL_RE.test(String(toEmail))) {
    throw new Error('A valid toEmail is required for notification enqueue.');
  }

  const rendered = renderEmailTemplate({
    eventType: normalizedEventType,
    payload: payload || {},
  });

  const document = await databases.createDocument(dbId, outboxCol, ID.unique(), {
    eventType: normalizedEventType,
    toEmail: String(toEmail).trim().toLowerCase(),
    subject: rendered.subject,
    payload: payload || {},
    status: 'pending',
    attempts: 0,
    lastError: null,
    clientId: clientId || null,
    siteId: siteId || null,
    userId: userId || null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  return document;
}

export async function notifyInviteSent({ toEmail, inviteCode, signupUrl, expiresAt, clientId = null, siteId = null, userId = null }) {
  const payload = withCommonPayload({ inviteCode, signupUrl, expiresAt });
  return enqueueNotification('inviteSent', toEmail, payload, { clientId, siteId, userId });
}

export async function notifyShiftAssigned(staffIdOrEmail, shift = {}) {
  const isDirectEmail = EMAIL_RE.test(String(staffIdOrEmail || ''));
  const resolved = await resolveRecipientEmail({
    toEmail: isDirectEmail ? staffIdOrEmail : null,
    userId: isDirectEmail ? null : staffIdOrEmail,
  });

  const payload = withCommonPayload(
    {
      shiftId: shift.$id || shift.id || null,
      siteName: shift.siteName || shift.site || null,
      date: shift.date || null,
      startTime: shift.startTime || null,
      endTime: shift.endTime || null,
    },
    resolved.profile,
  );

  return enqueueNotification('shiftAssigned', resolved.toEmail, payload, {
    clientId: shift.clientId || resolved.profile?.clientId || null,
    siteId: shift.siteId || resolved.profile?.siteId || null,
    userId: isDirectEmail ? null : staffIdOrEmail,
  });
}

export async function notifyApplicationApproved(staffId, application = {}, reviewerName = null) {
  const resolved = await resolveRecipientEmail({ userId: staffId });
  const payload = withCommonPayload(
    {
      shiftId: application.shiftId,
      siteName: application.shiftDetails?.siteName || application.siteName || null,
      date: application.shiftDetails?.date || application.date || null,
      reviewerName: reviewerName || application.reviewerName || null,
    },
    resolved.profile,
  );

  return enqueueNotification('applicationApproved', resolved.toEmail, payload, {
    clientId: application.clientId || resolved.profile?.clientId || null,
    siteId: application.siteId || resolved.profile?.siteId || null,
    userId: staffId,
  });
}

export async function notifyApplicationRejected(staffId, application = {}, reviewerName = null, rejectionReason = null) {
  const resolved = await resolveRecipientEmail({ userId: staffId });
  const payload = withCommonPayload(
    {
      shiftId: application.shiftId,
      siteName: application.shiftDetails?.siteName || application.siteName || null,
      date: application.shiftDetails?.date || application.date || null,
      reviewerName: reviewerName || application.reviewerName || null,
      rejectionReason: rejectionReason || application.rejectionReason || null,
    },
    resolved.profile,
  );

  return enqueueNotification('applicationRejected', resolved.toEmail, payload, {
    clientId: application.clientId || resolved.profile?.clientId || null,
    siteId: application.siteId || resolved.profile?.siteId || null,
    userId: staffId,
  });
}

export async function notifyComplianceSubmitted(staffId, complianceId, _reviewerIds = [], options = {}) {
  const opsEmail = options.toEmail || config.opsEmail || parseAdminEmails()[0];
  if (!opsEmail) {
    throw new Error('No OPS/admin email configured for complianceSubmitted notification.');
  }

  const profile = await resolveRecipientProfile(staffId);
  const payload = withCommonPayload(
    {
      staffId,
      staffName: profile?.fullName || null,
      complianceId,
      submissionId: complianceId,
    },
    profile,
  );

  return enqueueNotification('complianceSubmitted', opsEmail, payload, {
    clientId: options.clientId || profile?.clientId || null,
    siteId: options.siteId || profile?.siteId || null,
    userId: staffId,
  });
}

export async function notifyComplianceApproved(staffId, complianceId, reviewerName = null, note = null) {
  const resolved = await resolveRecipientEmail({ userId: staffId });
  const payload = withCommonPayload(
    {
      staffId,
      complianceId,
      reviewerName,
      note,
    },
    resolved.profile,
  );

  return enqueueNotification('complianceApproved', resolved.toEmail, payload, {
    clientId: resolved.profile?.clientId || null,
    siteId: resolved.profile?.siteId || null,
    userId: staffId,
  });
}

export async function notifyComplianceRejected(staffId, complianceId, reason = null, reviewerName = null) {
  const resolved = await resolveRecipientEmail({ userId: staffId });
  const payload = withCommonPayload(
    {
      staffId,
      complianceId,
      reviewerName,
      rejectionReason: reason,
      reason,
    },
    resolved.profile,
  );

  return enqueueNotification('complianceRejected', resolved.toEmail, payload, {
    clientId: resolved.profile?.clientId || null,
    siteId: resolved.profile?.siteId || null,
    userId: staffId,
  });
}

export async function notifyTimesheetSubmitted({
  toEmail = null,
  guardId = null,
  staffName = null,
  weekStart = null,
  weekEnd = null,
  totalPayHours = null,
  clientId = null,
  siteId = null,
  userId = null,
} = {}) {
  const resolvedToEmail =
    toEmail ||
    config.opsEmail ||
    parseAdminEmails()[0];

  if (!resolvedToEmail) {
    throw new Error('No recipient configured for timesheetSubmitted notification.');
  }

  return enqueueNotification(
    'timesheetSubmitted',
    resolvedToEmail,
    withCommonPayload({
      guardId,
      staffName,
      weekStart,
      weekEnd,
      totalPayHours,
    }),
    { clientId, siteId, userId },
  );
}

export async function notifyTimesheetApproved(staffId, timesheet = {}) {
  const resolved = await resolveRecipientEmail({ userId: staffId });
  return enqueueNotification(
    'timesheetApproved',
    resolved.toEmail,
    withCommonPayload(
      {
        guardId: staffId,
        weekStart: timesheet.weekStart,
        weekEnd: timesheet.weekEnd,
        totalPayHours: Number(timesheet.totalPayMinutes || 0) / 60,
      },
      resolved.profile,
    ),
    {
      clientId: timesheet.clientId || resolved.profile?.clientId || null,
      siteId: timesheet.siteId || resolved.profile?.siteId || null,
      userId: staffId,
    },
  );
}

export async function notifyTimesheetRejected(staffId, timesheet = {}, reason = null) {
  const resolved = await resolveRecipientEmail({ userId: staffId });
  return enqueueNotification(
    'timesheetRejected',
    resolved.toEmail,
    withCommonPayload(
      {
        guardId: staffId,
        weekStart: timesheet.weekStart,
        weekEnd: timesheet.weekEnd,
        reason: reason || timesheet.rejectionReason || null,
      },
      resolved.profile,
    ),
    {
      clientId: timesheet.clientId || resolved.profile?.clientId || null,
      siteId: timesheet.siteId || resolved.profile?.siteId || null,
      userId: staffId,
    },
  );
}

export async function notifyIncidentInterim({
  toEmail,
  incidentId,
  summary,
  siteId = null,
  siteName = null,
  clientId = null,
  userId = null,
} = {}) {
  if (!toEmail) {
    throw new Error('toEmail is required for incident interim notifications.');
  }

  return enqueueNotification(
    'incidentInterim',
    toEmail,
    withCommonPayload({ incidentId, summary, siteId, siteName }),
    { clientId, siteId, userId },
  );
}

export async function notifyIncidentFinal({
  toEmail,
  incidentId,
  summary,
  outcome = null,
  siteId = null,
  clientId = null,
  userId = null,
} = {}) {
  if (!toEmail) {
    throw new Error('toEmail is required for incident final notifications.');
  }

  return enqueueNotification(
    'incidentFinal',
    toEmail,
    withCommonPayload({ incidentId, summary, outcome, siteId }),
    { clientId, siteId, userId },
  );
}

export async function notifyComplianceExpiryWarning({
  toEmail,
  guardId = null,
  staffName = null,
  type,
  dueAt,
  daysRemaining,
  clientId = null,
  siteId = null,
  userId = null,
} = {}) {
  if (!toEmail) {
    throw new Error('toEmail is required for compliance expiry warning.');
  }

  return enqueueNotification(
    'complianceExpiryWarning',
    toEmail,
    withCommonPayload({ guardId, staffName, type, dueAt, daysRemaining }),
    { clientId, siteId, userId },
  );
}

export async function notifyComplianceEscalation({
  toEmail,
  guardId = null,
  staffName = null,
  type,
  dueAt,
  overdueDays,
  clientId = null,
  siteId = null,
  userId = null,
} = {}) {
  if (!toEmail) {
    throw new Error('toEmail is required for compliance escalation.');
  }

  return enqueueNotification(
    'complianceEscalation',
    toEmail,
    withCommonPayload({ guardId, staffName, type, dueAt, overdueDays }),
    { clientId, siteId, userId },
  );
}

export async function notifyMarginAlertCreated({
  toEmail = null,
  alertType,
  severity = 'warning',
  thresholdValue = null,
  actualValue = null,
  periodStart = null,
  periodEnd = null,
  clientId = null,
  siteId = null,
  shiftId = null,
  userId = null,
} = {}) {
  const resolvedToEmail = toEmail || config.opsEmail || parseAdminEmails()[0];
  if (!resolvedToEmail) {
    throw new Error('No recipient configured for margin alert notifications.');
  }

  return enqueueNotification(
    'marginAlertCreated',
    resolvedToEmail,
    withCommonPayload({
      alertType,
      severity,
      thresholdValue,
      actualValue,
      periodStart,
      periodEnd,
      clientId,
      siteId,
      shiftId,
    }),
    { clientId, siteId, userId },
  );
}

export async function notifySecurityEventCreated({
  toEmail = null,
  actorId = null,
  eventType,
  severity = 'info',
  entityId = null,
  metadata = {},
  userId = null,
  clientId = null,
  siteId = null,
} = {}) {
  const resolvedToEmail = toEmail || config.opsEmail || parseAdminEmails()[0];
  if (!resolvedToEmail) {
    throw new Error('No recipient configured for security event notifications.');
  }

  return enqueueNotification(
    'securityEventCreated',
    resolvedToEmail,
    withCommonPayload({
      actorId,
      eventType,
      severity,
      entityId,
      metadata,
      createdAt: new Date().toISOString(),
    }),
    { clientId, siteId, userId },
  );
}

const deprecated = (name) => {
  throw new Error(`${name} is deprecated. Use enqueueNotification(...) with supported event types.`);
};

// Compatibility exports retained for legacy imports.
export async function sendComplianceNotification() {
  return deprecated('sendComplianceNotification');
}

export async function notifyStepSaved() {
  return deprecated('notifyStepSaved');
}

export async function notifyMissingSections() {
  return deprecated('notifyMissingSections');
}

export async function notifyLicenceExpiring() {
  return deprecated('notifyLicenceExpiring');
}

export async function notifyComplianceTask() {
  return deprecated('notifyComplianceTask');
}

export async function notifyGradingFeedback() {
  return deprecated('notifyGradingFeedback');
}
