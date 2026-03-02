import { Query } from 'appwrite';
import { ROLES, normalizeRole } from './rbac.ts';

export const RESOURCE_TYPES = {
  CLIENTS: 'clients',
  SITES: 'sites',
  SHIFTS: 'shifts',
  SHIFT_ASSIGNMENTS: 'shift_assignments',
  APPLICATIONS: 'applications',
  AUDIT_LOGS: 'audit_logs',
  STAFF_PROFILES: 'staff_profiles',
  STAFF_COMPLIANCE: 'staff_compliance',
  COMPLIANCE_UPLOADS: 'compliance_uploads',
  STAFF_GRADES: 'staff_grades',
  ADMIN_GRADING: 'admin_grading',
};

const ARRAY_JSON_FIELDS = ['assignedClients', 'assignedSites', 'assignedClientIds', 'assignedSiteIds'];

const normalizeArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.filter(Boolean);
    } catch (_) {
      return value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }
  return [];
};

const pick = (...values) => values.find((value) => value !== undefined && value !== null && value !== '');

const readProfileArray = (profile, camelField, aliasField) => {
  const value = pick(profile?.[camelField], profile?.[aliasField]);
  return normalizeArray(value);
};

const buildManagerScopeQuery = (siteField, clientField, assignedSiteIds, assignedClientIds) => {
  const parts = [];

  if (siteField && assignedSiteIds.length > 0) {
    parts.push(Query.equal(siteField, assignedSiteIds));
  }

  if (clientField && assignedClientIds.length > 0) {
    parts.push(Query.equal(clientField, assignedClientIds));
  }

  if (parts.length === 0) {
    return denyQueries();
  }

  if (parts.length === 1) {
    return parts;
  }

  if (typeof Query.or === 'function') {
    return [Query.or(parts)];
  }

  // Fallback: narrower scope if OR is unavailable in this SDK version.
  return [parts[0]];
};

const denyQueries = () => [Query.equal('$id', '__TENANCY_DENY__')];

const getResourceFields = (resourceType) => {
  switch (resourceType) {
    case RESOURCE_TYPES.CLIENTS:
      return { clientField: '$id' };
    case RESOURCE_TYPES.SITES:
      return { clientField: 'clientId' };
    case RESOURCE_TYPES.SHIFTS:
      return { clientField: 'clientId', siteField: 'siteId', ownerField: 'guardId' };
    case RESOURCE_TYPES.SHIFT_ASSIGNMENTS:
      return { clientField: 'clientId', siteField: 'siteId', ownerField: 'guardId' };
    case RESOURCE_TYPES.APPLICATIONS:
      return { clientField: 'clientId', siteField: 'siteId', ownerField: 'guardId' };
    case RESOURCE_TYPES.AUDIT_LOGS:
      return { clientField: 'clientId', siteField: 'siteId', ownerField: 'actorId' };
    case RESOURCE_TYPES.STAFF_PROFILES:
      return { ownerField: 'userId', clientField: 'clientId', siteField: 'siteId' };
    case RESOURCE_TYPES.STAFF_COMPLIANCE:
      return { ownerField: 'staffId', clientField: 'clientId', siteField: 'siteId' };
    case RESOURCE_TYPES.COMPLIANCE_UPLOADS:
      return { ownerField: 'staffId', clientField: 'clientId', siteField: 'siteId' };
    case RESOURCE_TYPES.STAFF_GRADES:
      return { ownerField: 'staffId', clientField: 'clientId', siteField: 'siteId' };
    case RESOURCE_TYPES.ADMIN_GRADING:
      return { ownerField: 'staffId', clientField: 'clientId', siteField: 'siteId' };
    default:
      return { clientField: 'clientId', siteField: 'siteId' };
  }
};

export const getScope = (user, profiles = {}) => {
  const role = normalizeRole(user?.role || profiles?.role || ROLES.STAFF) || ROLES.STAFF;
  const userId = pick(user?.$id, user?.userId, profiles?.userId);
  const profile = profiles?.profile || profiles || user?.profile || {};

  const clientId = pick(
    profile.clientId,
    profile.client_id,
    user?.clientId,
    user?.client_id,
    user?.profile?.clientId
  );

  const assignedClientIds = readProfileArray(profile, 'assignedClientIds', 'assignedClients');
  const assignedSiteIds = readProfileArray(profile, 'assignedSiteIds', 'assignedSites');

  return {
    role,
    userId,
    clientId,
    assignedClientIds,
    assignedSiteIds,
  };
};

export const scopeQueries = (resourceType, scope) => {
  if (!scope || !scope.role) return denyQueries();

  if (scope.role === ROLES.ADMIN) {
    return [];
  }

  const { clientField, siteField, ownerField } = getResourceFields(resourceType);

  if (scope.role === ROLES.CLIENT) {
    if (!scope.clientId || !clientField) return denyQueries();
    return [Query.equal(clientField, scope.clientId)];
  }

  if (scope.role === ROLES.MANAGER) {
    return buildManagerScopeQuery(siteField, clientField, scope.assignedSiteIds || [], scope.assignedClientIds || []);
  }

  // STAFF
  if (!scope.userId) {
    return denyQueries();
  }

  if (resourceType === RESOURCE_TYPES.SHIFTS) {
    const ownShiftQueries = [
      Query.equal('guardId', scope.userId),
      Query.equal('assignedGuardId', scope.userId),
      Query.equal('staffId', scope.userId),
      Query.equal('published', 'true'),
    ];

    if (typeof Query.or === 'function') {
      return [Query.or(ownShiftQueries)];
    }

    return [ownShiftQueries[0]];
  }

  if (ownerField) {
    return [Query.equal(ownerField, scope.userId)];
  }

  if (resourceType === RESOURCE_TYPES.SITES) {
    // Staff site visibility is mediated via assigned shifts; direct site listing is denied.
    return denyQueries();
  }

  return denyQueries();
};

const arrayHas = (arr, value) => Array.isArray(arr) && arr.includes(value);

export const assertScopedAccess = (resourceType, doc, scope) => {
  if (!scope || !scope.role) {
    throw new Error('Scope is not resolved for access check.');
  }

  if (scope.role === ROLES.ADMIN) {
    return true;
  }

  if (!doc || typeof doc !== 'object') {
    throw new Error('Scoped access check requires a document object.');
  }

  const { clientField, siteField, ownerField } = getResourceFields(resourceType);

  if (scope.role === ROLES.CLIENT) {
    const docClientValue = clientField === '$id' ? doc.$id : doc[clientField];
    if (!scope.clientId || String(docClientValue || '') !== String(scope.clientId)) {
      throw new Error('Access denied: document is outside client tenancy scope.');
    }
    return true;
  }

  if (scope.role === ROLES.MANAGER) {
    const matchesSite = siteField ? arrayHas(scope.assignedSiteIds, doc[siteField]) : false;
    const matchesClient = clientField && clientField !== '$id' ? arrayHas(scope.assignedClientIds, doc[clientField]) : false;

    if (!matchesSite && !matchesClient) {
      throw new Error('Access denied: document is outside manager tenancy scope.');
    }

    return true;
  }

  // STAFF
  const ownerValue = ownerField ? doc[ownerField] : null;

  if (resourceType === RESOURCE_TYPES.SHIFTS) {
    const allowed =
      String(doc.guardId || '') === String(scope.userId || '') ||
      String(doc.assignedGuardId || '') === String(scope.userId || '') ||
      String(doc.staffId || '') === String(scope.userId || '') ||
      String(doc.published || '') === 'true';

    if (!allowed) {
      throw new Error('Access denied: shift is outside staff scope.');
    }

    return true;
  }

  if (!scope.userId || !ownerValue || String(ownerValue) !== String(scope.userId)) {
    throw new Error('Access denied: document is outside staff ownership scope.');
  }

  return true;
};

export const TENANCY_FIELD_REQUIREMENTS = {
  sites: ['clientId'],
  shifts: ['clientId', 'siteId', 'date'],
  shift_assignments: ['shiftId', 'clientId', 'siteId', 'guardId'],
  applications: ['guardId', 'shiftId', 'clientId', 'siteId'],
  audit_logs: ['clientId', 'siteId'],
};

export const enforceTenancyFields = (resourceType, payload) => {
  const required = TENANCY_FIELD_REQUIREMENTS[resourceType] || [];
  const missing = required.filter((field) => payload?.[field] === undefined || payload?.[field] === null || payload?.[field] === '');
  if (missing.length > 0) {
    throw new Error(`Missing required tenancy fields for ${resourceType}: ${missing.join(', ')}`);
  }
};

// Normalizes legacy keys (snake_case, shiftDate) to Model A fields.
export const normalizeTenancyDocument = (resourceType, doc) => {
  if (!doc || typeof doc !== 'object') return doc;

  const normalized = { ...doc };

  if (normalized.shiftDate && !normalized.date) {
    normalized.date = normalized.shiftDate;
  }

  if (normalized.client_id && !normalized.clientId) {
    normalized.clientId = normalized.client_id;
  }

  if (normalized.site_id && !normalized.siteId) {
    normalized.siteId = normalized.site_id;
  }

  if (resourceType === RESOURCE_TYPES.SHIFT_ASSIGNMENTS && normalized.staffId && !normalized.guardId) {
    normalized.guardId = normalized.staffId;
  }

  if (resourceType === RESOURCE_TYPES.COMPLIANCE_UPLOADS && normalized.staff_id && !normalized.staffId) {
    normalized.staffId = normalized.staff_id;
  }

  return normalized;
};

export const mergeScopedQueries = (resourceType, scope, baseQueries = []) => {
  return [...baseQueries, ...scopeQueries(resourceType, scope)];
};

export const managerScopeKeys = ARRAY_JSON_FIELDS;
