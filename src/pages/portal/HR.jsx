import React, { useState } from 'react';
import { demoGuards } from '../../data/demoGuards';
import {
  AiOutlineTeam,
  AiOutlineFileText,
  AiOutlineCalendar,
  AiOutlineClockCircle,
  AiOutlineCheckCircle,
  AiOutlineWarning,
  AiOutlineUser,
  AiOutlineMail,
  AiOutlinePhone,
  AiOutlineSafety,
  AiOutlineEdit,
  AiOutlineEye,
  AiOutlineDownload,
  AiOutlineUpload,
} from 'react-icons/ai';

const HR = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [guards] = useState(demoGuards);
  const [selectedGuard, setSelectedGuard] = useState(null);

  const hrStats = [
    { label: 'Total Staff', value: guards.length, icon: AiOutlineTeam, color: 'blue' },
    { label: 'Active', value: guards.filter(g => g.status === 'active').length, icon: AiOutlineCheckCircle, color: 'green' },
    { label: 'On Leave', value: 2, icon: AiOutlineCalendar, color: 'yellow' },
    { label: 'Expiring Licenses', value: 1, icon: AiOutlineWarning, color: 'red' },
  ];

  const leaveRequests = [
    {
      id: 1,
      guard: 'Michael Brown',
      type: 'Annual Leave',
      startDate: '2025-12-20',
      endDate: '2025-12-27',
      days: 7,
      status: 'pending',
      reason: 'Family vacation',
    },
    {
      id: 2,
      guard: 'James Wilson',
      type: 'Sick Leave',
      startDate: '2025-12-16',
      endDate: '2025-12-17',
      days: 2,
      status: 'approved',
      reason: 'Medical appointment',
    },
    {
      id: 3,
      guard: 'Sophie Martinez',
      type: 'Annual Leave',
      startDate: '2025-12-28',
      endDate: '2025-12-31',
      days: 4,
      status: 'pending',
      reason: 'New Year celebration',
    },
  ];

  const trainingSchedule = [
    {
      id: 1,
      course: 'First Aid Certification',
      date: '2025-12-18',
      duration: '8 hours',
      location: 'Training Center',
      enrolled: 5,
      capacity: 12,
      instructor: 'Jane Smith',
    },
    {
      id: 2,
      course: 'Conflict Resolution',
      date: '2025-12-22',
      duration: '4 hours',
      location: 'Online',
      enrolled: 8,
      capacity: 15,
      instructor: 'Robert Johnson',
    },
    {
      id: 3,
      course: 'Fire Safety Training',
      date: '2026-01-05',
      duration: '6 hours',
      location: 'Site A',
      enrolled: 3,
      capacity: 10,
      instructor: 'Linda Brown',
    },
  ];

  const documents = [
    { name: 'Employment Contract - Michael Brown', type: 'Contract', date: '2024-03-10', size: '245 KB' },
    { name: 'DBS Certificate - James Wilson', type: 'Compliance', date: '2024-05-12', size: '180 KB' },
    { name: 'SIA License - David Anderson', type: 'Compliance', date: '2024-07-20', size: '156 KB' },
    { name: 'Training Certificate - Sophie Martinez', type: 'Training', date: '2024-09-15', size: '198 KB' },
  ];

  const tabs = [
    { id: 'overview', label: 'Overview', icon: AiOutlineTeam },
    { id: 'staff', label: 'Staff Records', icon: AiOutlineUser },
    { id: 'leave', label: 'Leave Management', icon: AiOutlineCalendar },
    { id: 'training', label: 'Training', icon: AiOutlineFileText },
    { id: 'documents', label: 'Documents', icon: AiOutlineDownload },
  ];

  const getStatusColor = (status) => {
    const colors = {
      pending: 'yellow',
      approved: 'green',
      rejected: 'red',
      active: 'green',
      inactive: 'gray',
    };
    return colors[status] || 'gray';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">HR & Compliance</h1>
          <p className="mt-2 text-white/70">Manage staff, leave, training, and compliance</p>
        </div>
        <button className="rounded-lg bg-accent px-6 py-2 text-white hover:bg-accent/80 transition-colors">
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
              activeTab === tab.id
                ? 'bg-accent text-white'
                : 'bg-white/5 text-white/70 hover:bg-white/10'
            }`}
          >
            <tab.icon className="text-lg" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-6">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Pending Leave Requests */}
            <div>
              <h2 className="text-xl font-semibold text-white mb-4">Pending Leave Requests</h2>
              <div className="space-y-3">
                {leaveRequests.filter(r => r.status === 'pending').map((request) => (
                  <div key={request.id} className="rounded-lg border border-white/10 bg-white/5 p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-white">{request.guard}</p>
                        <p className="text-sm text-white/60 mt-1">{request.type}</p>
                        <p className="text-sm text-white/50 mt-2">
                          {request.startDate} - {request.endDate} ({request.days} days)
                        </p>
                        <p className="text-sm text-white/70 mt-1">Reason: {request.reason}</p>
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
                ))}
              </div>
            </div>

            {/* Upcoming Training */}
            <div>
              <h2 className="text-xl font-semibold text-white mb-4">Upcoming Training</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {trainingSchedule.slice(0, 2).map((training) => (
                  <div key={training.id} className="rounded-lg border border-white/10 bg-white/5 p-4">
                    <h3 className="font-semibold text-white">{training.course}</h3>
                    <div className="mt-3 space-y-2">
                      <div className="flex items-center gap-2 text-sm text-white/70">
                        <AiOutlineCalendar />
                        <span>{training.date}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-white/70">
                        <AiOutlineClockCircle />
                        <span>{training.duration}</span>
                      </div>
                      <div className="flex items-center justify-between mt-3">
                        <span className="text-sm text-white/60">
                          {training.enrolled}/{training.capacity} enrolled
                        </span>
                        <button className="text-sm text-accent hover:text-accent/80">View Details</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Staff Records Tab */}
        {activeTab === 'staff' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">Staff Records</h2>
              <input
                type="text"
                placeholder="Search staff..."
                className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-white/50 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
            <div className="space-y-3">
              {guards.map((guard) => (
                <div
                  key={guard.$id}
                  className="rounded-lg border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/20">
                        <AiOutlineUser className="text-xl text-accent" />
                      </div>
                      <div>
                        <p className="font-semibold text-white">
                          {guard.firstName} {guard.lastName}
                        </p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-sm text-white/60 flex items-center gap-1">
                            <AiOutlineMail className="text-xs" />
                            {guard.email}
                          </span>
                          <span className="text-sm text-white/60 flex items-center gap-1">
                            <AiOutlinePhone className="text-xs" />
                            {guard.phone}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <span className={`rounded-full bg-${getStatusColor(guard.status)}-500/20 px-2 py-0.5 text-xs text-${getStatusColor(guard.status)}-500`}>
                            {guard.status}
                          </span>
                          <span className="text-xs text-white/50">
                            SIA: {guard.siaLicenceNumber}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setSelectedGuard(guard)}
                        className="rounded-lg bg-white/5 p-2 hover:bg-white/10 transition-colors"
                      >
                        <AiOutlineEye className="text-white" />
                      </button>
                      <button className="rounded-lg bg-white/5 p-2 hover:bg-white/10 transition-colors">
                        <AiOutlineEdit className="text-white" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
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
              {leaveRequests.map((request) => (
                <div key={request.id} className="rounded-lg border border-white/10 bg-white/5 p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <p className="font-semibold text-white">{request.guard}</p>
                        <span className={`rounded-full bg-${getStatusColor(request.status)}-500/20 px-3 py-1 text-xs text-${getStatusColor(request.status)}-500`}>
                          {request.status}
                        </span>
                      </div>
                      <p className="text-sm text-white/60 mt-2">{request.type}</p>
                      <p className="text-sm text-white/50 mt-1">
                        {request.startDate} to {request.endDate} ({request.days} days)
                      </p>
                      <p className="text-sm text-white/70 mt-2">{request.reason}</p>
                    </div>
                    {request.status === 'pending' && (
                      <div className="flex gap-2">
                        <button className="rounded-lg bg-green-500/20 px-4 py-2 text-sm text-green-500 hover:bg-green-500/30 transition-colors">
                          Approve
                        </button>
                        <button className="rounded-lg bg-red-500/20 px-4 py-2 text-sm text-red-500 hover:bg-red-500/30 transition-colors">
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
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
              {trainingSchedule.map((training) => (
                <div key={training.id} className="rounded-lg border border-white/10 bg-white/5 p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-white">{training.course}</h3>
                      <div className="grid grid-cols-2 gap-4 mt-3">
                        <div className="flex items-center gap-2 text-sm text-white/70">
                          <AiOutlineCalendar />
                          <span>{training.date}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-white/70">
                          <AiOutlineClockCircle />
                          <span>{training.duration}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-white/70">
                          <AiOutlineUser />
                          <span>{training.instructor}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-white/70">
                          <AiOutlineTeam />
                          <span>{training.enrolled}/{training.capacity} enrolled</span>
                        </div>
                      </div>
                      <p className="text-sm text-white/60 mt-2">Location: {training.location}</p>
                    </div>
                    <button className="rounded-lg bg-accent/20 border border-accent/50 px-4 py-2 text-sm text-accent hover:bg-accent/30 transition-colors">
                      Manage
                    </button>
                  </div>
                </div>
              ))}
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
                        <AiOutlineEye className="text-white" />
                      </button>
                      <button className="rounded-lg bg-white/5 p-2 hover:bg-white/10 transition-colors">
                        <AiOutlineDownload className="text-white" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Staff Detail Modal */}
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
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg bg-white/5 border border-white/10 p-4">
                  <p className="text-sm text-white/50">Email</p>
                  <p className="mt-1 text-white">{selectedGuard.email}</p>
                </div>
                <div className="rounded-lg bg-white/5 border border-white/10 p-4">
                  <p className="text-sm text-white/50">Phone</p>
                  <p className="mt-1 text-white">{selectedGuard.phone}</p>
                </div>
                <div className="rounded-lg bg-white/5 border border-white/10 p-4">
                  <p className="text-sm text-white/50">SIA License</p>
                  <p className="mt-1 text-white">{selectedGuard.siaLicenceNumber}</p>
                </div>
                <div className="rounded-lg bg-white/5 border border-white/10 p-4">
                  <p className="text-sm text-white/50">License Expiry</p>
                  <p className="mt-1 text-white">{selectedGuard.siaExpiryDate}</p>
                </div>
                <div className="rounded-lg bg-white/5 border border-white/10 p-4">
                  <p className="text-sm text-white/50">DBS Status</p>
                  <p className="mt-1 text-green-500">{selectedGuard.dbsStatus}</p>
                </div>
                <div className="rounded-lg bg-white/5 border border-white/10 p-4">
                  <p className="text-sm text-white/50">Right to Work</p>
                  <p className="mt-1 text-green-500">{selectedGuard.rightToWork}</p>
                </div>
              </div>

              <div className="rounded-lg bg-white/5 border border-white/10 p-4">
                <h3 className="font-semibold text-white mb-3">Emergency Contact</h3>
                <p className="text-white">{selectedGuard.emergencyContact}</p>
                <p className="text-white/60 text-sm mt-1">{selectedGuard.emergencyPhone}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HR;
