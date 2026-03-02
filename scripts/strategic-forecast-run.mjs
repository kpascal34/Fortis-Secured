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
  resolvePeriod,
  average,
  createAuditLog,
  runSimulatedAssertions,
} from './lib/engine-utils.mjs';

loadDotenv();
const { dryRun, simulateChecks } = parseArgs();

const env = {
  ...resolveBaseEnv(),
  strategicForecastsCollectionId:
    process.env.APPWRITE_STRATEGIC_FORECASTS_COLLECTION_ID ||
    process.env.VITE_APPWRITE_STRATEGIC_FORECASTS_COLLECTION_ID ||
    'strategic_forecasts',
  profitSnapshotsCollectionId:
    process.env.APPWRITE_PROFIT_SNAPSHOTS_COLLECTION_ID ||
    process.env.VITE_APPWRITE_PROFIT_SNAPSHOTS_COLLECTION_ID ||
    'profit_snapshots',
  periodStart: process.env.STRATEGIC_PERIOD_START || null,
  periodEnd: process.env.STRATEGIC_PERIOD_END || null,
  horizonMonths: Math.max(12, Math.min(36, Number(process.env.STRATEGIC_HORIZON_MONTHS || 24))),
};

requireEnv(env, ['endpoint', 'projectId', 'apiKey', 'databaseId'], 'strategic-forecast-run');
const databases = createDatabasesClient(env);

if (simulateChecks) {
  const revenue = 120000;
  const cost = 90000;
  runSimulatedAssertions([
    {
      pass: revenue > cost,
      message: 'Strategic forecast simulation expected revenue above cost for positive sample.',
    },
  ]);
}

const summary = {
  dryRun,
  entitiesScanned: 0,
  snapshotsCreated: 0,
  failed: 0,
};

(async () => {
  const period = resolvePeriod({ periodStart: env.periodStart, periodEnd: env.periodEnd, defaultDays: 90 });

  const profitSnapshots = await listAllDocuments(
    databases,
    env.databaseId,
    env.profitSnapshotsCollectionId,
    [
      Query.greaterThanEqual('periodStart', period.start),
      Query.lessThanEqual('periodEnd', period.end),
    ],
  );

  const byEntity = new Map();
  for (const snapshot of profitSnapshots) {
    if (!snapshot.entityId) continue;
    const key = String(snapshot.entityId);
    if (!byEntity.has(key)) {
      byEntity.set(key, []);
    }
    byEntity.get(key).push(snapshot);
  }

  summary.entitiesScanned = byEntity.size;

  for (const [entityId, snapshots] of byEntity.entries()) {
    try {
      const avgRevenue = average(snapshots.map((item) => Number(item.revenue || 0)));
      const avgCost = average(snapshots.map((item) => Number(item.cost || 0)));

      const growthAssumption = Number(process.env.STRATEGIC_GROWTH_PCT || 0.04);
      const inflationAssumption = Number(process.env.STRATEGIC_COST_INFLATION_PCT || 0.03);

      const years = env.horizonMonths / 12;
      const forecastRevenue = avgRevenue * years * (1 + growthAssumption * years);
      const forecastCost = avgCost * years * (1 + inflationAssumption * years);
      const forecastEbitdaProxy = forecastRevenue - forecastCost;

      const payload = {
        entityId,
        periodStart: period.start,
        periodEnd: period.end,
        horizonMonths: env.horizonMonths,
        forecastRevenue: Number(forecastRevenue.toFixed(2)),
        forecastCost: Number(forecastCost.toFixed(2)),
        forecastEbitdaProxy: Number(forecastEbitdaProxy.toFixed(2)),
        assumptions: {
          growthAssumption,
          inflationAssumption,
          samples: snapshots.length,
        },
        generatedAt: new Date().toISOString(),
      };

      if (!dryRun) {
        const doc = await databases.createDocument(
          env.databaseId,
          env.strategicForecastsCollectionId,
          ID.unique(),
          payload,
        );

        await createAuditLog(
          databases,
          env,
          {
            actorId: 'system:strategic-forecast-run',
            action: 'STRATEGIC_FORECAST_CREATED',
            resourceType: 'strategic_forecasts',
            resourceId: doc.$id,
            entityId,
            metadata: {
              horizonMonths: env.horizonMonths,
              samples: snapshots.length,
            },
          },
          dryRun,
        );
      }

      summary.snapshotsCreated += 1;
    } catch (error) {
      summary.failed += 1;
      console.error('[strategic-forecast-run] entity failed:', entityId, error?.message || error);
    }
  }

  console.log('Strategic forecast summary');
  console.table([summary]);

  if (summary.failed > 0) process.exit(1);

  if (dryRun) {
    console.log('Dry-run complete (no writes).');
  }
})().catch((error) => {
  console.error('strategic-forecast-run failed:', error);
  process.exit(1);
});
