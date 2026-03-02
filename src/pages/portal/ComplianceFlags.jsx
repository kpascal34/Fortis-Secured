import React, { useCallback, useState } from 'react';
import {
  listComplianceFlags,
  runComplianceScan,
  updateComplianceFlagStatus,
} from '../../services/complianceEngineService.js';

const PAGE_SIZE = 20;

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const tone = (severity) => {
  switch (String(severity || '').toLowerCase()) {
    case 'critical':
      return 'bg-red-500/20 text-red-300 border border-red-400/40';
    case 'warning':
      return 'bg-amber-500/20 text-amber-300 border border-amber-400/40';
    case 'info':
      return 'bg-blue-500/20 text-blue-300 border border-blue-400/40';
    default:
      return 'bg-white/10 text-white border border-white/20';
  }
};

const ComplianceFlags = () => {
  const [records, setRecords] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [processingId, setProcessingId] = useState('');
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [filters, setFilters] = useState({ status: 'open', severity: '', type: '', clientId: '', siteId: '' });

  const load = useCallback(async ({ reset = false } = {}) => {
    setLoading(true);
    setError('');

    try {
      const response = await listComplianceFlags({
        filters: {
          status: filters.status || null,
          severity: filters.severity || null,
          type: filters.type || null,
          clientId: filters.clientId || null,
          siteId: filters.siteId || null,
        },
        limit: PAGE_SIZE,
        cursor: reset ? null : cursor,
      });

      setRecords((prev) => (reset ? response.documents : [...prev, ...response.documents]));
      setCursor(response.nextCursor || null);
      setHasMore(Boolean(response.nextCursor));
    } catch (loadError) {
      setError(loadError.message || 'Failed to load compliance flags.');
    } finally {
      setLoading(false);
    }
  }, [cursor, filters.clientId, filters.severity, filters.siteId, filters.status, filters.type]);

  React.useEffect(() => {
    setCursor(null);
    setHasMore(true);
    load({ reset: true });
  }, [filters.status, filters.severity, filters.type, filters.clientId, filters.siteId]);

  React.useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(''), 4500);
    return () => clearTimeout(timer);
  }, [toast]);

  const handleRunScan = async () => {
    setScanning(true);
    setError('');
    setToast('');

    try {
      const summary = await runComplianceScan({ dryRun: false });
      setToast(`Scan complete: ${summary.created} created, ${summary.updated} updated, ${summary.resolved} resolved.`);
      await load({ reset: true });
    } catch (scanError) {
      setError(scanError.message || 'Compliance scan failed.');
    } finally {
      setScanning(false);
    }
  };

  const handleChangeStatus = async (flagId, status) => {
    setProcessingId(flagId);
    setError('');
    setToast('');

    try {
      await updateComplianceFlagStatus(flagId, { status });
      setToast(`Flag marked as ${status}.`);
      await load({ reset: true });
    } catch (updateError) {
      setError(updateError.message || 'Unable to update flag status.');
    } finally {
      setProcessingId('');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Compliance Flags</h1>
          <p className="mt-2 text-sm text-white/70">Open compliance risks with tenant scope, reminder automation, and resolution actions.</p>
        </div>
        <button
          type="button"
          onClick={handleRunScan}
          disabled={scanning}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-night-sky hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {scanning ? 'Scanning...' : 'Run Compliance Scan'}
        </button>
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
            onClick={() => load({ reset: true })}
            className="mt-3 rounded-md border border-red-300/40 px-3 py-1 text-xs font-semibold text-red-100 hover:bg-red-500/20"
          >
            Retry
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 rounded-xl border border-white/10 bg-white/5 p-4 md:grid-cols-6">
        <select
          value={filters.status}
          onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))}
          className="rounded-lg border border-white/20 bg-night-sky px-3 py-2 text-sm text-white"
        >
          <option value="">All status</option>
          <option value="open">open</option>
          <option value="resolved">resolved</option>
          <option value="dismissed">dismissed</option>
        </select>
        <select
          value={filters.severity}
          onChange={(event) => setFilters((prev) => ({ ...prev, severity: event.target.value }))}
          className="rounded-lg border border-white/20 bg-night-sky px-3 py-2 text-sm text-white"
        >
          <option value="">All severity</option>
          <option value="critical">critical</option>
          <option value="warning">warning</option>
          <option value="info">info</option>
        </select>
        <select
          value={filters.type}
          onChange={(event) => setFilters((prev) => ({ ...prev, type: event.target.value }))}
          className="rounded-lg border border-white/20 bg-night-sky px-3 py-2 text-sm text-white"
        >
          <option value="">All type</option>
          <option value="sia">sia</option>
          <option value="id">id</option>
          <option value="right_to_work">right_to_work</option>
          <option value="dbs">dbs</option>
          <option value="other">other</option>
        </select>
        <input
          placeholder="Client ID"
          value={filters.clientId}
          onChange={(event) => setFilters((prev) => ({ ...prev, clientId: event.target.value }))}
          className="rounded-lg border border-white/20 bg-night-sky px-3 py-2 text-sm text-white"
        />
        <input
          placeholder="Site ID"
          value={filters.siteId}
          onChange={(event) => setFilters((prev) => ({ ...prev, siteId: event.target.value }))}
          className="rounded-lg border border-white/20 bg-night-sky px-3 py-2 text-sm text-white"
        />
        <button
          type="button"
          onClick={() => load({ reset: true })}
          className="rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
        >
          Apply
        </button>
      </div>

      {loading && records.length === 0 && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center text-white/70">Loading compliance flags...</div>
      )}

      {!loading && records.length === 0 && !error && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center text-white/70">No flags found.</div>
      )}

      {records.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-white/10 bg-white/5">
          <table className="w-full text-sm">
            <thead className="bg-white/10 text-left text-xs uppercase tracking-wide text-white/60">
              <tr>
                <th className="px-4 py-3">Due</th>
                <th className="px-4 py-3">Guard</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Severity</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {records.map((flag) => (
                <tr key={flag.$id} className="border-t border-white/10 text-white">
                  <td className="px-4 py-3">{formatDate(flag.dueAt)}</td>
                  <td className="px-4 py-3">{flag.guardId}</td>
                  <td className="px-4 py-3">{flag.type}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${tone(flag.severity)}`}>
                      {flag.severity}
                    </span>
                  </td>
                  <td className="px-4 py-3">{flag.status}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleChangeStatus(flag.$id, 'resolved')}
                        disabled={processingId === flag.$id}
                        className="rounded-md bg-emerald-500 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-500/90 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Resolve
                      </button>
                      <button
                        type="button"
                        onClick={() => handleChangeStatus(flag.$id, 'dismissed')}
                        disabled={processingId === flag.$id}
                        className="rounded-md border border-white/20 px-3 py-1 text-xs font-semibold text-white hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Dismiss
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {hasMore && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => load({ reset: false })}
            disabled={loading}
            className="rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}
    </div>
  );
};

export default ComplianceFlags;
