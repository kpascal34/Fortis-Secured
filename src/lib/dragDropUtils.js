/**
 * Drag and Drop Utilities for Scheduling Module
 * Handles drag-and-drop operations for shift scheduling and guard assignment
 */

/**
 * Create a drag event handler for shift items
 * @param {Object} shift - The shift being dragged
 * @param {Function} setDraggedShift - State setter for dragged shift
 * @returns {Function} onDragStart handler
 */
export const handleShiftDragStart = (shift, setDraggedShift) => (e) => {
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('application/json', JSON.stringify(shift));
  setDraggedShift(shift);
  
  // Create a custom drag image
  const dragImage = document.createElement('div');
  dragImage.textContent = shift.shiftType || 'Shift';
  dragImage.style.backgroundColor = '#0BD3D3';
  dragImage.style.color = '#fff';
  dragImage.style.padding = '8px 12px';
  dragImage.style.borderRadius = '6px';
  dragImage.style.fontSize = '12px';
  dragImage.style.whiteSpace = 'nowrap';
  dragImage.style.position = 'absolute';
  dragImage.style.left = '-9999px';
  document.body.appendChild(dragImage);
  e.dataTransfer.setDragImage(dragImage, 0, 0);
  
  setTimeout(() => dragImage.remove(), 0);
};

/**
 * Create a drag event handler for guard items
 * @param {Object} guard - The guard being dragged
 * @param {Function} setDraggedGuard - State setter for dragged guard
 * @returns {Function} onDragStart handler
 */
export const handleGuardDragStart = (guard, setDraggedGuard) => (e) => {
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('application/json', JSON.stringify(guard));
  setDraggedGuard(guard);
  
  const dragImage = document.createElement('div');
  dragImage.textContent = guard.firstName || 'Guard';
  dragImage.style.backgroundColor = '#0BD3D3';
  dragImage.style.color = '#fff';
  dragImage.style.padding = '8px 12px';
  dragImage.style.borderRadius = '6px';
  dragImage.style.fontSize = '12px';
  dragImage.style.position = 'absolute';
  dragImage.style.left = '-9999px';
  document.body.appendChild(dragImage);
  e.dataTransfer.setDragImage(dragImage, 0, 0);
  
  setTimeout(() => dragImage.remove(), 0);
};

/**
 * Create a drag over handler for drop zones
 * @returns {Function} onDragOver handler
 */
export const handleDragOver = (e) => {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  e.currentTarget.style.backgroundColor = 'rgba(11, 211, 211, 0.1)';
  e.currentTarget.style.borderColor = '#0BD3D3';
};

/**
 * Create a drag leave handler for drop zones
 * @returns {Function} onDragLeave handler
 */
export const handleDragLeave = (e) => {
  e.currentTarget.style.backgroundColor = '';
  e.currentTarget.style.borderColor = '';
};

/**
 * Validate if a guard can be assigned to a shift
 * @param {Object} guard - Guard to assign
 * @param {Object} shift - Shift to assign to
 * @param {Array} assignments - Existing assignments
 * @returns {Object} { valid: boolean, reason: string }
 */
export const validateGuardAssignment = (guard, shift, assignments = []) => {
  if (!guard || !shift) {
    return { valid: false, reason: 'Guard and shift are required' };
  }

  // Check if guard is already assigned to this shift
  const alreadyAssigned = assignments.some(
    a => a.guardId === guard.$id && a.shiftId === shift.$id
  );
  if (alreadyAssigned) {
    return { valid: false, reason: 'Guard is already assigned to this shift' };
  }

  // Check if guard has conflicting shifts (same date/time)
  const shiftDate = shift.shiftDate;
  const shiftStart = `${shiftDate}T${shift.startTime}`;
  const shiftEnd = `${shiftDate}T${shift.endTime}`;
  
  const conflicting = assignments.some(a => {
    if (a.guardId !== guard.$id) return false;
    
    const existingShift = a.shift;
    if (!existingShift) return false;
    
    const existingDate = existingShift.shiftDate;
    if (existingDate !== shiftDate) return false;
    
    const existingStart = `${existingDate}T${existingShift.startTime}`;
    const existingEnd = `${existingDate}T${existingShift.endTime}`;
    
    // Check for time overlap
    return shiftStart < existingEnd && shiftEnd > existingStart;
  });

  if (conflicting) {
    return { valid: false, reason: 'Guard has conflicting shift at this time' };
  }

  return { valid: true, reason: 'Guard can be assigned' };
};

/**
 * Calculate total hours for bulk assignment
 * @param {Array} shifts - Array of shifts to assign
 * @returns {number} Total hours
 */
export const calculateTotalHours = (shifts) => {
  return shifts.reduce((total, shift) => {
    if (!shift.startTime || !shift.endTime) return total;
    
    const [startH, startM] = shift.startTime.split(':').map(Number);
    const [endH, endM] = shift.endTime.split(':').map(Number);
    
    let hours = (endH - startH) + (endM - startM) / 60;
    if (hours < 0) hours += 24; // Handle overnight shifts
    
    return total + hours;
  }, 0);
};

/**
 * Apply bulk assignment to multiple shifts
 * @param {Object} guard - Guard to assign
 * @param {Array} shifts - Shifts to assign guard to
 * @param {Array} existingAssignments - Existing assignments
 * @returns {Object} { successful: number, failed: number, errors: Array }
 */
export const bulkAssignGuard = (guard, shifts, existingAssignments = []) => {
  const results = {
    successful: 0,
    failed: 0,
    errors: [],
    assignments: [],
  };

  shifts.forEach((shift, index) => {
    const validation = validateGuardAssignment(guard, shift, existingAssignments);
    
    if (validation.valid) {
      results.assignments.push({
        guardId: guard.$id,
        guardName: `${guard.firstName} ${guard.lastName}`,
        shiftId: shift.$id,
        shift: shift,
        assignmentDate: new Date().toISOString(),
        status: 'assigned',
      });
      results.successful++;
    } else {
      results.failed++;
      results.errors.push({
        shiftIndex: index,
        shiftId: shift.$id,
        reason: validation.reason,
      });
    }
  });

  return results;
};

/**
 * Generate a time slot grid for calendar view
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Array} Array of time slots
 */
export const generateTimeSlots = (startDate, endDate) => {
  const slots = [];
  const current = new Date(startDate);
  
  while (current <= endDate) {
    slots.push(new Date(current));
    current.setHours(current.getHours() + 1);
  }
  
  return slots;
};

/**
 * Get CSS class for drag feedback
 * @param {boolean} isDragging - Is item being dragged
 * @returns {string} CSS class name
 */
export const getDragFeedbackClass = (isDragging) => {
  return isDragging
    ? 'opacity-50 bg-accent/10 border-accent'
    : 'hover:bg-white/5 border-white/10';
};
