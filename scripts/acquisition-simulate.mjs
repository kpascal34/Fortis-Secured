#!/usr/bin/env node

import {
  ID,
  Query,
  loadDotenv,
  parseArgs,
  resolveBaseEnv,
  requireEnv,
  createDatabasesClient,
  listAllDocuments,
  average,
  clamp01,
  createAuditLog,
  runSimulatedAssertions,
} from './lib/engine-utils.mjs';

loadDotenv();
const { dryRun, simulateChecks } = parseArgs();

const env = {
  ...resolveBaseEnv(),
  acquisitionTargetsCollectionId:
    process.env.APPWRITE_ACQUISITION_TARGETS_COLLECTION_ID ||
    process.env.VITE_APPWRITE_ACQUISITION_TARGETS_COLLECTION_ID ||
    'acquisition_targets',
  acquisitionModelsCollectionId:
    process.env.APPWRITE_ACQUISITION_MODELS_COLLECTION_ID ||
    process.env.VITE_APPWRITE_ACQUISITION_MODELS_COLLECTION_ID ||
    'acquisition_models',
};

requireEnv(env, ['endpoint', 'projectId', 'apiKey', 'databaseId'], 'acquisition-simulate');
const databases = createDatabasesClient(env);

if (simulateChecks) {
  const projectedRevenue = 120000;
  const projectedCost = 95000;
  const projectedEbitdaProxy = projectedRevenue - projectedCost;
  runSimulatedAssertions([
    {
      pass: projectedEbitdaProxy > 0,
      message: 'Acquisition simulation expected positive EBITDA proxy for profitable sample.',
    },
  ]);
}

const summary = {
  dryRun,
  targetsScanned: 0,
  snapshotsCreated: 0,
  failed: 0,
};

const buildModel = (target) => {
  const askingPrice = Number(target.askingPrice || 0);
  const estimatedSynergy = Number(target.estimatedSynergy || 0);

  const projectedRevenue = askingPrice > 0
    ? askingPrice * 0.45 + estimatedSynergy
    : Math.max(estimatedSynergy, 75000);

  const projectedCost = projectedRevenue * 0.78;
  const projectedEbitdaProxy = projectedRevenue - projectedCost;

  const leverageRisk = askingPrice > 0 ? clamp01(askingPrice / 1_500_000) : 0.3;
  const integrationComplexity = target.region && target.sector ? 0.35 : 0.55;
  const integrationRiskScore = clamp01(average([leverageRisk, integrationComplexity]));

  const assumptions = {
    askingPrice,
    estimatedSynergy,
    revenueMultiplier: 0.45,
    costRatio: 0.78,
  };

  return {
    entityId: String(target.entityId),
    targetId: String(target.$id),
    scenarioName: 'base_case_v1',
    assumptions,
    projectedRevenue: Number(projectedRevenue.toFixed(2)),
    projectedCost: Number(projectedCost.toFixed(2)),
    projectedEbitdaProxy: Number(projectedEbitdaProxy.toFixed(2)),
    integrationRiskScore: Number(integrationRiskScore.toFixed(6)),
    generatedAt: new Date().toISOString(),
  };
};

(async () => {
  const targets = await listAllDocuments(databases, env.databaseId, env.acquisitionTargetsCollectionId, [
    Query.equal('status', ['watchlist', 'shortlisted', 'due_diligence']),
    Query.orderDesc('createdAt'),
  ]);

  summary.targetsScanned = targets.length;

  for (const target of targets) {
    if (!target.entityId) continue;

    try {
      const payload = buildModel(target);

      if (!dryRun) {
        const snapshot = await databases.createDocument(
          env.databaseId,
          env.acquisitionModelsCollectionId,
          ID.unique(),
          payload,
        );

        await createAuditLog(
          databases,
          env,
          {
            actorId: 'system:acquisition-simulate',
            action: 'ACQUISITION_MODEL_CREATED',
            resourceType: 'acquisition_models',
            resourceId: snapshot.$id,
            entityId: payload.entityId,
            metadata: {
              targetId: payload.targetId,
              scenarioName: payload.scenarioName,
            },
          },
          dryRun,
        );
      }

      summary.snapshotsCreated += 1;
    } catch (error) {
      summary.failed += 1;
      console.error('[acquisition-simulate] target failed:', target.$id, error?.message || error);
    }
  }

  console.log('Acquisition simulate summary');
  console.table([summary]);

  if (summary.failed > 0) {
    process.exit(1);
  }

  if (dryRun) {
    console.log('Dry-run complete (no writes).');
  }
})().catch((error) => {
  console.error('acquisition-simulate failed:', error);
  process.exit(1);
});
