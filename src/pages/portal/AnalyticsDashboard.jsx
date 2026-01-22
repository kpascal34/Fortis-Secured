import React, { useEffect, useState } from 'react';
import PortalHeader from '../../components/PortalHeader.jsx';
import GlassPanel from '../../components/GlassPanel.jsx';
import { getCompositeAnalytics } from '../../services/analyticsService.js';

const Bar = ({ label, value, max = 100, color = 'bg-accent' }) => {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-white/70">
        <span>{label}</span>
        <span className="font-semibold text-white">{value}</span>
      </div>
      <div className="h-2 rounded-full bg-white/10">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
};

const AnalyticsDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const result = await getCompositeAnalytics();
        setData(result);
      } catch (err) {
        setError(err.message || 'Failed to load analytics');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-dark via-night-sky to-night-sky px-4 py-8 text-white">
      <div className="mx-auto max-w-6xl">
        <PortalHeader
          eyebrow="Insights"
          title="Staffing & Compliance Analytics"
          description="At-a-glance metrics for staffing levels, compliance progress, and shift coverage."
        />

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>
        )}

        {loading ? (
          <div className="mt-10 text-center text-white/60">Loading analytics…</div>
        ) : data ? (
          <div className="grid gap-6 md:grid-cols-3">
            {/* Staffing */}
            <GlassPanel className="border-white/10 bg-white/5 p-5">
              <p className="text-xs uppercase tracking-wide text-white/50">Staffing</p>
              <p className="mt-1 text-3xl font-bold text-white">{data.staffing.total}</p>
              <p className="text-sm text-white/60">Total staff</p>
              <div className="mt-4 space-y-3">
                <Bar label="Active" value={data.staffing.active} max={data.staffing.total || 1} color="bg-green-500" />
                <Bar label="Inactive" value={data.staffing.inactive} max={data.staffing.total || 1} color="bg-yellow-500" />
              </div>
            </GlassPanel>

            {/* Compliance */}
            <GlassPanel className="border-white/10 bg-white/5 p-5">
              <p className="text-xs uppercase tracking-wide text-white/50">Compliance</p>
              <p className="mt-1 text-3xl font-bold text-white">{data.compliance.completionRate}%</p>
              <p className="text-sm text-white/60">Completion rate</p>
              <div className="mt-4 space-y-3">
                <Bar label="Approved" value={data.compliance.approved} max={data.compliance.total || 1} color="bg-green-500" />
                <Bar label="In Progress" value={data.compliance.inProgress} max={data.compliance.total || 1} color="bg-blue-500" />
                <Bar label="Rejected" value={data.compliance.rejected} max={data.compliance.total || 1} color="bg-red-500" />
              </div>
            </GlassPanel>

            {/* Shifts */}
            <GlassPanel className="border-white/10 bg-white/5 p-5">
              <p className="text-xs uppercase tracking-wide text-white/50">Shift Coverage</p>
              <p className="mt-1 text-3xl font-bold text-white">{data.shifts.coverageRate}%</p>
              <p className="text-sm text-white/60">Coverage rate</p>
              <div className="mt-4 space-y-3">
                <Bar label="Scheduled" value={data.shifts.scheduled} max={data.shifts.total || 1} color="bg-green-500" />
                <Bar label="Open" value={data.shifts.open} max={data.shifts.total || 1} color="bg-yellow-500" />
                <Bar label="Completed" value={data.shifts.completed} max={data.shifts.total || 1} color="bg-blue-500" />
              </div>
            </GlassPanel>
          </div>
        ) : (
          <div className="mt-10 text-center text-white/60">No analytics data available.</div>
        )}
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
