import { Client, Databases, Permission, Role } from 'node-appwrite';

// Read required environment variables
const endpoint = process.env.APPWRITE_ENDPOINT || process.env.VITE_APPWRITE_ENDPOINT;
const projectId = process.env.APPWRITE_PROJECT_ID || process.env.VITE_APPWRITE_PROJECT_ID;
const apiKey = process.env.APPWRITE_API_KEY;
const databaseId = process.env.VITE_APPWRITE_DATABASE_ID;
const tasksCollectionId = process.env.VITE_APPWRITE_TASKS_COLLECTION_ID || 'tasks';

if (!endpoint || !projectId || !apiKey || !databaseId) {
  console.error('Missing required env vars. Please set:');
  console.error('  APPWRITE_ENDPOINT or VITE_APPWRITE_ENDPOINT');
  console.error('  APPWRITE_PROJECT_ID or VITE_APPWRITE_PROJECT_ID');
  console.error('  APPWRITE_API_KEY');
  console.error('  VITE_APPWRITE_DATABASE_ID');
  process.exit(1);
}

const client = new Client()
  .setEndpoint(endpoint)
  .setProject(projectId)
  .setKey(apiKey);

const databases = new Databases(client);

async function ensureTasksCollection() {
  console.log(`Using database: ${databaseId}`);
  console.log(`Ensuring collection: ${tasksCollectionId}`);
  let exists = false;

  try {
    await databases.getCollection(databaseId, tasksCollectionId);
    exists = true;
    console.log('Collection already exists. Proceeding to ensure attributes and indexes...');
  } catch (_) {
    // Create collection with default permissions: read for users, write for users
    const permissions = [
      Permission.read(Role.users()),
      Permission.create(Role.users()),
      Permission.update(Role.users()),
    ];
    await databases.createCollection(databaseId, tasksCollectionId, tasksCollectionId, permissions);
    console.log('Collection created.');
  }

  // Create attributes (ignore errors if they already exist)
  const safe = async (fn, desc) => {
    try {
      await fn();
      console.log(`✓ ${desc}`);
    } catch (err) {
      if (String(err).includes('already exists')) {
        console.log(`• ${desc} already exists`);
      } else {
        console.warn(`! ${desc} failed:`, err.message || err);
      }
    }
  };

  // Core task fields
  await safe(() => databases.createStringAttribute(databaseId, tasksCollectionId, 'title', 200, true), 'title attribute');
  await safe(() => databases.createStringAttribute(databaseId, tasksCollectionId, 'description', 8192, false), 'description attribute');
  await safe(() => databases.createEnumAttribute(databaseId, tasksCollectionId, 'priority', ['low','medium','high'], false), 'priority enum');
  await safe(() => databases.createEnumAttribute(databaseId, tasksCollectionId, 'status', ['pending','in-progress','completed'], false), 'status enum');
  await safe(() => databases.createStringAttribute(databaseId, tasksCollectionId, 'assignedTo', 64, false), 'assignedTo attribute');
  await safe(() => databases.createStringAttribute(databaseId, tasksCollectionId, 'clientId', 64, false), 'clientId attribute');
  await safe(() => databases.createStringAttribute(databaseId, tasksCollectionId, 'siteId', 64, false), 'siteId attribute');
  await safe(() => databases.createStringAttribute(databaseId, tasksCollectionId, 'shiftId', 64, false), 'shiftId attribute');
  await safe(() => databases.createDatetimeAttribute(databaseId, tasksCollectionId, 'dueDate', false), 'dueDate attribute');
  await safe(() => databases.createStringAttribute(databaseId, tasksCollectionId, 'dueTime', 10, false), 'dueTime attribute');
  await safe(() => databases.createEnumAttribute(databaseId, tasksCollectionId, 'taskType', ['general','incident','shift','compliance'], false), 'taskType enum');
  await safe(() => databases.createStringAttribute(databaseId, tasksCollectionId, 'notes', 4096, false), 'notes attribute');
  await safe(() => databases.createDatetimeAttribute(databaseId, tasksCollectionId, 'createdAt', false), 'createdAt attribute');
  await safe(() => databases.createDatetimeAttribute(databaseId, tasksCollectionId, 'updatedAt', false), 'updatedAt attribute');

  // Indexes
  await safe(() => databases.createIndex(databaseId, tasksCollectionId, 'status_index', 'key', ['status'], ['ASC']), 'status index');
  await safe(() => databases.createIndex(databaseId, tasksCollectionId, 'priority_index', 'key', ['priority'], ['ASC']), 'priority index');
  await safe(() => databases.createIndex(databaseId, tasksCollectionId, 'assigned_index', 'key', ['assignedTo'], ['ASC']), 'assignedTo index');
  await safe(() => databases.createIndex(databaseId, tasksCollectionId, 'due_index', 'key', ['dueDate'], ['ASC']), 'dueDate index');
  await safe(() => databases.createIndex(databaseId, tasksCollectionId, 'updated_index', 'key', ['updatedAt'], ['DESC']), 'updatedAt index');

  console.log('Tasks collection setup complete.');
}

ensureTasksCollection().catch((err) => {
  console.error('Setup failed:', err);
  process.exit(1);
});
