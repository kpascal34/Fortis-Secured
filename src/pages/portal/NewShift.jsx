import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { databases, config } from '../../lib/appwrite';
import { Query, ID } from 'appwrite';
import { useCurrentUser, useRole } from '../../hooks/useRBAC';
import PageHeader from '../../components/PageHeader';
import GlassPanel from '../../components/GlassPanel';

const NewShift = () => {
  const navigate = useNavigate();
  const { user, profile } = useCurrentUser();
  const { isAdmin, isManager, isClient } = useRole();
  const [clients, setClients] = useState([]);
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    clientId: '',
    siteId: '',
    positionTitle: '',
    date: '',
    startTime: '',
    endTime: '',
    breakLength: 0,
    positionsOpen: 1,
    minimumGradeRequired: '',
    hourlyRate: '',
    specialRequirements: '',
    notes: '',
  });

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);

      // Load clients
      if (config.clientsCollectionId && databases && !config.isDemoMode) {
        try {
          const clientsRes = await databases.listDocuments(
            config.databaseId,
            config.clientsCollectionId,
            [Query.limit(100), Query.orderAsc('companyName')]
          );
          setClients(clientsRes.documents);
          
          // Pre-select client if user is a client
          if (isClient && profile?.clientId) {
            setFormData(prev => ({ ...prev, clientId: profile.clientId }));
          }
        } catch (err) {
          console.warn('Failed to load clients:', err);
        }
      }

      // Load sites
      if (config.sitesCollectionId && databases && !config.isDemoMode) {
        try {
          const sitesRes = await databases.listDocuments(
            config.databaseId,
            config.sitesCollectionId,
            [Query.limit(100), Query.orderAsc('siteName')]
          );
          setSites(sitesRes.documents);
        } catch (err) {
          console.warn('Failed to load sites:', err);
        }
      }
    } catch (err) {
      console.error('Failed to load data:', err);
      setError('Failed to load form data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? (value === '' ? '' : Number(value)) : value
    }));
  };

  const validateForm = () => {
    const errors = [];
    
    if (!formData.positionTitle?.trim()) {
      errors.push('Position title is required');
    }
    if (!formData.date) {
      errors.push('Date is required');
    }
    if (!formData.startTime) {
      errors.push('Start time is required');
    }
    if (!formData.endTime) {
      errors.push('End time is required');
    }
    if (formData.startTime && formData.endTime && formData.startTime >= formData.endTime) {
      errors.push('End time must be after start time');
    }
    if (formData.positionsOpen < 1) {
      errors.push('At least 1 position must be open');
    }

    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    // Validate form
    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      setError(validationErrors.join('; '));
      return;
    }

    // Check if shifts collection is configured
    if (!config.shiftsCollectionId || config.isDemoMode) {
      setError('Shifts feature is not available in demo mode. Configure Appwrite environment variables.');
      return;
    }

    try {
      setSubmitting(true);

      const shiftData = {
        clientId: formData.clientId || null,
        siteId: formData.siteId || null,
        positionTitle: formData.positionTitle.trim(),
        date: formData.date,
        startTime: formData.startTime,
        endTime: formData.endTime,
        breakLength: formData.breakLength || 0,
        positionsOpen: formData.positionsOpen,
        minimumGradeRequired: formData.minimumGradeRequired ? Number(formData.minimumGradeRequired) : null,
        hourlyRate: formData.hourlyRate ? Number(formData.hourlyRate) : null,
        specialRequirements: formData.specialRequirements?.trim() || '',
        notes: formData.notes?.trim() || '',
        published: false,
        staffId: null,
        status: 'draft',
        createdBy: user.$id,
        createdAt: new Date().toISOString(),
      };

      await databases.createDocument(
        config.databaseId,
        config.shiftsCollectionId,
        ID.unique(),
        shiftData
      );

      setSuccess(true);
      
      // Redirect after 1.5 seconds
      setTimeout(() => {
        navigate('/portal/scheduling-board');
      }, 1500);
    } catch (err) {
      console.error('Failed to create shift:', err);
      setError(err.message || 'Failed to create shift. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate(-1);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-dark via-night-sky to-night-sky">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-accent border-t-transparent mx-auto"></div>
          <p className="text-white/70">Loading form...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-dark via-night-sky to-night-sky p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-4xl">
        <PageHeader
          category="Scheduling"
          title="Create New Shift"
          subtitle="Add a new shift to the schedule"
        />

        {error && (
          <div className="mb-6 rounded-lg bg-red-500/10 border border-red-500/20 p-4">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 rounded-lg bg-green-500/10 border border-green-500/20 p-4">
            <p className="text-green-400 text-sm">Shift created successfully! Redirecting...</p>
          </div>
        )}

        <GlassPanel className="border-white/10 bg-white/5 p-6 lg:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Client & Site Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="clientId" className="block text-sm font-medium text-white/90 mb-2">
                  Client {clients.length === 0 && <span className="text-white/50">(Optional)</span>}
                </label>
                <select
                  id="clientId"
                  name="clientId"
                  value={formData.clientId}
                  onChange={handleChange}
                  disabled={isClient || clients.length === 0}
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">Select client</option>
                  {clients.map(client => (
                    <option key={client.$id} value={client.$id}>
                      {client.companyName || client.name || client.$id}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="siteId" className="block text-sm font-medium text-white/90 mb-2">
                  Site {sites.length === 0 && <span className="text-white/50">(Optional)</span>}
                </label>
                <select
                  id="siteId"
                  name="siteId"
                  value={formData.siteId}
                  onChange={handleChange}
                  disabled={sites.length === 0}
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">Select site</option>
                  {sites.map(site => (
                    <option key={site.$id} value={site.$id}>
                      {site.siteName || site.name || site.$id}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Position Details */}
            <div>
              <label htmlFor="positionTitle" className="block text-sm font-medium text-white/90 mb-2">
                Position Title <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                id="positionTitle"
                name="positionTitle"
                value={formData.positionTitle}
                onChange={handleChange}
                required
                placeholder="e.g., Security Guard, Door Supervisor"
                className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
              />
            </div>

            {/* Date & Time Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="date" className="block text-sm font-medium text-white/90 mb-2">
                  Date <span className="text-red-400">*</span>
                </label>
                <input
                  type="date"
                  id="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  required
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="startTime" className="block text-sm font-medium text-white/90 mb-2">
                  Start Time <span className="text-red-400">*</span>
                </label>
                <input
                  type="time"
                  id="startTime"
                  name="startTime"
                  value={formData.startTime}
                  onChange={handleChange}
                  required
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="endTime" className="block text-sm font-medium text-white/90 mb-2">
                  End Time <span className="text-red-400">*</span>
                </label>
                <input
                  type="time"
                  id="endTime"
                  name="endTime"
                  value={formData.endTime}
                  onChange={handleChange}
                  required
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                />
              </div>
            </div>

            {/* Additional Details */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="breakLength" className="block text-sm font-medium text-white/90 mb-2">
                  Break (minutes)
                </label>
                <input
                  type="number"
                  id="breakLength"
                  name="breakLength"
                  value={formData.breakLength}
                  onChange={handleChange}
                  min="0"
                  step="15"
                  placeholder="0"
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="positionsOpen" className="block text-sm font-medium text-white/90 mb-2">
                  Positions Open <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  id="positionsOpen"
                  name="positionsOpen"
                  value={formData.positionsOpen}
                  onChange={handleChange}
                  required
                  min="1"
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="minimumGradeRequired" className="block text-sm font-medium text-white/90 mb-2">
                  Min Grade (1-5)
                </label>
                <input
                  type="number"
                  id="minimumGradeRequired"
                  name="minimumGradeRequired"
                  value={formData.minimumGradeRequired}
                  onChange={handleChange}
                  min="1"
                  max="5"
                  placeholder="Optional"
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label htmlFor="hourlyRate" className="block text-sm font-medium text-white/90 mb-2">
                Hourly Rate (£)
              </label>
              <input
                type="number"
                id="hourlyRate"
                name="hourlyRate"
                value={formData.hourlyRate}
                onChange={handleChange}
                min="0"
                step="0.01"
                placeholder="e.g., 12.50"
                className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
              />
            </div>

            {/* Requirements & Notes */}
            <div>
              <label htmlFor="specialRequirements" className="block text-sm font-medium text-white/90 mb-2">
                Special Requirements
              </label>
              <textarea
                id="specialRequirements"
                name="specialRequirements"
                value={formData.specialRequirements}
                onChange={handleChange}
                rows={3}
                placeholder="Any special certifications, equipment, or requirements"
                className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
              />
            </div>

            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-white/90 mb-2">
                Internal Notes
              </label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={3}
                placeholder="Internal notes (not visible to staff)"
                className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-white/10">
              <button
                type="submit"
                disabled={submitting || success}
                className="flex-1 rounded-lg bg-accent px-6 py-3 font-medium text-white hover:bg-accent/90 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-night-sky disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? 'Creating...' : success ? 'Created!' : 'Create Shift'}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                disabled={submitting}
                className="flex-1 sm:flex-none rounded-lg bg-white/10 px-6 py-3 font-medium text-white hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-night-sky transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            </div>
          </form>
        </GlassPanel>
      </div>
    </div>
  );
};

export default NewShift;
