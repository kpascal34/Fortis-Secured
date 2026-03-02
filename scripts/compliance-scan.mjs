#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import dotenv from 'dotenv';
import { Client, Databases, ID, Query } from 'node-appwrite';
import { renderEmailTemplate } from '../src/emails/templates/index.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_WARN_DAYS = [30, 14, 7];
const DEFAULT_ESCALATION_DAYS = 7;

const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');

const EXPIRY_FIELDS = {
  sia: ['siaExpiryDate'],
  id: ['licenseExpiry', 'licenseExpiryDate'],
  right_to_work: ['rightToWorkExpiry', 'rightToWorkExpiryDate'],
  dbs: ['dbsExpiryDate'],
  other: ['otherExpiryDate'],
};

loadDotenv();

const env = {
  endpoint: process.env.APPWRITE_ENDPOINT || process.env.VITE_APPWRITE_ENDPOINT,
  projectId: process.env.APPWRITE_PROJECT_ID || process.env.VITE_APPWRITE_PROJECT_ID,
  apiKey: process.env.APPWRITE_API_KEY,
  databaseId: process.env.APPWRITE_DATABASE_ID || process.env.VITE_APPWRITE_DATABASE_ID,
  staffProfilesCollectionId:
    process.env.APPWRITE_STAFF_PROFILES_COLLECTION_ID ||
    process.env.VITE_APPWRITE_STAFF_PROFILES_COLLECTION_ID ||
    'staff_profiles',
  complianceRulesCollectionId:
    process.env.APPWRITE_COMPLIANCE_RULES_COLLECTION_ID ||
    process.env.VITE_APPWRITE_COMPLIANCE_RULES_COLLECTION_ID ||
    'compliance_rules',
  complianceFlagsCollectionId:
    process.env.APPWRITE_COMPLIANCE_FLAGS_COLLECTION_ID ||
    process.env.VITE_APPWRITE_COMPLIANCE_FLAGS_COLLECTION_ID ||
    'compliance_flags',
  notificationOutboxCollectionId:
    process.env.APPWRITE_NOTIFICATION_OUTBOX_COLLECTION_ID ||
    process.env.VITE_APPWRITE_NOTIFICATION_OUTBOX_COLLECTION_ID ||
    'notification_outbox',
  opsEmail: process.env.OPS_EMAIL || process.env.VITE_OPS_EMAIL || '',
  appUrl: process.env.APP_URL || process.env.VITE_PUBLIC_BASE_URL || '',
};

validateEnv(env);

const client = new Client().setEndpoint(env.endpoint).setProject(env.projectId).setKey(env.apiKey);
const databases = new Databases(client);

const summary = {
  dryRun,
  scannedProfiles: 0,
  createdFlags: 0,
  updatedFlags: 0,
  resolvedFlags: 0,
  queuedWarnings: 0,
  queuedEscalations: 0,
  skippedNotifications: 0,
};

(async () => {
  const rules = await loadRules();
  const profiles = await listAllDocuments(env.staffProfilesCollectionId);

  summary.scannedProfiles = profiles.length;

  for (const profile of profiles) {
    const guardId = profile.userId || profile.$id;
    if (!guardId) continue;

    for (const rule of rules) {
      const expiryDate = getExpiryDateForType(profile, rule.type);
      if (!expiryDate) continue;

      const remaining = daysUntil(expiryDate, new Date());
      const severity = chooseSeverity(remaining, rule.warnDays);

      if (!severity) {
        const resolved = await resolveFlagIfOpen({ guardId, type: rule.type });
        if (resolved) summary.resolvedFlags += 1;
        continue;
      }

      const existing = await findOpenFlag(guardId, rule.type);
      const payload = {
        guardId,
        clientId: profile.clientId || null,
        siteId: profile.siteId || null,
        type: rule.type,
        severity,
        dueAt: expiryDate.toISOString(),
        status: 'open',
        notes: severity === 'critical'
          ? `${rule.type} has expired.`
          : `${rule.type} expires in ${remaining} day(s).`,
        updatedAt: new Date().toISOString(),
      };

      let persisted = existing;

      if (!existing) {
        if (!dryRun) {
          persisted = await databases.createDocument(
            env.databaseId,
            env.complianceFlagsCollectionId,
            ID.unique(),
            {
              ...payload,
              lastNotifiedAt: null,
              createdAt: new Date().toISOString(),
            },
          );
        }
        summary.createdFlags += 1;
      } else {
        if (!dryRun) {
          persisted = await databases.updateDocument(
            env.databaseId,
            env.complianceFlagsCollectionId,
            existing.$id,
            payload,
          );
        }
        summary.updatedFlags += 1;
      }

      const warningThresholdHit = severity === 'warning' && rule.warnDays.includes(remaining);
      const critical = severity === 'critical';
      const overdueDays = critical ? Math.abs(remaining) : 0;
      const escalationDue = critical && overdueDays >= rule.escalationDays;

      if (!warningThresholdHit && !critical) {
        continue;
      }

      const canNotify = shouldNotify(persisted || existing, new Date());
      if (!canNotify) {
        summary.skippedNotifications += 1;
        continue;
      }

      if (!dryRun) {
        const staffName =
          profile.fullName ||
          [profile.firstName, profile.lastName].filter(Boolean).join(' ') ||
          guardId;

        if ((warningThresholdHit || critical) && profile.email) {
          await enqueueOutbox({
            eventType: 'complianceExpiryWarning',
            toEmail: profile.email,
            payload: {
              guardId,
              staffName,
              type: rule.type,
              dueAt: expiryDate.toISOString(),
              daysRemaining: remaining,
              appUrl: env.appUrl,
            },
            clientId: profile.clientId || null,
            siteId: profile.siteId || null,
            userId: guardId,
          });
          summary.queuedWarnings += 1;
        }

        if (escalationDue && env.opsEmail) {
          await enqueueOutbox({
            eventType: 'complianceEscalation',
            toEmail: env.opsEmail,
            payload: {
              guardId,
              staffName,
              type: rule.type,
              dueAt: expiryDate.toISOString(),
              overdueDays,
              appUrl: env.appUrl,
            },
            clientId: profile.clientId || null,
            siteId: profile.siteId || null,
            userId: guardId,
          });
          summary.queuedEscalations += 1;
        }

        if ((persisted || existing)?.$id) {
          await databases.updateDocument(
            env.databaseId,
            env.complianceFlagsCollectionId,
            (persisted || existing).$id,
            {
              lastNotifiedAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          );
        }
      }
    }
  }

  console.log('\nCompliance Scan Summary');
  console.table([summary]);

  if (dryRun) {
    console.log('Dry-run complete (no writes).');
  } else {
    console.log('Compliance scan complete.');
  }
})().catch((error) => {
  console.error('compliance-scan failed:', error);
  process.exit(1);
});

function loadDotenv() {
  const files = ['.env.local', '.env.production', '.env.development', '.env'];
  for (const file of files) {
    const fullPath = path.resolve(process.cwd(), file);
    if (fs.existsSync(fullPath)) {
      dotenv.config({ path: fullPath, override: false });
    }
  }
}

function validateEnv(envValues) {
  const missing = [];
  if (!envValues.endpoint) missing.push('APPWRITE_ENDPOINT');
  if (!envValues.projectId) missing.push('APPWRITE_PROJECT_ID');
  if (!envValues.apiKey) missing.push('APPWRITE_API_KEY');
  if (!envValues.databaseId) missing.push('APPWRITE_DATABASE_ID');

  if (missing.length > 0) {
    console.error('Missing required environment variables for compliance-scan:');
    for (const key of missing) {
      console.error(`- ${key}`);
    }
    process.exit(1);
  }
}

function parseWarnDays(value) {
  if (!value) return [...DEFAULT_WARN_DAYS];

  const toArray = (items) =>
    items
      .map((item) => Number(item))
      .filter((item) => Number.isFinite(item) && item > 0)
      .map((item) => Math.floor(item))
      .sort((a, b) => b - a);

  if (Array.isArray(value)) {
    const parsed = toArray(value);
    return parsed.length ? parsed : [...DEFAULT_WARN_DAYS];
  }

  if (typeof value === 'number') {
    const parsed = toArray([value]);
    return parsed.length ? parsed : [...DEFAULT_WARN_DAYS];
  }

  if (typeof value === 'string') {
    try {
      const parsedJson = JSON.parse(value);
      if (Array.isArray(parsedJson)) {
        const parsed = toArray(parsedJson);
        return parsed.length ? parsed : [...DEFAULT_WARN_DAYS];
      }
    } catch (_) {
      const parsed = toArray(value.split(',').map((item) => item.trim()));
      return parsed.length ? parsed : [...DEFAULT_WARN_DAYS];
    }
  }

  return [...DEFAULT_WARN_DAYS];
}

function parseEscalationDays(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_ESCALATION_DAYS;
  return Math.floor(parsed);
}

async function loadRules() {
  const response = await databases.listDocuments(env.databaseId, env.complianceRulesCollectionId, [
    Query.equal('enabled', true),
    Query.limit(100),
  ]);

  if (response.documents.length === 0) {
    return [
      { type: 'sia', warnDays: [...DEFAULT_WARN_DAYS], escalationDays: DEFAULT_ESCALATION_DAYS },
      { type: 'id', warnDays: [...DEFAULT_WARN_DAYS], escalationDays: DEFAULT_ESCALATION_DAYS },
      { type: 'right_to_work', warnDays: [...DEFAULT_WARN_DAYS], escalationDays: DEFAULT_ESCALATION_DAYS },
      { type: 'dbs', warnDays: [...DEFAULT_WARN_DAYS], escalationDays: DEFAULT_ESCALATION_DAYS },
    ];
  }

  return response.documents.map((rule) => ({
    ...rule,
    warnDays: parseWarnDays(rule.warnDays),
    escalationDays: parseEscalationDays(rule.escalationDays),
  }));
}

async function listAllDocuments(collectionId) {
  const all = [];
  let offset = 0;

  while (true) {
    const response = await databases.listDocuments(env.databaseId, collectionId, [
      Query.limit(100),
      Query.offset(offset),
    ]);

    all.push(...response.documents);

    if (response.documents.length < 100) break;
    if (response.total && all.length >= response.total) break;
    offset += 100;
  }

  return all;
}

function getExpiryDateForType(profile, type) {
  const fields = EXPIRY_FIELDS[type] || [];

  for (const field of fields) {
    const value = profile?.[field];
    if (!value) continue;
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date;
    }
  }

  return null;
}

function startOfUtcDay(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function daysUntil(dueAt, now) {
  const due = startOfUtcDay(dueAt);
  const current = startOfUtcDay(now);
  if (!due || !current) return null;
  return Math.floor((due.getTime() - current.getTime()) / DAY_MS);
}

function chooseSeverity(remainingDays, warnDays) {
  if (remainingDays === null) return null;
  if (remainingDays < 0) return 'critical';
  const maxWarn = Math.max(...warnDays);
  if (remainingDays <= maxWarn) return 'warning';
  return null;
}

function shouldNotify(flag, now) {
  if (!flag?.lastNotifiedAt) return true;
  const last = new Date(flag.lastNotifiedAt);
  if (Number.isNaN(last.getTime())) return true;
  return now.getTime() - last.getTime() >= DAY_MS;
}

async function findOpenFlag(guardId, type) {
  const response = await databases.listDocuments(env.databaseId, env.complianceFlagsCollectionId, [
    Query.equal('guardId', String(guardId)),
    Query.equal('type', String(type)),
    Query.equal('status', 'open'),
    Query.limit(1),
  ]);

  return response.documents[0] || null;
}

async function resolveFlagIfOpen({ guardId, type }) {
  const existing = await findOpenFlag(guardId, type);
  if (!existing) return null;

  if (!dryRun) {
    await databases.updateDocument(env.databaseId, env.complianceFlagsCollectionId, existing.$id, {
      status: 'resolved',
      updatedAt: new Date().toISOString(),
    });
  }

  return existing;
}

async function enqueueOutbox({ eventType, toEmail, payload, clientId, siteId, userId }) {
  const rendered = renderEmailTemplate({ eventType, payload });

  await databases.createDocument(env.databaseId, env.notificationOutboxCollectionId, ID.unique(), {
    eventType,
    toEmail,
    subject: rendered.subject,
    payload,
    status: 'pending',
    attempts: 0,
    lastError: null,
    clientId: clientId || null,
    siteId: siteId || null,
    userId: userId || null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}
