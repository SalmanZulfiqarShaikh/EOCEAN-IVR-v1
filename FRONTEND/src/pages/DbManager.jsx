import { useState, useEffect, useCallback } from 'react';
import {
  getTables, getTableData, getTableStructure, searchTable,
  updateRow, deleteRow, syncDatabases, addServer, removeDatabase
} from '../services/api';
import { useDb } from '../context/DbContext';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import DataTable from '../components/ui/DataTable';
import Badge from '../components/ui/Badge';
import Header from '../components/layout/Header';
import {
  Database, Download, Plus, RefreshCw, Search, Server, Table2, Trash2, Pencil
} from 'lucide-react';
import logoUrl from '../assets/images/eoceanlogo.webp';

export default function DbManager() {
  const { selectedDb, refreshDatabases } = useDb();
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [columns, setColumns] = useState([]);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [structure, setStructure] = useState(null);
  const [view, setView] = useState('data'); // data | structure
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddServer, setShowAddServer] = useState(false);
  const [showDeleteDb, setShowDeleteDb] = useState(false);
  const [serverForm, setServerForm] = useState({ host: '127.0.0.1', port: '3306', user: '', password: '', label: '' });
  const [syncing, setSyncing] = useState(false);
  const [editRowIdx, setEditRowIdx] = useState(null);
  const [showEdit, setShowEdit] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const [showDeleteRow, setShowDeleteRow] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [pageSize, setPageSize] = useState(50);

  const loadTables = useCallback(async () => {
    if (!selectedDb) return;
    setLoading(true);
    try {
      const res = await getTables(selectedDb);
      setTables(res.data || []);
      setSelectedTable(null);
      setRows([]);
      setColumns([]);
    } catch (e) {
      console.error('Failed to load tables', e);
    } finally {
      setLoading(false);
    }
  }, [selectedDb]);

  useEffect(() => {
    loadTables();
  }, [selectedDb, loadTables]);

  const loadData = useCallback(async (tableName, q = '') => {
    setLoading(true);
    try {
      if (q) {
        const res = await searchTable(selectedDb, tableName, q, 2000);
        setColumns(res.data?.columns || []);
        setRows(res.data?.rows || []);
        setTotal(res.data?.total || 0);
      } else {
        const res = await getTableData(selectedDb, tableName, 2000, 0);
        setColumns(res.data?.columns || []);
        setRows(res.data?.rows || []);
        setTotal(res.data?.total || 0);
      }
      const struct = await getTableStructure(selectedDb, tableName);
      setStructure(struct.data || null);
    } catch (e) {
      console.error('Failed to load data', e);
    } finally {
      setLoading(false);
    }
  }, [selectedDb]);

  const selectTable = useCallback((tableName) => {
    setSelectedTable(tableName);
    setSearchTerm('');
    loadData(tableName, '');
  }, [loadData]);

  const handleSearch = useCallback((e) => {
    const q = e.target.value;
    setSearchTerm(q);
    if (selectedTable) {
      loadData(selectedTable, q);
    }
  }, [selectedTable, loadData]);

  const handleSync = useCallback(async () => {
    setSyncing(true);
    try {
      await syncDatabases();
      await refreshDatabases();
    } catch (e) {
      console.error('Sync failed', e);
    } finally {
      setSyncing(false);
    }
  }, [refreshDatabases]);

  const handleAddServer = useCallback(async () => {
    try {
      const res = await addServer(serverForm);
      if (res.success) {
        setShowAddServer(false);
        refreshDatabases();
      }
    } catch (e) {
      console.error('Failed to add server', e);
    }
  }, [serverForm, refreshDatabases]);

  const handleRemoveDb = useCallback(async () => {
    if (!selectedDb) return;
    try {
      await removeDatabase(selectedDb);
      setShowDeleteDb(false);
      refreshDatabases();
    } catch (e) {
      console.error('Failed to remove database', e);
    }
  }, [selectedDb, refreshDatabases]);

  const handleViewChange = useCallback((v) => {
    setView(v);
  }, []);

  const openEdit = useCallback((idx) => {
    setEditRowIdx(idx);
    setEditRow(rows[idx]);
    setShowEdit(true);
  }, [rows]);

  const handleEditSave = useCallback(async () => {
    if (editRowIdx === null || !selectedTable) return;
    try {
      const oldVal = rows[editRowIdx];
      // Convert array to object
      const oldObj = {};
      const newObj = {};
      columns.forEach((col, i) => {
        oldObj[col] = oldVal[i];
        newObj[col] = editRow[i];
      });
      const res = await updateRow(selectedDb, selectedTable, oldObj, newObj);
      if (res.success) {
        const updated = [...rows];
        updated[editRowIdx] = editRow;
        setRows(updated);
        setShowEdit(false);
      }
    } catch (e) {
      console.error('Failed to save edit', e);
    }
  }, [editRowIdx, selectedTable, rows, columns, editRow, selectedDb]);

  const openDeleteRow = useCallback((idx) => {
    setDeleteTarget(idx);
    setShowDeleteRow(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (deleteTarget === null || !selectedTable) return;
    try {
      const rowVal = rows[deleteTarget];
      const rowObj = {};
      columns.forEach((col, i) => {
        rowObj[col] = rowVal[i];
      });
      const res = await deleteRow(selectedDb, selectedTable, rowObj);
      if (res.success) {
        const updated = rows.filter((_, i) => i !== deleteTarget);
        setRows(updated);
        setShowDeleteRow(false);
      }
    } catch (e) {
      console.error('Delete failed', e);
    }
  }, [deleteTarget, selectedTable, rows, columns, selectedDb]);

  const downloadCSV = useCallback(() => {
    if (!rows.length) return;
    const header = columns.join(',');
    const csvRows = rows.map(row =>
      row.map(cell => {
        const v = cell === null ? '' : String(cell);
        return v.includes(',') || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v;
      }).join(',')
    );
    const csv = [header, ...csvRows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedDb}_${selectedTable}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [rows, columns, selectedDb, selectedTable]);

  if (!selectedDb) {
    return (
      <div className="flex-1 flex flex-col">
        <Header
          title="Database Manager"
          subtitle="Browse and manage your database tables"
          actions={
            <button onClick={() => setShowAddServer(true)} className="btn-premium btn-accent">
              <Server className="w-3.5 h-3.5" /> Connect Server
            </button>
          }
        />
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="premium-card max-w-lg w-full p-10 flex flex-col items-center">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-muted">
              <Database className="w-8 h-8 text-teal" />
            </div>
            <h2 className="text-xl font-bold text-text-main mb-3 text-center">Get started</h2>
            <p className="text-sm text-text-muted leading-relaxed mb-7 text-center max-w-sm">
              Connect a MariaDB/MySQL server to auto-detect databases, or select an existing database from the sidebar.
            </p>
            <button
              onClick={() => setShowAddServer(true)}
              className="btn-premium btn-accent"
            >
              <Plus className="w-4 h-4" />
              Connect Server
            </button>
          </div>
        </div>

        {/* Add Server Modal - also available from empty state */}
        {showAddServer && (
          <div className="fixed inset-0 bg-black/55 z-1000 flex items-center justify-center" onClick={() => setShowAddServer(false)}>
          <div className="premium-card w-110 max-w-[95vw] p-7 sm:p-8" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-text-main mb-1">Connect Server</h3>
              <p className="text-sm text-text-muted mb-5">Enter credentials -- all databases will be auto-detected.</p>
              <div className="grid grid-cols-[1fr_auto] gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="premium-label">Host *</label>
                  <input value={serverForm.host} onChange={e => setServerForm({...serverForm, host: e.target.value})} className="premium-input text-sm" />
                </div>
                <div className="flex flex-col gap-1.5" style={{width: 90}}>
                  <label className="premium-label">Port</label>
                  <input value={serverForm.port} onChange={e => setServerForm({...serverForm, port: e.target.value})} className="premium-input text-sm" />
                </div>
              </div>
              <div className="flex flex-col gap-1.5 mt-3">
                <label className="premium-label">Username *</label>
                <input value={serverForm.user} onChange={e => setServerForm({...serverForm, user: e.target.value})} className="premium-input text-sm" />
              </div>
              <div className="flex flex-col gap-1.5 mt-3">
                <label className="premium-label">Password</label>
                <input type="password" value={serverForm.password} onChange={e => setServerForm({...serverForm, password: e.target.value})} className="premium-input text-sm" />
              </div>
              <div className="flex gap-2 mt-12 justify-end">
                <button onClick={() => setShowAddServer(false)} className="btn-premium btn-ghost">Cancel</button>
                <button onClick={handleAddServer} className="btn-premium btn-accent">Connect</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      <Header
        title="Database Manager"
        subtitle={selectedDb}
        actions={
          <div className="flex items-center gap-2">
            <button onClick={() => setShowAddServer(true)} className="btn-premium btn-ghost">
              <Server className="w-3.5 h-3.5" /> Connect Server
            </button>
            <button onClick={handleSync} disabled={syncing} className="btn-premium btn-ghost">
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} /> Sync
            </button>
            <button onClick={() => setShowDeleteDb(true)} className="btn-premium btn-danger">
              <Trash2 className="w-3.5 h-3.5" /> Remove
            </button>
          </div>
        }
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Tables sidebar */}
        <div className="w-60 border-r border-surface-border bg-card-bg flex flex-col shrink-0">
          <div className="premium-section-head px-4 py-3">
            <div className="text-[10px] font-extrabold uppercase text-text-light">Tables</div>
            <div className="text-[10px] text-text-muted mt-0.5">{tables.length} tables</div>
          </div>
          <div className="flex-1 overflow-y-auto py-1 px-2">
            {loading && tables.length === 0 ? (
              <div className="flex items-center justify-center py-8"><div className="w-5 h-5 border-2 border-surface-border border-t-teal rounded-full animate-spin" /></div>
            ) : tables.length === 0 ? (
              <div className="text-xs text-text-light text-center py-8">No tables found</div>
            ) : (
              tables.map(t => (
                <div
                  key={t}
                  onClick={() => selectTable(t)}
                  className={`mb-1 flex min-h-9 cursor-pointer items-center gap-2 rounded-lg border px-2.5 text-xs font-bold transition-colors ${
                    selectedTable === t
                      ? 'border-teal/30 bg-teal/10 text-teal-dark'
                      : 'border-transparent text-text-muted hover:border-surface-border hover:bg-surface-muted hover:text-text-main'
                  }`}
                >
                  <Table2 className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{t}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Toolbar */}
          <div className="premium-section-head flex flex-wrap items-center gap-3 px-5 py-3">
            <div className="search-shell flex-1 max-w-sm">
              <Search />
              <input
                type="text"
                placeholder="Search in table..."
                value={searchTerm}
                onChange={handleSearch}
                className="premium-input"
              />
            </div>
            <span className="rounded-lg border border-surface-border bg-card-bg px-2.5 py-2 text-xs font-extrabold text-text-muted">{total.toLocaleString()} rows</span>
            <div className="segmented-control ml-auto">
              <button
                onClick={() => handleViewChange('data')}
                className={`segmented-btn ${view === 'data' ? 'is-active' : ''}`}
              >
                Data
              </button>
              <button
                onClick={() => handleViewChange('structure')}
                className={`segmented-btn ${view === 'structure' ? 'is-active' : ''}`}
              >
                Structure
              </button>
            </div>
            <button onClick={downloadCSV} className="btn-premium btn-accent">
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </button>
            <button onClick={() => selectedTable && loadData(selectedTable, searchTerm)} className="btn-premium btn-ghost btn-icon" title="Refresh table">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Data / structure content */}
          <div className="flex-1 overflow-auto p-6">
            {!selectedTable ? (
              <div className="flex items-center justify-center h-full text-text-light text-sm font-medium">
                Select a table from the sidebar
              </div>
            ) : loading ? (
              <LoadingSpinner text="Loading data..." />
            ) : view === 'structure' && structure ? (
              <div className="premium-table-shell">
                <table className="premium-table text-xs">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Field</th>
                      <th>Type</th>
                      <th>Null</th>
                      <th>Key</th>
                      <th>Default</th>
                      <th>Extra</th>
                    </tr>
                  </thead>
                  <tbody>
                    {structure.map((col, i) => (
                      <tr key={i}>
                        <td className="text-xs text-text-light">{i + 1}</td>
                        <td className="font-semibold text-text-main">{col.field}</td>
                        <td className="font-mono text-teal-dark">{col.type}</td>
                        <td>{col.null}</td>
                        <td>{col.key ? <Badge status={col.key === 'PRI' ? 'active' : col.key}>{col.key}</Badge> : <span className="text-text-light">--</span>}</td>
                        <td className="text-text-light">{col.default || '--'}</td>
                        <td className="text-text-light">{col.extra || '--'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <DataTable columns={columns} rows={rows} pageSize={pageSize} onEdit={openEdit} onDelete={openDeleteRow} />
            )}
          </div>
        </div>
      </div>

      {/* Add Server Modal */}
      {showAddServer && (
        <div className="fixed inset-0 bg-black/55 z-1000 flex items-center justify-center" onClick={() => setShowAddServer(false)}>
          <div className="premium-card w-110 max-w-[95vw] p-7 sm:p-8" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-text-main mb-1">Connect Server</h3>
            <p className="text-sm text-text-muted mb-5">Enter credentials -- all databases will be auto-detected.</p>
            <div className="grid grid-cols-[1fr_auto] gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="premium-label">Host *</label>
                <input value={serverForm.host} onChange={e => setServerForm({...serverForm, host: e.target.value})} className="premium-input text-sm" />
              </div>
              <div className="flex flex-col gap-1.5" style={{width: 90}}>
                <label className="premium-label">Port</label>
                <input value={serverForm.port} onChange={e => setServerForm({...serverForm, port: e.target.value})} className="premium-input text-sm" />
              </div>
            </div>
            <div className="flex flex-col gap-1.5 mt-3">
              <label className="premium-label">Username *</label>
              <input value={serverForm.user} onChange={e => setServerForm({...serverForm, user: e.target.value})} className="premium-input text-sm" />
            </div>
            <div className="flex flex-col gap-1.5 mt-3">
              <label className="premium-label">Password</label>
              <input type="password" value={serverForm.password} onChange={e => setServerForm({...serverForm, password: e.target.value})} className="premium-input text-sm" />
            </div>
            <div className="flex gap-2 mt-6 justify-end">
              <button onClick={() => setShowAddServer(false)} className="btn-premium btn-ghost">Cancel</button>
              <button onClick={handleAddServer} className="btn-premium btn-accent">Connect</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete DB Modal */}
      {showDeleteDb && (
        <div className="fixed inset-0 bg-black/55 z-1000 flex items-center justify-center" onClick={() => setShowDeleteDb(false)}>
          <div className="premium-card w-110 max-w-[95vw] p-7 sm:p-8" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-text-main mb-1">Remove Database</h3>
            <p className="text-sm text-text-muted mt-3 leading-relaxed">
              This will remove <strong className="text-red">{selectedDb}</strong> from the portal. The actual MySQL database will <strong>NOT</strong> be deleted -- only the connection config is removed.
            </p>
            <div className="flex gap-2 mt-6 justify-end">
              <button onClick={() => setShowDeleteDb(false)} className="btn-premium btn-ghost">Cancel</button>
              <button onClick={handleRemoveDb} className="btn-premium btn-danger bg-red text-white hover:bg-red/80">Remove</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Row Modal ── */}
      {showEdit && editRow && (
        <div className="fixed inset-0 bg-black/55 z-1000 flex items-center justify-center" onClick={() => setShowEdit(false)}>
          <div className="premium-card w-[800px] max-w-[95vw] max-h-[85vh] overflow-auto p-7 sm:p-8" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-text-main mb-4">Edit Row</h3>
            <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-3 items-center">
              {columns.map((col, i) => (
                <div key={i} className="contents">
                  <label className="premium-label text-right pt-1.5">{col.replace(/_/g, ' ')}</label>
                  <input
                    value={editRow[i] ?? ''}
                    onChange={e => {
                      const next = [...editRow];
                      next[i] = e.target.value;
                      setEditRow(next);
                    }}
                    className="premium-input text-sm"
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-6 justify-end">
              <button onClick={() => setShowEdit(false)} className="btn-premium btn-ghost">Cancel</button>
              <button onClick={handleEditSave} className="btn-premium btn-accent">
                <Pencil className="w-3.5 h-3.5" /> Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Row Confirmation ── */}
      {showDeleteRow && deleteTarget !== null && (
        <div className="fixed inset-0 bg-black/55 z-1000 flex items-center justify-center" onClick={() => setShowDeleteRow(false)}>
          <div className="premium-card w-100 max-w-[95vw] p-7 sm:p-8" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-bg">
                <Trash2 className="w-5 h-5 text-red" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-text-main">Delete Row</h3>
                <p className="text-sm text-text-muted mt-0.5">This action cannot be undone.</p>
              </div>
            </div>
            <div className="rounded-xl border border-surface-border bg-surface-muted p-4 mb-5 max-h-40 overflow-auto">
              <table className="w-full text-xs">
                <tbody>
                  {columns.map((col, i) => (
                    <tr key={i} className="border-b border-surface-border last:border-0">
                      <td className="py-1.5 pr-4 font-bold text-text-muted whitespace-nowrap">{col.replace(/_/g, ' ')}</td>
                      <td className="py-1.5 text-text-main">{String(rows[deleteTarget]?.[i] ?? '--')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowDeleteRow(false)} className="btn-premium btn-ghost">Cancel</button>
              <button onClick={handleDeleteConfirm} className="btn-premium btn-danger bg-red text-white hover:bg-red/80">
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
