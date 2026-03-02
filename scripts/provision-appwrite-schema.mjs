#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import dotenv from 'dotenv';
import { Client, Databases } from 'node-appwrite';
import { COLLECTION_DEFINITIONS } from './schema/collections.js';

const PAGE_SIZE = 100;
const ATTRIBUTE_READY_TIMEOUT_MS = 5 * 60 * 1000;
const ATTRIBUTE_POLL_INTERVAL_MS = 1500;

const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const dangerMode = args.has('--danger');

if (dangerMode) {
  console.warn('[danger] --danger supplied. No destructive actions are implemented in this script.');
}

loadDotenv();

const env = resolveEnv();
validateEnv(env);

const client = new Client().setEndpoint(env.endpoint).setProject(env.projectId).setKey(env.apiKey);
const databases = new Databases(client);

const summary = {
  collections: { created: 0, skipped: 0, failed: 0 },
  attributes: { created: 0, skipped: 0, failed: 0 },
  indexes: { created: 0, skipped: 0, failed: 0 },
  failures: [],
};

(async () => {
  console.log(`Provisioning Appwrite schema for database ${env.databaseId}...`);
  if (dryRun) console.log('[dry-run] No write operations will be sent.');

  let existingCollections = await listAllCollections(databases, env.databaseId);
  const collectionMap = new Map(existingCollections.map((collection) => [collection.$id, collection]));

  for (const collectionSpec of COLLECTION_DEFINITIONS) {
    const context = `collection:${collectionSpec.collectionId}`;

    try {
      if (!collectionMap.has(collectionSpec.collectionId)) {
        if (dryRun) {
          summary.collections.created += 1;
          console.log(`[dry-run] create collection ${collectionSpec.collectionId}`);
        } else {
          try {
            await databases.createCollection(
              env.databaseId,
              collectionSpec.collectionId,
              collectionSpec.name,
              collectionSpec.permissions || [],
              collectionSpec.documentSecurity ?? true,
              collectionSpec.enabled ?? true
            );
            summary.collections.created += 1;
            console.log(`created collection ${collectionSpec.collectionId}`);
          } catch (error) {
            if (isConflictError(error)) {
              summary.collections.skipped += 1;
            } else {
              throw error;
            }
          }

          existingCollections = await listAllCollections(databases, env.databaseId);
          collectionMap.clear();
          for (const collection of existingCollections) collectionMap.set(collection.$id, collection);
        }
      } else {
        summary.collections.skipped += 1;
      }

      const attributes = await listAllAttributes(databases, env.databaseId, collectionSpec.collectionId);
      const existingAttributesByKey = new Map(attributes.map((attribute) => [attribute.key, attribute]));

      for (const attributeSpec of collectionSpec.attributes || []) {
        const existingAttribute = existingAttributesByKey.get(attributeSpec.key);

        if (!existingAttribute) {
          if (dryRun) {
            summary.attributes.created += 1;
            console.log(`[dry-run] create attribute ${collectionSpec.collectionId}.${attributeSpec.key}`);
            continue;
          }

          try {
            await createAttribute(databases, env.databaseId, collectionSpec.collectionId, attributeSpec);
            summary.attributes.created += 1;
            console.log(`created attribute ${collectionSpec.collectionId}.${attributeSpec.key}`);
          } catch (error) {
            if (isConflictError(error)) {
              summary.attributes.skipped += 1;
            } else {
              summary.attributes.failed += 1;
              pushFailure(summary, `${context} attribute:${attributeSpec.key}`, error);
            }
          }
          continue;
        }

        const typeCheck = isExpectedAttributeType(existingAttribute.type, attributeSpec.type);
        if (!typeCheck.ok) {
          summary.attributes.failed += 1;
          pushFailure(
            summary,
            `${context} attribute:${attributeSpec.key}`,
            new Error(`type mismatch: expected ${attributeSpec.type}, found ${existingAttribute.type}`)
          );
          continue;
        }

        summary.attributes.skipped += 1;
      }

      if (!dryRun) {
        await waitForAttributesAvailable(
          databases,
          env.databaseId,
          collectionSpec.collectionId,
          (collectionSpec.attributes || []).map((attribute) => attribute.key)
        );
      }

      const indexes = await listAllIndexes(databases, env.databaseId, collectionSpec.collectionId);
      const existingIndexesByKey = new Map(indexes.map((index) => [index.key, index]));

      for (const indexSpec of collectionSpec.indexes || []) {
        if (existingIndexesByKey.has(indexSpec.key)) {
          summary.indexes.skipped += 1;
          continue;
        }

        const isFulltext = String(indexSpec.type || '').toLowerCase() === 'fulltext';
        const orders = indexSpec.orders || indexSpec.attributes.map(() => 'asc');

        if (dryRun) {
          summary.indexes.created += 1;
          console.log(`[dry-run] create index ${collectionSpec.collectionId}.${indexSpec.key}`);
          continue;
        }

        try {
          await databases.createIndex(
            env.databaseId,
            collectionSpec.collectionId,
            indexSpec.key,
            indexSpec.type,
            indexSpec.attributes,
            isFulltext ? undefined : orders
          );
          summary.indexes.created += 1;
          console.log(`created index ${collectionSpec.collectionId}.${indexSpec.key}`);
        } catch (error) {
          if (isConflictError(error)) {
            summary.indexes.skipped += 1;
          } else {
            summary.indexes.failed += 1;
            pushFailure(summary, `${context} index:${indexSpec.key}`, error);
          }
        }
      }
    } catch (error) {
      summary.collections.failed += 1;
      pushFailure(summary, context, error);
    }
  }

  printSummary(summary);

  if (summary.failures.length > 0) {
    process.exit(1);
  }

  console.log('Schema provisioning completed successfully.');
})().catch((error) => {
  console.error('Schema provisioning crashed:', error);
  process.exit(1);
});

function loadDotenv() {
  const envFiles = ['.env.local', '.env.production', '.env.development', '.env'];
  for (const file of envFiles) {
    const fullPath = path.resolve(process.cwd(), file);
    if (fs.existsSync(fullPath)) {
      dotenv.config({ path: fullPath, override: false });
    }
  }
}

function resolveEnv() {
  return {
    endpoint: process.env.APPWRITE_ENDPOINT || process.env.VITE_APPWRITE_ENDPOINT,
    projectId: process.env.APPWRITE_PROJECT_ID || process.env.VITE_APPWRITE_PROJECT_ID,
    apiKey: process.env.APPWRITE_API_KEY,
    databaseId: process.env.APPWRITE_DATABASE_ID || process.env.VITE_APPWRITE_DATABASE_ID,
  };
}

function validateEnv(env) {
  const missing = [];
  if (!env.endpoint) missing.push('APPWRITE_ENDPOINT');
  if (!env.projectId) missing.push('APPWRITE_PROJECT_ID');
  if (!env.apiKey) missing.push('APPWRITE_API_KEY');
  if (!env.databaseId) missing.push('APPWRITE_DATABASE_ID');

  if (missing.length > 0) {
    console.error('Missing required environment variables for schema provisioning:');
    for (const key of missing) {
      console.error(`- ${key}`);
    }
    process.exit(1);
  }
}

async function listAllCollections(databases, databaseId) {
  return listAll((queries) => databases.listCollections(databaseId, queries), 'collections');
}

async function listAllAttributes(databases, databaseId, collectionId) {
  return listAll(
    (queries) => databases.listAttributes(databaseId, collectionId, queries),
    'attributes'
  );
}

async function listAllIndexes(databases, databaseId, collectionId) {
  return listAll((queries) => databases.listIndexes(databaseId, collectionId, queries), 'indexes');
}

async function listAll(fetchPage, key) {
  const items = [];
  let offset = 0;

  while (true) {
    const response = await fetchPage([`limit(${PAGE_SIZE})`, `offset(${offset})`]);
    const pageItems = response?.[key] || [];
    items.push(...pageItems);

    if (pageItems.length < PAGE_SIZE) break;
    if (typeof response?.total === 'number' && items.length >= response.total) break;

    offset += PAGE_SIZE;
  }

  return items;
}

async function createAttribute(databases, databaseId, collectionId, attribute) {
  const required = attribute.required ?? false;

  switch (attribute.type) {
    case 'string':
      return databases.createStringAttribute(
        databaseId,
        collectionId,
        attribute.key,
        attribute.size ?? 255,
        required,
        attribute.default,
        attribute.array ?? false,
        attribute.encrypt ?? false
      );

    case 'email':
      return databases.createEmailAttribute(
        databaseId,
        collectionId,
        attribute.key,
        required,
        attribute.default,
        attribute.array ?? false
      );

    case 'enum':
      return databases.createEnumAttribute(
        databaseId,
        collectionId,
        attribute.key,
        attribute.elements || [],
        required,
        attribute.default,
        attribute.array ?? false
      );

    case 'datetime':
      return databases.createDatetimeAttribute(
        databaseId,
        collectionId,
        attribute.key,
        required,
        attribute.default,
        attribute.array ?? false
      );

    case 'boolean':
      return databases.createBooleanAttribute(
        databaseId,
        collectionId,
        attribute.key,
        required,
        attribute.default,
        attribute.array ?? false
      );

    case 'float':
      return databases.createFloatAttribute(
        databaseId,
        collectionId,
        attribute.key,
        required,
        attribute.min,
        attribute.max,
        attribute.default,
        attribute.array ?? false
      );

    case 'integer':
      return databases.createIntegerAttribute(
        databaseId,
        collectionId,
        attribute.key,
        required,
        attribute.min,
        attribute.max,
        attribute.default,
        attribute.array ?? false
      );

    case 'json': {
      if (typeof databases.createJsonAttribute === 'function') {
        return databases.createJsonAttribute(
          databaseId,
          collectionId,
          attribute.key,
          required,
          attribute.default,
          attribute.array ?? false
        );
      }

      const jsonDefault =
        attribute.default === undefined || attribute.default === null
          ? attribute.default
          : JSON.stringify(attribute.default);

      return databases.createStringAttribute(
        databaseId,
        collectionId,
        attribute.key,
        attribute.size ?? 65535,
        required,
        jsonDefault,
        attribute.array ?? false,
        false
      );
    }

    default:
      throw new Error(`Unsupported attribute type: ${attribute.type}`);
  }
}

function isExpectedAttributeType(foundType, expectedType) {
  if (expectedType === 'json') {
    return { ok: foundType === 'json' || foundType === 'string' };
  }

  if (expectedType === 'float') {
    return { ok: foundType === 'float' || foundType === 'double' };
  }

  return { ok: foundType === expectedType };
}

async function waitForAttributesAvailable(databases, databaseId, collectionId, attributeKeys) {
  const pending = new Set(attributeKeys);
  const start = Date.now();

  while (pending.size > 0 && Date.now() - start < ATTRIBUTE_READY_TIMEOUT_MS) {
    const attributes = await listAllAttributes(databases, databaseId, collectionId);
    const byKey = new Map(attributes.map((attribute) => [attribute.key, attribute]));

    for (const key of [...pending]) {
      const attribute = byKey.get(key);
      if (!attribute) continue;

      const status = attribute.status || 'available';
      if (status === 'available') {
        pending.delete(key);
        continue;
      }

      if (status === 'failed' || status === 'stuck') {
        throw new Error(`attribute ${collectionId}.${key} is ${status}`);
      }
    }

    if (pending.size > 0) {
      await sleep(ATTRIBUTE_POLL_INTERVAL_MS);
    }
  }

  if (pending.size > 0) {
    throw new Error(
      `timed out waiting for attributes in ${collectionId}: ${Array.from(pending).join(', ')}`
    );
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function pushFailure(summary, scope, error) {
  const message = error?.message || String(error);
  summary.failures.push({ scope, message });
}

function isConflictError(error) {
  if (!error) return false;
  const code = Number(error.code);
  if (code === 409) return true;
  return String(error.message || '').toLowerCase().includes('already exists');
}

function printSummary(summary) {
  console.log('\nProvisioning summary:');
  console.table([
    { resource: 'collections', ...summary.collections },
    { resource: 'attributes', ...summary.attributes },
    { resource: 'indexes', ...summary.indexes },
  ]);

  if (summary.failures.length > 0) {
    console.error('Failures:');
    for (const failure of summary.failures) {
      console.error(`- ${failure.scope}: ${failure.message}`);
    }
  }
}
