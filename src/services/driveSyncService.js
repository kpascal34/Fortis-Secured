/**
 * Drive Sync Status Service
 * Tenancy-scoped access for compliance upload sync records.
 */

import { Query } from 'appwrite';
import { databases, config } from '../lib/appwrite.js';
import { PERMISSIONS } from '../lib/rbac.ts';
import { buildPermissionsForDoc } from '../lib/appwritePermissions.js';
import { ensureDatabaseConfig, getAuthorizedScope, withScopedQueries, assertScopedDocument } from '../lib/serviceSecurity.js';
import { RESOURCE_TYPES, normalizeTenancyDocument } from '../lib/tenancyScope.js';
import { logEvent } from './auditLogService.js';

const dbId = config.databaseId;
const complianceUploadsCol = config.complianceUploadsCollectionId || 'compliance_uploads';

export const DRIVE_SYNC_REQUIRED_ATTRIBUTES = [
  { key: 'staffId', type: 'string', required: true },
  { key: 'fileName', type: 'string', required: true },
  { key: 'fileType', type: 'string', required: true },
  { key: 'driveSyncStatus', type: 'string', required: true, enum: ['pending', 'failed', 'success'] },
  { key: 'appwriteFileId', type: 'string', required: false },
  { key: 'googleDriveFileId', type: 'string', required: false },
  { key: 'syncError', type: 'string', required: false },
  { key: 'lastSyncAttempt', type: 'datetime', required: false },
];

let schemaValidationPromise;

const buildSchemaError = (message, details = {}) => {
  const error = new Error(message);
  error.code = 'DRIVE_SYNC_SCHEMA_MISSING';
  error.details = details;
  return error;
};

const ensureCollection = () => {
  ensureDatabaseConfig(complianceUploadsCol, 'compliance uploads collection');
};

async function getCollectionAttributes() {
  const response = await databases.listAttributes(dbId, complianceUploadsCol);
  return response?.attributes || [];
}

export async function validateDriveSyncSchema({ force = false } = {}) {
  ensureCollection();

  if (config.isDemoMode) {
    return { ok: true, attributes: [] };
  }

  if (!schemaValidationPromise || force) {
    schemaValidationPromise = (async () => {
      const attributes = await getCollectionAttributes();
      const byKey = new Map(attributes.map((attribute) => [attribute.key, attribute]));

      const missing = [];
      const mismatchedType = [];
      const invalidEnums = [];

      for (const requirement of DRIVE_SYNC_REQUIRED_ATTRIBUTES) {
        const found = byKey.get(requirement.key);
        if (!found) {
          missing.push(requirement);
          continue;
        }

        if (requirement.type && found.type !== requirement.type) {
          mismatchedType.push({ key: requirement.key, expected: requirement.type, found: found.type });
        }

        if (requirement.enum?.length) {
          const foundEnum = Array.isArray(found.elements) ? found.elements : [];
          const missingEnumValues = requirement.enum.filter((value) => !foundEnum.includes(value));
          if (missingEnumValues.length > 0) {
            invalidEnums.push({ key: requirement.key, missingValues: missingEnumValues, foundValues: foundEnum });
          }
        }
      }

      return {
        ok: missing.length === 0 && mismatchedType.length === 0 && invalidEnums.length === 0,
        attributes,
        missing,
        mismatchedType,
        invalidEnums,
      };
    })().catch((error) => {
      schemaValidationPromise = undefined;
      throw error;
    });
  }

  const validation = await schemaValidationPromise;
  if (!validation.ok) {
    throw buildSchemaError('Drive Sync schema is incomplete in Appwrite.', validation);
  }

  return validation;
}

/**
 * Get sync records with optional filters.
 */
export async function getSyncStatusRecords(filters = {}, actor = null) {
  ensureCollection();

  if (config.isDemoMode) {
    return [];
  }

  try {
    const { scope } = await getAuthorizedScope({ actor, permission: PERMISSIONS.VIEW_DRIVE_SYNC });
    await validateDriveSyncSchema();

    const queries = withScopedQueries(RESOURCE_TYPES.COMPLIANCE_UPLOADS, scope, []);

    if (filters.status) queries.push(Query.equal('driveSyncStatus', filters.status));
    if (filters.staffId) queries.push(Query.equal('staffId', filters.staffId));
    if (filters.fileType) queries.push(Query.equal('fileType', filters.fileType));

    queries.push(Query.orderDesc('lastSyncAttempt'));
    queries.push(Query.limit(Number(filters.limit || 500)));

    const response = await databases.listDocuments(dbId, complianceUploadsCol, queries);
    return response.documents.map((doc) => normalizeTenancyDocument(RESOURCE_TYPES.COMPLIANCE_UPLOADS, doc));
  } catch (error) {
    console.error('Error fetching sync status records:', error);
    if (error.code === 'DRIVE_SYNC_SCHEMA_MISSING') throw error;

    if (String(error.message || '').includes('driveSyncStatus')) {
      throw new Error('Missing attribute: driveSyncStatus. Add enum attribute (pending, failed, success) to compliance_uploads.');
    }

    if (String(error.message || '').includes('Invalid collection')) {
      throw new Error('Collection not found. Create the compliance_uploads collection in Appwrite.');
    }

    throw error;
  }
}

export async function getFailedSyncs(actor = null) {
  return getSyncStatusRecords({ status: 'failed' }, actor);
}

export async function getPendingSyncs(actor = null) {
  return getSyncStatusRecords({ status: 'pending' }, actor);
}

export async function getSuccessfulSyncs(actor = null) {
  return getSyncStatusRecords({ status: 'success' }, actor);
}

export async function getSyncSummary(actor = null) {
  ensureCollection();

  if (config.isDemoMode) {
    throw new Error('Drive sync is disabled in demo mode.');
  }

  const [failed, pending, successful] = await Promise.all([
    getFailedSyncs(actor),
    getPendingSyncs(actor),
    getSuccessfulSyncs(actor),
  ]);

  return {
    total: failed.length + pending.length + successful.length,
    failed: failed.length,
    pending: pending.length,
    successful: successful.length,
    failureRate:
      failed.length > 0 ? ((failed.length / Math.max(1, failed.length + successful.length)) * 100).toFixed(1) : 0,
  };
}

export async function getSyncRecordDetail(recordId, actor = null) {
  ensureCollection();

  const { scope } = await getAuthorizedScope({ actor, permission: PERMISSIONS.VIEW_DRIVE_SYNC });
  await validateDriveSyncSchema();

  const record = await databases.getDocument(dbId, complianceUploadsCol, recordId);
  const normalized = normalizeTenancyDocument(RESOURCE_TYPES.COMPLIANCE_UPLOADS, record);
  assertScopedDocument(RESOURCE_TYPES.COMPLIANCE_UPLOADS, normalized, scope);
  return normalized;
}

export async function updateSyncStatus(recordId, status, updates = {}, actor = null) {
  ensureCollection();

  const { actor: resolvedActor, scope } = await getAuthorizedScope({ actor, permission: PERMISSIONS.VIEW_DRIVE_SYNC });
  await validateDriveSyncSchema();

  const existing = await databases.getDocument(dbId, complianceUploadsCol, recordId);
  const normalized = normalizeTenancyDocument(RESOURCE_TYPES.COMPLIANCE_UPLOADS, existing);
  assertScopedDocument(RESOURCE_TYPES.COMPLIANCE_UPLOADS, normalized, scope);

  const updateData = {
    ...updates,
    driveSyncStatus: status,
    drive_sync_status: status,
    updatedAt: new Date().toISOString(),
  };

  const updated = await databases.updateDocument(dbId, complianceUploadsCol, recordId, updateData);

  await logEvent({
    actorId: resolvedActor.$id,
    action: 'compliance.upload.sync-status.updated',
    resourceType: RESOURCE_TYPES.COMPLIANCE_UPLOADS,
    resourceId: recordId,
    clientId: normalized.clientId || null,
    siteId: normalized.siteId || null,
    metadata: {
      previousStatus: normalized.driveSyncStatus || normalized.syncStatus || null,
      status,
    },
  });

  return normalizeTenancyDocument(RESOURCE_TYPES.COMPLIANCE_UPLOADS, updated);
}

export async function logSyncAttempt(
  staffId,
  fileName,
  fileType,
  status,
  appwriteFileId,
  driveFileId = null,
  syncError = null,
  actor = null,
  tenancy = {}
) {
  ensureCollection();

  const { actor: resolvedActor, scope } = await getAuthorizedScope({ actor, permission: PERMISSIONS.SUBMIT_COMPLIANCE });

  if (scope.role === 'staff' && String(scope.userId || '') !== String(staffId || '')) {
    throw new Error('Staff can only log sync attempts for their own files.');
  }

  await validateDriveSyncSchema();

  const recordData = {
    staffId,
    guardId: staffId,
    fileName,
    fileType,
    driveSyncStatus: status,
    drive_sync_status: status,
    status: 'pending',
    appwriteFileId,
    googleDriveFileId: driveFileId,
    syncError,
    lastSyncAttempt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    clientId: tenancy.clientId || resolvedActor?.profile?.clientId || scope.clientId || null,
    siteId: tenancy.siteId || resolvedActor?.profile?.siteId || null,
  };

  const permissions = buildPermissionsForDoc({
    type: 'compliance_uploads',
    ownerUserId: staffId,
  });

  const record = await databases.createDocument(dbId, complianceUploadsCol, undefined, recordData, permissions);

  await logEvent({
    actorId: resolvedActor.$id,
    action: 'compliance.upload.sync-attempt.logged',
    resourceType: RESOURCE_TYPES.COMPLIANCE_UPLOADS,
    resourceId: record.$id,
    clientId: recordData.clientId,
    siteId: recordData.siteId,
    metadata: {
      status,
      staffId,
      fileName,
    },
  });

  return normalizeTenancyDocument(RESOURCE_TYPES.COMPLIANCE_UPLOADS, record);
}

export async function clearOldSuccessfulSyncs(olderThanDays = 90, actor = null) {
  ensureCollection();

  const { actor: resolvedActor, scope } = await getAuthorizedScope({ actor, permission: PERMISSIONS.VIEW_DRIVE_SYNC });

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

  const queries = withScopedQueries(RESOURCE_TYPES.COMPLIANCE_UPLOADS, scope, [
    Query.equal('driveSyncStatus', 'success'),
    Query.lessThan('createdAt', cutoffDate.toISOString()),
    Query.limit(1000),
  ]);

  const oldRecords = await databases.listDocuments(dbId, complianceUploadsCol, queries);

  let cleared = 0;
  for (const record of oldRecords.documents) {
    try {
      await databases.deleteDocument(dbId, complianceUploadsCol, record.$id);
      cleared += 1;
    } catch (error) {
      console.warn(`Failed to delete record ${record.$id}:`, error);
    }
  }

  await logEvent({
    actorId: resolvedActor.$id,
    action: 'compliance.upload.sync-success.cleared',
    resourceType: RESOURCE_TYPES.COMPLIANCE_UPLOADS,
    resourceId: 'bulk',
    metadata: {
      olderThanDays,
      cleared,
    },
  });

  return cleared;
}

export async function getStaffSyncStatus(staffId, actor = null) {
  ensureCollection();

  const permission = actor ? PERMISSIONS.VIEW_COMPLIANCE : PERMISSIONS.VIEW_DRIVE_SYNC;
  const { scope } = await getAuthorizedScope({ actor, permission });

  if (scope.role === 'staff' && String(scope.userId || '') !== String(staffId || '')) {
    throw new Error('Staff can only view their own sync records.');
  }

  const queries = withScopedQueries(RESOURCE_TYPES.COMPLIANCE_UPLOADS, scope, [
    Query.equal('staffId', staffId),
    Query.orderDesc('createdAt'),
    Query.limit(500),
  ]);

  const records = await databases.listDocuments(dbId, complianceUploadsCol, queries);
  const documents = records.documents.map((doc) => normalizeTenancyDocument(RESOURCE_TYPES.COMPLIANCE_UPLOADS, doc));

  const failed = documents.filter((doc) => doc.driveSyncStatus === 'failed');
  const pending = documents.filter((doc) => doc.driveSyncStatus === 'pending');
  const successful = documents.filter((doc) => doc.driveSyncStatus === 'success');

  return {
    staffId,
    total: documents.length,
    failed: failed.length,
    pending: pending.length,
    successful: successful.length,
    latestAttempt: documents[0]?.lastSyncAttempt || null,
    latestStatus: documents[0]?.driveSyncStatus || null,
    failedRecords: failed,
    pendingRecords: pending,
    successfulRecords: successful,
  };
}

export async function generateSyncReport(actor = null) {
  ensureCollection();

  const { scope } = await getAuthorizedScope({ actor, permission: PERMISSIONS.VIEW_DRIVE_SYNC });

  const queries = withScopedQueries(RESOURCE_TYPES.COMPLIANCE_UPLOADS, scope, [
    Query.orderDesc('createdAt'),
    Query.limit(1000),
  ]);

  const allRecords = await databases.listDocuments(dbId, complianceUploadsCol, queries);
  const records = allRecords.documents.map((doc) => normalizeTenancyDocument(RESOURCE_TYPES.COMPLIANCE_UPLOADS, doc));

  const byStatus = {};
  const byFileType = {};
  const byStaff = {};

  records.forEach((record) => {
    byStatus[record.driveSyncStatus] = (byStatus[record.driveSyncStatus] || 0) + 1;
    byFileType[record.fileType] = (byFileType[record.fileType] || 0) + 1;

    if (!byStaff[record.staffId]) {
      byStaff[record.staffId] = { total: 0, failed: 0, pending: 0, success: 0 };
    }

    byStaff[record.staffId].total += 1;
    byStaff[record.staffId][record.driveSyncStatus] = (byStaff[record.staffId][record.driveSyncStatus] || 0) + 1;
  });

  return {
    totalRecords: records.length,
    byStatus,
    byFileType,
    byStaff,
    generatedAt: new Date().toISOString(),
  };
}
