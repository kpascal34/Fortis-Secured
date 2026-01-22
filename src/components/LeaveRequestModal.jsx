import React, { useState, useEffect } from 'react';
import { databases, config } from '../lib/appwrite';
import { ID } from 'appwrite';
import { AiOutlineClose, AiOutlineLoading3Quarters } from 'react-icons/ai';
import { useAuth } from '../context/AuthContext';

const LeaveRequestModal = ({ isOpen, onClose, onSuccess }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    leaveType: 'annual',
    startDate: '',
    endDate: '',
    reason: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const leaveTypes = [
    { value: 'annual', label: 'Annual Leave' },
    { value: 'sick', label: 'Sick Leave' },
    { value: 'personal', label: 'Personal Leave' },
    { value: 'maternity', label: 'Maternity Leave' },
    { value: 'paternity', label: 'Paternity Leave' },
    { value: 'unpaid', label: 'Unpaid Leave' },
    { value: 'emergency', label: 'Emergency Leave' },
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    if (!formData.startDate) {
      setError('Start date is required');
      return false;
    }
    if (!formData.endDate) {
      setError('End date is required');
      return false;
    }
    if (new Date(formData.endDate) < new Date(formData.startDate)) {
      setError('End date must be after start date');
      return false;
    }
    if (!formData.reason.trim()) {
      setError('Reason is required');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const leaveData = {
        staffId: user.$id,
        staffName: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        leaveType: formData.leaveType,
        startDate: new Date(formData.startDate).toISOString(),
        endDate: new Date(formData.endDate).toISOString(),
        reason: formData.reason.trim(),
        status: 'pending',
        requestedAt: new Date().toISOString(),
      };

      await databases.createDocument(
        config.databaseId,
        config.staffLeaveCollectionId || 'staff_leave',
        ID.unique(),
        leaveData
      );

      setSuccess('Leave request submitted successfully!');
      
      // Reset form
      setFormData({
        leaveType: 'annual',
        startDate: '',
        endDate: '',
        reason: '',
      });

      setTimeout(() => {
        onSuccess();
        onClose();
        setSuccess('');
      }, 1500);
    } catch (err) {
      console.error('Error submitting leave request:', err);
      setError(err.message || 'Failed to submit leave request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-gradient-to-br from-primary-dark to-night-sky p-8 shadow-2xl my-8">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-white">Request Leave</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          >
            <AiOutlineClose className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Messages */}
          {error && (
            <div className="rounded-xl border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-300">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-xl border border-green-500/50 bg-green-500/10 px-4 py-3 text-sm font-medium text-green-300">
              {success}
            </div>
          )}

          {/* Leave Type */}
          <div>
            <label className="mb-2 block text-sm text-white/70">
              Leave Type <span className="text-red-400">*</span>
            </label>
            <select
              name="leaveType"
              value={formData.leaveType}
              onChange={handleChange}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-accent focus:outline-none transition-colors [&>option]:bg-night-sky"
            >
              {leaveTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm text-white/70">
                Start Date <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={handleChange}
                min={new Date().toISOString().split('T')[0]}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-accent focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-white/70">
                End Date <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                name="endDate"
                value={formData.endDate}
                onChange={handleChange}
                min={formData.startDate || new Date().toISOString().split('T')[0]}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-accent focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="mb-2 block text-sm text-white/70">
              Reason <span className="text-red-400">*</span>
            </label>
            <textarea
              name="reason"
              value={formData.reason}
              onChange={handleChange}
              rows={4}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/40 focus:border-accent focus:outline-none transition-colors resize-none"
              placeholder="Please provide a reason for your leave request..."
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-6 py-3 font-medium text-white transition-all hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-2xl bg-accent px-6 py-3 font-medium text-night-sky transition-all hover:bg-accent/90 disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <AiOutlineLoading3Quarters className="animate-spin" />
                  Submitting...
                </span>
              ) : (
                'Submit Request'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LeaveRequestModal;
