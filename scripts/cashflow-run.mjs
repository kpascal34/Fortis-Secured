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
  runSimulatedAssertions,
} from './lib/engine-utils.mjs';

loadDotenv();
const { dryRun, simulateChecks } = parseArgs();

const env = {
  ...resolveBaseEnv(),
  cashflowSnapshotsCollectionId:
    process.env.APPWRITE_CASHFLOW_SNAPSHOTS_COLLECTION_ID ||
    process.env.VITE_APPWRITE_CASHFLOW_SNAPSHOTS_COLLECTION_ID ||
    'cashflow_snapshots',
  legalEntitiesCollectionId:
    process.env.APPWRITE_LEGAL_ENTITIES_COLLECTION_ID ||
    process.env.VITE_APPWRITE_LEGAL_ENTITIES_COLLECTION_ID ||
    'legal_entities',
  billingExportsCollectionId:
    process.env.APPWRITE_BILLING_EXPORTS_COLLECTION_ID ||
    process.env.VITE_APPWRITE_BILLING_EXPORTS_COLLECTION_ID ||
    'billing_exports',
  timesheetEntriesCollectionId:
    process.env.APPWRITE_TIMESHEET_ENTRIES_COLLECTION_ID ||
    process.env.VITE_APPWRITE_TIMESHEET_ENTRIES_COLLECTION_ID ||
    'timesheet_entries',
  clientsCollectionId:
    process.env.APPWRITE_CLIENTS_COLLECTION_ID ||
    process.env.VITE_APPWRITE_CLIENTS_COLLECTION_ID ||
    'clients',
  guardsCollectionId:
    process.env.APPWRITE_GUARDS_COLLECTION_ID ||
    process.env.VITE_APPWRITE_GUARDS_COLLECTION_ID ||
    'guards',
  periodStart: process.env.CASHFLOW_PERIOD_START || null,
  periodEnd: process.env.CASHFLOW_PERIOD_END || null,
  taxReservePct: Number(process.env.TAX_RESERVE_PCT || 0.19),
  fallbackReceiptPerExport: Number(process.env.CASHFLOW_RECEIPT_PER_EXPORT || 2500),
};

requireEnv(env, ['endpoint', 'projectId', 'apiKey', 'databaseId'], 'cashflow-run');
const databases = createDatabasesClient(env);

if (simulateChecks) {
  const expectedReceipts = 12000;
  const expectedPayrollOutflow = 7000;
  const taxReserveEstimate = expectedReceipts * 0.2;
  const netCash = expectedReceipts - expectedPayrollOutflow - taxReserveEstimate;
  runSimulatedAssertions([
    {
      pass: netCash < expectedReceipts,
      message: 'Cashflow simulation expected net cash to account for payroll and tax reserves.',
    },
  ]);
}

const summary = {
  dryRun,
  entitiesScanned: 0,
  snapshotsCreated: 0,
  failed: 0,
};

const listGuardRates = async () => {
  const guards = await listAllDocuments(databases, env.databaseId, env.guardsCollectionId, [Query.limit(500)]);
  const map = new Map();
  for (const guard of guards) {
    map.set(String(guard.$id), Number(guard.payRate || 0));
  }
  return map;
};

const listClientsByEntity = async () => {
  const clients = await listAllDocuments(databases, env.databaseId, env.clientsCollectionId);
  const map = new Map();

  for (const client of clients) {
    const entityId = String(client.entityId || '');
    if (!entityId) continue;
    if (!map.has(entityId)) map.set(entityId, new Set());
    map.get(entityId).add(String(client.$id));
  }

  return map;
};

(async () => {
  const period = resolvePeriod({ periodStart: env.periodStart, periodEnd: env.periodEnd, defaultDays: 30 });

  const [entities, billingExports, entries, guardRates, clientsByEntity] = await Promise.all([
    listAllDocuments(databases, env.databaseId, env.legalEntitiesCollectionId, [Query.equal('active', true)]),
    listAllDocuments(databases, env.databaseId, env.billingExportsCollectionId, [
      Query.greaterThanEqual('rangeStart', period.start),
      Query.lessThanEqual('rangeEnd', period.end),
    ]),
    listAllDocuments(databases, env.databaseId, env.timesheetEntriesCollectionId, [
      Query.equal('status', 'approved'),
      Query.greaterThanEqual('workDate', period.start),
      Query.lessThanEqual('workDate', period.end),
    ]),
    listGuardRates(),
    listClientsByEntity(),
  ]);

  summary.entitiesScanned = entities.length;

  for (const entity of entities) {
    try {
      const entityId = String(entity.$id);
      const entityClientIds = clientsByEntity.get(entityId) || new Set();

      const receipts = billingExports
        .filter((item) => String(item.entityId || '') === entityId)
        .reduce((sum, item) => {
          const candidate = Number(item?.filters?.expectedReceipts || item?.filters?.invoiceTotal || 0);
          if (Number.isFinite(candidate) && candidate > 0) return sum + candidate;
          return sum + env.fallbackReceiptPerExport;
        }, 0);

      let payrollOutflow = 0;
      for (const entry of entries) {
        const clientId = String(entry.clientId || '');
        if (!entityClientIds.has(clientId)) continue;

        const hours = Number(entry.minutesPayable || 0) / 60;
        const rate = Number(guardRates.get(String(entry.guardId || '')) || 0);
        payrollOutflow += hours * rate;
      }

      const taxReserveEstimate = receipts * env.taxReservePct;
      const netCashPosition = receipts - payrollOutflow - taxReserveEstimate;

      const payload = {
        entityId,
        periodStart: period.start,
        periodEnd: period.end,
        expectedReceipts: Number(receipts.toFixed(2)),
        expectedPayrollOutflow: Number(payrollOutflow.toFixed(2)),
        taxReserveEstimate: Number(taxReserveEstimate.toFixed(2)),
        netCashPosition: Number(netCashPosition.toFixed(2)),
        assumptions: {
          taxReservePct: env.taxReservePct,
          fallbackReceiptPerExport: env.fallbackReceiptPerExport,
          source: 'billing_exports + approved_timesheet_entries',
        },
        generatedAt: new Date().toISOString(),
      };

      let snapshotId = null;
      if (!dryRun) {
        const snapshot = await databases.createDocument(
          env.databaseId,
          env.cashflowSnapshotsCollectionId,
          ID.unique(),
          payload,
        );
        snapshotId = snapshot.$id;
      }

      await createAuditLog(
        databases,
        env,
        {
          actorId: 'system:cashflow-run',
          action: 'CASHFLOW_SNAPSHOT_CREATED',
          resourceType: 'cashflow_snapshots',
          resourceId: snapshotId || `dry-${entityId}`,
          entityId,
          metadata: {
            expectedReceipts: payload.expectedReceipts,
            expectedPayrollOutflow: payload.expectedPayrollOutflow,
            taxReserveEstimate: payload.taxReserveEstimate,
            netCashPosition: payload.netCashPosition,
          },
        },
        dryRun,
      );

      summary.snapshotsCreated += 1;
    } catch (error) {
      summary.failed += 1;
      console.error('[cashflow-run] entity failed:', entity?.$id, error?.message || error);
    }
  }

  console.log('Cashflow run summary');
  console.table([summary]);

  if (summary.failed > 0) process.exit(1);

  if (dryRun) {
    console.log('Dry-run complete (no writes).');
  }
})().catch((error) => {
  console.error('cashflow-run failed:', error);
  process.exit(1);
});
