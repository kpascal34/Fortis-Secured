import React, { useCallback, useMemo, useState } from 'react';
import AccessDenied from '../../components/AccessDenied.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  exportDashboardSectionCsv,
  getExecutiveDashboard,
} from '../../services/reportingService.js';

const toDateInput = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
};

const defaultRange = () => {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));
  return {
    start: toDateInput(start),
    end: toDateInput(end),
  };
};

const downloadCsv = (fileName, csv) => {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const normalizeCell = (value) => {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'boolean') return value ? 'yes' : 'no';
  return value;
};

const TableSection = ({
  title,
  rows,
  columns,
  onExport,
  onLoadMore,
  hasMore,
  loading,
  error,
  onRetry,
}) => (
  <section className="rounded-xl border border-white/10 bg-white/5 p-5">
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      <button
        type="button"
        onClick={onExport}
        disabled={!rows?.length}
        className="rounded-md border border-white/20 px-3 py-1 text-xs font-semibold text-white hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
      >
        Export CSV
      </button>
    </div>

    {error && (
      <div className="mb-3 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-200">
        <p className="font-semibold">Data Unavailable</p>
        <p className="mt-1">{error}</p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 rounded-md border border-red-300/40 px-3 py-1 text-xs font-semibold text-red-100 hover:bg-red-500/20"
        >
          Retry
        </button>
      </div>
    )}

    {loading && rows.length === 0 && (
      <div className="rounded-lg border border-white/10 p-4 text-center text-sm text-white/60">Loading...</div>
    )}

    {!loading && rows.length === 0 && !error && (
      <div className="rounded-lg border border-white/10 p-4 text-center text-sm text-white/60">No data for selected range.</div>
    )}

    {rows.length > 0 && (
      <div className="overflow-hidden rounded-lg border border-white/10">
        <table className="w-full text-sm">
          <thead className="bg-white/10 text-left text-xs uppercase tracking-wide text-white/60">
            <tr>
              {columns.map((column) => (
                <th key={column.key} className="px-3 py-2">{column.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.$id || row.snapshotId || row.predictionId || `${title}-${index}`} className="border-t border-white/10 text-white">
                {columns.map((column) => (
                  <td key={column.key} className="px-3 py-2">{normalizeCell(row[column.key])}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}

    {hasMore && (
      <button
        type="button"
        onClick={onLoadMore}
        disabled={loading}
        className="mt-3 rounded-md border border-white/20 px-3 py-1 text-xs font-semibold text-white hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? 'Loading...' : 'Load More'}
      </button>
    )}
  </section>
);

const SECTION_CONFIG = {
  marginOverview: {
    title: 'Real-Time Margin Overview',
    columns: [
      { key: 'clientId', label: 'Client' },
      { key: 'siteId', label: 'Site' },
      { key: 'scheduledHours', label: 'Scheduled Hours' },
      { key: 'workedHours', label: 'Worked Hours' },
      { key: 'grossRevenue', label: 'Revenue' },
      { key: 'grossCost', label: 'Cost' },
      { key: 'grossProfit', label: 'Gross Profit' },
      { key: 'grossMarginPct', label: 'Margin %' },
    ],
  },
  activeMarginAlerts: {
    title: 'Active Margin Alerts',
    columns: [
      { key: 'clientId', label: 'Client' },
      { key: 'siteId', label: 'Site' },
      { key: 'alertType', label: 'Alert Type' },
      { key: 'severity', label: 'Severity' },
      { key: 'thresholdValue', label: 'Threshold' },
      { key: 'actualValue', label: 'Actual' },
      { key: 'createdAt', label: 'Created At' },
    ],
  },
  employmentCostDistribution: {
    title: 'PAYE vs SELF_EMPLOYED Cost Distribution',
    columns: [
      { key: 'employmentType', label: 'Employment Type' },
      { key: 'cost', label: 'Cost' },
    ],
  },
  forecastVsActual: {
    title: 'Forecast vs Actual Trend',
    columns: [
      { key: 'clientId', label: 'Client' },
      { key: 'siteId', label: 'Site' },
      { key: 'periodStart', label: 'Period Start' },
      { key: 'periodEnd', label: 'Period End' },
      { key: 'predictedHours', label: 'Predicted Hours' },
      { key: 'actualHours', label: 'Actual Hours' },
      { key: 'predictedRevenue', label: 'Predicted Revenue' },
      { key: 'actualRevenue', label: 'Actual Revenue' },
      { key: 'predictedCost', label: 'Predicted Cost' },
      { key: 'actualCost', label: 'Actual Cost' },
    ],
  },
  slaPerformance: {
    title: 'SLA Performance Summary',
    columns: [
      { key: 'clientId', label: 'Client' },
      { key: 'siteId', label: 'Site' },
      { key: 'scheduledHours', label: 'Scheduled Hours' },
      { key: 'workedHours', label: 'Worked Hours' },
      { key: 'slaRatio', label: 'SLA Ratio' },
      { key: 'slaStatus', label: 'Status' },
    ],
  },
  contractRenewalRisk: {
    title: 'Contract Renewal Risk',
    columns: [
      { key: 'contractId', label: 'Contract' },
      { key: 'clientId', label: 'Client' },
      { key: 'siteId', label: 'Site' },
      { key: 'autoRenew', label: 'Auto Renew' },
      { key: 'renewalNoticeDays', label: 'Notice Days' },
      { key: 'daysToRenewal', label: 'Days To Renewal' },
      { key: 'healthScore', label: 'Health Score' },
      { key: 'riskScore', label: 'Risk Score' },
    ],
  },
  staffingShortageRisk: {
    title: 'Staffing Shortage Risk',
    columns: [
      { key: 'clientId', label: 'Client' },
      { key: 'siteId', label: 'Site' },
      { key: 'date', label: 'Date' },
      { key: 'predictedRequiredGuards', label: 'Required Guards' },
      { key: 'predictedAvailableGuards', label: 'Available Guards' },
      { key: 'shortageRiskScore', label: 'Risk Score' },
    ],
  },
  entityRevenueProfit: {
    title: 'Multi-Entity Revenue / Profit',
    columns: [
      { key: 'entityId', label: 'Entity' },
      { key: 'revenue', label: 'Revenue' },
      { key: 'cost', label: 'Cost' },
      { key: 'grossProfit', label: 'Gross Profit' },
      { key: 'grossMarginPct', label: 'Margin %' },
    ],
  },
  ebitdaProxy: {
    title: 'EBITDA Proxy',
    columns: [
      { key: 'entityId', label: 'Entity' },
      { key: 'ebitdaProxy', label: 'EBITDA Proxy' },
      { key: 'revenue', label: 'Revenue' },
      { key: 'cost', label: 'Cost' },
      { key: 'marginPct', label: 'Margin %' },
    ],
  },
  clientConcentration: {
    title: 'Client Concentration',
    columns: [
      { key: 'entityId', label: 'Entity' },
      { key: 'concentrationPct', label: 'Top 3 Share' },
      { key: 'thresholdPct', label: 'Threshold' },
      { key: 'severity', label: 'Severity' },
      { key: 'createdAt', label: 'Created At' },
    ],
  },
  marginHeatmap: {
    title: 'Margin Heatmap By Site',
    columns: [
      { key: 'entityId', label: 'Entity' },
      { key: 'siteId', label: 'Site' },
      { key: 'revenue', label: 'Revenue' },
      { key: 'grossProfit', label: 'Gross Profit' },
      { key: 'marginPct', label: 'Margin %' },
    ],
  },
  enterpriseRiskScore: {
    title: 'Enterprise Risk Score',
    columns: [
      { key: 'entityId', label: 'Entity' },
      { key: 'riskScore', label: 'Risk Score' },
      { key: 'riskBand', label: 'Risk Band' },
      { key: 'generatedAt', label: 'Generated At' },
    ],
  },
  acquisitionComparison: {
    title: 'Acquisition Scenario Comparison',
    columns: [
      { key: 'entityId', label: 'Entity' },
      { key: 'targetId', label: 'Target' },
      { key: 'scenarioName', label: 'Scenario' },
      { key: 'projectedRevenue', label: 'Projected Revenue' },
      { key: 'projectedCost', label: 'Projected Cost' },
      { key: 'projectedEbitdaProxy', label: 'Projected EBITDA' },
      { key: 'integrationRiskScore', label: 'Integration Risk' },
    ],
  },
  strategicForecast: {
    title: '12–36 Month Strategic Forecast',
    columns: [
      { key: 'entityId', label: 'Entity' },
      { key: 'horizonMonths', label: 'Horizon (months)' },
      { key: 'forecastRevenue', label: 'Forecast Revenue' },
      { key: 'forecastCost', label: 'Forecast Cost' },
      { key: 'forecastEbitdaProxy', label: 'Forecast EBITDA' },
      { key: 'generatedAt', label: 'Generated At' },
    ],
  },
  tenderPricingSensitivity: {
    title: 'Tender Pricing Sensitivity',
    columns: [
      { key: 'entityId', label: 'Entity' },
      { key: 'effectiveCostRate', label: 'Cost Rate' },
      { key: 'riskFactor', label: 'Risk Factor' },
      { key: 'targetMarginPct', label: 'Target Margin' },
      { key: 'recommendedHourlyRate', label: 'Recommended Rate' },
      { key: 'predictedWinProbability', label: 'Win Probability' },
      { key: 'generatedAt', label: 'Generated At' },
    ],
  },
};

const EMPTY_SECTION = {
  rows: [],
  total: 0,
  nextCursor: null,
  error: '',
};

const newDashboardState = () => ({
  marginOverview: { ...EMPTY_SECTION },
  activeMarginAlerts: { ...EMPTY_SECTION },
  employmentCostDistribution: { ...EMPTY_SECTION },
  forecastVsActual: { ...EMPTY_SECTION },
  slaPerformance: { ...EMPTY_SECTION },
  contractRenewalRisk: { ...EMPTY_SECTION },
  staffingShortageRisk: { ...EMPTY_SECTION },
  entityRevenueProfit: { ...EMPTY_SECTION },
  ebitdaProxy: { ...EMPTY_SECTION },
  clientConcentration: { ...EMPTY_SECTION },
  marginHeatmap: { ...EMPTY_SECTION },
  enterpriseRiskScore: { ...EMPTY_SECTION },
  acquisitionComparison: { ...EMPTY_SECTION },
  strategicForecast: { ...EMPTY_SECTION },
  tenderPricingSensitivity: { ...EMPTY_SECTION },
});

const Reports = () => {
  const { user, resolvedRole } = useAuth();
  const initialRange = defaultRange();

  const [rangeStart, setRangeStart] = useState(initialRange.start);
  const [rangeEnd, setRangeEnd] = useState(initialRange.end);
  const [loading, setLoading] = useState(false);
  const [globalError, setGlobalError] = useState('');
  const [dashboard, setDashboard] = useState(newDashboardState);

  const isAdmin = useMemo(() => {
    const role = String(resolvedRole || user?.role || '').toLowerCase();
    return role === 'admin' || role === 'entity_admin';
  }, [resolvedRole, user?.role]);

  const load = useCallback(async ({ section = null, reset = false } = {}) => {
    setLoading(true);
    setGlobalError('');

    try {
      if (!section) {
        const result = await getExecutiveDashboard({
          rangeStart: `${rangeStart}T00:00:00.000Z`,
          rangeEnd: `${rangeEnd}T23:59:59.999Z`,
          limit: 20,
          cursors: {
            marginOverview: null,
            activeMarginAlerts: null,
            employmentCostDistribution: null,
            forecastVsActual: null,
            slaPerformance: null,
            contractRenewalRisk: null,
            staffingShortageRisk: null,
            entityRevenueProfit: null,
            ebitdaProxy: null,
            clientConcentration: null,
            marginHeatmap: null,
            enterpriseRiskScore: null,
            acquisitionComparison: null,
            strategicForecast: null,
            tenderPricingSensitivity: null,
          },
        });

        const next = newDashboardState();
        for (const [key, value] of Object.entries(result)) {
          next[key] = {
            rows: value.rows || [],
            total: value.total || 0,
            nextCursor: value.nextCursor || null,
            error: '',
          };
        }

        setDashboard(next);
      } else {
        const current = dashboard[section] || { ...EMPTY_SECTION };

        const result = await getExecutiveDashboard({
          rangeStart: `${rangeStart}T00:00:00.000Z`,
          rangeEnd: `${rangeEnd}T23:59:59.999Z`,
          limit: 20,
          section,
          cursors: { [section]: reset ? null : current.nextCursor || null },
        });

        const sectionResult = result[section] || EMPTY_SECTION;

        setDashboard((prev) => ({
          ...prev,
          [section]: {
            rows: reset ? (sectionResult.rows || []) : [...(prev[section]?.rows || []), ...(sectionResult.rows || [])],
            total: sectionResult.total || prev[section]?.total || 0,
            nextCursor: sectionResult.nextCursor || null,
            error: '',
          },
        }));
      }
    } catch (error) {
      const message = error?.message || 'Unable to load executive dashboard.';
      if (!section || reset) {
        setGlobalError(message);
        setDashboard((prev) => {
          const next = { ...prev };
          for (const key of Object.keys(next)) {
            next[key] = {
              ...next[key],
              error: next[key].error || message,
            };
          }
          return next;
        });
      } else {
        setDashboard((prev) => ({
          ...prev,
          [section]: {
            ...prev[section],
            error: message,
          },
        }));
      }
    } finally {
      setLoading(false);
    }
  }, [dashboard, rangeEnd, rangeStart]);

  React.useEffect(() => {
    if (!isAdmin) return;
    load({ reset: true });
  }, [rangeStart, rangeEnd, isAdmin]);

  const exportSection = (key) => {
    const rows = dashboard[key]?.rows || [];
    if (!rows.length) return;
    const csv = exportDashboardSectionCsv(rows);
    downloadCsv(`${key}_${rangeStart}_${rangeEnd}.csv`, csv);
  };

  if (!isAdmin) {
    return (
      <AccessDenied
        title="Access denied"
        message="Executive dashboard is available to admin users only."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Executive Dashboard</h1>
        <p className="mt-2 text-sm text-white/70">
          Real-time margin, forecasts, SLA, contract risk, and staffing shortage intelligence.
        </p>
      </div>

      {globalError && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
          <p className="font-semibold">Data Unavailable</p>
          <p className="mt-1">{globalError}</p>
          <button
            type="button"
            onClick={() => load({ reset: true })}
            className="mt-3 rounded-md border border-red-300/40 px-3 py-1 text-xs font-semibold text-red-100 hover:bg-red-500/20"
          >
            Retry
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 rounded-xl border border-white/10 bg-white/5 p-4 md:grid-cols-3">
        <label className="text-sm text-white/80">
          <span className="mb-1 block text-xs uppercase tracking-wide text-white/60">Range Start</span>
          <input
            type="date"
            value={rangeStart}
            onChange={(event) => setRangeStart(event.target.value)}
            className="w-full rounded-lg border border-white/20 bg-night-sky px-3 py-2 text-white"
          />
        </label>
        <label className="text-sm text-white/80">
          <span className="mb-1 block text-xs uppercase tracking-wide text-white/60">Range End</span>
          <input
            type="date"
            value={rangeEnd}
            onChange={(event) => setRangeEnd(event.target.value)}
            className="w-full rounded-lg border border-white/20 bg-night-sky px-3 py-2 text-white"
          />
        </label>
        <button
          type="button"
          onClick={() => load({ reset: true })}
          disabled={loading}
          className="self-end rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-night-sky hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Refreshing...' : 'Refresh Dashboard'}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {Object.entries(SECTION_CONFIG).map(([key, config]) => (
          <TableSection
            key={key}
            title={config.title}
            rows={dashboard[key]?.rows || []}
            columns={config.columns}
            onExport={() => exportSection(key)}
            onLoadMore={() => load({ section: key, reset: false })}
            hasMore={Boolean(dashboard[key]?.nextCursor)}
            loading={loading}
            error={dashboard[key]?.error || ''}
            onRetry={() => load({ section: key, reset: true })}
          />
        ))}
      </div>
    </div>
  );
};

export default Reports;
