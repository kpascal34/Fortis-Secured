// Shift lifecycle states
export const SHIFT_STATUS = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  ASSIGNED: 'assigned',
  UNASSIGNED: 'unassigned',
  OFFERED: 'offered',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  CONFIRMED: 'confirmed',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  NO_SHOW: 'no_show',
  CANCELLED: 'cancelled',
  LOCKED: 'locked',
  ARCHIVED: 'archived',
};

export const STATUS_LABELS = {
  [SHIFT_STATUS.DRAFT]: 'Draft',
  [SHIFT_STATUS.PUBLISHED]: 'Published',
  [SHIFT_STATUS.ASSIGNED]: 'Assigned',
  [SHIFT_STATUS.UNASSIGNED]: 'Unassigned',
  [SHIFT_STATUS.OFFERED]: 'Offered',
  [SHIFT_STATUS.ACCEPTED]: 'Accepted',
  [SHIFT_STATUS.REJECTED]: 'Rejected',
  [SHIFT_STATUS.CONFIRMED]: 'Confirmed',
  [SHIFT_STATUS.ACTIVE]: 'Active',
  [SHIFT_STATUS.COMPLETED]: 'Completed',
  [SHIFT_STATUS.NO_SHOW]: 'No Show',
  [SHIFT_STATUS.CANCELLED]: 'Cancelled',
  [SHIFT_STATUS.LOCKED]: 'Locked',
  [SHIFT_STATUS.ARCHIVED]: 'Archived',
};

export const STATUS_COLORS = {
  [SHIFT_STATUS.DRAFT]: 'gray',
  [SHIFT_STATUS.PUBLISHED]: 'blue',
  [SHIFT_STATUS.ASSIGNED]: 'purple',
  [SHIFT_STATUS.UNASSIGNED]: 'yellow',
  [SHIFT_STATUS.OFFERED]: 'cyan',
  [SHIFT_STATUS.ACCEPTED]: 'green',
  [SHIFT_STATUS.REJECTED]: 'red',
  [SHIFT_STATUS.CONFIRMED]: 'green',
  [SHIFT_STATUS.ACTIVE]: 'blue',
  [SHIFT_STATUS.COMPLETED]: 'green',
  [SHIFT_STATUS.NO_SHOW]: 'red',
  [SHIFT_STATUS.CANCELLED]: 'red',
  [SHIFT_STATUS.LOCKED]: 'gray',
  [SHIFT_STATUS.ARCHIVED]: 'gray',
};

// Conflict detection rules
export const CONFLICT_TYPES = {
  DOUBLE_BOOKING: 'double_booking',
  MINIMUM_REST: 'minimum_rest',
  DAILY_HOURS: 'daily_hours',
  WEEKLY_HOURS: 'weekly_hours',
  LEAVE_CONFLICT: 'leave_conflict',
  AVAILABILITY_CONFLICT: 'availability_conflict',
  SKILL_MISMATCH: 'skill_mismatch',
  LICENSE_EXPIRED: 'license_expired',
  LICENSE_EXPIRING: 'license_expiring',
  OVERTIME_RISK: 'overtime_risk',
};

export const CONFLICT_SEVERITY = {
  BLOCKING: 'blocking', // Cannot proceed
  WARNING: 'warning', // Can proceed with override
  INFO: 'info', // FYI only
};

// Compliance states
export const COMPLIANCE_STATUS = {
  VALID: 'valid',
  EXPIRING_SOON: 'expiring_soon',
  EXPIRED: 'expired',
  NOT_VERIFIED: 'not_verified',
  GRACE_PERIOD: 'grace_period',
};

// Working time regulations (UK)
export const WORKING_TIME_RULES = {
  MINIMUM_REST_HOURS: 11, // 11 hours between shifts
  MAX_DAILY_HOURS: 12, // Max 12 hours per day
  MAX_WEEKLY_HOURS: 48, // Max 48 hours per week average
  OVERTIME_THRESHOLD: 40, // 40 hours before overtime kicks in
  GRACE_DAYS_LICENSE: 14, // 14 days grace period for license renewal
};

// Notification types
export const NOTIFICATION_TYPES = {
  SHIFT_PUBLISHED: 'shift_published',
  SHIFT_ASSIGNED: 'shift_assigned',
  SHIFT_CHANGED: 'shift_changed',
  SHIFT_CANCELLED: 'shift_cancelled',
  SHIFT_OFFERED: 'shift_offered',
  SHIFT_REMINDER: 'shift_reminder',
  COMPLIANCE_WARNING: 'compliance_warning',
  COMPLIANCE_EXPIRED: 'compliance_expired',
};

// Validate shift for conflicts
export const validateShift = (shift, guard, allShifts, guardSchedule) => {
  const conflicts = [];
  const warnings = [];
  
  if (!shift || !guard) return { valid: true, conflicts, warnings };

  const shiftStart = new Date(`${shift.date}T${shift.startTime}`);
  const shiftEnd = new Date(`${shift.date}T${shift.endTime}`);
  const shiftDuration = (shiftEnd - shiftStart) / (1000 * 60 * 60);

  // Check license expiry
  if (guard.licenseExpiry || guard.siaExpiryDate) {
    const expiryDate = new Date(guard.licenseExpiry || guard.siaExpiryDate);
    const today = new Date();
    const daysUntilExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiry < 0) {
      conflicts.push({
        type: CONFLICT_TYPES.LICENSE_EXPIRED,
        severity: CONFLICT_SEVERITY.BLOCKING,
        message: `${guard.firstName} ${guard.lastName}'s SIA license expired ${Math.abs(daysUntilExpiry)} days ago`,
      });
    } else if (daysUntilExpiry <= WORKING_TIME_RULES.GRACE_DAYS_LICENSE) {
      warnings.push({
        type: CONFLICT_TYPES.LICENSE_EXPIRING,
        severity: CONFLICT_SEVERITY.WARNING,
        message: `${guard.firstName} ${guard.lastName}'s SIA license expires in ${daysUntilExpiry} days`,
      });
    }
  }

  // Check for double booking (overlapping shifts)
  const guardShifts = allShifts.filter(s => 
    s.assignedGuardId === guard.$id && 
    s.$id !== shift.$id &&
    s.status !== SHIFT_STATUS.CANCELLED &&
    s.status !== SHIFT_STATUS.REJECTED
  );

  for (const existingShift of guardShifts) {
    const existingStart = new Date(`${existingShift.date}T${existingShift.startTime}`);
    const existingEnd = new Date(`${existingShift.date}T${existingShift.endTime}`);

    if (
      (shiftStart >= existingStart && shiftStart < existingEnd) ||
      (shiftEnd > existingStart && shiftEnd <= existingEnd) ||
      (shiftStart <= existingStart && shiftEnd >= existingEnd)
    ) {
      conflicts.push({
        type: CONFLICT_TYPES.DOUBLE_BOOKING,
        severity: CONFLICT_SEVERITY.BLOCKING,
        message: `Overlaps with shift at ${existingShift.siteName} (${existingShift.startTime}-${existingShift.endTime})`,
      });
    }
  }

  // Check minimum rest period
  const sortedShifts = [...guardShifts, { ...shift, date: shift.date, startTime: shift.startTime, endTime: shift.endTime }]
    .sort((a, b) => new Date(`${a.date}T${a.startTime}`) - new Date(`${b.date}T${b.startTime}`));

  for (let i = 0; i < sortedShifts.length - 1; i++) {
    const current = sortedShifts[i];
    const next = sortedShifts[i + 1];
    
    const currentEnd = new Date(`${current.date}T${current.endTime}`);
    const nextStart = new Date(`${next.date}T${next.startTime}`);
    
    const restHours = (nextStart - currentEnd) / (1000 * 60 * 60);
    
    if (restHours < WORKING_TIME_RULES.MINIMUM_REST_HOURS && restHours >= 0) {
      warnings.push({
        type: CONFLICT_TYPES.MINIMUM_REST,
        severity: CONFLICT_SEVERITY.WARNING,
        message: `Only ${restHours.toFixed(1)} hours rest before next shift (minimum ${WORKING_TIME_RULES.MINIMUM_REST_HOURS} hours recommended)`,
      });
    }
  }

  // Check daily hours
  const sameDayShifts = guardShifts.filter(s => s.date === shift.date);
  const totalDailyHours = sameDayShifts.reduce((sum, s) => {
    const start = new Date(`${s.date}T${s.startTime}`);
    const end = new Date(`${s.date}T${s.endTime}`);
    return sum + (end - start) / (1000 * 60 * 60);
  }, 0) + shiftDuration;

  if (totalDailyHours > WORKING_TIME_RULES.MAX_DAILY_HOURS) {
    warnings.push({
      type: CONFLICT_TYPES.DAILY_HOURS,
      severity: CONFLICT_SEVERITY.WARNING,
      message: `Total ${totalDailyHours.toFixed(1)} hours scheduled (max ${WORKING_TIME_RULES.MAX_DAILY_HOURS} hours recommended)`,
    });
  }

  // Check weekly hours
  const shiftDate = new Date(shift.date);
  const weekStart = new Date(shiftDate);
  weekStart.setDate(shiftDate.getDate() - shiftDate.getDay());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);

  const weekShifts = guardShifts.filter(s => {
    const sDate = new Date(s.date);
    return sDate >= weekStart && sDate < weekEnd;
  });

  const totalWeeklyHours = weekShifts.reduce((sum, s) => {
    const start = new Date(`${s.date}T${s.startTime}`);
    const end = new Date(`${s.date}T${s.endTime}`);
    return sum + (end - start) / (1000 * 60 * 60);
  }, 0) + shiftDuration;

  if (totalWeeklyHours > WORKING_TIME_RULES.MAX_WEEKLY_HOURS) {
    warnings.push({
      type: CONFLICT_TYPES.WEEKLY_HOURS,
      severity: CONFLICT_SEVERITY.WARNING,
      message: `Total ${totalWeeklyHours.toFixed(1)} hours this week (max ${WORKING_TIME_RULES.MAX_WEEKLY_HOURS} hours)`,
    });
  }

  if (totalWeeklyHours > WORKING_TIME_RULES.OVERTIME_THRESHOLD) {
    warnings.push({
      type: CONFLICT_TYPES.OVERTIME_RISK,
      severity: CONFLICT_SEVERITY.INFO,
      message: `Overtime triggered: ${(totalWeeklyHours - WORKING_TIME_RULES.OVERTIME_THRESHOLD).toFixed(1)} hours over threshold`,
    });
  }

  return {
    valid: conflicts.length === 0,
    conflicts,
    warnings,
  };
};

// Check compliance status
export const checkComplianceStatus = (guard) => {
  if (!guard) return COMPLIANCE_STATUS.NOT_VERIFIED;

  const licenseExpiry = guard.licenseExpiry || guard.siaExpiryDate;
  if (!licenseExpiry) return COMPLIANCE_STATUS.NOT_VERIFIED;

  const expiryDate = new Date(licenseExpiry);
  const today = new Date();
  const daysUntilExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));

  if (daysUntilExpiry < 0) {
    if (daysUntilExpiry > -WORKING_TIME_RULES.GRACE_DAYS_LICENSE) {
      return COMPLIANCE_STATUS.GRACE_PERIOD;
    }
    return COMPLIANCE_STATUS.EXPIRED;
  }

  if (daysUntilExpiry <= WORKING_TIME_RULES.GRACE_DAYS_LICENSE) {
    return COMPLIANCE_STATUS.EXPIRING_SOON;
  }

  return COMPLIANCE_STATUS.VALID;
};

// Generate notifications for shift changes
export const generateNotification = (type, shift, guard, additionalInfo = {}) => {
  const notifications = {
    [NOTIFICATION_TYPES.SHIFT_PUBLISHED]: {
      title: 'New Shift Published',
      message: `Shift at ${shift.siteName} on ${shift.date} (${shift.startTime}-${shift.endTime})`,
      priority: 'normal',
    },
    [NOTIFICATION_TYPES.SHIFT_ASSIGNED]: {
      title: 'Shift Assigned',
      message: `You have been assigned to ${shift.siteName} on ${shift.date} (${shift.startTime}-${shift.endTime})`,
      priority: 'high',
    },
    [NOTIFICATION_TYPES.SHIFT_CHANGED]: {
      title: 'Shift Updated',
      message: `Your shift at ${shift.siteName} has been updated. Please review the changes.`,
      priority: 'high',
    },
    [NOTIFICATION_TYPES.SHIFT_CANCELLED]: {
      title: 'Shift Cancelled',
      message: `Shift at ${shift.siteName} on ${shift.date} has been cancelled.`,
      priority: 'urgent',
    },
    [NOTIFICATION_TYPES.SHIFT_OFFERED]: {
      title: 'Open Shift Available',
      message: `Open shift at ${shift.siteName} on ${shift.date} (${shift.startTime}-${shift.endTime}). First to accept gets assigned.`,
      priority: 'normal',
    },
    [NOTIFICATION_TYPES.SHIFT_REMINDER]: {
      title: 'Shift Reminder',
      message: `Reminder: You have a shift at ${shift.siteName} starting at ${shift.startTime}`,
      priority: 'normal',
    },
    [NOTIFICATION_TYPES.COMPLIANCE_WARNING]: {
      title: 'License Expiring Soon',
      message: `Your SIA license expires in ${additionalInfo.daysRemaining} days. Please renew.`,
      priority: 'high',
    },
    [NOTIFICATION_TYPES.COMPLIANCE_EXPIRED]: {
      title: 'License Expired',
      message: `Your SIA license has expired. You cannot be assigned new shifts.`,
      priority: 'urgent',
    },
  };

  const notification = notifications[type] || {
    title: 'Notification',
    message: 'You have a new notification',
    priority: 'normal',
  };

  return {
    ...notification,
    type,
    shiftId: shift?.$id,
    guardId: guard?.$id,
    timestamp: new Date().toISOString(),
    read: false,
    ...additionalInfo,
  };
};

// Calculate shift statistics
export const calculateShiftStats = (shifts, guard = null) => {
  const filteredShifts = guard 
    ? shifts.filter(s => s.assignedGuardId === guard.$id)
    : shifts;

  const totalHours = filteredShifts.reduce((sum, shift) => {
    const start = new Date(`${shift.date}T${shift.startTime}`);
    const end = new Date(`${shift.date}T${shift.endTime}`);
    return sum + (end - start) / (1000 * 60 * 60);
  }, 0);

  const completedShifts = filteredShifts.filter(s => s.status === SHIFT_STATUS.COMPLETED);
  const upcomingShifts = filteredShifts.filter(s => {
    const shiftDate = new Date(s.date);
    return shiftDate >= new Date() && s.status !== SHIFT_STATUS.CANCELLED;
  });

  return {
    total: filteredShifts.length,
    completed: completedShifts.length,
    upcoming: upcomingShifts.length,
    totalHours: totalHours.toFixed(1),
    assignedShifts: filteredShifts.filter(s => s.status === SHIFT_STATUS.ASSIGNED).length,
    unassignedShifts: filteredShifts.filter(s => s.status === SHIFT_STATUS.UNASSIGNED).length,
  };
};
