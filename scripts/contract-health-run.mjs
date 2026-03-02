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

  contractsCollectionId:
    process.env.APPWRITE_CONTRACTS_COLLECTION_ID || process.env.VITE_APPWRITE_CONTRACTS_COLLECTION_ID || 'contracts',
  contractHealthSnapshotsCollectionId:
    process.env.APPWRITE_CONTRACT_HEALTH_SNAPSHOTS_COLLECTION_ID ||
    process.env.VITE_APPWRITE_CONTRACT_HEALTH_SNAPSHOTS_COLLECTION_ID ||
    'contract_health_snapshots',
  shiftsCollectionId:
    process.env.APPWRITE_SHIFTS_COLLECTION_ID || process.env.VITE_APPWRITE_SHIFTS_COLLECTION_ID || 'shifts',
  timesheetEntriesCollectionId:
    process.env.APPWRITE_TIMESHEET_ENTRIES_COLLECTION_ID ||
    process.env.VITE_APPWRITE_TIMESHEET_ENTRIES_COLLECTION_ID ||
    'timesheet_entries',
  incidentsCollectionId:
    process.env.APPWRITE_INCIDENTS_COLLECTION_ID || process.env.VITE_APPWRITE_INCIDENTS_COLLECTION_ID || 'incidents',
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

  riskThreshold: Number(process.env.CONTRACT_RISK_THRESHOLD || 0.65),
  periodStart: process.env.CONTRACT_HEALTH_PERIOD_START || null,
  periodEnd: process.env.CONTRACT_HEALTH_PERIOD_END || null,
};

validateEnv(env);

if (simulateChecks) {
  runSimulatedChecks();
}

const period = resolvePeriod(env);

const client = new Client().setEndpoint(env.endpoint).setProject(env.projectId).setKey(env.apiKey);
const databases = new Databases(client);

const summary = {
  dryRun,
  periodStart: period.currentStart,
  periodEnd: period.currentEnd,
  previousStart: period.previousStart,
  previousEnd: period.previousEnd,
  contractsScanned: 0,
  snapshotsCreated: 0,
  riskAlertsCreated: 0,
  failures: 0,
};

(async () => {
  const contracts = await listAllDocuments(databases, env.databaseId, env.contractsCollectionId, []);
  summary.contractsScanned = contracts.length;

  for (const contract of contracts) {
    try {
      const current = await loadWindowMetrics(databases, env, contract, period.currentStart, period.currentEnd);
      const previous = await loadWindowMetrics(databases, env, contract, period.previousStart, period.previousEnd);
      const risk = computeRisk(current, previous);

      let snapshotId = null;

      if (!dryRun) {
        const snapshot = await databases.createDocument(
          env.databaseId,
          env.contractHealthSnapshotsCollectionId,
          ID.unique(),
          {
            contractId: contract.$id,
            marginTrend: Number(risk.marginTrend.toFixed(6)),
            slaComplianceScore: Number(current.slaComplianceScore.toFixed(6)),
            incidentRate: Number(current.incidentRate.toFixed(6)),
            revenueTrend: Number(risk.revenueTrend.toFixed(6)),
            riskScore: Number(risk.riskScore.toFixed(6)),
            generatedAt: new Date().toISOString(),
          },
        );

        snapshotId = snapshot.$id;
        summary.snapshotsCreated += 1;

        await databases.updateDocument(env.databaseId, env.contractsCollectionId, contract.$id, {
          lastReviewAt: new Date().toISOString(),
          healthScore: Number((1 - risk.riskScore).toFixed(6)),
          updatedAt: new Date().toISOString(),
        });
      } else {
        summary.snapshotsCreated += 1;
      }

      if (risk.riskScore > env.riskThreshold) {
        if (!dryRun) {
          const alert = await createContractRiskAlert(databases, env, {
            clientId: contract.clientId,
            siteId: contract.siteId || contract.clientId,
            periodStart: period.currentStart,
            periodEnd: period.currentEnd,
            thresholdValue: env.riskThreshold,
            actualValue: risk.riskScore,
            severity: risk.riskScore >= env.riskThreshold * 1.4 ? 'critical' : 'warning',
          });

          if (alert.created) {
            summary.riskAlertsCreated += 1;
            await createAuditLog(databases, env, {
              actorId: 'system:contract-health-run',
              action: 'CONTRACT_RISK_ALERT',
              resourceType: 'margin_alerts',
              resourceId: alert.document.$id,
              clientId: alert.document.clientId,
              siteId: alert.document.siteId,
              metadata: {
                contractId: contract.$id,
                riskScore: risk.riskScore,
                threshold: env.riskThreshold,
                snapshotId,
              },
            });
          }
        } else {
          summary.riskAlertsCreated += 1;
        }
      }
    } catch (error) {
      summary.failures += 1;
      console.error('[contract-health-run] contract processing failed:', error?.message || error);
    }
  }

  console.log('\nContract Health Summary');
  console.table([summary]);

  if (summary.failures > 0) {
    process.exit(1);
  }

  if (dryRun) {
    console.log('Dry-run complete (no writes).');
  } else {
    console.log('Contract health run complete.');
  }
})().catch((error) => {
  console.error('contract-health-run failed:', error);
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
    console.error('Missing required environment variables for contract-health-run:');
    for (const key of missing) {
      console.error(`- ${key}`);
    }
    process.exit(1);
  }
}

function runSimulatedChecks() {
  const current = {
    grossMarginPct: 12,
    slaComplianceScore: 0.74,
    incidentRate: 0.3,
    revenue: 8000,
  };

  const previous = {
    grossMarginPct: 24,
    slaComplianceScore: 0.95,
    incidentRate: 0.1,
    revenue: 12000,
  };

  const risk = computeRisk(current, previous);

  if (risk.riskScore <= 0.5) {
    throw new Error('Simulation check failed: contract risk score should be high for deteriorating metrics.');
  }

  console.log('Simulation checks passed: contract risk scoring behaves as expected.');
}

function resolvePeriod(values) {
  if (values.periodStart && values.periodEnd) {
    const currentStart = asIso(values.periodStart);
    const currentEnd = asIso(values.periodEnd);
    const durationMs = new Date(currentEnd).getTime() - new Date(currentStart).getTime() + 1;

    return {
      currentStart,
      currentEnd,
      previousStart: new Date(new Date(currentStart).getTime() - durationMs).toISOString(),
      previousEnd: new Date(new Date(currentStart).getTime() - 1).toISOString(),
    };
  }

  const now = new Date();
  const currentEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
  const currentStart = new Date(currentEnd.getTime() - 30 * DAY_MS + 1);
  const durationMs = currentEnd.getTime() - currentStart.getTime() + 1;

  return {
    currentStart: currentStart.toISOString(),
    currentEnd: currentEnd.toISOString(),
    previousStart: new Date(currentStart.getTime() - durationMs).toISOString(),
    previousEnd: new Date(currentStart.getTime() - 1).toISOString(),
  };
}

function asIso(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date value: ${value}`);
  }
  return date.toISOString();
}

function parseTimeToMinutes(value) {
  const [hh, mm] = String(value || '').split(':');
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

async function loadWindowMetrics(databases, values, contract, rangeStart, rangeEnd) {
  const shiftQueries = [
    Query.greaterThanEqual('date', rangeStart),
    Query.lessThanEqual('date', rangeEnd),
    Query.equal('clientId', String(contract.clientId)),
    ...(contract.siteId ? [Query.equal('siteId', String(contract.siteId))] : []),
  ];

  const entryQueries = [
    Query.equal('status', 'approved'),
    Query.greaterThanEqual('workDate', rangeStart),
    Query.lessThanEqual('workDate', rangeEnd),
    Query.equal('clientId', String(contract.clientId)),
    ...(contract.siteId ? [Query.equal('siteId', String(contract.siteId))] : []),
  ];

  const incidentQueries = [
    Query.greaterThanEqual('createdAt', rangeStart),
    Query.lessThanEqual('createdAt', rangeEnd),
    Query.equal('clientId', String(contract.clientId)),
    ...(contract.siteId ? [Query.equal('siteId', String(contract.siteId))] : []),
  ];

  const [shifts, entries, incidents] = await Promise.all([
    listAllDocuments(databases, values.databaseId, values.shiftsCollectionId, shiftQueries),
    listAllDocuments(databases, values.databaseId, values.timesheetEntriesCollectionId, entryQueries),
    listAllDocuments(databases, values.databaseId, values.incidentsCollectionId, incidentQueries),
  ]);

  const scheduledHours = shifts.reduce((sum, shift) => {
    const headcount = Math.max(1, Number(shift.requiredHeadcount || shift.positionsOpen || 1));
    return sum + shiftDurationHours(shift) * headcount;
  }, 0);

  const workedHours = entries.reduce((sum, entry) => sum + Number(entry.minutesPayable || 0) / 60, 0);

  const avgBillRate = average(
    shifts.map((shift) => Number(shift.hourlyRate)).filter((rate) => Number.isFinite(rate) && rate > 0),
  );

  const revenue = workedHours * avgBillRate;
  const cost = workedHours * (avgBillRate * 0.72);
  const grossProfit = revenue - cost;
  const grossMarginPct = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
  const coverageRatio = scheduledHours > 0 ? workedHours / scheduledHours : 1;

  return {
    scheduledHours,
    workedHours,
    revenue,
    cost,
    grossProfit,
    grossMarginPct,
    slaComplianceScore: Math.max(0, Math.min(1, coverageRatio)),
    incidentRate: shifts.length > 0 ? incidents.length / shifts.length : 0,
  };
}

function average(values = []) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + Number(value || 0), 0) / values.length;
}

function computeRisk(current, previous) {
  const marginTrend = current.grossMarginPct - previous.grossMarginPct;
  const revenueTrend = previous.revenue > 0 ? (current.revenue - previous.revenue) / previous.revenue : 0;
  const incidentRateTrend = previous.incidentRate > 0
    ? (current.incidentRate - previous.incidentRate) / previous.incidentRate
    : current.incidentRate > 0
      ? 1
      : 0;

  const decliningMarginRisk = marginTrend < 0 ? Math.min(1, Math.abs(marginTrend) / 20) : 0;
  const slaRisk = Math.max(0, 1 - current.slaComplianceScore);
  const incidentRisk = Math.max(0, Math.min(1, incidentRateTrend));
  const revenueDropRisk = revenueTrend < 0 ? Math.min(1, Math.abs(revenueTrend)) : 0;

  const riskScore =
    decliningMarginRisk * 0.35 +
    slaRisk * 0.3 +
    incidentRisk * 0.2 +
    revenueDropRisk * 0.15;

  return {
    marginTrend,
    revenueTrend,
    riskScore: Math.max(0, Math.min(1, riskScore)),
  };
}

async function createContractRiskAlert(databases, values, payload) {
  const existing = await databases.listDocuments(values.databaseId, values.marginAlertsCollectionId, [
    Query.equal('clientId', String(payload.clientId)),
    Query.equal('siteId', String(payload.siteId)),
    Query.equal('alertType', 'contract_risk'),
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
    siteId: String(payload.siteId),
    shiftId: null,
    periodStart: String(payload.periodStart),
    periodEnd: String(payload.periodEnd),
    alertType: 'contract_risk',
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
    subject: `Margin alert (${doc.severity}): contract_risk`,
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
    console.error('[contract-health-run] audit log write failed:', error?.message || error);
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
    console.error('[contract-health-run] notification enqueue failed:', error?.message || error);
  }
}
