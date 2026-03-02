import { ID, Query } from 'appwrite';
import { databases, config } from '../lib/appwrite.js';
import { PERMISSIONS, ROLES } from '../lib/rbac.ts';
import { ensureDatabaseConfig, getAuthorizedScope } from '../lib/serviceSecurity.js';
import { RESOURCE_TYPES, scopeQueries } from '../lib/tenancyScope.js';
import { logEvent } from './auditLogService.js';
import { createBillingExportFinanceEvent } from './financeIntegrationService.js';

const dbId = config.databaseId;
const entriesCol = config.timesheetEntriesCollectionId || 'timesheet_entries';
const billingExportsCol = config.billingExportsCollectionId || 'billing_exports';
const rateCardsCol = config.rateCardsCollectionId || 'rate_cards';
const staffProfilesCol = config.staffProfilesCollectionId || 'staff_profiles';
const clientsCol = config.clientsCollectionId || 'clients';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 500;

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

const csvEscape = (value) => {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

const ensureCollections = () => {
  ensureDatabaseConfig(entriesCol, 'timesheet entries collection');
  ensureDatabaseConfig(billingExportsCol, 'billing exports collection');
  ensureDatabaseConfig(rateCardsCol, 'rate cards collection');
  ensureDatabaseConfig(clientsCol, 'clients collection');
};

const getDayType = (workDate, startAt) => {
  const date = new Date(workDate || startAt);
  if (Number.isNaN(date.getTime())) return 'weekday';

  const day = date.getUTCDay();
  const hour = new Date(startAt || workDate || date).getUTCHours();

  if (hour >= 22 || hour < 6) return 'night';
  if (day === 0 || day === 6) return 'weekend';
  return 'weekday';
};

const listRateCardsByClientIds = async (clientIds) => {
  const all = [];

  for (let i = 0; i < clientIds.length; i += 100) {
    const batch = clientIds.slice(i, i + 100);
    if (!batch.length) continue;

    const response = await databases.listDocuments(dbId, rateCardsCol, [
      Query.equal('clientId', batch),
      Query.limit(100),
    ]);

    all.push(...response.documents);
  }

  return all;
};

const listProfilesByUserIds = async (guardIds) => {
  const result = new Map();

  for (let i = 0; i < guardIds.length; i += 100) {
    const batch = guardIds.slice(i, i + 100);
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

const resolveRateCard = ({ entry, role, dayType, rateCards }) => {
  const exact = rateCards.find((card) =>
    String(card.clientId || '') === String(entry.clientId || '') &&
    String(card.siteId || '') === String(entry.siteId || '') &&
    String(card.role || '') === String(role || '') &&
    String(card.dayType || '') === String(dayType || ''),
  );

  if (exact) return exact;

  const siteLevel = rateCards.find((card) =>
    String(card.clientId || '') === String(entry.clientId || '') &&
    String(card.siteId || '') === String(entry.siteId || ''),
  );

  if (siteLevel) return siteLevel;

  const clientLevel = rateCards.find((card) =>
    String(card.clientId || '') === String(entry.clientId || ''),
  );

  return clientLevel || null;
};

const buildCsv = (rows) => {
  const headers = [
    'clientId',
    'siteId',
    'dayType',
    'role',
    'hourlyRate',
    'payableHours',
    'lineTotal',
    'entryCount',
  ];

  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push([
      csvEscape(row.clientId),
      csvEscape(row.siteId),
      csvEscape(row.dayType),
      csvEscape(row.role),
      csvEscape(row.hourlyRate),
      csvEscape(row.payableHours),
      csvEscape(row.lineTotal),
      csvEscape(row.entryCount),
    ].join(','));
  }

  return lines.join('\n');
};

const resolveEntityId = (scope, filters = {}) => {
  if (filters?.entityId) return String(filters.entityId);
  if (scope?.entityId) return String(scope.entityId);
  if (Array.isArray(scope?.assignedEntityIds) && scope.assignedEntityIds.length === 1) {
    return String(scope.assignedEntityIds[0]);
  }
  return null;
};

const listClientsByIds = async (clientIds) => {
  const map = new Map();

  for (let i = 0; i < clientIds.length; i += 100) {
    const batch = clientIds.slice(i, i + 100);
    if (!batch.length) continue;

    const response = await databases.listDocuments(dbId, clientsCol, [
      Query.equal('$id', batch),
      Query.limit(batch.length),
    ]);

    for (const doc of response.documents) {
      map.set(String(doc.$id), doc);
    }
  }

  return map;
};

export const createBillingExport = async (
  { rangeStart, rangeEnd, filters = {}, limit = MAX_LIMIT, cursor = null } = {},
  actor = null,
) => {
  ensureCollections();

  const { actor: resolvedActor, scope } = await getAuthorizedScope({
    actor,
    permission: PERMISSIONS.VIEW_FINANCE,
  });

  // Keep Phase 5 export surface admin-only for release safety.
  const role = String(scope.role || '');
  if (role !== ROLES.ADMIN && role !== ROLES.ENTITY_ADMIN) {
    throw new Error('Permission denied: billing exports are restricted to admin users.');
  }

  const startIso = asIso(rangeStart, 'rangeStart');
  const endIso = asIso(rangeEnd, 'rangeEnd');
  const safeLimit = clampLimit(limit, MAX_LIMIT);
  const entityId = resolveEntityId(scope, filters);

  if (!entityId) {
    throw new Error('entityId is required for billing exports in multi-entity mode.');
  }

  const queries = [
    Query.equal('status', 'approved'),
    Query.greaterThanEqual('workDate', startIso),
    Query.lessThanEqual('workDate', endIso),
    Query.orderAsc('clientId'),
    Query.orderAsc('siteId'),
    Query.orderAsc('workDate'),
    Query.limit(safeLimit),
    ...scopeQueries(RESOURCE_TYPES.TIMESHEET_ENTRIES, scope),
  ];

  if (cursor) queries.push(Query.cursorAfter(String(cursor)));
  if (filters?.clientId) queries.push(Query.equal('clientId', String(filters.clientId)));
  if (filters?.siteId) queries.push(Query.equal('siteId', String(filters.siteId)));
  if (filters?.guardId) queries.push(Query.equal('guardId', String(filters.guardId)));

  const response = await databases.listDocuments(dbId, entriesCol, queries);
  let entries = response.documents;

  const candidateClientIds = Array.from(new Set(entries.map((item) => String(item.clientId || '')).filter(Boolean)));
  if (candidateClientIds.length > 0) {
    const clientsById = await listClientsByIds(candidateClientIds);
    entries = entries.filter((entry) => {
      const client = clientsById.get(String(entry.clientId || ''));
      return String(client?.entityId || '') === String(entityId);
    });
  } else {
    entries = [];
  }

  const clientIds = Array.from(new Set(entries.map((item) => String(item.clientId || '')).filter(Boolean)));
  const guardIds = Array.from(new Set(entries.map((item) => String(item.guardId || '')).filter(Boolean)));

  const rateCards = clientIds.length > 0 ? await listRateCardsByClientIds(clientIds) : [];
  const profilesByUserId = guardIds.length > 0 ? await listProfilesByUserIds(guardIds) : new Map();

  const grouped = new Map();

  for (const entry of entries) {
    const profile = profilesByUserId.get(String(entry.guardId || ''));
    const role = String(profile?.role || 'guard').toLowerCase();
    const dayType = getDayType(entry.workDate, entry.startAt);
    const matchedCard = resolveRateCard({ entry, role, dayType, rateCards });
    const hourlyRate = Number(matchedCard?.hourlyRate || 0);
    const payableHours = Number(entry.minutesPayable || 0) / 60;
    const lineTotal = payableHours * hourlyRate;

    const key = [entry.clientId, entry.siteId, dayType, role, hourlyRate.toFixed(2)].join('::');
    if (!grouped.has(key)) {
      grouped.set(key, {
        clientId: entry.clientId || null,
        siteId: entry.siteId || null,
        dayType,
        role,
        hourlyRate: hourlyRate.toFixed(2),
        payableHours: 0,
        lineTotal: 0,
        entryCount: 0,
      });
    }

    const item = grouped.get(key);
    item.payableHours += payableHours;
    item.lineTotal += lineTotal;
    item.entryCount += 1;
  }

  const rows = Array.from(grouped.values())
    .map((item) => ({
      ...item,
      payableHours: item.payableHours.toFixed(2),
      lineTotal: item.lineTotal.toFixed(2),
    }))
    .sort((a, b) => `${a.clientId}${a.siteId}${a.dayType}`.localeCompare(`${b.clientId}${b.siteId}${b.dayType}`));

  const csv = buildCsv(rows);
  const exportRecord = await databases.createDocument(dbId, billingExportsCol, ID.unique(), {
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
    action: 'BILLING_EXPORT_CREATED',
    resourceType: RESOURCE_TYPES.BILLING_EXPORTS,
    resourceId: exportRecord.$id,
    metadata: {
      entityId,
      rangeStart: startIso,
      rangeEnd: endIso,
      lines: rows.length,
      sourceEntries: entries.length,
      total: response.total,
    },
  });

  let financeEvent = null;
  let financeEventError = null;
  try {
    const financeResult = await createBillingExportFinanceEvent(
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
    financeEventError = error?.message || 'Unable to create finance event for billing export.';
    console.error('[billingExportService] Failed to create finance event:', error);
  }

  const last = entries[entries.length - 1] || null;

  return {
    exportRecord,
    csv,
    rows,
    total: response.total,
    nextCursor: entries.length >= safeLimit && last ? last.$id : null,
    fileName: `billing_export_${startIso.slice(0, 10)}_${endIso.slice(0, 10)}.csv`,
    financeEvent,
    financeEventError,
  };
};

export const listBillingExports = async ({ limit = DEFAULT_LIMIT, cursor = null, filters = {} } = {}, actor = null) => {
  ensureCollections();

  const { scope } = await getAuthorizedScope({
    actor,
    permission: PERMISSIONS.VIEW_FINANCE,
  });

  const role = String(scope.role || '');
  if (role !== ROLES.ADMIN && role !== ROLES.ENTITY_ADMIN) {
    throw new Error('Permission denied: billing exports are restricted to admin users.');
  }

  const safeLimit = clampLimit(limit, DEFAULT_LIMIT);
  const queries = [
    Query.orderDesc('createdAt'),
    Query.limit(safeLimit),
    ...scopeQueries(RESOURCE_TYPES.BILLING_EXPORTS, scope),
  ];
  if (cursor) queries.push(Query.cursorAfter(String(cursor)));
  if (filters?.entityId) queries.push(Query.equal('entityId', String(filters.entityId)));

  const response = await databases.listDocuments(dbId, billingExportsCol, queries);
  const last = response.documents[response.documents.length - 1] || null;

  return {
    documents: response.documents,
    total: response.total,
    nextCursor: response.documents.length >= safeLimit && last ? last.$id : null,
  };
};
