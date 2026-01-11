import React, { useState, useRef, useCallback, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import {
  timeToPixels,
  getShiftPosition,
  getMinutesBetweenTimes,
  minutesToPixels,
  SLOT_HEIGHT,
  checkTimeOverlap,
  calculateShiftLayout,
  formatShiftDisplay,
  timeStringToMinutes,
  minutesToTimeString,
  snapToGrid,
  pixelsToTime,
  snapTimeToGrid,
  pixelsToMinutes,
  addMinutesToTime,
  validateShiftMove,
} from '../lib/dragDropSchedule';

/**
 * Multi-Day Schedule View
 * Week or custom range view with column-based layout
 */
const MultiDaySchedule = ({
  shifts = [],
  onShiftsChange,
  startDate = new Date(),
  numDays = 7,
  dayStartHour = 8,
  dayEndHour = 17,
  readonly = false,
  onShiftClick = null,
  className = '',
  groupByStaff = false,
  staffList = [],
  allowOverlap = false,
}) => {
  const [currentStartDate, setCurrentStartDate] = useState(startDate);
  const [selectedShift, setSelectedShift] = useState(null);
  const [draggingShift, setDraggingShift] = useState(null); // { shift, date, container, offset }
  const [resizingShift, setResizingShift] = useState(null); // { shift, date, container, startY }

  const dayStartMinutes = dayStartHour * 60;
  const dayEndMinutes = dayEndHour * 60;
  const dayHeightPixels = ((dayEndMinutes - dayStartMinutes) / 30) * SLOT_HEIGHT;

  // Generate dates for the view
  const dates = Array.from({ length: numDays }, (_, i) => {
    const d = new Date(currentStartDate);
    d.setDate(d.getDate() + i);
    return d.toISOString().split('T')[0];
  });

  // Helper to go to previous week/period
  const goToPrevious = () => {
    const newStart = new Date(currentStartDate);
    newStart.setDate(newStart.getDate() - numDays);
    setCurrentStartDate(newStart);
  };

  // Helper to go to next week/period
  const goToNext = () => {
    const newStart = new Date(currentStartDate);
    newStart.setDate(newStart.getDate() + numDays);
    setCurrentStartDate(newStart);
  };

  // Helper to go to today
  const goToToday = () => {
    setCurrentStartDate(new Date());
  };

  // Get shifts for a specific day
  const getShiftsForDay = (date) => {
    return shifts.filter(s => s.date === date);
  };
  const updateShift = useCallback((shiftId, updates) => {
    const updated = shifts.map(s => (s.$id === shiftId ? { ...s, ...updates } : s));
    onShiftsChange?.(updated);
  }, [shifts, onShiftsChange]);

  const handleDragStart = (e, shift, date, type = 'move') => {
    if (readonly) return;
    // Only primary button
    if (e.button !== 0) return;

    const container = e.currentTarget.closest('.day-grid');
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const startY = e.clientY - rect.top;

    if (type === 'move') {
      const { top } = getShiftPosition(shift, dayStartMinutes);
      setDraggingShift({ shift, date, container, offset: startY - top });
    } else if (type === 'resize') {
      setResizingShift({ shift, date, container, startY });
    }
  };

  useEffect(() => {
    if (!draggingShift && !resizingShift) return;

    const handleMouseMove = (e) => {
      const active = draggingShift || resizingShift;
      if (!active) return;
      const { shift, date, container } = active;
      const rect = container.getBoundingClientRect();
      const currentY = e.clientY - rect.top;

      const dayShifts = getShiftsForDay(date);

      if (draggingShift) {
        const newTop = snapToGrid(currentY - draggingShift.offset);
        const constrainedTop = Math.max(0, Math.min(newTop, dayHeightPixels - 60));
        const newStartTime = pixelsToTime(constrainedTop, dayStartMinutes);
        const duration = getMinutesBetweenTimes(shift.startTime, shift.endTime);
        const newEndTime = addMinutesToTime(newStartTime, duration);

        const validation = validateShiftMove(
          shift,
          snapTimeToGrid(newStartTime),
          snapTimeToGrid(newEndTime),
          dayShifts,
          allowOverlap
        );

        if (validation.valid) {
          updateShift(shift.$id, {
            startTime: snapTimeToGrid(newStartTime),
            endTime: snapTimeToGrid(newEndTime),
          });
        }
      }

      if (resizingShift) {
        const { shift, startY } = resizingShift;
        const { top } = getShiftPosition(shift, dayStartMinutes);
        const deltaY = currentY - startY;
        const newHeight = snapToGrid(
          ((getMinutesBetweenTimes(shift.startTime, shift.endTime) / 30) * SLOT_HEIGHT) + deltaY,
          SLOT_HEIGHT
        );
        const constrainedHeight = Math.max(SLOT_HEIGHT, Math.min(newHeight, dayHeightPixels - top));
        const newEndTime = addMinutesToTime(shift.startTime, pixelsToMinutes(constrainedHeight));

        const validation = validateShiftMove(
          shift,
          shift.startTime,
          snapTimeToGrid(newEndTime),
          dayShifts,
          allowOverlap
        );

        if (validation.valid) {
          updateShift(shift.$id, { endTime: snapTimeToGrid(newEndTime) });
          setResizingShift({ ...resizingShift, shift: { ...shift, endTime: snapTimeToGrid(newEndTime) } });
        }
      }
    };

    const handleMouseUp = () => {
      setDraggingShift(null);
      setResizingShift(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingShift, resizingShift, dayStartMinutes, dayHeightPixels, allowOverlap]);

  // Get shifts grouped by staff for a day
  const getShiftsForDayByStaff = (date) => {
    const dayShifts = getShiftsForDay(date);
    if (!groupByStaff) return { all: dayShifts };

    return dayShifts.reduce((acc, shift) => {
      const staffId = shift.staffId || 'unassigned';
      if (!acc[staffId]) acc[staffId] = [];
      acc[staffId].push(shift);
      return acc;
    }, {});
  };

  // Time labels
  const timeLabels = [];
  for (let i = dayStartMinutes; i <= dayEndMinutes; i += 60) {
    timeLabels.push(minutesToTimeString(i));
  }

  const startMonth = new Date(currentStartDate).toLocaleDateString('en-US', { month: 'long' });
  const startDay = new Date(currentStartDate).getDate();
  const endDay = new Date(dates[dates.length - 1]).getDate();

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {startMonth} {startDay} - {endDay}
          </h3>
          <p className="text-sm text-gray-500">
            {numDays}-day schedule view
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={goToPrevious}
            className="p-2 hover:bg-gray-200 rounded-lg transition"
          >
            <ChevronLeft size={20} />
          </button>

          <button
            onClick={goToToday}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition text-sm font-medium"
          >
            <Calendar size={16} />
            Today
          </button>

          <button
            onClick={goToNext}
            className="p-2 hover:bg-gray-200 rounded-lg transition"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Calendar */}
      <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
        <div className="flex overflow-x-auto">
          {/* Time Labels Column */}
          <div className="w-24 border-r border-gray-200 bg-gray-50 flex-shrink-0">
            <div className="h-20 flex items-center px-3 border-b border-gray-200 text-xs font-semibold text-gray-600">
              Time
            </div>
            <div className={`flex flex-col`} style={{ height: dayHeightPixels }}>
              {timeLabels.map((time) => (
                <div
                  key={time}
                  className="flex-shrink-0 flex items-start px-3 text-xs font-medium text-gray-500 border-t border-gray-100"
                  style={{ height: SLOT_HEIGHT * 2 }}
                >
                  {time}
                </div>
              ))}
            </div>
          </div>

          {/* Day Columns */}
          <div className="flex flex-1">
            {dates.map((date) => {
              const dateObj = new Date(date);
              const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
              const dayNum = dateObj.getDate();
              const isToday = date === new Date().toISOString().split('T')[0];
              const shiftsByStaff = getShiftsForDayByStaff(date);

              return (
                <div key={date} className="flex-1 border-r border-gray-200 last:border-r-0">
                  {/* Day Header */}
                  <div
                    className={`h-20 border-b border-gray-200 px-4 flex flex-col items-center justify-center ${
                      isToday ? 'bg-blue-50' : 'bg-gray-50'
                    }`}
                  >
                    <p className={`text-xs font-semibold ${isToday ? 'text-blue-600' : 'text-gray-600'}`}>
                      {dayName}
                    </p>
                    <p className={`text-lg font-bold ${isToday ? 'text-blue-600' : 'text-gray-900'}`}>
                      {dayNum}
                    </p>
                  </div>

                  {/* Day Grid with Shifts */}
                  <div className="relative day-grid" style={{ height: dayHeightPixels }}>
                    {/* Grid background */}
                    <div
                      className="absolute inset-0"
                      style={{
                        backgroundImage: `linear-gradient(180deg, transparent 0, transparent calc(${SLOT_HEIGHT}px - 1px), #e5e7eb calc(${SLOT_HEIGHT}px - 1px), #e5e7eb 100%)`,
                        backgroundSize: `100% ${SLOT_HEIGHT}px`,
                      }}
                    />

                    {/* Shifts for this day */}
                    <div className="absolute inset-0">
                      {Object.entries(shiftsByStaff).map(([staffId, staffShifts]) => {
                        const layout = calculateShiftLayout(staffShifts);
                        const staffIndex = groupByStaff
                          ? staffList.findIndex(s => s.$id === staffId)
                          : 0;

                        return layout.map((shift) => {
                          const { top, height } = getShiftPosition(shift, dayStartMinutes);
                          const totalCols = layout.length;
                          const col = layout.indexOf(shift);
                          const colWidth = 100 / Math.max(1, totalCols);
                          const colLeft = col * colWidth;

                          return (
                            <div
                              key={`${date}-${shift.$id}`}
                              onMouseDown={(e) => handleDragStart(e, shift, date, 'move')}
                              onClick={() => {
                                setSelectedShift(shift);
                                onShiftClick?.(shift);
                              }}
                              className={`absolute rounded border-2 transition-all ${readonly ? 'cursor-default' : 'cursor-move'} p-1 ${
                                selectedShift?.$id === shift.$id
                                  ? 'border-blue-600 shadow-lg z-20'
                                  : 'border-blue-300 hover:border-blue-500 z-10'
                              } bg-gradient-to-br from-blue-400 to-blue-600 text-white text-xs`}
                              style={{
                                top: `${top}px`,
                                height: `${height}px`,
                                left: `${colLeft}%`,
                                width: `${colWidth}%`,
                                padding: '4px',
                              }}
                            >
                              <p className="font-semibold truncate">
                                {shift.title || 'Shift'}
                              </p>
                              <p className="text-xs opacity-90 truncate">
                                {shift.startTime}
                              </p>
                              {height > 60 && (
                                <p className="text-xs opacity-75 truncate">
                                  {getMinutesBetweenTimes(shift.startTime, shift.endTime) / 60}h
                                </p>
                              )}

                              {!readonly && height > 40 && (
                                <div
                                  className="absolute bottom-0 left-0 right-0 h-2 bg-blue-700 cursor-ns-resize opacity-0 hover:opacity-100 transition-opacity"
                                  onMouseDown={(e) => handleDragStart(e, shift, date, 'resize')}
                                />
                              )}
                            </div>
                          );
                        });
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Selected Shift Details */}
      {selectedShift && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="font-semibold text-blue-900">{selectedShift.title || 'Shift'}</h4>
              <p className="text-sm text-blue-700 mt-1">
                {selectedShift.date} | {selectedShift.startTime} - {selectedShift.endTime}
              </p>
              {selectedShift.description && (
                <p className="text-sm text-blue-600 mt-2">{selectedShift.description}</p>
              )}
              {selectedShift.staffId && (
                <p className="text-sm text-blue-600 mt-1">
                  Staff: {staffList.find(s => s.$id === selectedShift.staffId)?.name || selectedShift.staffId}
                </p>
              )}
            </div>
            <button
              onClick={() => setSelectedShift(null)}
              className="text-blue-600 hover:bg-blue-100 px-3 py-1 rounded text-sm font-medium transition"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-600">Total Shifts</p>
          <p className="text-2xl font-bold text-gray-900">{shifts.length}</p>
        </div>
        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-600">This Period</p>
          <p className="text-2xl font-bold text-blue-900">
            {dates.reduce((sum, d) => sum + getShiftsForDay(d).length, 0)}
          </p>
        </div>
        <div className="p-3 bg-green-50 rounded-lg border border-green-200">
          <p className="text-sm text-green-600">Total Hours</p>
          <p className="text-2xl font-bold text-green-900">
            {(
              dates.reduce((sum, d) => {
                const dayShifts = getShiftsForDay(d);
                return sum + dayShifts.reduce(
                  (s, shift) => s + (getMinutesBetweenTimes(shift.startTime, shift.endTime) / 60),
                  0
                );
              }, 0)
            ).toFixed(1)}
          </p>
        </div>
        <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
          <p className="text-sm text-purple-600">Days</p>
          <p className="text-2xl font-bold text-purple-900">{numDays}</p>
        </div>
      </div>
    </div>
  );
};

export default MultiDaySchedule;
