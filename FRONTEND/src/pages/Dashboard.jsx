import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { getDashboard, updateRow, deleteRow } from '../services/api';
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
import { RefreshCw, Download, Search, ChevronLeft, ChevronRight, Database, FileText, X, Pencil, Trash2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { NavLink } from 'react-router-dom';
import logoUrl from '../assets/images/eoceanlogo.webp';
import jsPDF from 'jspdf';

export default function Dashboard() {
  const { selectedDb } = useDb();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [days, setDays] = useState(30);
  const [cdrSearch, setCdrSearch] = useState('');
  const [cdrPage, setCdrPage] = useState(1);
  const cdrPageSize = 50;
  const [showReport, setShowReport] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [toast, setToast] = useState(null); // { message, type: 'success'|'error' }
  const reportRef = useRef(null);
  // CDR edit / delete state
  const [cdrEditIdx, setCdrEditIdx] = useState(null);       // index in cdrFiltered
  const [cdrEditData, setCdrEditData] = useState(null);     // editable copy of the row
  const [cdrDeleteIdx, setCdrDeleteIdx] = useState(null);   // index in cdrFiltered

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3500);
      return () => clearTimeout(t);
    }
  }, [toast]);

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
      // Build a comprehensive CSV with summary + sections
      const lines = [];

      // Header info
      lines.push(`Dashboard Report - ${db} - ${days === 0 ? 'All Time' : `Last ${days} days`}`);
      lines.push(`Generated: ${new Date().toLocaleString()}`);
      lines.push('');

      // KPI Summary
      lines.push('--- KPI SUMMARY ---');
      lines.push('Metric,Value');
      lines.push(`Total Calls,${data.kpi.total}`);
      lines.push(`Answered,${data.kpi.answered}`);
      lines.push(`Not Answered,${data.kpi.not_answered}`);
      lines.push(`Hang Up,${data.kpi.hangup || 0}`);
      lines.push(`Answer Rate,${data.kpi.total ? Math.round(data.kpi.answered / data.kpi.total * 100) + '%' : '0%'}`);
      lines.push(`Avg Duration (s),${Math.round(data.kpi.avg_duration || 0)}`);
      lines.push(`Total Duration (s),${data.kpi.total_duration || 0}`);
      lines.push(`Today,${data.kpi.today || 0}`);
      lines.push('');

      // Timeline
      if (data.timeline?.length) {
        lines.push('--- CALLS OVER TIME ---');
        const tCols = Object.keys(data.timeline[0]);
        lines.push(tCols.join(','));
        data.timeline.forEach(r => lines.push(tCols.map(c => r[c] ?? '').join(',')));
        lines.push('');
      }

      // Campaign Summary
      if (data.campaign_summary?.length) {
        lines.push('--- TOP CAMPAIGNS ---');
        const cCols = Object.keys(data.campaign_summary[0]);
        lines.push(cCols.join(','));
        data.campaign_summary.forEach(r => lines.push(cCols.map(c => r[c] ?? '').join(',')));
        lines.push('');
      }

      // Status Breakdown
      if (data.status_breakdown?.length) {
        lines.push('--- CALL STATUS BREAKDOWN ---');
        const sCols = Object.keys(data.status_breakdown[0]);
        lines.push(sCols.join(','));
        data.status_breakdown.forEach(r => lines.push(sCols.map(c => r[c] ?? '').join(',')));
      }

      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv' }));
      a.download = `Dashboard_${db}_${date}.csv`;
      a.click();
    } else {
      const wb = XLSX.utils.book_new();
      // Meta sheet
      const metaData = [
        ['Dashboard Report', db],
        ['Period', days === 0 ? 'All Time' : `Last ${days} days`],
        ['Generated', new Date().toLocaleString()],
        [],
        ['KPI', 'Value'],
        ['Total Calls', data.kpi.total],
        ['Answered', data.kpi.answered],
        ['Not Answered', data.kpi.not_answered],
        ['Hang Up', data.kpi.hangup || 0],
        ['Answer Rate', data.kpi.total ? Math.round(data.kpi.answered / data.kpi.total * 100) + '%' : '0%'],
        ['Avg Duration (s)', Math.round(data.kpi.avg_duration || 0)],
        ['Total Duration (s)', data.kpi.total_duration || 0],
        ['Today', data.kpi.today || 0],
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(metaData), 'Summary');

      if (data.timeline?.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.timeline), 'Timeline');
      if (data.campaign_summary?.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.campaign_summary), 'Campaigns');
      if (data.status_breakdown?.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.status_breakdown), 'Status');
      if (data.duration_dist?.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.duration_dist), 'Duration Distribution');
      if (data.hourly?.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.hourly), 'Hourly Breakdown');
      XLSX.writeFile(wb, `Dashboard_${db}_${date}.xlsx`);
    }
  }

  // ── CDR Edit / Delete handlers ──
  function openCdrEdit(idx) {
    const row = cdrFiltered[idx];
    if (!row) return;
    setCdrEditIdx(idx);
    setCdrEditData({ ...row });
  }

  async function saveCdrEdit() {
    if (cdrEditIdx === null || !cdrEditData) return;
    try {
      const oldRow = cdrFiltered[cdrEditIdx];
      const res = await updateRow(selectedDb, 'calls', oldRow, cdrEditData);
      if (res.success) {
        const cdr = [...(data?.cdr || [])];
        const realIdx = cdr.indexOf(oldRow);
        if (realIdx !== -1) cdr[realIdx] = cdrEditData;
        setData(prev => ({ ...prev, cdr }));
        setCdrEditIdx(null);
        setCdrEditData(null);
        setToast({ message: 'CDR row updated!', type: 'success' });
      }
    } catch (e) {
      console.error('CDR edit failed', e);
      setToast({ message: 'Failed to update CDR: ' + (e?.message || e), type: 'error' });
    }
  }

  function openCdrDelete(idx) {
    setCdrDeleteIdx(idx);
  }

  async function confirmCdrDelete() {
    if (cdrDeleteIdx === null) return;
    try {
      const row = cdrFiltered[cdrDeleteIdx];
      const res = await deleteRow(selectedDb, 'calls', row);
      if (res.success) {
        const cdr = (data?.cdr || []).filter(r => r !== row);
        setData(prev => ({ ...prev, cdr }));
        setCdrDeleteIdx(null);
        setToast({ message: 'CDR row deleted!', type: 'success' });
      }
    } catch (e) {
      console.error('CDR delete failed', e);
      setToast({ message: 'Failed to delete CDR: ' + (e?.message || e), type: 'error' });
    }
  }

  async function generatePDF() {
    if (!data || !reportRef.current) return;
    setGeneratingPdf(true);
    try {
      const db = selectedDb || 'dashboard';
      const date = new Date().toISOString().split('T')[0];
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pw = pdf.internal.pageSize.getWidth();
      const ph = pdf.internal.pageSize.getHeight();
      const m = 14;
      const cw = pw - m * 2;
      let y = m;

      // ──────────────────────────────────────────────────
      //  Build the PDF without html2canvas — directly from
      //  text + serialised recharts SVG images.
      // ──────────────────────────────────────────────────

      // ---- helpers ----
      const addText = (txt, size, color) => {
        pdf.setFontSize(size);
        if (color) pdf.setTextColor(color[0], color[1], color[2]);
        const lines = pdf.splitTextToSize(txt, cw);
        for (const l of lines) {
          if (y + size * 0.35 > ph - m) { pdf.addPage(); y = m; }
          pdf.text(l, m, y);
          y += size * 0.35;
        }
        return y;
      };

      // ════════  TITLE  ════════
      pdf.setFontSize(20);
      pdf.setTextColor(26, 35, 83);
      pdf.text('Analytics Dashboard Report', m, y);
      y += 9;
      pdf.setFontSize(9);
      pdf.setTextColor(120);
      const period = days === 0 ? 'All Time' : `Last ${days} days`;
      pdf.text(`${db}  ·  ${period}`, m, y); y += 5;
      pdf.text(`Generated ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`, m, y);
      y += 8;

      // ════════  KPI SUMMARY  ════════
      pdf.setFontSize(12);
      pdf.setTextColor(26, 35, 83);
      pdf.text('Key Performance Indicators', m, y); y += 6;

      const kpis = [
        ['Total Calls', fmt(data.kpi.total)],
        ['Answered', fmt(data.kpi.answered)],
        ['Not Answered', fmt(data.kpi.not_answered)],
        ['Hang Up', fmt(data.kpi.hangup || 0)],
        ['Answer Rate', data.kpi.total ? Math.round(data.kpi.answered / data.kpi.total * 100) + '%' : '0%'],
        ['Avg Duration', fmtDuration(Math.round(data.kpi.avg_duration || 0))],
        ['Total Duration', fmtDuration(data.kpi.total_duration || 0)],
        ['Today', fmt(data.kpi.today || 0)],
      ];
      const colW = cw / 4;
      kpis.forEach((k, i) => {
        const col = i % 4, row = Math.floor(i / 4);
        const x = m + col * colW, yy = y + row * 14;
        pdf.setFillColor(248, 249, 252);
        pdf.setDrawColor(220, 220, 225);
        pdf.roundedRect(x, yy - 4, colW - 3, 12, 1, 1, 'FD');
        pdf.setTextColor(78, 205, 196);
        pdf.setFontSize(10);
        pdf.text(k[1], x + 2, yy + 2);
        pdf.setTextColor(120);
        pdf.setFontSize(7);
        pdf.text(k[0], x + 2, yy + 9);
      });
      y += 32;

      // ════════  NATIVE PDF CHARTS  ════════
      // Drawn with jsPDF primitives (lines, rects, arcs) — no DOM capture needed.

      // ── LINE CHART: Calls Over Time ──
      pdf.setFontSize(12);
      pdf.setTextColor(26, 35, 83);
      pdf.text('Calls Over Time', m, y); y += 3;
      pdf.setFontSize(7);
      pdf.setTextColor(150);
      pdf.text('Daily call volume trend', m, y); y += 6;

      if (data.timeline && data.timeline.length > 1) {
        const chartW = cw;
        const chartH = 70;
        const l = m, t = y, r = m + chartW, b = y + chartH;
        const padL = 28, padR = 8, padT = 8, padB = 18;
        const plotL = l + padL, plotR = r - padR, plotT = t + padT, plotB = b - padB;
        const plotW = plotR - plotL, plotH = plotB - plotT;

        // Determine Y range
        let maxVal = 0;
        data.timeline.forEach(d => {
          if (d.total > maxVal) maxVal = d.total;
          if (d.answered > maxVal) maxVal = d.answered;
          if (d.not_answered > maxVal) maxVal = d.not_answered;
        });
        maxVal = Math.ceil(maxVal * 1.2) || 10;
        const yStep = Math.max(1, Math.ceil(maxVal / 4));

        // Grid lines & Y labels
        pdf.setDrawColor(230, 230, 235);
        pdf.setFontSize(6);
        pdf.setTextColor(160, 160, 170);
        for (let v = 0; v <= maxVal; v += yStep) {
          const yy = plotB - (v / maxVal) * plotH;
          pdf.line(plotL, yy, plotR, yy);
          pdf.text(String(v), plotL - 4, yy + 2, { align: 'right' });
        }

        // X labels (show a few dates)
        const dateStep = Math.max(1, Math.floor(data.timeline.length / 5));
        for (let i = 0; i < data.timeline.length; i += dateStep) {
          const xp = plotL + (i / (data.timeline.length - 1)) * plotW;
          pdf.setFontSize(5);
          pdf.setTextColor(160, 160, 170);
          const label = data.timeline[i].date.slice(5); // MM-DD
          pdf.text(label, xp, b - 4, { align: 'center' });
        }

        // Axes
        pdf.setDrawColor(180, 180, 190);
        pdf.line(plotL, plotT, plotL, plotB);
        pdf.line(plotL, plotB, plotR, plotB);

        // Helper to draw a line series
        const drawSeries = (key, color) => {
          pdf.setDrawColor(color[0], color[1], color[2]);
          pdf.setFillColor(color[0], color[1], color[2]);
          for (let i = 1; i < data.timeline.length; i++) {
            const prev = data.timeline[i - 1];
            const curr = data.timeline[i];
            const x1 = plotL + ((i - 1) / (data.timeline.length - 1)) * plotW;
            const x2 = plotL + (i / (data.timeline.length - 1)) * plotW;
            const y1 = plotB - ((prev[key] || 0) / maxVal) * plotH;
            const y2 = plotB - ((curr[key] || 0) / maxVal) * plotH;
            pdf.line(x1, y1, x2, y2);
            // Dot at each data point
            pdf.circle(x2, y2, 1, 'F');
          }
          // First dot
          const x0 = plotL;
          const y0 = plotB - ((data.timeline[0][key] || 0) / maxVal) * plotH;
          pdf.circle(x0, y0, 1, 'F');
        };

        drawSeries('total', [26, 35, 83]);
        drawSeries('answered', [78, 205, 196]);
        drawSeries('not_answered', [245, 158, 11]);

        // Legend
        const legendItems = [
          { label: 'Total', color: [26, 35, 83] },
          { label: 'Answered', color: [78, 205, 196] },
          { label: 'Not Ans', color: [245, 158, 11] },
        ];
        const legendX = l + 4;
        const legendY = b + 5;
        legendItems.forEach((item, i) => {
          const lx = legendX + i * 50;
          pdf.setFillColor(item.color[0], item.color[1], item.color[2]);
          pdf.circle(lx, legendY, 1.5, 'F');
          pdf.setFontSize(6);
          pdf.setTextColor(120);
          pdf.text(item.label, lx + 4, legendY + 1);
        });

        y = b + 14;
      }

      // ── BAR CHART: Top Campaigns ──
      if (data.campaign_summary && data.campaign_summary.length > 0) {
        if (y + 65 > ph - m) { pdf.addPage(); y = m; }

        pdf.setFontSize(12);
        pdf.setTextColor(26, 35, 83);
        pdf.text('Top Campaigns', m, y); y += 3;
        pdf.setFontSize(7);
        pdf.setTextColor(150);
        pdf.text('Call volume per campaign', m, y); y += 5;

        const barW = cw;
        const barH = Math.min(55, data.campaign_summary.length * 7 + 8);
        const bl = m, bt = y, br = m + barW, bb = y + barH;
        const bPadL = 50, bPadR = 8, bPadT = 4, bPadB = 4;
        const bPlotL = bl + bPadL, bPlotR = br - bPadR;

        // Max value
        const campMax = Math.max(...data.campaign_summary.map(c => c.total), 1);
        const barArea = bPlotR - bPlotL - 4;

        pdf.setDrawColor(230, 230, 235);
        pdf.line(bPlotR, bt + bPadT, bPlotR, bb - bPadB);

        const items = data.campaign_summary.slice(0, 8);
        const rowH = (barH - bPadT - bPadB) / items.length;

        items.forEach((camp, i) => {
          const ry = bt + bPadT + i * rowH;
          const barLen = (camp.total / campMax) * barArea;

          // Label
          pdf.setFontSize(6);
          pdf.setTextColor(80);
          let label = String(camp.campaign_id || '');
          if (label.length > 14) label = label.slice(0, 13) + '...';
          pdf.text(label, bPlotL - 4, ry + rowH / 2 + 2, { align: 'right' });

          // Bar
          pdf.setFillColor(78, 205, 196);
          pdf.roundedRect(bPlotL, ry + 1, barLen, rowH - 2, 1, 1, 'F');

          // Value
          pdf.setTextColor(100);
          pdf.setFontSize(6);
          pdf.text(String(camp.total), bPlotL + barLen + 3, ry + rowH / 2 + 2);
        });

        y = bb + 10;
      }

      // ── DONUT / STATUS BREAKDOWN ──
      if (data.status_breakdown && data.status_breakdown.length > 0) {
        if (y + 55 > ph - m) { pdf.addPage(); y = m; }

        pdf.setFontSize(12);
        pdf.setTextColor(26, 35, 83);
        pdf.text('Call Status Breakdown', m, y); y += 3;
        pdf.setFontSize(7);
        pdf.setTextColor(150);
        pdf.text('Distribution by outcome', m, y); y += 4;

        const total = data.status_breakdown.reduce((s, d) => s + d.count, 0) || 1;
        const statusColors = {
          answered: [16, 185, 129],    // green
          not_answered: [234, 179, 8], // yellow
          failed: [239, 68, 68],       // red
          hangup: [168, 85, 247],      // purple
          busy: [249, 115, 22],        // orange
          unknown: [209, 213, 219],
        };

        // Horizontal stacked bar
        const sbL = m, sbR = m + cw;
        const sbY = y, sbH = 16;
        let sx = sbL;

        // Draw segments
        data.status_breakdown.forEach(d => {
          const pct = d.count / total;
          const segW = pct * (sbR - sbL);
          if (segW < 0.5) return;
          const color = statusColors[d.status] || [180, 180, 180];
          pdf.setFillColor(color[0], color[1], color[2]);
          pdf.rect(sx, sbY, segW, sbH, 'F');
          sx += segW;
        });

        // Border
        pdf.setDrawColor(200, 200, 205);
        pdf.rect(sbL, sbY, sbR - sbL, sbH, 'S');

        // Legend below — two-column grid so text is readable
        const legY = sbY + sbH + 8;
        const halfCol = (sbR - sbL) / 2;
        data.status_breakdown.forEach((d, i) => {
          const color = statusColors[d.status] || [180, 180, 180];
          const pct = Math.round((d.count / total) * 100);
          const col = i % 2;
          const row = Math.floor(i / 2);
          const lx = sbL + col * halfCol;
          const ly = legY + row * 8;

          pdf.setFillColor(color[0], color[1], color[2]);
          pdf.rect(lx, ly, 4, 4, 'F');
          pdf.setFontSize(7);
          pdf.setTextColor(80);
          pdf.text(`${d.status.replace('_', ' ')}  ${d.count} (${pct}%)`, lx + 6, ly + 3);
        });

        y = legY + Math.ceil(data.status_breakdown.length / 2) * 8 + 6;
      }

      // ════════  FOOTER  ════════
      pdf.setFontSize(8);
      pdf.setTextColor(180);
      pdf.text('Generated by IVR Analytics Dashboard', m, ph - m);

      pdf.save(`Dashboard_Report_${db}_${date}.pdf`);
      setToast({ message: 'PDF report downloaded successfully!', type: 'success' });
    } catch (e) {
      console.error('PDF generation failed:', e);
      setToast({ message: 'PDF failed: ' + (e?.message || String(e) || 'Unknown error'), type: 'error' });
    } finally {
      setGeneratingPdf(false);
    }
  }

  // ═══ Report Preview Modal ═══════════════════════════════════════
  function ReportPreview() {
    if (!data) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setShowReport(false)}>
        <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
          {/* Modal header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Analytics Report</h2>
              <p className="text-xs text-gray-500 mt-0.5">{selectedDb} · {days === 0 ? 'All Time' : `Last ${days} days`}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={generatePDF}
                disabled={generatingPdf}
                className="inline-flex items-center gap-2 bg-teal hover:bg-teal-dark text-white font-semibold text-xs px-4 py-2 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                {generatingPdf ? 'Generating...' : 'Download PDF'}
              </button>
              <button onClick={() => setShowReport(false)} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Report content — captured by html2canvas */}
          <div className="flex-1 overflow-y-auto p-6 bg-[#f8f9fc]">
            <div ref={reportRef}>
              {/* Letterhead */}
            <div className="text-center mb-8 pb-6 border-b-2 border-gray-200">
              <h1 className="text-2xl font-extrabold text-[#1a2353] tracking-tight">Analytics Dashboard Report</h1>
              <p className="text-sm text-gray-500 mt-1.5">
                {selectedDb} · Generated {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                Period: {days === 0 ? 'All Time' : `Last ${days} days`}
              </p>
            </div>

            {/* KPI Summary */}
            <div className="mb-8">
              <h3 className="text-xs font-extrabold uppercase tracking-widest text-gray-500 mb-3">Key Performance Indicators</h3>
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: 'Total Calls', value: fmt(data.kpi.total), color: '#4ecdc4' },
                  { label: 'Answered', value: fmt(data.kpi.answered), color: '#2a9d8f' },
                  { label: 'Not Answered', value: fmt(data.kpi.not_answered), color: '#f59e0b' },
                  { label: 'Hang Up', value: fmt(data.kpi.hangup || 0), color: '#ec4899' },
                  { label: 'Answer Rate', value: data.kpi.total ? Math.round(data.kpi.answered / data.kpi.total * 100) + '%' : '0%', color: '#1a2353' },
                  { label: 'Avg Duration', value: fmtDuration(Math.round(data.kpi.avg_duration || 0)), color: '#242d63' },
                  { label: 'Total Duration', value: fmtDuration(data.kpi.total_duration || 0), color: '#2e3875' },
                  { label: 'Today', value: fmt(data.kpi.today || 0), color: '#4ecdc4' },
                ].map((kpi, i) => (
                  <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 text-center shadow-sm">
                    <div className="text-2xl font-extrabold" style={{ color: kpi.color }}>{kpi.value}</div>
                    <div className="text-[10px] font-bold uppercase text-gray-500 mt-1.5 tracking-wide">{kpi.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Charts — use same chart components but in report-friendly layout */}
            <div className="mb-8" id="report-timeline">
              <h3 className="text-xs font-extrabold uppercase tracking-widest text-gray-500 mb-3">Calls Over Time</h3>
              <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <TimelineChart data={data.timeline} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-8">
              <div id="report-campaigns">
                <h3 className="text-xs font-extrabold uppercase tracking-widest text-gray-500 mb-3">Top Campaigns</h3>
                <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                  <CampaignBar data={data.campaign_summary} />
                </div>
              </div>
              <div id="report-status">
                <h3 className="text-xs font-extrabold uppercase tracking-widest text-gray-500 mb-3">Call Status Breakdown</h3>
                <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                  <StatusDonut data={data.status_breakdown} />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center text-[10px] text-gray-400 mt-8 pt-4 border-t border-gray-200">
              Generated by IVR Analytics Dashboard · {new Date().toLocaleString()}
            </div>
          </div>
        </div>
      </div>
    </div>
    );
  }
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
            <button onClick={() => setShowReport(true)} className="btn-premium btn-accent shrink-0">
              <FileText className="h-3.5 w-3.5" />
              Report
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
                          <th className="text-center" style={{ width: 80 }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cdrPageData.map((row, ri) => {
                          // Global index within the full filtered list
                          const globalIdx = (cdrPage - 1) * cdrPageSize + ri;
                          return (
                          <tr key={globalIdx}>
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
                            <td className="text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => openCdrEdit(globalIdx)}
                                  className="btn-premium btn-ghost btn-icon h-7 w-7 rounded-md"
                                  title="Edit row"
                                >
                                  <Pencil className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => openCdrDelete(globalIdx)}
                                  className="btn-premium btn-ghost btn-icon h-7 w-7 rounded-md text-red hover:bg-red-bg hover:text-red-text hover:border-red/30"
                                  title="Delete row"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </td>
                          </tr>
                          );
                        })}
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

              {/* ── CDR Edit Modal ── */}
              {cdrEditData && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55" onClick={() => { setCdrEditIdx(null); setCdrEditData(null); }}>
                  <div className="premium-card w-[700px] max-w-[95vw] max-h-[85vh] overflow-auto p-7" onClick={e => e.stopPropagation()}>
                    <h3 className="text-lg font-bold text-text-main mb-4">Edit CDR Record</h3>
                    <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2.5 items-center">
                      {cdrCols.map((col, i) => (
                        <div key={col} className="contents">
                          <label className="premium-label text-right pt-1.5">{col.replace(/_/g, ' ')}</label>
                          <input
                            value={cdrEditData[col] ?? ''}
                            onChange={e => setCdrEditData(prev => ({ ...prev, [col]: e.target.value }))}
                            className="premium-input text-sm"
                          />
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2 mt-6 justify-end">
                      <button onClick={() => { setCdrEditIdx(null); setCdrEditData(null); }} className="btn-premium btn-ghost">Cancel</button>
                      <button onClick={saveCdrEdit} className="btn-premium btn-accent">
                        <Pencil className="w-3.5 h-3.5" /> Save Changes
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ── CDR Delete Confirmation ── */}
              {cdrDeleteIdx !== null && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55" onClick={() => setCdrDeleteIdx(null)}>
                  <div className="premium-card w-100 max-w-[95vw] p-7" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-bg">
                        <Trash2 className="w-5 h-5 text-red" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-text-main">Delete CDR Record</h3>
                        <p className="text-sm text-text-muted mt-0.5">This action cannot be undone.</p>
                      </div>
                    </div>
                    <div className="rounded-xl border border-surface-border bg-surface-muted p-4 mb-5 max-h-32 overflow-auto">
                      {cdrDeleteIdx !== null && cdrFiltered[cdrDeleteIdx] && (
                        <table className="w-full text-xs">
                          <tbody>
                            {cdrCols.map(col => (
                              <tr key={col} className="border-b border-surface-border last:border-0">
                                <td className="py-1 pr-4 font-bold text-text-muted whitespace-nowrap">{col.replace(/_/g, ' ')}</td>
                                <td className="py-1 text-text-main">{String(cdrFiltered[cdrDeleteIdx]?.[col] ?? '--')}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => setCdrDeleteIdx(null)} className="btn-premium btn-ghost">Cancel</button>
                      <button onClick={confirmCdrDelete} className="btn-premium btn-danger bg-red text-white hover:bg-red/80">
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      {showReport && <ReportPreview />}
      {/* Toast notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-2xl text-sm font-semibold animate-slideUp ${
          toast.type === 'success'
            ? 'bg-green text-white'
            : 'bg-red text-white'
        }`}>
          {toast.type === 'success' ? (
            <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          ) : (
            <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          )}
          {toast.message}
        </div>
      )}
    </div>
  );
}
