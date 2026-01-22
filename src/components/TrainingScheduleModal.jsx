import React, { useState, useEffect } from 'react';
import { databases, config } from '../lib/appwrite';
import { ID, Query } from 'appwrite';
import { AiOutlineClose, AiOutlineLoading3Quarters, AiOutlineSearch } from 'react-icons/ai';

const TrainingScheduleModal = ({ isOpen, onClose, onSuccess, editingTraining = null }) => {
  const [formData, setFormData] = useState({
    trainingName: '',
    description: '',
    startDate: '',
    endDate: '',
    duration: '',
    location: '',
    trainer: '',
    category: 'security',
    status: 'scheduled',
    maxParticipants: '',
    participants: [],
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [staffList, setStaffList] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStaff, setSelectedStaff] = useState([]);

  useEffect(() => {
    if (isOpen) {
      fetchStaffList();
      if (editingTraining) {
        setFormData({
          trainingName: editingTraining.trainingName || '',
          description: editingTraining.description || '',
          startDate: editingTraining.startDate ? new Date(editingTraining.startDate).toISOString().split('T')[0] : '',
          endDate: editingTraining.endDate ? new Date(editingTraining.endDate).toISOString().split('T')[0] : '',
          duration: editingTraining.duration || '',
          location: editingTraining.location || '',
          trainer: editingTraining.trainer || '',
          category: editingTraining.category || 'security',
          status: editingTraining.status || 'scheduled',
          maxParticipants: editingTraining.maxParticipants || '',
          participants: editingTraining.participants || [],
        });
        setSelectedStaff(editingTraining.participants || []);
      }
    }
  }, [isOpen, editingTraining]);

  const fetchStaffList = async () => {
    try {
      const response = await databases.listDocuments(
        config.databaseId,
        config.staffProfilesCollectionId,
        [Query.limit(100), Query.equal('status', 'active')]
      );
      setStaffList(response.documents || []);
    } catch (err) {
      console.error('Error fetching staff:', err);
    }
  };

  const categories = [
    { value: 'security', label: 'Security Training' },
    { value: 'compliance', label: 'Compliance' },
    { value: 'first_aid', label: 'First Aid' },
    { value: 'fire_safety', label: 'Fire Safety' },
    { value: 'customer_service', label: 'Customer Service' },
    { value: 'conflict_resolution', label: 'Conflict Resolution' },
    { value: 'leadership', label: 'Leadership' },
    { value: 'technical', label: 'Technical Skills' },
    { value: 'other', label: 'Other' },
  ];

  const statusOptions = [
    { value: 'scheduled', label: 'Scheduled' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const toggleStaffSelection = (staff) => {
    setSelectedStaff((prev) => {
      const isSelected = prev.some((s) => s.staffId === staff.$id);
      if (isSelected) {
        return prev.filter((s) => s.staffId !== staff.$id);
      } else {
        return [...prev, {
          staffId: staff.$id,
          staffName: `${staff.firstName} ${staff.lastName}`,
          completed: false,
        }];
      }
    });
  };

  const filteredStaff = staffList.filter((staff) => {
    const fullName = `${staff.firstName} ${staff.lastName}`.toLowerCase();
    const email = (staff.email || '').toLowerCase();
    const search = searchTerm.toLowerCase();
    return fullName.includes(search) || email.includes(search);
  });

  const validateForm = () => {
    if (!formData.trainingName.trim()) {
      setError('Training name is required');
      return false;
    }
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
      const trainingData = {
        trainingName: formData.trainingName.trim(),
        description: formData.description.trim(),
        startDate: new Date(formData.startDate).toISOString(),
        endDate: new Date(formData.endDate).toISOString(),
        duration: formData.duration,
        location: formData.location.trim(),
        trainer: formData.trainer.trim(),
        category: formData.category,
        status: formData.status,
        maxParticipants: formData.maxParticipants ? parseInt(formData.maxParticipants) : null,
        participants: JSON.stringify(selectedStaff),
        participantCount: selectedStaff.length,
      };

      if (editingTraining) {
        await databases.updateDocument(
          config.databaseId,
          config.staffTrainingCollectionId || 'staff_training',
          editingTraining.$id,
          trainingData
        );
        setSuccess('Training updated successfully!');
      } else {
        await databases.createDocument(
          config.databaseId,
          config.staffTrainingCollectionId || 'staff_training',
          ID.unique(),
          trainingData
        );
        setSuccess('Training scheduled successfully!');
      }

      // Reset form
      setFormData({
        trainingName: '',
        description: '',
        startDate: '',
        endDate: '',
        duration: '',
        location: '',
        trainer: '',
        category: 'security',
        status: 'scheduled',
        maxParticipants: '',
        participants: [],
      });
      setSelectedStaff([]);

      setTimeout(() => {
        onSuccess();
        onClose();
        setSuccess('');
      }, 1500);
    } catch (err) {
      console.error('Error saving training:', err);
      setError(err.message || 'Failed to save training. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl border border-white/10 bg-gradient-to-br from-primary-dark to-night-sky p-8 shadow-2xl my-8">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-white">
            {editingTraining ? 'Edit Training' : 'Schedule Training'}
          </h2>
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

          {/* Training Details */}
          <div>
            <h3 className="mb-4 text-lg font-medium text-white">Training Details</h3>
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm text-white/70">
                  Training Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  name="trainingName"
                  value={formData.trainingName}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/40 focus:border-accent focus:outline-none transition-colors"
                  placeholder="e.g., SIA Door Supervision Training"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-white/70">Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={3}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/40 focus:border-accent focus:outline-none transition-colors resize-none"
                  placeholder="Describe the training content and objectives..."
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm text-white/70">Category</label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-accent focus:outline-none transition-colors [&>option]:bg-night-sky"
                  >
                    {categories.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm text-white/70">Status</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-accent focus:outline-none transition-colors [&>option]:bg-night-sky"
                  >
                    {statusOptions.map((status) => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

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
                    min={formData.startDate}
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-accent focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm text-white/70">Duration</label>
                  <input
                    type="text"
                    name="duration"
                    value={formData.duration}
                    onChange={handleChange}
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/40 focus:border-accent focus:outline-none transition-colors"
                    placeholder="e.g., 3 days, 8 hours"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-white/70">Max Participants</label>
                  <input
                    type="number"
                    name="maxParticipants"
                    value={formData.maxParticipants}
                    onChange={handleChange}
                    min="1"
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/40 focus:border-accent focus:outline-none transition-colors"
                    placeholder="e.g., 20"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm text-white/70">Location</label>
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/40 focus:border-accent focus:outline-none transition-colors"
                    placeholder="e.g., Training Room A"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-white/70">Trainer</label>
                  <input
                    type="text"
                    name="trainer"
                    value={formData.trainer}
                    onChange={handleChange}
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/40 focus:border-accent focus:outline-none transition-colors"
                    placeholder="Trainer name"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Assign Staff */}
          <div>
            <h3 className="mb-4 text-lg font-medium text-white">Assign Participants</h3>
            <div className="space-y-3">
              {/* Search */}
              <div className="relative">
                <AiOutlineSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search staff by name or email..."
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 pl-11 text-white placeholder:text-white/40 focus:border-accent focus:outline-none transition-colors"
                />
              </div>

              {/* Selected Staff Count */}
              <div className="text-sm text-white/70">
                {selectedStaff.length} participant{selectedStaff.length !== 1 ? 's' : ''} selected
              </div>

              {/* Staff List */}
              <div className="max-h-60 overflow-y-auto space-y-2 rounded-2xl border border-white/10 bg-white/5 p-3">
                {filteredStaff.map((staff) => {
                  const isSelected = selectedStaff.some((s) => s.staffId === staff.$id);
                  return (
                    <label
                      key={staff.$id}
                      className="flex items-center gap-3 rounded-lg bg-white/5 p-3 cursor-pointer hover:bg-white/10 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleStaffSelection(staff)}
                        className="h-4 w-4 rounded border-white/20 bg-white/10 text-accent focus:ring-accent focus:ring-offset-0"
                      />
                      <div className="flex-1">
                        <p className="text-white font-medium">
                          {staff.firstName} {staff.lastName}
                        </p>
                        <p className="text-sm text-white/50">{staff.email}</p>
                      </div>
                      <span className="text-xs text-white/50">{staff.role}</span>
                    </label>
                  );
                })}
                {filteredStaff.length === 0 && (
                  <p className="text-center text-white/50 py-4">No staff found</p>
                )}
              </div>
            </div>
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
                  {editingTraining ? 'Updating...' : 'Scheduling...'}
                </span>
              ) : (
                editingTraining ? 'Update Training' : 'Schedule Training'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TrainingScheduleModal;
