import React, { useCallback, useMemo, useState } from 'react';
import AccessDenied from '../../components/AccessDenied.jsx';
import AdminDataTable from '../../components/AdminDataTable.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { listLegalEntities } from '../../services/phase8OpsService.js';

const columns = [
  { key: 'name', label: 'Name' },
  { key: 'entityType', label: 'Type' },
  { key: 'registrationNumber', label: 'Registration' },
  { key: 'taxNumber', label: 'Tax Number' },
  { key: 'active', label: 'Active' },
  { key: 'createdAt', label: 'Created At' },
];

const Entities = () => {
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
      const result = await listLegalEntities({ limit: 25, cursor: append ? cursor : null });
      setRows((prev) => (append ? [...prev, ...(result.documents || [])] : result.documents || []));
      setCursor(result.nextCursor || null);
    } catch (err) {
      setError(err?.message || 'Failed to load legal entities.');
    } finally {
      setLoading(false);
    }
  }, [cursor]);

  React.useEffect(() => {
    if (!isAdminLike) return;
    load(false);
  }, [isAdminLike]);

  if (!isAdminLike) {
    return <AccessDenied title="Access denied" message="Entity management is restricted to admin users." />;
  }

  return (
    <AdminDataTable
      title="Entity Management"
      subtitle="Legal entities and active status (bank details are server-encrypted and not displayed)."
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

export default Entities;
