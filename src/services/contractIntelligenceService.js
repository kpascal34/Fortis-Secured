import { ID, Query } from 'appwrite';
import { databases, config } from '../lib/appwrite.js';
import { PERMISSIONS, ROLES } from '../lib/rbac.ts';
import {
  assertScopedDocument,
  ensureDatabaseConfig,
  getAuthorizedScope,
} from '../lib/serviceSecurity.js';
import { RESOURCE_TYPES, scopeQueries } from '../lib/tenancyScope.js';
import { logEvent } from './auditLogService.js';
import { createMarginAlert } from './marginAlertService.js';

const dbId = config.databaseId;
const contractsCol = config.contractsCollectionId || 'contracts';
const snapshotsCol = config.contractHealthSnapshotsCollectionId || 'contract_health_snapshots';
const shiftsCol = config.shiftsCollectionId || 'shifts';
const entriesCol = config.timesheetEntriesCollectionId || 'timesheet_entries';
const incidentsCol = config.incidentsCollectionId || 'incidents';

const PAGE_LIMIT = 100;
const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;
const DEFAULT_RISK_THRESHOLD = 0.65;

const ensureCollections = () => {
  ensureDatabaseConfig(contractsCol, 'contracts collection');
  ensureDatabaseConfig(snapshotsCol, 'contract health snapshots collection');
  ensureDatabaseConfig(shiftsCol, 'shifts collection');
  ensureDatabaseConfig(entriesCol, 'timesheet entries collection');
  ensureDatabaseConfig(incidentsCol, 'incidents collection');
};

const clampLimit = (value, fallback = DEFAULT_LIMIT) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, MAX_LIMIT);
};

const asIso = (value, field) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid ${field}: ${value}`);
  }
  return date.toISOString();
};

const toDayStartIso = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0)).toISOString();
};

const toDayEndIso = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999)).toISOString();
};

const parseTimeToMinutes = (value) => {
  const str = String(value || '');
  const [hh, mm] = str.split(':');
  const h = Number(hh);
  const m = Number(mm);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
};

const shiftDurationHours = (shift) => {
  const start = parseTimeToMinutes(shift.startTime);
  const end = parseTimeToMinutes(shift.endTime);
  if (start === null || end === null) return 0;
  let diff = end - start;
  if (diff <= 0) diff += 24 * 60;
  return diff / 60;
};

const listAllDocuments = async (collectionId, baseQueries = []) => {
  const all = [];
  let offset = 0;

  while (true) {
    const response = await databases.listDocuments(dbId, collectionId, [
      ...baseQueries,
      Query.limit(PAGE_LIMIT),
      Query.offset(offset),
    ]);

    all.push(...response.documents);

    if (response.documents.length < PAGE_LIMIT) break;
    if (response.total && all.length >= response.total) break;
    offset += PAGE_LIMIT;
  }

  return all;
};

const toContractQueries = (contract, rangeStartIso, rangeEndIso, scope) => {
  const shiftQueries = [
    Query.greaterThanEqual('date', rangeStartIso),
    Query.lessThanEqual('date', rangeEndIso),
    Query.equal('clientId', String(contract.clientId)),
    ...scopeQueries(RESOURCE_TYPES.SHIFTS, scope),
  ];

  const entryQueries = [
    Query.equal('status', 'approved'),
    Query.greaterThanEqual('workDate', rangeStartIso),
    Query.lessThanEqual('workDate', rangeEndIso),
    Query.equal('clientId', String(contract.clientId)),
    ...scopeQueries(RESOURCE_TYPES.TIMESHEET_ENTRIES, scope),
  ];

  const incidentQueries = [
    Query.greaterThanEqual('createdAt', rangeStartIso),
    Query.lessThanEqual('createdAt', rangeEndIso),
    Query.equal('clientId', String(contract.clientId)),
    ...scopeQueries(RESOURCE_TYPES.INCIDENTS, scope),
  ];

  if (contract.siteId) {
    shiftQueries.push(Query.equal('siteId', String(contract.siteId)));
    entryQueries.push(Query.equal('siteId', String(contract.siteId)));
    incidentQueries.push(Query.equal('siteId', String(contract.siteId)));
  }

  return {
    shiftQueries,
    entryQueries,
    incidentQueries,
  };
};

const computeWindowMetrics = ({ shifts, entries, incidents }) => {
  const scheduledHours = shifts.reduce((sum, shift) => {
    const headcount = Math.max(1, Number(shift.requiredHeadcount || shift.positionsOpen || 1));
    return sum + shiftDurationHours(shift) * headcount;
  }, 0);

  const workedHours = entries.reduce((sum, entry) => sum + Number(entry.minutesPayable || 0) / 60, 0);

  const billRates = shifts
    .map((shift) => Number(shift.hourlyRate))
    .filter((value) => Number.isFinite(value) && value > 0);

  const avgBillRate = billRates.length > 0
    ? billRates.reduce((sum, value) => sum + value, 0) / billRates.length
    : 0;

  const revenue = workedHours * avgBillRate;

  const estimatedCostRate = avgBillRate > 0 ? avgBillRate * 0.72 : 0;
  const cost = workedHours * estimatedCostRate;

  const grossProfit = revenue - cost;
  const grossMarginPct = revenue > 0 ? (grossProfit / revenue) * 100 : 0;

  const coverageRatio = scheduledHours > 0 ? workedHours / scheduledHours : 1;
  const slaComplianceScore = Math.max(0, Math.min(1, coverageRatio));

  const incidentRate = shifts.length > 0 ? incidents.length / shifts.length : 0;

  return {
    scheduledHours,
    workedHours,
    revenue,
    cost,
    grossProfit,
    grossMarginPct,
    slaComplianceScore,
    incidentRate,
    shiftCount: shifts.length,
    incidentCount: incidents.length,
  };
};

const computeRisk = ({ current, previous }) => {
  const marginTrend = current.grossMarginPct - previous.grossMarginPct;
  const revenueTrend = previous.revenue > 0
    ? (current.revenue - previous.revenue) / previous.revenue
    : 0;

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
};

export const runContractHealthIntelligence = async (
  {
    periodStart,
    periodEnd,
    riskThreshold = DEFAULT_RISK_THRESHOLD,
    dryRun = false,
  } = {},
  actor = null,
) => {
  ensureCollections();

  const { actor: resolvedActor, scope } = await getAuthorizedScope({
    actor,
    permission: PERMISSIONS.VIEW_REPORTS,
  });

  if (String(scope.role || '') === ROLES.STAFF) {
    throw new Error('Permission denied: staff cannot run contract intelligence.');
  }

  const currentStart = asIso(periodStart, 'periodStart');
  const currentEnd = asIso(periodEnd, 'periodEnd');

  const currentStartTime = new Date(currentStart).getTime();
  const currentEndTime = new Date(currentEnd).getTime();
  if (currentEndTime <= currentStartTime) {
    throw new Error('periodEnd must be after periodStart.');
  }

  const durationMs = currentEndTime - currentStartTime + 1;
  const previousEnd = new Date(currentStartTime - 1).toISOString();
  const previousStart = new Date(currentStartTime - durationMs).toISOString();

  const contracts = await listAllDocuments(contractsCol, [
    ...scopeQueries(RESOURCE_TYPES.CONTRACTS, scope),
  ]);

  let snapshotsCreated = 0;
  let riskAlerts = 0;

  for (const contract of contracts) {
    const currentQueries = toContractQueries(contract, currentStart, currentEnd, scope);
    const previousQueries = toContractQueries(contract, previousStart, previousEnd, scope);

    const [
      currentShifts,
      currentEntries,
      currentIncidents,
      previousShifts,
      previousEntries,
      previousIncidents,
    ] = await Promise.all([
      listAllDocuments(shiftsCol, currentQueries.shiftQueries),
      listAllDocuments(entriesCol, currentQueries.entryQueries),
      listAllDocuments(incidentsCol, currentQueries.incidentQueries),
      listAllDocuments(shiftsCol, previousQueries.shiftQueries),
      listAllDocuments(entriesCol, previousQueries.entryQueries),
      listAllDocuments(incidentsCol, previousQueries.incidentQueries),
    ]);

    const currentMetrics = computeWindowMetrics({
      shifts: currentShifts,
      entries: currentEntries,
      incidents: currentIncidents,
    });

    const previousMetrics = computeWindowMetrics({
      shifts: previousShifts,
      entries: previousEntries,
      incidents: previousIncidents,
    });

    const risk = computeRisk({
      current: currentMetrics,
      previous: previousMetrics,
    });

    const snapshotPayload = {
      contractId: contract.$id,
      marginTrend: Number(risk.marginTrend.toFixed(6)),
      slaComplianceScore: Number(currentMetrics.slaComplianceScore.toFixed(6)),
      incidentRate: Number(currentMetrics.incidentRate.toFixed(6)),
      revenueTrend: Number(risk.revenueTrend.toFixed(6)),
      riskScore: Number(risk.riskScore.toFixed(6)),
      generatedAt: new Date().toISOString(),
    };

    let snapshotId = null;

    if (!dryRun) {
      const snapshot = await databases.createDocument(dbId, snapshotsCol, ID.unique(), snapshotPayload);
      snapshotId = snapshot.$id;
      snapshotsCreated += 1;

      await databases.updateDocument(dbId, contractsCol, contract.$id, {
        lastReviewAt: new Date().toISOString(),
        healthScore: Number((1 - risk.riskScore).toFixed(6)),
        updatedAt: new Date().toISOString(),
      });
    } else {
      snapshotsCreated += 1;
    }

    if (risk.riskScore > Number(riskThreshold)) {
      if (!dryRun) {
        const alert = await createMarginAlert({
          clientId: contract.clientId,
          siteId: contract.siteId || contract.clientId,
          periodStart: toDayStartIso(currentStart),
          periodEnd: toDayEndIso(currentEnd),
          alertType: 'contract_risk',
          thresholdValue: Number(riskThreshold),
          actualValue: Number(risk.riskScore),
          severity: risk.riskScore >= Number(riskThreshold) * 1.4 ? 'critical' : 'warning',
        }, resolvedActor);

        if (alert.created) {
          riskAlerts += 1;

          await logEvent({
            actorId: resolvedActor.$id,
            action: 'CONTRACT_RISK_ALERT',
            resourceType: RESOURCE_TYPES.MARGIN_ALERTS,
            resourceId: alert.alert.$id,
            clientId: contract.clientId || null,
            siteId: contract.siteId || null,
            metadata: {
              contractId: contract.$id,
              riskScore: risk.riskScore,
              riskThreshold: Number(riskThreshold),
              snapshotId,
            },
          });
        }
      } else {
        riskAlerts += 1;
      }
    }
  }

  await logEvent({
    actorId: resolvedActor.$id,
    action: 'CONTRACT_HEALTH_RUN_COMPLETED',
    resourceType: RESOURCE_TYPES.CONTRACT_HEALTH_SNAPSHOTS,
    resourceId: null,
    metadata: {
      periodStart: currentStart,
      periodEnd: currentEnd,
      previousStart,
      previousEnd,
      dryRun,
      contracts: contracts.length,
      snapshotsCreated,
      riskAlerts,
      riskThreshold: Number(riskThreshold),
      windowDays: Number((durationMs / DAY_MS).toFixed(2)),
    },
  });

  return {
    dryRun,
    periodStart: currentStart,
    periodEnd: currentEnd,
    contractsScanned: contracts.length,
    snapshotsCreated,
    riskAlerts,
    riskThreshold: Number(riskThreshold),
  };
};

export const listContractHealthSnapshots = async (
  { filters = {}, limit = DEFAULT_LIMIT, cursor = null } = {},
  actor = null,
) => {
  ensureCollections();

  const { scope } = await getAuthorizedScope({
    actor,
    permission: PERMISSIONS.VIEW_REPORTS,
  });

  if (String(scope.role || '') === ROLES.STAFF) {
    throw new Error('Permission denied: staff cannot view contract health snapshots.');
  }

  const safeLimit = clampLimit(limit, DEFAULT_LIMIT);
  const queries = [Query.orderDesc('generatedAt'), Query.limit(safeLimit)];

  if (cursor) queries.push(Query.cursorAfter(String(cursor)));
  if (filters?.contractId) queries.push(Query.equal('contractId', String(filters.contractId)));

  const response = await databases.listDocuments(dbId, snapshotsCol, queries);

  const scoped = [];
  for (const doc of response.documents) {
    const contract = await databases.getDocument(dbId, contractsCol, doc.contractId);
    assertScopedDocument(RESOURCE_TYPES.CONTRACTS, contract, scope);
    scoped.push(doc);
  }

  const last = response.documents[response.documents.length - 1] || null;

  return {
    documents: scoped,
    total: response.total,
    nextCursor: response.documents.length >= safeLimit && last ? last.$id : null,
  };
};
