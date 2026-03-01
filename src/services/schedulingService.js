/**
 * Scheduling Service
 * Handles shift postings, applications, and eligibility enforcement
 */

import { ID, Query } from 'appwrite';
import { databases, config } from '../lib/appwrite.js';
import { logAudit } from './auditService.js';

const dbId = config.databaseId || process.env.VITE_APPWRITE_DATABASE_ID;
const shiftsCol = 'shifts';
const applicationsCol = 'shift_applications';
const staffProfilesCol = config.staffProfilesCollectionId || 'staff_profiles';
const LICENSE_EXPIRY_THRESHOLD_DAYS = Number(process.env.VITE_LICENSE_EXPIRY_THRESHOLD_DAYS || 30);

/**
 * Create shift (admin/manager only)
 * Scoped by clientId
 */
export async function createShift(createdBy, clientId, shiftData) {
  validateShiftData(shiftData);

  const shift = await databases.createDocument(dbId, shiftsCol, ID.unique(), {
    clientId: clientId,
    siteId: shiftData.siteId,
    positionTitle: shiftData.positionTitle,
    shiftId: shiftData.shiftId || ID.unique(),
    startTime: shiftData.startTime, // ISO string
    endTime: shiftData.endTime, // ISO string
    minimumGradeRequired: shiftData.minimumGradeRequired || null,
    positionsOpen: shiftData.positionsOpen || 1,
    assignments: JSON.stringify([]),
    status: 'open',
    createdBy: createdBy,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    specialRequirements: shiftData.specialRequirements || null,
  });

  await logAudit({
    actorId: createdBy,
    actorRole: 'admin',
    action: 'CREATE',
    entity: 'shifts',
    entityId: shift.$id,
    diff: JSON.stringify({
      clientId,
      startTime: shiftData.startTime,
      endTime: shiftData.endTime,
      positions: shiftData.positionsOpen,
      minGrade: shiftData.minimumGradeRequired,
    }),
  });

  return shift;
}

function validateShiftData(data) {
  const required = ['siteId', 'positionTitle', 'startTime', 'endTime', 'positionsOpen'];
  for (const field of required) {
    if (!data[field]) throw new Error(`Missing required field: ${field}`);
  }

  const shiftStart = new Date(data.startTime);
  const shiftEnd = new Date(data.endTime);

  if (Number.isNaN(shiftStart.getTime()) || Number.isNaN(shiftEnd.getTime())) {
    throw new Error('Shift startTime and endTime must be valid ISO strings');
  }

  if (shiftStart < new Date()) {
    throw new Error('Shift start time must be in the future');
  }

  if (shiftEnd <= shiftStart) {
    throw new Error('Shift end time must be after start time');
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
    queries.push(Query.equal('clientId', userClientId));
  }

  if (userRole === 'staff') {
    // Staff only see open shifts
    queries.push(Query.equal('status', 'open'));
  }

  // Default sort: by start time
  queries.push(Query.orderAsc('startTime'));

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
 * 2. Grade must meet minimumGradeRequired (if set)
 */
export async function applyForShift(staffId, shiftId) {
  const shift = await getShiftDetail(shiftId);

  if (shift.status !== 'open') {
    throw new Error('Shift is not open');
  }

  if (shift.assignments.length >= shift.positionsOpen) {
    throw new Error('Shift is now full');
  }

  // Check existing application
  const existing = await databases.listDocuments(dbId, applicationsCol, [
    Query.equal('shiftId', shiftId),
    Query.equal('staffId', staffId),
  ]);

  if (existing.documents.length > 0) {
    const app = existing.documents[0];
    if (app.status === 'accepted' || app.status === 'pending') {
      throw new Error(`Already applied (${app.status})`);
    }
  }

  // Check eligibility
  const eligibility = await checkEligibility(staffId, shift);

  if (!eligibility.licenseEligible) {
    throw new Error(`Licence invalid or expiring within ${LICENSE_EXPIRY_THRESHOLD_DAYS} days`);
  }

  const application = await databases.createDocument(dbId, applicationsCol, ID.unique(), {
    shiftId: shiftId,
    staffId: staffId,
    appliedAt: new Date().toISOString(),
    status: 'pending',
    eligibilityCheck: JSON.stringify(eligibility),
  });

  await logAudit({
    actorId: staffId,
    actorRole: 'staff',
    action: 'CREATE',
    entity: 'shift_applications',
    entityId: application.$id,
    diff: JSON.stringify({
      shiftId,
      eligible: eligibility.compliant && eligibility.gradeEligible,
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
  let licenseEligible = false;

  // Check compliance status
  const compDocs = await databases.listDocuments(dbId, 'staff_compliance', [
    Query.equal('staffId', staffId),
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
  if (shift.minimumGradeRequired) {
    const gradeDocs = await databases.listDocuments(dbId, 'staff_grades', [
      Query.equal('staffId', staffId),
    ]);

    if (gradeDocs.documents.length === 0 || !gradeDocs.documents[0].overallGrade) {
      reasons.push('Not yet graded');
    } else {
      const grade = gradeDocs.documents[0].overallGrade;
      if (grade >= shift.minimumGradeRequired) {
        gradeEligible = true;
      } else {
        reasons.push(`Grade ${grade} below required ${shift.minimumGradeRequired}`);
      }
    }
  } else {
    gradeEligible = true; // No requirement
  }

  // Licence expiry check
  try {
    const profile = await databases.getDocument(dbId, staffProfilesCol, staffId);
    const expiry = profile.licenseExpiry || profile.siaExpiryDate;
    if (expiry) {
      const expiryDate = new Date(expiry);
      const daysUntilExpiry = Math.floor((expiryDate - new Date()) / (1000 * 60 * 60 * 24));
      if (daysUntilExpiry < 0) {
        reasons.push('Licence expired');
        licenseEligible = false;
      } else if (daysUntilExpiry <= LICENSE_EXPIRY_THRESHOLD_DAYS) {
        reasons.push(`Licence expiring within ${LICENSE_EXPIRY_THRESHOLD_DAYS} days`);
        licenseEligible = false;
      } else {
        licenseEligible = true;
      }
    } else {
      reasons.push('No licence expiry on file');
      licenseEligible = false;
    }
  } catch (error) {
    console.warn('Could not fetch staff profile for licence check', error);
    reasons.push('Licence check unavailable');
  }

  return {
    compliant,
    gradeEligible: gradeEligible,
    licenseEligible: licenseEligible,
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
    reviewedBy: adminId,
    reviewedAt: new Date().toISOString(),
  });

  // Update shift assignments if accepted
  if (accepted) {
    const shift = await getShiftDetail(app.shiftId);
    shift.assignments.push({
      staffId: app.staffId,
      status: 'accepted',
      acceptedAt: new Date().toISOString(),
    });

    // Check if now full
    const newStatus = shift.assignments.length >= shift.positionsOpen ? 'filled' : 'open';

    await databases.updateDocument(dbId, shiftsCol, app.shiftId, {
      assignments: JSON.stringify(shift.assignments),
      status: newStatus,
      updatedAt: new Date().toISOString(),
    });
  }

  await logAudit({
    actorId: adminId,
    actorRole: 'admin',
    action: 'UPDATE',
    entity: 'shift_applications',
    entityId: applicationId,
    diff: JSON.stringify({ status: newStatus, staffId: app.staffId }),
  });

  return updated;
}

/**
 * Get applications for shift (admin only)
 */
export async function getShiftApplications(shiftId, adminId) {
  const apps = await databases.listDocuments(dbId, applicationsCol, [
    Query.equal('shiftId', shiftId),
  ]);

  // Parse eligibility checks
  return apps.documents.map(app => {
    try {
      app.eligibilityCheck = JSON.parse(app.eligibilityCheck);
    } catch (e) {
      app.eligibilityCheck = {};
    }
    return app;
  });
}

/**
 * Get staff's applications
 */
export async function getMyApplications(staffId) {
  const apps = await databases.listDocuments(dbId, applicationsCol, [
    Query.equal('staffId', staffId),
  ]);

  return apps.documents.map(app => {
    try {
      app.eligibilityCheck = JSON.parse(app.eligibilityCheck);
    } catch (e) {
      app.eligibilityCheck = {};
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
    updatedAt: new Date().toISOString(),
  });

  // Notify all applicants (TBD: email)
  const apps = await getShiftApplications(shiftId, adminId);
  for (const app of apps) {
    if (app.status === 'pending') {
      await databases.updateDocument(dbId, applicationsCol, app.$id, {
        status: 'cancelled',
    updatedAt: new Date().toISOString(),
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
