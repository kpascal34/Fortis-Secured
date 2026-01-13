import React, { useEffect, useState } from 'react';
import GlassPanel from '../../components/GlassPanel.jsx';
import PortalHeader from '../../components/PortalHeader.jsx';
import { useCurrentUser, useRole } from '../../hooks/useRBAC';
import { getStaffPendingGrading, getAllStaffGrades, submitStaffGrade } from '../../services/gradingService.js';
import { config } from '../../lib/appwrite';

const AdminGrading = () => {
  const { user } = useCurrentUser();
  const { isAdmin } = useRole();
  const [pending, setPending] = useState([]);
  const [grades, setGrades] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [form, setForm] = useState({});

  const load = async () => {
    if (!config.adminGradingCollectionId) {
      setError('Admin grading collection not configured. Please contact administrator.');
      return;
    }
    
    try {
      setLoading(true);
      const [p, g] = await Promise.all([getStaffPendingGrading(), getAllStaffGrades()]);
      setPending(p || []);
      setGrades(g || []);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to load grading data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.$id]);

  const handleSubmit = async (staffId) => {
    try {
      setSavingId(staffId);
      const categoriesObj = parseCategories(form[staffId]?.categoriesText || '');
      const grade = Number(form[staffId]?.grade || 0);
      
      if (grade < 1 || grade > 5) {
        setError('Grade must be between 1 and 5');
        return;
      }
      
      await submitStaffGrade(
        user.$id,
        staffId,
        grade,
        categoriesObj,
        form[staffId]?.notes || null
      );
      setForm({ ...form, [staffId]: {} });
      await load();
    } catch (err) {
      setError(err.message || 'Failed to submit grade');
    } finally {
      setSavingId(null);
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-night-sky p-6 text-white">
        <GlassPanel className="bg-white/5 border-white/10">
          <p className="text-red-200">Admins only.</p>
        </GlassPanel>
      </div>
    );
  }

  if (!config.adminGradingCollectionId) {
    return (
      <div className="min-h-screen bg-night-sky p-6 text-white">
        <GlassPanel className="bg-white/5 border-white/10">
          <p className="text-red-200">Admin grading collection is not configured. Please contact your administrator.</p>
          <p className="mt-2 text-sm text-white/60">Missing environment variable:</p>
          <p className="mt-1 ml-4 text-xs text-white/60">VITE_APPWRITE_ADMIN_GRADING_COLLECTION_ID</p>
        </GlassPanel>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-dark via-night-sky to-night-sky px-4 py-8 text-white">
      <div className="mx-auto max-w-6xl">
        <PortalHeader
          eyebrow="Compliance"
          title="Staff Grading"
          description="Grade approved staff (1-5) and track history."
        />

        {error && <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>}

        {/* Pending Grading Section */}
        <GlassPanel className="mb-6 border-white/10 bg-white/5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Pending Grading</h3>
              <p className="text-sm text-white/60">Staff awaiting grade (null grade field)</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-accent/20 px-3 py-1 text-sm font-semibold text-accent">
                {pending.length}
              </span>
              {loading && <span className="text-xs text-white/60">Loading…</span>}
            </div>
          </div>
          <div className="space-y-3">
            {pending.map((staff) => (
              <div key={staff.userId} className="rounded-lg border border-white/10 bg-white/5 p-4">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm text-white/60">{staff.employee_number || staff.userId}</p>
                      <p className="text-lg font-semibold">{staff.firstName} {staff.lastName}</p>
                      {staff.email && <p className="text-xs text-white/50">{staff.email}</p>}
                    </div>
                    <div className="rounded-lg bg-yellow-500/10 px-3 py-1 text-xs font-semibold text-yellow-400">
                      Awaiting Grade
                    </div>
                  </div>
                  
                  <div className="grid gap-2 md:grid-cols-4">
                    <input
                      type="number"
                      min={1}
                      max={5}
                      placeholder="Grade (1-5)"
                      value={form[staff.userId]?.grade || ''}
                      onChange={(e) => setForm({ ...form, [staff.userId]: { ...form[staff.userId], grade: e.target.value } })}
                      className="rounded-lg bg-white/5 px-3 py-2 text-white outline-none ring-1 ring-white/10 focus:ring-accent"
                    />
                    <input
                      type="text"
                      placeholder="Categories (optional JSON)"
                      value={form[staff.userId]?.categoriesText || ''}
                      onChange={(e) => setForm({ ...form, [staff.userId]: { ...form[staff.userId], categoriesText: e.target.value } })}
                      className="rounded-lg bg-white/5 px-3 py-2 text-white outline-none ring-1 ring-white/10 focus:ring-accent"
                    />
                    <input
                      type="text"
                      placeholder="Notes (optional)"
                      value={form[staff.userId]?.notes || ''}
                      onChange={(e) => setForm({ ...form, [staff.userId]: { ...form[staff.userId], notes: e.target.value } })}
                      className="rounded-lg bg-white/5 px-3 py-2 text-white outline-none ring-1 ring-white/10 focus:ring-accent"
                    />
                    <button
                      onClick={() => handleSubmit(staff.userId)}
                      disabled={savingId === staff.userId}
                      className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-night-sky disabled:opacity-50"
                    >
                      {savingId === staff.userId ? 'Saving…' : 'Submit'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {pending.length === 0 && (
              <div className="rounded-lg border border-dashed border-white/20 bg-white/5 p-6 text-center">
                <p className="text-sm text-white/60">✓ All staff have been graded!</p>
              </div>
            )}
          </div>
        </GlassPanel>

        {/* Grading History Section */}
        <GlassPanel className="border-white/10 bg-white/5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Grading History</h3>
              <p className="text-sm text-white/60">Past grades and ratings</p>
            </div>
            <span className="rounded-full bg-green-500/20 px-3 py-1 text-sm font-semibold text-green-400">
              {grades.length}
            </span>
          </div>
          <div className="space-y-3">
            {grades.map((g) => (
              <div key={g.$id} className="rounded-lg border border-white/10 bg-white/5 p-4">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex-1">
                      <p className="text-sm text-white/60">{g.staffDetails?.employee_number || g.staffId}</p>
                      <p className="text-lg font-semibold">
                        {g.staffDetails?.firstName} {g.staffDetails?.lastName}
                      </p>
                      {g.staffDetails?.email && <p className="text-xs text-white/50">{g.staffDetails?.email}</p>}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-accent/20 px-4 py-2 text-center">
                        <p className="text-xs text-white/60">Grade</p>
                        <p className="text-2xl font-bold text-accent">{g.grade}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-white/60">Graded by</p>
                        <p className="text-sm text-white/80">{g.gradedBy ? 'Admin' : 'System'}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-3 text-xs text-white/60">
                    {g.gradedAt && (
                      <span>📅 {new Date(g.gradedAt).toLocaleDateString()}</span>
                    )}
                    {g.updatedAt && (
                      <span>🔄 Updated: {new Date(g.updatedAt).toLocaleDateString()}</span>
                    )}
                  </div>

                  {g.categories && (
                    <div className="rounded-lg bg-black/30 p-3">
                      <p className="mb-1 text-xs font-semibold text-white/80">Categories:</p>
                      <pre className="text-xs text-white/70 overflow-x-auto">
                        {typeof g.categories === 'string' 
                          ? JSON.stringify(JSON.parse(g.categories), null, 2)
                          : JSON.stringify(g.categories, null, 2)
                        }
                      </pre>
                    </div>
                  )}

                  {g.notes && (
                    <div className="rounded-lg bg-blue-500/10 p-3 text-sm text-blue-200">
                      <p className="font-semibold">Notes:</p>
                      <p>{g.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {grades.length === 0 && (
              <div className="rounded-lg border border-dashed border-white/20 bg-white/5 p-6 text-center">
                <p className="text-sm text-white/60">No grades recorded yet.</p>
              </div>
            )}
          </div>
        </GlassPanel>
      </div>
    </div>
  );
};

function parseCategories(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (e) {
    return null;
  }
}

export default AdminGrading;
