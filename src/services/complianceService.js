/**
 * Staff Compliance Service
 * Manages BS7858-style multi-step compliance wizard
 */

import { Query } from 'appwrite';
import { databases, config } from '../lib/appwrite.js';
import { logAudit } from './auditService.js';

const dbId = config.databaseId;
const compCol = config.staffComplianceCollectionId || 'staff_compliance';

/**
 * Get compliance progress for staff
 */
export async function getComplianceProgress(staffId) {
  const docs = await databases.listDocuments(dbId, compCol, [
    Query.equal('staff_id', staffId),
  ]);

  if (docs.documents.length === 0) {
    throw new Error('Compliance record not found');
  }

  return docs.documents[0];
}

/**
 * Step 1: Identity & Right to Work
 * Requires: personal details, 5-year address history
 */
export async function submitStep1Identity(staffId, data) {
  validateStep1(data);

  const comp = await getComplianceProgress(staffId);

  const updated = await databases.updateDocument(dbId, compCol, comp.$id, {
    step_1_identity: JSON.stringify(data),
    current_step: Math.max(comp.current_step, 1),
  });

  await logAudit({
    actorId: staffId,
    actorRole: 'staff',
    action: 'UPDATE',
    entity: 'staff_compliance',
    entityId: comp.$id,
    diff: JSON.stringify({ step: 1, addresses: data.addresses.length }),
  });

  return updated;
}

function validateStep1(data) {
  const required = ['firstName', 'lastName', 'dateOfBirth', 'nationalInsuranceNumber'];
  for (const field of required) {
    if (!data[field]) throw new Error(`Missing required field: ${field}`);
  }

  if (!Array.isArray(data.addresses) || data.addresses.length === 0) {
    throw new Error('At least one address required');
  }

  // Validate 5-year history
  const totalMonths = data.addresses.reduce((sum, a) => sum + (a.months || 0), 0);
  if (totalMonths < 60) {
    throw new Error('Address history must cover at least 5 years');
  }

  for (const addr of data.addresses) {
    if (!addr.line1 || !addr.postcode || !addr.fromDate) {
      throw new Error('Invalid address format');
    }
  }
}

/**
 * Step 2: Employment History
 * Requires: 5 years of employment with gap detection (>31 days fails)
 */
export async function submitStep2Employment(staffId, data) {
  validateStep2(data);

  const comp = await getComplianceProgress(staffId);

  const updated = await databases.updateDocument(dbId, compCol, comp.$id, {
    step_2_employment: JSON.stringify(data),
    current_step: Math.max(comp.current_step, 2),
  });

  await logAudit({
    actorId: staffId,
    actorRole: 'staff',
    action: 'UPDATE',
    entity: 'staff_compliance',
    entityId: comp.$id,
    diff: JSON.stringify({ step: 2, employmentCount: data.jobs.length }),
  });

  return updated;
}

function validateStep2(data) {
  if (!Array.isArray(data.jobs) || data.jobs.length === 0) {
    throw new Error('At least one employment history required');
  }

  // Check 5-year coverage and gaps
  const now = new Date();
  const fiveYearsAgo = new Date(now.getFullYear() - 5, now.getMonth(), now.getDate());

  let coverage = 0;
  let lastEndDate = new Date(); // Start from today

  for (const job of data.jobs) {
    const from = new Date(job.fromDate);
    const to = job.toDate ? new Date(job.toDate) : new Date();

    // Check gap (>31 days)
    const gapDays = Math.floor((lastEndDate - from) / (1000 * 60 * 60 * 24));
    if (gapDays > 31) {
      throw new Error(`Gap of ${gapDays} days detected between jobs (max 31 allowed)`);
    }

    coverage += Math.floor((to - from) / (1000 * 60 * 60 * 24));
    lastEndDate = from;

    if (!job.employer || !job.jobTitle || !job.fromDate) {
      throw new Error('Invalid employment record');
    }
  }

  // Check 5-year coverage
  const coverageDays = coverage;
  const requiredDays = 365.25 * 5;
  if (coverageDays < requiredDays * 0.9) {
    // Allow 10% flexibility
    throw new Error(`Employment history insufficient (${(coverageDays / 365.25).toFixed(1)} years)`);
  }
}

/**
 * Step 3: Evidence Upload (HMRC PAYE, P45/P60, payslips, bank statements)
 */
export async function submitStep3Evidence(staffId, fileIds) {
  if (!Array.isArray(fileIds) || fileIds.length === 0) {
    throw new Error('At least one evidence file required');
  }

  // Validate file IDs exist (will be checked by Google Drive sync)
  const comp = await getComplianceProgress(staffId);

  const updated = await databases.updateDocument(dbId, compCol, comp.$id, {
    step_3_evidence: JSON.stringify(fileIds.map(id => ({ file_id: id }))),
    current_step: Math.max(comp.current_step, 3),
  });

  await logAudit({
    actorId: staffId,
    actorRole: 'staff',
    action: 'UPDATE',
    entity: 'staff_compliance',
    entityId: comp.$id,
    diff: JSON.stringify({ step: 3, fileCount: fileIds.length }),
  });

  return updated;
}

/**
 * Step 4: References (1 employer + 1 character)
 * Requires full contact details
 */
export async function submitStep4References(staffId, data) {
  validateStep4(data);

  const comp = await getComplianceProgress(staffId);

  const updated = await databases.updateDocument(dbId, compCol, comp.$id, {
    step_4_references: JSON.stringify(data),
    current_step: Math.max(comp.current_step, 4),
  });

  await logAudit({
    actorId: staffId,
    actorRole: 'staff',
    action: 'UPDATE',
    entity: 'staff_compliance',
    entityId: comp.$id,
    diff: JSON.stringify({ step: 4, refCount: data.references.length }),
  });

  return updated;
}

function validateStep4(data) {
  if (!Array.isArray(data.references) || data.references.length !== 2) {
    throw new Error('Exactly 2 references required');
  }

  const types = data.references.map(r => r.type);
  if (!types.includes('employer') || !types.includes('character')) {
    throw new Error('Must have 1 employer and 1 character reference');
  }

  for (const ref of data.references) {
    const required = ['name', 'email', 'phone', 'type', 'position'];
    for (const field of required) {
      if (!ref[field]) throw new Error(`Missing reference field: ${field}`);
    }
  }
}

/**
 * Step 5: Criminal Record (Basic Disclosure upload)
 */
export async function submitStep5Criminal(staffId, fileId) {
  if (!fileId) throw new Error('Criminal record file required');

  const comp = await getComplianceProgress(staffId);

  const updated = await databases.updateDocument(dbId, compCol, comp.$id, {
    step_5_criminal: JSON.stringify({ file_id: fileId, upload_date: new Date().toISOString() }),
    current_step: Math.max(comp.current_step, 5),
  });

  await logAudit({
    actorId: staffId,
    actorRole: 'staff',
    action: 'UPDATE',
    entity: 'staff_compliance',
    entityId: comp.$id,
    diff: JSON.stringify({ step: 5, fileId }),
  });

  return updated;
}

/**
 * Step 6: SIA Licence
 */
export async function submitStep6SIALicence(staffId, licenceNumber, expiryDate) {
  if (!licenceNumber || !expiryDate) {
    throw new Error('SIA licence number and expiry required');
  }

  const expiry = new Date(expiryDate);
  if (expiry < new Date()) {
    throw new Error('SIA licence is expired');
  }

  const comp = await getComplianceProgress(staffId);

  const updated = await databases.updateDocument(dbId, compCol, comp.$id, {
    step_6_sia: JSON.stringify({ licence_number: licenceNumber, expiry_date: expiryDate }),
    current_step: Math.max(comp.current_step, 6),
  });

  // Also update staff_profiles
  await databases.updateDocument(dbId, 'staff_profiles', staffId, {
    siaLicence: licenceNumber,
    siaExpiryDate: expiryDate,
  });

  await logAudit({
    actorId: staffId,
    actorRole: 'staff',
    action: 'UPDATE',
    entity: 'staff_compliance',
    entityId: comp.$id,
    diff: JSON.stringify({ step: 6, licenceNumber }),
  });

  return updated;
}

/**
 * Step 7: Intro Video (required)
 */
export async function submitStep7Video(staffId, fileId) {
  if (!fileId) throw new Error('Intro video required');

  const comp = await getComplianceProgress(staffId);

  const updated = await databases.updateDocument(dbId, compCol, comp.$id, {
    step_7_video: JSON.stringify({ file_id: fileId, upload_date: new Date().toISOString() }),
    current_step: 7,
  });

  await logAudit({
    actorId: staffId,
    actorRole: 'staff',
    action: 'UPDATE',
    entity: 'staff_compliance',
    entityId: comp.$id,
    diff: JSON.stringify({ step: 7, fileId }),
  });

  return updated;
}

/**
 * Submit compliance for admin review
 */
export async function submitComplianceReview(staffId) {
  const comp = await getComplianceProgress(staffId);

  if (comp.current_step !== 7) {
    throw new Error(`All 7 steps required (currently on step ${comp.current_step})`);
  }

  const updated = await databases.updateDocument(dbId, compCol, comp.$id, {
    status: 'submitted',
    submitted_at: new Date().toISOString(),
  });

  await logAudit({
    actorId: staffId,
    actorRole: 'staff',
    action: 'UPDATE',
    entity: 'staff_compliance',
    entityId: comp.$id,
    diff: JSON.stringify({ status: 'submitted' }),
  });

  return updated;
}

/**
 * Admin approve/reject compliance
 */
export async function adminReviewCompliance(adminId, staffId, approved, rejectionReason = null) {
  const comp = await getComplianceProgress(staffId);

  if (comp.status !== 'submitted') {
    throw new Error('Compliance not submitted for review');
  }

  const newStatus = approved ? 'approved' : 'rejected';

  const updated = await databases.updateDocument(dbId, compCol, comp.$id, {
    status: newStatus,
    rejection_reason: rejectionReason,
    reviewed_at: new Date().toISOString(),
    reviewed_by: adminId,
  });

  // Update staff status if approved
  if (approved) {
    await databases.updateDocument(dbId, 'staff_profiles', staffId, {
      status: 'active',
    });
  }

  await logAudit({
    actorId: adminId,
    actorRole: 'admin',
    action: 'UPDATE',
    entity: 'staff_compliance',
    entityId: comp.$id,
    diff: JSON.stringify({ status: newStatus, reason: rejectionReason }),
  });

  return updated;
}
