#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import dotenv from 'dotenv';
import { Client, Databases, Query } from 'node-appwrite';
import { COLLECTION_DEFINITIONS } from './schema/collections.js';

const PAGE_SIZE = 100;

loadDotenv();

const env = resolveEnv();
validateEnv(env);

const client = new Client().setEndpoint(env.endpoint).setProject(env.projectId).setKey(env.apiKey);
const databases = new Databases(client);

validateSchemaDefinitions(COLLECTION_DEFINITIONS);

(async () => {
  const issues = [];

  const existingCollections = await listAllCollections(databases, env.databaseId);
  const existingCollectionIds = new Set(existingCollections.map((collection) => collection.$id));

  for (const collectionSpec of COLLECTION_DEFINITIONS) {
    if (!existingCollectionIds.has(collectionSpec.collectionId)) {
      issues.push(`Missing collection: ${collectionSpec.collectionId}`);
      continue;
    }

    const attributes = await listAllAttributes(databases, env.databaseId, collectionSpec.collectionId);
    const attributesByKey = new Map(attributes.map((attribute) => [attribute.key, attribute]));

    for (const attributeSpec of collectionSpec.attributes || []) {
      const found = attributesByKey.get(attributeSpec.key);
      if (!found) {
        issues.push(
          `Missing attribute: ${collectionSpec.collectionId}.${attributeSpec.key} (${attributeSpec.type})`
        );
        continue;
      }

      const typeCheck = isExpectedAttributeType(found.type, attributeSpec.type);
      if (!typeCheck.ok) {
        issues.push(
          `Type mismatch: ${collectionSpec.collectionId}.${attributeSpec.key} expected ${attributeSpec.type}, found ${found.type}`
        );
      }

      if (found.status && found.status !== 'available') {
        issues.push(
          `Attribute not ready: ${collectionSpec.collectionId}.${attributeSpec.key} status=${found.status}`
        );
      }
    }

    const indexes = await listAllIndexes(databases, env.databaseId, collectionSpec.collectionId);
    const indexesByKey = new Map(indexes.map((index) => [index.key, index]));

    for (const indexSpec of collectionSpec.indexes || []) {
      const found = indexesByKey.get(indexSpec.key);
      if (!found) {
        issues.push(`Missing index: ${collectionSpec.collectionId}.${indexSpec.key}`);
        continue;
      }

      if ((found.type || '').toLowerCase() !== (indexSpec.type || '').toLowerCase()) {
        issues.push(
          `Index type mismatch: ${collectionSpec.collectionId}.${indexSpec.key} expected ${indexSpec.type}, found ${found.type}`
        );
      }

      if (!sameStringArray(found.attributes || [], indexSpec.attributes || [])) {
        issues.push(
          `Index attributes mismatch: ${collectionSpec.collectionId}.${indexSpec.key} expected [${(indexSpec.attributes || []).join(', ')}], found [${(found.attributes || []).join(', ')}]`
        );
      }

      const expectedOrders = (indexSpec.orders || indexSpec.attributes.map(() => 'asc')).map((item) =>
        String(item).toLowerCase()
      );
      const foundOrders = (found.orders || []).map((item) => String(item).toLowerCase());
      const isFulltext = String(indexSpec.type || '').toLowerCase() === 'fulltext';
      if (!isFulltext && expectedOrders.length > 0 && foundOrders.length > 0 && !sameStringArray(foundOrders, expectedOrders)) {
        issues.push(
          `Index orders mismatch: ${collectionSpec.collectionId}.${indexSpec.key} expected [${expectedOrders.join(', ')}], found [${foundOrders.join(', ')}]`
        );
      }
    }
  }

  if (issues.length > 0) {
    console.error('Schema verification failed with the following diff:');
    for (const issue of issues) {
      console.error(`- ${issue}`);
    }
    console.error('\nRun: npm run schema:provision');
    process.exit(1);
  }

  const summary = summarize(COLLECTION_DEFINITIONS);
  console.log('Schema verification passed.');
  console.table([
    {
      resource: 'schema',
      collections: summary.collections,
      attributes: summary.attributes,
      indexes: summary.indexes,
    },
  ]);
})().catch((error) => {
  console.error('Schema verification crashed:', error);
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
    console.error('Missing required environment variables for schema verification:');
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
    const response = await fetchPage([Query.limit(PAGE_SIZE), Query.offset(offset)]);
    const pageItems = response?.[key] || [];
    items.push(...pageItems);

    if (pageItems.length < PAGE_SIZE) break;
    if (typeof response?.total === 'number' && items.length >= response.total) break;

    offset += PAGE_SIZE;
  }

  return items;
}

function isExpectedAttributeType(foundType, expectedType) {
  if (expectedType === 'enum' || expectedType === 'email') {
    return { ok: foundType === expectedType || foundType === 'string' };
  }

  if (expectedType === 'json') {
    return { ok: foundType === 'json' || foundType === 'string' };
  }

  if (expectedType === 'float') {
    return { ok: foundType === 'float' || foundType === 'double' };
  }

  return { ok: foundType === expectedType };
}

function sameStringArray(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (String(a[i]) !== String(b[i])) return false;
  }
  return true;
}

function summarize(collections) {
  return collections.reduce(
    (acc, collection) => {
      acc.collections += 1;
      acc.attributes += collection.attributes?.length || 0;
      acc.indexes += collection.indexes?.length || 0;
      return acc;
    },
    { collections: 0, attributes: 0, indexes: 0 }
  );
}

function validateSchemaDefinitions(definitions) {
  const issues = [];

  for (const collection of definitions) {
    const attributesByKey = new Map((collection.attributes || []).map((attribute) => [attribute.key, attribute]));

    for (const index of collection.indexes || []) {
      if ((index.key || '').length > 36) {
        issues.push(
          `${collection.collectionId}.${index.key}: index key length ${(index.key || '').length} exceeds Appwrite limit 36`
        );
      }

      const arrayAttributes = (index.attributes || []).filter(
        (attributeKey) => attributesByKey.get(attributeKey)?.array === true
      );
      if (arrayAttributes.length > 0) {
        issues.push(
          `${collection.collectionId}.${index.key}: array attributes are not indexable (${arrayAttributes.join(', ')})`
        );
      }
    }
  }

  if (issues.length > 0) {
    console.error('Schema definition validation failed:');
    for (const issue of issues) {
      console.error(`- ${issue}`);
    }
    process.exit(1);
  }
}
