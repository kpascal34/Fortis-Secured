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
  employmentRiskFlagsCollectionId:
    process.env.APPWRITE_EMPLOYMENT_RISK_FLAGS_COLLECTION_ID ||
    process.env.VITE_APPWRITE_EMPLOYMENT_RISK_FLAGS_COLLECTION_ID ||
    'employment_risk_flags',
  entriesCollectionId:
    process.env.APPWRITE_TIMESHEET_ENTRIES_COLLECTION_ID ||
    process.env.VITE_APPWRITE_TIMESHEET_ENTRIES_COLLECTION_ID ||
    'timesheet_entries',
  guardsCollectionId:
    process.env.APPWRITE_GUARDS_COLLECTION_ID || process.env.VITE_APPWRITE_GUARDS_COLLECTION_ID || 'guards',
  clientsCollectionId:
    process.env.APPWRITE_CLIENTS_COLLECTION_ID || process.env.VITE_APPWRITE_CLIENTS_COLLECTION_ID || 'clients',
  periodStart: process.env.EMPLOYMENT_RISK_PERIOD_START || null,
  periodEnd: process.env.EMPLOYMENT_RISK_PERIOD_END || null,
  clientDependencyThreshold: Number(process.env.EMPLOYMENT_RISK_CLIENT_DEP_PCT || 0.75),
  sameSiteWeeksThreshold: Number(process.env.EMPLOYMENT_RISK_SITE_WEEKS || 12),
};

requireEnv(env, ['endpoint', 'projectId', 'apiKey', 'databaseId'], 'employment-risk-scan');
const databases = createDatabasesClient(env);

if (simulateChecks) {
  const ratio = 0.82;
  runSimulatedAssertions([
    {
      pass: ratio > env.clientDependencyThreshold,
      message: 'Employment risk simulation expected client dependency ratio above threshold.',
    },
  ]);
}

const summary = {
  dryRun,
  guardsScanned: 0,
  flagsCreated: 0,
  failed: 0,
};

const weekKey = (isoDate) => {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return null;
  const onejan = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const dayMs = 24 * 60 * 60 * 1000;
  const dayOfYear = Math.floor((date.getTime() - onejan.getTime()) / dayMs);
  const week = Math.ceil((dayOfYear + onejan.getUTCDay() + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
};

(async () => {
  const period = resolvePeriod({ periodStart: env.periodStart, periodEnd: env.periodEnd, defaultDays: 90 });

  const [guards, entries, clients] = await Promise.all([
    listAllDocuments(databases, env.databaseId, env.guardsCollectionId, [
      Query.equal('employmentType', 'SELF_EMPLOYED'),
      Query.equal('status', 'active'),
    ]),
    listAllDocuments(databases, env.databaseId, env.entriesCollectionId, [
      Query.equal('status', 'approved'),
      Query.greaterThanEqual('workDate', period.start),
      Query.lessThanEqual('workDate', period.end),
    ]),
    listAllDocuments(databases, env.databaseId, env.clientsCollectionId),
  ]);

  const entityByClientId = new Map();
  for (const client of clients) {
    if (client.entityId) entityByClientId.set(String(client.$id), String(client.entityId));
  }

  summary.guardsScanned = guards.length;

  const entriesByGuard = new Map();
  for (const entry of entries) {
    const guardId = String(entry.guardId || '');
    if (!entriesByGuard.has(guardId)) entriesByGuard.set(guardId, []);
    entriesByGuard.get(guardId).push(entry);
  }

  for (const guard of guards) {
    const guardId = String(guard.$id);
    const guardEntries = entriesByGuard.get(guardId) || [];
    if (guardEntries.length === 0) continue;

    try {
      const totalHours = guardEntries.reduce((sum, entry) => sum + Number(entry.minutesPayable || 0) / 60, 0);
      if (totalHours <= 0) continue;

      const clientHours = new Map();
      const siteWeeks = new Map();

      for (const entry of guardEntries) {
        const clientId = String(entry.clientId || '');
        const siteId = String(entry.siteId || '');
        const hours = Number(entry.minutesPayable || 0) / 60;

        if (clientId) {
          clientHours.set(clientId, Number(clientHours.get(clientId) || 0) + hours);
        }

        if (siteId) {
          const wk = weekKey(entry.workDate || entry.startAt);
          if (!siteWeeks.has(siteId)) siteWeeks.set(siteId, new Set());
          if (wk) siteWeeks.get(siteId).add(wk);
        }
      }

      for (const [clientId, hours] of clientHours.entries()) {
        const ratio = hours / totalHours;
        if (ratio <= env.clientDependencyThreshold) continue;

        const entityId = entityByClientId.get(clientId) || null;
        if (!entityId) continue;

        const payload = {
          entityId,
          guardId,
          clientId,
          siteId: null,
          riskType: 'high_client_dependency',
          metricValue: Number(ratio.toFixed(6)),
          thresholdValue: Number(env.clientDependencyThreshold.toFixed(6)),
          severity: ratio >= env.clientDependencyThreshold * 1.2 ? 'critical' : 'warning',
          createdAt: new Date().toISOString(),
          resolved: false,
          resolvedAt: null,
        };

        const flag = dryRun
          ? { $id: `dry-client-${guardId}-${clientId}` }
          : await databases.createDocument(env.databaseId, env.employmentRiskFlagsCollectionId, ID.unique(), payload);

        await createAuditLog(
          databases,
          env,
          {
            actorId: 'system:employment-risk-scan',
            action: 'EMPLOYMENT_RISK_FLAG_CREATED',
            resourceType: 'employment_risk_flags',
            resourceId: flag.$id,
            entityId,
            clientId,
            metadata: {
              riskType: payload.riskType,
              metricValue: payload.metricValue,
              thresholdValue: payload.thresholdValue,
              notice: 'Risk awareness only; not an IR35 determination.',
            },
          },
          dryRun,
        );

        summary.flagsCreated += 1;
      }

      for (const [siteId, weeksSet] of siteWeeks.entries()) {
        const weeks = weeksSet.size;
        if (weeks <= env.sameSiteWeeksThreshold) continue;

        const sampleEntry = guardEntries.find((entry) => String(entry.siteId || '') === String(siteId));
        const clientId = sampleEntry?.clientId ? String(sampleEntry.clientId) : null;
        const entityId = clientId ? entityByClientId.get(clientId) || null : null;
        if (!entityId) continue;

        const payload = {
          entityId,
          guardId,
          clientId,
          siteId,
          riskType: 'long_term_same_site',
          metricValue: Number(weeks),
          thresholdValue: Number(env.sameSiteWeeksThreshold),
          severity: weeks >= env.sameSiteWeeksThreshold * 1.5 ? 'critical' : 'warning',
          createdAt: new Date().toISOString(),
          resolved: false,
          resolvedAt: null,
        };

        const flag = dryRun
          ? { $id: `dry-site-${guardId}-${siteId}` }
          : await databases.createDocument(env.databaseId, env.employmentRiskFlagsCollectionId, ID.unique(), payload);

        await createAuditLog(
          databases,
          env,
          {
            actorId: 'system:employment-risk-scan',
            action: 'EMPLOYMENT_RISK_FLAG_CREATED',
            resourceType: 'employment_risk_flags',
            resourceId: flag.$id,
            entityId,
            clientId,
            siteId,
            metadata: {
              riskType: payload.riskType,
              metricValue: payload.metricValue,
              thresholdValue: payload.thresholdValue,
              notice: 'Risk awareness only; not an IR35 determination.',
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
            subject: 'Employment risk awareness flag generated',
            payload: {
              alertType: 'contract_risk',
              severity: payload.severity,
              thresholdValue: payload.thresholdValue,
              actualValue: payload.metricValue,
              periodStart: period.start,
              periodEnd: period.end,
              clientId: clientId || 'N/A',
              siteId: siteId || 'N/A',
              note: 'Risk awareness only; not an IR35 determination.',
            },
            clientId,
            siteId,
            userId: guardId,
          },
          dryRun,
        );

        summary.flagsCreated += 1;
      }
    } catch (error) {
      summary.failed += 1;
      console.error('[employment-risk-scan] guard failed:', guardId, error?.message || error);
    }
  }

  console.log('Employment risk scan summary');
  console.table([summary]);

  if (summary.failed > 0) process.exit(1);
  if (dryRun) console.log('Dry-run complete (no writes).');
})().catch((error) => {
  console.error('employment-risk-scan failed:', error);
  process.exit(1);
});
