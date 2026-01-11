import React, { useEffect, useMemo, useState } from 'react';
import GlassPanel from '../../components/GlassPanel.jsx';
import PortalHeader from '../../components/PortalHeader.jsx';
import { useRole } from '../../hooks/useRBAC';
import { databases, DATABASE_ID as DB_ID } from '../../lib/appwrite.js';

const DriveSyncStatus = () => {
  const { isAdmin, isManager } = useRole();
  const [failed, setFailed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryingId, setRetryingId] = useState(null);
  const [toast, setToast] = useState(null);
  const [profiles, setProfiles] = useState({}); // staffId -> profile
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch failed syncs from compliance_uploads collection
      const { documents: items } = await databases.listDocuments(DB_ID, 'compliance_uploads', [
        // Add query to filter failed syncs if needed
      ]);
      // Filter for failed syncs client-side
      const failedItems = items.filter(item => item.drive_sync_status === 'failed');
      // Sort by last attempt desc for relevance
      failedItems.sort((a, b) => {
        const da = a.last_sync_attempt ? new Date(a.last_sync_attempt).getTime() : 0;
        const db = b.last_sync_attempt ? new Date(b.last_sync_attempt).getTime() : 0;
        return db - da;
      });
      setFailed(failedItems);

      // Fetch staff profiles for display names
      const uniqueIds = Array.from(new Set(items.map(i => i.staff_id).filter(Boolean)));
      const map = {};
      for (const id of uniqueIds) {
        try {
          const profile = await databases.getDocument(DB_ID, 'staff_profiles', id);
          map[id] = profile;
        } catch (_) {
          // ignore missing
        }
      }
      setProfiles(map);
    } catch (e) {
      setError(e.message || 'Failed to load sync status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    if (!search) return failed;
    const term = search.toLowerCase();
    return failed.filter(row => {
      const name = profiles[row.staff_id]?.fullName || '';
      const emp = profiles[row.staff_id]?.employee_number || '';
      const fileName = row.file_name || '';
      return (
        name.toLowerCase().includes(term) ||
        emp.toLowerCase().includes(term) ||
        fileName.toLowerCase().includes(term) ||
        String(row.staff_id).toLowerCase().includes(term)
      );
    });
  }, [failed, profiles, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageClamped = Math.min(page, totalPages - 1);
  const pageItems = filtered.slice(pageClamped * pageSize, pageClamped * pageSize + pageSize);

  if (!isAdmin && !isManager) {
    return (
      <div className="min-h-screen bg-night-sky p-6 text-white">
        <GlassPanel className="bg-white/5 border-white/10">
          <p className="text-red-200">Only admins or managers can view Drive sync status.</p>
        </GlassPanel>
      </div>
    );
  }

  const onRetry = async (row) => {
    try {
      setRetryingId(row.$id);
      setToast(null);
      await fetch('/api/drive-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staffId: row.staff_id,
          appwriteFileId: row.file_id || row.appwrite_file_id,
          fileName: row.file_name,
          fileType: row.file_type
        })
      });
      setToast('Retry triggered successfully');
      await load();
    } catch (e) {
      setError(e.message || 'Retry failed');
    } finally {
      setRetryingId(null);
    }
  };

  const onRetryAll = async () => {
    try {
      setToast(null);
      setError(null);
      const items = filtered; // retry all filtered results
      for (const row of items) {
        try {
          await fetch('/api/drive-sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              staffId: row.staff_id,
              appwriteFileId: row.file_id || row.appwrite_file_id,
              fileName: row.file_name,
              fileType: row.file_type
            })
          });
        } catch (e) {
          // keep going
        }
      }
      setToast(`Retry attempted for ${items.length} item(s)`);
      await load();
    } catch (e) {
      setError(e.message || 'Retry all failed');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-dark via-night-sky to-night-sky px-4 py-8 text-white">
      <div className="mx-auto max-w-6xl">
        <PortalHeader
          eyebrow="Compliance"
          title="Drive Sync Status"
          description="Review and retry failed Google Drive syncs for compliance uploads."
        />

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>
        )}
        {toast && (
          <div className="mb-4 rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-200">{toast}</div>
        )}

        <GlassPanel className="border-white/10 bg-white/5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
            <h3 className="text-lg font-semibold">Failed Syncs</h3>
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
              <input
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                placeholder="Search by staff or file name"
                className="rounded-lg bg-white/5 px-3 py-2 text-sm text-white outline-none ring-1 ring-white/10 focus:ring-accent"
              />
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setPage(0); }}
                className="rounded-lg bg-white/5 px-3 py-2 text-sm text-white outline-none ring-1 ring-white/10 focus:ring-accent"
              >
                <option value={10}>10 / page</option>
                <option value={25}>25 / page</option>
                <option value={50}>50 / page</option>
              </select>
              <div className="flex items-center gap-2">
                <button onClick={load} className="rounded-lg bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/20 disabled:opacity-50" disabled={loading}>
                  Refresh
                </button>
                <button onClick={onRetryAll} className="rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-night-sky disabled:opacity-50" disabled={loading || filtered.length === 0}>
                  Retry All ({filtered.length})
                </button>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="py-10 text-center text-white/70">Loading...</div>
          ) : failed.length === 0 ? (
            <div className="py-10 text-center text-green-200">No failed syncs 🎉</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-white/60">
                  <tr>
                    <th className="px-3 py-2">Staff</th>
                    <th className="px-3 py-2">Type</th>
                    <th className="px-3 py-2">File Name</th>
                    <th className="px-3 py-2">Appwrite File ID</th>
                    <th className="px-3 py-2">Last Attempt</th>
                    <th className="px-3 py-2">Error</th>
                    <th className="px-3 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((row) => (
                    <tr key={row.$id} className="border-t border-white/10 hover:bg-white/5">
                      <td className="px-3 py-2">
                        {profiles[row.staff_id]?.fullName || row.staff_id}
                        {profiles[row.staff_id]?.employee_number ? (
                          <span className="ml-1 text-white/60">({profiles[row.staff_id].employee_number})</span>
                        ) : null}
                      </td>
                      <td className="px-3 py-2 capitalize">{row.file_type || 'unknown'}</td>
                      <td className="px-3 py-2">{row.file_name || 'unknown'}</td>
                      <td className="px-3 py-2 font-mono text-xs">{row.appwrite_file_id}</td>
                      <td className="px-3 py-2">{row.last_sync_attempt ? new Date(row.last_sync_attempt).toLocaleString() : '—'}</td>
                      <td className="px-3 py-2 max-w-[320px] truncate" title={row.sync_error || ''}>{row.sync_error || '—'}</td>
                      <td className="px-3 py-2 text-right">
                        <button
                          onClick={() => onRetry(row)}
                          disabled={retryingId === row.$id}
                          className="rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-night-sky disabled:opacity-50"
                        >
                          {retryingId === row.$id ? 'Retrying…' : 'Retry'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-4 flex items-center justify-between text-xs text-white/70">
                <div>
                  Showing {filtered.length === 0 ? 0 : pageClamped * pageSize + 1}–{Math.min(filtered.length, (pageClamped + 1) * pageSize)} of {filtered.length}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={pageClamped === 0}
                    className="rounded-lg bg-white/10 px-3 py-2 disabled:opacity-50"
                  >
                    Prev
                  </button>
                  <span>Page {pageClamped + 1} / {totalPages}</span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={pageClamped >= totalPages - 1}
                    className="rounded-lg bg-white/10 px-3 py-2 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </GlassPanel>
      </div>
    </div>
  );
};

export default DriveSyncStatus;
