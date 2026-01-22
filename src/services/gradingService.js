/**
 * Staff Grading Service
 * Admin grading: 1-5 overall + optional categories
 * Uses admin_grading collection with null grade field to track pending grades
 */

import { ID, Query } from 'appwrite';
import { databases, config } from '../lib/appwrite.js';
import { logAudit } from './auditService.js';
import { notifyGradingFeedback } from './notificationService.js';

const dbId = config.databaseId;
const adminGradingCol = config.adminGradingCollectionId || 'admin_grading';
const staffProfilesCol = config.staffProfilesCollectionId || 'staff_profiles';

/**
 * Get all staff pending grading:
 * - New hires (no grading record)
 * - Existing staff whose last grading was > 90 days ago
 */
export async function getStaffPendingGrading() {
  if (!adminGradingCol || !staffProfilesCol) {
    throw new Error('Grading collections not configured');
  }
  
  try {
    // Get all staff
    const allStaff = await databases.listDocuments(dbId, staffProfilesCol, [
      Query.limit(1000),
    ]);

    if (allStaff.documents.length === 0) {
      return [];
    }

    // Get all grading records
    const allGradings = await databases.listDocuments(dbId, adminGradingCol, [
      Query.limit(1000),
    ]);

    const gradingMap = new Map(allGradings.documents.map(g => [g.staffId, g]));
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const pendingStaff = allStaff.documents.filter(staff => {
      const staffUserId = staff.userId || staff.$id;
      const grading = gradingMap.get(staffUserId);
      
      // New hires - no grading record
      if (!grading) {
        return true;
      }
      
      // Existing staff - check if last grading > 90 days
      if (grading.gradedAt) {
        const lastGradedDate = new Date(grading.gradedAt);
        return lastGradedDate < ninetyDaysAgo;
      }
      
      // Pending status - grading record exists but no grade assigned
      return grading.status === 'pending' || grading.grade === null;
    });

    // Enrich with grading data
    return pendingStaff.map(staff => {
      const staffUserId = staff.userId || staff.$id;
      const grading = gradingMap.get(staffUserId);
      const lastGradedDate = grading?.gradedAt ? new Date(grading.gradedAt) : null;
      const daysWithoutGrading = lastGradedDate
        ? Math.floor((Date.now() - lastGradedDate) / (1000 * 60 * 60 * 24))
        : Math.floor((Date.now() - new Date(staff.createdAt || Date.now())) / (1000 * 60 * 60 * 24));

      return {
        ...staff,
        gradingRecordId: grading?.$id,
        lastGradedAt: grading?.gradedAt || null,
        daysWithoutGrading,
        isNewHire: !grading,
        isOverdue: daysWithoutGrading > 90,
      };
    }).sort((a, b) => b.daysWithoutGrading - a.daysWithoutGrading);
  } catch (error) {
    console.error('Error fetching pending grades:', error);
    throw error;
  }
}

/**
 * Get all staff with grades (history) - sorted by graded date
 */
export async function getAllStaffGrades() {
  if (!adminGradingCol || !staffProfilesCol) {
    throw new Error('Grading collections not configured');
  }

  try {
    const docs = await databases.listDocuments(dbId, adminGradingCol, [
      Query.isNotNull('grade'),
      Query.orderDesc('gradedAt'),
      Query.limit(1000),
    ]);

    if (docs.documents.length === 0) {
      return [];
    }

    // Enrich with parsed criteria
    return docs.documents.map(gradeRecord => ({
      ...gradeRecord,
      criteriaObject: gradeRecord.criteria ? JSON.parse(gradeRecord.criteria) : null,
      averageCriteriaGrade: getAverageCriteriaGrade(gradeRecord.criteria),
    }));
  } catch (error) {
    console.error('Error fetching grade history:', error);
    throw error;
  }
}

/**
 * Get grading record for staff with enriched data
 */
export async function getStaffGrade(staffId) {
  try {
    const docs = await databases.listDocuments(dbId, adminGradingCol, [
      Query.equal('staffId', staffId),
    ]);

    if (docs.documents.length === 0) {
      return null;
    }

    const record = docs.documents[0];
    return {
      ...record,
      criteriaObject: record.criteria ? JSON.parse(record.criteria) : null,
      averageCriteriaGrade: getAverageCriteriaGrade(record.criteria),
    };
  } catch (error) {
    console.error('Error fetching staff grade:', error);
    return null;
  }
}

/**
 * Submit staff grade with criteria
 * - grade: 1-5 overall rating
 * - criteria: {punctuality: 4, reliability: 5, teamwork: 4, communication: 3, quality: 5}
 * - comment: feedback text
 * - gradedBy: admin user ID
 * - gradedByName: admin display name
 */
export async function submitStaffGrade(adminId, staffId, grade, criteria = null, comment = null, gradedByName = 'Admin') {
  if (!adminGradingCol) {
    throw new Error('Grading collection not configured');
  }

  if (!Number.isInteger(grade) || grade < 1 || grade > 5) {
    throw new Error('Grade must be integer 1-5');
  }

  // Validate criteria if provided
  if (criteria) {
    Object.entries(criteria).forEach(([key, value]) => {
      if (!Number.isInteger(value) || value < 1 || value > 5) {
        throw new Error(`Criteria '${key}' must be integer 1-5`);
      }
    });
  }

  try {
    const existing = await getStaffGrade(staffId);

    const gradeData = {
      grade,
      criteria: criteria ? JSON.stringify(criteria) : null,
      comment: comment || null,
      gradedBy: adminId,
      gradedByName: gradedByName || 'Admin',
      gradedAt: new Date().toISOString(),
      status: 'graded',
      updatedAt: new Date().toISOString(),
    };

    let result;

    if (existing) {
      // Update existing record
      result = await databases.updateDocument(dbId, adminGradingCol, existing.$id, gradeData);
    } else {
      // Create new record
      const staff = await databases.getDocument(dbId, staffProfilesCol, staffId).catch(() => ({}));
      result = await databases.createDocument(
        dbId,
        adminGradingCol,
        ID.unique(),
        {
          staffId,
          staffName: staff.firstName ? `${staff.firstName} ${staff.lastName}` : 'Unknown',
          staffEmail: staff.email || null,
          ...gradeData,
          createdAt: new Date().toISOString(),
        }
      );
    }

    await logAudit({
      actorId: adminId,
      actorRole: 'admin',
      action: existing ? 'UPDATE' : 'CREATE',
      entity: 'admin_grading',
      entityId: result.$id,
      diff: JSON.stringify({
        staffId,
        grade,
        criteria: Object.keys(criteria || {}),
      }),
    });

    try {
      await notifyGradingFeedback(staffId, grade, comment);
    } catch (notifyErr) {
      console.error('Failed to send grading feedback notification:', notifyErr);
    }

    return result;
  } catch (error) {
    console.error('Error submitting grade:', error);
    throw error;
  }
}

/**
 * Get average grade across all criteria
 */
export function getAverageCriteriaGrade(criteriaJson) {
  try {
    const criteria = typeof criteriaJson === 'string' ? JSON.parse(criteriaJson) : criteriaJson;
    if (!criteria || Object.keys(criteria).length === 0) return null;
    
    const sum = Object.values(criteria).reduce((a, b) => a + b, 0);
    return Math.round((sum / Object.values(criteria).length) * 10) / 10;
  } catch (err) {
    return null;
  }
}

/**
 * Get standard grading criteria template
 */
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

/**
 * Get grading scale reference
 */
export function getGradingScale() {
  return [
    { grade: 5, label: 'Excellent', color: 'green', description: 'Consistently exceeds expectations' },
    { grade: 4, label: 'Good', color: 'blue', description: 'Regularly meets and exceeds expectations' },
    { grade: 3, label: 'Satisfactory', color: 'yellow', description: 'Meets job requirements' },
    { grade: 2, label: 'Needs Improvement', color: 'orange', description: 'Falls below expectations in some areas' },
    { grade: 1, label: 'Poor', color: 'red', description: 'Fails to meet basic job requirements' },
  ];
}

/**
 * Get color for grade
 */
export function getGradeColor(grade) {
  const scale = getGradingScale();
  return scale.find(s => s.grade === grade)?.color || 'gray';
}

/**
 * Get label for grade
 */
export function getGradeLabel(grade) {
  const scale = getGradingScale();
  return scale.find(s => s.grade === grade)?.label || 'Unknown';
}
export async function getStaffByGrade(minGrade, maxGrade) {
  if (minGrade < 1 || maxGrade > 5 || minGrade > maxGrade) {
    throw new Error('Invalid grade range');
  }

  try {
    const docs = await databases.listDocuments(dbId, adminGradingCol, [
      Query.greaterThanOrEqual('grade', minGrade),
      Query.lessThanOrEqual('grade', maxGrade),
      Query.orderDesc('grade'),
    ]);

    return docs.documents;
  } catch (error) {
    console.error('Error fetching staff by grade:', error);
    return [];
  }
}
