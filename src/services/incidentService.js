import { ID, Query } from 'appwrite';
import { databases, config } from '../lib/appwrite.js';
import { PERMISSIONS, ROLES } from '../lib/rbac.ts';
import {
  assertScopedDocument,
  ensureDatabaseConfig,
  getAuthorizedScope,
} from '../lib/serviceSecurity.js';
import {
  RESOURCE_TYPES,
  enforceTenancyFields,
  scopeQueries,
} from '../lib/tenancyScope.js';
import { logEvent } from './auditLogService.js';
import { notifyIncidentFinal, notifyIncidentInterim } from './notificationService.js';

const dbId = config.databaseId;
const incidentsCol = config.incidentsCollectionId || 'incidents';
const clientsCol = config.clientsCollectionId || 'clients';

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

const INCIDENT_STATUSES = new Set([
  'draft',
  'submitted',
  'interim_sent',
  'needs_review',
  'approved',
  'final_sent',
  'rejected',
]);

const clampLimit = (value, fallback = DEFAULT_LIMIT) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, MAX_LIMIT);
};

const ensureCollections = () => {
  ensureDatabaseConfig(incidentsCol, 'incidents collection');
  ensureDatabaseConfig(clientsCol, 'clients collection');
};

const assertRole = (scope, allowedRoles, message = 'Permission denied.') => {
  if (!allowedRoles.includes(String(scope.role || ''))) {
    throw new Error(message);
  }
};

const transitionIncidentStatus = async (
  incident,
  {
    actorId,
    nextStatus,
    reason = null,
    metadata = {},
  } = {},
) => {
  if (!INCIDENT_STATUSES.has(String(nextStatus || ''))) {
    throw new Error(`Invalid incident status transition target: ${nextStatus}`);
  }

  const updated = await databases.updateDocument(dbId, incidentsCol, incident.$id, {
    status: nextStatus,
    reviewReason: reason || incident.reviewReason || null,
    updatedAt: new Date().toISOString(),
  });

  await logEvent({
    actorId,
    action: 'INCIDENT_STATUS_CHANGED',
    resourceType: RESOURCE_TYPES.INCIDENTS,
    resourceId: incident.$id,
    clientId: incident.clientId || null,
    siteId: incident.siteId || null,
    metadata: {
      previousStatus: incident.status,
      nextStatus,
      reason,
      ...metadata,
    },
  });

  return updated;
};

const getClientEmail = async (clientId) => {
  if (!clientId) return null;

  try {
    const client = await databases.getDocument(dbId, clientsCol, String(clientId));
    return client?.email || null;
  } catch (_) {
    return null;
  }
};

export const listIncidents = async (
  { filters = {}, limit = DEFAULT_LIMIT, cursor = null } = {},
  actor = null,
) => {
  ensureCollections();

  const { scope } = await getAuthorizedScope({
    actor,
    permission: PERMISSIONS.VIEW_INCIDENTS,
  });

  const safeLimit = clampLimit(limit, DEFAULT_LIMIT);
  const queries = [
    Query.orderDesc('createdAt'),
    Query.limit(safeLimit),
    ...scopeQueries(RESOURCE_TYPES.INCIDENTS, scope),
  ];

  if (cursor) queries.push(Query.cursorAfter(String(cursor)));
  if (filters?.status) queries.push(Query.equal('status', String(filters.status)));
  if (filters?.clientId) queries.push(Query.equal('clientId', String(filters.clientId)));
  if (filters?.siteId) queries.push(Query.equal('siteId', String(filters.siteId)));
  if (filters?.reportedBy) queries.push(Query.equal('reportedBy', String(filters.reportedBy)));

  const response = await databases.listDocuments(dbId, incidentsCol, queries);
  const last = response.documents[response.documents.length - 1] || null;

  return {
    documents: response.documents,
    total: response.total,
    nextCursor: response.documents.length >= safeLimit && last ? last.$id : null,
  };
};

export const getIncidentById = async (incidentId, actor = null) => {
  ensureCollections();

  const { scope } = await getAuthorizedScope({
    actor,
    permission: PERMISSIONS.VIEW_INCIDENTS,
  });

  const incident = await databases.getDocument(dbId, incidentsCol, incidentId);
  assertScopedDocument(RESOURCE_TYPES.INCIDENTS, incident, scope);
  return incident;
};

export const createIncidentDraft = async (payload = {}, actor = null) => {
  ensureCollections();

  const { actor: resolvedActor, scope } = await getAuthorizedScope({
    actor,
    permission: PERMISSIONS.VIEW_INCIDENTS,
  });

  assertRole(scope, [ROLES.STAFF, ROLES.MANAGER, ROLES.ADMIN], 'Permission denied: cannot create incidents.');

  const incidentPayload = {
    clientId: payload.clientId,
    siteId: payload.siteId,
    shiftId: payload.shiftId || null,
    reportedBy: payload.reportedBy || resolvedActor.$id,
    status: 'draft',
    severity: payload.severity || 'medium',
    summary: payload.summary || 'Untitled incident',
    details: payload.details || '',
    reviewReason: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  enforceTenancyFields('incidents', incidentPayload);

  const created = await databases.createDocument(dbId, incidentsCol, ID.unique(), incidentPayload);

  await logEvent({
    actorId: resolvedActor.$id,
    action: 'INCIDENT_DRAFT_CREATED',
    resourceType: RESOURCE_TYPES.INCIDENTS,
    resourceId: created.$id,
    clientId: created.clientId,
    siteId: created.siteId,
    metadata: {
      severity: created.severity,
      shiftId: created.shiftId || null,
    },
  });

  return created;
};

export const updateIncidentDraft = async (incidentId, payload = {}, actor = null) => {
  ensureCollections();

  const { actor: resolvedActor, scope } = await getAuthorizedScope({
    actor,
    permission: PERMISSIONS.VIEW_INCIDENTS,
  });

  const existing = await databases.getDocument(dbId, incidentsCol, incidentId);
  assertScopedDocument(RESOURCE_TYPES.INCIDENTS, existing, scope);

  if (!['draft', 'rejected'].includes(String(existing.status || ''))) {
    throw new Error('Only draft or rejected incidents can be edited.');
  }

  if (String(scope.role || '') === ROLES.STAFF && String(existing.reportedBy || '') !== String(resolvedActor.$id || '')) {
    throw new Error('Permission denied: staff can only edit their own incident drafts.');
  }

  const updated = await databases.updateDocument(dbId, incidentsCol, incidentId, {
    summary: payload.summary ?? existing.summary,
    details: payload.details ?? existing.details,
    severity: payload.severity ?? existing.severity,
    shiftId: payload.shiftId ?? existing.shiftId,
    updatedAt: new Date().toISOString(),
  });

  await logEvent({
    actorId: resolvedActor.$id,
    action: 'INCIDENT_DRAFT_UPDATED',
    resourceType: RESOURCE_TYPES.INCIDENTS,
    resourceId: updated.$id,
    clientId: updated.clientId,
    siteId: updated.siteId,
    metadata: {
      fields: Object.keys(payload || {}),
    },
  });

  return updated;
};

export const submitIncident = async (incidentId, actor = null) => {
  ensureCollections();

  const { actor: resolvedActor, scope } = await getAuthorizedScope({
    actor,
    permission: PERMISSIONS.VIEW_INCIDENTS,
  });

  const incident = await databases.getDocument(dbId, incidentsCol, incidentId);
  assertScopedDocument(RESOURCE_TYPES.INCIDENTS, incident, scope);

  if (String(scope.role || '') === ROLES.STAFF && String(incident.reportedBy || '') !== String(resolvedActor.$id || '')) {
    throw new Error('Permission denied: staff can only submit their own incidents.');
  }

  if (String(incident.status || '') !== 'draft') {
    throw new Error('Only draft incidents can be submitted.');
  }

  const submitted = await transitionIncidentStatus(incident, {
    actorId: resolvedActor.$id,
    nextStatus: 'submitted',
  });

  const interim = await transitionIncidentStatus(submitted, {
    actorId: resolvedActor.$id,
    nextStatus: 'interim_sent',
  });

  const clientEmail = await getClientEmail(interim.clientId);
  if (clientEmail) {
    try {
      await notifyIncidentInterim({
        toEmail: clientEmail,
        incidentId: interim.$id,
        summary: interim.summary,
        siteId: interim.siteId,
        clientId: interim.clientId,
        userId: interim.reportedBy,
      });
    } catch (notifyError) {
      console.error('[incidentService] Failed to enqueue interim incident email:', notifyError);
    }
  }

  const needsReview = await transitionIncidentStatus(interim, {
    actorId: resolvedActor.$id,
    nextStatus: 'needs_review',
    metadata: {
      interimNotificationQueued: Boolean(clientEmail),
    },
  });

  return needsReview;
};

export const reviewIncident = async (
  incidentId,
  { decision, reason = null } = {},
  actor = null,
) => {
  ensureCollections();

  const normalizedDecision = String(decision || '').toLowerCase();
  if (!['approve', 'reject'].includes(normalizedDecision)) {
    throw new Error('reviewIncident decision must be approve or reject.');
  }

  const { actor: resolvedActor, scope } = await getAuthorizedScope({
    actor,
    permission: PERMISSIONS.VIEW_INCIDENTS,
  });

  assertRole(scope, [ROLES.ADMIN], 'Permission denied: only admins can review incidents.');

  const incident = await databases.getDocument(dbId, incidentsCol, incidentId);
  assertScopedDocument(RESOURCE_TYPES.INCIDENTS, incident, scope);

  if (String(incident.status || '') !== 'needs_review') {
    throw new Error('Only incidents in needs_review can be approved/rejected.');
  }

  if (normalizedDecision === 'reject') {
    return transitionIncidentStatus(incident, {
      actorId: resolvedActor.$id,
      nextStatus: 'rejected',
      reason: reason || 'Rejected by admin review.',
    });
  }

  const approved = await transitionIncidentStatus(incident, {
    actorId: resolvedActor.$id,
    nextStatus: 'approved',
    reason: reason || null,
  });

  const clientEmail = await getClientEmail(approved.clientId);
  if (clientEmail) {
    try {
      await notifyIncidentFinal({
        toEmail: clientEmail,
        incidentId: approved.$id,
        summary: approved.summary,
        outcome: 'Approved final report',
        siteId: approved.siteId,
        clientId: approved.clientId,
        userId: approved.reportedBy,
      });
    } catch (notifyError) {
      console.error('[incidentService] Failed to enqueue final incident email:', notifyError);
    }
  }

  return transitionIncidentStatus(approved, {
    actorId: resolvedActor.$id,
    nextStatus: 'final_sent',
    metadata: {
      finalNotificationQueued: Boolean(clientEmail),
    },
  });
};
