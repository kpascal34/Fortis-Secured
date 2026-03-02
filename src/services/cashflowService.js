import { ID, Query } from 'appwrite';
import { databases, config } from '../lib/appwrite.js';
import { PERMISSIONS, ROLES } from '../lib/rbac.ts';
import { ensureDatabaseConfig, getAuthorizedScope } from '../lib/serviceSecurity.js';
import { RESOURCE_TYPES, scopeQueries } from '../lib/tenancyScope.js';
import { logEvent } from './auditLogService.js';

const dbId = config.databaseId;
const cashflowSnapshotsCol = config.cashflowSnapshotsCollectionId || 'cashflow_snapshots';

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

const clampLimit = (value, fallback = DEFAULT_LIMIT) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, MAX_LIMIT);
};

const assertAdminLike = (scope) => {
  const role = String(scope?.role || '');
  if (role !== ROLES.ADMIN && role !== ROLES.ENTITY_ADMIN) {
    throw new Error('Permission denied: cashflow views are restricted to admin users.');
  }
};

const asIso = (value, field) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid ${field}: ${value}`);
  }
  return date.toISOString();
};

const toNumber = (value, field) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    throw new Error(`Invalid ${field}: ${value}`);
  }
  return numeric;
};

const ensureCollections = () => {
  ensureDatabaseConfig(cashflowSnapshotsCol, 'cashflow snapshots collection');
};

export const createCashflowSnapshot = async (
  {
    entityId,
    periodStart,
    periodEnd,
    expectedReceipts,
    expectedPayrollOutflow,
    taxReserveEstimate,
    assumptions = {},
  } = {},
  actor = null,
) => {
  ensureCollections();

  if (!entityId) throw new Error('entityId is required for cashflow snapshot creation.');

  const { actor: resolvedActor, scope } = await getAuthorizedScope({
    actor,
    permission: PERMISSIONS.VIEW_FINANCE,
  });
  assertAdminLike(scope);

  const receipts = toNumber(expectedReceipts, 'expectedReceipts');
  const payroll = toNumber(expectedPayrollOutflow, 'expectedPayrollOutflow');
  const taxReserve = toNumber(taxReserveEstimate, 'taxReserveEstimate');

  const payload = {
    entityId: String(entityId),
    periodStart: asIso(periodStart, 'periodStart'),
    periodEnd: asIso(periodEnd, 'periodEnd'),
    expectedReceipts: Number(receipts.toFixed(2)),
    expectedPayrollOutflow: Number(payroll.toFixed(2)),
    taxReserveEstimate: Number(taxReserve.toFixed(2)),
    netCashPosition: Number((receipts - payroll - taxReserve).toFixed(2)),
    assumptions: assumptions || {},
    generatedAt: new Date().toISOString(),
  };

  const doc = await databases.createDocument(dbId, cashflowSnapshotsCol, ID.unique(), payload);

  await logEvent({
    actorId: resolvedActor.$id,
    action: 'CASHFLOW_SNAPSHOT_CREATED',
    resourceType: RESOURCE_TYPES.CASHFLOW_SNAPSHOTS,
    resourceId: doc.$id,
    metadata: {
      entityId: payload.entityId,
      netCashPosition: payload.netCashPosition,
    },
  });

  return doc;
};

export const listCashflowSnapshots = async (
  { limit = DEFAULT_LIMIT, cursor = null, filters = {} } = {},
  actor = null,
) => {
  ensureCollections();

  const { scope } = await getAuthorizedScope({
    actor,
    permission: PERMISSIONS.VIEW_FINANCE,
  });
  assertAdminLike(scope);

  const safeLimit = clampLimit(limit);
  const queries = [
    Query.orderDesc('generatedAt'),
    Query.limit(safeLimit),
    ...scopeQueries(RESOURCE_TYPES.CASHFLOW_SNAPSHOTS, scope),
  ];

  if (cursor) queries.push(Query.cursorAfter(String(cursor)));
  if (filters?.entityId) queries.push(Query.equal('entityId', String(filters.entityId)));
  if (filters?.periodStart) queries.push(Query.greaterThanEqual('periodStart', asIso(filters.periodStart, 'filters.periodStart')));
  if (filters?.periodEnd) queries.push(Query.lessThanEqual('periodEnd', asIso(filters.periodEnd, 'filters.periodEnd')));

  const response = await databases.listDocuments(dbId, cashflowSnapshotsCol, queries);
  const last = response.documents[response.documents.length - 1] || null;

  return {
    documents: response.documents,
    total: response.total,
    nextCursor: response.documents.length >= safeLimit && last ? last.$id : null,
  };
};
