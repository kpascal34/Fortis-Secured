import React, { useCallback, useState } from 'react';
import {
  approveTimesheet,
  listApprovalQueue,
  rejectTimesheet,
} from '../../services/timesheetService.js';
import { useAuth } from '../../context/AuthContext.jsx';

const PAGE_SIZE = 15;

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const TimesheetApprovals = () => {
  const { user } = useAuth();

  const [records, setRecords] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState('');
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [filters, setFilters] = useState({
    status: 'submitted',
    weekStart: '',
    clientId: '',
    siteId: '',
    guardId: '',
  });

  const load = useCallback(async ({ reset = false } = {}) => {
    setLoading(true);
    setError('');

    try {
      const response = await listApprovalQueue(
        null,
        {
          status: filters.status,
          weekStart: filters.weekStart || null,
          filters: {
            clientId: filters.clientId || null,
            siteId: filters.siteId || null,
            guardId: filters.guardId || null,
          },
          limit: PAGE_SIZE,
          cursor: reset ? null : cursor,
        },
      );

      setRecords((prev) => (reset ? response.documents : [...prev, ...response.documents]));
      setCursor(response.nextCursor || null);
      setHasMore(Boolean(response.nextCursor));
    } catch (loadError) {
      setError(loadError.message || 'Failed to load timesheet approvals.');
    } finally {
      setLoading(false);
    }
  }, [cursor, filters.clientId, filters.guardId, filters.siteId, filters.status, filters.weekStart]);

  React.useEffect(() => {
    setCursor(null);
    setHasMore(true);
    load({ reset: true });
  }, [filters.status, filters.weekStart, filters.clientId, filters.siteId, filters.guardId]);

  React.useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(''), 4500);
    return () => clearTimeout(timer);
  }, [toast]);

  const handleApprove = async (timesheetId) => {
    setProcessingId(timesheetId);
    setError('');
    setToast('');

    try {
      await approveTimesheet(timesheetId);
      setToast('Timesheet approved and locked.');
      await load({ reset: true });
    } catch (actionError) {
      setError(actionError.message || 'Approval failed.');
    } finally {
      setProcessingId('');
    }
  };

  const handleReject = async (timesheetId) => {
    const reason = window.prompt('Enter rejection reason:');
    if (!reason) return;

    setProcessingId(timesheetId);
    setError('');
    setToast('');

    try {
      await rejectTimesheet(timesheetId, reason);
      setToast('Timesheet rejected and returned for edits.');
      await load({ reset: true });
    } catch (actionError) {
      setError(actionError.message || 'Rejection failed.');
    } finally {
      setProcessingId('');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Timesheet Approvals</h1>
        <p className="mt-2 text-sm text-white/70">
          {String(user?.role || '').toLowerCase() === 'admin'
            ? 'Global queue for submitted timesheets.'
            : 'Queue derived from your assigned site/client tenancy scope.'}
        </p>
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

      <div className="grid grid-cols-1 gap-3 rounded-xl border border-white/10 bg-white/5 p-4 md:grid-cols-5">
        <input
          type="date"
          value={filters.weekStart}
          onChange={(event) => setFilters((prev) => ({ ...prev, weekStart: event.target.value }))}
          className="rounded-lg border border-white/20 bg-night-sky px-3 py-2 text-sm text-white"
        />
        <input
          placeholder="Guard ID"
          value={filters.guardId}
          onChange={(event) => setFilters((prev) => ({ ...prev, guardId: event.target.value }))}
          className="rounded-lg border border-white/20 bg-night-sky px-3 py-2 text-sm text-white"
        />
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
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-night-sky hover:bg-accent/90"
        >
          Apply Filters
        </button>
      </div>

      {loading && records.length === 0 && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center text-white/70">Loading approvals queue...</div>
      )}

      {!loading && records.length === 0 && !error && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center text-white/70">
          No submitted timesheets in your scope.
        </div>
      )}

      {records.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-white/10 bg-white/5">
          <table className="w-full text-sm">
            <thead className="bg-white/10 text-left text-xs uppercase tracking-wide text-white/60">
              <tr>
                <th className="px-4 py-3">Guard</th>
                <th className="px-4 py-3">Week</th>
                <th className="px-4 py-3">Submitted At</th>
                <th className="px-4 py-3 text-right">Payable (h)</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {records.map((timesheet) => (
                <tr key={timesheet.$id} className="border-t border-white/10 text-white">
                  <td className="px-4 py-3">{timesheet.guardId}</td>
                  <td className="px-4 py-3">{formatDate(timesheet.weekStart)} - {formatDate(timesheet.weekEnd)}</td>
                  <td className="px-4 py-3">{formatDate(timesheet.submittedAt)}</td>
                  <td className="px-4 py-3 text-right">{(Number(timesheet.totalPayMinutes || 0) / 60).toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleApprove(timesheet.$id)}
                        disabled={processingId === timesheet.$id}
                        className="rounded-md bg-emerald-500 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-500/90 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReject(timesheet.$id)}
                        disabled={processingId === timesheet.$id}
                        className="rounded-md border border-red-400/40 px-3 py-1 text-xs font-semibold text-red-200 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Reject
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

export default TimesheetApprovals;
