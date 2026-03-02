/**
 * Scheduling Service
 * Model A tenancy + RBAC enforced for all reads and writes.
 */

import { ID, Query } from 'appwrite';
import { databases, config } from '../lib/appwrite.js';
import { PERMISSIONS } from '../lib/rbac.ts';
import { ensureDatabaseConfig, getAuthorizedScope, withScopedQueries, assertScopedDocument, resolveActor } from '../lib/serviceSecurity.js';
import {
  RESOURCE_TYPES,
  assertScopedAccess,
  enforceTenancyFields,
  getScope,
  normalizeTenancyDocument,
} from '../lib/tenancyScope.js';
import { logEvent } from './auditLogService.js';
import { notifyApplicationApproved, notifyApplicationRejected, notifyShiftAssigned } from './notificationService.js';

const dbId = config.databaseId;
const shiftsCol = config.shiftsCollectionId || 'shifts';
const applicationsCol = config.applicationsCollectionId || 'applications';
const assignmentsCol = config.shiftAssignmentsCollectionId || 'shift_assignments';
const sitesCol = config.sitesCollectionId || 'sites';
const staffProfilesCol = config.staffProfilesCollectionId || 'staff_profiles';
const staffComplianceCol = config.staffComplianceCollectionId || 'staff_compliance';
const staffGradesCol = config.staffGradesCollectionId || 'staff_grades';
const LICENSE_EXPIRY_THRESHOLD_DAYS = config.licenseExpiryThresholdDays;

const MAX_LIST_LIMIT = 500;

const ensureCollections = () => {
  ensureDatabaseConfig(shiftsCol, 'shifts collection');
  ensureDatabaseConfig(applicationsCol, 'applications collection');
};

const toIsoDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
};

const extractDateOnlyIso = (value) => {
  const date = toIsoDate(value);
  if (!date) return null;
  return date;
};

const parseJson = (value, fallback = {}) => {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  if (typeof value !== 'string') return fallback;
  try {
    return JSON.parse(value);
  } catch (_) {
    return fallback;
  }
};

const toShiftTitle = (shiftData) =>
  shiftData.title || shiftData.positionTitle || shiftData.position || 'Shift';

const validateShiftData = (data) => {
  const required = ['siteId', 'startTime', 'endTime'];
  for (const field of required) {
    if (!data[field]) throw new Error(`Missing required field: ${field}`);
  }

  const shiftStart = new Date(data.startTime);
  const shiftEnd = new Date(data.endTime);

  if (Number.isNaN(shiftStart.getTime()) || Number.isNaN(shiftEnd.getTime())) {
    throw new Error('Shift startTime and endTime must be valid ISO strings');
  }

  if (shiftEnd <= shiftStart) {
    throw new Error('Shift end time must be after start time');
  }

  if (data.minimumGradeRequired && (data.minimumGradeRequired < 1 || data.minimumGradeRequired > 5)) {
    throw new Error('minimumGradeRequired must be between 1 and 5');
  }

  if (data.positionsOpen !== undefined && Number(data.positionsOpen) < 1) {
    throw new Error('positionsOpen must be at least 1');
  }
};

const resolveSite = async (siteId) => {
  if (!siteId) return null;
  if (!sitesCol || !databases || !dbId) return null;

  try {
    return await databases.getDocument(dbId, sitesCol, siteId);
  } catch (error) {
    throw new Error(`Site ${siteId} not found: ${error.message}`);
  }
};

const buildShiftPayload = ({ actor, clientId, shiftData }) => {
  const date = extractDateOnlyIso(shiftData.date || shiftData.shiftDate || shiftData.startTime);

  const payload = {
    shiftId: shiftData.shiftId || ID.unique(),
    clientId,
    siteId: shiftData.siteId,
    date,
    startTime: shiftData.startTime,
    endTime: shiftData.endTime,
    position: shiftData.position || null,
    positionTitle: shiftData.positionTitle || shiftData.position || null,
    title: toShiftTitle(shiftData),
    description: shiftData.description || null,
    requirements: shiftData.requirements || null,
    specialRequirements: shiftData.specialRequirements || null,
    notes: shiftData.notes || null,
    status: shiftData.status || 'open',
    published: shiftData.published || 'false',
    guardId: shiftData.guardId || null,
    assignedGuardId: shiftData.assignedGuardId || null,
    assignedGuardName: shiftData.assignedGuardName || null,
    staffId: shiftData.staffId || null,
    positionsOpen: Number(shiftData.positionsOpen || shiftData.requiredHeadcount || 1),
    requiredHeadcount: Number(shiftData.requiredHeadcount || shiftData.positionsOpen || 1),
    minimumGradeRequired: shiftData.minimumGradeRequired || null,
    hourlyRate: shiftData.hourlyRate || null,
    breakLength: shiftData.breakLength || null,
    createdBy: actor?.$id || null,
    updatedAt: new Date().toISOString(),
    createdAt: shiftData.createdAt || new Date().toISOString(),
  };

  enforceTenancyFields('shifts', payload);
  return payload;
};

const buildApplicationPayload = ({ actor, shift, eligibility }) => {
  const shiftDetails = {
    shiftId: shift.$id,
    title: shift.title || shift.positionTitle || 'Shift',
    siteId: shift.siteId,
    clientId: shift.clientId,
    date: shift.date,
    startTime: shift.startTime,
    endTime: shift.endTime,
  };

  const payload = {
    guardId: actor.$id,
    guardName: actor.name || actor.profile?.fullName || actor.email || 'Staff',
    shiftId: shift.$id,
    clientId: shift.clientId,
    siteId: shift.siteId,
    shiftDetails,
    eligibilityScore: eligibility,
    status: 'pending',
    appliedAt: new Date().toISOString(),
    reviewedAt: null,
    reviewedBy: null,
    reviewerName: null,
    reviewNotes: null,
    rejectionReason: null,
  };

  enforceTenancyFields('applications', payload);
  return payload;
};

const parseEligibility = (app) => ({
  ...app,
  shiftDetails: parseJson(app.shiftDetails, {}),
  eligibilityScore: parseJson(app.eligibilityScore, {}),
});

/**
 * Create shift (admin/manager only)
 */
export async function createShift(createdBy, clientId, shiftData, actor = null) {
  ensureCollections();
  validateShiftData(shiftData);

  const { actor: resolvedActor, scope } = await getAuthorizedScope({
    actor,
    permission: PERMISSIONS.MANAGE_SHIFTS,
  });

  if (createdBy && String(createdBy) !== String(resolvedActor.$id) && scope.role !== 'admin') {
    throw new Error('Cannot create shift on behalf of another user.');
  }

  const site = await resolveSite(shiftData.siteId);
  if (site) {
    assertScopedAccess(RESOURCE_TYPES.SITES, site, scope);
  }

  const effectiveClientId =
    clientId ||
    shiftData.clientId ||
    site?.clientId ||
    resolvedActor?.profile?.clientId ||
    scope.clientId;

  if (!effectiveClientId) {
    throw new Error('clientId is required to create a shift.');
  }

  const payload = buildShiftPayload({ actor: resolvedActor, clientId: effectiveClientId, shiftData });

  const shift = await databases.createDocument(dbId, shiftsCol, ID.unique(), payload);

  await logEvent({
    actorId: resolvedActor.$id,
    action: 'shift.created',
    resourceType: RESOURCE_TYPES.SHIFTS,
    resourceId: shift.$id,
    clientId: payload.clientId,
    siteId: payload.siteId,
    metadata: {
      createdBy,
      inputShiftDate: shiftData.shiftDate || null,
      normalizedDate: payload.date,
      status: payload.status,
    },
  });

  return normalizeTenancyDocument(RESOURCE_TYPES.SHIFTS, shift);
}

/**
 * Get shifts with tenancy scope.
 */
export async function getShifts(userId, userRole, userClientId = null, actor = null) {
  ensureCollections();

  let resolvedActor = actor;
  if (!resolvedActor) {
    try {
      resolvedActor = await resolveActor();
    } catch (_) {
      if (!userId || !userRole) {
        throw new Error('Unable to resolve actor for shift listing.');
      }
      resolvedActor = {
        $id: userId,
        role: userRole,
        profile: userClientId ? { clientId: userClientId } : {},
      };
    }
  }

  const scope = getScope(resolvedActor, resolvedActor.profile || {});
  if (!scope.role) {
    throw new Error('Unable to resolve tenancy scope for shifts.');
  }

  const canViewScheduling =
    scope.role === 'staff'
      ? true
      : await getAuthorizedScope({ actor: resolvedActor, permission: PERMISSIONS.VIEW_SCHEDULING }).then(() => true).catch(() => false);

  if (!canViewScheduling) {
    throw new Error('Permission denied for shift listing.');
  }

  const queries = withScopedQueries(RESOURCE_TYPES.SHIFTS, scope, [
    Query.orderAsc('date'),
    Query.orderAsc('startTime'),
    Query.limit(MAX_LIST_LIMIT),
  ]);

  const result = await databases.listDocuments(dbId, shiftsCol, queries);
  return result.documents.map((doc) => normalizeTenancyDocument(RESOURCE_TYPES.SHIFTS, doc));
}

/**
 * Get single shift with scoped access.
 */
export async function getShiftDetail(shiftId, actor = null) {
  ensureCollections();

  const { scope } = await getAuthorizedScope({ actor, permission: PERMISSIONS.VIEW_SCHEDULING });
  const shift = await databases.getDocument(dbId, shiftsCol, shiftId);
  const normalized = normalizeTenancyDocument(RESOURCE_TYPES.SHIFTS, shift);
  assertScopedDocument(RESOURCE_TYPES.SHIFTS, normalized, scope);
  return normalized;
}

/**
 * Apply for shift (staff).
 */
export async function applyForShift(staffId, shiftId, actor = null) {
  ensureCollections();

  const { actor: resolvedActor, scope } = await getAuthorizedScope({
    actor,
    permission: PERMISSIONS.APPLY_SHIFT,
  });

  if (scope.role === 'staff' && String(staffId) !== String(resolvedActor.$id)) {
    throw new Error('Staff can only apply for their own account.');
  }

  const shift = await getShiftDetail(shiftId, resolvedActor);

  if (!['open', 'scheduled'].includes(String(shift.status || '').toLowerCase())) {
    throw new Error('Shift is not open for applications.');
  }

  const existing = await databases.listDocuments(dbId, applicationsCol, [
    Query.equal('shiftId', shiftId),
    Query.equal('guardId', staffId),
    Query.limit(1),
  ]);

  if (existing.documents.length > 0 && ['pending', 'approved'].includes(existing.documents[0].status)) {
    throw new Error(`Already applied (${existing.documents[0].status}).`);
  }

  const eligibility = await checkEligibility(staffId, shift);
  if (!eligibility.licenseEligible) {
    throw new Error(`Licence invalid or expiring within ${LICENSE_EXPIRY_THRESHOLD_DAYS} days`);
  }

  const payload = buildApplicationPayload({ actor: resolvedActor, shift, eligibility });
  const application = await databases.createDocument(dbId, applicationsCol, ID.unique(), payload);

  await logEvent({
    actorId: resolvedActor.$id,
    action: 'shift.application.created',
    resourceType: RESOURCE_TYPES.APPLICATIONS,
    resourceId: application.$id,
    clientId: payload.clientId,
    siteId: payload.siteId,
    metadata: {
      shiftId,
      eligible: eligibility.compliant && eligibility.gradeEligible && eligibility.licenseEligible,
    },
  });

  return parseEligibility(normalizeTenancyDocument(RESOURCE_TYPES.APPLICATIONS, application));
}

async function checkEligibility(staffId, shift) {
  const reasons = [];
  let compliant = false;
  let gradeEligible = false;
  let licenseEligible = false;

  const compDocs = await databases.listDocuments(dbId, staffComplianceCol, [
    Query.equal('staffId', staffId),
    Query.limit(1),
  ]);

  if (compDocs.documents.length === 0) {
    reasons.push('Compliance not started');
  } else {
    const comp = compDocs.documents[0];
    if (comp.status === 'approved') {
      compliant = true;
    } else {
      reasons.push(`Compliance status: ${comp.status}`);
    }
  }

  if (shift.minimumGradeRequired) {
    const gradeDocs = await databases.listDocuments(dbId, staffGradesCol, [
      Query.equal('staffId', staffId),
      Query.limit(1),
    ]);

    if (gradeDocs.documents.length === 0 || !gradeDocs.documents[0].overallGrade) {
      reasons.push('Not yet graded');
    } else {
      const grade = gradeDocs.documents[0].overallGrade;
      if (grade >= shift.minimumGradeRequired) {
        gradeEligible = true;
      } else {
        reasons.push(`Grade ${grade} below required ${shift.minimumGradeRequired}`);
      }
    }
  } else {
    gradeEligible = true;
  }

  try {
    const profile = await databases.getDocument(dbId, staffProfilesCol, staffId);
    const expiry = profile.licenseExpiry || profile.siaExpiryDate;

    if (expiry) {
      const expiryDate = new Date(expiry);
      const daysUntilExpiry = Math.floor((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

      if (daysUntilExpiry < 0) {
        reasons.push('Licence expired');
      } else if (daysUntilExpiry <= LICENSE_EXPIRY_THRESHOLD_DAYS) {
        reasons.push(`Licence expiring within ${LICENSE_EXPIRY_THRESHOLD_DAYS} days`);
      } else {
        licenseEligible = true;
      }
    } else {
      reasons.push('No licence expiry on file');
    }
  } catch (error) {
    console.warn('Could not fetch staff profile for licence check', error);
    reasons.push('Licence check unavailable');
  }

  return {
    compliant,
    gradeEligible,
    licenseEligible,
    reasons,
  };
}

/**
 * Review shift application (admin/manager).
 */
export async function reviewApplication(adminId, applicationId, accepted, actor = null) {
  ensureCollections();

  const { actor: resolvedActor, scope } = await getAuthorizedScope({
    actor,
    permission: PERMISSIONS.REVIEW_SHIFT_APPLICATIONS,
  });

  if (adminId && String(adminId) !== String(resolvedActor.$id) && scope.role !== 'admin') {
    throw new Error('Cannot review application on behalf of another user.');
  }

  const app = await databases.getDocument(dbId, applicationsCol, applicationId);
  const normalizedApp = normalizeTenancyDocument(RESOURCE_TYPES.APPLICATIONS, app);
  assertScopedDocument(RESOURCE_TYPES.APPLICATIONS, normalizedApp, scope);

  if (normalizedApp.status !== 'pending') {
    throw new Error('Application is not pending.');
  }

  const status = accepted ? 'approved' : 'rejected';
  const updated = await databases.updateDocument(dbId, applicationsCol, applicationId, {
    status,
    reviewedBy: resolvedActor.$id,
    reviewerName: resolvedActor.name || resolvedActor.email || 'Reviewer',
    reviewedAt: new Date().toISOString(),
  });

  if (accepted) {
    const shift = await databases.getDocument(dbId, shiftsCol, normalizedApp.shiftId);
    const normalizedShift = normalizeTenancyDocument(RESOURCE_TYPES.SHIFTS, shift);
    assertScopedDocument(RESOURCE_TYPES.SHIFTS, normalizedShift, scope);

    await databases.updateDocument(dbId, shiftsCol, normalizedShift.$id, {
      assignedGuardId: normalizedApp.guardId,
      assignedGuardName: normalizedApp.guardName,
      status: 'assigned',
      updatedAt: new Date().toISOString(),
    });

    if (assignmentsCol) {
      const assignmentPayload = {
        shiftId: normalizedShift.$id,
        clientId: normalizedShift.clientId,
        siteId: normalizedShift.siteId,
        guardId: normalizedApp.guardId,
        staffId: normalizedApp.guardId,
        status: 'assigned',
        assignedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      enforceTenancyFields('shift_assignments', assignmentPayload);

      await databases.createDocument(dbId, assignmentsCol, ID.unique(), assignmentPayload);
    }

    try {
      await notifyShiftAssigned(normalizedApp.guardId, {
        $id: normalizedShift.$id,
        siteName: normalizedShift.siteName || normalizedApp.shiftDetails?.siteName || null,
        date: normalizedShift.date,
        startTime: normalizedShift.startTime,
        endTime: normalizedShift.endTime,
        clientId: normalizedShift.clientId || normalizedApp.clientId || null,
        siteId: normalizedShift.siteId || normalizedApp.siteId || null,
      });
    } catch (notifyError) {
      console.error('[schedulingService] Failed to enqueue shiftAssigned notification:', notifyError);
    }
  }

  await logEvent({
    actorId: resolvedActor.$id,
    action: 'shift.application.reviewed',
    resourceType: RESOURCE_TYPES.APPLICATIONS,
    resourceId: applicationId,
    clientId: normalizedApp.clientId,
    siteId: normalizedApp.siteId,
    metadata: {
      accepted,
      reviewer: resolvedActor.$id,
      shiftId: normalizedApp.shiftId,
    },
  });

  try {
    if (accepted) {
      await notifyApplicationApproved(normalizedApp.guardId, normalizedApp, resolvedActor.name || resolvedActor.email || 'Reviewer');
    } else {
      await notifyApplicationRejected(
        normalizedApp.guardId,
        normalizedApp,
        resolvedActor.name || resolvedActor.email || 'Reviewer',
        normalizedApp.rejectionReason || 'Application not approved'
      );
    }
  } catch (notifyError) {
    console.error('[schedulingService] Failed to enqueue application review notification:', notifyError);
  }

  return parseEligibility(normalizeTenancyDocument(RESOURCE_TYPES.APPLICATIONS, updated));
}

/**
 * Get applications for a shift with tenancy filters.
 */
export async function getShiftApplications(shiftId, adminId, actor = null) {
  ensureCollections();

  const { scope } = await getAuthorizedScope({ actor, permission: PERMISSIONS.REVIEW_SHIFT_APPLICATIONS });

  const queries = withScopedQueries(RESOURCE_TYPES.APPLICATIONS, scope, [
    Query.equal('shiftId', shiftId),
    Query.orderDesc('appliedAt'),
    Query.limit(MAX_LIST_LIMIT),
  ]);

  const apps = await databases.listDocuments(dbId, applicationsCol, queries);
  return apps.documents.map((app) => parseEligibility(normalizeTenancyDocument(RESOURCE_TYPES.APPLICATIONS, app)));
}

/**
 * Get applications for current staff member.
 */
export async function getMyApplications(staffId, actor = null) {
  ensureCollections();

  const { actor: resolvedActor, scope } = await getAuthorizedScope({ actor, permission: PERMISSIONS.APPLY_SHIFT });

  if (scope.role === 'staff' && String(staffId) !== String(resolvedActor.$id)) {
    throw new Error('Staff can only view their own applications.');
  }

  const queries = withScopedQueries(RESOURCE_TYPES.APPLICATIONS, scope, [
    Query.equal('guardId', staffId),
    Query.orderDesc('appliedAt'),
    Query.limit(MAX_LIST_LIMIT),
  ]);

  const apps = await databases.listDocuments(dbId, applicationsCol, queries);
  return apps.documents.map((app) => parseEligibility(normalizeTenancyDocument(RESOURCE_TYPES.APPLICATIONS, app)));
}

/**
 * Cancel shift (admin/manager).
 */
export async function cancelShift(adminId, shiftId, reason, actor = null) {
  ensureCollections();

  const { actor: resolvedActor, scope } = await getAuthorizedScope({
    actor,
    permission: PERMISSIONS.MANAGE_SHIFTS,
  });

  if (adminId && String(adminId) !== String(resolvedActor.$id) && scope.role !== 'admin') {
    throw new Error('Cannot cancel shift on behalf of another user.');
  }

  const shift = await databases.getDocument(dbId, shiftsCol, shiftId);
  const normalizedShift = normalizeTenancyDocument(RESOURCE_TYPES.SHIFTS, shift);
  assertScopedDocument(RESOURCE_TYPES.SHIFTS, normalizedShift, scope);

  const updated = await databases.updateDocument(dbId, shiftsCol, shiftId, {
    status: 'cancelled',
    cancellationReason: reason || null,
    updatedAt: new Date().toISOString(),
  });

  const apps = await databases.listDocuments(dbId, applicationsCol, [
    Query.equal('shiftId', shiftId),
    Query.equal('status', 'pending'),
    Query.limit(MAX_LIST_LIMIT),
  ]);

  for (const app of apps.documents) {
    const normalizedApp = normalizeTenancyDocument(RESOURCE_TYPES.APPLICATIONS, app);
    try {
      assertScopedDocument(RESOURCE_TYPES.APPLICATIONS, normalizedApp, scope);
      await databases.updateDocument(dbId, applicationsCol, app.$id, {
        status: 'expired',
        rejectionReason: reason || 'Shift cancelled',
        reviewedBy: resolvedActor.$id,
        reviewerName: resolvedActor.name || resolvedActor.email || 'Scheduler',
        reviewedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.warn('Skipping out-of-scope application during shift cancellation', app.$id, error.message);
    }
  }

  await logEvent({
    actorId: resolvedActor.$id,
    action: 'shift.cancelled',
    resourceType: RESOURCE_TYPES.SHIFTS,
    resourceId: shiftId,
    clientId: normalizedShift.clientId,
    siteId: normalizedShift.siteId,
    metadata: {
      reason: reason || null,
      affectedPendingApplications: apps.documents.length,
    },
  });

  return normalizeTenancyDocument(RESOURCE_TYPES.SHIFTS, updated);
}
