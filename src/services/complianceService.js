/**
 * Staff Compliance Service
 * Multi-step compliance workflow with tenancy/RBAC enforcement.
 */

import { ID, Query } from 'appwrite';
import { databases, config } from '../lib/appwrite.js';
import { PERMISSIONS } from '../lib/rbac.ts';
import { buildPermissionsForDoc } from '../lib/appwritePermissions.js';
import { ensureDatabaseConfig, getAuthorizedScope, withScopedQueries, assertScopedDocument, resolveActor } from '../lib/serviceSecurity.js';
import { RESOURCE_TYPES, normalizeTenancyDocument } from '../lib/tenancyScope.js';
import { logEvent } from './auditLogService.js';
import { notifyComplianceApproved, notifyComplianceRejected, notifyComplianceSubmitted } from './notificationService.js';

const dbId = config.databaseId;
const compCol = config.staffComplianceCollectionId || 'staff_compliance';
const staffProfilesCol = config.staffProfilesCollectionId || 'staff_profiles';

const ensureCollections = () => {
  ensureDatabaseConfig(compCol, 'staff compliance collection');
  ensureDatabaseConfig(staffProfilesCol, 'staff profiles collection');
};

const toArray = (value) => (Array.isArray(value) ? value : []);

const assertOwnRecord = (scope, staffId, message = 'You can only manage your own compliance.') => {
  if (scope.role === 'staff' && String(scope.userId || '') !== String(staffId || '')) {
    throw new Error(message);
  }
};

const findComplianceDoc = async (staffId, scope) => {
  const queries = withScopedQueries(RESOURCE_TYPES.STAFF_COMPLIANCE, scope, [
    Query.equal('staffId', staffId),
    Query.limit(1),
  ]);
  const docs = await databases.listDocuments(dbId, compCol, queries);
  return docs.documents[0] || null;
};

const ensureComplianceRecord = async ({ staffId, actor, scope }) => {
  let doc = await findComplianceDoc(staffId, scope);
  if (doc) {
    const normalized = normalizeTenancyDocument(RESOURCE_TYPES.STAFF_COMPLIANCE, doc);
    assertScopedDocument(RESOURCE_TYPES.STAFF_COMPLIANCE, normalized, scope);
    return normalized;
  }

  const permissions = buildPermissionsForDoc({
    type: 'staff_compliance',
    ownerUserId: staffId,
    clientUserId: null,
    sharedWithClient: false,
  });

  const created = await databases.createDocument(
    dbId,
    compCol,
    ID.unique(),
    {
      staffId,
      status: 'in_progress',
      currentStep: 0,
      clientId: actor?.profile?.clientId || scope.clientId || null,
      siteId: actor?.profile?.siteId || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    permissions
  );

  await logEvent({
    actorId: actor.$id,
    action: 'staff.compliance.created',
    resourceType: RESOURCE_TYPES.STAFF_COMPLIANCE,
    resourceId: created.$id,
    clientId: created.clientId || null,
    siteId: created.siteId || null,
    metadata: { staffId },
  });

  return normalizeTenancyDocument(RESOURCE_TYPES.STAFF_COMPLIANCE, created);
};

/**
 * Get compliance progress for staff.
 */
export async function getComplianceProgress(staffId, actor = null) {
  ensureCollections();

  const { actor: resolvedActor, scope } = await getAuthorizedScope({ actor, permission: PERMISSIONS.VIEW_COMPLIANCE });
  assertOwnRecord(scope, staffId, 'You can only view your own compliance record.');

  const doc = await ensureComplianceRecord({ staffId, actor: resolvedActor, scope });
  return doc;
}

/**
 * Step 1: Identity and right-to-work details.
 */
export async function submitStep1Identity(staffId, data, actor = null) {
  ensureCollections();
  validateStep1(data);

  const { actor: resolvedActor, scope } = await getAuthorizedScope({ actor, permission: PERMISSIONS.SUBMIT_COMPLIANCE });
  assertOwnRecord(scope, staffId);

  const comp = await ensureComplianceRecord({ staffId, actor: resolvedActor, scope });

  const updated = await databases.updateDocument(dbId, compCol, comp.$id, {
    step1Identity: JSON.stringify(data),
    currentStep: Math.max(Number(comp.currentStep || 0), 1),
    updatedAt: new Date().toISOString(),
  });

  await logEvent({
    actorId: resolvedActor.$id,
    action: 'staff.compliance.step1.submitted',
    resourceType: RESOURCE_TYPES.STAFF_COMPLIANCE,
    resourceId: comp.$id,
    clientId: comp.clientId || null,
    siteId: comp.siteId || null,
    metadata: { step: 1, addresses: toArray(data.addresses).length },
  });

  try {
    await notifyComplianceSubmitted(staffId, comp.$id, [], {
      clientId: comp.clientId || null,
      siteId: comp.siteId || null,
    });
  } catch (notifyError) {
    console.error('[complianceService] Failed to enqueue complianceSubmitted notification:', notifyError);
  }

  return normalizeTenancyDocument(RESOURCE_TYPES.STAFF_COMPLIANCE, updated);
}

function validateStep1(data) {
  const required = ['firstName', 'lastName', 'dateOfBirth', 'nationalInsuranceNumber'];
  for (const field of required) {
    if (!data?.[field]) throw new Error(`Missing required field: ${field}`);
  }

  if (!Array.isArray(data.addresses) || data.addresses.length === 0) {
    throw new Error('At least one address is required.');
  }

  const totalMonths = data.addresses.reduce((sum, item) => sum + Number(item.months || 0), 0);
  if (totalMonths < 60) {
    throw new Error('Address history must cover at least 5 years.');
  }
}

/**
 * Step 2: Employment history.
 */
export async function submitStep2Employment(staffId, data, actor = null) {
  ensureCollections();
  validateStep2(data);

  const { actor: resolvedActor, scope } = await getAuthorizedScope({ actor, permission: PERMISSIONS.SUBMIT_COMPLIANCE });
  assertOwnRecord(scope, staffId);

  const comp = await ensureComplianceRecord({ staffId, actor: resolvedActor, scope });

  const updated = await databases.updateDocument(dbId, compCol, comp.$id, {
    step_2_employment: JSON.stringify(data),
    currentStep: Math.max(Number(comp.currentStep || 0), 2),
    updatedAt: new Date().toISOString(),
  });

  await logEvent({
    actorId: resolvedActor.$id,
    action: 'staff.compliance.step2.submitted',
    resourceType: RESOURCE_TYPES.STAFF_COMPLIANCE,
    resourceId: comp.$id,
    clientId: comp.clientId || null,
    siteId: comp.siteId || null,
    metadata: { step: 2, jobs: toArray(data.jobs).length },
  });

  try {
    if (approved) {
      await notifyComplianceApproved(
        staffId,
        comp.$id,
        resolvedActor.name || resolvedActor.email || 'Reviewer',
        null
      );
    } else {
      await notifyComplianceRejected(
        staffId,
        comp.$id,
        rejectionReason || 'Rejected by reviewer',
        resolvedActor.name || resolvedActor.email || 'Reviewer'
      );
    }
  } catch (notifyError) {
    console.error('[complianceService] Failed to enqueue compliance review notification:', notifyError);
  }

  return normalizeTenancyDocument(RESOURCE_TYPES.STAFF_COMPLIANCE, updated);
}

function validateStep2(data) {
  if (!Array.isArray(data?.jobs) || data.jobs.length === 0) {
    throw new Error('At least one employment history entry is required.');
  }

  const now = new Date();
  const fiveYearsAgo = new Date(now.getFullYear() - 5, now.getMonth(), now.getDate());
  let lastEndDate = new Date();

  for (const job of data.jobs) {
    if (!job?.employer || !job?.jobTitle || !job?.fromDate) {
      throw new Error('Invalid employment record.');
    }

    const from = new Date(job.fromDate);
    const to = job.toDate ? new Date(job.toDate) : new Date();

    const gapDays = Math.floor((lastEndDate.getTime() - to.getTime()) / (1000 * 60 * 60 * 24));
    if (gapDays > 31 && !job.gapExplanation) {
      throw new Error(`Gap of ${gapDays} days detected between jobs (max 31 without explanation).`);
    }

    lastEndDate = from;
  }

  if (lastEndDate > fiveYearsAgo) {
    throw new Error('Employment history must cover at least 5 years.');
  }
}

/**
 * Step 3: Evidence upload references.
 */
export async function submitStep3Evidence(staffId, fileIds, actor = null) {
  ensureCollections();

  if (!Array.isArray(fileIds) || fileIds.length === 0) {
    throw new Error('At least one evidence file is required.');
  }

  const { actor: resolvedActor, scope } = await getAuthorizedScope({ actor, permission: PERMISSIONS.SUBMIT_COMPLIANCE });
  assertOwnRecord(scope, staffId);

  const comp = await ensureComplianceRecord({ staffId, actor: resolvedActor, scope });

  const updated = await databases.updateDocument(dbId, compCol, comp.$id, {
    step_3_evidence: JSON.stringify(fileIds.map((id) => ({ fileId: id }))),
    currentStep: Math.max(Number(comp.currentStep || 0), 3),
    updatedAt: new Date().toISOString(),
  });

  await logEvent({
    actorId: resolvedActor.$id,
    action: 'staff.compliance.step3.submitted',
    resourceType: RESOURCE_TYPES.STAFF_COMPLIANCE,
    resourceId: comp.$id,
    clientId: comp.clientId || null,
    siteId: comp.siteId || null,
    metadata: { step: 3, files: fileIds.length },
  });

  return normalizeTenancyDocument(RESOURCE_TYPES.STAFF_COMPLIANCE, updated);
}

/**
 * Step 4: References.
 */
export async function submitStep4References(staffId, data, actor = null) {
  ensureCollections();
  validateStep4(data);

  const { actor: resolvedActor, scope } = await getAuthorizedScope({ actor, permission: PERMISSIONS.SUBMIT_COMPLIANCE });
  assertOwnRecord(scope, staffId);

  const comp = await ensureComplianceRecord({ staffId, actor: resolvedActor, scope });

  const updated = await databases.updateDocument(dbId, compCol, comp.$id, {
    step_4_references: JSON.stringify(data),
    currentStep: Math.max(Number(comp.currentStep || 0), 4),
    updatedAt: new Date().toISOString(),
  });

  await logEvent({
    actorId: resolvedActor.$id,
    action: 'staff.compliance.step4.submitted',
    resourceType: RESOURCE_TYPES.STAFF_COMPLIANCE,
    resourceId: comp.$id,
    clientId: comp.clientId || null,
    siteId: comp.siteId || null,
    metadata: { step: 4, references: toArray(data.references).length },
  });

  return normalizeTenancyDocument(RESOURCE_TYPES.STAFF_COMPLIANCE, updated);
}

function validateStep4(data) {
  if (!Array.isArray(data?.references) || data.references.length !== 2) {
    throw new Error('Exactly 2 references are required.');
  }

  const types = data.references.map((item) => item.type);
  if (!types.includes('employer') || !types.includes('character')) {
    throw new Error('References must include exactly one employer and one character reference.');
  }
}

/**
 * Step 5: Criminal disclosure file.
 */
export async function submitStep5Criminal(staffId, fileId, actor = null) {
  ensureCollections();

  if (!fileId) throw new Error('Criminal record file is required.');

  const { actor: resolvedActor, scope } = await getAuthorizedScope({ actor, permission: PERMISSIONS.SUBMIT_COMPLIANCE });
  assertOwnRecord(scope, staffId);

  const comp = await ensureComplianceRecord({ staffId, actor: resolvedActor, scope });

  const updated = await databases.updateDocument(dbId, compCol, comp.$id, {
    step_5_criminal: JSON.stringify({ fileId, uploadDate: new Date().toISOString() }),
    currentStep: Math.max(Number(comp.currentStep || 0), 5),
    updatedAt: new Date().toISOString(),
  });

  await logEvent({
    actorId: resolvedActor.$id,
    action: 'staff.compliance.step5.submitted',
    resourceType: RESOURCE_TYPES.STAFF_COMPLIANCE,
    resourceId: comp.$id,
    clientId: comp.clientId || null,
    siteId: comp.siteId || null,
    metadata: { step: 5, fileId },
  });

  return normalizeTenancyDocument(RESOURCE_TYPES.STAFF_COMPLIANCE, updated);
}

/**
 * Step 6: SIA licence declaration.
 */
export async function submitStep6SIALicence(staffId, licenceNumber, expiryDate, actor = null) {
  ensureCollections();

  if (!licenceNumber || !expiryDate) {
    throw new Error('SIA licence number and expiry date are required.');
  }

  const expiry = new Date(expiryDate);
  if (Number.isNaN(expiry.getTime()) || expiry < new Date()) {
    throw new Error('SIA licence expiry must be a valid future date.');
  }

  const { actor: resolvedActor, scope } = await getAuthorizedScope({ actor, permission: PERMISSIONS.SUBMIT_COMPLIANCE });
  assertOwnRecord(scope, staffId);

  const comp = await ensureComplianceRecord({ staffId, actor: resolvedActor, scope });

  const updated = await databases.updateDocument(dbId, compCol, comp.$id, {
    step_6_sia: JSON.stringify({ licenceNumber, expiryDate }),
    currentStep: Math.max(Number(comp.currentStep || 0), 6),
    updatedAt: new Date().toISOString(),
  });

  try {
    const profiles = await databases.listDocuments(dbId, staffProfilesCol, [
      Query.equal('userId', staffId),
      Query.limit(1),
    ]);

    if (profiles.documents.length > 0) {
      await databases.updateDocument(dbId, staffProfilesCol, profiles.documents[0].$id, {
        siaLicence: licenceNumber,
        siaExpiryDate: expiryDate,
        updatedAt: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error('[complianceService] Failed to mirror SIA details to staff profile.', error);
  }

  await logEvent({
    actorId: resolvedActor.$id,
    action: 'staff.compliance.step6.submitted',
    resourceType: RESOURCE_TYPES.STAFF_COMPLIANCE,
    resourceId: comp.$id,
    clientId: comp.clientId || null,
    siteId: comp.siteId || null,
    metadata: { step: 6, licenceNumber },
  });

  return normalizeTenancyDocument(RESOURCE_TYPES.STAFF_COMPLIANCE, updated);
}

/**
 * Step 7: Intro video file.
 */
export async function submitStep7Video(staffId, fileId, actor = null) {
  ensureCollections();

  if (!fileId) throw new Error('Intro video file is required.');

  const { actor: resolvedActor, scope } = await getAuthorizedScope({ actor, permission: PERMISSIONS.SUBMIT_COMPLIANCE });
  assertOwnRecord(scope, staffId);

  const comp = await ensureComplianceRecord({ staffId, actor: resolvedActor, scope });

  const updated = await databases.updateDocument(dbId, compCol, comp.$id, {
    step_7_video: JSON.stringify({ fileId, uploadDate: new Date().toISOString() }),
    currentStep: 7,
    updatedAt: new Date().toISOString(),
  });

  await logEvent({
    actorId: resolvedActor.$id,
    action: 'staff.compliance.step7.submitted',
    resourceType: RESOURCE_TYPES.STAFF_COMPLIANCE,
    resourceId: comp.$id,
    clientId: comp.clientId || null,
    siteId: comp.siteId || null,
    metadata: { step: 7, fileId },
  });

  return normalizeTenancyDocument(RESOURCE_TYPES.STAFF_COMPLIANCE, updated);
}

/**
 * Submit completed compliance for review.
 */
export async function submitComplianceReview(staffId, actor = null) {
  ensureCollections();

  const { actor: resolvedActor, scope } = await getAuthorizedScope({ actor, permission: PERMISSIONS.SUBMIT_COMPLIANCE });
  assertOwnRecord(scope, staffId);

  const comp = await ensureComplianceRecord({ staffId, actor: resolvedActor, scope });

  if (Number(comp.currentStep || 0) < 7) {
    throw new Error(`All 7 steps are required before submission (current step: ${comp.currentStep || 0}).`);
  }

  const updated = await databases.updateDocument(dbId, compCol, comp.$id, {
    status: 'submitted',
    submittedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  await logEvent({
    actorId: resolvedActor.$id,
    action: 'staff.compliance.submitted',
    resourceType: RESOURCE_TYPES.STAFF_COMPLIANCE,
    resourceId: comp.$id,
    clientId: comp.clientId || null,
    siteId: comp.siteId || null,
    metadata: { staffId },
  });

  return normalizeTenancyDocument(RESOURCE_TYPES.STAFF_COMPLIANCE, updated);
}

/**
 * Admin/manager review submission.
 */
export async function adminReviewCompliance(adminId, staffId, approved, rejectionReason = null, actor = null) {
  ensureCollections();

  const { actor: resolvedActor, scope } = await getAuthorizedScope({ actor, permission: PERMISSIONS.MANAGE_COMPLIANCE });

  if (adminId && String(adminId) !== String(resolvedActor.$id) && scope.role !== 'admin') {
    throw new Error('Cannot review compliance on behalf of another user.');
  }

  const comp = await ensureComplianceRecord({ staffId, actor: resolvedActor, scope });

  if (comp.status !== 'submitted') {
    throw new Error('Compliance is not in submitted status.');
  }

  const status = approved ? 'approved' : 'rejected';
  const updated = await databases.updateDocument(dbId, compCol, comp.$id, {
    status,
    rejectionReason: approved ? null : rejectionReason || 'Rejected by reviewer',
    approvedAt: approved ? new Date().toISOString() : null,
    approvedBy: approved ? resolvedActor.$id : null,
    updatedAt: new Date().toISOString(),
  });

  if (approved) {
    try {
      const profiles = await databases.listDocuments(dbId, staffProfilesCol, [
        Query.equal('userId', staffId),
        Query.limit(1),
      ]);

      if (profiles.documents.length > 0) {
        await databases.updateDocument(dbId, staffProfilesCol, profiles.documents[0].$id, {
          status: 'active',
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error('[complianceService] Failed to activate staff profile after approval.', error);
    }
  }

  await logEvent({
    actorId: resolvedActor.$id,
    action: approved ? 'staff.compliance.approved' : 'staff.compliance.rejected',
    resourceType: RESOURCE_TYPES.STAFF_COMPLIANCE,
    resourceId: comp.$id,
    clientId: comp.clientId || null,
    siteId: comp.siteId || null,
    metadata: {
      staffId,
      rejectionReason: approved ? null : rejectionReason || null,
    },
  });

  return normalizeTenancyDocument(RESOURCE_TYPES.STAFF_COMPLIANCE, updated);
}
