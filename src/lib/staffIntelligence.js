/**
 * Staff Intelligence and Ranking System
 * Calculates guard performance scores and provides intelligent assignment recommendations
 */

import { demoGuards } from '../data/demoGuards';

// Performance metrics weights
export const PERFORMANCE_WEIGHTS = {
  RELIABILITY: 0.30,        // 30% - Show up rate, punctuality
  EXPERIENCE: 0.15,         // 15% - Years of experience
  CERTIFICATIONS: 0.15,     // 15% - Training, licenses
  CLIENT_FEEDBACK: 0.20,    // 20% - Client satisfaction scores
  INCIDENT_RESPONSE: 0.10,  // 10% - Incident handling quality
  CONTINUITY: 0.10,         // 10% - Site familiarity, consistent assignments
};

// Ranking tiers
export const RANKING_TIERS = {
  PLATINUM: { min: 90, label: 'Platinum', color: 'purple', bonus: 2.0 },
  GOLD: { min: 80, label: 'Gold', color: 'yellow', bonus: 1.5 },
  SILVER: { min: 70, label: 'Silver', color: 'gray', bonus: 1.0 },
  BRONZE: { min: 60, label: 'Bronze', color: 'orange', bonus: 0.5 },
  STANDARD: { min: 0, label: 'Standard', color: 'blue', bonus: 0 },
};

/**
 * Calculate comprehensive guard performance score
 * @param {Object} guard - Guard object
 * @param {Array} shiftHistory - Historical shift data
 * @param {Array} incidents - Incident records
 * @param {Array} feedback - Client feedback records
 * @returns {Object} Performance breakdown and total score
 */
export const calculateGuardScore = (guard, shiftHistory = [], incidents = [], feedback = []) => {
  const scores = {};

  // 1. Reliability Score (0-100)
  const totalShifts = shiftHistory.length;
  const completedShifts = shiftHistory.filter(s => s.status === 'completed').length;
  const noShowShifts = shiftHistory.filter(s => s.status === 'no_show').length;
  const lateShifts = shiftHistory.filter(s => s.late === true).length;
  
  scores.reliability = totalShifts > 0
    ? Math.max(0, 100 - (noShowShifts * 10) - (lateShifts * 2))
    : guard.reliability || 85; // Default from profile

  // 2. Experience Score (0-100)
  const experienceYears = guard.experienceYears || 0;
  scores.experience = Math.min(100, 50 + (experienceYears * 5)); // 50 base + 5 per year

  // 3. Certifications Score (0-100)
  const hasValidLicense = guard.siaLicenseExpiry && new Date(guard.siaLicenseExpiry) > new Date();
  const certificationCount = (guard.certifications || []).length;
  scores.certifications = (hasValidLicense ? 50 : 0) + Math.min(50, certificationCount * 10);

  // 4. Client Feedback Score (0-100)
  if (feedback.length > 0) {
    const avgRating = feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length;
    scores.clientFeedback = (avgRating / 5) * 100; // Convert 5-star to 0-100
  } else {
    scores.clientFeedback = guard.clientRating ? (guard.clientRating / 5) * 100 : 80;
  }

  // 5. Incident Response Score (0-100)
  const guardIncidents = incidents.filter(i => i.guardId === guard.$id);
  const wellHandledIncidents = guardIncidents.filter(i => i.handlingQuality === 'excellent').length;
  const poorHandledIncidents = guardIncidents.filter(i => i.handlingQuality === 'poor').length;
  
  if (guardIncidents.length > 0) {
    scores.incidentResponse = Math.max(0, 80 + (wellHandledIncidents * 5) - (poorHandledIncidents * 10));
  } else {
    scores.incidentResponse = 85; // Default for no incidents
  }

  // 6. Continuity Score (0-100)
  const uniqueSites = new Set(shiftHistory.map(s => s.siteId)).size;
  const repeatSites = shiftHistory.length - uniqueSites;
  scores.continuity = Math.min(100, 60 + (repeatSites * 2));

  // Calculate weighted total
  const totalScore = 
    scores.reliability * PERFORMANCE_WEIGHTS.RELIABILITY +
    scores.experience * PERFORMANCE_WEIGHTS.EXPERIENCE +
    scores.certifications * PERFORMANCE_WEIGHTS.CERTIFICATIONS +
    scores.clientFeedback * PERFORMANCE_WEIGHTS.CLIENT_FEEDBACK +
    scores.incidentResponse * PERFORMANCE_WEIGHTS.INCIDENT_RESPONSE +
    scores.continuity * PERFORMANCE_WEIGHTS.CONTINUITY;

  return {
    totalScore: Math.round(totalScore),
    breakdown: scores,
    tier: getTier(totalScore),
  };
};

/**
 * Get ranking tier for a score
 */
export const getTier = (score) => {
  if (score >= RANKING_TIERS.PLATINUM.min) return RANKING_TIERS.PLATINUM;
  if (score >= RANKING_TIERS.GOLD.min) return RANKING_TIERS.GOLD;
  if (score >= RANKING_TIERS.SILVER.min) return RANKING_TIERS.SILVER;
  if (score >= RANKING_TIERS.BRONZE.min) return RANKING_TIERS.BRONZE;
  return RANKING_TIERS.STANDARD;
};

/**
 * Rank guards for a specific shift with intelligent scoring
 * @param {Array} guards - Available guards
 * @param {Object} shift - Shift to assign
 * @param {Array} allShifts - All scheduled shifts
 * @param {Object} options - Ranking options
 * @returns {Array} Ranked guards with scores
 */
export const rankGuardsForShift = (guards, shift, allShifts = [], options = {}) => {
  const {
    prioritizeSiteExperience = true,
    balanceHours = true,
    preferHighRanking = true,
    considerAvailability = true,
  } = options;

  return guards.map(guard => {
    let shiftScore = 0;
    const factors = [];

    // Base performance score (0-50 points)
    const performance = calculateGuardScore(guard, [], [], []);
    const baseScore = (performance.totalScore / 100) * 50;
    shiftScore += baseScore;
    factors.push({ label: 'Performance Rating', points: Math.round(baseScore), max: 50 });

    // Site experience (0-20 points)
    if (prioritizeSiteExperience) {
      const siteShifts = allShifts.filter(s => 
        s.siteId === shift.siteId && 
        s.guardId === guard.$id &&
        s.status === 'completed'
      );
      const sitePoints = Math.min(20, siteShifts.length * 4);
      shiftScore += sitePoints;
      if (sitePoints > 0) {
        factors.push({ label: 'Site Experience', points: sitePoints, max: 20 });
      }
    }

    // Hour balancing (0-15 points - prefer guards with fewer hours)
    if (balanceHours) {
      const guardShifts = allShifts.filter(s => 
        s.guardId === guard.$id && 
        ['confirmed', 'active'].includes(s.status)
      );
      const guardHours = guardShifts.reduce((sum, s) => {
        const duration = calculateShiftDuration(s.startTime, s.endTime);
        return sum + duration;
      }, 0);
      
      // Inverse scoring - fewer hours = more points
      const avgHours = 40; // Weekly average target
      const balancePoints = guardHours < avgHours 
        ? Math.min(15, (avgHours - guardHours) / 2)
        : Math.max(0, 15 - ((guardHours - avgHours) / 2));
      
      shiftScore += balancePoints;
      factors.push({ 
        label: 'Hour Balance', 
        points: Math.round(balancePoints), 
        max: 15,
        meta: `${guardHours}h scheduled`
      });
    }

    // Tier bonus (0-10 points)
    if (preferHighRanking) {
      const tierBonus = performance.tier.bonus * 5; // Max 10 points for Platinum
      shiftScore += tierBonus;
      factors.push({ 
        label: `${performance.tier.label} Tier Bonus`, 
        points: Math.round(tierBonus), 
        max: 10 
      });
    }

    // Availability bonus (0-5 points)
    if (considerAvailability && guard.preferredShiftTypes) {
      const shiftType = getShiftType(shift.startTime);
      if (guard.preferredShiftTypes.includes(shiftType)) {
        shiftScore += 5;
        factors.push({ label: 'Preferred Shift Type', points: 5, max: 5 });
      }
    }

    return {
      guard,
      score: Math.round(shiftScore),
      maxScore: 100,
      percentage: Math.round((shiftScore / 100) * 100),
      factors,
      performance,
      recommended: shiftScore >= 70,
    };
  }).sort((a, b) => b.score - a.score);
};

/**
 * Calculate shift duration in hours
 */
const calculateShiftDuration = (startTime, endTime) => {
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  let hours = endH - startH;
  if (hours < 0) hours += 24;
  return hours + (endM - startM) / 60;
};

/**
 * Determine shift type from start time
 */
const getShiftType = (startTime) => {
  const hour = parseInt(startTime.split(':')[0]);
  if (hour >= 6 && hour < 14) return 'morning';
  if (hour >= 14 && hour < 22) return 'afternoon';
  return 'night';
};

/**
 * Balance weekly hours across team
 * @param {Array} guards - Available guards
 * @param {Array} allShifts - Current scheduled shifts
 * @param {number} targetHours - Target weekly hours per guard
 * @returns {Object} Hour distribution analysis
 */
export const analyzeHourBalance = (guards, allShifts, targetHours = 40) => {
  const guardHours = {};
  
  guards.forEach(guard => {
    const shifts = allShifts.filter(s => 
      s.guardId === guard.$id && 
      ['confirmed', 'active', 'published'].includes(s.status)
    );
    
    const hours = shifts.reduce((sum, s) => {
      return sum + calculateShiftDuration(s.startTime, s.endTime);
    }, 0);
    
    guardHours[guard.$id] = {
      guard,
      hours,
      shifts: shifts.length,
      variance: hours - targetHours,
      percentage: targetHours > 0 ? Math.round((hours / targetHours) * 100) : 0,
    };
  });

  const totalHours = Object.values(guardHours).reduce((sum, g) => sum + g.hours, 0);
  const avgHours = guards.length > 0 ? totalHours / guards.length : 0;
  const maxVariance = Math.max(...Object.values(guardHours).map(g => Math.abs(g.variance)));

  return {
    guardHours,
    totalHours,
    avgHours: Math.round(avgHours * 10) / 10,
    targetHours,
    maxVariance: Math.round(maxVariance * 10) / 10,
    balanced: maxVariance <= 8, // Within 8 hours of target
    underutilized: Object.values(guardHours).filter(g => g.hours < targetHours * 0.8),
    overutilized: Object.values(guardHours).filter(g => g.hours > targetHours * 1.2),
  };
};

/**
 * Get performance trends over time
 * @param {Object} guard - Guard object
 * @param {Array} historicalScores - Past performance scores with timestamps
 * @returns {Object} Trend analysis
 */
export const getPerformanceTrend = (guard, historicalScores = []) => {
  if (historicalScores.length < 2) {
    return { trend: 'stable', change: 0, message: 'Insufficient data' };
  }

  const recent = historicalScores.slice(-3); // Last 3 periods
  const older = historicalScores.slice(-6, -3); // Previous 3 periods

  const recentAvg = recent.reduce((sum, s) => sum + s.score, 0) / recent.length;
  const olderAvg = older.length > 0 
    ? older.reduce((sum, s) => sum + s.score, 0) / older.length 
    : recentAvg;

  const change = recentAvg - olderAvg;

  let trend, message;
  if (change > 5) {
    trend = 'improving';
    message = `Performance up ${Math.round(change)} points`;
  } else if (change < -5) {
    trend = 'declining';
    message = `Performance down ${Math.round(Math.abs(change))} points`;
  } else {
    trend = 'stable';
    message = 'Consistent performance';
  }

  return { trend, change: Math.round(change), message, recentAvg, olderAvg };
};

/**
 * Suggest optimal guard for emergency shift fill
 * @param {Object} shift - Urgent shift to fill
 * @param {Array} availableGuards - Guards not already scheduled
 * @param {Array} allShifts - All scheduled shifts
 * @returns {Object} Best guard with reasoning
 */
export const suggestEmergencyFill = (shift, availableGuards, allShifts) => {
  const ranked = rankGuardsForShift(availableGuards, shift, allShifts, {
    prioritizeSiteExperience: true,
    balanceHours: false, // Don't care about balance in emergency
    preferHighRanking: true,
    considerAvailability: true,
  });

  // Add emergency-specific factors
  const withEmergencyScoring = ranked.map(r => {
    let emergencyScore = r.score;
    const emergencyFactors = [...r.factors];

    // Proximity to site (simulated - would use real geolocation)
    const proximity = Math.random() * 20; // 0-20 points
    emergencyScore += proximity;
    emergencyFactors.push({ 
      label: 'Estimated Travel Time', 
      points: Math.round(proximity), 
      max: 20,
      meta: `~${Math.round(30 - proximity)}min`
    });

    // Recent activity (prefer guards who've worked recently)
    const recentShifts = allShifts.filter(s => 
      s.guardId === r.guard.$id && 
      new Date(s.date) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    ).length;
    const activityPoints = Math.min(10, recentShifts * 2);
    emergencyScore += activityPoints;
    emergencyFactors.push({ 
      label: 'Recent Activity', 
      points: activityPoints, 
      max: 10 
    });

    return {
      ...r,
      emergencyScore: Math.round(emergencyScore),
      emergencyFactors,
    };
  }).sort((a, b) => b.emergencyScore - a.emergencyScore);

  const best = withEmergencyScoring[0];

  return {
    guard: best.guard,
    score: best.emergencyScore,
    confidence: best.emergencyScore >= 80 ? 'high' : best.emergencyScore >= 60 ? 'medium' : 'low',
    reasoning: best.emergencyFactors,
    alternatives: withEmergencyScoring.slice(1, 4), // Top 3 alternatives
  };
};

/**
 * Generate demo performance data for guards
 */
export const generateDemoPerformanceData = () => {
  return demoGuards.map(guard => {
    const performance = calculateGuardScore(guard, [], [], []);
    return {
      guardId: guard.$id,
      guardName: `${guard.firstName} ${guard.lastName}`,
      ...performance,
      hoursThisWeek: Math.round(Math.random() * 48),
      shiftsThisWeek: Math.round(Math.random() * 6),
      lastShift: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
    };
  });
};

export default {
  calculateGuardScore,
  getTier,
  rankGuardsForShift,
  analyzeHourBalance,
  getPerformanceTrend,
  suggestEmergencyFill,
  generateDemoPerformanceData,
  PERFORMANCE_WEIGHTS,
  RANKING_TIERS,
};
