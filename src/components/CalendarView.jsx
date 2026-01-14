import React, { useState } from 'react';
import {
  AiOutlineCalendar,
  AiOutlineUser,
  AiOutlineCheckCircle,
  AiOutlineWarning,
  AiOutlinePlus,
} from 'react-icons/ai';

const CalendarView = ({
  shifts,
  assignments,
  guards,
  currentDate,
  calendarView,
  setCalendarView,
  onDateChange,
  onShiftClick,
  onAssignShift,
  onAddShift,
  getClientName,
  getSiteName,
}) => {
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayNamesFull = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const goToToday = () => {
    onDateChange(new Date());
  };

  const getWeekDates = (date) => {
    const day = date.getDay();
    const diff = date.getDate() - day; // Adjust to Sunday
    const sunday = new Date(date.setDate(diff));
    
    const weekDates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(sunday);
      d.setDate(sunday.getDate() + i);
      weekDates.push(d);
    }
    return weekDates;
  };

  const getShiftAssignments = (shiftId) => {
    return assignments.filter(a => a.shiftId === shiftId && a.status !== 'cancelled');
  };

  const getGuardName = (guardId) => {
    const guard = guards.find(g => g.$id === guardId);
    return guard ? `${guard.firstName} ${guard.lastName}` : 'Unassigned';
  };

  const getShiftStatus = (shift) => {
    const shiftAssignments = getShiftAssignments(shift.$id);
    const assigned = shiftAssignments.length;
    const required = shift.requiredHeadcount || 1;
    
    if (assigned === 0) return { status: 'unfilled', color: 'bg-yellow-500', text: 'Unfilled' };
    if (assigned < required) return { status: 'partial', color: 'bg-orange-500', text: `${assigned}/${required}` };
    return { status: 'filled', color: 'bg-green-500', text: 'Filled' };
  };

  if (calendarView === 'week') {
    return <WeekView {...{ shifts, assignments, guards, currentDate, onDateChange, onShiftClick, onAssignShift, onAddShift, getClientName, getSiteName, getShiftAssignments, getGuardName, getShiftStatus, goToToday, getWeekDates, dayNamesFull, monthNames }} />;
  }

  if (calendarView === 'day') {
    return <DayView {...{ shifts, assignments, guards, currentDate, onDateChange, onShiftClick, onAssignShift, onAddShift, getClientName, getSiteName, getShiftAssignments, getGuardName, getShiftStatus, goToToday, dayNamesFull, monthNames }} />;
  }

  return <MonthView {...{ shifts, currentDate, onDateChange, onShiftClick, onAddShift, getClientName, getSiteName, getShiftStatus, goToToday, monthNames, dayNames }} />;
};

// Week View Component
const WeekView = ({ shifts, assignments, guards, currentDate, onDateChange, onShiftClick, onAssignShift, onAddShift, getClientName, getSiteName, getShiftAssignments, getGuardName, getShiftStatus, goToToday, getWeekDates, dayNamesFull, monthNames }) => {
  const weekDates = getWeekDates(new Date(currentDate));

  const prevWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 7);
    onDateChange(newDate);
  };

  const nextWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 7);
    onDateChange(newDate);
  };

  const getShiftsForDate = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    return shifts.filter(shift => shift.date === dateStr).sort((a, b) => {
      return a.startTime.localeCompare(b.startTime);
    });
  };

  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  return (
    <div className="glass-panel overflow-hidden">
      {/* Header */}
      <div className="border-b border-white/10 bg-white/5 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">
            Week of {monthNames[weekDates[0].getMonth()]} {weekDates[0].getDate()}, {weekDates[0].getFullYear()}
          </h2>
          <div className="flex items-center gap-2">
            <button onClick={goToToday} className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white hover:bg-white/10">
              Today
            </button>
            <button onClick={prevWeek} className="rounded-lg border border-white/10 bg-white/5 p-2 text-white hover:bg-white/10">
              ←
            </button>
            <button onClick={nextWeek} className="rounded-lg border border-white/10 bg-white/5 p-2 text-white hover:bg-white/10">
              →
            </button>
          </div>
        </div>
      </div>

      {/* Week Grid */}
      <div className="grid grid-cols-7">
        {weekDates.map((date, i) => {
          const dayShifts = getShiftsForDate(date);
          const today = isToday(date);
          
          return (
            <div key={i} className={`border-r border-white/10 last:border-r-0 ${today ? 'bg-accent/5' : ''}`}>
              {/* Day Header */}
              <div className={`border-b border-white/10 p-4 text-center ${today ? 'bg-accent/10' : 'bg-white/5'}`}>
                <div className={`text-sm font-semibold ${today ? 'text-accent' : 'text-white'}`}>
                  {dayNamesFull[date.getDay()]}
                </div>
                <div className={`text-2xl font-bold mt-1 ${today ? 'text-accent' : 'text-white'}`}>
                  {date.getDate()}
                </div>
                {dayShifts.length > 0 && (
                  <div className="mt-1 text-xs text-white/50">
                    {dayShifts.length} shift{dayShifts.length !== 1 ? 's' : ''}
                  </div>
                )}
              </div>

              {/* Day Content */}
              <div className="p-3 space-y-2 min-h-[500px] max-h-[500px] overflow-y-auto">
                {dayShifts.map(shift => {
                  const status = getShiftStatus(shift);
                  const shiftAssignments = getShiftAssignments(shift.$id);
                  return (
                    <div
                      key={shift.$id}
                      onClick={() => onShiftClick(shift)}
                      className="cursor-pointer rounded-lg border border-white/10 bg-white/5 p-3 hover:border-accent hover:bg-white/10 transition-all"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-white">
                          {shift.startTime} - {shift.endTime}
                        </span>
                        <span className={`h-2 w-2 rounded-full ${status.color}`} title={status.text}></span>
                      </div>
                      <div className="text-xs text-white/70 truncate mb-1">{getClientName(shift.clientId)}</div>
                      <div className="text-xs text-white/50 truncate mb-1">{getSiteName(shift.siteId)}</div>
                      <div className="text-xs text-white/50 truncate">{shift.shiftType}</div>
                      {shiftAssignments.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-white/10 flex items-center gap-1 text-xs text-accent">
                          <AiOutlineUser className="h-3 w-3" />
                          {shiftAssignments.length}/{shift.requiredHeadcount} assigned
                        </div>
                      )}
                    </div>
                  );
                })}
                {dayShifts.length === 0 && (
                  <button
                    onClick={() => onAddShift(date.toISOString().split('T')[0])}
                    className="w-full rounded-lg border border-dashed border-white/20 py-8 text-sm text-white/40 hover:border-accent hover:bg-white/5 hover:text-accent transition-all"
                  >
                    <AiOutlinePlus className="inline h-5 w-5 mb-1" />
                    <div>Add Shift</div>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Day View Component
const DayView = ({ shifts, assignments, guards, currentDate, onDateChange, onShiftClick, onAssignShift, onAddShift, getClientName, getSiteName, getShiftAssignments, getGuardName, getShiftStatus, goToToday, dayNamesFull, monthNames }) => {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const dateStr = currentDate.toISOString().split('T')[0];
  const dayShifts = shifts.filter(s => s.date === dateStr);

  const prevDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 1);
    onDateChange(newDate);
  };

  const nextDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 1);
    onDateChange(newDate);
  };

  const getShiftsForHour = (hour) => {
    return dayShifts.filter(shift => {
      const startHour = parseInt(shift.startTime?.split(':')[0] || 0);
      const endHour = parseInt(shift.endTime?.split(':')[0] || 0);
      return hour >= startHour && hour < endHour;
    });
  };

  return (
    <div className="glass-panel overflow-hidden">
      {/* Header */}
      <div className="border-b border-white/10 bg-white/5 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">
            {dayNamesFull[currentDate.getDay()]}, {monthNames[currentDate.getMonth()]} {currentDate.getDate()}, {currentDate.getFullYear()}
          </h2>
          <div className="flex items-center gap-2">
            <button onClick={goToToday} className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white hover:bg-white/10">
              Today
            </button>
            <button onClick={prevDay} className="rounded-lg border border-white/10 bg-white/5 p-2 text-white hover:bg-white/10">
              ←
            </button>
            <button onClick={nextDay} className="rounded-lg border border-white/10 bg-white/5 p-2 text-white hover:bg-white/10">
              →
            </button>
          </div>
        </div>

        {/* Day Stats */}
        <div className="mt-4 grid grid-cols-4 gap-4">
          <div className="rounded-lg bg-white/5 p-3">
            <div className="text-xs text-white/50">Total Shifts</div>
            <div className="text-2xl font-bold text-white">{dayShifts.length}</div>
          </div>
          <div className="rounded-lg bg-white/5 p-3">
            <div className="text-xs text-white/50">Filled</div>
            <div className="text-2xl font-bold text-green-400">
              {dayShifts.filter(s => getShiftStatus(s).status === 'filled').length}
            </div>
          </div>
          <div className="rounded-lg bg-white/5 p-3">
            <div className="text-xs text-white/50">Partial</div>
            <div className="text-2xl font-bold text-orange-400">
              {dayShifts.filter(s => getShiftStatus(s).status === 'partial').length}
            </div>
          </div>
          <div className="rounded-lg bg-white/5 p-3">
            <div className="text-xs text-white/50">Unfilled</div>
            <div className="text-2xl font-bold text-yellow-400">
              {dayShifts.filter(s => getShiftStatus(s).status === 'unfilled').length}
            </div>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="max-h-[700px] overflow-y-auto p-6">
        {hours.map(hour => {
          const hourShifts = getShiftsForHour(hour);
          return (
            <div key={hour} className="mb-4 flex gap-4">
              <div className="w-20 pt-2 text-sm text-white/50">
                {hour.toString().padStart(2, '0')}:00
              </div>
              <div className="flex-1 space-y-2">
                {hourShifts.map(shift => {
                  const status = getShiftStatus(shift);
                  const shiftAssignments = getShiftAssignments(shift.$id);
                  return (
                    <div
                      key={shift.$id}
                      onClick={() => onShiftClick(shift)}
                      className="cursor-pointer rounded-xl border border-white/10 bg-white/5 p-4 hover:border-accent hover:bg-white/10 transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-lg font-semibold text-white">
                              {shift.startTime} - {shift.endTime}
                            </span>
                            <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${status.color}/20 ${status.color.replace('bg-', 'text-')}`}>
                              {status.text}
                            </span>
                          </div>
                          <div className="space-y-1">
                            <div className="text-sm text-white/70">{getClientName(shift.clientId)}</div>
                            <div className="text-sm text-white/50">{getSiteName(shift.siteId)}</div>
                            <div className="text-sm text-white/50">{shift.shiftType}</div>
                          </div>
                          {shiftAssignments.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {shiftAssignments.map(assignment => (
                                <div key={assignment.$id} className="flex items-center gap-1 rounded-full bg-accent/10 px-3 py-1 text-xs text-accent">
                                  <AiOutlineUser className="h-3 w-3" />
                                  {getGuardName(assignment.guardId)}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onAssignShift(shift);
                          }}
                          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-night-sky hover:bg-accent/90"
                        >
                          <AiOutlineUser className="inline h-4 w-4 mr-1" />
                          Assign
                        </button>
                      </div>
                    </div>
                  );
                })}
                {hourShifts.length === 0 && (
                  <button
                    onClick={() => onAddShift(dateStr, `${hour.toString().padStart(2, '0')}:00`)}
                    className="w-full rounded-lg border border-dashed border-white/20 py-4 text-sm text-white/40 hover:border-accent hover:bg-white/5 hover:text-accent transition-all"
                  >
                    <AiOutlinePlus className="inline h-4 w-4 mr-2" />
                    Add shift at {hour.toString().padStart(2, '0')}:00
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Month View Component (simplified for overview)
const MonthView = ({ shifts, currentDate, onDateChange, onShiftClick, onAddShift, getClientName, getSiteName, getShiftStatus, goToToday, monthNames, dayNames }) => {
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();
    return { daysInMonth, startDayOfWeek, year, month };
  };

  const { daysInMonth, startDayOfWeek, year, month } = getDaysInMonth(currentDate);

  const prevMonth = () => {
    onDateChange(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    onDateChange(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const getShiftsForDate = (day) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return shifts.filter(shift => shift.date === dateStr);
  };

  const isToday = (day) => {
    const today = new Date();
    return day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
  };

  const days = [];
  for (let i = 0; i < startDayOfWeek; i++) {
    days.push(null);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    days.push(day);
  }

  return (
    <div className="glass-panel overflow-hidden">
      {/* Header */}
      <div className="border-b border-white/10 bg-white/5 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">
            {monthNames[month]} {year}
          </h2>
          <div className="flex items-center gap-2">
            <button onClick={goToToday} className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white hover:bg-white/10">
              Today
            </button>
            <button onClick={prevMonth} className="rounded-lg border border-white/10 bg-white/5 p-2 text-white hover:bg-white/10">
              ←
            </button>
            <button onClick={nextMonth} className="rounded-lg border border-white/10 bg-white/5 p-2 text-white hover:bg-white/10">
              →
            </button>
          </div>
        </div>
      </div>

      {/* Day Names */}
      <div className="grid grid-cols-7 border-b border-white/10 bg-white/5">
        {dayNames.map((day) => (
          <div key={day} className="border-r border-white/10 p-3 text-center text-sm font-semibold text-white/70 last:border-r-0">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7">
        {days.map((day, index) => {
          const dayShifts = day ? getShiftsForDate(day) : [];
          const today = isToday(day);

          return (
            <div
              key={index}
              className={`min-h-[120px] border-b border-r border-white/10 p-2 last:border-r-0 ${
                !day ? 'bg-white/[0.02]' : 'bg-transparent hover:bg-white/5'
              } ${today ? 'bg-accent/10' : ''}`}
            >
              {day && (
                <>
                  <div className="mb-2 flex items-center justify-between">
                    <span className={`text-sm font-medium ${today ? 'text-accent' : 'text-white'}`}>{day}</span>
                    {dayShifts.length > 0 && (
                      <span className="rounded-full bg-accent/20 px-2 py-0.5 text-xs text-accent">
                        {dayShifts.length}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1">
                    {dayShifts.slice(0, 3).map((shift) => {
                      const status = getShiftStatus(shift);
                      return (
                        <button
                          key={shift.$id}
                          onClick={() => onShiftClick(shift)}
                          className="w-full rounded-lg border border-white/10 bg-white/5 p-2 text-left text-xs hover:border-accent hover:bg-accent/10 transition-all"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-white truncate">{shift.startTime}</span>
                            <span className={`h-2 w-2 rounded-full ${status.color}`} title={status.text}></span>
                          </div>
                          <div className="text-white/60 truncate">{getClientName(shift.clientId)}</div>
                        </button>
                      );
                    })}
                    {dayShifts.length > 3 && (
                      <div className="text-xs text-white/50 text-center">+{dayShifts.length - 3} more</div>
                    )}
                  </div>

                  {dayShifts.length === 0 && (
                    <button
                      onClick={() => onAddShift(`${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`)}
                      className="mt-2 w-full rounded-lg border border-dashed border-white/20 py-1 text-xs text-white/40 hover:border-accent hover:text-accent transition-all"
                    >
                      + Add
                    </button>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CalendarView;
