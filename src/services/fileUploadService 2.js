/**
 * File Upload Service
 * Minimal helpers to upload compliance files to Appwrite Storage
 */
import { ID } from 'appwrite';
import { storage } from '../lib/appwrite.js';

const bucketId = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_APPWRITE_FILES_BUCKET) || process.env.VITE_APPWRITE_FILES_BUCKET;

/**
 * Upload a File object to Appwrite Storage
 * @param {File|Blob} file - Browser File/Blob
 * @param {string} fileName - Desired filename
 * @returns {Promise<string>} appwriteFileId
 */
export async function uploadComplianceFile(file, fileName) {
  if (!storage) throw new Error('Storage not configured');
  if (!bucketId) throw new Error('Files bucket not configured');

  const id = ID.unique();
  const result = await storage.createFile(bucketId, id, file);
  return result.$id;
}

/**
 * Upload and return full metadata (id and name)
 */
export async function uploadComplianceFileWithMeta(file, fileName) {
  const id = await uploadComplianceFile(file, fileName);
  return { appwriteFileId: id, fileName: fileName || (file?.name) || `file-${id}` };
}
