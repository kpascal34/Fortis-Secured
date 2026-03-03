#!/usr/bin/env node

import { Query, ID } from 'node-appwrite';
import {
  loadDotenv,
  parseArgs,
  resolveBaseEnv,
  requireEnv,
  createDatabasesClient,
  listAllDocuments,
} from './lib/engine-utils.mjs';

loadDotenv();
const { dryRun } = parseArgs();

const env = {
  ...resolveBaseEnv(),
  legalEntitiesCollectionId:
    process.env.APPWRITE_LEGAL_ENTITIES_COLLECTION_ID ||
    process.env.VITE_APPWRITE_LEGAL_ENTITIES_COLLECTION_ID ||
    'legal_entities',
  clientsCollectionId:
    process.env.APPWRITE_CLIENTS_COLLECTION_ID ||
    process.env.VITE_APPWRITE_CLIENTS_COLLECTION_ID ||
    'clients',
  sitesCollectionId:
    process.env.APPWRITE_SITES_COLLECTION_ID ||
    process.env.VITE_APPWRITE_SITES_COLLECTION_ID ||
    'sites',
  contractsCollectionId:
    process.env.APPWRITE_CONTRACTS_COLLECTION_ID ||
    process.env.VITE_APPWRITE_CONTRACTS_COLLECTION_ID ||
    'contracts',
  billingExportsCollectionId:
    process.env.APPWRITE_BILLING_EXPORTS_COLLECTION_ID ||
    process.env.VITE_APPWRITE_BILLING_EXPORTS_COLLECTION_ID ||
    'billing_exports',
  payrollExportsCollectionId:
    process.env.APPWRITE_PAYROLL_EXPORTS_COLLECTION_ID ||
    process.env.VITE_APPWRITE_PAYROLL_EXPORTS_COLLECTION_ID ||
    'payroll_exports',
  profitSnapshotsCollectionId:
    process.env.APPWRITE_PROFIT_SNAPSHOTS_COLLECTION_ID ||
    process.env.VITE_APPWRITE_PROFIT_SNAPSHOTS_COLLECTION_ID ||
    'profit_snapshots',
  financeEventsCollectionId:
    process.env.APPWRITE_FINANCE_EVENTS_COLLECTION_ID ||
    process.env.VITE_APPWRITE_FINANCE_EVENTS_COLLECTION_ID ||
    'finance_events',
};

requireEnv(env, ['endpoint', 'projectId', 'apiKey', 'databaseId'], 'migrate-entityId');

const databases = createDatabasesClient(env);

const summary = {
  dryRun,
  defaultEntityId: null,
  entitiesCreated: 0,
  updated: {
    clients: 0,
    sites: 0,
    contracts: 0,
    billing_exports: 0,
    payroll_exports: 0,
    profit_snapshots: 0,
    finance_events: 0,
  },
};

const listCollectionAttributes = async (collectionId) => {
  const response = await databases.listAttributes(env.databaseId, collectionId, [Query.limit(200)]);
  return new Map(
    (response?.attributes || []).map((attribute) => [String(attribute.key), String(attribute.type || '')]),
  );
};

const pickKnownAttributes = (payload, knownAttributes) =>
  Object.fromEntries(Object.entries(payload).filter(([key]) => knownAttributes.has(key)));

const tryEncryptBankDetails = async (value) => {
  try {
    const { maybeEncryptJson } = await import('../src/server/security/encryption.js');
    return maybeEncryptJson(value);
  } catch (_) {
    return value;
  }
};

const ensureDefaultEntity = async () => {
  const knownAttributes = await listCollectionAttributes(env.legalEntitiesCollectionId);
  const entities = await listAllDocuments(databases, env.databaseId, env.legalEntitiesCollectionId, [
    Query.limit(50),
    Query.orderAsc('createdAt'),
  ]);

  if (entities.length > 0) {
    return entities[0];
  }

  const payload = pickKnownAttributes({
    name: 'Fortis Default Entity',
    entityType: 'operating',
    registrationNumber: null,
    taxNumber: null,
    bankDetails: await tryEncryptBankDetails({ placeholder: true }),
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }, knownAttributes);

  if (knownAttributes.get('bankDetails') === 'string' && payload.bankDetails && typeof payload.bankDetails !== 'string') {
    payload.bankDetails = JSON.stringify(payload.bankDetails);
  }

  if (dryRun) {
    summary.entitiesCreated += 1;
    return { $id: 'dry-default-entity', ...payload };
  }

  const created = await databases.createDocument(
    env.databaseId,
    env.legalEntitiesCollectionId,
    ID.unique(),
    payload,
  );
  summary.entitiesCreated += 1;
  return created;
};

const buildClientEntityMap = async (defaultEntityId) => {
  const clients = await listAllDocuments(databases, env.databaseId, env.clientsCollectionId);
  const map = new Map();
  for (const client of clients) {
    map.set(String(client.$id), String(client.entityId || defaultEntityId));
  }
  return map;
};

const migrateCollection = async ({
  collectionId,
  key,
  resolveEntity,
}) => {
  const docs = await listAllDocuments(databases, env.databaseId, collectionId);

  for (const doc of docs) {
    if (doc.entityId) continue;

    const nextEntityId = resolveEntity(doc);
    if (!nextEntityId) continue;

    if (!dryRun) {
      await databases.updateDocument(env.databaseId, collectionId, doc.$id, {
        entityId: String(nextEntityId),
      });
    }

    summary.updated[key] += 1;
  }
};

(async () => {
  const defaultEntity = await ensureDefaultEntity();
  summary.defaultEntityId = defaultEntity.$id;

  const defaultEntityId = String(defaultEntity.$id);
  const clientEntityMap = await buildClientEntityMap(defaultEntityId);

  await migrateCollection({
    collectionId: env.clientsCollectionId,
    key: 'clients',
    resolveEntity: () => defaultEntityId,
  });

  await migrateCollection({
    collectionId: env.sitesCollectionId,
    key: 'sites',
    resolveEntity: (doc) => clientEntityMap.get(String(doc.clientId || '')) || defaultEntityId,
  });

  await migrateCollection({
    collectionId: env.contractsCollectionId,
    key: 'contracts',
    resolveEntity: (doc) => clientEntityMap.get(String(doc.clientId || '')) || defaultEntityId,
  });

  await migrateCollection({
    collectionId: env.billingExportsCollectionId,
    key: 'billing_exports',
    resolveEntity: () => defaultEntityId,
  });

  await migrateCollection({
    collectionId: env.payrollExportsCollectionId,
    key: 'payroll_exports',
    resolveEntity: () => defaultEntityId,
  });

  await migrateCollection({
    collectionId: env.profitSnapshotsCollectionId,
    key: 'profit_snapshots',
    resolveEntity: () => defaultEntityId,
  });

  await migrateCollection({
    collectionId: env.financeEventsCollectionId,
    key: 'finance_events',
    resolveEntity: () => defaultEntityId,
  });

  console.log('Entity migration summary');
  console.table([summary]);

  if (dryRun) {
    console.log('Dry-run complete (no writes).');
  }
})().catch((error) => {
  console.error('migrate-entityId failed:', error);
  process.exit(1);
});
