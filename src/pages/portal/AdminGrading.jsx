import React, { useEffect, useState } from 'react';
import GlassPanel from '../../components/GlassPanel.jsx';
import PortalHeader from '../../components/PortalHeader.jsx';
import GradingModal from '../../components/GradingModal.jsx';
import { useCurrentUser, useRole } from '../../hooks/useRBAC';
import { getStaffPendingGrading, getAllStaffGrades, submitStaffGrade, getGradeColor, getGradeLabel } from '../../services/gradingService.js';
import { config } from '../../lib/appwrite';

const AdminGrading = () => {
  const { user } = useCurrentUser();
  const { isAdmin, loading: roleLoading } = useRole();
  const [pending, setPending] = useState([]);
  const [grades, setGrades] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [selectedGradeRecord, setSelectedGradeRecord] = useState(null);

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
      const gradeData = selectedGradeRecord;
      
      if (!gradeData || !gradeData.overallGrade || gradeData.overallGrade < 1 || gradeData.overallGrade > 5) {
        setError('Invalid grade data');
        return;
      }
      
      await submitStaffGrade(
        user.$id,
        staffId,
        gradeData.overallGrade,
        gradeData.criteria,
        gradeData.comment,
        user.name || 'Admin'
      );
      
      setModalOpen(false);
      setSelectedStaff(null);
      setSelectedGradeRecord(null);
      await load();
    } catch (err) {
      setError(err.message || 'Failed to submit grade');
    } finally {
      setSavingId(null);
    }
  };

  const openGradingModal = (staff) => {
    setSelectedStaff(staff);
    setSelectedGradeRecord(null);
    setModalOpen(true);
  };

  const handleGradeModalSubmit = async (gradeData) => {
    setSelectedGradeRecord(gradeData);
    await handleSubmit(selectedStaff.userId || selectedStaff.$id);
  };

  if (roleLoading) {
    return (
      <div className="min-h-screen bg-night-sky p-6 text-white">
        <GlassPanel className="bg-white/5 border-white/10">
          <p className="text-white/70">Checking access…</p>
        </GlassPanel>
      </div>
    );
  }

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
              <p className="text-sm text-white/60">Staff members awaiting performance assessment</p>
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
              <div key={staff.userId || staff.$id} className="rounded-lg border border-white/10 bg-white/5 p-4">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex-1">
                      <p className="text-sm text-white/60">{staff.employee_number || staff.userId}</p>
                      <p className="text-lg font-semibold">{staff.firstName} {staff.lastName}</p>
                      {staff.email && <p className="text-xs text-white/50">{staff.email}</p>}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {staff.daysWithoutGrading && (
                        <span className="text-xs font-semibold text-white/60">
                          {staff.daysWithoutGrading} days without grading
                        </span>
                      )}
                      <div className="flex gap-2">
                        {staff.isNewHire && (
                          <span className="rounded-full bg-blue-500/20 px-2 py-1 text-xs font-semibold text-blue-400">
                            New Hire
                          </span>
                        )}
                        <span className="rounded-lg bg-yellow-500/10 px-3 py-1 text-xs font-semibold text-yellow-400">
                          Awaiting Grade
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => openGradingModal(staff)}
                    disabled={savingId === (staff.userId || staff.$id)}
                    className="w-full rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-night-sky transition-all hover:bg-accent/90 disabled:opacity-50"
                  >
                    {savingId === (staff.userId || staff.$id) ? 'Submitting…' : 'Grade This Staff'}
                  </button>
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
              <p className="text-sm text-white/60">Past performance assessments and ratings</p>
            </div>
            <span className="rounded-full bg-green-500/20 px-3 py-1 text-sm font-semibold text-green-400">
              {grades.length}
            </span>
          </div>
          <div className="space-y-3">
            {grades.map((g) => (
              <div key={g.$id} className="rounded-lg border border-white/10 bg-white/5 p-4">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="text-sm text-white/60">{g.staffDetails?.employee_number || g.staffId}</p>
                      <p className="text-lg font-semibold">
                        {g.staffDetails?.firstName} {g.staffDetails?.lastName}
                      </p>
                      {g.staffDetails?.email && <p className="text-xs text-white/50">{g.staffDetails?.email}</p>}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex items-center gap-3">
                        <div className={`rounded-lg px-4 py-2 text-center ${
                          g.grade === 5 ? 'bg-green-500/20' :
                          g.grade === 4 ? 'bg-blue-500/20' :
                          g.grade === 3 ? 'bg-yellow-500/20' :
                          g.grade === 2 ? 'bg-orange-500/20' :
                          'bg-red-500/20'
                        }`}>
                          <p className="text-xs text-white/60">Grade</p>
                          <p className={`text-2xl font-bold ${
                            g.grade === 5 ? 'text-green-400' :
                            g.grade === 4 ? 'text-blue-400' :
                            g.grade === 3 ? 'text-yellow-400' :
                            g.grade === 2 ? 'text-orange-400' :
                            'text-red-400'
                          }`}>{g.grade}</p>
                          <p className={`text-xs font-semibold ${
                            g.grade === 5 ? 'text-green-300' :
                            g.grade === 4 ? 'text-blue-300' :
                            g.grade === 3 ? 'text-yellow-300' :
                            g.grade === 2 ? 'text-orange-300' :
                            'text-red-300'
                          }`}>
                            {getGradeLabel(g.grade)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right text-xs">
                        {g.gradedAt && (
                          <p className="text-white/60">📅 {new Date(g.gradedAt).toLocaleDateString()}</p>
                        )}
                        {g.gradedByName && (
                          <p className="text-white/60">Graded by: {g.gradedByName}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {g.criteria && (
                    <div className="rounded-lg bg-black/30 p-3">
                      <p className="mb-2 text-xs font-semibold text-white/80">Criteria Breakdown:</p>
                      <div className="grid gap-2 text-xs">
                        {typeof g.criteria === 'string' ? (
                          Object.entries(JSON.parse(g.criteria)).map(([k, v]) => (
                            <div key={k} className="flex items-center justify-between">
                              <span className="capitalize text-white/70">{k.replace(/_/g, ' ')}</span>
                              <span className={`font-semibold ${
                                v === 5 ? 'text-green-400' :
                                v === 4 ? 'text-blue-400' :
                                v === 3 ? 'text-yellow-400' :
                                v === 2 ? 'text-orange-400' :
                                'text-red-400'
                              }`}>{v}/5</span>
                            </div>
                          ))
                        ) : (
                          Object.entries(g.criteria).map(([k, v]) => (
                            <div key={k} className="flex items-center justify-between">
                              <span className="capitalize text-white/70">{k.replace(/_/g, ' ')}</span>
                              <span className={`font-semibold ${
                                v === 5 ? 'text-green-400' :
                                v === 4 ? 'text-blue-400' :
                                v === 3 ? 'text-yellow-400' :
                                v === 2 ? 'text-orange-400' :
                                'text-red-400'
                              }`}>{v}/5</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  {g.comment && (
                    <div className="rounded-lg bg-blue-500/10 p-3 text-sm text-blue-200">
                      <p className="font-semibold">Comments:</p>
                      <p className="text-white/80">{g.comment}</p>
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

        {/* Grading Modal */}
        <GradingModal
          isOpen={modalOpen}
          staff={selectedStaff}
          onClose={() => {
            setModalOpen(false);
            setSelectedStaff(null);
            setSelectedGradeRecord(null);
          }}
          onSubmit={handleGradeModalSubmit}
          isLoading={savingId === (selectedStaff?.userId || selectedStaff?.$id)}
          existingGrade={selectedGradeRecord}
        />
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
