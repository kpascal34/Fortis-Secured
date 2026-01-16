import React, { useState, useEffect } from 'react';
import { databases, config } from '../lib/appwrite';
import { Query } from 'appwrite';
import { AiOutlineDelete, AiOutlineEdit, AiOutlineEye, AiOutlineLoading3Quarters } from 'react-icons/ai';

const StaffRecordsTable = ({ refreshTrigger, onEdit, onDelete }) => {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    fetchStaff();
  }, [refreshTrigger]);

  const fetchStaff = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await databases.listDocuments(
        config.databaseId,
        config.staffProfilesCollectionId,
        [Query.orderDesc('$createdAt')]
      );
      setStaff(response.documents);
    } catch (err) {
      console.error('Error fetching staff:', err);
      setError('Failed to load staff records');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (staffId) => {
    if (!window.confirm('Are you sure you want to delete this staff member?')) return;

    try {
      await databases.deleteDocument(
        config.databaseId,
        config.staffProfilesCollectionId,
        staffId
      );
      setStaff((prev) => prev.filter((s) => s.$id !== staffId));
      onDelete?.(staffId);
    } catch (err) {
      console.error('Error deleting staff:', err);
      alert('Failed to delete staff member');
    }
  };

  const isLicenseExpiring = (expiryDate) => {
    if (!expiryDate) return false;
    const today = new Date();
    const expiry = new Date(expiryDate);
    const daysUntilExpiry = Math.floor((expiry - today) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 30 && daysUntilExpiry >= 0;
  };

  const isLicenseExpired = (expiryDate) => {
    if (!expiryDate) return false;
    const today = new Date();
    const expiry = new Date(expiryDate);
    return expiry < today;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      return new Date(dateString).toLocaleDateString('en-GB', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return '-';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <AiOutlineLoading3Quarters className="mx-auto mb-3 h-8 w-8 animate-spin text-accent" />
          <p className="text-white/70">Loading staff records...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/50 bg-red-500/10 px-6 py-8 text-center">
        <p className="text-red-400">{error}</p>
        <button
          onClick={fetchStaff}
          className="mt-4 rounded-lg bg-red-500/20 px-4 py-2 text-red-300 transition-colors hover:bg-red-500/30"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!staff || staff.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-12 text-center">
        <p className="text-white/70">No staff members found</p>
        <p className="mt-2 text-sm text-white/50">Add a new staff member to get started</p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/5">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10 text-left text-sm font-semibold text-white">
              <th className="px-6 py-4">Name</th>
              <th className="px-6 py-4">Email</th>
              <th className="px-6 py-4">Role</th>
              <th className="px-6 py-4">Department</th>
              <th className="px-6 py-4">License Expiry</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {staff.map((member, idx) => (
              <tr
                key={member.$id}
                className={`border-b border-white/5 transition-colors hover:bg-white/5 ${
                  idx % 2 === 0 ? 'bg-transparent' : 'bg-white/2.5'
                }`}
              >
                <td className="px-6 py-4 text-sm">
                  <div className="font-medium text-white">
                    {member.firstName} {member.lastName}
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-white/70">{member.email}</td>
                <td className="px-6 py-4 text-sm">
                  <span className="inline-flex rounded-full bg-accent/20 px-3 py-1 text-xs font-medium text-accent">
                    {member.role}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-white/70">{member.department}</td>
                <td className="px-6 py-4 text-sm">
                  {isLicenseExpired(member.licenseExpiry) ? (
                    <span className="inline-flex rounded-full bg-red-500/20 px-3 py-1 text-xs font-medium text-red-400">
                      Expired
                    </span>
                  ) : isLicenseExpiring(member.licenseExpiry) ? (
                    <span className="inline-flex rounded-full bg-yellow-500/20 px-3 py-1 text-xs font-medium text-yellow-400">
                      Expiring: {formatDate(member.licenseExpiry)}
                    </span>
                  ) : member.licenseExpiry ? (
                    <span className="text-white/70">{formatDate(member.licenseExpiry)}</span>
                  ) : (
                    <span className="text-white/50">-</span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm">
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                      member.status === 'active'
                        ? 'bg-green-500/20 text-green-400'
                        : member.status === 'inactive'
                        ? 'bg-gray-500/20 text-gray-400'
                        : member.status === 'suspended'
                        ? 'bg-red-500/20 text-red-400'
                        : 'bg-yellow-500/20 text-yellow-400'
                    }`}
                  >
                    {member.status.charAt(0).toUpperCase() + member.status.slice(1)}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm">
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setSelectedStaff(member);
                        setShowDetails(true);
                      }}
                      className="rounded-lg bg-accent/20 p-2 text-accent transition-colors hover:bg-accent/30"
                      title="View Details"
                    >
                      <AiOutlineEye className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onEdit?.(member)}
                      className="rounded-lg bg-blue-500/20 p-2 text-blue-400 transition-colors hover:bg-blue-500/30"
                      title="Edit"
                    >
                      <AiOutlineEdit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(member.$id)}
                      className="rounded-lg bg-red-500/20 p-2 text-red-400 transition-colors hover:bg-red-500/30"
                      title="Delete"
                    >
                      <AiOutlineDelete className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Details Modal */}
      {showDetails && selectedStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-gradient-to-br from-primary-dark to-night-sky p-8 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-white">
                {selectedStaff.firstName} {selectedStaff.lastName}
              </h2>
              <button
                onClick={() => {
                  setShowDetails(false);
                  setSelectedStaff(null);
                }}
                className="rounded-lg p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              {/* Personal Info */}
              <div>
                <h3 className="mb-3 font-medium text-white/70">Personal Information</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <p className="text-white/50">Email</p>
                    <p className="text-white">{selectedStaff.email}</p>
                  </div>
                  <div>
                    <p className="text-white/50">Phone</p>
                    <p className="text-white">{selectedStaff.phone || '-'}</p>
                  </div>
                  <div>
                    <p className="text-white/50">Address</p>
                    <p className="text-white">{selectedStaff.address || '-'}</p>
                  </div>
                </div>
              </div>

              {/* Employment Info */}
              <div>
                <h3 className="mb-3 font-medium text-white/70">Employment Details</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <p className="text-white/50">Role</p>
                    <p className="text-white">{selectedStaff.role}</p>
                  </div>
                  <div>
                    <p className="text-white/50">Department</p>
                    <p className="text-white">{selectedStaff.department}</p>
                  </div>
                  <div>
                    <p className="text-white/50">Start Date</p>
                    <p className="text-white">{formatDate(selectedStaff.startDate)}</p>
                  </div>
                  <div>
                    <p className="text-white/50">Status</p>
                    <span
                      className={`mt-1 inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                        selectedStaff.status === 'active'
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-gray-500/20 text-gray-400'
                      }`}
                    >
                      {selectedStaff.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* License Info */}
              <div>
                <h3 className="mb-3 font-medium text-white/70">License Information</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <p className="text-white/50">License Number</p>
                    <p className="text-white">{selectedStaff.licenseNumber || '-'}</p>
                  </div>
                  <div>
                    <p className="text-white/50">License Expiry</p>
                    <p className="text-white">{formatDate(selectedStaff.licenseExpiry) || '-'}</p>
                  </div>
                  <div>
                    <p className="text-white/50">DBS Status</p>
                    <p className="text-white">{selectedStaff.dBSStatus}</p>
                  </div>
                  <div>
                    <p className="text-white/50">Right to Work</p>
                    <p className="text-white">{selectedStaff.rightToWork}</p>
                  </div>
                </div>
              </div>

              {/* Emergency Contact */}
              <div>
                <h3 className="mb-3 font-medium text-white/70">Emergency Contact</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <p className="text-white/50">Contact Name</p>
                    <p className="text-white">{selectedStaff.emergencyContact || '-'}</p>
                  </div>
                  <div>
                    <p className="text-white/50">Contact Phone</p>
                    <p className="text-white">{selectedStaff.emergencyPhone || '-'}</p>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                setShowDetails(false);
                setSelectedStaff(null);
              }}
              className="mt-8 w-full rounded-2xl bg-accent px-6 py-3 font-medium text-night-sky transition-all hover:bg-accent/90"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default StaffRecordsTable;
