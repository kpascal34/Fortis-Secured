import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import dotenv from 'dotenv';
import { Client, Databases, ID, Query } from 'node-appwrite';

export { ID, Query };

export const PAGE_SIZE = 100;
export const DAY_MS = 24 * 60 * 60 * 1000;

export const EVENT_TYPES = Object.freeze({
  MARGIN_ALERT_CREATED: 'marginAlertCreated',
  SECURITY_EVENT_CREATED: 'securityEventCreated',
});

export function loadDotenv() {
  const files = ['.env.local', '.env.production', '.env.development', '.env'];
  for (const file of files) {
    const fullPath = path.resolve(process.cwd(), file);
    if (fs.existsSync(fullPath)) {
      dotenv.config({ path: fullPath, override: false });
    }
  }
}

export function readEnv(key, fallback = '') {
  const value = process.env[key];
  if (value === undefined || value === null || value === '') return fallback;
  return String(value);
}

export function parseArgs(argv = process.argv.slice(2)) {
  const flags = new Set(argv);
  return {
    dryRun: flags.has('--dry-run'),
    simulateChecks: flags.has('--simulate-checks'),
  };
}

export function resolveBaseEnv() {
  return {
    endpoint: readEnv('APPWRITE_ENDPOINT', readEnv('VITE_APPWRITE_ENDPOINT')),
    projectId: readEnv('APPWRITE_PROJECT_ID', readEnv('VITE_APPWRITE_PROJECT_ID')),
    apiKey: readEnv('APPWRITE_API_KEY'),
    databaseId: readEnv('APPWRITE_DATABASE_ID', readEnv('VITE_APPWRITE_DATABASE_ID')),
    auditLogsCollectionId: readEnv('APPWRITE_AUDIT_LOGS_COLLECTION_ID', readEnv('VITE_APPWRITE_AUDIT_LOGS_COLLECTION_ID', 'audit_logs')),
    notificationOutboxCollectionId: readEnv(
      'APPWRITE_NOTIFICATION_OUTBOX_COLLECTION_ID',
      readEnv('VITE_APPWRITE_NOTIFICATION_OUTBOX_COLLECTION_ID', 'notification_outbox'),
    ),
    opsEmail: readEnv('OPS_EMAIL', readEnv('VITE_OPS_EMAIL')),
  };
}

export function requireEnv(env, requiredKeys, label = 'script') {
  const missing = requiredKeys.filter((key) => !env[key]);
  if (missing.length === 0) return;

  console.error(`Missing required environment variables for ${label}:`);
  for (const key of missing) console.error(`- ${key}`);
  process.exit(1);
}

export function createDatabasesClient(env) {
  const client = new Client()
    .setEndpoint(env.endpoint)
    .setProject(env.projectId)
    .setKey(env.apiKey);

  return new Databases(client);
}

export async function listAllDocuments(databases, databaseId, collectionId, baseQueries = []) {
  const all = [];
  let offset = 0;

  while (true) {
    const response = await databases.listDocuments(databaseId, collectionId, [
      ...baseQueries,
      Query.limit(PAGE_SIZE),
      Query.offset(offset),
    ]);

    const docs = response?.documents || [];
    all.push(...docs);

    if (docs.length < PAGE_SIZE) break;
    if (Number.isFinite(response?.total) && all.length >= response.total) break;

    offset += PAGE_SIZE;
  }

  return all;
}

export function asIso(value, field = 'date') {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid ${field}: ${value}`);
  }
  return date.toISOString();
}

export function resolvePeriod({ periodStart = null, periodEnd = null, defaultDays = 30 } = {}) {
  if (periodStart && periodEnd) {
    const start = asIso(periodStart, 'periodStart');
    const end = asIso(periodEnd, 'periodEnd');
    if (new Date(end).getTime() <= new Date(start).getTime()) {
      throw new Error('periodEnd must be after periodStart.');
    }
    return { start, end };
  }

  const now = new Date();
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
  const start = new Date(end.getTime() - Math.max(1, Number(defaultDays || 30)) * DAY_MS + 1);

  return { start: start.toISOString(), end: end.toISOString() };
}

export function startOfUtcDayIso(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0)).toISOString();
}

export function endOfUtcDayIso(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999)).toISOString();
}

export function average(values = []) {
  const safe = values.filter((value) => Number.isFinite(Number(value))).map(Number);
  if (!safe.length) return 0;
  return safe.reduce((sum, value) => sum + value, 0) / safe.length;
}

export function clamp01(value) {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.min(1, numeric));
}

export async function createAuditLog(
  databases,
  env,
  {
    actorId,
    action,
    resourceType,
    resourceId = null,
    entityId = null,
    clientId = null,
    siteId = null,
    metadata = {},
  },
  dryRun = false,
) {
  const payload = {
    actorId,
    action,
    resourceType,
    entity: resourceType,
    entityId: resourceId,
    clientId,
    siteId,
    metadataJson: JSON.stringify({
      entityId,
      ...metadata,
    }),
    createdAt: new Date().toISOString(),
  };

  if (dryRun) return { $id: `dry-audit-${Date.now()}`, ...payload };
  return databases.createDocument(env.databaseId, env.auditLogsCollectionId, ID.unique(), payload);
}

export async function enqueueOutbox(
  databases,
  env,
  {
    eventType,
    toEmail,
    subject,
    payload = {},
    clientId = null,
    siteId = null,
    userId = null,
  },
  dryRun = false,
) {
  if (!toEmail) return null;

  const document = {
    eventType,
    toEmail,
    subject,
    payload,
    status: 'pending',
    attempts: 0,
    lastError: null,
    clientId,
    siteId,
    userId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (dryRun) return { $id: `dry-outbox-${Date.now()}`, ...document };

  return databases.createDocument(
    env.databaseId,
    env.notificationOutboxCollectionId,
    ID.unique(),
    document,
  );
}

export function parseMaybeJson(value, fallback = null) {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'object') return value;

  try {
    return JSON.parse(String(value));
  } catch (_) {
    return fallback;
  }
}

export function parseMaybeCsv(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function runSimulatedAssertions(assertions = []) {
  const failures = assertions.filter((item) => !item.pass);
  if (failures.length > 0) {
    const msg = failures.map((item) => item.message).join('\n');
    throw new Error(`Simulation checks failed:\n${msg}`);
  }

  console.log(`Simulation checks passed (${assertions.length}).`);
}
