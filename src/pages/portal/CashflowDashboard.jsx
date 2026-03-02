import React, { useCallback, useMemo, useState } from 'react';
import AccessDenied from '../../components/AccessDenied.jsx';
import AdminDataTable from '../../components/AdminDataTable.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { listCashflowDashboard } from '../../services/phase8OpsService.js';

const columns = [
  { key: 'entityId', label: 'Entity' },
  { key: 'periodStart', label: 'Period Start' },
  { key: 'periodEnd', label: 'Period End' },
  { key: 'expectedReceipts', label: 'Expected Receipts' },
  { key: 'expectedPayrollOutflow', label: 'Payroll Outflow' },
  { key: 'taxReserveEstimate', label: 'Tax Reserve' },
  { key: 'netCashPosition', label: 'Net Cash' },
  { key: 'generatedAt', label: 'Generated At' },
];

const CashflowDashboard = () => {
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
      const result = await listCashflowDashboard({ limit: 25, cursor: append ? cursor : null });
      setRows((prev) => (append ? [...prev, ...(result.documents || [])] : result.documents || []));
      setCursor(result.nextCursor || null);
    } catch (err) {
      setError(err?.message || 'Failed to load cashflow snapshots.');
    } finally {
      setLoading(false);
    }
  }, [cursor]);

  React.useEffect(() => {
    if (!isAdminLike) return;
    load(false);
  }, [isAdminLike]);

  if (!isAdminLike) {
    return <AccessDenied title="Access denied" message="Cashflow dashboard is restricted to admin users." />;
  }

  return (
    <AdminDataTable
      title="Cashflow Dashboard"
      subtitle="Forward-looking cash position snapshots by legal entity."
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

export default CashflowDashboard;
