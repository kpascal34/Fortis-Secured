/**
 * Google Drive Integration Service
 * Syncs compliance files to Google Drive with tenancy-aware controls.
 */

import { ID, Query } from 'appwrite';
import { google } from 'googleapis';
import { config, databases, storage } from '../lib/appwrite.js';
import { PERMISSIONS } from '../lib/rbac.ts';
import { buildPermissionsForDoc } from '../lib/appwritePermissions.js';
import { ensureDatabaseConfig, getAuthorizedScope, withScopedQueries } from '../lib/serviceSecurity.js';
import { RESOURCE_TYPES, normalizeTenancyDocument } from '../lib/tenancyScope.js';
import { logEvent } from './auditLogService.js';

const isBrowser = typeof window !== 'undefined';
const dbId = config.databaseId;
const uploadsCol = config.complianceUploadsCollectionId || 'compliance_uploads';
const staffProfilesCol = config.staffProfilesCollectionId || 'staff_profiles';
const foldersCol = 'google_drive_folders';

let driveService = null;

const ensureCollections = () => {
  ensureDatabaseConfig(uploadsCol, 'compliance uploads collection');
  ensureDatabaseConfig(staffProfilesCol, 'staff profiles collection');
};

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

const resolveStaffProfile = async (staffId) => {
  try {
    const profileByDoc = await databases.getDocument(dbId, staffProfilesCol, staffId);
    return profileByDoc;
  } catch (_) {
    const docs = await databases.listDocuments(dbId, staffProfilesCol, [
      Query.equal('userId', staffId),
      Query.limit(1),
    ]);
    return docs.documents[0] || null;
  }
};

const resolveTenancy = async (staffId) => {
  const profile = await resolveStaffProfile(staffId);
  return {
    profile,
    clientId: profile?.clientId || profile?.client_id || null,
    siteId: profile?.siteId || profile?.site_id || null,
    employeeNumber: profile?.employeeNumber || 'FS-UNKNOWN',
    fullName: profile?.fullName || `${profile?.firstName || ''} ${profile?.lastName || ''}`.trim() || 'Unknown',
  };
};

const assertOwnStaff = (scope, staffId, message = 'You can only operate on your own compliance records.') => {
  if (scope.role === 'staff' && String(scope.userId || '') !== String(staffId || '')) {
    throw new Error(message);
  }
};

/**
 * Create or get staff Google Drive folder.
 */
export async function ensureStaffFolder(staffId, employeeNumber, fullName, actor = null) {
  ensureCollections();

  const { actor: resolvedActor, scope } = await getAuthorizedScope({ actor, permission: PERMISSIONS.SUBMIT_COMPLIANCE });
  assertOwnStaff(scope, staffId);

  const existingFolder = await databases.listDocuments(dbId, foldersCol, [
    Query.equal('staffId', staffId),
    Query.limit(1),
  ]);

  if (existingFolder.documents.length > 0) {
    return existingFolder.documents[0];
  }

  const drive = getDriveService();
  const parentFolderId = config.googleDriveParentFolderId;

  if (!parentFolderId) {
    throw new Error('GOOGLE_DRIVE_PARENT_FOLDER_ID not set');
  }

  const tenancy = await resolveTenancy(staffId);

  const staffEmployeeNumber = employeeNumber || tenancy.employeeNumber;
  const staffFullName = fullName || tenancy.fullName;
  const folderName = `${staffEmployeeNumber} (${staffFullName})`;

  const response = await drive.files.create({
    resource: {
      name: folderName,
      parents: [parentFolderId],
      mimeType: 'application/vnd.google-apps.folder',
    },
    fields: 'id',
  });

  const folderId = response.data.id;

  const dbFolder = await databases.createDocument(dbId, foldersCol, ID.unique(), {
    staffId,
    folderId,
    folderName,
    parentFolderId,
    clientId: tenancy.clientId,
    siteId: tenancy.siteId,
    createdAt: new Date().toISOString(),
  });

  await logEvent({
    actorId: resolvedActor.$id,
    action: 'compliance.drive-folder.created',
    resourceType: 'google_drive_folders',
    resourceId: dbFolder.$id,
    clientId: tenancy.clientId,
    siteId: tenancy.siteId,
    metadata: { staffId, folderId, folderName },
  });

  return dbFolder;
}

/**
 * Sync file to Google Drive.
 */
export async function syncFileToGoogleDrive(staffId, fileId, fileName, fileType, appwriteFileId, actor = null) {
  ensureCollections();

  const { actor: resolvedActor, scope } = await getAuthorizedScope({ actor, permission: PERMISSIONS.SUBMIT_COMPLIANCE });
  assertOwnStaff(scope, staffId);

  const tenancy = await resolveTenancy(staffId);

  if (isBrowser) {
    const payload = { staffId, fileId, fileName, fileType, appwriteFileId };
    const response = await fetch('/api/drive-sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Drive sync failed');
    }

    const data = await response.json();

    try {
      const uploads = await databases.listDocuments(dbId, uploadsCol, [
        Query.equal('appwriteFileId', appwriteFileId),
        Query.equal('staffId', staffId),
        Query.limit(1),
      ]);

      if (uploads.documents.length > 0) {
        await databases.updateDocument(dbId, uploadsCol, uploads.documents[0].$id, {
          googleDriveFileId: data.driveFileId,
          googleDriveFolderId: data.folderId,
          syncStatus: 'synced',
          driveSyncStatus: 'success',
          lastSyncAttempt: new Date().toISOString(),
          syncError: null,
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (_) {
      // Local status update best-effort only.
    }

    return data;
  }

  const uploads = await databases.listDocuments(dbId, uploadsCol, [
    Query.equal('appwriteFileId', appwriteFileId),
    Query.equal('staffId', staffId),
    Query.limit(1),
  ]);

  if (uploads.documents.length > 0 && uploads.documents[0].syncStatus === 'synced') {
    return uploads.documents[0];
  }

  let uploadRecord;
  if (uploads.documents.length > 0) {
    uploadRecord = uploads.documents[0];
  } else {
    const permissions = buildPermissionsForDoc({
      type: 'compliance_uploads',
      ownerUserId: staffId,
      clientUserId: null,
      sharedWithClient: false,
    });

    uploadRecord = await databases.createDocument(
      dbId,
      uploadsCol,
      ID.unique(),
      {
        staffId,
        guardId: staffId,
        fileId,
        fileName,
        fileType,
        appwriteFileId,
        uploadedAt: new Date().toISOString(),
        syncStatus: 'pending',
        driveSyncStatus: 'pending',
        drive_sync_status: 'pending',
        status: 'pending',
        syncAttempts: 0,
        clientId: tenancy.clientId,
        siteId: tenancy.siteId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      permissions
    );
  }

  try {
    const staffFolder = await ensureStaffFolder(staffId, tenancy.employeeNumber, tenancy.fullName, resolvedActor);
    const drive = getDriveService();

    const typeFolderNameByKey = {
      identity: 'Identity',
      employment: 'Employment',
      evidence: 'Evidence',
      criminal: 'Criminal',
      sia: 'SIA',
      video: 'Video',
    };

    const typeFolderName = typeFolderNameByKey[fileType] || 'Other';
    const typeFolderId = await getOrCreateTypeFolder(drive, staffFolder.folderId, typeFolderName);

    const filesBucket = config.documentsBucketId;
    const appwriteFile = await storage.getFileDownload(filesBucket, appwriteFileId);

    const driveResponse = await drive.files.create({
      resource: {
        name: fileName,
        parents: [typeFolderId],
      },
      media: {
        mimeType: getMimeType(fileName),
        body: Buffer.from(appwriteFile),
      },
      fields: 'id',
    });

    const driveFileId = driveResponse.data.id;

    await databases.updateDocument(dbId, uploadsCol, uploadRecord.$id, {
      googleDriveFileId: driveFileId,
      googleDriveFolderId: typeFolderId,
      syncStatus: 'synced',
      driveSyncStatus: 'success',
      drive_sync_status: 'success',
      syncAttempts: Number(uploadRecord.syncAttempts || 0) + 1,
      lastSyncAttempt: new Date().toISOString(),
      syncError: null,
      updatedAt: new Date().toISOString(),
    });

    await logEvent({
      actorId: resolvedActor.$id,
      action: 'compliance.upload.synced',
      resourceType: RESOURCE_TYPES.COMPLIANCE_UPLOADS,
      resourceId: uploadRecord.$id,
      clientId: tenancy.clientId,
      siteId: tenancy.siteId,
      metadata: {
        staffId,
        appwriteFileId,
        driveFileId,
      },
    });

    return uploadRecord;
  } catch (error) {
    const attempts = Number(uploadRecord.syncAttempts || 0) + 1;
    const failed = attempts >= 3;

    await databases.updateDocument(dbId, uploadsCol, uploadRecord.$id, {
      syncAttempts: attempts,
      lastSyncAttempt: new Date().toISOString(),
      syncError: error.message,
      syncStatus: failed ? 'failed' : 'pending',
      driveSyncStatus: failed ? 'failed' : 'pending',
      drive_sync_status: failed ? 'failed' : 'pending',
      updatedAt: new Date().toISOString(),
    });

    await logEvent({
      actorId: resolvedActor.$id,
      action: failed ? 'compliance.upload.sync.failed' : 'compliance.upload.sync.retry-scheduled',
      resourceType: RESOURCE_TYPES.COMPLIANCE_UPLOADS,
      resourceId: uploadRecord.$id,
      clientId: tenancy.clientId,
      siteId: tenancy.siteId,
      metadata: {
        staffId,
        attempts,
        error: error.message,
      },
    });

    throw error;
  }
}

async function getOrCreateTypeFolder(drive, parentFolderId, typeName) {
  const response = await drive.files.list({
    q: `name='${typeName}' and mimeType='application/vnd.google-apps.folder' and '${parentFolderId}' in parents`,
    spaces: 'drive',
    fields: 'files(id)',
  });

  if (response.data.files && response.data.files.length > 0) {
    return response.data.files[0].id;
  }

  const createResponse = await drive.files.create({
    resource: {
      name: typeName,
      parents: [parentFolderId],
      mimeType: 'application/vnd.google-apps.folder',
    },
    fields: 'id',
  });

  return createResponse.data.id;
}

function getMimeType(fileName) {
  const ext = String(fileName || '').split('.').pop().toLowerCase();

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

export async function retryFailedSyncs(actor = null) {
  ensureCollections();

  const { scope } = await getAuthorizedScope({ actor, permission: PERMISSIONS.VIEW_DRIVE_SYNC });

  const queries = withScopedQueries(RESOURCE_TYPES.COMPLIANCE_UPLOADS, scope, [
    Query.equal('syncStatus', 'pending'),
    Query.lessThan('syncAttempts', 3),
    Query.limit(200),
  ]);

  const failed = await databases.listDocuments(dbId, uploadsCol, queries);

  for (const upload of failed.documents) {
    try {
      await syncFileToGoogleDrive(
        upload.staffId,
        upload.fileId,
        upload.fileName,
        upload.fileType,
        upload.appwriteFileId,
        actor
      );
    } catch (error) {
      console.error(`Retry failed for ${upload.fileId}:`, error.message);
    }
  }
}

export async function getStaffUploads(staffId, actor = null) {
  ensureCollections();

  const { scope } = await getAuthorizedScope({ actor, permission: PERMISSIONS.VIEW_COMPLIANCE });
  assertOwnStaff(scope, staffId, 'You can only view your own uploads.');

  const queries = withScopedQueries(RESOURCE_TYPES.COMPLIANCE_UPLOADS, scope, [
    Query.equal('staffId', staffId),
    Query.orderDesc('uploadedAt'),
    Query.limit(500),
  ]);

  const uploads = await databases.listDocuments(dbId, uploadsCol, queries);
  return uploads.documents.map((doc) => normalizeTenancyDocument(RESOURCE_TYPES.COMPLIANCE_UPLOADS, doc));
}

export async function getFailedSyncs(actor = null) {
  ensureCollections();

  const { scope } = await getAuthorizedScope({ actor, permission: PERMISSIONS.VIEW_DRIVE_SYNC });

  const queries = withScopedQueries(RESOURCE_TYPES.COMPLIANCE_UPLOADS, scope, [
    Query.equal('syncStatus', 'failed'),
    Query.limit(500),
  ]);

  const failed = await databases.listDocuments(dbId, uploadsCol, queries);
  return failed.documents.map((doc) => normalizeTenancyDocument(RESOURCE_TYPES.COMPLIANCE_UPLOADS, doc));
}
