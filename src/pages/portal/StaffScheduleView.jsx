/**
 * Staff Personal Schedule - Drag-Drop View
 * Read-only drag-drop calendar showing guard's assigned shifts
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import DragDropSchedule from '../../components/DragDropSchedule';
import MultiDaySchedule from '../../components/MultiDaySchedule';
import {
  fetchStaffShifts,
  transformShiftsForDragDrop,
  getShiftStats,
} from '../../lib/dragDropShiftService';
import PortalHeader from '../../components/PortalHeader';
import { Calendar, Grid3X3, AlertCircle } from 'lucide-react';

/**
 * StaffScheduleView - Read-only drag-drop calendar for staff
 * Shows their assigned shifts in an easy-to-view format
 */
const StaffScheduleView = () => {
  const { user } = useAuth();
  const [view, setView] = useState('multi'); // 'single' or 'multi'
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);

  // Load staff's shifts
  useEffect(() => {
    if (user?.$id) {
      loadStaffShifts();
    }
  }, [user]);

  const loadStaffShifts = async () => {
    try {
      setLoading(true);
      setError(null);

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7); // Last 7 days
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 30); // Next 30 days

      const startStr = startDate.toISOString().split('T')[0];
      const endStr = endDate.toISOString().split('T')[0];

      // Fetch staff's assigned shifts
      const shiftsData = await fetchStaffShifts(user.$id, startStr, endStr);
      const transformed = transformShiftsForDragDrop(shiftsData);
      setShifts(transformed);

      // Load statistics
      const statsData = await getShiftStats(startStr, endStr);
      setStats(statsData);
    } catch (err) {
      console.error('Error loading staff shifts:', err);
      setError('Failed to load your schedule');
    } finally {
      setLoading(false);
    }
  };

  const handleShiftClick = (shift) => {
    console.log('Shift clicked:', shift);
    // Could open a modal with shift details, QR code for check-in, etc.
  };

  if (loading) {
    return (
      <div>
        <PortalHeader
          title="My Schedule"
          subtitle="View your assigned shifts"
          icon="calendar"
        />
        <div className="p-6 flex h-64 items-center justify-center bg-gray-50 rounded-lg border border-gray-200">
          <div className="text-center">
            <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto"></div>
            <p className="text-gray-600">Loading your schedule...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PortalHeader
        title="My Schedule"
        subtitle="View and track your assigned shifts"
        icon="calendar"
      />

      <div className="p-6 space-y-4">
        {/* Header with Controls */}
        <div className="flex items-center justify-between flex-wrap gap-4 bg-white p-4 rounded-lg border border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Your Schedule</h2>
            <p className="text-sm text-gray-500 mt-1">
              {user?.name || 'Your'} assigned shifts for the next 30 days
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setView('single')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${
                view === 'single'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Grid3X3 size={18} />
              Day View
            </button>
            <button
              onClick={() => setView('multi')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${
                view === 'multi'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Calendar size={18} />
              Week View
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        {/* Calendar - Read Only */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {view === 'single' ? (
            <>
              <div className="p-4 border-b border-gray-200">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Select Date
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <DragDropSchedule
                shifts={shifts}
                onShiftsChange={() => {}} // Read-only
                date={selectedDate}
                dayStartHour={8}
                dayEndHour={22}
                readonly={true} // Staff can't edit
                onShiftClick={handleShiftClick}
              />
            </>
          ) : (
            <>
              <MultiDaySchedule
                shifts={shifts}
                onShiftsChange={() => {}} // Read-only
                startDate={new Date()}
                numDays={7}
                dayStartHour={8}
                dayEndHour={22}
                readonly={true} // Staff can't edit
                onShiftClick={handleShiftClick}
              />

              {/* Statistics */}
              {stats && (
                <div className="grid grid-cols-4 gap-4 p-4 bg-gray-50 border-t border-gray-200">
                  <div>
                    <p className="text-sm text-gray-600">Total Shifts</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Hours</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalHours}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Upcoming</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {shifts.filter(s => s.date >= new Date().toISOString().split('T')[0]).length}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Status</p>
                    <p className="text-2xl font-bold text-green-600">Ready</p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Empty State */}
        {shifts.length === 0 && !loading && (
          <div className="text-center p-8 bg-blue-50 rounded-lg border border-blue-200">
            <Calendar size={32} className="mx-auto text-blue-400 mb-2" />
            <p className="text-blue-900 font-semibold">No shifts scheduled yet</p>
            <p className="text-sm text-blue-700 mt-1">
              Check back soon or contact your manager for shift assignments
            </p>
          </div>
        )}

        {/* Info Section */}
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <h3 className="font-semibold text-blue-900 mb-2">About Your Schedule</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Your shifts are displayed in the calendar above</li>
            <li>• Blue boxes show when you're scheduled to work</li>
            <li>• Click a shift to view more details</li>
            <li>• Use Day View for detailed hourly breakdown</li>
            <li>• Use Week View to see your full schedule</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default StaffScheduleView;
