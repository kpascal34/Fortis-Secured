#!/usr/bin/env node
/**
 * One-time migration: copy snake_case Appwrite attributes into camelCase equivalents.
 *
 * Safe: does NOT delete any fields/columns; only updates documents.
 *
 * Usage:
 *   APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1 \
 *   APPWRITE_PROJECT_ID=... \
 *   APPWRITE_DATABASE_ID=... \
 *   APPWRITE_API_KEY=... \
 *   node scripts/migrate-snake-to-camel.js
 */

const ENDPOINT = process.env.APPWRITE_ENDPOINT;
const PROJECT_ID = process.env.APPWRITE_PROJECT_ID;
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID;
const API_KEY = process.env.APPWRITE_API_KEY;

if (!ENDPOINT || !PROJECT_ID || !DATABASE_ID || !API_KEY) {
  console.error('Missing env vars. Need APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_DATABASE_ID, APPWRITE_API_KEY');
  process.exit(1);
}

const headers = {
  'Content-Type': 'application/json',
  'X-Appwrite-Project': PROJECT_ID,
  'X-Appwrite-Key': API_KEY,
};

async function appwrite(path, { method = 'GET', params = {}, body } = {}) {
  const url = new URL(`${ENDPOINT.replace(/\/$/, '')}${path}`);
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    url.searchParams.set(k, String(v));
  }
  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  if (!res.ok) {
    const msg = (json && (json.message || json.error || json.raw)) || text || `HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    err.payload = json;
    throw err;
  }
  return json;
}

async function listAllDocuments(collectionId, { limit = 100 } = {}) {
  let offset = 0;
  const all = [];
  while (true) {
    const page = await appwrite(`/databases/${DATABASE_ID}/collections/${collectionId}/documents`, {
      params: { limit, offset },
    });
    const docs = page.documents || [];
    all.push(...docs);
    offset += docs.length;
    if (!docs.length || offset >= (page.total ?? Infinity)) break;
  }
  return all;
}

function buildPatch(doc, mapping) {
  const data = {};
  for (const [snake, camel] of Object.entries(mapping)) {
    const hasSnake = doc[snake] !== undefined && doc[snake] !== null && doc[snake] !== '';
    const hasCamel = doc[camel] !== undefined && doc[camel] !== null && doc[camel] !== '';
    if (hasSnake && !hasCamel) data[camel] = doc[snake];
  }
  return data;
}

async function migrateCollection(collectionId, mapping) {
  const result = {
    collectionId,
    scanned: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    failures: [],
  };

  const docs = await listAllDocuments(collectionId);
  result.scanned = docs.length;

  for (const doc of docs) {
    const patch = buildPatch(doc, mapping);
    const keys = Object.keys(patch);
    if (!keys.length) {
      result.skipped++;
      continue;
    }

    try {
      await appwrite(`/databases/${DATABASE_ID}/collections/${collectionId}/documents/${doc.$id}`,
        { method: 'PATCH', body: { data: patch } }
      );
      result.updated++;
    } catch (e) {
      result.failed++;
      if (result.failures.length < 25) {
        result.failures.push({ id: doc.$id, error: e.message });
      }
    }
  }

  return result;
}

const COLLECTIONS = {
  staff_compliance: {
    staff_id: 'staffId',
    current_step: 'currentStep',
    step_1_identity: 'step1Identity',
    // If you later create camelCase for other steps, add here.
    // step_2_employment: 'step2Employment', etc.
  },
  compliance_uploads: {
    staff_id: 'staffId',
    file_name: 'fileName',
    file_type: 'fileType',
    drive_sync_status: 'driveSyncStatus',
    appwrite_file_id: 'appwriteFileId',
    google_drive_file_id: 'googleDriveFileId',
    last_sync_attempt: 'lastSyncAttempt',
    sync_error: 'syncError',
    sync_status: 'syncStatus',
    sync_attempts: 'syncAttempts',
    uploaded_at: 'uploadedAt',
    file_id: 'fileId',
    updated_at: 'updatedAt',
    created_at: 'createdAt',
  },
  // Note: google_drive_folders does not exist in the current database (per /collections).
  staff_profiles: {
    employee_number: 'employeeNumber',
  },
};

(async () => {
  const results = [];
  for (const [collectionId, mapping] of Object.entries(COLLECTIONS)) {
    console.log(`\n== Migrating ${collectionId} ==`);
    try {
      const r = await migrateCollection(collectionId, mapping);
      results.push(r);
      console.log(`scanned=${r.scanned} updated=${r.updated} skipped=${r.skipped} failed=${r.failed}`);
      if (r.failed) {
        console.log('sample failures:', r.failures);
        console.log('Most common reason: camelCase attribute not created yet in Appwrite schema.');
      }
    } catch (e) {
      console.error(`Failed migrating ${collectionId}:`, e.message);
      results.push({ collectionId, fatal: true, error: e.message });
    }
  }

  console.log('\nDone. Summary:');
  console.log(JSON.stringify(results, null, 2));
})();
