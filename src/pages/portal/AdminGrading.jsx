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
    if (!config.staffGradesCollectionId || !config.staffComplianceCollectionId) {
      setError('Grading collections not configured. Please contact administrator.');
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
      await submitStaffGrade(
        user.$id,
        staffId,
        Number(form[staffId]?.overallGrade || 0),
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

  if (!config.staffGradesCollectionId || !config.staffComplianceCollectionId) {
    return (
      <div className="min-h-screen bg-night-sky p-6 text-white">
        <GlassPanel className="bg-white/5 border-white/10">
          <p className="text-red-200">Staff grading collections are not configured. Please contact your administrator.</p>
          <p className="mt-2 text-sm text-white/60">Missing environment variables:</p>
          <ul className="mt-1 ml-4 list-disc text-xs text-white/60">
            {!config.staffGradesCollectionId && <li>VITE_APPWRITE_STAFF_GRADES_COLLECTION_ID</li>}
            {!config.staffComplianceCollectionId && <li>VITE_APPWRITE_STAFF_COMPLIANCE_COLLECTION_ID</li>}
          </ul>
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

        <GlassPanel className="mb-6 border-white/10 bg-white/5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-semibold">Pending Grading</h3>
            {loading && <span className="text-xs text-white/60">Loading…</span>}
          </div>
          <div className="space-y-3">
            {pending.map((staff) => (
              <div key={staff.$id} className="rounded-lg border border-white/10 bg-white/5 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm text-white/60">{staff.employee_number || staff.userId}</p>
                    <p className="text-lg font-semibold">{staff.fullName || staff.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={5}
                      placeholder="1-5"
                      value={form[staff.$id]?.overallGrade || ''}
                      onChange={(e) => setForm({ ...form, [staff.$id]: { ...form[staff.$id], overallGrade: e.target.value } })}
                      className="w-20 rounded-lg bg-white/5 px-3 py-2 text-white outline-none ring-1 ring-white/10 focus:ring-accent"
                    />
                    <input
                      type="text"
                      placeholder="Categories JSON (optional)"
                      value={form[staff.$id]?.categoriesText || ''}
                      onChange={(e) => setForm({ ...form, [staff.$id]: { ...form[staff.$id], categoriesText: e.target.value } })}
                      className="w-52 rounded-lg bg-white/5 px-3 py-2 text-white outline-none ring-1 ring-white/10 focus:ring-accent"
                    />
                    <input
                      type="text"
                      placeholder="Notes"
                      value={form[staff.$id]?.notes || ''}
                      onChange={(e) => setForm({ ...form, [staff.$id]: { ...form[staff.$id], notes: e.target.value } })}
                      className="w-48 rounded-lg bg-white/5 px-3 py-2 text-white outline-none ring-1 ring-white/10 focus:ring-accent"
                    />
                    <button
                      onClick={() => handleSubmit(staff.$id)}
                      disabled={savingId === staff.$id}
                      className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-night-sky"
                    >
                      {savingId === staff.$id ? 'Saving…' : 'Save'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {pending.length === 0 && <p className="text-sm text-white/70">No pending staff to grade.</p>}
          </div>
        </GlassPanel>

        <GlassPanel className="border-white/10 bg-white/5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-semibold">Grading History</h3>
          </div>
          <div className="space-y-3">
            {grades.map((g) => (
              <div key={g.$id} className="rounded-lg border border-white/10 bg-white/5 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm text-white/60">{g.staff_id}</p>
                    <p className="text-lg font-semibold">Overall: {g.overall_grade}</p>
                    <p className="text-xs text-white/60">Graded: {new Date(g.graded_at).toLocaleString()}</p>
                  </div>
                  {g.categories && (
                    <pre className="rounded bg-black/30 px-2 py-1 text-xs text-white/80">{JSON.stringify(g.categories, null, 2)}</pre>
                  )}
                  {g.notes && <p className="text-xs text-white/60">Notes: {g.notes}</p>}
                </div>
              </div>
            ))}
            {grades.length === 0 && <p className="text-sm text-white/70">No grades yet.</p>}
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
