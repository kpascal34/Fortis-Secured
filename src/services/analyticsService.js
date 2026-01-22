import { databases, config } from '../lib/appwrite.js';
import { Query } from 'appwrite';

const dbId = config.databaseId;

const safelyList = async (collectionId, queries = []) => {
  if (!collectionId) return { documents: [], total: 0 };
  try {
    return await databases.listDocuments(dbId, collectionId, queries);
  } catch (error) {
    console.warn(`Analytics list failed for ${collectionId}`, error);
    return { documents: [], total: 0 };
  }
};

export async function getStaffingMetrics() {
  const staff = await safelyList(config.staffProfilesCollectionId, [Query.limit(200)]);
  const active = staff.documents.filter((s) => s.status === 'active').length;
  const inactive = staff.documents.filter((s) => s.status && s.status !== 'active').length;
  return {
    total: staff.total || staff.documents.length,
    active,
    inactive,
  };
}

export async function getComplianceMetrics() {
  const comp = await safelyList(config.staffComplianceCollectionId, [Query.limit(200)]);
  const approved = comp.documents.filter((c) => c.status === 'approved').length;
  const inProgress = comp.documents.filter((c) => c.status === 'in_progress').length;
  const rejected = comp.documents.filter((c) => c.status === 'rejected').length;
  return {
    total: comp.total || comp.documents.length,
    approved,
    inProgress,
    rejected,
    completionRate: comp.documents.length ? Math.round((approved / comp.documents.length) * 100) : 0,
  };
}

export async function getShiftCoverageMetrics() {
  const shifts = await safelyList(config.shiftsCollectionId, [Query.limit(200)]);
  const scheduled = shifts.documents.filter((s) => s.status === 'scheduled').length;
  const open = shifts.documents.filter((s) => s.status === 'open' || s.status === 'unfilled').length;
  const completed = shifts.documents.filter((s) => s.status === 'completed').length;
  const filledRate = shifts.documents.length
    ? Math.round((scheduled + completed) / shifts.documents.length * 100)
    : 0;
  return {
    total: shifts.total || shifts.documents.length,
    scheduled,
    open,
    completed,
    coverageRate: filledRate,
  };
}

export async function getCompositeAnalytics() {
  const [staffing, compliance, shifts] = await Promise.all([
    getStaffingMetrics(),
    getComplianceMetrics(),
    getShiftCoverageMetrics(),
  ]);
  return { staffing, compliance, shifts };
}
