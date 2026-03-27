/**
 * Drive Sync Status Service
 * Manages fetching and updating Google Drive sync status records for compliance uploads
 */

import { databases, config } from '../lib/appwrite.js';
import { Query } from 'appwrite';
import * as auditService from './auditService.js';

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
  const err = new Error(message);
  err.code = 'DRIVE_SYNC_SCHEMA_MISSING';
  err.details = details;
  return err;
};

async function getCollectionAttributes() {
  const response = await databases.listAttributes(dbId, complianceUploadsCol);
  return response?.attributes || [];
}

export async function validateDriveSyncSchema({ force = false } = {}) {
  if (!dbId || !complianceUploadsCol) {
    throw buildSchemaError('Drive Sync Status is not configured.', { missingConfig: true });
  }

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
          mismatchedType.push({
            key: requirement.key,
            expected: requirement.type,
            found: found.type,
          });
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
 * Get all sync status records with filters
 * @param {object} filters - Query filters (status, staffId, dateRange, etc.)
 * @returns {Promise<array>} List of sync records
 */
export async function getSyncStatusRecords(filters = {}) {
  if (!dbId || !complianceUploadsCol) {
    throw new Error('Compliance uploads collection not configured. Set VITE_APPWRITE_COMPLIANCE_UPLOADS_COLLECTION_ID.');
  }

  if (config.isDemoMode) {
    return []; // Return empty array in demo mode
  }

  try {
    await validateDriveSyncSchema();

    const queries = [];

    // Filter by status if provided
    if (filters.status) {
      queries.push(Query.equal('driveSyncStatus', filters.status));
    }

    // Filter by staff ID if provided
    if (filters.staffId) {
      queries.push(Query.equal('staffId', filters.staffId));
    }

    // Filter by file type if provided
    if (filters.fileType) {
      queries.push(Query.equal('fileType', filters.fileType));
    }

    // Order by most recent first
    queries.push(Query.orderDesc('lastSyncAttempt'));

    const response = await databases.listDocuments(
      dbId,
      complianceUploadsCol,
      queries
    );

    return response.documents || [];
  } catch (error) {
    console.error('Error fetching sync status records:', error);
    if (error.code === 'DRIVE_SYNC_SCHEMA_MISSING') {
      throw error;
    }
    
    // Provide helpful error messages
    if (error.message && error.message.includes('driveSyncStatus')) {
      throw new Error('Missing attribute: driveSyncStatus. Add this enum attribute (pending, failed, success) to your compliance_uploads collection.');
    }
    if (error.message && error.message.includes('Invalid collection')) {
      throw new Error('Collection not found. Create the compliance_uploads collection in Appwrite.');
    }
    
    throw error;
  }
}

/**
 * Get failed sync records
 * @returns {Promise<array>} List of failed syncs
 */
export async function getFailedSyncs() {
  return getSyncStatusRecords({ status: 'failed' });
}

/**
 * Get pending sync records
 * @returns {Promise<array>} List of pending syncs
 */
export async function getPendingSyncs() {
  return getSyncStatusRecords({ status: 'pending' });
}

/**
 * Get successful sync records
 * @returns {Promise<array>} List of successful syncs
 */
export async function getSuccessfulSyncs() {
  return getSyncStatusRecords({ status: 'success' });
}

/**
 * Get sync summary statistics
 * @returns {Promise<object>} Summary with counts by status
 */
export async function getSyncSummary() {
  if (!dbId || !complianceUploadsCol) {
    throw new Error('Compliance uploads collection not configured.');
  }

  if (config.isDemoMode) {
    throw new Error('Drive sync is disabled in demo mode.');
  }

  try {
    await validateDriveSyncSchema();

    const [failed, pending, successful] = await Promise.all([
      getFailedSyncs(),
      getPendingSyncs(),
      getSuccessfulSyncs(),
    ]);

    return {
      total: failed.length + pending.length + successful.length,
      failed: failed.length,
      pending: pending.length,
      successful: successful.length,
      failureRate: failed.length > 0 
        ? ((failed.length / (failed.length + successful.length)) * 100).toFixed(1) 
        : 0,
    };
  } catch (error) {
    console.error('Error getting sync summary:', error);
    throw error;
  }
}

/**
 * Get sync details for a specific file
 * @param {string} recordId - Document ID
 * @returns {Promise<object>} Detailed sync record
 */
export async function getSyncRecordDetail(recordId) {
  if (!dbId || !complianceUploadsCol) {
    throw new Error('Compliance uploads collection not configured');
  }

  try {
    await validateDriveSyncSchema();

    const record = await databases.getDocument(
      dbId,
      complianceUploadsCol,
      recordId
    );
    return record;
  } catch (error) {
    console.error('Error fetching sync record detail:', error);
    throw error;
  }
}

/**
 * Update sync status (used by retry or manual update)
 * @param {string} recordId - Document ID
 * @param {string} status - New status (success/failed/pending)
 * @param {object} updates - Additional fields to update
 * @returns {Promise<object>} Updated record
 */
export async function updateSyncStatus(recordId, status, updates = {}) {
  if (!dbId || !complianceUploadsCol) {
    throw new Error('Compliance uploads collection not configured');
  }

  try {
    await validateDriveSyncSchema();

    const updateData = {
      ...updates,
      driveSyncStatus: status,
      updatedAt: new Date().toISOString(),
    };

    const updated = await databases.updateDocument(
      dbId,
      complianceUploadsCol,
      recordId,
      updateData
    );

    return updated;
  } catch (error) {
    console.error('Error updating sync status:', error);
    throw error;
  }
}

/**
 * Log a sync attempt
 * @param {string} staffId - Staff member ID
 * @param {string} fileName - File name
 * @param {string} fileType - File type (e.g., 'id_document', 'proof_of_address')
 * @param {string} status - Sync status (success/failed)
 * @param {string} appwriteFileId - Appwrite file ID
 * @param {string} driveFileId - Google Drive file ID (if successful)
 * @param {string} syncError - Error message if failed
 * @returns {Promise<object>} Created record
 */
export async function logSyncAttempt(
  staffId,
  fileName,
  fileType,
  status,
  appwriteFileId,
  driveFileId = null,
  syncError = null
) {
  if (!dbId || !complianceUploadsCol) {
    throw new Error('Compliance uploads collection not configured');
  }

  try {
    await validateDriveSyncSchema();

    const recordData = {
      staffId: staffId,
      fileName: fileName,
      fileType: fileType,
      driveSyncStatus: status,
      appwriteFileId: appwriteFileId,
      googleDriveFileId: driveFileId,
      syncError: syncError,
      lastSyncAttempt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const record = await databases.createDocument(
      dbId,
      complianceUploadsCol,
      undefined, // Auto-generate ID
      recordData
    );

    // Audit log
    await auditService.logAction({
      action: 'DRIVE_SYNC_ATTEMPT',
      entity: 'compliance_uploads',
      entityId: record.$id,
      changes: { status, staffId, fileName },
    });

    return record;
  } catch (error) {
    console.error('Error logging sync attempt:', error);
    throw error;
  }
}

/**
 * Clear old successful syncs (older than days)
 * @param {number} olderThanDays - Clear records older than this many days
 * @returns {Promise<number>} Number of records cleared
 */
export async function clearOldSuccessfulSyncs(olderThanDays = 90) {
  if (!dbId || !complianceUploadsCol) {
    throw new Error('Compliance uploads collection not configured');
  }

  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const oldRecords = await databases.listDocuments(
      dbId,
      complianceUploadsCol,
      [
        Query.equal('driveSyncStatus', 'success'),
        Query.lessThan('createdAt', cutoffDate.toISOString()),
      ]
    );

    let cleared = 0;
    for (const record of oldRecords.documents) {
      try {
        await databases.deleteDocument(dbId, complianceUploadsCol, record.$id);
        cleared++;
      } catch (e) {
        console.warn(`Failed to delete record ${record.$id}:`, e);
      }
    }

    return cleared;
  } catch (error) {
    console.error('Error clearing old syncs:', error);
    throw error;
  }
}

/**
 * Get sync status for a specific staff member
 * @param {string} staffId - Staff member ID
 * @returns {Promise<object>} Summary of staff's sync status
 */
export async function getStaffSyncStatus(staffId) {
  if (!dbId || !complianceUploadsCol) {
    throw new Error('Compliance uploads collection not configured');
  }

  try {
    const records = await databases.listDocuments(
      dbId,
      complianceUploadsCol,
      [Query.equal('staffId', staffId), Query.orderDesc('createdAt')]
    );

    const documents = records.documents || [];
    const failed = documents.filter(d => d.driveSyncStatus === 'failed');
    const pending = documents.filter(d => d.driveSyncStatus === 'pending');
    const successful = documents.filter(d => d.driveSyncStatus === 'success');

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
  } catch (error) {
    console.error('Error getting staff sync status:', error);
    throw error;
  }
}

/**
 * Generate sync status report
 * @returns {Promise<object>} Comprehensive sync report
 */
export async function generateSyncReport() {
  if (!dbId || !complianceUploadsCol) {
    throw new Error('Compliance uploads collection not configured');
  }

  try {
    const allRecords = await databases.listDocuments(
      dbId,
      complianceUploadsCol,
      [Query.orderDesc('createdAt')]
    );

    const records = allRecords.documents || [];
    const byStatus = {};
    const byFileType = {};
    const byStaff = {};

    records.forEach(record => {
      // Group by status
      byStatus[record.driveSyncStatus] = (byStatus[record.driveSyncStatus] || 0) + 1;

      // Group by file type
      byFileType[record.fileType] = (byFileType[record.fileType] || 0) + 1;

      // Group by staff
      if (!byStaff[record.staffId]) {
        byStaff[record.staffId] = { total: 0, failed: 0, pending: 0, success: 0 };
      }
      byStaff[record.staffId].total++;
      byStaff[record.staffId][record.driveSyncStatus]++;
    });

    return {
      totalRecords: records.length,
      byStatus,
      byFileType,
      byStaff,
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error generating sync report:', error);
    throw error;
  }
}
