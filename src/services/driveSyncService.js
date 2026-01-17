/**
 * Drive Sync Status Service
 * Manages fetching and updating Google Drive sync status records for compliance uploads
 */

import { databases, config } from '../lib/appwrite.js';
import { Query } from 'appwrite';
import * as auditService from './auditService.js';

const dbId = config.databaseId;
const complianceUploadsCol = config.complianceUploadsCollectionId || 'compliance_uploads';

/**
 * Get all sync status records with filters
 * @param {object} filters - Query filters (status, staffId, dateRange, etc.)
 * @returns {Promise<array>} List of sync records
 */
export async function getSyncStatusRecords(filters = {}) {
  if (!dbId || !complianceUploadsCol) {
    throw new Error('Compliance uploads collection not configured');
  }

  try {
    const queries = [];

    // Filter by status if provided
    if (filters.status) {
      queries.push(Query.equal('drive_sync_status', filters.status));
    }

    // Filter by staff ID if provided
    if (filters.staffId) {
      queries.push(Query.equal('staff_id', filters.staffId));
    }

    // Filter by file type if provided
    if (filters.fileType) {
      queries.push(Query.equal('file_type', filters.fileType));
    }

    // Order by most recent first
    queries.push(Query.orderDesc('last_sync_attempt'));

    const response = await databases.listDocuments(
      dbId,
      complianceUploadsCol,
      queries
    );

    return response.documents || [];
  } catch (error) {
    console.error('Error fetching sync status records:', error);
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
    throw new Error('Compliance uploads collection not configured');
  }

  try {
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
    return {
      total: 0,
      failed: 0,
      pending: 0,
      successful: 0,
      failureRate: 0,
    };
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
    const updateData = {
      ...updates,
      drive_sync_status: status,
      updated_at: new Date().toISOString(),
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
    const recordData = {
      staff_id: staffId,
      file_name: fileName,
      file_type: fileType,
      drive_sync_status: status,
      appwrite_file_id: appwriteFileId,
      google_drive_file_id: driveFileId,
      sync_error: syncError,
      last_sync_attempt: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
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
        Query.equal('drive_sync_status', 'success'),
        Query.lessThan('created_at', cutoffDate.toISOString()),
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
      [Query.equal('staff_id', staffId), Query.orderDesc('created_at')]
    );

    const documents = records.documents || [];
    const failed = documents.filter(d => d.drive_sync_status === 'failed');
    const pending = documents.filter(d => d.drive_sync_status === 'pending');
    const successful = documents.filter(d => d.drive_sync_status === 'success');

    return {
      staffId,
      total: documents.length,
      failed: failed.length,
      pending: pending.length,
      successful: successful.length,
      latestAttempt: documents[0]?.last_sync_attempt || null,
      latestStatus: documents[0]?.drive_sync_status || null,
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
      [Query.orderDesc('created_at')]
    );

    const records = allRecords.documents || [];
    const byStatus = {};
    const byFileType = {};
    const byStaff = {};

    records.forEach(record => {
      // Group by status
      byStatus[record.drive_sync_status] = (byStatus[record.drive_sync_status] || 0) + 1;

      // Group by file type
      byFileType[record.file_type] = (byFileType[record.file_type] || 0) + 1;

      // Group by staff
      if (!byStaff[record.staff_id]) {
        byStaff[record.staff_id] = { total: 0, failed: 0, pending: 0, success: 0 };
      }
      byStaff[record.staff_id].total++;
      byStaff[record.staff_id][record.drive_sync_status]++;
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
