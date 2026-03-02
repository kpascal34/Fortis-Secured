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
  createAuditLog,
  enqueueOutbox,
  EVENT_TYPES,
  runSimulatedAssertions,
} from './lib/engine-utils.mjs';

loadDotenv();
const { dryRun, simulateChecks } = parseArgs();

const env = {
  ...resolveBaseEnv(),
  concentrationAlertsCollectionId:
    process.env.APPWRITE_CONCENTRATION_ALERTS_COLLECTION_ID ||
    process.env.VITE_APPWRITE_CONCENTRATION_ALERTS_COLLECTION_ID ||
    'concentration_alerts',
  profitSnapshotsCollectionId:
    process.env.APPWRITE_PROFIT_SNAPSHOTS_COLLECTION_ID ||
    process.env.VITE_APPWRITE_PROFIT_SNAPSHOTS_COLLECTION_ID ||
    'profit_snapshots',
  periodStart: process.env.CONCENTRATION_PERIOD_START || null,
  periodEnd: process.env.CONCENTRATION_PERIOD_END || null,
  thresholdPct: Number(process.env.CONCENTRATION_THRESHOLD_PCT || 0.6),
};

requireEnv(env, ['endpoint', 'projectId', 'apiKey', 'databaseId'], 'concentration-scan');
const databases = createDatabasesClient(env);

if (simulateChecks) {
  const topClients = [50, 30, 10];
  const total = 100;
  const concentrationPct = topClients.reduce((sum, value) => sum + value, 0) / total;
  runSimulatedAssertions([
    {
      pass: concentrationPct > 0.8,
      message: 'Concentration simulation expected top3 share above 80%.',
    },
  ]);
}

const summary = {
  dryRun,
  entitiesScanned: 0,
  alertsCreated: 0,
  failed: 0,
};

(async () => {
  const period = resolvePeriod({ periodStart: env.periodStart, periodEnd: env.periodEnd, defaultDays: 30 });

  const snapshots = await listAllDocuments(databases, env.databaseId, env.profitSnapshotsCollectionId, [
    Query.greaterThanEqual('periodStart', period.start),
    Query.lessThanEqual('periodEnd', period.end),
  ]);

  const byEntity = new Map();
  for (const snapshot of snapshots) {
    if (!snapshot.entityId || !snapshot.clientId) continue;
    const entityId = String(snapshot.entityId);
    const clientId = String(snapshot.clientId);

    if (!byEntity.has(entityId)) byEntity.set(entityId, new Map());
    const bucket = byEntity.get(entityId);
    bucket.set(clientId, Number(bucket.get(clientId) || 0) + Number(snapshot.revenue || 0));
  }

  summary.entitiesScanned = byEntity.size;

  for (const [entityId, revenueByClient] of byEntity.entries()) {
    try {
      const rows = Array.from(revenueByClient.entries())
        .map(([clientId, revenue]) => ({ clientId, revenue: Number(revenue.toFixed(2)) }))
        .sort((a, b) => b.revenue - a.revenue);

      const totalRevenue = rows.reduce((sum, row) => sum + row.revenue, 0);
      if (totalRevenue <= 0) continue;

      const topClients = rows.slice(0, 3).map((row) => ({
        clientId: row.clientId,
        revenue: row.revenue,
        pct: Number((row.revenue / totalRevenue).toFixed(6)),
      }));

      const concentrationPct = topClients.reduce((sum, row) => sum + row.pct, 0);
      if (concentrationPct <= env.thresholdPct) continue;

      const severity = concentrationPct >= env.thresholdPct * 1.25 ? 'critical' : 'warning';
      const payload = {
        entityId,
        periodStart: period.start,
        periodEnd: period.end,
        topClients,
        concentrationPct: Number(concentrationPct.toFixed(6)),
        thresholdPct: Number(env.thresholdPct.toFixed(6)),
        severity,
        createdAt: new Date().toISOString(),
      };

      let alertId = null;
      if (!dryRun) {
        const alert = await databases.createDocument(
          env.databaseId,
          env.concentrationAlertsCollectionId,
          ID.unique(),
          payload,
        );
        alertId = alert.$id;
      }

      await createAuditLog(
        databases,
        env,
        {
          actorId: 'system:concentration-scan',
          action: 'CONCENTRATION_ALERT_CREATED',
          resourceType: 'concentration_alerts',
          resourceId: alertId || `dry-${entityId}`,
          entityId,
          metadata: {
            concentrationPct: payload.concentrationPct,
            thresholdPct: payload.thresholdPct,
            topClients,
          },
        },
        dryRun,
      );

      await enqueueOutbox(
        databases,
        env,
        {
          eventType: EVENT_TYPES.MARGIN_ALERT_CREATED,
          toEmail: env.opsEmail,
          subject: `Client concentration alert (${severity})`,
          payload: {
            alertType: 'contract_risk',
            severity,
            thresholdValue: payload.thresholdPct,
            actualValue: payload.concentrationPct,
            periodStart: period.start,
            periodEnd: period.end,
            clientId: `entity:${entityId}`,
            siteId: 'portfolio',
          },
          userId: 'system:concentration-scan',
        },
        dryRun,
      );

      summary.alertsCreated += 1;
    } catch (error) {
      summary.failed += 1;
      console.error('[concentration-scan] entity failed:', entityId, error?.message || error);
    }
  }

  console.log('Concentration scan summary');
  console.table([summary]);

  if (summary.failed > 0) process.exit(1);

  if (dryRun) console.log('Dry-run complete (no writes).');
})().catch((error) => {
  console.error('concentration-scan failed:', error);
  process.exit(1);
});
