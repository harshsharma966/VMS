import {
  useState, useEffect, useMemo, useCallback, useRef,
} from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Search, Calendar, ChevronLeft, ChevronRight, Play, Pause,
  Camera, Download, RefreshCw, AlertCircle, Video, Film,
  WifiOff, X, ChevronDown, SkipBack, SkipForward, Clock,
} from 'lucide-react';
import { getGroupRecordings, getDownloadUrl, getStreamUrl, getThumbnailUrl } from '@/services/recordings';
import { useGroups } from '@/hooks/useQueries';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseTime(filename) {
  if (!filename) return null;
  const m = filename.match(/[T_](\d{2})-(\d{2})-(\d{2})/);
  if (!m) return null;
  return { h: +m[1], m: +m[2], s: +m[3] };
}

function pad(n) { return String(n).padStart(2, '0'); }
function timeLabel(t) { return t ? `${pad(t.h)}:${pad(t.m)}` : '—'; }
function timeLabelFull(t) { return t ? `${pad(t.h)}:${pad(t.m)}:${pad(t.s)}` : '—'; }

function formatCamera(slug) {
  if (!slug) return 'Unknown Camera';
  return slug.replace(/---/g, ' — ').replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatBytes(bytes) {
  if (!bytes) return '—';
  if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(1)} GB`;
  if (bytes >= 1048576)    return `${(bytes / 1048576).toFixed(0)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}

const todayStr = () => new Date().toISOString().slice(0, 10);
function addDays(d, n) {
  const dt = new Date(d); dt.setDate(dt.getDate() + n);
  return dt.toISOString().slice(0, 10);
}
function friendlyDate(d) {
  if (!d) return 'All Dates';
  const t = todayStr();
  if (d === t) return 'Today';
  if (d === addDays(t, -1)) return 'Yesterday';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

// ─── Clip Thumbnail ───────────────────────────────────────────────────────────

function ClipThumbnail({ groupId, rec, className = '' }) {
  const [state, setState] = useState('idle'); // idle | loading | ok | err

  // Guard: no key or groupId → show placeholder immediately
  if (!groupId || !rec?.key) {
    return (
      <div className={`bg-zinc-900 flex items-center justify-center ${className}`}>
        <Film className="w-4 h-4 text-white/15" />
      </div>
    );
  }

  const src = getThumbnailUrl(groupId, rec.key);

  return (
    <div className={`relative bg-zinc-900 overflow-hidden ${className}`}>
      {/* Placeholder / spinner shown while not yet loaded */}
      {state !== 'ok' && (
        <div className="absolute inset-0 flex items-center justify-center">
          {state === 'loading'
            ? <div className="w-4 h-4 border-2 border-white/20 border-t-white/70 rounded-full animate-spin" />
            : <Film className="w-4 h-4 text-white/15" />
          }
        </div>
      )}
      <img
        src={src}
        loading="lazy"
        alt=""
        className={`w-full h-full object-cover transition-opacity duration-300 ${state === 'ok' ? 'opacity-100' : 'opacity-0'}`}
        onLoadStart={() => setState('loading')}
        onLoad={() => setState('ok')}
        onError={() => setState('err')}
      />
    </div>
  );
}

// ─── Video Player ─────────────────────────────────────────────────────────────

function VideoPlayer({ recording, groupId, onPrev, onNext, hasPrev, hasNext, total, currentIdx }) {
  const [buffering,    setBuffering]   = useState(true);
  const [videoError,   setVideoError]  = useState(false);
  const [downloading,  setDownloading] = useState(false);
  const [dlError,      setDlError]     = useState(false);

  const src = useMemo(
    () => (recording?.key ? getStreamUrl(groupId, recording.key) : null),
    [recording?.key, groupId],
  );

  // Reset states on clip change
  useEffect(() => {
    setVideoError(false);
    setBuffering(true);
    setDlError(false);
  }, [src]);

  const handleDownload = async () => {
    if (!recording) return;
    setDlError(false);
    try {
      setDownloading(true);
      const { downloadUrl, filename } = await getDownloadUrl(groupId, recording.key);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      setDlError(true);
      setTimeout(() => setDlError(false), 3000);
    } finally {
      setDownloading(false);
    }
  };

  const t = parseTime(recording?.filename);

  // ── Empty state ──────────────────────────────────────────────────────────
  if (!recording) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-black/95 rounded-2xl gap-4">
        <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
          <Video className="w-9 h-9 text-white/15" />
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-white/50">No clip selected</p>
          <p className="text-xs text-white/25 mt-1">Pick a recording from the list</p>
        </div>
      </div>
    );
  }

  // ── Player ───────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col bg-black rounded-2xl overflow-hidden shadow-2xl">

      {/* Video frame */}
      <div className="flex-1 relative bg-black" style={{ minHeight: 0 }}>

        {/* Thumbnail used as backdrop while buffering / on error */}
        {(buffering || videoError) && (
          <ClipThumbnail
            groupId={groupId}
            rec={recording}
            className="absolute inset-0 w-full h-full"
          />
        )}

        {!videoError ? (
          <>
            <video
              key={src}
              src={src}
              controls
              autoPlay
              playsInline
              className="absolute inset-0 w-full h-full object-contain z-10"
              style={{ display: buffering ? 'none' : 'block' }}
              onCanPlay={() => setBuffering(false)}
              onWaiting={() => setBuffering(true)}
              onPlaying={() => setBuffering(false)}
              onError={() => { setVideoError(true); setBuffering(false); }}
            />
            {buffering && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/50 gap-3">
                <div className="w-12 h-12 border-2 border-primary/80 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs text-white/40 font-medium">Loading…</p>
              </div>
            )}
          </>
        ) : (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-black/70">
            <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <WifiOff className="w-7 h-7 text-red-400/60" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-white/70">Playback failed</p>
              <p className="text-xs text-white/30 mt-1">The video could not be loaded</p>
            </div>
            <button
              onClick={() => { setVideoError(false); setBuffering(true); }}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
            >
              Retry
            </button>
          </div>
        )}
      </div>

      {/* Controls bar */}
      <div className="shrink-0 px-4 py-3 bg-zinc-950 border-t border-white/8">
        <div className="flex items-center gap-3">

          {/* Clip info */}
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-bold text-white/90 truncate leading-tight">
              {formatCamera(recording.cameraName)}
            </p>
            <p className="text-[11px] text-white/35 mt-0.5 font-mono">
              {t ? timeLabelFull(t) : ''}
              {recording.date ? `  ·  ${recording.date}` : ''}
              {recording.size ? `  ·  ${formatBytes(recording.size)}` : ''}
              {total > 0 ? `  ·  ${currentIdx + 1} / ${total}` : ''}
            </p>
          </div>

          {/* Prev / Next */}
          <div className="flex items-center gap-1">
            <button
              onClick={onPrev}
              disabled={!hasPrev}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
              title="Previous clip (←)"
            >
              <SkipBack className="w-4 h-4" />
            </button>
            <button
              onClick={onNext}
              disabled={!hasNext}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
              title="Next clip (→)"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>

          {/* Download */}
          <button
            onClick={handleDownload}
            disabled={downloading}
            title={dlError ? 'Download failed — try again' : 'Download clip'}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 disabled:opacity-50 ${
              dlError
                ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                : 'bg-white/10 hover:bg-white/15 text-white/70 hover:text-white'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            {downloading ? 'Saving…' : dlError ? 'Failed' : 'Download'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Skeleton loader for clip list ────────────────────────────────────────────

function ClipSkeleton() {
  return (
    <div className="p-2 space-y-1">
      {[...Array(7)].map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-2 rounded-xl">
          <div className="shrink-0 w-20 h-11.5 rounded-lg bg-muted animate-pulse" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 rounded bg-muted animate-pulse w-3/4" />
            <div className="h-2.5 rounded bg-muted animate-pulse w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Clip list (left panel) ───────────────────────────────────────────────────

function ClipList({ recordings, selectedKey, onSelect, groupId }) {
  const selectedRef = useRef(null);

  // Group clips by hour
  const grouped = useMemo(() => {
    const map = new Map();
    for (const r of recordings) {
      const t = parseTime(r.filename);
      const h = t ? t.h : -1;
      if (!map.has(h)) map.set(h, []);
      map.get(h).push(r);
    }
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
  }, [recordings]);

  // Scroll selected clip into view when it changes
  useEffect(() => {
    selectedRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [selectedKey]);

  return (
    <div className="flex-1 overflow-y-auto overscroll-contain">
      {grouped.map(([hour, recs]) => (
        <div key={hour}>

          {/* Sticky hour header */}
          <div className="sticky top-0 z-10 px-3 py-1.5 bg-card/95 backdrop-blur-sm border-b border-border/40 flex items-center gap-2">
            <Clock className="w-3 h-3 text-primary/70 shrink-0" />
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              {hour >= 0 ? `${pad(hour)}:00 — ${pad(hour)}:59` : 'Unknown'}
            </span>
            <span className="ml-auto text-[10px] text-muted-foreground/50 tabular-nums">{recs.length}</span>
          </div>

          {/* Clips */}
          <div className="p-2 space-y-0.5">
            {recs.map((rec) => {
              const t     = parseTime(rec.filename);
              const isSel = rec.key === selectedKey;
              return (
                <button
                  key={rec.key}
                  ref={isSel ? selectedRef : null}
                  onClick={() => onSelect(rec)}
                  className={`group w-full flex items-center gap-3 p-2 rounded-xl text-left transition-all ${
                    isSel
                      ? 'bg-primary/10 ring-1 ring-primary/25 shadow-sm'
                      : 'hover:bg-muted/60 active:bg-muted/80'
                  }`}
                >
                  {/* Thumbnail */}
                  <div className="relative shrink-0 w-20 h-11.5 rounded-lg overflow-hidden shadow-md">
                    <ClipThumbnail groupId={groupId} rec={rec} className="w-full h-full" />

                    {/* Timestamp badge at bottom of thumbnail */}
                    {t && (
                      <div className="absolute bottom-0 inset-x-0 bg-linear-to-t from-black/80 to-transparent pt-2 pb-0.5 text-center">
                        <span className="text-[9px] font-mono font-bold text-white/90 tracking-tight">
                          {timeLabelFull(t)}
                        </span>
                      </div>
                    )}

                    {/* Hover / selected play overlay */}
                    <div className={`absolute inset-0 flex items-center justify-center transition-all rounded-lg ${
                      isSel
                        ? 'bg-primary/25 opacity-100'
                        : 'bg-black/0 opacity-0 group-hover:bg-black/35 group-hover:opacity-100'
                    }`}>
                      {isSel
                        ? <Pause className="w-4 h-4 text-white drop-shadow" />
                        : <Play  className="w-4 h-4 text-white drop-shadow ml-0.5" />
                      }
                    </div>
                  </div>

                  {/* Metadata */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-[12px] font-semibold leading-snug truncate ${
                      isSel ? 'text-primary' : 'text-foreground'
                    }`}>
                      {formatCamera(rec.cameraName)}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 tabular-nums">
                      {t ? timeLabel(t) : '—'}
                      {rec.size ? `  ·  ${formatBytes(rec.size)}` : ''}
                    </p>
                  </div>

                  {/* Active dot */}
                  {isSel && (
                    <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 animate-pulse" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {/* Bottom padding so last item doesn't sit flush to edge */}
      <div className="h-4" />
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Timeline() {
  const { data: groups = [], isLoading: groupsLoading } = useGroups();
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [selectedCamSlug, setSelectedCamSlug] = useState('all');
  const [date, setDate]                       = useState(null); // null = show all recordings
  const [selectedRec, setSelectedRec]         = useState(null);
  const [search, setSearch]                   = useState('');
  const qc = useQueryClient();

  // Auto-select first group on load
  useEffect(() => {
    if (groups.length > 0 && !selectedGroupId) setSelectedGroupId(groups[0].id);
  }, [groups, selectedGroupId]);

  // Clear selected clip when group or date changes
  useEffect(() => {
    setSelectedRec(null);
    setSearch('');
    setSelectedCamSlug('all');
  }, [selectedGroupId, date]);

  const { data: rawRecs = [], isLoading: recLoading, isError: recError, refetch } = useQuery({
    queryKey:  ['recordings', selectedGroupId, date],
    queryFn:   () => getGroupRecordings(selectedGroupId, date),
    enabled:   !!selectedGroupId,
    staleTime: 2 * 60_000,
    retry:     2,
  });

  // Sort by time ascending
  const recordings = useMemo(() => (
    [...(rawRecs || [])].sort((a, b) => {
      const ta = parseTime(a.filename), tb = parseTime(b.filename);
      if (!ta && !tb) return 0; if (!ta) return 1; if (!tb) return -1;
      return (ta.h * 3600 + ta.m * 60 + ta.s) - (tb.h * 3600 + tb.m * 60 + tb.s);
    })
  ), [rawRecs]);

  const cameraSlugs = useMemo(() => {
    const s = new Set(recordings.map((r) => r.cameraName).filter(Boolean));
    return Array.from(s).sort();
  }, [recordings]);

  const filtered = useMemo(() => recordings.filter((r) => {
    const matchCam = selectedCamSlug === 'all' || r.cameraName === selectedCamSlug;
    const q = search.toLowerCase();
    return matchCam && (!q || r.filename.toLowerCase().includes(q) || (r.cameraName || '').toLowerCase().includes(q));
  }), [recordings, selectedCamSlug, search]);

  const currentIdx = useMemo(
    () => filtered.findIndex((r) => r.key === selectedRec?.key),
    [filtered, selectedRec],
  );

  // Keep selectedRec valid when filter changes
  useEffect(() => {
    if (selectedRec && currentIdx === -1) setSelectedRec(null);
  }, [currentIdx, selectedRec]);

  const goPrev = useCallback(() => {
    if (currentIdx > 0) setSelectedRec(filtered[currentIdx - 1]);
  }, [currentIdx, filtered]);

  const goNext = useCallback(() => {
    if (currentIdx >= 0 && currentIdx < filtered.length - 1) setSelectedRec(filtered[currentIdx + 1]);
  }, [currentIdx, filtered]);

  // Keyboard navigation (arrow keys when not in a text field)
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT') return;
      if (e.key === 'ArrowLeft')  { e.preventDefault(); goPrev(); }
      if (e.key === 'ArrowRight') { e.preventDefault(); goNext(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goPrev, goNext]);

  const handleRefresh = useCallback(() => {
    qc.invalidateQueries({ queryKey: ['recordings', selectedGroupId, date] });
  }, [qc, selectedGroupId, date]);

  // Are we showing search/filter results vs all clips?
  const isFiltered = search !== '' || selectedCamSlug !== 'all';

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-background">

      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 border-b border-border bg-card shrink-0">

        {/* Title */}
        <div className="flex items-center gap-2">
          <div className="w-1 h-5 rounded-full bg-primary" />
          <span className="text-[15px] font-bold text-foreground tracking-tight">Timeline</span>
        </div>

        <div className="w-px h-5 bg-border mx-1" />

        {/* Group selector */}
        <div className="relative">
          <select
            value={selectedGroupId}
            onChange={(e) => { setSelectedGroupId(e.target.value); }}
            disabled={groupsLoading}
            className="h-8 appearance-none bg-background border border-border rounded-lg pl-2.5 pr-7 text-sm text-foreground focus:outline-none focus:border-primary cursor-pointer disabled:opacity-50 min-w-30"
          >
            {groupsLoading
              ? <option>Loading…</option>
              : groups.length === 0
                ? <option value="">No groups</option>
                : groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)
            }
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
        </div>

        {/* Camera selector (only when multiple cameras) */}
        {cameraSlugs.length > 1 && (
          <div className="relative">
            <select
              value={selectedCamSlug}
              onChange={(e) => setSelectedCamSlug(e.target.value)}
              className="h-8 appearance-none bg-background border border-border rounded-lg pl-2.5 pr-7 text-sm text-foreground focus:outline-none focus:border-primary cursor-pointer min-w-27.5"
            >
              <option value="all">All Cameras</option>
              {cameraSlugs.map((slug) => (
                <option key={slug} value={slug}>{formatCamera(slug)}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          </div>
        )}

        {/* Date navigator */}
        <div className="flex items-center bg-background border border-border rounded-lg overflow-hidden h-8">
          <button
            onClick={() => setDate((d) => d ? addDays(d, -1) : todayStr())}
            className="px-2 h-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors border-r border-border"
            title="Previous day"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <div className="flex items-center gap-1.5 px-2.5">
            <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />
            <input
              type="date"
              value={date || ''}
              max={todayStr()}
              onChange={(e) => setDate(e.target.value || null)}
              placeholder="All dates"
              className="text-sm text-foreground bg-transparent focus:outline-none cursor-pointer"
            />
          </div>
          <button
            onClick={() => setDate((d) => { if (!d) return todayStr(); const n = addDays(d, 1); return n <= todayStr() ? n : d; })}
            disabled={date && date >= todayStr()}
            className="px-2 h-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors border-l border-border disabled:opacity-30"
            title="Next day"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Friendly date label */}
        <span className="text-xs font-medium text-muted-foreground hidden sm:block px-1">
          {friendlyDate(date)}
        </span>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search clips…"
            className="h-8 w-40 bg-background border border-border rounded-lg pl-8 pr-7 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Clip count badge */}
        {!recLoading && !recError && filtered.length > 0 && (
          <span className="hidden md:flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-[11px] font-medium text-muted-foreground">
            {filtered.length} clip{filtered.length !== 1 ? 's' : ''}
            {isFiltered && ' (filtered)'}
          </span>
        )}

        {/* Refresh */}
        <button
          onClick={handleRefresh}
          disabled={recLoading}
          className="w-8 h-8 ml-auto flex items-center justify-center rounded-lg bg-background border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors disabled:opacity-40"
          title="Refresh recordings"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${recLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* ── Body ─────────────────────────────────────────────────────────────── */}

      {/* No groups state */}
      {!groupsLoading && groups.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-8">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
            <Camera className="w-8 h-8 text-muted-foreground/40" />
          </div>
          <div>
            <p className="font-semibold text-foreground">No camera groups</p>
            <p className="text-sm text-muted-foreground mt-1">
              Add a device group in the Devices page to start recording.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden">

          {/* ── LEFT panel — clip list ──────────────────────────────────────── */}
          <div className="w-72 shrink-0 border-r border-border flex flex-col bg-card overflow-hidden">

            {/* Panel header */}
            <div className="px-3 py-2.5 border-b border-border shrink-0 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-foreground">
                  {recLoading ? 'Loading…'
                    : recError ? 'Load error'
                    : `${filtered.length} clip${filtered.length !== 1 ? 's' : ''}`
                  }
                </p>
                {!recLoading && !recError && (
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {friendlyDate(date)}
                    {isFiltered ? ' · filtered' : ''}
                  </p>
                )}
              </div>
              {isFiltered && !recLoading && (
                <button
                  onClick={() => { setSearch(''); setSelectedCamSlug('all'); }}
                  className="text-[10px] text-primary hover:text-primary/80 font-medium"
                  title="Clear filters"
                >
                  Clear
                </button>
              )}
            </div>

            {/* List body */}
            {recLoading ? (
              <ClipSkeleton />
            ) : recError ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 p-4 text-center">
                <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-destructive/60" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground">Failed to load recordings</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Check your connection</p>
                </div>
                <button
                  onClick={() => refetch()}
                  className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
                >
                  Try again
                </button>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 p-4 text-center">
                <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center">
                  <Video className="w-6 h-6 text-muted-foreground/40" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {isFiltered ? 'No matching clips' : 'No recordings'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {isFiltered
                      ? 'Try adjusting the search or camera filter.'
                      : `Nothing was recorded on ${friendlyDate(date)}.`
                    }
                  </p>
                </div>
                {isFiltered ? (
                  <button
                    onClick={() => { setSearch(''); setSelectedCamSlug('all'); }}
                    className="text-xs text-primary hover:text-primary/80 font-medium"
                  >
                    Clear filters
                  </button>
                ) : (
                  <button
                    onClick={() => setDate((d) => addDays(d, -1))}
                    className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium"
                  >
                    <ChevronLeft className="w-3 h-3" /> Previous day
                  </button>
                )}
              </div>
            ) : (
              <ClipList
                recordings={filtered}
                selectedKey={selectedRec?.key}
                onSelect={setSelectedRec}
                groupId={selectedGroupId}
              />
            )}
          </div>

          {/* ── RIGHT panel — video player ───────────────────────────────────── */}
          <div className="flex-1 flex p-4 bg-zinc-950/30 overflow-hidden">
            <VideoPlayer
              recording={selectedRec}
              groupId={selectedGroupId}
              onPrev={goPrev}
              onNext={goNext}
              hasPrev={currentIdx > 0}
              hasNext={currentIdx >= 0 && currentIdx < filtered.length - 1}
              total={filtered.length}
              currentIdx={currentIdx >= 0 ? currentIdx : 0}
            />
          </div>
        </div>
      )}
    </div>
  );
}
