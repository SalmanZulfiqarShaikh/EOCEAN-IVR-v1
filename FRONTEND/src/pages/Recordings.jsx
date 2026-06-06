import { useState, useEffect, useCallback, useRef } from 'react';
import { getRecordings, getRecordingStreamUrl, getBulkDownloadUrl, deleteRecording } from '../services/api';
import { useDb } from '../context/DbContext';
import Header from '../components/layout/Header';
import Badge from '../components/ui/Badge';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import {
  Search, Calendar, Download, Play, Pause, X, Trash2,
  ChevronLeft, ChevronRight, FileAudio, CheckSquare, Square, Volume2
} from 'lucide-react';

export default function Recordings() {
  const { selectedDb } = useDb();
  
  // State variables
  const [recordings, setRecordings] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  
  // Filters
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  
  // Selection
  const [selectedIds, setSelectedIds] = useState([]);
  
  // Playback state
  const [currentPlaying, setCurrentPlaying] = useState(null); // recording object
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [playbackDuration, setPlaybackDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  
  // Audio reference
  const audioRef = useRef(null);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState(null); // recording object to delete

  async function handleDeleteRecording() {
    if (!deleteTarget || !selectedDb) return;
    try {
      const res = await deleteRecording(selectedDb, deleteTarget.id);
      if (res.success) {
        setRecordings(prev => prev.filter(r => r.id !== deleteTarget.id));
        setTotal(prev => prev - 1);
        setSelectedIds(prev => prev.filter(id => id !== deleteTarget.id));
        setDeleteTarget(null);
      }
    } catch (e) {
      console.error('Failed to delete recording', e);
      alert('Failed to delete recording');
    }
  }

  // Fetch recordings
  const fetchRecordings = useCallback(async () => {
    if (!selectedDb) return;
    setLoading(true);
    try {
      const offset = (page - 1) * pageSize;
      const res = await getRecordings(selectedDb, {
        limit: pageSize,
        offset,
        search,
        date_from: dateFrom,
        date_to: dateTo
      });
      if (res.success) {
        setRecordings(res.data.recordings || []);
        setTotal(res.data.total || 0);
      }
    } catch (e) {
      console.error('Failed to load recordings', e);
    } finally {
      setLoading(false);
    }
  }, [selectedDb, page, pageSize, search, dateFrom, dateTo]);

  // Trigger fetch when dependency changes
  useEffect(() => {
    if (selectedDb) {
      fetchRecordings();
      setSelectedIds([]); // Clear selection on table refresh
    } else {
      setRecordings([]);
      setTotal(0);
    }
  }, [selectedDb, fetchRecordings]);

  // Format utility
  const formatTime = (sec) => {
    if (isNaN(sec) || sec === null || sec === undefined) return '0:00';
    const mins = Math.floor(sec / 60);
    const secs = Math.floor(sec % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 KB';
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  };

  // Selection handlers
  const handleSelectRow = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    const pageIds = recordings.map(r => r.id);
    const allSelected = pageIds.every(id => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds(prev => prev.filter(id => !pageIds.includes(id)));
    } else {
      setSelectedIds(prev => {
        const toAdd = pageIds.filter(id => !prev.includes(id));
        return [...prev, ...toAdd];
      });
    }
  };

  // Playback handlers
  const handlePlayToggle = (recording) => {
    if (currentPlaying?.id === recording.id) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(err => console.error(err));
      }
    } else {
      setCurrentPlaying(recording);
      setIsPlaying(false);
      setPlaybackTime(0);
      
      const streamUrl = getRecordingStreamUrl(selectedDb, recording.id);
      
      if (audioRef.current) {
        audioRef.current.src = streamUrl;
        audioRef.current.load();
        audioRef.current.play()
          .then(() => setIsPlaying(true))
          .catch(err => console.error('Playback failed', err));
      }
    }
  };

  // Audio element event listeners
  const onAudioPlay = () => setIsPlaying(true);
  const onAudioPause = () => setIsPlaying(false);
  const onAudioTimeUpdate = () => {
    if (audioRef.current) {
      setPlaybackTime(audioRef.current.currentTime);
    }
  };
  const onAudioLoadedMetadata = () => {
    if (audioRef.current) {
      setPlaybackDuration(audioRef.current.duration);
    }
  };
  const onAudioEnded = () => {
    setIsPlaying(false);
    setPlaybackTime(0);
  };

  const handleSeek = (e) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setPlaybackTime(time);
    }
  };

  const handleVolumeChange = (e) => {
    const vol = parseFloat(e.target.value);
    setVolume(vol);
    if (audioRef.current) {
      audioRef.current.volume = vol;
    }
  };

  const handleClosePlayer = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setCurrentPlaying(null);
    setIsPlaying(false);
    setPlaybackTime(0);
  };

  const totalPages = Math.ceil(total / pageSize) || 1;

  // Onboarding template
  if (!selectedDb) {
    return (
      <div className="flex-1 flex flex-col">
        <Header title="Call Recordings" subtitle="Browse, stream, and download campaign call recordings" />
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="premium-card max-w-lg w-full p-10 flex flex-col items-center">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-muted">
              <FileAudio className="w-8 h-8 text-teal" />
            </div>
            <h2 className="text-xl font-bold text-text-main mb-3 text-center">No database selected</h2>
            <p className="text-sm text-text-muted leading-relaxed mb-7 text-center max-w-sm">
              Select a database from the sidebar to browse related call recording archives.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 relative">
      {/* Hidden audio element */}
      <audio 
        ref={audioRef}
        onPlay={onAudioPlay}
        onPause={onAudioPause}
        onTimeUpdate={onAudioTimeUpdate}
        onLoadedMetadata={onAudioLoadedMetadata}
        onEnded={onAudioEnded}
      />

      <Header 
        title="Call Recordings" 
        subtitle={`${selectedDb} · ${total.toLocaleString()} recordings available`}
        actions={
          selectedIds.length > 0 && (
            <a 
              href={getBulkDownloadUrl(selectedDb, selectedIds)}
              className="btn-premium btn-accent no-underline flex items-center gap-2"
              download
            >
              <Download className="w-4 h-4" />
              Download ZIP ({selectedIds.length})
            </a>
          )
        }
      />

      {/* Floating bulk actions drawer */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 bg-navy-light/95 border border-teal/20 text-white px-8 py-4 rounded-full flex items-center gap-8 shadow-[0_12px_40px_rgba(0,0,0,0.5)] animate-slideUp">
          <span className="text-xs font-bold text-teal tracking-wide">
            {selectedIds.length} RECORDINGS SELECTED
          </span>
          <div className="w-px h-5 bg-white/20" />
          <div className="flex gap-4">
            <a 
              href={getBulkDownloadUrl(selectedDb, selectedIds)} 
              className="text-white hover:text-teal font-semibold text-xs flex items-center gap-1.5 no-underline transition-colors cursor-pointer"
              download
            >
              <Download className="w-3.5 h-3.5" />
              Download ZIP
            </a>
            <button 
              onClick={() => setSelectedIds([])}
              className="text-white/40 hover:text-white font-medium text-xs border border-white/10 hover:border-white/30 rounded-full px-3 py-1 bg-transparent transition-colors cursor-pointer"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto custom-scrollbar">
        <div className="p-6 sm:p-8 lg:p-10 pb-10 xl:max-w-400 mx-auto">

          {/* Filtering Section */}
          <div className="premium-card mb-8 p-7">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Search */}
              <div className="flex flex-col gap-1">
                <label className="premium-label">Search</label>
                <div className="search-shell w-full max-w-none">
                  <Search />
                  <input 
                    type="text"
                    placeholder="Search by Phone, ID, Campaign..."
                    value={search}
                    onChange={e => { setSearch(e.target.value); setPage(1); }}
                    className="premium-input"
                  />
                </div>
              </div>
              {/* Date From */}
              <div className="flex flex-col gap-1">
                <label className="premium-label">Date From</label>
                <div className="relative">
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={e => { setDateFrom(e.target.value); setPage(1); }}
                    className="premium-input pl-10!"
                  />
                  <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                </div>
              </div>
              {/* Date To */}
              <div className="flex flex-col gap-1">
                <label className="premium-label">Date To</label>
                <div className="relative">
                  <input
                    type="date"
                    value={dateTo}
                    onChange={e => { setDateTo(e.target.value); setPage(1); }}
                    className="premium-input pl-10!"
                  />
                  <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                </div>
              </div>
            </div>
            {(search || dateFrom || dateTo) && (
              <div className="flex justify-end gap-2 mt-4">
                <button 
                  onClick={() => { setSearch(''); setDateFrom(''); setDateTo(''); setPage(1); }}
                  className="btn-premium btn-ghost text-xs"
                >
                  Reset Filters
                </button>
              </div>
            )}
          </div>

          {/* Table list */}
          <div className="premium-card overflow-hidden">
            {loading && recordings.length === 0 ? (
              <div className="py-20">
                <LoadingSpinner text="Fetching recordings list..." />
              </div>
            ) : recordings.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center px-4">
                <div className="p-4 bg-surface-muted rounded-full mb-4">
                  <FileAudio className="w-8 h-8 text-text-light" />
                </div>
                <h3 className="text-lg font-bold text-text-main">No recordings found</h3>
                <p className="text-sm text-text-muted max-w-xs mt-1">
                  We couldn't find any recordings matching your parameters or criteria.
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto max-h-175">
                  <table className="premium-table text-sm">
                    <thead className="sticky top-0 z-10">
                      <tr>
                        <th style={{ width: 40 }} className="text-center">
                          <button 
                            onClick={handleSelectAll} 
                            className="p-1 text-text-muted hover:text-text-main rounded transition-colors"
                          >
                            {recordings.every(r => selectedIds.includes(r.id)) ? (
                              <CheckSquare className="w-4.5 h-4.5 text-teal" />
                            ) : (
                              <Square className="w-4.5 h-4.5" />
                            )}
                          </button>
                        </th>
                        <th>Call ID</th>
                        <th>Phone Number</th>
                        <th>Campaign</th>
                        <th>Customer</th>
                        <th>Duration</th>
                        <th>Size</th>
                        <th>Created At</th>
                        <th className="text-center" style={{ width: 120 }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recordings.map((recording) => {
                        const isCurrent = currentPlaying?.id === recording.id;
                        const isSelected = selectedIds.includes(recording.id);
                        return (
                          <tr 
                            key={recording.id} 
                            className={`transition-colors ${isSelected ? 'bg-teal/5' : ''}`}
                          >
                            <td className="text-center">
                              <button 
                                onClick={() => handleSelectRow(recording.id)} 
                                className="p-1 text-text-muted hover:text-text-main rounded transition-colors"
                              >
                                {isSelected ? (
                                  <CheckSquare className="w-4.5 h-4.5 text-teal" />
                                ) : (
                                  <Square className="w-4.5 h-4.5" />
                                )}
                              </button>
                            </td>
                            <td className="font-semibold text-text-main">{recording.call_id}</td>
                            <td className="text-text-muted font-mono">{recording.phone}</td>
                            <td>
                              <Badge status="normal">{recording.campaign_id}</Badge>
                            </td>
                            <td className="text-text-muted">{recording.customer_id}</td>
                            <td className="font-medium text-text-main">
                              {formatTime(recording.duration)}
                            </td>
                            <td className="text-text-light text-xs font-mono">
                              {formatFileSize(recording.file_size)}
                            </td>
                            <td className="text-text-light text-xs font-mono">{recording.created_at}</td>
                            <td className="text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button 
                                  onClick={() => handlePlayToggle(recording)}
                                  className={`btn-premium btn-icon rounded-full h-8 w-8 ${
                                    isCurrent ? 'bg-teal/20 text-teal hover:bg-teal/30' : 'btn-ghost'
                                  }`}
                                  title={isCurrent && isPlaying ? 'Pause recording' : 'Play recording'}
                                >
                                  {isCurrent && isPlaying ? (
                                    <Pause className="w-4 h-4 fill-teal text-teal" />
                                  ) : (
                                    <Play className="w-4 h-4 fill-text-muted text-text-muted" />
                                  )}
                                </button>
                                <a
                                  href={getRecordingStreamUrl(selectedDb, recording.id)}
                                  className="btn-premium btn-ghost btn-icon rounded-full h-8 w-8 text-text-light hover:text-text-main no-underline"
                                  title="Download file"
                                  download
                                >
                                  <Download className="w-4 h-4" />
                                </a>
                                <button
                                  onClick={() => setDeleteTarget(recording)}
                                  className="btn-premium btn-ghost btn-icon rounded-full h-8 w-8 text-red hover:bg-red-bg hover:text-red-text hover:border-red/30"
                                  title="Delete recording"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {total > pageSize && (
                  <div className="premium-pagination">
                    <span>
                      Showing <strong>{((page - 1) * pageSize) + 1}</strong> - <strong>{Math.min(page * pageSize, total)}</strong> of <strong>{total.toLocaleString()}</strong> recordings
                    </span>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setPage(p => Math.max(1, p - 1))} 
                        disabled={page <= 1}
                        className="btn-premium btn-ghost btn-icon h-8 w-8"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))} 
                        disabled={page >= totalPages}
                        className="btn-premium btn-ghost btn-icon h-8 w-8"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Beautiful Inline Audio Player Bar at bottom */}
      {currentPlaying && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[92%] md:w-170 z-50 bg-navy/95 backdrop-blur-md border border-white/10 rounded-2xl py-3 px-5 flex items-center gap-4 shadow-[0_20px_50px_rgba(0,0,0,0.4)] animate-slideUp">
          <button 
            onClick={() => handlePlayToggle(currentPlaying)}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-teal text-navy hover:scale-105 transition-all shadow-[0_0_12px_rgba(78,205,196,0.4)] cursor-pointer"
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 fill-navy" />
            ) : (
              <Play className="w-5 h-5 fill-navy ml-0.5" />
            )}
          </button>
          
          <div className="flex-1 min-w-0 flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <div className="truncate">
                <span className="text-xs font-bold text-white leading-none truncate block">
                  Recording #{currentPlaying.call_id}
                </span>
                <span className="text-[10px] text-white/50 block font-mono mt-0.5">
                  {currentPlaying.phone} · {currentPlaying.campaign_id}
                </span>
              </div>
              <span className="text-[10px] text-white/60 font-mono">
                {formatTime(playbackTime)} / {formatTime(playbackDuration || currentPlaying.duration)}
              </span>
            </div>
            
            {/* Range seeker */}
            <input 
              type="range"
              min={0}
              max={playbackDuration || currentPlaying.duration || 100}
              value={playbackTime}
              onChange={handleSeek}
              className="w-full h-1 bg-white/20 accent-teal rounded-lg appearance-none cursor-pointer outline-none"
            />
          </div>

          <div className="hidden sm:flex items-center gap-2 shrink-0">
            <Volume2 className="w-4 h-4 text-white/50" />
            <input 
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={volume}
              onChange={handleVolumeChange}
              className="w-16 h-1 bg-white/20 accent-white rounded-lg appearance-none cursor-pointer outline-none"
            />
          </div>

          <div className="w-px h-8 bg-white/10 hidden sm:block" />

          <div className="flex items-center gap-1 shrink-0">
            <a 
              href={getRecordingStreamUrl(selectedDb, currentPlaying.id)}
              className="p-2 text-white/50 hover:text-white rounded-full transition-colors hover:bg-white/5 cursor-pointer no-underline block"
              title="Download file"
              download
            >
              <Download className="w-4 h-4" />
            </a>
            <button 
              onClick={handleClosePlayer}
              className="p-2 text-white/50 hover:text-white rounded-full transition-colors hover:bg-white/5 cursor-pointer bg-transparent border-0"
              title="Close player"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Delete Recording Confirmation ── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55" onClick={() => setDeleteTarget(null)}>
          <div className="premium-card w-100 max-w-[95vw] p-7" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-bg">
                <Trash2 className="w-5 h-5 text-red" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-text-main">Delete Recording</h3>
                <p className="text-sm text-text-muted mt-0.5">This cannot be undone.</p>
              </div>
            </div>
            <div className="rounded-xl border border-surface-border bg-surface-muted p-4 mb-5">
              <p className="text-sm text-text-muted">
                Are you sure you want to delete recording <strong className="text-text-main">{deleteTarget.call_id}</strong> for <strong className="text-text-main">{deleteTarget.phone}</strong>?
              </p>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setDeleteTarget(null)} className="btn-premium btn-ghost">Cancel</button>
              <button onClick={handleDeleteRecording} className="btn-premium btn-danger bg-red text-white hover:bg-red/80">
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
