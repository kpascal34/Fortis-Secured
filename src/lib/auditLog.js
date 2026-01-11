/**
 * Audit Logging System
 * Tracks all critical system operations for compliance and security
 */

import { databases, config, account } from './appwrite';
import { ID } from 'appwrite';

// Audit Event Categories
export const AUDIT_CATEGORY = {
  AUTHENTICATION: 'authentication',
  USER_MANAGEMENT: 'user_management',
  SCHEDULE: 'schedule',
  SHIFT: 'shift',
  GUARD: 'guard',
  CLIENT: 'client',
  SITE: 'site',
  COMPLIANCE: 'compliance',
  FINANCE: 'finance',
  PAYROLL: 'payroll',
  INCIDENT: 'incident',
  SETTINGS: 'settings',
  ACCESS_CONTROL: 'access_control',
  DATA_EXPORT: 'data_export',
  SYSTEM: 'system',
};

// Audit Event Actions
export const AUDIT_ACTION = {
  // Auth actions
  LOGIN: 'login',
  LOGOUT: 'logout',
  LOGIN_FAILED: 'login_failed',
  PASSWORD_CHANGED: 'password_changed',
  PASSWORD_RESET: 'password_reset',
  MFA_ENABLED: 'mfa_enabled',
  MFA_DISABLED: 'mfa_disabled',
  
  // CRUD actions
  CREATE: 'create',
  READ: 'read',
  UPDATE: 'update',
  DELETE: 'delete',
  BULK_CREATE: 'bulk_create',
  BULK_UPDATE: 'bulk_update',
  BULK_DELETE: 'bulk_delete',
  
  // Schedule specific
  SHIFT_PUBLISHED: 'shift_published',
  SHIFT_ASSIGNED: 'shift_assigned',
  SHIFT_CLAIMED: 'shift_claimed',
  SHIFT_CONFIRMED: 'shift_confirmed',
  SHIFT_REJECTED: 'shift_rejected',
  SHIFT_CANCELLED: 'shift_cancelled',
  SHIFT_COMPLETED: 'shift_completed',
  SHIFT_LOCKED: 'shift_locked',
  SHIFT_UNLOCKED: 'shift_unlocked',
  
  // Compliance actions
  LICENSE_VERIFIED: 'license_verified',
  LICENSE_EXPIRED: 'license_expired',
  LICENSE_RENEWED: 'license_renewed',
  TRAINING_COMPLETED: 'training_completed',
  DOCUMENT_UPLOADED: 'document_uploaded',
  DOCUMENT_APPROVED: 'document_approved',
  DOCUMENT_REJECTED: 'document_rejected',
  
  // Access control
  PERMISSION_GRANTED: 'permission_granted',
  PERMISSION_REVOKED: 'permission_revoked',
  ROLE_ASSIGNED: 'role_assigned',
  ROLE_REMOVED: 'role_removed',
  ACCESS_DENIED: 'access_denied',
  
  // Finance
  INVOICE_GENERATED: 'invoice_generated',
  PAYMENT_PROCESSED: 'payment_processed',
  PAYMENT_FAILED: 'payment_failed',
  EXPENSE_SUBMITTED: 'expense_submitted',
  EXPENSE_APPROVED: 'expense_approved',
  
  // Payroll
  PAYROLL_CALCULATED: 'payroll_calculated',
  PAYROLL_APPROVED: 'payroll_approved',
  PAYROLL_PROCESSED: 'payroll_processed',
  PAYSLIP_GENERATED: 'payslip_generated',
  
  // Data operations
  EXPORT: 'export',
  IMPORT: 'import',
  BACKUP: 'backup',
  RESTORE: 'restore',
  
  // Settings
  SETTING_CHANGED: 'setting_changed',
  INTEGRATION_ENABLED: 'integration_enabled',
  INTEGRATION_DISABLED: 'integration_disabled',
};

// Audit Severity Levels
export const AUDIT_SEVERITY = {
  INFO: 'info',
  WARNING: 'warning',
  CRITICAL: 'critical',
  SECURITY: 'security',
};

// Audit Status
export const AUDIT_STATUS = {
  SUCCESS: 'success',
  FAILURE: 'failure',
  PARTIAL: 'partial',
};

/**
 * Create an audit log entry
 * @param {Object} params - Audit log parameters
 * @returns {Promise<Object>} Created audit log entry
 */
export const createAuditLog = async ({
  category,
  action,
  severity = AUDIT_SEVERITY.INFO,
  status = AUDIT_STATUS.SUCCESS,
  resourceType = null,
  resourceId = null,
  resourceName = null,
  description = '',
  metadata = {},
  ipAddress = null,
  userAgent = null,
}) => {
  try {
    // Get current user
    let userId = 'system';
    let userName = 'System';
    let userRole = 'system';

    try {
      const user = await account.get();
      userId = user.$id;
      userName = user.name || user.email;
      userRole = user.labels?.[0] || 'user';
    } catch (error) {
      // Anonymous or system action
      console.log('No authenticated user for audit log');
    }

    // Enrich metadata
    const enrichedMetadata = {
      ...metadata,
      timestamp: new Date().toISOString(),
      environment: import.meta.env.MODE || 'production',
      appVersion: '1.0.0', // Could be imported from package.json
    };

    // Create audit log entry
    const auditEntry = {
      category,
      action,
      severity,
      status,
      userId,
      userName,
      userRole,
      resourceType,
      resourceId,
      resourceName,
      description,
      metadata: JSON.stringify(enrichedMetadata),
      ipAddress,
      userAgent,
      timestamp: new Date().toISOString(),
    };

    // Try to save to database
    try {
      const result = await databases.createDocument(
        config.databaseId,
        config.auditLogsCollectionId,
        ID.unique(),
        auditEntry
      );

      console.log('✅ Audit log created:', {
        id: result.$id,
        category,
        action,
        user: userName,
      });

      return result;
    } catch (dbError) {
      // Fallback: Log to console if database is not available
      console.warn('⚠️ Could not save audit log to database, logging to console:', dbError.message);
      console.log('📝 Audit Log:', auditEntry);
      
      // Store in local storage as backup
      storeLocalAuditLog(auditEntry);
      
      return auditEntry;
    }
  } catch (error) {
    console.error('Error creating audit log:', error);
    // Don't throw - audit logging should never break application flow
    return null;
  }
};

/**
 * Store audit log in local storage as backup
 */
const storeLocalAuditLog = (auditEntry) => {
  try {
    const logs = JSON.parse(localStorage.getItem('auditLogs') || '[]');
    logs.push(auditEntry);
    
    // Keep only last 100 logs in local storage
    if (logs.length > 100) {
      logs.shift();
    }
    
    localStorage.setItem('auditLogs', JSON.stringify(logs));
  } catch (error) {
    console.error('Error storing local audit log:', error);
  }
};

/**
 * Get audit logs with filtering
 */
export const getAuditLogs = async (filters = {}) => {
  try {
    const {
      category = null,
      action = null,
      userId = null,
      severity = null,
      startDate = null,
      endDate = null,
      limit = 100,
    } = filters;

    const queries = [];

    if (category) queries.push(`category="${category}"`);
    if (action) queries.push(`action="${action}"`);
    if (userId) queries.push(`userId="${userId}"`);
    if (severity) queries.push(`severity="${severity}"`);
    if (startDate) queries.push(`timestamp>="${startDate}"`);
    if (endDate) queries.push(`timestamp<="${endDate}"`);

    queries.push(`limit=${limit}`);
    queries.push('orderType=DESC');

    const result = await databases.listDocuments(
      config.databaseId,
      config.auditLogsCollectionId,
      queries
    );

    return result.documents;
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    
    // Fallback to local storage
    try {
      const logs = JSON.parse(localStorage.getItem('auditLogs') || '[]');
      return logs.reverse().slice(0, limit);
    } catch {
      return [];
    }
  }
};

/**
 * Get audit statistics
 */
export const getAuditStats = async (startDate, endDate) => {
  try {
    const logs = await getAuditLogs({ startDate, endDate, limit: 1000 });

    const stats = {
      total: logs.length,
      byCategory: {},
      byAction: {},
      bySeverity: {},
      byStatus: {},
      byUser: {},
      criticalEvents: 0,
      securityEvents: 0,
      failedActions: 0,
    };

    logs.forEach(log => {
      // By category
      stats.byCategory[log.category] = (stats.byCategory[log.category] || 0) + 1;
      
      // By action
      stats.byAction[log.action] = (stats.byAction[log.action] || 0) + 1;
      
      // By severity
      stats.bySeverity[log.severity] = (stats.bySeverity[log.severity] || 0) + 1;
      
      // By status
      stats.byStatus[log.status] = (stats.byStatus[log.status] || 0) + 1;
      
      // By user
      stats.byUser[log.userName] = (stats.byUser[log.userName] || 0) + 1;
      
      // Critical/Security/Failed counts
      if (log.severity === AUDIT_SEVERITY.CRITICAL) stats.criticalEvents++;
      if (log.severity === AUDIT_SEVERITY.SECURITY) stats.securityEvents++;
      if (log.status === AUDIT_STATUS.FAILURE) stats.failedActions++;
    });

    return stats;
  } catch (error) {
    console.error('Error calculating audit stats:', error);
    return null;
  }
};

/**
 * Search audit logs
 */
export const searchAuditLogs = async (searchTerm, filters = {}) => {
  try {
    const logs = await getAuditLogs(filters);
    
    const searchLower = searchTerm.toLowerCase();
    
    return logs.filter(log => {
      return (
        log.userName?.toLowerCase().includes(searchLower) ||
        log.description?.toLowerCase().includes(searchLower) ||
        log.resourceName?.toLowerCase().includes(searchLower) ||
        log.action?.toLowerCase().includes(searchLower)
      );
    });
  } catch (error) {
    console.error('Error searching audit logs:', error);
    return [];
  }
};

/**
 * Export audit logs to CSV
 */
export const exportAuditLogs = (logs) => {
  try {
    const headers = [
      'Timestamp',
      'Category',
      'Action',
      'User',
      'Role',
      'Severity',
      'Status',
      'Resource Type',
      'Resource ID',
      'Resource Name',
      'Description',
      'IP Address',
    ];

    const rows = logs.map(log => [
      new Date(log.timestamp).toISOString(),
      log.category,
      log.action,
      log.userName,
      log.userRole,
      log.severity,
      log.status,
      log.resourceType || '',
      log.resourceId || '',
      log.resourceName || '',
      log.description || '',
      log.ipAddress || '',
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    return csv;
  } catch (error) {
    console.error('Error exporting audit logs:', error);
    return null;
  }
};

/**
 * Helper functions for common audit scenarios
 */

// Auth audit helpers
export const auditLogin = (success, userId, userName, ipAddress) => {
  return createAuditLog({
    category: AUDIT_CATEGORY.AUTHENTICATION,
    action: success ? AUDIT_ACTION.LOGIN : AUDIT_ACTION.LOGIN_FAILED,
    severity: success ? AUDIT_SEVERITY.INFO : AUDIT_SEVERITY.WARNING,
    status: success ? AUDIT_STATUS.SUCCESS : AUDIT_STATUS.FAILURE,
    description: success
      ? `User ${userName} logged in successfully`
      : `Failed login attempt for user ${userName}`,
    ipAddress,
    metadata: { userId },
  });
};

export const auditLogout = (userId, userName) => {
  return createAuditLog({
    category: AUDIT_CATEGORY.AUTHENTICATION,
    action: AUDIT_ACTION.LOGOUT,
    severity: AUDIT_SEVERITY.INFO,
    status: AUDIT_STATUS.SUCCESS,
    description: `User ${userName} logged out`,
    metadata: { userId },
  });
};

// Schedule audit helpers
export const auditShiftChange = (action, shift, guardName, performedBy) => {
  return createAuditLog({
    category: AUDIT_CATEGORY.SHIFT,
    action,
    severity: AUDIT_SEVERITY.INFO,
    status: AUDIT_STATUS.SUCCESS,
    resourceType: 'shift',
    resourceId: shift.$id,
    resourceName: `${shift.siteName} - ${shift.date} ${shift.startTime}`,
    description: `Shift ${action} for ${guardName} at ${shift.siteName}`,
    metadata: {
      shiftId: shift.$id,
      guardName,
      siteName: shift.siteName,
      shiftDate: shift.date,
      performedBy,
    },
  });
};

// Compliance audit helpers
export const auditComplianceEvent = (action, resourceType, resourceId, resourceName, description, metadata = {}) => {
  return createAuditLog({
    category: AUDIT_CATEGORY.COMPLIANCE,
    action,
    severity: action.includes('expired') ? AUDIT_SEVERITY.CRITICAL : AUDIT_SEVERITY.INFO,
    status: AUDIT_STATUS.SUCCESS,
    resourceType,
    resourceId,
    resourceName,
    description,
    metadata,
  });
};

// Finance audit helpers
export const auditFinanceEvent = (action, amount, description, metadata = {}) => {
  return createAuditLog({
    category: AUDIT_CATEGORY.FINANCE,
    action,
    severity: action.includes('failed') ? AUDIT_SEVERITY.WARNING : AUDIT_SEVERITY.INFO,
    status: action.includes('failed') ? AUDIT_STATUS.FAILURE : AUDIT_STATUS.SUCCESS,
    description,
    metadata: {
      ...metadata,
      amount,
      currency: 'GBP',
    },
  });
};

// Access control audit helpers
export const auditAccessDenied = (userId, userName, resource, reason) => {
  return createAuditLog({
    category: AUDIT_CATEGORY.ACCESS_CONTROL,
    action: AUDIT_ACTION.ACCESS_DENIED,
    severity: AUDIT_SEVERITY.SECURITY,
    status: AUDIT_STATUS.FAILURE,
    description: `Access denied for ${userName} to ${resource}: ${reason}`,
    metadata: {
      userId,
      resource,
      reason,
    },
  });
};

// Data export audit helpers
export const auditDataExport = (dataType, recordCount, format, userId, userName) => {
  return createAuditLog({
    category: AUDIT_CATEGORY.DATA_EXPORT,
    action: AUDIT_ACTION.EXPORT,
    severity: AUDIT_SEVERITY.WARNING, // Data exports are security-relevant
    status: AUDIT_STATUS.SUCCESS,
    description: `${userName} exported ${recordCount} ${dataType} records as ${format}`,
    metadata: {
      userId,
      dataType,
      recordCount,
      format,
    },
  });
};

// Settings audit helpers
export const auditSettingChange = (settingName, oldValue, newValue, userId, userName) => {
  return createAuditLog({
    category: AUDIT_CATEGORY.SETTINGS,
    action: AUDIT_ACTION.SETTING_CHANGED,
    severity: AUDIT_SEVERITY.INFO,
    status: AUDIT_STATUS.SUCCESS,
    resourceType: 'setting',
    resourceName: settingName,
    description: `${userName} changed setting '${settingName}' from '${oldValue}' to '${newValue}'`,
    metadata: {
      userId,
      settingName,
      oldValue,
      newValue,
    },
  });
};

export default {
  AUDIT_CATEGORY,
  AUDIT_ACTION,
  AUDIT_SEVERITY,
  AUDIT_STATUS,
  createAuditLog,
  getAuditLogs,
  getAuditStats,
  searchAuditLogs,
  exportAuditLogs,
  auditLogin,
  auditLogout,
  auditShiftChange,
  auditComplianceEvent,
  auditFinanceEvent,
  auditAccessDenied,
  auditDataExport,
  auditSettingChange,
};
