import React, { useState, useEffect } from 'react';
import { databases, config } from '../../lib/appwrite';
import { Query, ID } from 'appwrite';
import { useAuth } from '../../context/AuthContext';
import { parseNumber, formatCurrency } from '../../lib/validation';
import {
  SHIFT_STATUS,
  STATUS_LABELS,
  STATUS_COLORS,
  validateShift,
  checkComplianceStatus,
  COMPLIANCE_STATUS,
} from '../../lib/scheduleUtils';
import {
  calculateEligibilityScore,
  createApplication,
  getGuardApplications,
  APPLICATION_STATUS,
  APPLICATION_STATUS_LABELS,
  APPLICATION_STATUS_COLORS,
} from '../../lib/shiftApplications';
import {
  AiOutlineCalendar,
  AiOutlineClockCircle,
  AiOutlineEnvironment,
  AiOutlineCheckCircle,
  AiOutlineUser,
  AiOutlineFire,
  AiOutlineStar,
  AiOutlineWarning,
  AiOutlineTrophy,
  AiOutlineThunderbolt,
  AiOutlineSend,
  AiOutlineHistory,
} from 'react-icons/ai';

const OpenShifts = () => {
  const { user } = useAuth();
  const [openShifts, setOpenShifts] = useState([]);
  const [sites, setSites] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentGuard] = useState(() =>
    user
      ? {
          $id: user.$id,
          firstName: user.name || user.email || 'Guard',
          status: 'active',
        }
      : {
          $id: 'guard',
          firstName: 'Guard',
          status: 'active',
        }
  );
  const [selectedShift, setSelectedShift] = useState(null);
  const [applying, setApplying] = useState(false);
  const [filter, setFilter] = useState('all'); // all, eligible, today, week, my-applications
  const [sortBy, setSortBy] = useState('date'); // date, distance, pay

  useEffect(() => {
    fetchOpenShifts();
    fetchApplications();
  }, []);

  const fetchOpenShifts = async () => {
    try {
      setLoading(true);

      // Fetch sites
      try {
        const sitesRes = await databases.listDocuments(config.databaseId, config.sitesCollectionId, [
          Query.limit(100),
        ]);
        setSites(sitesRes.documents);
      } catch (error) {
        console.log('Sites collection unavailable. Connect Appwrite to load live data.', error);
        setSites([]);
      }

      // Fetch open/offered shifts
      try {
        const shiftsRes = await databases.listDocuments(config.databaseId, config.shiftsCollectionId, [
          Query.equal('status', [SHIFT_STATUS.OFFERED, SHIFT_STATUS.UNASSIGNED]),
          Query.limit(100),
        ]);
        setOpenShifts(shiftsRes.documents);
      } catch (error) {
        console.log('Shifts collection unavailable. No demo data loaded.', error);
        setOpenShifts([]);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching open shifts:', error);
      setLoading(false);
    }
  };

  const fetchApplications = async () => {
    try {
      const applicationsRes = await databases.listDocuments(
        config.databaseId,
        config.applicationsCollectionId,
        [Query.equal('guardId', currentGuard.$id), Query.limit(100)]
      );
      setApplications(applicationsRes.documents);
    } catch (error) {
      console.log('Applications collection unavailable:', error);
      setApplications([]);
    }
  };

  // Get application status for a shift
  const getShiftApplicationStatus = (shiftId) => {
    const app = applications.find(a => a.shiftId === shiftId);
    return app ? app.status : null;
  };

  const calculateEligibility = (shift) => {
    // Create mock guard data with extended profile
    const mockGuard = {
      ...currentGuard,
      siaLicenseExpiry: '2025-12-31',
      yearsExperience: 3,
      skills: ['CCTV Monitoring', 'Night Patrol', 'Customer Service', 'Access Control'],
      completedTraining: ['First Aid', 'Fire Safety', 'Conflict Resolution'],
    };

    // Mock guard history
    const mockHistory = {
      reliabilityScore: 85,
      sitesWorked: [],
      siteVisits: {},
      scheduledShifts: [],
    };

    // Use the new comprehensive eligibility calculation
    return calculateEligibilityScore(mockGuard, shift, mockHistory);
  };

  const handleApplyForShift = async (shift) => {
    setApplying(true);
    try {
      const eligibility = calculateEligibility(shift);
      
      // Create application data
      const applicationData = createApplication({
        guardId: currentGuard.$id,
        guardName: `${currentGuard.firstName} ${currentGuard.lastName || ''}`.trim(),
        shiftId: shift.$id,
        shiftDetails: {
          siteName: shift.siteName,
          date: shift.date,
          startTime: shift.startTime,
          endTime: shift.endTime,
          hourlyRate: shift.hourlyRate,
        },
        eligibilityScore: eligibility,
        message: '', // Could add a message field in the future
      });

      // Save application to database
      try {
        await databases.createDocument(
          config.databaseId,
          config.applicationsCollectionId,
          ID.unique(),
          applicationData
        );

        // Refresh applications list
        await fetchApplications();
        
        alert(`Application submitted for ${shift.siteName}! You'll be notified when it's reviewed.`);
        setSelectedShift(null);
      } catch (error) {
        console.error('Error creating application:', error);
        alert('Failed to submit application. Please try again.');
      }
    } catch (error) {
      console.error('Error applying for shift:', error);
      alert('Failed to submit application. Please try again.');
    } finally {
      setApplying(false);
    }
  };

  const filteredShifts = openShifts.filter(shift => {
    const shiftDate = new Date(shift.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (filter === 'eligible') {
      const eligibility = calculateEligibility(shift);
      return eligibility.eligible;
    } else if (filter === 'today') {
      return shiftDate.toDateString() === today.toDateString();
    } else if (filter === 'week') {
      const weekEnd = new Date(today);
      weekEnd.setDate(today.getDate() + 7);
      return shiftDate >= today && shiftDate <= weekEnd;
    } else if (filter === 'my-applications') {
      // Show only shifts the guard has applied to
      return applications.some(app => app.shiftId === shift.$id);
    }
    return true;
  }).sort((a, b) => {
    if (sortBy === 'date') {
      return new Date(a.date) - new Date(b.date);
    } else if (sortBy === 'pay') {
      return (b.payRate || 0) - (a.payRate || 0);
    }
    return 0;
  });

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
    if (hours < 0) hours += 24;
    return `${hours}h`;
  };

  const getTimeRemaining = (expiresAt) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = expiry - now;
    
    if (diff < 0) return 'Expired';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const getUrgencyColor = (urgency) => {
    const colors = {
      urgent: 'red',
      high: 'orange',
      normal: 'blue',
    };
    return colors[urgency] || 'gray';
  };

  // Safely compute average pay rate from available shifts
  const getAveragePayRate = () => {
    if (!openShifts || openShifts.length === 0) return '0.00';
    const rates = openShifts
      .map((s) => parseNumber(s.payRate))
      .filter((n) => Number.isFinite(n));
    if (rates.length === 0) return '0.00';
    const avg = rates.reduce((sum, n) => sum + n, 0) / rates.length;
    return parseNumber(avg).toFixed(2);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-dark via-night-sky to-night-sky">
        <p className="text-white">Loading available shifts...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-dark via-night-sky to-night-sky p-6">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white">Open Shifts</h1>
          <p className="mt-2 text-white/70">
            Apply for available shifts - manager will review your application
          </p>
        </div>

        {/* Stats */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-4">
            <p className="text-sm text-white/70">Available Shifts</p>
            <p className="mt-2 text-3xl font-bold text-white">{openShifts.length}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-4">
            <p className="text-sm text-white/70">Eligible For You</p>
            <p className="mt-2 text-3xl font-bold text-green-500">
              {openShifts.filter(s => calculateEligibility(s).eligible).length}
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-4">
            <p className="text-sm text-white/70">Avg. Pay Rate</p>
            <p className="mt-2 text-3xl font-bold text-white">
              £{getAveragePayRate()}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap items-center gap-4">
          <div className="flex gap-2">
            {['all', 'eligible', 'today', 'week', 'my-applications'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                  filter === f
                    ? 'bg-accent text-white'
                    : 'bg-white/5 text-white/70 hover:bg-white/10'
                }`}
              >
                {f === 'all' ? 'All Shifts' : 
                 f === 'eligible' ? 'Eligible' : 
                 f === 'today' ? 'Today' : 
                 f === 'week' ? 'This Week' :
                 'My Applications'}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-white/70">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="rounded-lg border border-white/10 bg-night-sky px-3 py-2 text-sm text-white focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            >
              <option value="date">Date</option>
              <option value="pay">Pay Rate</option>
            </select>
          </div>
        </div>

        {/* Shifts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredShifts.length === 0 ? (
            <div className="col-span-2 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-8 text-center">
              <AiOutlineCalendar className="mx-auto text-4xl text-white/30" />
              <p className="mt-4 text-white/70">No open shifts available</p>
            </div>
          ) : (
            filteredShifts.map((shift) => {
              const eligibility = calculateEligibility(shift);
              const timeRemaining = getTimeRemaining(shift.expiresAt);
              const isExpiringSoon = new Date(shift.expiresAt) - new Date() < 3 * 60 * 60 * 1000;
              const applicationStatus = getShiftApplicationStatus(shift.$id);

              return (
                <div
                  key={shift.$id}
                  className={`rounded-xl border backdrop-blur-sm p-6 hover:bg-white/10 transition-colors cursor-pointer ${
                    eligibility.eligible
                      ? 'border-green-500/30 bg-green-500/5'
                      : 'border-white/10 bg-white/5'
                  }`}
                  onClick={() => setSelectedShift(shift)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold text-white">{shift.siteName}</h3>
                        {eligibility.eligible && (
                          <AiOutlineCheckCircle className="text-green-500" />
                        )}
                        {applicationStatus && (
                          <span className={`rounded-full px-3 py-1 text-xs font-medium bg-${APPLICATION_STATUS_COLORS[applicationStatus]}-500/20 text-${APPLICATION_STATUS_COLORS[applicationStatus]}-500`}>
                            {APPLICATION_STATUS_LABELS[applicationStatus]}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`rounded-full px-3 py-1 text-xs font-medium bg-${getUrgencyColor(shift.urgency)}-500/20 text-${getUrgencyColor(shift.urgency)}-500`}>
                          {shift.urgency}
                        </span>
                        {isExpiringSoon && (
                          <span className="rounded-full bg-orange-500/20 px-3 py-1 text-xs text-orange-500 flex items-center gap-1">
                            <AiOutlineFire />
                            {timeRemaining}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-accent">{formatCurrency(shift.payRate)}</p>
                      <p className="text-xs text-white/60">/hour</p>
                    </div>
                  </div>

                  <div className="space-y-2">
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

                  {shift.requiredSkills && shift.requiredSkills.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {shift.requiredSkills.map((skill, idx) => (
                        <span
                          key={idx}
                          className="rounded-full bg-white/5 border border-white/10 px-2 py-1 text-xs text-white/70"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center gap-3 text-sm text-white/60">
                      <span className="flex items-center gap-1">
                        <AiOutlineUser />
                        {shift.claimCount} claimed
                      </span>
                      <span className="flex items-center gap-1">
                        <AiOutlineUser />
                        {shift.viewCount} views
                      </span>
                    </div>
                    {eligibility.eligible && (
                      <div className="flex items-center gap-1">
                        <AiOutlineTrophy className="text-yellow-500" />
                        <span className="text-sm font-semibold text-yellow-500">
                          {eligibility.score}% match
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Shift Detail Modal */}
      {selectedShift && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="max-w-2xl w-full rounded-xl border border-white/10 bg-night-sky p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white">{selectedShift.siteName}</h2>
                <p className="text-white/60 mt-1">{formatDate(selectedShift.date)}</p>
              </div>
              <button
                onClick={() => setSelectedShift(null)}
                className="rounded-lg bg-white/5 p-2 hover:bg-white/10 transition-colors"
              >
                ✕
              </button>
            </div>

            {(() => {
              const eligibility = calculateEligibility(selectedShift);
              const applicationStatus = getShiftApplicationStatus(selectedShift.$id);
              
              return (
                <>
                  {/* Application Status */}
                  {applicationStatus && (
                    <div className={`mb-6 rounded-lg border p-4 bg-${APPLICATION_STATUS_COLORS[applicationStatus]}-500/10 border-${APPLICATION_STATUS_COLORS[applicationStatus]}-500/50`}>
                      <div className="flex items-center gap-3">
                        {applicationStatus === APPLICATION_STATUS.PENDING && <AiOutlineHistory className="text-2xl text-yellow-500" />}
                        {applicationStatus === APPLICATION_STATUS.APPROVED && <AiOutlineCheckCircle className="text-2xl text-green-500" />}
                        {applicationStatus === APPLICATION_STATUS.REJECTED && <AiOutlineWarning className="text-2xl text-red-500" />}
                        <div className="flex-1">
                          <p className={`font-semibold text-${APPLICATION_STATUS_COLORS[applicationStatus]}-500`}>
                            {APPLICATION_STATUS_LABELS[applicationStatus]}
                          </p>
                          <p className="text-sm text-white/70 mt-1">
                            {applicationStatus === APPLICATION_STATUS.PENDING && 'Your application is under review'}
                            {applicationStatus === APPLICATION_STATUS.APPROVED && 'Congratulations! You got the shift'}
                            {applicationStatus === APPLICATION_STATUS.REJECTED && 'Application was not successful'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Eligibility Status */}
                  <div className={`mb-6 rounded-lg border p-4 ${
                    eligibility.eligible
                      ? 'bg-green-500/10 border-green-500/50'
                      : 'bg-red-500/10 border-red-500/50'
                  }`}>
                    <div className="flex items-center gap-3">
                      {eligibility.eligible ? (
                        <AiOutlineCheckCircle className="text-2xl text-green-500" />
                      ) : (
                        <AiOutlineWarning className="text-2xl text-red-500" />
                      )}
                      <div className="flex-1">
                        <p className={`font-semibold ${eligibility.eligible ? 'text-green-500' : 'text-red-500'}`}>
                          {eligibility.eligible ? 'You are eligible for this shift' : 'Not eligible'}
                        </p>
                        {eligibility.eligible && (
                          <p className="text-sm text-white/70 mt-1">Match Score: {eligibility.percentage}%</p>
                        )}
                        {!eligibility.eligible && eligibility.reasons.length > 0 && (
                          <p className="text-sm text-white/70 mt-1">{eligibility.reasons[0]}</p>
                        )}
                      </div>
                    </div>

                    {/* Show eligibility criteria breakdown */}
                    {eligibility.criteria && Object.keys(eligibility.criteria).length > 0 && (
                      <div className="mt-3 space-y-2">
                        <p className="text-xs text-white/50 font-semibold uppercase">Eligibility Breakdown</p>
                        {Object.entries(eligibility.criteria).map(([key, criterion]) => (
                          <div key={key} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              {criterion.passed ? (
                                <AiOutlineCheckCircle className="text-green-400" />
                              ) : (
                                <AiOutlineWarning className="text-red-400" />
                              )}
                              <span className="text-white/70">
                                {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`font-medium ${criterion.passed ? 'text-green-400' : 'text-red-400'}`}>
                                {criterion.score}/{criterion.weight}
                              </span>
                            </div>
                          </div>
                        ))}
                        {eligibility.recommendationLevel && (
                          <div className="mt-3 pt-3 border-t border-white/10">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-white/70">Recommendation</span>
                              <span className={`text-sm font-semibold ${
                                eligibility.recommendationLevel === 'highly_recommended' ? 'text-green-400' :
                                eligibility.recommendationLevel === 'recommended' ? 'text-blue-400' :
                                eligibility.recommendationLevel === 'acceptable' ? 'text-yellow-400' :
                                'text-red-400'
                              }`}>
                                {eligibility.recommendationLevel.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Shift Details */}
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="rounded-lg bg-white/5 border border-white/10 p-4">
                        <p className="text-sm text-white/50">Pay Rate</p>
                        <p className="mt-1 text-2xl font-bold text-accent">{formatCurrency(selectedShift.payRate)}/hr</p>
                      </div>
                      <div className="rounded-lg bg-white/5 border border-white/10 p-4">
                        <p className="text-sm text-white/50">Duration</p>
                        <p className="mt-1 text-white font-semibold">
                          {calculateDuration(selectedShift.startTime, selectedShift.endTime)}
                        </p>
                      </div>
                      <div className="rounded-lg bg-white/5 border border-white/10 p-4">
                        <p className="text-sm text-white/50">Start Time</p>
                        <p className="mt-1 text-white font-semibold">{selectedShift.startTime}</p>
                      </div>
                      <div className="rounded-lg bg-white/5 border border-white/10 p-4">
                        <p className="text-sm text-white/50">End Time</p>
                        <p className="mt-1 text-white font-semibold">{selectedShift.endTime}</p>
                      </div>
                    </div>

                    {selectedShift.notes && (
                      <div className="rounded-lg bg-white/5 border border-white/10 p-4">
                        <p className="text-sm text-white/50 mb-2">Shift Notes</p>
                        <p className="text-white">{selectedShift.notes}</p>
                      </div>
                    )}

                    {selectedShift.requiredSkills && selectedShift.requiredSkills.length > 0 && (
                      <div className="rounded-lg bg-white/5 border border-white/10 p-4">
                        <p className="text-sm text-white/50 mb-2">Required Skills</p>
                        <div className="flex flex-wrap gap-2">
                          {selectedShift.requiredSkills.map((skill, idx) => (
                            <span
                              key={idx}
                              className="rounded-full bg-accent/20 px-3 py-1 text-sm text-accent"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="rounded-lg bg-white/5 border border-white/10 p-4">
                      <p className="text-sm text-white/50 mb-2">Shift Activity</p>
                      <div className="flex items-center justify-between text-sm text-white/70">
                        <span>{selectedShift.claimCount} people claimed</span>
                        <span>{selectedShift.viewCount} views</span>
                        <span>Expires: {getTimeRemaining(selectedShift.expiresAt)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Button */}
                  {!applicationStatus && eligibility.eligible && (
                    <button
                      onClick={() => handleApplyForShift(selectedShift)}
                      disabled={applying}
                      className="mt-6 w-full flex items-center justify-center gap-2 rounded-lg bg-accent px-6 py-3 text-white hover:bg-accent/80 transition-colors disabled:opacity-50"
                    >
                      {applying ? (
                        <>
                          <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          Submitting Application...
                        </>
                      ) : (
                        <>
                          <AiOutlineSend />
                          Apply for This Shift
                        </>
                      )}
                    </button>
                  )}

                  {applicationStatus === APPLICATION_STATUS.PENDING && (
                    <div className="mt-6 rounded-lg bg-white/5 border border-white/10 p-4 text-center">
                      <AiOutlineHistory className="inline-block text-2xl text-yellow-500 mb-2" />
                      <p className="text-white/70">Your application is being reviewed by the manager</p>
                    </div>
                  )}

                  {applicationStatus === APPLICATION_STATUS.APPROVED && (
                    <div className="mt-6 rounded-lg bg-green-500/10 border border-green-500/50 p-4 text-center">
                      <AiOutlineCheckCircle className="inline-block text-2xl text-green-500 mb-2" />
                      <p className="text-green-400 font-semibold">You've been assigned this shift!</p>
                      <p className="text-white/70 text-sm mt-1">Check your schedule for details</p>
                    </div>
                  )}

                  {applicationStatus === APPLICATION_STATUS.REJECTED && (
                    <div className="mt-6 rounded-lg bg-red-500/10 border border-red-500/50 p-4 text-center">
                      <p className="text-white/70">This application was not successful</p>
                      <p className="text-white/50 text-sm mt-1">Keep applying - more shifts are posted daily</p>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

export default OpenShifts;
