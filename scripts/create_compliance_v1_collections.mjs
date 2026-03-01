import { Client, Databases, ID } from 'node-appwrite';

const required = ['APPWRITE_ENDPOINT', 'APPWRITE_PROJECT_ID', 'APPWRITE_API_KEY', 'APPWRITE_DATABASE_ID'];
for (const env of required) if (!process.env[env]) throw new Error(`Missing ${env}`);

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);
const db = process.env.APPWRITE_DATABASE_ID;

const defs = [
  {
    id: process.env.APPWRITE_DOCUMENT_TEMPLATES_COLLECTION_ID || 'documentTemplates',
    name: 'documentTemplates',
    attrs: [['key', 120, true], ['name', 255, true], ['version', 32, true], ['sourceStorage', 255, true], ['fieldMapJson', 50000, true]],
    indexes: [['template_key_idx', 'key', 'key']]
  },
  {
    id: process.env.APPWRITE_COMPLIANCE_SUBMISSIONS_COLLECTION_ID || 'complianceSubmissions',
    name: 'complianceSubmissions',
    attrs: [['staffId', 120, true], ['templateKey', 120, true], ['status', 24, true], ['formDataJson', 100000, true], ['createdAt', 64, true], ['submittedAt', 64, false], ['adminNotes', 4000, false]],
    indexes: [['submission_staff_idx', 'key', 'staffId'], ['submission_status_idx', 'key', 'status'], ['submission_created_idx', 'key', 'createdAt']]
  },
  {
    id: process.env.APPWRITE_DOCUMENT_INSTANCES_COLLECTION_ID || 'documentInstances',
    name: 'documentInstances',
    attrs: [['staffId', 120, true], ['templateKey', 120, true], ['submissionId', 120, true], ['driveFileId', 255, true], ['driveFolderId', 255, true], ['webViewLink', 500, true], ['sha256', 128, true], ['createdAt', 64, true]],
    indexes: [['instance_staff_idx', 'key', 'staffId'], ['instance_template_idx', 'key', 'templateKey']]
  },
  {
    id: process.env.APPWRITE_AUDIT_LOGS_COLLECTION_ID || 'auditLogs',
    name: 'auditLogs',
    attrs: [['actorUserId', 120, true], ['action', 100, true], ['entityType', 100, true], ['entityId', 120, true], ['metadataJson', 10000, false], ['createdAt', 64, true]],
    indexes: [['audit_entity_type_idx', 'key', 'entityType'], ['audit_entity_id_idx', 'key', 'entityId'], ['audit_created_idx', 'key', 'createdAt']]
  }
];

for (const def of defs) {
  await ensureCollection(def);
}

console.log('Compliance v1 collections/indexes ensured.');

async function ensureCollection(def) {
  try {
    await databases.getCollection(db, def.id);
  } catch {
    await databases.createCollection(db, def.id, def.name, [], true, true);
  }

  for (const [key, size, requiredAttr] of def.attrs) {
    try { await databases.createStringAttribute(db, def.id, key, size, requiredAttr); } catch {}
  }

  for (const [idx, type, attr] of def.indexes) {
    try { await databases.createIndex(db, def.id, idx, type, [attr]); } catch {}
  }
}
