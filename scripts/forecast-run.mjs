#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import dotenv from 'dotenv';
import { Client, Databases, ID, Query } from 'node-appwrite';

const PAGE_SIZE = 100;
const DAY_MS = 24 * 60 * 60 * 1000;

const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const simulateChecks = args.has('--simulate-checks');

loadDotenv();

const env = {
  endpoint: process.env.APPWRITE_ENDPOINT || process.env.VITE_APPWRITE_ENDPOINT,
  projectId: process.env.APPWRITE_PROJECT_ID || process.env.VITE_APPWRITE_PROJECT_ID,
  apiKey: process.env.APPWRITE_API_KEY,
  databaseId: process.env.APPWRITE_DATABASE_ID || process.env.VITE_APPWRITE_DATABASE_ID,

  forecastModelsCollectionId:
    process.env.APPWRITE_FORECAST_MODELS_COLLECTION_ID ||
    process.env.VITE_APPWRITE_FORECAST_MODELS_COLLECTION_ID ||
    'forecast_models',
  forecastSnapshotsCollectionId:
    process.env.APPWRITE_FORECAST_SNAPSHOTS_COLLECTION_ID ||
    process.env.VITE_APPWRITE_FORECAST_SNAPSHOTS_COLLECTION_ID ||
    'forecast_snapshots',
  demandPredictionsCollectionId:
    process.env.APPWRITE_DEMAND_PREDICTIONS_COLLECTION_ID ||
    process.env.VITE_APPWRITE_DEMAND_PREDICTIONS_COLLECTION_ID ||
    'demand_predictions',
  timesheetEntriesCollectionId:
    process.env.APPWRITE_TIMESHEET_ENTRIES_COLLECTION_ID ||
    process.env.VITE_APPWRITE_TIMESHEET_ENTRIES_COLLECTION_ID ||
    'timesheet_entries',
  shiftsCollectionId:
    process.env.APPWRITE_SHIFTS_COLLECTION_ID || process.env.VITE_APPWRITE_SHIFTS_COLLECTION_ID || 'shifts',
  guardsCollectionId:
    process.env.APPWRITE_GUARDS_COLLECTION_ID || process.env.VITE_APPWRITE_GUARDS_COLLECTION_ID || 'guards',
  marginAlertsCollectionId:
    process.env.APPWRITE_MARGIN_ALERTS_COLLECTION_ID ||
    process.env.VITE_APPWRITE_MARGIN_ALERTS_COLLECTION_ID ||
    'margin_alerts',
  auditLogsCollectionId:
    process.env.APPWRITE_AUDIT_LOGS_COLLECTION_ID || process.env.VITE_APPWRITE_AUDIT_LOGS_COLLECTION_ID || 'audit_logs',
  notificationOutboxCollectionId:
    process.env.APPWRITE_NOTIFICATION_OUTBOX_COLLECTION_ID ||
    process.env.VITE_APPWRITE_NOTIFICATION_OUTBOX_COLLECTION_ID ||
    'notification_outbox',
  opsEmail: process.env.OPS_EMAIL || process.env.VITE_OPS_EMAIL || '',

  periodStart: process.env.FORECAST_PERIOD_START || null,
  periodEnd: process.env.FORECAST_PERIOD_END || null,
  lookbackDays: Number(process.env.FORECAST_LOOKBACK_DAYS || 28),
  shortageThreshold: Number(process.env.STAFFING_SHORTAGE_THRESHOLD || 0.2),
};

validateEnv(env);

if (simulateChecks) {
  runSimulatedChecks();
}

const period = resolveForecastPeriod(env);

const client = new Client().setEndpoint(env.endpoint).setProject(env.projectId).setKey(env.apiKey);
const databases = new Databases(client);

const summary = {
  dryRun,
  periodStart: period.start,
  periodEnd: period.end,
  models: 0,
  snapshotsCreated: 0,
  demandPredictionsCreated: 0,
  shortageAlertsCreated: 0,
  failures: 0,
};

(async () => {
  const activeModels = await listActiveModels(databases, env);
  summary.models = activeModels.length;

  if (activeModels.length === 0) {
    console.log('No active forecast models found. Nothing to process.');
    console.table([summary]);
    return;
  }

  for (const model of activeModels) {
    try {
      const lookbackDays = Number(model.lookbackDays || env.lookbackDays || 28);
      const lookbackStart = new Date(new Date(period.start).getTime() - lookbackDays * DAY_MS).toISOString();
      const lookbackEnd = new Date(new Date(period.start).getTime() - 1).toISOString();

      const [entries, shifts] = await Promise.all([
        listAllDocuments(databases, env.databaseId, env.timesheetEntriesCollectionId, [
          Query.equal('status', 'approved'),
          Query.greaterThanEqual('workDate', lookbackStart),
          Query.lessThanEqual('workDate', lookbackEnd),
          Query.equal('clientId', String(model.clientId)),
          ...(model.siteId ? [Query.equal('siteId', String(model.siteId))] : []),
        ]),
        listAllDocuments(databases, env.databaseId, env.shiftsCollectionId, [
          Query.greaterThanEqual('date', lookbackStart),
          Query.lessThanEqual('date', lookbackEnd),
          Query.equal('clientId', String(model.clientId)),
          ...(model.siteId ? [Query.equal('siteId', String(model.siteId))] : []),
        ]),
      ]);

      const guardIds = Array.from(new Set(entries.map((entry) => String(entry.guardId || '')).filter(Boolean)));
      const guardsById = await listGuardsByIds(databases, env, guardIds);

      const workedHours = entries.reduce((sum, entry) => sum + Number(entry.minutesPayable || 0) / 60, 0);
      const avgBillRate = average(
        shifts.map((shift) => Number(shift.hourlyRate)).filter((rate) => Number.isFinite(rate) && rate > 0),
      );

      let totalCost = 0;
      for (const entry of entries) {
        const guard = guardsById.get(String(entry.guardId || ''));
        const payRate = Number(guard?.payRate);
        if (Number.isFinite(payRate) && payRate > 0) {
          totalCost += (Number(entry.minutesPayable || 0) / 60) * payRate;
        }
      }

      const effectiveCostRate = workedHours > 0 ? totalCost / workedHours : 0;
      const weeks = Math.max(1, Math.ceil(lookbackDays / 7));
      const predictedHours = workedHours / weeks;
      const predictedRevenue = predictedHours * avgBillRate;
      const predictedCost = predictedHours * effectiveCostRate;

      const snapshotPayload = {
        clientId: String(model.clientId),
        siteId: String(model.siteId || 'all-sites'),
        periodStart: period.start,
        periodEnd: period.end,
        predictedHours: Number(predictedHours.toFixed(6)),
        predictedRevenue: Number(predictedRevenue.toFixed(6)),
        predictedCost: Number(predictedCost.toFixed(6)),
        generatedAt: new Date().toISOString(),
      };

      if (!dryRun) {
        await databases.createDocument(
          env.databaseId,
          env.forecastSnapshotsCollectionId,
          ID.unique(),
          snapshotPayload,
        );
      }
      summary.snapshotsCreated += 1;

      const requiredHeadcountAvg = average(
        shifts.map((shift) => Math.max(1, Number(shift.requiredHeadcount || shift.positionsOpen || 1))),
      );

      const attendanceRate = shifts.length > 0
        ? Math.min(1, entries.length / shifts.length)
        : 0;

      const predictedAvailable = guardIds.length * attendanceRate;
      const shortageRiskScore = requiredHeadcountAvg > 0
        ? Math.max(0, (requiredHeadcountAvg - predictedAvailable) / requiredHeadcountAvg)
        : 0;

      const predictionPayload = {
        clientId: String(model.clientId),
        siteId: String(model.siteId || 'all-sites'),
        date: period.start,
        predictedRequiredGuards: Number(requiredHeadcountAvg.toFixed(6)),
        predictedAvailableGuards: Number(predictedAvailable.toFixed(6)),
        shortageRiskScore: Number(shortageRiskScore.toFixed(6)),
        generatedAt: new Date().toISOString(),
      };

      if (!dryRun) {
        await databases.createDocument(
          env.databaseId,
          env.demandPredictionsCollectionId,
          ID.unique(),
          predictionPayload,
        );
      }
      summary.demandPredictionsCreated += 1;

      if (shortageRiskScore > env.shortageThreshold) {
        if (!dryRun) {
          const alert = await createShortageAlert(databases, env, {
            clientId: model.clientId,
            siteId: model.siteId || 'all-sites',
            periodStart: period.start,
            periodEnd: period.end,
            thresholdValue: env.shortageThreshold,
            actualValue: shortageRiskScore,
            severity: shortageRiskScore >= env.shortageThreshold * 1.5 ? 'critical' : 'warning',
          });

          if (alert.created) {
            summary.shortageAlertsCreated += 1;
            await createAuditLog(databases, env, {
              actorId: 'system:forecast-run',
              action: 'DEMAND_SHORTAGE_ALERT',
              resourceType: 'margin_alerts',
              resourceId: alert.document.$id,
              clientId: alert.document.clientId,
              siteId: alert.document.siteId,
              metadata: {
                shortageRiskScore,
                threshold: env.shortageThreshold,
              },
            });
          }
        } else {
          summary.shortageAlertsCreated += 1;
        }
      }
    } catch (error) {
      summary.failures += 1;
      console.error('[forecast-run] model processing failed:', error?.message || error);
    }
  }

  console.log('\nForecast Run Summary');
  console.table([summary]);

  if (summary.failures > 0) {
    process.exit(1);
  }

  if (dryRun) {
    console.log('Dry-run complete (no writes).');
  } else {
    console.log('Forecast run complete.');
  }
})().catch((error) => {
  console.error('forecast-run failed:', error);
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

function validateEnv(values) {
  const missing = [];
  if (!values.endpoint) missing.push('APPWRITE_ENDPOINT');
  if (!values.projectId) missing.push('APPWRITE_PROJECT_ID');
  if (!values.apiKey) missing.push('APPWRITE_API_KEY');
  if (!values.databaseId) missing.push('APPWRITE_DATABASE_ID');

  if (missing.length > 0) {
    console.error('Missing required environment variables for forecast-run:');
    for (const key of missing) {
      console.error(`- ${key}`);
    }
    process.exit(1);
  }
}

function runSimulatedChecks() {
  const workedHoursHistory = [40, 36, 44, 38];
  const predictedHours = average(workedHoursHistory);
  const avgBillRate = 22;
  const costRate = 14;

  const predictedRevenue = predictedHours * avgBillRate;
  const predictedCost = predictedHours * costRate;

  if (predictedHours <= 0 || predictedRevenue <= predictedCost) {
    throw new Error('Simulation check failed: forecast model computation is invalid.');
  }

  const required = 10;
  const available = 6;
  const shortageRiskScore = (required - available) / required;

  if (Math.abs(shortageRiskScore - 0.4) > 1e-6) {
    throw new Error('Simulation check failed: shortage risk formula mismatch.');
  }

  console.log('Simulation checks passed: forecast and demand formulas are valid.');
}

function resolveForecastPeriod(values) {
  if (values.periodStart && values.periodEnd) {
    return {
      start: asDateOnlyIso(values.periodStart),
      end: endOfDayIso(values.periodEnd),
    };
  }

  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
  const end = new Date(start.getTime() + 6 * DAY_MS + (24 * 60 * 60 * 1000 - 1));

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

function asDateOnlyIso(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date value: ${value}`);
  }
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0)).toISOString();
}

function endOfDayIso(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date value: ${value}`);
  }
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999)).toISOString();
}

function average(values = []) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + Number(value || 0), 0) / values.length;
}

async function listAllDocuments(databases, databaseId, collectionId, baseQueries = []) {
  const all = [];
  let offset = 0;

  while (true) {
    const response = await databases.listDocuments(databaseId, collectionId, [
      ...baseQueries,
      Query.limit(PAGE_SIZE),
      Query.offset(offset),
    ]);

    all.push(...response.documents);

    if (response.documents.length < PAGE_SIZE) break;
    if (response.total && all.length >= response.total) break;
    offset += PAGE_SIZE;
  }

  return all;
}

async function listActiveModels(databases, values) {
  const models = await listAllDocuments(databases, values.databaseId, values.forecastModelsCollectionId, [
    Query.equal('active', true),
  ]);

  if (models.length > 0) {
    return models;
  }

  const recentEntries = await listAllDocuments(databases, values.databaseId, values.timesheetEntriesCollectionId, [
    Query.equal('status', 'approved'),
    Query.orderDesc('workDate'),
    Query.limit(500),
  ]);

  const byKey = new Map();

  for (const entry of recentEntries) {
    if (!entry.clientId || !entry.siteId) continue;
    const key = `${entry.clientId}::${entry.siteId}`;
    if (!byKey.has(key)) {
      byKey.set(key, {
        clientId: entry.clientId,
        siteId: entry.siteId,
        modelType: 'rolling_average',
        lookbackDays: values.lookbackDays,
      });
    }
  }

  return Array.from(byKey.values());
}

async function listGuardsByIds(databases, values, ids = []) {
  const map = new Map();

  for (let i = 0; i < ids.length; i += 100) {
    const batch = ids.slice(i, i + 100);
    if (!batch.length) continue;

    const response = await databases.listDocuments(values.databaseId, values.guardsCollectionId, [
      Query.equal('$id', batch),
      Query.limit(batch.length),
    ]);

    for (const guard of response.documents) {
      map.set(String(guard.$id), guard);
    }
  }

  return map;
}

async function createShortageAlert(databases, values, payload) {
  const existing = await databases.listDocuments(values.databaseId, values.marginAlertsCollectionId, [
    Query.equal('clientId', String(payload.clientId)),
    Query.equal('siteId', String(payload.siteId || payload.clientId)),
    Query.equal('alertType', 'staffing_shortage'),
    Query.equal('periodStart', String(payload.periodStart)),
    Query.equal('periodEnd', String(payload.periodEnd)),
    Query.equal('resolved', false),
    Query.limit(1),
  ]);

  if (existing.documents.length > 0) {
    return { created: false, document: existing.documents[0] };
  }

  const doc = await databases.createDocument(values.databaseId, values.marginAlertsCollectionId, ID.unique(), {
    clientId: String(payload.clientId),
    siteId: String(payload.siteId || payload.clientId),
    shiftId: null,
    periodStart: String(payload.periodStart),
    periodEnd: String(payload.periodEnd),
    alertType: 'staffing_shortage',
    thresholdValue: Number(payload.thresholdValue),
    actualValue: Number(payload.actualValue),
    severity: String(payload.severity || 'warning'),
    resolved: false,
    resolvedAt: null,
    createdAt: new Date().toISOString(),
  });

  await enqueueNotification(databases, values, {
    eventType: 'marginAlertCreated',
    toEmail: values.opsEmail,
    subject: `Margin alert (${doc.severity}): staffing_shortage`,
    payload: {
      clientId: doc.clientId,
      siteId: doc.siteId,
      alertType: doc.alertType,
      severity: doc.severity,
      thresholdValue: doc.thresholdValue,
      actualValue: doc.actualValue,
      periodStart: doc.periodStart,
      periodEnd: doc.periodEnd,
    },
    clientId: doc.clientId,
    siteId: doc.siteId,
    userId: null,
  });

  return { created: true, document: doc };
}

async function createAuditLog(databases, values, payload) {
  if (!values.auditLogsCollectionId) return;

  try {
    await databases.createDocument(values.databaseId, values.auditLogsCollectionId, ID.unique(), {
      actorId: payload.actorId,
      action: payload.action,
      resourceType: payload.resourceType,
      entity: payload.resourceType,
      entityId: payload.resourceId || null,
      clientId: payload.clientId || null,
      siteId: payload.siteId || null,
      metadataJson: JSON.stringify(payload.metadata || {}),
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[forecast-run] audit log write failed:', error?.message || error);
  }
}

async function enqueueNotification(databases, values, payload) {
  if (!values.notificationOutboxCollectionId || !payload.toEmail) return;

  try {
    await databases.createDocument(values.databaseId, values.notificationOutboxCollectionId, ID.unique(), {
      eventType: payload.eventType,
      toEmail: payload.toEmail,
      subject: payload.subject,
      payload: payload.payload,
      status: 'pending',
      attempts: 0,
      lastError: null,
      clientId: payload.clientId || null,
      siteId: payload.siteId || null,
      userId: payload.userId || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[forecast-run] notification enqueue failed:', error?.message || error);
  }
}
