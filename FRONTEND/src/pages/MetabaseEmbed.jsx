import { useState, useEffect, useCallback } from 'react';
import { getMetabaseEmbedUrl } from '../services/api';
import { useDb } from '../context/DbContext';
import Header from '../components/layout/Header';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { AreaChart, Eye, Settings, ShieldAlert, BarChart3, Database, Key } from 'lucide-react';

export default function MetabaseEmbed() {
  const { selectedDb } = useDb();
  
  const [embedUrl, setEmbedUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSandbox, setIsSandbox] = useState(false);

  const fetchEmbedUrl = useCallback(async () => {
    if (!selectedDb) return;
    setLoading(true);
    setError('');
    setIsSandbox(false);
    try {
      const res = await getMetabaseEmbedUrl(selectedDb);
      if (res.success && res.data?.url) {
        setEmbedUrl(res.data.url);
        // If the URL contains the default dummy secret fallback url, mark it as sandbox
        if (res.data.url.includes('dummy_metabase_secret_key')) {
          setIsSandbox(true);
        }
      } else {
        setError('Failed to retrieve Metabase embed URL');
      }
    } catch (e) {
      console.error('Metabase embed error', e);
      setError(e.response?.data?.error || 'Failed to connect to Metabase embed provider');
    } finally {
      setLoading(false);
    }
  }, [selectedDb]);

  useEffect(() => {
    if (selectedDb) {
      fetchEmbedUrl();
    } else {
      setEmbedUrl('');
      setError('');
    }
  }, [selectedDb, fetchEmbedUrl]);

  if (!selectedDb) {
    return (
      <div className="flex-1 flex flex-col">
        <Header title="Metabase Analytics" subtitle="Unified cross-database analytics dashboards" />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="premium-card max-w-md w-full p-8 text-center">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-lg bg-surface-muted">
              <AreaChart className="w-7 h-7 text-teal" />
            </div>
            <h2 className="text-xl font-bold text-text-main mb-2">No database selected</h2>
            <p className="text-sm text-text-muted leading-relaxed mb-6">
              Select a database from the sidebar to load the related Metabase analytics embed.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <Header 
        title="Metabase Analytics" 
        subtitle={`Signed Embed URL · ${selectedDb}`}
        actions={
          <button 
            onClick={fetchEmbedUrl} 
            disabled={loading}
            className="btn-premium btn-ghost flex items-center gap-2 text-xs"
          >
            Reload Embed
          </button>
        }
      />

      <div className="flex-1 p-4 sm:p-6 lg:p-8 flex flex-col min-h-0">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <LoadingSpinner text="Generating signed dashboard token..." />
          </div>
        ) : error ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="premium-card max-w-md w-full p-6 text-center border border-red/20 bg-red-bg/10">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red/10">
                <ShieldAlert className="w-6 h-6 text-red" />
              </div>
              <h3 className="text-base font-bold text-text-main">Embedding Error</h3>
              <p className="text-xs text-text-muted mt-2 leading-relaxed">
                {error}
              </p>
            </div>
          </div>
        ) : isSandbox ? (
          // Sandbox Fallback Page when keys are dummy keys
          <div className="flex-1 flex flex-col gap-6 overflow-auto custom-scrollbar">
            <div className="bg-amber/10 border border-amber/20 rounded-xl p-4 flex flex-col sm:flex-row items-start gap-3.5 shadow-sm shrink-0">
              <span className="text-xl leading-none shrink-0 mt-0.5">⚠️</span>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-amber-text">Sandbox Preview Mode</h4>
                <p className="text-xs text-amber-text/80 mt-1 leading-relaxed">
                  Metabase environment parameters are running on a dummy configuration. We successfully signed a mock JWT and generated the embed URL. 
                  In production, this tab loads a unified Metabase dashboard. Below is a mock visualization of your analytics panel.
                </p>
              </div>
            </div>

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 min-h-[400px]">
              {/* Mock Dashboard */}
              <div className="premium-card p-6 flex flex-col border border-surface-border">
                <div className="flex items-center justify-between border-b border-surface-border pb-4 mb-6">
                  <div className="flex items-center gap-2.5">
                    <div className="bg-teal/15 p-2 rounded-lg text-teal-dark">
                      <BarChart3 className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-text-main">eOcean Metabase Workspace</h4>
                      <p className="text-[10px] text-text-muted mt-0.5">Cross-Database Federated Reporting</p>
                    </div>
                  </div>
                  <span className="text-[10px] bg-green/10 text-green-text font-bold px-2 py-0.5 rounded-full border border-green/20">
                    Live
                  </span>
                </div>

                <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="border border-dashed border-surface-border rounded-xl p-4 flex flex-col justify-between hover:border-teal/30 hover:bg-teal/5 transition-all">
                    <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider block">Answering Rate</span>
                    <span className="text-3xl font-extrabold text-text-main mt-4">84.2%</span>
                    <span className="text-[10px] text-green mt-1">↑ 2.4% vs last week</span>
                  </div>
                  <div className="border border-dashed border-surface-border rounded-xl p-4 flex flex-col justify-between hover:border-teal/30 hover:bg-teal/5 transition-all">
                    <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider block">Average Duration</span>
                    <span className="text-3xl font-extrabold text-text-main mt-4">1m 54s</span>
                    <span className="text-[10px] text-green mt-1">↑ 5s vs average</span>
                  </div>
                  <div className="border border-dashed border-surface-border rounded-xl p-4 flex flex-col justify-between hover:border-teal/30 hover:bg-teal/5 transition-all">
                    <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider block">System Peak Hour</span>
                    <span className="text-3xl font-extrabold text-text-main mt-4">11:00 AM</span>
                    <span className="text-[10px] text-text-light mt-1">1,240 calls/min</span>
                  </div>

                  <div className="col-span-2 md:col-span-3 border border-dashed border-surface-border rounded-xl p-6 min-h-[220px] flex items-center justify-center text-center">
                    <div className="max-w-xs">
                      <div className="mx-auto w-10 h-10 flex items-center justify-center bg-surface-muted rounded-full mb-3 text-text-muted">
                        <Database className="w-5 h-5" />
                      </div>
                      <h5 className="text-xs font-bold text-text-main">Federated SQL Query View</h5>
                      <p className="text-[11px] text-text-light mt-1.5 leading-relaxed">
                        Metabase merges metrics from `customer_abc` and `broadcast_prod` dynamically using key correlations without merging database schemas.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sidebar Info */}
              <div className="flex flex-col gap-6">
                <div className="premium-card p-5">
                  <h4 className="text-xs font-extrabold text-text-main uppercase tracking-wider border-b border-surface-border pb-2.5 mb-3 flex items-center gap-1.5">
                    <Settings className="w-4 h-4 text-teal" />
                    How to Setup
                  </h4>
                  <ol className="text-xs text-text-muted space-y-3 pl-4 list-decimal leading-relaxed">
                    <li>Launch Metabase on port 3000 (Docker recommended).</li>
                    <li>Connect your MariaDB instances as datasource connections.</li>
                    <li>Go to Metabase Settings → Admin Settings → Embedding.</li>
                    <li>Enable embedding, copy the Secret Key.</li>
                    <li>Define `METABASE_SECRET_KEY` and `METABASE_URL` in the backend `.env` file.</li>
                  </ol>
                </div>

                <div className="premium-card p-5">
                  <h4 className="text-xs font-extrabold text-text-main uppercase tracking-wider border-b border-surface-border pb-2.5 mb-3 flex items-center gap-1.5">
                    <Key className="w-4 h-4 text-teal" />
                    Embed URL Data
                  </h4>
                  <div className="bg-surface-muted rounded-lg p-3 border border-surface-border font-mono text-[9px] text-text-muted break-all select-all">
                    {embedUrl}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          // Real Embed Iframe
          <div className="flex-1 bg-card-bg border border-surface-border rounded-xl overflow-hidden shadow-sm flex flex-col">
            <div className="bg-surface-muted px-4 py-2 border-b border-surface-border flex items-center justify-between shrink-0">
              <span className="text-[10px] text-text-light font-bold flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-teal" />
                SECURE EMBEDDED METABASE FRAME
              </span>
            </div>
            <iframe
              src={embedUrl}
              className="flex-1 w-full border-0 bg-navy"
              allowFullScreen
              title="Metabase Dashboard"
            />
          </div>
        )}
      </div>
    </div>
  );
}
