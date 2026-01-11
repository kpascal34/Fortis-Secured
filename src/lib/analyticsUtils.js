/**
 * Analytics & Reporting Utils
 * 
 * Comprehensive analytics and reporting utilities including:
 * - Event Tracking
 * - User Activity Analytics
 * - Module Usage Tracking
 * - Report Generation
 * - Scheduled Exports
 * - Custom Report Templates
 */

// ============================================================================
// Event Tracking
// ============================================================================

/**
 * Event Categories
 */
export const EVENT_CATEGORIES = {
  USER: 'user',
  NAVIGATION: 'navigation',
  MODULE: 'module',
  ACTION: 'action',
  ERROR: 'error',
  PERFORMANCE: 'performance',
  SECURITY: 'security',
};

/**
 * Event Types
 */
export const EVENT_TYPES = {
  // User Events
  USER_LOGIN: 'user_login',
  USER_LOGOUT: 'user_logout',
  USER_SESSION_START: 'user_session_start',
  USER_SESSION_END: 'user_session_end',
  
  // Navigation Events
  PAGE_VIEW: 'page_view',
  MODULE_ACCESS: 'module_access',
  TAB_CHANGE: 'tab_change',
  
  // Module Events
  GUARD_CREATED: 'guard_created',
  GUARD_UPDATED: 'guard_updated',
  GUARD_DELETED: 'guard_deleted',
  CLIENT_CREATED: 'client_created',
  CLIENT_UPDATED: 'client_updated',
  SHIFT_CREATED: 'shift_created',
  SHIFT_ASSIGNED: 'shift_assigned',
  INCIDENT_CREATED: 'incident_created',
  TASK_COMPLETED: 'task_completed',
  ASSET_ASSIGNED: 'asset_assigned',
  REPORT_GENERATED: 'report_generated',
  DATA_EXPORTED: 'data_exported',
  
  // Error Events
  ERROR_OCCURRED: 'error_occurred',
  API_ERROR: 'api_error',
  VALIDATION_ERROR: 'validation_error',
  
  // Performance Events
  LOAD_TIME: 'load_time',
  API_RESPONSE_TIME: 'api_response_time',
};

/**
 * Track an analytics event
 * @param {string} category - Event category
 * @param {string} type - Event type
 * @param {Object} data - Event data
 * @param {Object} user - Current user
 * @returns {Object} - Event object
 */
export const trackEvent = (category, type, data = {}, user = null) => {
  const event = {
    id: generateEventId(),
    timestamp: new Date().toISOString(),
    category,
    type,
    data,
    userId: user?.id || user?.$id,
    userEmail: user?.email,
    userRole: user?.role,
    sessionId: getSessionId(),
    page: window.location.pathname,
    referrer: document.referrer,
    userAgent: navigator.userAgent,
    screenResolution: `${window.screen.width}x${window.screen.height}`,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
  };

  // Store event locally
  storeEvent(event);

  // Send to analytics platform (if configured)
  sendToAnalytics(event);

  return event;
};

/**
 * Generate unique event ID
 * @returns {string}
 */
const generateEventId = () => {
  return `evt_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
};

/**
 * Get or create session ID
 * @returns {string}
 */
const getSessionId = () => {
  let sessionId = sessionStorage.getItem('analytics_session_id');
  if (!sessionId) {
    sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    sessionStorage.setItem('analytics_session_id', sessionId);
  }
  return sessionId;
};

/**
 * Store event in local storage
 * @param {Object} event - Event object
 */
const storeEvent = (event) => {
  try {
    const events = getStoredEvents();
    events.push(event);
    
    // Keep last 1000 events
    if (events.length > 1000) {
      events.splice(0, events.length - 1000);
    }
    
    localStorage.setItem('analytics_events', JSON.stringify(events));
  } catch (error) {
    console.error('Failed to store event:', error);
  }
};

/**
 * Get stored events
 * @returns {Array<Object>}
 */
export const getStoredEvents = () => {
  try {
    const events = localStorage.getItem('analytics_events');
    return events ? JSON.parse(events) : [];
  } catch (error) {
    console.error('Failed to get stored events:', error);
    return [];
  }
};

/**
 * Clear stored events
 */
export const clearStoredEvents = () => {
  localStorage.removeItem('analytics_events');
};

/**
 * Send event to analytics platform
 * @param {Object} event - Event object
 */
const sendToAnalytics = (event) => {
  // Integration with Google Analytics
  if (window.gtag) {
    window.gtag('event', event.type, {
      event_category: event.category,
      event_label: event.data.label || '',
      value: event.data.value || 0,
      user_id: event.userId,
    });
  }

  // Integration with custom analytics API
  const analyticsEndpoint = import.meta.env.VITE_ANALYTICS_ENDPOINT;
  if (analyticsEndpoint) {
    fetch(analyticsEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    }).catch(error => console.error('Analytics API error:', error));
  }
};

// ============================================================================
// User Activity Analytics
// ============================================================================

/**
 * Calculate user activity metrics
 * @param {Array<Object>} events - Events array
 * @param {string} userId - User ID (optional)
 * @returns {Object} - Activity metrics
 */
export const calculateUserActivity = (events, userId = null) => {
  let userEvents = events;
  
  if (userId) {
    userEvents = events.filter(e => e.userId === userId);
  }

  if (userEvents.length === 0) {
    return {
      totalEvents: 0,
      uniqueSessions: 0,
      averageSessionDuration: 0,
      mostActiveHour: null,
      mostActiveDayOfWeek: null,
      eventsByCategory: {},
      eventsByType: {},
    };
  }

  // Group by session
  const sessions = {};
  userEvents.forEach(event => {
    if (!sessions[event.sessionId]) {
      sessions[event.sessionId] = [];
    }
    sessions[event.sessionId].push(event);
  });

  // Calculate session durations
  const sessionDurations = Object.values(sessions).map(sessionEvents => {
    const timestamps = sessionEvents.map(e => new Date(e.timestamp).getTime());
    return Math.max(...timestamps) - Math.min(...timestamps);
  });

  const averageSessionDuration = sessionDurations.reduce((a, b) => a + b, 0) / sessionDurations.length;

  // Events by hour
  const eventsByHour = {};
  userEvents.forEach(event => {
    const hour = new Date(event.timestamp).getHours();
    eventsByHour[hour] = (eventsByHour[hour] || 0) + 1;
  });
  const mostActiveHour = Object.keys(eventsByHour).reduce((a, b) => 
    eventsByHour[a] > eventsByHour[b] ? a : b
  );

  // Events by day of week
  const eventsByDay = {};
  userEvents.forEach(event => {
    const day = new Date(event.timestamp).getDay();
    eventsByDay[day] = (eventsByDay[day] || 0) + 1;
  });
  const mostActiveDayOfWeek = Object.keys(eventsByDay).reduce((a, b) => 
    eventsByDay[a] > eventsByDay[b] ? a : b
  );

  // Events by category
  const eventsByCategory = {};
  userEvents.forEach(event => {
    eventsByCategory[event.category] = (eventsByCategory[event.category] || 0) + 1;
  });

  // Events by type
  const eventsByType = {};
  userEvents.forEach(event => {
    eventsByType[event.type] = (eventsByType[event.type] || 0) + 1;
  });

  return {
    totalEvents: userEvents.length,
    uniqueSessions: Object.keys(sessions).length,
    averageSessionDuration: Math.round(averageSessionDuration / 1000), // seconds
    mostActiveHour: parseInt(mostActiveHour),
    mostActiveDayOfWeek: parseInt(mostActiveDayOfWeek),
    eventsByCategory,
    eventsByType,
  };
};

/**
 * Get activity timeline
 * @param {Array<Object>} events - Events array
 * @param {string} interval - 'hour', 'day', 'week', 'month'
 * @returns {Array<Object>} - Timeline data
 */
export const getActivityTimeline = (events, interval = 'day') => {
  const timeline = {};

  events.forEach(event => {
    const date = new Date(event.timestamp);
    let key;

    switch (interval) {
      case 'hour':
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:00`;
        break;
      case 'day':
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        break;
      case 'week':
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = `${weekStart.getFullYear()}-W${getWeekNumber(weekStart)}`;
        break;
      case 'month':
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        break;
      default:
        key = date.toISOString().split('T')[0];
    }

    if (!timeline[key]) {
      timeline[key] = { date: key, count: 0, events: [] };
    }
    timeline[key].count++;
    timeline[key].events.push(event);
  });

  return Object.values(timeline).sort((a, b) => a.date.localeCompare(b.date));
};

/**
 * Get week number
 * @param {Date} date
 * @returns {number}
 */
const getWeekNumber = (date) => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
};

// ============================================================================
// Module Usage Tracking
// ============================================================================

/**
 * Module names
 */
export const MODULES = {
  DASHBOARD: 'dashboard',
  GUARDS: 'guards',
  CLIENTS: 'clients',
  SCHEDULING: 'scheduling',
  TASKS: 'tasks',
  INCIDENTS: 'incidents',
  ASSETS: 'assets',
  HR: 'hr',
  FINANCE: 'finance',
  REPORTS: 'reports',
  SETTINGS: 'settings',
  USER_MANAGEMENT: 'user_management',
};

/**
 * Track module access
 * @param {string} moduleName - Module name
 * @param {Object} user - Current user
 */
export const trackModuleAccess = (moduleName, user) => {
  trackEvent(EVENT_CATEGORIES.MODULE, EVENT_TYPES.MODULE_ACCESS, {
    module: moduleName,
    timestamp: new Date().toISOString(),
  }, user);
};

/**
 * Get module usage statistics
 * @param {Array<Object>} events - Events array
 * @returns {Object} - Module usage stats
 */
export const getModuleUsageStats = (events) => {
  const moduleEvents = events.filter(e => e.type === EVENT_TYPES.MODULE_ACCESS);

  const usage = {};
  moduleEvents.forEach(event => {
    const module = event.data.module;
    if (!usage[module]) {
      usage[module] = {
        name: module,
        accessCount: 0,
        uniqueUsers: new Set(),
        lastAccessed: null,
      };
    }
    usage[module].accessCount++;
    usage[module].uniqueUsers.add(event.userId);
    
    const eventTime = new Date(event.timestamp);
    if (!usage[module].lastAccessed || eventTime > new Date(usage[module].lastAccessed)) {
      usage[module].lastAccessed = event.timestamp;
    }
  });

  // Convert Sets to counts
  Object.keys(usage).forEach(module => {
    usage[module].uniqueUsers = usage[module].uniqueUsers.size;
  });

  return usage;
};

/**
 * Get popular modules
 * @param {Array<Object>} events - Events array
 * @param {number} limit - Number of results
 * @returns {Array<Object>}
 */
export const getPopularModules = (events, limit = 5) => {
  const usage = getModuleUsageStats(events);
  return Object.values(usage)
    .sort((a, b) => b.accessCount - a.accessCount)
    .slice(0, limit);
};

// ============================================================================
// Report Generation
// ============================================================================

/**
 * Report template types
 */
export const REPORT_TEMPLATES = {
  USER_ACTIVITY: {
    id: 'user_activity',
    name: 'User Activity Report',
    description: 'Detailed user activity and engagement metrics',
    fields: ['totalUsers', 'activeUsers', 'averageSessionDuration', 'topUsers', 'activityTimeline'],
  },
  MODULE_USAGE: {
    id: 'module_usage',
    name: 'Module Usage Report',
    description: 'Module access patterns and popular features',
    fields: ['moduleStats', 'popularModules', 'usageTimeline', 'usersByModule'],
  },
  PERFORMANCE: {
    id: 'performance',
    name: 'Performance Report',
    description: 'System performance metrics and load times',
    fields: ['averageLoadTime', 'apiResponseTimes', 'errorRate', 'performanceTimeline'],
  },
  SECURITY: {
    id: 'security',
    name: 'Security Report',
    description: 'Security events and authentication metrics',
    fields: ['loginAttempts', 'mfaUsage', 'failedLogins', 'securityEvents'],
  },
  OPERATIONS: {
    id: 'operations',
    name: 'Operations Report',
    description: 'Daily operations metrics (guards, shifts, incidents)',
    fields: ['totalGuards', 'activeShifts', 'incidentsCount', 'tasksCompleted'],
  },
  EXECUTIVE: {
    id: 'executive',
    name: 'Executive Summary',
    description: 'High-level overview for management',
    fields: ['keyMetrics', 'trends', 'highlights', 'recommendations'],
  },
};

/**
 * Generate report
 * @param {string} templateId - Report template ID
 * @param {Array<Object>} events - Events array
 * @param {Object} dateRange - { startDate, endDate }
 * @param {Object} options - Additional options
 * @returns {Object} - Report data
 */
export const generateReport = (templateId, events, dateRange = {}, options = {}) => {
  const { startDate, endDate } = dateRange;
  
  // Filter events by date range
  let filteredEvents = events;
  if (startDate) {
    filteredEvents = filteredEvents.filter(e => new Date(e.timestamp) >= new Date(startDate));
  }
  if (endDate) {
    filteredEvents = filteredEvents.filter(e => new Date(e.timestamp) <= new Date(endDate));
  }

  const template = Object.values(REPORT_TEMPLATES).find(t => t.id === templateId);
  if (!template) {
    throw new Error(`Unknown report template: ${templateId}`);
  }

  const report = {
    id: generateReportId(),
    templateId,
    templateName: template.name,
    generatedAt: new Date().toISOString(),
    dateRange: {
      startDate: startDate || null,
      endDate: endDate || null,
    },
    eventCount: filteredEvents.length,
    data: {},
  };

  // Generate data based on template
  switch (templateId) {
    case 'user_activity':
      report.data = generateUserActivityReport(filteredEvents);
      break;
    case 'module_usage':
      report.data = generateModuleUsageReport(filteredEvents);
      break;
    case 'performance':
      report.data = generatePerformanceReport(filteredEvents);
      break;
    case 'security':
      report.data = generateSecurityReport(filteredEvents);
      break;
    case 'operations':
      report.data = generateOperationsReport(filteredEvents);
      break;
    case 'executive':
      report.data = generateExecutiveReport(filteredEvents);
      break;
    default:
      throw new Error(`Report generator not implemented for: ${templateId}`);
  }

  return report;
};

/**
 * Generate report ID
 * @returns {string}
 */
const generateReportId = () => {
  return `rpt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

/**
 * Generate user activity report
 * @param {Array<Object>} events
 * @returns {Object}
 */
const generateUserActivityReport = (events) => {
  const uniqueUsers = new Set(events.map(e => e.userId).filter(Boolean));
  const loginEvents = events.filter(e => e.type === EVENT_TYPES.USER_LOGIN);
  const activityByUser = {};

  events.forEach(event => {
    if (!event.userId) return;
    if (!activityByUser[event.userId]) {
      activityByUser[event.userId] = {
        userId: event.userId,
        userEmail: event.userEmail,
        eventCount: 0,
        sessions: new Set(),
      };
    }
    activityByUser[event.userId].eventCount++;
    activityByUser[event.userId].sessions.add(event.sessionId);
  });

  const topUsers = Object.values(activityByUser)
    .map(u => ({
      userId: u.userId,
      userEmail: u.userEmail,
      eventCount: u.eventCount,
      sessionCount: u.sessions.size,
    }))
    .sort((a, b) => b.eventCount - a.eventCount)
    .slice(0, 10);

  return {
    totalUsers: uniqueUsers.size,
    activeUsers: loginEvents.length,
    averageSessionDuration: calculateUserActivity(events).averageSessionDuration,
    topUsers,
    activityTimeline: getActivityTimeline(events, 'day'),
  };
};

/**
 * Generate module usage report
 * @param {Array<Object>} events
 * @returns {Object}
 */
const generateModuleUsageReport = (events) => {
  const moduleStats = getModuleUsageStats(events);
  const popularModules = getPopularModules(events, 10);
  const usageTimeline = getActivityTimeline(
    events.filter(e => e.type === EVENT_TYPES.MODULE_ACCESS),
    'day'
  );

  return {
    moduleStats,
    popularModules,
    usageTimeline,
    totalModuleAccesses: events.filter(e => e.type === EVENT_TYPES.MODULE_ACCESS).length,
  };
};

/**
 * Generate performance report
 * @param {Array<Object>} events
 * @returns {Object}
 */
const generatePerformanceReport = (events) => {
  const loadTimeEvents = events.filter(e => e.type === EVENT_TYPES.LOAD_TIME);
  const apiEvents = events.filter(e => e.type === EVENT_TYPES.API_RESPONSE_TIME);
  const errorEvents = events.filter(e => e.category === EVENT_CATEGORIES.ERROR);

  const averageLoadTime = loadTimeEvents.length > 0
    ? loadTimeEvents.reduce((sum, e) => sum + (e.data.duration || 0), 0) / loadTimeEvents.length
    : 0;

  const averageApiResponseTime = apiEvents.length > 0
    ? apiEvents.reduce((sum, e) => sum + (e.data.duration || 0), 0) / apiEvents.length
    : 0;

  const errorRate = events.length > 0 ? (errorEvents.length / events.length) * 100 : 0;

  return {
    averageLoadTime: Math.round(averageLoadTime),
    averageApiResponseTime: Math.round(averageApiResponseTime),
    errorRate: errorRate.toFixed(2),
    totalErrors: errorEvents.length,
    performanceTimeline: getActivityTimeline(loadTimeEvents, 'hour'),
  };
};

/**
 * Generate security report
 * @param {Array<Object>} events
 * @returns {Object}
 */
const generateSecurityReport = (events) => {
  const loginEvents = events.filter(e => e.type === EVENT_TYPES.USER_LOGIN);
  const failedLoginEvents = events.filter(e => e.type === 'user_login_failed');
  const mfaEvents = events.filter(e => e.type === 'mfa_verified');
  const securityEvents = events.filter(e => e.category === EVENT_CATEGORIES.SECURITY);

  return {
    loginAttempts: loginEvents.length,
    failedLogins: failedLoginEvents.length,
    successRate: loginEvents.length > 0 
      ? ((loginEvents.length / (loginEvents.length + failedLoginEvents.length)) * 100).toFixed(2)
      : 0,
    mfaUsage: mfaEvents.length,
    securityEvents: securityEvents.length,
    securityTimeline: getActivityTimeline(securityEvents, 'day'),
  };
};

/**
 * Generate operations report
 * @param {Array<Object>} events
 * @returns {Object}
 */
const generateOperationsReport = (events) => {
  const guardEvents = events.filter(e => e.type.includes('guard'));
  const shiftEvents = events.filter(e => e.type.includes('shift'));
  const incidentEvents = events.filter(e => e.type.includes('incident'));
  const taskEvents = events.filter(e => e.type === EVENT_TYPES.TASK_COMPLETED);

  return {
    totalGuards: guardEvents.filter(e => e.type === EVENT_TYPES.GUARD_CREATED).length,
    activeShifts: shiftEvents.filter(e => e.type === EVENT_TYPES.SHIFT_CREATED).length,
    incidentsCount: incidentEvents.filter(e => e.type === EVENT_TYPES.INCIDENT_CREATED).length,
    tasksCompleted: taskEvents.length,
    operationsTimeline: getActivityTimeline(
      [...guardEvents, ...shiftEvents, ...incidentEvents, ...taskEvents],
      'day'
    ),
  };
};

/**
 * Generate executive report
 * @param {Array<Object>} events
 * @returns {Object}
 */
const generateExecutiveReport = (events) => {
  const userActivity = generateUserActivityReport(events);
  const moduleUsage = generateModuleUsageReport(events);
  const performance = generatePerformanceReport(events);
  const operations = generateOperationsReport(events);

  return {
    keyMetrics: {
      totalUsers: userActivity.totalUsers,
      activeUsers: userActivity.activeUsers,
      totalEvents: events.length,
      popularModule: moduleUsage.popularModules[0]?.name || 'N/A',
      errorRate: performance.errorRate,
    },
    trends: {
      activityTrend: calculateTrend(userActivity.activityTimeline),
      moduleTrend: calculateTrend(moduleUsage.usageTimeline),
    },
    highlights: generateHighlights(events),
  };
};

/**
 * Calculate trend
 * @param {Array<Object>} timeline
 * @returns {string} - 'up', 'down', 'stable'
 */
const calculateTrend = (timeline) => {
  if (timeline.length < 2) return 'stable';
  
  const firstHalf = timeline.slice(0, Math.floor(timeline.length / 2));
  const secondHalf = timeline.slice(Math.floor(timeline.length / 2));
  
  const firstAvg = firstHalf.reduce((sum, item) => sum + item.count, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((sum, item) => sum + item.count, 0) / secondHalf.length;
  
  if (secondAvg > firstAvg * 1.1) return 'up';
  if (secondAvg < firstAvg * 0.9) return 'down';
  return 'stable';
};

/**
 * Generate highlights
 * @param {Array<Object>} events
 * @returns {Array<string>}
 */
const generateHighlights = (events) => {
  const highlights = [];
  
  const moduleUsage = getModuleUsageStats(events);
  const topModule = Object.values(moduleUsage).sort((a, b) => b.accessCount - a.accessCount)[0];
  if (topModule) {
    highlights.push(`Most used module: ${topModule.name} (${topModule.accessCount} accesses)`);
  }
  
  const uniqueUsers = new Set(events.map(e => e.userId).filter(Boolean)).size;
  highlights.push(`${uniqueUsers} active users in reporting period`);
  
  const errorEvents = events.filter(e => e.category === EVENT_CATEGORIES.ERROR);
  if (errorEvents.length === 0) {
    highlights.push('Zero errors recorded');
  }
  
  return highlights;
};

// ============================================================================
// Scheduled Exports
// ============================================================================

/**
 * Export schedule configuration
 */
export const EXPORT_SCHEDULES = {
  DAILY: { id: 'daily', name: 'Daily', cron: '0 0 * * *' },
  WEEKLY: { id: 'weekly', name: 'Weekly', cron: '0 0 * * 0' },
  MONTHLY: { id: 'monthly', name: 'Monthly', cron: '0 0 1 * *' },
  CUSTOM: { id: 'custom', name: 'Custom', cron: null },
};

/**
 * Create scheduled export
 * @param {string} templateId - Report template ID
 * @param {string} scheduleId - Schedule ID
 * @param {Object} options - Export options
 * @returns {Object} - Scheduled export config
 */
export const createScheduledExport = (templateId, scheduleId, options = {}) => {
  const schedule = Object.values(EXPORT_SCHEDULES).find(s => s.id === scheduleId);
  if (!schedule) {
    throw new Error(`Unknown schedule: ${scheduleId}`);
  }

  const config = {
    id: `export_${Date.now()}`,
    templateId,
    schedule: scheduleId,
    cron: options.customCron || schedule.cron,
    format: options.format || 'json', // 'json', 'csv', 'pdf'
    recipients: options.recipients || [],
    enabled: options.enabled !== false,
    lastRun: null,
    nextRun: calculateNextRun(options.customCron || schedule.cron),
    createdAt: new Date().toISOString(),
  };

  // Store configuration
  const exports = getScheduledExports();
  exports.push(config);
  localStorage.setItem('scheduled_exports', JSON.stringify(exports));

  return config;
};

/**
 * Get scheduled exports
 * @returns {Array<Object>}
 */
export const getScheduledExports = () => {
  try {
    const exports = localStorage.getItem('scheduled_exports');
    return exports ? JSON.parse(exports) : [];
  } catch (error) {
    console.error('Failed to get scheduled exports:', error);
    return [];
  }
};

/**
 * Update scheduled export
 * @param {string} exportId - Export ID
 * @param {Object} updates - Fields to update
 * @returns {Object} - Updated export config
 */
export const updateScheduledExport = (exportId, updates) => {
  const exports = getScheduledExports();
  const index = exports.findIndex(e => e.id === exportId);
  
  if (index === -1) {
    throw new Error(`Export not found: ${exportId}`);
  }

  exports[index] = { ...exports[index], ...updates };
  localStorage.setItem('scheduled_exports', JSON.stringify(exports));

  return exports[index];
};

/**
 * Delete scheduled export
 * @param {string} exportId - Export ID
 */
export const deleteScheduledExport = (exportId) => {
  const exports = getScheduledExports();
  const filtered = exports.filter(e => e.id !== exportId);
  localStorage.setItem('scheduled_exports', JSON.stringify(filtered));
};

/**
 * Calculate next run time
 * @param {string} cron - Cron expression
 * @returns {string} - ISO timestamp
 */
const calculateNextRun = (cron) => {
  // Simplified cron parser (for demo)
  // In production, use a proper cron library
  const now = new Date();
  
  if (cron === '0 0 * * *') {
    // Daily at midnight
    const next = new Date(now);
    next.setDate(next.getDate() + 1);
    next.setHours(0, 0, 0, 0);
    return next.toISOString();
  } else if (cron === '0 0 * * 0') {
    // Weekly on Sunday
    const next = new Date(now);
    next.setDate(next.getDate() + (7 - next.getDay()));
    next.setHours(0, 0, 0, 0);
    return next.toISOString();
  } else if (cron === '0 0 1 * *') {
    // Monthly on 1st
    const next = new Date(now);
    next.setMonth(next.getMonth() + 1);
    next.setDate(1);
    next.setHours(0, 0, 0, 0);
    return next.toISOString();
  }
  
  return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
};

// ============================================================================
// Export Utilities
// ============================================================================

/**
 * Export report to JSON
 * @param {Object} report - Report object
 * @returns {string} - JSON string
 */
export const exportReportToJSON = (report) => {
  return JSON.stringify(report, null, 2);
};

/**
 * Export report to CSV
 * @param {Object} report - Report object
 * @returns {string} - CSV string
 */
export const exportReportToCSV = (report) => {
  // Convert report data to CSV format
  const lines = [];
  
  // Header
  lines.push(`Report: ${report.templateName}`);
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push(`Event Count: ${report.eventCount}`);
  lines.push('');
  
  // Data sections
  Object.entries(report.data).forEach(([key, value]) => {
    lines.push(key);
    
    if (Array.isArray(value)) {
      // Array data
      if (value.length > 0 && typeof value[0] === 'object') {
        const headers = Object.keys(value[0]);
        lines.push(headers.join(','));
        value.forEach(item => {
          lines.push(headers.map(h => item[h]).join(','));
        });
      } else {
        lines.push(value.join(','));
      }
    } else if (typeof value === 'object') {
      // Object data
      Object.entries(value).forEach(([k, v]) => {
        lines.push(`${k},${v}`);
      });
    } else {
      // Primitive value
      lines.push(String(value));
    }
    
    lines.push('');
  });
  
  return lines.join('\n');
};

/**
 * Download report
 * @param {Object} report - Report object
 * @param {string} format - 'json' or 'csv'
 */
export const downloadReport = (report, format = 'json') => {
  let content, mimeType, extension;
  
  if (format === 'json') {
    content = exportReportToJSON(report);
    mimeType = 'application/json';
    extension = 'json';
  } else if (format === 'csv') {
    content = exportReportToCSV(report);
    mimeType = 'text/csv';
    extension = 'csv';
  } else {
    throw new Error(`Unsupported format: ${format}`);
  }
  
  const filename = `${report.templateId}_${new Date().toISOString().split('T')[0]}.${extension}`;
  
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
