import { ID, Query } from 'appwrite';
import { databases, config } from '../lib/appwrite.js';
import { PERMISSIONS, ROLES } from '../lib/rbac.ts';
import {
  assertScopedDocument,
  ensureDatabaseConfig,
  getAuthorizedScope,
} from '../lib/serviceSecurity.js';
import { RESOURCE_TYPES, scopeQueries } from '../lib/tenancyScope.js';
import { logEvent } from './auditLogService.js';
import { logSecurityEvent } from './securityEventService.js';

const dbId = config.databaseId;
const financeEventsCol = config.financeEventsCollectionId || 'finance_events';

const PROVIDERS = new Set(['xero', 'quickbooks']);
const EVENT_TYPES = new Set(['payroll_export_ready', 'invoice_export_ready', 'rate_change_approved']);
const SENDABLE_STATUSES = new Set(['pending', 'failed']);

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

const ensureCollections = () => {
  ensureDatabaseConfig(financeEventsCol, 'finance events collection');
};

const normalizeProvider = (value) => {
  const provider = String(value || 'xero').trim().toLowerCase();
  if (!PROVIDERS.has(provider)) {
    throw new Error(`Unsupported finance provider: ${value}`);
  }
  return provider;
};

const normalizeEventType = (value) => {
  const eventType = String(value || '').trim();
  if (!EVENT_TYPES.has(eventType)) {
    throw new Error(`Unsupported finance eventType: ${value}`);
  }
  return eventType;
};

const clampLimit = (value, fallback = DEFAULT_LIMIT) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, MAX_LIMIT);
};

const stableJson = (value) => {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableJson(item)).join(',')}]`;
  }

  if (value && typeof value === 'object') {
    const keys = Object.keys(value).sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  }

  return JSON.stringify(value);
};

const computePayloadHash = (value) => {
  const input = stableJson(value || {});
  let hash = 2166136261;

  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash +=
      (hash << 1) +
      (hash << 4) +
      (hash << 7) +
      (hash << 8) +
      (hash << 24);
  }

  return (hash >>> 0).toString(16).padStart(8, '0');
};

const assertAdminRole = (scope) => {
  const role = String(scope?.role || '');
  if (role !== ROLES.ADMIN && role !== ROLES.ENTITY_ADMIN) {
    throw new Error('Permission denied: finance integration actions are restricted to admin users.');
  }
};

const isIntegrationEnabled = () => Boolean(config.financeIntegrationEnabled);

const buildMetadata = ({
  entityId = null,
  provider,
  eventType,
  referenceId,
  previewOnly,
  payload,
  reason = null,
}) => ({
  entityId,
  provider,
  eventType,
  referenceId,
  previewOnly,
  payloadPreviewHash: computePayloadHash(payload),
  payloadPreviewSize: JSON.stringify(payload || {}).length,
  reason,
  financeIntegrationEnabled: isIntegrationEnabled(),
});

const createEventRecord = async ({
  actorId,
  entityId = null,
  clientId = null,
  provider,
  eventType,
  referenceId,
  payload,
}) => {
  const payloadHash = computePayloadHash(payload);

  const event = await databases.createDocument(dbId, financeEventsCol, ID.unique(), {
    eventType,
    referenceId: String(referenceId),
    entityId: entityId || null,
    clientId: clientId || null,
    provider,
    status: 'pending',
    payloadHash,
    createdAt: new Date().toISOString(),
  });

  await logEvent({
    actorId,
    action: 'FINANCE_EVENT_CREATED',
    resourceType: RESOURCE_TYPES.FINANCE_EVENTS,
    resourceId: event.$id,
    clientId: clientId || null,
    metadata: {
      entityId,
      eventType,
      provider,
      referenceId,
      payloadHash,
    },
  });

  return event;
};

const checkSuspiciousExportPattern = async ({ eventType, entityId = null, actor, scope }) => {
  const monitored = ['payroll_export_ready', 'invoice_export_ready'];
  if (!monitored.includes(String(eventType || ''))) return;

  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const queries = [
    Query.greaterThanEqual('createdAt', since),
    Query.equal('eventType', monitored),
    Query.limit(100),
    ...scopeQueries(RESOURCE_TYPES.FINANCE_EVENTS, scope),
  ];

  if (entityId) {
    queries.push(Query.equal('entityId', String(entityId)));
  }

  const response = await databases.listDocuments(dbId, financeEventsCol, queries);
  const hits = Number(response?.documents?.length || 0);

  if (hits < 10) return;

  await logSecurityEvent(
    {
      actorId: actor.$id,
      eventType: 'suspicious_export_activity',
      severity: hits >= 20 ? 'critical' : 'warning',
      entityId: entityId || null,
      metadata: {
        hits,
        threshold: 10,
        windowHours: 1,
      },
    },
    actor,
  );
};

export const toPayrollProviderPayload = ({ exportRecord, rows = [], provider = 'xero' }) => {
  const normalizedProvider = normalizeProvider(provider);

  const common = {
    provider: normalizedProvider,
    exportId: exportRecord?.$id || null,
    rangeStart: exportRecord?.rangeStart || null,
    rangeEnd: exportRecord?.rangeEnd || null,
    generatedAt: new Date().toISOString(),
    records: rows,
  };

  if (normalizedProvider === 'xero') {
    return {
      ...common,
      schema: 'xero.payroll.timesheet.v1',
      payload: rows.map((row) => ({
        employeeReference: row.guardId,
        employeeName: row.guardName,
        weekStart: row.weekStart,
        weekEnd: row.weekEnd,
        payableHours: Number(row.payableHours || 0),
        hourlyRate: Number(row.hourlyRate || 0),
      })),
    };
  }

  return {
    ...common,
    schema: 'quickbooks.payroll.timesheet.v1',
    payload: rows.map((row) => ({
      EmployeeId: row.guardId,
      EmployeeName: row.guardName,
      WeekStart: row.weekStart,
      WeekEnd: row.weekEnd,
      HoursWorked: Number(row.payableHours || 0),
      HourlyRate: Number(row.hourlyRate || 0),
    })),
  };
};

export const toBillingProviderPayload = ({ exportRecord, rows = [], provider = 'xero' }) => {
  const normalizedProvider = normalizeProvider(provider);

  const common = {
    provider: normalizedProvider,
    exportId: exportRecord?.$id || null,
    rangeStart: exportRecord?.rangeStart || null,
    rangeEnd: exportRecord?.rangeEnd || null,
    generatedAt: new Date().toISOString(),
    lines: rows,
  };

  if (normalizedProvider === 'xero') {
    return {
      ...common,
      schema: 'xero.invoices.lines.v1',
      payload: rows.map((row) => ({
        Description: `${row.clientId}/${row.siteId} ${row.dayType} ${row.role}`,
        Quantity: Number(row.payableHours || 0),
        UnitAmount: Number(row.hourlyRate || 0),
        LineAmount: Number(row.lineTotal || 0),
        Tracking: {
          clientId: row.clientId,
          siteId: row.siteId,
        },
      })),
    };
  }

  return {
    ...common,
    schema: 'quickbooks.invoices.lines.v1',
    payload: rows.map((row) => ({
      Description: `${row.clientId}/${row.siteId} ${row.dayType} ${row.role}`,
      Qty: Number(row.payableHours || 0),
      Rate: Number(row.hourlyRate || 0),
      Amount: Number(row.lineTotal || 0),
      ClassRef: row.clientId || null,
    })),
  };
};

export const createFinanceEvent = async (
  {
    eventType,
    referenceId,
    entityId = null,
    clientId = null,
    provider = 'xero',
    payload = {},
  } = {},
  actor = null,
) => {
  ensureCollections();

  const normalizedProvider = normalizeProvider(provider);
  const normalizedEventType = normalizeEventType(eventType);

  if (!referenceId) {
    throw new Error('referenceId is required for finance events.');
  }

  const { actor: resolvedActor, scope } = await getAuthorizedScope({
    actor,
    permission: PERMISSIONS.VIEW_FINANCE,
  });
  assertAdminRole(scope);

  const resolvedEntityId = entityId || payload?.entityId || scope.entityId || null;
  if (!resolvedEntityId) {
    throw new Error('entityId is required for finance events in multi-entity mode.');
  }

  const event = await createEventRecord({
    actorId: resolvedActor.$id,
    entityId: resolvedEntityId,
    clientId,
    provider: normalizedProvider,
    eventType: normalizedEventType,
    referenceId,
    payload,
  });

  await checkSuspiciousExportPattern({
    eventType: normalizedEventType,
    entityId: resolvedEntityId,
    actor: resolvedActor,
    scope,
  });

  return {
    event,
    previewOnly: !isIntegrationEnabled(),
    payload,
  };
};

export const createPayrollExportFinanceEvent = async (
  { exportRecord, rows = [], provider = 'xero', clientId = null, entityId = null } = {},
  actor = null,
) => {
  if (!exportRecord?.$id) {
    throw new Error('exportRecord is required to create payroll finance event.');
  }

  const payload = toPayrollProviderPayload({ exportRecord, rows, provider });

  return createFinanceEvent(
    {
      eventType: 'payroll_export_ready',
      referenceId: exportRecord.$id,
      entityId: entityId || exportRecord?.entityId || null,
      clientId,
      provider,
      payload,
    },
    actor,
  );
};

export const createBillingExportFinanceEvent = async (
  { exportRecord, rows = [], provider = 'xero', clientId = null, entityId = null } = {},
  actor = null,
) => {
  if (!exportRecord?.$id) {
    throw new Error('exportRecord is required to create billing finance event.');
  }

  const payload = toBillingProviderPayload({ exportRecord, rows, provider });

  return createFinanceEvent(
    {
      eventType: 'invoice_export_ready',
      referenceId: exportRecord.$id,
      entityId: entityId || exportRecord?.entityId || null,
      clientId,
      provider,
      payload,
    },
    actor,
  );
};

export const createRateChangeApprovedFinanceEvent = async (
  {
    referenceId,
    entityId = null,
    clientId = null,
    provider = 'xero',
    payload = {},
  } = {},
  actor = null,
) => {
  return createFinanceEvent(
    {
      eventType: 'rate_change_approved',
      referenceId,
      entityId,
      clientId,
      provider,
      payload,
    },
    actor,
  );
};

export const listFinanceEvents = async ({ limit = DEFAULT_LIMIT, cursor = null, filters = {} } = {}, actor = null) => {
  ensureCollections();

  const { scope } = await getAuthorizedScope({
    actor,
    permission: PERMISSIONS.VIEW_FINANCE,
  });
  assertAdminRole(scope);

  const safeLimit = clampLimit(limit, DEFAULT_LIMIT);
  const queries = [
    Query.orderDesc('createdAt'),
    Query.limit(safeLimit),
    ...scopeQueries(RESOURCE_TYPES.FINANCE_EVENTS, scope),
  ];

  if (cursor) queries.push(Query.cursorAfter(String(cursor)));
  if (filters?.eventType) queries.push(Query.equal('eventType', String(filters.eventType)));
  if (filters?.status) queries.push(Query.equal('status', String(filters.status)));
  if (filters?.provider) queries.push(Query.equal('provider', normalizeProvider(filters.provider)));
  if (filters?.clientId) queries.push(Query.equal('clientId', String(filters.clientId)));
  if (filters?.entityId) queries.push(Query.equal('entityId', String(filters.entityId)));

  const response = await databases.listDocuments(dbId, financeEventsCol, queries);
  const last = response.documents[response.documents.length - 1] || null;

  return {
    documents: response.documents,
    total: response.total,
    nextCursor: response.documents.length >= safeLimit && last ? last.$id : null,
  };
};

export const approveFinanceEvent = async (
  eventId,
  {
    send = true,
    payloadPreview = null,
    reason = null,
  } = {},
  actor = null,
) => {
  ensureCollections();

  const { actor: resolvedActor, scope } = await getAuthorizedScope({
    actor,
    permission: PERMISSIONS.VIEW_FINANCE,
  });
  assertAdminRole(scope);

  const existing = await databases.getDocument(dbId, financeEventsCol, String(eventId));
  assertScopedDocument(RESOURCE_TYPES.FINANCE_EVENTS, existing, scope);

  if (!SENDABLE_STATUSES.has(String(existing.status || ''))) {
    throw new Error(`Finance event is not actionable from status '${existing.status}'.`);
  }

  const integrationEnabled = isIntegrationEnabled();
  const shouldSend = Boolean(send && integrationEnabled);
  const nextStatus = shouldSend ? 'sent' : 'acknowledged';

  const updated = await databases.updateDocument(dbId, financeEventsCol, existing.$id, {
    status: nextStatus,
  });

  await logEvent({
    actorId: resolvedActor.$id,
    action: shouldSend ? 'FINANCE_EVENT_SENT' : 'FINANCE_EVENT_APPROVED_PREVIEW',
    resourceType: RESOURCE_TYPES.FINANCE_EVENTS,
    resourceId: updated.$id,
    clientId: updated.clientId || null,
    metadata: buildMetadata({
      entityId: updated.entityId || null,
      provider: updated.provider,
      eventType: updated.eventType,
      referenceId: updated.referenceId,
      previewOnly: !shouldSend,
      payload: payloadPreview,
      reason,
    }),
  });

  return {
    event: updated,
    previewOnly: !shouldSend,
    integrationEnabled,
  };
};
