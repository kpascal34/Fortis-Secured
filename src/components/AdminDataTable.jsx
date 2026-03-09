import React, { useState, useMemo } from 'react';
import Skeleton from './ui/Skeleton';

const normalizeCell = (value) => {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'boolean') return value ? 'yes' : 'no';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

const csvEscape = (value) => {
  const str = normalizeCell(value);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
};

const toCsv = (rows, columns) => {
  const headers = columns.map((column) => column.key);
  const lines = [headers.join(',')];

  for (const row of rows) {
    lines.push(headers.map((key) => csvEscape(row[key])).join(','));
  }

  return lines.join('\n');
};

const downloadCsv = (fileName, content) => {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
};

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const SortIcon = ({ direction }) => (
  <svg className="inline-block ml-1 h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    {direction === 'asc' ? (
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
    ) : direction === 'desc' ? (
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    ) : (
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l4-4 4 4M8 15l4 4 4-4" opacity={0.3} />
    )}
  </svg>
);

const AdminDataTable = ({
  title,
  subtitle,
  columns,
  rows,
  loading,
  error,
  hasMore,
  onRetry,
  onLoadMore,
  onExport,
  pageSize: externalPageSize,
}) => {
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(externalPageSize || 25);

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
    setPage(0);
  };

  const sortedRows = useMemo(() => {
    if (!sortKey) return rows;
    return [...rows].sort((a, b) => {
      const aVal = a[sortKey] ?? '';
      const bVal = b[sortKey] ?? '';
      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();
      const aNum = Number(aVal);
      const bNum = Number(bVal);

      // Numeric sort if both values are numbers
      if (!isNaN(aNum) && !isNaN(bNum) && aVal !== '' && bVal !== '') {
        return sortDir === 'asc' ? aNum - bNum : bNum - aNum;
      }
      // String sort
      if (aStr < bStr) return sortDir === 'asc' ? -1 : 1;
      if (aStr > bStr) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [rows, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const paginatedRows = sortedRows.slice(page * pageSize, (page + 1) * pageSize);

  // Reset page when rows change
  React.useEffect(() => { setPage(0); }, [rows.length]);

  return (
    <section className="rounded-xl border border-white/10 bg-white/5 p-5">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-white">{title}</h1>
          {subtitle ? <p className="mt-1 text-sm text-white/70">{subtitle}</p> : null}
        </div>
        <div className="flex items-center gap-2">
          {rows.length > 0 && (
            <span className="text-xs text-white/50">{rows.length} records</span>
          )}
          <button
            type="button"
            onClick={() => {
              if (onExport) {
                onExport();
                return;
              }
              if (rows.length > 0) {
                const csv = toCsv(rows, columns);
                downloadCsv(`${title.toLowerCase().replace(/\s+/g, '_')}.csv`, csv);
              }
            }}
            disabled={rows.length === 0}
            className="rounded-md border border-white/20 px-3 py-1 text-xs font-semibold text-white hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Export CSV
          </button>
        </div>
      </div>

      {error ? (
        <div className="mb-4 rounded-md border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
          <p className="font-semibold">Data Unavailable</p>
          <p className="mt-1">{error}</p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 rounded-md border border-red-300/40 px-3 py-1 text-xs font-semibold text-red-100 hover:bg-red-500/20"
          >
            Retry
          </button>
        </div>
      ) : null}

      {loading && rows.length === 0 ? (
        <div className="space-y-3">
          <div className="flex gap-4">
            {columns.map((col) => (
              <Skeleton key={col.key} variant="text" className="h-4 flex-1" />
            ))}
          </div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-4">
              {columns.map((col) => (
                <Skeleton key={col.key} variant="text" className="h-4 flex-1" />
              ))}
            </div>
          ))}
        </div>
      ) : null}

      {!loading && !error && rows.length === 0 ? (
        <div className="rounded-md border border-white/10 p-8 text-center">
          <svg className="mx-auto h-10 w-10 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
          <p className="mt-3 text-sm text-white/60">No records found.</p>
        </div>
      ) : null}

      {rows.length > 0 ? (
        <>
          <div className="overflow-x-auto rounded-lg border border-white/10">
            <table className="w-full text-sm text-white">
              <thead className="bg-white/10 text-left text-xs uppercase tracking-wide text-white/60">
                <tr>
                  {columns.map((column) => (
                    <th
                      key={column.key}
                      className="px-3 py-2.5 cursor-pointer select-none hover:text-white/80 transition-colors whitespace-nowrap"
                      onClick={() => handleSort(column.key)}
                    >
                      {column.label}
                      <SortIcon direction={sortKey === column.key ? sortDir : null} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginatedRows.map((row, index) => (
                  <tr
                    key={row.$id || row.id || `${title}-${index}`}
                    className="border-t border-white/10 hover:bg-white/5 transition-colors"
                  >
                    {columns.map((column) => (
                      <td key={column.key} className="px-3 py-2.5 whitespace-nowrap">
                        {normalizeCell(row[column.key])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination controls */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-white/60">
            <div className="flex items-center gap-2">
              <span>Rows per page:</span>
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setPage(0); }}
                className="rounded border border-white/20 bg-transparent px-2 py-1 text-white focus:outline-none focus:border-brand"
              >
                {PAGE_SIZE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt} className="bg-night-sky text-white">{opt}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span>
                {page * pageSize + 1}-{Math.min((page + 1) * pageSize, sortedRows.length)} of {sortedRows.length}
              </span>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setPage(0)}
                  disabled={page === 0}
                  className="rounded border border-white/20 px-2 py-1 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label="First page"
                >
                  &laquo;
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="rounded border border-white/20 px-2 py-1 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label="Previous page"
                >
                  &lsaquo;
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="rounded border border-white/20 px-2 py-1 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label="Next page"
                >
                  &rsaquo;
                </button>
                <button
                  type="button"
                  onClick={() => setPage(totalPages - 1)}
                  disabled={page >= totalPages - 1}
                  className="rounded border border-white/20 px-2 py-1 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label="Last page"
                >
                  &raquo;
                </button>
              </div>
            </div>
          </div>

          {/* Load more for server-side pagination */}
          {hasMore ? (
            <button
              type="button"
              onClick={onLoadMore}
              disabled={loading}
              className="mt-3 w-full rounded-md border border-white/20 px-3 py-2 text-xs font-semibold text-white hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Loading...' : 'Load More from Server'}
            </button>
          ) : null}
        </>
      ) : null}
    </section>
  );
};

export default AdminDataTable;
