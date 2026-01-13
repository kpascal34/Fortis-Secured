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
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
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

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      setCreating(true);
      setError(null);
      
      // Validate required fields
      if (!form.siteId || !form.positionTitle || !form.date || !form.startTime || !form.endTime) {
        throw new Error('Please fill in all required fields');
      }
      
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
    <div className="min-h-screen bg-gradient-to-br from-primary-dark via-night-sky to-night-sky px-4 py-8 text-white">
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
              <Input label="Client ID" value={form.clientId} onChange={(v) => setForm({ ...form, clientId: v })} />
              <Input label="Site ID" value={form.siteId} onChange={(v) => setForm({ ...form, siteId: v })} required />
              <Input label="Position" value={form.positionTitle} onChange={(v) => setForm({ ...form, positionTitle: v })} required />
              <Input label="Date" type="date" value={form.date} onChange={(v) => setForm({ ...form, date: v })} required />
              <Input label="Start Time" value={form.startTime} onChange={(v) => setForm({ ...form, startTime: v })} required />
              <Input label="End Time" value={form.endTime} onChange={(v) => setForm({ ...form, endTime: v })} required />
              <Input label="Positions" type="number" min={1} value={form.positionsOpen} onChange={(v) => setForm({ ...form, positionsOpen: v })} required />
              <Input label="Minimum Grade (1-5)" type="number" value={form.minimumGradeRequired} onChange={(v) => setForm({ ...form, minimumGradeRequired: v })} />
              <Input label="Special Requirements" value={form.specialRequirements} onChange={(v) => setForm({ ...form, specialRequirements: v })} />
              <div className="md:col-span-3 flex justify-end">
                <button type="submit" disabled={creating} className="rounded-lg bg-accent px-4 py-2 font-semibold text-night-sky">
                  {creating ? 'Saving…' : 'Create Shift'}
                </button>
              </div>
            </form>
          </GlassPanel>
        )}

        <GlassPanel className="border-white/10 bg-white/5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold">Open Shifts</h3>
            {loading && <span className="text-xs text-white/60">Loading…</span>}
          </div>
          <div className="space-y-3">
            {shifts.map((shift) => (
              <div key={shift.$id} className="rounded-lg border border-white/10 bg-white/5 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm text-white/60">{shift.site_id}</p>
                    <p className="text-lg font-semibold">{shift.position_title}</p>
                    <p className="text-sm text-white/70">{shift.date} · {shift.start_time} - {shift.end_time}</p>
                    {shift.minimum_grade_required && (
                      <p className="text-xs text-white/50">Min grade: {shift.minimum_grade_required}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-white/60">Open spots: {shift.positions_open - (shift.assignments?.length || 0)}</span>
                    {isStaff && (
                      <button
                        onClick={() => handleApply(shift.$id)}
                        className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-night-sky"
                        disabled={loading}
                      >
                        Apply
                      </button>
                    )}
                  </div>
                </div>
                {shift.eligibility_check && (
                  <p className="mt-2 text-xs text-white/60">Eligibility: {shift.eligibility_check}</p>
                )}
              </div>
            ))}
            {shifts.length === 0 && <p className="text-sm text-white/70">No shifts available.</p>}
          </div>
        </GlassPanel>
      </div>
    </div>
  );
};

const Input = ({ label, value, onChange, type = 'text', required = false, min }) => (
  <label className="block text-sm text-white/80">
    {label}
    <input
      type={type}
      min={min}
      required={required}
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      className="mt-1 w-full rounded-lg bg-white/5 px-3 py-3 text-white outline-none ring-1 ring-white/10 focus:ring-accent"
    />
  </label>
);

export default SchedulingBoard;
