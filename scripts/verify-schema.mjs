import dotenv from 'dotenv';
import { Client, Databases } from 'node-appwrite';

dotenv.config({ path: '.env.production' });

const requiredCollectionEnv = [
  'VITE_APPWRITE_AUDIT_LOGS_COLLECTION_ID',
  'VITE_APPWRITE_RECURRING_PATTERNS_COLLECTION_ID',
  'VITE_APPWRITE_COMPLIANCE_UPLOADS_COLLECTION_ID',
  'VITE_APPWRITE_STAFF_INVITES_COLLECTION_ID',
  'VITE_APPWRITE_DOCUMENT_TEMPLATES_COLLECTION_ID',
  'VITE_APPWRITE_COMPLIANCE_SUBMISSIONS_COLLECTION_ID',
  'VITE_APPWRITE_DOCUMENT_INSTANCES_COLLECTION_ID',
];

const missingEnv = requiredCollectionEnv.filter((k) => !process.env[k]);
if (missingEnv.length) {
  console.error('Schema verification failed: missing required env keys:\n' + missingEnv.join('\n'));
  process.exit(1);
}

const endpoint = process.env.VITE_APPWRITE_ENDPOINT;
const projectId = process.env.VITE_APPWRITE_PROJECT_ID;
const databaseId = process.env.VITE_APPWRITE_DATABASE_ID;
const apiKey = process.env.APPWRITE_API_KEY;

if (!apiKey) {
  console.warn('verify-schema warning: APPWRITE_API_KEY not set, skipping remote collection existence check.');
  process.exit(0);
}

const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
const databases = new Databases(client);
const collections = await databases.listCollections(databaseId);
const existing = new Set(collections.collections.map((c) => c.$id));
const expected = requiredCollectionEnv.map((key) => process.env[key]);
const missingCollections = expected.filter((id) => !existing.has(id));

if (missingCollections.length) {
  console.error('Missing Appwrite collections:\n' + missingCollections.join('\n'));
  process.exit(1);
}

console.log('verify-schema passed.');
