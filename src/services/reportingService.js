import { Query } from 'appwrite';
import { databases, config } from '../lib/appwrite.js';
import { PERMISSIONS, ROLES } from '../lib/rbac.ts';
import { ensureDatabaseConfig, getAuthorizedScope } from '../lib/serviceSecurity.js';
import { RESOURCE_TYPES, scopeQueries } from '../lib/tenancyScope.js';

const dbId = config.databaseId;
const shiftsCol = config.shiftsCollectionId || 'shifts';
const entriesCol = config.timesheetEntriesCollectionId || 'timesheet_entries';
const alertsCol = config.marginAlertsCollectionId || 'margin_alerts';
const forecastsCol = config.forecastSnapshotsCollectionId || 'forecast_snapshots';
const contractsCol = config.contractsCollectionId || 'contracts';
const contractHealthCol = config.contractHealthSnapshotsCollectionId || 'contract_health_snapshots';
const demandPredictionsCol = config.demandPredictionsCollectionId || 'demand_predictions';
const guardsCol = config.guardsCollectionId || 'guards';
const profitSnapshotsCol = config.profitSnapshotsCollectionId || 'profit_snapshots';
const enterpriseRiskScoresCol = config.enterpriseRiskScoresCollectionId || 'enterprise_risk_scores';
const acquisitionModelsCol = config.acquisitionModelsCollectionId || 'acquisition_models';
const strategicForecastsCol = config.strategicForecastsCollectionId || 'strategic_forecasts';
const tenderModelsCol = config.tenderModelsCollectionId || 'tender_models';
const tenderWinModelsCol = config.tenderWinModelsCollectionId || 'tender_win_models';
const concentrationAlertsCol = config.concentrationAlertsCollectionId || 'concentration_alerts';

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;
const PAGE_LIMIT = 100;

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

const toKey = (clientId, siteId) => `${String(clientId || 'unknown')}::${String(siteId || 'unknown')}`;

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

const csvEscape = (value) => {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
};

const sectionToCsv = (rows) => {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map((header) => csvEscape(row[header])).join(','));
  }
  return lines.join('\n');
};

const parseOffsetCursor = (cursor) => {
  const parsed = Number(cursor);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
};

const paginateRows = (rows, limit, cursor) => {
  const offset = parseOffsetCursor(cursor);
  const pageRows = rows.slice(offset, offset + limit);
  const nextOffset = offset + pageRows.length;
  return {
    rows: pageRows,
    total: rows.length,
    nextCursor: nextOffset < rows.length ? String(nextOffset) : null,
  };
};

const ensureCollections = () => {
  ensureDatabaseConfig(shiftsCol, 'shifts collection');
  ensureDatabaseConfig(entriesCol, 'timesheet entries collection');
  ensureDatabaseConfig(alertsCol, 'margin alerts collection');
  ensureDatabaseConfig(forecastsCol, 'forecast snapshots collection');
  ensureDatabaseConfig(contractsCol, 'contracts collection');
  ensureDatabaseConfig(contractHealthCol, 'contract health snapshots collection');
  ensureDatabaseConfig(demandPredictionsCol, 'demand predictions collection');
  ensureDatabaseConfig(guardsCol, 'guards collection');
  ensureDatabaseConfig(profitSnapshotsCol, 'profit snapshots collection');
  ensureDatabaseConfig(enterpriseRiskScoresCol, 'enterprise risk scores collection');
  ensureDatabaseConfig(acquisitionModelsCol, 'acquisition models collection');
  ensureDatabaseConfig(strategicForecastsCol, 'strategic forecasts collection');
  ensureDatabaseConfig(tenderModelsCol, 'tender models collection');
  ensureDatabaseConfig(tenderWinModelsCol, 'tender win models collection');
  ensureDatabaseConfig(concentrationAlertsCol, 'concentration alerts collection');
};

const assertAdmin = (scope) => {
  const role = String(scope.role || '');
  if (role !== ROLES.ADMIN && role !== ROLES.ENTITY_ADMIN) {
    throw new Error('Permission denied: executive dashboard is restricted to admin users.');
  }
};

const listAllDocuments = async (collectionId, queries = []) => {
  const all = [];
  let offset = 0;

  while (true) {
    const response = await databases.listDocuments(dbId, collectionId, [
      ...queries,
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

    for (const guard of response.documents) {
      map.set(String(guard.$id), guard);
    }
  }
  return map;
};

const listWindowShifts = async ({ scope, startIso, endIso }) =>
  listAllDocuments(shiftsCol, [
    Query.greaterThanEqual('date', startIso),
    Query.lessThanEqual('date', endIso),
    ...scopeQueries(RESOURCE_TYPES.SHIFTS, scope),
  ]);

const listWindowEntries = async ({ scope, startIso, endIso }) =>
  listAllDocuments(entriesCol, [
    Query.equal('status', 'approved'),
    Query.greaterThanEqual('workDate', startIso),
    Query.lessThanEqual('workDate', endIso),
    ...scopeQueries(RESOURCE_TYPES.TIMESHEET_ENTRIES, scope),
  ]);

const listMarginOverview = async ({ scope, startIso, endIso, limit, cursor }) => {
  const [shifts, entries] = await Promise.all([
    listWindowShifts({ scope, startIso, endIso }),
    listWindowEntries({ scope, startIso, endIso }),
  ]);

  const guardIds = Array.from(new Set(entries.map((entry) => String(entry.guardId || '')).filter(Boolean)));
  const guardsById = await listGuardsByIds(guardIds);

  const grouped = new Map();

  for (const shift of shifts) {
    const key = toKey(shift.clientId, shift.siteId);
    if (!grouped.has(key)) {
      grouped.set(key, {
        clientId: shift.clientId || null,
        siteId: shift.siteId || null,
        scheduledHours: 0,
        workedHours: 0,
        billRates: [],
        cost: 0,
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
        billRates: [],
        cost: 0,
      });
    }

    const bucket = grouped.get(key);
    const workedHours = Number(entry.minutesPayable || 0) / 60;
    bucket.workedHours += workedHours;

    const guard = guardsById.get(String(entry.guardId || ''));
    const payRate = Number(guard?.payRate);
    if (Number.isFinite(payRate) && payRate > 0) {
      bucket.cost += workedHours * payRate;
    }
  }

  const rows = Array.from(grouped.values()).map((bucket) => {
    const averageBillRate = bucket.billRates.length
      ? bucket.billRates.reduce((sum, value) => sum + value, 0) / bucket.billRates.length
      : 0;

    const revenue = bucket.workedHours * averageBillRate;
    const grossProfit = revenue - bucket.cost;
    const grossMarginPct = revenue > 0 ? (grossProfit / revenue) * 100 : 0;

    return {
      clientId: bucket.clientId,
      siteId: bucket.siteId,
      scheduledHours: Number(bucket.scheduledHours.toFixed(2)),
      workedHours: Number(bucket.workedHours.toFixed(2)),
      grossRevenue: Number(revenue.toFixed(2)),
      grossCost: Number(bucket.cost.toFixed(2)),
      grossProfit: Number(grossProfit.toFixed(2)),
      grossMarginPct: Number(grossMarginPct.toFixed(2)),
    };
  }).sort((a, b) => a.grossMarginPct - b.grossMarginPct);

  return paginateRows(rows, limit, cursor);
};

const listActiveMarginAlerts = async ({ scope, limit, cursor }) => {
  const queries = [
    Query.equal('resolved', false),
    Query.orderDesc('createdAt'),
    Query.limit(limit),
    ...scopeQueries(RESOURCE_TYPES.MARGIN_ALERTS, scope),
  ];

  if (cursor) queries.push(Query.cursorAfter(String(cursor)));

  const response = await databases.listDocuments(dbId, alertsCol, queries);
  const last = response.documents[response.documents.length - 1] || null;

  return {
    rows: response.documents,
    total: response.total,
    nextCursor: response.documents.length >= limit && last ? last.$id : null,
  };
};

const listEmploymentCostDistribution = async ({ scope, startIso, endIso, limit, cursor }) => {
  const entries = await listWindowEntries({ scope, startIso, endIso });
  const guardIds = Array.from(new Set(entries.map((entry) => String(entry.guardId || '')).filter(Boolean)));
  const guardsById = await listGuardsByIds(guardIds);

  const totals = {
    PAYE: 0,
    SELF_EMPLOYED: 0,
    UNKNOWN: 0,
  };

  for (const entry of entries) {
    const guard = guardsById.get(String(entry.guardId || ''));
    const employmentType = String(guard?.employmentType || 'UNKNOWN').toUpperCase();
    const payRate = Number(guard?.payRate);
    const workedHours = Number(entry.minutesPayable || 0) / 60;
    const amount = Number.isFinite(payRate) && payRate > 0 ? workedHours * payRate : 0;

    if (employmentType === 'PAYE') totals.PAYE += amount;
    else if (employmentType === 'SELF_EMPLOYED') totals.SELF_EMPLOYED += amount;
    else totals.UNKNOWN += amount;
  }

  const rows = [
    { employmentType: 'PAYE', cost: Number(totals.PAYE.toFixed(2)) },
    { employmentType: 'SELF_EMPLOYED', cost: Number(totals.SELF_EMPLOYED.toFixed(2)) },
    { employmentType: 'UNKNOWN', cost: Number(totals.UNKNOWN.toFixed(2)) },
  ];

  return paginateRows(rows, limit, cursor);
};

const listForecastVsActual = async ({ scope, startIso, endIso, limit, cursor }) => {
  const snapshotQueries = [
    Query.greaterThanEqual('periodStart', startIso),
    Query.lessThanEqual('periodEnd', endIso),
    Query.orderDesc('periodStart'),
    Query.limit(limit),
    ...scopeQueries(RESOURCE_TYPES.FORECAST_SNAPSHOTS, scope),
  ];

  if (cursor) snapshotQueries.push(Query.cursorAfter(String(cursor)));

  const snapshots = await databases.listDocuments(dbId, forecastsCol, snapshotQueries);
  const rows = [];

  for (const snapshot of snapshots.documents) {
    const entryQueries = [
      Query.equal('status', 'approved'),
      Query.greaterThanEqual('workDate', snapshot.periodStart),
      Query.lessThanEqual('workDate', snapshot.periodEnd),
      Query.equal('clientId', String(snapshot.clientId)),
      ...scopeQueries(RESOURCE_TYPES.TIMESHEET_ENTRIES, scope),
    ];

    const shiftQueries = [
      Query.greaterThanEqual('date', snapshot.periodStart),
      Query.lessThanEqual('date', snapshot.periodEnd),
      Query.equal('clientId', String(snapshot.clientId)),
      ...scopeQueries(RESOURCE_TYPES.SHIFTS, scope),
    ];

    if (snapshot.siteId) {
      entryQueries.push(Query.equal('siteId', String(snapshot.siteId)));
      shiftQueries.push(Query.equal('siteId', String(snapshot.siteId)));
    }

    const [entries, shifts] = await Promise.all([
      listAllDocuments(entriesCol, entryQueries),
      listAllDocuments(shiftsCol, shiftQueries),
    ]);

    const actualHours = entries.reduce((sum, item) => sum + Number(item.minutesPayable || 0) / 60, 0);

    const billRates = shifts
      .map((shift) => Number(shift.hourlyRate))
      .filter((value) => Number.isFinite(value) && value > 0);

    const avgBillRate = billRates.length
      ? billRates.reduce((sum, value) => sum + value, 0) / billRates.length
      : 0;

    const actualRevenue = actualHours * avgBillRate;
    const actualCost = Number(snapshot.predictedHours || 0) > 0
      ? (actualHours / Number(snapshot.predictedHours || 1)) * Number(snapshot.predictedCost || 0)
      : 0;

    rows.push({
      snapshotId: snapshot.$id,
      clientId: snapshot.clientId,
      siteId: snapshot.siteId,
      periodStart: snapshot.periodStart,
      periodEnd: snapshot.periodEnd,
      predictedHours: Number(Number(snapshot.predictedHours || 0).toFixed(2)),
      actualHours: Number(actualHours.toFixed(2)),
      predictedRevenue: Number(Number(snapshot.predictedRevenue || 0).toFixed(2)),
      actualRevenue: Number(actualRevenue.toFixed(2)),
      predictedCost: Number(Number(snapshot.predictedCost || 0).toFixed(2)),
      actualCost: Number(actualCost.toFixed(2)),
    });
  }

  const last = snapshots.documents[snapshots.documents.length - 1] || null;

  return {
    rows,
    total: snapshots.total,
    nextCursor: snapshots.documents.length >= limit && last ? last.$id : null,
  };
};

const listSlaSummary = async ({ scope, startIso, endIso, limit, cursor }) => {
  const [shifts, entries] = await Promise.all([
    listWindowShifts({ scope, startIso, endIso }),
    listWindowEntries({ scope, startIso, endIso }),
  ]);

  const grouped = new Map();

  for (const shift of shifts) {
    const key = toKey(shift.clientId, shift.siteId);
    if (!grouped.has(key)) {
      grouped.set(key, {
        clientId: shift.clientId || null,
        siteId: shift.siteId || null,
        scheduledHours: 0,
        workedHours: 0,
      });
    }

    const bucket = grouped.get(key);
    const headcount = Math.max(1, Number(shift.requiredHeadcount || shift.positionsOpen || 1));
    bucket.scheduledHours += shiftDurationHours(shift) * headcount;
  }

  for (const entry of entries) {
    const key = toKey(entry.clientId, entry.siteId);
    if (!grouped.has(key)) {
      grouped.set(key, {
        clientId: entry.clientId || null,
        siteId: entry.siteId || null,
        scheduledHours: 0,
        workedHours: 0,
      });
    }

    grouped.get(key).workedHours += Number(entry.minutesPayable || 0) / 60;
  }

  const rows = Array.from(grouped.values()).map((bucket) => {
    const ratio = bucket.scheduledHours > 0 ? bucket.workedHours / bucket.scheduledHours : 1;
    return {
      clientId: bucket.clientId,
      siteId: bucket.siteId,
      scheduledHours: Number(bucket.scheduledHours.toFixed(2)),
      workedHours: Number(bucket.workedHours.toFixed(2)),
      slaRatio: Number(ratio.toFixed(4)),
      slaStatus: ratio >= 0.92 ? 'on_track' : ratio >= 0.8 ? 'watch' : 'at_risk',
    };
  }).sort((a, b) => a.slaRatio - b.slaRatio);

  return paginateRows(rows, limit, cursor);
};

const listContractRenewalRisk = async ({ scope, limit, cursor }) => {
  const queries = [
    Query.orderDesc('generatedAt'),
    Query.limit(limit),
  ];

  if (cursor) queries.push(Query.cursorAfter(String(cursor)));

  const page = await databases.listDocuments(dbId, contractHealthCol, queries);
  const rows = [];

  for (const snapshot of page.documents) {
    const contract = await databases.getDocument(dbId, contractsCol, snapshot.contractId);

    try {
      const contractScopeQueries = scopeQueries(RESOURCE_TYPES.CONTRACTS, scope);
      if (contractScopeQueries.length > 0) {
        const passesClient = !contract.clientId || !scope.clientId || String(contract.clientId) === String(scope.clientId);
        if (!passesClient && scope.role !== ROLES.ADMIN && scope.role !== ROLES.ENTITY_ADMIN) {
          continue;
        }
      }
    } catch (_) {
      continue;
    }

    const endDate = contract.endDate ? new Date(contract.endDate) : null;
    const now = new Date();
    const daysToRenewal = endDate ? Math.ceil((endDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)) : null;

    rows.push({
      snapshotId: snapshot.$id,
      contractId: contract.$id,
      clientId: contract.clientId || null,
      siteId: contract.siteId || null,
      autoRenew: Boolean(contract.autoRenew),
      renewalNoticeDays: contract.renewalNoticeDays ?? null,
      endDate: contract.endDate || null,
      daysToRenewal,
      healthScore: contract.healthScore ?? null,
      riskScore: Number(snapshot.riskScore || 0),
      generatedAt: snapshot.generatedAt,
    });
  }

  const last = page.documents[page.documents.length - 1] || null;

  return {
    rows,
    total: page.total,
    nextCursor: page.documents.length >= limit && last ? last.$id : null,
  };
};

const listStaffingShortageRisk = async ({ scope, startIso, endIso, limit, cursor }) => {
  const queries = [
    Query.greaterThanEqual('date', startIso),
    Query.lessThanEqual('date', endIso),
    Query.orderDesc('shortageRiskScore'),
    Query.limit(limit),
    ...scopeQueries(RESOURCE_TYPES.DEMAND_PREDICTIONS, scope),
  ];

  if (cursor) queries.push(Query.cursorAfter(String(cursor)));

  const response = await databases.listDocuments(dbId, demandPredictionsCol, queries);
  const last = response.documents[response.documents.length - 1] || null;

  const rows = response.documents.map((doc) => ({
    predictionId: doc.$id,
    clientId: doc.clientId,
    siteId: doc.siteId,
    date: doc.date,
    predictedRequiredGuards: Number(doc.predictedRequiredGuards || 0),
    predictedAvailableGuards: Number(doc.predictedAvailableGuards || 0),
    shortageRiskScore: Number(doc.shortageRiskScore || 0),
    generatedAt: doc.generatedAt,
  }));

  return {
    rows,
    total: response.total,
    nextCursor: response.documents.length >= limit && last ? last.$id : null,
  };
};

const listEntityRevenueProfit = async ({ scope, startIso, endIso, limit, cursor }) => {
  const snapshots = await listAllDocuments(profitSnapshotsCol, [
    Query.greaterThanEqual('periodStart', startIso),
    Query.lessThanEqual('periodEnd', endIso),
    ...scopeQueries(RESOURCE_TYPES.PROFIT_SNAPSHOTS, scope),
  ]);

  const byEntity = new Map();
  for (const item of snapshots) {
    const key = String(item.entityId || 'unassigned');
    if (!byEntity.has(key)) {
      byEntity.set(key, { entityId: key, revenue: 0, cost: 0, grossProfit: 0, workedHours: 0 });
    }
    const bucket = byEntity.get(key);
    bucket.revenue += Number(item.revenue || 0);
    bucket.cost += Number(item.cost || 0);
    bucket.grossProfit += Number(item.grossProfit || 0);
    bucket.workedHours += Number(item.workedHours || 0);
  }

  const rows = Array.from(byEntity.values())
    .map((item) => ({
      ...item,
      revenue: Number(item.revenue.toFixed(2)),
      cost: Number(item.cost.toFixed(2)),
      grossProfit: Number(item.grossProfit.toFixed(2)),
      workedHours: Number(item.workedHours.toFixed(2)),
      grossMarginPct: item.revenue > 0 ? Number(((item.grossProfit / item.revenue) * 100).toFixed(2)) : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  return paginateRows(rows, limit, cursor);
};

const listEbitdaProxy = async ({ scope, startIso, endIso, limit, cursor }) => {
  const base = await listEntityRevenueProfit({ scope, startIso, endIso, limit: 5000, cursor: null });
  const rows = (base.rows || []).map((item) => ({
    entityId: item.entityId,
    ebitdaProxy: item.grossProfit,
    revenue: item.revenue,
    cost: item.cost,
    marginPct: item.grossMarginPct,
  }));

  return paginateRows(rows, limit, cursor);
};

const listClientConcentration = async ({ scope, limit, cursor }) => {
  const queries = [
    Query.orderDesc('createdAt'),
    Query.limit(limit),
    ...scopeQueries(RESOURCE_TYPES.CONCENTRATION_ALERTS, scope),
  ];
  if (cursor) queries.push(Query.cursorAfter(String(cursor)));

  const response = await databases.listDocuments(dbId, concentrationAlertsCol, queries);
  const last = response.documents[response.documents.length - 1] || null;

  const rows = response.documents.map((doc) => ({
    concentrationId: doc.$id,
    entityId: doc.entityId,
    concentrationPct: Number(doc.concentrationPct || 0),
    thresholdPct: Number(doc.thresholdPct || 0),
    severity: doc.severity,
    createdAt: doc.createdAt,
  }));

  return {
    rows,
    total: response.total,
    nextCursor: response.documents.length >= limit && last ? last.$id : null,
  };
};

const listMarginHeatmap = async ({ scope, startIso, endIso, limit, cursor }) => {
  const snapshots = await listAllDocuments(profitSnapshotsCol, [
    Query.greaterThanEqual('periodStart', startIso),
    Query.lessThanEqual('periodEnd', endIso),
    ...scopeQueries(RESOURCE_TYPES.PROFIT_SNAPSHOTS, scope),
  ]);

  const bySite = new Map();
  for (const item of snapshots) {
    const key = `${item.entityId || 'unassigned'}::${item.siteId || 'unknown'}`;
    if (!bySite.has(key)) {
      bySite.set(key, { entityId: item.entityId || 'unassigned', siteId: item.siteId || 'unknown', revenue: 0, grossProfit: 0 });
    }
    const bucket = bySite.get(key);
    bucket.revenue += Number(item.revenue || 0);
    bucket.grossProfit += Number(item.grossProfit || 0);
  }

  const rows = Array.from(bySite.values())
    .map((item) => ({
      entityId: item.entityId,
      siteId: item.siteId,
      revenue: Number(item.revenue.toFixed(2)),
      grossProfit: Number(item.grossProfit.toFixed(2)),
      marginPct: item.revenue > 0 ? Number(((item.grossProfit / item.revenue) * 100).toFixed(2)) : 0,
    }))
    .sort((a, b) => a.marginPct - b.marginPct);

  return paginateRows(rows, limit, cursor);
};

const listEnterpriseRiskScore = async ({ scope, limit, cursor }) => {
  const queries = [
    Query.orderDesc('generatedAt'),
    Query.limit(limit),
    ...scopeQueries(RESOURCE_TYPES.ENTERPRISE_RISK_SCORES, scope),
  ];
  if (cursor) queries.push(Query.cursorAfter(String(cursor)));

  const response = await databases.listDocuments(dbId, enterpriseRiskScoresCol, queries);
  const last = response.documents[response.documents.length - 1] || null;

  return {
    rows: response.documents.map((doc) => ({
      scoreId: doc.$id,
      entityId: doc.entityId,
      riskScore: Number(doc.riskScore || 0),
      riskBand: doc.riskBand,
      generatedAt: doc.generatedAt,
    })),
    total: response.total,
    nextCursor: response.documents.length >= limit && last ? last.$id : null,
  };
};

const listAcquisitionComparison = async ({ scope, limit, cursor }) => {
  const queries = [
    Query.orderDesc('generatedAt'),
    Query.limit(limit),
    ...scopeQueries(RESOURCE_TYPES.ACQUISITION_MODELS, scope),
  ];
  if (cursor) queries.push(Query.cursorAfter(String(cursor)));
  const response = await databases.listDocuments(dbId, acquisitionModelsCol, queries);
  const last = response.documents[response.documents.length - 1] || null;

  return {
    rows: response.documents.map((doc) => ({
      modelId: doc.$id,
      entityId: doc.entityId,
      targetId: doc.targetId,
      scenarioName: doc.scenarioName,
      projectedRevenue: Number(doc.projectedRevenue || 0),
      projectedCost: Number(doc.projectedCost || 0),
      projectedEbitdaProxy: Number(doc.projectedEbitdaProxy || 0),
      integrationRiskScore: Number(doc.integrationRiskScore || 0),
      generatedAt: doc.generatedAt,
    })),
    total: response.total,
    nextCursor: response.documents.length >= limit && last ? last.$id : null,
  };
};

const listStrategicForecast = async ({ scope, limit, cursor }) => {
  const queries = [
    Query.orderDesc('generatedAt'),
    Query.limit(limit),
    ...scopeQueries(RESOURCE_TYPES.STRATEGIC_FORECASTS, scope),
  ];
  if (cursor) queries.push(Query.cursorAfter(String(cursor)));
  const response = await databases.listDocuments(dbId, strategicForecastsCol, queries);
  const last = response.documents[response.documents.length - 1] || null;

  return {
    rows: response.documents.map((doc) => ({
      forecastId: doc.$id,
      entityId: doc.entityId,
      periodStart: doc.periodStart,
      periodEnd: doc.periodEnd,
      horizonMonths: Number(doc.horizonMonths || 0),
      forecastRevenue: Number(doc.forecastRevenue || 0),
      forecastCost: Number(doc.forecastCost || 0),
      forecastEbitdaProxy: Number(doc.forecastEbitdaProxy || 0),
      generatedAt: doc.generatedAt,
    })),
    total: response.total,
    nextCursor: response.documents.length >= limit && last ? last.$id : null,
  };
};

const listTenderPricingSensitivity = async ({ scope, limit, cursor }) => {
  const queries = [
    Query.orderDesc('generatedAt'),
    Query.limit(limit),
    ...scopeQueries(RESOURCE_TYPES.TENDER_MODELS, scope),
  ];
  if (cursor) queries.push(Query.cursorAfter(String(cursor)));
  const response = await databases.listDocuments(dbId, tenderModelsCol, queries);
  const last = response.documents[response.documents.length - 1] || null;

  const winModels = await listAllDocuments(tenderWinModelsCol, [
    Query.orderDesc('generatedAt'),
    Query.limit(500),
    ...scopeQueries(RESOURCE_TYPES.TENDER_WIN_MODELS, scope),
  ]);

  const winByEntity = new Map();
  for (const model of winModels) {
    const entityId = String(model.entityId || '');
    if (!entityId || winByEntity.has(entityId)) continue;
    winByEntity.set(entityId, Number(model.predictedWinProbability || 0));
  }

  const rows = response.documents.map((doc) => ({
    modelId: doc.$id,
    entityId: doc.entityId,
    clientId: doc.clientId,
    siteId: doc.siteId,
    effectiveCostRate: Number(doc.effectiveCostRate || 0),
    riskFactor: Number(doc.riskFactor || 0),
    targetMarginPct: Number(doc.targetMarginPct || 0),
    recommendedHourlyRate: Number(doc.recommendedHourlyRate || 0),
    predictedWinProbability: Number(winByEntity.get(String(doc.entityId || '')) || 0),
    generatedAt: doc.generatedAt,
  }));

  return {
    rows,
    total: response.total,
    nextCursor: response.documents.length >= limit && last ? last.$id : null,
  };
};

export const getExecutiveDashboard = async (
  {
    rangeStart,
    rangeEnd,
    limit = DEFAULT_LIMIT,
    cursors = {},
    section = null,
  } = {},
  actor = null,
) => {
  ensureCollections();

  const { scope } = await getAuthorizedScope({
    actor,
    permission: PERMISSIONS.VIEW_REPORTS,
  });
  assertAdmin(scope);

  const startIso = asIso(rangeStart, 'rangeStart');
  const endIso = asIso(rangeEnd, 'rangeEnd');
  const safeLimit = clampLimit(limit, DEFAULT_LIMIT);

  if (section === 'marginOverview') {
    return {
      marginOverview: await listMarginOverview({
        scope,
        startIso,
        endIso,
        limit: safeLimit,
        cursor: cursors.marginOverview || null,
      }),
    };
  }

  if (section === 'activeMarginAlerts') {
    return {
      activeMarginAlerts: await listActiveMarginAlerts({
        scope,
        limit: safeLimit,
        cursor: cursors.activeMarginAlerts || null,
      }),
    };
  }

  if (section === 'employmentCostDistribution') {
    return {
      employmentCostDistribution: await listEmploymentCostDistribution({
        scope,
        startIso,
        endIso,
        limit: safeLimit,
        cursor: cursors.employmentCostDistribution || null,
      }),
    };
  }

  if (section === 'forecastVsActual') {
    return {
      forecastVsActual: await listForecastVsActual({
        scope,
        startIso,
        endIso,
        limit: safeLimit,
        cursor: cursors.forecastVsActual || null,
      }),
    };
  }

  if (section === 'slaPerformance') {
    return {
      slaPerformance: await listSlaSummary({
        scope,
        startIso,
        endIso,
        limit: safeLimit,
        cursor: cursors.slaPerformance || null,
      }),
    };
  }

  if (section === 'contractRenewalRisk') {
    return {
      contractRenewalRisk: await listContractRenewalRisk({
        scope,
        limit: safeLimit,
        cursor: cursors.contractRenewalRisk || null,
      }),
    };
  }

  if (section === 'staffingShortageRisk') {
    return {
      staffingShortageRisk: await listStaffingShortageRisk({
        scope,
        startIso,
        endIso,
        limit: safeLimit,
        cursor: cursors.staffingShortageRisk || null,
      }),
    };
  }

  if (section === 'entityRevenueProfit') {
    return {
      entityRevenueProfit: await listEntityRevenueProfit({
        scope,
        startIso,
        endIso,
        limit: safeLimit,
        cursor: cursors.entityRevenueProfit || null,
      }),
    };
  }

  if (section === 'ebitdaProxy') {
    return {
      ebitdaProxy: await listEbitdaProxy({
        scope,
        startIso,
        endIso,
        limit: safeLimit,
        cursor: cursors.ebitdaProxy || null,
      }),
    };
  }

  if (section === 'clientConcentration') {
    return {
      clientConcentration: await listClientConcentration({
        scope,
        limit: safeLimit,
        cursor: cursors.clientConcentration || null,
      }),
    };
  }

  if (section === 'marginHeatmap') {
    return {
      marginHeatmap: await listMarginHeatmap({
        scope,
        startIso,
        endIso,
        limit: safeLimit,
        cursor: cursors.marginHeatmap || null,
      }),
    };
  }

  if (section === 'enterpriseRiskScore') {
    return {
      enterpriseRiskScore: await listEnterpriseRiskScore({
        scope,
        limit: safeLimit,
        cursor: cursors.enterpriseRiskScore || null,
      }),
    };
  }

  if (section === 'acquisitionComparison') {
    return {
      acquisitionComparison: await listAcquisitionComparison({
        scope,
        limit: safeLimit,
        cursor: cursors.acquisitionComparison || null,
      }),
    };
  }

  if (section === 'strategicForecast') {
    return {
      strategicForecast: await listStrategicForecast({
        scope,
        limit: safeLimit,
        cursor: cursors.strategicForecast || null,
      }),
    };
  }

  if (section === 'tenderPricingSensitivity') {
    return {
      tenderPricingSensitivity: await listTenderPricingSensitivity({
        scope,
        limit: safeLimit,
        cursor: cursors.tenderPricingSensitivity || null,
      }),
    };
  }

  const [
    marginOverview,
    activeMarginAlerts,
    employmentCostDistribution,
    forecastVsActual,
    slaPerformance,
    contractRenewalRisk,
    staffingShortageRisk,
    entityRevenueProfit,
    ebitdaProxy,
    clientConcentration,
    marginHeatmap,
    enterpriseRiskScore,
    acquisitionComparison,
    strategicForecast,
    tenderPricingSensitivity,
  ] = await Promise.all([
    listMarginOverview({ scope, startIso, endIso, limit: safeLimit, cursor: cursors.marginOverview || null }),
    listActiveMarginAlerts({ scope, limit: safeLimit, cursor: cursors.activeMarginAlerts || null }),
    listEmploymentCostDistribution({
      scope,
      startIso,
      endIso,
      limit: safeLimit,
      cursor: cursors.employmentCostDistribution || null,
    }),
    listForecastVsActual({ scope, startIso, endIso, limit: safeLimit, cursor: cursors.forecastVsActual || null }),
    listSlaSummary({ scope, startIso, endIso, limit: safeLimit, cursor: cursors.slaPerformance || null }),
    listContractRenewalRisk({ scope, limit: safeLimit, cursor: cursors.contractRenewalRisk || null }),
    listStaffingShortageRisk({ scope, startIso, endIso, limit: safeLimit, cursor: cursors.staffingShortageRisk || null }),
    listEntityRevenueProfit({ scope, startIso, endIso, limit: safeLimit, cursor: cursors.entityRevenueProfit || null }),
    listEbitdaProxy({ scope, startIso, endIso, limit: safeLimit, cursor: cursors.ebitdaProxy || null }),
    listClientConcentration({ scope, limit: safeLimit, cursor: cursors.clientConcentration || null }),
    listMarginHeatmap({ scope, startIso, endIso, limit: safeLimit, cursor: cursors.marginHeatmap || null }),
    listEnterpriseRiskScore({ scope, limit: safeLimit, cursor: cursors.enterpriseRiskScore || null }),
    listAcquisitionComparison({ scope, limit: safeLimit, cursor: cursors.acquisitionComparison || null }),
    listStrategicForecast({ scope, limit: safeLimit, cursor: cursors.strategicForecast || null }),
    listTenderPricingSensitivity({ scope, limit: safeLimit, cursor: cursors.tenderPricingSensitivity || null }),
  ]);

  return {
    marginOverview,
    activeMarginAlerts,
    employmentCostDistribution,
    forecastVsActual,
    slaPerformance,
    contractRenewalRisk,
    staffingShortageRisk,
    entityRevenueProfit,
    ebitdaProxy,
    clientConcentration,
    marginHeatmap,
    enterpriseRiskScore,
    acquisitionComparison,
    strategicForecast,
    tenderPricingSensitivity,
  };
};

export const exportDashboardSectionCsv = (sectionRows = []) => {
  return sectionToCsv(sectionRows);
};
