import React, { useState, useEffect } from 'react';
import { databases, config } from '../../lib/appwrite';
import { Query } from 'appwrite';
import {
  AiOutlineCalendar,
  AiOutlineClockCircle,
  AiOutlineUser,
  AiOutlineEnvironment,
  AiOutlineCheckCircle,
  AiOutlineBarChart,
  AiOutlineDownload,
  AiOutlineFilter,
} from 'react-icons/ai';

const ClientPortal = () => {
  const [shifts, setShifts] = useState([]);
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentClient] = useState({
    $id: 'client-1',
    companyName: 'Acme Corporation',
    contactName: 'John Doe',
  }); // Simulated logged-in client
  
  const [view, setView] = useState('calendar'); // 'calendar', 'list'
  const [filterSite, setFilterSite] = useState('all');
  const [filterDate, setFilterDate] = useState('week'); // 'week', 'month', 'custom'
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    fetchClientData();
  }, []);

  const fetchClientData = async () => {
    try {
      setLoading(true);

      // Demo data - client can only see their own sites and shifts
      const demoSites = [
        {
          $id: 'site-1',
          siteName: 'Central Shopping Mall',
          address: '123 High Street, London',
          clientId: 'client-1',
          postsRequired: 3,
        },
        {
          $id: 'site-2',
          siteName: 'Office Tower B',
          address: '456 Business Park, London',
          clientId: 'client-1',
          postsRequired: 2,
        },
        {
          $id: 'site-3',
          siteName: 'Warehouse Complex',
          address: '789 Industrial Estate, London',
          clientId: 'client-1',
          postsRequired: 4,
        },
      ];

      const demoShifts = [
        // This week
        {
          $id: 'shift-1',
          siteId: 'site-1',
          siteName: 'Central Shopping Mall',
          date: '2025-12-16',
          startTime: '06:00',
          endTime: '14:00',
          guardName: 'John Smith',
          guardId: 'guard-1',
          status: 'confirmed',
          postName: 'Main Entrance',
        },
        {
          $id: 'shift-2',
          siteId: 'site-1',
          siteName: 'Central Shopping Mall',
          date: '2025-12-16',
          startTime: '14:00',
          endTime: '22:00',
          guardName: 'Michael Brown',
          guardId: 'guard-2',
          status: 'confirmed',
          postName: 'Main Entrance',
        },
        {
          $id: 'shift-3',
          siteId: 'site-1',
          siteName: 'Central Shopping Mall',
          date: '2025-12-16',
          startTime: '08:00',
          endTime: '16:00',
          guardName: 'Emily Davis',
          guardId: 'guard-3',
          status: 'confirmed',
          postName: 'CCTV Room',
        },
        {
          $id: 'shift-4',
          siteId: 'site-2',
          siteName: 'Office Tower B',
          date: '2025-12-17',
          startTime: '08:00',
          endTime: '16:00',
          guardName: 'David Wilson',
          guardId: 'guard-4',
          status: 'confirmed',
          postName: 'Reception',
        },
        {
          $id: 'shift-5',
          siteId: 'site-2',
          siteName: 'Office Tower B',
          date: '2025-12-17',
          startTime: '22:00',
          endTime: '06:00',
          guardName: 'Sarah Johnson',
          guardId: 'guard-5',
          status: 'confirmed',
          postName: 'Night Patrol',
        },
        {
          $id: 'shift-6',
          siteId: 'site-3',
          siteName: 'Warehouse Complex',
          date: '2025-12-18',
          startTime: '00:00',
          endTime: '08:00',
          guardName: 'James Taylor',
          guardId: 'guard-6',
          status: 'confirmed',
          postName: 'Gate Control',
        },
        {
          $id: 'shift-7',
          siteId: 'site-3',
          siteName: 'Warehouse Complex',
          date: '2025-12-18',
          startTime: '08:00',
          endTime: '16:00',
          guardName: 'John Smith',
          guardId: 'guard-1',
          status: 'confirmed',
          postName: 'Gate Control',
        },
        {
          $id: 'shift-8',
          siteId: 'site-3',
          siteName: 'Warehouse Complex',
          date: '2025-12-18',
          startTime: '16:00',
          endTime: '00:00',
          guardName: 'Michael Brown',
          guardId: 'guard-2',
          status: 'confirmed',
          postName: 'Gate Control',
        },
        {
          $id: 'shift-9',
          siteId: 'site-1',
          siteName: 'Central Shopping Mall',
          date: '2025-12-19',
          startTime: '06:00',
          endTime: '14:00',
          guardName: 'Emily Davis',
          guardId: 'guard-3',
          status: 'confirmed',
          postName: 'Main Entrance',
        },
        {
          $id: 'shift-10',
          siteId: 'site-2',
          siteName: 'Office Tower B',
          date: '2025-12-20',
          startTime: '08:00',
          endTime: '16:00',
          guardName: 'David Wilson',
          guardId: 'guard-4',
          status: 'confirmed',
          postName: 'Reception',
        },
        // Next week
        {
          $id: 'shift-11',
          siteId: 'site-1',
          siteName: 'Central Shopping Mall',
          date: '2025-12-23',
          startTime: '06:00',
          endTime: '14:00',
          guardName: 'John Smith',
          guardId: 'guard-1',
          status: 'published',
          postName: 'Main Entrance',
        },
        {
          $id: 'shift-12',
          siteId: 'site-3',
          siteName: 'Warehouse Complex',
          date: '2025-12-24',
          startTime: '00:00',
          endTime: '08:00',
          guardName: 'James Taylor',
          guardId: 'guard-6',
          status: 'published',
          postName: 'Gate Control',
        },
      ];

      setSites(demoSites);
      setShifts(demoShifts);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching client data:', error);
      setLoading(false);
    }
  };

  const getFilteredShifts = () => {
    let filtered = [...shifts];

    // Filter by site
    if (filterSite !== 'all') {
      filtered = filtered.filter((s) => s.siteId === filterSite);
    }

    // Filter by date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (filterDate === 'week') {
      const weekEnd = new Date(today);
      weekEnd.setDate(today.getDate() + 7);
      filtered = filtered.filter((s) => {
        const shiftDate = new Date(s.date);
        return shiftDate >= today && shiftDate <= weekEnd;
      });
    } else if (filterDate === 'month') {
      const monthEnd = new Date(today);
      monthEnd.setDate(today.getDate() + 30);
      filtered = filtered.filter((s) => {
        const shiftDate = new Date(s.date);
        return shiftDate >= today && shiftDate <= monthEnd;
      });
    }

    return filtered.sort((a, b) => new Date(a.date) - new Date(b.date));
  };

  const getStats = () => {
    const filtered = getFilteredShifts();
    return {
      totalShifts: filtered.length,
      confirmedShifts: filtered.filter((s) => s.status === 'confirmed').length,
      totalGuards: new Set(filtered.map((s) => s.guardId)).size,
      totalSites: new Set(filtered.map((s) => s.siteId)).size,
      coverageRate: filtered.length > 0 
        ? Math.round((filtered.filter((s) => s.status === 'confirmed').length / filtered.length) * 100)
        : 0,
    };
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';

    return date.toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  };

  const calculateDuration = (startTime, endTime) => {
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    let hours = endH - startH;
    if (hours < 0) hours += 24;
    return `${hours}h`;
  };

  const exportSchedule = () => {
    const filtered = getFilteredShifts();
    const csv = [
      ['Date', 'Site', 'Post', 'Guard', 'Start Time', 'End Time', 'Duration', 'Status'].join(','),
      ...filtered.map((shift) =>
        [
          shift.date,
          `"${shift.siteName}"`,
          `"${shift.postName}"`,
          `"${shift.guardName}"`,
          shift.startTime,
          shift.endTime,
          calculateDuration(shift.startTime, shift.endTime),
          shift.status,
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `schedule-${currentClient.companyName.replace(/\s/g, '-')}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const stats = getStats();
  const filteredShifts = getFilteredShifts();

  // Group shifts by date for calendar view
  const groupedShifts = filteredShifts.reduce((acc, shift) => {
    if (!acc[shift.date]) {
      acc[shift.date] = [];
    }
    acc[shift.date].push(shift);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-dark via-night-sky to-night-sky">
        <p className="text-white">Loading your schedule...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-dark via-night-sky to-night-sky p-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white">Client Portal</h1>
          <p className="mt-2 text-white/70">
            Welcome, {currentClient.contactName} ({currentClient.companyName})
          </p>
          <p className="mt-1 text-sm text-white/50">
            View your security schedule and coverage across all sites
          </p>
        </div>

        {/* Statistics */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-4">
            <p className="text-sm text-white/70">Total Shifts</p>
            <p className="mt-2 text-3xl font-bold text-white">{stats.totalShifts}</p>
          </div>
          <div className="rounded-xl border border-green-500/30 bg-green-500/10 backdrop-blur-sm p-4">
            <p className="text-sm text-green-300">Confirmed</p>
            <p className="mt-2 text-3xl font-bold text-green-500">{stats.confirmedShifts}</p>
          </div>
          <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 backdrop-blur-sm p-4">
            <p className="text-sm text-blue-300">Active Guards</p>
            <p className="mt-2 text-3xl font-bold text-blue-500">{stats.totalGuards}</p>
          </div>
          <div className="rounded-xl border border-purple-500/30 bg-purple-500/10 backdrop-blur-sm p-4">
            <p className="text-sm text-purple-300">Your Sites</p>
            <p className="mt-2 text-3xl font-bold text-purple-500">{stats.totalSites}</p>
          </div>
          <div className="rounded-xl border border-accent/30 bg-accent/10 backdrop-blur-sm p-4">
            <p className="text-sm text-accent/70">Coverage Rate</p>
            <p className="mt-2 text-3xl font-bold text-accent">{stats.coverageRate}%</p>
          </div>
        </div>

        {/* Filters and View Toggle */}
        <div className="mb-6 flex flex-wrap items-center gap-4">
          <div className="flex gap-2">
            <button
              onClick={() => setView('calendar')}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                view === 'calendar'
                  ? 'bg-accent text-white'
                  : 'bg-white/5 text-white/70 hover:bg-white/10'
              }`}
            >
              <AiOutlineCalendar />
              Calendar
            </button>
            <button
              onClick={() => setView('list')}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                view === 'list'
                  ? 'bg-accent text-white'
                  : 'bg-white/5 text-white/70 hover:bg-white/10'
              }`}
            >
              <AiOutlineBarChart />
              List
            </button>
          </div>

          <div className="flex items-center gap-2">
            <AiOutlineFilter className="text-white/70" />
            <select
              value={filterSite}
              onChange={(e) => setFilterSite(e.target.value)}
              className="rounded-lg border border-white/10 bg-night-sky px-3 py-2 text-sm text-white focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            >
              <option value="all">All Sites</option>
              {sites.map((site) => (
                <option key={site.$id} value={site.$id}>
                  {site.siteName}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="rounded-lg border border-white/10 bg-night-sky px-3 py-2 text-sm text-white focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            >
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="all">All Dates</option>
            </select>
          </div>

          <button
            onClick={exportSchedule}
            className="ml-auto flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-white hover:bg-accent/80 transition-colors"
          >
            <AiOutlineDownload />
            Export Schedule
          </button>
        </div>

        {/* Calendar View */}
        {view === 'calendar' && (
          <div className="space-y-4">
            {Object.keys(groupedShifts).length === 0 ? (
              <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-8 text-center">
                <AiOutlineCalendar className="mx-auto text-4xl text-white/30" />
                <p className="mt-4 text-white/70">No shifts scheduled for selected period</p>
              </div>
            ) : (
              Object.keys(groupedShifts)
                .sort()
                .map((date) => (
                  <div
                    key={date}
                    className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm overflow-hidden"
                  >
                    <div className="border-b border-white/10 bg-white/5 px-6 py-3">
                      <h3 className="font-semibold text-white flex items-center gap-2">
                        <AiOutlineCalendar className="text-accent" />
                        {formatDate(date)} - {new Date(date).toLocaleDateString('en-GB')}
                      </h3>
                      <p className="text-sm text-white/60 mt-1">
                        {groupedShifts[date].length} shift{groupedShifts[date].length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {groupedShifts[date].map((shift) => (
                          <div
                            key={shift.$id}
                            className="rounded-lg border border-white/10 bg-night-sky p-4"
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <h4 className="font-semibold text-white">{shift.siteName}</h4>
                                <p className="text-sm text-white/60">{shift.postName}</p>
                              </div>
                              <span
                                className={`rounded-full px-3 py-1 text-xs font-medium ${
                                  shift.status === 'confirmed'
                                    ? 'bg-green-500/20 text-green-500'
                                    : 'bg-blue-500/20 text-blue-500'
                                }`}
                              >
                                {shift.status === 'confirmed' ? (
                                  <span className="flex items-center gap-1">
                                    <AiOutlineCheckCircle />
                                    Confirmed
                                  </span>
                                ) : (
                                  'Published'
                                )}
                              </span>
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-sm text-white/70">
                                <AiOutlineUser className="text-accent" />
                                <span>{shift.guardName}</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-white/70">
                                <AiOutlineClockCircle className="text-accent" />
                                <span>
                                  {shift.startTime} - {shift.endTime} (
                                  {calculateDuration(shift.startTime, shift.endTime)})
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))
            )}
          </div>
        )}

        {/* List View */}
        {view === 'list' && (
          <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-white/10 bg-white/5">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white">Date</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white">Site</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white">Post</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white">Guard</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white">Time</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white">Duration</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {filteredShifts.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-8 text-center text-white/50">
                        No shifts found
                      </td>
                    </tr>
                  ) : (
                    filteredShifts.map((shift) => (
                      <tr key={shift.$id} className="hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4 text-sm text-white/90">
                          {formatDate(shift.date)}
                        </td>
                        <td className="px-6 py-4 text-sm text-white/90">
                          {shift.siteName}
                        </td>
                        <td className="px-6 py-4 text-sm text-white/70">
                          {shift.postName}
                        </td>
                        <td className="px-6 py-4 text-sm text-white/90">
                          <div className="flex items-center gap-2">
                            <AiOutlineUser className="text-accent" />
                            {shift.guardName}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-white/70">
                          {shift.startTime} - {shift.endTime}
                        </td>
                        <td className="px-6 py-4 text-sm text-white/70">
                          {calculateDuration(shift.startTime, shift.endTime)}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-medium ${
                              shift.status === 'confirmed'
                                ? 'bg-green-500/20 text-green-500'
                                : 'bg-blue-500/20 text-blue-500'
                            }`}
                          >
                            {shift.status === 'confirmed' ? 'Confirmed' : 'Published'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Info Notice */}
        <div className="mt-6 rounded-lg border border-blue-500/30 bg-blue-500/10 p-4">
          <p className="text-sm text-blue-300">
            <strong>Read-Only Access:</strong> This portal provides view-only access to your
            security schedule. For any changes or updates, please contact your account manager.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ClientPortal;
