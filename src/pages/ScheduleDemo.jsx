import React, { useState, useEffect } from 'react';
import DragDropSchedule from '../components/DragDropSchedule';
import MultiDaySchedule from '../components/MultiDaySchedule';
import { Calendar, Grid3X3, ChevronDown } from 'lucide-react';

/**
 * Interactive Schedule Demo Page
 * Showcases drag-and-drop schedule UI features
 */
const ScheduleDemo = () => {
  const [activeTab, setActiveTab] = useState('single'); // 'single' or 'multi'
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [shifts, setShifts] = useState([
    {
      $id: 'shift_1',
      date: new Date().toISOString().split('T')[0],
      startTime: '09:00',
      endTime: '12:00',
      title: 'Morning Security',
      description: 'Front entrance patrol',
      status: 'active',
      siteId: 'site_1',
      staffId: 'staff_1',
    },
    {
      $id: 'shift_2',
      date: new Date().toISOString().split('T')[0],
      startTime: '13:00',
      endTime: '17:00',
      title: 'Afternoon Shift',
      description: 'Building supervision',
      status: 'active',
      siteId: 'site_1',
      staffId: 'staff_2',
    },
    {
      $id: 'shift_3',
      date: new Date().toISOString().split('T')[0],
      startTime: '17:00',
      endTime: '21:00',
      title: 'Evening Coverage',
      description: 'Perimeter check',
      status: 'active',
      siteId: 'site_1',
      staffId: 'staff_3',
    },
  ]);

  const [sampleShiftsMultiDay, setSampleShiftsMultiDay] = useState(() => {
    const today = new Date();
    const shifts = [];
    
    // Generate shifts for 7 days
    for (let day = 0; day < 7; day++) {
      const date = new Date(today);
      date.setDate(date.getDate() + day);
      const dateStr = date.toISOString().split('T')[0];
      
      // Morning shift
      shifts.push({
        $id: `shift_${day}_1`,
        date: dateStr,
        startTime: '08:00',
        endTime: '12:00',
        title: 'Morning',
        status: 'active',
        siteId: 'site_1',
        staffId: 'staff_1',
      });
      
      // Afternoon shift
      shifts.push({
        $id: `shift_${day}_2`,
        date: dateStr,
        startTime: '13:00',
        endTime: '17:00',
        title: 'Afternoon',
        status: 'active',
        siteId: 'site_1',
        staffId: 'staff_2',
      });
      
      // Evening shift (alternate days)
      if (day % 2 === 0) {
        shifts.push({
          $id: `shift_${day}_3`,
          date: dateStr,
          startTime: '17:00',
          endTime: '21:00',
          title: 'Evening',
          status: 'active',
          siteId: 'site_1',
          staffId: 'staff_3',
        });
      }
    }
    
    return shifts;
  });

  const mockStaff = [
    { $id: 'staff_1', name: 'John Smith' },
    { $id: 'staff_2', name: 'Jane Doe' },
    { $id: 'staff_3', name: 'Mike Johnson' },
  ];

  const handleShiftsChange = (newShifts) => {
    setShifts(newShifts);
  };

  const handleMultiDayShiftsChange = (newShifts) => {
    setSampleShiftsMultiDay(newShifts);
  };

  const exportSchedule = () => {
    const data = activeTab === 'single' ? shifts : sampleShiftsMultiDay;
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `schedule-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Interactive Schedule</h1>
          <p className="text-gray-600">
            Create, move, and resize shifts using drag-and-drop
          </p>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-blue-900 mb-2">How to use:</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>🖱️ <strong>Drag shifts</strong> to move them to a different time</li>
            <li>↕️ <strong>Drag the bottom edge</strong> of a shift to resize it</li>
            <li>➕ <strong>Click on the calendar</strong> to quickly create a new shift</li>
            <li>👆 <strong>Click a shift</strong> to select and view details</li>
            <li>🗑️ <strong>Delete button</strong> appears when a shift is selected</li>
          </ul>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('single')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition ${
              activeTab === 'single'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            <Grid3X3 size={18} />
            Single Day
          </button>

          <button
            onClick={() => setActiveTab('multi')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition ${
              activeTab === 'multi'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            <Calendar size={18} />
            Week View
          </button>
        </div>

        {/* Content */}
        {activeTab === 'single' ? (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <DragDropSchedule
              shifts={shifts}
              onShiftsChange={handleShiftsChange}
              date={selectedDate}
              dayStartHour={8}
              dayEndHour={22}
              siteId="site_1"
              allowOverlap={false}
              className="mb-4"
            />

            {/* Date Selector */}
            <div className="mt-6 pt-6 border-t border-gray-200">
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
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <MultiDaySchedule
              shifts={sampleShiftsMultiDay}
              onShiftsChange={handleMultiDayShiftsChange}
              startDate={new Date()}
              numDays={7}
              dayStartHour={8}
              dayEndHour={22}
              groupByStaff={true}
              staffList={mockStaff}
            />
          </div>
        )}

        {/* Export Section */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">Export Schedule</h3>
              <p className="text-sm text-gray-600 mt-1">
                Download the current schedule as JSON
              </p>
            </div>
            <button
              onClick={exportSchedule}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium"
            >
              Export JSON
            </button>
          </div>
        </div>

        {/* Shift Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600">Total Shifts</p>
            <p className="text-3xl font-bold text-gray-900">
              {activeTab === 'single' ? shifts.length : sampleShiftsMultiDay.length}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600">Total Hours</p>
            <p className="text-3xl font-bold text-gray-900">
              {(
                (activeTab === 'single' ? shifts : sampleShiftsMultiDay).reduce((sum, shift) => {
                  const start = parseInt(shift.startTime.split(':')[0]);
                  const end = parseInt(shift.endTime.split(':')[0]);
                  return sum + (end - start);
                }, 0)
              )}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600">Coverage</p>
            <p className="text-3xl font-bold text-gray-900">
              {new Set(
                (activeTab === 'single' ? shifts : sampleShiftsMultiDay).map(s => s.staffId)
              ).size}
            </p>
          </div>
        </div>

        {/* Features Section */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3v-5.5" />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Drag to Move</h3>
            <p className="text-sm text-gray-600">
              Click and drag any shift to move it to a different time. The grid snaps to 30-minute intervals.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16M6 4v16M18 4v16" />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Resize Shifts</h3>
            <p className="text-sm text-gray-600">
              Hover over the bottom edge of a shift and drag to resize. Duration automatically recalculates.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Create Quickly</h3>
            <p className="text-sm text-gray-600">
              Click anywhere on the calendar to create a new shift. Instantly select duration and confirm.
            </p>
          </div>
        </div>

        {/* JSON Output */}
        <div className="mt-12 bg-gray-900 rounded-lg p-6 text-white">
          <h3 className="font-semibold text-lg mb-4">Raw Data (JSON)</h3>
          <pre className="text-sm overflow-x-auto bg-black rounded p-4 text-green-400 font-mono">
            {JSON.stringify(activeTab === 'single' ? shifts : sampleShiftsMultiDay, null, 2).substring(0, 500)}...
          </pre>
        </div>
      </div>
    </div>
  );
};

export default ScheduleDemo;
