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

  shiftsCollectionId: process.env.APPWRITE_SHIFTS_COLLECTION_ID || process.env.VITE_APPWRITE_SHIFTS_COLLECTION_ID || 'shifts',
  timesheetEntriesCollectionId:
    process.env.APPWRITE_TIMESHEET_ENTRIES_COLLECTION_ID ||
    process.env.VITE_APPWRITE_TIMESHEET_ENTRIES_COLLECTION_ID ||
    'timesheet_entries',
  demandPredictionsCollectionId:
    process.env.APPWRITE_DEMAND_PREDICTIONS_COLLECTION_ID ||
    process.env.VITE_APPWRITE_DEMAND_PREDICTIONS_COLLECTION_ID ||
    'demand_predictions',
  marginAlertsCollectionId:
    process.env.APPWRITE_MARGIN_ALERTS_COLLECTION_ID ||
    process.env.VITE_APPWRITE_MARGIN_ALERTS_COLLECTION_ID ||
    'margin_alerts',
  guardsCollectionId:
    process.env.APPWRITE_GUARDS_COLLECTION_ID || process.env.VITE_APPWRITE_GUARDS_COLLECTION_ID || 'guards',
  auditLogsCollectionId:
    process.env.APPWRITE_AUDIT_LOGS_COLLECTION_ID || process.env.VITE_APPWRITE_AUDIT_LOGS_COLLECTION_ID || 'audit_logs',
  notificationOutboxCollectionId:
    process.env.APPWRITE_NOTIFICATION_OUTBOX_COLLECTION_ID ||
    process.env.VITE_APPWRITE_NOTIFICATION_OUTBOX_COLLECTION_ID ||
    'notification_outbox',
  opsEmail: process.env.OPS_EMAIL || process.env.VITE_OPS_EMAIL || '',

  periodStart: process.env.MARGIN_PERIOD_START || null,
  periodEnd: process.env.MARGIN_PERIOD_END || null,
  marginThresholdPct: Number(process.env.MARGIN_THRESHOLD_PCT || 18),
  overtimeSpikeMultiplier: Number(process.env.OVERTIME_SPIKE_MULTIPLIER || 1.75),
  slaCoverageThreshold: Number(process.env.SLA_COVERAGE_THRESHOLD || 0.92),
  staffingShortageThreshold: Number(process.env.STAFFING_SHORTAGE_THRESHOLD || 0.2),
  lookbackDays: Number(process.env.MARGIN_LOOKBACK_DAYS || 28),
};

validateEnv(env);

if (simulateChecks) {
  runSimulatedChecks();
}

const period = getPeriodRange({ periodStart: env.periodStart, periodEnd: env.periodEnd });

const client = new Client().setEndpoint(env.endpoint).setProject(env.projectId).setKey(env.apiKey);
const databases = new Databases(client);

const summary = {
  dryRun,
  periodStart: period.start,
  periodEnd: period.end,
  shiftsScanned: 0,
  entriesScanned: 0,
  demandPredictionsScanned: 0,
  alertCandidates: 0,
  alertsCreated: 0,
  alertsSkipped: 0,
  alertsFailed: 0,
};

(async () => {
  const [shifts, entries, demandPredictions] = await Promise.all([
    listAllDocuments(databases, env.databaseId, env.shiftsCollectionId, [
      Query.greaterThanEqual('date', period.start),
      Query.lessThanEqual('date', period.end),
    ]),
    listAllDocuments(databases, env.databaseId, env.timesheetEntriesCollectionId, [
      Query.equal('status', 'approved'),
      Query.greaterThanEqual('workDate', period.start),
      Query.lessThanEqual('workDate', period.end),
    ]),
    listAllDocuments(databases, env.databaseId, env.demandPredictionsCollectionId, [
      Query.greaterThanEqual('date', period.start),
      Query.lessThanEqual('date', period.end),
    ]),
  ]);

  summary.shiftsScanned = shifts.length;
  summary.entriesScanned = entries.length;
  summary.demandPredictionsScanned = demandPredictions.length;

  const guardIds = Array.from(new Set(entries.map((item) => String(item.guardId || '')).filter(Boolean)));
  const guardsById = await listGuardsByIds(databases, env, guardIds);

  const metrics = aggregateMetrics({ shifts, entries, guardsById });
  const historicalOvertimeMap = await buildHistoricalOvertimeMap(databases, env, period.start);
  const alerts = [];

  for (const metric of metrics) {
    const key = toKey(metric.clientId, metric.siteId);
    const historicalAvg = Number(historicalOvertimeMap.get(key) || 0);

    if (metric.grossMarginPct < env.marginThresholdPct) {
      alerts.push({
        clientId: metric.clientId,
        siteId: metric.siteId,
        periodStart: period.start,
        periodEnd: period.end,
        alertType: 'low_margin',
        thresholdValue: env.marginThresholdPct,
        actualValue: Number(metric.grossMarginPct.toFixed(4)),
        severity: metric.grossMarginPct < env.marginThresholdPct * 0.7 ? 'critical' : 'warning',
      });
    }

    if (metric.grossProfit < 0) {
      alerts.push({
        clientId: metric.clientId,
        siteId: metric.siteId,
        periodStart: period.start,
        periodEnd: period.end,
        alertType: 'negative_margin',
        thresholdValue: 0,
        actualValue: Number(metric.grossProfit.toFixed(4)),
        severity: 'critical',
      });
    }

    const overtimeThreshold = historicalAvg * env.overtimeSpikeMultiplier;
    if (
      metric.overtimeHours > 0 &&
      ((historicalAvg > 0 && metric.overtimeHours > overtimeThreshold) ||
        (historicalAvg === 0 && metric.overtimeHours >= 8))
    ) {
      alerts.push({
        clientId: metric.clientId,
        siteId: metric.siteId,
        periodStart: period.start,
        periodEnd: period.end,
        alertType: 'overtime_spike',
        thresholdValue: Number((overtimeThreshold || env.overtimeSpikeMultiplier).toFixed(4)),
        actualValue: Number(metric.overtimeHours.toFixed(4)),
        severity: metric.overtimeHours > (overtimeThreshold || 4) * 1.5 ? 'critical' : 'warning',
      });
    }

    if (metric.scheduledHours > 0 && metric.coverageRatio < env.slaCoverageThreshold) {
      alerts.push({
        clientId: metric.clientId,
        siteId: metric.siteId,
        periodStart: period.start,
        periodEnd: period.end,
        alertType: 'under_coverage',
        thresholdValue: env.slaCoverageThreshold,
        actualValue: Number(metric.coverageRatio.toFixed(6)),
        severity: metric.coverageRatio < env.slaCoverageThreshold * 0.8 ? 'critical' : 'warning',
      });
    }
  }

  for (const prediction of demandPredictions) {
    const required = Number(prediction.predictedRequiredGuards || 0);
    const available = Number(prediction.predictedAvailableGuards || 0);
    const score = Number(prediction.shortageRiskScore) || (required > 0 ? (required - available) / required : 0);

    if (score > env.staffingShortageThreshold) {
      alerts.push({
        clientId: prediction.clientId,
        siteId: prediction.siteId,
        periodStart: startOfUtcDayIso(prediction.date) || period.start,
        periodEnd: endOfUtcDayIso(prediction.date) || period.end,
        alertType: 'staffing_shortage',
        thresholdValue: env.staffingShortageThreshold,
        actualValue: Number(score.toFixed(6)),
        severity: score > env.staffingShortageThreshold * 1.5 ? 'critical' : 'warning',
      });
    }
  }

  summary.alertCandidates = alerts.length;

  for (const alert of alerts) {
    try {
      if (dryRun) {
        summary.alertsCreated += 1;
        continue;
      }

      const result = await createAlertIfMissing(databases, env, alert);

      if (result.created) {
        summary.alertsCreated += 1;
      } else {
        summary.alertsSkipped += 1;
      }
    } catch (error) {
      summary.alertsFailed += 1;
      console.error('[margin-monitor] failed alert create:', alert, error?.message || error);
    }
  }

  console.log('\nMargin Monitor Summary');
  console.table([summary]);

  if (summary.alertsFailed > 0) {
    process.exit(1);
  }

  if (dryRun) {
    console.log('Dry-run complete (no writes).');
  } else {
    console.log('Margin monitoring complete.');
  }
})().catch((error) => {
  console.error('margin-monitor failed:', error);
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
    console.error('Missing required environment variables for margin-monitor:');
    for (const key of missing) {
      console.error(`- ${key}`);
    }
    process.exit(1);
  }
}

function runSimulatedChecks() {
  const simulated = {
    grossMarginPct: 10,
    grossProfit: -5,
    overtimeHours: 12,
    coverageRatio: 0.7,
  };

  const lowMarginTriggered = simulated.grossMarginPct < 18;
  const negativeMarginTriggered = simulated.grossProfit < 0;
  const overtimeTriggered = simulated.overtimeHours > 2 * 1.75;
  const underCoverageTriggered = simulated.coverageRatio < 0.92;

  if (!lowMarginTriggered || !negativeMarginTriggered || !overtimeTriggered || !underCoverageTriggered) {
    throw new Error('Simulation check failed: margin detection rules did not trigger as expected.');
  }

  console.log('Simulation checks passed: margin alert rules trigger correctly.');
}

function getPeriodRange({ periodStart, periodEnd }) {
  if (periodStart && periodEnd) {
    return {
      start: asIso(periodStart),
      end: asIso(periodEnd),
    };
  }

  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 7, 0, 0, 0, 0));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

function asIso(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date value: ${value}`);
  }
  return date.toISOString();
}

function toKey(clientId, siteId) {
  return `${String(clientId || 'unknown')}::${String(siteId || 'unknown')}`;
}

function parseTimeToMinutes(value) {
  const str = String(value || '');
  const [hh, mm] = str.split(':');
  const h = Number(hh);
  const m = Number(mm);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
}

function shiftDurationHours(shift) {
  const start = parseTimeToMinutes(shift.startTime);
  const end = parseTimeToMinutes(shift.endTime);
  if (start === null || end === null) return 0;
  let diff = end - start;
  if (diff <= 0) diff += 24 * 60;
  return diff / 60;
}

function aggregateMetrics({ shifts, entries, guardsById }) {
  const grouped = new Map();

  for (const shift of shifts) {
    const key = toKey(shift.clientId, shift.siteId);
    if (!grouped.has(key)) {
      grouped.set(key, {
        clientId: shift.clientId || null,
        siteId: shift.siteId || null,
        scheduledHours: 0,
        workedHours: 0,
        overtimeHours: 0,
        cost: 0,
        billRates: [],
      });
    }

    const bucket = grouped.get(key);
    const headcount = Math.max(1, Number(shift.requiredHeadcount || shift.positionsOpen || 1));
    bucket.scheduledHours += shiftDurationHours(shift) * headcount;

    const billRate = Number(shift.hourlyRate);
    if (Number.isFinite(billRate) && billRate > 0) {
      bucket.billRates.push(billRate);
    }
  }

  for (const entry of entries) {
    const key = toKey(entry.clientId, entry.siteId);
    if (!grouped.has(key)) {
      grouped.set(key, {
        clientId: entry.clientId || null,
        siteId: entry.siteId || null,
        scheduledHours: 0,
        workedHours: 0,
        overtimeHours: 0,
        cost: 0,
        billRates: [],
      });
    }

    const bucket = grouped.get(key);
    const payableHours = Number(entry.minutesPayable || 0) / 60;
    bucket.workedHours += payableHours;
    bucket.overtimeHours += Math.max(0, (Number(entry.minutesPayable || 0) - 8 * 60) / 60);

    const guard = guardsById.get(String(entry.guardId || ''));
    const payRate = Number(guard?.payRate);
    if (Number.isFinite(payRate) && payRate > 0) {
      bucket.cost += payableHours * payRate;
    }
  }

  return Array.from(grouped.values()).map((bucket) => {
    const avgBillRate = bucket.billRates.length
      ? bucket.billRates.reduce((sum, value) => sum + value, 0) / bucket.billRates.length
      : 0;

    const revenue = bucket.workedHours * avgBillRate;
    const grossProfit = revenue - bucket.cost;
    const grossMarginPct = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
    const coverageRatio = bucket.scheduledHours > 0 ? bucket.workedHours / bucket.scheduledHours : 1;

    return {
      ...bucket,
      grossProfit,
      grossMarginPct,
      coverageRatio,
    };
  });
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

async function listGuardsByIds(databases, values, guardIds = []) {
  const map = new Map();

  for (let i = 0; i < guardIds.length; i += 100) {
    const batch = guardIds.slice(i, i + 100);
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

async function buildHistoricalOvertimeMap(databases, values, periodStartIso) {
  const lookbackStart = new Date(new Date(periodStartIso).getTime() - values.lookbackDays * DAY_MS).toISOString();
  const lookbackEnd = new Date(new Date(periodStartIso).getTime() - 1).toISOString();

  const historicalEntries = await listAllDocuments(databases, values.databaseId, values.timesheetEntriesCollectionId, [
    Query.equal('status', 'approved'),
    Query.greaterThanEqual('workDate', lookbackStart),
    Query.lessThanEqual('workDate', lookbackEnd),
  ]);

  const totalByKey = new Map();

  for (const entry of historicalEntries) {
    const key = toKey(entry.clientId, entry.siteId);
    const overtime = Math.max(0, (Number(entry.minutesPayable || 0) - 8 * 60) / 60);

    if (!totalByKey.has(key)) {
      totalByKey.set(key, 0);
    }

    totalByKey.set(key, totalByKey.get(key) + overtime);
  }

  const weeks = Math.max(1, Math.ceil(values.lookbackDays / 7));
  const averages = new Map();

  for (const [key, total] of totalByKey.entries()) {
    averages.set(key, total / weeks);
  }

  return averages;
}

function startOfUtcDayIso(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0)).toISOString();
}

function endOfUtcDayIso(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999)).toISOString();
}

async function createAlertIfMissing(databases, values, alert) {
  const existing = await databases.listDocuments(values.databaseId, values.marginAlertsCollectionId, [
    Query.equal('clientId', String(alert.clientId)),
    Query.equal('siteId', String(alert.siteId)),
    Query.equal('alertType', String(alert.alertType)),
    Query.equal('periodStart', String(alert.periodStart)),
    Query.equal('periodEnd', String(alert.periodEnd)),
    Query.equal('resolved', false),
    Query.limit(1),
  ]);

  if (existing.documents.length > 0) {
    return { created: false, document: existing.documents[0] };
  }

  const doc = await databases.createDocument(values.databaseId, values.marginAlertsCollectionId, ID.unique(), {
    clientId: String(alert.clientId),
    siteId: String(alert.siteId),
    shiftId: alert.shiftId || null,
    periodStart: String(alert.periodStart),
    periodEnd: String(alert.periodEnd),
    alertType: String(alert.alertType),
    thresholdValue: Number(alert.thresholdValue),
    actualValue: Number(alert.actualValue),
    severity: String(alert.severity || 'warning'),
    resolved: false,
    resolvedAt: null,
    createdAt: new Date().toISOString(),
  });

  await createAuditLog(databases, values, {
    actorId: 'system:margin-monitor',
    action: 'MARGIN_ALERT_CREATED',
    resourceType: 'margin_alerts',
    resourceId: doc.$id,
    clientId: doc.clientId,
    siteId: doc.siteId,
    metadata: {
      alertType: doc.alertType,
      thresholdValue: doc.thresholdValue,
      actualValue: doc.actualValue,
      severity: doc.severity,
      periodStart: doc.periodStart,
      periodEnd: doc.periodEnd,
    },
  });

  await enqueueNotification(databases, values, {
    eventType: 'marginAlertCreated',
    toEmail: values.opsEmail,
    subject: `Margin alert (${doc.severity}): ${doc.alertType}`,
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
      entityId: payload.resourceId,
      clientId: payload.clientId || null,
      siteId: payload.siteId || null,
      metadataJson: JSON.stringify(payload.metadata || {}),
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[margin-monitor] audit log write failed:', error?.message || error);
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
    console.error('[margin-monitor] notification enqueue failed:', error?.message || error);
  }
}
