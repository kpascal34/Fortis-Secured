import React, { useCallback, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  clockIn,
  clockOut,
  getTimesheetById,
  listTimesheetEntries,
  submitTimesheet,
  upsertEntry,
} from '../../services/timesheetService.js';

const formatDate = (value, withTime = false) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  if (withTime) {
    return date.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const toIso = (date, time) => {
  if (!date || !time) return null;
  const composed = new Date(`${date}T${time}:00`);
  if (Number.isNaN(composed.getTime())) return null;
  return composed.toISOString();
};

const TimesheetDetail = () => {
  const { id } = useParams();

  const [timesheet, setTimesheet] = useState(null);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [form, setForm] = useState({
    clientId: '',
    siteId: '',
    shiftId: '',
    workDate: '',
    startTime: '',
    endTime: '',
    breakMinutes: 0,
    notes: '',
  });

  const load = useCallback(async () => {
    if (!id) return;

    setLoading(true);
    setError('');

    try {
      const [sheet, entryDocs] = await Promise.all([
        getTimesheetById(id),
        listTimesheetEntries(id),
      ]);

      setTimesheet(sheet);
      setEntries(entryDocs);

      if (!form.workDate && sheet?.weekStart) {
        const weekStartDate = new Date(sheet.weekStart);
        const dateValue = Number.isNaN(weekStartDate.getTime())
          ? ''
          : weekStartDate.toISOString().slice(0, 10);
        setForm((prev) => ({ ...prev, workDate: dateValue }));
      }
    } catch (loadError) {
      setError(loadError.message || 'Failed to load timesheet detail.');
    } finally {
      setLoading(false);
    }
  }, [form.workDate, id]);

  React.useEffect(() => {
    load();
  }, [load]);

  React.useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(''), 4500);
    return () => clearTimeout(timer);
  }, [toast]);

  const editable = useMemo(() => {
    const status = String(timesheet?.status || 'open');
    return status === 'open' || status === 'rejected';
  }, [timesheet?.status]);

  const openEntry = useMemo(
    () => entries.find((entry) => String(entry.status || '') === 'open' && !entry.endAt) || null,
    [entries],
  );

  const handleClockIn = async () => {
    if (!form.clientId || !form.siteId) {
      setError('clientId and siteId are required to clock in.');
      return;
    }

    setSubmitting(true);
    setError('');
    setToast('');

    try {
      await clockIn({
        clientId: form.clientId,
        siteId: form.siteId,
        shiftId: form.shiftId || null,
        gpsMeta: { mode: 'portal_manual_clock_in' },
      });

      setToast('Clock-in recorded.');
      await load();
    } catch (actionError) {
      setError(actionError.message || 'Clock-in failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClockOut = async () => {
    if (!openEntry?.$id) return;

    setSubmitting(true);
    setError('');
    setToast('');

    try {
      await clockOut({
        entryId: openEntry.$id,
        gpsMeta: { mode: 'portal_manual_clock_out' },
      });
      setToast('Clock-out recorded.');
      await load();
    } catch (actionError) {
      setError(actionError.message || 'Clock-out failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddManualEntry = async (event) => {
    event.preventDefault();

    if (!timesheet?.$id) return;
    if (!form.clientId || !form.siteId || !form.workDate || !form.startTime) {
      setError('clientId, siteId, workDate and startTime are required.');
      return;
    }

    const startAt = toIso(form.workDate, form.startTime);
    const endAt = form.endTime ? toIso(form.workDate, form.endTime) : null;

    if (!startAt) {
      setError('Invalid start date/time.');
      return;
    }

    setSubmitting(true);
    setError('');
    setToast('');

    try {
      await upsertEntry({
        timesheetId: timesheet.$id,
        clientId: form.clientId,
        siteId: form.siteId,
        shiftId: form.shiftId || null,
        workDate: `${form.workDate}T00:00:00.000Z`,
        startAt,
        endAt,
        breakMinutes: Number(form.breakMinutes || 0),
        source: 'manual',
        notes: form.notes || null,
      });

      setToast('Entry saved.');
      await load();
    } catch (actionError) {
      setError(actionError.message || 'Unable to save entry.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitTimesheet = async () => {
    if (!timesheet?.$id) return;

    setSubmitting(true);
    setError('');
    setToast('');

    try {
      await submitTimesheet(timesheet.$id);
      setToast('Timesheet submitted for approval.');
      await load();
    } catch (actionError) {
      setError(actionError.message || 'Failed to submit timesheet.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-white">Timesheet Detail</h1>
          <p className="mt-1 text-sm text-white/70">Track entries, clock activity, and submission state.</p>
        </div>
        <Link
          to="/portal/time"
          className="rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
        >
          Back to Timesheets
        </Link>
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
            onClick={load}
            className="mt-3 rounded-md border border-red-300/40 px-3 py-1 text-xs font-semibold text-red-100 hover:bg-red-500/20"
          >
            Retry
          </button>
        </div>
      )}

      {loading && !timesheet && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center text-white/70">Loading timesheet...</div>
      )}

      {timesheet && (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-wide text-white/60">Week</p>
              <p className="mt-2 text-sm font-semibold text-white">{formatDate(timesheet.weekStart)} - {formatDate(timesheet.weekEnd)}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-wide text-white/60">Status</p>
              <p className="mt-2 text-sm font-semibold text-white">{timesheet.status || 'open'}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-wide text-white/60">Worked Hours</p>
              <p className="mt-2 text-sm font-semibold text-white">{(Number(timesheet.totalMinutes || 0) / 60).toFixed(2)}h</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-wide text-white/60">Payable Hours</p>
              <p className="mt-2 text-sm font-semibold text-white">{(Number(timesheet.totalPayMinutes || 0) / 60).toFixed(2)}h</p>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-5">
            <h2 className="text-lg font-semibold text-white">Clock Controls</h2>
            <p className="mt-1 text-sm text-white/70">One open entry per guard is enforced by the service.</p>

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
              <input
                value={form.clientId}
                onChange={(event) => setForm((prev) => ({ ...prev, clientId: event.target.value }))}
                placeholder="Client ID"
                className="rounded-lg border border-white/20 bg-night-sky px-3 py-2 text-sm text-white"
                disabled={!editable || submitting}
              />
              <input
                value={form.siteId}
                onChange={(event) => setForm((prev) => ({ ...prev, siteId: event.target.value }))}
                placeholder="Site ID"
                className="rounded-lg border border-white/20 bg-night-sky px-3 py-2 text-sm text-white"
                disabled={!editable || submitting}
              />
              <input
                value={form.shiftId}
                onChange={(event) => setForm((prev) => ({ ...prev, shiftId: event.target.value }))}
                placeholder="Shift ID (optional)"
                className="rounded-lg border border-white/20 bg-night-sky px-3 py-2 text-sm text-white"
                disabled={!editable || submitting}
              />
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleClockIn}
                disabled={!editable || Boolean(openEntry) || submitting}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-night-sky hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Clock In
              </button>
              <button
                type="button"
                onClick={handleClockOut}
                disabled={!editable || !openEntry || submitting}
                className="rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Clock Out
              </button>
              {openEntry && (
                <span className="self-center text-xs text-amber-300">
                  Open entry since {formatDate(openEntry.startAt, true)}
                </span>
              )}
            </div>
          </div>

          <form onSubmit={handleAddManualEntry} className="rounded-xl border border-white/10 bg-white/5 p-5">
            <h2 className="text-lg font-semibold text-white">Add/Edit Manual Entry</h2>
            <p className="mt-1 text-sm text-white/70">Rejected timesheets reopen automatically when an entry is edited.</p>

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
              <input
                type="date"
                value={form.workDate}
                onChange={(event) => setForm((prev) => ({ ...prev, workDate: event.target.value }))}
                className="rounded-lg border border-white/20 bg-night-sky px-3 py-2 text-sm text-white"
                disabled={!editable || submitting}
              />
              <input
                type="time"
                value={form.startTime}
                onChange={(event) => setForm((prev) => ({ ...prev, startTime: event.target.value }))}
                className="rounded-lg border border-white/20 bg-night-sky px-3 py-2 text-sm text-white"
                disabled={!editable || submitting}
              />
              <input
                type="time"
                value={form.endTime}
                onChange={(event) => setForm((prev) => ({ ...prev, endTime: event.target.value }))}
                className="rounded-lg border border-white/20 bg-night-sky px-3 py-2 text-sm text-white"
                disabled={!editable || submitting}
              />
              <input
                type="number"
                min="0"
                value={form.breakMinutes}
                onChange={(event) => setForm((prev) => ({ ...prev, breakMinutes: event.target.value }))}
                placeholder="Break Minutes"
                className="rounded-lg border border-white/20 bg-night-sky px-3 py-2 text-sm text-white"
                disabled={!editable || submitting}
              />
              <input
                value={form.notes}
                onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
                placeholder="Notes"
                className="rounded-lg border border-white/20 bg-night-sky px-3 py-2 text-sm text-white md:col-span-2"
                disabled={!editable || submitting}
              />
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={!editable || submitting}
                className="rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Save Entry
              </button>
              <button
                type="button"
                onClick={handleSubmitTimesheet}
                disabled={!editable || submitting || entries.length === 0}
                className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Submit Timesheet
              </button>
            </div>
          </form>

          <div className="overflow-hidden rounded-xl border border-white/10 bg-white/5">
            <table className="w-full text-sm">
              <thead className="bg-white/10 text-left text-xs uppercase tracking-wide text-white/60">
                <tr>
                  <th className="px-4 py-3">Work Date</th>
                  <th className="px-4 py-3">Client/Site</th>
                  <th className="px-4 py-3">Start</th>
                  <th className="px-4 py-3">End</th>
                  <th className="px-4 py-3 text-right">Payable (h)</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {entries.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-white/60">
                      No entries yet.
                    </td>
                  </tr>
                )}
                {entries.map((entry) => (
                  <tr key={entry.$id} className="border-t border-white/10 text-white">
                    <td className="px-4 py-3">{formatDate(entry.workDate)}</td>
                    <td className="px-4 py-3">{entry.clientId || '-'} / {entry.siteId || '-'}</td>
                    <td className="px-4 py-3">{formatDate(entry.startAt, true)}</td>
                    <td className="px-4 py-3">{entry.endAt ? formatDate(entry.endAt, true) : 'Running'}</td>
                    <td className="px-4 py-3 text-right">{(Number(entry.minutesPayable || 0) / 60).toFixed(2)}</td>
                    <td className="px-4 py-3">{entry.status || 'open'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default TimesheetDetail;
