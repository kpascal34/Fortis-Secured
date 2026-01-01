/**
 * Audit Logging Service
 * Tracks all user actions for compliance and security
 */

import { databases, config } from '../lib/appwrite.js';
import { ID } from 'appwrite';

/**
 * Log an action to audit log
 * @param {object} params - Audit log parameters
 * @param {string} params.actorId - User ID performing the action
 * @param {string} params.actorRole - Role of the actor
 * @param {string} params.action - Action performed (create, read, update, delete)
 * @param {string} params.entity - Entity type (users, profiles, etc.)
 * @param {string} params.entityId - ID of the entity
 * @param {object} params.diff - Changes made (before/after)
 * @param {string} params.ipAddress - IP address of the request
 * @param {string} params.userAgent - User agent string
 * @returns {Promise<object>} Created audit log document
 */
export async function logAudit({
  actorId,
  actorRole,
  action,
  entity,
  entityId,
  diff = null,
  ipAddress = null,
  userAgent = null,
}) {
  try {
    if (config.isDemoMode || !databases || !config.auditLogsCollectionId) {
      console.log('[AUDIT]', { actorId, action, entity, entityId });
      return null;
    }
    
    const logData = {
      actorId,
      actorRole,
      action,
      entity,
      entityId,
      diff: diff ? JSON.stringify(diff) : null,
      ipAddress,
      userAgent,
    };
    
    const document = await databases.createDocument(
      config.databaseId,
      config.auditLogsCollectionId,
      ID.unique(),
      logData
    );
    
    return document;
  } catch (error) {
    console.error('Failed to log audit:', error);
    // Don't throw - audit logging should not block operations
    return null;
  }
}

/**
 * Get audit logs with filters
 * @param {object} filters - Filter options
 * @param {string} filters.actorId - Filter by actor
 * @param {string} filters.entity - Filter by entity type
 * @param {string} filters.entityId - Filter by entity ID
 * @param {number} filters.limit - Limit results (default 100)
 * @param {number} filters.offset - Offset for pagination
 * @returns {Promise<object>} Audit logs response
 */
export async function getAuditLogs(filters = {}) {
  try {
    if (config.isDemoMode || !databases || !config.auditLogsCollectionId) {
      return { documents: [], total: 0 };
    }
    
    const queries = [];
    const { Query } = await import('appwrite');
    
    if (filters.actorId) {
      queries.push(Query.equal('actorId', filters.actorId));
    }
    
    if (filters.entity) {
      queries.push(Query.equal('entity', filters.entity));
    }
    
    if (filters.entityId) {
      queries.push(Query.equal('entityId', filters.entityId));
    }
    
    // Order by most recent first
    queries.push(Query.orderDesc('$createdAt'));
    
    // Pagination
    if (filters.limit) {
      queries.push(Query.limit(filters.limit));
    } else {
      queries.push(Query.limit(100));
    }
    
    if (filters.offset) {
      queries.push(Query.offset(filters.offset));
    }
    
    const response = await databases.listDocuments(
      config.databaseId,
      config.auditLogsCollectionId,
      queries
    );
    
    return response;
  } catch (error) {
    console.error('Failed to fetch audit logs:', error);
    throw new Error('Failed to fetch audit logs');
  }
}

/**
 * Create a diff object for audit logging
 * @param {object} before - Object state before change
 * @param {object} after - Object state after change
 * @returns {object} Diff object with changed fields
 */
export function createDiff(before, after) {
  const diff = {
    before: {},
    after: {},
  };
  
  // Get all unique keys from both objects
  const keys = new Set([
    ...Object.keys(before || {}),
    ...Object.keys(after || {}),
  ]);
  
  for (const key of keys) {
    // Skip internal Appwrite fields
    if (key.startsWith('$')) continue;
    
    const beforeValue = before?.[key];
    const afterValue = after?.[key];
    
    // Only include changed fields
    if (JSON.stringify(beforeValue) !== JSON.stringify(afterValue)) {
      diff.before[key] = beforeValue;
      diff.after[key] = afterValue;
    }
  }
  
  return Object.keys(diff.before).length > 0 ? diff : null;
}

/**
 * Log user login
 * @param {string} userId - User ID
 * @param {string} role - User role
 * @param {string} ipAddress - IP address
 * @param {string} userAgent - User agent
 */
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

/**
 * Log user logout
 * @param {string} userId - User ID
 * @param {string} role - User role
 */
export async function logLogout(userId, role) {
  return logAudit({
    actorId: userId,
    actorRole: role,
    action: 'logout',
    entity: 'session',
    entityId: userId,
  });
}

/**
 * Log user creation
 * @param {string} actorId - Actor ID (admin creating the user)
 * @param {string} actorRole - Actor role
 * @param {string} userId - Created user ID
 * @param {object} userData - User data
 */
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

/**
 * Log user update
 * @param {string} actorId - Actor ID
 * @param {string} actorRole - Actor role
 * @param {string} userId - Updated user ID
 * @param {object} before - User data before update
 * @param {object} after - User data after update
 */
export async function logUserUpdate(actorId, actorRole, userId, before, after) {
  const diff = createDiff(before, after);
  if (!diff) return null; // No changes
  
  return logAudit({
    actorId,
    actorRole,
    action: 'update',
    entity: 'users',
    entityId: userId,
    diff,
  });
}

/**
 * Log user deletion
 * @param {string} actorId - Actor ID
 * @param {string} actorRole - Actor role
 * @param {string} userId - Deleted user ID
 * @param {object} userData - User data before deletion
 */
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
