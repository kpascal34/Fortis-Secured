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
  marginLeakageAlertsCollectionId:
    process.env.APPWRITE_MARGIN_LEAKAGE_ALERTS_COLLECTION_ID ||
    process.env.VITE_APPWRITE_MARGIN_LEAKAGE_ALERTS_COLLECTION_ID ||
    'margin_leakage_alerts',
  shiftsCollectionId:
    process.env.APPWRITE_SHIFTS_COLLECTION_ID || process.env.VITE_APPWRITE_SHIFTS_COLLECTION_ID || 'shifts',
  entriesCollectionId:
    process.env.APPWRITE_TIMESHEET_ENTRIES_COLLECTION_ID ||
    process.env.VITE_APPWRITE_TIMESHEET_ENTRIES_COLLECTION_ID ||
    'timesheet_entries',
  clientsCollectionId:
    process.env.APPWRITE_CLIENTS_COLLECTION_ID || process.env.VITE_APPWRITE_CLIENTS_COLLECTION_ID || 'clients',
  auditLogsCollectionId:
    process.env.APPWRITE_AUDIT_LOGS_COLLECTION_ID || process.env.VITE_APPWRITE_AUDIT_LOGS_COLLECTION_ID || 'audit_logs',
  periodStart: process.env.LEAKAGE_PERIOD_START || null,
  periodEnd: process.env.LEAKAGE_PERIOD_END || null,
  workedVsScheduledThresholdPct: Number(process.env.LEAKAGE_WORKED_GT_SCHEDULED_PCT || 1.15),
  breakMinutesThreshold: Number(process.env.LEAKAGE_BREAK_MINUTES_THRESHOLD || 90),
  manualSpikeThreshold: Number(process.env.LEAKAGE_MANUAL_EDITS_SPIKE || 0.5),
  rejectResubmitThreshold: Number(process.env.LEAKAGE_REJECT_RESUBMIT_THRESHOLD || 3),
};

requireEnv(env, ['endpoint', 'projectId', 'apiKey', 'databaseId'], 'margin-leakage-scan');
const databases = createDatabasesClient(env);

if (simulateChecks) {
  runSimulatedAssertions([
    {
      pass: 1.3 > env.workedVsScheduledThresholdPct,
      message: 'Leakage simulation expected worked/scheduled ratio to exceed configured threshold.',
    },
  ]);
}

const summary = {
  dryRun,
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

const shiftDurationHours = (shift) => {
  const start = parseTimeToMinutes(shift.startTime);
  const end = parseTimeToMinutes(shift.endTime);
  if (start === null || end === null) return 0;
  let diff = end - start;
  if (diff <= 0) diff += 24 * 60;
  return diff / 60;
};

const upsertAlert = async (payload) => {
  if (!dryRun) {
    return databases.createDocument(
      env.databaseId,
      env.marginLeakageAlertsCollectionId,
      ID.unique(),
      payload,
    );
  }

  return { $id: `dry-${payload.leakageType}-${Date.now()}` };
};

(async () => {
  const period = resolvePeriod({ periodStart: env.periodStart, periodEnd: env.periodEnd, defaultDays: 30 });

  const [clients, shifts, entries, auditLogs] = await Promise.all([
    listAllDocuments(databases, env.databaseId, env.clientsCollectionId),
    listAllDocuments(databases, env.databaseId, env.shiftsCollectionId, [
      Query.greaterThanEqual('date', period.start),
      Query.lessThanEqual('date', period.end),
    ]),
    listAllDocuments(databases, env.databaseId, env.entriesCollectionId, [
      Query.greaterThanEqual('workDate', period.start),
      Query.lessThanEqual('workDate', period.end),
    ]),
    listAllDocuments(databases, env.databaseId, env.auditLogsCollectionId, [
      Query.greaterThanEqual('createdAt', period.start),
      Query.lessThanEqual('createdAt', period.end),
      Query.equal('action', ['TIMESHEET_RESUBMITTED', 'TIMESHEET_APPROVED']),
    ]),
  ]);

  const entityByClientId = new Map();
  for (const client of clients) {
    entityByClientId.set(String(client.$id), String(client.entityId || ''));
  }

  const byClientSite = new Map();
  const keyFor = (clientId, siteId) => `${clientId}::${siteId}`;

  for (const shift of shifts) {
    const key = keyFor(String(shift.clientId || ''), String(shift.siteId || ''));
    if (!byClientSite.has(key)) {
      byClientSite.set(key, {
        entityId: entityByClientId.get(String(shift.clientId || '')) || null,
        clientId: shift.clientId || null,
        siteId: shift.siteId || null,
        scheduledHours: 0,
        workedHours: 0,
        breakMinutes: 0,
        manualEntries: 0,
        totalEntries: 0,
      });
    }

    const bucket = byClientSite.get(key);
    const headcount = Math.max(1, Number(shift.requiredHeadcount || shift.positionsOpen || 1));
    bucket.scheduledHours += shiftDurationHours(shift) * headcount;
  }

  for (const entry of entries) {
    const key = keyFor(String(entry.clientId || ''), String(entry.siteId || ''));
    if (!byClientSite.has(key)) {
      byClientSite.set(key, {
        entityId: entityByClientId.get(String(entry.clientId || '')) || null,
        clientId: entry.clientId || null,
        siteId: entry.siteId || null,
        scheduledHours: 0,
        workedHours: 0,
        breakMinutes: 0,
        manualEntries: 0,
        totalEntries: 0,
      });
    }

    const bucket = byClientSite.get(key);
    bucket.workedHours += Number(entry.minutesPayable || 0) / 60;
    bucket.breakMinutes += Number(entry.breakMinutes || 0);
    bucket.totalEntries += 1;
    if (String(entry.source || '').toLowerCase() === 'manual') {
      bucket.manualEntries += 1;
    }
  }

  for (const bucket of byClientSite.values()) {
    if (!bucket.entityId || !bucket.clientId || !bucket.siteId) continue;

    const alerts = [];

    if (bucket.scheduledHours > 0) {
      const ratio = bucket.workedHours / bucket.scheduledHours;
      if (ratio > env.workedVsScheduledThresholdPct) {
        alerts.push({
          leakageType: 'worked_gt_scheduled',
          expectedValue: Number(env.workedVsScheduledThresholdPct.toFixed(6)),
          actualValue: Number(ratio.toFixed(6)),
          severity: ratio >= env.workedVsScheduledThresholdPct * 1.15 ? 'critical' : 'warning',
        });
      }
    }

    if (bucket.breakMinutes > env.breakMinutesThreshold) {
      alerts.push({
        leakageType: 'excessive_breaks',
        expectedValue: Number(env.breakMinutesThreshold.toFixed(2)),
        actualValue: Number(bucket.breakMinutes.toFixed(2)),
        severity: bucket.breakMinutes >= env.breakMinutesThreshold * 1.5 ? 'critical' : 'warning',
      });
    }

    if (bucket.totalEntries > 0) {
      const manualRatio = bucket.manualEntries / bucket.totalEntries;
      if (manualRatio > env.manualSpikeThreshold) {
        alerts.push({
          leakageType: 'manual_time_edits_spike',
          expectedValue: Number(env.manualSpikeThreshold.toFixed(6)),
          actualValue: Number(manualRatio.toFixed(6)),
          severity: manualRatio >= env.manualSpikeThreshold * 1.4 ? 'critical' : 'warning',
        });
      }
    }

    for (const item of alerts) {
      try {
        const payload = {
          entityId: bucket.entityId,
          clientId: bucket.clientId,
          siteId: bucket.siteId,
          shiftId: null,
          leakageType: item.leakageType,
          expectedValue: item.expectedValue,
          actualValue: item.actualValue,
          severity: item.severity,
          createdAt: new Date().toISOString(),
          resolved: false,
          resolvedAt: null,
        };

        const alert = await upsertAlert(payload);

        await createAuditLog(
          databases,
          env,
          {
            actorId: 'system:margin-leakage-scan',
            action: 'MARGIN_LEAKAGE_ALERT_CREATED',
            resourceType: 'margin_leakage_alerts',
            resourceId: alert.$id,
            entityId: bucket.entityId,
            clientId: bucket.clientId,
            siteId: bucket.siteId,
            metadata: payload,
          },
          dryRun,
        );

        await enqueueOutbox(
          databases,
          env,
          {
            eventType: EVENT_TYPES.MARGIN_ALERT_CREATED,
            toEmail: env.opsEmail,
            subject: `Margin leakage alert (${item.leakageType})`,
            payload: {
              alertType: item.leakageType,
              severity: item.severity,
              thresholdValue: item.expectedValue,
              actualValue: item.actualValue,
              periodStart: period.start,
              periodEnd: period.end,
              clientId: bucket.clientId,
              siteId: bucket.siteId,
            },
            clientId: bucket.clientId,
            siteId: bucket.siteId,
            userId: 'system:margin-leakage-scan',
          },
          dryRun,
        );

        summary.alertsCreated += 1;
      } catch (error) {
        summary.failed += 1;
        console.error('[margin-leakage-scan] alert create failed:', error?.message || error);
      }
    }
  }

  const resubmitCountByClientSite = new Map();
  for (const item of auditLogs) {
    if (String(item.action) !== 'TIMESHEET_RESUBMITTED') continue;
    const key = `${String(item.clientId || '')}::${String(item.siteId || '')}`;
    resubmitCountByClientSite.set(key, Number(resubmitCountByClientSite.get(key) || 0) + 1);
  }

  for (const [key, count] of resubmitCountByClientSite.entries()) {
    if (count < env.rejectResubmitThreshold) continue;

    const [clientId, siteId] = key.split('::');
    const entityId = entityByClientId.get(clientId) || null;
    if (!entityId || !clientId || !siteId) continue;

    try {
      const payload = {
        entityId,
        clientId,
        siteId,
        shiftId: null,
        leakageType: 'repeated_reject_resubmit',
        expectedValue: Number(env.rejectResubmitThreshold),
        actualValue: Number(count),
        severity: count >= env.rejectResubmitThreshold * 2 ? 'critical' : 'warning',
        createdAt: new Date().toISOString(),
        resolved: false,
        resolvedAt: null,
      };

      const alert = await upsertAlert(payload);
      await createAuditLog(
        databases,
        env,
        {
          actorId: 'system:margin-leakage-scan',
          action: 'MARGIN_LEAKAGE_ALERT_CREATED',
          resourceType: 'margin_leakage_alerts',
          resourceId: alert.$id,
          entityId,
          clientId,
          siteId,
          metadata: payload,
        },
        dryRun,
      );

      summary.alertsCreated += 1;
    } catch (error) {
      summary.failed += 1;
      console.error('[margin-leakage-scan] reject/resubmit alert failed:', error?.message || error);
    }
  }

  const outsideScopeApprovals = auditLogs.filter((item) => {
    if (String(item.action) !== 'TIMESHEET_APPROVED') return false;
    const metadata = String(item.metadataJson || '');
    return metadata.includes('outsideScope') || metadata.includes('outside_scope');
  });

  for (const item of outsideScopeApprovals) {
    const entityId = entityByClientId.get(String(item.clientId || '')) || null;
    if (!entityId || !item.clientId || !item.siteId) continue;

    try {
      const payload = {
        entityId,
        clientId: item.clientId,
        siteId: item.siteId,
        shiftId: null,
        leakageType: 'approval_outside_scope',
        expectedValue: 0,
        actualValue: 1,
        severity: 'critical',
        createdAt: new Date().toISOString(),
        resolved: false,
        resolvedAt: null,
      };

      const alert = await upsertAlert(payload);
      await createAuditLog(
        databases,
        env,
        {
          actorId: 'system:margin-leakage-scan',
          action: 'MARGIN_LEAKAGE_ALERT_CREATED',
          resourceType: 'margin_leakage_alerts',
          resourceId: alert.$id,
          entityId,
          clientId: item.clientId,
          siteId: item.siteId,
          metadata: payload,
        },
        dryRun,
      );

      summary.alertsCreated += 1;
    } catch (error) {
      summary.failed += 1;
      console.error('[margin-leakage-scan] approval outside scope alert failed:', error?.message || error);
    }
  }

  console.log('Margin leakage scan summary');
  console.table([summary]);

  if (summary.failed > 0) process.exit(1);
  if (dryRun) console.log('Dry-run complete (no writes).');
})().catch((error) => {
  console.error('margin-leakage-scan failed:', error);
  process.exit(1);
});
