import { ID, Query } from 'appwrite';
import { databases, config } from '../lib/appwrite.js';
import { PERMISSIONS, ROLES } from '../lib/rbac.ts';
import { ensureDatabaseConfig, getAuthorizedScope } from '../lib/serviceSecurity.js';
import { RESOURCE_TYPES, scopeQueries } from '../lib/tenancyScope.js';
import { logEvent } from './auditLogService.js';
import { createPayrollExportFinanceEvent } from './financeIntegrationService.js';

const dbId = config.databaseId;
const timesheetsCol = config.timesheetsCollectionId || 'timesheets';
const payrollExportsCol = config.payrollExportsCollectionId || 'payroll_exports';
const clientsCol = config.clientsCollectionId || 'clients';
const staffProfilesCol = config.staffProfilesCollectionId || 'staff_profiles';
const guardsCol = config.guardsCollectionId || 'guards';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

const clampLimit = (value, fallback = DEFAULT_LIMIT) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, MAX_LIMIT);
};

const csvEscape = (value) => {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

const asIso = (value, field) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid ${field}: ${value}`);
  }
  return date.toISOString();
};

const ensureCollections = () => {
  ensureDatabaseConfig(timesheetsCol, 'timesheets collection');
  ensureDatabaseConfig(payrollExportsCol, 'payroll exports collection');
  ensureDatabaseConfig(clientsCol, 'clients collection');
  ensureDatabaseConfig(staffProfilesCol, 'staff profiles collection');
  ensureDatabaseConfig(guardsCol, 'guards collection');
};

const buildCsv = (rows) => {
  const headers = ['guardId', 'guardName', 'weekStart', 'weekEnd', 'payableHours', 'hourlyRate', 'grossPay'];
  const lines = [headers.join(',')];

  for (const row of rows) {
    lines.push([
      csvEscape(row.guardId),
      csvEscape(row.guardName),
      csvEscape(row.weekStart),
      csvEscape(row.weekEnd),
      csvEscape(row.payableHours),
      csvEscape(row.hourlyRate),
      csvEscape(row.grossPay),
    ].join(','));
  }

  return lines.join('\n');
};

const listAllByIds = async (collectionId, ids) => {
  const all = [];
  const chunks = [];

  for (let i = 0; i < ids.length; i += 100) {
    chunks.push(ids.slice(i, i + 100));
  }

  for (const batch of chunks) {
    if (!batch.length) continue;
    const response = await databases.listDocuments(dbId, collectionId, [
      Query.equal('$id', batch),
      Query.limit(batch.length),
    ]);
    all.push(...response.documents);
  }

  return all;
};

const getProfilesByUserIds = async (userIds) => {
  const result = new Map();

  for (let i = 0; i < userIds.length; i += 100) {
    const batch = userIds.slice(i, i + 100);
    if (!batch.length) continue;

    const response = await databases.listDocuments(dbId, staffProfilesCol, [
      Query.equal('userId', batch),
      Query.limit(100),
    ]);

    for (const doc of response.documents) {
      result.set(String(doc.userId), doc);
    }
  }

  return result;
};

const resolveHourlyRates = async (guardIds) => {
  const rates = new Map();
  const docs = await listAllByIds(guardsCol, guardIds);

  for (const doc of docs) {
    const rate = Number(doc.payRate);
    if (Number.isFinite(rate) && rate > 0) {
      rates.set(String(doc.$id), rate);
    }
  }

  return rates;
};

const parseClientBreakdown = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'object') return Object.values(value);
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed;
      if (parsed && typeof parsed === 'object') return Object.values(parsed);
    } catch (_) {
      return [];
    }
  }
  return [];
};

const extractClientIdsFromTimesheet = (timesheet) => {
  const fromTopLevel = timesheet?.clientId ? [String(timesheet.clientId)] : [];
  const breakdown = parseClientBreakdown(timesheet?.clientBreakdown);
  const fromBreakdown = breakdown
    .map((item) => item?.clientId)
    .filter(Boolean)
    .map((item) => String(item));

  return Array.from(new Set([...fromTopLevel, ...fromBreakdown]));
};

const resolveEntityId = (scope, filters = {}) => {
  if (filters?.entityId) return String(filters.entityId);
  if (scope?.entityId) return String(scope.entityId);
  if (Array.isArray(scope?.assignedEntityIds) && scope.assignedEntityIds.length === 1) {
    return String(scope.assignedEntityIds[0]);
  }
  return null;
};

export const createPayrollExport = async (
  { rangeStart, rangeEnd, filters = {}, limit = 500, cursor = null } = {},
  actor = null,
) => {
  ensureCollections();

  const { actor: resolvedActor, scope } = await getAuthorizedScope({
    actor,
    permission: PERMISSIONS.VIEW_PAYROLL,
  });

  const role = String(scope.role || '');
  if (role !== ROLES.ADMIN && role !== ROLES.ENTITY_ADMIN) {
    throw new Error('Permission denied: payroll exports are restricted to admin users.');
  }

  const startIso = asIso(rangeStart, 'rangeStart');
  const endIso = asIso(rangeEnd, 'rangeEnd');
  const safeLimit = clampLimit(limit, 500);
  const entityId = resolveEntityId(scope, filters);

  if (!entityId) {
    throw new Error('entityId is required for payroll exports in multi-entity mode.');
  }

  const queries = [
    Query.equal('status', ['approved', 'locked']),
    Query.greaterThanEqual('weekStart', startIso),
    Query.lessThanEqual('weekEnd', endIso),
    Query.orderAsc('guardId'),
    Query.orderAsc('weekStart'),
    Query.limit(safeLimit),
  ];

  if (cursor) queries.push(Query.cursorAfter(String(cursor)));
  if (filters?.guardId) queries.push(Query.equal('guardId', String(filters.guardId)));

  const response = await databases.listDocuments(dbId, timesheetsCol, queries);
  let timesheets = response.documents;

  const allClientIds = Array.from(
    new Set(
      timesheets.flatMap((timesheet) => extractClientIdsFromTimesheet(timesheet)).filter(Boolean),
    ),
  );

  if (allClientIds.length > 0) {
    const clientsById = new Map();
    const clientDocs = await listAllByIds(clientsCol, allClientIds);
    for (const client of clientDocs) {
      clientsById.set(String(client.$id), String(client.entityId || ''));
    }

    timesheets = timesheets.filter((timesheet) => {
      const clientIds = extractClientIdsFromTimesheet(timesheet);
      if (clientIds.length === 0) return false;
      return clientIds.some((clientId) => clientsById.get(String(clientId)) === String(entityId));
    });
  } else {
    timesheets = [];
  }

  const guardIds = Array.from(new Set(timesheets.map((item) => String(item.guardId || '')).filter(Boolean)));
  const profilesByUserId = await getProfilesByUserIds(guardIds);
  const ratesByGuardId = await resolveHourlyRates(guardIds);

  const rows = timesheets.map((timesheet) => {
    const guardId = String(timesheet.guardId || '');
    const profile = profilesByUserId.get(guardId);
    const guardName =
      profile?.fullName ||
      [profile?.firstName, profile?.lastName].filter(Boolean).join(' ') ||
      guardId;

    const payableHours = Number(timesheet.totalPayMinutes || 0) / 60;
    const hourlyRate = ratesByGuardId.get(guardId);
    const grossPay = Number.isFinite(hourlyRate) ? (payableHours * hourlyRate).toFixed(2) : '';

    return {
      guardId,
      guardName,
      weekStart: timesheet.weekStart,
      weekEnd: timesheet.weekEnd,
      payableHours: payableHours.toFixed(2),
      hourlyRate: Number.isFinite(hourlyRate) ? hourlyRate.toFixed(2) : '',
      grossPay,
    };
  });

  const csv = buildCsv(rows);
  const exportRecord = await databases.createDocument(dbId, payrollExportsCol, ID.unique(), {
    entityId,
    runBy: resolvedActor.$id,
    rangeStart: startIso,
    rangeEnd: endIso,
    filters,
    fileId: null,
    createdAt: new Date().toISOString(),
  });

  await logEvent({
    actorId: resolvedActor.$id,
    action: 'PAYROLL_EXPORT_CREATED',
    resourceType: RESOURCE_TYPES.PAYROLL_EXPORTS,
    resourceId: exportRecord.$id,
    metadata: {
      entityId,
      rangeStart: startIso,
      rangeEnd: endIso,
      rows: rows.length,
      total: response.total,
    },
  });

  let financeEvent = null;
  let financeEventError = null;
  try {
    const financeResult = await createPayrollExportFinanceEvent(
      {
        exportRecord,
        rows,
        entityId,
        provider: filters?.provider || 'xero',
        clientId: filters?.clientId || null,
      },
      resolvedActor,
    );
    financeEvent = financeResult?.event || null;
  } catch (error) {
    financeEventError = error?.message || 'Unable to create finance event for payroll export.';
    console.error('[payrollExportService] Failed to create finance event:', error);
  }

  const last = timesheets[timesheets.length - 1] || null;

  return {
    exportRecord,
    csv,
    rows,
    total: response.total,
    nextCursor: timesheets.length >= safeLimit && last ? last.$id : null,
    fileName: `payroll_export_${startIso.slice(0, 10)}_${endIso.slice(0, 10)}.csv`,
    financeEvent,
    financeEventError,
  };
};

export const listPayrollExports = async ({ limit = DEFAULT_LIMIT, cursor = null, filters = {} } = {}, actor = null) => {
  ensureCollections();

  const { scope } = await getAuthorizedScope({
    actor,
    permission: PERMISSIONS.VIEW_PAYROLL,
  });

  const role = String(scope.role || '');
  if (role !== ROLES.ADMIN && role !== ROLES.ENTITY_ADMIN) {
    throw new Error('Permission denied: payroll exports are restricted to admin users.');
  }

  const safeLimit = clampLimit(limit);
  const queries = [
    Query.orderDesc('createdAt'),
    Query.limit(safeLimit),
    ...scopeQueries(RESOURCE_TYPES.PAYROLL_EXPORTS, scope),
  ];
  if (cursor) queries.push(Query.cursorAfter(String(cursor)));
  if (filters?.entityId) queries.push(Query.equal('entityId', String(filters.entityId)));

  const response = await databases.listDocuments(dbId, payrollExportsCol, queries);
  const last = response.documents[response.documents.length - 1] || null;

  return {
    documents: response.documents,
    total: response.total,
    nextCursor: response.documents.length >= safeLimit && last ? last.$id : null,
  };
};
