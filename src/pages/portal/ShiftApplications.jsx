import React, { useState, useEffect } from 'react';
import { databases, config } from '../../lib/appwrite';
import { Query, ID } from 'appwrite';
import { useAuth } from '../../context/AuthContext';
import {
  APPLICATION_STATUS,
  APPLICATION_STATUS_LABELS,
  APPLICATION_STATUS_COLORS,
  REJECTION_REASONS,
  REJECTION_REASON_LABELS,
  approveApplication,
  rejectApplication,
  sortApplicationsByScore,
  getApplicationStats,
  canApproveApplication,
} from '../../lib/shiftApplications';
import {
  AiOutlineCheckCircle,
  AiOutlineCloseCircle,
  AiOutlineUser,
  AiOutlineCalendar,
  AiOutlineClockCircle,
  AiOutlineEnvironment,
  AiOutlineStar,
  AiOutlineHistory,
  AiOutlineWarning,
  AiOutlineTrophy,
  AiOutlineFilter,
} from 'react-icons/ai';

const ShiftApplications = () => {
  const { user } = useAuth();
  const [applications, setApplications] = useState([]);
  const [shifts, setShifts] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [reviewAction, setReviewAction] = useState(null); // 'approve' or 'reject'
  const [reviewNotes, setReviewNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [filter, setFilter] = useState('pending'); // pending, approved, rejected, all

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      setLoading(true);

      // Fetch all applications
      const applicationsRes = await databases.listDocuments(
        config.databaseId,
        config.applicationsCollectionId,
        [Query.orderDesc('appliedAt'), Query.limit(100)]
      );

      setApplications(applicationsRes.documents);

      // Fetch shift details for all applications
      const shiftIds = [...new Set(applicationsRes.documents.map(app => app.shiftId))];
      const shiftPromises = shiftIds.map(id =>
        databases.getDocument(config.databaseId, config.shiftsCollectionId, id).catch(() => null)
      );
      const shiftDocs = await Promise.all(shiftPromises);
      const shiftsMap = {};
      shiftDocs.forEach(shift => {
        if (shift) shiftsMap[shift.$id] = shift;
      });
      setShifts(shiftsMap);

      setLoading(false);
    } catch (error) {
      console.error('Error fetching applications:', error);
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedApplication) return;

    setProcessing(true);
    try {
      const shift = shifts[selectedApplication.shiftId];
      const approvalCheck = canApproveApplication(selectedApplication, shift);

      if (!approvalCheck.can) {
        alert(approvalCheck.reason);
        setProcessing(false);
        return;
      }

      // Update application status
      const updatedApplication = approveApplication(
        selectedApplication,
        user.$id,
        user.name || user.email,
        reviewNotes
      );

      await databases.updateDocument(
        config.databaseId,
        config.applicationsCollectionId,
        selectedApplication.$id,
        updatedApplication
      );

      // Update shift to assign the guard
      await databases.updateDocument(
        config.databaseId,
        config.shiftsCollectionId,
        selectedApplication.shiftId,
        {
          assignedGuardId: selectedApplication.guardId,
          assignedGuardName: selectedApplication.guardName,
          status: 'assigned',
        }
      );

      // Reject all other pending applications for this shift
      const otherApplications = applications.filter(
        app =>
          app.shiftId === selectedApplication.shiftId &&
          app.$id !== selectedApplication.$id &&
          app.status === APPLICATION_STATUS.PENDING
      );

      for (const app of otherApplications) {
        const rejectedApp = rejectApplication(
          app,
          user.$id,
          user.name || user.email,
          REJECTION_REASONS.SHIFT_FILLED,
          'Shift was filled by another candidate'
        );

        await databases.updateDocument(
          config.databaseId,
          config.applicationsCollectionId,
          app.$id,
          rejectedApp
        );
      }

      alert('Application approved successfully!');
      setSelectedApplication(null);
      setReviewAction(null);
      setReviewNotes('');
      await fetchApplications();
    } catch (error) {
      console.error('Error approving application:', error);
      alert('Failed to approve application. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedApplication || !rejectionReason) {
      alert('Please select a rejection reason');
      return;
    }

    setProcessing(true);
    try {
      const updatedApplication = rejectApplication(
        selectedApplication,
        user.$id,
        user.name || user.email,
        rejectionReason,
        reviewNotes
      );

      await databases.updateDocument(
        config.databaseId,
        config.applicationsCollectionId,
        selectedApplication.$id,
        updatedApplication
      );

      alert('Application rejected');
      setSelectedApplication(null);
      setReviewAction(null);
      setReviewNotes('');
      setRejectionReason('');
      await fetchApplications();
    } catch (error) {
      console.error('Error rejecting application:', error);
      alert('Failed to reject application. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const filteredApplications = applications.filter(app => {
    if (filter === 'all') return true;
    return app.status === filter;
  });

  const sortedApplications = sortApplicationsByScore(filteredApplications, true);

  const stats = getApplicationStats(applications);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  };

  const getScoreColor = (score) => {
    if (score >= 85) return 'text-green-500';
    if (score >= 70) return 'text-blue-500';
    if (score >= 50) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getRecommendationBadge = (level) => {
    const badges = {
      highly_recommended: { color: 'green', text: 'Highly Recommended' },
      recommended: { color: 'blue', text: 'Recommended' },
      acceptable: { color: 'yellow', text: 'Acceptable' },
      not_recommended: { color: 'red', text: 'Not Recommended' },
    };
    const badge = badges[level] || badges.acceptable;
    return (
      <span
        className={`rounded-full px-3 py-1 text-xs font-medium bg-${badge.color}-500/20 text-${badge.color}-500`}
      >
        {badge.text}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-dark via-night-sky to-night-sky">
        <p className="text-white">Loading applications...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-dark via-night-sky to-night-sky p-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white">Shift Applications</h1>
          <p className="mt-2 text-white/70">Review and approve guard applications for open shifts</p>
        </div>

        {/* Stats */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-4">
            <p className="text-sm text-white/70">Total Applications</p>
            <p className="mt-2 text-3xl font-bold text-white">{stats.total}</p>
          </div>
          <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 backdrop-blur-sm p-4">
            <p className="text-sm text-white/70">Pending Review</p>
            <p className="mt-2 text-3xl font-bold text-yellow-500">{stats.pending}</p>
          </div>
          <div className="rounded-xl border border-green-500/30 bg-green-500/5 backdrop-blur-sm p-4">
            <p className="text-sm text-white/70">Approved</p>
            <p className="mt-2 text-3xl font-bold text-green-500">{stats.approved}</p>
          </div>
          <div className="rounded-xl border border-red-500/30 bg-red-500/5 backdrop-blur-sm p-4">
            <p className="text-sm text-white/70">Rejected</p>
            <p className="mt-2 text-3xl font-bold text-red-500">{stats.rejected}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-4">
            <p className="text-sm text-white/70">Approval Rate</p>
            <p className="mt-2 text-3xl font-bold text-white">{stats.approvalRate}%</p>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex gap-2">
          {[
            { value: 'pending', label: 'Pending', count: stats.pending },
            { value: 'approved', label: 'Approved', count: stats.approved },
            { value: 'rejected', label: 'Rejected', count: stats.rejected },
            { value: 'all', label: 'All', count: stats.total },
          ].map(f => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                filter === f.value
                  ? 'bg-accent text-white'
                  : 'bg-white/5 text-white/70 hover:bg-white/10'
              }`}
            >
              {f.label} ({f.count})
            </button>
          ))}
        </div>

        {/* Applications List */}
        <div className="space-y-4">
          {sortedApplications.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-8 text-center">
              <p className="text-white/70">No applications found</p>
            </div>
          ) : (
            sortedApplications.map(application => {
              const shift = shifts[application.shiftId];
              const score = application.eligibilityScore?.percentage || 0;

              return (
                <div
                  key={application.$id}
                  className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-6 hover:bg-white/10 transition-colors cursor-pointer"
                  onClick={() => setSelectedApplication(application)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <AiOutlineUser className="text-xl text-accent" />
                        <h3 className="text-lg font-semibold text-white">{application.guardName}</h3>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-medium bg-${APPLICATION_STATUS_COLORS[application.status]}-500/20 text-${APPLICATION_STATUS_COLORS[application.status]}-500`}
                        >
                          {APPLICATION_STATUS_LABELS[application.status]}
                        </span>
                        {application.eligibilityScore?.recommendationLevel &&
                          getRecommendationBadge(application.eligibilityScore.recommendationLevel)}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                        <div>
                          <p className="text-xs text-white/50 mb-1">Shift Details</p>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-sm text-white/70">
                              <AiOutlineEnvironment className="text-accent" />
                              <span>{shift?.siteName || 'Unknown Site'}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-white/70">
                              <AiOutlineCalendar className="text-accent" />
                              <span>{shift?.date || 'N/A'}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-white/70">
                              <AiOutlineClockCircle className="text-accent" />
                              <span>
                                {shift?.startTime || 'N/A'} - {shift?.endTime || 'N/A'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div>
                          <p className="text-xs text-white/50 mb-1">Eligibility Score</p>
                          <div className="flex items-center gap-2">
                            <div className={`text-4xl font-bold ${getScoreColor(score)}`}>{score}</div>
                            <div className="flex-1">
                              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                <div
                                  className={`h-full ${
                                    score >= 85
                                      ? 'bg-green-500'
                                      : score >= 70
                                      ? 'bg-blue-500'
                                      : score >= 50
                                      ? 'bg-yellow-500'
                                      : 'bg-red-500'
                                  }`}
                                  style={{ width: `${score}%` }}
                                />
                              </div>
                              <p className="text-xs text-white/50 mt-1">
                                {application.eligibilityScore?.score || 0}/
                                {application.eligibilityScore?.maxScore || 100} points
                              </p>
                            </div>
                          </div>
                        </div>

                        <div>
                          <p className="text-xs text-white/50 mb-1">Application Time</p>
                          <div className="flex items-center gap-2 text-sm text-white/70">
                            <AiOutlineHistory className="text-accent" />
                            <div>
                              <p>{formatDate(application.appliedAt)}</p>
                              <p className="text-xs text-white/50">{formatTime(application.appliedAt)}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Application Detail Modal */}
      {selectedApplication && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="max-w-4xl w-full rounded-xl border border-white/10 bg-night-sky p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white">{selectedApplication.guardName}</h2>
                <p className="text-white/60 mt-1">Application Details</p>
              </div>
              <button
                onClick={() => {
                  setSelectedApplication(null);
                  setReviewAction(null);
                  setReviewNotes('');
                  setRejectionReason('');
                }}
                className="rounded-lg bg-white/5 p-2 hover:bg-white/10 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Status Badge */}
            <div
              className={`mb-6 rounded-lg border p-4 bg-${APPLICATION_STATUS_COLORS[selectedApplication.status]}-500/10 border-${APPLICATION_STATUS_COLORS[selectedApplication.status]}-500/50`}
            >
              <p
                className={`font-semibold text-${APPLICATION_STATUS_COLORS[selectedApplication.status]}-500`}
              >
                {APPLICATION_STATUS_LABELS[selectedApplication.status]}
              </p>
            </div>

            {/* Eligibility Breakdown */}
            {selectedApplication.eligibilityScore && (
              <div className="mb-6 rounded-lg border border-white/10 bg-white/5 p-4">
                <h3 className="text-lg font-semibold text-white mb-4">Eligibility Assessment</h3>

                <div className="flex items-center gap-4 mb-4">
                  <div className="text-5xl font-bold text-accent">
                    {selectedApplication.eligibilityScore.percentage}
                  </div>
                  <div className="flex-1">
                    <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${
                          selectedApplication.eligibilityScore.percentage >= 85
                            ? 'bg-green-500'
                            : selectedApplication.eligibilityScore.percentage >= 70
                            ? 'bg-blue-500'
                            : selectedApplication.eligibilityScore.percentage >= 50
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                        }`}
                        style={{ width: `${selectedApplication.eligibilityScore.percentage}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-sm text-white/70">
                        {selectedApplication.eligibilityScore.score}/
                        {selectedApplication.eligibilityScore.maxScore} points
                      </span>
                      {getRecommendationBadge(
                        selectedApplication.eligibilityScore.recommendationLevel
                      )}
                    </div>
                  </div>
                </div>

                {/* Criteria Breakdown */}
                {selectedApplication.eligibilityScore.criteria && (
                  <div className="space-y-2">
                    <p className="text-sm text-white/50 font-semibold uppercase">Criteria Breakdown</p>
                    {Object.entries(selectedApplication.eligibilityScore.criteria).map(
                      ([key, criterion]) => (
                        <div
                          key={key}
                          className="flex items-center justify-between rounded-lg bg-white/5 p-3"
                        >
                          <div className="flex items-center gap-2">
                            {criterion.passed ? (
                              <AiOutlineCheckCircle className="text-green-500" />
                            ) : (
                              <AiOutlineWarning className="text-red-500" />
                            )}
                            <div>
                              <span className="text-white">
                                {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                              </span>
                              {criterion.details && (
                                <p className="text-xs text-white/50">{criterion.details}</p>
                              )}
                            </div>
                          </div>
                          <span
                            className={`font-semibold ${
                              criterion.passed ? 'text-green-400' : 'text-red-400'
                            }`}
                          >
                            {criterion.score}/{criterion.weight}
                          </span>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Shift Details */}
            <div className="mb-6 rounded-lg border border-white/10 bg-white/5 p-4">
              <h3 className="text-lg font-semibold text-white mb-4">Shift Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-white/50 mb-1">Site</p>
                  <p className="text-white">
                    {shifts[selectedApplication.shiftId]?.siteName || 'Unknown'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-white/50 mb-1">Date</p>
                  <p className="text-white">{selectedApplication.shiftDetails?.date || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-white/50 mb-1">Time</p>
                  <p className="text-white">
                    {selectedApplication.shiftDetails?.startTime} -{' '}
                    {selectedApplication.shiftDetails?.endTime}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-white/50 mb-1">Hourly Rate</p>
                  <p className="text-white">£{selectedApplication.shiftDetails?.hourlyRate}/hr</p>
                </div>
              </div>
            </div>

            {/* Review Section - Only for Pending Applications */}
            {selectedApplication.status === APPLICATION_STATUS.PENDING && !reviewAction && (
              <div className="flex gap-3">
                <button
                  onClick={() => setReviewAction('approve')}
                  className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-green-500 px-6 py-3 text-white hover:bg-green-600 transition-colors"
                >
                  <AiOutlineCheckCircle className="text-xl" />
                  Approve Application
                </button>
                <button
                  onClick={() => setReviewAction('reject')}
                  className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-red-500 px-6 py-3 text-white hover:bg-red-600 transition-colors"
                >
                  <AiOutlineCloseCircle className="text-xl" />
                  Reject Application
                </button>
              </div>
            )}

            {/* Approve Form */}
            {reviewAction === 'approve' && (
              <div className="mt-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={reviewNotes}
                    onChange={e => setReviewNotes(e.target.value)}
                    placeholder="Add any notes about this approval..."
                    className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-accent"
                    rows="3"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleApprove}
                    disabled={processing}
                    className="flex-1 rounded-lg bg-green-500 px-6 py-3 text-white hover:bg-green-600 transition-colors disabled:opacity-50"
                  >
                    {processing ? 'Processing...' : 'Confirm Approval'}
                  </button>
                  <button
                    onClick={() => {
                      setReviewAction(null);
                      setReviewNotes('');
                    }}
                    className="rounded-lg bg-white/5 px-6 py-3 text-white hover:bg-white/10 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Reject Form */}
            {reviewAction === 'reject' && (
              <div className="mt-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Rejection Reason *
                  </label>
                  <select
                    value={rejectionReason}
                    onChange={e => setRejectionReason(e.target.value)}
                    className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-3 text-white focus:outline-none focus:border-accent"
                  >
                    <option value="">Select a reason...</option>
                    {Object.entries(REJECTION_REASON_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Additional Notes (Optional)
                  </label>
                  <textarea
                    value={reviewNotes}
                    onChange={e => setReviewNotes(e.target.value)}
                    placeholder="Add any additional feedback..."
                    className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-accent"
                    rows="3"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleReject}
                    disabled={processing || !rejectionReason}
                    className="flex-1 rounded-lg bg-red-500 px-6 py-3 text-white hover:bg-red-600 transition-colors disabled:opacity-50"
                  >
                    {processing ? 'Processing...' : 'Confirm Rejection'}
                  </button>
                  <button
                    onClick={() => {
                      setReviewAction(null);
                      setReviewNotes('');
                      setRejectionReason('');
                    }}
                    className="rounded-lg bg-white/5 px-6 py-3 text-white hover:bg-white/10 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Review History - For Reviewed Applications */}
            {selectedApplication.status !== APPLICATION_STATUS.PENDING && (
              <div className="mt-6 rounded-lg border border-white/10 bg-white/5 p-4">
                <h3 className="text-lg font-semibold text-white mb-3">Review History</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-white/70">Reviewed By</span>
                    <span className="text-white">{selectedApplication.reviewerName || 'Unknown'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-white/70">Reviewed At</span>
                    <span className="text-white">
                      {formatDate(selectedApplication.reviewedAt)} at{' '}
                      {formatTime(selectedApplication.reviewedAt)}
                    </span>
                  </div>
                  {selectedApplication.rejectionReason && (
                    <div className="flex justify-between text-sm">
                      <span className="text-white/70">Reason</span>
                      <span className="text-white">
                        {REJECTION_REASON_LABELS[selectedApplication.rejectionReason]}
                      </span>
                    </div>
                  )}
                  {selectedApplication.reviewNotes && (
                    <div className="mt-3 pt-3 border-t border-white/10">
                      <p className="text-xs text-white/50 mb-1">Notes</p>
                      <p className="text-sm text-white/70">{selectedApplication.reviewNotes}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ShiftApplications;
