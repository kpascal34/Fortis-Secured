import { ID, Query } from 'appwrite';
import { databases, config } from '../lib/appwrite.js';
import { PERMISSIONS } from '../lib/rbac.ts';
import { ensureDatabaseConfig, getAuthorizedScope } from '../lib/serviceSecurity.js';
import { logEvent } from './auditLogService.js';

const collectionIds = {
  templates: config.documentTemplatesCollectionId,
  submissions: config.complianceSubmissionsCollectionId,
  instances: config.documentInstancesCollectionId,
  auditLogs: config.auditLogsCollectionId,
};

const functionUrl = config.compliancePdfFunctionUrl;

const assertComplianceV1Enabled = () => {
  if (!config.enableComplianceV1) {
    throw new Error('Compliance Wizard v1 is disabled. Set VITE_ENABLE_COMPLIANCE_V1=true after schema provisioning.');
  }

  if (!databases || !config.databaseId) {
    throw new Error('Compliance Wizard v1 requires an active Appwrite connection.');
  }

  ensureDatabaseConfig(collectionIds.submissions, 'compliance submissions collection');
  ensureDatabaseConfig(collectionIds.instances, 'document instances collection');
  ensureDatabaseConfig(collectionIds.auditLogs, 'audit logs collection');
};

const assertOwnStaff = (scope, staffId) => {
  if (scope.role === 'staff' && String(scope.userId || '') !== String(staffId || '')) {
    throw new Error('You can only access your own compliance submissions.');
  }
};

export async function getMySubmission(staffId, actor = null) {
  assertComplianceV1Enabled();

  const { scope } = await getAuthorizedScope({ actor, permission: PERMISSIONS.VIEW_COMPLIANCE });
  assertOwnStaff(scope, staffId);

  const response = await databases.listDocuments(config.databaseId, collectionIds.submissions, [
    Query.equal('staffId', staffId),
    Query.equal('templateKey', 'pre_employment_declaration_v1'),
    Query.orderDesc('$createdAt'),
    Query.limit(1),
  ]);

  return response.documents[0] || null;
}

export async function getSubmissionInstances(staffId, actor = null) {
  assertComplianceV1Enabled();

  const { scope } = await getAuthorizedScope({ actor, permission: PERMISSIONS.VIEW_COMPLIANCE });
  assertOwnStaff(scope, staffId);

  const response = await databases.listDocuments(config.databaseId, collectionIds.instances, [
    Query.equal('staffId', staffId),
    Query.equal('templateKey', 'pre_employment_declaration_v1'),
    Query.orderDesc('$createdAt'),
    Query.limit(20),
  ]);

  return response.documents;
}

export async function upsertDraftSubmission({ existingId, staffId, formData }, actor = null) {
  assertComplianceV1Enabled();

  const { actor: resolvedActor, scope } = await getAuthorizedScope({ actor, permission: PERMISSIONS.SUBMIT_COMPLIANCE });
  assertOwnStaff(scope, staffId);

  const payload = {
    staffId,
    templateKey: 'pre_employment_declaration_v1',
    status: 'draft',
    formData: JSON.stringify(formData),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (existingId) {
    const updated = await databases.updateDocument(config.databaseId, collectionIds.submissions, existingId, {
      formData: payload.formData,
      status: 'draft',
      updatedAt: payload.updatedAt,
    });

    await logEvent({
      actorId: resolvedActor.$id,
      action: 'compliance.v1.draft.updated',
      resourceType: 'compliance_submissions',
      resourceId: existingId,
      metadata: { staffId },
    });

    return updated;
  }

  const created = await databases.createDocument(config.databaseId, collectionIds.submissions, ID.unique(), payload);

  await logEvent({
    actorId: resolvedActor.$id,
    action: 'compliance.v1.draft.created',
    resourceType: 'compliance_submissions',
    resourceId: created.$id,
    metadata: { staffId },
  });

  return created;
}

export async function createAuditLog({ actorUserId, action, entityType, entityId, metadata }, actor = null) {
  assertComplianceV1Enabled();

  const { actor: resolvedActor } = await getAuthorizedScope({ actor, permission: PERMISSIONS.VIEW_COMPLIANCE });

  if (actorUserId && String(actorUserId) !== String(resolvedActor.$id) && resolvedActor.role !== 'admin') {
    throw new Error('Cannot write compliance audit log on behalf of another user.');
  }

  return databases.createDocument(config.databaseId, collectionIds.auditLogs, ID.unique(), {
    actorUserId: actorUserId || resolvedActor.$id,
    action,
    entityType,
    entityId,
    metadataJson: JSON.stringify(metadata || {}),
    createdAt: new Date().toISOString(),
  });
}

export async function submitToComplianceFunction({ staffId, fullName, submissionId, formData }, actor = null) {
  assertComplianceV1Enabled();

  const { scope } = await getAuthorizedScope({ actor, permission: PERMISSIONS.SUBMIT_COMPLIANCE });
  assertOwnStaff(scope, staffId);

  if (!functionUrl) {
    throw new Error('Missing VITE_COMPLIANCE_PDF_FUNCTION_URL');
  }

  const response = await fetch(functionUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      staffId,
      fullName,
      submissionId,
      formData,
      templateKey: 'pre_employment_declaration_v1',
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'PDF function failed');
  }

  return response.json();
}

export async function updateSubmissionStatus(submissionId, status, notes = '', reviewedBy = null, actor = null) {
  assertComplianceV1Enabled();

  const permission = status === 'submitted' ? PERMISSIONS.SUBMIT_COMPLIANCE : PERMISSIONS.MANAGE_COMPLIANCE;
  const { actor: resolvedActor } = await getAuthorizedScope({ actor, permission });

  const submission = await databases.getDocument(config.databaseId, collectionIds.submissions, submissionId);

  if (permission === PERMISSIONS.SUBMIT_COMPLIANCE && String(submission.staffId || '') !== String(resolvedActor.$id || '')) {
    throw new Error('You can only submit your own compliance form.');
  }

  const payload = { status, adminNotes: notes, updatedAt: new Date().toISOString() };

  if (status === 'submitted') payload.submittedAt = new Date().toISOString();
  if (status === 'approved') {
    payload.approvedAt = new Date().toISOString();
    payload.approvedBy = reviewedBy || resolvedActor.$id;
  }
  if (status === 'rejected') payload.rejectionReason = notes;

  const updated = await databases.updateDocument(config.databaseId, collectionIds.submissions, submissionId, payload);

  await logEvent({
    actorId: resolvedActor.$id,
    action: `compliance.v1.status.${status}`,
    resourceType: 'compliance_submissions',
    resourceId: submissionId,
    metadata: {
      staffId: submission.staffId,
      reviewedBy: reviewedBy || resolvedActor.$id,
    },
  });

  return updated;
}

export async function listAllSubmissions(actor = null) {
  assertComplianceV1Enabled();

  await getAuthorizedScope({ actor, permission: PERMISSIONS.MANAGE_COMPLIANCE });

  const response = await databases.listDocuments(config.databaseId, collectionIds.submissions, [
    Query.orderDesc('$createdAt'),
    Query.limit(200),
  ]);

  return response.documents;
}
