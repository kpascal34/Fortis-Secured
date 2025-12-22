import React, { useState, useEffect } from 'react';
import { databases, config } from '../../lib/appwrite';
import { Query } from 'appwrite';
import {
  SHIFT_STATUS,
  STATUS_LABELS,
  STATUS_COLORS,
  validateShift,
  checkComplianceStatus,
  COMPLIANCE_STATUS,
  generateNotification,
  NOTIFICATION_TYPES,
} from '../../lib/scheduleUtils';
import {
  createAuditLog,
  AUDIT_CATEGORY,
  AUDIT_ACTION,
  auditShiftChange,
} from '../../lib/auditLog';
import PortalHeader from '../../components/PortalHeader';
import ShiftFormModal from '../../components/ShiftFormModal';
import GuardAssignmentModal from '../../components/GuardAssignmentModal';
import CalendarView from '../../components/CalendarView';
import {
  AiOutlinePlus,
  AiOutlineCalendar,
  AiOutlineUnorderedList,
  AiOutlineSearch,
  AiOutlineFilter,
  AiOutlineLoading3Quarters,
  AiOutlineUser,
  AiOutlineEnvironment,
  AiOutlineClockCircle,
  AiOutlineWarning,
  AiOutlineCheckCircle,
  AiOutlineEdit,
  AiOutlineDelete,
  AiOutlineCopy,
  AiOutlineBell,
  AiOutlineExclamationCircle,
} from 'react-icons/ai';

const Scheduling = () => {
  const [view, setView] = useState('list'); // 'list', 'calendar', 'week', 'day'
  const [calendarView, setCalendarView] = useState('week'); // 'week', 'month', 'day'
  const [shifts, setShifts] = useState([]);
  const [clients, setClients] = useState([]);
  const [sites, setSites] = useState([]);
  const [guards, setGuards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingShift, setEditingShift] = useState(null);
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
  const [assigningShift, setAssigningShift] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [assignments, setAssignments] = useState([]);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClient, setFilterClient] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDate, setFilterDate] = useState('');
  const [showUnfilledOnly, setShowUnfilledOnly] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      let shiftsData = [];
      let clientsData = [];
      let sitesData = [];
      let guardsData = [];
      let assignmentsData = [];

      try {
        const [shiftsRes, clientsRes, sitesRes, guardsRes, assignmentsRes] = await Promise.all([
          databases.listDocuments(config.databaseId, config.shiftsCollectionId, [
            Query.limit(100),
          ]),
          databases.listDocuments(config.databaseId, config.clientsCollectionId, [
            Query.limit(100),
          ]),
          databases.listDocuments(config.databaseId, config.sitesCollectionId, [
            Query.limit(100),
          ]),
          databases.listDocuments(config.databaseId, config.guardsCollectionId, [
            Query.limit(100),
          ]),
          databases.listDocuments(config.databaseId, config.shiftAssignmentsCollectionId, [
            Query.limit(200),
          ]),
        ]);

        shiftsData = shiftsRes.documents;
        clientsData = clientsRes.documents;
        sitesData = sitesRes.documents;
        guardsData = guardsRes.documents;
        assignmentsData = assignmentsRes.documents;
      } catch (error) {
        console.error('Error fetching from database. Connect Appwrite to load live data.', error);
        guardsData = [];
        shiftsData = [];
        clientsData = [];
        sitesData = [];
        assignmentsData = [];
      }

      console.log('Fetched clients:', clientsData);
      console.log('Fetched sites:', sitesData);
      console.log('Guards loaded:', guardsData);
      setShifts(shiftsData);
      setClients(clientsData);
      setSites(sitesData);
      setGuards(guardsData);
      setAssignments(assignmentsData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddShift = () => {
    setEditingShift(null);
    setIsModalOpen(true);
  };

  const handleEditShift = (shift) => {
    setEditingShift(shift);
    setIsModalOpen(true);
  };

  const handleDuplicateShift = async (shift) => {
    const { $id, $createdAt, $updatedAt, ...shiftData } = shift;
    setEditingShift({ ...shiftData, isDuplicate: true });
    setIsModalOpen(true);
  };

  const handleDeleteShift = async (shiftId) => {
    if (!window.confirm('Are you sure you want to delete this shift?')) return;

    try {
      await databases.deleteDocument(config.databaseId, config.shiftsCollectionId, shiftId);
      setShifts(shifts.filter((s) => s.$id !== shiftId));
      alert('Shift deleted successfully!');
    } catch (error) {
      console.error('Error deleting shift:', error);
      alert(`Failed to delete shift: ${error.message}`);
    }
  };

  const handleAssignGuards = (shift) => {
    setAssigningShift(shift);
    setIsAssignmentModalOpen(true);
  };

  const handleAssignmentModalClose = (shouldRefresh) => {
    setIsAssignmentModalOpen(false);
    setAssigningShift(null);
    if (shouldRefresh) fetchData();
  };

  const handleModalClose = (shouldRefresh) => {
    setIsModalOpen(false);
    setEditingShift(null);
    if (shouldRefresh) fetchData();
  };

  const getClientName = (clientId) => {
    const client = clients.find((c) => c.$id === clientId);
    return client?.companyName || 'Unknown Client';
  };

  const getSiteName = (siteId) => {
    const site = sites.find((s) => s.$id === siteId);
    return site?.siteName || 'Unknown Site';
  };

  const getStatusBadge = (status) => {
    const styles = {
      scheduled: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      'in-progress': 'bg-green-500/10 text-green-400 border-green-500/20',
      completed: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
      cancelled: 'bg-red-500/10 text-red-400 border-red-500/20',
      unfilled: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    };
    return styles[status] || styles.scheduled;
  };

  const filteredShifts = shifts.filter((shift) => {
    if (filterClient !== 'all' && shift.clientId !== filterClient) return false;
    if (filterStatus !== 'all' && shift.status !== filterStatus) return false;
    if (filterDate && shift.shiftDate !== filterDate) return false;
    if (showUnfilledOnly && shift.status !== 'unfilled') return false;
    if (searchTerm) {
      const clientName = getClientName(shift.clientId).toLowerCase();
      const siteName = getSiteName(shift.siteId).toLowerCase();
      const search = searchTerm.toLowerCase();
      return clientName.includes(search) || siteName.includes(search) || shift.shiftType?.toLowerCase().includes(search);
    }
    return true;
  });

  // Derived scheduling metrics for dashboard KPIs
  const activeAssignmentsByShift = assignments.reduce((acc, assignment) => {
    if (assignment.status !== 'cancelled') {
      acc[assignment.shiftId] = (acc[assignment.shiftId] || 0) + 1;
    }
    return acc;
  }, {});

  const totalRequiredHeadcount = filteredShifts.reduce(
    (sum, shift) => sum + (shift.requiredHeadcount || 1),
    0
  );
  const totalAssignedHeadcount = filteredShifts.reduce(
    (sum, shift) => sum + (activeAssignmentsByShift[shift.$id] || 0),
    0
  );

  const coverageRate = totalRequiredHeadcount
    ? Math.min(100, Math.round((totalAssignedHeadcount / totalRequiredHeadcount) * 1000) / 10)
    : 0;

  const unfilledShifts = filteredShifts.filter((shift) => {
    const required = shift.requiredHeadcount || 1;
    const assigned = activeAssignmentsByShift[shift.$id] || 0;
    return assigned < required || shift.status === 'unfilled';
  });

  const totalScheduledHours = filteredShifts.reduce((sum, shift) => {
    const [sh, sm] = (shift.startTime || '00:00').split(':').map(Number);
    const [eh, em] = (shift.endTime || '00:00').split(':').map(Number);
    const durationHours = Math.max(0, (eh * 60 + em - (sh * 60 + sm)) / 60);
    const headcount = shift.requiredHeadcount || 1;
    return sum + durationHours * headcount;
  }, 0);

  // Treat overtime as hours scheduled beyond 8h per shift per head
  const overtimeHours = filteredShifts.reduce((sum, shift) => {
    const [sh, sm] = (shift.startTime || '00:00').split(':').map(Number);
    const [eh, em] = (shift.endTime || '00:00').split(':').map(Number);
    const durationHours = Math.max(0, (eh * 60 + em - (sh * 60 + sm)) / 60);
    const headcount = shift.requiredHeadcount || 1;
    const overtimePerShift = Math.max(0, durationHours - 8) * headcount;
    return sum + overtimePerShift;
  }, 0);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-dark via-night-sky to-night-sky">
        <div className="flex flex-col items-center gap-4">
          <AiOutlineLoading3Quarters className="h-8 w-8 animate-spin text-accent" />
          <p className="text-sm text-white/70">Loading schedule...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-dark via-night-sky to-night-sky px-6 py-10 text-white">
      <div className="mx-auto max-w-7xl">
        <PortalHeader
          title="Scheduling"
          description="Manage guard shifts and assignments"
          eyebrow="Shift Management"
        >
          <div className="flex items-center gap-3">
            <div className="flex rounded-full border border-white/20 bg-white/5 p-1">
              <button
                onClick={() => setView('list')}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                  view === 'list' ? 'bg-accent text-night-sky' : 'text-white/70 hover:text-white'
                }`}
              >
                <AiOutlineUnorderedList className="inline h-4 w-4 mr-1" />
                List
              </button>
              <button
                onClick={() => setView('calendar')}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                  view === 'calendar' ? 'bg-accent text-night-sky' : 'text-white/70 hover:text-white'
                }`}
              >
                <AiOutlineCalendar className="inline h-4 w-4 mr-1" />
                Calendar
              </button>
            </div>
            {view === 'calendar' && (
              <div className="flex rounded-full border border-white/20 bg-white/5 p-1">
                <button
                  onClick={() => setCalendarView('day')}
                  className={`rounded-full px-3 py-2 text-xs font-medium transition-all ${
                    calendarView === 'day' ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white'
                  }`}
                >
                  Day
                </button>
                <button
                  onClick={() => setCalendarView('week')}
                  className={`rounded-full px-3 py-2 text-xs font-medium transition-all ${
                    calendarView === 'week' ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white'
                  }`}
                >
                  Week
                </button>
                <button
                  onClick={() => setCalendarView('month')}
                  className={`rounded-full px-3 py-2 text-xs font-medium transition-all ${
                    calendarView === 'month' ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white'
                  }`}
                >
                  Month
                </button>
              </div>
            )}
            <button
              onClick={handleAddShift}
              className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-night-sky shadow-lg shadow-accent/40 transition-all hover:bg-accent/90"
            >
              <AiOutlinePlus className="h-5 w-5" />
              Add Shift
            </button>
          </div>
        </PortalHeader>

        {/* Filters */}
        <div className="mb-6 glass-panel p-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <div className="relative">
              <AiOutlineSearch className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/40" />
              <input
                type="text"
                placeholder="Search shifts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 pl-12 pr-4 text-white placeholder:text-white/40 focus:border-accent focus:outline-none"
              />
            </div>

            <select
              value={filterClient}
              onChange={(e) => setFilterClient(e.target.value)}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-accent focus:outline-none"
            >
              <option value="all">All Clients</option>
              {clients.map((client) => (
                <option key={client.$id} value={client.$id}>
                  {client.companyName}
                </option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-accent focus:outline-none"
            >
              <option value="all">All Status</option>
              <option value="scheduled">Scheduled</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="unfilled">Unfilled</option>
            </select>

            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-accent focus:outline-none"
            />

            <label className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 cursor-pointer">
              <input
                type="checkbox"
                checked={showUnfilledOnly}
                onChange={(e) => setShowUnfilledOnly(e.target.checked)}
                className="h-4 w-4 rounded border-white/20 bg-white/10 text-accent focus:ring-accent"
              />
              <span className="text-sm text-white">Unfilled Only</span>
            </label>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          <div className="glass-panel p-6">
            <p className="text-sm text-white/70">Total Shifts</p>
            <p className="mt-2 text-3xl font-bold text-white">{filteredShifts.length}</p>
          </div>
          <div className="glass-panel p-6">
            <p className="text-sm text-white/70">Scheduled</p>
            <p className="mt-2 text-3xl font-bold text-blue-400">
              {filteredShifts.filter((s) => s.status === 'scheduled').length}
            </p>
          </div>
          <div className="glass-panel p-6">
            <p className="text-sm text-white/70">In Progress</p>
            <p className="mt-2 text-3xl font-bold text-green-400">
              {filteredShifts.filter((s) => s.status === 'in-progress').length}
            </p>
          </div>
          <div className="glass-panel p-6">
            <p className="text-sm text-white/70">Coverage Rate</p>
            <p className="mt-2 text-3xl font-bold text-cyan-300">{coverageRate.toFixed(1)}%</p>
            <p className="mt-2 text-xs text-white/60">{totalAssignedHeadcount}/{totalRequiredHeadcount || 0} headcount filled</p>
          </div>
          <div className="glass-panel p-6">
            <p className="text-sm text-white/70">Unfilled Shifts</p>
            <p className="mt-2 text-3xl font-bold text-yellow-400">{unfilledShifts.length}</p>
            <p className="mt-2 text-xs text-white/60">Needs {Math.max(0, totalRequiredHeadcount - totalAssignedHeadcount)} more guard{Math.max(0, totalRequiredHeadcount - totalAssignedHeadcount) === 1 ? '' : 's'}</p>
          </div>
          <div className="glass-panel p-6">
            <p className="text-sm text-white/70">Overtime (scheduled)</p>
            <p className="mt-2 text-3xl font-bold text-purple-300">{overtimeHours.toFixed(1)}h</p>
            <p className="mt-2 text-xs text-white/60">Total hours: {totalScheduledHours.toFixed(1)}h</p>
          </div>
        </div>

        {/* Shifts List */}
        {view === 'list' && (
          <div className="space-y-4">
            {filteredShifts.length === 0 ? (
              <div className="glass-panel p-12 text-center">
                <p className="text-white/70">No shifts found matching your filters.</p>
              </div>
            ) : (
              filteredShifts.map((shift) => (
                <div
                  key={shift.$id}
                  className="glass-panel overflow-hidden transition-all hover:border-accent/30"
                >
                  <div className="p-6">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="text-xl font-semibold text-white">
                              {getClientName(shift.clientId)} - {getSiteName(shift.siteId)}
                            </h3>
                            <p className="mt-1 text-sm text-white/70">{shift.shiftType}</p>
                          </div>
                          <span
                            className={`rounded-full border px-3 py-1 text-xs font-medium ${getStatusBadge(
                              shift.status
                            )}`}
                          >
                            {shift.status}
                          </span>
                        </div>

                        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                          <div className="flex items-center gap-2 text-sm text-white/70">
                            <AiOutlineCalendar className="h-4 w-4 text-accent" />
                            {new Date(shift.shiftDate).toLocaleDateString('en-GB')}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-white/70">
                            <AiOutlineClockCircle className="h-4 w-4 text-accent" />
                            {shift.startTime} - {shift.endTime}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-white/70">
                            <AiOutlineUser className="h-4 w-4 text-accent" />
                            {shift.requiredHeadcount} guard{shift.requiredHeadcount > 1 ? 's' : ''} required
                          </div>
                        </div>

                        {shift.instructions && (
                          <div className="mt-3 rounded-lg border border-white/10 bg-white/5 p-3">
                            <p className="text-sm text-white/80">{shift.instructions}</p>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleAssignGuards(shift)}
                          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-night-sky transition-all hover:bg-accent/90"
                          title="Assign Guards"
                        >
                          <AiOutlineUser className="inline h-4 w-4 mr-1" />
                          Assign
                        </button>
                        <button
                          onClick={() => handleEditShift(shift)}
                          className="rounded-lg border border-white/10 bg-white/5 p-2 text-white/70 transition-all hover:border-accent hover:bg-accent/10 hover:text-accent"
                          title="Edit Shift"
                        >
                          <AiOutlineEdit className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDuplicateShift(shift)}
                          className="rounded-lg border border-white/10 bg-white/5 p-2 text-white/70 transition-all hover:border-accent hover:bg-accent/10 hover:text-accent"
                          title="Duplicate Shift"
                        >
                          <AiOutlineCopy className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteShift(shift.$id)}
                          className="rounded-lg border border-white/10 bg-white/5 p-2 text-white/70 transition-all hover:border-red-500 hover:bg-red-500/10 hover:text-red-400"
                          title="Delete Shift"
                        >
                          <AiOutlineDelete className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Calendar View */}
        {view === 'calendar' && (
          <CalendarView
            shifts={filteredShifts}
            assignments={assignments}
            guards={guards}
            currentDate={currentDate}
            calendarView={calendarView}
            setCalendarView={setCalendarView}
            onDateChange={setCurrentDate}
            onShiftClick={handleEditShift}
            onAssignShift={handleAssignGuards}
            onAddShift={(date, time) => {
              setEditingShift({ shiftDate: date, startTime: time || '' });
              setIsModalOpen(true);
            }}
            getClientName={getClientName}
            getSiteName={getSiteName}
          />
        )}
      </div>

      {isModalOpen && <ShiftFormModal shift={editingShift} onClose={handleModalClose} clients={clients} sites={sites} />}
      {isAssignmentModalOpen && assigningShift && (
        <GuardAssignmentModal
          isOpen={isAssignmentModalOpen}
          onClose={() => handleAssignmentModalClose(true)}
          shift={assigningShift}
          onAssignmentComplete={() => handleAssignmentModalClose(true)}
        />
      )}
    </div>
  );
};

export default Scheduling;
