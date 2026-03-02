/**
 * Audit Service
 * Backward-compatible wrapper around tenancy-aware audit logging.
 */

import { Query } from 'appwrite';
import { databases, config } from '../lib/appwrite.js';
import { PERMISSIONS } from '../lib/rbac.ts';
import { ensureDatabaseConfig, getAuthorizedScope, withScopedQueries } from '../lib/serviceSecurity.js';
import { RESOURCE_TYPES } from '../lib/tenancyScope.js';
import { logEvent } from './auditLogService.js';

export async function logAudit({
  actorId,
  actorRole,
  action,
  entity,
  entityId,
  diff = null,
  ipAddress = null,
  userAgent = null,
  clientId = null,
  siteId = null,
}) {
  try {
    return await logEvent({
      actorId,
      action: String(action || '').toLowerCase(),
      resourceType: entity || 'unknown',
      resourceId: entityId || null,
      clientId,
      siteId,
      metadata: {
        actorRole,
        diff,
        ipAddress,
        userAgent,
      },
    });
  } catch (error) {
    console.error('Failed to log audit:', error);
    return null;
  }
}

export async function logAction({
  actorId = 'system',
  actorRole = 'system',
  action,
  entity,
  entityId,
  changes = null,
  ipAddress = null,
  userAgent = null,
  clientId = null,
  siteId = null,
} = {}) {
  return logAudit({
    actorId,
    actorRole,
    action,
    entity,
    entityId,
    diff: changes,
    ipAddress,
    userAgent,
    clientId,
    siteId,
  });
}

export async function getAuditLogs(filters = {}, actor = null) {
  ensureDatabaseConfig(config.auditLogsCollectionId, 'audit logs collection');

  const { scope } = await getAuthorizedScope({ actor, permission: PERMISSIONS.VIEW_AUDIT_LOG });

  const queries = withScopedQueries(RESOURCE_TYPES.AUDIT_LOGS, scope, []);

  if (filters.actorId) queries.push(Query.equal('actorId', filters.actorId));
  if (filters.entity) queries.push(Query.equal('entity', filters.entity));
  if (filters.entityId) queries.push(Query.equal('entityId', filters.entityId));

  queries.push(Query.orderDesc('$createdAt'));
  queries.push(Query.limit(Number(filters.limit || 100)));
  if (filters.offset) queries.push(Query.offset(Number(filters.offset)));

  return databases.listDocuments(config.databaseId, config.auditLogsCollectionId, queries);
}

export function createDiff(before, after) {
  const diff = {
    before: {},
    after: {},
  };

  const keys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})]);

  for (const key of keys) {
    if (key.startsWith('$')) continue;

    const beforeValue = before?.[key];
    const afterValue = after?.[key];

    if (JSON.stringify(beforeValue) !== JSON.stringify(afterValue)) {
      diff.before[key] = beforeValue;
      diff.after[key] = afterValue;
    }
  }

  return Object.keys(diff.before).length > 0 ? diff : null;
}

export async function logLogin(userId, role, ipAddress = null, userAgent = null) {
  return logAudit({
    actorId: userId,
    actorRole: role,
    action: 'login',
    entity: 'session',
    entityId: userId,
    ipAddress,
    userAgent,
  });
}

export async function logLogout(userId, role) {
  return logAudit({
    actorId: userId,
    actorRole: role,
    action: 'logout',
    entity: 'session',
    entityId: userId,
  });
}

export async function logUserCreation(actorId, actorRole, userId, userData) {
  return logAudit({
    actorId,
    actorRole,
    action: 'create',
    entity: 'users',
    entityId: userId,
    diff: { before: {}, after: userData },
  });
}

export async function logUserUpdate(actorId, actorRole, userId, before, after) {
  const diff = createDiff(before, after);
  if (!diff) return null;

  return logAudit({
    actorId,
    actorRole,
    action: 'update',
    entity: 'users',
    entityId: userId,
    diff,
  });
}

export async function logUserDeletion(actorId, actorRole, userId, userData) {
  return logAudit({
    actorId,
    actorRole,
    action: 'delete',
    entity: 'users',
    entityId: userId,
    diff: { before: userData, after: {} },
  });
}
