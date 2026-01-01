// Vercel Serverless Function: Sync a compliance file to Google Drive
// Expects POST JSON: { staffId, employeeNumber?, fullName?, fileName, fileType, appwriteFileId }
// Env required:
// - APPWRITE_ENDPOINT or VITE_APPWRITE_ENDPOINT
// - APPWRITE_PROJECT_ID or VITE_APPWRITE_PROJECT_ID
// - APPWRITE_API_KEY
// - APPWRITE_DATABASE_ID or VITE_APPWRITE_DATABASE_ID
// - APPWRITE_FILES_BUCKET or VITE_APPWRITE_FILES_BUCKET
// - GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON or VITE_GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON
// - GOOGLE_DRIVE_PARENT_FOLDER_ID or VITE_GOOGLE_DRIVE_PARENT_FOLDER_ID

import { google } from 'googleapis';
import { Client, Databases, Storage, Query, ID } from 'node-appwrite';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      staffId,
      employeeNumber,
      fullName,
      fileName,
      fileType,
      appwriteFileId,
    } = req.body || {};

    if (!staffId || !fileName || !fileType || !appwriteFileId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Resolve env vars (prefer server-side names; fallback to VITE_)
    const endpoint = process.env.APPWRITE_ENDPOINT || process.env.VITE_APPWRITE_ENDPOINT;
    const projectId = process.env.APPWRITE_PROJECT_ID || process.env.VITE_APPWRITE_PROJECT_ID;
    const apiKey = process.env.APPWRITE_API_KEY;
    const databaseId = process.env.APPWRITE_DATABASE_ID || process.env.VITE_APPWRITE_DATABASE_ID;
    const bucketId = process.env.APPWRITE_FILES_BUCKET || process.env.VITE_APPWRITE_FILES_BUCKET;

    const driveParentId = process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID || process.env.VITE_GOOGLE_DRIVE_PARENT_FOLDER_ID;
    const serviceJsonRaw = process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON || process.env.VITE_GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON;

    if (!endpoint || !projectId || !apiKey || !databaseId || !bucketId) {
      return res.status(500).json({ error: 'Missing Appwrite env configuration' });
    }
    if (!driveParentId || !serviceJsonRaw) {
      return res.status(500).json({ error: 'Missing Google Drive env configuration' });
    }

    // Initialize Appwrite (node)
    const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
    const databases = new Databases(client);
    const storage = new Storage(client);

    // Fetch staff details if not provided
    let folderEmployeeNumber = employeeNumber;
    let folderFullName = fullName;

    if (!folderEmployeeNumber || !folderFullName) {
      try {
        const profile = await databases.getDocument(databaseId, 'staff_profiles', staffId);
        folderEmployeeNumber = profile?.employee_number || folderEmployeeNumber || 'FS-UNKNOWN';
        folderFullName = profile?.fullName || folderFullName || 'Unknown';
      } catch (e) {
        // Fallbacks
        folderEmployeeNumber = folderEmployeeNumber || 'FS-UNKNOWN';
        folderFullName = folderFullName || 'Unknown';
      }
    }

    // Initialize Google Drive
    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(serviceJsonRaw),
      scopes: ['https://www.googleapis.com/auth/drive'],
    });
    const drive = google.drive({ version: 'v3', auth });

    // Ensure staff folder
    const folderName = `${folderEmployeeNumber} (${folderFullName})`;

    // Try lookup in DB first
    let staffFolderId = null;
    try {
      const existing = await databases.listDocuments(databaseId, 'google_drive_folders', [
        Query.equal('staff_id', staffId),
      ]);
      if (existing.total > 0) {
        staffFolderId = existing.documents[0].folder_id;
      }
    } catch (_) {}

    if (!staffFolderId) {
      // Try locate by name under parent
      const search = await drive.files.list({
        q: `name='${folderName.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.folder' and '${driveParentId}' in parents and trashed=false`,
        spaces: 'drive',
        fields: 'files(id,name)'
      });
      if (search.data.files?.length) {
        staffFolderId = search.data.files[0].id;
      } else {
        const created = await drive.files.create({
          resource: { name: folderName, parents: [driveParentId], mimeType: 'application/vnd.google-apps.folder' },
          fields: 'id'
        });
        staffFolderId = created.data.id;
      }

      // Persist mapping
      try {
        await databases.createDocument(databaseId, 'google_drive_folders', ID.unique(), {
          staff_id: staffId,
          folder_id: staffFolderId,
          folder_name: folderName,
          created_at: new Date().toISOString(),
          parent_folder_id: driveParentId,
        });
      } catch (_) {}
    }

    // Ensure type subfolder
    const typeFolders = { identity: 'Identity', employment: 'Employment', evidence: 'Evidence', criminal: 'Criminal', sia: 'SIA', video: 'Video' };
    const typeFolderName = typeFolders[fileType] || 'Other';
    let typeFolderId = null;

    const typeSearch = await drive.files.list({
      q: `name='${typeFolderName.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.folder' and '${staffFolderId}' in parents and trashed=false`,
      spaces: 'drive',
      fields: 'files(id,name)'
    });
    if (typeSearch.data.files?.length) {
      typeFolderId = typeSearch.data.files[0].id;
    } else {
      const typeCreated = await drive.files.create({
        resource: { name: typeFolderName, parents: [staffFolderId], mimeType: 'application/vnd.google-apps.folder' },
        fields: 'id'
      });
      typeFolderId = typeCreated.data.id;
    }

    // Resolve filename and download from Appwrite Storage
    let resolvedFileName = fileName;
    try {
      const meta = await storage.getFile(bucketId, appwriteFileId);
      if (!resolvedFileName) resolvedFileName = meta?.name || `file-${appwriteFileId}`;
    } catch (_) {
      resolvedFileName = resolvedFileName || `file-${appwriteFileId}`;
    }
    const fileBuffer = await storage.getFileDownload(bucketId, appwriteFileId);

    // Upload to Drive
    const media = { mimeType: inferMimeType(resolvedFileName), body: Buffer.from(fileBuffer) };
    const fileMeta = { name: resolvedFileName, parents: [typeFolderId] };
    const uploaded = await drive.files.create({ resource: fileMeta, media, fields: 'id' });

    // Ensure uploads record exists, then update as synced
    try {
      const existingUpload = await databases.listDocuments(databaseId, 'compliance_uploads', [
        Query.equal('appwrite_file_id', appwriteFileId),
      ]);
      let doc = existingUpload.total > 0 ? existingUpload.documents[0] : null;
      if (!doc) {
        try {
          doc = await databases.createDocument(databaseId, 'compliance_uploads', ID.unique(), {
            staff_id: staffId,
            file_id: appwriteFileId,
            file_name: resolvedFileName,
            file_type: fileType,
            appwrite_file_id: appwriteFileId,
            uploaded_at: new Date().toISOString(),
            sync_status: 'pending',
            sync_attempts: 0,
          });
        } catch (_) {}
      }
      if (doc) {
        await databases.updateDocument(databaseId, 'compliance_uploads', doc.$id, {
          google_drive_file_id: uploaded.data.id,
          google_drive_folder_id: typeFolderId,
          sync_status: 'synced',
          sync_attempts: (doc.sync_attempts || 0) + 1,
          last_sync_attempt: new Date().toISOString(),
          sync_error: null,
        });
      }
    } catch (_) {}

    return res.status(200).json({ ok: true, driveFileId: uploaded.data.id, folderId: typeFolderId });
  } catch (error) {
    console.error('Drive sync error:', error);
    return res.status(500).json({ error: error.message || 'Drive sync failed' });
  }
}

function inferMimeType(fileName) {
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
