import React, { useEffect, useState } from 'react';
import GlassPanel from '../../components/GlassPanel.jsx';
import PortalHeader from '../../components/PortalHeader.jsx';
import { useCurrentUser, useRole } from '../../hooks/useRBAC';
import { databases, config } from '../../lib/appwrite';
import { Query, ID } from 'appwrite';

const SchedulingBoard = () => {
  const { user, profile } = useCurrentUser();
  const { isAdmin, isManager, isStaff, isClient } = useRole();
  const [shifts, setShifts] = useState([]);
  const [clients, setClients] = useState([]);
  const [sites, setSites] = useState([]);
  const [positions, setPositions] = useState([]);
  const [error, setError] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    clientId: '',
    siteId: '',
    positionTitle: '',
    date: '',
    startTime: '',
    endTime: '',
    positionsOpen: 1,
    minimumGradeRequired: '',
    specialRequirements: '',
  });

  const loadFormData = async () => {
    if (!user) return;
    try {
      setLoadingData(true);
      
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
            setForm(prev => ({ ...prev, clientId: profile.clientId }));
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
      
      // Define common positions (static for now)
      setPositions([
        'Security Guard',
        'Door Supervisor',
        'Close Protection Officer',
        'CCTV Operator',
        'Security Manager',
        'Event Security',
        'Mobile Patrol',
        'Reception Security',
        'Retail Security',
      ]);
    } catch (err) {
      console.error('Failed to load form data:', err);
    } finally {
      setLoadingData(false);
    }
  };

  const loadShifts = async () => {
    if (!user) return;
    try {
      setLoading(true);
      
      // Build queries based on role
      const queries = [Query.limit(100)];
      
      if (isClient && profile?.clientId) {
        // Clients only see their own shifts
        queries.push(Query.equal('clientId', profile.clientId));
      } else if (isStaff) {
        // Staff only see published open shifts
        queries.push(Query.equal('published', true));
        queries.push(Query.isNull('staffId'));
      }
      
      // Default sort by date
      queries.push(Query.orderAsc('date'));
      
      const shiftsRes = await databases.listDocuments(
        config.databaseId,
        config.shiftsCollectionId,
        queries
      );
      
      setShifts(shiftsRes.documents);
      setError(null);
    } catch (err) {
      console.error('Failed to load shifts:', err);
      setError(err.message || 'Failed to load shifts');
      setShifts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFormData();
    loadShifts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.$id]);

  const roleString = () => {
    if (isAdmin) return 'admin';
    if (isManager) return 'manager';
    if (isClient) return 'client';
    return 'staff';
  };

  const handleApply = async (shiftId) => {
    try {
      setError(null);
      
      // Create application document
      await databases.createDocument(
        config.databaseId,
        config.applicationsCollectionId,
        ID.unique(),
        {
          shiftId,
          guardId: user.$id,
          guardName: profile?.firstName ? `${profile.firstName} ${profile.lastName || ''}`.trim() : user.email,
          status: 'pending',
          appliedAt: new Date().toISOString(),
        }
      );
      
      await loadShifts();
    } catch (err) {
      console.error('Failed to apply:', err);
      setError(err.message || 'Could not apply for shift');
    }
  };

  const validateForm = () => {
    const errors = {};
    
    if (!form.clientId && clients.length > 0) {
      errors.clientId = 'Client is required';
    }
    if (!form.siteId) {
      errors.siteId = 'Site is required';
    }
    if (!form.positionTitle) {
      errors.positionTitle = 'Position is required';
    }
    if (!form.date) {
      errors.date = 'Date is required';
    }
    if (!form.startTime) {
      errors.startTime = 'Start time is required';
    }
    if (!form.endTime) {
      errors.endTime = 'End time is required';
    }
    if (form.startTime && form.endTime && form.startTime >= form.endTime) {
      errors.endTime = 'End time must be after start time';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    
    // Validate
    if (!validateForm()) {
      setError('Please correct the validation errors below');
      return;
    }
    
    try {
      setCreating(true);
      setError(null);
      
      // Create shift document directly
      await databases.createDocument(
        config.databaseId,
        config.shiftsCollectionId,
        ID.unique(),
        {
          clientId: form.clientId || profile?.clientId || null,
          siteId: form.siteId,
          positionTitle: form.positionTitle,
          date: form.date,
          startTime: form.startTime,
          endTime: form.endTime,
          minimumGradeRequired: form.minimumGradeRequired ? Number(form.minimumGradeRequired) : null,
          positionsOpen: Number(form.positionsOpen || 1),
          specialRequirements: form.specialRequirements || '',
          published: false,
          staffId: null,
          status: 'draft',
          createdBy: user.$id,
          createdAt: new Date().toISOString(),
        }
      );
      
      setForm({ clientId: '', siteId: '', positionTitle: '', date: '', startTime: '', endTime: '', positionsOpen: 1, minimumGradeRequired: '', specialRequirements: '' });
      await loadShifts();
    } catch (err) {
      console.error('Failed to create shift:', err);
      setError(err.message || 'Failed to create shift');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fs-page px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <PortalHeader
          eyebrow="Scheduling"
          title="Shifts & Applications"
          description="View open shifts, apply, and create new postings (admin/manager)."
        />

        {error && <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>}

        {(isAdmin || isManager) && (
          <GlassPanel className="mb-6 border-white/10 bg-white/5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Create Shift</h3>
              <span className="text-xs text-white/60">Client-scoped</span>
            </div>
            <form className="grid gap-3 md:grid-cols-3" onSubmit={handleCreate}>
              <Select 
                label="Client" 
                value={form.clientId} 
                onChange={(v) => setForm({ ...form, clientId: v })} 
                required={clients.length > 0}
                disabled={loadingData || isClient}
                error={validationErrors.clientId}
              >
                <option value="">Select client</option>
                {clients.map(client => (
                  <option key={client.$id} value={client.$id}>
                    {client.companyName || client.name || client.$id}
                  </option>
                ))}
              </Select>
              <Select 
                label="Site" 
                value={form.siteId} 
                onChange={(v) => setForm({ ...form, siteId: v })} 
                required
                disabled={loadingData}
                error={validationErrors.siteId}
              >
                <option value="">Select site</option>
                {sites.map(site => (
                  <option key={site.$id} value={site.$id}>
                    {site.siteName || site.name || site.$id}
                  </option>
                ))}
              </Select>
              <Select 
                label="Position" 
                value={form.positionTitle} 
                onChange={(v) => setForm({ ...form, positionTitle: v })} 
                required
                disabled={loadingData}
                error={validationErrors.positionTitle}
              >
                <option value="">Select position</option>
                {positions.map(pos => (
                  <option key={pos} value={pos}>{pos}</option>
                ))}
              </Select>
              <Input label="Date" type="date" value={form.date} onChange={(v) => setForm({ ...form, date: v })} required disabled={loadingData} error={validationErrors.date} />
              <Input label="Start Time" type="time" value={form.startTime} onChange={(v) => setForm({ ...form, startTime: v })} required disabled={loadingData} error={validationErrors.startTime} />
              <Input label="End Time" type="time" value={form.endTime} onChange={(v) => setForm({ ...form, endTime: v })} required disabled={loadingData} error={validationErrors.endTime} />
              <Input label="Positions" type="number" min={1} value={form.positionsOpen} onChange={(v) => setForm({ ...form, positionsOpen: v })} required disabled={loadingData} />
              <Input label="Minimum Grade (1-5)" type="number" min={1} max={5} value={form.minimumGradeRequired} onChange={(v) => setForm({ ...form, minimumGradeRequired: v })} disabled={loadingData} />
              <Input label="Special Requirements" value={form.specialRequirements} onChange={(v) => setForm({ ...form, specialRequirements: v })} disabled={loadingData} />
              <div className="md:col-span-3 flex justify-end gap-2">
                {loadingData && <span className="text-xs text-white/60 self-center">Loading form data...</span>}
                <button type="submit" disabled={creating || loadingData} className="fs-btn-primary disabled:opacity-50 disabled:cursor-not-allowed">
                  {creating ? 'Saving…' : 'Create Shift'}
                </button>
              </div>
            </form>
          </GlassPanel>
        )}

        <GlassPanel className="fs-card">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold">Open Shifts</h3>
            {loading && <span className="text-xs text-white/60">Loading…</span>}
          </div>
          <div className="space-y-3">
            {shifts.map((shift) => (
              <div key={shift.$id} className="rounded-xl border border-border bg-bg-2 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm text-text-2">{shift.site_id}</p>
                    <p className="text-lg font-semibold text-text">{shift.position_title}</p>
                    <p className="text-sm text-text-2">{shift.date} · {shift.start_time} - {shift.end_time}</p>
                    {shift.minimum_grade_required && (
                      <p className="text-xs text-text-3">Min grade: {shift.minimum_grade_required}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-text-2">Open spots: {shift.positions_open - (shift.assignments?.length || 0)}</span>
                    {isStaff && (
                      <button
                        onClick={() => handleApply(shift.$id)}
                        className="fs-btn-primary text-sm"
                        disabled={loading}
                      >
                        Apply
                      </button>
                    )}
                  </div>
                </div>
                {shift.eligibility_check && (
                  <p className="mt-2 text-xs text-text-2">Eligibility: {shift.eligibility_check}</p>
                )}
              </div>
            ))}
            {shifts.length === 0 && <p className="text-sm text-text-2">No shifts available.</p>}
          </div>
        </GlassPanel>
      </div>
    </div>
  );
};

const Input = ({ label, value, onChange, type = 'text', required = false, min, max, disabled = false, error }) => (
  <label className="block text-sm text-white/80">
    <span className="flex items-center gap-1">
      {label}
      {required && <span className="text-red-400 text-xs">*</span>}
    </span>
    <input
      type={type}
      min={min}
      max={max}
      required={required}
      disabled={disabled}
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      className={`mt-1 w-full rounded-lg bg-white/5 px-3 py-3 text-white outline-none ring-1 ${
        error ? 'ring-red-500/50' : 'ring-white/10'
      } focus:ring-accent disabled:opacity-50 disabled:cursor-not-allowed`}
    />
    {error && <span className="text-xs text-red-400 mt-1 block">{error}</span>}
  </label>
);

const Select = ({ label, value, onChange, required = false, disabled = false, error, children }) => (
  <label className="block text-sm text-white/80">
    <span className="flex items-center gap-1">
      {label}
      {required && <span className="text-red-400 text-xs">*</span>}
    </span>
    <select
      required={required}
      disabled={disabled}
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      className={`mt-1 w-full rounded-lg bg-white/5 px-3 py-3 text-white outline-none ring-1 ${
        error ? 'ring-red-500/50' : 'ring-white/10'
      } focus:ring-accent disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {children}
    </select>
    {error && <span className="text-xs text-red-400 mt-1 block">{error}</span>}
  </label>
);

export default SchedulingBoard;
