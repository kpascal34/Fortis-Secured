import { Query } from 'appwrite';
import { databases, config } from '../lib/appwrite.js';
import { PERMISSIONS, ROLES } from '../lib/rbac.ts';
import { ensureDatabaseConfig, getAuthorizedScope } from '../lib/serviceSecurity.js';
import { RESOURCE_TYPES, scopeQueries } from '../lib/tenancyScope.js';

const dbId = config.databaseId;

const collections = {
  legalEntities: config.legalEntitiesCollectionId || 'legal_entities',
  marginAlerts: config.marginAlertsCollectionId || 'margin_alerts',
  marginLeakageAlerts: config.marginLeakageAlertsCollectionId || 'margin_leakage_alerts',
  concentrationAlerts: config.concentrationAlertsCollectionId || 'concentration_alerts',
  contractDependencyAlerts: config.contractDependencyAlertsCollectionId || 'contract_dependency_alerts',
  cashflowSnapshots: config.cashflowSnapshotsCollectionId || 'cashflow_snapshots',
  resilienceSnapshots: config.resilienceSnapshotsCollectionId || 'resilience_snapshots',
  employmentRiskFlags: config.employmentRiskFlagsCollectionId || 'employment_risk_flags',
  tenderModels: config.tenderModelsCollectionId || 'tender_models',
  tenderWinModels: config.tenderWinModelsCollectionId || 'tender_win_models',
};

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
    throw new Error('Permission denied: this dashboard is restricted to admin users.');
  }
};

const ensureCollection = (collectionId, label) => {
  ensureDatabaseConfig(collectionId, label);
};

const listCollection = async (
  {
    resourceType,
    collectionId,
    orderField,
    limit = DEFAULT_LIMIT,
    cursor = null,
    filters = {},
    dateField = null,
  },
  actor = null,
) => {
  ensureCollection(collectionId, `${resourceType} collection`);

  const { scope } = await getAuthorizedScope({
    actor,
    permission: PERMISSIONS.VIEW_REPORTS,
  });
  assertAdminLike(scope);

  const safeLimit = clampLimit(limit);
  const queries = [Query.orderDesc(orderField), Query.limit(safeLimit), ...scopeQueries(resourceType, scope)];

  if (cursor) queries.push(Query.cursorAfter(String(cursor)));

  if (filters?.entityId) queries.push(Query.equal('entityId', String(filters.entityId)));
  if (filters?.clientId) queries.push(Query.equal('clientId', String(filters.clientId)));
  if (filters?.siteId) queries.push(Query.equal('siteId', String(filters.siteId)));
  if (filters?.severity) queries.push(Query.equal('severity', String(filters.severity)));
  if (filters?.status) queries.push(Query.equal('status', String(filters.status)));
  if (filters?.riskType) queries.push(Query.equal('riskType', String(filters.riskType)));

  if (dateField && filters?.from) {
    queries.push(Query.greaterThanEqual(dateField, new Date(filters.from).toISOString()));
  }
  if (dateField && filters?.to) {
    queries.push(Query.lessThanEqual(dateField, new Date(filters.to).toISOString()));
  }

  const response = await databases.listDocuments(dbId, collectionId, queries);
  const last = response.documents[response.documents.length - 1] || null;

  return {
    documents: response.documents,
    total: response.total,
    nextCursor: response.documents.length >= safeLimit && last ? last.$id : null,
  };
};

export const listLegalEntities = (options = {}, actor = null) =>
  listCollection(
    {
      resourceType: RESOURCE_TYPES.LEGAL_ENTITIES,
      collectionId: collections.legalEntities,
      orderField: 'createdAt',
      ...options,
    },
    actor,
  );

export const listUnifiedAlerts = async ({ limit = DEFAULT_LIMIT, cursor = null, filters = {} } = {}, actor = null) => {
  const [margin, leakage, concentration, dependency] = await Promise.all([
    listCollection(
      {
        resourceType: RESOURCE_TYPES.MARGIN_ALERTS,
        collectionId: collections.marginAlerts,
        orderField: 'createdAt',
        limit,
        cursor,
        filters,
      },
      actor,
    ),
    listCollection(
      {
        resourceType: RESOURCE_TYPES.MARGIN_LEAKAGE_ALERTS,
        collectionId: collections.marginLeakageAlerts,
        orderField: 'createdAt',
        limit,
        cursor,
        filters,
      },
      actor,
    ),
    listCollection(
      {
        resourceType: RESOURCE_TYPES.CONCENTRATION_ALERTS,
        collectionId: collections.concentrationAlerts,
        orderField: 'createdAt',
        limit,
        cursor,
        filters,
      },
      actor,
    ),
    listCollection(
      {
        resourceType: RESOURCE_TYPES.CONTRACT_DEPENDENCY_ALERTS,
        collectionId: collections.contractDependencyAlerts,
        orderField: 'createdAt',
        limit,
        cursor,
        filters,
      },
      actor,
    ),
  ]);

  const documents = [
    ...margin.documents.map((doc) => ({ ...doc, source: 'margin_alerts' })),
    ...leakage.documents.map((doc) => ({ ...doc, source: 'margin_leakage_alerts' })),
    ...concentration.documents.map((doc) => ({ ...doc, source: 'concentration_alerts' })),
    ...dependency.documents.map((doc) => ({ ...doc, source: 'contract_dependency_alerts' })),
  ].sort((a, b) => new Date(b.createdAt || b.generatedAt || 0).getTime() - new Date(a.createdAt || a.generatedAt || 0).getTime());

  return {
    documents: documents.slice(0, clampLimit(limit)),
    total: margin.total + leakage.total + concentration.total + dependency.total,
    nextCursor: null,
  };
};

export const listCashflowDashboard = (options = {}, actor = null) =>
  listCollection(
    {
      resourceType: RESOURCE_TYPES.CASHFLOW_SNAPSHOTS,
      collectionId: collections.cashflowSnapshots,
      orderField: 'generatedAt',
      ...options,
    },
    actor,
  );

export const listResilienceDashboard = (options = {}, actor = null) =>
  listCollection(
    {
      resourceType: RESOURCE_TYPES.RESILIENCE_SNAPSHOTS,
      collectionId: collections.resilienceSnapshots,
      orderField: 'generatedAt',
      ...options,
    },
    actor,
  );

export const listEmploymentRiskDashboard = (options = {}, actor = null) =>
  listCollection(
    {
      resourceType: RESOURCE_TYPES.EMPLOYMENT_RISK_FLAGS,
      collectionId: collections.employmentRiskFlags,
      orderField: 'createdAt',
      ...options,
    },
    actor,
  );

export const listTenderPricingDashboard = async ({ limit = DEFAULT_LIMIT, cursor = null, filters = {} } = {}, actor = null) => {
  const [pricing, win] = await Promise.all([
    listCollection(
      {
        resourceType: RESOURCE_TYPES.TENDER_MODELS,
        collectionId: collections.tenderModels,
        orderField: 'generatedAt',
        limit,
        cursor,
        filters,
      },
      actor,
    ),
    listCollection(
      {
        resourceType: RESOURCE_TYPES.TENDER_WIN_MODELS,
        collectionId: collections.tenderWinModels,
        orderField: 'generatedAt',
        limit,
        cursor,
        filters,
      },
      actor,
    ),
  ]);

  return {
    pricing,
    win,
  };
};
