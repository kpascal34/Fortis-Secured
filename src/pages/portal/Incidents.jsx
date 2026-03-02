import React, { useCallback, useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  createIncidentDraft,
  listIncidents,
  reviewIncident,
  submitIncident,
  updateIncidentDraft,
} from '../../services/incidentService.js';

const PAGE_SIZE = 15;

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const statusClass = (status) => {
  switch (String(status || '').toLowerCase()) {
    case 'draft':
      return 'bg-blue-500/20 text-blue-300 border border-blue-400/40';
    case 'needs_review':
      return 'bg-amber-500/20 text-amber-300 border border-amber-400/40';
    case 'final_sent':
      return 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40';
    case 'rejected':
      return 'bg-red-500/20 text-red-300 border border-red-400/40';
    default:
      return 'bg-white/10 text-white border border-white/20';
  }
};

const Incidents = () => {
  const { user } = useAuth();

  const [records, setRecords] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState('');
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [filters, setFilters] = useState({ status: '', clientId: '', siteId: '' });
  const [draft, setDraft] = useState({
    clientId: '',
    siteId: '',
    shiftId: '',
    severity: 'medium',
    summary: '',
    details: '',
  });

  const load = useCallback(async ({ reset = false } = {}) => {
    setLoading(true);
    setError('');

    try {
      const response = await listIncidents({
        filters: {
          status: filters.status || null,
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
      setError(loadError.message || 'Failed to load incidents.');
    } finally {
      setLoading(false);
    }
  }, [cursor, filters.clientId, filters.siteId, filters.status]);

  React.useEffect(() => {
    setCursor(null);
    setHasMore(true);
    load({ reset: true });
  }, [filters.status, filters.clientId, filters.siteId]);

  React.useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(''), 5000);
    return () => clearTimeout(timer);
  }, [toast]);

  const handleCreateDraft = async (event) => {
    event.preventDefault();

    if (!draft.clientId || !draft.siteId || !draft.summary) {
      setError('clientId, siteId and summary are required.');
      return;
    }

    setProcessingId('create');
    setError('');
    setToast('');

    try {
      await createIncidentDraft(draft);
      setToast('Incident draft created.');
      setDraft({ clientId: '', siteId: '', shiftId: '', severity: 'medium', summary: '', details: '' });
      await load({ reset: true });
    } catch (actionError) {
      setError(actionError.message || 'Failed to create incident draft.');
    } finally {
      setProcessingId('');
    }
  };

  const handleSubmitDraft = async (incidentId) => {
    setProcessingId(incidentId);
    setError('');
    setToast('');

    try {
      await submitIncident(incidentId);
      setToast('Incident submitted and interim notification queued.');
      await load({ reset: true });
    } catch (actionError) {
      setError(actionError.message || 'Incident submission failed.');
    } finally {
      setProcessingId('');
    }
  };

  const handleAdminReview = async (incidentId, decision) => {
    let reason = null;
    if (decision === 'reject') {
      reason = window.prompt('Enter rejection reason:');
      if (!reason) return;
    }

    setProcessingId(incidentId);
    setError('');
    setToast('');

    try {
      await reviewIncident(incidentId, { decision, reason });
      setToast(decision === 'approve' ? 'Incident approved and final email queued.' : 'Incident rejected.');
      await load({ reset: true });
    } catch (actionError) {
      setError(actionError.message || 'Incident review failed.');
    } finally {
      setProcessingId('');
    }
  };

  const handleQuickEdit = async (incident) => {
    const summary = window.prompt('Update summary', incident.summary || '');
    if (summary === null) return;

    setProcessingId(incident.$id);
    setError('');
    setToast('');

    try {
      await updateIncidentDraft(incident.$id, { summary });
      setToast('Incident draft updated.');
      await load({ reset: true });
    } catch (actionError) {
      setError(actionError.message || 'Failed to update incident draft.');
    } finally {
      setProcessingId('');
    }
  };

  const isAdmin = String(user?.role || '').toLowerCase() === 'admin';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Incident Workflow</h1>
        <p className="mt-2 text-sm text-white/70">Draft -&gt; interim notification -&gt; admin review -&gt; final notification.</p>
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

      <form onSubmit={handleCreateDraft} className="rounded-xl border border-white/10 bg-white/5 p-5">
        <h2 className="text-lg font-semibold text-white">Create Incident Draft</h2>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <input
            placeholder="Client ID"
            value={draft.clientId}
            onChange={(event) => setDraft((prev) => ({ ...prev, clientId: event.target.value }))}
            className="rounded-lg border border-white/20 bg-night-sky px-3 py-2 text-sm text-white"
          />
          <input
            placeholder="Site ID"
            value={draft.siteId}
            onChange={(event) => setDraft((prev) => ({ ...prev, siteId: event.target.value }))}
            className="rounded-lg border border-white/20 bg-night-sky px-3 py-2 text-sm text-white"
          />
          <input
            placeholder="Shift ID (optional)"
            value={draft.shiftId}
            onChange={(event) => setDraft((prev) => ({ ...prev, shiftId: event.target.value }))}
            className="rounded-lg border border-white/20 bg-night-sky px-3 py-2 text-sm text-white"
          />
          <select
            value={draft.severity}
            onChange={(event) => setDraft((prev) => ({ ...prev, severity: event.target.value }))}
            className="rounded-lg border border-white/20 bg-night-sky px-3 py-2 text-sm text-white"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
          <input
            placeholder="Summary"
            value={draft.summary}
            onChange={(event) => setDraft((prev) => ({ ...prev, summary: event.target.value }))}
            className="rounded-lg border border-white/20 bg-night-sky px-3 py-2 text-sm text-white md:col-span-2"
          />
          <textarea
            rows={3}
            placeholder="Details"
            value={draft.details}
            onChange={(event) => setDraft((prev) => ({ ...prev, details: event.target.value }))}
            className="rounded-lg border border-white/20 bg-night-sky px-3 py-2 text-sm text-white md:col-span-3"
          />
        </div>

        <button
          type="submit"
          disabled={processingId === 'create'}
          className="mt-4 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-night-sky hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {processingId === 'create' ? 'Creating...' : 'Create Draft'}
        </button>
      </form>

      <div className="grid grid-cols-1 gap-3 rounded-xl border border-white/10 bg-white/5 p-4 md:grid-cols-4">
        <select
          value={filters.status}
          onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))}
          className="rounded-lg border border-white/20 bg-night-sky px-3 py-2 text-sm text-white"
        >
          <option value="">All statuses</option>
          <option value="draft">draft</option>
          <option value="submitted">submitted</option>
          <option value="interim_sent">interim_sent</option>
          <option value="needs_review">needs_review</option>
          <option value="approved">approved</option>
          <option value="final_sent">final_sent</option>
          <option value="rejected">rejected</option>
        </select>
        <input
          placeholder="Filter clientId"
          value={filters.clientId}
          onChange={(event) => setFilters((prev) => ({ ...prev, clientId: event.target.value }))}
          className="rounded-lg border border-white/20 bg-night-sky px-3 py-2 text-sm text-white"
        />
        <input
          placeholder="Filter siteId"
          value={filters.siteId}
          onChange={(event) => setFilters((prev) => ({ ...prev, siteId: event.target.value }))}
          className="rounded-lg border border-white/20 bg-night-sky px-3 py-2 text-sm text-white"
        />
        <button
          type="button"
          onClick={() => load({ reset: true })}
          className="rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
        >
          Apply Filters
        </button>
      </div>

      {loading && records.length === 0 && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center text-white/70">Loading incidents...</div>
      )}

      {!loading && records.length === 0 && !error && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center text-white/70">No incidents found.</div>
      )}

      {records.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-white/10 bg-white/5">
          <table className="w-full text-sm">
            <thead className="bg-white/10 text-left text-xs uppercase tracking-wide text-white/60">
              <tr>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Summary</th>
                <th className="px-4 py-3">Scope</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {records.map((incident) => {
                const ownDraft =
                  String(incident.status || '') === 'draft' &&
                  String(incident.reportedBy || '') === String(user?.$id || '');
                const needsReview = String(incident.status || '') === 'needs_review';

                return (
                  <tr key={incident.$id} className="border-t border-white/10 text-white">
                    <td className="px-4 py-3">{formatDate(incident.createdAt)}</td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-white">{incident.summary || '-'}</p>
                      <p className="mt-1 text-xs text-white/60 line-clamp-2">{incident.details || 'No details provided.'}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-white/80">{incident.clientId} / {incident.siteId}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusClass(incident.status)}`}>
                        {incident.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        {ownDraft && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleQuickEdit(incident)}
                              disabled={processingId === incident.$id}
                              className="rounded-md border border-white/20 px-3 py-1 text-xs font-semibold text-white hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSubmitDraft(incident.$id)}
                              disabled={processingId === incident.$id}
                              className="rounded-md bg-accent px-3 py-1 text-xs font-semibold text-night-sky hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Submit
                            </button>
                          </>
                        )}

                        {isAdmin && needsReview && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleAdminReview(incident.$id, 'approve')}
                              disabled={processingId === incident.$id}
                              className="rounded-md bg-emerald-500 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-500/90 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAdminReview(incident.$id, 'reject')}
                              disabled={processingId === incident.$id}
                              className="rounded-md border border-red-400/40 px-3 py-1 text-xs font-semibold text-red-200 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Reject
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
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

export default Incidents;
