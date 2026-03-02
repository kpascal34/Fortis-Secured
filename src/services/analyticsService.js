import { databases, config } from '../lib/appwrite.js';
import { Query } from 'appwrite';
import { PERMISSIONS } from '../lib/rbac.ts';
import { ensureDatabaseConfig, getAuthorizedScope, withScopedQueries } from '../lib/serviceSecurity.js';
import { RESOURCE_TYPES } from '../lib/tenancyScope.js';

const dbId = config.databaseId;

const listDocumentsStrict = async (collectionId, name, queries = []) => {
  ensureDatabaseConfig(collectionId, name);
  return databases.listDocuments(dbId, collectionId, queries);
};

export async function getStaffingMetrics(actor = null) {
  const { scope } = await getAuthorizedScope({ actor, permission: PERMISSIONS.VIEW_ANALYTICS });

  const staffQueries = withScopedQueries(RESOURCE_TYPES.STAFF_PROFILES, scope, [Query.limit(200)]);
  const staff = await listDocumentsStrict(config.staffProfilesCollectionId, 'staff profiles', staffQueries);

  const active = staff.documents.filter((item) => item.status === 'active').length;
  const inactive = staff.documents.filter((item) => item.status && item.status !== 'active').length;
  return { total: staff.total || staff.documents.length, active, inactive };
}

export async function getComplianceMetrics(actor = null) {
  const { scope } = await getAuthorizedScope({ actor, permission: PERMISSIONS.VIEW_ANALYTICS });

  const compQueries = withScopedQueries(RESOURCE_TYPES.STAFF_COMPLIANCE, scope, [Query.limit(200)]);
  const comp = await listDocumentsStrict(config.staffComplianceCollectionId, 'staff compliance', compQueries);

  const approved = comp.documents.filter((item) => item.status === 'approved').length;
  const inProgress = comp.documents.filter((item) => item.status === 'in_progress').length;
  const rejected = comp.documents.filter((item) => item.status === 'rejected').length;

  return {
    total: comp.total || comp.documents.length,
    approved,
    inProgress,
    rejected,
    completionRate: comp.documents.length ? Math.round((approved / comp.documents.length) * 100) : 0,
  };
}

export async function getShiftCoverageMetrics(actor = null) {
  const { scope } = await getAuthorizedScope({ actor, permission: PERMISSIONS.VIEW_ANALYTICS });

  const shiftQueries = withScopedQueries(RESOURCE_TYPES.SHIFTS, scope, [Query.limit(200)]);
  const shifts = await listDocumentsStrict(config.shiftsCollectionId, 'shifts', shiftQueries);

  const scheduled = shifts.documents.filter((item) => item.status === 'scheduled').length;
  const open = shifts.documents.filter((item) => item.status === 'open' || item.status === 'unfilled').length;
  const completed = shifts.documents.filter((item) => item.status === 'completed').length;
  const filledRate = shifts.documents.length
    ? Math.round(((scheduled + completed) / shifts.documents.length) * 100)
    : 0;

  return {
    total: shifts.total || shifts.documents.length,
    scheduled,
    open,
    completed,
    coverageRate: filledRate,
  };
}

export async function getCompositeAnalytics(actor = null) {
  const [staffing, compliance, shifts] = await Promise.all([
    getStaffingMetrics(actor),
    getComplianceMetrics(actor),
    getShiftCoverageMetrics(actor),
  ]);

  return { staffing, compliance, shifts };
}
