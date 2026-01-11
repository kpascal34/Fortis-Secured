/**
 * Feature Flag Configuration
 * Controls visibility and accessibility of app modules
 * 
 * During scaling phases, set flags to false to hide/restrict modules
 * Code and DB structures remain intact for future re-enablement
 */

export const FEATURES = {
  // Core always-on
  DASHBOARD: true,
  PROFILE: true,

  // Enabled modules
  COMPLIANCE: true,
  SCHEDULING: true,

  // Disabled by default (scaling back)
  CRM: false,
  CLIENTS: false,
  SITES: false,
  POSTS: false,
  GUARDS: false,
  TIME_TRACKING: false,
  TASKS: false,
  INCIDENTS: false,
  ASSETS: false,
  MESSAGES: false,
  FINANCE: false,
  PAYROLL: false,
  REPORTS: false,
  ANALYTICS: false,
  AUDIT_LOG: false,
  AI_ASSISTANT: false,
  USER_MANAGEMENT: false,
  SETTINGS: false,
  RECURRING_PATTERNS: false,
  MY_SCHEDULE: false,
  OPEN_SHIFTS: false,
  SHIFT_APPLICATIONS: false,
};

/**
 * Check if a feature is enabled
 */
export function isFeatureEnabled(feature: keyof typeof FEATURES): boolean {
  return FEATURES[feature] ?? false;
}

/**
 * Get all enabled module names
 */
export function getEnabledModules(): string[] {
  return Object.entries(FEATURES)
    .filter(([_, enabled]) => enabled)
    .map(([key]) => key);
}
