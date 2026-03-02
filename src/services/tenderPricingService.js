import { ID, Query } from 'appwrite';
import { databases, config } from '../lib/appwrite.js';
import { PERMISSIONS, ROLES } from '../lib/rbac.ts';
import { ensureDatabaseConfig, getAuthorizedScope } from '../lib/serviceSecurity.js';
import { RESOURCE_TYPES, scopeQueries } from '../lib/tenancyScope.js';
import { logEvent } from './auditLogService.js';

const dbId = config.databaseId;
const tenderModelsCol = config.tenderModelsCollectionId || 'tender_models';

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

const clampLimit = (value, fallback = DEFAULT_LIMIT) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, MAX_LIMIT);
};

const toNumber = (value, label) => {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    throw new Error(`Invalid numeric value for ${label}: ${value}`);
  }
  return number;
};

const ensureCollections = () => {
  ensureDatabaseConfig(tenderModelsCol, 'tender models collection');
};

const assertAdminLike = (scope) => {
  const role = String(scope?.role || '');
  if (role !== ROLES.ADMIN && role !== ROLES.ENTITY_ADMIN) {
    throw new Error('Permission denied: tender pricing is restricted to admin users.');
  }
};

export const calculateRecommendedHourlyRate = ({ effectiveCostRate, riskFactor, targetMarginPct }) => {
  const costRate = toNumber(effectiveCostRate, 'effectiveCostRate');
  const risk = toNumber(riskFactor, 'riskFactor');
  const margin = toNumber(targetMarginPct, 'targetMarginPct');

  if (margin >= 1) {
    throw new Error('targetMarginPct must be less than 1.0.');
  }

  if (margin < 0) {
    throw new Error('targetMarginPct must be >= 0.');
  }

  const denominator = 1 - margin;
  if (denominator <= 0) {
    throw new Error('Invalid margin denominator (1 - targetMarginPct) <= 0.');
  }

  return (costRate * (1 + risk)) / denominator;
};

export const createTenderModel = async (
  {
    entityId,
    clientId = null,
    siteId = null,
    effectiveCostRate,
    riskFactor,
    targetMarginPct,
    assumptions = {},
  } = {},
  actor = null,
) => {
  ensureCollections();

  if (!entityId) {
    throw new Error('entityId is required for tender model creation.');
  }

  const { actor: resolvedActor, scope } = await getAuthorizedScope({
    actor,
    permission: PERMISSIONS.VIEW_FINANCE,
  });
  assertAdminLike(scope);

  const recommendedHourlyRate = calculateRecommendedHourlyRate({
    effectiveCostRate,
    riskFactor,
    targetMarginPct,
  });

  const payload = {
    entityId: String(entityId),
    clientId: clientId ? String(clientId) : null,
    siteId: siteId ? String(siteId) : null,
    targetMarginPct: Number(toNumber(targetMarginPct, 'targetMarginPct').toFixed(6)),
    riskFactor: Number(toNumber(riskFactor, 'riskFactor').toFixed(6)),
    effectiveCostRate: Number(toNumber(effectiveCostRate, 'effectiveCostRate').toFixed(6)),
    recommendedHourlyRate: Number(recommendedHourlyRate.toFixed(6)),
    assumptions: assumptions || {},
    generatedAt: new Date().toISOString(),
  };

  const doc = await databases.createDocument(dbId, tenderModelsCol, ID.unique(), payload);

  await logEvent({
    actorId: resolvedActor.$id,
    action: 'TENDER_MODEL_CREATED',
    resourceType: RESOURCE_TYPES.TENDER_MODELS,
    resourceId: doc.$id,
    clientId: payload.clientId,
    siteId: payload.siteId,
    metadata: {
      entityId: payload.entityId,
      recommendedHourlyRate: payload.recommendedHourlyRate,
    },
  });

  return doc;
};

export const listTenderModels = async (
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
    ...scopeQueries(RESOURCE_TYPES.TENDER_MODELS, scope),
  ];

  if (cursor) queries.push(Query.cursorAfter(String(cursor)));
  if (filters?.entityId) queries.push(Query.equal('entityId', String(filters.entityId)));
  if (filters?.clientId) queries.push(Query.equal('clientId', String(filters.clientId)));
  if (filters?.siteId) queries.push(Query.equal('siteId', String(filters.siteId)));

  const response = await databases.listDocuments(dbId, tenderModelsCol, queries);
  const last = response.documents[response.documents.length - 1] || null;

  return {
    documents: response.documents,
    total: response.total,
    nextCursor: response.documents.length >= safeLimit && last ? last.$id : null,
  };
};
