/**
 * Scheduling Service
 * Handles shift postings, applications, and eligibility enforcement
 */

import { ID, Query } from 'appwrite';
import { databases } from '../lib/appwrite.js';
import { logAudit } from './auditService.js';

const dbId = process.env.VITE_APPWRITE_DATABASE_ID;
const shiftsCol = 'shifts';
const applicationsCol = 'shift_applications';

/**
 * Create shift (admin/manager only)
 * Scoped by client_id
 */
export async function createShift(createdBy, clientId, shiftData) {
  validateShiftData(shiftData);

  const shift = await databases.createDocument(dbId, shiftsCol, ID.unique(), {
    client_id: clientId,
    site_id: shiftData.siteId,
    position_title: shiftData.positionTitle,
    date: shiftData.date, // ISO string
    start_time: shiftData.startTime, // HH:MM
    end_time: shiftData.endTime,
    minimum_grade_required: shiftData.minimumGradeRequired || null,
    positions_open: shiftData.positionsOpen || 1,
    assignments: JSON.stringify([]),
    status: 'open',
    created_by: createdBy,
    special_requirements: shiftData.specialRequirements || null,
  });

  await logAudit({
    actorId: createdBy,
    actorRole: 'admin',
    action: 'CREATE',
    entity: 'shifts',
    entityId: shift.$id,
    diff: JSON.stringify({
      clientId,
      date: shiftData.date,
      positions: shiftData.positionsOpen,
      minGrade: shiftData.minimumGradeRequired,
    }),
  });

  return shift;
}

function validateShiftData(data) {
  const required = ['siteId', 'positionTitle', 'date', 'startTime', 'endTime', 'positionsOpen'];
  for (const field of required) {
    if (!data[field]) throw new Error(`Missing required field: ${field}`);
  }

  // Validate time format (HH:MM)
  if (!/^\d{2}:\d{2}$/.test(data.startTime) || !/^\d{2}:\d{2}$/.test(data.endTime)) {
    throw new Error('Time must be in HH:MM format');
  }

  // Validate date is in future
  const shiftDate = new Date(data.date);
  if (shiftDate < new Date()) {
    throw new Error('Shift date must be in the future');
  }

  if (data.minimumGradeRequired && (data.minimumGradeRequired < 1 || data.minimumGradeRequired > 5)) {
    throw new Error('Grade must be 1-5');
  }

  if (data.positionsOpen < 1) {
    throw new Error('Positions open must be at least 1');
  }
}

/**
 * Get shifts (client-scoped)
 * - Clients: only their own sites
 * - Staff: all open shifts
 * - Admin: all shifts
 */
export async function getShifts(userId, userRole, userClientId = null) {
  let queries = [];

  if (userRole === 'client' && userClientId) {
    // Clients only see their own sites' shifts
    queries.push(Query.equal('client_id', userClientId));
  }

  if (userRole === 'staff') {
    // Staff only see open shifts
    queries.push(Query.equal('status', 'open'));
  }

  // Default sort: by date
  queries.push(Query.orderAsc('date'));

  const result = await databases.listDocuments(dbId, shiftsCol, queries);
  return result.documents;
}

/**
 * Get single shift with full details
 */
export async function getShiftDetail(shiftId) {
  const shift = await databases.getDocument(dbId, shiftsCol, shiftId);

  // Parse assignments
  if (shift.assignments) {
    try {
      shift.assignments = JSON.parse(shift.assignments);
    } catch (e) {
      shift.assignments = [];
    }
  }

  return shift;
}

/**
 * Apply for shift (staff only)
 * Server-side eligibility check:
 * 1. Compliance must be approved
 * 2. Grade must meet minimum_grade_required (if set)
 */
export async function applyForShift(staffId, shiftId) {
  const shift = await getShiftDetail(shiftId);

  if (shift.status !== 'open') {
    throw new Error('Shift is not open');
  }

  if (shift.assignments.length >= shift.positions_open) {
    throw new Error('Shift is now full');
  }

  // Check existing application
  const existing = await databases.listDocuments(dbId, applicationsCol, [
    Query.equal('shift_id', shiftId),
    Query.equal('staff_id', staffId),
  ]);

  if (existing.documents.length > 0) {
    const app = existing.documents[0];
    if (app.status === 'accepted' || app.status === 'pending') {
      throw new Error(`Already applied (${app.status})`);
    }
  }

  // Check eligibility
  const eligibility = await checkEligibility(staffId, shift);

  const application = await databases.createDocument(dbId, applicationsCol, ID.unique(), {
    shift_id: shiftId,
    staff_id: staffId,
    applied_at: new Date().toISOString(),
    status: 'pending',
    eligibility_check: JSON.stringify(eligibility),
  });

  await logAudit({
    actorId: staffId,
    actorRole: 'staff',
    action: 'CREATE',
    entity: 'shift_applications',
    entityId: application.$id,
    diff: JSON.stringify({
      shiftId,
      eligible: eligibility.compliant && eligibility.grade_eligible,
    }),
  });

  return application;
}

/**
 * Check staff eligibility for shift
 * Returns: {compliant, grade_eligible, reasons}
 */
async function checkEligibility(staffId, shift) {
  const reasons = [];
  let compliant = false;
  let gradeEligible = false;

  // Check compliance status
  const compDocs = await databases.listDocuments(dbId, 'staff_compliance', [
    Query.equal('staff_id', staffId),
  ]);

  if (compDocs.documents.length === 0) {
    reasons.push('Compliance not started');
  } else {
    const comp = compDocs.documents[0];
    if (comp.status === 'approved') {
      compliant = true;
    } else {
      reasons.push(`Compliance status: ${comp.status}`);
    }
  }

  // Check grade (if required)
  if (shift.minimum_grade_required) {
    const gradeDocs = await databases.listDocuments(dbId, 'staff_grades', [
      Query.equal('staff_id', staffId),
    ]);

    if (gradeDocs.documents.length === 0 || !gradeDocs.documents[0].overall_grade) {
      reasons.push('Not yet graded');
    } else {
      const grade = gradeDocs.documents[0].overall_grade;
      if (grade >= shift.minimum_grade_required) {
        gradeEligible = true;
      } else {
        reasons.push(`Grade ${grade} below required ${shift.minimum_grade_required}`);
      }
    }
  } else {
    gradeEligible = true; // No requirement
  }

  return {
    compliant,
    grade_eligible: gradeEligible,
    reasons,
  };
}

/**
 * Admin accept/reject shift application
 */
export async function reviewApplication(adminId, applicationId, accepted) {
  const app = await databases.getDocument(dbId, applicationsCol, applicationId);

  if (app.status !== 'pending') {
    throw new Error('Application not pending');
  }

  const newStatus = accepted ? 'accepted' : 'rejected';

  const updated = await databases.updateDocument(dbId, applicationsCol, applicationId, {
    status: newStatus,
    reviewed_by: adminId,
    reviewed_at: new Date().toISOString(),
  });

  // Update shift assignments if accepted
  if (accepted) {
    const shift = await getShiftDetail(app.shift_id);
    shift.assignments.push({
      staff_id: app.staff_id,
      status: 'accepted',
      accepted_at: new Date().toISOString(),
    });

    // Check if now full
    const newStatus = shift.assignments.length >= shift.positions_open ? 'filled' : 'open';

    await databases.updateDocument(dbId, shiftsCol, app.shift_id, {
      assignments: JSON.stringify(shift.assignments),
      status: newStatus,
    });
  }

  await logAudit({
    actorId: adminId,
    actorRole: 'admin',
    action: 'UPDATE',
    entity: 'shift_applications',
    entityId: applicationId,
    diff: JSON.stringify({ status: newStatus, staffId: app.staff_id }),
  });

  return updated;
}

/**
 * Get applications for shift (admin only)
 */
export async function getShiftApplications(shiftId, adminId) {
  const apps = await databases.listDocuments(dbId, applicationsCol, [
    Query.equal('shift_id', shiftId),
  ]);

  // Parse eligibility checks
  return apps.documents.map(app => {
    try {
      app.eligibility_check = JSON.parse(app.eligibility_check);
    } catch (e) {
      app.eligibility_check = {};
    }
    return app;
  });
}

/**
 * Get staff's applications
 */
export async function getMyApplications(staffId) {
  const apps = await databases.listDocuments(dbId, applicationsCol, [
    Query.equal('staff_id', staffId),
  ]);

  return apps.documents.map(app => {
    try {
      app.eligibility_check = JSON.parse(app.eligibility_check);
    } catch (e) {
      app.eligibility_check = {};
    }
    return app;
  });
}

/**
 * Cancel shift (admin only)
 */
export async function cancelShift(adminId, shiftId, reason) {
  const shift = await getShiftDetail(shiftId);

  const updated = await databases.updateDocument(dbId, shiftsCol, shiftId, {
    status: 'cancelled',
  });

  // Notify all applicants (TBD: email)
  const apps = await getShiftApplications(shiftId, adminId);
  for (const app of apps) {
    if (app.status === 'pending') {
      await databases.updateDocument(dbId, applicationsCol, app.$id, {
        status: 'cancelled',
      });
    }
  }

  await logAudit({
    actorId: adminId,
    actorRole: 'admin',
    action: 'UPDATE',
    entity: 'shifts',
    entityId: shiftId,
    diff: JSON.stringify({ status: 'cancelled', reason }),
  });

  return updated;
}
