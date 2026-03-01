import { Client, Databases, Query } from 'node-appwrite';

const endpoint = process.env.APPWRITE_ENDPOINT;
const projectId = process.env.APPWRITE_PROJECT_ID;
const apiKey = process.env.APPWRITE_API_KEY;
const databaseId = process.env.APPWRITE_DATABASE_ID;
const complianceCollectionId = process.env.APPWRITE_COMPLIANCE_COLLECTION_ID || 'complianceSubmissions';
const schedulingCollectionId = process.env.APPWRITE_SCHEDULING_COLLECTION_ID || 'shifts';

if (!endpoint || !projectId || !apiKey || !databaseId) {
  throw new Error('Missing APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_API_KEY, or APPWRITE_DATABASE_ID');
}

const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
const databases = new Databases(client);

type FieldMap = Record<string, string>;

const complianceFieldMap: FieldMap = {
  staff_id: 'staffId',
  template_key: 'templateKey',
  form_data: 'formData',
  created_at: 'createdAt',
  submitted_at: 'submittedAt',
  approved_at: 'approvedAt',
  approved_by: 'approvedBy',
  rejection_reason: 'rejectionReason',
};

const schedulingFieldMap: FieldMap = {
  shift_id: 'shiftId',
  site_id: 'siteId',
  start_time: 'startTime',
  end_time: 'endTime',
  staff_id: 'staffId',
  created_at: 'createdAt',
  updated_at: 'updatedAt',
  shift_date: 'startTime',
  date: 'startTime',
};

const normalizeToISO = (value: unknown) => {
  if (typeof value !== 'string' || !value) return value;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toISOString();
};

async function migrateCollection(collectionId: string, fieldMap: FieldMap) {
  let total = 0;
  let updated = 0;
  let cursor: string | null = null;

  do {
    const queries = [Query.limit(100)];
    if (cursor) queries.push(Query.cursorAfter(cursor));

    const response = await databases.listDocuments(databaseId, collectionId, queries);
    if (response.documents.length === 0) break;

    for (const doc of response.documents) {
      total += 1;
      const patch: Record<string, unknown> = {};
      let shouldUpdate = false;

      for (const [legacyField, nextField] of Object.entries(fieldMap)) {
        if (!(legacyField in doc)) continue;
        if (doc[legacyField] === undefined) continue;

        let value = doc[legacyField];
        if (nextField === 'startTime' || nextField === 'endTime' || nextField === 'createdAt' || nextField === 'updatedAt' || nextField === 'submittedAt' || nextField === 'approvedAt') {
          value = normalizeToISO(value);
        }

        patch[nextField] = value;
        patch[legacyField] = null;
        shouldUpdate = true;
      }

      if (shouldUpdate) {
        await databases.updateDocument(databaseId, collectionId, doc.$id, patch);
        updated += 1;
      }
    }

    cursor = response.documents[response.documents.length - 1].$id;
  } while (cursor);

  return { collectionId, total, updated };
}

async function run() {
  const compliance = await migrateCollection(complianceCollectionId, complianceFieldMap);
  const scheduling = await migrateCollection(schedulingCollectionId, schedulingFieldMap);

  console.log('Migration complete');
  console.table([compliance, scheduling]);
}

run().catch((error) => {
  console.error('Migration failed', error);
  process.exit(1);
});
