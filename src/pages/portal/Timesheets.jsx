import React, { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { getOrCreateTimesheet, getWeekRange, listMyTimesheets } from '../../services/timesheetService.js';

const PAGE_SIZE = 12;

const statusClass = (status) => {
  switch (String(status || '').toLowerCase()) {
    case 'open':
      return 'bg-blue-500/20 text-blue-300 border border-blue-400/40';
    case 'submitted':
      return 'bg-amber-500/20 text-amber-300 border border-amber-400/40';
    case 'rejected':
      return 'bg-red-500/20 text-red-300 border border-red-400/40';
    case 'approved':
    case 'locked':
      return 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40';
    default:
      return 'bg-white/10 text-white border border-white/20';
  }
};

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const Timesheets = () => {
  const { user } = useAuth();

  const [records, setRecords] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const load = useCallback(async ({ reset = false } = {}) => {
    if (!user?.$id) return;

    setLoading(true);
    setError('');

    try {
      const response = await listMyTimesheets(
        user.$id,
        {
          limit: PAGE_SIZE,
          cursor: reset ? null : cursor,
        },
      );

      setRecords((prev) => (reset ? response.documents : [...prev, ...response.documents]));
      setCursor(response.nextCursor || null);
      setHasMore(Boolean(response.nextCursor));
    } catch (loadError) {
      setError(loadError.message || 'Failed to load timesheets.');
    } finally {
      setLoading(false);
    }
  }, [cursor, user?.$id]);

  React.useEffect(() => {
    if (!user?.$id) return;
    load({ reset: true });
  }, [user?.$id]);

  React.useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(''), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const handleCreateCurrentWeek = async () => {
    if (!user?.$id) return;

    setLoading(true);
    setError('');
    setToast('');

    try {
      const { weekStart } = getWeekRange(new Date().toISOString());
      await getOrCreateTimesheet(user.$id, weekStart);
      setToast('Current week timesheet is ready.');
      await load({ reset: true });
    } catch (createError) {
      setError(createError.message || 'Unable to prepare current week timesheet.');
    } finally {
      setLoading(false);
    }
  };

  const totals = useMemo(() => {
    return records.reduce(
      (acc, item) => {
        acc.totalMinutes += Number(item.totalMinutes || 0);
        acc.totalPayMinutes += Number(item.totalPayMinutes || 0);
        return acc;
      },
      { totalMinutes: 0, totalPayMinutes: 0 },
    );
  }, [records]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">My Timesheets</h1>
          <p className="mt-2 text-sm text-white/70">Weekly timesheets are the source of truth for worked hours.</p>
        </div>
        <button
          type="button"
          onClick={handleCreateCurrentWeek}
          disabled={loading}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-night-sky hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Working...' : 'Prepare Current Week'}
        </button>
      </div>

      {toast && (
        <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-200">
          {toast}
        </div>
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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-wide text-white/60">Weeks Loaded</p>
          <p className="mt-2 text-2xl font-bold text-white">{records.length}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-wide text-white/60">Worked Hours</p>
          <p className="mt-2 text-2xl font-bold text-white">{(totals.totalMinutes / 60).toFixed(2)}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-wide text-white/60">Payable Hours</p>
          <p className="mt-2 text-2xl font-bold text-white">{(totals.totalPayMinutes / 60).toFixed(2)}</p>
        </div>
      </div>

      {loading && records.length === 0 && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center text-white/70">Loading timesheets...</div>
      )}

      {!loading && records.length === 0 && !error && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center text-white/70">
          No timesheets found yet. Start with "Prepare Current Week".
        </div>
      )}

      {records.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-white/10 bg-white/5">
          <table className="w-full text-sm">
            <thead className="bg-white/10 text-left text-xs uppercase tracking-wide text-white/60">
              <tr>
                <th className="px-4 py-3">Week</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Worked</th>
                <th className="px-4 py-3 text-right">Payable</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {records.map((timesheet) => (
                <tr key={timesheet.$id} className="border-t border-white/10 text-white">
                  <td className="px-4 py-3">
                    {formatDate(timesheet.weekStart)} - {formatDate(timesheet.weekEnd)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusClass(timesheet.status)}`}>
                      {timesheet.status || 'open'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">{(Number(timesheet.totalMinutes || 0) / 60).toFixed(2)}h</td>
                  <td className="px-4 py-3 text-right">{(Number(timesheet.totalPayMinutes || 0) / 60).toFixed(2)}h</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      to={`/portal/time/${timesheet.$id}`}
                      className="rounded-md border border-white/20 px-3 py-1 text-xs font-semibold text-white hover:bg-white/10"
                    >
                      Open
                    </Link>
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

export default Timesheets;
