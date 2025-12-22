import React, { useState, useEffect, useRef } from 'react';
import { databases, config } from '../../lib/appwrite';
import { Query } from 'appwrite';
import { parseNumber } from '../../lib/validation';
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
  AiOutlineCheck,
  AiOutlineClose,
  AiOutlinePicture,
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
  const [selectedMapEntry, setSelectedMapEntry] = useState(null);
  const [clockingEntryId, setClockingEntryId] = useState('');
  const [geoStatus, setGeoStatus] = useState({ state: 'idle', message: '' });
  const [timesheetActionLoading, setTimesheetActionLoading] = useState(false);
  const [photoData, setPhotoData] = useState('');
  const [photoError, setPhotoError] = useState('');
  const [signatureData, setSignatureData] = useState('');
  const [isDrawing, setIsDrawing] = useState(false);
  const signatureCanvasRef = useRef(null);

  const ruleConfig = {
    latenessGraceMinutes: 5,
    earlyGraceMinutes: 5,
    overtimeThresholdHours: 8,
    breakMinutesRequired: 30,
    breakMinHours: 6,
  };

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
        console.log('Unable to load time tracking data. Connect Appwrite to enable live records.', error);
        guardsData = [];
        setTimeEntries([]);
        setShifts([]);
        setClients([]);
        setSites([]);
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
    try {
      const diff = new Date(checkOutTime) - new Date(checkInTime);
      if (diff < 0) return null;
      return parseNumber(diff / (1000 * 60 * 60));
    } catch (error) {
      console.warn('Error calculating hours:', error);
      return null;
    }
  };

  const calculateScheduledHours = (startTime, endTime) => {
    if (!startTime || !endTime) return 0;
    try {
      const [startH, startM] = (startTime || '').split(':').map(v => parseInt(v, 10));
      const [endH, endM] = (endTime || '').split(':').map(v => parseInt(v, 10));
      
      if (isNaN(startH) || isNaN(endH)) return 0;
      
      const startMinutes = (startH || 0) * 60 + (startM || 0);
      const endMinutes = (endH || 0) * 60 + (endM || 0);
      
      return parseNumber((endMinutes - startMinutes) / 60);
    } catch (error) {
      console.warn('Error calculating scheduled hours:', error);
      return 0;
    }
  };

  const getViolations = (entry, shift) => {
    const issues = [];
    if (!shift || !shift.shiftDate) return issues;

    const scheduledStart = shift.startTime ? new Date(`${shift.shiftDate}T${shift.startTime}`) : null;
    const scheduledEnd = shift.endTime ? new Date(`${shift.shiftDate}T${shift.endTime}`) : null;
    const checkIn = entry.checkInTime ? new Date(entry.checkInTime) : null;
    const checkOut = entry.checkOutTime ? new Date(entry.checkOutTime) : null;
    const scheduledHours = calculateScheduledHours(shift.startTime, shift.endTime);
    const actualHours = checkIn && checkOut ? calculateHours(entry.checkInTime, entry.checkOutTime) : 0;

    if (checkIn && scheduledStart) {
      const diffMinutes = Math.round((checkIn - scheduledStart) / (1000 * 60));
      if (diffMinutes > ruleConfig.latenessGraceMinutes) {
        issues.push(`Late by ${diffMinutes}m`);
      }
    }

    if (checkOut && scheduledEnd) {
      const diffMinutes = Math.round((scheduledEnd - checkOut) / (1000 * 60));
      if (diffMinutes > ruleConfig.earlyGraceMinutes) {
        issues.push(`Left early by ${diffMinutes}m`);
      }
    }

    if (actualHours && (actualHours > scheduledHours + 0.25 || actualHours > ruleConfig.overtimeThresholdHours)) {
      const overtime = parseNumber(actualHours - scheduledHours);
      issues.push(`Overtime ${overtime.toFixed(2)}h`);
    }

    if (actualHours && actualHours >= ruleConfig.breakMinHours) {
      const taken = entry.breakMinutes || 0;
      if (taken < ruleConfig.breakMinutesRequired) {
        issues.push(`Break short/missing (${taken}/${ruleConfig.breakMinutesRequired}m)`);
      }
    }

    return issues;
  };

  const getTimeStatus = (entry, shift) => {
    if (!entry.checkInTime) return { status: 'pending', label: 'Not Started', color: 'bg-gray-500' };
    if (!entry.checkOutTime) return { status: 'in-progress', label: 'In Progress', color: 'bg-blue-500' };
    
    const actualHours = parseNumber(calculateHours(entry.checkInTime, entry.checkOutTime) || 0);
    const scheduledHours = parseNumber(calculateScheduledHours(shift.startTime, shift.endTime) || 0);
    
    if (entry.status === 'no-show') return { status: 'no-show', label: 'No Show', color: 'bg-red-500' };
    if (scheduledHours > 0 && actualHours < scheduledHours * 0.9) return { status: 'short', label: 'Short Hours', color: 'bg-yellow-500' };
    if (scheduledHours > 0 && actualHours > scheduledHours * 1.1) return { status: 'overtime', label: 'Overtime', color: 'bg-purple-500' };
    
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
      breakMinutes: entry.breakMinutes || '',
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    try {
      const updateData = {
        checkInTime: editingEntry.checkInTime ? new Date(editingEntry.checkInTime).toISOString() : null,
        checkOutTime: editingEntry.checkOutTime ? new Date(editingEntry.checkOutTime).toISOString() : null,
        status: editingEntry.checkOutTime ? 'completed' : (editingEntry.checkInTime ? 'checked-in' : 'assigned'),
        breakMinutes: editingEntry.breakMinutes ? parseInt(editingEntry.breakMinutes, 10) : null,
        timesheetStatus: editingEntry.timesheetStatus || 'pending',
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
      const issues = getViolations(entry, shift).join('; ');

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
        'Break (min)': entry.breakMinutes || 0,
        Status: status.label,
        'Flags': issues || 'None',
        'Photo Present': entry.checkInPhoto ? 'Yes' : 'No',
        'Signature Present': entry.checkInSignature ? 'Yes' : 'No',
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

  const getMapUrl = (lat, lng) => {
    if (!lat || !lng) return '';
    return `https://maps.google.com/maps?q=${lat},${lng}&z=15&output=embed`;
  };

  const buildCoordsLabel = (location) => {
    if (!location || typeof location !== 'object') return null;
    const { latitude, longitude, accuracy } = location;
    if (latitude === undefined || longitude === undefined) return null;
    return `${parseNumber(latitude).toFixed(5)}, ${parseNumber(longitude).toFixed(5)}${accuracy ? ` (±${Math.round(accuracy)}m)` : ''}`;
  };

  const getLocationForEntry = (entry) => {
    if (entry.checkOutLocation) return entry.checkOutLocation;
    if (entry.checkInLocation) return entry.checkInLocation;
    return null;
  };

  const handleTimesheetDecision = async (entryId, decision) => {
    try {
      setTimesheetActionLoading(true);
      await databases.updateDocument(
        config.databaseId,
        config.shiftAssignmentsCollectionId,
        entryId,
        {
          timesheetStatus: decision,
          timesheetReviewedAt: new Date().toISOString(),
        }
      );
      await fetchData();
    } catch (error) {
      console.error('Error updating timesheet status:', error);
      alert('Unable to update timesheet status.');
    } finally {
      setTimesheetActionLoading(false);
    }
  };

  const locateAndClock = async (type) => {
    if (!clockingEntryId) {
      setGeoStatus({ state: 'error', message: 'Select an assignment first.' });
      return;
    }

    setGeoStatus({ state: 'pending', message: 'Requesting location...' });

    const coords = await new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported on this device.'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          capturedAt: new Date(pos.timestamp).toISOString(),
        }),
        (err) => reject(err),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }).catch((err) => {
      setGeoStatus({ state: 'error', message: err.message || 'Unable to get location.' });
      return null;
    });

    if (!coords) return;

    try {
      setGeoStatus({ state: 'pending', message: 'Saving entry...' });
      const nowIso = new Date().toISOString();
      const updateData = {
        status: type === 'checkin' ? 'checked-in' : 'completed',
      };

      if (type === 'checkin') {
        updateData.checkInTime = nowIso;
        updateData.checkInLocation = coords;
        if (photoData) updateData.checkInPhoto = photoData;
        if (signatureData) updateData.checkInSignature = signatureData;
      } else {
        updateData.checkOutTime = nowIso;
        updateData.checkOutLocation = coords;
      }

      await databases.updateDocument(
        config.databaseId,
        config.shiftAssignmentsCollectionId,
        clockingEntryId,
        updateData
      );

      setGeoStatus({ state: 'success', message: `${type === 'checkin' ? 'Clocked in' : 'Clocked out'} with location.` });
      setSelectedMapEntry(timeEntries.find(e => e.$id === clockingEntryId) || null);
      if (type === 'checkin') {
        setPhotoData('');
        setSignatureData('');
        clearSignatureCanvas();
      }
      await fetchData();
    } catch (error) {
      console.error('Error saving clock event:', error);
      setGeoStatus({ state: 'error', message: 'Failed to save clock event.' });
    }
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    setPhotoError('');
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setPhotoError('Image must be under 2MB.');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoData(reader.result.toString());
    };
    reader.readAsDataURL(file);
  };

  const startSignature = (e) => {
    setIsDrawing(true);
    const canvas = signatureCanvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.beginPath();
    const { x, y } = getCanvasPos(e, canvas);
    ctx.moveTo(x, y);
  };

  const drawSignature = (e) => {
    if (!isDrawing) return;
    const canvas = signatureCanvasRef.current;
    const ctx = canvas.getContext('2d');
    const { x, y } = getCanvasPos(e, canvas);
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#22d3ee';
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const endSignature = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = signatureCanvasRef.current;
    setSignatureData(canvas.toDataURL('image/png'));
  };

  const clearSignatureCanvas = () => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignatureData('');
  };

  const getCanvasPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

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

      {/* Geolocation Clock */}
      <div className="glass-panel p-4 sm:p-6">
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-white/50">Geolocation Clock</p>
            <h3 className="text-lg font-semibold text-white">Mobile clock-in/out with GPS</h3>
            <p className="text-xs text-white/60">Select assignment and clock in/out with location.</p>
          </div>
          <div className="flex flex-col gap-3">
            <select
              value={clockingEntryId}
              onChange={(e) => setClockingEntryId(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-night-sky py-2 px-3 text-sm text-white focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent [&>option]:bg-night-sky [&>option]:text-white"
            >
              <option value="">Select assignment</option>
              {timeEntries.map(entry => {
                const shift = getShiftDetails(entry.shiftId);
                return (
                  <option key={entry.$id} value={entry.$id}>
                    {getGuardName(entry.guardId)} · {shift.shiftDate} · {shift.startTime}-{shift.endTime}
                  </option>
                );
              })}
            </select>
            <div className="flex w-full gap-2">
              <button
                onClick={() => locateAndClock('checkin')}
                className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-green-600 px-3 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-green-500 transition-all"
              >
                <AiOutlineCheck className="h-4 w-4" />
                <span className="hidden sm:inline">Clock In</span>
                <span className="sm:hidden">In</span>
              </button>
              <button
                onClick={() => locateAndClock('checkout')}
                className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-red-600 px-3 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-red-500 transition-all"
              >
                <AiOutlineClose className="h-4 w-4" />
                <span className="hidden sm:inline">Clock Out</span>
                <span className="sm:hidden">Out</span>
              </button>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white/70">Photo Verification</p>
                  <p className="text-xs text-white/50">Capture a quick photo on sign-in.</p>
                </div>
                <label className="inline-flex cursor-pointer items-center gap-2 rounded bg-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/20">
                  <AiOutlinePicture className="h-4 w-4" /> Upload
                  <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                </label>
              </div>
              {photoError && <p className="mt-2 text-xs text-red-300">{photoError}</p>}
              {photoData && (
                <div className="mt-3 overflow-hidden rounded border border-white/10">
                  <img src={photoData} alt="Check-in proof" className="h-32 w-full object-cover" />
                </div>
              )}
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white/70">Digital Signature</p>
                  <p className="text-xs text-white/50">Sign to acknowledge shift start.</p>
                </div>
                <button onClick={clearSignatureCanvas} className="rounded bg-white/10 px-3 py-1 text-xs font-semibold text-white hover:bg-white/20">Clear</button>
              </div>
              <div
                className="mt-3 rounded border border-accent/40 bg-night-sky"
              >
                <canvas
                  ref={signatureCanvasRef}
                  width={600}
                  height={200}
                  onMouseDown={startSignature}
                  onMouseMove={drawSignature}
                  onMouseUp={endSignature}
                  onMouseLeave={endSignature}
                  onTouchStart={startSignature}
                  onTouchMove={drawSignature}
                  onTouchEnd={endSignature}
                  className="h-40 w-full touch-none"
                />
              </div>
              {signatureData && <p className="mt-2 text-xs text-green-300">Signature captured.</p>}
            </div>
          </div>
        </div>
        {geoStatus.state !== 'idle' && (
          <div className={`mt-4 rounded-lg border px-4 py-3 text-sm ${geoStatus.state === 'error' ? 'border-red-500/40 bg-red-500/10 text-red-200' : geoStatus.state === 'success' ? 'border-green-500/40 bg-green-500/10 text-green-200' : 'border-accent/40 bg-accent/5 text-accent'}`}>
            {geoStatus.message}
          </div>
        )}
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
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <table className="w-full min-w-max text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="px-2 sm:px-4 py-2 sm:py-4 text-left font-semibold text-white">Date</th>
                <th className="px-2 sm:px-4 py-2 sm:py-4 text-left font-semibold text-white">Guard</th>
                <th className="px-2 sm:px-4 py-2 sm:py-4 text-left font-semibold text-white">Client</th>
                <th className="px-2 sm:px-4 py-2 sm:py-4 text-left font-semibold text-white">Sched</th>
                <th className="px-2 sm:px-4 py-2 sm:py-4 text-left font-semibold text-white">In</th>
                <th className="px-2 sm:px-4 py-2 sm:py-4 text-left font-semibold text-white">Out</th>
                <th className="px-2 sm:px-4 py-2 sm:py-4 text-left font-semibold text-white">Hrs</th>
                <th className="px-2 sm:px-4 py-2 sm:py-4 text-left font-semibold text-white">Flags</th>
                <th className="hidden md:table-cell px-2 sm:px-4 py-2 sm:py-4 text-left font-semibold text-white">Timesheet</th>
                <th className="px-2 sm:px-4 py-2 sm:py-4 text-left font-semibold text-white">Status</th>
                <th className="px-2 sm:px-4 py-2 sm:py-4 text-left font-semibold text-white">Act</th>
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
                  const violations = getViolations(entry, shift);
                  const location = getLocationForEntry(entry);

                  return (
                    <tr key={entry.$id} className="border-b border-white/10 hover:bg-white/5">
                      <td className="px-2 sm:px-4 py-2 sm:py-4 text-white">
                        {shift.shiftDate ? new Date(shift.shiftDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'N/A'}
                      </td>
                      <td className="px-2 sm:px-4 py-2 sm:py-4">
                        <div className="flex items-center gap-1">
                          <AiOutlineUser className="h-3 w-3 text-accent hidden sm:inline" />
                          <span className="text-white truncate">{getGuardName(entry.guardId).split(' ')[0]}</span>
                        </div>
                      </td>
                      <td className="px-2 sm:px-4 py-2 sm:py-4">
                        <div className="text-white truncate">{getClientName(shift.clientId).substring(0, 10)}</div>
                      </td>
                      <td className="px-2 sm:px-4 py-2 sm:py-4">
                        <div className="text-white text-xs">{shift.startTime}</div>
                      </td>
                      <td className="px-2 sm:px-4 py-2 sm:py-4 text-white text-xs">
                        {entry.checkInTime ? new Date(entry.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                      </td>
                      <td className="px-2 sm:px-4 py-2 sm:py-4 text-white text-xs">
                        {entry.checkOutTime ? new Date(entry.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                      </td>
                      <td className="px-2 sm:px-4 py-2 sm:py-4">
                        {actualHours ? (
                          <div>
                            <div className="font-semibold text-white">{actualHours.toFixed(1)}h</div>
                            {Math.abs(actualHours - scheduledHours) > 0.1 && (
                              <div className={`text-[10px] ${actualHours > scheduledHours ? 'text-purple-300' : 'text-yellow-300'}`}>
                                {actualHours > scheduledHours ? '+' : ''}{(actualHours - scheduledHours).toFixed(1)}h
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-white/50">-</span>
                        )}
                      </td>
                      <td className="px-2 sm:px-4 py-2 sm:py-4">
                        {violations.length === 0 ? (
                          <span className="text-[10px] text-white/50">✓</span>
                        ) : (
                          <span className="text-[10px] text-red-300 font-semibold">{violations.length}</span>
                        )}
                      </td>
                      <td className="hidden md:table-cell px-2 sm:px-4 py-2 sm:py-4">
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-semibold uppercase text-white/70">{entry.timesheetStatus || 'pending'}</span>
                          <div className="flex gap-0.5">
                            <button
                              disabled={timesheetActionLoading}
                              onClick={() => handleTimesheetDecision(entry.$id, 'approved')}
                              className="rounded bg-green-600 px-1.5 py-0.5 text-[10px] font-semibold text-white hover:bg-green-500 disabled:opacity-60"
                            >
                              ✓
                            </button>
                            <button
                              disabled={timesheetActionLoading}
                              onClick={() => handleTimesheetDecision(entry.$id, 'rejected')}
                              className="rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-semibold text-white hover:bg-red-500 disabled:opacity-60"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      </td>
                      <td className="px-2 sm:px-4 py-2 sm:py-4">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium text-white ${status.color}`}>
                          {status.label.substring(0, 3)}
                        </span>
                      </td>
                      <td className="px-2 sm:px-4 py-2 sm:py-4">
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleEditEntry(entry)}
                            className="rounded border border-white/10 bg-white/5 p-1 text-white hover:bg-white/10 transition-all"
                            title="Edit"
                          >
                            <AiOutlineEdit className="h-3 w-3" />
                          </button>
                          {location && (
                            <button
                              onClick={() => setSelectedMapEntry(entry)}
                              className="rounded border border-white/10 bg-white/5 p-1 text-white hover:bg-white/10 transition-all"
                              title="Map"
                            >
                              <AiOutlineEnvironment className="h-3 w-3" />
                            </button>
                          )}
                          {(entry.checkInPhoto || entry.checkInSignature) && (
                            <button
                              onClick={() => setSelectedMapEntry(entry)}
                              className="rounded border border-white/10 bg-white/5 p-1 text-white hover:bg-white/10 transition-all"
                              title="Proof"
                            >
                              <AiOutlinePicture className="h-3 w-3" />
                            </button>
                          )}
                        </div>
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
          <div className="glass-panel w-full max-w-2xl max-h-[90vh] overflow-y-auto">
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-white">Break (minutes)</label>
                  <input
                    type="number"
                    min="0"
                    value={editingEntry.breakMinutes}
                    onChange={(e) => setEditingEntry({ ...editingEntry, breakMinutes: e.target.value })}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-white">Timesheet Status</label>
                  <select
                    value={editingEntry.timesheetStatus || 'pending'}
                    onChange={(e) => setEditingEntry({ ...editingEntry, timesheetStatus: e.target.value })}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent [&>option]:bg-night-sky [&>option]:text-white"
                  >
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
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

      {/* Map Review Panel */}
      {selectedMapEntry && (
        <div className="glass-panel p-4 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-wide text-white/50">Clock Event Map</p>
              <h3 className="text-xl font-semibold text-white">{getGuardName(selectedMapEntry.guardId)}</h3>
              <p className="text-sm text-white/60">{getSiteName(getShiftDetails(selectedMapEntry.shiftId).siteId)}</p>
              <div className="mt-2 text-xs text-white/60">
                Check-in: {buildCoordsLabel(selectedMapEntry.checkInLocation) || 'n/a'}<br />
                Check-out: {buildCoordsLabel(selectedMapEntry.checkOutLocation) || 'n/a'}
              </div>
            </div>
            <button
              onClick={() => setSelectedMapEntry(null)}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-sm text-white hover:bg-white/10"
            >
              Close
            </button>
          </div>

          {getLocationForEntry(selectedMapEntry) ? (
            <div className="mt-4 aspect-video overflow-hidden rounded-lg border border-white/10">
              <iframe
                title="Clock event map"
                src={getMapUrl(getLocationForEntry(selectedMapEntry).latitude, getLocationForEntry(selectedMapEntry).longitude)}
                className="h-full w-full"
                loading="lazy"
                allowFullScreen
              />
            </div>
          ) : (
            <div className="mt-4 rounded-lg border border-white/10 bg-white/5 p-4 text-sm text-white/60">
              No location data captured for this entry.
            </div>
          )}

          {(selectedMapEntry.checkInPhoto || selectedMapEntry.checkInSignature) && (
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              {selectedMapEntry.checkInPhoto && (
                <div>
                  <p className="mb-2 text-sm font-semibold text-white">Photo Verification</p>
                  <div className="overflow-hidden rounded border border-white/10">
                    <img src={selectedMapEntry.checkInPhoto} alt="Check-in proof" className="h-48 w-full object-cover" />
                  </div>
                </div>
              )}
              {selectedMapEntry.checkInSignature && (
                <div>
                  <p className="mb-2 text-sm font-semibold text-white">Signature</p>
                  <div className="overflow-hidden rounded border border-white/10 bg-white/5 p-3">
                    <img src={selectedMapEntry.checkInSignature} alt="Check-in signature" className="h-48 w-full object-contain" />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TimeTracking;
