/**
 * Drag and Drop Schedule Utilities
 * Handles event calculations, collision detection, and schedule manipulation
 */

// Time utility functions
export const timeStringToMinutes = (timeStr) => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

export const minutesToTimeString = (minutes) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
};

export const getMinutesBetweenTimes = (startTime, endTime) => {
  const start = timeStringToMinutes(startTime);
  const end = timeStringToMinutes(endTime);
  return end - start;
};

export const addMinutesToTime = (timeStr, minutesToAdd) => {
  const totalMinutes = timeStringToMinutes(timeStr) + minutesToAdd;
  return minutesToTimeString(totalMinutes);
};

// Grid utilities (30-minute slots)
export const SLOT_HEIGHT = 30; // pixels per 30-minute slot
export const SLOT_DURATION = 30; // minutes per slot

export const pixelsToMinutes = (pixels) => {
  return Math.round((pixels / SLOT_HEIGHT) * SLOT_DURATION);
};

export const minutesToPixels = (minutes) => {
  return (minutes / SLOT_DURATION) * SLOT_HEIGHT;
};

export const timeToPixels = (timeStr, dayStartMinutes = 0) => {
  const timeMinutes = timeStringToMinutes(timeStr);
  return minutesToPixels(timeMinutes - dayStartMinutes);
};

export const pixelsToTime = (pixels, dayStartMinutes = 0) => {
  const minutes = pixelsToMinutes(pixels) + dayStartMinutes;
  return minutesToTimeString(minutes);
};

// Snapping to grid
export const snapToGrid = (pixels, snapSize = SLOT_HEIGHT) => {
  return Math.round(pixels / snapSize) * snapSize;
};

export const snapTimeToGrid = (timeStr, snapMinutes = SLOT_DURATION) => {
  const minutes = timeStringToMinutes(timeStr);
  const snappedMinutes = Math.round(minutes / snapMinutes) * snapMinutes;
  return minutesToTimeString(snappedMinutes);
};

// Collision detection
export const checkTimeOverlap = (shift1, shift2) => {
  const shift1Start = timeStringToMinutes(shift1.startTime);
  const shift1End = timeStringToMinutes(shift1.endTime);
  const shift2Start = timeStringToMinutes(shift2.startTime);
  const shift2End = timeStringToMinutes(shift2.endTime);

  return !(shift1End <= shift2Start || shift1Start >= shift2End);
};

export const getOverlappingShifts = (shift, allShifts) => {
  return allShifts.filter(
    s => s.$id !== shift.$id && 
    s.date === shift.date && 
    checkTimeOverlap(shift, s)
  );
};

export const canPlaceShift = (shift, allShifts, allowOverlap = false) => {
  if (allowOverlap) return true;
  return getOverlappingShifts(shift, allShifts).length === 0;
};

// Shift positioning
export const getShiftPosition = (shift, dayStartMinutes = 480) => {
  const top = timeToPixels(shift.startTime, dayStartMinutes);
  const height = minutesToPixels(getMinutesBetweenTimes(shift.startTime, shift.endTime));
  return { top, height };
};

export const getShiftFromPosition = (top, height, dayStartMinutes = 480) => {
  const startTime = pixelsToTime(top, dayStartMinutes);
  const endMinutes = pixelsToMinutes(height);
  const endTime = addMinutesToTime(startTime, endMinutes);
  
  return {
    startTime: snapTimeToGrid(startTime),
    endTime: snapTimeToGrid(endTime)
  };
};

// Multi-column layout for overlapping shifts
export const calculateShiftLayout = (shiftsForDay) => {
  if (!shiftsForDay.length) return [];

  // Sort by start time
  const sorted = [...shiftsForDay].sort((a, b) => 
    timeStringToMinutes(a.startTime) - timeStringToMinutes(b.startTime)
  );

  // Group overlapping shifts
  const groups = [];
  sorted.forEach(shift => {
    const groupIndex = groups.findIndex(group =>
      group.some(s => checkTimeOverlap(shift, s))
    );

    if (groupIndex === -1) {
      groups.push([shift]);
    } else {
      groups[groupIndex].push(shift);
    }
  });

  // Calculate column for each shift
  const layout = [];
  groups.forEach(group => {
    group.forEach((shift, index) => {
      layout.push({
        ...shift,
        column: index,
        totalColumns: group.length
      });
    });
  });

  return layout;
};

// Resize constraints
export const MIN_SHIFT_DURATION = 30; // 30 minutes
export const MAX_SHIFT_DURATION = 720; // 12 hours
export const DAY_START_TIME = '00:00';
export const DAY_END_TIME = '23:59';

export const getResizeConstraints = (shift, dayStartMinutes = 0, dayEndMinutes = 1440) => {
  const dayStart = dayStartMinutes;
  const dayEnd = dayEndMinutes;
  
  const shiftStartMinutes = timeStringToMinutes(shift.startTime);
  const shiftEndMinutes = timeStringToMinutes(shift.endTime);
  
  return {
    minTop: minutesToPixels(Math.max(dayStart, shiftStartMinutes - MAX_SHIFT_DURATION)),
    maxTop: minutesToPixels(Math.min(dayEnd - MIN_SHIFT_DURATION, shiftEndMinutes - MIN_SHIFT_DURATION)),
    minHeight: minutesToPixels(MIN_SHIFT_DURATION),
    maxHeight: minutesToPixels(Math.min(MAX_SHIFT_DURATION, dayEnd - shiftStartMinutes))
  };
};

// Drag validation
export const validateShiftMove = (shift, newStartTime, newEndTime, allShifts, allowOverlap = false) => {
  const newShift = { ...shift, startTime: newStartTime, endTime: newEndTime };
  
  // Check time constraints
  const startMinutes = timeStringToMinutes(newStartTime);
  const endMinutes = timeStringToMinutes(newEndTime);
  
  if (startMinutes < 0 || endMinutes > 1440 || startMinutes >= endMinutes) {
    return { valid: false, reason: 'Invalid time range' };
  }
  
  const duration = endMinutes - startMinutes;
  if (duration < MIN_SHIFT_DURATION || duration > MAX_SHIFT_DURATION) {
    return { valid: false, reason: 'Shift duration out of bounds' };
  }
  
  // Check for overlaps
  if (!allowOverlap && getOverlappingShifts(newShift, allShifts).length > 0) {
    return { valid: false, reason: 'Overlaps with another shift' };
  }
  
  return { valid: true, reason: null };
};

// Helper to format shift for display
export const formatShiftDisplay = (shift) => {
  const duration = getMinutesBetweenTimes(shift.startTime, shift.endTime);
  const hours = Math.floor(duration / 60);
  const minutes = duration % 60;
  
  let durationStr = '';
  if (hours > 0) durationStr += `${hours}h`;
  if (minutes > 0) durationStr += `${minutes}m`;
  
  return {
    timeRange: `${shift.startTime} - ${shift.endTime}`,
    duration: durationStr,
    isLong: duration > 480 // 8 hours
  };
};

// Export time constants for component use
export const BUSINESS_HOURS = {
  START: 480, // 8:00 AM in minutes
  END: 1020, // 5:00 PM in minutes
};

export const FULL_DAY = {
  START: 0, // 12:00 AM in minutes
  END: 1440, // 12:00 AM next day in minutes
};

// Helper to generate time slots
export const generateTimeSlots = (startMinutes = 0, endMinutes = 1440, intervalMinutes = 30) => {
  const slots = [];
  for (let i = startMinutes; i < endMinutes; i += intervalMinutes) {
    slots.push(minutesToTimeString(i));
  }
  return slots;
};
