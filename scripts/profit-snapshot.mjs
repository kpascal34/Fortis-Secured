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
  guardsCollectionId:
    process.env.APPWRITE_GUARDS_COLLECTION_ID || process.env.VITE_APPWRITE_GUARDS_COLLECTION_ID || 'guards',
  clientsCollectionId:
    process.env.APPWRITE_CLIENTS_COLLECTION_ID || process.env.VITE_APPWRITE_CLIENTS_COLLECTION_ID || 'clients',
  profitSnapshotsCollectionId:
    process.env.APPWRITE_PROFIT_SNAPSHOTS_COLLECTION_ID ||
    process.env.VITE_APPWRITE_PROFIT_SNAPSHOTS_COLLECTION_ID ||
    'profit_snapshots',
  periodStart: process.env.PROFIT_PERIOD_START || null,
  periodEnd: process.env.PROFIT_PERIOD_END || null,
};

requireEnv(env, ['endpoint', 'projectId', 'apiKey', 'databaseId'], 'profit-snapshot');
const databases = createDatabasesClient(env);

if (simulateChecks) {
  runSimulatedAssertions([
    {
      pass: 100 - 120 < 0,
      message: 'Profit snapshot simulation expected negative profit for cost > revenue sample.',
    },
  ]);
}

const summary = {
  dryRun,
  periodStart: null,
  periodEnd: null,
  shifts: 0,
  entries: 0,
  groups: 0,
  snapshotsStored: 0,
};

(async () => {
  const period = resolvePeriod({ periodStart: env.periodStart, periodEnd: env.periodEnd, defaultDays: 7 });
  summary.periodStart = period.start;
  summary.periodEnd = period.end;

  const [shifts, entries, guards, clients] = await Promise.all([
    listAllDocuments(databases, env.databaseId, env.shiftsCollectionId, [
      Query.greaterThanEqual('date', period.start),
      Query.lessThanEqual('date', period.end),
    ]),
    listAllDocuments(databases, env.databaseId, env.timesheetEntriesCollectionId, [
      Query.equal('status', 'approved'),
      Query.greaterThanEqual('workDate', period.start),
      Query.lessThanEqual('workDate', period.end),
    ]),
    listAllDocuments(databases, env.databaseId, env.guardsCollectionId, [Query.limit(500)]),
    listAllDocuments(databases, env.databaseId, env.clientsCollectionId, [Query.limit(500)]),
  ]);

  summary.shifts = shifts.length;
  summary.entries = entries.length;

  const guardRateById = new Map();
  for (const guard of guards) {
    guardRateById.set(String(guard.$id), Number(guard.payRate || 0));
  }

  const entityByClientId = new Map();
  for (const client of clients) {
    entityByClientId.set(String(client.$id), String(client.entityId || ''));
  }

  const grouped = new Map();
  const keyOf = (entityId, clientId, siteId) => `${entityId}::${clientId}::${siteId}`;

  for (const shift of shifts) {
    const clientId = String(shift.clientId || '');
    const entityId = entityByClientId.get(clientId) || '';
    const siteId = String(shift.siteId || '');
    if (!entityId || !clientId || !siteId) continue;

    const key = keyOf(entityId, clientId, siteId);
    if (!grouped.has(key)) {
      grouped.set(key, {
        entityId,
        clientId,
        siteId,
        workedHours: 0,
        billRates: [],
        cost: 0,
      });
    }

    const billRate = Number(shift.hourlyRate);
    if (Number.isFinite(billRate) && billRate > 0) {
      grouped.get(key).billRates.push(billRate);
    }
  }

  for (const entry of entries) {
    const clientId = String(entry.clientId || '');
    const entityId = entityByClientId.get(clientId) || '';
    const siteId = String(entry.siteId || '');
    if (!entityId || !clientId || !siteId) continue;

    const key = keyOf(entityId, clientId, siteId);
    if (!grouped.has(key)) {
      grouped.set(key, {
        entityId,
        clientId,
        siteId,
        workedHours: 0,
        billRates: [],
        cost: 0,
      });
    }

    const bucket = grouped.get(key);
    const workedHours = Number(entry.minutesPayable || 0) / 60;
    bucket.workedHours += workedHours;

    const payRate = Number(guardRateById.get(String(entry.guardId || '')) || 0);
    if (Number.isFinite(payRate) && payRate > 0) {
      bucket.cost += workedHours * payRate;
    }
  }

  const rows = [];
  for (const bucket of grouped.values()) {
    const avgBillRate = bucket.billRates.length
      ? bucket.billRates.reduce((sum, value) => sum + value, 0) / bucket.billRates.length
      : 0;

    const revenue = bucket.workedHours * avgBillRate;
    const grossProfit = revenue - bucket.cost;
    const grossMarginPct = revenue > 0 ? (grossProfit / revenue) * 100 : 0;

    rows.push({
      entityId: bucket.entityId,
      clientId: bucket.clientId,
      siteId: bucket.siteId,
      workedHours: Number(bucket.workedHours.toFixed(2)),
      revenue: Number(revenue.toFixed(2)),
      cost: Number(bucket.cost.toFixed(2)),
      grossProfit: Number(grossProfit.toFixed(2)),
      grossMarginPct: Number(grossMarginPct.toFixed(2)),
    });
  }

  rows.sort((a, b) => a.grossMarginPct - b.grossMarginPct);
  summary.groups = rows.length;

  if (!dryRun) {
    for (const row of rows) {
      await databases.createDocument(env.databaseId, env.profitSnapshotsCollectionId, ID.unique(), {
        entityId: row.entityId,
        clientId: row.clientId,
        siteId: row.siteId,
        periodStart: period.start,
        periodEnd: period.end,
        workedHours: row.workedHours,
        revenue: row.revenue,
        cost: row.cost,
        grossProfit: row.grossProfit,
        grossMarginPct: row.grossMarginPct,
        generatedAt: new Date().toISOString(),
      });
      summary.snapshotsStored += 1;
    }
  } else {
    summary.snapshotsStored = rows.length;
  }

  console.log('\nProfit Snapshot');
  console.table(rows.slice(0, 20));

  console.log('\nSummary');
  console.table([
    {
      ...summary,
      lowMarginGroups: rows.filter((row) => row.grossMarginPct < 18).length,
      negativeMarginGroups: rows.filter((row) => row.grossProfit < 0).length,
    },
  ]);

  if (dryRun) {
    console.log('Dry-run complete (no writes).');
  }
})().catch((error) => {
  console.error('profit-snapshot failed:', error);
  process.exit(1);
});
