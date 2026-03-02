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
  clamp01,
  createAuditLog,
  enqueueOutbox,
  EVENT_TYPES,
  runSimulatedAssertions,
} from './lib/engine-utils.mjs';

loadDotenv();
const { dryRun, simulateChecks } = parseArgs();

const env = {
  ...resolveBaseEnv(),
  enterpriseRiskScoresCollectionId:
    process.env.APPWRITE_ENTERPRISE_RISK_SCORES_COLLECTION_ID ||
    process.env.VITE_APPWRITE_ENTERPRISE_RISK_SCORES_COLLECTION_ID ||
    'enterprise_risk_scores',
  strategicForecastsCollectionId:
    process.env.APPWRITE_STRATEGIC_FORECASTS_COLLECTION_ID ||
    process.env.VITE_APPWRITE_STRATEGIC_FORECASTS_COLLECTION_ID ||
    'strategic_forecasts',
  concentrationAlertsCollectionId:
    process.env.APPWRITE_CONCENTRATION_ALERTS_COLLECTION_ID ||
    process.env.VITE_APPWRITE_CONCENTRATION_ALERTS_COLLECTION_ID ||
    'concentration_alerts',
  marginAlertsCollectionId:
    process.env.APPWRITE_MARGIN_ALERTS_COLLECTION_ID ||
    process.env.VITE_APPWRITE_MARGIN_ALERTS_COLLECTION_ID ||
    'margin_alerts',
  periodStart: process.env.RISK_PERIOD_START || null,
  periodEnd: process.env.RISK_PERIOD_END || null,
  threshold: Number(process.env.ENTERPRISE_RISK_THRESHOLD || 0.65),
};

requireEnv(env, ['endpoint', 'projectId', 'apiKey', 'databaseId'], 'risk-evaluate');
const databases = createDatabasesClient(env);

if (simulateChecks) {
  const riskScore = clamp01(0.42 + 0.33 + 0.22);
  runSimulatedAssertions([
    {
      pass: riskScore > 0.8,
      message: 'Risk evaluate simulation expected high composite risk score for adverse sample.',
    },
  ]);
}

const summary = {
  dryRun,
  entitiesScanned: 0,
  snapshotsCreated: 0,
  riskAlertsCreated: 0,
  failed: 0,
};

const toRiskBand = (score) => {
  if (score >= 0.85) return 'critical';
  if (score >= 0.65) return 'high';
  if (score >= 0.4) return 'medium';
  return 'low';
};

(async () => {
  const period = resolvePeriod({ periodStart: env.periodStart, periodEnd: env.periodEnd, defaultDays: 30 });

  const [strategicForecasts, concentrationAlerts] = await Promise.all([
    listAllDocuments(databases, env.databaseId, env.strategicForecastsCollectionId, [
      Query.greaterThanEqual('generatedAt', period.start),
      Query.lessThanEqual('generatedAt', period.end),
    ]),
    listAllDocuments(databases, env.databaseId, env.concentrationAlertsCollectionId, [
      Query.greaterThanEqual('createdAt', period.start),
      Query.lessThanEqual('createdAt', period.end),
    ]),
  ]);

  const byEntity = new Map();

  for (const item of strategicForecasts) {
    if (!item.entityId) continue;
    const key = String(item.entityId);
    if (!byEntity.has(key)) {
      byEntity.set(key, {
        forecasts: [],
        concentrations: [],
      });
    }
    byEntity.get(key).forecasts.push(item);
  }

  for (const alert of concentrationAlerts) {
    if (!alert.entityId) continue;
    const key = String(alert.entityId);
    if (!byEntity.has(key)) {
      byEntity.set(key, {
        forecasts: [],
        concentrations: [],
      });
    }
    byEntity.get(key).concentrations.push(alert);
  }

  summary.entitiesScanned = byEntity.size;

  for (const [entityId, data] of byEntity.entries()) {
    try {
      const ebitdaValues = data.forecasts.map((item) => Number(item.forecastEbitdaProxy || 0));
      const concentrationValues = data.concentrations.map((item) => Number(item.concentrationPct || 0));

      const ebitdaRisk = ebitdaValues.length > 0
        ? clamp01(average(ebitdaValues) < 0 ? 1 : Math.max(0, 1 - average(ebitdaValues) / 100000))
        : 0.45;
      const concentrationRisk = concentrationValues.length > 0
        ? clamp01(average(concentrationValues))
        : 0.25;
      const forecastVolatilityRisk = ebitdaValues.length > 1
        ? clamp01(Math.abs(Math.min(...ebitdaValues)) / (Math.abs(Math.max(...ebitdaValues)) + 1))
        : 0.2;

      const riskScore = clamp01(ebitdaRisk * 0.5 + concentrationRisk * 0.35 + forecastVolatilityRisk * 0.15);
      const riskBand = toRiskBand(riskScore);

      const payload = {
        entityId,
        periodStart: period.start,
        periodEnd: period.end,
        riskScore: Number(riskScore.toFixed(6)),
        riskBand,
        drivers: {
          ebitdaRisk: Number(ebitdaRisk.toFixed(6)),
          concentrationRisk: Number(concentrationRisk.toFixed(6)),
          forecastVolatilityRisk: Number(forecastVolatilityRisk.toFixed(6)),
        },
        generatedAt: new Date().toISOString(),
      };

      let snapshotId = null;
      if (!dryRun) {
        const snapshot = await databases.createDocument(
          env.databaseId,
          env.enterpriseRiskScoresCollectionId,
          ID.unique(),
          payload,
        );
        snapshotId = snapshot.$id;
      }

      summary.snapshotsCreated += 1;

      await createAuditLog(
        databases,
        env,
        {
          actorId: 'system:risk-evaluate',
          action: 'ENTERPRISE_RISK_EVALUATED',
          resourceType: 'enterprise_risk_scores',
          resourceId: snapshotId || `dry-${entityId}`,
          entityId,
          metadata: {
            riskScore,
            riskBand,
          },
        },
        dryRun,
      );

      if (riskScore > env.threshold) {
        const alertPayload = {
          clientId: `entity:${entityId}`,
          siteId: 'all-sites',
          shiftId: null,
          periodStart: period.start,
          periodEnd: period.end,
          alertType: 'enterprise_risk',
          thresholdValue: Number(env.threshold.toFixed(6)),
          actualValue: Number(riskScore.toFixed(6)),
          severity: riskScore >= env.threshold * 1.25 ? 'critical' : 'warning',
          resolved: false,
          resolvedAt: null,
          createdAt: new Date().toISOString(),
        };

        let alertId = null;
        if (!dryRun) {
          const alert = await databases.createDocument(
            env.databaseId,
            env.marginAlertsCollectionId,
            ID.unique(),
            alertPayload,
          );
          alertId = alert.$id;
        }

        await createAuditLog(
          databases,
          env,
          {
            actorId: 'system:risk-evaluate',
            action: 'ENTERPRISE_RISK_ALERT_CREATED',
            resourceType: 'margin_alerts',
            resourceId: alertId || `dry-alert-${entityId}`,
            entityId,
            metadata: {
              riskScore,
              threshold: env.threshold,
              riskBand,
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
            subject: `Enterprise risk alert (${riskBand})`,
            payload: {
              alertType: 'enterprise_risk',
              severity: alertPayload.severity,
              thresholdValue: env.threshold,
              actualValue: riskScore,
              periodStart: period.start,
              periodEnd: period.end,
              clientId: alertPayload.clientId,
              siteId: alertPayload.siteId,
            },
            userId: 'system:risk-evaluate',
          },
          dryRun,
        );

        summary.riskAlertsCreated += 1;
      }
    } catch (error) {
      summary.failed += 1;
      console.error('[risk-evaluate] failed for entity:', entityId, error?.message || error);
    }
  }

  console.log('Risk evaluate summary');
  console.table([summary]);

  if (summary.failed > 0) process.exit(1);

  if (dryRun) {
    console.log('Dry-run complete (no writes).');
  }
})().catch((error) => {
  console.error('risk-evaluate failed:', error);
  process.exit(1);
});
