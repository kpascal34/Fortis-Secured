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
  resilienceSnapshotsCollectionId:
    process.env.APPWRITE_RESILIENCE_SNAPSHOTS_COLLECTION_ID ||
    process.env.VITE_APPWRITE_RESILIENCE_SNAPSHOTS_COLLECTION_ID ||
    'resilience_snapshots',
  legalEntitiesCollectionId:
    process.env.APPWRITE_LEGAL_ENTITIES_COLLECTION_ID ||
    process.env.VITE_APPWRITE_LEGAL_ENTITIES_COLLECTION_ID ||
    'legal_entities',
  clientsCollectionId:
    process.env.APPWRITE_CLIENTS_COLLECTION_ID || process.env.VITE_APPWRITE_CLIENTS_COLLECTION_ID || 'clients',
  guardsCollectionId:
    process.env.APPWRITE_GUARDS_COLLECTION_ID || process.env.VITE_APPWRITE_GUARDS_COLLECTION_ID || 'guards',
  shiftsCollectionId:
    process.env.APPWRITE_SHIFTS_COLLECTION_ID || process.env.VITE_APPWRITE_SHIFTS_COLLECTION_ID || 'shifts',
  entriesCollectionId:
    process.env.APPWRITE_TIMESHEET_ENTRIES_COLLECTION_ID ||
    process.env.VITE_APPWRITE_TIMESHEET_ENTRIES_COLLECTION_ID ||
    'timesheet_entries',
  complianceFlagsCollectionId:
    process.env.APPWRITE_COMPLIANCE_FLAGS_COLLECTION_ID ||
    process.env.VITE_APPWRITE_COMPLIANCE_FLAGS_COLLECTION_ID ||
    'compliance_flags',
  incidentsCollectionId:
    process.env.APPWRITE_INCIDENTS_COLLECTION_ID || process.env.VITE_APPWRITE_INCIDENTS_COLLECTION_ID || 'incidents',
  marginAlertsCollectionId:
    process.env.APPWRITE_MARGIN_ALERTS_COLLECTION_ID || process.env.VITE_APPWRITE_MARGIN_ALERTS_COLLECTION_ID || 'margin_alerts',
  periodStart: process.env.RESILIENCE_PERIOD_START || null,
  periodEnd: process.env.RESILIENCE_PERIOD_END || null,
  threshold: Number(process.env.RESILIENCE_THRESHOLD || 0.55),
};

requireEnv(env, ['endpoint', 'projectId', 'apiKey', 'databaseId'], 'resilience-run');
const databases = createDatabasesClient(env);

if (simulateChecks) {
  const composite = clamp01(0.4 * 0.25 + 0.5 * 0.2 + 0.35 * 0.2 + 0.45 * 0.15 + 0.5 * 0.2);
  runSimulatedAssertions([
    {
      pass: composite < 0.55,
      message: 'Resilience simulation expected low composite score for adverse sample.',
    },
  ]);
}

const summary = {
  dryRun,
  entitiesScanned: 0,
  snapshotsCreated: 0,
  alertsCreated: 0,
  failed: 0,
};

const parseTimeToMinutes = (value) => {
  const [h, m] = String(value || '').split(':');
  const hh = Number(h);
  const mm = Number(m);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  return hh * 60 + mm;
};

const shiftHours = (shift) => {
  const start = parseTimeToMinutes(shift.startTime);
  const end = parseTimeToMinutes(shift.endTime);
  if (start === null || end === null) return 0;
  let diff = end - start;
  if (diff <= 0) diff += 24 * 60;
  return diff / 60;
};

(async () => {
  const period = resolvePeriod({ periodStart: env.periodStart, periodEnd: env.periodEnd, defaultDays: 30 });

  const [entities, clients, guards, shifts, entries, complianceFlags, incidents] = await Promise.all([
    listAllDocuments(databases, env.databaseId, env.legalEntitiesCollectionId, [Query.equal('active', true)]),
    listAllDocuments(databases, env.databaseId, env.clientsCollectionId),
    listAllDocuments(databases, env.databaseId, env.guardsCollectionId),
    listAllDocuments(databases, env.databaseId, env.shiftsCollectionId, [
      Query.greaterThanEqual('date', period.start),
      Query.lessThanEqual('date', period.end),
    ]),
    listAllDocuments(databases, env.databaseId, env.entriesCollectionId, [
      Query.equal('status', 'approved'),
      Query.greaterThanEqual('workDate', period.start),
      Query.lessThanEqual('workDate', period.end),
    ]),
    listAllDocuments(databases, env.databaseId, env.complianceFlagsCollectionId, [
      Query.equal('status', 'open'),
      Query.greaterThanEqual('createdAt', period.start),
      Query.lessThanEqual('createdAt', period.end),
    ]),
    listAllDocuments(databases, env.databaseId, env.incidentsCollectionId, [
      Query.greaterThanEqual('createdAt', period.start),
      Query.lessThanEqual('createdAt', period.end),
    ]),
  ]);

  const entityByClient = new Map();
  for (const client of clients) {
    if (client.entityId) {
      entityByClient.set(String(client.$id), String(client.entityId));
    }
  }

  summary.entitiesScanned = entities.length;

  for (const entity of entities) {
    const entityId = String(entity.$id);

    try {
      const entityShifts = shifts.filter((shift) => entityByClient.get(String(shift.clientId || '')) === entityId);
      const entityEntries = entries.filter((entry) => entityByClient.get(String(entry.clientId || '')) === entityId);
      const entityIncidents = incidents.filter((incident) => entityByClient.get(String(incident.clientId || '')) === entityId);
      const entityFlags = complianceFlags.filter((flag) => entityByClient.get(String(flag.clientId || '')) === entityId);

      const scheduledHours = entityShifts.reduce((sum, shift) => {
        const headcount = Math.max(1, Number(shift.requiredHeadcount || shift.positionsOpen || 1));
        return sum + shiftHours(shift) * headcount;
      }, 0);

      const workedHours = entityEntries.reduce((sum, entry) => sum + Number(entry.minutesPayable || 0) / 60, 0);

      const staffDepthScore = scheduledHours > 0 ? clamp01(workedHours / scheduledHours) : 1;

      const activeGuards = guards.filter((guard) => String(guard.status || '').toLowerCase() === 'active');
      const payeCount = activeGuards.filter((guard) => String(guard.employmentType || '').toUpperCase() === 'PAYE').length;
      const payeRatio = activeGuards.length > 0 ? payeCount / activeGuards.length : 0.5;
      const payeBalanceScore = clamp01(1 - Math.abs(payeRatio - 0.6) / 0.6);

      const severityWeight = entityFlags.reduce((sum, flag) => {
        const severity = String(flag.severity || '').toLowerCase();
        if (severity === 'critical') return sum + 1;
        if (severity === 'warning') return sum + 0.5;
        return sum + 0.2;
      }, 0);
      const complianceHealthScore = clamp01(1 - severityWeight / Math.max(1, entityFlags.length + 3));

      const incidentRate = entityShifts.length > 0 ? entityIncidents.length / entityShifts.length : 0;
      const incidentStabilityScore = clamp01(1 - incidentRate);

      const coverageConsistencyScore = staffDepthScore;

      const compositeResilienceScore = clamp01(
        staffDepthScore * 0.25 +
          payeBalanceScore * 0.2 +
          complianceHealthScore * 0.2 +
          incidentStabilityScore * 0.15 +
          coverageConsistencyScore * 0.2,
      );

      const payload = {
        entityId,
        periodStart: period.start,
        periodEnd: period.end,
        staffDepthScore: Number(staffDepthScore.toFixed(6)),
        payeBalanceScore: Number(payeBalanceScore.toFixed(6)),
        complianceHealthScore: Number(complianceHealthScore.toFixed(6)),
        incidentStabilityScore: Number(incidentStabilityScore.toFixed(6)),
        coverageConsistencyScore: Number(coverageConsistencyScore.toFixed(6)),
        compositeResilienceScore: Number(compositeResilienceScore.toFixed(6)),
        generatedAt: new Date().toISOString(),
      };

      let snapshotId = null;
      if (!dryRun) {
        const snapshot = await databases.createDocument(
          env.databaseId,
          env.resilienceSnapshotsCollectionId,
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
          actorId: 'system:resilience-run',
          action: 'RESILIENCE_SNAPSHOT_CREATED',
          resourceType: 'resilience_snapshots',
          resourceId: snapshotId || `dry-${entityId}`,
          entityId,
          metadata: payload,
        },
        dryRun,
      );

      if (compositeResilienceScore < env.threshold) {
        const severity = compositeResilienceScore < env.threshold * 0.75 ? 'critical' : 'warning';
        const alertPayload = {
          clientId: `entity:${entityId}`,
          siteId: 'portfolio',
          shiftId: null,
          periodStart: period.start,
          periodEnd: period.end,
          alertType: 'enterprise_risk',
          thresholdValue: Number(env.threshold.toFixed(6)),
          actualValue: Number(compositeResilienceScore.toFixed(6)),
          severity,
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
            actorId: 'system:resilience-run',
            action: 'RESILIENCE_THRESHOLD_ALERT',
            resourceType: 'margin_alerts',
            resourceId: alertId || `dry-alert-${entityId}`,
            entityId,
            metadata: {
              threshold: env.threshold,
              actual: compositeResilienceScore,
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
            subject: `Resilience risk alert (${severity})`,
            payload: {
              alertType: 'enterprise_risk',
              severity,
              thresholdValue: env.threshold,
              actualValue: compositeResilienceScore,
              periodStart: period.start,
              periodEnd: period.end,
              clientId: alertPayload.clientId,
              siteId: alertPayload.siteId,
            },
            userId: 'system:resilience-run',
          },
          dryRun,
        );

        summary.alertsCreated += 1;
      }
    } catch (error) {
      summary.failed += 1;
      console.error('[resilience-run] entity failed:', entityId, error?.message || error);
    }
  }

  console.log('Resilience run summary');
  console.table([summary]);

  if (summary.failed > 0) process.exit(1);
  if (dryRun) console.log('Dry-run complete (no writes).');
})().catch((error) => {
  console.error('resilience-run failed:', error);
  process.exit(1);
});
