import { useState, useEffect, useCallback, useMemo } from 'react';
import { getReport, getReportMeta, deleteRow } from '../services/api';
import { useDb } from '../context/DbContext';
import Header from '../components/layout/Header';
import Badge from '../components/ui/Badge';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { ChevronDown, ChevronLeft, ChevronRight, Download, Play, RotateCcw, Search, SlidersHorizontal, Trash2 } from 'lucide-react';

export default function Reports() {
  const { selectedDb } = useDb();
  const [filters, setFilters] = useState({
    groupby: 'campaign_id',
    date_from: '',
    date_to: '',
    status: '',
    direction: '',
    dur_min: '',
    dur_max: '',
    campaign_id: '',
    customer_id: '',
    attempts_min: '',
  });
  const [meta, setMeta] = useState({ campaigns: [], customers: [] });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [reportSearch, setReportSearch] = useState('');
  const pageSize = 100;
  const [deleteTarget, setDeleteTarget] = useState(null); // { row, globalIdx }

  const loadMeta = useCallback(async () => {
    if (!selectedDb) return;
    try {
      const [cRes, cuRes] = await Promise.all([
        getReportMeta(selectedDb, 'campaign_id'),
        getReportMeta(selectedDb, 'customer_id'),
      ]);
      setMeta({
        campaigns: cRes.success ? cRes.data.values : [],
        customers: cuRes.success ? cuRes.data.values : [],
      });
    } catch (e) {
      console.error('Failed to load meta', e);
    }
  }, [selectedDb]);

  useEffect(() => {
    if (selectedDb) {
      loadMeta();
      setResult(null);
    }
  }, [selectedDb, loadMeta]);

  function updateFilter(key, value) {
    setFilters(prev => ({ ...prev, [key]: value }));
  }

  async function runReport() {
    if (!selectedDb) return;
    setLoading(true);
    setPage(1);
    setReportSearch('');
    const params = {};
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== '' && v !== null && v !== undefined) params[k] = v;
    });
    try {
      const res = await getReport(selectedDb, params);
      if (res.success) setResult(res.data);
    } catch (e) {
      console.error('Report error', e);
    } finally {
      setLoading(false);
    }
  }

  // Filter rows globally
  const filteredRows = useMemo(() => {
    if (!result?.rows) return [];
    if (!reportSearch) return result.rows;
    const term = reportSearch.toLowerCase();
    return result.rows.filter(row =>
      row.some(cell => String(cell ?? '').toLowerCase().includes(term))
    );
  }, [result?.rows, reportSearch]);

  // Paginate rows
  const pageData = useMemo(() => {
    return filteredRows.slice((page - 1) * pageSize, page * pageSize);
  }, [filteredRows, page, pageSize]);

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(filteredRows.length / pageSize));
  }, [filteredRows, pageSize]);

  const summaryCards = result?.summary ? [
    { label: 'Total Calls', value: formatNum(result.summary.total), bg: '#dbeafe', color: '#1e40af', border: '#bfdbfe' },
    { label: 'Answered', value: formatNum(result.summary.answered), bg: '#d1fae5', color: '#065f46', border: '#a7f3d0' },
    { label: 'Not Answered', value: formatNum(result.summary.not_answered), bg: '#fef3c7', color: '#92400e', border: '#fde68a' },
    { label: 'Hang Up', value: formatNum(result.summary.hangup || 0), bg: '#fce7f3', color: '#9d174d', border: '#fbcfe8' },
    { label: 'Avg Duration', value: fmtDuration(Math.round(result.summary.avg_duration || 0)), bg: '#f3e8ff', color: '#6b21a8', border: '#e9d5ff' },
    { label: 'Total Duration', value: fmtDuration(result.summary.total_duration || 0), bg: '#d1fae5', color: '#065f46', border: '#a7f3d0' },
  ] : [];

  function formatNum(n) {
    if (!n) return '0';
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
    return n.toLocaleString();
  }

  function fmtDuration(s) {
    if (!s) return '0s';
    const m = Math.floor(s / 60), sec = s % 60;
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
  }

  function formatCell(val, col) {
    if (val === null || val === undefined) return <span className="text-text-light italic">--</span>;
    const colLower = (col || '').toLowerCase();

    if (colLower === 'status' || col === 'call_status') {
      return <Badge status={String(val)}>{val}</Badge>;
    }
    if (colLower === 'direction' || colLower === 'call_type') {
      return <Badge status={String(val)}>{val}</Badge>;
    }
    if (colLower.includes('duration')) {
      const sec = parseInt(val, 10) || 0;
      return sec > 0 ? `${Math.floor(sec / 60)}m ${sec % 60}s` : '--';
    }
    if (colLower.includes('rate') || colLower === 'answer_rate') {
      const pct = parseInt(val, 10) || 0;
      return (
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-surface-border rounded-full overflow-hidden min-w-10">
            <div className={`h-full rounded-full ${pct >= 70 ? 'bg-green' : pct >= 40 ? 'bg-amber' : 'bg-red'}`} style={{ width: pct + '%' }} />
          </div>
          <span className={`text-xs font-bold ${pct >= 70 ? 'text-green-text' : pct >= 40 ? 'text-amber-text' : 'text-red-text'}`}>{pct}%</span>
        </div>
      );
    }
    return <span className="text-text-muted">{String(val)}</span>;
  }

  function exportCSV() {
    if (!result?.rows?.length) return;
    const cols = result.columns;
    const header = cols.join(',');
    const rows = result.rows.map(r => r.map(c => {
      const v = c === null ? '' : String(c);
      return v.includes(',') ? `"${v.replace(/"/g, '""')}"` : v;
    }).join(','));
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${selectedDb}_report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  }

  async function handleReportDelete() {
    if (!deleteTarget || !selectedDb) return;
    try {
      const rowObj = {};
      result.columns.forEach((col, i) => { rowObj[col] = deleteTarget.row[i]; });
      const res = await deleteRow(selectedDb, 'calls', rowObj);
      if (res.success) {
        const rows = result.rows.filter((_, i) => i !== deleteTarget.globalIdx);
        setResult(prev => ({ ...prev, rows }));
        setDeleteTarget(null);
      }
    } catch (e) {
      console.error('Report row delete failed', e);
    }
  }

  const groupLabel = filters.groupby === 'campaign_id' ? 'Campaign-wise' :
    filters.groupby === 'customer_id' ? 'Customer-wise' : 'Detail';

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header
        title="Call Reports"
        subtitle="Campaign-wise and customer-wise analytics with advanced filters"
        actions={
          <div className="flex items-center gap-2">
            <button onClick={runReport} disabled={loading} className="btn-premium btn-primary">
              <Play className="w-3.5 h-3.5" /> Run Report
            </button>
            <button onClick={exportCSV} disabled={!result?.rows?.length} className="btn-premium btn-accent">
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
          </div>
        }
      />

      <div className="flex-1 overflow-auto">
        <div className="max-w-350 mx-auto p-6 sm:p-8 lg:p-10 pb-10">
          {/* Filter Card */}
          <div className="premium-card mb-6 p-7">
            <div className="mb-4 flex items-center gap-2 text-[10px] font-extrabold uppercase text-text-light">
              <SlidersHorizontal className="h-3.5 w-3.5 text-teal-dark" />
              Report filters
              <span className="rounded-full border border-surface-border bg-surface-muted px-2 py-0.5 text-[10px] text-text-muted">10 fields</span>
              <span className="flex-1 h-px bg-surface-border" />
            </div>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-5">
              {/* Group By */}
              <div className="flex flex-col gap-1">
                <label className="premium-label">Group By</label>
                <div className="select-shell">
                  <select value={filters.groupby} onChange={e => updateFilter('groupby', e.target.value)} className="premium-select">
                    <option value="campaign_id">Campaign</option>
                    <option value="customer_id">Customer</option>
                    <option value="none">No Grouping (Detail)</option>
                  </select>
                  <ChevronDown />
                </div>
              </div>
              {/* Date From */}
              <div className="flex flex-col gap-1">
                <label className="premium-label">Date From</label>
                <input type="date" value={filters.date_from} onChange={e => updateFilter('date_from', e.target.value)} className="premium-input" />
              </div>
              {/* Date To */}
              <div className="flex flex-col gap-1">
                <label className="premium-label">Date To</label>
                <input type="date" value={filters.date_to} onChange={e => updateFilter('date_to', e.target.value)} className="premium-input" />
              </div>
              {/* Status */}
              <div className="flex flex-col gap-1">
                <label className="premium-label">Call Status</label>
                <div className="select-shell">
                  <select value={filters.status} onChange={e => updateFilter('status', e.target.value)} className="premium-select">
                    <option value="">All Statuses</option>
                    <option value="answered">Answered</option>
                    <option value="not_answered">Not Answered</option>
                    <option value="hangup">Hang Up</option>
                    <option value="busy">Busy</option>
                    <option value="failed">Failed</option>
                  </select>
                  <ChevronDown />
                </div>
              </div>
              {/* Direction */}
              <div className="flex flex-col gap-1">
                <label className="premium-label">Call Type</label>
                <div className="select-shell">
                  <select value={filters.direction} onChange={e => updateFilter('direction', e.target.value)} className="premium-select">
                    <option value="">All Types</option>
                    <option value="outgoing">Outgoing</option>
                    <option value="incoming">Incoming</option>
                  </select>
                  <ChevronDown />
                </div>
              </div>
              {/* Min Duration */}
              <div className="flex flex-col gap-1">
                <label className="premium-label">Min Duration (sec)</label>
                <input type="number" value={filters.dur_min} onChange={e => updateFilter('dur_min', e.target.value)} placeholder="e.g. 0" className="premium-input" />
              </div>
              {/* Max Duration */}
              <div className="flex flex-col gap-1">
                <label className="premium-label">Max Duration (sec)</label>
                <input type="number" value={filters.dur_max} onChange={e => updateFilter('dur_max', e.target.value)} placeholder="e.g. 300" className="premium-input" />
              </div>
              {/* Campaign filter */}
              <div className="flex flex-col gap-1">
                <label className="premium-label">Campaign</label>
                <div className="select-shell">
                  <select value={filters.campaign_id} onChange={e => updateFilter('campaign_id', e.target.value)} className="premium-select">
                    <option value="">All Campaigns</option>
                    {meta.campaigns.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                  <ChevronDown />
                </div>
              </div>
              {/* Customer filter */}
              <div className="flex flex-col gap-1">
                <label className="premium-label">Customer</label>
                <div className="select-shell">
                  <select value={filters.customer_id} onChange={e => updateFilter('customer_id', e.target.value)} className="premium-select">
                    <option value="">All Customers</option>
                    {meta.customers.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                  <ChevronDown />
                </div>
              </div>
              {/* Min Attempts */}
              <div className="flex flex-col gap-1">
                <label className="premium-label">Min Attempts</label>
                <input type="number" value={filters.attempts_min} onChange={e => updateFilter('attempts_min', e.target.value)} placeholder="e.g. 1" className="premium-input" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-3 pt-1">
              <button onClick={() => {
                setFilters({ groupby: 'campaign_id', date_from: '', date_to: '', status: '', direction: '', dur_min: '', dur_max: '', campaign_id: '', customer_id: '', attempts_min: '' });
                setResult(null);
                setReportSearch('');
              }} className="btn-premium btn-ghost">
                <RotateCcw className="h-3.5 w-3.5" />
                Reset
              </button>
              <button onClick={runReport} disabled={loading} className="btn-premium btn-primary">
                <Play className="w-3 h-3" /> Run Report
              </button>
            </div>
          </div>

          {/* Summary Cards */}
          {result?.summary && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 mb-6">
              {summaryCards.map((card, i) => (
                <div key={i} className="rounded-lg border p-3.5 text-center shadow-sm" style={{ background: card.bg, borderColor: card.border }}>
                  <div className="text-xl font-extrabold" style={{ color: card.color }}>{card.value}</div>
                  <div className="mt-1 text-[10px] font-bold uppercase" style={{ color: card.color, opacity: 0.7 }}>{card.label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Results Table */}
          <div className="premium-card overflow-hidden">
            <div className="premium-section-head flex flex-wrap items-center justify-between gap-4 px-6 py-4">
              <div className="min-w-0">
                <div className="text-sm font-bold text-text-main">{groupLabel} Report</div>
                <div className="text-xs text-text-light mt-0.5">
                  {result ? `${filteredRows.length.toLocaleString()} of ${result.rows.length.toLocaleString()} rows` : '0 rows'}
                </div>
              </div>
              {result && (
                <div className="search-shell">
                  <Search />
                  <input
                    type="text"
                    placeholder="Search report..."
                    value={reportSearch}
                    onChange={e => { setReportSearch(e.target.value); setPage(1); }}
                    className="premium-input w-40 sm:w-72"
                  />
                </div>
              )}
            </div>

            {loading ? (
              <LoadingSpinner text="Running report..." />
            ) : !result ? (
              <div className="flex items-center justify-center h-48 text-text-light text-sm font-medium">
                Select a database and run a report
              </div>
            ) : result.rows.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-text-light text-sm font-medium py-8">
                No records match the selected filters
              </div>
            ) : (
              <>
                <div className="overflow-auto max-h-150">
                  <table className="premium-table text-xs">
                    <thead>
                      <tr>
                        {result.columns.map((col, i) => (
                          <th key={i}>
                            {col.replace(/_/g, ' ')}
                          </th>
                        ))}
                        <th className="text-center" style={{ width: 60 }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageData.map((row, ri) => {
                        // Global index within the full filtered result
                        const globalIdx = (page - 1) * pageSize + ri;
                        return (
                        <tr key={globalIdx}>
                          {row.map((cell, ci) => {
                            const col = result.columns[ci];
                            // Answer rate column detection (for grouped reports)
                            if (col === 'answered' && result.columns.includes('total_calls')) {
                              const totalIdx = result.columns.indexOf('total_calls');
                              const total = row[totalIdx];
                              const pct = total && parseInt(total, 10) > 0 ? Math.round((parseInt(cell, 10) || 0) / parseInt(total, 10) * 100) : 0;
                              return (
                                <td key={ci}>
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold" style={{ color: pct >= 70 ? '#065f46' : pct >= 40 ? '#92400e' : '#991b1b' }}>{formatCell(cell, col)}</span>
                                    <div className="flex-1 h-1.5 bg-surface-border rounded-full overflow-hidden min-w-7.5 max-w-15">
                                      <div className={`h-full rounded-full ${pct >= 70 ? 'bg-green' : pct >= 40 ? 'bg-amber' : 'bg-red'}`} style={{ width: pct + '%' }} />
                                    </div>
                                  </div>
                                </td>
                              );
                            }
                            return <td key={ci}>{formatCell(cell, col)}</td>;
                          })}
                          <td className="text-center">
                            <button
                              onClick={() => setDeleteTarget({ row, globalIdx })}
                              className="btn-premium btn-ghost btn-icon h-7 w-7 rounded-md text-red hover:bg-red-bg hover:text-red-text hover:border-red/30"
                              title="Delete row"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {filteredRows.length > pageSize && (
                  <div className="premium-pagination">
                    <span>Page {page} of {totalPages} ({filteredRows.length.toLocaleString()} rows)</span>
                    <div className="flex items-center gap-3">
                      <div className="select-shell w-28">
                        <select
                          value={pageSize}
                          onChange={e => { setPage(1); /* pageSize is constant for now */ }}
                          className="premium-select min-h-8 py-1 text-xs"
                        >
                          <option value={100}>100 / page</option>
                          <option value={250}>250 / page</option>
                        </select>
                        <ChevronDown />
                      </div>
                      <div className="flex gap-1.5">
                        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="btn-premium btn-ghost btn-icon h-8 w-8">
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="btn-premium btn-ghost btn-icon h-8 w-8">
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Report Row Delete Confirmation ── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55" onClick={() => setDeleteTarget(null)}>
          <div className="premium-card w-100 max-w-[95vw] p-7" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-bg">
                <Trash2 className="w-5 h-5 text-red" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-text-main">Delete Record</h3>
                <p className="text-sm text-text-muted mt-0.5">This cannot be undone.</p>
              </div>
            </div>
            <p className="text-sm text-text-muted mb-5">
              Are you sure you want to delete this record from the <strong className="text-text-main">calls</strong> table?
            </p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setDeleteTarget(null)} className="btn-premium btn-ghost">Cancel</button>
              <button onClick={handleReportDelete} className="btn-premium btn-danger bg-red text-white hover:bg-red/80">
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
