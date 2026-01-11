/**
 * Compliance Alert Utilities
 * Manages license expiry, certifications, training compliance, and HR alerts
 */

/**
 * License types and their validity periods
 */
export const LICENSE_TYPES = {
  security_license: {
    id: 'security_license',
    name: 'Security License',
    validityYears: 3,
    renewalLeadTime: 30, // days before expiry to alert
    color: 'blue',
  },
  sias: {
    id: 'sias',
    name: 'SIA License',
    validityYears: 3,
    renewalLeadTime: 30,
    color: 'blue',
  },
  first_aid: {
    id: 'first_aid',
    name: 'First Aid Certificate',
    validityYears: 3,
    renewalLeadTime: 60,
    color: 'green',
  },
  dbs: {
    id: 'dbs',
    name: 'DBS (Disclosure)',
    validityYears: 3,
    renewalLeadTime: 60,
    color: 'green',
  },
  manual_handling: {
    id: 'manual_handling',
    name: 'Manual Handling',
    validityYears: 2,
    renewalLeadTime: 30,
    color: 'yellow',
  },
  fire_safety: {
    id: 'fire_safety',
    name: 'Fire Safety',
    validityYears: 2,
    renewalLeadTime: 30,
    color: 'yellow',
  },
  conflict_resolution: {
    id: 'conflict_resolution',
    name: 'Conflict Resolution',
    validityYears: 2,
    renewalLeadTime: 30,
    color: 'yellow',
  },
  cctv: {
    id: 'cctv',
    name: 'CCTV Operation',
    validityYears: 2,
    renewalLeadTime: 30,
    color: 'purple',
  },
};

/**
 * Compliance status values
 */
export const COMPLIANCE_STATUS = {
  compliant: { value: 'compliant', label: 'Compliant', color: 'green', icon: 'check' },
  warning: { value: 'warning', label: 'Warning', color: 'yellow', icon: 'warning' },
  expired: { value: 'expired', label: 'Expired', color: 'red', icon: 'alert' },
  missing: { value: 'missing', label: 'Missing', color: 'red', icon: 'alert' },
};

/**
 * Training types and requirements
 */
export const TRAINING_REQUIREMENTS = {
  induction: {
    id: 'induction',
    name: 'Induction Training',
    required: true,
    frequency: 'once',
    hoursRequired: 8,
  },
  annual_refresh: {
    id: 'annual_refresh',
    name: 'Annual Refresh Training',
    required: true,
    frequency: 'yearly',
    hoursRequired: 8,
  },
  incident_response: {
    id: 'incident_response',
    name: 'Incident Response Training',
    required: true,
    frequency: 'yearly',
    hoursRequired: 2,
  },
  security_awareness: {
    id: 'security_awareness',
    name: 'Security Awareness',
    required: true,
    frequency: 'yearly',
    hoursRequired: 1,
  },
  advanced_skills: {
    id: 'advanced_skills',
    name: 'Advanced Skills Training',
    required: false,
    frequency: 'as-needed',
    hoursRequired: 4,
  },
};

/**
 * Check license expiry status
 * @param {Date} expiryDate - License expiry date
 * @param {number} leadTime - Days before expiry to warn (default: 30)
 * @returns {Object} { status: string, daysUntilExpiry: number, isExpired: boolean, isWarning: boolean }
 */
export const checkLicenseExpiry = (expiryDate, leadTime = 30) => {
  if (!expiryDate) {
    return {
      status: 'missing',
      daysUntilExpiry: Infinity,
      isExpired: true,
      isWarning: false,
      message: 'License information missing',
    };
  }

  const expiry = new Date(expiryDate);
  const now = new Date();
  const daysUntilExpiry = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));

  const isExpired = daysUntilExpiry < 0;
  const isWarning = daysUntilExpiry >= 0 && daysUntilExpiry <= leadTime;

  let status = 'compliant';
  let message = `Expires in ${daysUntilExpiry} days`;

  if (isExpired) {
    status = 'expired';
    message = `Expired ${Math.abs(daysUntilExpiry)} days ago`;
  } else if (isWarning) {
    status = 'warning';
    message = `Renewal required in ${daysUntilExpiry} days`;
  }

  return { status, daysUntilExpiry, isExpired, isWarning, message };
};

/**
 * Calculate guard compliance score
 * @param {Object} guard - Guard object with licenses and training
 * @param {Object} requiredLicenses - Required licenses map
 * @returns {Object} { score: number, compliant: boolean, issues: Array }
 */
export const calculateComplianceScore = (guard, requiredLicenses = {}) => {
  const issues = [];
  let completedItems = 0;
  let totalItems = 0;

  // Check required licenses
  const licensesToCheck = Object.keys(requiredLicenses).length > 0
    ? requiredLicenses
    : Object.keys(LICENSE_TYPES).reduce((acc, key) => {
        if (['security_license', 'sias', 'dbs', 'first_aid'].includes(key)) {
          acc[key] = true;
        }
        return acc;
      }, {});

  Object.keys(licensesToCheck).forEach(licenseKey => {
    totalItems++;
    const licenseType = LICENSE_TYPES[licenseKey];
    const guardLicense = guard.licenses?.[licenseKey];

    if (guardLicense && guardLicense.expiryDate) {
      const expiry = checkLicenseExpiry(guardLicense.expiryDate, licenseType?.renewalLeadTime || 30);
      if (expiry.isExpired || expiry.isWarning) {
        issues.push({
          type: 'license',
          license: licenseType?.name || licenseKey,
          severity: expiry.isExpired ? 'critical' : 'warning',
          message: expiry.message,
        });
      } else {
        completedItems++;
      }
    } else {
      issues.push({
        type: 'license',
        license: licenseType?.name || licenseKey,
        severity: 'critical',
        message: `${licenseType?.name || licenseKey} not found`,
      });
    }
  });

  // Check training compliance
  if (guard.trainingRecords) {
    Object.keys(TRAINING_REQUIREMENTS).forEach(trainingKey => {
      const training = TRAINING_REQUIREMENTS[trainingKey];
      if (training.required) {
        totalItems++;
        const guardTraining = guard.trainingRecords?.[trainingKey];

        if (guardTraining && guardTraining.completedDate) {
          const completed = new Date(guardTraining.completedDate);
          const now = new Date();
          
          if (training.frequency === 'yearly') {
            const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
            if (completed >= oneYearAgo) {
              completedItems++;
            } else {
              issues.push({
                type: 'training',
                training: training.name,
                severity: 'warning',
                message: `${training.name} refresh due (last completed: ${completed.toLocaleDateString()})`,
              });
            }
          } else {
            completedItems++;
          }
        } else {
          issues.push({
            type: 'training',
            training: training.name,
            severity: 'critical',
            message: `${training.name} not completed`,
          });
        }
      }
    });
  }

  const score = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
  const compliant = score >= 80 && issues.filter(i => i.severity === 'critical').length === 0;

  return { score, compliant, issues, completedItems, totalItems };
};

/**
 * Generate compliance alert for guard
 * @param {Object} guard - Guard object
 * @param {Object} requiredLicenses - Required licenses map
 * @returns {Object} Alert object or null if compliant
 */
export const generateComplianceAlert = (guard, requiredLicenses = {}) => {
  const compliance = calculateComplianceScore(guard, requiredLicenses);

  if (compliance.compliant) {
    return null; // No alert needed
  }

  const criticalIssues = compliance.issues.filter(i => i.severity === 'critical');
  const warningIssues = compliance.issues.filter(i => i.severity === 'warning');

  let severity = 'warning';
  let title = 'Compliance Warning';

  if (criticalIssues.length > 0) {
    severity = 'critical';
    title = 'Critical Compliance Issue';
  }

  return {
    guardId: guard.$id,
    guardName: `${guard.firstName} ${guard.lastName}`,
    severity,
    title,
    score: compliance.score,
    criticalIssues: criticalIssues.slice(0, 3),
    warningIssues: warningIssues.slice(0, 3),
    allIssues: compliance.issues,
    generatedAt: new Date().toISOString(),
  };
};

/**
 * Get guards requiring compliance attention
 * @param {Array} guards - Array of guard objects
 * @param {Object} requiredLicenses - Required licenses map
 * @returns {Array} Array of guards with compliance issues
 */
export const getComplianceAlerts = (guards = [], requiredLicenses = {}) => {
  return guards
    .map(guard => generateComplianceAlert(guard, requiredLicenses))
    .filter(alert => alert !== null)
    .sort((a, b) => {
      // Sort by severity (critical first) then by score (lowest first)
      if (a.severity === 'critical' && b.severity !== 'critical') return -1;
      if (a.severity !== 'critical' && b.severity === 'critical') return 1;
      return a.score - b.score;
    });
};

/**
 * Calculate total training hours completed by guard
 * @param {Object} guard - Guard object
 * @returns {number} Total training hours
 */
export const calculateTrainingHours = (guard) => {
  if (!guard.trainingRecords) return 0;

  return Object.values(guard.trainingRecords).reduce((total, training) => {
    return total + (training.hoursCompleted || 0);
  }, 0);
};

/**
 * Get upcoming license renewals
 * @param {Array} guards - Array of guard objects
 * @param {number} daysAhead - Look ahead period in days (default: 90)
 * @returns {Array} Array of upcoming renewals
 */
export const getUpcomingRenewals = (guards = [], daysAhead = 90) => {
  const renewals = [];
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() + daysAhead);

  guards.forEach(guard => {
    if (guard.licenses) {
      Object.entries(guard.licenses).forEach(([licenseKey, license]) => {
        if (license.expiryDate) {
          const expiry = new Date(license.expiryDate);
          const now = new Date();

          if (expiry > now && expiry <= cutoffDate) {
            const daysUntilExpiry = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
            renewals.push({
              guardId: guard.$id,
              guardName: `${guard.firstName} ${guard.lastName}`,
              licenseType: LICENSE_TYPES[licenseKey]?.name || licenseKey,
              expiryDate: license.expiryDate,
              daysUntilExpiry,
              priority: daysUntilExpiry <= 30 ? 'high' : 'medium',
            });
          }
        }
      });
    }
  });

  return renewals.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);
};

/**
 * Generate compliance report
 * @param {Array} guards - Array of guard objects
 * @param {Object} requiredLicenses - Required licenses map
 * @returns {Object} Compliance report data
 */
export const generateComplianceReport = (guards = [], requiredLicenses = {}) => {
  const alerts = getComplianceAlerts(guards, requiredLicenses);
  const upcomingRenewals = getUpcomingRenewals(guards, 90);

  const complianceScores = guards.map(guard => {
    const compliance = calculateComplianceScore(guard, requiredLicenses);
    return {
      guardId: guard.$id,
      guardName: `${guard.firstName} ${guard.lastName}`,
      score: compliance.score,
      compliant: compliance.compliant,
    };
  });

  const averageScore = guards.length > 0
    ? Math.round(
        complianceScores.reduce((sum, c) => sum + c.score, 0) / guards.length
      )
    : 0;

  const fullyCompliant = complianceScores.filter(c => c.compliant).length;
  const nonCompliant = complianceScores.filter(c => !c.compliant).length;

  return {
    generatedAt: new Date().toISOString(),
    totalGuards: guards.length,
    fullyCompliant,
    nonCompliant,
    averageScore,
    criticalAlerts: alerts.filter(a => a.severity === 'critical').length,
    warningAlerts: alerts.filter(a => a.severity === 'warning').length,
    upcomingRenewals: upcomingRenewals.length,
    alerts,
    upcomingRenewals,
    complianceScores,
  };
};
