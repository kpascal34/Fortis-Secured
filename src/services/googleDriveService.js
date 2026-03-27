/**
 * Google Drive Integration Service
 * Syncs compliance files to Google Drive with retry logic
 * 
 * Requires: GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON, GOOGLE_DRIVE_PARENT_FOLDER_ID
 */

import { ID, Query } from 'appwrite';
import { google } from 'googleapis';
import { config, databases, storage } from '../lib/appwrite.js';
import { logAudit } from './auditService.js';

const isBrowser = typeof window !== 'undefined';

const dbId = config.databaseId;

let driveService = null;

function getDriveService() {
  if (driveService) return driveService;

  const serviceAccountRaw = config.googleDriveServiceAccountJson || '{}';
  const serviceAccount = JSON.parse(serviceAccountRaw);

  const auth = new google.auth.GoogleAuth({
    credentials: serviceAccount,
    scopes: ['https://www.googleapis.com/auth/drive'],
  });

  driveService = google.drive({ version: 'v3', auth });
  return driveService;
}

/**
 * Create or get staff Google Drive folder
 * Folder path: Fortis Compliance / FS-000123 (Name)
 */
export async function ensureStaffFolder(staffId, employeeNumber, fullName) {
  const existingFolder = await databases.listDocuments(dbId, 'google_drive_folders', [
    Query.equal('staffId', staffId),
  ]);

  if (existingFolder.documents.length > 0) {
    return existingFolder.documents[0];
  }

  const drive = getDriveService();
  const parentFolderId = config.googleDriveParentFolderId;

  if (!parentFolderId) {
    throw new Error('GOOGLE_DRIVE_PARENT_FOLDER_ID not set');
  }

  // Fallback lookups for folder naming if not provided
  if (!employeeNumber || !fullName) {
    try {
      const profile = await databases.getDocument(dbId, 'staff_profiles', staffId);
      employeeNumber = employeeNumber || profile?.employeeNumber || 'FS-UNKNOWN';
      fullName = fullName || profile?.fullName || 'Unknown';
    } catch (_) {
      employeeNumber = employeeNumber || 'FS-UNKNOWN';
      fullName = fullName || 'Unknown';
    }
  }

  // Create folder: FS-000123 (Name)
  const folderName = `${employeeNumber} (${fullName})`;

  const folderMetadata = {
    name: folderName,
    parents: [parentFolderId],
    mimeType: 'application/vnd.google-apps.folder',
  };

  try {
    const response = await drive.files.create({
      resource: folderMetadata,
      fields: 'id',
    });

    const folderId = response.data.id;

    const dbFolder = await databases.createDocument(dbId, 'google_drive_folders', ID.unique(), {
      staffId: staffId,
      folderId: folderId,
      folderName: folderName,
      createdAt: new Date().toISOString(),
      parentFolderId: parentFolderId,
    });

    await logAudit({
      actorId: staffId,
      actorRole: 'staff',
      action: 'CREATE',
      entity: 'google_drive_folders',
      entityId: dbFolder.$id,
      diff: JSON.stringify({ folderId, folderName }),
      driveSyncStatus: 'synced',
    });

    return dbFolder;
  } catch (err) {
    console.error('Failed to create Google Drive folder:', err);
    throw err;
  }
}

/**
 * Sync file to Google Drive
 * Called after each compliance upload
 * Includes retry logic (max 3 attempts, 5-min backoff)
 */
export async function syncFileToGoogleDrive(staffId, fileId, fileName, fileType, appwriteFileId) {
  // If running in the browser, call the serverless API to perform sync
  if (isBrowser) {
    const payload = { staffId, fileId, fileName, fileType, appwriteFileId };
    const resp = await fetch('/api/drive-sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.error || 'Drive sync failed');
    }
    const data = await resp.json();
    // Also update local DB record to reflect success if it exists
    try {
      const uploads = await databases.listDocuments(dbId, config.complianceUploadsCollectionId, [
        Query.equal('appwriteFileId', appwriteFileId),
      ]);
      if (uploads.documents.length > 0) {
        await databases.updateDocument(dbId, config.complianceUploadsCollectionId, uploads.documents[0].$id, {
          googleDriveFileId: data.driveFileId,
          googleDriveFolderId: data.folderId,
          syncStatus: 'synced',
          lastSyncAttempt: new Date().toISOString(),
          syncError: null,
        });
      }
    } catch (_) {}
    return data;
  }
  // Check if already synced
  const uploads = await databases.listDocuments(dbId, config.complianceUploadsCollectionId, [
    Query.equal('appwriteFileId', appwriteFileId),
  ]);

  if (uploads.documents.length > 0) {
    const upload = uploads.documents[0];
    if (upload.syncStatus === 'synced') {
      return upload; // Already synced
    }
  }

  // Get or create record
  let uploadRecord;
  if (uploads.documents.length > 0) {
    uploadRecord = uploads.documents[0];
  } else {
    uploadRecord = await databases.createDocument(dbId, config.complianceUploadsCollectionId, ID.unique(), {
      staffId: staffId,
      fileId: fileId,
      fileName: fileName,
      fileType: fileType,
      appwriteFileId: appwriteFileId,
      uploadedAt: new Date().toISOString(),
      syncStatus: 'pending',
      syncAttempts: 0,
    });
  }

  // Attempt sync
  try {
    const staffFolder = await ensureStaffFolder(staffId);
    const drive = getDriveService();

    // Get folder for file type (Identity, Employment, etc.)
    const typeFolders = {
      identity: 'Identity',
      employment: 'Employment',
      evidence: 'Evidence',
      criminal: 'Criminal',
      sia: 'SIA',
      video: 'Video',
    };

    const typeFolderName = typeFolders[fileType] || 'Other';
    let typeFolderId = await getOrCreateTypeFolder(drive, staffFolder.folderId, typeFolderName);

    // Download file from Appwrite
    const filesBucket =
      config.documentsBucketId;
    const appwriteFile = await storage.getFileDownload(
      filesBucket,
      appwriteFileId
    );

    // Upload to Google Drive
    const fileMetadata = {
      name: fileName,
      parents: [typeFolderId],
    };

    const media = {
      mimeType: getMimeType(fileName),
      body: Buffer.from(appwriteFile),
    };

    const response = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id',
    });

    const driveFileId = response.data.id;

    // Update record
    await databases.updateDocument(dbId, config.complianceUploadsCollectionId, uploadRecord.$id, {
      googleDriveFileId: driveFileId,
      googleDriveFolderId: typeFolderId,
      syncStatus: 'synced',
      syncAttempts: uploadRecord.syncAttempts + 1,
      lastSyncAttempt: new Date().toISOString(),
      syncError: null,
    });

    await logAudit({
      actorId: staffId,
      actorRole: 'staff',
      action: 'UPDATE',
      entity: config.complianceUploadsCollectionId,
      entityId: uploadRecord.$id,
      diff: JSON.stringify({ driveFileId, status: 'synced' }),
      driveSyncStatus: 'synced',
    });

    return uploadRecord;
  } catch (err) {
    const attempts = uploadRecord.syncAttempts + 1;

    if (attempts < 3) {
      // Retry: schedule for 5 minutes later (TBD: use job queue)
      await databases.updateDocument(dbId, config.complianceUploadsCollectionId, uploadRecord.$id, {
        syncAttempts: attempts,
        lastSyncAttempt: new Date().toISOString(),
        syncError: err.message,
        syncStatus: 'pending',
      });

      // TODO: Implement background job for retry
      console.error(`[Retry ${attempts}/3] File sync failed:`, err.message);
    } else {
      // Give up after 3 attempts
      await databases.updateDocument(dbId, config.complianceUploadsCollectionId, uploadRecord.$id, {
        syncAttempts: attempts,
        syncStatus: 'failed',
        lastSyncAttempt: new Date().toISOString(),
        syncError: err.message,
      });

      await logAudit({
        actorId: staffId,
        actorRole: 'system',
        action: 'UPDATE',
        entity: config.complianceUploadsCollectionId,
        entityId: uploadRecord.$id,
        diff: JSON.stringify({ status: 'failed', error: err.message }),
        driveSyncStatus: 'failed',
      });
    }

    throw err;
  }
}

/**
 * Get or create type folder (Identity, Employment, etc.)
 */
async function getOrCreateTypeFolder(drive, parentFolderId, typeName) {
  // Check if exists
  const response = await drive.files.list({
    q: `name='${typeName}' and mimeType='application/vnd.google-apps.folder' and '${parentFolderId}' in parents`,
    spaces: 'drive',
    fields: 'files(id)',
  });

  if (response.data.files && response.data.files.length > 0) {
    return response.data.files[0].id;
  }

  // Create folder
  const folderMetadata = {
    name: typeName,
    parents: [parentFolderId],
    mimeType: 'application/vnd.google-apps.folder',
  };

  const createResponse = await drive.files.create({
    resource: folderMetadata,
    fields: 'id',
  });

  return createResponse.data.id;
}

/**
 * Get MIME type from filename
 */
function getMimeType(fileName) {
  const ext = fileName.split('.').pop().toLowerCase();

  const types = {
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    mp4: 'video/mp4',
    mov: 'video/quicktime',
    txt: 'text/plain',
  };

  return types[ext] || 'application/octet-stream';
}

/**
 * Retry failed syncs (call periodically)
 */
export async function retryFailedSyncs() {
  const failed = await databases.listDocuments(dbId, config.complianceUploadsCollectionId, [
    Query.equal('syncStatus', 'pending'),
    Query.lessThan('syncAttempts', 3),
  ]);

  for (const upload of failed.documents) {
    try {
      await syncFileToGoogleDrive(
        upload.staffId,
        upload.fileId,
        upload.fileName,
        upload.fileType,
        upload.appwriteFileId
      );
    } catch (err) {
      console.error(`Retry failed for ${upload.fileId}:`, err.message);
    }
  }
}

/**
 * Get staff's uploaded files (with sync status)
 */
export async function getStaffUploads(staffId) {
  const uploads = await databases.listDocuments(dbId, config.complianceUploadsCollectionId, [
    Query.equal('staffId', staffId),
    Query.orderDesc('uploadedAt'),
  ]);

  return uploads.documents;
}

/**
 * Get failed syncs for admin review
 */
export async function getFailedSyncs() {
  const failed = await databases.listDocuments(dbId, config.complianceUploadsCollectionId, [
    Query.equal('syncStatus', 'failed'),
  ]);

  return failed.documents;
}
