import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GripVertical, Plus, Trash2, Copy } from 'lucide-react';
import {
  SLOT_HEIGHT,
  SLOT_DURATION,
  snapToGrid,
  snapTimeToGrid,
  pixelsToTime,
  timeToPixels,
  getMinutesBetweenTimes,
  getShiftFromPosition,
  getShiftPosition,
  checkTimeOverlap,
  getOverlappingShifts,
  calculateShiftLayout,
  validateShiftMove,
  pixelsToMinutes,
  timeStringToMinutes,
  addMinutesToTime,
  minutesToTimeString,
  formatShiftDisplay,
} from '../lib/dragDropSchedule';

/**
 * Interactive Drag-and-Drop Schedule Calendar
 * Allows creating, moving, and resizing shifts via drag-and-drop
 */
const DragDropSchedule = ({
  shifts = [],
  onShiftsChange,
  date = new Date().toISOString().split('T')[0],
  dayStartHour = 8,
  dayEndHour = 17,
  readonly = false,
  siteId = null,
  staffId = null,
  allowOverlap = false,
  onShiftClick = null,
  className = '',
}) => {
  const containerRef = useRef(null);
  const [draggingShift, setDraggingShift] = useState(null);
  const [resizingShift, setResizingShift] = useState(null);
  const [creatingShift, setCreatingShift] = useState(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [selectedShift, setSelectedShift] = useState(null);
  const [newShiftTime, setNewShiftTime] = useState(null);

  const dayStartMinutes = dayStartHour * 60;
  const dayEndMinutes = dayEndHour * 60;
  const dayHeightPixels = ((dayEndMinutes - dayStartMinutes) / SLOT_DURATION) * SLOT_HEIGHT;

  // Get shifts for the current date
  const todayShifts = shifts.filter(s => s.date === date || !s.date);
  const shiftLayout = calculateShiftLayout(todayShifts);

  // Helper to update a shift
  const updateShift = useCallback((shiftId, updates) => {
    const updated = todayShifts.map(s =>
      s.$id === shiftId ? { ...s, ...updates } : s
    );
    onShiftsChange(updated);
  }, [todayShifts, onShiftsChange]);

  // Helper to add a shift
  const addShift = useCallback((newShift) => {
    const shift = {
      $id: `shift_${Date.now()}`,
      date,
      siteId,
      staffId,
      ...newShift,
    };
    onShiftsChange([...todayShifts, shift]);
    return shift;
  }, [todayShifts, onShiftsChange, date, siteId, staffId]);

  // Helper to delete a shift
  const deleteShift = useCallback((shiftId) => {
    onShiftsChange(todayShifts.filter(s => s.$id !== shiftId));
  }, [todayShifts, onShiftsChange]);

  // Handle drag start
  const handleDragStart = (e, shift, type = 'move') => {
    if (readonly) return;
    
    e.preventDefault();
    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    const startY = e.clientY - rect.top;

    if (type === 'move') {
      const { top } = getShiftPosition(shift, dayStartMinutes);
      setDraggingShift(shift);
      setDragOffset(startY - top);
    } else if (type === 'resize') {
      setResizingShift({ shift, startY });
    }
  };

  // Handle drag over
  const handleDragOver = (e) => {
    if (!draggingShift && !resizingShift) return;
    e.preventDefault();
  };

  // Handle drag move
  useEffect(() => {
    if (!draggingShift && !resizingShift) return;

    const handleMouseMove = (e) => {
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const currentY = e.clientY - rect.top;

      if (draggingShift) {
        const newTop = snapToGrid(currentY - dragOffset);
        const constrainedTop = Math.max(0, Math.min(newTop, dayHeightPixels - 60));
        
        const newStartTime = pixelsToTime(constrainedTop, dayStartMinutes);
        const duration = getMinutesBetweenTimes(draggingShift.startTime, draggingShift.endTime);
        const newEndTime = addMinutesToTime(newStartTime, duration);

        const validation = validateShiftMove(
          draggingShift,
          snapTimeToGrid(newStartTime),
          snapTimeToGrid(newEndTime),
          todayShifts,
          allowOverlap
        );

        if (validation.valid) {
          updateShift(draggingShift.$id, {
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
          ((getMinutesBetweenTimes(shift.startTime, shift.endTime) / SLOT_DURATION) * SLOT_HEIGHT) + deltaY,
          SLOT_HEIGHT
        );

        const constrainedHeight = Math.max(SLOT_HEIGHT, Math.min(newHeight, dayHeightPixels - top));
        const newEndTime = addMinutesToTime(
          shift.startTime,
          pixelsToMinutes(constrainedHeight)
        );

        const validation = validateShiftMove(
          shift,
          shift.startTime,
          snapTimeToGrid(newEndTime),
          todayShifts,
          allowOverlap
        );

        if (validation.valid) {
          updateShift(shift.$id, {
            endTime: snapTimeToGrid(newEndTime),
          });
          setResizingShift({ shift: { ...shift, endTime: snapTimeToGrid(newEndTime) }, startY });
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
  }, [draggingShift, resizingShift, dragOffset, dayStartMinutes, dayHeightPixels, todayShifts, updateShift, allowOverlap]);

  // Handle quick shift creation by clicking on the calendar
  const handleCalendarClick = (e) => {
    if (readonly || draggingShift || resizingShift || e.target !== containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const clickY = e.clientY - rect.top;
    const snappedY = snapToGrid(clickY);

    const startTime = pixelsToTime(snappedY, dayStartMinutes);
    const endTime = addMinutesToTime(startTime, 60); // 1 hour default

    setNewShiftTime({
      startTime: snapTimeToGrid(startTime),
      endTime: snapTimeToGrid(endTime),
      position: snappedY,
    });
  };

  // Confirm quick shift creation
  const confirmNewShift = () => {
    if (newShiftTime) {
      addShift({
        startTime: newShiftTime.startTime,
        endTime: newShiftTime.endTime,
        title: 'New Shift',
        description: '',
        status: 'active',
      });
      setNewShiftTime(null);
    }
  };

  // Cancel quick shift creation
  const cancelNewShift = () => {
    setNewShiftTime(null);
  };

  // Time labels
  const timeLabels = [];
  for (let i = dayStartMinutes; i <= dayEndMinutes; i += 60) {
    timeLabels.push(minutesToTimeString(i));
  }

  const getColumnWidth = (shiftLayout) => {
    if (!shiftLayout.length) return '100%';
    const maxColumns = Math.max(...shiftLayout.map(s => s.totalColumns || 1));
    return `${100 / maxColumns}%`;
  };

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Schedule for {new Date(date).toLocaleDateString()}
          </h3>
          <p className="text-sm text-gray-500">
            {dayStartHour}:00 - {dayEndHour}:00
          </p>
        </div>
        {!readonly && (
          <button
            onClick={() => setNewShiftTime({
              startTime: minutesToTimeString(dayStartMinutes),
              endTime: minutesToTimeString(dayStartMinutes + 60),
              position: 0,
            })}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Plus size={18} />
            New Shift
          </button>
        )}
      </div>

      {/* Calendar */}
      <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
        <div className="flex">
          {/* Time Labels */}
          <div className="w-24 border-r border-gray-200 bg-gray-50">
            <div className="h-12 flex items-center px-3 border-b border-gray-200 text-xs font-semibold text-gray-600">
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

          {/* Calendar Grid */}
          <div className="flex-1 relative overflow-y-auto">
            {/* Header */}
            <div className="h-12 border-b border-gray-200 bg-gray-50 px-4 flex items-center text-sm font-semibold text-gray-700">
              Shifts
            </div>

            {/* Grid background */}
            <div
              ref={containerRef}
              onClick={handleCalendarClick}
              onDragOver={handleDragOver}
              className="relative bg-white cursor-crosshair"
              style={{
                height: dayHeightPixels,
                backgroundImage: `linear-gradient(180deg, transparent 0, transparent calc(${SLOT_HEIGHT}px - 1px), #e5e7eb calc(${SLOT_HEIGHT}px - 1px), #e5e7eb 100%)`,
                backgroundSize: `100% ${SLOT_HEIGHT}px`,
              }}
            >
              {/* Grid cells for 30-min slots */}
              <div className="absolute inset-0 pointer-events-none">
                {Array.from({ length: Math.ceil((dayEndMinutes - dayStartMinutes) / 30) }).map((_, i) => (
                  <div
                    key={i}
                    className={i % 2 === 0 ? 'bg-blue-50' : 'bg-white'}
                    style={{
                      position: 'absolute',
                      top: i * SLOT_HEIGHT,
                      left: 0,
                      right: 0,
                      height: SLOT_HEIGHT,
                      opacity: 0.3,
                    }}
                  />
                ))}
              </div>

              {/* Shifts */}
              {shiftLayout.map((shift) => {
                const { top, height } = getShiftPosition(shift, dayStartMinutes);
                const isSelected = selectedShift?.$id === shift.$id;
                const isOverlapping = getOverlappingShifts(shift, todayShifts).length > 0;
                const columnWidth = getColumnWidth(shiftLayout.filter(s =>
                  checkTimeOverlap(s, shift)
                ));
                const columnLeft = (shift.column || 0) * (100 / (shift.totalColumns || 1));

                const display = formatShiftDisplay(shift);

                return (
                  <div
                    key={shift.$id}
                    onMouseDown={(e) => {
                      // Only start drag on primary button
                      if (readonly || e.button !== 0) return;
                      handleDragStart(e, shift, 'move');
                    }}
                    onClick={() => {
                      setSelectedShift(shift);
                      onShiftClick?.(shift);
                    }}
                    className={`absolute left-0 right-0 transition-all cursor-move rounded-md overflow-hidden border-2 ${
                      isSelected
                        ? 'border-blue-500 shadow-lg z-40'
                        : 'border-gray-300 hover:border-blue-400 z-30'
                    } ${
                      isOverlapping && !allowOverlap
                        ? 'bg-red-100 border-red-400'
                        : 'bg-gradient-to-r from-blue-500 to-blue-600'
                    } text-white p-2`}
                    style={{
                      top: `${top}px`,
                      height: `${height}px`,
                      left: `${columnLeft}%`,
                      width: columnWidth,
                      opacity: draggingShift?.$id === shift.$id ? 0.7 : 1,
                    }}
                  >
                    <div className="flex flex-col h-full">
                      <div className="flex items-start gap-1 mb-1">
                        {!readonly && (
                          <GripVertical size={14} className="flex-shrink-0 mt-0.5 opacity-75" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold truncate">{shift.title || 'Shift'}</p>
                          <p className="text-xs opacity-90">{display.timeRange}</p>
                        </div>
                      </div>

                      {height > 80 && (
                        <p className="text-xs opacity-75 line-clamp-1">
                          {display.duration}
                        </p>
                      )}

                      {/* Resize handle */}
                      {!readonly && height > 60 && (
                        <div
                          onMouseDown={(e) => {
                            if (e.button !== 0) return;
                            handleDragStart(e, shift, 'resize');
                          }}
                          className="absolute bottom-0 left-0 right-0 h-2 bg-blue-700 cursor-ns-resize opacity-0 hover:opacity-100 transition-opacity"
                        />
                      )}
                    </div>
                  </div>
                );
              })}

              {/* New shift preview */}
              {newShiftTime && (
                <div
                  className="absolute left-0 right-0 border-2 border-dashed border-green-500 bg-green-50 rounded-md p-2 z-50"
                  style={{
                    top: `${newShiftTime.position}px`,
                    height: `${minutesToPixels(
                      getMinutesBetweenTimes(newShiftTime.startTime, newShiftTime.endTime)
                    )}px`,
                  }}
                >
                  <div className="text-xs font-semibold text-green-700 mb-1">
                    New Shift
                  </div>
                  <div className="text-xs text-green-600">
                    {newShiftTime.startTime} - {newShiftTime.endTime}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* New Shift Confirmation */}
      {newShiftTime && (
        <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex-1">
            <p className="font-medium text-green-900">
              {newShiftTime.startTime} - {newShiftTime.endTime}
            </p>
            <p className="text-sm text-green-700">
              Duration: {minutesToTimeString(getMinutesBetweenTimes(newShiftTime.startTime, newShiftTime.endTime))}
            </p>
          </div>
          <button
            onClick={confirmNewShift}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium"
          >
            Create
          </button>
          <button
            onClick={cancelNewShift}
            className="px-4 py-2 bg-gray-300 text-gray-900 rounded-lg hover:bg-gray-400 transition font-medium"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Selected Shift Details */}
      {selectedShift && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="font-semibold text-blue-900">{selectedShift.title || 'Shift'}</h4>
              <p className="text-sm text-blue-700 mt-1">
                {selectedShift.startTime} - {selectedShift.endTime}
              </p>
              {selectedShift.description && (
                <p className="text-sm text-blue-600 mt-2">{selectedShift.description}</p>
              )}
            </div>
            {!readonly && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    deleteShift(selectedShift.$id);
                    setSelectedShift(null);
                  }}
                  className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Info Message */}
      {todayShifts.length === 0 && !newShiftTime && (
        <div className="text-center py-8 text-gray-500">
          <p>No shifts scheduled for this day</p>
          {!readonly && <p className="text-sm mt-1">Click on the calendar to create a new shift</p>}
        </div>
      )}
    </div>
  );
};

export default DragDropSchedule;
