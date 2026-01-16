import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { databases, config } from '../../lib/appwrite';
import { Query } from 'appwrite';
import StaffFormModal from '../../components/StaffFormModal';
import StaffRecordsTable from '../../components/StaffRecordsTable';
import {
  AiOutlineTeam,
  AiOutlineFileText,
  AiOutlineCalendar,
  AiOutlineClockCircle,
  AiOutlineCheckCircle,
  AiOutlineWarning,
  AiOutlineUser,
  AiOutlineDownload,
  AiOutlineUpload,
} from 'react-icons/ai';

const HR = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [guards, setGuards] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [trainingSchedule, setTrainingSchedule] = useState([]);
  const [licenses, setLicenses] = useState([]);
  const [selectedGuard, setSelectedGuard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [refreshStaff, setRefreshStaff] = useState(0);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (config.isDemoMode) {
        setGuards([]);
        setLeaveRequests([]);
        setTrainingSchedule([]);
        setLicenses([]);
        setLoading(false);
        return;
      }

      const [staffResponse, leaveResponse, trainingResponse, licensesResponse] = await Promise.all([
        databases
          .listDocuments(config.databaseId, config.staffProfilesCollectionId, [Query.limit(100), Query.orderDesc('$createdAt')])
          .catch(() => ({ documents: [] })),
        databases
          .listDocuments(config.databaseId, config.staffLeaveCollectionId || 'staff_leave', [Query.limit(50), Query.orderDesc('requestedAt')])
          .catch(() => ({ documents: [] })),
        databases
          .listDocuments(config.databaseId, config.staffTrainingCollectionId || 'staff_training', [Query.limit(50), Query.orderDesc('startDate')])
          .catch(() => ({ documents: [] })),
        databases
          .listDocuments(config.databaseId, config.staffLicensesCollectionId || 'staff_licenses', [Query.limit(100)])
          .catch(() => ({ documents: [] })),
      ]);

      setGuards(staffResponse.documents || []);
      setLeaveRequests(leaveResponse.documents || []);
      setTrainingSchedule(trainingResponse.documents || []);
      setLicenses(licensesResponse.documents || []);
    } catch (err) {
      console.error('Error fetching HR data:', err);
      setError('Failed to load HR data');
    } finally {
      setLoading(false);
    }
  };

  const expiringLicensesList = (licenses || []).filter((l) => {
    if (!l.expiryDate) return false;
    const expiryDate = new Date(l.expiryDate);
    const daysUntilExpiry = Math.ceil((expiryDate - new Date()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 30 && daysUntilExpiry >= 0;
  });

  const expiringLicensesCount = expiringLicensesList.length;
  const pendingLeave = leaveRequests.filter((l) => l.status === 'pending').length;

  const hrStats = [
    { label: 'Total Staff', value: guards.length, icon: AiOutlineTeam, color: 'blue' },
    { label: 'Active', value: guards.filter((g) => g.status === 'active').length, icon: AiOutlineCheckCircle, color: 'green' },
    { label: 'On Leave', value: pendingLeave, icon: AiOutlineCalendar, color: 'yellow' },
    { label: 'Expiring Licenses', value: expiringLicensesCount, icon: AiOutlineWarning, color: 'red' },
  ];

  const documents = [];

  const tabs = [
    { id: 'overview', label: 'Overview', icon: AiOutlineTeam },
    { id: 'staff', label: 'Staff Records', icon: AiOutlineUser },
    { id: 'leave', label: 'Leave Management', icon: AiOutlineCalendar },
    { id: 'training', label: 'Training', icon: AiOutlineFileText },
    { id: 'documents', label: 'Documents', icon: AiOutlineDownload },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">HR & Compliance</h1>
          <p className="mt-2 text-white/70">Manage staff, leave, training, and compliance</p>
        </div>
        <button
          onClick={() => navigate('/portal/invite-management')}
          className="rounded-lg bg-accent px-6 py-2 text-white hover:bg-accent/80 transition-colors"
        >
          + Add Staff Member
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {hrStats.map((stat, index) => (
          <div key={index} className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/70">{stat.label}</p>
                <p className="mt-2 text-3xl font-bold text-white">{stat.value}</p>
              </div>
              <div className={`rounded-lg bg-${stat.color}-500/20 p-3`}>
                <stat.icon className={`text-2xl text-${stat.color}-500`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              activeTab === tab.id ? 'bg-accent text-white' : 'bg-white/5 text-white/70 hover:bg-white/10'
            }`}
          >
            <tab.icon className="text-lg" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Pending Leave Requests */}
            <div>
              <h2 className="text-xl font-semibold text-white mb-4">Pending Leave Requests</h2>
              <div className="space-y-3">
                {leaveRequests.filter((r) => r.status === 'pending').length > 0 ? (
                  leaveRequests
                    .filter((r) => r.status === 'pending')
                    .map((request) => {
                      const staff = guards.find((s) => s.$id === request.staff_id);
                      const startDate = new Date(request.startDate).toLocaleDateString('en-GB');
                      const endDate = new Date(request.endDate).toLocaleDateString('en-GB');
                      const days = Math.ceil((new Date(request.endDate) - new Date(request.startDate)) / (1000 * 60 * 60 * 24));
                      return (
                        <div key={request.$id} className="rounded-lg border border-white/10 bg-white/5 p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-semibold text-white">{staff?.firstName} {staff?.lastName}</p>
                              <p className="text-sm text-white/60 mt-1">{request.type}</p>
                              <p className="text-sm text-white/50 mt-2">
                                {startDate} - {endDate} ({days} days)
                              </p>
                              <p className="text-sm text-white/70 mt-1">Reason: {request.reason || 'No reason provided'}</p>
                            </div>
                            <div className="flex gap-2">
                              <button className="rounded-lg bg-green-500/20 border border-green-500/50 px-4 py-2 text-sm text-green-500 hover:bg-green-500/30 transition-colors">
                                Approve
                              </button>
                              <button className="rounded-lg bg-red-500/20 border border-red-500/50 px-4 py-2 text-sm text-red-500 hover:bg-red-500/30 transition-colors">
                                Reject
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                ) : (
                  <p className="text-white/50 text-sm">No pending leave requests</p>
                )}
              </div>
            </div>

            {/* Upcoming Training */}
            <div>
              <h2 className="text-xl font-semibold text-white mb-4">Upcoming Training</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {trainingSchedule.length > 0 ? (
                  trainingSchedule.slice(0, 2).map((training) => {
                    const startDate = new Date(training.startDate).toLocaleDateString('en-GB');
                    const endDate = new Date(training.endDate).toLocaleDateString('en-GB');
                    return (
                      <div key={training.$id} className="rounded-lg border border-white/10 bg-white/5 p-4">
                        <h3 className="font-semibold text-white">{training.course}</h3>
                        <div className="mt-3 space-y-2">
                          <div className="flex items-center gap-2 text-sm text-white/70">
                            <AiOutlineCalendar />
                            <span>{startDate} - {endDate}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-white/70">
                            <AiOutlineClockCircle />
                            <span>{training.provider || 'TBD'}</span>
                          </div>
                          <div className="flex items-center justify-between mt-3">
                            <span className="text-sm text-white/60">
                              Status: {training.status}
                            </span>
                            <button className="text-sm text-accent hover:text-accent/80">View Details</button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-white/50 text-sm">No upcoming training</p>
                )}
              </div>
            </div>

            {/* License Compliance */}
            <div>
              <h2 className="text-xl font-semibold text-white mb-4">License Compliance</h2>
              <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-sm text-white/70">Licenses expiring within 30 days</span>
                  <span className="inline-block rounded bg-red-500/20 px-3 py-1 text-sm font-semibold text-red-400">
                    {expiringLicensesCount}
                  </span>
                </div>
                <div className="space-y-3">
                  {expiringLicensesList.length > 0 ? (
                    expiringLicensesList.slice(0, 5).map((license) => {
                      const expiryDate = new Date(license.expiryDate).toLocaleDateString('en-GB');
                      const daysLeft = Math.ceil((new Date(license.expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
                      const staffName = guards.find((s) => s.$id === license.staff_id)?.firstName || 'Unknown';
                      return (
                        <div key={license.$id} className="rounded-lg border border-white/10 bg-white/5 p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-semibold text-white">{staffName}</p>
                              <p className="text-sm text-white/70 mt-1">License: {license.licenseType || 'SIA'}</p>
                              <p className="text-sm text-white/50 mt-1">Expiry: {expiryDate}</p>
                            </div>
                            <div className="text-right">
                              <p className={`text-sm font-semibold ${daysLeft <= 7 ? 'text-red-400' : 'text-yellow-400'}`}>
                                {daysLeft} days left
                              </p>
                              <button className="mt-2 rounded-lg bg-accent/20 px-3 py-1 text-xs text-accent hover:bg-accent/30 transition-colors">
                                Send Reminder
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-white/50 text-sm">No expiring licenses in the next 30 days</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Staff Records Tab */}
        {activeTab === 'staff' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">Staff Records</h2>
              <button
                onClick={() => setShowStaffModal(true)}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-night-sky transition-colors hover:bg-accent/90"
              >
                + Add Staff Member
              </button>
            </div>
            <StaffRecordsTable
              refreshTrigger={refreshStaff}
              onEdit={(staff) => setSelectedGuard(staff)}
              onDelete={() => setRefreshStaff((prev) => prev + 1)}
            />
          </div>
        )}

        {/* Leave Management Tab */}
        {activeTab === 'leave' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">Leave Requests</h2>
              <button className="rounded-lg bg-accent px-4 py-2 text-sm text-white hover:bg-accent/80 transition-colors">
                + New Request
              </button>
            </div>
            <div className="space-y-3">
              {leaveRequests.filter((r) => r.status === 'pending').length > 0 ? (
                leaveRequests
                  .filter((r) => r.status === 'pending')
                  .map((request) => {
                    const staffName = guards.find((s) => s.$id === request.staff_id)?.firstName || 'Unknown';
                    const startDate = new Date(request.startDate).toLocaleDateString('en-GB');
                    const endDate = new Date(request.endDate).toLocaleDateString('en-GB');
                    return (
                      <div key={request.$id} className="rounded-lg border border-white/10 bg-white/5 p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <p className="font-semibold text-white">{staffName}</p>
                              <span className="rounded-full bg-yellow-500/20 px-3 py-1 text-xs text-yellow-500">
                                {request.status}
                              </span>
                            </div>
                            <p className="text-sm text-white/60 mt-2">{request.leaveType || 'Annual Leave'}</p>
                            <p className="text-sm text-white/50 mt-1">
                              {startDate} to {endDate}
                            </p>
                            <p className="text-sm text-white/70 mt-2">{request.reason}</p>
                          </div>
                          <div className="flex gap-2">
                            <button className="rounded-lg bg-green-500/20 px-4 py-2 text-sm text-green-500 hover:bg-green-500/30 transition-colors">
                              Approve
                            </button>
                            <button className="rounded-lg bg-red-500/20 px-4 py-2 text-sm text-red-500 hover:bg-red-500/30 transition-colors">
                              Reject
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
              ) : (
                <p className="text-white/50 text-sm">No pending leave requests</p>
              )}
            </div>
          </div>
        )}

        {/* Training Tab */}
        {activeTab === 'training' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">Training Schedule</h2>
              <button className="rounded-lg bg-accent px-4 py-2 text-sm text-white hover:bg-accent/80 transition-colors">
                + Schedule Training
              </button>
            </div>
            <div className="space-y-3">
              {trainingSchedule.length > 0 ? (
                trainingSchedule.map((training) => {
                  const startDate = new Date(training.startDate).toLocaleDateString('en-GB');
                  const endDate = new Date(training.endDate).toLocaleDateString('en-GB');
                  return (
                    <div key={training.$id} className="rounded-lg border border-white/10 bg-white/5 p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-white">{training.course}</h3>
                          <div className="grid grid-cols-2 gap-4 mt-3">
                            <div className="flex items-center gap-2 text-sm text-white/70">
                              <AiOutlineCalendar />
                              <span>{startDate} - {endDate}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-white/70">
                              <AiOutlineClockCircle />
                              <span>{training.provider || 'TBD'}</span>
                            </div>
                          </div>
                          <p className="text-sm text-white/60 mt-2">Status: {training.status}</p>
                        </div>
                        <button className="rounded-lg bg-accent/20 border border-accent/50 px-4 py-2 text-sm text-accent hover:bg-accent/30 transition-colors">
                          View Details
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-white/50 text-sm">No training scheduled</p>
              )}
            </div>
          </div>
        )}

        {/* Documents Tab */}
        {activeTab === 'documents' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">Documents</h2>
              <button className="rounded-lg bg-accent px-4 py-2 text-sm text-white hover:bg-accent/80 transition-colors flex items-center gap-2">
                <AiOutlineUpload />
                Upload Document
              </button>
            </div>
            <div className="space-y-3">
              {documents.map((doc, index) => (
                <div key={index} className="rounded-lg border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-accent/20 p-2">
                        <AiOutlineFileText className="text-accent" />
                      </div>
                      <div>
                        <p className="font-medium text-white">{doc.name}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-white/50">{doc.type}</span>
                          <span className="text-xs text-white/30">•</span>
                          <span className="text-xs text-white/50">{doc.date}</span>
                          <span className="text-xs text-white/30">•</span>
                          <span className="text-xs text-white/50">{doc.size}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button className="rounded-lg bg-white/5 p-2 hover:bg-white/10 transition-colors">
                        <AiOutlineDownload className="text-white" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {documents.length === 0 && (
                <div className="rounded-lg border border-dashed border-white/20 bg-white/5 p-6 text-center text-white/60 text-sm">
                  No documents uploaded yet.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Staff Detail Modal */}
      <StaffFormModal
        isOpen={showStaffModal}
        onClose={() => setShowStaffModal(false)}
        onSuccess={() => setRefreshStaff((prev) => prev + 1)}
      />

      {selectedGuard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="max-w-2xl w-full rounded-xl border border-white/10 bg-night-sky p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white">
                  {selectedGuard.firstName} {selectedGuard.lastName}
                </h2>
                <p className="text-white/60 mt-1">{selectedGuard.role}</p>
              </div>
              <button
                onClick={() => setSelectedGuard(null)}
                className="rounded-lg bg-white/5 p-2 hover:bg-white/10 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-lg bg-white/5 border border-white/10 p-4">
                  <p className="text-sm text-white/50">Email</p>
                  <p className="mt-1 text-white break-all">{selectedGuard.email || '-'}</p>
                </div>
                <div className="rounded-lg bg-white/5 border border-white/10 p-4">
                  <p className="text-sm text-white/50">Phone</p>
                  <p className="mt-1 text-white">{selectedGuard.phone || '-'}</p>
                </div>
                <div className="rounded-lg bg-white/5 border border-white/10 p-4 md:col-span-2">
                  <p className="text-sm text-white/50">Address</p>
                  <p className="mt-1 text-white">{selectedGuard.address || '-'}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-lg bg-white/5 border border-white/10 p-4">
                  <p className="text-sm text-white/50">Role</p>
                  <p className="mt-1 text-white">{selectedGuard.role || '-'}</p>
                </div>
                <div className="rounded-lg bg-white/5 border border-white/10 p-4">
                  <p className="text-sm text-white/50">Department</p>
                  <p className="mt-1 text-white">{selectedGuard.department || 'Security'}</p>
                </div>
                <div className="rounded-lg bg-white/5 border border-white/10 p-4">
                  <p className="text-sm text-white/50">Start Date</p>
                  <p className="mt-1 text-white">
                    {selectedGuard.startDate ? new Date(selectedGuard.startDate).toLocaleDateString('en-GB') : '-'}
                  </p>
                </div>
                <div className="rounded-lg bg-white/5 border border-white/10 p-4">
                  <p className="text-sm text-white/50">Status</p>
                  <span
                    className={`mt-1 inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                      selectedGuard.status === 'active'
                        ? 'bg-green-500/20 text-green-400'
                        : selectedGuard.status === 'inactive'
                        ? 'bg-gray-500/20 text-gray-300'
                        : selectedGuard.status === 'suspended'
                        ? 'bg-red-500/20 text-red-400'
                        : 'bg-yellow-500/20 text-yellow-400'
                    }`}
                  >
                    {(selectedGuard.status || 'unknown').toString().charAt(0).toUpperCase() + (selectedGuard.status || 'unknown').toString().slice(1)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-lg bg-white/5 border border-white/10 p-4">
                  <p className="text-sm text-white/50">License Number</p>
                  <p className="mt-1 text-white">{selectedGuard.licenseNumber || '-'}</p>
                </div>
                <div className="rounded-lg bg-white/5 border border-white/10 p-4">
                  <p className="text-sm text-white/50">License Expiry</p>
                  <p className="mt-1 text-white">
                    {selectedGuard.licenseExpiry ? new Date(selectedGuard.licenseExpiry).toLocaleDateString('en-GB') : '-'}
                  </p>
                </div>
                <div className="rounded-lg bg-white/5 border border-white/10 p-4">
                  <p className="text-sm text-white/50">DBS Status</p>
                  <p className="mt-1 text-white capitalize">{selectedGuard.dBSStatus || 'pending'}</p>
                </div>
                <div className="rounded-lg bg-white/5 border border-white/10 p-4">
                  <p className="text-sm text-white/50">Right to Work</p>
                  <p className="mt-1 text-white capitalize">{selectedGuard.rightToWork || 'pending'}</p>
                </div>
              </div>

              <div className="rounded-lg bg-white/5 border border-white/10 p-4">
                <h3 className="font-semibold text-white mb-3">Emergency Contact</h3>
                <p className="text-white">{selectedGuard.emergencyContact || '-'}</p>
                <p className="text-white/60 text-sm mt-1">{selectedGuard.emergencyPhone || '-'}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HR;
