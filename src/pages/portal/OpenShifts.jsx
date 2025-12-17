import React, { useState, useEffect } from 'react';
import { databases, config } from '../../lib/appwrite';
import { Query } from 'appwrite';
import { demoGuards, activeDemoGuards } from '../../data/demoGuards';
import {
  SHIFT_STATUS,
  STATUS_LABELS,
  STATUS_COLORS,
  validateShift,
  checkComplianceStatus,
  COMPLIANCE_STATUS,
} from '../../lib/scheduleUtils';
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
} from 'react-icons/ai';

const OpenShifts = () => {
  const [openShifts, setOpenShifts] = useState([]);
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentGuard] = useState(activeDemoGuards[0]); // Simulating logged-in guard
  const [selectedShift, setSelectedShift] = useState(null);
  const [claiming, setClaiming] = useState(false);
  const [filter, setFilter] = useState('all'); // all, eligible, today, week
  const [sortBy, setSortBy] = useState('date'); // date, distance, pay

  useEffect(() => {
    fetchOpenShifts();
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
        console.log('Using demo sites');
        setSites([
          { $id: '1', siteName: 'Central Shopping Mall', address: '123 High Street, London', postcode: 'SW1A 1AA' },
          { $id: '2', siteName: 'Office Tower B', address: '456 Business Park, London', postcode: 'EC1A 1BB' },
          { $id: '3', siteName: 'Residential Complex', address: '789 Park Lane, London', postcode: 'W1K 1CC' },
          { $id: '4', siteName: 'Retail Park', address: '321 Shopping Avenue, London', postcode: 'NW1 2DD' },
          { $id: '5', siteName: 'Corporate Headquarters', address: '654 Finance Street, London', postcode: 'E14 5EE' },
        ]);
      }

      // Fetch open/offered shifts
      try {
        const shiftsRes = await databases.listDocuments(config.databaseId, config.shiftsCollectionId, [
          Query.equal('status', [SHIFT_STATUS.OFFERED, SHIFT_STATUS.UNASSIGNED]),
          Query.limit(100),
        ]);
        setOpenShifts(shiftsRes.documents);
      } catch (error) {
        console.log('Using demo open shifts');
        // Demo open shifts
        const demoOpenShifts = [
          {
            $id: 'open-1',
            siteId: '1',
            siteName: 'Central Shopping Mall',
            date: '2025-12-16',
            startTime: '06:00',
            endTime: '14:00',
            status: SHIFT_STATUS.OFFERED,
            payRate: 13.50,
            urgency: 'high',
            requiredSkills: ['CCTV Monitoring', 'Customer Service'],
            preferredExperience: 2,
            offeredAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
            expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
            claimCount: 3,
            viewCount: 12,
            notes: 'Early morning shift. Must be comfortable with public-facing role.',
            $createdAt: new Date('2025-12-15').toISOString(),
          },
          {
            $id: 'open-2',
            siteId: '2',
            siteName: 'Office Tower B',
            date: '2025-12-17',
            startTime: '22:00',
            endTime: '06:00',
            status: SHIFT_STATUS.OFFERED,
            payRate: 15.00,
            urgency: 'urgent',
            requiredSkills: ['Night Patrol', 'Access Control'],
            preferredExperience: 3,
            offeredAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
            expiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
            claimCount: 1,
            viewCount: 8,
            notes: 'Night shift. Premium rate. Previous experience at this site preferred.',
            $createdAt: new Date('2025-12-15').toISOString(),
          },
          {
            $id: 'open-3',
            siteId: '3',
            siteName: 'Residential Complex',
            date: '2025-12-18',
            startTime: '14:00',
            endTime: '22:00',
            status: SHIFT_STATUS.OFFERED,
            payRate: 12.50,
            urgency: 'normal',
            requiredSkills: ['Front Desk', 'Visitor Management'],
            preferredExperience: 1,
            offeredAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
            expiresAt: new Date(Date.now() + 18 * 60 * 60 * 1000).toISOString(),
            claimCount: 0,
            viewCount: 5,
            notes: 'Afternoon shift. Residential setting.',
            $createdAt: new Date('2025-12-14').toISOString(),
          },
          {
            $id: 'open-4',
            siteId: '4',
            siteName: 'Retail Park',
            date: '2025-12-19',
            startTime: '10:00',
            endTime: '18:00',
            status: SHIFT_STATUS.OFFERED,
            payRate: 13.00,
            urgency: 'normal',
            requiredSkills: ['Retail Security', 'Loss Prevention'],
            preferredExperience: 2,
            offeredAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
            expiresAt: new Date(Date.now() + 36 * 60 * 60 * 1000).toISOString(),
            claimCount: 2,
            viewCount: 15,
            notes: 'Busy retail environment. Weekend rate.',
            $createdAt: new Date('2025-12-14').toISOString(),
          },
          {
            $id: 'open-5',
            siteId: '5',
            siteName: 'Corporate Headquarters',
            date: '2025-12-20',
            startTime: '08:00',
            endTime: '16:00',
            status: SHIFT_STATUS.OFFERED,
            payRate: 14.00,
            urgency: 'high',
            requiredSkills: ['Corporate Security', 'VIP Protection'],
            preferredExperience: 5,
            offeredAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            expiresAt: new Date(Date.now() + 10 * 60 * 60 * 1000).toISOString(),
            claimCount: 1,
            viewCount: 6,
            notes: 'Professional corporate environment. Smart dress code required.',
            $createdAt: new Date('2025-12-15').toISOString(),
          },
          {
            $id: 'open-6',
            siteId: '1',
            siteName: 'Central Shopping Mall',
            date: '2025-12-21',
            startTime: '18:00',
            endTime: '02:00',
            status: SHIFT_STATUS.OFFERED,
            payRate: 16.00,
            urgency: 'urgent',
            requiredSkills: ['Night Security', 'Emergency Response'],
            preferredExperience: 3,
            offeredAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
            expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
            claimCount: 0,
            viewCount: 3,
            notes: 'Late night shift. Premium rate. Last minute cover needed.',
            $createdAt: new Date('2025-12-15').toISOString(),
          },
        ];
        setOpenShifts(demoOpenShifts);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching open shifts:', error);
      setLoading(false);
    }
  };

  const calculateEligibility = (shift) => {
    // Check compliance
    const complianceStatus = checkComplianceStatus(currentGuard);
    if (complianceStatus === COMPLIANCE_STATUS.EXPIRED) {
      return {
        eligible: false,
        score: 0,
        reason: 'SIA License expired',
        factors: [],
      };
    }

    // Validate for conflicts
    const validation = validateShift(shift, currentGuard, [], []);
    if (!validation.valid) {
      return {
        eligible: false,
        score: 0,
        reason: validation.conflicts[0]?.message || 'Scheduling conflict',
        factors: [],
      };
    }

    // Calculate eligibility score (0-100)
    let score = 50; // Base score
    const factors = [];

    // Experience match
    const guardExperience = 3; // Simulated
    if (shift.preferredExperience) {
      if (guardExperience >= shift.preferredExperience) {
        score += 20;
        factors.push({ label: 'Experience Match', points: 20, positive: true });
      } else {
        score -= 10;
        factors.push({ label: 'Below Required Experience', points: -10, positive: false });
      }
    }

    // Skills match (simulated - would check against guard profile)
    const guardSkills = ['CCTV Monitoring', 'Night Patrol', 'Customer Service', 'Access Control'];
    if (shift.requiredSkills) {
      const matchedSkills = shift.requiredSkills.filter(skill => guardSkills.includes(skill));
      const skillMatchRate = matchedSkills.length / shift.requiredSkills.length;
      const skillPoints = Math.round(skillMatchRate * 20);
      score += skillPoints;
      if (skillMatchRate === 1) {
        factors.push({ label: 'All Skills Match', points: skillPoints, positive: true });
      } else if (skillMatchRate > 0) {
        factors.push({ label: 'Partial Skills Match', points: skillPoints, positive: true });
      } else {
        factors.push({ label: 'No Skills Match', points: 0, positive: false });
      }
    }

    // Reliability score (simulated)
    const reliabilityScore = 95; // Percentage
    if (reliabilityScore > 90) {
      score += 10;
      factors.push({ label: 'Excellent Reliability', points: 10, positive: true });
    }

    // Previous site experience (simulated)
    const hasWorkedAtSite = Math.random() > 0.5;
    if (hasWorkedAtSite) {
      score += 5;
      factors.push({ label: 'Previous Site Experience', points: 5, positive: true });
    }

    // Warnings (don't block but reduce score)
    if (validation.warnings.length > 0) {
      const warningPenalty = validation.warnings.length * 5;
      score -= warningPenalty;
      factors.push({ label: `${validation.warnings.length} Warning(s)`, points: -warningPenalty, positive: false });
    }

    return {
      eligible: score >= 30, // Minimum threshold
      score: Math.min(100, Math.max(0, score)),
      reason: score >= 30 ? 'Eligible' : 'Below eligibility threshold',
      factors,
      warnings: validation.warnings,
    };
  };

  const handleClaimShift = async (shift) => {
    setClaiming(true);
    try {
      const eligibility = calculateEligibility(shift);
      
      if (!eligibility.eligible) {
        alert(`Cannot claim shift: ${eligibility.reason}`);
        setClaiming(false);
        return;
      }

      // Simulate claiming shift
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Update shift status
      const updatedShift = {
        ...shift,
        status: SHIFT_STATUS.ACCEPTED,
        assignedGuardId: currentGuard.$id,
        claimedAt: new Date().toISOString(),
        claimedBy: `${currentGuard.firstName} ${currentGuard.lastName}`,
      };

      setOpenShifts(openShifts.filter(s => s.$id !== shift.$id));
      alert(`Successfully claimed shift at ${shift.siteName}!`);
      setSelectedShift(null);
    } catch (error) {
      console.error('Error claiming shift:', error);
      alert('Failed to claim shift. Please try again.');
    } finally {
      setClaiming(false);
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
            Claim available shifts - first to accept gets assigned
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
            <p className="text-sm text-white/70">Expiring Soon</p>
            <p className="mt-2 text-3xl font-bold text-orange-500">
              {openShifts.filter(s => {
                const diff = new Date(s.expiresAt) - new Date();
                return diff < 3 * 60 * 60 * 1000 && diff > 0;
              }).length}
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-4">
            <p className="text-sm text-white/70">Avg. Pay Rate</p>
            <p className="mt-2 text-3xl font-bold text-white">
              £{(openShifts.reduce((sum, s) => sum + (s.payRate || 0), 0) / openShifts.length).toFixed(2)}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap items-center gap-4">
          <div className="flex gap-2">
            {['all', 'eligible', 'today', 'week'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                  filter === f
                    ? 'bg-accent text-white'
                    : 'bg-white/5 text-white/70 hover:bg-white/10'
                }`}
              >
                {f === 'all' ? 'All Shifts' : f === 'eligible' ? 'Eligible' : f === 'today' ? 'Today' : 'This Week'}
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
                      <p className="text-2xl font-bold text-accent">£{shift.payRate}</p>
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
              
              return (
                <>
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
                          {eligibility.reason}
                        </p>
                        {eligibility.eligible && (
                          <p className="text-sm text-white/70 mt-1">Match Score: {eligibility.score}%</p>
                        )}
                      </div>
                    </div>

                    {eligibility.factors && eligibility.factors.length > 0 && (
                      <div className="mt-3 space-y-1">
                        {eligibility.factors.map((factor, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-sm">
                            <span className={factor.positive ? 'text-green-400' : 'text-red-400'}>
                              {factor.positive ? '+' : ''}{factor.points}
                            </span>
                            <span className="text-white/70">{factor.label}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Shift Details */}
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="rounded-lg bg-white/5 border border-white/10 p-4">
                        <p className="text-sm text-white/50">Pay Rate</p>
                        <p className="mt-1 text-2xl font-bold text-accent">£{selectedShift.payRate}/hr</p>
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
                  {eligibility.eligible && (
                    <button
                      onClick={() => handleClaimShift(selectedShift)}
                      disabled={claiming}
                      className="mt-6 w-full flex items-center justify-center gap-2 rounded-lg bg-accent px-6 py-3 text-white hover:bg-accent/80 transition-colors disabled:opacity-50"
                    >
                      {claiming ? (
                        <>
                          <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          Claiming...
                        </>
                      ) : (
                        <>
                          <AiOutlineThunderbolt />
                          Claim This Shift
                        </>
                      )}
                    </button>
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
