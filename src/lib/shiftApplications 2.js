/**
 * Open Shift Application Workflow Library
 * Handles shift applications, eligibility, and approval processes
 */

// Application statuses
export const APPLICATION_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  WITHDRAWN: 'withdrawn',
  EXPIRED: 'expired',
};

export const APPLICATION_STATUS_LABELS = {
  [APPLICATION_STATUS.PENDING]: 'Pending Review',
  [APPLICATION_STATUS.APPROVED]: 'Approved',
  [APPLICATION_STATUS.REJECTED]: 'Rejected',
  [APPLICATION_STATUS.WITHDRAWN]: 'Withdrawn',
  [APPLICATION_STATUS.EXPIRED]: 'Expired',
};

export const APPLICATION_STATUS_COLORS = {
  [APPLICATION_STATUS.PENDING]: 'yellow',
  [APPLICATION_STATUS.APPROVED]: 'green',
  [APPLICATION_STATUS.REJECTED]: 'red',
  [APPLICATION_STATUS.WITHDRAWN]: 'gray',
  [APPLICATION_STATUS.EXPIRED]: 'gray',
};

// Eligibility criteria
export const ELIGIBILITY_CRITERIA = {
  VALID_LICENSE: 'valid_license',
  SKILLS_MATCH: 'skills_match',
  EXPERIENCE_LEVEL: 'experience_level',
  AVAILABILITY: 'availability',
  RELIABILITY_SCORE: 'reliability_score',
  SITE_FAMILIARITY: 'site_familiarity',
  DISTANCE: 'distance',
  NO_CONFLICTS: 'no_conflicts',
  COMPLIANCE: 'compliance',
  TRAINING: 'training',
};

// Rejection reasons
export const REJECTION_REASONS = {
  INSUFFICIENT_EXPERIENCE: 'insufficient_experience',
  SKILLS_MISMATCH: 'skills_mismatch',
  RELIABILITY_CONCERNS: 'reliability_concerns',
  SCHEDULE_CONFLICT: 'schedule_conflict',
  LICENSE_EXPIRED: 'license_expired',
  MISSING_TRAINING: 'missing_training',
  BETTER_CANDIDATE: 'better_candidate',
  SHIFT_FILLED: 'shift_filled',
  OTHER: 'other',
};

export const REJECTION_REASON_LABELS = {
  [REJECTION_REASONS.INSUFFICIENT_EXPERIENCE]: 'Insufficient experience for this role',
  [REJECTION_REASONS.SKILLS_MISMATCH]: 'Required skills not met',
  [REJECTION_REASONS.RELIABILITY_CONCERNS]: 'Reliability concerns',
  [REJECTION_REASONS.SCHEDULE_CONFLICT]: 'Schedule conflict detected',
  [REJECTION_REASONS.LICENSE_EXPIRED]: 'SIA license expired or expiring soon',
  [REJECTION_REASONS.MISSING_TRAINING]: 'Required training not completed',
  [REJECTION_REASONS.BETTER_CANDIDATE]: 'Another candidate better suited',
  [REJECTION_REASONS.SHIFT_FILLED]: 'Shift already filled',
  [REJECTION_REASONS.OTHER]: 'Other reason',
};

/**
 * Calculate comprehensive eligibility score for a guard applying to a shift
 */
export const calculateEligibilityScore = (guard, shift, guardHistory = {}) => {
  const criteria = {};
  let totalScore = 0;
  const maxScore = 100;
  let eligibilityPassed = true;
  const reasons = [];

  // 1. Valid SIA License (20 points, MANDATORY)
  if (guard.siaLicenseExpiry) {
    const expiryDate = new Date(guard.siaLicenseExpiry);
    const today = new Date();
    const daysUntilExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiry < 0) {
      criteria[ELIGIBILITY_CRITERIA.VALID_LICENSE] = { score: 0, passed: false, weight: 20 };
      eligibilityPassed = false;
      reasons.push('SIA license expired');
    } else if (daysUntilExpiry <= 30) {
      criteria[ELIGIBILITY_CRITERIA.VALID_LICENSE] = { score: 10, passed: true, weight: 20 };
      totalScore += 10;
      reasons.push('License expiring soon');
    } else {
      criteria[ELIGIBILITY_CRITERIA.VALID_LICENSE] = { score: 20, passed: true, weight: 20 };
      totalScore += 20;
    }
  } else {
    criteria[ELIGIBILITY_CRITERIA.VALID_LICENSE] = { score: 0, passed: false, weight: 20 };
    eligibilityPassed = false;
    reasons.push('No SIA license on file');
  }

  // 2. Skills Match (20 points)
  if (shift.requiredSkills && shift.requiredSkills.length > 0) {
    const guardSkills = guard.skills || [];
    const matchedSkills = shift.requiredSkills.filter(skill => 
      guardSkills.some(gs => gs.toLowerCase() === skill.toLowerCase())
    );
    const matchRate = matchedSkills.length / shift.requiredSkills.length;
    const skillScore = Math.round(matchRate * 20);
    
    criteria[ELIGIBILITY_CRITERIA.SKILLS_MATCH] = { 
      score: skillScore, 
      passed: matchRate >= 0.5, 
      weight: 20,
      details: `${matchedSkills.length}/${shift.requiredSkills.length} skills matched`
    };
    
    totalScore += skillScore;
    if (matchRate < 0.5) {
      reasons.push('Insufficient skill match');
    }
  } else {
    criteria[ELIGIBILITY_CRITERIA.SKILLS_MATCH] = { score: 20, passed: true, weight: 20 };
    totalScore += 20;
  }

  // 3. Experience Level (15 points)
  const guardExperience = guard.yearsExperience || 0;
  const requiredExperience = shift.requiredExperience || 0;
  
  if (guardExperience >= requiredExperience) {
    const experienceScore = Math.min(15, 10 + Math.floor(guardExperience - requiredExperience) * 2);
    criteria[ELIGIBILITY_CRITERIA.EXPERIENCE_LEVEL] = { 
      score: experienceScore, 
      passed: true, 
      weight: 15,
      details: `${guardExperience} years vs ${requiredExperience} required`
    };
    totalScore += experienceScore;
  } else {
    const experienceScore = Math.max(0, Math.floor((guardExperience / requiredExperience) * 10));
    criteria[ELIGIBILITY_CRITERIA.EXPERIENCE_LEVEL] = { 
      score: experienceScore, 
      passed: guardExperience >= requiredExperience * 0.7, 
      weight: 15,
      details: `${guardExperience} years vs ${requiredExperience} required`
    };
    totalScore += experienceScore;
    if (guardExperience < requiredExperience * 0.7) {
      reasons.push('Below required experience level');
    }
  }

  // 4. Reliability Score (15 points)
  const reliabilityScore = guardHistory.reliabilityScore || 75;
  const reliabilityPoints = Math.round((reliabilityScore / 100) * 15);
  criteria[ELIGIBILITY_CRITERIA.RELIABILITY_SCORE] = { 
    score: reliabilityPoints, 
    passed: reliabilityScore >= 70, 
    weight: 15,
    details: `${reliabilityScore}% reliability`
  };
  totalScore += reliabilityPoints;
  if (reliabilityScore < 70) {
    reasons.push('Low reliability score');
  }

  // 5. Site Familiarity (10 points)
  const hasWorkedAtSite = guardHistory.sitesWorked?.includes(shift.siteId) || false;
  const timesSiteWorked = guardHistory.siteVisits?.[shift.siteId] || 0;
  
  let siteScore = 0;
  if (hasWorkedAtSite) {
    siteScore = Math.min(10, 5 + timesSiteWorked);
  }
  
  criteria[ELIGIBILITY_CRITERIA.SITE_FAMILIARITY] = { 
    score: siteScore, 
    passed: true, 
    weight: 10,
    details: hasWorkedAtSite ? `Worked at site ${timesSiteWorked} times` : 'New site'
  };
  totalScore += siteScore;

  // 6. Availability Check (10 points, MANDATORY)
  const hasConflict = guardHistory.scheduledShifts?.some(s => {
    if (s.date !== shift.date) return false;
    const existingStart = new Date(`${s.date}T${s.startTime}`);
    const existingEnd = new Date(`${s.date}T${s.endTime}`);
    const newStart = new Date(`${shift.date}T${shift.startTime}`);
    const newEnd = new Date(`${shift.date}T${shift.endTime}`);
    
    return (
      (newStart >= existingStart && newStart < existingEnd) ||
      (newEnd > existingStart && newEnd <= existingEnd) ||
      (newStart <= existingStart && newEnd >= existingEnd)
    );
  }) || false;

  if (hasConflict) {
    criteria[ELIGIBILITY_CRITERIA.AVAILABILITY] = { score: 0, passed: false, weight: 10 };
    eligibilityPassed = false;
    reasons.push('Schedule conflict with existing shift');
  } else {
    criteria[ELIGIBILITY_CRITERIA.AVAILABILITY] = { score: 10, passed: true, weight: 10 };
    totalScore += 10;
  }

  // 7. Required Training (10 points)
  if (shift.requiredTraining && shift.requiredTraining.length > 0) {
    const guardTraining = guard.completedTraining || [];
    const matchedTraining = shift.requiredTraining.filter(t => guardTraining.includes(t));
    const trainingRate = matchedTraining.length / shift.requiredTraining.length;
    const trainingScore = Math.round(trainingRate * 10);
    
    criteria[ELIGIBILITY_CRITERIA.TRAINING] = { 
      score: trainingScore, 
      passed: trainingRate === 1, 
      weight: 10,
      details: `${matchedTraining.length}/${shift.requiredTraining.length} training completed`
    };
    totalScore += trainingScore;
    if (trainingRate < 1) {
      reasons.push('Missing required training');
    }
  } else {
    criteria[ELIGIBILITY_CRITERIA.TRAINING] = { score: 10, passed: true, weight: 10 };
    totalScore += 10;
  }

  return {
    eligible: eligibilityPassed && totalScore >= 50,
    score: totalScore,
    maxScore,
    percentage: Math.round((totalScore / maxScore) * 100),
    criteria,
    reasons,
    recommendationLevel: getRecommendationLevel(totalScore),
  };
};

/**
 * Get recommendation level based on score
 */
const getRecommendationLevel = (score) => {
  if (score >= 85) return 'highly_recommended';
  if (score >= 70) return 'recommended';
  if (score >= 50) return 'acceptable';
  return 'not_recommended';
};

/**
 * Create a shift application
 */
export const createApplication = ({
  guardId,
  guardName,
  shiftId,
  shiftDetails,
  eligibilityScore,
  message = '',
}) => {
  return {
    guardId,
    guardName,
    shiftId,
    shiftDetails,
    eligibilityScore,
    message,
    status: APPLICATION_STATUS.PENDING,
    appliedAt: new Date().toISOString(),
    reviewedAt: null,
    reviewedBy: null,
    reviewNotes: '',
    rejectionReason: null,
  };
};

/**
 * Approve an application
 */
export const approveApplication = (application, managerId, managerName, notes = '') => {
  return {
    ...application,
    status: APPLICATION_STATUS.APPROVED,
    reviewedAt: new Date().toISOString(),
    reviewedBy: managerId,
    reviewerName: managerName,
    reviewNotes: notes,
  };
};

/**
 * Reject an application
 */
export const rejectApplication = (application, managerId, managerName, reason, notes = '') => {
  return {
    ...application,
    status: APPLICATION_STATUS.REJECTED,
    reviewedAt: new Date().toISOString(),
    reviewedBy: managerId,
    reviewerName: managerName,
    rejectionReason: reason,
    reviewNotes: notes,
  };
};

/**
 * Withdraw an application (by guard)
 */
export const withdrawApplication = (application, reason = '') => {
  return {
    ...application,
    status: APPLICATION_STATUS.WITHDRAWN,
    withdrawnAt: new Date().toISOString(),
    withdrawalReason: reason,
  };
};

/**
 * Get applications by status
 */
export const filterApplicationsByStatus = (applications, status) => {
  return applications.filter(app => app.status === status);
};

/**
 * Get applications for a specific shift
 */
export const getShiftApplications = (applications, shiftId) => {
  return applications.filter(app => app.shiftId === shiftId);
};

/**
 * Get applications for a specific guard
 */
export const getGuardApplications = (applications, guardId) => {
  return applications.filter(app => app.guardId === guardId);
};

/**
 * Sort applications by eligibility score
 */
export const sortApplicationsByScore = (applications, descending = true) => {
  return [...applications].sort((a, b) => {
    const scoreA = a.eligibilityScore?.score || 0;
    const scoreB = b.eligibilityScore?.score || 0;
    return descending ? scoreB - scoreA : scoreA - scoreB;
  });
};

/**
 * Get application statistics
 */
export const getApplicationStats = (applications) => {
  const total = applications.length;
  const pending = applications.filter(a => a.status === APPLICATION_STATUS.PENDING).length;
  const approved = applications.filter(a => a.status === APPLICATION_STATUS.APPROVED).length;
  const rejected = applications.filter(a => a.status === APPLICATION_STATUS.REJECTED).length;
  const withdrawn = applications.filter(a => a.status === APPLICATION_STATUS.WITHDRAWN).length;

  const approvalRate = total > 0 ? ((approved / total) * 100).toFixed(1) : 0;
  const avgScore = total > 0 
    ? (applications.reduce((sum, a) => sum + (a.eligibilityScore?.score || 0), 0) / total).toFixed(1)
    : 0;

  return {
    total,
    pending,
    approved,
    rejected,
    withdrawn,
    approvalRate,
    avgScore,
  };
};

/**
 * Check if application can be approved
 */
export const canApproveApplication = (application, shift) => {
  if (application.status !== APPLICATION_STATUS.PENDING) {
    return { can: false, reason: 'Application is not pending' };
  }

  if (!application.eligibilityScore?.eligible) {
    return { can: false, reason: 'Guard is not eligible for this shift' };
  }

  if (shift.assignedGuardId) {
    return { can: false, reason: 'Shift already assigned to another guard' };
  }

  return { can: true, reason: null };
};

/**
 * Auto-expire old applications
 */
export const expireOldApplications = (applications, hoursThreshold = 24) => {
  const now = new Date();
  const threshold = hoursThreshold * 60 * 60 * 1000;

  return applications.map(app => {
    if (app.status === APPLICATION_STATUS.PENDING) {
      const appliedAt = new Date(app.appliedAt);
      if (now - appliedAt > threshold) {
        return {
          ...app,
          status: APPLICATION_STATUS.EXPIRED,
          expiredAt: now.toISOString(),
        };
      }
    }
    return app;
  });
};

/**
 * Generate notification for application status change
 */
export const generateApplicationNotification = (application, previousStatus) => {
  const statusChanged = previousStatus !== application.status;
  
  if (!statusChanged) return null;

  let title = '';
  let message = '';
  let priority = 'normal';

  switch (application.status) {
    case APPLICATION_STATUS.APPROVED:
      title = 'Application Approved';
      message = `Your application for ${application.shiftDetails?.siteName} on ${application.shiftDetails?.date} has been approved!`;
      priority = 'high';
      break;

    case APPLICATION_STATUS.REJECTED:
      title = 'Application Not Successful';
      message = `Your application for ${application.shiftDetails?.siteName} on ${application.shiftDetails?.date} was not successful this time.`;
      priority = 'normal';
      break;

    case APPLICATION_STATUS.EXPIRED:
      title = 'Application Expired';
      message = `Your application for ${application.shiftDetails?.siteName} has expired.`;
      priority = 'low';
      break;

    default:
      return null;
  }

  return {
    title,
    message,
    priority,
    guardId: application.guardId,
    applicationId: application.$id || application.id,
    timestamp: new Date().toISOString(),
  };
};
