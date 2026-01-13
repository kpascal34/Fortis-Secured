/**
 * Staff Grading Service
 * Admin grading: 1-5 overall + optional categories
 * Uses admin_grading collection with null grade field to track pending grades
 */

import { ID, Query } from 'appwrite';
import { databases, config } from '../lib/appwrite.js';
import { logAudit } from './auditService.js';

const dbId = config.databaseId;
const adminGradingCol = config.adminGradingCollectionId || 'admin_grading';
const staffProfilesCol = config.staffProfilesCollectionId || 'staff_profiles';

/**
 * Get all staff pending grading (grade field is null)
 */
export async function getStaffPendingGrading() {
  if (!adminGradingCol || !staffProfilesCol) {
    throw new Error('Grading collections not configured');
  }
  
  try {
    // Get all staff with null grade (pending)
    const gradingDocs = await databases.listDocuments(dbId, adminGradingCol, [
      Query.isNull('grade'),
      Query.limit(1000),
    ]);

    if (gradingDocs.documents.length === 0) {
      return [];
    }

    const staffIds = gradingDocs.documents.map(d => d.staffId);

    // Get staff details
    const staffDocs = await databases.listDocuments(dbId, staffProfilesCol, [
      Query.limit(1000),
    ]);

    // Merge grading data with staff profiles
    const gradingMap = new Map(gradingDocs.documents.map(g => [g.staffId, g]));

    return staffDocs.documents
      .filter(s => staffIds.includes(s.userId))
      .map(staff => ({
        ...staff,
        gradingRecordId: gradingMap.get(staff.userId)?.$id,
      }));
  } catch (error) {
    console.error('Error fetching pending grades:', error);
    throw error;
  }
}

/**
 * Get all staff with grades (history) - where grade is not null
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

    const staffIds = docs.documents.map(d => d.staffId);

    // Get staff details
    const staffDocs = await databases.listDocuments(dbId, staffProfilesCol, [
      Query.limit(1000),
    ]);

    const staffMap = new Map(staffDocs.documents.map(s => [s.userId, s]));

    return docs.documents
      .map(gradeRecord => ({
        ...gradeRecord,
        staffDetails: staffMap.get(gradeRecord.staffId) || {},
      }))
      .filter(g => g.staffDetails.userId); // Only include records with valid staff
  } catch (error) {
    console.error('Error fetching grade history:', error);
    throw error;
  }
}

/**
 * Get grading record for staff
 */
export async function getStaffGrade(staffId) {
  try {
    const docs = await databases.listDocuments(dbId, adminGradingCol, [
      Query.equal('staffId', staffId),
    ]);

    if (docs.documents.length === 0) {
      return null;
    }

    return docs.documents[0];
  } catch (error) {
    console.error('Error fetching staff grade:', error);
    return null;
  }
}

/**
 * Submit staff grade (admin only)
 * - grade: 1-5 (or null for pending)
 * - categories: optional {reliability: 4, punctuality: 5, ...}
 * - notes: optional text
 * - gradedBy: admin user ID
 */
export async function submitStaffGrade(adminId, staffId, grade, categories = null, notes = null) {
  if (!adminGradingCol) {
    throw new Error('Grading collection not configured');
  }

  if (grade !== null && (!Number.isInteger(grade) || grade < 1 || grade > 5)) {
    throw new Error('Grade must be integer 1-5 or null for pending');
  }

  try {
    const existing = await getStaffGrade(staffId);

    const gradeData = {
      staffId,
      grade: grade || null, // Allow null for pending
      categories: categories ? JSON.stringify(categories) : null,
      notes: notes || null,
      gradedBy: grade ? adminId : null, // Only set if actually grading
      gradedAt: grade ? new Date().toISOString() : null,
      updatedAt: new Date().toISOString(),
    };

    let result;

    if (existing) {
      // Update existing record
      result = await databases.updateDocument(dbId, adminGradingCol, existing.$id, gradeData);
    } else {
      // Create new record
      result = await databases.createDocument(
        dbId,
        adminGradingCol,
        ID.unique(),
        {
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
        categories,
      }),
    });

    return result;
  } catch (error) {
    console.error('Error submitting grade:', error);
    throw error;
  }
}

/**
 * Get staff by grade range
 */
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
