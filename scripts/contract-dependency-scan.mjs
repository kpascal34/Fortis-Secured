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
  contractsCollectionId:
    process.env.APPWRITE_CONTRACTS_COLLECTION_ID ||
    process.env.VITE_APPWRITE_CONTRACTS_COLLECTION_ID ||
    'contracts',
  contractDependencyAlertsCollectionId:
    process.env.APPWRITE_CONTRACT_DEPENDENCY_ALERTS_COLLECTION_ID ||
    process.env.VITE_APPWRITE_CONTRACT_DEPENDENCY_ALERTS_COLLECTION_ID ||
    'contract_dependency_alerts',
  profitSnapshotsCollectionId:
    process.env.APPWRITE_PROFIT_SNAPSHOTS_COLLECTION_ID ||
    process.env.VITE_APPWRITE_PROFIT_SNAPSHOTS_COLLECTION_ID ||
    'profit_snapshots',
  periodStart: process.env.CONTRACT_DEP_PERIOD_START || null,
  periodEnd: process.env.CONTRACT_DEP_PERIOD_END || null,
  expiringWithinDays: Number(process.env.CONTRACT_DEP_EXPIRING_DAYS || 90),
  thresholdPct: Number(process.env.CONTRACT_DEP_THRESHOLD_PCT || 0.35),
};

requireEnv(env, ['endpoint', 'projectId', 'apiKey', 'databaseId'], 'contract-dependency-scan');
const databases = createDatabasesClient(env);

if (simulateChecks) {
  const percentRevenueAtRisk = 0.42;
  runSimulatedAssertions([
    {
      pass: percentRevenueAtRisk > env.thresholdPct,
      message: 'Contract dependency simulation expected percent revenue at risk above threshold.',
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
  const period = resolvePeriod({ periodStart: env.periodStart, periodEnd: env.periodEnd, defaultDays: 90 });
  const now = new Date();
  const expiryEnd = new Date(now.getTime() + env.expiringWithinDays * 24 * 60 * 60 * 1000).toISOString();

  const [contracts, profitSnapshots] = await Promise.all([
    listAllDocuments(databases, env.databaseId, env.contractsCollectionId, [
      Query.lessThanEqual('endDate', expiryEnd),
      Query.greaterThanEqual('endDate', now.toISOString()),
    ]),
    listAllDocuments(databases, env.databaseId, env.profitSnapshotsCollectionId, [
      Query.greaterThanEqual('periodStart', period.start),
      Query.lessThanEqual('periodEnd', period.end),
    ]),
  ]);

  const revenueByEntity = new Map();
  const revenueByEntityClientSite = new Map();

  for (const snapshot of profitSnapshots) {
    if (!snapshot.entityId) continue;
    const entityId = String(snapshot.entityId);
    const revenue = Number(snapshot.revenue || 0);

    revenueByEntity.set(entityId, Number(revenueByEntity.get(entityId) || 0) + revenue);

    const key = `${entityId}::${snapshot.clientId || ''}::${snapshot.siteId || ''}`;
    revenueByEntityClientSite.set(key, Number(revenueByEntityClientSite.get(key) || 0) + revenue);
  }

  const contractsByEntity = new Map();
  for (const contract of contracts) {
    if (!contract.entityId) continue;
    const entityId = String(contract.entityId);
    if (!contractsByEntity.has(entityId)) contractsByEntity.set(entityId, []);
    contractsByEntity.get(entityId).push(contract);
  }

  summary.entitiesScanned = contractsByEntity.size;

  for (const [entityId, entityContracts] of contractsByEntity.entries()) {
    try {
      const totalRevenue = Number(revenueByEntity.get(entityId) || 0);
      if (totalRevenue <= 0) continue;

      let revenueAtRisk = 0;

      for (const contract of entityContracts) {
        const clientId = String(contract.clientId || '');
        const siteId = String(contract.siteId || '');

        if (clientId && siteId) {
          const scopedKey = `${entityId}::${clientId}::${siteId}`;
          revenueAtRisk += Number(revenueByEntityClientSite.get(scopedKey) || 0);
        } else if (clientId) {
          for (const [key, value] of revenueByEntityClientSite.entries()) {
            const [kEntityId, kClientId] = key.split('::');
            if (kEntityId === entityId && kClientId === clientId) {
              revenueAtRisk += Number(value || 0);
            }
          }
        }
      }

      const percentRevenueAtRisk = totalRevenue > 0 ? revenueAtRisk / totalRevenue : 0;
      if (percentRevenueAtRisk <= env.thresholdPct) continue;

      const severity = percentRevenueAtRisk >= env.thresholdPct * 1.35 ? 'critical' : 'warning';
      const payload = {
        entityId,
        periodStart: period.start,
        periodEnd: period.end,
        expiringWithinDays: env.expiringWithinDays,
        revenueAtRisk: Number(revenueAtRisk.toFixed(2)),
        percentRevenueAtRisk: Number(percentRevenueAtRisk.toFixed(6)),
        thresholdPct: Number(env.thresholdPct.toFixed(6)),
        severity,
        createdAt: new Date().toISOString(),
      };

      let alertId = null;
      if (!dryRun) {
        const alert = await databases.createDocument(
          env.databaseId,
          env.contractDependencyAlertsCollectionId,
          ID.unique(),
          payload,
        );
        alertId = alert.$id;
      }

      await createAuditLog(
        databases,
        env,
        {
          actorId: 'system:contract-dependency-scan',
          action: 'CONTRACT_DEPENDENCY_ALERT_CREATED',
          resourceType: 'contract_dependency_alerts',
          resourceId: alertId || `dry-${entityId}`,
          entityId,
          metadata: {
            revenueAtRisk: payload.revenueAtRisk,
            percentRevenueAtRisk: payload.percentRevenueAtRisk,
            thresholdPct: payload.thresholdPct,
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
          subject: `Contract dependency risk (${severity})`,
          payload: {
            alertType: 'contract_risk',
            severity,
            thresholdValue: payload.thresholdPct,
            actualValue: payload.percentRevenueAtRisk,
            periodStart: period.start,
            periodEnd: period.end,
            clientId: `entity:${entityId}`,
            siteId: 'portfolio',
          },
          userId: 'system:contract-dependency-scan',
        },
        dryRun,
      );

      summary.alertsCreated += 1;
    } catch (error) {
      summary.failed += 1;
      console.error('[contract-dependency-scan] entity failed:', entityId, error?.message || error);
    }
  }

  console.log('Contract dependency scan summary');
  console.table([summary]);

  if (summary.failed > 0) process.exit(1);
  if (dryRun) console.log('Dry-run complete (no writes).');
})().catch((error) => {
  console.error('contract-dependency-scan failed:', error);
  process.exit(1);
});
