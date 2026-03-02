import { Query } from 'appwrite';
import { ROLES, normalizeRole } from './rbac.ts';

export const RESOURCE_TYPES = {
  CLIENTS: 'clients',
  SITES: 'sites',
  SHIFTS: 'shifts',
  SHIFT_ASSIGNMENTS: 'shift_assignments',
  TIMESHEETS: 'timesheets',
  TIMESHEET_ENTRIES: 'timesheet_entries',
  PAYROLL_EXPORTS: 'payroll_exports',
  BILLING_EXPORTS: 'billing_exports',
  RATE_CARDS: 'rate_cards',
  APPLICATIONS: 'applications',
  AUDIT_LOGS: 'audit_logs',
  STAFF_PROFILES: 'staff_profiles',
  STAFF_COMPLIANCE: 'staff_compliance',
  COMPLIANCE_UPLOADS: 'compliance_uploads',
  COMPLIANCE_RULES: 'compliance_rules',
  COMPLIANCE_FLAGS: 'compliance_flags',
  STAFF_GRADES: 'staff_grades',
  ADMIN_GRADING: 'admin_grading',
  INCIDENTS: 'incidents',
  CONTRACTS: 'contracts',
  MARGIN_ALERTS: 'margin_alerts',
  FORECAST_MODELS: 'forecast_models',
  FORECAST_SNAPSHOTS: 'forecast_snapshots',
  DEMAND_PREDICTIONS: 'demand_predictions',
  CONTRACT_HEALTH_SNAPSHOTS: 'contract_health_snapshots',
  FINANCE_EVENTS: 'finance_events',
  LEGAL_ENTITIES: 'legal_entities',
  PROFIT_SNAPSHOTS: 'profit_snapshots',
  ACQUISITION_TARGETS: 'acquisition_targets',
  ACQUISITION_MODELS: 'acquisition_models',
  TENDER_MODELS: 'tender_models',
  STRATEGIC_FORECASTS: 'strategic_forecasts',
  ENTERPRISE_RISK_SCORES: 'enterprise_risk_scores',
  SECURITY_EVENTS: 'security_events',
  CASHFLOW_SNAPSHOTS: 'cashflow_snapshots',
  CONCENTRATION_ALERTS: 'concentration_alerts',
  MARGIN_LEAKAGE_ALERTS: 'margin_leakage_alerts',
  CONTRACT_DEPENDENCY_ALERTS: 'contract_dependency_alerts',
  RESILIENCE_SNAPSHOTS: 'resilience_snapshots',
  TENDER_WIN_MODELS: 'tender_win_models',
  EMPLOYMENT_RISK_FLAGS: 'employment_risk_flags',
};

const ARRAY_JSON_FIELDS = [
  'assignedClients',
  'assignedSites',
  'assignedClientIds',
  'assignedSiteIds',
  'assignedEntities',
  'assignedEntityIds',
  'entityIds',
];

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
  // Model A authoritative precedence:
  // 1) assignedSiteIds => site-based scope only
  // 2) assignedClientIds => client-based scope only
  // 3) neither => deny
  if (assignedSiteIds.length > 0) {
    if (!siteField) return denyQueries();
    return [Query.equal(siteField, assignedSiteIds)];
  }

  if (assignedClientIds.length > 0) {
    if (!clientField) return denyQueries();
    return [Query.equal(clientField, assignedClientIds)];
  }

  if (assignedSiteIds.length === 0 && assignedClientIds.length === 0) {
    return denyQueries();
  }
  return denyQueries();
};

const buildEntityScopeQuery = (entityField, entityId, assignedEntityIds) => {
  if (!entityField) return denyQueries();

  if (Array.isArray(assignedEntityIds) && assignedEntityIds.length > 0) {
    return [Query.equal(entityField, assignedEntityIds)];
  }

  if (entityId) {
    return [Query.equal(entityField, String(entityId))];
  }

  return denyQueries();
};

const denyQueries = () => [Query.equal('$id', '__TENANCY_DENY__')];

const getResourceFields = (resourceType) => {
  switch (resourceType) {
    case RESOURCE_TYPES.CLIENTS:
      return { clientField: '$id', entityField: 'entityId' };
    case RESOURCE_TYPES.SITES:
      return { clientField: 'clientId', entityField: 'entityId' };
    case RESOURCE_TYPES.SHIFTS:
      return { clientField: 'clientId', siteField: 'siteId', ownerField: 'guardId', entityField: 'entityId' };
    case RESOURCE_TYPES.SHIFT_ASSIGNMENTS:
      return { clientField: 'clientId', siteField: 'siteId', ownerField: 'guardId', entityField: 'entityId' };
    case RESOURCE_TYPES.TIMESHEETS:
      return { ownerField: 'guardId', entityField: 'entityId' };
    case RESOURCE_TYPES.TIMESHEET_ENTRIES:
      return { clientField: 'clientId', siteField: 'siteId', ownerField: 'guardId', entityField: 'entityId' };
    case RESOURCE_TYPES.PAYROLL_EXPORTS:
      return { ownerField: 'runBy', entityField: 'entityId' };
    case RESOURCE_TYPES.BILLING_EXPORTS:
      return { ownerField: 'runBy', entityField: 'entityId' };
    case RESOURCE_TYPES.RATE_CARDS:
      return { clientField: 'clientId', siteField: 'siteId', entityField: 'entityId' };
    case RESOURCE_TYPES.APPLICATIONS:
      return { clientField: 'clientId', siteField: 'siteId', ownerField: 'guardId', entityField: 'entityId' };
    case RESOURCE_TYPES.AUDIT_LOGS:
      return { clientField: 'clientId', siteField: 'siteId', ownerField: 'actorId', entityField: 'entityId' };
    case RESOURCE_TYPES.STAFF_PROFILES:
      return { ownerField: 'userId', clientField: 'clientId', siteField: 'siteId', entityField: 'entityId' };
    case RESOURCE_TYPES.STAFF_COMPLIANCE:
      return { ownerField: 'staffId', clientField: 'clientId', siteField: 'siteId', entityField: 'entityId' };
    case RESOURCE_TYPES.COMPLIANCE_UPLOADS:
      return { ownerField: 'staffId', clientField: 'clientId', siteField: 'siteId', entityField: 'entityId' };
    case RESOURCE_TYPES.COMPLIANCE_RULES:
      return {};
    case RESOURCE_TYPES.COMPLIANCE_FLAGS:
      return { ownerField: 'guardId', clientField: 'clientId', siteField: 'siteId', entityField: 'entityId' };
    case RESOURCE_TYPES.STAFF_GRADES:
      return { ownerField: 'staffId', clientField: 'clientId', siteField: 'siteId', entityField: 'entityId' };
    case RESOURCE_TYPES.ADMIN_GRADING:
      return { ownerField: 'staffId', clientField: 'clientId', siteField: 'siteId', entityField: 'entityId' };
    case RESOURCE_TYPES.INCIDENTS:
      return { clientField: 'clientId', siteField: 'siteId', ownerField: 'reportedBy', entityField: 'entityId' };
    case RESOURCE_TYPES.CONTRACTS:
      return { clientField: 'clientId', siteField: 'siteId', entityField: 'entityId' };
    case RESOURCE_TYPES.MARGIN_ALERTS:
      return { clientField: 'clientId', siteField: 'siteId', entityField: 'entityId' };
    case RESOURCE_TYPES.FORECAST_MODELS:
      return { clientField: 'clientId', siteField: 'siteId', entityField: 'entityId' };
    case RESOURCE_TYPES.FORECAST_SNAPSHOTS:
      return { clientField: 'clientId', siteField: 'siteId', entityField: 'entityId' };
    case RESOURCE_TYPES.DEMAND_PREDICTIONS:
      return { clientField: 'clientId', siteField: 'siteId', entityField: 'entityId' };
    case RESOURCE_TYPES.CONTRACT_HEALTH_SNAPSHOTS:
      return { ownerField: 'contractId', entityField: 'entityId' };
    case RESOURCE_TYPES.FINANCE_EVENTS:
      return { clientField: 'clientId', entityField: 'entityId' };
    case RESOURCE_TYPES.LEGAL_ENTITIES:
      return { entityField: '$id' };
    case RESOURCE_TYPES.PROFIT_SNAPSHOTS:
      return { clientField: 'clientId', siteField: 'siteId', entityField: 'entityId' };
    case RESOURCE_TYPES.ACQUISITION_TARGETS:
      return { entityField: 'entityId' };
    case RESOURCE_TYPES.ACQUISITION_MODELS:
      return { entityField: 'entityId' };
    case RESOURCE_TYPES.TENDER_MODELS:
      return { entityField: 'entityId', clientField: 'clientId', siteField: 'siteId' };
    case RESOURCE_TYPES.STRATEGIC_FORECASTS:
      return { entityField: 'entityId' };
    case RESOURCE_TYPES.ENTERPRISE_RISK_SCORES:
      return { entityField: 'entityId' };
    case RESOURCE_TYPES.SECURITY_EVENTS:
      return { entityField: 'entityId', ownerField: 'actorId' };
    case RESOURCE_TYPES.CASHFLOW_SNAPSHOTS:
      return { entityField: 'entityId' };
    case RESOURCE_TYPES.CONCENTRATION_ALERTS:
      return { entityField: 'entityId' };
    case RESOURCE_TYPES.MARGIN_LEAKAGE_ALERTS:
      return { entityField: 'entityId', clientField: 'clientId', siteField: 'siteId' };
    case RESOURCE_TYPES.CONTRACT_DEPENDENCY_ALERTS:
      return { entityField: 'entityId' };
    case RESOURCE_TYPES.RESILIENCE_SNAPSHOTS:
      return { entityField: 'entityId' };
    case RESOURCE_TYPES.TENDER_WIN_MODELS:
      return { entityField: 'entityId' };
    case RESOURCE_TYPES.EMPLOYMENT_RISK_FLAGS:
      return { entityField: 'entityId', clientField: 'clientId', siteField: 'siteId', ownerField: 'guardId' };
    default:
      return { clientField: 'clientId', siteField: 'siteId', entityField: 'entityId' };
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
  const assignedEntityIds = readProfileArray(profile, 'assignedEntityIds', 'assignedEntities');

  const entityId = pick(
    profile.entityId,
    profile.entity_id,
    user?.entityId,
    user?.entity_id,
    user?.profile?.entityId,
  );

  return {
    role,
    userId,
    clientId,
    entityId,
    assignedClientIds,
    assignedSiteIds,
    assignedEntityIds,
  };
};

export const scopeQueries = (resourceType, scope) => {
  if (!scope || !scope.role) return denyQueries();

  if (scope.role === ROLES.ADMIN) {
    return [];
  }

  const { clientField, siteField, ownerField, entityField } = getResourceFields(resourceType);
  const hasEntityContext = Boolean(scope.entityId) || (scope.assignedEntityIds || []).length > 0;
  const entityScopedQuery = hasEntityContext
    ? buildEntityScopeQuery(entityField, scope.entityId, scope.assignedEntityIds || [])
    : [];

  if (scope.role === ROLES.ENTITY_ADMIN) {
    return buildEntityScopeQuery(entityField, scope.entityId, scope.assignedEntityIds || []);
  }

  if (scope.role === ROLES.CLIENT) {
    if (!scope.clientId || !clientField) return denyQueries();
    const clientQueries = [Query.equal(clientField, scope.clientId)];
    if (entityField && hasEntityContext) {
      return [...clientQueries, ...entityScopedQuery];
    }
    return clientQueries;
  }

  if (scope.role === ROLES.MANAGER) {
    const managerQueries = buildManagerScopeQuery(siteField, clientField, scope.assignedSiteIds || [], scope.assignedClientIds || []);
    if (entityField && hasEntityContext) {
      return [...managerQueries, ...entityScopedQuery];
    }
    return managerQueries;
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
      const staffQueries = [Query.or(ownShiftQueries)];
      if (entityField && hasEntityContext) {
        return [...staffQueries, ...entityScopedQuery];
      }
      return staffQueries;
    }

    const fallback = [ownShiftQueries[0]];
    if (entityField && hasEntityContext) {
      return [...fallback, ...entityScopedQuery];
    }
    return fallback;
  }

  if (ownerField) {
    const ownerQueries = [Query.equal(ownerField, scope.userId)];
    if (entityField && hasEntityContext) {
      return [...ownerQueries, ...entityScopedQuery];
    }
    return ownerQueries;
  }

  if (resourceType === RESOURCE_TYPES.SITES) {
    // Staff site visibility is mediated via assigned shifts; direct site listing is denied.
    return denyQueries();
  }

  return denyQueries();
};

const arrayHas = (arr, value) => Array.isArray(arr) && arr.includes(value);
const normalizeScopeEntityIds = (scope) => {
  if (Array.isArray(scope?.assignedEntityIds) && scope.assignedEntityIds.length > 0) {
    return scope.assignedEntityIds.map(String);
  }
  if (scope?.entityId) return [String(scope.entityId)];
  return [];
};

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

  const { clientField, siteField, ownerField, entityField } = getResourceFields(resourceType);
  const allowedEntityIds = normalizeScopeEntityIds(scope);

  if (scope.role === ROLES.ENTITY_ADMIN) {
    const docEntityValue = entityField === '$id' ? doc.$id : doc[entityField];
    if (!entityField || !allowedEntityIds.length || !allowedEntityIds.includes(String(docEntityValue || ''))) {
      throw new Error('Access denied: document is outside entity-admin scope.');
    }
    return true;
  }

  if (entityField && allowedEntityIds.length > 0) {
    const docEntityValue = entityField === '$id' ? doc.$id : doc[entityField];
    if (!allowedEntityIds.includes(String(docEntityValue || ''))) {
      throw new Error('Access denied: document is outside entity scope.');
    }
  }

  if (scope.role === ROLES.CLIENT) {
    const docClientValue = clientField === '$id' ? doc.$id : doc[clientField];
    if (!scope.clientId || String(docClientValue || '') !== String(scope.clientId)) {
      throw new Error('Access denied: document is outside client tenancy scope.');
    }
    return true;
  }

  if (scope.role === ROLES.MANAGER) {
    if (Array.isArray(scope.assignedSiteIds) && scope.assignedSiteIds.length > 0) {
      const matchesSite = siteField ? arrayHas(scope.assignedSiteIds, doc[siteField]) : false;
      if (!matchesSite) {
        throw new Error('Access denied: document is outside manager site scope.');
      }
      return true;
    }

    if (Array.isArray(scope.assignedClientIds) && scope.assignedClientIds.length > 0) {
      const matchesClient = clientField && clientField !== '$id' ? arrayHas(scope.assignedClientIds, doc[clientField]) : false;
      if (!matchesClient) {
        throw new Error('Access denied: document is outside manager client scope.');
      }
      return true;
    }

    throw new Error('Access denied: manager has no assigned site/client scope.');
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
  timesheet_entries: ['timesheetId', 'guardId', 'clientId', 'siteId', 'workDate'],
  payroll_exports: ['entityId', 'runBy', 'rangeStart', 'rangeEnd'],
  billing_exports: ['entityId', 'runBy', 'rangeStart', 'rangeEnd'],
  incidents: ['clientId', 'siteId', 'reportedBy'],
  audit_logs: ['clientId', 'siteId'],
  contracts: ['entityId', 'clientId'],
  margin_alerts: ['clientId', 'siteId', 'periodStart', 'periodEnd', 'alertType'],
  forecast_models: ['clientId'],
  forecast_snapshots: ['clientId', 'siteId', 'periodStart', 'periodEnd'],
  demand_predictions: ['clientId', 'siteId', 'date'],
  finance_events: ['entityId', 'eventType', 'referenceId'],
  profit_snapshots: ['entityId', 'periodStart', 'periodEnd'],
  legal_entities: ['name', 'entityType', 'active'],
  acquisition_targets: ['entityId', 'name'],
  acquisition_models: ['entityId', 'targetId', 'generatedAt'],
  tender_models: ['entityId', 'recommendedHourlyRate', 'generatedAt'],
  strategic_forecasts: ['entityId', 'periodStart', 'periodEnd', 'generatedAt'],
  enterprise_risk_scores: ['entityId', 'periodStart', 'periodEnd', 'generatedAt'],
  security_events: ['actorId', 'eventType', 'severity', 'createdAt'],
  cashflow_snapshots: ['entityId', 'periodStart', 'periodEnd', 'generatedAt'],
  concentration_alerts: ['entityId', 'periodStart', 'periodEnd', 'createdAt'],
  margin_leakage_alerts: ['entityId', 'clientId', 'siteId', 'leakageType', 'createdAt'],
  contract_dependency_alerts: ['entityId', 'periodStart', 'periodEnd', 'createdAt'],
  resilience_snapshots: ['entityId', 'periodStart', 'periodEnd', 'generatedAt'],
  tender_win_models: ['entityId', 'region', 'sector', 'generatedAt'],
  employment_risk_flags: ['entityId', 'guardId', 'riskType', 'createdAt'],
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

  if (normalized.entity_id && !normalized.entityId) {
    normalized.entityId = normalized.entity_id;
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
