import React, { useCallback, useMemo, useState } from 'react';
import AccessDenied from '../../components/AccessDenied.jsx';
import AdminDataTable from '../../components/AdminDataTable.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { listEmploymentRiskDashboard } from '../../services/phase8OpsService.js';

const columns = [
  { key: 'entityId', label: 'Entity' },
  { key: 'guardId', label: 'Guard' },
  { key: 'clientId', label: 'Client' },
  { key: 'siteId', label: 'Site' },
  { key: 'riskType', label: 'Risk Type' },
  { key: 'metricValue', label: 'Metric' },
  { key: 'thresholdValue', label: 'Threshold' },
  { key: 'severity', label: 'Severity' },
  { key: 'createdAt', label: 'Created At' },
];

const EmploymentRiskFlags = () => {
  const { user, resolvedRole } = useAuth();
  const [rows, setRows] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isAdminLike = useMemo(() => {
    const role = String(resolvedRole || user?.role || '').toLowerCase();
    return role === 'admin' || role === 'entity_admin';
  }, [resolvedRole, user?.role]);

  const load = useCallback(async (append = false) => {
    setLoading(true);
    setError('');

    try {
      const result = await listEmploymentRiskDashboard({ limit: 25, cursor: append ? cursor : null });
      setRows((prev) => (append ? [...prev, ...(result.documents || [])] : result.documents || []));
      setCursor(result.nextCursor || null);
    } catch (err) {
      setError(err?.message || 'Failed to load employment risk flags.');
    } finally {
      setLoading(false);
    }
  }, [cursor]);

  React.useEffect(() => {
    if (!isAdminLike) return;
    load(false);
  }, [isAdminLike]);

  if (!isAdminLike) {
    return <AccessDenied title="Access denied" message="Employment risk flags are restricted to admin users." />;
  }

  return (
    <AdminDataTable
      title="Employment Risk Flags"
      subtitle="Risk awareness only. This is not an IR35 legal determination."
      columns={columns}
      rows={rows}
      loading={loading}
      error={error}
      hasMore={Boolean(cursor)}
      onRetry={() => load(false)}
      onLoadMore={() => load(true)}
    />
  );
};

export default EmploymentRiskFlags;
