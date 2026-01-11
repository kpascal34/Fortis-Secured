/*
  Update Appwrite audit_logs collection by adding optional attributes:
  - entityId (string)
  - ipAddress (string)
  - userAgent (string)
  Also adds an index on entityId and $createdAt for faster queries.

  Usage:
    1) Ensure env variables are set:
       APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_API_KEY, APPWRITE_DATABASE_ID
    2) Install SDK: npm install node-appwrite
    3) Run: node scripts/update-appwrite-audit-logs.js
*/

import { Client, Databases } from "node-appwrite";

function mask(val) {
  if (!val) return "<missing>";
  const s = String(val);
  if (s.length <= 8) return `${s[0]}***${s[s.length - 1]}`;
  return `${s.slice(0, 4)}***${s.slice(-4)}`;
}

function getEnv(name) {
  const val = process.env[name];
  if (!val) throw new Error(`Missing env: ${name}`);
  return val;
}

async function ensureStringAttribute(databases, databaseId, collectionId, key, size, required = false, defaultValue = undefined) {
  try {
    await databases.createStringAttribute(databaseId, collectionId, key, size, required, defaultValue);
    console.log(`+ Created string attribute: ${key}`);
  } catch (err) {
    const msg = (err && err.message) || String(err);
    if (msg.includes("attribute already exists") || msg.includes("Attribute already exists")) {
      console.log(`= Attribute exists: ${key}`);
    } else {
      console.warn(`! Skipping ${key}: ${msg}`);
    }
  }
}

async function ensureIndex(databases, databaseId, collectionId, indexId, type, keyAttributes) {
  try {
    await databases.createIndex(databaseId, collectionId, indexId, type, keyAttributes, []);
    console.log(`+ Created index: ${indexId} (${type}) on ${keyAttributes.join(", ")}`);
  } catch (err) {
    const msg = (err && err.message) || String(err);
    if (msg.includes("Index already exists") || msg.includes("index already exists")) {
      console.log(`= Index exists: ${indexId}`);
    } else {
      console.warn(`! Skipping index ${indexId}: ${msg}`);
    }
  }
}

async function run() {
  const endpoint = getEnv("APPWRITE_ENDPOINT");
  const projectId = getEnv("APPWRITE_PROJECT_ID");
  const apiKey = getEnv("APPWRITE_API_KEY");
  const databaseId = getEnv("APPWRITE_DATABASE_ID");
  const collectionId = process.env.VITE_APPWRITE_AUDIT_LOGS_COLLECTION_ID || "audit_logs";

  console.log("Appwrite environment summary:");
  console.log(`- Endpoint: ${endpoint}`);
  console.log(`- Project: ${projectId}`);
  console.log(`- API Key: ${mask(apiKey)}`);
  console.log(`- Database: ${databaseId}`);
  console.log(`- Collection: ${collectionId}`);

  const client = new Client()
    .setEndpoint(endpoint)
    .setProject(projectId)
    .setKey(apiKey);

  const databases = new Databases(client);

  // Preflight check: ensure database exists and project is correct
  try {
    await databases.listCollections(databaseId);
  } catch (err) {
    const msg = (err && err.message) || String(err);
    console.error("\nPreflight failed: cannot access database collections.");
    console.error(`Reason: ${msg}`);
    console.error("\nFix guidance:");
    console.error("- Verify APPWRITE_PROJECT_ID matches the Console → Settings → Project ID");
    console.error("- Ensure APPWRITE_ENDPOINT is correct (Appwrite Cloud: https://cloud.appwrite.io/v1)");
    console.error("- Confirm APPWRITE_API_KEY has Databases permissions");
    console.error("- Confirm APPWRITE_DATABASE_ID exists (Console → Databases → ID)");
    throw err;
  }

  console.log(`\nUpdating collection: ${databaseId}/${collectionId}`);

  // Add attributes
  await ensureStringAttribute(databases, databaseId, collectionId, "entityId", 255, true);
  await ensureStringAttribute(databases, databaseId, collectionId, "ipAddress", 45, false);
  await ensureStringAttribute(databases, databaseId, collectionId, "userAgent", 500, false);

  // Add helpful indexes
  await ensureIndex(databases, databaseId, collectionId, "entityId_idx", "key", ["entityId"]);
  await ensureIndex(databases, databaseId, collectionId, "createdAt_idx", "key", ["$createdAt"]);

  console.log("Done. If you imported CSV, these attributes will now be recognized.");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
