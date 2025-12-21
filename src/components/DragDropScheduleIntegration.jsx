/**
 * Enhanced Scheduling Page with Drag-Drop Calendar
 * Integration wrapper for the DragDropSchedule component
 */

import React, { useState, useEffect } from 'react';
import { databases, config } from '../lib/appwrite';
import { Query } from 'appwrite';
import DragDropSchedule from './DragDropSchedule';
import MultiDaySchedule from './MultiDaySchedule';
import {
  fetchShiftsForDate,
  fetchShiftsForDateRange,
  fetchSiteShifts,
  saveShiftChanges,
  getShiftStats,
  transformShiftsForDragDrop,
  validateShiftForSave,
} from '../lib/dragDropShiftService';
import { Calendar, Grid3X3, AlertCircle, CheckCircle, Download } from 'lucide-react';

/**
 * DragDropScheduleIntegration
 * Provides full drag-and-drop scheduling with Appwrite backend integration
 */
const DragDropScheduleIntegration = ({
  onScheduleChange = null,
  showMultiDay = true,
  defaultView = 'single',
  siteId = null,
}) => {
  const [view, setView] = useState(defaultView); // 'single' or 'multi'
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [shifts, setShifts] = useState([]);
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState(null);

  // Load initial data
  useEffect(() => {
    loadData();
  }, [siteId]);

  // Load shifts when date changes (single-day view)
  useEffect(() => {
    if (view === 'single') {
      loadShiftsForDate(selectedDate);
    }
  }, [selectedDate, view]);

  // Load shifts for week view
  useEffect(() => {
    if (view === 'multi') {
      loadWeekShifts();
    }
  }, [view]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch sites
      try {
        const sitesRes = await databases.listDocuments(
          config.databaseId,
          config.sitesCollectionId,
          [Query.limit(100)]
        );
        setSites(sitesRes.documents);
      } catch (innerErr) {
        console.error('Error loading sites:', innerErr);
      }

      // Load initial shifts
      await loadShiftsForDate(selectedDate);
    } catch (err) {
      console.error('Error loading data:', err);
      setError(err?.message || 'Failed to load scheduling data');
    } finally {
      setLoading(false);
    }
  };

  const loadShiftsForDate = async (date) => {
    try {
      setLoading(true);
      let shiftsData;

      if (siteId) {
        shiftsData = await fetchSiteShifts(siteId, date, date);
      } else {
        shiftsData = await fetchShiftsForDate(date);
      }

      const transformed = transformShiftsForDragDrop(shiftsData);
      setShifts(transformed);
      setError(null);
    } catch (err) {
      console.error('Error loading shifts:', err);
      setError(err?.message || 'Failed to load shifts');
    } finally {
      setLoading(false);
    }
  };

  const loadWeekShifts = async () => {
    try {
      setLoading(true);
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 6);

      const startStr = startDate.toISOString().split('T')[0];
      const endStr = endDate.toISOString().split('T')[0];

      let shiftsData;

      if (siteId) {
        shiftsData = await fetchSiteShifts(siteId, startStr, endStr);
      } else {
        shiftsData = await fetchShiftsForDateRange(startStr, endStr);
      }

      const transformed = transformShiftsForDragDrop(shiftsData);
      setShifts(transformed);

      // Load stats
      try {
        const statsData = await getShiftStats(startStr, endStr, siteId);
        setStats(statsData);
      } catch (statsErr) {
        console.error('Error loading stats:', statsErr);
      }
      setError(null);
    } catch (err) {
      console.error('Error loading week shifts:', err);
      setError(err?.message || 'Failed to load shifts');
    } finally {
      setLoading(false);
    }
  };

  const handleShiftsChange = async (newShifts) => {
    try {
      // Validate all shifts
      const validations = newShifts.map(shift => validateShiftForSave(shift));
      const hasErrors = validations.some(v => !v.valid);

      if (hasErrors) {
        const errors = validations
          .filter(v => !v.valid)
          .flatMap(v => v.errors)
          .slice(0, 3);
        setError(`Validation errors: ${errors.join(', ')}`);
        return;
      }

      setSaving(true);
      setError(null);
      setSuccess(null);

      // Save changes to backend
      const result = await saveShiftChanges(shifts, newShifts, selectedDate);

      if (result.success) {
        setShifts(newShifts);
        setSuccess(
          `Schedule saved! (${result.created} created, ${result.updated} updated, ${result.deleted} deleted)`
        );
        
        // Call optional callback
        if (onScheduleChange) {
          onScheduleChange(newShifts);
        }

        // Clear success message after 5 seconds
        setTimeout(() => setSuccess(null), 5000);
      } else {
        setError(`Failed to save all changes (${result.failed} errors)`);
      }
    } catch (err) {
      console.error('Error saving shifts:', err);
      setError(`Failed to save schedule: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(shifts, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `schedule-${selectedDate || new Date().toISOString().split('T')[0]}.json`;
    link.click();
  };

  if (loading && shifts.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center bg-gray-50 rounded-lg border border-gray-200">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto"></div>
          <p className="text-gray-600">Loading schedule...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Controls */}
      <div className="flex items-center justify-between flex-wrap gap-4 bg-white p-4 rounded-lg border border-gray-200">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Schedule Management</h2>
          <p className="text-sm text-gray-500 mt-1">
            Drag shifts to move, resize to change duration, click to create
          </p>
        </div>

        <div className="flex items-center gap-2">
          {showMultiDay && (
            <>
              <button
                onClick={() => setView('single')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${
                  view === 'single'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Grid3X3 size={18} />
                Day
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
                Week
              </button>
            </>
          )}

          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition font-medium"
          >
            <Download size={18} />
            Export
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Error</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
          <CheckCircle size={20} className="flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Success</p>
            <p className="text-sm mt-1">{success}</p>
          </div>
        </div>
      )}

      {saving && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-700">
          <p className="font-semibold">Saving changes...</p>
        </div>
      )}

      {/* Diagnostics when misconfigured */}
      {(config.isDemoMode || !config.projectId || !config.databaseId || !config.shiftsCollectionId) && (
        <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800">
          <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Scheduling backend not fully configured</p>
            <p className="text-sm mt-1">
              {config.isDemoMode
                ? 'Demo mode is ON. Set VITE_ENABLE_DEMO_MODE=false in Vercel env.'
                : 'Missing Appwrite env or client setup. Ensure VITE_APPWRITE_* vars are set and Web Platform origins include this domain.'}
            </p>
          </div>
        </div>
      )}

      {/* Calendar Component */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {/* Lightweight runtime info to aid verification */}
        <div className="px-4 py-2 border-b border-gray-200 text-xs text-gray-600 flex items-center justify-between">
          <span>
            Loaded: {shifts.length} shift{shifts.length === 1 ? '' : 's'} {view === 'single' ? `for ${selectedDate}` : 'this week'}
            {siteId ? ` • Site: ${siteId}` : ' • All sites'}
          </span>
          <span>Appwrite: {config.projectId ? 'configured' : 'missing'}{config.isDemoMode ? ' • demo' : ''}</span>
        </div>
        {view === 'single' ? (
          <>
            {/* Date Picker for Single-Day */}
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

            {/* Single-Day Schedule */}
            <DragDropSchedule
              shifts={shifts}
              onShiftsChange={handleShiftsChange}
              date={selectedDate}
              dayStartHour={8}
              dayEndHour={22}
              siteId={siteId}
              readonly={saving}
            />
          </>
        ) : (
          <>
            {/* Multi-Day Schedule */}
            <MultiDaySchedule
              shifts={shifts}
              onShiftsChange={handleShiftsChange}
              startDate={new Date()}
              numDays={7}
              dayStartHour={8}
              dayEndHour={22}
              readonly={saving}
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
                  <p className="text-sm text-gray-600">Coverage</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.staffCoverage}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Active</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.byStatus?.active || 0}
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Info Message */}
      {shifts.length === 0 && !loading && (
        <div className="text-center p-8 bg-gray-50 rounded-lg border border-gray-200">
          <Calendar size={32} className="mx-auto text-gray-400 mb-2" />
          <p className="text-gray-600">No shifts scheduled</p>
          <p className="text-sm text-gray-500 mt-1">
            Click on the calendar to create a new shift
          </p>
        </div>
      )}
    </div>
  );
};

export default DragDropScheduleIntegration;
