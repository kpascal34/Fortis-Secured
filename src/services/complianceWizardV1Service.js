import { ID, Query } from 'appwrite';
import { databases, config } from '../lib/appwrite.js';

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
  const missing = Object.entries(collectionIds)
    .filter(([, value]) => !value)
    .map(([key]) => key);
  if (missing.length) {
    throw new Error(`Compliance Wizard v1 configuration is incomplete. Missing: ${missing.join(', ')}`);
  }
  if (!databases) {
    throw new Error('Compliance Wizard v1 requires an active Appwrite connection.');
  }
};

export async function getMySubmission(staffId) {
  assertComplianceV1Enabled();
  const response = await databases.listDocuments(config.databaseId, collectionIds.submissions, [
    Query.equal('staffId', staffId),
    Query.equal('templateKey', 'pre_employment_declaration_v1'),
    Query.orderDesc('$createdAt'),
    Query.limit(1),
  ]);
  return response.documents[0] || null;
}

export async function getSubmissionInstances(staffId) {
  assertComplianceV1Enabled();
  const response = await databases.listDocuments(config.databaseId, collectionIds.instances, [
    Query.equal('staffId', staffId),
    Query.equal('templateKey', 'pre_employment_declaration_v1'),
    Query.orderDesc('$createdAt'),
    Query.limit(20),
  ]);
  return response.documents;
}

export async function upsertDraftSubmission({ existingId, staffId, formData }) {
  assertComplianceV1Enabled();
  const payload = {
    staffId,
    templateKey: 'pre_employment_declaration_v1',
    status: 'draft',
    formData: JSON.stringify(formData),
    createdAt: new Date().toISOString(),
  };

  if (existingId) {
    return databases.updateDocument(config.databaseId, collectionIds.submissions, existingId, {
      formData: payload.formData,
      status: 'draft',
    });
  }

  return databases.createDocument(config.databaseId, collectionIds.submissions, ID.unique(), payload);
}

export async function createAuditLog({ actorUserId, action, entityType, entityId, metadata }) {
  assertComplianceV1Enabled();
  return databases.createDocument(config.databaseId, collectionIds.auditLogs, ID.unique(), {
    actorUserId,
    action,
    entityType,
    entityId,
    metadataJson: JSON.stringify(metadata || {}),
    createdAt: new Date().toISOString(),
  });
}

export async function submitToComplianceFunction({ staffId, fullName, submissionId, formData }) {
  assertComplianceV1Enabled();
  if (!functionUrl) {
    throw new Error('Missing VITE_COMPLIANCE_PDF_FUNCTION_URL');
  }

  const response = await fetch(functionUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ staffId, fullName, submissionId, formData, templateKey: 'pre_employment_declaration_v1' }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'PDF function failed');
  }

  return response.json();
}

export async function updateSubmissionStatus(submissionId, status, notes = '', reviewedBy = null) {
  assertComplianceV1Enabled();
  const payload = { status, adminNotes: notes };
  if (status === 'submitted') payload.submittedAt = new Date().toISOString();
  if (status === 'approved') {
    payload.approvedAt = new Date().toISOString();
    payload.approvedBy = reviewedBy;
  }
  if (status === 'rejected') payload.rejectionReason = notes;
  return databases.updateDocument(config.databaseId, collectionIds.submissions, submissionId, payload);
}

export async function listAllSubmissions() {
  assertComplianceV1Enabled();
  const response = await databases.listDocuments(config.databaseId, collectionIds.submissions, [
    Query.orderDesc('$createdAt'),
    Query.limit(200),
  ]);
  return response.documents;
}
