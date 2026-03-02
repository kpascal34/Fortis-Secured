import React, { useCallback, useMemo, useState } from 'react';
import AccessDenied from '../../components/AccessDenied.jsx';
import AdminDataTable from '../../components/AdminDataTable.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { listResilienceDashboard } from '../../services/phase8OpsService.js';

const columns = [
  { key: 'entityId', label: 'Entity' },
  { key: 'staffDepthScore', label: 'Staff Depth' },
  { key: 'payeBalanceScore', label: 'PAYE Balance' },
  { key: 'complianceHealthScore', label: 'Compliance Health' },
  { key: 'incidentStabilityScore', label: 'Incident Stability' },
  { key: 'coverageConsistencyScore', label: 'Coverage Consistency' },
  { key: 'compositeResilienceScore', label: 'Composite Score' },
  { key: 'generatedAt', label: 'Generated At' },
];

const ResilienceDashboard = () => {
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
      const result = await listResilienceDashboard({ limit: 25, cursor: append ? cursor : null });
      setRows((prev) => (append ? [...prev, ...(result.documents || [])] : result.documents || []));
      setCursor(result.nextCursor || null);
    } catch (err) {
      setError(err?.message || 'Failed to load resilience snapshots.');
    } finally {
      setLoading(false);
    }
  }, [cursor]);

  React.useEffect(() => {
    if (!isAdminLike) return;
    load(false);
  }, [isAdminLike]);

  if (!isAdminLike) {
    return <AccessDenied title="Access denied" message="Resilience dashboard is restricted to admin users." />;
  }

  return (
    <AdminDataTable
      title="Resilience Dashboard"
      subtitle="Operational resilience trends and composite board metric by entity."
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

export default ResilienceDashboard;
