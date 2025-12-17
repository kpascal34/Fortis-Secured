/**
 * Advanced Conflict Detection Rules
 * Extended conflict validation beyond basic scheduling rules
 */

import { CONFLICT_TYPES, WORKING_TIME_RULES, COMPLIANCE_STATUS } from './scheduleUtils';

// Advanced conflict rule types
export const ADVANCED_CONFLICT_TYPES = {
  ...CONFLICT_TYPES,
  
  // Fatigue management
  EXCESSIVE_CONSECUTIVE_DAYS: 'excessive_consecutive_days',
  INSUFFICIENT_WEEKLY_REST: 'insufficient_weekly_rest',
  BACK_TO_BACK_NIGHTS: 'back_to_back_nights',
  RAPID_SHIFT_ROTATION: 'rapid_shift_rotation',
  
  // Client/Site rules
  CLIENT_RESTRICTION: 'client_restriction',
  SITE_BLACKLIST: 'site_blacklist',
  REQUIRED_PAIRING: 'required_pairing',
  MAX_GUARDS_PER_SITE: 'max_guards_per_site',
  
  // Regulatory
  UNDERAGE_NIGHT_WORK: 'underage_night_work',
  EXCEED_ANNUAL_HOURS: 'exceed_annual_hours',
  MISSING_INDUCTION: 'missing_induction',
  EXPIRED_TRAINING: 'expired_training',
  
  // Quality control
  PREFERENCE_MISMATCH: 'preference_mismatch',
  SKILL_GAP: 'skill_gap',
  LANGUAGE_BARRIER: 'language_barrier',
  TRANSPORT_ISSUE: 'transport_issue',
};

// Conflict severity with business impact
export const ADVANCED_SEVERITY = {
  BLOCKING: 'blocking',       // Cannot proceed - legal/safety
  CRITICAL: 'critical',       // High risk - management approval needed
  WARNING: 'warning',         // Medium risk - can override
  INFO: 'info',              // Low risk - informational only
  RECOMMENDATION: 'recommendation', // Best practice suggestion
};

// Fatigue risk assessment levels
export const FATIGUE_RISK = {
  LOW: { level: 'low', score: 0-30, color: 'green' },
  MODERATE: { level: 'moderate', score: 31-60, color: 'yellow' },
  HIGH: { level: 'high', score: 61-80, color: 'orange' },
  SEVERE: { level: 'severe', score: 81-100, color: 'red' },
};

/**
 * Advanced conflict detection with comprehensive rule checking
 * @param {Object} shift - Shift to validate
 * @param {Object} guard - Guard to assign
 * @param {Array} allShifts - All scheduled shifts
 * @param {Array} guardSchedule - Guard's existing shifts
 * @param {Object} options - Validation options
 * @returns {Object} Detailed conflict report
 */
export const advancedConflictDetection = (
  shift,
  guard,
  allShifts = [],
  guardSchedule = [],
  options = {}
) => {
  const {
    checkFatigue = true,
    checkClientRules = true,
    checkRegulatory = true,
    checkQuality = true,
    strictMode = false,
  } = options;

  const conflicts = {
    blocking: [],
    critical: [],
    warnings: [],
    info: [],
    recommendations: [],
  };

  let fatigueScore = 0;

  // 1. FATIGUE MANAGEMENT RULES
  if (checkFatigue) {
    // 1.1 Excessive consecutive days (max 12 days UK HSE guidance)
    const consecutiveDays = calculateConsecutiveDays(shift, guardSchedule);
    if (consecutiveDays >= 12) {
      conflicts.blocking.push({
        type: ADVANCED_CONFLICT_TYPES.EXCESSIVE_CONSECUTIVE_DAYS,
        message: `Guard has worked ${consecutiveDays} consecutive days (max 12)`,
        severity: ADVANCED_SEVERITY.BLOCKING,
        details: 'UK HSE guidance: Maximum 12 consecutive days without rest',
      });
      fatigueScore += 40;
    } else if (consecutiveDays >= 10) {
      conflicts.warnings.push({
        type: ADVANCED_CONFLICT_TYPES.EXCESSIVE_CONSECUTIVE_DAYS,
        message: `Guard approaching consecutive day limit (${consecutiveDays}/12 days)`,
        severity: ADVANCED_SEVERITY.WARNING,
      });
      fatigueScore += 20;
    }

    // 1.2 Weekly rest period (24 consecutive hours per week)
    const hasWeeklyRest = checkWeeklyRest(shift, guardSchedule);
    if (!hasWeeklyRest) {
      conflicts.critical.push({
        type: ADVANCED_CONFLICT_TYPES.INSUFFICIENT_WEEKLY_REST,
        message: 'Guard has not had 24 consecutive hours rest this week',
        severity: ADVANCED_SEVERITY.CRITICAL,
        details: 'UK Working Time Regulations require 24 hours continuous rest per week',
      });
      fatigueScore += 30;
    }

    // 1.3 Back-to-back night shifts (high fatigue risk)
    const nightShiftCount = countRecentNightShifts(shift, guardSchedule);
    if (isNightShift(shift.startTime) && nightShiftCount >= 5) {
      conflicts.warnings.push({
        type: ADVANCED_CONFLICT_TYPES.BACK_TO_BACK_NIGHTS,
        message: `Guard has worked ${nightShiftCount} night shifts in past 7 days`,
        severity: ADVANCED_SEVERITY.WARNING,
        details: 'Extended night work increases fatigue and error risk',
      });
      fatigueScore += 25;
    }

    // 1.4 Rapid shift rotation (day->night->day within 48h)
    const rapidRotation = detectRapidRotation(shift, guardSchedule);
    if (rapidRotation) {
      conflicts.warnings.push({
        type: ADVANCED_CONFLICT_TYPES.RAPID_SHIFT_ROTATION,
        message: 'Rapid shift rotation detected (circadian disruption risk)',
        severity: ADVANCED_SEVERITY.WARNING,
        details: rapidRotation.details,
      });
      fatigueScore += 20;
    }
  }

  // 2. CLIENT & SITE RULES
  if (checkClientRules) {
    // 2.1 Client-specific restrictions
    const clientRestriction = checkClientRestrictions(shift, guard);
    if (clientRestriction) {
      conflicts.blocking.push({
        type: ADVANCED_CONFLICT_TYPES.CLIENT_RESTRICTION,
        message: clientRestriction.message,
        severity: ADVANCED_SEVERITY.BLOCKING,
      });
    }

    // 2.2 Site blacklist
    const siteBlacklist = checkSiteBlacklist(shift, guard);
    if (siteBlacklist) {
      conflicts.blocking.push({
        type: ADVANCED_CONFLICT_TYPES.SITE_BLACKLIST,
        message: `Guard is blacklisted from site: ${siteBlacklist.reason}`,
        severity: ADVANCED_SEVERITY.BLOCKING,
      });
    }

    // 2.3 Required pairing (buddy system)
    const pairingRequired = checkRequiredPairing(shift, guard, allShifts);
    if (pairingRequired && !pairingRequired.satisfied) {
      conflicts.warnings.push({
        type: ADVANCED_CONFLICT_TYPES.REQUIRED_PAIRING,
        message: `Site requires paired guards: ${pairingRequired.reason}`,
        severity: ADVANCED_SEVERITY.WARNING,
      });
    }

    // 2.4 Site capacity
    const siteCapacity = checkSiteCapacity(shift, allShifts);
    if (siteCapacity.exceeded) {
      conflicts.blocking.push({
        type: ADVANCED_CONFLICT_TYPES.MAX_GUARDS_PER_SITE,
        message: `Site at maximum capacity (${siteCapacity.current}/${siteCapacity.max})`,
        severity: ADVANCED_SEVERITY.BLOCKING,
      });
    }
  }

  // 3. REGULATORY COMPLIANCE
  if (checkRegulatory) {
    // 3.1 Underage night work (18+ required for 00:00-06:00)
    if (guard.dateOfBirth) {
      const age = calculateAge(guard.dateOfBirth);
      if (age < 18 && isNightShift(shift.startTime, '00:00', '06:00')) {
        conflicts.blocking.push({
          type: ADVANCED_CONFLICT_TYPES.UNDERAGE_NIGHT_WORK,
          message: `Guard under 18 cannot work night shifts (current age: ${age})`,
          severity: ADVANCED_SEVERITY.BLOCKING,
          details: 'UK Employment Rights Act 1996: Night work prohibited for under-18s',
        });
      }
    }

    // 3.2 Annual hours limit (2,304 hours = 48hr/week * 48 weeks)
    const annualHours = calculateAnnualHours(guard, allShifts);
    if (annualHours.total >= 2304) {
      conflicts.critical.push({
        type: ADVANCED_CONFLICT_TYPES.EXCEED_ANNUAL_HOURS,
        message: `Annual hours limit reached (${annualHours.total}/2,304)`,
        severity: ADVANCED_SEVERITY.CRITICAL,
        details: 'Working Time Regulations: 48-hour average per week over 17 weeks',
      });
    }

    // 3.3 Site induction required
    const hasInduction = checkSiteInduction(shift, guard);
    if (!hasInduction) {
      conflicts.blocking.push({
        type: ADVANCED_CONFLICT_TYPES.MISSING_INDUCTION,
        message: 'Guard has not completed site induction',
        severity: ADVANCED_SEVERITY.BLOCKING,
        details: 'Health & Safety at Work Act requires site-specific induction',
      });
    }

    // 3.4 Training currency
    const expiredTraining = checkTrainingCurrency(guard);
    if (expiredTraining.length > 0) {
      conflicts.warnings.push({
        type: ADVANCED_CONFLICT_TYPES.EXPIRED_TRAINING,
        message: `Expired training: ${expiredTraining.join(', ')}`,
        severity: ADVANCED_SEVERITY.WARNING,
        details: 'Guard requires refresher training',
      });
    }
  }

  // 4. QUALITY CONTROL CHECKS
  if (checkQuality) {
    // 4.1 Preference mismatch
    const prefMismatch = checkPreferenceMismatch(shift, guard);
    if (prefMismatch) {
      conflicts.recommendations.push({
        type: ADVANCED_CONFLICT_TYPES.PREFERENCE_MISMATCH,
        message: prefMismatch.message,
        severity: ADVANCED_SEVERITY.RECOMMENDATION,
      });
    }

    // 4.2 Skill gap analysis
    const skillGap = analyzeSkillGap(shift, guard);
    if (skillGap.gaps.length > 0) {
      conflicts.warnings.push({
        type: ADVANCED_CONFLICT_TYPES.SKILL_GAP,
        message: `Missing skills: ${skillGap.gaps.join(', ')}`,
        severity: ADVANCED_SEVERITY.WARNING,
        details: 'Guard may require supervision or support',
      });
    }

    // 4.3 Language requirements
    const languageBarrier = checkLanguageRequirements(shift, guard);
    if (languageBarrier) {
      conflicts.warnings.push({
        type: ADVANCED_CONFLICT_TYPES.LANGUAGE_BARRIER,
        message: languageBarrier.message,
        severity: ADVANCED_SEVERITY.WARNING,
      });
    }

    // 4.4 Transport accessibility
    const transportIssue = checkTransportAccessibility(shift, guard);
    if (transportIssue) {
      conflicts.info.push({
        type: ADVANCED_CONFLICT_TYPES.TRANSPORT_ISSUE,
        message: transportIssue.message,
        severity: ADVANCED_SEVERITY.INFO,
      });
    }
  }

  // Calculate overall fatigue risk
  const fatigueRisk = calculateFatigueRisk(fatigueScore);

  // Determine if assignment is valid
  const valid = conflicts.blocking.length === 0 && 
                (strictMode ? conflicts.critical.length === 0 : true);

  return {
    valid,
    conflicts,
    fatigueScore,
    fatigueRisk,
    summary: {
      blocking: conflicts.blocking.length,
      critical: conflicts.critical.length,
      warnings: conflicts.warnings.length,
      info: conflicts.info.length,
      recommendations: conflicts.recommendations.length,
    },
  };
};

// Helper functions

const calculateConsecutiveDays = (shift, guardSchedule) => {
  // Sort shifts by date
  const sorted = [...guardSchedule, shift]
    .sort((a, b) => new Date(a.date) - new Date(b.date));
  
  let consecutive = 1;
  let maxConsecutive = 1;
  
  for (let i = 1; i < sorted.length; i++) {
    const prevDate = new Date(sorted[i - 1].date);
    const currDate = new Date(sorted[i].date);
    const diffDays = (currDate - prevDate) / (1000 * 60 * 60 * 24);
    
    if (diffDays === 1) {
      consecutive++;
      maxConsecutive = Math.max(maxConsecutive, consecutive);
    } else {
      consecutive = 1;
    }
  }
  
  return maxConsecutive;
};

const checkWeeklyRest = (shift, guardSchedule) => {
  // Check if guard has 24 consecutive hours rest in current week
  const weekStart = new Date(shift.date);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  
  const weekShifts = guardSchedule.filter(s => {
    const shiftDate = new Date(s.date);
    return shiftDate >= weekStart;
  }).sort((a, b) => new Date(a.date) - new Date(b.date));
  
  if (weekShifts.length === 0) return true;
  
  // Check gaps between shifts
  for (let i = 0; i < weekShifts.length - 1; i++) {
    const endTime = new Date(`${weekShifts[i].date}T${weekShifts[i].endTime}`);
    const startTime = new Date(`${weekShifts[i + 1].date}T${weekShifts[i + 1].startTime}`);
    const gapHours = (startTime - endTime) / (1000 * 60 * 60);
    
    if (gapHours >= 24) return true;
  }
  
  return false;
};

const isNightShift = (startTime, nightStart = '22:00', nightEnd = '06:00') => {
  const hour = parseInt(startTime.split(':')[0]);
  const nightStartHour = parseInt(nightStart.split(':')[0]);
  const nightEndHour = parseInt(nightEnd.split(':')[0]);
  
  return hour >= nightStartHour || hour < nightEndHour;
};

const countRecentNightShifts = (shift, guardSchedule) => {
  const recentDate = new Date(shift.date);
  recentDate.setDate(recentDate.getDate() - 7);
  
  return guardSchedule.filter(s => {
    const shiftDate = new Date(s.date);
    return shiftDate >= recentDate && isNightShift(s.startTime);
  }).length;
};

const detectRapidRotation = (shift, guardSchedule) => {
  // Check for day->night or night->day within 48 hours
  const recentShifts = guardSchedule
    .filter(s => {
      const diff = Math.abs(new Date(shift.date) - new Date(s.date));
      return diff <= 2 * 24 * 60 * 60 * 1000; // Within 48 hours
    });
  
  for (const recentShift of recentShifts) {
    const currentIsNight = isNightShift(shift.startTime);
    const recentIsNight = isNightShift(recentShift.startTime);
    
    if (currentIsNight !== recentIsNight) {
      return {
        detected: true,
        details: `Switching between ${recentIsNight ? 'night' : 'day'} and ${currentIsNight ? 'night' : 'day'} shifts`,
      };
    }
  }
  
  return null;
};

const checkClientRestrictions = (shift, guard) => {
  // Simulate client restrictions (would query database)
  const restrictions = {
    // 'client-1': ['guard-5'], // Client 1 restricts Guard 5
  };
  
  if (restrictions[shift.clientId]?.includes(guard.$id)) {
    return {
      message: 'Client has restricted this guard from their sites',
      reason: 'Client request',
    };
  }
  
  return null;
};

const checkSiteBlacklist = (shift, guard) => {
  // Simulate site blacklist (would query database)
  return null; // No blacklist in demo
};

const checkRequiredPairing = (shift, guard, allShifts) => {
  // Some sites require two guards working together
  const requiresPairing = shift.requiresPairing || false;
  
  if (!requiresPairing) return null;
  
  const sameTimeShifts = allShifts.filter(s => 
    s.siteId === shift.siteId &&
    s.date === shift.date &&
    s.startTime === shift.startTime &&
    s.guardId !== guard.$id
  );
  
  return {
    satisfied: sameTimeShifts.length > 0,
    reason: 'Site requires paired security presence',
  };
};

const checkSiteCapacity = (shift, allShifts) => {
  const maxCapacity = shift.maxGuards || 10;
  const currentGuards = allShifts.filter(s =>
    s.siteId === shift.siteId &&
    s.date === shift.date &&
    s.startTime === shift.startTime
  ).length;
  
  return {
    max: maxCapacity,
    current: currentGuards,
    exceeded: currentGuards >= maxCapacity,
  };
};

const calculateAge = (dateOfBirth) => {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
};

const calculateAnnualHours = (guard, allShifts) => {
  const yearAgo = new Date();
  yearAgo.setFullYear(yearAgo.getFullYear() - 1);
  
  const yearShifts = allShifts.filter(s =>
    s.guardId === guard.$id &&
    new Date(s.date) >= yearAgo &&
    s.status === 'completed'
  );
  
  const hours = yearShifts.reduce((sum, s) => {
    const [startH] = s.startTime.split(':').map(Number);
    const [endH] = s.endTime.split(':').map(Number);
    let duration = endH - startH;
    if (duration < 0) duration += 24;
    return sum + duration;
  }, 0);
  
  return { total: hours, weeks: 52, average: hours / 52 };
};

const checkSiteInduction = (shift, guard) => {
  // Simulate induction records (would query database)
  // Assume all guards have induction for demo
  return true;
};

const checkTrainingCurrency = (guard) => {
  // Check if training certifications are current
  const expired = [];
  
  if (guard.firstAidExpiry && new Date(guard.firstAidExpiry) < new Date()) {
    expired.push('First Aid');
  }
  
  return expired;
};

const checkPreferenceMismatch = (shift, guard) => {
  if (!guard.preferredShiftTypes) return null;
  
  const shiftType = isNightShift(shift.startTime) ? 'night' : 'day';
  
  if (!guard.preferredShiftTypes.includes(shiftType)) {
    return {
      message: `Guard prefers ${guard.preferredShiftTypes.join('/')} shifts`,
    };
  }
  
  return null;
};

const analyzeSkillGap = (shift, guard) => {
  const required = shift.requiredSkills || [];
  const guardSkills = guard.skills || [];
  
  const gaps = required.filter(skill => !guardSkills.includes(skill));
  
  return { gaps, coverage: ((required.length - gaps.length) / required.length) * 100 };
};

const checkLanguageRequirements = (shift, guard) => {
  // Simulate language requirements
  if (shift.requiresLanguage && !guard.languages?.includes(shift.requiresLanguage)) {
    return {
      message: `Site requires ${shift.requiresLanguage} language skills`,
    };
  }
  
  return null;
};

const checkTransportAccessibility = (shift, guard) => {
  // Check if site is accessible via public transport for night shifts
  if (isNightShift(shift.startTime) && !guard.hasVehicle && !shift.publicTransport24h) {
    return {
      message: 'Limited public transport for night shift - verify guard has transport',
    };
  }
  
  return null;
};

const calculateFatigueRisk = (score) => {
  if (score >= 81) return FATIGUE_RISK.SEVERE;
  if (score >= 61) return FATIGUE_RISK.HIGH;
  if (score >= 31) return FATIGUE_RISK.MODERATE;
  return FATIGUE_RISK.LOW;
};

export default {
  advancedConflictDetection,
  ADVANCED_CONFLICT_TYPES,
  ADVANCED_SEVERITY,
  FATIGUE_RISK,
};
