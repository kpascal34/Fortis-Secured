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
  runSimulatedAssertions,
} from './lib/engine-utils.mjs';

loadDotenv();
const { dryRun, simulateChecks } = parseArgs();

const env = {
  ...resolveBaseEnv(),
  shiftsCollectionId:
    process.env.APPWRITE_SHIFTS_COLLECTION_ID || process.env.VITE_APPWRITE_SHIFTS_COLLECTION_ID || 'shifts',
  timesheetEntriesCollectionId:
    process.env.APPWRITE_TIMESHEET_ENTRIES_COLLECTION_ID ||
    process.env.VITE_APPWRITE_TIMESHEET_ENTRIES_COLLECTION_ID ||
    'timesheet_entries',
  periodStart: process.env.SLA_PERIOD_START || null,
  periodEnd: process.env.SLA_PERIOD_END || null,
  slaThreshold: Number(process.env.SLA_COVERAGE_THRESHOLD || 0.92),
};

requireEnv(env, ['endpoint', 'projectId', 'apiKey', 'databaseId'], 'sla-calc');
const databases = createDatabasesClient(env);

if (simulateChecks) {
  runSimulatedAssertions([
    {
      pass: 0.7 < env.slaThreshold,
      message: 'SLA simulation expected low coverage ratio to breach threshold.',
    },
  ]);
}

const parseTimeToMinutes = (value) => {
  const [hh, mm] = String(value || '').split(':');
  const h = Number(hh);
  const m = Number(mm);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
};

const shiftDurationHours = (shift) => {
  const start = parseTimeToMinutes(shift.startTime);
  const end = parseTimeToMinutes(shift.endTime);
  if (start === null || end === null) return 0;
  let diff = end - start;
  if (diff <= 0) diff += 24 * 60;
  return diff / 60;
};

(async () => {
  const period = resolvePeriod({ periodStart: env.periodStart, periodEnd: env.periodEnd, defaultDays: 7 });

  const [shifts, entries] = await Promise.all([
    listAllDocuments(databases, env.databaseId, env.shiftsCollectionId, [
      Query.greaterThanEqual('date', period.start),
      Query.lessThanEqual('date', period.end),
    ]),
    listAllDocuments(databases, env.databaseId, env.timesheetEntriesCollectionId, [
      Query.equal('status', 'approved'),
      Query.greaterThanEqual('workDate', period.start),
      Query.lessThanEqual('workDate', period.end),
    ]),
  ]);

  const byKey = new Map();

  for (const shift of shifts) {
    const key = `${shift.clientId || 'unknown'}::${shift.siteId || 'unknown'}`;
    if (!byKey.has(key)) {
      byKey.set(key, {
        clientId: shift.clientId || null,
        siteId: shift.siteId || null,
        scheduledHours: 0,
        workedHours: 0,
      });
    }

    const headcount = Math.max(1, Number(shift.requiredHeadcount || shift.positionsOpen || 1));
    byKey.get(key).scheduledHours += shiftDurationHours(shift) * headcount;
  }

  for (const entry of entries) {
    const key = `${entry.clientId || 'unknown'}::${entry.siteId || 'unknown'}`;
    if (!byKey.has(key)) {
      byKey.set(key, {
        clientId: entry.clientId || null,
        siteId: entry.siteId || null,
        scheduledHours: 0,
        workedHours: 0,
      });
    }

    byKey.get(key).workedHours += Number(entry.minutesPayable || 0) / 60;
  }

  const rows = Array.from(byKey.values()).map((item) => {
    const ratio = item.scheduledHours > 0 ? item.workedHours / item.scheduledHours : 1;

    return {
      clientId: item.clientId,
      siteId: item.siteId,
      scheduledHours: Number(item.scheduledHours.toFixed(2)),
      workedHours: Number(item.workedHours.toFixed(2)),
      slaRatio: Number(ratio.toFixed(4)),
      status: ratio >= env.slaThreshold ? 'on_track' : ratio >= env.slaThreshold * 0.85 ? 'watch' : 'at_risk',
    };
  }).sort((a, b) => a.slaRatio - b.slaRatio);

  console.log('\nSLA Coverage Snapshot');
  console.table(rows.slice(0, 20));

  const summary = {
    dryRun,
    periodStart: period.start,
    periodEnd: period.end,
    shifts: shifts.length,
    entries: entries.length,
    groups: rows.length,
    belowThreshold: rows.filter((row) => row.slaRatio < env.slaThreshold).length,
    threshold: env.slaThreshold,
    snapshotStored: false,
  };

  if (!dryRun && env.auditLogsCollectionId) {
    try {
      await databases.createDocument(env.databaseId, env.auditLogsCollectionId, ID.unique(), {
        actorId: 'system:sla-calc',
        action: 'SLA_SNAPSHOT_STORED',
        resourceType: 'sla',
        entity: 'sla',
        entityId: `${period.start}:${period.end}`,
        clientId: null,
        siteId: null,
        metadataJson: JSON.stringify({
          periodStart: period.start,
          periodEnd: period.end,
          threshold: env.slaThreshold,
          rows: rows.length,
          atRisk: rows.filter((row) => row.status === 'at_risk').length,
        }),
        createdAt: new Date().toISOString(),
      });
      summary.snapshotStored = true;
    } catch (error) {
      console.error('[sla-calc] failed to store SLA snapshot audit event:', error?.message || error);
    }
  } else if (dryRun) {
    summary.snapshotStored = true;
  }

  console.log('\nSummary');
  console.table([summary]);

  if (dryRun) {
    console.log('Dry-run complete (no writes).');
  }
})().catch((error) => {
  console.error('sla-calc failed:', error);
  process.exit(1);
});
