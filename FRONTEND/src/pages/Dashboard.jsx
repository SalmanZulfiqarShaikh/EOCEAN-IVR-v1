import { useState, useEffect, useCallback, useMemo } from 'react';
import { getDashboard } from '../services/api';
import { useDb } from '../context/DbContext';
import Header from '../components/layout/Header';
import KpiCard from '../components/ui/KpiCard';
import Badge from '../components/ui/Badge';
import TimelineChart from '../components/charts/TimelineChart';
import StatusDonut from '../components/charts/StatusDonut';
import CampaignBar from '../components/charts/CampaignBar';
import DurationChart from '../components/charts/DurationChart';
import HourlyChart from '../components/charts/HourlyChart';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { RefreshCw, Download, Search, ChevronLeft, ChevronRight, Database } from 'lucide-react';
import * as XLSX from 'xlsx';
import { NavLink } from 'react-router-dom';
import logoUrl from '../assets/images/eoceanlogo.webp';

export default function Dashboard() {
  const { selectedDb } = useDb();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [days, setDays] = useState(30);
  const [cdrSearch, setCdrSearch] = useState('');
  const [cdrPage, setCdrPage] = useState(1);
  const cdrPageSize = 50;

  const fetchData = useCallback(async () => {
    if (!selectedDb) return;
    setLoading(true);
    try {
      const res = await getDashboard(selectedDb, days);
      if (res.success) setData(res.data);
    } catch (e) {
      console.error('Dashboard error', e);
    } finally {
      setLoading(false);
    }
  }, [selectedDb, days]);

  useEffect(() => {
    if (selectedDb) fetchData();
    else setData(null);
  }, [selectedDb, fetchData]);

  const rangePills = [
    { label: '7d', value: 7 },
    { label: '30d', value: 30 },
    { label: '90d', value: 90 },
    { label: '365d', value: 365 },
    { label: 'All', value: 0 },
  ];

  const fmt = (n) => {
    if (!n) return '0';
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
    return n.toLocaleString();
  };

  const fmtDuration = (s) => {
    if (!s) return '0s';
    const m = Math.floor(s / 60), sec = s % 60;
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
  };

  const cdrFiltered = useMemo(() => {
    if (!data?.cdr) return [];
    if (!cdrSearch) return data.cdr;
    const term = cdrSearch.toLowerCase();
    return data.cdr.filter(r => Object.values(r).some(v => String(v || '').toLowerCase().includes(term)));
  }, [data?.cdr, cdrSearch]);

  const cdrTotalPages = Math.max(1, Math.ceil(cdrFiltered.length / cdrPageSize));
  const cdrPageData = cdrFiltered.slice((cdrPage - 1) * cdrPageSize, cdrPage * cdrPageSize);
  const cdrCols = cdrFiltered.length > 0 ? Object.keys(cdrFiltered[0]) : [];

  function exportCDR(format) {
    if (!cdrFiltered.length) return;
    if (format === 'csv') {
      const cols = Object.keys(cdrFiltered[0]);
      const header = cols.join(',');
      const rows = cdrFiltered.map(r => cols.map(c => {
        const v = r[c] === null ? '' : String(r[c]);
        return v.includes(',') ? `"${v.replace(/"/g, '""')}"` : v;
      }).join(','));
      const csv = [header, ...rows].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `CDR_${selectedDb}_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
    } else {
      const ws = XLSX.utils.json_to_sheet(cdrFiltered);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'CDR');
      XLSX.writeFile(wb, `CDR_${selectedDb}_${new Date().toISOString().split('T')[0]}.xlsx`);
    }
  }

  function exportDashboard(format) {
    if (!data) return;
    const date = new Date().toISOString().split('T')[0];
    const db = selectedDb || 'dashboard';

    if (format === 'csv') {
      if (!data.timeline?.length) return;
      const cols = Object.keys(data.timeline[0]);
      const csv = [cols.join(',')].concat(
        data.timeline.map(r => cols.map(c => r[c] ?? '').join(','))
      ).join('\n');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
      a.download = `Dashboard_${db}_${date}.csv`;
      a.click();
    } else {
      const wb = XLSX.utils.book_new();
      if (data.timeline?.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.timeline), 'Timeline');
      if (data.campaign_summary?.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.campaign_summary), 'Campaigns');
      if (data.status_breakdown?.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.status_breakdown), 'Status');
      XLSX.writeFile(wb, `Dashboard_${db}_${date}.xlsx`);
    }
  }

  // No database selected
  if (!selectedDb) {
    return (
      <div className="flex-1 flex flex-col">
        <Header title="Analytics Dashboard" subtitle="Real-time call analytics and performance metrics" />
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="premium-card max-w-lg w-full p-10 flex flex-col items-center">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-muted">
              <Database className="w-8 h-8 text-teal" />
            </div>
            <h2 className="text-xl font-bold text-text-main mb-3 text-center">No database selected</h2>
            <p className="text-sm text-text-muted leading-relaxed mb-7 text-center max-w-sm">
              Select a database from the sidebar to view your analytics, or head to the DB Manager to connect a new server.
            </p>
            <NavLink
              to="/db-manager"
              className="btn-premium btn-accent no-underline"
            >
              <Database className="w-4 h-4" />
              Open DB Manager
            </NavLink>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <Header
        title="Analytics Dashboard"
        subtitle={data ? `${selectedDb} · ${days === 0 ? 'All Time' : 'Last ' + days + ' days'} · ${new Date().toLocaleTimeString()}` : selectedDb}
        actions={
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="segmented-control hidden sm:flex">
              {rangePills.map(p => (
                <button
                  key={p.value}
                  onClick={() => { setDays(p.value); setCdrPage(1); }}
                  className={`segmented-btn ${days === p.value ? 'is-active' : ''}`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <button onClick={fetchData} className="btn-premium btn-ghost btn-icon shrink-0" title="Refresh dashboard">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => exportDashboard('xlsx')} className="btn-premium btn-accent shrink-0">
              <Download className="h-3.5 w-3.5" />
              Excel
            </button>
            <button onClick={() => exportDashboard('csv')} className="btn-premium btn-ghost shrink-0">
              CSV
            </button>
          </div>
        }
      />

      <div className="flex-1 overflow-auto min-h-0 custom-scrollbar">
        <div className="p-8 sm:p-10 lg:p-12 pb-12 xl:max-w-400 mx-auto">

          {loading && !data ? (
            <LoadingSpinner text="Loading analytics..." />
          ) : !data ? (
            <div className="flex items-center justify-center h-64 text-text-light text-sm font-medium">No data available</div>
          ) : (
            <>
              {/* Alerts */}
              {data.alerts?.length > 0 && (
                <div className={`mb-8 flex items-start gap-2 rounded-lg px-4 py-2.5 text-xs font-bold shadow-sm ${
                  data.alerts.some(a => a.includes('below') || a.includes('High') || a.includes('Low'))
                    ? 'bg-amber-bg text-amber-text border border-amber/30'
                    : 'bg-green-bg text-green-text border border-green/30'
                }`}>
                  <span className="text-sm leading-none mt-0.5 shrink-0">
                    {data.alerts.some(a => a.includes('below') || a.includes('High') || a.includes('Low')) ? (
                      <svg className="w-4 h-4 text-amber-text shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
                    ) : (
                      <svg className="w-4 h-4 text-green-text shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    )}
                  </span>
                  <div className="flex flex-wrap gap-x-3 gap-y-1">{data.alerts.map((a, i) => <span key={i}>{a}</span>)}</div>
                </div>
              )}

              {/* KPI Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-14">
                <KpiCard value={fmt(data.kpi.total)} label="Total Calls" color="#4ecdc4" />
                <KpiCard value={fmt(data.kpi.answered)} label="Answered" color="#2a9d8f" />
                <KpiCard value={fmt(data.kpi.not_answered)} label="Not Answered" color="#f59e0b" />
                <KpiCard value={fmt(data.kpi.hangup || 0)} label="Hang Up" color="#ec4899" />
                <KpiCard value={data.kpi.total ? Math.round(data.kpi.answered / data.kpi.total * 100) + '%' : '0%'} label="Answer Rate" color="#1a2353" />
                <KpiCard value={fmtDuration(Math.round(data.kpi.avg_duration || 0))} label="Avg Duration" color="#242d63" />
                <KpiCard value={fmtDuration(data.kpi.total_duration || 0)} label="Total Duration" color="#2e3875" />
                <KpiCard value={fmt(data.kpi.today || 0)} label="Today" color="#4ecdc4" />
              </div>

              {/* Charts Row 1 */}
              <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-8 mb-14">
                <div className="premium-card premium-card-hover min-w-0 p-7">
                  <div className="text-sm font-bold text-text-main mb-1">Calls Over Time</div>
                  <div className="text-xs text-text-light mb-5">Daily call volume trend</div>
                  <TimelineChart data={data.timeline} />
                </div>
                <div className="premium-card premium-card-hover min-w-0 p-7">
                  <div className="text-sm font-bold text-text-main mb-1">Call Status Breakdown</div>
                  <div className="text-xs text-text-light mb-5">Distribution by outcome</div>
                  <StatusDonut data={data.status_breakdown} />
                </div>
              </div>

              {/* Charts Row 2 */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-14">
                <div className="premium-card premium-card-hover min-w-0 p-7">
                  <div className="text-sm font-bold text-text-main mb-1">Top Campaigns</div>
                  <div className="text-xs text-text-light mb-5">Call volume per campaign</div>
                  <CampaignBar data={data.campaign_summary} />
                </div>
                <div className="premium-card premium-card-hover min-w-0 p-7">
                  <div className="text-sm font-bold text-text-main mb-1">Duration Distribution</div>
                  <div className="text-xs text-text-light mb-5">Calls by duration range</div>
                  <DurationChart data={data.duration_dist} />
                </div>
                <div className="premium-card premium-card-hover min-w-0 p-7">
                  <div className="text-sm font-bold text-text-main mb-1">Calls by Hour</div>
                  <div className="text-xs text-text-light mb-5">Peak call hours of day</div>
                  <HourlyChart data={data.hourly} />
                </div>
              </div>

              {/* CDR Section */}
              <div className="premium-card overflow-hidden">
                <div className="premium-section-head flex flex-wrap items-center justify-between gap-4 px-8 py-5">
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-text-main">Call Detail Records (CDR)</div>
                    <div className="text-xs text-text-light mt-0.5">{cdrFiltered.length.toLocaleString()} records</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="search-shell">
                      <Search />
                      <input
                        type="text"
                        placeholder="Search CDR..."
                        value={cdrSearch}
                        onChange={e => { setCdrSearch(e.target.value); setCdrPage(1); }}
                        className="premium-input w-40 sm:w-72"
                      />
                    </div>
                    <button onClick={() => exportCDR('xlsx')} className="btn-premium btn-accent shrink-0">
                      <Download className="h-3.5 w-3.5" />
                      Excel
                    </button>
                    <button onClick={() => exportCDR('csv')} className="btn-premium btn-ghost shrink-0">CSV</button>
                  </div>
                </div>

                <div className="custom-scrollbar max-h-150 overflow-auto">
                  {cdrPageData.length === 0 ? (
                    <div className="flex items-center justify-center h-32 text-text-light text-sm font-medium py-8">No records</div>
                  ) : (
                    <table className="premium-table text-sm">
                      <thead className="sticky top-0 z-10">
                        <tr>
                          {cdrCols.map((col, i) => (
                            <th key={i}>
                              {col.replace(/_/g, ' ')}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {cdrPageData.map((row, ri) => (
                          <tr key={ri}>
                            {cdrCols.map((col, ci) => {
                              const v = row[col];
                              if (v === null || v === undefined) return <td key={ci} className="text-text-light italic">--</td>;
                              if (col === 'status') return <td key={ci} className="py-3"><Badge status={v} /></td>;
                              if (col === 'duration') {
                                const sec = parseInt(v, 10) || 0;
                                return <td key={ci} className="font-semibold text-text-muted py-3">{sec > 0 ? `${Math.floor(sec / 60)}m ${sec % 60}s` : '--'}</td>;
                              }
                              if (col === 'direction' || col === 'call_type') return <td key={ci} className="py-3"><Badge status={v} /></td>;
                              return <td key={ci} className="max-w-50 truncate text-text-muted" title={String(v)}>{String(v)}</td>;
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                {cdrFiltered.length > cdrPageSize && (
                  <div className="premium-pagination">
                    <span className="truncate">Page {cdrPage} of {cdrTotalPages}</span>
                    <div className="flex gap-1.5 shrink-0">
                      <button onClick={() => setCdrPage(p => Math.max(1, p - 1))} disabled={cdrPage <= 1} className="btn-premium btn-ghost btn-icon h-8 w-8">
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button onClick={() => setCdrPage(p => Math.min(cdrTotalPages, p + 1))} disabled={cdrPage >= cdrTotalPages} className="btn-premium btn-ghost btn-icon h-8 w-8">
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
