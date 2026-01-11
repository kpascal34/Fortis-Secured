/**
 * Recurring Shift Patterns Library
 * Handles creation, management, and application of recurring shift templates
 */

// Pattern repeat frequencies
export const REPEAT_FREQUENCY = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
  BIWEEKLY: 'biweekly',
  MONTHLY: 'monthly',
  CUSTOM: 'custom',
};

export const FREQUENCY_LABELS = {
  [REPEAT_FREQUENCY.DAILY]: 'Daily',
  [REPEAT_FREQUENCY.WEEKLY]: 'Weekly',
  [REPEAT_FREQUENCY.BIWEEKLY]: 'Every 2 Weeks',
  [REPEAT_FREQUENCY.MONTHLY]: 'Monthly',
  [REPEAT_FREQUENCY.CUSTOM]: 'Custom',
};

// Days of week
export const DAYS_OF_WEEK = {
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
  SUNDAY: 0,
};

export const DAY_LABELS = {
  [DAYS_OF_WEEK.MONDAY]: 'Monday',
  [DAYS_OF_WEEK.TUESDAY]: 'Tuesday',
  [DAYS_OF_WEEK.WEDNESDAY]: 'Wednesday',
  [DAYS_OF_WEEK.THURSDAY]: 'Thursday',
  [DAYS_OF_WEEK.FRIDAY]: 'Friday',
  [DAYS_OF_WEEK.SATURDAY]: 'Saturday',
  [DAYS_OF_WEEK.SUNDAY]: 'Sunday',
};

export const DAY_ABBR = {
  [DAYS_OF_WEEK.MONDAY]: 'Mon',
  [DAYS_OF_WEEK.TUESDAY]: 'Tue',
  [DAYS_OF_WEEK.WEDNESDAY]: 'Wed',
  [DAYS_OF_WEEK.THURSDAY]: 'Thu',
  [DAYS_OF_WEEK.FRIDAY]: 'Fri',
  [DAYS_OF_WEEK.SATURDAY]: 'Sat',
  [DAYS_OF_WEEK.SUNDAY]: 'Sun',
};

// Pattern end conditions
export const END_CONDITION = {
  NEVER: 'never',
  AFTER_OCCURRENCES: 'after_occurrences',
  ON_DATE: 'on_date',
};

/**
 * Create a recurring shift pattern template
 */
export const createPattern = ({
  name,
  description = '',
  frequency,
  interval = 1, // e.g., every 2 weeks
  daysOfWeek = [], // Array of day numbers (0-6)
  startTime,
  endTime,
  clientId,
  siteId,
  positionType = '',
  requiredGuards = 1,
  specialInstructions = '',
  endCondition = END_CONDITION.NEVER,
  occurrences = null,
  endDate = null,
  isActive = true,
}) => {
  return {
    name,
    description,
    frequency,
    interval,
    daysOfWeek: frequency === REPEAT_FREQUENCY.DAILY ? [] : daysOfWeek,
    startTime,
    endTime,
    clientId,
    siteId,
    positionType,
    requiredGuards,
    specialInstructions,
    endCondition,
    occurrences,
    endDate,
    isActive,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
};

/**
 * Validate pattern configuration
 */
export const validatePattern = (pattern) => {
  const errors = [];

  if (!pattern.name || pattern.name.trim().length === 0) {
    errors.push('Pattern name is required');
  }

  if (!pattern.frequency) {
    errors.push('Repeat frequency is required');
  }

  if (!pattern.startTime || !pattern.endTime) {
    errors.push('Start and end times are required');
  }

  if (pattern.startTime && pattern.endTime) {
    const start = new Date(`2000-01-01T${pattern.startTime}`);
    const end = new Date(`2000-01-01T${pattern.endTime}`);
    if (end <= start) {
      errors.push('End time must be after start time');
    }
  }

  if (!pattern.clientId) {
    errors.push('Client is required');
  }

  if (!pattern.siteId) {
    errors.push('Site is required');
  }

  if (pattern.frequency === REPEAT_FREQUENCY.WEEKLY || 
      pattern.frequency === REPEAT_FREQUENCY.BIWEEKLY) {
    if (!pattern.daysOfWeek || pattern.daysOfWeek.length === 0) {
      errors.push('At least one day of the week must be selected');
    }
  }

  if (pattern.interval && (pattern.interval < 1 || pattern.interval > 52)) {
    errors.push('Interval must be between 1 and 52');
  }

  if (pattern.endCondition === END_CONDITION.AFTER_OCCURRENCES) {
    if (!pattern.occurrences || pattern.occurrences < 1) {
      errors.push('Number of occurrences must be at least 1');
    }
  }

  if (pattern.endCondition === END_CONDITION.ON_DATE) {
    if (!pattern.endDate) {
      errors.push('End date is required');
    }
  }

  if (pattern.requiredGuards < 1 || pattern.requiredGuards > 50) {
    errors.push('Required guards must be between 1 and 50');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

/**
 * Generate shift instances from a pattern
 */
export const generateShiftsFromPattern = (pattern, startDate, endDate) => {
  const shifts = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  let currentDate = new Date(start);
  let occurrenceCount = 0;
  const maxOccurrences = pattern.endCondition === END_CONDITION.AFTER_OCCURRENCES 
    ? pattern.occurrences 
    : 1000; // Safety limit

  while (currentDate <= end) {
    // Check end conditions
    if (pattern.endCondition === END_CONDITION.ON_DATE && 
        pattern.endDate && 
        currentDate > new Date(pattern.endDate)) {
      break;
    }

    if (occurrenceCount >= maxOccurrences) {
      break;
    }

    // Generate shifts based on frequency
    let shouldCreateShift = false;

    switch (pattern.frequency) {
      case REPEAT_FREQUENCY.DAILY:
        shouldCreateShift = true;
        break;

      case REPEAT_FREQUENCY.WEEKLY:
      case REPEAT_FREQUENCY.BIWEEKLY:
        const dayOfWeek = currentDate.getDay();
        shouldCreateShift = pattern.daysOfWeek.includes(dayOfWeek);
        break;

      case REPEAT_FREQUENCY.MONTHLY:
        // Create on same day of month as start date
        shouldCreateShift = currentDate.getDate() === start.getDate();
        break;

      default:
        break;
    }

    if (shouldCreateShift) {
      const shift = {
        date: currentDate.toISOString().split('T')[0],
        startTime: pattern.startTime,
        endTime: pattern.endTime,
        clientId: pattern.clientId,
        siteId: pattern.siteId,
        positionType: pattern.positionType,
        requiredGuards: pattern.requiredGuards,
        specialInstructions: pattern.specialInstructions,
        status: 'published',
        patternId: pattern.$id || pattern.id,
        patternName: pattern.name,
        createdFrom: 'pattern',
      };

      shifts.push(shift);
      occurrenceCount++;
    }

    // Advance to next date based on frequency and interval
    switch (pattern.frequency) {
      case REPEAT_FREQUENCY.DAILY:
        currentDate.setDate(currentDate.getDate() + pattern.interval);
        break;

      case REPEAT_FREQUENCY.WEEKLY:
        currentDate.setDate(currentDate.getDate() + 1);
        break;

      case REPEAT_FREQUENCY.BIWEEKLY:
        // For biweekly, we need to track weeks
        const nextDay = new Date(currentDate);
        nextDay.setDate(nextDay.getDate() + 1);
        
        // If we've cycled through all selected days, jump to next period
        if (nextDay.getDay() < currentDate.getDay()) {
          currentDate.setDate(currentDate.getDate() + (7 * (pattern.interval * 2 - 1)) + 1);
        } else {
          currentDate.setDate(currentDate.getDate() + 1);
        }
        break;

      case REPEAT_FREQUENCY.MONTHLY:
        currentDate.setMonth(currentDate.getMonth() + pattern.interval);
        break;

      default:
        currentDate.setDate(currentDate.getDate() + 1);
    }
  }

  return shifts;
};

/**
 * Calculate next occurrence date for a pattern
 */
export const getNextOccurrence = (pattern, fromDate = new Date()) => {
  const current = new Date(fromDate);
  
  switch (pattern.frequency) {
    case REPEAT_FREQUENCY.DAILY:
      current.setDate(current.getDate() + pattern.interval);
      return current;

    case REPEAT_FREQUENCY.WEEKLY:
    case REPEAT_FREQUENCY.BIWEEKLY:
      const multiplier = pattern.frequency === REPEAT_FREQUENCY.BIWEEKLY ? 2 : 1;
      const dayOfWeek = current.getDay();
      const sortedDays = [...pattern.daysOfWeek].sort((a, b) => a - b);
      
      // Find next day in the pattern
      let nextDay = sortedDays.find(d => d > dayOfWeek);
      
      if (nextDay !== undefined) {
        // Next occurrence is this week
        const daysToAdd = nextDay - dayOfWeek;
        current.setDate(current.getDate() + daysToAdd);
      } else {
        // Next occurrence is next week/period
        const firstDay = sortedDays[0];
        const daysToAdd = (7 * pattern.interval * multiplier) - dayOfWeek + firstDay;
        current.setDate(current.getDate() + daysToAdd);
      }
      return current;

    case REPEAT_FREQUENCY.MONTHLY:
      current.setMonth(current.getMonth() + pattern.interval);
      return current;

    default:
      return current;
  }
};

/**
 * Check if pattern is active and within valid date range
 */
export const isPatternActive = (pattern, checkDate = new Date()) => {
  if (!pattern.isActive) return false;

  const check = new Date(checkDate);

  if (pattern.endCondition === END_CONDITION.ON_DATE && pattern.endDate) {
    const end = new Date(pattern.endDate);
    if (check > end) return false;
  }

  return true;
};

/**
 * Get human-readable pattern description
 */
export const getPatternDescription = (pattern) => {
  let desc = `Repeats ${FREQUENCY_LABELS[pattern.frequency].toLowerCase()}`;

  if (pattern.interval > 1) {
    desc += ` (every ${pattern.interval} ${pattern.frequency === REPEAT_FREQUENCY.WEEKLY ? 'weeks' : 'days'})`;
  }

  if (pattern.frequency === REPEAT_FREQUENCY.WEEKLY || 
      pattern.frequency === REPEAT_FREQUENCY.BIWEEKLY) {
    const days = pattern.daysOfWeek
      .map(d => DAY_ABBR[d])
      .join(', ');
    desc += ` on ${days}`;
  }

  desc += ` from ${pattern.startTime} to ${pattern.endTime}`;

  if (pattern.endCondition === END_CONDITION.AFTER_OCCURRENCES) {
    desc += `, ${pattern.occurrences} times`;
  } else if (pattern.endCondition === END_CONDITION.ON_DATE) {
    const endDate = new Date(pattern.endDate).toLocaleDateString();
    desc += `, until ${endDate}`;
  }

  return desc;
};

/**
 * Calculate total shifts that will be generated
 */
export const calculateTotalShifts = (pattern, startDate, endDate) => {
  const shifts = generateShiftsFromPattern(pattern, startDate, endDate);
  return shifts.length;
};

/**
 * Get pattern statistics
 */
export const getPatternStats = (pattern, shifts = []) => {
  const patternShifts = shifts.filter(s => s.patternId === (pattern.$id || pattern.id));
  
  const total = patternShifts.length;
  const assigned = patternShifts.filter(s => s.status === 'assigned').length;
  const unassigned = patternShifts.filter(s => s.status === 'unassigned' || s.status === 'published').length;
  const completed = patternShifts.filter(s => s.status === 'completed').length;

  return {
    total,
    assigned,
    unassigned,
    completed,
    fillRate: total > 0 ? ((assigned / total) * 100).toFixed(1) : 0,
  };
};
