#!/usr/bin/env node
import { Client, Databases, ID, Permission, Role } from 'node-appwrite';
import dotenv from 'dotenv';

dotenv.config();

const endpoint = process.env.VITE_APPWRITE_ENDPOINT;
const project = process.env.VITE_APPWRITE_PROJECT_ID;
const apiKey = process.env.APPWRITE_API_KEY;
const databaseId = process.env.VITE_APPWRITE_DATABASE_ID;

if (!endpoint || !project || !apiKey || !databaseId) {
  console.error('Missing Appwrite environment values. Required: VITE_APPWRITE_ENDPOINT, VITE_APPWRITE_PROJECT_ID, VITE_APPWRITE_DATABASE_ID, APPWRITE_API_KEY');
  process.exit(1);
}

const client = new Client().setEndpoint(endpoint).setProject(project).setKey(apiKey);
const databases = new Databases(client);

const hrCollections = [
  {
    id: process.env.VITE_APPWRITE_STAFF_LEAVE_COLLECTION_ID || 'staff_leave',
    name: 'Staff Leave',
    permissions: [Permission.read(Role.users()), Permission.create(Role.users()), Permission.update(Role.team('managers')), Permission.update(Role.team('admins'))],
    attributes: [
      ['string', 'staffId', 128, true],
      ['string', 'staffName', 255, true],
      ['enum', 'leaveType', ['annual', 'sick', 'personal', 'maternity', 'paternity', 'unpaid', 'emergency'], true],
      ['datetime', 'startDate', true],
      ['datetime', 'endDate', true],
      ['string', 'reason', 4000, true],
      ['enum', 'status', ['pending', 'approved', 'rejected'], true, 'pending'],
      ['datetime', 'requestedAt', true],
      ['datetime', 'approvedAt', false],
      ['string', 'approvedBy', 128, false],
    ],
  },
  {
    id: process.env.VITE_APPWRITE_STAFF_TRAINING_COLLECTION_ID || 'staff_training',
    name: 'Staff Training',
    permissions: [Permission.read(Role.users()), Permission.create(Role.team('managers')), Permission.create(Role.team('admins'))],
    attributes: [
      ['string', 'trainingName', 255, true],
      ['string', 'description', 4000, false],
      ['datetime', 'startDate', true],
      ['datetime', 'endDate', true],
      ['string', 'duration', 64, false],
      ['string', 'location', 255, false],
      ['string', 'trainer', 255, false],
      ['enum', 'category', ['security', 'compliance', 'first_aid', 'fire_safety', 'customer_service', 'conflict_resolution', 'leadership', 'technical', 'other'], true, 'security'],
      ['enum', 'status', ['scheduled', 'in_progress', 'completed', 'cancelled'], true, 'scheduled'],
      ['integer', 'maxParticipants', false],
      ['string', 'participants', 15000, false],
      ['integer', 'participantCount', false],
    ],
  },
  {
    id: process.env.VITE_APPWRITE_COMPLIANCE_UPLOADS_COLLECTION_ID || 'compliance_uploads',
    name: 'Compliance Uploads',
    permissions: [Permission.read(Role.users()), Permission.create(Role.users())],
    attributes: [
      ['string', 'documentName', 255, true],
      ['enum', 'documentType', ['compliance', 'certificate', 'license', 'policy', 'contract', 'training', 'id', 'other'], true, 'compliance'],
      ['string', 'description', 4000, false],
      ['string', 'fileId', 128, true],
      ['string', 'fileName', 255, true],
      ['integer', 'fileSize', true],
      ['string', 'fileType', 128, true],
      ['string', 'fileUrl', 2000, true],
      ['string', 'uploadedBy', 128, true],
      ['string', 'uploadedByName', 255, true],
      ['string', 'relatedStaffId', 128, false],
      ['enum', 'status', ['pending', 'approved', 'rejected'], true, 'pending'],
      ['datetime', 'reviewedAt', false],
      ['datetime', 'uploadedAt', true],
    ],
  },
];

const exists = async (id) => {
  try {
    await databases.getCollection(databaseId, id);
    return true;
  } catch (error) {
    if (error.code === 404) return false;
    throw error;
  }
};

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const ensureAttribute = async (collectionId, attr) => {
  const [kind, key] = attr;
  try {
    if (kind === 'string') await databases.createStringAttribute(databaseId, collectionId, key, attr[2], attr[3], attr[4]);
    if (kind === 'enum') await databases.createEnumAttribute(databaseId, collectionId, key, attr[2], attr[3], attr[4]);
    if (kind === 'datetime') await databases.createDatetimeAttribute(databaseId, collectionId, key, attr[2], attr[3]);
    if (kind === 'integer') await databases.createIntegerAttribute(databaseId, collectionId, key, false, attr[2], undefined, attr[3]);
    console.log(`  ✓ ${key}`);
  } catch (error) {
    if (error.code === 409) {
      console.log(`  • ${key} already exists`);
      return;
    }
    throw error;
  }
};

for (const collection of hrCollections) {
  const alreadyExists = await exists(collection.id);
  if (!alreadyExists) {
    await databases.createCollection(databaseId, collection.id, collection.name, collection.permissions);
    console.log(`Created collection ${collection.id}`);
    await wait(500);
  } else {
    console.log(`Collection ${collection.id} already exists`);
  }

  console.log(`Ensuring attributes for ${collection.id}`);
  for (const attr of collection.attributes) {
    await ensureAttribute(collection.id, attr);
  }
}

console.log('\nHR workflows collections are configured.');
