/**
 * Staff Grading Service
 * Tenancy and RBAC enforced across grading reads/writes.
 */

import { ID, Query } from 'appwrite';
import { databases, config } from '../lib/appwrite.js';
import { PERMISSIONS } from '../lib/rbac.ts';
import { buildPermissionsForDoc } from '../lib/appwritePermissions.js';
import { ensureDatabaseConfig, getAuthorizedScope, withScopedQueries, assertScopedDocument } from '../lib/serviceSecurity.js';
import { RESOURCE_TYPES, normalizeTenancyDocument } from '../lib/tenancyScope.js';
import { logEvent } from './auditLogService.js';

const dbId = config.databaseId;
const adminGradingCol = config.adminGradingCollectionId || 'admin_grading';
const staffGradesCol = config.staffGradesCollectionId || 'staff_grades';
const staffProfilesCol = config.staffProfilesCollectionId || 'staff_profiles';
const MAX_LIMIT = 1000;

const ensureCollections = () => {
  ensureDatabaseConfig(adminGradingCol, 'admin grading collection');
  ensureDatabaseConfig(staffGradesCol, 'staff grades collection');
  ensureDatabaseConfig(staffProfilesCol, 'staff profiles collection');
};

const parseJson = (value) => {
  if (!value) return null;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch (_) {
    return null;
  }
};

const profileToTenancy = (profile = {}) => ({
  clientId: profile.clientId || profile.client_id || null,
  siteId: profile.siteId || profile.site_id || null,
});

const getStaffProfileByUserId = async (staffUserId) => {
  const docs = await databases.listDocuments(dbId, staffProfilesCol, [
    Query.equal('userId', staffUserId),
    Query.limit(1),
  ]);
  return docs.documents[0] || null;
};

const getStaffProfileByDocIdOrUserId = async (staffId) => {
  try {
    return await databases.getDocument(dbId, staffProfilesCol, staffId);
  } catch (_) {
    return getStaffProfileByUserId(staffId);
  }
};

const enrichGradeRecord = (record) => ({
  ...record,
  criteriaObject: parseJson(record.criteria),
  averageCriteriaGrade: getAverageCriteriaGrade(record.criteria),
});

/**
 * Get all staff pending grading.
 */
export async function getStaffPendingGrading(actor = null) {
  ensureCollections();

  const { scope } = await getAuthorizedScope({ actor, permission: PERMISSIONS.MANAGE_COMPLIANCE });

  const staffQueries = withScopedQueries(RESOURCE_TYPES.STAFF_PROFILES, scope, [Query.limit(MAX_LIMIT)]);
  const gradesQueries = withScopedQueries(RESOURCE_TYPES.ADMIN_GRADING, scope, [Query.limit(MAX_LIMIT)]);

  const [allStaff, allGradings] = await Promise.all([
    databases.listDocuments(dbId, staffProfilesCol, staffQueries),
    databases.listDocuments(dbId, adminGradingCol, gradesQueries),
  ]);

  if (allStaff.documents.length === 0) {
    return [];
  }

  const gradingMap = new Map(allGradings.documents.map((grade) => [grade.staffId, grade]));
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  return allStaff.documents
    .filter((staff) => {
      const staffUserId = staff.userId || staff.$id;
      const grading = gradingMap.get(staffUserId);

      if (!grading) return true;
      if (grading.gradedAt) {
        return new Date(grading.gradedAt) < ninetyDaysAgo;
      }

      return grading.status === 'pending' || grading.grade === null;
    })
    .map((staff) => {
      const staffUserId = staff.userId || staff.$id;
      const grading = gradingMap.get(staffUserId);
      const lastGradedDate = grading?.gradedAt ? new Date(grading.gradedAt) : null;
      const daysWithoutGrading = lastGradedDate
        ? Math.floor((Date.now() - lastGradedDate.getTime()) / (1000 * 60 * 60 * 24))
        : Math.floor((Date.now() - new Date(staff.createdAt || Date.now()).getTime()) / (1000 * 60 * 60 * 24));

      return {
        ...staff,
        gradingRecordId: grading?.$id,
        lastGradedAt: grading?.gradedAt || null,
        daysWithoutGrading,
        isNewHire: !grading,
        isOverdue: daysWithoutGrading > 90,
      };
    })
    .sort((a, b) => b.daysWithoutGrading - a.daysWithoutGrading);
}

/**
 * Get all graded records.
 */
export async function getAllStaffGrades(actor = null) {
  ensureCollections();

  const { scope } = await getAuthorizedScope({ actor, permission: PERMISSIONS.MANAGE_COMPLIANCE });

  const queries = withScopedQueries(RESOURCE_TYPES.ADMIN_GRADING, scope, [
    Query.isNotNull('grade'),
    Query.orderDesc('gradedAt'),
    Query.limit(MAX_LIMIT),
  ]);

  const docs = await databases.listDocuments(dbId, adminGradingCol, queries);
  return docs.documents.map((record) => enrichGradeRecord(normalizeTenancyDocument(RESOURCE_TYPES.ADMIN_GRADING, record)));
}

/**
 * Get grading record for one staff member.
 */
export async function getStaffGrade(staffId, actor = null) {
  ensureCollections();

  const { scope } = await getAuthorizedScope({ actor, permission: PERMISSIONS.VIEW_COMPLIANCE });

  const queries = withScopedQueries(RESOURCE_TYPES.ADMIN_GRADING, scope, [
    Query.equal('staffId', staffId),
    Query.limit(1),
  ]);

  const docs = await databases.listDocuments(dbId, adminGradingCol, queries);

  if (docs.documents.length === 0) {
    return null;
  }

  const record = normalizeTenancyDocument(RESOURCE_TYPES.ADMIN_GRADING, docs.documents[0]);
  assertScopedDocument(RESOURCE_TYPES.ADMIN_GRADING, record, scope);
  return enrichGradeRecord(record);
}

/**
 * Submit staff grade.
 */
export async function submitStaffGrade(adminId, staffId, grade, criteria = null, comment = null, gradedByName = 'Admin', actor = null) {
  ensureCollections();

  const { actor: resolvedActor, scope } = await getAuthorizedScope({ actor, permission: PERMISSIONS.MANAGE_COMPLIANCE });

  if (adminId && String(adminId) !== String(resolvedActor.$id) && scope.role !== 'admin') {
    throw new Error('Cannot submit grading on behalf of another user.');
  }

  if (!Number.isInteger(grade) || grade < 1 || grade > 5) {
    throw new Error('Grade must be an integer between 1 and 5.');
  }

  if (criteria) {
    for (const [key, value] of Object.entries(criteria)) {
      if (!Number.isInteger(value) || value < 1 || value > 5) {
        throw new Error(`Criteria '${key}' must be integer 1-5`);
      }
    }
  }

  const staffProfile = await getStaffProfileByDocIdOrUserId(staffId);
  if (!staffProfile) {
    throw new Error('Staff profile not found for grading.');
  }

  const tenancy = profileToTenancy(staffProfile);
  const baseData = {
    staffId: staffProfile.userId || staffId,
    staffName: staffProfile.fullName || `${staffProfile.firstName || ''} ${staffProfile.lastName || ''}`.trim() || 'Unknown',
    staffEmail: staffProfile.email || null,
    clientId: tenancy.clientId,
    siteId: tenancy.siteId,
    grade,
    criteria: criteria ? JSON.stringify(criteria) : null,
    comment: comment || null,
    gradedBy: resolvedActor.$id,
    gradedByName: gradedByName || resolvedActor.name || resolvedActor.email || 'Admin',
    gradedAt: new Date().toISOString(),
    status: 'graded',
    updatedAt: new Date().toISOString(),
  };

  const existing = await getStaffGrade(baseData.staffId, resolvedActor);
  let adminRecord;

  if (existing) {
    assertScopedDocument(RESOURCE_TYPES.ADMIN_GRADING, existing, scope);
    adminRecord = await databases.updateDocument(dbId, adminGradingCol, existing.$id, baseData);
  } else {
    const adminPermissions = buildPermissionsForDoc({
      type: 'admin_grading',
      ownerUserId: baseData.staffId,
      clientUserId: null,
      sharedWithClient: false,
    });

    adminRecord = await databases.createDocument(
      dbId,
      adminGradingCol,
      ID.unique(),
      {
        ...baseData,
        daysWithoutGrading: 0,
        createdAt: new Date().toISOString(),
      },
      adminPermissions
    );
  }

  const existingStaffGrades = await databases.listDocuments(dbId, staffGradesCol, [
    Query.equal('staffId', baseData.staffId),
    Query.limit(1),
  ]);

  const staffGradesData = {
    staffId: baseData.staffId,
    overallGrade: grade,
    categories: criteria || null,
    notes: comment || null,
    gradedBy: baseData.gradedBy,
    gradedAt: baseData.gradedAt,
    status: 'graded',
    clientId: tenancy.clientId,
    siteId: tenancy.siteId,
    updatedAt: new Date().toISOString(),
  };

  if (existingStaffGrades.documents.length > 0) {
    await databases.updateDocument(dbId, staffGradesCol, existingStaffGrades.documents[0].$id, staffGradesData);
  } else {
    const staffGradePermissions = buildPermissionsForDoc({
      type: 'staff_grades',
      ownerUserId: baseData.staffId,
      clientUserId: null,
      sharedWithClient: false,
    });

    await databases.createDocument(
      dbId,
      staffGradesCol,
      ID.unique(),
      {
        ...staffGradesData,
        createdAt: new Date().toISOString(),
      },
      staffGradePermissions
    );
  }

  await logEvent({
    actorId: resolvedActor.$id,
    action: existing ? 'staff.grading.updated' : 'staff.grading.created',
    resourceType: RESOURCE_TYPES.ADMIN_GRADING,
    resourceId: adminRecord.$id,
    clientId: tenancy.clientId || null,
    siteId: tenancy.siteId || null,
    metadata: {
      staffId: baseData.staffId,
      grade,
      criteriaKeys: Object.keys(criteria || {}),
    },
  });

  return enrichGradeRecord(normalizeTenancyDocument(RESOURCE_TYPES.ADMIN_GRADING, adminRecord));
}

export function getAverageCriteriaGrade(criteriaJson) {
  try {
    const criteria = typeof criteriaJson === 'string' ? JSON.parse(criteriaJson) : criteriaJson;
    if (!criteria || Object.keys(criteria).length === 0) return null;

    const values = Object.values(criteria).map((value) => Number(value));
    if (values.some((value) => Number.isNaN(value))) return null;

    const sum = values.reduce((a, b) => a + b, 0);
    return Math.round((sum / values.length) * 10) / 10;
  } catch (_) {
    return null;
  }
}

export function getGradingCriteriaTemplate() {
  return {
    punctuality: { label: 'Punctuality', description: 'Arrives on time and meets deadlines' },
    reliability: { label: 'Reliability', description: 'Consistently delivers quality work' },
    teamwork: { label: 'Teamwork', description: 'Collaborates effectively with colleagues' },
    communication: { label: 'Communication', description: 'Communicates clearly and professionally' },
    quality: { label: 'Quality of Work', description: 'Produces high-quality, accurate work' },
    initiative: { label: 'Initiative', description: 'Takes proactive approach to tasks' },
    professionalism: { label: 'Professionalism', description: 'Maintains professional conduct' },
  };
}

export function getGradingScale() {
  return [
    { grade: 5, label: 'Excellent', color: 'green', description: 'Consistently exceeds expectations' },
    { grade: 4, label: 'Good', color: 'blue', description: 'Regularly meets and exceeds expectations' },
    { grade: 3, label: 'Satisfactory', color: 'yellow', description: 'Meets job requirements' },
    { grade: 2, label: 'Needs Improvement', color: 'orange', description: 'Falls below expectations in some areas' },
    { grade: 1, label: 'Poor', color: 'red', description: 'Fails to meet basic job requirements' },
  ];
}

export function getGradeColor(grade) {
  const scale = getGradingScale();
  return scale.find((item) => item.grade === grade)?.color || 'gray';
}

export function getGradeLabel(grade) {
  const scale = getGradingScale();
  return scale.find((item) => item.grade === grade)?.label || 'Unknown';
}

export async function getStaffByGrade(minGrade, maxGrade, actor = null) {
  ensureCollections();

  if (minGrade < 1 || maxGrade > 5 || minGrade > maxGrade) {
    throw new Error('Invalid grade range.');
  }

  const { scope } = await getAuthorizedScope({ actor, permission: PERMISSIONS.VIEW_COMPLIANCE });

  const queries = withScopedQueries(RESOURCE_TYPES.ADMIN_GRADING, scope, [
    Query.greaterThanEqual('grade', minGrade),
    Query.lessThanEqual('grade', maxGrade),
    Query.orderDesc('grade'),
    Query.limit(MAX_LIMIT),
  ]);

  const docs = await databases.listDocuments(dbId, adminGradingCol, queries);
  return docs.documents.map((record) => enrichGradeRecord(normalizeTenancyDocument(RESOURCE_TYPES.ADMIN_GRADING, record)));
}
