import React, { useState, useEffect } from 'react';
import { databases, config } from '../../lib/appwrite';
import { Query } from 'appwrite';
import { demoGuards } from '../../data/demoGuards';
import {
  AiOutlineClockCircle,
  AiOutlineCalendar,
  AiOutlineUser,
  AiOutlineEnvironment,
  AiOutlineCheckCircle,
  AiOutlineCloseCircle,
  AiOutlineWarning,
  AiOutlineEdit,
  AiOutlineDownload,
  AiOutlineFilter,
  AiOutlineSearch,
} from 'react-icons/ai';

const TimeTracking = () => {
  const [timeEntries, setTimeEntries] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [guards, setGuards] = useState([]);
  const [clients, setClients] = useState([]);
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('all'); // all, pending, approved, disputed
  const [dateRange, setDateRange] = useState('week'); // today, week, month, custom
  const [selectedGuard, setSelectedGuard] = useState('');
  const [selectedClient, setSelectedClient] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingEntry, setEditingEntry] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    fetchData();
  }, [dateRange, selectedGuard, selectedClient]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch all data in parallel with error handling
      let guardsData = [];
      try {
        const [assignmentsRes, shiftsRes, guardsRes, clientsRes, sitesRes] = await Promise.all([
          databases.listDocuments(config.databaseId, config.shiftAssignmentsCollectionId, [Query.limit(500)]),
          databases.listDocuments(config.databaseId, config.shiftsCollectionId, [Query.limit(500)]),
          databases.listDocuments(config.databaseId, config.guardsCollectionId, [Query.limit(500)]),
          databases.listDocuments(config.databaseId, config.clientsCollectionId, [Query.limit(500)]),
          databases.listDocuments(config.databaseId, config.sitesCollectionId, [Query.limit(500)]),
        ]);

        setTimeEntries(assignmentsRes.documents);
        setShifts(shiftsRes.documents);
        guardsData = guardsRes.documents;
        setClients(clientsRes.documents);
        setSites(sitesRes.documents);
      } catch (error) {
        console.log('Using demo guards:', error);
        guardsData = demoGuards;
      }
      
      setGuards(guardsData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getGuardName = (guardId) => {
    const guard = guards.find(g => g.$id === guardId);
    return guard ? `${guard.firstName} ${guard.lastName}` : 'Unknown';
  };

  const getShiftDetails = (shiftId) => {
    return shifts.find(s => s.$id === shiftId) || {};
  };

  const getClientName = (clientId) => {
    const client = clients.find(c => c.$id === clientId);
    return client ? client.companyName : 'Unknown';
  };

  const getSiteName = (siteId) => {
    const site = sites.find(s => s.$id === siteId);
    return site ? site.siteName : 'Unknown';
  };

  const calculateHours = (checkInTime, checkOutTime) => {
    if (!checkInTime || !checkOutTime) return null;
    const diff = new Date(checkOutTime) - new Date(checkInTime);
    return (diff / (1000 * 60 * 60)).toFixed(2);
  };

  const calculateScheduledHours = (startTime, endTime) => {
    if (!startTime || !endTime) return 0;
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    return ((endMinutes - startMinutes) / 60).toFixed(2);
  };

  const getTimeStatus = (entry, shift) => {
    if (!entry.checkInTime) return { status: 'pending', label: 'Not Started', color: 'bg-gray-500' };
    if (!entry.checkOutTime) return { status: 'in-progress', label: 'In Progress', color: 'bg-blue-500' };
    
    const actualHours = parseFloat(calculateHours(entry.checkInTime, entry.checkOutTime));
    const scheduledHours = parseFloat(calculateScheduledHours(shift.startTime, shift.endTime));
    
    if (entry.status === 'no-show') return { status: 'no-show', label: 'No Show', color: 'bg-red-500' };
    if (actualHours < scheduledHours * 0.9) return { status: 'short', label: 'Short Hours', color: 'bg-yellow-500' };
    if (actualHours > scheduledHours * 1.1) return { status: 'overtime', label: 'Overtime', color: 'bg-purple-500' };
    
    return { status: 'complete', label: 'Complete', color: 'bg-green-500' };
  };

  const filterEntries = () => {
    let filtered = [...timeEntries];

    // Filter by date range
    const now = new Date();
    if (dateRange === 'today') {
      const today = now.toISOString().split('T')[0];
      filtered = filtered.filter(entry => {
        const shift = getShiftDetails(entry.shiftId);
        return shift.shiftDate === today;
      });
    } else if (dateRange === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(entry => {
        const shift = getShiftDetails(entry.shiftId);
        return new Date(shift.shiftDate) >= weekAgo;
      });
    } else if (dateRange === 'month') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(entry => {
        const shift = getShiftDetails(entry.shiftId);
        return new Date(shift.shiftDate) >= monthAgo;
      });
    }

    // Filter by guard
    if (selectedGuard) {
      filtered = filtered.filter(entry => entry.guardId === selectedGuard);
    }

    // Filter by client
    if (selectedClient) {
      filtered = filtered.filter(entry => {
        const shift = getShiftDetails(entry.shiftId);
        return shift.clientId === selectedClient;
      });
    }

    // Filter by view status
    if (view === 'pending') {
      filtered = filtered.filter(entry => !entry.checkInTime || !entry.checkOutTime);
    } else if (view === 'approved') {
      filtered = filtered.filter(entry => entry.status === 'completed');
    } else if (view === 'disputed') {
      filtered = filtered.filter(entry => {
        const shift = getShiftDetails(entry.shiftId);
        if (!entry.checkInTime || !entry.checkOutTime) return false;
        const actualHours = parseFloat(calculateHours(entry.checkInTime, entry.checkOutTime));
        const scheduledHours = parseFloat(calculateScheduledHours(shift.startTime, shift.endTime));
        return Math.abs(actualHours - scheduledHours) > scheduledHours * 0.1;
      });
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(entry => {
        const guardName = getGuardName(entry.guardId).toLowerCase();
        const shift = getShiftDetails(entry.shiftId);
        const clientName = getClientName(shift.clientId).toLowerCase();
        const siteName = getSiteName(shift.siteId).toLowerCase();
        return guardName.includes(searchTerm.toLowerCase()) ||
               clientName.includes(searchTerm.toLowerCase()) ||
               siteName.includes(searchTerm.toLowerCase());
      });
    }

    // Sort by date descending
    filtered.sort((a, b) => {
      const shiftA = getShiftDetails(a.shiftId);
      const shiftB = getShiftDetails(b.shiftId);
      return new Date(shiftB.shiftDate) - new Date(shiftA.shiftDate);
    });

    return filtered;
  };

  const calculateStats = () => {
    const filtered = filterEntries();
    const totalEntries = filtered.length;
    const completed = filtered.filter(e => e.checkInTime && e.checkOutTime).length;
    const inProgress = filtered.filter(e => e.checkInTime && !e.checkOutTime).length;
    const pending = filtered.filter(e => !e.checkInTime).length;
    
    let totalHours = 0;
    let overtimeHours = 0;
    
    filtered.forEach(entry => {
      const shift = getShiftDetails(entry.shiftId);
      if (entry.checkInTime && entry.checkOutTime) {
        const actualHours = parseFloat(calculateHours(entry.checkInTime, entry.checkOutTime));
        const scheduledHours = parseFloat(calculateScheduledHours(shift.startTime, shift.endTime));
        totalHours += actualHours;
        if (actualHours > scheduledHours) {
          overtimeHours += (actualHours - scheduledHours);
        }
      }
    });

    return { totalEntries, completed, inProgress, pending, totalHours: totalHours.toFixed(2), overtimeHours: overtimeHours.toFixed(2) };
  };

  const handleEditEntry = (entry) => {
    setEditingEntry({
      ...entry,
      checkInTime: entry.checkInTime ? new Date(entry.checkInTime).toISOString().slice(0, 16) : '',
      checkOutTime: entry.checkOutTime ? new Date(entry.checkOutTime).toISOString().slice(0, 16) : '',
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    try {
      const updateData = {
        checkInTime: editingEntry.checkInTime ? new Date(editingEntry.checkInTime).toISOString() : null,
        checkOutTime: editingEntry.checkOutTime ? new Date(editingEntry.checkOutTime).toISOString() : null,
        status: editingEntry.checkOutTime ? 'completed' : (editingEntry.checkInTime ? 'checked-in' : 'assigned'),
      };

      await databases.updateDocument(
        config.databaseId,
        config.shiftAssignmentsCollectionId,
        editingEntry.$id,
        updateData
      );

      setShowEditModal(false);
      setEditingEntry(null);
      await fetchData();
      alert('Time entry updated successfully!');
    } catch (error) {
      console.error('Error updating entry:', error);
      alert('Failed to update time entry');
    }
  };

  const handleExport = () => {
    const filtered = filterEntries();
    const csvData = filtered.map(entry => {
      const shift = getShiftDetails(entry.shiftId);
      const status = getTimeStatus(entry, shift);
      const actualHours = entry.checkInTime && entry.checkOutTime ? calculateHours(entry.checkInTime, entry.checkOutTime) : 'N/A';
      const scheduledHours = calculateScheduledHours(shift.startTime, shift.endTime);

      return {
        Date: shift.shiftDate,
        Guard: getGuardName(entry.guardId),
        Client: getClientName(shift.clientId),
        Site: getSiteName(shift.siteId),
        'Scheduled Start': shift.startTime,
        'Scheduled End': shift.endTime,
        'Scheduled Hours': scheduledHours,
        'Check In': entry.checkInTime ? new Date(entry.checkInTime).toLocaleString() : 'N/A',
        'Check Out': entry.checkOutTime ? new Date(entry.checkOutTime).toLocaleString() : 'N/A',
        'Actual Hours': actualHours,
        Status: status.label,
      };
    });

    const csv = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `time-tracking-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const stats = calculateStats();
  const filteredEntries = filterEntries();

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <AiOutlineClockCircle className="mx-auto mb-4 h-12 w-12 animate-spin text-accent" />
          <p className="text-white/70">Loading time tracking data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Time Tracking</h1>
          <p className="mt-2 text-white/70">Track guard hours, attendance, and approve timesheets</p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 font-semibold text-white hover:bg-accent/90 transition-all"
        >
          <AiOutlineDownload className="h-5 w-5" />
          Export CSV
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-6">
        <div className="glass-panel p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/50">Total Entries</p>
              <p className="mt-2 text-3xl font-bold text-white">{stats.totalEntries}</p>
            </div>
            <AiOutlineCalendar className="h-8 w-8 text-accent" />
          </div>
        </div>

        <div className="glass-panel p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/50">Completed</p>
              <p className="mt-2 text-3xl font-bold text-green-400">{stats.completed}</p>
            </div>
            <AiOutlineCheckCircle className="h-8 w-8 text-green-400" />
          </div>
        </div>

        <div className="glass-panel p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/50">In Progress</p>
              <p className="mt-2 text-3xl font-bold text-blue-400">{stats.inProgress}</p>
            </div>
            <AiOutlineClockCircle className="h-8 w-8 text-blue-400" />
          </div>
        </div>

        <div className="glass-panel p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/50">Pending</p>
              <p className="mt-2 text-3xl font-bold text-yellow-400">{stats.pending}</p>
            </div>
            <AiOutlineWarning className="h-8 w-8 text-yellow-400" />
          </div>
        </div>

        <div className="glass-panel p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/50">Total Hours</p>
              <p className="mt-2 text-3xl font-bold text-white">{stats.totalHours}</p>
            </div>
            <AiOutlineClockCircle className="h-8 w-8 text-accent" />
          </div>
        </div>

        <div className="glass-panel p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/50">Overtime</p>
              <p className="mt-2 text-3xl font-bold text-purple-400">{stats.overtimeHours}</p>
            </div>
            <AiOutlineWarning className="h-8 w-8 text-purple-400" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-panel p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
          {/* Search */}
          <div className="relative">
            <AiOutlineSearch className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-white/50" />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 py-2 pl-10 pr-4 text-white placeholder-white/50 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>

          {/* Date Range */}
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="rounded-lg border border-white/10 bg-night-sky py-2 px-4 text-white focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent [&>option]:bg-night-sky [&>option]:text-white"
          >
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="all">All Time</option>
          </select>

          {/* Guard Filter */}
          <select
            value={selectedGuard}
            onChange={(e) => setSelectedGuard(e.target.value)}
            className="rounded-lg border border-white/10 bg-night-sky py-2 px-4 text-white focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent [&>option]:bg-night-sky [&>option]:text-white"
          >
            <option value="">All Guards</option>
            {guards.map(guard => (
              <option key={guard.$id} value={guard.$id}>
                {guard.firstName} {guard.lastName}
              </option>
            ))}
          </select>

          {/* Client Filter */}
          <select
            value={selectedClient}
            onChange={(e) => setSelectedClient(e.target.value)}
            className="rounded-lg border border-white/10 bg-night-sky py-2 px-4 text-white focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent [&>option]:bg-night-sky [&>option]:text-white"
          >
            <option value="">All Clients</option>
            {clients.map(client => (
              <option key={client.$id} value={client.$id}>
                {client.companyName}
              </option>
            ))}
          </select>

          {/* View Filter */}
          <select
            value={view}
            onChange={(e) => setView(e.target.value)}
            className="rounded-lg border border-white/10 bg-night-sky py-2 px-4 text-white focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent [&>option]:bg-night-sky [&>option]:text-white"
          >
            <option value="all">All Entries</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="disputed">Disputed</option>
          </select>
        </div>
      </div>

      {/* Time Entries Table */}
      <div className="glass-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="px-6 py-4 text-left text-sm font-semibold text-white">Date</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white">Guard</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white">Client / Site</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white">Scheduled</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white">Check In</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white">Check Out</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white">Hours</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white">Status</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-6 py-12 text-center text-white/50">
                    No time entries found
                  </td>
                </tr>
              ) : (
                filteredEntries.map((entry) => {
                  const shift = getShiftDetails(entry.shiftId);
                  const status = getTimeStatus(entry, shift);
                  const actualHours = entry.checkInTime && entry.checkOutTime ? calculateHours(entry.checkInTime, entry.checkOutTime) : null;
                  const scheduledHours = calculateScheduledHours(shift.startTime, shift.endTime);

                  return (
                    <tr key={entry.$id} className="border-b border-white/10 hover:bg-white/5">
                      <td className="px-6 py-4 text-sm text-white">
                        {shift.shiftDate ? new Date(shift.shiftDate).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <AiOutlineUser className="h-4 w-4 text-accent" />
                          <span className="text-sm text-white">{getGuardName(entry.guardId)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-white">{getClientName(shift.clientId)}</div>
                        <div className="text-xs text-white/50">{getSiteName(shift.siteId)}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-white">{shift.startTime} - {shift.endTime}</div>
                        <div className="text-xs text-white/50">{scheduledHours}h</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-white">
                        {entry.checkInTime ? new Date(entry.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-white">
                        {entry.checkOutTime ? new Date(entry.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                      </td>
                      <td className="px-6 py-4">
                        {actualHours ? (
                          <div>
                            <div className="text-sm font-semibold text-white">{actualHours}h</div>
                            {Math.abs(actualHours - scheduledHours) > 0.1 && (
                              <div className={`text-xs ${actualHours > scheduledHours ? 'text-purple-400' : 'text-yellow-400'}`}>
                                {actualHours > scheduledHours ? '+' : ''}{(actualHours - scheduledHours).toFixed(2)}h
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-white/50">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium text-white ${status.color}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleEditEntry(entry)}
                          className="rounded-lg border border-white/10 bg-white/5 p-2 text-white hover:bg-white/10 transition-all"
                        >
                          <AiOutlineEdit className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && editingEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="glass-panel w-full max-w-2xl">
            <div className="border-b border-white/10 bg-white/5 p-6">
              <h2 className="text-2xl font-bold text-white">Edit Time Entry</h2>
              <p className="mt-2 text-sm text-white/70">
                {getGuardName(editingEntry.guardId)} - {new Date(getShiftDetails(editingEntry.shiftId).shiftDate).toLocaleDateString()}
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-white">Check In Time</label>
                  <input
                    type="datetime-local"
                    value={editingEntry.checkInTime}
                    onChange={(e) => setEditingEntry({ ...editingEntry, checkInTime: e.target.value })}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-white">Check Out Time</label>
                  <input
                    type="datetime-local"
                    value={editingEntry.checkOutTime}
                    onChange={(e) => setEditingEntry({ ...editingEntry, checkOutTime: e.target.value })}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>
              </div>

              {editingEntry.checkInTime && editingEntry.checkOutTime && (
                <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                  <p className="text-sm text-white/70">
                    Total Hours: <span className="font-semibold text-white">
                      {calculateHours(editingEntry.checkInTime, editingEntry.checkOutTime)}h
                    </span>
                  </p>
                </div>
              )}
            </div>

            <div className="border-t border-white/10 bg-white/5 p-6">
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingEntry(null);
                  }}
                  className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 font-medium text-white hover:bg-white/10 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="rounded-lg bg-accent px-4 py-2 font-semibold text-white hover:bg-accent/90 transition-all"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimeTracking;
