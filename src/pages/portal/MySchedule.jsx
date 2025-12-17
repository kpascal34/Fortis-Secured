import React, { useState, useEffect } from 'react';
import { databases, config } from '../../lib/appwrite';
import { Query } from 'appwrite';
import { demoGuards } from '../../data/demoGuards';
import {
  SHIFT_STATUS,
  STATUS_LABELS,
  STATUS_COLORS,
  checkComplianceStatus,
  COMPLIANCE_STATUS,
  calculateShiftStats,
} from '../../lib/scheduleUtils';
import {
  AiOutlineCalendar,
  AiOutlineClockCircle,
  AiOutlineEnvironment,
  AiOutlineCheckCircle,
  AiOutlineCloseCircle,
  AiOutlineWarning,
  AiOutlineInfoCircle,
  AiOutlineBell,
  AiOutlineEye,
  AiOutlineUser,
} from 'react-icons/ai';

const MySchedule = () => {
  const [shifts, setShifts] = useState([]);
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('upcoming'); // upcoming, past, all
  const [selectedShift, setSelectedShift] = useState(null);
  const [currentGuard] = useState(demoGuards[0]); // Simulating logged-in guard
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    fetchMySchedule();
  }, [filter]);

  const fetchMySchedule = async () => {
    try {
      setLoading(true);

      // Fetch sites
      try {
        const sitesRes = await databases.listDocuments(config.databaseId, config.sitesCollectionId, [
          Query.limit(100),
        ]);
        setSites(sitesRes.documents);
      } catch (error) {
        console.log('Using demo sites');
        setSites([
          { $id: '1', siteName: 'Central Shopping Mall', address: '123 High Street, London' },
          { $id: '2', siteName: 'Office Tower B', address: '456 Business Park, London' },
          { $id: '3', siteName: 'Residential Complex', address: '789 Park Lane, London' },
        ]);
      }

      // Fetch shifts assigned to current guard
      try {
        const shiftsRes = await databases.listDocuments(config.databaseId, config.shiftsCollectionId, [
          Query.equal('assignedGuardId', currentGuard.$id),
          Query.limit(200),
        ]);
        setShifts(shiftsRes.documents);
      } catch (error) {
        console.log('Using demo shifts');
        // Demo shifts for the logged-in guard
        const demoShifts = [
          {
            $id: '1',
            siteId: '1',
            siteName: 'Central Shopping Mall',
            date: '2025-12-16',
            startTime: '09:00',
            endTime: '17:00',
            status: SHIFT_STATUS.ASSIGNED,
            assignedGuardId: currentGuard.$id,
            notes: 'Main entrance patrol. Monitor CCTV room.',
            requiresConfirmation: true,
            $createdAt: new Date('2025-12-10').toISOString(),
          },
          {
            $id: '2',
            siteId: '2',
            siteName: 'Office Tower B',
            date: '2025-12-17',
            startTime: '18:00',
            endTime: '02:00',
            status: SHIFT_STATUS.CONFIRMED,
            assignedGuardId: currentGuard.$id,
            notes: 'Night shift. Building lockdown at 22:00.',
            requiresConfirmation: false,
            $createdAt: new Date('2025-12-10').toISOString(),
          },
          {
            $id: '3',
            siteId: '1',
            siteName: 'Central Shopping Mall',
            date: '2025-12-18',
            startTime: '14:00',
            endTime: '22:00',
            status: SHIFT_STATUS.ASSIGNED,
            assignedGuardId: currentGuard.$id,
            notes: 'Late shift. Peak shopping hours.',
            requiresConfirmation: true,
            $createdAt: new Date('2025-12-11').toISOString(),
          },
          {
            $id: '4',
            siteId: '3',
            siteName: 'Residential Complex',
            date: '2025-12-20',
            startTime: '07:00',
            endTime: '15:00',
            status: SHIFT_STATUS.PUBLISHED,
            assignedGuardId: currentGuard.$id,
            notes: 'Morning patrol. Gate monitoring.',
            requiresConfirmation: true,
            $createdAt: new Date('2025-12-12').toISOString(),
          },
          {
            $id: '5',
            siteId: '2',
            siteName: 'Office Tower B',
            date: '2025-12-10',
            startTime: '09:00',
            endTime: '17:00',
            status: SHIFT_STATUS.COMPLETED,
            assignedGuardId: currentGuard.$id,
            notes: 'Day shift completed.',
            requiresConfirmation: false,
            $createdAt: new Date('2025-12-05').toISOString(),
          },
          {
            $id: '6',
            siteId: '1',
            siteName: 'Central Shopping Mall',
            date: '2025-12-11',
            startTime: '10:00',
            endTime: '18:00',
            status: SHIFT_STATUS.COMPLETED,
            assignedGuardId: currentGuard.$id,
            notes: 'Weekend shift completed.',
            requiresConfirmation: false,
            $createdAt: new Date('2025-12-06').toISOString(),
          },
        ];
        setShifts(demoShifts);
      }

      // Demo notifications
      setNotifications([
        {
          id: '1',
          type: 'shift_assigned',
          title: 'New Shift Assigned',
          message: 'You have been assigned to Central Shopping Mall on Dec 18',
          read: false,
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: '2',
          type: 'shift_reminder',
          title: 'Shift Reminder',
          message: 'You have a shift tomorrow at Office Tower B starting at 18:00',
          read: false,
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        },
      ]);

      setLoading(false);
    } catch (error) {
      console.error('Error fetching schedule:', error);
      setLoading(false);
    }
  };

  const handleConfirmShift = async (shiftId) => {
    try {
      const shift = shifts.find(s => s.$id === shiftId);
      const updatedShift = { ...shift, status: SHIFT_STATUS.CONFIRMED, requiresConfirmation: false };
      setShifts(shifts.map(s => s.$id === shiftId ? updatedShift : s));
      alert('Shift confirmed successfully!');
    } catch (error) {
      console.error('Error confirming shift:', error);
      alert('Failed to confirm shift');
    }
  };

  const handleRejectShift = async (shiftId, reason) => {
    if (!reason) {
      reason = prompt('Please provide a reason for rejecting this shift:');
      if (!reason) return;
    }

    try {
      const shift = shifts.find(s => s.$id === shiftId);
      const updatedShift = { ...shift, status: SHIFT_STATUS.REJECTED, rejectionReason: reason };
      setShifts(shifts.map(s => s.$id === shiftId ? updatedShift : s));
      alert('Shift rejection sent to manager for review');
    } catch (error) {
      console.error('Error rejecting shift:', error);
      alert('Failed to reject shift');
    }
  };

  const filteredShifts = shifts.filter(shift => {
    const shiftDate = new Date(shift.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (filter === 'upcoming') {
      return shiftDate >= today && shift.status !== SHIFT_STATUS.COMPLETED && shift.status !== SHIFT_STATUS.CANCELLED;
    } else if (filter === 'past') {
      return shiftDate < today || shift.status === SHIFT_STATUS.COMPLETED;
    }
    return true;
  }).sort((a, b) => new Date(b.date) - new Date(a.date));

  const stats = calculateShiftStats(shifts, currentGuard);
  const complianceStatus = checkComplianceStatus(currentGuard);

  const getSiteName = (siteId) => {
    const site = sites.find(s => s.$id === siteId);
    return site ? site.siteName : 'Unknown Site';
  };

  const getStatusColor = (status) => {
    return STATUS_COLORS[status] || 'gray';
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
    
    return date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  const calculateDuration = (startTime, endTime) => {
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    let hours = endH - startH;
    let minutes = endM - startM;
    
    if (minutes < 0) {
      hours -= 1;
      minutes += 60;
    }
    if (hours < 0) hours += 24;
    
    return `${hours}h ${minutes > 0 ? minutes + 'm' : ''}`;
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-dark via-night-sky to-night-sky">
        <p className="text-white">Loading your schedule...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-dark via-night-sky to-night-sky p-6">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white">My Schedule</h1>
          <p className="mt-2 text-white/70">
            {currentGuard.firstName} {currentGuard.lastName} - {currentGuard.role}
          </p>
        </div>

        {/* Compliance Alert */}
        {complianceStatus !== COMPLIANCE_STATUS.VALID && (
          <div className={`mb-6 rounded-xl border p-4 ${
            complianceStatus === COMPLIANCE_STATUS.EXPIRED 
              ? 'bg-red-500/10 border-red-500/50' 
              : 'bg-yellow-500/10 border-yellow-500/50'
          }`}>
            <div className="flex items-center gap-3">
              <AiOutlineWarning className={`text-2xl ${
                complianceStatus === COMPLIANCE_STATUS.EXPIRED ? 'text-red-500' : 'text-yellow-500'
              }`} />
              <div>
                <p className={`font-semibold ${
                  complianceStatus === COMPLIANCE_STATUS.EXPIRED ? 'text-red-500' : 'text-yellow-500'
                }`}>
                  {complianceStatus === COMPLIANCE_STATUS.EXPIRED 
                    ? 'License Expired' 
                    : 'License Expiring Soon'}
                </p>
                <p className="text-sm text-white/70">
                  {complianceStatus === COMPLIANCE_STATUS.EXPIRED
                    ? 'Your SIA license has expired. Please renew to continue working.'
                    : 'Your SIA license is expiring soon. Please renew to avoid disruption.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-4">
            <p className="text-sm text-white/70">Upcoming Shifts</p>
            <p className="mt-2 text-3xl font-bold text-white">{stats.upcoming}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-4">
            <p className="text-sm text-white/70">Completed</p>
            <p className="mt-2 text-3xl font-bold text-white">{stats.completed}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-4">
            <p className="text-sm text-white/70">Total Hours</p>
            <p className="mt-2 text-3xl font-bold text-white">{stats.totalHours}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-4">
            <p className="text-sm text-white/70">Pending Action</p>
            <p className="mt-2 text-3xl font-bold text-yellow-500">
              {shifts.filter(s => s.requiresConfirmation).length}
            </p>
          </div>
        </div>

        {/* Notifications */}
        {notifications.filter(n => !n.read).length > 0 && (
          <div className="mb-6 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-4">
            <div className="flex items-center gap-2 mb-3">
              <AiOutlineBell className="text-xl text-accent" />
              <h2 className="font-semibold text-white">Notifications</h2>
            </div>
            <div className="space-y-2">
              {notifications.filter(n => !n.read).map((notif) => (
                <div key={notif.id} className="rounded-lg bg-white/5 border border-white/10 p-3">
                  <p className="text-sm font-medium text-white">{notif.title}</p>
                  <p className="text-xs text-white/60 mt-1">{notif.message}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="mb-6 flex gap-2">
          {['upcoming', 'past', 'all'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                filter === f
                  ? 'bg-accent text-white'
                  : 'bg-white/5 text-white/70 hover:bg-white/10'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Shifts List */}
        <div className="space-y-4">
          {filteredShifts.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-8 text-center">
              <AiOutlineCalendar className="mx-auto text-4xl text-white/30" />
              <p className="mt-4 text-white/70">No shifts found</p>
            </div>
          ) : (
            filteredShifts.map((shift) => (
              <div
                key={shift.$id}
                className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-6 hover:bg-white/10 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-white">
                        {shift.siteName || getSiteName(shift.siteId)}
                      </h3>
                      <span className={`rounded-full px-3 py-1 text-xs font-medium bg-${getStatusColor(shift.status)}-500/20 text-${getStatusColor(shift.status)}-500`}>
                        {STATUS_LABELS[shift.status]}
                      </span>
                      {shift.requiresConfirmation && (
                        <span className="rounded-full bg-yellow-500/20 px-3 py-1 text-xs text-yellow-500">
                          Action Required
                        </span>
                      )}
                    </div>

                    <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="flex items-center gap-2 text-white/70">
                        <AiOutlineCalendar className="text-accent" />
                        <span className="text-sm">{formatDate(shift.date)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-white/70">
                        <AiOutlineClockCircle className="text-accent" />
                        <span className="text-sm">
                          {shift.startTime} - {shift.endTime} ({calculateDuration(shift.startTime, shift.endTime)})
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-white/70">
                        <AiOutlineEnvironment className="text-accent" />
                        <span className="text-sm">
                          {sites.find(s => s.$id === shift.siteId)?.address || 'Location TBC'}
                        </span>
                      </div>
                    </div>

                    {shift.notes && (
                      <div className="mt-4 rounded-lg bg-white/5 border border-white/10 p-3">
                        <div className="flex items-start gap-2">
                          <AiOutlineInfoCircle className="text-accent mt-0.5" />
                          <p className="text-sm text-white/70">{shift.notes}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="ml-4 flex flex-col gap-2">
                    {shift.requiresConfirmation && shift.status !== SHIFT_STATUS.REJECTED && (
                      <>
                        <button
                          onClick={() => handleConfirmShift(shift.$id)}
                          className="flex items-center gap-2 rounded-lg bg-green-500/20 border border-green-500/50 px-4 py-2 text-sm text-green-500 hover:bg-green-500/30 transition-colors"
                        >
                          <AiOutlineCheckCircle />
                          Confirm
                        </button>
                        <button
                          onClick={() => handleRejectShift(shift.$id)}
                          className="flex items-center gap-2 rounded-lg bg-red-500/20 border border-red-500/50 px-4 py-2 text-sm text-red-500 hover:bg-red-500/30 transition-colors"
                        >
                          <AiOutlineCloseCircle />
                          Reject
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => setSelectedShift(shift)}
                      className="flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20 transition-colors"
                    >
                      <AiOutlineEye />
                      Details
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Shift Detail Modal */}
      {selectedShift && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="max-w-2xl w-full rounded-xl border border-white/10 bg-night-sky p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white">{selectedShift.siteName || getSiteName(selectedShift.siteId)}</h2>
                <p className="text-white/60 mt-1">{formatDate(selectedShift.date)}</p>
              </div>
              <button
                onClick={() => setSelectedShift(null)}
                className="rounded-lg bg-white/5 p-2 hover:bg-white/10 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg bg-white/5 border border-white/10 p-4">
                  <p className="text-sm text-white/50">Start Time</p>
                  <p className="mt-1 text-white font-semibold">{selectedShift.startTime}</p>
                </div>
                <div className="rounded-lg bg-white/5 border border-white/10 p-4">
                  <p className="text-sm text-white/50">End Time</p>
                  <p className="mt-1 text-white font-semibold">{selectedShift.endTime}</p>
                </div>
                <div className="rounded-lg bg-white/5 border border-white/10 p-4">
                  <p className="text-sm text-white/50">Duration</p>
                  <p className="mt-1 text-white font-semibold">
                    {calculateDuration(selectedShift.startTime, selectedShift.endTime)}
                  </p>
                </div>
                <div className="rounded-lg bg-white/5 border border-white/10 p-4">
                  <p className="text-sm text-white/50">Status</p>
                  <p className={`mt-1 font-semibold text-${getStatusColor(selectedShift.status)}-500`}>
                    {STATUS_LABELS[selectedShift.status]}
                  </p>
                </div>
              </div>

              {selectedShift.notes && (
                <div className="rounded-lg bg-white/5 border border-white/10 p-4">
                  <p className="text-sm text-white/50 mb-2">Shift Notes</p>
                  <p className="text-white">{selectedShift.notes}</p>
                </div>
              )}

              <div className="rounded-lg bg-white/5 border border-white/10 p-4">
                <p className="text-sm text-white/50 mb-2">Site Address</p>
                <p className="text-white">
                  {sites.find(s => s.$id === selectedShift.siteId)?.address || 'Address not available'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MySchedule;
