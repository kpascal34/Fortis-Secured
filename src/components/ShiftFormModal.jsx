import React, { useState, useEffect } from 'react';
import { databases, config } from '../lib/appwrite';
import { ID } from 'appwrite';
import { AiOutlineClose, AiOutlineLoading3Quarters } from 'react-icons/ai';

const ShiftFormModal = ({ shift, onClose, clients = [], sites = [] }) => {
  const [formData, setFormData] = useState({
    clientId: '',
    siteId: '',
    postId: '',
    shiftDate: '',
    startTime: '',
    endTime: '',
    shiftType: 'Static Guarding',
    requiredHeadcount: 1,
    payRate: '',
    billRate: '',
    breakMinutes: 0,
    paidBreak: false,
    instructions: '',
    uniformRequirement: '',
    vehicleRequired: false,
    status: 'scheduled',
    isRecurring: false,
    recurringPattern: '',
    recurringEndDate: '',
  });
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const shiftTypes = [
    'Static Guarding',
    'Manned Guarding',
    'Mobile Patrol',
    'Event Security',
    'Door Supervision',
    'Keyholding / Alarm Response',
    'CCTV / Control Room',
    'Concierge / Reception Security',
  ];

  useEffect(() => {
    console.log('ShiftFormModal - clients prop:', clients);
    console.log('ShiftFormModal - sites prop:', sites);
  }, [clients, sites]);

  useEffect(() => {
    if (shift && !shift.isDuplicate) {
      setFormData({
        clientId: shift.clientId || '',
        siteId: shift.siteId || '',
        postId: shift.postId || '',
        shiftDate: shift.shiftDate || '',
        startTime: shift.startTime || '',
        endTime: shift.endTime || '',
        shiftType: shift.shiftType || 'Static Guarding',
        requiredHeadcount: shift.requiredHeadcount || 1,
        payRate: shift.payRate || '',
        billRate: shift.billRate || '',
        breakMinutes: shift.breakMinutes || 0,
        paidBreak: shift.paidBreak || false,
        instructions: shift.instructions || '',
        uniformRequirement: shift.uniformRequirement || '',
        vehicleRequired: shift.vehicleRequired || false,
        status: shift.status || 'scheduled',
        isRecurring: shift.isRecurring || false,
        recurringPattern: shift.recurringPattern || '',
        recurringEndDate: shift.recurringEndDate || '',
      });
      if (shift.siteId) {
        fetchPosts(shift.siteId);
      }
    } else if (shift?.isDuplicate) {
      setFormData({
        ...shift,
        shiftDate: '',
        status: 'scheduled',
      });
      if (shift.siteId) {
        fetchPosts(shift.siteId);
      }
    }
  }, [shift]);

  useEffect(() => {
    if (formData.siteId) {
      fetchPosts(formData.siteId);
    }
  }, [formData.siteId]);

  const fetchPosts = async (siteId) => {
    try {
      const response = await databases.listDocuments(
        config.databaseId,
        config.postsCollectionId
      );
      const sitePosts = response.documents.filter((p) => p.siteId === siteId);
      setPosts(sitePosts);
    } catch (error) {
      console.error('Error fetching posts:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const calculateHours = () => {
    if (!formData.startTime || !formData.endTime) return 0;
    const [startH, startM] = formData.startTime.split(':').map(Number);
    const [endH, endM] = formData.endTime.split(':').map(Number);
    let hours = endH - startH + (endM - startM) / 60;
    if (hours < 0) hours += 24; // Handle shifts crossing midnight
    return hours.toFixed(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const shiftData = {
        ...formData,
        requiredHeadcount: parseInt(formData.requiredHeadcount) || 1,
        breakMinutes: parseInt(formData.breakMinutes) || 0,
      };

      if (shift && !shift.isDuplicate) {
        await databases.updateDocument(
          config.databaseId,
          config.shiftsCollectionId,
          shift.$id,
          shiftData
        );
      } else {
        // Check if recurring
        if (formData.isRecurring && formData.recurringEndDate) {
          // TODO: Implement recurring shift creation logic
          // For now, just create the first instance
          await databases.createDocument(
            config.databaseId,
            config.shiftsCollectionId,
            ID.unique(),
            shiftData
          );
          alert('Recurring shift creation will generate multiple instances. This feature is under development.');
        } else {
          await databases.createDocument(
            config.databaseId,
            config.shiftsCollectionId,
            ID.unique(),
            shiftData
          );
        }
      }
      onClose(true);
    } catch (err) {
      console.error('Error saving shift:', err);
      setError(err.message || 'Failed to save shift. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filteredSites = sites.filter((site) => site.clientId === formData.clientId);
  
  console.log('Selected clientId:', formData.clientId);
  console.log('All sites:', sites);
  console.log('Filtered sites:', filteredSites);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl border border-white/10 bg-gradient-to-br from-primary-dark to-night-sky p-8 shadow-2xl my-8">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-white">
            {shift && !shift.isDuplicate ? 'Edit Shift' : shift?.isDuplicate ? 'Duplicate Shift' : 'Add New Shift'}
          </h2>
          <button
            onClick={() => onClose(false)}
            className="rounded-lg p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          >
            <AiOutlineClose className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Client & Location */}
          <div>
            <h3 className="mb-4 text-lg font-medium text-white">Client & Location</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm text-white/70">
                  Client <span className="text-red-400">*</span>
                </label>
                <select
                  required
                  name="clientId"
                  value={formData.clientId}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-accent focus:outline-none [&>option]:bg-night-sky [&>option]:text-white"
                >
                  <option value="">Select client</option>
                  {clients && clients.length > 0 ? (
                    clients.map((client) => (
                      <option key={client.$id} value={client.$id}>
                        {client.companyName}
                      </option>
                    ))
                  ) : (
                    <option value="" disabled>No clients available</option>
                  )}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm text-white/70">
                  Site <span className="text-red-400">*</span>
                </label>
                <select
                  required
                  name="siteId"
                  value={formData.siteId}
                  onChange={handleChange}
                  disabled={!formData.clientId}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-accent focus:outline-none disabled:opacity-50 [&>option]:bg-night-sky [&>option]:text-white"
                >
                  <option value="">Select site</option>
                  {filteredSites && filteredSites.length > 0 ? (
                    filteredSites.map((site) => (
                      <option key={site.$id} value={site.$id}>
                        {site.siteName}
                      </option>
                    ))
                  ) : formData.clientId ? (
                    <option value="" disabled>No sites linked to this client - Create a site first</option>
                  ) : (
                    <option value="" disabled>Select a client first</option>
                  )}
                </select>
                {formData.clientId && filteredSites.length === 0 && (
                  <p className="mt-2 text-xs text-yellow-400">
                    This client has no sites. Go to Sites page to create one.
                  </p>
                )}
              </div>

              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm text-white/70">Post/Assignment</label>
                <select
                  name="postId"
                  value={formData.postId}
                  onChange={handleChange}
                  disabled={!formData.siteId}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-accent focus:outline-none disabled:opacity-50 [&>option]:bg-night-sky [&>option]:text-white"
                >
                  <option value="">Select post (optional)</option>
                  {posts && posts.length > 0 ? (
                    posts.map((post) => (
                      <option key={post.$id} value={post.$id}>
                        {post.postName}
                      </option>
                    ))
                  ) : formData.siteId ? (
                    <option value="" disabled>No posts for this site</option>
                  ) : (
                    <option value="" disabled>Select a site first</option>
                  )}
                </select>
              </div>
            </div>
          </div>

          {/* Shift Details */}
          <div>
            <h3 className="mb-4 text-lg font-medium text-white">Shift Details</h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="mb-2 block text-sm text-white/70">
                  Date <span className="text-red-400">*</span>
                </label>
                <input
                  required
                  type="date"
                  name="shiftDate"
                  value={formData.shiftDate}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-accent focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-white/70">
                  Start Time <span className="text-red-400">*</span>
                </label>
                <input
                  required
                  type="time"
                  name="startTime"
                  value={formData.startTime}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-accent focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-white/70">
                  End Time <span className="text-red-400">*</span>
                </label>
                <input
                  required
                  type="time"
                  name="endTime"
                  value={formData.endTime}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-accent focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-white/70">
                  Shift Type <span className="text-red-400">*</span>
                </label>
                <select
                  required
                  name="shiftType"
                  value={formData.shiftType}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-accent focus:outline-none"
                >
                  {shiftTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm text-white/70">
                  Guards Required <span className="text-red-400">*</span>
                </label>
                <input
                  required
                  type="number"
                  name="requiredHeadcount"
                  min="1"
                  value={formData.requiredHeadcount}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-accent focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-white/70">Status</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-accent focus:outline-none"
                >
                  <option value="scheduled">Scheduled</option>
                  <option value="in-progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="unfilled">Unfilled</option>
                </select>
              </div>
            </div>

            {formData.startTime && formData.endTime && (
              <div className="mt-3 rounded-lg border border-accent/20 bg-accent/10 px-4 py-2">
                <p className="text-sm text-accent">Total Hours: {calculateHours()}</p>
              </div>
            )}
          </div>

          {/* Rates & Breaks */}
          <div>
            <h3 className="mb-4 text-lg font-medium text-white">Rates & Breaks</h3>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-2 block text-sm text-white/70">Pay Rate (£/hour)</label>
                <input
                  type="text"
                  name="payRate"
                  value={formData.payRate}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/40 focus:border-accent focus:outline-none"
                  placeholder="e.g., 12.50"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-white/70">Bill Rate (£/hour)</label>
                <input
                  type="text"
                  name="billRate"
                  value={formData.billRate}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/40 focus:border-accent focus:outline-none"
                  placeholder="e.g., 18.00"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-white/70">Break (minutes)</label>
                <input
                  type="number"
                  name="breakMinutes"
                  min="0"
                  value={formData.breakMinutes}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-accent focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-4 flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="paidBreak"
                  checked={formData.paidBreak}
                  onChange={handleChange}
                  className="h-4 w-4 rounded border-white/20 bg-white/10 text-accent focus:ring-accent"
                />
                <span className="text-sm text-white">Paid Break</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="vehicleRequired"
                  checked={formData.vehicleRequired}
                  onChange={handleChange}
                  className="h-4 w-4 rounded border-white/20 bg-white/10 text-accent focus:ring-accent"
                />
                <span className="text-sm text-white">Vehicle Required</span>
              </label>
            </div>
          </div>

          {/* Additional Info */}
          <div>
            <h3 className="mb-4 text-lg font-medium text-white">Additional Information</h3>
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm text-white/70">Uniform Requirement</label>
                <input
                  type="text"
                  name="uniformRequirement"
                  value={formData.uniformRequirement}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/40 focus:border-accent focus:outline-none"
                  placeholder="e.g., Full uniform with high-vis"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-white/70">Shift Instructions</label>
                <textarea
                  name="instructions"
                  value={formData.instructions}
                  onChange={handleChange}
                  rows={4}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/40 focus:border-accent focus:outline-none"
                  placeholder="Detailed instructions for the shift..."
                />
              </div>
            </div>
          </div>

          {/* Recurring (future feature placeholder) */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="isRecurring"
                checked={formData.isRecurring}
                onChange={handleChange}
                className="h-4 w-4 rounded border-white/20 bg-white/10 text-accent focus:ring-accent"
              />
              <span className="text-sm font-medium text-white">Recurring Shift (coming soon)</span>
            </label>
            {formData.isRecurring && (
              <p className="mt-2 text-xs text-white/50">Recurring shift generation is under development.</p>
            )}
          </div>

          {error && (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-4">
            <button
              type="button"
              onClick={() => onClose(false)}
              disabled={loading}
              className="rounded-full border border-white/20 px-6 py-3 text-sm font-medium text-white transition-all hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-night-sky shadow-lg shadow-accent/40 transition-all hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading && <AiOutlineLoading3Quarters className="h-4 w-4 animate-spin" />}
              {loading ? 'Saving...' : shift && !shift.isDuplicate ? 'Update Shift' : 'Create Shift'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ShiftFormModal;
