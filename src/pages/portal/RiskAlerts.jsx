import React, { useCallback, useMemo, useState } from 'react';
import AccessDenied from '../../components/AccessDenied.jsx';
import AdminDataTable from '../../components/AdminDataTable.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { listUnifiedAlerts } from '../../services/phase8OpsService.js';

const columns = [
  { key: 'source', label: 'Source' },
  { key: 'entityId', label: 'Entity' },
  { key: 'clientId', label: 'Client' },
  { key: 'siteId', label: 'Site' },
  { key: 'alertType', label: 'Alert Type' },
  { key: 'leakageType', label: 'Leakage Type' },
  { key: 'severity', label: 'Severity' },
  { key: 'createdAt', label: 'Created At' },
];

const RiskAlerts = () => {
  const { user, resolvedRole } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isAdminLike = useMemo(() => {
    const role = String(resolvedRole || user?.role || '').toLowerCase();
    return role === 'admin' || role === 'entity_admin';
  }, [resolvedRole, user?.role]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const result = await listUnifiedAlerts({ limit: 50 });
      setRows(result.documents || []);
    } catch (err) {
      setError(err?.message || 'Failed to load alerts.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (!isAdminLike) return;
    load();
  }, [isAdminLike]);

  if (!isAdminLike) {
    return <AccessDenied title="Access denied" message="Risk alerts are restricted to admin users." />;
  }

  return (
    <AdminDataTable
      title="Enterprise Alerts"
      subtitle="Unified feed across margin, leakage, concentration, and contract dependency alerts."
      columns={columns}
      rows={rows}
      loading={loading}
      error={error}
      hasMore={false}
      onRetry={load}
    />
  );
};

export default RiskAlerts;
