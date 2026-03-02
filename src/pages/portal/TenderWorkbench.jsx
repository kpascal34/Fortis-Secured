import React, { useCallback, useMemo, useState } from 'react';
import AccessDenied from '../../components/AccessDenied.jsx';
import AdminDataTable from '../../components/AdminDataTable.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { listTenderPricingDashboard } from '../../services/phase8OpsService.js';
import { createTenderModel } from '../../services/tenderPricingService.js';
import { createTenderWinModel } from '../../services/tenderWinService.js';

const pricingColumns = [
  { key: 'entityId', label: 'Entity' },
  { key: 'effectiveCostRate', label: 'Cost Rate' },
  { key: 'riskFactor', label: 'Risk Factor' },
  { key: 'targetMarginPct', label: 'Target Margin' },
  { key: 'recommendedHourlyRate', label: 'Recommended Rate' },
  { key: 'generatedAt', label: 'Generated At' },
];

const winColumns = [
  { key: 'entityId', label: 'Entity' },
  { key: 'region', label: 'Region' },
  { key: 'sector', label: 'Sector' },
  { key: 'proposedRate', label: 'Proposed Rate' },
  { key: 'competitivenessScore', label: 'Competitiveness' },
  { key: 'experienceScore', label: 'Experience' },
  { key: 'riskPremiumScore', label: 'Risk Premium' },
  { key: 'predictedWinProbability', label: 'Win Probability' },
  { key: 'generatedAt', label: 'Generated At' },
];

const defaultPricingForm = {
  entityId: '',
  clientId: '',
  siteId: '',
  effectiveCostRate: '',
  riskFactor: '0.2',
  targetMarginPct: '0.25',
};

const defaultWinForm = {
  entityId: '',
  region: '',
  sector: '',
  proposedRate: '',
  competitivenessScore: '0.6',
  experienceScore: '0.6',
  riskPremiumScore: '0.2',
};

const TenderWorkbench = () => {
  const { user, resolvedRole } = useAuth();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [pricingRows, setPricingRows] = useState([]);
  const [winRows, setWinRows] = useState([]);
  const [pricingForm, setPricingForm] = useState(defaultPricingForm);
  const [winForm, setWinForm] = useState(defaultWinForm);

  const isAdminLike = useMemo(() => {
    const role = String(resolvedRole || user?.role || '').toLowerCase();
    return role === 'admin' || role === 'entity_admin';
  }, [resolvedRole, user?.role]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const result = await listTenderPricingDashboard({ limit: 25 });
      setPricingRows(result.pricing?.documents || []);
      setWinRows(result.win?.documents || []);
    } catch (err) {
      setError(err?.message || 'Failed to load tender workbench data.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (!isAdminLike) return;
    load();
  }, [isAdminLike]);

  const submitPricing = async (event) => {
    event.preventDefault();
    setMessage('');
    setError('');

    try {
      await createTenderModel({
        entityId: pricingForm.entityId,
        clientId: pricingForm.clientId || null,
        siteId: pricingForm.siteId || null,
        effectiveCostRate: Number(pricingForm.effectiveCostRate),
        riskFactor: Number(pricingForm.riskFactor),
        targetMarginPct: Number(pricingForm.targetMarginPct),
      });
      setMessage('Tender pricing snapshot created.');
      setPricingForm(defaultPricingForm);
      await load();
    } catch (err) {
      setError(err?.message || 'Failed to create tender pricing snapshot.');
    }
  };

  const submitWin = async (event) => {
    event.preventDefault();
    setMessage('');
    setError('');

    try {
      await createTenderWinModel({
        entityId: winForm.entityId,
        region: winForm.region,
        sector: winForm.sector,
        proposedRate: Number(winForm.proposedRate),
        competitivenessScore: Number(winForm.competitivenessScore),
        experienceScore: Number(winForm.experienceScore),
        riskPremiumScore: Number(winForm.riskPremiumScore),
      });
      setMessage('Tender win-probability snapshot created.');
      setWinForm(defaultWinForm);
      await load();
    } catch (err) {
      setError(err?.message || 'Failed to create tender win-probability snapshot.');
    }
  };

  if (!isAdminLike) {
    return <AccessDenied title="Access denied" message="Tender workbench is restricted to admin users." />;
  }

  return (
    <div className="space-y-6">
      {message ? <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-200">{message}</div> : null}
      {error ? <div className="rounded-md border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">{error}</div> : null}

      <section className="grid gap-6 lg:grid-cols-2">
        <form onSubmit={submitPricing} className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-3">
          <h2 className="text-lg font-semibold text-white">Tender Pricing Calculator</h2>
          <p className="text-sm text-white/70">Formula: (effectiveCostRate * (1 + riskFactor)) / (1 - targetMarginPct)</p>
          <input className="w-full rounded bg-white/10 p-2 text-white" placeholder="Entity ID" value={pricingForm.entityId} onChange={(e) => setPricingForm((prev) => ({ ...prev, entityId: e.target.value }))} required />
          <input className="w-full rounded bg-white/10 p-2 text-white" placeholder="Client ID (optional)" value={pricingForm.clientId} onChange={(e) => setPricingForm((prev) => ({ ...prev, clientId: e.target.value }))} />
          <input className="w-full rounded bg-white/10 p-2 text-white" placeholder="Site ID (optional)" value={pricingForm.siteId} onChange={(e) => setPricingForm((prev) => ({ ...prev, siteId: e.target.value }))} />
          <input className="w-full rounded bg-white/10 p-2 text-white" type="number" step="0.01" placeholder="Effective Cost Rate" value={pricingForm.effectiveCostRate} onChange={(e) => setPricingForm((prev) => ({ ...prev, effectiveCostRate: e.target.value }))} required />
          <input className="w-full rounded bg-white/10 p-2 text-white" type="number" step="0.01" placeholder="Risk Factor" value={pricingForm.riskFactor} onChange={(e) => setPricingForm((prev) => ({ ...prev, riskFactor: e.target.value }))} required />
          <input className="w-full rounded bg-white/10 p-2 text-white" type="number" step="0.01" placeholder="Target Margin (0-1)" value={pricingForm.targetMarginPct} onChange={(e) => setPricingForm((prev) => ({ ...prev, targetMarginPct: e.target.value }))} required />
          <button type="submit" className="rounded bg-accent px-4 py-2 text-sm font-semibold text-night-sky hover:bg-accent/90">Create Pricing Snapshot</button>
        </form>

        <form onSubmit={submitWin} className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-3">
          <h2 className="text-lg font-semibold text-white">Tender Win Probability Tool</h2>
          <p className="text-sm text-white/70">Deterministic model for bid/no-bid support.</p>
          <input className="w-full rounded bg-white/10 p-2 text-white" placeholder="Entity ID" value={winForm.entityId} onChange={(e) => setWinForm((prev) => ({ ...prev, entityId: e.target.value }))} required />
          <input className="w-full rounded bg-white/10 p-2 text-white" placeholder="Region" value={winForm.region} onChange={(e) => setWinForm((prev) => ({ ...prev, region: e.target.value }))} required />
          <input className="w-full rounded bg-white/10 p-2 text-white" placeholder="Sector" value={winForm.sector} onChange={(e) => setWinForm((prev) => ({ ...prev, sector: e.target.value }))} required />
          <input className="w-full rounded bg-white/10 p-2 text-white" type="number" step="0.01" placeholder="Proposed Rate" value={winForm.proposedRate} onChange={(e) => setWinForm((prev) => ({ ...prev, proposedRate: e.target.value }))} required />
          <input className="w-full rounded bg-white/10 p-2 text-white" type="number" min="0" max="1" step="0.01" placeholder="Competitiveness Score" value={winForm.competitivenessScore} onChange={(e) => setWinForm((prev) => ({ ...prev, competitivenessScore: e.target.value }))} required />
          <input className="w-full rounded bg-white/10 p-2 text-white" type="number" min="0" max="1" step="0.01" placeholder="Experience Score" value={winForm.experienceScore} onChange={(e) => setWinForm((prev) => ({ ...prev, experienceScore: e.target.value }))} required />
          <input className="w-full rounded bg-white/10 p-2 text-white" type="number" min="0" max="1" step="0.01" placeholder="Risk Premium Score" value={winForm.riskPremiumScore} onChange={(e) => setWinForm((prev) => ({ ...prev, riskPremiumScore: e.target.value }))} required />
          <button type="submit" className="rounded bg-accent px-4 py-2 text-sm font-semibold text-night-sky hover:bg-accent/90">Create Win Snapshot</button>
        </form>
      </section>

      <AdminDataTable
        title="Tender Pricing Snapshots"
        columns={pricingColumns}
        rows={pricingRows}
        loading={loading}
        error={error}
        hasMore={false}
        onRetry={load}
      />

      <AdminDataTable
        title="Tender Win Snapshots"
        columns={winColumns}
        rows={winRows}
        loading={loading}
        error={error}
        hasMore={false}
        onRetry={load}
      />
    </div>
  );
};

export default TenderWorkbench;
