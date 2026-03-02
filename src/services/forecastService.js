import { ID, Query } from 'appwrite';
import { databases, config } from '../lib/appwrite.js';
import { PERMISSIONS, ROLES } from '../lib/rbac.ts';
import {
  ensureDatabaseConfig,
  getAuthorizedScope,
} from '../lib/serviceSecurity.js';
import { RESOURCE_TYPES, scopeQueries } from '../lib/tenancyScope.js';
import { logEvent } from './auditLogService.js';
import { createMarginAlert } from './marginAlertService.js';

const dbId = config.databaseId;
const modelsCol = config.forecastModelsCollectionId || 'forecast_models';
const snapshotsCol = config.forecastSnapshotsCollectionId || 'forecast_snapshots';
const demandPredictionsCol = config.demandPredictionsCollectionId || 'demand_predictions';
const entriesCol = config.timesheetEntriesCollectionId || 'timesheet_entries';
const shiftsCol = config.shiftsCollectionId || 'shifts';
const guardsCol = config.guardsCollectionId || 'guards';

const DAY_MS = 24 * 60 * 60 * 1000;
const PAGE_LIMIT = 100;
const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

const DEFAULT_LOOKBACK_DAYS = 28;
const DEFAULT_STAFFING_THRESHOLD = 0.2;

const ensureCollections = () => {
  ensureDatabaseConfig(modelsCol, 'forecast models collection');
  ensureDatabaseConfig(snapshotsCol, 'forecast snapshots collection');
  ensureDatabaseConfig(demandPredictionsCol, 'demand predictions collection');
  ensureDatabaseConfig(entriesCol, 'timesheet entries collection');
  ensureDatabaseConfig(shiftsCol, 'shifts collection');
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

const asDateOnlyIso = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0)).toISOString();
};

const endOfDayIso = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999)).toISOString();
};

const toKey = (clientId, siteId) => `${String(clientId || 'unknown')}::${String(siteId || 'unknown')}`;

const parseTimeToMinutes = (value) => {
  const str = String(value || '');
  const [h, m] = str.split(':');
  const hh = Number(h);
  const mm = Number(m);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  return hh * 60 + mm;
};

const calculateShiftDurationHours = (shift) => {
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

const listGuardsByIds = async (ids = []) => {
  const map = new Map();
  for (let i = 0; i < ids.length; i += 100) {
    const batch = ids.slice(i, i + 100);
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

const getWeeksInWindow = (lookbackDays) => Math.max(1, Math.ceil(Math.max(1, Number(lookbackDays || DEFAULT_LOOKBACK_DAYS)) / 7));

const computeRates = ({ entries = [], shifts = [], guardsById }) => {
  const workedHours = entries.reduce((sum, entry) => sum + Number(entry.minutesPayable || 0) / 60, 0);

  const billRates = shifts
    .map((shift) => Number(shift.hourlyRate))
    .filter((value) => Number.isFinite(value) && value > 0);

  const averageBillRate = billRates.length > 0
    ? billRates.reduce((sum, value) => sum + value, 0) / billRates.length
    : 0;

  let totalCost = 0;
  for (const entry of entries) {
    const guard = guardsById.get(String(entry.guardId || ''));
    const payRate = Number(guard?.payRate);
    const payableHours = Number(entry.minutesPayable || 0) / 60;
    if (Number.isFinite(payRate) && payRate > 0) {
      totalCost += payableHours * payRate;
    }
  }

  const effectiveCostRate = workedHours > 0 ? totalCost / workedHours : 0;

  return {
    workedHours,
    averageBillRate,
    effectiveCostRate,
  };
};

const getActiveModels = async (scope) => {
  const models = await listAllDocuments(modelsCol, [
    Query.equal('active', true),
    ...scopeQueries(RESOURCE_TYPES.FORECAST_MODELS, scope),
  ]);

  if (models.length > 0) {
    return models;
  }

  // Auto-derive a fallback rolling-average model per active client/site pair if none are configured.
  const recentEntries = await listAllDocuments(entriesCol, [
    Query.equal('status', 'approved'),
    Query.orderDesc('workDate'),
    Query.limit(500),
    ...scopeQueries(RESOURCE_TYPES.TIMESHEET_ENTRIES, scope),
  ]);

  const byKey = new Map();
  for (const entry of recentEntries) {
    if (!entry.clientId || !entry.siteId) continue;
    const key = toKey(entry.clientId, entry.siteId);
    if (!byKey.has(key)) {
      byKey.set(key, {
        clientId: entry.clientId,
        siteId: entry.siteId,
        modelType: 'rolling_average',
        lookbackDays: DEFAULT_LOOKBACK_DAYS,
        parameters: {},
        active: true,
      });
    }
  }

  return Array.from(byKey.values());
};

const buildPeriodForModel = ({ periodStart, periodEnd }) => ({
  periodStart: asIso(periodStart, 'periodStart'),
  periodEnd: asIso(periodEnd, 'periodEnd'),
});

const computeShortageScore = (predictedRequired, predictedAvailable) => {
  const required = Number(predictedRequired || 0);
  const available = Number(predictedAvailable || 0);
  if (!Number.isFinite(required) || required <= 0) return 0;
  return Math.max(0, (required - available) / required);
};

export const runForecastSnapshots = async (
  {
    periodStart,
    periodEnd,
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
    throw new Error('Permission denied: staff cannot run forecast snapshots.');
  }

  const period = buildPeriodForModel({ periodStart, periodEnd });
  const models = await getActiveModels(scope);

  let created = 0;

  for (const model of models) {
    const lookbackDays = Number(model.lookbackDays || DEFAULT_LOOKBACK_DAYS);
    const lookbackStart = new Date(new Date(period.periodStart).getTime() - lookbackDays * DAY_MS).toISOString();
    const lookbackEnd = new Date(new Date(period.periodStart).getTime() - 1).toISOString();

    const entryQueries = [
      Query.equal('status', 'approved'),
      Query.greaterThanEqual('workDate', lookbackStart),
      Query.lessThanEqual('workDate', lookbackEnd),
      Query.equal('clientId', String(model.clientId)),
      ...scopeQueries(RESOURCE_TYPES.TIMESHEET_ENTRIES, scope),
    ];
    if (model.siteId) entryQueries.push(Query.equal('siteId', String(model.siteId)));

    const shiftQueries = [
      Query.greaterThanEqual('date', lookbackStart),
      Query.lessThanEqual('date', lookbackEnd),
      Query.equal('clientId', String(model.clientId)),
      ...scopeQueries(RESOURCE_TYPES.SHIFTS, scope),
    ];
    if (model.siteId) shiftQueries.push(Query.equal('siteId', String(model.siteId)));

    const entries = await listAllDocuments(entriesCol, entryQueries);
    const shifts = await listAllDocuments(shiftsCol, shiftQueries);

    const guardIds = Array.from(new Set(entries.map((entry) => String(entry.guardId || '')).filter(Boolean)));
    const guardsById = await listGuardsByIds(guardIds);

    const rates = computeRates({ entries, shifts, guardsById });
    const weeks = getWeeksInWindow(lookbackDays);
    const predictedHours = rates.workedHours / weeks;

    const payload = {
      clientId: String(model.clientId),
      siteId: String(model.siteId || 'all-sites'),
      periodStart: period.periodStart,
      periodEnd: period.periodEnd,
      predictedHours: Number(predictedHours.toFixed(4)),
      predictedRevenue: Number((predictedHours * rates.averageBillRate).toFixed(4)),
      predictedCost: Number((predictedHours * rates.effectiveCostRate).toFixed(4)),
      generatedAt: new Date().toISOString(),
    };

    if (!dryRun) {
      await databases.createDocument(dbId, snapshotsCol, ID.unique(), payload);
      created += 1;
    } else {
      created += 1;
    }
  }

  await logEvent({
    actorId: resolvedActor.$id,
    action: 'FORECAST_SNAPSHOTS_GENERATED',
    resourceType: RESOURCE_TYPES.FORECAST_SNAPSHOTS,
    resourceId: null,
    metadata: {
      periodStart: period.periodStart,
      periodEnd: period.periodEnd,
      modelCount: models.length,
      dryRun,
      created,
    },
  });

  return {
    dryRun,
    periodStart: period.periodStart,
    periodEnd: period.periodEnd,
    modelCount: models.length,
    snapshotsCreated: created,
  };
};

export const runDemandPredictions = async (
  {
    date,
    lookbackDays = DEFAULT_LOOKBACK_DAYS,
    shortageThreshold = DEFAULT_STAFFING_THRESHOLD,
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
    throw new Error('Permission denied: staff cannot run demand predictions.');
  }

  const targetDateIso = asDateOnlyIso(date || new Date());
  const targetDateEndIso = endOfDayIso(date || new Date());
  const lookbackStart = new Date(new Date(targetDateIso).getTime() - Number(lookbackDays) * DAY_MS).toISOString();

  const [historicalShifts, historicalEntries] = await Promise.all([
    listAllDocuments(shiftsCol, [
      Query.greaterThanEqual('date', lookbackStart),
      Query.lessThanEqual('date', targetDateEndIso),
      ...scopeQueries(RESOURCE_TYPES.SHIFTS, scope),
    ]),
    listAllDocuments(entriesCol, [
      Query.equal('status', 'approved'),
      Query.greaterThanEqual('workDate', lookbackStart),
      Query.lessThanEqual('workDate', targetDateEndIso),
      ...scopeQueries(RESOURCE_TYPES.TIMESHEET_ENTRIES, scope),
    ]),
  ]);

  const grouped = new Map();

  for (const shift of historicalShifts) {
    const key = toKey(shift.clientId, shift.siteId);
    if (!grouped.has(key)) {
      grouped.set(key, {
        clientId: shift.clientId || null,
        siteId: shift.siteId || null,
        requiredHeadcountTotal: 0,
        shiftCount: 0,
        attendedShifts: 0,
        activeGuardIds: new Set(),
      });
    }

    const bucket = grouped.get(key);
    bucket.requiredHeadcountTotal += Math.max(1, Number(shift.requiredHeadcount || shift.positionsOpen || 1));
    bucket.shiftCount += 1;
  }

  for (const entry of historicalEntries) {
    const key = toKey(entry.clientId, entry.siteId);
    if (!grouped.has(key)) {
      grouped.set(key, {
        clientId: entry.clientId || null,
        siteId: entry.siteId || null,
        requiredHeadcountTotal: 0,
        shiftCount: 0,
        attendedShifts: 0,
        activeGuardIds: new Set(),
      });
    }

    const bucket = grouped.get(key);
    bucket.attendedShifts += 1;
    if (entry.guardId) bucket.activeGuardIds.add(String(entry.guardId));
  }

  let createdPredictions = 0;
  let shortageAlerts = 0;

  for (const bucket of grouped.values()) {
    if (!bucket.clientId || !bucket.siteId) {
      continue;
    }

    const averageRequired = bucket.shiftCount > 0
      ? bucket.requiredHeadcountTotal / bucket.shiftCount
      : 0;

    const attendanceRate = bucket.shiftCount > 0
      ? Math.min(1, bucket.attendedShifts / bucket.shiftCount)
      : 0;

    const predictedAvailable = bucket.activeGuardIds.size * attendanceRate;
    const shortageRiskScore = computeShortageScore(averageRequired, predictedAvailable);

    const predictionPayload = {
      clientId: String(bucket.clientId),
      siteId: String(bucket.siteId),
      date: targetDateIso,
      predictedRequiredGuards: Number(averageRequired.toFixed(4)),
      predictedAvailableGuards: Number(predictedAvailable.toFixed(4)),
      shortageRiskScore: Number(shortageRiskScore.toFixed(6)),
      generatedAt: new Date().toISOString(),
    };

    if (!dryRun) {
      await databases.createDocument(dbId, demandPredictionsCol, ID.unique(), predictionPayload);
      createdPredictions += 1;
    } else {
      createdPredictions += 1;
    }

    if (shortageRiskScore > Number(shortageThreshold)) {
      if (!dryRun) {
        const alert = await createMarginAlert({
          clientId: bucket.clientId,
          siteId: bucket.siteId,
          periodStart: targetDateIso,
          periodEnd: targetDateEndIso,
          alertType: 'staffing_shortage',
          thresholdValue: Number(shortageThreshold),
          actualValue: Number(shortageRiskScore),
          severity: shortageRiskScore > Number(shortageThreshold) * 1.5 ? 'critical' : 'warning',
        }, resolvedActor);

        if (alert.created) {
          shortageAlerts += 1;

          await logEvent({
            actorId: resolvedActor.$id,
            action: 'DEMAND_SHORTAGE_ALERT',
            resourceType: RESOURCE_TYPES.MARGIN_ALERTS,
            resourceId: alert.alert.$id,
            clientId: bucket.clientId || null,
            siteId: bucket.siteId || null,
            metadata: {
              shortageRiskScore,
              threshold: Number(shortageThreshold),
              date: targetDateIso,
            },
          });
        }
      } else {
        shortageAlerts += 1;
      }
    }
  }

  await logEvent({
    actorId: resolvedActor.$id,
    action: 'DEMAND_PREDICTIONS_GENERATED',
    resourceType: RESOURCE_TYPES.DEMAND_PREDICTIONS,
    resourceId: null,
    metadata: {
      date: targetDateIso,
      lookbackDays,
      shortageThreshold,
      dryRun,
      predictions: createdPredictions,
      shortageAlerts,
    },
  });

  return {
    dryRun,
    date: targetDateIso,
    lookbackDays: Number(lookbackDays),
    shortageThreshold: Number(shortageThreshold),
    predictionsCreated: createdPredictions,
    shortageAlerts,
  };
};

export const listForecastSnapshots = async (
  { filters = {}, limit = DEFAULT_LIMIT, cursor = null } = {},
  actor = null,
) => {
  ensureCollections();

  const { scope } = await getAuthorizedScope({
    actor,
    permission: PERMISSIONS.VIEW_REPORTS,
  });

  if (String(scope.role || '') === ROLES.STAFF) {
    throw new Error('Permission denied: staff cannot view forecast snapshots.');
  }

  const safeLimit = clampLimit(limit, DEFAULT_LIMIT);
  const queries = [
    Query.orderDesc('periodStart'),
    Query.limit(safeLimit),
    ...scopeQueries(RESOURCE_TYPES.FORECAST_SNAPSHOTS, scope),
  ];

  if (cursor) queries.push(Query.cursorAfter(String(cursor)));
  if (filters?.clientId) queries.push(Query.equal('clientId', String(filters.clientId)));
  if (filters?.siteId) queries.push(Query.equal('siteId', String(filters.siteId)));

  const response = await databases.listDocuments(dbId, snapshotsCol, queries);
  const last = response.documents[response.documents.length - 1] || null;

  return {
    documents: response.documents,
    total: response.total,
    nextCursor: response.documents.length >= safeLimit && last ? last.$id : null,
  };
};

export const listDemandPredictions = async (
  { filters = {}, limit = DEFAULT_LIMIT, cursor = null } = {},
  actor = null,
) => {
  ensureCollections();

  const { scope } = await getAuthorizedScope({
    actor,
    permission: PERMISSIONS.VIEW_REPORTS,
  });

  if (String(scope.role || '') === ROLES.STAFF) {
    throw new Error('Permission denied: staff cannot view demand predictions.');
  }

  const safeLimit = clampLimit(limit, DEFAULT_LIMIT);
  const queries = [
    Query.orderDesc('date'),
    Query.limit(safeLimit),
    ...scopeQueries(RESOURCE_TYPES.DEMAND_PREDICTIONS, scope),
  ];

  if (cursor) queries.push(Query.cursorAfter(String(cursor)));
  if (filters?.clientId) queries.push(Query.equal('clientId', String(filters.clientId)));
  if (filters?.siteId) queries.push(Query.equal('siteId', String(filters.siteId)));

  const response = await databases.listDocuments(dbId, demandPredictionsCol, queries);
  const last = response.documents[response.documents.length - 1] || null;

  return {
    documents: response.documents,
    total: response.total,
    nextCursor: response.documents.length >= safeLimit && last ? last.$id : null,
  };
};

export const estimateScheduledHoursByClientSite = (shifts = []) => {
  const grouped = new Map();

  for (const shift of shifts) {
    const key = toKey(shift.clientId, shift.siteId);
    if (!grouped.has(key)) {
      grouped.set(key, {
        clientId: shift.clientId || null,
        siteId: shift.siteId || null,
        scheduledHours: 0,
      });
    }

    const bucket = grouped.get(key);
    const headcount = Math.max(1, Number(shift.requiredHeadcount || shift.positionsOpen || 1));
    const shiftHours = calculateShiftDurationHours(shift) * headcount;
    bucket.scheduledHours += Math.max(0, shiftHours);
  }

  return Array.from(grouped.values());
};
