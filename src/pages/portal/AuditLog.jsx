import React, { useState, useEffect } from 'react';
import { databases, config } from '../../lib/appwrite';
import {
  getAuditLogs,
  getAuditStats,
  searchAuditLogs,
  exportAuditLogs,
  AUDIT_CATEGORY,
  AUDIT_ACTION,
  AUDIT_SEVERITY,
  AUDIT_STATUS,
} from '../../lib/auditLog';
import {
  AiOutlineSearch,
  AiOutlineFilter,
  AiOutlineDownload,
  AiOutlineCalendar,
  AiOutlineUser,
  AiOutlineWarning,
  AiOutlineCheckCircle,
  AiOutlineCloseCircle,
  AiOutlineExclamationCircle,
  AiOutlineSafety,
  AiOutlineClockCircle,
} from 'react-icons/ai';

const AuditLog = () => {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLog, setSelectedLog] = useState(null);
  
  // Filters
  const [filters, setFilters] = useState({
    category: '',
    severity: '',
    status: '',
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });

  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchAuditLogs();
  }, [filters]);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);

      const filterParams = {
        category: filters.category || null,
        severity: filters.severity || null,
        startDate: filters.startDate ? new Date(filters.startDate).toISOString() : null,
        endDate: filters.endDate ? new Date(filters.endDate).toISOString() : null,
        limit: 500,
      };

      const [logsData, statsData] = await Promise.all([
        getAuditLogs(filterParams),
        getAuditStats(filterParams.startDate, filterParams.endDate),
      ]);

      setLogs(logsData);
      setStats(statsData);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      fetchAuditLogs();
      return;
    }

    try {
      setLoading(true);
      const results = await searchAuditLogs(searchTerm, {
        category: filters.category || null,
        severity: filters.severity || null,
        startDate: filters.startDate ? new Date(filters.startDate).toISOString() : null,
        endDate: filters.endDate ? new Date(filters.endDate).toISOString() : null,
      });
      setLogs(results);
      setLoading(false);
    } catch (error) {
      console.error('Error searching logs:', error);
      setLoading(false);
    }
  };

  const handleExport = () => {
    const csv = exportAuditLogs(logs);
    if (!csv) {
      alert('Failed to export logs');
      return;
    }

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case AUDIT_SEVERITY.CRITICAL:
        return <AiOutlineExclamationCircle className="text-red-500" />;
      case AUDIT_SEVERITY.WARNING:
        return <AiOutlineWarning className="text-orange-500" />;
      case AUDIT_SEVERITY.SECURITY:
        return <AiOutlineSafety className="text-purple-500" />;
      default:
        return <AiOutlineCheckCircle className="text-blue-500" />;
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case AUDIT_SEVERITY.CRITICAL:
        return 'red';
      case AUDIT_SEVERITY.WARNING:
        return 'orange';
      case AUDIT_SEVERITY.SECURITY:
        return 'purple';
      default:
        return 'blue';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case AUDIT_STATUS.SUCCESS:
        return <AiOutlineCheckCircle className="text-green-500" />;
      case AUDIT_STATUS.FAILURE:
        return <AiOutlineCloseCircle className="text-red-500" />;
      case AUDIT_STATUS.PARTIAL:
        return <AiOutlineWarning className="text-orange-500" />;
      default:
        return <AiOutlineCheckCircle className="text-gray-500" />;
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatAction = (action) => {
    return action
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  if (loading && !logs.length) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-dark via-night-sky to-night-sky">
        <p className="text-white">Loading audit logs...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-dark via-night-sky to-night-sky p-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Audit Log</h1>
            <p className="mt-2 text-white/70">
              System activity tracking and compliance monitoring
            </p>
          </div>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-white hover:bg-accent/80 transition-colors"
          >
            <AiOutlineDownload />
            Export CSV
          </button>
        </div>

        {/* Statistics */}
        {stats && (
          <div className="mb-6 grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-4">
              <p className="text-sm text-white/70">Total Events</p>
              <p className="mt-2 text-3xl font-bold text-white">{stats.total}</p>
            </div>
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 backdrop-blur-sm p-4">
              <p className="text-sm text-red-300">Critical Events</p>
              <p className="mt-2 text-3xl font-bold text-red-500">{stats.criticalEvents}</p>
            </div>
            <div className="rounded-xl border border-purple-500/30 bg-purple-500/10 backdrop-blur-sm p-4">
              <p className="text-sm text-purple-300">Security Events</p>
              <p className="mt-2 text-3xl font-bold text-purple-500">{stats.securityEvents}</p>
            </div>
            <div className="rounded-xl border border-orange-500/30 bg-orange-500/10 backdrop-blur-sm p-4">
              <p className="text-sm text-orange-300">Failed Actions</p>
              <p className="mt-2 text-3xl font-bold text-orange-500">{stats.failedActions}</p>
            </div>
            <div className="rounded-xl border border-green-500/30 bg-green-500/10 backdrop-blur-sm p-4">
              <p className="text-sm text-green-300">Success Rate</p>
              <p className="mt-2 text-3xl font-bold text-green-500">
                {stats.total > 0 ? Math.round(((stats.total - stats.failedActions) / stats.total) * 100) : 0}%
              </p>
            </div>
          </div>
        )}

        {/* Search and Filters */}
        <div className="mb-6 space-y-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <AiOutlineSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search logs by user, action, description..."
                className="w-full rounded-lg border border-white/10 bg-night-sky pl-12 pr-4 py-3 text-white placeholder-white/50 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
            <button
              onClick={handleSearch}
              className="rounded-lg bg-accent px-6 py-3 text-white hover:bg-accent/80 transition-colors"
            >
              Search
            </button>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 rounded-lg bg-white/5 border border-white/10 px-6 py-3 text-white hover:bg-white/10 transition-colors"
            >
              <AiOutlineFilter />
              Filters
            </button>
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-6">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">Category</label>
                  <select
                    value={filters.category}
                    onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                    className="w-full rounded-lg border border-white/10 bg-night-sky px-3 py-2 text-white focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                  >
                    <option value="">All Categories</option>
                    {Object.values(AUDIT_CATEGORY).map((cat) => (
                      <option key={cat} value={cat}>
                        {cat.replace(/_/g, ' ').toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">Severity</label>
                  <select
                    value={filters.severity}
                    onChange={(e) => setFilters({ ...filters, severity: e.target.value })}
                    className="w-full rounded-lg border border-white/10 bg-night-sky px-3 py-2 text-white focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                  >
                    <option value="">All Severities</option>
                    {Object.values(AUDIT_SEVERITY).map((sev) => (
                      <option key={sev} value={sev}>
                        {sev.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">Status</label>
                  <select
                    value={filters.status}
                    onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                    className="w-full rounded-lg border border-white/10 bg-night-sky px-3 py-2 text-white focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                  >
                    <option value="">All Statuses</option>
                    {Object.values(AUDIT_STATUS).map((stat) => (
                      <option key={stat} value={stat}>
                        {stat.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">Start Date</label>
                  <input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                    className="w-full rounded-lg border border-white/10 bg-night-sky px-3 py-2 text-white focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">End Date</label>
                  <input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                    className="w-full rounded-lg border border-white/10 bg-night-sky px-3 py-2 text-white focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  onClick={fetchAuditLogs}
                  className="rounded-lg bg-accent px-4 py-2 text-white hover:bg-accent/80 transition-colors"
                >
                  Apply Filters
                </button>
                <button
                  onClick={() => {
                    setFilters({
                      category: '',
                      severity: '',
                      status: '',
                      startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                      endDate: new Date().toISOString().split('T')[0],
                    });
                    setSearchTerm('');
                  }}
                  className="rounded-lg bg-white/5 border border-white/10 px-4 py-2 text-white hover:bg-white/10 transition-colors"
                >
                  Reset
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Logs Table */}
        <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-white/10 bg-white/5">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white">Timestamp</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white">Category</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white">Action</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white">User</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white">Severity</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-8 text-center text-white/50">
                      No audit logs found
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr
                      key={log.$id || log.timestamp}
                      onClick={() => setSelectedLog(log)}
                      className="hover:bg-white/5 cursor-pointer transition-colors"
                    >
                      <td className="px-6 py-4 text-sm text-white/70">
                        <div className="flex items-center gap-2">
                          <AiOutlineClockCircle className="text-accent" />
                          {formatTimestamp(log.timestamp)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="rounded-full bg-blue-500/20 px-3 py-1 text-xs text-blue-400">
                          {log.category.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-white/90">
                        {formatAction(log.action)}
                      </td>
                      <td className="px-6 py-4 text-sm text-white/90">
                        <div className="flex items-center gap-2">
                          <AiOutlineUser className="text-accent" />
                          {log.userName}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {getSeverityIcon(log.severity)}
                          <span className={`text-sm text-${getSeverityColor(log.severity)}-400`}>
                            {log.severity}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(log.status)}
                          <span className="text-sm text-white/70">{log.status}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-white/70 max-w-md truncate">
                        {log.description}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Log count */}
        <div className="mt-4 text-center text-sm text-white/50">
          Showing {logs.length} log{logs.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="max-w-3xl w-full rounded-xl border border-white/10 bg-night-sky p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white">Audit Log Details</h2>
                <p className="text-white/60 mt-1">{formatTimestamp(selectedLog.timestamp)}</p>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="rounded-lg bg-white/5 p-2 hover:bg-white/10 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg bg-white/5 border border-white/10 p-4">
                  <p className="text-sm text-white/50 mb-1">Category</p>
                  <p className="text-white font-semibold">
                    {selectedLog.category.replace(/_/g, ' ').toUpperCase()}
                  </p>
                </div>
                <div className="rounded-lg bg-white/5 border border-white/10 p-4">
                  <p className="text-sm text-white/50 mb-1">Action</p>
                  <p className="text-white font-semibold">{formatAction(selectedLog.action)}</p>
                </div>
                <div className="rounded-lg bg-white/5 border border-white/10 p-4">
                  <p className="text-sm text-white/50 mb-1">User</p>
                  <p className="text-white font-semibold">{selectedLog.userName}</p>
                  <p className="text-xs text-white/60 mt-1">Role: {selectedLog.userRole}</p>
                </div>
                <div className="rounded-lg bg-white/5 border border-white/10 p-4">
                  <p className="text-sm text-white/50 mb-1">Severity</p>
                  <div className="flex items-center gap-2">
                    {getSeverityIcon(selectedLog.severity)}
                    <span className="text-white font-semibold">{selectedLog.severity.toUpperCase()}</span>
                  </div>
                </div>
              </div>

              {selectedLog.resourceType && (
                <div className="rounded-lg bg-white/5 border border-white/10 p-4">
                  <p className="text-sm text-white/50 mb-2">Resource</p>
                  <p className="text-white">
                    <span className="font-semibold">{selectedLog.resourceType}</span>
                    {selectedLog.resourceName && ` - ${selectedLog.resourceName}`}
                  </p>
                  {selectedLog.resourceId && (
                    <p className="text-xs text-white/60 mt-1">ID: {selectedLog.resourceId}</p>
                  )}
                </div>
              )}

              <div className="rounded-lg bg-white/5 border border-white/10 p-4">
                <p className="text-sm text-white/50 mb-2">Description</p>
                <p className="text-white">{selectedLog.description}</p>
              </div>

              {selectedLog.metadata && (
                <div className="rounded-lg bg-white/5 border border-white/10 p-4">
                  <p className="text-sm text-white/50 mb-2">Metadata</p>
                  <pre className="text-xs text-white/70 overflow-x-auto">
                    {JSON.stringify(
                      typeof selectedLog.metadata === 'string'
                        ? JSON.parse(selectedLog.metadata)
                        : selectedLog.metadata,
                      null,
                      2
                    )}
                  </pre>
                </div>
              )}

              {selectedLog.ipAddress && (
                <div className="rounded-lg bg-white/5 border border-white/10 p-4">
                  <p className="text-sm text-white/50 mb-1">IP Address</p>
                  <p className="text-white font-mono">{selectedLog.ipAddress}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditLog;
