import { ID, Query } from 'appwrite';
import { databases, config } from '../lib/appwrite.js';

const collectionIds = {
  templates: import.meta.env.VITE_APPWRITE_DOCUMENT_TEMPLATES_COLLECTION_ID || 'documentTemplates',
  submissions: import.meta.env.VITE_APPWRITE_COMPLIANCE_SUBMISSIONS_COLLECTION_ID || 'complianceSubmissions',
  instances: import.meta.env.VITE_APPWRITE_DOCUMENT_INSTANCES_COLLECTION_ID || 'documentInstances',
  auditLogs: config.auditLogsCollectionId || 'auditLogs',
};

const functionUrl = import.meta.env.VITE_COMPLIANCE_PDF_FUNCTION_URL;

export async function getMySubmission(staffId) {
  const response = await databases.listDocuments(config.databaseId, collectionIds.submissions, [
    Query.equal('staffId', staffId),
    Query.equal('templateKey', 'pre_employment_declaration_v1'),
    Query.orderDesc('$createdAt'),
    Query.limit(1),
  ]);
  return response.documents[0] || null;
}

export async function getSubmissionInstances(staffId) {
  const response = await databases.listDocuments(config.databaseId, collectionIds.instances, [
    Query.equal('staffId', staffId),
    Query.equal('templateKey', 'pre_employment_declaration_v1'),
    Query.orderDesc('$createdAt'),
    Query.limit(20),
  ]);
  return response.documents;
}

export async function upsertDraftSubmission({ existingId, staffId, formData }) {
  const payload = {
    staffId,
    templateKey: 'pre_employment_declaration_v1',
    status: 'draft',
    formDataJson: JSON.stringify(formData),
    createdAt: new Date().toISOString(),
  };

  if (existingId) {
    return databases.updateDocument(config.databaseId, collectionIds.submissions, existingId, {
      formDataJson: payload.formDataJson,
      status: 'draft',
    });
  }

  return databases.createDocument(config.databaseId, collectionIds.submissions, ID.unique(), payload);
}

export async function createAuditLog({ actorUserId, action, entityType, entityId, metadata }) {
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

export async function updateSubmissionStatus(submissionId, status, notes = '') {
  const payload = { status, adminNotes: notes };
  if (status === 'submitted') payload.submittedAt = new Date().toISOString();
  return databases.updateDocument(config.databaseId, collectionIds.submissions, submissionId, payload);
}

export async function listAllSubmissions() {
  const response = await databases.listDocuments(config.databaseId, collectionIds.submissions, [
    Query.orderDesc('$createdAt'),
    Query.limit(200),
  ]);
  return response.documents;
}
