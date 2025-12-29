/**
 * Staff Grading Service
 * Admin grading: 1-5 overall + optional categories
 */

import { databases } from '../lib/appwrite.js';
import { logAudit } from './auditService.js';

const dbId = process.env.VITE_APPWRITE_DATABASE_ID;
const gradesCol = 'staff_grades';

/**
 * Get all staff pending grading
 */
export async function getStaffPendingGrading() {
  // Get all approved compliance staff
  const compDocs = await databases.listDocuments(dbId, 'staff_compliance', [
    Query.equal('status', 'approved'),
  ]);

  const staffIds = compDocs.documents.map(d => d.staff_id);

  // Get existing grades
  const gradeDocs = await databases.listDocuments(dbId, gradesCol, [
    Query.limit(1000),
  ]);

  const gradedIds = new Set(gradeDocs.documents.map(d => d.staff_id));

  // Filter pending
  const pendingIds = staffIds.filter(id => !gradedIds.has(id));

  if (pendingIds.length === 0) return [];

  // Get staff details
  const staffDocs = await databases.listDocuments(dbId, 'staff_profiles', [
    Query.limit(1000),
  ]);

  return staffDocs.documents.filter(s => pendingIds.includes(s.userId));
}

/**
 * Get grading for staff
 */
export async function getStaffGrade(staffId) {
  const docs = await databases.listDocuments(dbId, gradesCol, [
    Query.equal('staff_id', staffId),
  ]);

  if (docs.documents.length === 0) {
    return null;
  }

  const grade = docs.documents[0];

  // Parse categories if JSON
  if (grade.categories) {
    try {
      grade.categories = JSON.parse(grade.categories);
    } catch (e) {
      grade.categories = {};
    }
  }

  return grade;
}

/**
 * Submit staff grade (admin only)
 * - overallGrade: 1-5
 * - categories: optional {reliability: 4, punctuality: 5, ...}
 * - notes: optional text
 */
export async function submitStaffGrade(adminId, staffId, overallGrade, categories = null, notes = null) {
  validateGrade(overallGrade);

  const existing = await getStaffGrade(staffId);

  const gradeData = {
    staff_id: staffId,
    overall_grade: overallGrade,
    categories: categories ? JSON.stringify(categories) : null,
    graded_by: adminId,
    graded_at: new Date().toISOString(),
    notes: notes || null,
  };

  let result;

  if (existing) {
    // Update
    result = await databases.updateDocument(dbId, gradesCol, existing.$id, gradeData);
  } else {
    // Create
    result = await databases.createDocument(dbId, gradesCol, ID.unique(), gradeData);
  }

  await logAudit({
    actorId: adminId,
    actorRole: 'admin',
    action: existing ? 'UPDATE' : 'CREATE',
    entity: 'staff_grades',
    entityId: result.$id,
    diff: JSON.stringify({
      staffId,
      overallGrade,
      categories,
    }),
  });

  return result;
}

function validateGrade(grade) {
  if (!Number.isInteger(grade) || grade < 1 || grade > 5) {
    throw new Error('Grade must be integer 1-5');
  }
}

/**
 * Get all staff with grades (for admin dashboard)
 */
export async function getAllStaffGrades() {
  const docs = await databases.listDocuments(dbId, gradesCol, [
    Query.orderDesc('graded_at'),
  ]);

  return docs.documents.map(d => {
    if (d.categories) {
      try {
        d.categories = JSON.parse(d.categories);
      } catch (e) {
        d.categories = {};
      }
    }
    return d;
  });
}

/**
 * Get staff by grade range
 */
export async function getStaffByGrade(minGrade, maxGrade) {
  if (minGrade < 1 || maxGrade > 5 || minGrade > maxGrade) {
    throw new Error('Invalid grade range');
  }

  const docs = await databases.listDocuments(dbId, gradesCol, [
    Query.greaterThanOrEqual('overall_grade', minGrade),
    Query.lessThanOrEqual('overall_grade', maxGrade),
    Query.orderDesc('overall_grade'),
  ]);

  return docs.documents;
}
