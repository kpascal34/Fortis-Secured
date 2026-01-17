import React, { useEffect, useMemo, useState } from 'react';
import GlassPanel from '../../components/GlassPanel.jsx';
import PortalHeader from '../../components/PortalHeader.jsx';
import { useCurrentUser, useRole } from '../../hooks/useRBAC';
import { 
  getFailedSyncs, 
  getPendingSyncs, 
  getSuccessfulSyncs,
  getSyncSummary,
  updateSyncStatus 
} from '../../services/driveSyncService.js';
import { config } from '../../lib/appwrite.js';

const DriveSyncStatus = () => {
  const { user } = useCurrentUser();
  const { isAdmin, isManager, loading: roleLoading } = useRole();
  const [failed, setFailed] = useState([]);
  const [pending, setPending] = useState([]);
  const [successful, setSuccessful] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryingId, setRetryingId] = useState(null);
  const [toast, setToast] = useState(null);
  const [profiles, setProfiles] = useState({}); // staffId -> profile
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [activeTab, setActiveTab] = useState('failed'); // failed, pending, successful

  const load = async () => {
    if (!config.complianceUploadsCollectionId) {
      setError('Compliance uploads collection not configured');
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      // Fetch all sync statuses in parallel
      const [failedData, pendingData, successfulData, summaryData] = await Promise.all([
        getFailedSyncs(),
        getPendingSyncs(),
        getSuccessfulSyncs(),
        getSyncSummary(),
      ]);

      // Sort by last attempt descending for relevance
      const sortByTime = (a, b) => {
        const da = a.last_sync_attempt ? new Date(a.last_sync_attempt).getTime() : 0;
        const db = b.last_sync_attempt ? new Date(b.last_sync_attempt).getTime() : 0;
        return db - da;
      };

      setFailed(failedData.sort(sortByTime));
      setPending(pendingData.sort(sortByTime));
      setSuccessful(successfulData.sort(sortByTime));
      setSummary(summaryData);

      // Fetch staff profiles for display names
      const allItems = [...failedData, ...pendingData, ...successfulData];
      const uniqueIds = Array.from(new Set(allItems.map(i => i.staff_id).filter(Boolean)));
      const map = {};
      
      // Try to fetch profiles from your staff collection (adjust collection name as needed)
      for (const id of uniqueIds) {
        try {
          // This is a fallback - in production, you'd fetch from your actual staff collection
          map[id] = { fullName: 'Staff Member', employee_number: id };
        } catch (_) {
          map[id] = { fullName: 'Unknown', employee_number: id };
        }
      }
      setProfiles(map);
    } catch (e) {
      console.error('Error loading sync status:', e);
      setError(e.message || 'Failed to load sync status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const displayData = activeTab === 'failed' ? failed : activeTab === 'pending' ? pending : successful;
    
    if (!search) return displayData;
    const term = search.toLowerCase();
    return displayData.filter(row => {
      const name = profiles[row.staff_id]?.fullName || '';
      const emp = profiles[row.staff_id]?.employee_number || '';
      const fileName = row.file_name || '';
      const fileType = row.file_type || '';
      return (
        name.toLowerCase().includes(term) ||
        emp.toLowerCase().includes(term) ||
        fileName.toLowerCase().includes(term) ||
        fileType.toLowerCase().includes(term) ||
        String(row.staff_id).toLowerCase().includes(term)
      );
    });
  }, [failed, pending, successful, profiles, search, activeTab]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageClamped = Math.min(page, totalPages - 1);
  const pageItems = filtered.slice(pageClamped * pageSize, pageClamped * pageSize + pageSize);

  if (roleLoading) {
    return (
      <div className="min-h-screen bg-night-sky p-6 text-white">
        <GlassPanel className="bg-white/5 border-white/10">
          <p className="text-white/70">Checking access…</p>
        </GlassPanel>
      </div>
    );
  }

  if (!isAdmin && !isManager) {
    return (
      <div className="min-h-screen bg-night-sky p-6 text-white">
        <GlassPanel className="bg-white/5 border-white/10">
          <p className="text-red-200">Access Denied</p>
          <p className="text-sm text-white/70 mt-2">Only admins and managers can view Drive sync status. Your role: {useRole()?.role || 'unknown'}</p>
        </GlassPanel>
      </div>
    );
  }

  const onRetry = async (row) => {
    try {
      setRetryingId(row.$id);
      setToast(null);
      
      // Call retry API
      const response = await fetch('/api/drive-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staffId: row.staff_id,
          appwriteFileId: row.file_id || row.appwrite_file_id,
          fileName: row.file_name,
          fileType: row.file_type
        })
      });

      if (!response.ok) {
        throw new Error(`Retry failed: ${response.statusText}`);
      }

      // Update local status to pending while retrying
      await updateSyncStatus(row.$id, 'pending', {
        last_sync_attempt: new Date().toISOString(),
        sync_error: null,
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
      <div className="mx-auto max-w-7xl">
        <PortalHeader
          eyebrow="Compliance"
          title="Drive Sync Status"
          description="Monitor and manage Google Drive syncs for compliance uploads."
        />

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>
        )}
        {toast && (
          <div className="mb-4 rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-200">{toast}</div>
        )}

        {/* Summary Cards */}
        {summary && (
          <div className="mb-6 grid gap-4 md:grid-cols-4">
            <GlassPanel className="border-white/10 bg-white/5 p-4">
              <p className="text-xs text-white/60 uppercase tracking-wide">Total Records</p>
              <p className="mt-1 text-3xl font-bold text-white">{summary.total}</p>
            </GlassPanel>
            <GlassPanel className={`border-white/10 p-4 ${summary.successful > 0 ? 'bg-green-500/10' : 'bg-white/5'}`}>
              <p className="text-xs text-white/60 uppercase tracking-wide">Successful</p>
              <p className={`mt-1 text-3xl font-bold ${summary.successful > 0 ? 'text-green-400' : 'text-white'}`}>
                {summary.successful}
              </p>
            </GlassPanel>
            <GlassPanel className={`border-white/10 p-4 ${summary.pending > 0 ? 'bg-yellow-500/10' : 'bg-white/5'}`}>
              <p className="text-xs text-white/60 uppercase tracking-wide">Pending</p>
              <p className={`mt-1 text-3xl font-bold ${summary.pending > 0 ? 'text-yellow-400' : 'text-white'}`}>
                {summary.pending}
              </p>
            </GlassPanel>
            <GlassPanel className={`border-white/10 p-4 ${summary.failed > 0 ? 'bg-red-500/10' : 'bg-white/5'}`}>
              <p className="text-xs text-white/60 uppercase tracking-wide">Failed</p>
              <p className={`mt-1 text-3xl font-bold ${summary.failed > 0 ? 'text-red-400' : 'text-white'}`}>
                {summary.failed}
              </p>
            </GlassPanel>
          </div>
        )}

        {/* Tabs */}
        <GlassPanel className="mb-6 border-white/10 bg-white/5">
          <div className="flex gap-2 border-b border-white/10">
            <button
              onClick={() => { setActiveTab('failed'); setPage(0); }}
              className={`px-4 py-3 text-sm font-semibold transition-all ${
                activeTab === 'failed'
                  ? 'border-b-2 border-red-400 text-red-400'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              Failed ({failed.length})
            </button>
            <button
              onClick={() => { setActiveTab('pending'); setPage(0); }}
              className={`px-4 py-3 text-sm font-semibold transition-all ${
                activeTab === 'pending'
                  ? 'border-b-2 border-yellow-400 text-yellow-400'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              Pending ({pending.length})
            </button>
            <button
              onClick={() => { setActiveTab('successful'); setPage(0); }}
              className={`px-4 py-3 text-sm font-semibold transition-all ${
                activeTab === 'successful'
                  ? 'border-b-2 border-green-400 text-green-400'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              Successful ({successful.length})
            </button>
          </div>
        </GlassPanel>
        <GlassPanel className="border-white/10 bg-white/5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
            <h3 className="text-lg font-semibold">
              {activeTab === 'failed' && '❌ Failed Syncs'}
              {activeTab === 'pending' && '⏳ Pending Syncs'}
              {activeTab === 'successful' && '✅ Successful Syncs'}
            </h3>
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
              <input
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                placeholder="Search by staff, file name, or type..."
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
                <button 
                  onClick={load} 
                  className="rounded-lg bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/20 disabled:opacity-50 transition-all" 
                  disabled={loading}
                >
                  🔄 Refresh
                </button>
                {activeTab === 'failed' && filtered.length > 0 && (
                  <button 
                    onClick={onRetryAll} 
                    className="rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-night-sky disabled:opacity-50 transition-all" 
                    disabled={loading}
                  >
                    Retry All ({filtered.length})
                  </button>
                )}
              </div>
            </div>
          </div>

          {loading ? (
            <div className="py-10 text-center text-white/70">Loading sync status...</div>
          ) : filtered.length === 0 ? (
            <div className={`py-10 text-center ${
              activeTab === 'failed' ? 'text-green-200' :
              activeTab === 'pending' ? 'text-blue-200' :
              'text-white/70'
            }`}>
              {activeTab === 'failed' && '✨ No failed syncs - everything is syncing smoothly!'}
              {activeTab === 'pending' && '✓ No pending syncs at the moment'}
              {activeTab === 'successful' && 'No successful syncs to display'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-white/60">
                  <tr className="border-b border-white/10">
                    <th className="px-3 py-3">Staff Member</th>
                    <th className="px-3 py-3">File Type</th>
                    <th className="px-3 py-3">File Name</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3">Timestamp</th>
                    {activeTab === 'failed' && <th className="px-3 py-3">Error Details</th>}
                    <th className="px-3 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((row) => (
                    <tr key={row.$id} className="border-t border-white/10 hover:bg-white/5 transition-colors">
                      <td className="px-3 py-3">
                        <div>
                          <p className="font-medium">{profiles[row.staff_id]?.fullName || row.staff_id}</p>
                          {profiles[row.staff_id]?.employee_number && (
                            <p className="text-xs text-white/60">#{profiles[row.staff_id].employee_number}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <span className="inline-flex rounded bg-white/10 px-2 py-1 text-xs font-semibold capitalize">
                          {row.file_type || 'unknown'}
                        </span>
                      </td>
                      <td className="px-3 py-3 max-w-[200px] truncate" title={row.file_name}>
                        {row.file_name || '—'}
                      </td>
                      <td className="px-3 py-3">
                        <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                          row.drive_sync_status === 'success' ? 'bg-green-500/20 text-green-300' :
                          row.drive_sync_status === 'failed' ? 'bg-red-500/20 text-red-300' :
                          'bg-yellow-500/20 text-yellow-300'
                        }`}>
                          {row.drive_sync_status === 'success' && '✓ Success'}
                          {row.drive_sync_status === 'failed' && '✕ Failed'}
                          {row.drive_sync_status === 'pending' && '⏳ Pending'}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-sm">
                        {row.last_sync_attempt 
                          ? new Date(row.last_sync_attempt).toLocaleString() 
                          : '—'
                        }
                      </td>
                      {activeTab === 'failed' && (
                        <td className="px-3 py-3 max-w-[250px]">
                          <div className="text-xs text-red-300 truncate" title={row.sync_error}>
                            {row.sync_error || 'Unknown error'}
                          </div>
                        </td>
                      )}
                      <td className="px-3 py-3 text-right">
                        {activeTab === 'failed' && (
                          <button
                            onClick={() => onRetry(row)}
                            disabled={retryingId === row.$id}
                            className="rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-night-sky disabled:opacity-50 transition-all hover:bg-accent/90"
                          >
                            {retryingId === row.$id ? 'Retrying…' : 'Retry'}
                          </button>
                        )}
                        {activeTab !== 'failed' && (
                          <button
                            disabled
                            className="rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold text-white/50 cursor-default"
                          >
                            —
                          </button>
                        )}
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
                    className="rounded-lg bg-white/10 px-3 py-2 disabled:opacity-50 hover:bg-white/20 transition-all"
                  >
                    ← Prev
                  </button>
                  <span>Page {pageClamped + 1} / {totalPages}</span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={pageClamped >= totalPages - 1}
                    className="rounded-lg bg-white/10 px-3 py-2 disabled:opacity-50 hover:bg-white/20 transition-all"
                  >
                    Next →
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
