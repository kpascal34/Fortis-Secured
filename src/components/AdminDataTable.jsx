import React from 'react';

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
}) => {
  return (
    <section className="rounded-xl border border-white/10 bg-white/5 p-5">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-white">{title}</h1>
          {subtitle ? <p className="mt-1 text-sm text-white/70">{subtitle}</p> : null}
        </div>
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
        <div className="rounded-md border border-white/10 p-4 text-center text-sm text-white/60">Loading...</div>
      ) : null}

      {!loading && !error && rows.length === 0 ? (
        <div className="rounded-md border border-white/10 p-4 text-center text-sm text-white/60">No records found.</div>
      ) : null}

      {rows.length > 0 ? (
        <div className="overflow-hidden rounded-lg border border-white/10">
          <table className="w-full text-sm text-white">
            <thead className="bg-white/10 text-left text-xs uppercase tracking-wide text-white/60">
              <tr>
                {columns.map((column) => (
                  <th key={column.key} className="px-3 py-2">{column.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row.$id || row.id || `${title}-${index}`} className="border-t border-white/10">
                  {columns.map((column) => (
                    <td key={column.key} className="px-3 py-2">{normalizeCell(row[column.key])}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {hasMore ? (
        <button
          type="button"
          onClick={onLoadMore}
          disabled={loading}
          className="mt-3 rounded-md border border-white/20 px-3 py-1 text-xs font-semibold text-white hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Loading...' : 'Load More'}
        </button>
      ) : null}
    </section>
  );
};

export default AdminDataTable;
