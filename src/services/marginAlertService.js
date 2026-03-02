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
import { notifyMarginAlertCreated } from './notificationService.js';

const dbId = config.databaseId;
const marginAlertsCol = config.marginAlertsCollectionId || 'margin_alerts';
const shiftsCol = config.shiftsCollectionId || 'shifts';
const entriesCol = config.timesheetEntriesCollectionId || 'timesheet_entries';
const demandPredictionsCol = config.demandPredictionsCollectionId || 'demand_predictions';
const guardsCol = config.guardsCollectionId || 'guards';

const DAY_MS = 24 * 60 * 60 * 1000;
const PAGE_LIMIT = 100;
const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

const DEFAULT_THRESHOLDS = Object.freeze({
  marginPct: 18,
  spikeMultiplier: 1.75,
  slaCoverageRatio: 0.92,
  staffingShortageScore: 0.2,
  lookbackDays: 28,
});

const ensureCollections = () => {
  ensureDatabaseConfig(marginAlertsCol, 'margin alerts collection');
  ensureDatabaseConfig(shiftsCol, 'shifts collection');
  ensureDatabaseConfig(entriesCol, 'timesheet entries collection');
  ensureDatabaseConfig(demandPredictionsCol, 'demand predictions collection');
  ensureDatabaseConfig(guardsCol, 'guards collection');
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

const startOfUtcDayIso = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0)).toISOString();
};

const endOfUtcDayIso = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999)).toISOString();
};

const toKey = (clientId, siteId) => `${String(clientId || 'unknown')}::${String(siteId || 'unknown')}`;

const parseTimeToMinutes = (value) => {
  const str = String(value || '');
  const parts = str.split(':');
  if (parts.length < 2) return null;
  const hh = Number(parts[0]);
  const mm = Number(parts[1]);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  return hh * 60 + mm;
};

const calculateShiftDurationHours = (shift) => {
  const start = parseTimeToMinutes(shift.startTime);
  const end = parseTimeToMinutes(shift.endTime);

  if (start === null || end === null) {
    return 0;
  }

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

const listGuardsByIds = async (guardIds = []) => {
  const map = new Map();
  for (let i = 0; i < guardIds.length; i += 100) {
    const batch = guardIds.slice(i, i + 100);
    if (!batch.length) continue;

    const response = await databases.listDocuments(dbId, guardsCol, [
      Query.equal('$id', batch),
      Query.limit(batch.length),
    ]);

    for (const doc of response.documents) {
      map.set(String(doc.$id), doc);
    }
  }

  return map;
};

const aggregateMetrics = ({ shifts, entries, guardsById }) => {
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
        grossRevenue: 0,
        grossCost: 0,
        billRates: [],
        guardIds: new Set(),
        shiftCount: 0,
      });
    }

    const bucket = grouped.get(key);
    const requiredHeadcount = Math.max(1, Number(shift.requiredHeadcount || shift.positionsOpen || 1));
    const durationHours = calculateShiftDurationHours(shift);
    const scheduledHours = Math.max(0, durationHours * requiredHeadcount);

    bucket.scheduledHours += scheduledHours;
    bucket.shiftCount += 1;

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
        grossRevenue: 0,
        grossCost: 0,
        billRates: [],
        guardIds: new Set(),
        shiftCount: 0,
      });
    }

    const bucket = grouped.get(key);
    const payableHours = Number(entry.minutesPayable || 0) / 60;
    bucket.workedHours += payableHours;
    bucket.overtimeHours += Math.max(0, (Number(entry.minutesPayable || 0) - 8 * 60) / 60);

    const guardId = String(entry.guardId || '');
    if (guardId) {
      bucket.guardIds.add(guardId);
      const guard = guardsById.get(guardId);
      const payRate = Number(guard?.payRate);
      if (Number.isFinite(payRate) && payRate > 0) {
        bucket.grossCost += payableHours * payRate;
      }
    }
  }

  const metrics = [];

  for (const item of grouped.values()) {
    const avgBillRate = item.billRates.length > 0
      ? item.billRates.reduce((sum, value) => sum + value, 0) / item.billRates.length
      : 0;

    item.grossRevenue = item.workedHours * avgBillRate;

    const grossProfit = item.grossRevenue - item.grossCost;
    const grossMarginPct = item.grossRevenue > 0 ? (grossProfit / item.grossRevenue) * 100 : 0;
    const coverageRatio = item.scheduledHours > 0 ? item.workedHours / item.scheduledHours : 1;

    metrics.push({
      clientId: item.clientId,
      siteId: item.siteId,
      scheduledHours: item.scheduledHours,
      workedHours: item.workedHours,
      overtimeHours: item.overtimeHours,
      grossRevenue: item.grossRevenue,
      grossCost: item.grossCost,
      grossProfit,
      grossMarginPct,
      coverageRatio,
      activeGuards: item.guardIds.size,
      shiftCount: item.shiftCount,
    });
  }

  return metrics;
};

const buildHistoricalOvertimeMap = async ({ rangeStartIso, lookbackDays, scope }) => {
  const lookbackStart = new Date(new Date(rangeStartIso).getTime() - lookbackDays * DAY_MS).toISOString();
  const lookbackEnd = new Date(new Date(rangeStartIso).getTime() - 1).toISOString();

  const historicalEntries = await listAllDocuments(entriesCol, [
    Query.equal('status', 'approved'),
    Query.greaterThanEqual('workDate', lookbackStart),
    Query.lessThanEqual('workDate', lookbackEnd),
    ...scopeQueries(RESOURCE_TYPES.TIMESHEET_ENTRIES, scope),
  ]);

  const map = new Map();

  for (const entry of historicalEntries) {
    const key = toKey(entry.clientId, entry.siteId);
    const overtimeHours = Math.max(0, (Number(entry.minutesPayable || 0) - 8 * 60) / 60);

    if (!map.has(key)) {
      map.set(key, { totalOvertimeHours: 0 });
    }

    map.get(key).totalOvertimeHours += overtimeHours;
  }

  const weeks = Math.max(1, Math.ceil(lookbackDays / 7));
  const averages = new Map();

  for (const [key, value] of map.entries()) {
    averages.set(key, value.totalOvertimeHours / weeks);
  }

  return averages;
};

const toSeverity = (value, threshold, criticalMultiplier = 1.35) => {
  if (value >= threshold * criticalMultiplier) return 'critical';
  return 'warning';
};

export const createMarginAlert = async (
  {
    clientId,
    siteId,
    shiftId = null,
    periodStart,
    periodEnd,
    alertType,
    thresholdValue,
    actualValue,
    severity = 'warning',
  } = {},
  actor = null,
) => {
  ensureCollections();

  if (!clientId || !siteId) {
    throw new Error('clientId and siteId are required to create a margin alert.');
  }

  if (!alertType) {
    throw new Error('alertType is required to create a margin alert.');
  }

  const startIso = asIso(periodStart, 'periodStart');
  const endIso = asIso(periodEnd, 'periodEnd');

  const { actor: resolvedActor, scope } = await getAuthorizedScope({
    actor,
    permission: PERMISSIONS.VIEW_REPORTS,
  });

  if (String(scope.role || '') === ROLES.STAFF) {
    throw new Error('Permission denied: staff cannot create margin alerts.');
  }

  const dedupeQueries = [
    Query.equal('clientId', String(clientId)),
    Query.equal('siteId', String(siteId)),
    Query.equal('alertType', String(alertType)),
    Query.equal('periodStart', startIso),
    Query.equal('periodEnd', endIso),
    Query.equal('resolved', false),
    Query.limit(1),
  ];

  if (shiftId) {
    dedupeQueries.push(Query.equal('shiftId', String(shiftId)));
  }

  const existing = await databases.listDocuments(dbId, marginAlertsCol, dedupeQueries);
  if (existing.documents.length > 0) {
    return {
      created: false,
      alert: existing.documents[0],
    };
  }

  const alert = await databases.createDocument(dbId, marginAlertsCol, ID.unique(), {
    clientId: String(clientId),
    siteId: String(siteId),
    shiftId: shiftId || null,
    periodStart: startIso,
    periodEnd: endIso,
    alertType: String(alertType),
    thresholdValue: Number(thresholdValue),
    actualValue: Number(actualValue),
    severity: String(severity || 'warning'),
    resolved: false,
    resolvedAt: null,
    createdAt: new Date().toISOString(),
  });

  await logEvent({
    actorId: resolvedActor.$id,
    action: 'MARGIN_ALERT_CREATED',
    resourceType: RESOURCE_TYPES.MARGIN_ALERTS,
    resourceId: alert.$id,
    clientId: alert.clientId || null,
    siteId: alert.siteId || null,
    metadata: {
      alertType: alert.alertType,
      thresholdValue: Number(thresholdValue),
      actualValue: Number(actualValue),
      severity: alert.severity,
      periodStart: alert.periodStart,
      periodEnd: alert.periodEnd,
    },
  });

  try {
    await notifyMarginAlertCreated({
      alertType: alert.alertType,
      severity: alert.severity,
      thresholdValue: Number(thresholdValue),
      actualValue: Number(actualValue),
      periodStart: alert.periodStart,
      periodEnd: alert.periodEnd,
      clientId: alert.clientId,
      siteId: alert.siteId,
      shiftId: alert.shiftId || null,
      userId: resolvedActor.$id,
    });
  } catch (notifyError) {
    console.error('[marginAlertService] Failed to enqueue margin alert notification:', notifyError);
  }

  return {
    created: true,
    alert,
  };
};

export const runMarginMonitoring = async (
  {
    periodStart,
    periodEnd,
    thresholds = {},
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
    throw new Error('Permission denied: staff cannot run margin monitoring.');
  }

  const startIso = asIso(periodStart, 'periodStart');
  const endIso = asIso(periodEnd, 'periodEnd');
  const appliedThresholds = {
    ...DEFAULT_THRESHOLDS,
    ...(thresholds || {}),
  };

  const [shifts, entries, demandPredictions] = await Promise.all([
    listAllDocuments(shiftsCol, [
      Query.greaterThanEqual('date', startIso),
      Query.lessThanEqual('date', endIso),
      ...scopeQueries(RESOURCE_TYPES.SHIFTS, scope),
    ]),
    listAllDocuments(entriesCol, [
      Query.equal('status', 'approved'),
      Query.greaterThanEqual('workDate', startIso),
      Query.lessThanEqual('workDate', endIso),
      ...scopeQueries(RESOURCE_TYPES.TIMESHEET_ENTRIES, scope),
    ]),
    listAllDocuments(demandPredictionsCol, [
      Query.greaterThanEqual('date', startIso),
      Query.lessThanEqual('date', endIso),
      ...scopeQueries(RESOURCE_TYPES.DEMAND_PREDICTIONS, scope),
    ]),
  ]);

  const guardIds = Array.from(new Set(entries.map((entry) => String(entry.guardId || '')).filter(Boolean)));
  const guardsById = await listGuardsByIds(guardIds);

  const metrics = aggregateMetrics({ shifts, entries, guardsById });
  const historicalOvertime = await buildHistoricalOvertimeMap({
    rangeStartIso: startIso,
    lookbackDays: Number(appliedThresholds.lookbackDays || DEFAULT_THRESHOLDS.lookbackDays),
    scope,
  });

  const alerts = [];
  const pushAlert = (alert) => alerts.push(alert);

  for (const metric of metrics) {
    const key = toKey(metric.clientId, metric.siteId);
    const historicalAvgOvertime = Number(historicalOvertime.get(key) || 0);

    if (metric.grossMarginPct < Number(appliedThresholds.marginPct)) {
      pushAlert({
        clientId: metric.clientId,
        siteId: metric.siteId,
        periodStart: startIso,
        periodEnd: endIso,
        alertType: 'low_margin',
        thresholdValue: Number(appliedThresholds.marginPct),
        actualValue: Number(metric.grossMarginPct),
        severity: toSeverity(Number(appliedThresholds.marginPct) - Number(metric.grossMarginPct), Number(appliedThresholds.marginPct) * 0.35),
      });
    }

    if (metric.grossProfit < 0) {
      pushAlert({
        clientId: metric.clientId,
        siteId: metric.siteId,
        periodStart: startIso,
        periodEnd: endIso,
        alertType: 'negative_margin',
        thresholdValue: 0,
        actualValue: Number(metric.grossProfit),
        severity: 'critical',
      });
    }

    const overtimeThreshold = historicalAvgOvertime * Number(appliedThresholds.spikeMultiplier);
    if (
      metric.overtimeHours > 0 &&
      ((historicalAvgOvertime > 0 && metric.overtimeHours > overtimeThreshold) ||
        (historicalAvgOvertime === 0 && metric.overtimeHours >= 8))
    ) {
      pushAlert({
        clientId: metric.clientId,
        siteId: metric.siteId,
        periodStart: startIso,
        periodEnd: endIso,
        alertType: 'overtime_spike',
        thresholdValue: Number(overtimeThreshold || Number(appliedThresholds.spikeMultiplier)),
        actualValue: Number(metric.overtimeHours),
        severity: toSeverity(metric.overtimeHours, Math.max(1, overtimeThreshold || 1), 1.5),
      });
    }

    if (metric.scheduledHours > 0 && metric.coverageRatio < Number(appliedThresholds.slaCoverageRatio)) {
      pushAlert({
        clientId: metric.clientId,
        siteId: metric.siteId,
        periodStart: startIso,
        periodEnd: endIso,
        alertType: 'under_coverage',
        thresholdValue: Number(appliedThresholds.slaCoverageRatio),
        actualValue: Number(metric.coverageRatio),
        severity: metric.coverageRatio < Number(appliedThresholds.slaCoverageRatio) * 0.8 ? 'critical' : 'warning',
      });
    }
  }

  for (const prediction of demandPredictions) {
    const required = Number(prediction.predictedRequiredGuards || 0);
    const available = Number(prediction.predictedAvailableGuards || 0);
    const score =
      Number(prediction.shortageRiskScore) ||
      (required > 0 ? (required - available) / required : 0);

    if (score > Number(appliedThresholds.staffingShortageScore)) {
      pushAlert({
        clientId: prediction.clientId,
        siteId: prediction.siteId,
        periodStart: startOfUtcDayIso(prediction.date) || startIso,
        periodEnd: endOfUtcDayIso(prediction.date) || endIso,
        alertType: 'staffing_shortage',
        thresholdValue: Number(appliedThresholds.staffingShortageScore),
        actualValue: Number(score),
        severity: score >= Number(appliedThresholds.staffingShortageScore) * 1.5 ? 'critical' : 'warning',
      });
    }
  }

  let created = 0;
  let skipped = 0;

  for (const candidate of alerts) {
    if (dryRun) {
      created += 1;
      continue;
    }

    try {
      const result = await createMarginAlert(candidate, resolvedActor);
      if (result.created) created += 1;
      else skipped += 1;
    } catch (error) {
      console.error('[marginAlertService] Failed to create alert candidate:', error, candidate);
    }
  }

  return {
    dryRun,
    periodStart: startIso,
    periodEnd: endIso,
    thresholds: appliedThresholds,
    scanned: {
      shifts: shifts.length,
      entries: entries.length,
      demandPredictions: demandPredictions.length,
      groups: metrics.length,
    },
    alerts: {
      candidates: alerts.length,
      created,
      skipped,
    },
    metrics,
  };
};

export const listMarginAlerts = async (
  { filters = {}, limit = DEFAULT_LIMIT, cursor = null } = {},
  actor = null,
) => {
  ensureCollections();

  const { scope } = await getAuthorizedScope({
    actor,
    permission: PERMISSIONS.VIEW_REPORTS,
  });

  if (String(scope.role || '') === ROLES.STAFF) {
    throw new Error('Permission denied: staff cannot view margin alerts.');
  }

  const safeLimit = clampLimit(limit, DEFAULT_LIMIT);
  const queries = [
    Query.orderDesc('createdAt'),
    Query.limit(safeLimit),
    ...scopeQueries(RESOURCE_TYPES.MARGIN_ALERTS, scope),
  ];

  if (cursor) queries.push(Query.cursorAfter(String(cursor)));
  if (filters?.clientId) queries.push(Query.equal('clientId', String(filters.clientId)));
  if (filters?.siteId) queries.push(Query.equal('siteId', String(filters.siteId)));
  if (filters?.alertType) queries.push(Query.equal('alertType', String(filters.alertType)));
  if (filters?.severity) queries.push(Query.equal('severity', String(filters.severity)));
  if (typeof filters?.resolved === 'boolean') queries.push(Query.equal('resolved', filters.resolved));

  const response = await databases.listDocuments(dbId, marginAlertsCol, queries);
  const last = response.documents[response.documents.length - 1] || null;

  return {
    documents: response.documents,
    total: response.total,
    nextCursor: response.documents.length >= safeLimit && last ? last.$id : null,
  };
};

export const resolveMarginAlert = async (alertId, actor = null) => {
  ensureCollections();

  const { actor: resolvedActor, scope } = await getAuthorizedScope({
    actor,
    permission: PERMISSIONS.VIEW_REPORTS,
  });

  if (String(scope.role || '') === ROLES.STAFF) {
    throw new Error('Permission denied: staff cannot resolve margin alerts.');
  }

  const existing = await databases.getDocument(dbId, marginAlertsCol, String(alertId));
  assertScopedDocument(RESOURCE_TYPES.MARGIN_ALERTS, existing, scope);

  const updated = await databases.updateDocument(dbId, marginAlertsCol, existing.$id, {
    resolved: true,
    resolvedAt: new Date().toISOString(),
  });

  await logEvent({
    actorId: resolvedActor.$id,
    action: 'MARGIN_ALERT_RESOLVED',
    resourceType: RESOURCE_TYPES.MARGIN_ALERTS,
    resourceId: updated.$id,
    clientId: updated.clientId || null,
    siteId: updated.siteId || null,
    metadata: {
      previousResolved: Boolean(existing.resolved),
      nextResolved: true,
    },
  });

  return updated;
};
