/**
 * Bulk Shift Operations
 * Mass operations for efficient schedule management
 */

import { ID } from 'appwrite';
import { SHIFT_STATUS } from './scheduleUtils';
import { createAuditLog, AUDIT_CATEGORY, AUDIT_ACTION } from './auditLog';

/**
 * Delete shifts by date range
 * @param {Array} shifts - All shifts
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @param {Object} filters - Additional filters (siteId, guardId, status)
 * @returns {Object} Operation result
 */
export const bulkDeleteShifts = async (shifts, startDate, endDate, filters = {}) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  const toDelete = shifts.filter(shift => {
    const shiftDate = new Date(shift.date);
    
    // Date range check
    if (shiftDate < start || shiftDate > end) return false;
    
    // Apply filters
    if (filters.siteId && shift.siteId !== filters.siteId) return false;
    if (filters.guardId && shift.guardId !== filters.guardId) return false;
    if (filters.status && shift.status !== filters.status) return false;
    
    // Don't delete completed or locked shifts by default
    if (!filters.includeCompleted && shift.status === SHIFT_STATUS.COMPLETED) return false;
    if (!filters.includeLocked && shift.status === SHIFT_STATUS.LOCKED) return false;
    
    return true;
  });
  
  // Audit log
  await createAuditLog({
    category: AUDIT_CATEGORY.SCHEDULE,
    action: AUDIT_ACTION.BULK_DELETE,
    description: `Bulk deleted ${toDelete.length} shifts from ${startDate} to ${endDate}`,
    metadata: {
      count: toDelete.length,
      startDate,
      endDate,
      filters,
      shiftIds: toDelete.map(s => s.$id),
    },
  });
  
  return {
    success: true,
    deleted: toDelete.length,
    shifts: toDelete,
  };
};

/**
 * Copy shifts to a new date range
 * @param {Array} shifts - Shifts to copy
 * @param {string} sourceStart - Source start date
 * @param {string} sourceEnd - Source end date
 * @param {string} targetStart - Target start date
 * @param {Object} options - Copy options
 * @returns {Object} Operation result
 */
export const bulkCopyShifts = async (shifts, sourceStart, sourceEnd, targetStart, options = {}) => {
  const {
    copySiteId = null,
    copyGuardId = null,
    clearAssignments = false,
    adjustStatus = true,
  } = options;
  
  const sourceStartDate = new Date(sourceStart);
  const sourceEndDate = new Date(sourceEnd);
  const targetStartDate = new Date(targetStart);
  
  // Calculate date offset
  const offsetDays = Math.floor((targetStartDate - sourceStartDate) / (1000 * 60 * 60 * 24));
  
  // Filter source shifts
  const sourceshifts = shifts.filter(shift => {
    const shiftDate = new Date(shift.date);
    if (shiftDate < sourceStartDate || shiftDate > sourceEndDate) return false;
    if (copySiteId && shift.siteId !== copySiteId) return false;
    if (copyGuardId && shift.guardId !== copyGuardId) return false;
    return true;
  });
  
  // Create copied shifts
  const copiedShifts = sourceshifts.map(shift => {
    const originalDate = new Date(shift.date);
    const newDate = new Date(originalDate);
    newDate.setDate(originalDate.getDate() + offsetDays);
    
    const newShift = {
      ...shift,
      $id: ID.unique(),
      date: newDate.toISOString().split('T')[0],
      status: adjustStatus ? SHIFT_STATUS.DRAFT : shift.status,
      $createdAt: new Date().toISOString(),
      copiedFrom: shift.$id,
    };
    
    // Clear assignments if requested
    if (clearAssignments) {
      delete newShift.guardId;
      delete newShift.guardName;
      newShift.status = SHIFT_STATUS.UNASSIGNED;
    }
    
    return newShift;
  });
  
  // Audit log
  await createAuditLog({
    category: AUDIT_CATEGORY.SCHEDULE,
    action: AUDIT_ACTION.BULK_CREATE,
    description: `Bulk copied ${copiedShifts.length} shifts from ${sourceStart} to ${targetStart}`,
    metadata: {
      count: copiedShifts.length,
      sourceStart,
      sourceEnd,
      targetStart,
      offsetDays,
      clearAssignments,
    },
  });
  
  return {
    success: true,
    copied: copiedShifts.length,
    shifts: copiedShifts,
  };
};

/**
 * Create recurring shifts based on template
 * @param {Object} template - Shift template
 * @param {string} startDate - Start date
 * @param {string} endDate - End date
 * @param {Object} recurrence - Recurrence pattern
 * @returns {Object} Operation result
 */
export const createRecurringShifts = async (template, startDate, endDate, recurrence) => {
  const {
    frequency = 'daily', // daily, weekly, biweekly, monthly
    interval = 1,        // Every N days/weeks/months
    daysOfWeek = [],    // For weekly: [0-6] Sunday=0
    dayOfMonth = 1,     // For monthly
    excludeDates = [],  // Dates to skip
  } = recurrence;
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  const recurring = [];
  
  let currentDate = new Date(start);
  
  while (currentDate <= end) {
    const dateStr = currentDate.toISOString().split('T')[0];
    
    // Check if date is excluded
    if (!excludeDates.includes(dateStr)) {
      let includeDate = false;
      
      if (frequency === 'daily') {
        includeDate = true;
      } else if (frequency === 'weekly') {
        includeDate = daysOfWeek.includes(currentDate.getDay());
      } else if (frequency === 'biweekly') {
        const weeksDiff = Math.floor((currentDate - start) / (7 * 24 * 60 * 60 * 1000));
        includeDate = weeksDiff % 2 === 0 && daysOfWeek.includes(currentDate.getDay());
      } else if (frequency === 'monthly') {
        includeDate = currentDate.getDate() === dayOfMonth;
      }
      
      if (includeDate) {
        recurring.push({
          ...template,
          $id: ID.unique(),
          date: dateStr,
          status: SHIFT_STATUS.DRAFT,
          $createdAt: new Date().toISOString(),
          recurring: true,
          recurrenceId: template.recurrenceId || ID.unique(),
        });
      }
    }
    
    // Increment date based on interval
    if (frequency === 'daily') {
      currentDate.setDate(currentDate.getDate() + interval);
    } else if (frequency === 'weekly' || frequency === 'biweekly') {
      currentDate.setDate(currentDate.getDate() + 1);
    } else if (frequency === 'monthly') {
      currentDate.setMonth(currentDate.getMonth() + interval);
    }
  }
  
  // Audit log
  await createAuditLog({
    category: AUDIT_CATEGORY.SCHEDULE,
    action: AUDIT_ACTION.BULK_CREATE,
    description: `Created ${recurring.length} recurring shifts (${frequency})`,
    metadata: {
      count: recurring.length,
      frequency,
      interval,
      startDate,
      endDate,
      template: {
        siteId: template.siteId,
        startTime: template.startTime,
        endTime: template.endTime,
      },
    },
  });
  
  return {
    success: true,
    created: recurring.length,
    shifts: recurring,
    recurrenceId: recurring[0]?.recurrenceId,
  };
};

/**
 * Bulk update shift properties
 * @param {Array} shifts - Shifts to update
 * @param {Array} shiftIds - IDs of shifts to update
 * @param {Object} updates - Properties to update
 * @returns {Object} Operation result
 */
export const bulkUpdateShifts = async (shifts, shiftIds, updates) => {
  const updated = shifts
    .filter(shift => shiftIds.includes(shift.$id))
    .map(shift => ({
      ...shift,
      ...updates,
      $updatedAt: new Date().toISOString(),
    }));
  
  // Audit log
  await createAuditLog({
    category: AUDIT_CATEGORY.SCHEDULE,
    action: AUDIT_ACTION.BULK_UPDATE,
    description: `Bulk updated ${updated.length} shifts`,
    metadata: {
      count: updated.length,
      updates: Object.keys(updates),
      shiftIds,
    },
  });
  
  return {
    success: true,
    updated: updated.length,
    shifts: updated,
  };
};

/**
 * Bulk assign guards to shifts
 * @param {Array} shifts - Shifts to assign
 * @param {Array} assignments - Array of {shiftId, guardId, guardName}
 * @returns {Object} Operation result
 */
export const bulkAssignGuards = async (shifts, assignments) => {
  const assigned = [];
  const failed = [];
  
  for (const assignment of assignments) {
    const shift = shifts.find(s => s.$id === assignment.shiftId);
    
    if (!shift) {
      failed.push({ ...assignment, reason: 'Shift not found' });
      continue;
    }
    
    assigned.push({
      ...shift,
      guardId: assignment.guardId,
      guardName: assignment.guardName,
      status: SHIFT_STATUS.ASSIGNED,
      assignedAt: new Date().toISOString(),
    });
  }
  
  // Audit log
  await createAuditLog({
    category: AUDIT_CATEGORY.SCHEDULE,
    action: AUDIT_ACTION.BULK_UPDATE,
    description: `Bulk assigned guards to ${assigned.length} shifts`,
    metadata: {
      succeeded: assigned.length,
      failed: failed.length,
      assignments: assignments.map(a => ({ shiftId: a.shiftId, guardId: a.guardId })),
    },
  });
  
  return {
    success: failed.length === 0,
    assigned: assigned.length,
    failed: failed.length,
    shifts: assigned,
    errors: failed,
  };
};

/**
 * Bulk publish shifts
 * @param {Array} shifts - Shifts to publish
 * @param {Array} shiftIds - IDs of shifts to publish
 * @param {Object} options - Publish options
 * @returns {Object} Operation result
 */
export const bulkPublishShifts = async (shifts, shiftIds, options = {}) => {
  const {
    notifyGuards = true,
    requireAssignment = false,
  } = options;
  
  const toPublish = shifts.filter(shift => {
    if (!shiftIds.includes(shift.$id)) return false;
    if (requireAssignment && !shift.guardId) return false;
    return true;
  });
  
  const published = toPublish.map(shift => ({
    ...shift,
    status: shift.guardId ? SHIFT_STATUS.PUBLISHED : SHIFT_STATUS.OFFERED,
    publishedAt: new Date().toISOString(),
  }));
  
  // Audit log
  await createAuditLog({
    category: AUDIT_CATEGORY.SCHEDULE,
    action: AUDIT_ACTION.SHIFT_PUBLISHED,
    description: `Bulk published ${published.length} shifts`,
    metadata: {
      count: published.length,
      notifyGuards,
      shiftIds: published.map(s => s.$id),
    },
  });
  
  return {
    success: true,
    published: published.length,
    shifts: published,
    notifications: notifyGuards ? published.filter(s => s.guardId).length : 0,
  };
};

/**
 * Auto-fill shifts using intelligent assignment
 * @param {Array} unassignedShifts - Shifts needing guards
 * @param {Array} availableGuards - Guards available for assignment
 * @param {Function} rankingFunction - Function to rank guards for shifts
 * @returns {Object} Operation result
 */
export const autoFillShifts = async (unassignedShifts, availableGuards, rankingFunction) => {
  const assignments = [];
  const failed = [];
  
  for (const shift of unassignedShifts) {
    // Get ranked guards for this shift
    const ranked = rankingFunction(availableGuards, shift);
    
    // Try to assign top-ranked guard
    const bestGuard = ranked.find(r => r.recommended);
    
    if (bestGuard) {
      assignments.push({
        ...shift,
        guardId: bestGuard.guard.$id,
        guardName: `${bestGuard.guard.firstName} ${bestGuard.guard.lastName}`,
        status: SHIFT_STATUS.ASSIGNED,
        assignedAt: new Date().toISOString(),
        autoAssigned: true,
        assignmentScore: bestGuard.score,
      });
      
      // Remove guard from available pool (avoid double-booking)
      availableGuards = availableGuards.filter(g => g.$id !== bestGuard.guard.$id);
    } else {
      failed.push({
        shift,
        reason: 'No suitable guards available',
      });
    }
  }
  
  // Audit log
  await createAuditLog({
    category: AUDIT_CATEGORY.SCHEDULE,
    action: AUDIT_ACTION.BULK_UPDATE,
    description: `Auto-filled ${assignments.length} shifts using intelligent assignment`,
    metadata: {
      succeeded: assignments.length,
      failed: failed.length,
      averageScore: assignments.reduce((sum, a) => sum + a.assignmentScore, 0) / assignments.length,
    },
  });
  
  return {
    success: failed.length === 0,
    assigned: assignments.length,
    failed: failed.length,
    shifts: assignments,
    errors: failed,
  };
};

/**
 * Generate shift report for date range
 * @param {Array} shifts - All shifts
 * @param {string} startDate - Start date
 * @param {string} endDate - End date
 * @returns {Object} Report data
 */
export const generateShiftReport = (shifts, startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  const rangeShifts = shifts.filter(shift => {
    const shiftDate = new Date(shift.date);
    return shiftDate >= start && shiftDate <= end;
  });
  
  const stats = {
    total: rangeShifts.length,
    byStatus: {},
    bySite: {},
    byGuard: {},
    totalHours: 0,
    fillRate: 0,
  };
  
  rangeShifts.forEach(shift => {
    // By status
    stats.byStatus[shift.status] = (stats.byStatus[shift.status] || 0) + 1;
    
    // By site
    const siteName = shift.siteName || 'Unknown';
    stats.bySite[siteName] = (stats.bySite[siteName] || 0) + 1;
    
    // By guard
    if (shift.guardName) {
      stats.byGuard[shift.guardName] = (stats.byGuard[shift.guardName] || 0) + 1;
    }
    
    // Calculate hours
    const [startH] = shift.startTime.split(':').map(Number);
    const [endH] = shift.endTime.split(':').map(Number);
    let hours = endH - startH;
    if (hours < 0) hours += 24;
    stats.totalHours += hours;
  });
  
  // Fill rate
  const assigned = rangeShifts.filter(s => s.guardId).length;
  stats.fillRate = rangeShifts.length > 0 ? Math.round((assigned / rangeShifts.length) * 100) : 0;
  
  return stats;
};

export default {
  bulkDeleteShifts,
  bulkCopyShifts,
  createRecurringShifts,
  bulkUpdateShifts,
  bulkAssignGuards,
  bulkPublishShifts,
  autoFillShifts,
  generateShiftReport,
};
