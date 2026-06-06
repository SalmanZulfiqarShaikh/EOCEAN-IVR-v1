import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ChevronDown, ChevronLeft, ChevronRight, Search } from 'lucide-react';

export default function DataTable({ columns, rows, searchable = false, pageSize: defaultPageSize = 50 }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = useMemo(() => {
    if (!searchTerm || !rows?.length) return rows || [];
    const term = searchTerm.toLowerCase();
    return rows.filter(row =>
      row.some(cell => String(cell ?? '').toLowerCase().includes(term))
    );
  }, [rows, searchTerm]);

  const sorted = useMemo(() => {
    if (sortCol === null) return filtered;
    return [...filtered].sort((a, b) => {
      const av = a[sortCol], bv = b[sortCol];
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;
      const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortCol, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const start = (currentPage - 1) * pageSize;
  const pageData = sorted.slice(start, start + pageSize);

  function handleSort(colIdx) {
    if (sortCol === colIdx) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(colIdx);
      setSortDir('asc');
    }
    setCurrentPage(1);
  }

  function formatCell(val, col) {
    if (val === null || val === undefined) return <span className="text-text-light italic">--</span>;
    const v = String(val);
    const colLower = (col || '').toLowerCase();
    if (colLower === 'duration' || colLower.includes('duration')) {
      const sec = parseInt(val, 10) || 0;
      if (sec === 0) return '--';
      const m = Math.floor(sec / 60), s = sec % 60;
      return `${m}m ${s}s`;
    }
    if (colLower === 'created_at' || colLower === 'date' || colLower === 'datetime') {
      return <span className="text-xs text-text-muted">{v}</span>;
    }
    return v;
  }

  return (
    <div>
      {searchable && (
        <div className="mb-3 flex items-center gap-3">
          <div className="search-shell w-full sm:w-72">
            <Search />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="premium-input"
            />
          </div>
          <span className="text-xs font-bold text-text-muted">{sorted.length.toLocaleString()} rows</span>
        </div>
      )}

      <div className="premium-table-shell custom-scrollbar max-h-[500px]">
        <table className="premium-table text-xs">
          <thead>
            <tr>
              {columns.map((col, i) => (
                <th
                  key={i}
                  onClick={() => handleSort(i)}
                  className={`cursor-pointer select-none hover:text-text-main ${sortCol === i ? 'text-text-main' : ''}`}
                >
                  <span className="inline-flex items-center gap-1.5">
                    {col.replace(/_/g, ' ')}
                    {sortCol === i && (
                      sortDir === 'asc'
                        ? <ArrowUp className="h-3 w-3 text-teal-dark" />
                        : <ArrowDown className="h-3 w-3 text-teal-dark" />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-12 text-center text-sm font-semibold text-text-light">
                  No records found
                </td>
              </tr>
            ) : (
              pageData.map((row, ri) => (
                <tr key={ri}>
                  {row.map((cell, ci) => (
                    <td
                      key={ci}
                      className="max-w-[220px] truncate text-text-main"
                      title={cell !== null ? String(cell) : ''}
                    >
                      {formatCell(cell, columns[ci])}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {sorted.length > pageSize && (
        <div className="premium-pagination">
          <span>
            Page {currentPage} of {totalPages} ({sorted.length.toLocaleString()} records)
          </span>
          <div className="flex items-center gap-3">
            <div className="select-shell w-28">
              <select
                value={pageSize}
                onChange={e => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                className="premium-select min-h-8 py-1 text-xs"
              >
                <option value={50}>50 / page</option>
                <option value={100}>100 / page</option>
                <option value={250}>250 / page</option>
              </select>
              <ChevronDown />
            </div>
            <div className="flex gap-1.5">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="btn-premium btn-ghost btn-icon h-8 w-8"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="btn-premium btn-ghost btn-icon h-8 w-8"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
