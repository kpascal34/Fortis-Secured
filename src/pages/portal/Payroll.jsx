import React, { useCallback, useState } from 'react';
import {
  createPayrollExport,
  listPayrollExports,
} from '../../services/payrollExportService.js';
import {
  createBillingExport,
  listBillingExports,
} from '../../services/billingExportService.js';
import {
  approveFinanceEvent,
  listFinanceEvents,
} from '../../services/financeIntegrationService.js';

const toDateInput = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
};

const currentMonthRange = () => {
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

const ExportPanel = ({
  title,
  description,
  runLabel,
  running,
  onRun,
  preview,
  records,
  loadMore,
  hasMore,
  loadingRecords,
}) => (
  <section className="rounded-xl border border-white/10 bg-white/5 p-5">
    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
      <div>
        <h2 className="text-xl font-semibold text-white">{title}</h2>
        <p className="text-sm text-white/70">{description}</p>
      </div>
      <button
        type="button"
        onClick={onRun}
        disabled={running}
        className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-night-sky hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {running ? 'Running...' : runLabel}
      </button>
    </div>

    {preview && (
      <div className="mt-4 rounded-lg border border-white/10 bg-night-sky p-3">
        <p className="mb-2 text-xs uppercase tracking-wide text-white/60">Latest CSV Preview</p>
        <pre className="max-h-48 overflow-auto text-xs text-white/80">{preview}</pre>
      </div>
    )}

    <div className="mt-4">
      <p className="mb-2 text-xs uppercase tracking-wide text-white/60">Recent Runs</p>
      {loadingRecords && records.length === 0 && (
        <div className="rounded-lg border border-white/10 p-4 text-center text-sm text-white/60">Loading recent runs...</div>
      )}
      {!loadingRecords && records.length === 0 && (
        <div className="rounded-lg border border-white/10 p-4 text-center text-sm text-white/60">No runs yet.</div>
      )}
      {records.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-white/10 text-left text-xs uppercase tracking-wide text-white/60">
              <tr>
                <th className="px-3 py-2">Run ID</th>
                <th className="px-3 py-2">Range</th>
                <th className="px-3 py-2">Created</th>
              </tr>
            </thead>
            <tbody>
              {records.map((row) => (
                <tr key={row.$id} className="border-t border-white/10 text-white">
                  <td className="px-3 py-2">{row.$id}</td>
                  <td className="px-3 py-2">{toDateInput(row.rangeStart)} - {toDateInput(row.rangeEnd)}</td>
                  <td className="px-3 py-2">{new Date(row.createdAt).toLocaleString('en-GB')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {hasMore && (
        <button
          type="button"
          onClick={loadMore}
          disabled={loadingRecords}
          className="mt-3 rounded-md border border-white/20 px-3 py-1 text-xs font-semibold text-white hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loadingRecords ? 'Loading...' : 'Load More'}
        </button>
      )}
    </div>
  </section>
);

const Payroll = () => {
  const initialRange = currentMonthRange();

  const [rangeStart, setRangeStart] = useState(initialRange.start);
  const [rangeEnd, setRangeEnd] = useState(initialRange.end);

  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const [payrollPreview, setPayrollPreview] = useState('');
  const [billingPreview, setBillingPreview] = useState('');

  const [runningPayroll, setRunningPayroll] = useState(false);
  const [runningBilling, setRunningBilling] = useState(false);

  const [payrollRuns, setPayrollRuns] = useState([]);
  const [payrollCursor, setPayrollCursor] = useState(null);
  const [payrollHasMore, setPayrollHasMore] = useState(true);
  const [loadingPayrollRuns, setLoadingPayrollRuns] = useState(false);

  const [billingRuns, setBillingRuns] = useState([]);
  const [billingCursor, setBillingCursor] = useState(null);
  const [billingHasMore, setBillingHasMore] = useState(true);
  const [loadingBillingRuns, setLoadingBillingRuns] = useState(false);

  const [financeEvents, setFinanceEvents] = useState([]);
  const [financeCursor, setFinanceCursor] = useState(null);
  const [financeHasMore, setFinanceHasMore] = useState(true);
  const [loadingFinanceEvents, setLoadingFinanceEvents] = useState(false);

  const loadPayrollRuns = useCallback(async ({ reset = false } = {}) => {
    setLoadingPayrollRuns(true);
    try {
      const response = await listPayrollExports({
        limit: 10,
        cursor: reset ? null : payrollCursor,
      });
      setPayrollRuns((prev) => (reset ? response.documents : [...prev, ...response.documents]));
      setPayrollCursor(response.nextCursor || null);
      setPayrollHasMore(Boolean(response.nextCursor));
    } catch (loadError) {
      setError(loadError.message || 'Unable to load payroll export history.');
    } finally {
      setLoadingPayrollRuns(false);
    }
  }, [payrollCursor]);

  const loadBillingRuns = useCallback(async ({ reset = false } = {}) => {
    setLoadingBillingRuns(true);
    try {
      const response = await listBillingExports({
        limit: 10,
        cursor: reset ? null : billingCursor,
      });
      setBillingRuns((prev) => (reset ? response.documents : [...prev, ...response.documents]));
      setBillingCursor(response.nextCursor || null);
      setBillingHasMore(Boolean(response.nextCursor));
    } catch (loadError) {
      setError(loadError.message || 'Unable to load billing export history.');
    } finally {
      setLoadingBillingRuns(false);
    }
  }, [billingCursor]);

  const loadFinanceEvents = useCallback(async ({ reset = false } = {}) => {
    setLoadingFinanceEvents(true);
    try {
      const response = await listFinanceEvents({
        limit: 10,
        cursor: reset ? null : financeCursor,
      });
      setFinanceEvents((prev) => (reset ? response.documents : [...prev, ...response.documents]));
      setFinanceCursor(response.nextCursor || null);
      setFinanceHasMore(Boolean(response.nextCursor));
    } catch (loadError) {
      setError(loadError.message || 'Unable to load finance integration events.');
    } finally {
      setLoadingFinanceEvents(false);
    }
  }, [financeCursor]);

  React.useEffect(() => {
    loadPayrollRuns({ reset: true });
    loadBillingRuns({ reset: true });
    loadFinanceEvents({ reset: true });
  }, []);

  React.useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(''), 4500);
    return () => clearTimeout(timer);
  }, [toast]);

  const runPayroll = async () => {
    setRunningPayroll(true);
    setError('');
    setToast('');

    try {
      const result = await createPayrollExport({
        rangeStart: `${rangeStart}T00:00:00.000Z`,
        rangeEnd: `${rangeEnd}T23:59:59.999Z`,
      });
      setPayrollPreview(result.csv.slice(0, 4000));
      downloadCsv(result.fileName, result.csv);
      setToast(`Payroll CSV generated (${result.rows.length} rows).${result.financeEvent ? ' Finance event queued.' : ''}`);
      await loadPayrollRuns({ reset: true });
      await loadFinanceEvents({ reset: true });
    } catch (runError) {
      setError(runError.message || 'Payroll export failed.');
    } finally {
      setRunningPayroll(false);
    }
  };

  const runBilling = async () => {
    setRunningBilling(true);
    setError('');
    setToast('');

    try {
      const result = await createBillingExport({
        rangeStart: `${rangeStart}T00:00:00.000Z`,
        rangeEnd: `${rangeEnd}T23:59:59.999Z`,
      });
      setBillingPreview(result.csv.slice(0, 4000));
      downloadCsv(result.fileName, result.csv);
      setToast(`Billing CSV generated (${result.rows.length} lines).${result.financeEvent ? ' Finance event queued.' : ''}`);
      await loadBillingRuns({ reset: true });
      await loadFinanceEvents({ reset: true });
    } catch (runError) {
      setError(runError.message || 'Billing export failed.');
    } finally {
      setRunningBilling(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Exports</h1>
        <p className="mt-2 text-sm text-white/70">Generate payroll and billing CSV outputs from approved/locked timesheet data.</p>
      </div>

      {toast && (
        <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-200">{toast}</div>
      )}

      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
          <p className="font-semibold">Data Unavailable</p>
          <p className="mt-1">{error}</p>
          <button
            type="button"
            onClick={() => {
              setError('');
              loadPayrollRuns({ reset: true });
              loadBillingRuns({ reset: true });
              loadFinanceEvents({ reset: true });
            }}
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
          onClick={() => {
            const next = currentMonthRange();
            setRangeStart(next.start);
            setRangeEnd(next.end);
          }}
          className="self-end rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
        >
          Use Current Month
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <ExportPanel
          title="Payroll Export"
          description="Source: approved/locked timesheets grouped per guard per week."
          runLabel="Run Payroll CSV"
          running={runningPayroll}
          onRun={runPayroll}
          preview={payrollPreview}
          records={payrollRuns}
          loadMore={() => loadPayrollRuns({ reset: false })}
          hasMore={payrollHasMore}
          loadingRecords={loadingPayrollRuns}
        />

        <ExportPanel
          title="Billing Export"
          description="Source: approved timesheet entries, priced by rate-card precedence."
          runLabel="Run Billing CSV"
          running={runningBilling}
          onRun={runBilling}
          preview={billingPreview}
          records={billingRuns}
          loadMore={() => loadBillingRuns({ reset: false })}
          hasMore={billingHasMore}
          loadingRecords={loadingBillingRuns}
        />
      </div>

      <section className="rounded-xl border border-white/10 bg-white/5 p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-white">Finance Integration Events</h2>
            <p className="text-sm text-white/70">Review pending finance payload events before provider send.</p>
          </div>
          <button
            type="button"
            onClick={() => loadFinanceEvents({ reset: true })}
            className="rounded-md border border-white/20 px-3 py-1 text-xs font-semibold text-white hover:bg-white/10"
          >
            Refresh
          </button>
        </div>

        {loadingFinanceEvents && financeEvents.length === 0 && (
          <div className="rounded-lg border border-white/10 p-4 text-center text-sm text-white/60">Loading finance events...</div>
        )}

        {!loadingFinanceEvents && financeEvents.length === 0 && (
          <div className="rounded-lg border border-white/10 p-4 text-center text-sm text-white/60">No finance events yet.</div>
        )}

        {financeEvents.length > 0 && (
          <div className="overflow-hidden rounded-lg border border-white/10">
            <table className="w-full text-sm">
              <thead className="bg-white/10 text-left text-xs uppercase tracking-wide text-white/60">
                <tr>
                  <th className="px-3 py-2">Event</th>
                  <th className="px-3 py-2">Provider</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Reference</th>
                  <th className="px-3 py-2">Created</th>
                  <th className="px-3 py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {financeEvents.map((event) => (
                  <tr key={event.$id} className="border-t border-white/10 text-white">
                    <td className="px-3 py-2">{event.eventType}</td>
                    <td className="px-3 py-2">{event.provider}</td>
                    <td className="px-3 py-2">{event.status}</td>
                    <td className="px-3 py-2">{event.referenceId}</td>
                    <td className="px-3 py-2">{new Date(event.createdAt).toLocaleString('en-GB')}</td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        disabled={!['pending', 'failed'].includes(String(event.status || ''))}
                        onClick={async () => {
                          setError('');
                          try {
                            const result = await approveFinanceEvent(event.$id, { send: true });
                            setToast(
                              result.previewOnly
                                ? 'Finance event approved in preview mode (integration disabled).'
                                : 'Finance event marked as sent.'
                            );
                            await loadFinanceEvents({ reset: true });
                          } catch (approveError) {
                            setError(approveError.message || 'Failed to approve finance event.');
                          }
                        }}
                        className="rounded-md border border-white/20 px-2 py-1 text-xs font-semibold text-white hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Approve
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {financeHasMore && (
          <button
            type="button"
            onClick={() => loadFinanceEvents({ reset: false })}
            disabled={loadingFinanceEvents}
            className="mt-3 rounded-md border border-white/20 px-3 py-1 text-xs font-semibold text-white hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loadingFinanceEvents ? 'Loading...' : 'Load More'}
          </button>
        )}
      </section>
    </div>
  );
};

export default Payroll;
