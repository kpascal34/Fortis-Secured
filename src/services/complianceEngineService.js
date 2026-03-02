import { ID, Query } from 'appwrite';
import { databases, config } from '../lib/appwrite.js';
import { PERMISSIONS } from '../lib/rbac.ts';
import {
  ensureDatabaseConfig,
  getAuthorizedScope,
  assertScopedDocument,
} from '../lib/serviceSecurity.js';
import {
  RESOURCE_TYPES,
  scopeQueries,
} from '../lib/tenancyScope.js';
import { logEvent } from './auditLogService.js';
import {
  notifyComplianceEscalation,
  notifyComplianceExpiryWarning,
} from './notificationService.js';

const dbId = config.databaseId;
const rulesCol = config.complianceRulesCollectionId || 'compliance_rules';
const flagsCol = config.complianceFlagsCollectionId || 'compliance_flags';
const staffProfilesCol = config.staffProfilesCollectionId || 'staff_profiles';

const DEFAULT_WARN_DAYS = [30, 14, 7];
const DEFAULT_ESCALATION_DAYS = 7;
const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;
const DAY_MS = 24 * 60 * 60 * 1000;

const EXPIRY_FIELDS = {
  sia: ['siaExpiryDate'],
  id: ['licenseExpiry', 'licenseExpiryDate'],
  right_to_work: ['rightToWorkExpiry', 'rightToWorkExpiryDate'],
  dbs: ['dbsExpiryDate'],
  other: ['otherExpiryDate'],
};

const clampLimit = (value, fallback = DEFAULT_LIMIT) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, MAX_LIMIT);
};

const ensureCollections = () => {
  ensureDatabaseConfig(rulesCol, 'compliance rules collection');
  ensureDatabaseConfig(flagsCol, 'compliance flags collection');
  ensureDatabaseConfig(staffProfilesCol, 'staff profiles collection');
};

const parseWarnDays = (value) => {
  if (!value) return [...DEFAULT_WARN_DAYS];

  const toNumberArray = (items) =>
    items
      .map((item) => Number(item))
      .filter((item) => Number.isFinite(item) && item > 0)
      .map((item) => Math.floor(item));

  if (Array.isArray(value)) {
    const parsed = toNumberArray(value);
    return parsed.length ? parsed.sort((a, b) => b - a) : [...DEFAULT_WARN_DAYS];
  }

  if (typeof value === 'number') {
    const parsed = toNumberArray([value]);
    return parsed.length ? parsed : [...DEFAULT_WARN_DAYS];
  }

  if (typeof value === 'string') {
    try {
      const fromJson = JSON.parse(value);
      if (Array.isArray(fromJson)) {
        const parsed = toNumberArray(fromJson);
        return parsed.length ? parsed.sort((a, b) => b - a) : [...DEFAULT_WARN_DAYS];
      }
    } catch (_) {
      // fall through
    }

    const parsed = toNumberArray(value.split(',').map((item) => item.trim()));
    return parsed.length ? parsed.sort((a, b) => b - a) : [...DEFAULT_WARN_DAYS];
  }

  return [...DEFAULT_WARN_DAYS];
};

const parseEscalationDays = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_ESCALATION_DAYS;
  return Math.floor(parsed);
};

const startOfUtcDay = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
};

const daysUntil = (dueAt, now = new Date()) => {
  const due = startOfUtcDay(dueAt);
  const current = startOfUtcDay(now);
  if (!due || !current) return null;
  return Math.floor((due.getTime() - current.getTime()) / DAY_MS);
};

const parseDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
};

const getExpiryDateForType = (profile, type) => {
  const fields = EXPIRY_FIELDS[type] || [];
  for (const field of fields) {
    const date = parseDate(profile?.[field]);
    if (date) return date;
  }
  return null;
};

const chooseSeverity = (remainingDays, warnDays) => {
  if (remainingDays === null) return null;
  if (remainingDays < 0) return 'critical';
  const threshold = Math.max(...warnDays);
  if (remainingDays <= threshold) return 'warning';
  return null;
};

const shouldNotify = (flag, now) => {
  if (!flag?.lastNotifiedAt) return true;
  const last = new Date(flag.lastNotifiedAt);
  if (Number.isNaN(last.getTime())) return true;
  return now.getTime() - last.getTime() >= DAY_MS;
};

const listAllStaffProfiles = async () => {
  const all = [];
  let offset = 0;

  while (true) {
    const response = await databases.listDocuments(dbId, staffProfilesCol, [
      Query.limit(100),
      Query.offset(offset),
    ]);

    all.push(...response.documents);

    if (response.documents.length < 100) break;
    if (response.total && all.length >= response.total) break;
    offset += 100;
  }

  return all;
};

const loadRules = async () => {
  const response = await databases.listDocuments(dbId, rulesCol, [
    Query.equal('enabled', true),
    Query.limit(100),
  ]);

  if (response.documents.length === 0) {
    return [
      { type: 'sia', warnDays: [...DEFAULT_WARN_DAYS], escalationDays: DEFAULT_ESCALATION_DAYS, enabled: true },
      { type: 'id', warnDays: [...DEFAULT_WARN_DAYS], escalationDays: DEFAULT_ESCALATION_DAYS, enabled: true },
      { type: 'right_to_work', warnDays: [...DEFAULT_WARN_DAYS], escalationDays: DEFAULT_ESCALATION_DAYS, enabled: true },
      { type: 'dbs', warnDays: [...DEFAULT_WARN_DAYS], escalationDays: DEFAULT_ESCALATION_DAYS, enabled: true },
    ];
  }

  return response.documents.map((rule) => ({
    ...rule,
    warnDays: parseWarnDays(rule.warnDays),
    escalationDays: parseEscalationDays(rule.escalationDays),
  }));
};

const findOpenFlag = async ({ guardId, type }) => {
  const response = await databases.listDocuments(dbId, flagsCol, [
    Query.equal('guardId', String(guardId)),
    Query.equal('type', String(type)),
    Query.equal('status', 'open'),
    Query.limit(1),
  ]);

  return response.documents[0] || null;
};

const resolveOpenFlagIfPresent = async ({ guardId, type, actorId, dryRun }) => {
  const existing = await findOpenFlag({ guardId, type });
  if (!existing) return null;

  if (!dryRun) {
    await databases.updateDocument(dbId, flagsCol, existing.$id, {
      status: 'resolved',
      updatedAt: new Date().toISOString(),
    });

    await logEvent({
      actorId,
      action: 'COMPLIANCE_FLAG_RESOLVED',
      resourceType: RESOURCE_TYPES.COMPLIANCE_FLAGS,
      resourceId: existing.$id,
      clientId: existing.clientId || null,
      siteId: existing.siteId || null,
      metadata: {
        guardId,
        type,
        reason: 'expiry no longer within warning/critical range',
      },
    });
  }

  return existing;
};

export const runComplianceScan = async ({ dryRun = false, now = new Date(), actor = null } = {}) => {
  ensureCollections();

  const { actor: resolvedActor } = await getAuthorizedScope({
    actor,
    permission: PERMISSIONS.MANAGE_COMPLIANCE,
  });

  const scanNow = now instanceof Date ? now : new Date(now);
  if (Number.isNaN(scanNow.getTime())) {
    throw new Error('Invalid now value for runComplianceScan.');
  }

  const rules = await loadRules();
  const staffProfiles = await listAllStaffProfiles();

  const summary = {
    dryRun,
    scannedProfiles: staffProfiles.length,
    created: 0,
    updated: 0,
    resolved: 0,
    warningsNotified: 0,
    escalationsNotified: 0,
    skippedNotifications: 0,
  };

  for (const profile of staffProfiles) {
    const guardId = profile.userId || profile.$id;
    if (!guardId) continue;

    for (const rule of rules) {
      const expiryDate = getExpiryDateForType(profile, rule.type);
      if (!expiryDate) continue;

      const remaining = daysUntil(expiryDate, scanNow);
      const severity = chooseSeverity(remaining, rule.warnDays || DEFAULT_WARN_DAYS);

      if (!severity) {
        const resolved = await resolveOpenFlagIfPresent({
          guardId,
          type: rule.type,
          actorId: resolvedActor.$id,
          dryRun,
        });
        if (resolved) summary.resolved += 1;
        continue;
      }

      const existing = await findOpenFlag({ guardId, type: rule.type });
      const basePayload = {
        guardId,
        clientId: profile.clientId || null,
        siteId: profile.siteId || null,
        type: rule.type,
        severity,
        dueAt: expiryDate.toISOString(),
        status: 'open',
        notes:
          severity === 'critical'
            ? `${rule.type} has expired.`
            : `${rule.type} expires in ${remaining} day(s).`,
        updatedAt: new Date().toISOString(),
      };

      let persisted = existing;

      if (!existing) {
        if (!dryRun) {
          persisted = await databases.createDocument(dbId, flagsCol, ID.unique(), {
            ...basePayload,
            lastNotifiedAt: null,
            createdAt: new Date().toISOString(),
          });

          await logEvent({
            actorId: resolvedActor.$id,
            action: 'COMPLIANCE_FLAG_CREATED',
            resourceType: RESOURCE_TYPES.COMPLIANCE_FLAGS,
            resourceId: persisted.$id,
            clientId: persisted.clientId || null,
            siteId: persisted.siteId || null,
            metadata: {
              guardId,
              type: rule.type,
              severity,
              remaining,
            },
          });
        }
        summary.created += 1;
      } else {
        if (!dryRun) {
          persisted = await databases.updateDocument(dbId, flagsCol, existing.$id, basePayload);
        }
        summary.updated += 1;
      }

      const warningThresholdHit =
        severity === 'warning' && (rule.warnDays || DEFAULT_WARN_DAYS).includes(remaining);
      const critical = severity === 'critical';
      const overdueDays = critical ? Math.abs(remaining) : 0;
      const escalationDue = critical && overdueDays >= parseEscalationDays(rule.escalationDays);

      if (!warningThresholdHit && !critical) {
        continue;
      }

      const canNotify = shouldNotify(persisted || existing || null, scanNow);
      if (!canNotify) {
        summary.skippedNotifications += 1;
        continue;
      }

      if (!dryRun) {
        try {
          if (warningThresholdHit || critical) {
            await notifyComplianceExpiryWarning({
              toEmail: profile.email,
              guardId,
              staffName: profile.fullName || [profile.firstName, profile.lastName].filter(Boolean).join(' ') || null,
              type: rule.type,
              dueAt: expiryDate.toISOString(),
              daysRemaining: remaining,
              clientId: profile.clientId || null,
              siteId: profile.siteId || null,
              userId: guardId,
            });
            summary.warningsNotified += 1;
          }

          if (escalationDue && config.opsEmail) {
            await notifyComplianceEscalation({
              toEmail: config.opsEmail,
              guardId,
              staffName: profile.fullName || [profile.firstName, profile.lastName].filter(Boolean).join(' ') || null,
              type: rule.type,
              dueAt: expiryDate.toISOString(),
              overdueDays,
              clientId: profile.clientId || null,
              siteId: profile.siteId || null,
              userId: guardId,
            });
            summary.escalationsNotified += 1;
          }

          if ((persisted || existing)?.$id) {
            await databases.updateDocument(dbId, flagsCol, (persisted || existing).$id, {
              lastNotifiedAt: scanNow.toISOString(),
              updatedAt: new Date().toISOString(),
            });
          }
        } catch (notifyError) {
          console.error('[complianceEngineService] Failed to enqueue compliance reminder:', notifyError);
        }
      }
    }
  }

  await logEvent({
    actorId: resolvedActor.$id,
    action: 'COMPLIANCE_SCAN_COMPLETED',
    resourceType: RESOURCE_TYPES.COMPLIANCE_FLAGS,
    resourceId: null,
    metadata: summary,
  });

  return summary;
};

export const listComplianceFlags = async (
  { filters = {}, limit = DEFAULT_LIMIT, cursor = null } = {},
  actor = null,
) => {
  ensureCollections();

  const { scope } = await getAuthorizedScope({
    actor,
    permission: PERMISSIONS.MANAGE_COMPLIANCE,
  });

  const safeLimit = clampLimit(limit, DEFAULT_LIMIT);
  const queries = [
    Query.orderAsc('dueAt'),
    Query.limit(safeLimit),
    ...scopeQueries(RESOURCE_TYPES.COMPLIANCE_FLAGS, scope),
  ];

  if (cursor) queries.push(Query.cursorAfter(String(cursor)));
  if (filters?.status) queries.push(Query.equal('status', String(filters.status)));
  if (filters?.severity) queries.push(Query.equal('severity', String(filters.severity)));
  if (filters?.type) queries.push(Query.equal('type', String(filters.type)));
  if (filters?.clientId) queries.push(Query.equal('clientId', String(filters.clientId)));
  if (filters?.siteId) queries.push(Query.equal('siteId', String(filters.siteId)));
  if (filters?.guardId) queries.push(Query.equal('guardId', String(filters.guardId)));

  const response = await databases.listDocuments(dbId, flagsCol, queries);
  const last = response.documents[response.documents.length - 1] || null;

  return {
    documents: response.documents,
    total: response.total,
    nextCursor: response.documents.length >= safeLimit && last ? last.$id : null,
  };
};

export const updateComplianceFlagStatus = async (
  flagId,
  { status, notes = null } = {},
  actor = null,
) => {
  ensureCollections();

  const allowedStatuses = new Set(['open', 'resolved', 'dismissed']);
  if (!allowedStatuses.has(String(status || ''))) {
    throw new Error('Invalid compliance flag status.');
  }

  const { actor: resolvedActor, scope } = await getAuthorizedScope({
    actor,
    permission: PERMISSIONS.MANAGE_COMPLIANCE,
  });

  const existing = await databases.getDocument(dbId, flagsCol, flagId);
  assertScopedDocument(RESOURCE_TYPES.COMPLIANCE_FLAGS, existing, scope);

  const updated = await databases.updateDocument(dbId, flagsCol, flagId, {
    status: String(status),
    notes: notes || existing.notes || null,
    updatedAt: new Date().toISOString(),
  });

  await logEvent({
    actorId: resolvedActor.$id,
    action: 'COMPLIANCE_FLAG_STATUS_CHANGED',
    resourceType: RESOURCE_TYPES.COMPLIANCE_FLAGS,
    resourceId: updated.$id,
    clientId: updated.clientId || null,
    siteId: updated.siteId || null,
    metadata: {
      previousStatus: existing.status,
      nextStatus: updated.status,
      notes: notes || null,
    },
  });

  return updated;
};
