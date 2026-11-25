import { useEffect, useRef, useState } from 'react';
import { cameraGroupService } from '@/services/cameraGroup';
import { getGroupRecordings, getCameraRecordings, getDownloadUrl, getStreamUrl } from '@/services/recordings';
import { useGroups } from '@/hooks/useQueries';
import {
  Calendar,
  Camera,
  ChevronLeft,
  ChevronRight,
  Download,
  FileVideo,
  Filter,
  Loader2,
  Play,
  RefreshCw,
  Search,
  Server,
  Video,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBytes(bytes) {
  if (!bytes) return '—';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function parseFilenameDate(filename) {
  // filename like: 2026-02-16T09-41-24.mp4
  const match = filename?.match(/(\d{4}-\d{2}-\d{2})[T_](\d{2}[-:]\d{2}[-:]\d{2})/);
  if (!match) return null;
  return match[1] + ' ' + match[2].replace(/-/g, ':');
}

const PAGE_SIZE = 20;

// ─── Inline video preview modal ───────────────────────────────────────────────

function PreviewModal({ rec, groupId, onClose }) {
  const videoRef = useRef(null);
  const [loading, setLoading] = useState(false);

  // Build the backend stream proxy URL synchronously — supports Range (seeking)
  const src = rec?.key ? getStreamUrl(groupId, rec.key) : null;

  useEffect(() => {
    if (src && videoRef.current) {
      videoRef.current.load();
    }
  }, [src]);

  const handleDownload = async () => {
    setLoading(true);
    try {
      const { downloadUrl } = await getDownloadUrl(groupId, rec.key);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = rec.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      alert('Failed to generate download link. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!rec) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl overflow-hidden w-full max-w-4xl shadow-2xl"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
          <div className="flex items-center gap-2.5 min-w-0">
            <FileVideo className="w-4 h-4 text-primary shrink-0" />
            <span className="text-[13px] font-semibold text-foreground truncate">{rec.filename}</span>
            <span className="text-[11px] text-muted-foreground">{formatBytes(rec.size)}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" className="h-8 text-[12px] font-semibold gap-1.5"
              onClick={handleDownload} disabled={loading}>
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              Download
            </Button>
            <button onClick={onClose}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Video */}
        <div className="bg-black aspect-video">
          <video
            ref={videoRef}
            src={src}
            controls
            autoPlay
            className="w-full h-full"
          />
        </div>

        {/* Meta strip */}
        <div className="flex items-center gap-5 px-5 py-3 border-t border-border text-[12px]">
          <span className="text-muted-foreground">
            Camera: <span className="text-foreground font-medium">
              {rec.cameraName?.replace(/-/g, ' ') || '—'}
            </span>
          </span>
          <span className="text-muted-foreground">
            Date: <span className="text-foreground font-medium">{rec.date || '—'}</span>
          </span>
          <span className="text-muted-foreground">
            Recorded: <span className="text-foreground font-medium">
              {parseFilenameDate(rec.filename) || formatDate(rec.lastModified)}
            </span>
          </span>
          <span className="text-muted-foreground">
            Size: <span className="text-foreground font-medium">{formatBytes(rec.size)}</span>
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Main Timelapse page ───────────────────────────────────────────────────────

export default function Timelapse() {
  const { data: groups = [] }           = useGroups();
  const [selectedGroup, setSelectedGroup] = useState('');
  const [selectedCamera, setSelectedCamera] = useState('');
  const [dateFrom, setDateFrom]         = useState('');
  const [dateTo, setDateTo]             = useState('');

  const [recordings, setRecordings]     = useState([]);
  const [loading, setLoading]           = useState(false);
  const [searched, setSearched]         = useState(false);
  const [error, setError]               = useState(null);

  const [previewRec, setPreviewRec]     = useState(null);
  const [page, setPage]                 = useState(1);
  const [downloadingKey, setDownloadingKey] = useState(null);

  const currentGroup = groups.find(g => g.id === selectedGroup);
  const cameras = currentGroup?.cameras || [];

  // Cameras in selected group, sorted by channel
  const sortedCameras = [...cameras].sort((a, b) => (a.channel || 0) - (b.channel || 0));

  const handleSearch = async () => {
    if (!selectedGroup) return;
    setLoading(true);
    setError(null);
    setSearched(true);
    setPage(1);

    try {
      let results;

      // If a specific camera is selected, query per-camera
      if (selectedCamera) {
        const cam = cameras.find(c => c.id === selectedCamera);
        if (!cam) throw new Error('Camera not found');
        results = await getCameraRecordings(selectedGroup, cam.monitorId, dateFrom || null);
      } else {
        // All cameras in this group
        results = await getGroupRecordings(selectedGroup, dateFrom || null);
      }

      // Client-side date range filter (dateTo)
      if (dateTo) {
        const toTs = new Date(dateTo + 'T23:59:59').getTime();
        results = results.filter(r => {
          const ts = r.lastModified ? new Date(r.lastModified).getTime() : 0;
          return ts <= toTs;
        });
      }
      if (dateFrom && !selectedCamera) {
        // dateFrom is already sent to backend for per-date prefix
        // but for group queries we do a client-side filter too
        const fromTs = new Date(dateFrom).getTime();
        results = results.filter(r => {
          const ts = r.lastModified ? new Date(r.lastModified).getTime() : 0;
          return ts >= fromTs;
        });
      }

      // Sort newest first
      results.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));

      setRecordings(results);
    } catch (err) {
      setError(err.message || 'Failed to load recordings');
      setRecordings([]);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setSelectedGroup('');
    setSelectedCamera('');
    setDateFrom('');
    setDateTo('');
    setRecordings([]);
    setSearched(false);
    setError(null);
    setPage(1);
  };

  const handleDownload = async (rec) => {
    setDownloadingKey(rec.key);
    try {
      const { downloadUrl, filename } = await getDownloadUrl(selectedGroup, rec.key);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      alert('Failed to generate download link. Please try again.');
    } finally {
      setDownloadingKey(null);
    }
  };

  // Pagination
  const totalPages = Math.ceil(recordings.length / PAGE_SIZE);
  const pageItems  = recordings.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const totalSize = recordings.reduce((s, r) => s + (r.size || 0), 0);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background p-5">
      {previewRec && (
        <PreviewModal rec={previewRec} groupId={selectedGroup} onClose={() => setPreviewRec(null)} />
      )}

      {/* ── Header ── */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-1 h-7 bg-primary rounded-full" />
        <div>
          <h1 className="text-[20px] font-bold text-foreground tracking-tight">Recordings</h1>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            Browse and download your cloud-stored video clips
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5">

        {/* ── Filter Panel ── */}
        <div className="bg-card border border-border rounded-2xl p-5 space-y-5 h-fit">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-primary" />
            <span className="text-[13px] font-bold text-foreground">Filter Recordings</span>
          </div>

          {/* Device group */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
              Device Group
            </label>
            <div className="relative">
              <Server className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <select
                value={selectedGroup}
                onChange={e => { setSelectedGroup(e.target.value); setSelectedCamera(''); }}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-border bg-background text-[13px] text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 appearance-none"
              >
                <option value="">All groups</option>
                {groups.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Camera */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
              Camera
            </label>
            <div className="relative">
              <Camera className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <select
                value={selectedCamera}
                onChange={e => setSelectedCamera(e.target.value)}
                disabled={!selectedGroup}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-border bg-background text-[13px] text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 appearance-none disabled:opacity-40"
              >
                <option value="">All cameras</option>
                {sortedCameras.map(c => (
                  <option key={c.id} value={c.id}>Ch {c.channel} — {c.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Date range */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
              Date Range
            </label>
            <div className="space-y-2">
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                <input
                  type="date"
                  value={dateFrom}
                  onChange={e => setDateFrom(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-border bg-background text-[13px] text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                <input
                  type="date"
                  value={dateTo}
                  onChange={e => setDateTo(e.target.value)}
                  min={dateFrom || undefined}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-border bg-background text-[13px] text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2 pt-1">
            <Button
              onClick={handleSearch}
              disabled={!selectedGroup || loading}
              className="w-full h-10 text-[13px] font-semibold bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
            >
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Searching…</>
                : <><Search className="w-4 h-4" /> Search Recordings</>
              }
            </Button>

            {searched && (
              <button onClick={handleClear}
                className="w-full text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors py-1">
                Clear filters
              </button>
            )}
          </div>

          {/* Summary */}
          {searched && !loading && recordings.length > 0 && (
            <div className="pt-2 border-t border-border space-y-1.5">
              <div className="flex justify-between text-[12px]">
                <span className="text-muted-foreground">Total clips</span>
                <span className="font-semibold text-foreground">{recordings.length}</span>
              </div>
              <div className="flex justify-between text-[12px]">
                <span className="text-muted-foreground">Total size</span>
                <span className="font-semibold text-foreground">{formatBytes(totalSize)}</span>
              </div>
            </div>
          )}
        </div>

        {/* ── Results Panel ── */}
        <div className="min-w-0">

          {/* Empty / initial state */}
          {!searched && (
            <div className="h-80 flex flex-col items-center justify-center gap-4 bg-card border border-border rounded-2xl">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
                <Video className="w-7 h-7 text-muted-foreground/40" />
              </div>
              <div className="text-center">
                <p className="text-[14px] font-semibold text-foreground">Browse your recordings</p>
                <p className="text-[12px] text-muted-foreground mt-1">
                  Select a device group and hit Search to load clips from cloud storage
                </p>
              </div>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="h-80 flex flex-col items-center justify-center gap-3 bg-card border border-border rounded-2xl">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <p className="text-[13px] text-muted-foreground font-medium">Loading recordings from cloud storage…</p>
            </div>
          )}

          {/* Error */}
          {error && !loading && (
            <div className="flex items-center justify-between gap-3 px-5 py-4 bg-destructive/10 border border-destructive/20 rounded-2xl text-[13px] text-destructive font-medium">
              <span>{error}</span>
              <button onClick={handleSearch}>
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* No results */}
          {searched && !loading && !error && recordings.length === 0 && (
            <div className="h-60 flex flex-col items-center justify-center gap-3 bg-card border border-border rounded-2xl">
              <FileVideo className="w-8 h-8 text-muted-foreground/30" />
              <div className="text-center">
                <p className="text-[13px] font-semibold text-foreground">No recordings found</p>
                <p className="text-[12px] text-muted-foreground mt-1">
                  Try a different date range or camera
                </p>
              </div>
            </div>
          )}

          {/* Results table */}
          {!loading && !error && pageItems.length > 0 && (
            <div className="bg-card border border-border rounded-2xl overflow-hidden">

              {/* Table header row */}
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
                <span className="text-[13px] font-bold text-foreground">
                  {recordings.length} recording{recordings.length !== 1 ? 's' : ''}
                </span>
                <span className="text-[12px] text-muted-foreground">
                  {formatBytes(totalSize)} total · Page {page}/{totalPages}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Filename</th>
                      <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Camera</th>
                      <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Date</th>
                      <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Size</th>
                      <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {pageItems.map((rec) => (
                      <tr key={rec.key} className="hover:bg-muted/30 transition-colors group">
                        {/* Filename */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                              <FileVideo className="w-3.5 h-3.5 text-primary" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-foreground truncate max-w-[200px]">{rec.filename}</p>
                              <p className="text-[11px] text-muted-foreground mt-0.5">
                                {parseFilenameDate(rec.filename) || formatDate(rec.lastModified)}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Camera name */}
                        <td className="px-4 py-3 hidden md:table-cell">
                          <span className="text-muted-foreground capitalize">
                            {rec.cameraName?.replace(/-/g, ' ') || '—'}
                          </span>
                        </td>

                        {/* Date */}
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <span className="text-muted-foreground">{rec.date || '—'}</span>
                        </td>

                        {/* Size */}
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <span className="text-muted-foreground">{formatBytes(rec.size)}</span>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setPreviewRec(rec)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-[12px] font-semibold transition-colors"
                              title="Play"
                            >
                              <Play className="w-3 h-3 fill-primary" />
                              Play
                            </button>
                            <button
                              onClick={() => handleDownload(rec)}
                              disabled={downloadingKey === rec.key}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border hover:bg-accent text-[12px] font-semibold text-foreground transition-colors disabled:opacity-50"
                              title="Download"
                            >
                              {downloadingKey === rec.key
                                ? <Loader2 className="w-3 h-3 animate-spin" />
                                : <Download className="w-3 h-3" />
                              }
                              Download
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-5 py-3.5 border-t border-border">
                  <span className="text-[12px] text-muted-foreground">
                    Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, recordings.length)} of {recordings.length}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="w-8 h-8 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-30"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                      const p = i + 1;
                      return (
                        <button key={p} onClick={() => setPage(p)}
                          className={`w-8 h-8 rounded-lg text-[12px] font-semibold transition-colors ${
                            page === p
                              ? 'bg-primary text-primary-foreground'
                              : 'border border-border text-muted-foreground hover:text-foreground hover:bg-accent'
                          }`}>
                          {p}
                        </button>
                      );
                    })}

                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="w-8 h-8 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-30"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
