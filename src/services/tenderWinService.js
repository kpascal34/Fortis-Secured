import { ID, Query } from 'appwrite';
import { databases, config } from '../lib/appwrite.js';
import { PERMISSIONS, ROLES } from '../lib/rbac.ts';
import { ensureDatabaseConfig, getAuthorizedScope } from '../lib/serviceSecurity.js';
import { RESOURCE_TYPES, scopeQueries } from '../lib/tenancyScope.js';
import { logEvent } from './auditLogService.js';

const dbId = config.databaseId;
const tenderWinModelsCol = config.tenderWinModelsCollectionId || 'tender_win_models';

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

const DEFAULT_WEIGHTS = Object.freeze({
  competitiveness: Number(import.meta.env.VITE_TENDER_WIN_W1 || 0.45),
  experience: Number(import.meta.env.VITE_TENDER_WIN_W2 || 0.4),
  riskPremium: Number(import.meta.env.VITE_TENDER_WIN_W3 || 0.35),
});

const clampLimit = (value, fallback = DEFAULT_LIMIT) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, MAX_LIMIT);
};

const clamp01 = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.min(1, numeric));
};

const assertAdminLike = (scope) => {
  const role = String(scope?.role || '');
  if (role !== ROLES.ADMIN && role !== ROLES.ENTITY_ADMIN) {
    throw new Error('Permission denied: tender win modelling is restricted to admin users.');
  }
};

const ensureCollections = () => {
  ensureDatabaseConfig(tenderWinModelsCol, 'tender win models collection');
};

export const predictWinProbability = (
  {
    competitivenessScore,
    experienceScore,
    riskPremiumScore,
  },
  weights = DEFAULT_WEIGHTS,
) => {
  const w1 = Number(weights?.competitiveness ?? DEFAULT_WEIGHTS.competitiveness);
  const w2 = Number(weights?.experience ?? DEFAULT_WEIGHTS.experience);
  const w3 = Number(weights?.riskPremium ?? DEFAULT_WEIGHTS.riskPremium);

  const probability =
    w1 * clamp01(competitivenessScore) +
    w2 * clamp01(experienceScore) -
    w3 * clamp01(riskPremiumScore);

  return clamp01(probability);
};

export const createTenderWinModel = async (
  {
    entityId,
    region,
    sector,
    proposedRate,
    competitivenessScore,
    experienceScore,
    riskPremiumScore,
    weights = null,
  } = {},
  actor = null,
) => {
  ensureCollections();

  if (!entityId) throw new Error('entityId is required for tender win model creation.');
  if (!region) throw new Error('region is required for tender win model creation.');
  if (!sector) throw new Error('sector is required for tender win model creation.');

  const { actor: resolvedActor, scope } = await getAuthorizedScope({
    actor,
    permission: PERMISSIONS.VIEW_FINANCE,
  });
  assertAdminLike(scope);

  const predictedWinProbability = predictWinProbability(
    {
      competitivenessScore,
      experienceScore,
      riskPremiumScore,
    },
    weights || DEFAULT_WEIGHTS,
  );

  const payload = {
    entityId: String(entityId),
    region: String(region),
    sector: String(sector),
    proposedRate: Number(proposedRate || 0),
    competitivenessScore: Number(clamp01(competitivenessScore).toFixed(6)),
    experienceScore: Number(clamp01(experienceScore).toFixed(6)),
    riskPremiumScore: Number(clamp01(riskPremiumScore).toFixed(6)),
    predictedWinProbability: Number(predictedWinProbability.toFixed(6)),
    generatedAt: new Date().toISOString(),
  };

  const doc = await databases.createDocument(dbId, tenderWinModelsCol, ID.unique(), payload);

  await logEvent({
    actorId: resolvedActor.$id,
    action: 'TENDER_WIN_MODEL_CREATED',
    resourceType: RESOURCE_TYPES.TENDER_WIN_MODELS,
    resourceId: doc.$id,
    metadata: {
      entityId: payload.entityId,
      region: payload.region,
      sector: payload.sector,
      predictedWinProbability: payload.predictedWinProbability,
      weights: weights || DEFAULT_WEIGHTS,
    },
  });

  return {
    ...doc,
    bidRecommendation: predictedWinProbability >= 0.55 ? 'bid' : 'no_bid',
  };
};

export const listTenderWinModels = async (
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
    ...scopeQueries(RESOURCE_TYPES.TENDER_WIN_MODELS, scope),
  ];

  if (cursor) queries.push(Query.cursorAfter(String(cursor)));
  if (filters?.entityId) queries.push(Query.equal('entityId', String(filters.entityId)));
  if (filters?.region) queries.push(Query.equal('region', String(filters.region)));
  if (filters?.sector) queries.push(Query.equal('sector', String(filters.sector)));

  const response = await databases.listDocuments(dbId, tenderWinModelsCol, queries);
  const last = response.documents[response.documents.length - 1] || null;

  return {
    documents: response.documents,
    total: response.total,
    nextCursor: response.documents.length >= safeLimit && last ? last.$id : null,
  };
};
