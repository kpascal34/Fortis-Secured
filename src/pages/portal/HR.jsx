import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { databases, config, storage } from '../../lib/appwrite';
import { Query } from 'appwrite';
import StaffFormModal from '../../components/StaffFormModal';
import StaffRecordsTable from '../../components/StaffRecordsTable';
import LeaveRequestModal from '../../components/LeaveRequestModal';
import TrainingScheduleModal from '../../components/TrainingScheduleModal';
import DocumentUploadModal from '../../components/DocumentUploadModal';
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
  AiOutlineCheck,
  AiOutlineClose as AiOutlineCloseIcon,
  AiOutlineEye,
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
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showTrainingModal, setShowTrainingModal] = useState(false);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [editingTraining, setEditingTraining] = useState(null);
  const [documents, setDocuments] = useState([]);

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

      // Fetch documents
      try {
        const documentsResponse = await databases.listDocuments(
          config.databaseId,
          config.complianceUploadsCollectionId || 'documents',
          [Query.limit(100), Query.orderDesc('uploadedAt')]
        );
        setDocuments(documentsResponse.documents || []);
      } catch (err) {
        console.log('Documents collection not found:', err);
        setDocuments([]);
      }
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

  const handleLeaveAction = async (leaveId, action) => {
    try {
      const status = action === 'approve' ? 'approved' : 'rejected';
      await databases.updateDocument(
        config.databaseId,
        config.staffLeaveCollectionId || 'staff_leave',
        leaveId,
        { 
          status,
          approvedAt: action === 'approve' ? new Date().toISOString() : null,
        }
      );
      fetchAllData(); // Refresh data
    } catch (err) {
      console.error('Error updating leave request:', err);
      alert('Failed to update leave request');
    }
  };

  const handleDownloadDocument = async (doc) => {
    try {
      const bucketId = config.documentsBucketId || 'documents';
      const result = storage.getFileDownload(bucketId, doc.fileId);
      window.open(result.href, '_blank');
    } catch (err) {
      console.error('Error downloading document:', err);
      alert('Failed to download document');
    }
  };

  const handleDeleteDocument = async (docId, fileId) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;
    try {
      const bucketId = config.documentsBucketId || 'documents';
      await storage.deleteFile(bucketId, fileId);
      await databases.deleteDocument(
        config.databaseId,
        config.complianceUploadsCollectionId || 'documents',
        docId
      );
      fetchAllData(); // Refresh data
    } catch (err) {
      console.error('Error deleting document:', err);
      alert('Failed to delete document');
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: AiOutlineTeam },
    { id: 'staff', label: 'Staff Records', icon: AiOutlineUser },
    { id: 'leave', label: 'Leave Management', icon: AiOutlineCalendar },
    { id: 'training', label: 'Training', icon: AiOutlineFileText },
    { id: 'documents', label: 'Documents', icon: AiOutlineDownload },
  ];

  return (
    <div className="fs-page space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="fs-title">HR & Compliance</h1>
          <p className="fs-subtitle">Manage staff, leave, training, and compliance</p>
        </div>
        <button
          onClick={() => navigate('/portal/invite-management')}
          className="fs-btn-primary px-6 py-2 hover:opacity-90"
        >
          + Add Staff Member
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {hrStats.map((stat, index) => (
          <div key={index} className="fs-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-2">{stat.label}</p>
                <p className="mt-2 text-3xl font-bold text-text">{stat.value}</p>
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
            className={`fs-nav-item ${activeTab === tab.id ? 'fs-nav-item-active' : ''}`}
          >
            <tab.icon className="text-lg" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="fs-card">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Pending Leave Requests */}
            <div>
              <h2 className="text-xl font-semibold text-text mb-4">Pending Leave Requests</h2>
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
                        <div key={request.$id} className="rounded-lg border border-border bg-bg-2 p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-semibold text-text">{staff?.firstName} {staff?.lastName}</p>
                              <p className="text-sm text-text-2 mt-1">{request.type}</p>
                              <p className="text-sm text-text-3 mt-2">
                                {startDate} - {endDate} ({days} days)
                              </p>
                              <p className="text-sm text-text-2 mt-1">Reason: {request.reason || 'No reason provided'}</p>
                            </div>
                            <div className="flex gap-2">
                              <button className="fs-badge fs-badge-success">Approve</button>
                              <button className="fs-badge fs-badge-error">Reject</button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                ) : (
                  <p className="text-text-3 text-sm">No pending leave requests</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="fs-card">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Pending Leave Requests */}
            <div>
              <h2 className="text-xl font-semibold text-text mb-4">Pending Leave Requests</h2>
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
                        <div key={request.$id} className="rounded-lg border border-border bg-bg-2 p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-semibold text-text">{staff?.firstName} {staff?.lastName}</p>
                              <p className="text-sm text-text-2 mt-1">{request.type}</p>
                              <p className="text-sm text-text-3 mt-2">
                                {startDate} - {endDate} ({days} days)
                              </p>
                              <p className="text-sm text-text-2 mt-1">Reason: {request.reason || 'No reason provided'}</p>
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
                  <p className="text-text-3 text-sm">No pending leave requests</p>
                )}
              </div>
            </div>

            {/* Upcoming Training */}
            <div>
              <h2 className="text-xl font-semibold text-text mb-4">Upcoming Training</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {trainingSchedule.length > 0 ? (
                  trainingSchedule.slice(0, 2).map((training) => {
                    const startDate = new Date(training.startDate).toLocaleDateString('en-GB');
                    const endDate = new Date(training.endDate).toLocaleDateString('en-GB');
                    return (
                      <div key={training.$id} className="rounded-lg border border-border bg-bg-2 p-4">
                        <h3 className="font-semibold text-text">{training.course}</h3>
                        <div className="mt-3 space-y-2">
                          <div className="flex items-center gap-2 text-sm text-text-2">
                            <AiOutlineCalendar />
                            <span>{startDate} - {endDate}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-text-2">
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
              <h2 className="text-xl font-semibold text-text mb-4">License Compliance</h2>
              <div className="rounded-lg border border-border bg-bg-2 p-4">
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-sm text-text-2">Licenses expiring within 30 days</span>
                  <span className="fs-badge fs-badge-error">
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
                        <div key={license.$id} className="rounded-lg border border-border bg-bg-2 p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-semibold text-text">{staffName}</p>
                              <p className="text-sm text-text-2 mt-1">License: {license.licenseType || 'SIA'}</p>
                              <p className="text-sm text-text-3 mt-1">Expiry: {expiryDate}</p>
                            </div>
                            <div className="text-right">
                              <p className={`text-sm font-semibold ${daysLeft <= 7 ? 'text-error' : 'text-warning'}`}>
                                {daysLeft} days left
                              </p>
                              <button className="mt-2 fs-btn-ghost text-xs">
                                Send Reminder
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-text-3 text-sm">No expiring licenses in the next 30 days</p>
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
              <h2 className="text-xl font-semibold text-text">Staff Records</h2>
              <button
                onClick={() => setShowStaffModal(true)}
                className="fs-btn-primary px-4 py-2 text-sm"
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
              <button 
                onClick={() => setShowLeaveModal(true)}
                className="rounded-lg bg-accent px-4 py-2 text-sm text-white hover:bg-accent/80 transition-colors"
              >
                + New Request
              </button>
            </div>
            <div className="space-y-3">
              {leaveRequests.filter((r) => r.status === 'pending').length > 0 ? (
                leaveRequests
                  .filter((r) => r.status === 'pending')
                  .map((request) => {
                    const staff = guards.find((s) => s.$id === request.staffId || s.$id === request.staff_id);
                    const staffName = staff ? `${staff.firstName} ${staff.lastName}` : request.staffName || 'Unknown';
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
                            <p className="text-sm text-white/60 mt-2">
                              {request.leaveType ? request.leaveType.replace('_', ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : 'Annual Leave'}
                            </p>
                            <p className="text-sm text-white/50 mt-1">
                              {startDate} to {endDate}
                            </p>
                            <p className="text-sm text-white/70 mt-2">{request.reason}</p>
                          </div>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => handleLeaveAction(request.$id, 'approve')}
                              className="rounded-lg bg-green-500/20 px-4 py-2 text-sm text-green-500 hover:bg-green-500/30 transition-colors flex items-center gap-2"
                            >
                              <AiOutlineCheck /> Approve
                            </button>
                            <button 
                              onClick={() => handleLeaveAction(request.$id, 'reject')}
                              className="rounded-lg bg-red-500/20 px-4 py-2 text-sm text-red-500 hover:bg-red-500/30 transition-colors flex items-center gap-2"
                            >
                              <AiOutlineCloseIcon /> Reject
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
              ) : (
                <p className="text-white/50 text-sm">No pending leave requests</p>
              )}
              
              {/* Approved/Rejected Leave Requests */}
              {leaveRequests.filter((r) => r.status !== 'pending').length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-medium text-white mb-3">Recent Decisions</h3>
                  <div className="space-y-2">
                    {leaveRequests
                      .filter((r) => r.status !== 'pending')
                      .slice(0, 5)
                      .map((request) => {
                        const staff = guards.find((s) => s.$id === request.staffId || s.$id === request.staff_id);
                        const staffName = staff ? `${staff.firstName} ${staff.lastName}` : request.staffName || 'Unknown';
                        const startDate = new Date(request.startDate).toLocaleDateString('en-GB');
                        const endDate = new Date(request.endDate).toLocaleDateString('en-GB');
                        return (
                          <div key={request.$id} className="rounded-lg border border-white/5 bg-white/5 p-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm text-white font-medium">{staffName}</p>
                                <p className="text-xs text-white/50">{startDate} to {endDate}</p>
                              </div>
                              <span className={`rounded-full px-3 py-1 text-xs ${
                                request.status === 'approved' 
                                  ? 'bg-green-500/20 text-green-400' 
                                  : 'bg-red-500/20 text-red-400'
                              }`}>
                                {request.status}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Training Tab */}
        {activeTab === 'training' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">Training Schedule</h2>
              <button 
                onClick={() => {
                  setEditingTraining(null);
                  setShowTrainingModal(true);
                }}
                className="rounded-lg bg-accent px-4 py-2 text-sm text-white hover:bg-accent/80 transition-colors"
              >
                + Schedule Training
              </button>
            </div>
            <div className="space-y-3">
              {trainingSchedule.length > 0 ? (
                trainingSchedule.map((training) => {
                  const startDate = new Date(training.startDate).toLocaleDateString('en-GB');
                  const endDate = new Date(training.endDate).toLocaleDateString('en-GB');
                  let participants = [];
                  try {
                    participants = typeof training.participants === 'string' 
                      ? JSON.parse(training.participants) 
                      : training.participants || [];
                  } catch (e) {
                    participants = [];
                  }
                  const completedCount = participants.filter(p => p.completed).length;
                  
                  return (
                    <div key={training.$id} className="rounded-lg border border-white/10 bg-white/5 p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <h3 className="font-semibold text-white">{training.trainingName}</h3>
                            <span className={`rounded-full px-3 py-1 text-xs ${
                              training.status === 'completed' 
                                ? 'bg-green-500/20 text-green-400'
                                : training.status === 'in_progress'
                                ? 'bg-blue-500/20 text-blue-400'
                                : training.status === 'cancelled'
                                ? 'bg-red-500/20 text-red-400'
                                : 'bg-yellow-500/20 text-yellow-400'
                            }`}>
                              {training.status.replace('_', ' ')}
                            </span>
                          </div>
                          {training.description && (
                            <p className="text-sm text-white/60 mt-2">{training.description}</p>
                          )}
                          <div className="grid grid-cols-2 gap-4 mt-3">
                            <div className="flex items-center gap-2 text-sm text-white/70">
                              <AiOutlineCalendar />
                              <span>{startDate} - {endDate}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-white/70">
                              <AiOutlineUser />
                              <span>{participants.length} participant{participants.length !== 1 ? 's' : ''}</span>
                            </div>
                          </div>
                          {training.location && (
                            <p className="text-sm text-white/50 mt-2">📍 {training.location}</p>
                          )}
                          {training.trainer && (
                            <p className="text-sm text-white/50 mt-1">👨‍🏫 {training.trainer}</p>
                          )}
                          {participants.length > 0 && (
                            <div className="mt-3 flex items-center gap-2">
                              <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
                                <div
                                  className="h-full bg-accent transition-all"
                                  style={{ width: `${(completedCount / participants.length) * 100}%` }}
                                />
                              </div>
                              <span className="text-xs text-white/50">
                                {completedCount}/{participants.length} completed
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => {
                              setEditingTraining(training);
                              setShowTrainingModal(true);
                            }}
                            className="rounded-lg bg-accent/20 border border-accent/50 px-4 py-2 text-sm text-accent hover:bg-accent/30 transition-colors flex items-center gap-2"
                          >
                            <AiOutlineEye /> View/Edit
                          </button>
                        </div>
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
              <button 
                onClick={() => setShowDocumentModal(true)}
                className="rounded-lg bg-accent px-4 py-2 text-sm text-white hover:bg-accent/80 transition-colors flex items-center gap-2"
              >
                <AiOutlineUpload />
                Upload Document
              </button>
            </div>
            <div className="space-y-3">
              {documents.length > 0 ? (
                documents.map((doc) => {
                  const uploadDate = new Date(doc.uploadedAt).toLocaleDateString('en-GB');
                  const fileSize = doc.fileSize ? `${(doc.fileSize / 1024 / 1024).toFixed(2)} MB` : 'N/A';
                  const relatedStaff = doc.relatedStaffId 
                    ? guards.find(s => s.$id === doc.relatedStaffId) 
                    : null;
                  
                  return (
                    <div 
                      key={doc.$id} 
                      className="rounded-lg border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <div className="rounded-lg bg-accent/20 p-2">
                            <AiOutlineFileText className="text-accent text-xl" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-white">{doc.documentName}</p>
                            <div className="flex items-center gap-3 mt-1 flex-wrap">
                              <span className="text-xs text-white/50">
                                {doc.documentType ? doc.documentType.replace('_', ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : 'Document'}
                              </span>
                              <span className="text-xs text-white/30">•</span>
                              <span className="text-xs text-white/50">{uploadDate}</span>
                              <span className="text-xs text-white/30">•</span>
                              <span className="text-xs text-white/50">{fileSize}</span>
                              {relatedStaff && (
                                <>
                                  <span className="text-xs text-white/30">•</span>
                                  <span className="text-xs text-white/50">
                                    {relatedStaff.firstName} {relatedStaff.lastName}
                                  </span>
                                </>
                              )}
                            </div>
                            {doc.description && (
                              <p className="text-xs text-white/60 mt-1">{doc.description}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleDownloadDocument(doc)}
                            className="rounded-lg bg-white/5 p-2 hover:bg-white/10 transition-colors"
                            title="Download"
                          >
                            <AiOutlineDownload className="text-white" />
                          </button>
                          <button 
                            onClick={() => handleDeleteDocument(doc.$id, doc.fileId)}
                            className="rounded-lg bg-red-500/20 p-2 hover:bg-red-500/30 transition-colors"
                            title="Delete"
                          >
                            <AiOutlineCloseIcon className="text-red-400" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-lg border border-dashed border-white/20 bg-white/5 p-8 text-center">
                  <AiOutlineUpload className="text-4xl text-white/30 mx-auto mb-3" />
                  <p className="text-white/60 text-sm">No documents uploaded yet.</p>
                  <button 
                    onClick={() => setShowDocumentModal(true)}
                    className="mt-4 rounded-lg bg-accent px-4 py-2 text-sm text-white hover:bg-accent/80 transition-colors"
                  >
                    Upload First Document
                  </button>
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

      {/* Leave Request Modal */}
      <LeaveRequestModal
        isOpen={showLeaveModal}
        onClose={() => setShowLeaveModal(false)}
        onSuccess={() => {
          fetchAllData();
          setShowLeaveModal(false);
        }}
      />

      {/* Training Schedule Modal */}
      <TrainingScheduleModal
        isOpen={showTrainingModal}
        onClose={() => {
          setShowTrainingModal(false);
          setEditingTraining(null);
        }}
        onSuccess={() => {
          fetchAllData();
          setShowTrainingModal(false);
          setEditingTraining(null);
        }}
        editingTraining={editingTraining}
      />

      {/* Document Upload Modal */}
      <DocumentUploadModal
        isOpen={showDocumentModal}
        onClose={() => setShowDocumentModal(false)}
        onSuccess={() => {
          fetchAllData();
          setShowDocumentModal(false);
        }}
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
