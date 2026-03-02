import { ID, Query } from 'appwrite';
import { databases, config } from '../lib/appwrite.js';
import { PERMISSIONS, ROLES } from '../lib/rbac.ts';
import { ensureDatabaseConfig, getAuthorizedScope } from '../lib/serviceSecurity.js';
import { RESOURCE_TYPES, scopeQueries } from '../lib/tenancyScope.js';
import { logEvent } from './auditLogService.js';
import { enqueueNotification } from './notificationService.js';

const dbId = config.databaseId;
const securityEventsCol = config.securityEventsCollectionId || 'security_events';
const financeEventsCol = config.financeEventsCollectionId || 'finance_events';

const BREAK_GLASS_STORAGE_KEY = 'fortis.breakGlassSession';
const DEFAULT_BREAK_GLASS_MINUTES = 30;
const MAX_LIMIT = 100;

const clampLimit = (value, fallback = 25) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, MAX_LIMIT);
};

const asIso = (value, field = 'date') => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid ${field}: ${value}`);
  }
  return date.toISOString();
};

const resolveAllowlist = () => {
  const fromConfig = String(config.breakGlassEmailAllowlist || '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  if (fromConfig.length > 0) return fromConfig;

  return String(config.adminEmails || '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
};

const ensureCollections = () => {
  ensureDatabaseConfig(securityEventsCol, 'security events collection');
};

const assertAdminOrEntityAdmin = (scope) => {
  const role = String(scope?.role || '');
  if (role !== ROLES.ADMIN && role !== ROLES.ENTITY_ADMIN) {
    throw new Error('Permission denied: security events are restricted to admin users.');
  }
};

const safeStorage = {
  get() {
    if (typeof window === 'undefined') return null;
    try {
      return window.sessionStorage.getItem(BREAK_GLASS_STORAGE_KEY);
    } catch (_) {
      return null;
    }
  },
  set(value) {
    if (typeof window === 'undefined') return;
    try {
      window.sessionStorage.setItem(BREAK_GLASS_STORAGE_KEY, value);
    } catch (_) {
      // no-op
    }
  },
  clear() {
    if (typeof window === 'undefined') return;
    try {
      window.sessionStorage.removeItem(BREAK_GLASS_STORAGE_KEY);
    } catch (_) {
      // no-op
    }
  },
};

export const getBreakGlassSession = () => {
  const raw = safeStorage.get();
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    if (!parsed?.expiresAt) return null;

    const expires = new Date(parsed.expiresAt).getTime();
    if (Number.isNaN(expires) || expires <= Date.now()) {
      safeStorage.clear();
      return null;
    }

    return parsed;
  } catch (_) {
    safeStorage.clear();
    return null;
  }
};

export const clearBreakGlassSession = () => {
  safeStorage.clear();
};

export const logSecurityEvent = async (
  {
    actorId,
    eventType,
    severity = 'info',
    entityId = null,
    metadata = {},
    notify = true,
  } = {},
  actor = null,
) => {
  ensureCollections();

  if (!actorId) throw new Error('actorId is required for security event logging.');
  if (!eventType) throw new Error('eventType is required for security event logging.');

  const { actor: resolvedActor, scope } = await getAuthorizedScope({
    actor,
    permission: PERMISSIONS.MANAGE_USERS,
  });
  assertAdminOrEntityAdmin(scope);

  const payload = {
    entityId: entityId || null,
    actorId: String(actorId),
    eventType: String(eventType),
    severity: String(severity || 'info'),
    metadata: metadata || {},
    createdAt: new Date().toISOString(),
  };

  const document = await databases.createDocument(dbId, securityEventsCol, ID.unique(), payload);

  await logEvent({
    actorId: resolvedActor.$id,
    action: 'SECURITY_EVENT_CREATED',
    resourceType: RESOURCE_TYPES.SECURITY_EVENTS,
    resourceId: document.$id,
    clientId: metadata?.clientId || null,
    siteId: metadata?.siteId || null,
    metadata: {
      entityId,
      eventType,
      severity,
      sourceActorId: actorId,
    },
  });

  if (notify && config.opsEmail) {
    try {
      await enqueueNotification(
        'securityEventCreated',
        config.opsEmail,
        {
          actorId,
          eventType,
          severity,
          entityId,
          createdAt: payload.createdAt,
          metadata,
        },
        {
          clientId: metadata?.clientId || null,
          siteId: metadata?.siteId || null,
          userId: actorId,
        },
      );
    } catch (error) {
      console.error('[securityEventService] Failed to enqueue security event email.', error);
    }
  }

  return document;
};

export const startBreakGlassSession = async (
  {
    actorEmail,
    actorId,
    entityId = null,
    reason = 'Emergency operational intervention',
    durationMinutes = DEFAULT_BREAK_GLASS_MINUTES,
  } = {},
  actor = null,
) => {
  if (!actorEmail) throw new Error('actorEmail is required to start break-glass mode.');
  if (!actorId) throw new Error('actorId is required to start break-glass mode.');

  const allowlist = resolveAllowlist();
  const normalizedEmail = String(actorEmail).trim().toLowerCase();

  if (!allowlist.includes(normalizedEmail)) {
    throw new Error('Break-glass denied: actor email is not in BREAK_GLASS_EMAIL_ALLOWLIST.');
  }

  const expiresAt = new Date(Date.now() + Math.max(1, Number(durationMinutes || DEFAULT_BREAK_GLASS_MINUTES)) * 60 * 1000).toISOString();

  const event = await logSecurityEvent(
    {
      actorId,
      eventType: 'break_glass_used',
      severity: 'critical',
      entityId,
      metadata: {
        reason,
        actorEmail: normalizedEmail,
        expiresAt,
      },
      notify: true,
    },
    actor,
  );

  const session = {
    actorId,
    actorEmail: normalizedEmail,
    entityId,
    reason,
    startedAt: new Date().toISOString(),
    expiresAt,
    securityEventId: event.$id,
  };

  safeStorage.set(JSON.stringify(session));
  return session;
};

export const assertBreakGlassActive = () => {
  const session = getBreakGlassSession();
  if (!session) {
    throw new Error('Break-glass session is not active.');
  }
  return session;
};

export const listSecurityEvents = async ({ limit = 25, cursor = null, filters = {} } = {}, actor = null) => {
  ensureCollections();

  const { scope } = await getAuthorizedScope({
    actor,
    permission: PERMISSIONS.VIEW_AUDIT_LOG,
  });
  assertAdminOrEntityAdmin(scope);

  const queries = [
    Query.orderDesc('createdAt'),
    Query.limit(clampLimit(limit)),
    ...scopeQueries(RESOURCE_TYPES.SECURITY_EVENTS, scope),
  ];

  if (cursor) queries.push(Query.cursorAfter(String(cursor)));
  if (filters.eventType) queries.push(Query.equal('eventType', String(filters.eventType)));
  if (filters.severity) queries.push(Query.equal('severity', String(filters.severity)));
  if (filters.entityId) queries.push(Query.equal('entityId', String(filters.entityId)));
  if (filters.actorId) queries.push(Query.equal('actorId', String(filters.actorId)));
  if (filters.from) queries.push(Query.greaterThanEqual('createdAt', asIso(filters.from, 'filters.from')));
  if (filters.to) queries.push(Query.lessThanEqual('createdAt', asIso(filters.to, 'filters.to')));

  const response = await databases.listDocuments(dbId, securityEventsCol, queries);
  const last = response.documents[response.documents.length - 1] || null;

  return {
    documents: response.documents,
    total: response.total,
    nextCursor: response.documents.length >= clampLimit(limit) && last ? last.$id : null,
  };
};

export const detectSuspiciousExportActivity = async (
  {
    entityId = null,
    windowHours = 12,
    threshold = 5,
  } = {},
  actor = null,
) => {
  ensureCollections();
  ensureDatabaseConfig(financeEventsCol, 'finance events collection');

  const { actor: resolvedActor, scope } = await getAuthorizedScope({
    actor,
    permission: PERMISSIONS.VIEW_FINANCE,
  });
  assertAdminOrEntityAdmin(scope);

  const since = new Date(Date.now() - Math.max(1, Number(windowHours || 12)) * 60 * 60 * 1000).toISOString();

  const queries = [
    Query.greaterThanEqual('createdAt', since),
    Query.orderDesc('createdAt'),
    Query.limit(100),
    ...scopeQueries(RESOURCE_TYPES.FINANCE_EVENTS, scope),
  ];

  if (entityId) queries.push(Query.equal('entityId', String(entityId)));

  const response = await databases.listDocuments(dbId, financeEventsCol, queries);
  const hits = response.documents.length;

  if (hits >= Number(threshold || 5)) {
    await logSecurityEvent(
      {
        actorId: resolvedActor.$id,
        eventType: 'suspicious_export_activity',
        severity: hits >= Number(threshold || 5) * 2 ? 'critical' : 'warning',
        entityId,
        metadata: {
          hits,
          windowHours,
          threshold,
        },
      },
      resolvedActor,
    );
  }

  return {
    since,
    hits,
    threshold: Number(threshold || 5),
    suspicious: hits >= Number(threshold || 5),
  };
};
