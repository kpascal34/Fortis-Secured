import React, { useState, useEffect } from 'react';
import { databases, config } from '../lib/appwrite';
import { Query, ID } from 'appwrite';
import {
  AiOutlineClose,
  AiOutlineUser,
  AiOutlineCheckCircle,
  AiOutlineWarning,
  AiOutlineCloseCircle,
  AiOutlineLoading3Quarters,
  AiOutlineSearch,
  AiOutlinePhone,
  AiOutlineMail,
  AiOutlineSafetyCertificate,
  AiOutlineDelete,
} from 'react-icons/ai';
import { notifyShiftAssigned } from '../services/notificationService.js';

const LICENSE_EXPIRY_THRESHOLD_DAYS = Number(import.meta.env.VITE_LICENSE_EXPIRY_THRESHOLD_DAYS || 30);

const GuardAssignmentModal = ({ isOpen, onClose, shift, onAssignmentComplete }) => {
  const [guards, setGuards] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // all, available, assigned
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && shift) {
      fetchData();
    }
  }, [isOpen, shift]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      let guardsData = [];
      let assignmentsData = [];
      
      try {
        const [guardsRes, assignmentsRes] = await Promise.all([
          databases.listDocuments(config.databaseId, config.guardsCollectionId, [
            Query.equal('status', 'active'),
            Query.limit(100),
          ]),
          databases.listDocuments(config.databaseId, config.shiftAssignmentsCollectionId, [
            Query.equal('shiftId', shift.$id),
          ]),
        ]);

        guardsData = guardsRes.documents;
        assignmentsData = assignmentsRes.documents;
      } catch (error) {
        console.error('Error fetching guards/assignments from database:', error);
        guardsData = [];
        assignmentsData = [];
      }

      setGuards(guardsData);
      setAssignments(assignmentsData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const isGuardAssigned = (guardId) => {
    return assignments.some((a) => a.guardId === guardId && a.status !== 'cancelled');
  };

  const getAssignment = (guardId) => {
    return assignments.find((a) => a.guardId === guardId && a.status !== 'cancelled');
  };

  const isGuardCompliant = (guard) => {
    const today = new Date();
    const siaExpiry = guard.siaExpiryDate ? new Date(guard.siaExpiryDate) : null;
    const dbsExpiry = guard.dbsExpiryDate ? new Date(guard.dbsExpiryDate) : null;

    const siaValid = siaExpiry && siaExpiry > today;
    const dbsValid = guard.dbsStatus === 'cleared' && (!dbsExpiry || dbsExpiry > today);
    const rtwValid = guard.rightToWorkStatus === 'verified';

    return siaValid && dbsValid && rtwValid;
  };

  const isLicenceExpiredOrNear = (guard) => {
    const today = new Date();
    const expiry = guard.siaExpiryDate ? new Date(guard.siaExpiryDate) : null;
    if (!expiry) return true;
    const daysUntilExpiry = Math.floor((expiry - today) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry < 0 || daysUntilExpiry <= LICENSE_EXPIRY_THRESHOLD_DAYS;
  };

  const getComplianceWarnings = (guard) => {
    const warnings = [];
    const today = new Date();

    if (!guard.siaLicenceNumber) {
      warnings.push('No SIA licence');
    } else {
      const siaExpiry = guard.siaExpiryDate ? new Date(guard.siaExpiryDate) : null;
      if (!siaExpiry || siaExpiry <= today) {
        warnings.push('SIA expired');
      } else if ((siaExpiry - today) / (1000 * 60 * 60 * 24) <= 30) {
        warnings.push('SIA expiring soon');
      }
    }

    if (guard.dbsStatus !== 'cleared') {
      warnings.push('DBS not cleared');
    } else if (guard.dbsExpiryDate) {
      const dbsExpiry = new Date(guard.dbsExpiryDate);
      if (dbsExpiry <= today) {
        warnings.push('DBS expired');
      } else if ((dbsExpiry - today) / (1000 * 60 * 60 * 24) <= 30) {
        warnings.push('DBS expiring soon');
      }
    }

    if (guard.rightToWorkStatus !== 'verified') {
      warnings.push('Right to work not verified');
    }

    return warnings;
  };

  const handleAssignGuard = async (guardId) => {
    try {
      setSubmitting(true);

      const assignmentData = {
        shiftId: shift.$id,
        guardId: guardId,
        status: 'assigned',
        assignedAt: new Date().toISOString(),
      };

      await databases.createDocument(
        config.databaseId,
        config.shiftAssignmentsCollectionId,
        ID.unique(),
        assignmentData
      );

      // Notify guard
      await notifyShiftAssigned(guardId, {
        id: shift.$id,
        date: shift.date,
        startTime: shift.startTime,
        endTime: shift.endTime,
        position: shift.shiftType || shift.position_title,
        siteId: shift.siteId,
        siteName: shift.siteName,
      });

      // Refresh assignments
      await fetchData();
      
      // Check if shift is now fully filled
      const currentAssignments = assignments.length + 1;
      if (currentAssignments >= shift.requiredHeadcount) {
        // Update shift status to filled
        await databases.updateDocument(
          config.databaseId,
          config.shiftsCollectionId,
          shift.$id,
          { status: 'scheduled' }
        );
      }

      alert('Guard assigned successfully!');
      if (onAssignmentComplete) onAssignmentComplete();
    } catch (error) {
      console.error('Error assigning guard:', error);
      alert(`Failed to assign guard: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnassignGuard = async (assignmentId) => {
    if (!window.confirm('Are you sure you want to remove this guard from the shift?')) return;

    try {
      setSubmitting(true);

      // Update assignment status to cancelled
      await databases.updateDocument(
        config.databaseId,
        config.shiftAssignmentsCollectionId,
        assignmentId,
        { status: 'cancelled' }
      );

      // Refresh assignments
      await fetchData();

      // Update shift status to unfilled if needed
      const activeAssignments = assignments.filter(a => a.status !== 'cancelled').length - 1;
      if (activeAssignments < shift.requiredHeadcount) {
        await databases.updateDocument(
          config.databaseId,
          config.shiftsCollectionId,
          shift.$id,
          { status: 'unfilled' }
        );
      }

      alert('Guard removed from shift!');
      if (onAssignmentComplete) onAssignmentComplete();
    } catch (error) {
      console.error('Error removing guard:', error);
      alert(`Failed to remove guard: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateAssignmentStatus = async (assignmentId, newStatus) => {
    try {
      setSubmitting(true);

      const updateData = { status: newStatus };
      
      if (newStatus === 'checked-in') {
        updateData.checkInTime = new Date().toISOString();
      } else if (newStatus === 'completed') {
        updateData.checkOutTime = new Date().toISOString();
      }

      await databases.updateDocument(
        config.databaseId,
        config.shiftAssignmentsCollectionId,
        assignmentId,
        updateData
      );

      await fetchData();
      alert('Assignment status updated!');
      if (onAssignmentComplete) onAssignmentComplete();
    } catch (error) {
      console.error('Error updating assignment:', error);
      alert(`Failed to update assignment: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredGuards = guards.filter((guard) => {
    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const fullName = `${guard.firstName} ${guard.lastName}`.toLowerCase();
      if (!fullName.includes(search) && !guard.email?.toLowerCase().includes(search)) {
        return false;
      }
    }

    // Licence expiry threshold filter
    if (isLicenceExpiredOrNear(guard)) {
      return false;
    }

    // Status filter
    if (filterStatus === 'assigned' && !isGuardAssigned(guard.$id)) return false;
    if (filterStatus === 'available' && isGuardAssigned(guard.$id)) return false;

    return true;
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="relative max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-primary-dark via-night-sky to-primary-dark shadow-2xl">
        {/* Header */}
        <div className="border-b border-white/10 bg-white/5 px-8 py-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">Assign Guards to Shift</h2>
              <p className="mt-1 text-sm text-white/60">
                {shift.date} • {shift.startTime} - {shift.endTime} • {shift.shiftType}
              </p>
              <div className="mt-2 flex items-center gap-4">
                <span className="text-sm text-white/80">
                  Assigned: <span className="font-bold text-accent">{assignments.filter(a => a.status !== 'cancelled').length}</span> / {shift.requiredHeadcount}
                </span>
                {assignments.filter(a => a.status !== 'cancelled').length >= shift.requiredHeadcount && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-500/20 px-3 py-1 text-xs font-medium text-green-400">
                    <AiOutlineCheckCircle className="h-4 w-4" />
                    Fully Staffed
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-full p-2 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
            >
              <AiOutlineClose className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="border-b border-white/10 bg-white/5 px-8 py-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <AiOutlineSearch className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/40" />
              <input
                type="text"
                placeholder="Search guards..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 py-2 pl-12 pr-4 text-white placeholder:text-white/40 focus:border-accent focus:outline-none"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white focus:border-accent focus:outline-none"
            >
              <option value="all">All Guards</option>
              <option value="available">Available Only</option>
              <option value="assigned">Assigned Only</option>
            </select>
          </div>
        </div>

        {/* Content */}
        <div className="max-h-[500px] overflow-y-auto p-8">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <AiOutlineLoading3Quarters className="h-8 w-8 animate-spin text-accent" />
              <p className="mt-4 text-sm text-white/60">Loading guards...</p>
            </div>
          ) : filteredGuards.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <AiOutlineUser className="h-16 w-16 text-white/20" />
              <p className="mt-4 text-white/60">No guards found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredGuards.map((guard) => {
                const assigned = isGuardAssigned(guard.$id);
                const assignment = getAssignment(guard.$id);
                const compliant = isGuardCompliant(guard);
                const warnings = getComplianceWarnings(guard);

                return (
                  <div
                    key={guard.$id}
                    className={`rounded-2xl border p-4 transition-all ${
                      assigned
                        ? 'border-accent/30 bg-accent/5'
                        : compliant
                        ? 'border-white/10 bg-white/5 hover:border-white/20'
                        : 'border-red-500/30 bg-red-500/5'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/20 text-accent">
                            <AiOutlineUser className="h-6 w-6" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-white">
                              {guard.firstName} {guard.lastName}
                            </h3>
                            <p className="text-sm text-white/60 capitalize">{guard.role?.replace('_', ' ')}</p>
                          </div>
                        </div>

                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          <div className="flex items-center gap-2 text-sm text-white/70">
                            <AiOutlineMail className="h-4 w-4" />
                            {guard.email}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-white/70">
                            <AiOutlinePhone className="h-4 w-4" />
                            {guard.phone}
                          </div>
                          {guard.siaLicenceNumber && (
                            <div className="flex items-center gap-2 text-sm text-white/70">
                              <AiOutlineSafetyCertificate className="h-4 w-4" />
                              SIA: {guard.siaLicenceNumber}
                            </div>
                          )}
                          <div className="text-sm text-white/70">
                            Pay Rate: £{guard.payRate}/hr
                          </div>
                        </div>

                        {/* Compliance Status */}
                        {!compliant && warnings.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {warnings.map((warning, index) => (
                              <span
                                key={index}
                                className="inline-flex items-center gap-1 rounded-full bg-red-500/20 px-2 py-1 text-xs text-red-400"
                              >
                                <AiOutlineWarning className="h-3 w-3" />
                                {warning}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Assignment Status */}
                        {assigned && assignment && (
                          <div className="mt-3 flex items-center gap-2">
                            <span className="text-sm text-white/70">Status:</span>
                            <select
                              value={assignment.status}
                              onChange={(e) => handleUpdateAssignmentStatus(assignment.$id, e.target.value)}
                              disabled={submitting}
                              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-sm text-white focus:border-accent focus:outline-none disabled:opacity-50"
                            >
                              <option value="assigned">Assigned</option>
                              <option value="checked-in">Checked In</option>
                              <option value="completed">Completed</option>
                              <option value="no-show">No Show</option>
                            </select>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-2">
                        {assigned ? (
                          <button
                            onClick={() => handleUnassignGuard(assignment.$id)}
                            disabled={submitting}
                            className="flex items-center gap-2 rounded-lg bg-red-500/20 px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/30 disabled:opacity-50"
                          >
                            <AiOutlineDelete className="h-4 w-4" />
                            Remove
                          </button>
                        ) : (
                          <button
                            onClick={() => handleAssignGuard(guard.$id)}
                            disabled={submitting || !compliant}
                            className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-night-sky transition-colors hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <AiOutlineCheckCircle className="h-4 w-4" />
                            Assign
                          </button>
                        )}
                        {compliant && (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-green-500/20 px-3 py-1 text-xs text-green-400">
                            <AiOutlineCheckCircle className="h-3 w-3" />
                            Compliant
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-white/10 bg-white/5 px-8 py-4">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="rounded-xl bg-white/10 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-white/20"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GuardAssignmentModal;
