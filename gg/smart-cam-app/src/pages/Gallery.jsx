import {
  useState, useEffect, useCallback, useRef, useMemo,
} from 'react';
import {
  Search, Calendar, Download, Play, Video, ChevronLeft, ChevronRight,
  X, RefreshCw, Clock, Camera, AlertCircle, Loader2, WifiOff, Info,
  Building2, ChevronDown, ImageOff, HardDrive, List, Grid3x3, ChevronUp,
} from 'lucide-react';
import { cameraGroupService } from '@/services/cameraGroup';
import { getThumbnailUrl, getStreamUrl } from '@/services/recordings';
import { useGroups } from '@/hooks/useQueries';
import api from '@/services/api';

// ─── Debounce hook ─────────────────────────────────────────────────────────────

function useDebounce(value, delayMs) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debouncedValue;
}

// ─── Presigned URL cache (sessionStorage, 5-min TTL) ──────────────────────────

const PRESIGNED_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCachedPresignedUrl(key) {
  try {
    const cached = sessionStorage.getItem(`presigned:${key}`);
    if (!cached) return null;
    const { url, expires } = JSON.parse(cached);
    if (Date.now() > expires) {
      sessionStorage.removeItem(`presigned:${key}`);
      return null;
    }
    return url;
  } catch {
    return null;
  }
}

function setCachedPresignedUrl(key, url) {
  try {
    sessionStorage.setItem(`presigned:${key}`, JSON.stringify({
      url,
      expires: Date.now() + PRESIGNED_CACHE_TTL,
    }));
  } catch {
    // Ignore — sessionStorage might be full or disabled
  }
}

// ─── Date helpers ──────────────────────────────────────────────────────────────

const TODAY     = new Date().toISOString().slice(0, 10);
const YESTERDAY = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
const SEVEN_AGO = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '—';
  const gb = bytes / 1073741824;
  if (gb >= 1) return `${gb.toFixed(2)} GB`;
  const mb = bytes / 1048576;
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}

function formatCameraSlug(slug) {
  if (!slug) return 'Unknown Camera';
  return slug.replace(/---/g, ' - ').replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function parseTimeFromFilename(filename) {
  if (!filename) return null;
  const m = filename.match(/(\d{4}-\d{2}-\d{2})[T_](\d{2}[-:]?\d{2}[-:]?\d{2})/);
  if (!m) return null;
  return m[2].replace(/-/g, ':').slice(0, 5); // HH:MM
}

function estimateDuration(sizeBytes) {
  if (!sizeBytes || sizeBytes < 100000) return null;
  const minutes = sizeBytes / (1024 * 1024 * 11.25);
  if (minutes < 0.25) return `~${Math.round(minutes * 60)}s`;
  if (minutes >= 9.5)  return '10 min';
  return `~${Math.round(minutes)} min`;
}

function getRecordingTime(filename, lastModified) {
  const fromFile = parseTimeFromFilename(filename);
  if (fromFile) return fromFile;
  if (!lastModified) return '—';
  const d = new Date(lastModified);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function formatDateLabel(dateStr) {
  if (!dateStr) return 'Unknown Date';
  if (dateStr === TODAY) return 'Today';
  if (dateStr === YESTERDAY) return 'Yesterday';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ─── Clip Thumbnail (lazy-loaded JPEG from FFmpeg) ────────────────────────────

function ClipThumbnail({ groupId, recKey }) {
  const [state, setState] = useState('loading'); // loading → loaded → error
  const [imgSrc, setImgSrc] = useState(null);

  useEffect(() => {
    const url = getThumbnailUrl(groupId, recKey);
    const img = new Image();
    img.onload  = () => { setImgSrc(url); setState('loaded'); };
    img.onerror = () => setState('error');
    img.src = url;
  }, [groupId, recKey]);

  if (state === 'loading') {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-neutral-900">
        <Loader2 className="w-5 h-5 text-neutral-400 animate-spin" />
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-neutral-900">
        <ImageOff className="w-6 h-6 text-neutral-500" />
        <span className="text-[9px] text-neutral-500 font-medium">No preview</span>
      </div>
    );
  }

  return <img src={imgSrc} alt="Thumbnail" className="absolute inset-0 w-full h-full object-cover" />;
}

// ─── Skeleton Card ────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="rounded-xl overflow-hidden border border-neutral-100 bg-white animate-pulse">
      <div className="aspect-video bg-neutral-200" />
      <div className="px-2.5 py-2">
        <div className="h-3 bg-neutral-200 rounded w-3/4" />
      </div>
    </div>
  );
}

// ─── Timeline View Row ────────────────────────────────────────────────────────

function TimelineRow({ rec, groupId, onPlay, onDownload }) {
  const time = getRecordingTime(rec.filename, rec.lastModified);
  const cameraLabel = formatCameraSlug(rec.cameraName || '');
  const duration = estimateDuration(rec.size);

  return (
    <div className="group flex items-center gap-3 sm:gap-4 p-3 hover:bg-orange-50 rounded-xl transition-colors border border-transparent hover:border-orange-200">
      {/* Thumbnail */}
      <div
        className="relative w-32 sm:w-40 aspect-video bg-neutral-900 rounded-lg overflow-hidden shrink-0 cursor-pointer"
        onClick={() => onPlay(rec)}
        role="button"
        tabIndex={0}
        aria-label={`Play ${cameraLabel}`}
      >
        <ClipThumbnail groupId={groupId} recKey={rec.key} />

        {/* Play overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
          <div className="w-10 h-10 bg-[#F7983A] rounded-full flex items-center justify-center shadow-lg">
            <Play className="w-4 h-4 text-white ml-0.5" fill="white" />
          </div>
        </div>

        {/* Duration badge */}
        {duration && (
          <span className="absolute bottom-1.5 right-1.5 bg-black/70 text-white text-[9px] font-semibold px-1.5 py-0.5 rounded">
            {duration}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 space-y-1">
        <p className="text-sm sm:text-base font-semibold text-neutral-800 truncate">{cameraLabel}</p>
        <div className="flex items-center gap-2 text-xs text-neutral-500">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {time}
          </span>
          {rec.size > 0 && (
            <>
              <span className="text-neutral-300">•</span>
              <span>{formatBytes(rec.size)}</span>
            </>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => onPlay(rec)}
          className="flex items-center gap-1.5 px-3 py-2 bg-[#F7983A] hover:bg-[#e8882a] text-white rounded-lg text-xs font-semibold transition-colors"
        >
          <Play className="w-3 h-3" fill="white" />
          <span className="hidden sm:inline">Play</span>
        </button>
        <button
          onClick={() => onDownload(rec)}
          className="p-2 hover:bg-neutral-100 text-neutral-400 hover:text-[#F7983A] rounded-lg transition-colors"
          title="Download recording"
          aria-label="Download"
        >
          <Download className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Camera Group Section (for Camera View) ───────────────────────────────────

function CameraSection({ cameraName, recordings, groupId, onPlay, onDownload }) {
  const [expanded, setExpanded] = useState(true);
  const cameraLabel = formatCameraSlug(cameraName);
  const todayCount = recordings.filter(r => r.date === TODAY).length;

  return (
    <div className="border border-neutral-200 rounded-xl overflow-hidden bg-white">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-neutral-50 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <Camera className="w-5 h-5 text-[#F7983A]" />
          <div>
            <h3 className="text-sm sm:text-base font-semibold text-neutral-800">{cameraLabel}</h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              {recordings.length} recording{recordings.length !== 1 ? 's' : ''}
              {todayCount > 0 && ` · ${todayCount} today`}
            </p>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="w-5 h-5 text-neutral-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-neutral-400" />
        )}
      </button>

      {/* Grid of recordings */}
      {expanded && (
        <div className="p-4 pt-0 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {recordings.map((rec) => {
            const time = getRecordingTime(rec.filename, rec.lastModified);
            const duration = estimateDuration(rec.size);
            const dateLabel = formatDateLabel(rec.date);

            return (
              <article
                key={rec.key}
                className="group rounded-lg overflow-hidden border border-neutral-200 bg-neutral-50 hover:shadow-lg hover:border-orange-200 transition-all cursor-pointer"
                onClick={() => onPlay(rec)}
                role="button"
                tabIndex={0}
                aria-label={`Play recording from ${time}`}
              >
                {/* Thumbnail */}
                <div className="relative aspect-video bg-neutral-900">
                  <ClipThumbnail groupId={groupId} recKey={rec.key} />

                  {/* Play overlay */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-9 h-9 bg-[#F7983A] rounded-full flex items-center justify-center shadow-xl">
                      <Play className="w-3.5 h-3.5 text-white ml-0.5" fill="white" />
                    </div>
                  </div>

                  {/* Duration badge */}
                  {duration && (
                    <span className="absolute bottom-1 right-1 bg-black/70 text-white text-[9px] font-semibold px-1 py-0.5 rounded">
                      {duration}
                    </span>
                  )}
                </div>

                {/* Info */}
                <div className="p-2 space-y-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-semibold text-neutral-700">{time}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); onDownload(rec); }}
                      className="p-1 hover:bg-orange-100 hover:text-[#F7983A] text-neutral-400 rounded transition-colors"
                      title="Download"
                    >
                      <Download className="w-3 h-3" />
                    </button>
                  </div>
                  <p className="text-[10px] text-neutral-500">{dateLabel}</p>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Player modal ──────────────────────────────────────────────────────────────

function PlayerModal({ recording, groupId, onClose }) {
  const videoRef    = useRef(null);
  const [dlLoading, setDlLoading]     = useState(false);
  const [dlError, setDlError]         = useState(null);
  const [videoLoading, setVideoLoading] = useState(true);

  const [attempt, setAttempt]   = useState(0);
  const [videoSrc, setVideoSrc] = useState(null);
  const videoError = attempt >= 2;

  const time        = getRecordingTime(recording.filename, recording.lastModified);
  const dateLabel   = formatDateLabel(recording.date);
  const cameraLabel = formatCameraSlug(recording.cameraName || '');

  useEffect(() => {
    let cancelled = false;

    const cachedUrl = getCachedPresignedUrl(recording.key);
    if (cachedUrl) {
      setVideoSrc(cachedUrl);
      return;
    }

    api.get(`/groups/${groupId}/recordings/play`, { params: { key: recording.key } })
      .then(({ data }) => {
        if (cancelled) return;
        if (data.playbackUrl) {
          setCachedPresignedUrl(recording.key, data.playbackUrl);
          setVideoSrc(data.playbackUrl);
        } else {
          setVideoSrc(getStreamUrl(groupId, recording.key));
          setAttempt(1);
        }
      })
      .catch(() => {
        if (cancelled) return;
        setVideoSrc(getStreamUrl(groupId, recording.key));
        setAttempt(1);
      });
    return () => { cancelled = true; };
  }, [groupId, recording.key]);

  const handleVideoError = useCallback(() => {
    if (attempt === 0) {
      setVideoLoading(true);
      setVideoSrc(getStreamUrl(groupId, recording.key));
      setAttempt(1);
    } else {
      setAttempt(2);
      setVideoLoading(false);
    }
  }, [attempt, groupId, recording.key]);

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  useEffect(() => {
    if (videoRef.current && videoSrc) {
      videoRef.current.load();
      videoRef.current.play().catch(() => {});
    }
  }, [videoSrc]);

  const handleDownload = async () => {
    setDlLoading(true);
    setDlError(null);
    try {
      const { data } = await api.get(`/groups/${groupId}/recordings/download`, {
        params: { key: recording.key },
      });
      if (data.downloadUrl) {
        const a = document.createElement('a');
        a.href = data.downloadUrl;
        a.download = recording.filename || 'recording.mp4';
        a.click();
      } else {
        throw new Error('No download URL');
      }
    } catch {
      setDlError('Download failed. Please try again.');
    } finally {
      setDlLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 bg-black/60 hover:bg-black/80 text-white rounded-full transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Video player */}
        <div className="relative bg-black aspect-video">
          {videoLoading && !videoError && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-white animate-spin" />
            </div>
          )}

          {videoError ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white p-6 text-center">
              <AlertCircle className="w-12 h-12 text-red-400" />
              <h3 className="text-lg font-semibold">Unable to play this recording</h3>
              <p className="text-sm text-neutral-300 max-w-md">
                Both stream sources failed. Try downloading instead.
              </p>
            </div>
          ) : (
            videoSrc && (
              <video
                ref={videoRef}
                controls
                autoPlay
                className="w-full h-full"
                onLoadStart={() => setVideoLoading(true)}
                onCanPlay={() => setVideoLoading(false)}
                onError={handleVideoError}
              >
                <source src={videoSrc} type="video/mp4" />
              </video>
            )
          )}
        </div>

        {/* Info panel */}
        <div className="p-6 space-y-4">
          <div>
            <h2 className="text-xl font-bold text-neutral-900">{cameraLabel}</h2>
            <p className="text-sm text-neutral-500 mt-1">{dateLabel} at {time}</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            {[
              { label: 'Duration', value: estimateDuration(recording.size) || '—' },
              { label: 'Size', value: formatBytes(recording.size) },
              { label: 'Date', value: dateLabel },
              { label: 'Time', value: time },
            ].map(({ label, value }) => (
              <div key={label} className="bg-neutral-50 rounded-lg px-3 py-2">
                <span className="text-neutral-500 block mb-1">{label}</span>
                <span className="text-xs sm:text-sm font-semibold text-neutral-800 truncate">{value}</span>
              </div>
            ))}
          </div>

          {dlError && (
            <p className="text-xs text-red-500 mb-2 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {dlError}
            </p>
          )}

          <button
            onClick={handleDownload}
            disabled={dlLoading}
            className="w-full flex items-center justify-center gap-2 bg-[#F7983A] hover:bg-[#e8882a] active:bg-[#d67820] disabled:opacity-60 text-white px-4 py-3 rounded-xl font-semibold text-sm transition-colors shadow-sm"
          >
            {dlLoading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Preparing…</>
              : <><Download className="w-4 h-4" /> Download Recording</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Pagination ────────────────────────────────────────────────────────────────

function Pagination({ page, totalPages, perPage, total, onPage, onPerPage }) {
  const pageList = useMemo(() => {
    const delta = 1;
    const list = [];
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= page - delta && i <= page + delta)) list.push(i);
      else if (list[list.length - 1] !== '…') list.push('…');
    }
    return list;
  }, [page, totalPages]);

  const start = (page - 1) * perPage + 1;
  const end   = Math.min(page * perPage, total);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 mt-4 border-t border-neutral-100">
      <div className="flex items-center gap-2">
        <label className="text-[10px] text-neutral-400 font-medium">Show</label>
        <select
          value={perPage}
          onChange={(e) => onPerPage(Number(e.target.value))}
          className="border border-neutral-200 rounded-lg px-2 py-1 text-xs text-neutral-700 bg-white focus:outline-none focus:ring-2 focus:ring-orange-300 cursor-pointer"
        >
          {[25, 50, 100, 200].map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
        <span className="text-[10px] text-neutral-400">
          {start}–{end} of <span className="font-semibold text-neutral-700">{total}</span>
        </span>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button
            onClick={() => onPage(page - 1)}
            disabled={page === 1}
            className="p-1.5 hover:bg-neutral-100 disabled:opacity-25 rounded-lg transition-colors"
            aria-label="Previous page"
          >
            <ChevronLeft className="w-4 h-4 text-neutral-600" />
          </button>
          {pageList.map((p, i) =>
            p === '…' ? (
              <span key={`e-${i}`} className="w-8 h-8 flex items-center justify-center text-neutral-400 text-xs select-none">…</span>
            ) : (
              <button
                key={p}
                onClick={() => onPage(p)}
                aria-current={p === page ? 'page' : undefined}
                className={`w-8 h-8 rounded-lg text-xs font-medium transition-all ${
                  p === page ? 'bg-[#F7983A] text-white shadow-sm' : 'text-neutral-600 hover:bg-neutral-100'
                }`}
              >
                {p}
              </button>
            )
          )}
          <button
            onClick={() => onPage(page + 1)}
            disabled={page === totalPages}
            className="p-1.5 hover:bg-neutral-100 disabled:opacity-25 rounded-lg transition-colors"
            aria-label="Next page"
          >
            <ChevronRight className="w-4 h-4 text-neutral-600" />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Quick date chip constants ─────────────────────────────────────────────────

const QUICK_CHIPS = [
  { key: 'today',     label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: '7days',     label: 'Last 7 Days' },
  { key: 'all',       label: 'All Time' },
];

// ─── Main Gallery Page ─────────────────────────────────────────────────────────

export default function Gallery() {
  const abortRef = useRef(null);

  const { data: groupsData, isLoading: loadingGroups, error: groupsError } = useGroups();
  const groups = groupsData || [];

  const [selectedGroupId, setGroupId] = useState(null);
  const [recordings, setRecordings]   = useState([]);
  const [loadingRecs, setLdRec]       = useState(false);
  const [recError, setRecError]       = useState(null);
  const [selectedRec, setSelectedRec] = useState(null);
  const [totalRecordings, setTotal]   = useState(0);
  const [totalPages, setTotalPages]   = useState(1);

  // View mode: 'timeline' or 'camera'
  const [viewMode, setViewMode] = useState('timeline');

  // Filters
  const [quickDate, setQuickDate]     = useState('today');
  const [dateFrom, setDateFrom]       = useState(TODAY);
  const [dateTo, setDateTo]           = useState(TODAY);
  const [cameraFilter, setCamFilter]  = useState('all');
  const [searchQuery, setSearch]      = useState('');

  const debouncedSearch = useDebounce(searchQuery, 300);

  const [page, setPage]       = useState(1);
  const [perPage, setPerPage] = useState(50);

  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const online  = () => setIsOnline(true);
    const offline = () => setIsOnline(false);
    window.addEventListener('online', online);
    window.addEventListener('offline', offline);
    return () => { window.removeEventListener('online', online); window.removeEventListener('offline', offline); };
  }, []);

  useEffect(() => {
    if (groups.length > 0 && !selectedGroupId) setGroupId(groups[0].id);
  }, [groups, selectedGroupId]);

  const loadRecordings = useCallback(() => {
    if (!selectedGroupId) return;
    if (abortRef.current) abortRef.current.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setLdRec(true);
    setRecError(null);

    const params = {
      page,
      limit: perPage,
    };

    if (dateFrom && dateTo && dateFrom === dateTo) {
      params.date = dateFrom;
    }

    if (cameraFilter !== 'all') {
      params.camera = cameraFilter;
    }

    cameraGroupService.getGroupRecordings(selectedGroupId, params)
      .then((response) => {
        if (ctrl.signal.aborted) return;
        const { data: recs, pagination } = response;

        let filtered = recs || [];

        if (dateFrom && dateTo && dateFrom !== dateTo) {
          filtered = filtered.filter((r) => {
            const d = r.date || '';
            return d >= dateFrom && d <= dateTo;
          });
        }

        if (debouncedSearch) {
          const q = debouncedSearch.toLowerCase();
          filtered = filtered.filter((r) =>
            (r.cameraName || '').toLowerCase().includes(q) ||
            (r.filename || '').toLowerCase().includes(q)
          );
        }

        setRecordings(filtered);
        setTotal(pagination?.total || filtered.length);
        setTotalPages(pagination?.totalPages || 1);
        setRecError(null);
      })
      .catch((err) => {
        if (ctrl.signal.aborted) return;
        setRecError(err.response?.data?.message || 'Failed to load recordings.');
        setRecordings([]);
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLdRec(false);
      });
  }, [selectedGroupId, page, perPage, dateFrom, dateTo, cameraFilter, debouncedSearch]);

  useEffect(() => {
    loadRecordings();
  }, [loadRecordings]);

  const handleDownload = async (rec) => {
    try {
      const { data } = await api.get(`/groups/${selectedGroupId}/recordings/download`, {
        params: { key: rec.key },
      });
      if (data.downloadUrl) {
        const a = document.createElement('a');
        a.href = data.downloadUrl;
        a.download = rec.filename || 'recording.mp4';
        a.click();
      }
    } catch {
      alert('Download failed. Please try again.');
    }
  };

  function applyQuick(q) {
    setQuickDate(q);
    setPage(1);
    if (q === 'today')     { setDateFrom(TODAY);     setDateTo(TODAY); }
    else if (q === 'yesterday') { setDateFrom(YESTERDAY); setDateTo(YESTERDAY); }
    else if (q === '7days')     { setDateFrom(SEVEN_AGO); setDateTo(TODAY); }
    else if (q === 'all')       { setDateFrom('');    setDateTo(''); }
  }

  function switchGroup(id) {
    setGroupId(id);
    setCamFilter('all');
    setSearch('');
    setQuickDate('today');
    setDateFrom(TODAY);
    setDateTo(TODAY);
    setPage(1);
  }

  function clearFilters() {
    setCamFilter('all');
    setSearch('');
    setQuickDate('today');
    setDateFrom(TODAY);
    setDateTo(TODAY);
    setPage(1);
  }

  const cameras = useMemo(
    () => [...new Set(recordings.map((r) => r.cameraName).filter(Boolean))].sort(),
    [recordings],
  );

  const sorted = useMemo(
    () => [...recordings].sort((a, b) => {
      const dc = (b.date || '').localeCompare(a.date || '');
      return dc !== 0 ? dc : (b.filename || '').localeCompare(a.filename || '');
    }),
    [recordings],
  );

  // Timeline view: group by date
  const timelineGroups = useMemo(() => {
    const groups = {};
    sorted.forEach((rec) => {
      const d = rec.date || 'Unknown';
      if (!groups[d]) groups[d] = [];
      groups[d].push(rec);
    });
    return Object.entries(groups).map(([date, recs]) => ({ date, recordings: recs }));
  }, [sorted]);

  // Camera view: group by camera
  const cameraGroups = useMemo(() => {
    const groups = {};
    sorted.forEach((rec) => {
      const cam = rec.cameraName || 'Unknown';
      if (!groups[cam]) groups[cam] = [];
      groups[cam].push(rec);
    });
    return Object.entries(groups).map(([camera, recs]) => ({ camera, recordings: recs }));
  }, [sorted]);

  const hasFilters = !!(dateFrom || dateTo || cameraFilter !== 'all' || debouncedSearch);
  const selectedGroup = useMemo(() => groups.find((g) => g.id === selectedGroupId), [groups, selectedGroupId]);

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="p-3 sm:p-5 lg:p-6 max-w-screen-2xl mx-auto space-y-4">

        {/* Offline banner */}
        {!isOnline && (
          <div className="flex items-center gap-2.5 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <WifiOff className="w-4 h-4 text-red-500 shrink-0" />
            <span className="text-xs text-red-700 font-medium">You are offline — some features may not work.</span>
          </div>
        )}

        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-1.5 h-6 sm:h-7 bg-[#F7983A] rounded-full" />
              <h1 className="text-lg sm:text-2xl font-bold text-neutral-900 tracking-tight">Recordings</h1>
            </div>
            <p className="ml-4 text-[11px] sm:text-sm text-neutral-500 mt-0.5">View and manage camera recordings</p>
          </div>
          <button
            onClick={loadRecordings}
            disabled={loadingRecs || loadingGroups}
            className="flex items-center gap-1.5 px-3 py-2 border border-neutral-200 hover:border-orange-300 rounded-xl text-xs text-neutral-500 hover:text-[#F7983A] disabled:opacity-50 transition-colors shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingRecs ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>

        {/* Group/API error */}
        {groupsError && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <span className="text-xs text-red-700 flex-1">Failed to load camera groups.</span>
            <button onClick={() => window.location.reload()} className="text-xs text-red-600 underline">Refresh</button>
          </div>
        )}

        {/* Control bar */}
        <div className="bg-white border border-neutral-100 rounded-2xl p-4 shadow-sm space-y-3">

          {/* Row 1: Office dropdown + View toggle */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">

            {/* Office selector */}
            {loadingGroups ? (
              <div className="h-9 w-52 bg-neutral-100 rounded-xl animate-pulse shrink-0" />
            ) : (
              <div className="relative shrink-0">
                <Building2 className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400 pointer-events-none" />
                <select
                  value={selectedGroupId || ''}
                  onChange={(e) => switchGroup(e.target.value)}
                  disabled={groups.length === 0}
                  className="appearance-none pl-8 pr-8 py-2 text-sm font-semibold border border-neutral-200 rounded-xl bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-orange-300 text-neutral-800 min-w-52 cursor-pointer disabled:opacity-50"
                >
                  {groups.length === 0
                    ? <option value="">No office groups</option>
                    : groups.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name}{g.cameras?.length ? ` (${g.cameras.length} cam)` : ''}
                        </option>
                      ))}
                </select>
              </div>
            )}

            {/* View toggle */}
            <div className="flex items-center gap-2 bg-neutral-100 rounded-xl p-1">
              <button
                onClick={() => setViewMode('timeline')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  viewMode === 'timeline'
                    ? 'bg-white text-[#F7983A] shadow-sm'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                Timeline
              </button>
              <button
                onClick={() => setViewMode('camera')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  viewMode === 'camera'
                    ? 'bg-white text-[#F7983A] shadow-sm'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                <Grid3x3 className="w-3.5 h-3.5" />
                By Camera
              </button>
            </div>

            {/* Stats */}
            {!loadingRecs && !loadingGroups && selectedGroup && !recError && (
              <div className="flex items-center gap-1.5 text-xs text-neutral-500 sm:ml-auto">
                <span className="font-semibold text-neutral-800">{totalRecordings}</span>
                <span>recording{totalRecordings !== 1 ? 's' : ''}</span>
                {cameras.length > 0 && (
                  <>
                    <span className="text-neutral-300">·</span>
                    <span>{cameras.length} camera{cameras.length !== 1 ? 's' : ''}</span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Row 2: Filters */}
          <div className="flex flex-col sm:flex-row gap-3">

            {/* Quick date chips */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {QUICK_CHIPS.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => applyQuick(key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                    quickDate === key
                      ? 'bg-[#F7983A] text-white shadow-sm'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Camera filter (only in timeline view) */}
            {viewMode === 'timeline' && (
              <div className="relative sm:ml-auto">
                <Camera className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-neutral-400 pointer-events-none" />
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-neutral-400 pointer-events-none" />
                <select
                  value={cameraFilter}
                  onChange={(e) => { setCamFilter(e.target.value); setPage(1); }}
                  disabled={cameras.length === 0}
                  className="appearance-none pl-7 pr-7 py-1.5 text-xs border border-neutral-200 rounded-lg bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-orange-300 text-neutral-700 min-w-36 disabled:opacity-50 cursor-pointer"
                >
                  <option value="all">All Cameras</option>
                  {cameras.map((c) => <option key={c} value={c}>{formatCameraSlug(c)}</option>)}
                </select>
              </div>
            )}

            {/* Search */}
            <div className="relative sm:max-w-xs w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search recordings..."
                value={searchQuery}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-neutral-200 rounded-lg bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-orange-300 placeholder-neutral-400 text-neutral-800"
              />
            </div>

            {hasFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 px-3 py-1.5 border border-red-200 text-red-500 hover:bg-red-50 rounded-lg text-xs transition-colors whitespace-nowrap"
              >
                <X className="w-3 h-3" /> Clear
              </button>
            )}
          </div>
        </div>

        {/* Recording load error */}
        {recError && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <span className="text-xs text-red-700 flex-1">{recError}</span>
            <button onClick={loadRecordings} className="text-xs text-red-600 underline shrink-0">Retry</button>
          </div>
        )}

        {/* Main content */}
        <div className="bg-white border border-neutral-100 rounded-2xl p-4 lg:p-5 shadow-sm min-h-96">
          {loadingRecs || loadingGroups ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-[#F7983A] animate-spin" />
            </div>

          ) : sorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-4">
              <div className="w-16 h-16 bg-neutral-100 rounded-2xl flex items-center justify-center mb-4">
                <HardDrive className="w-8 h-8 text-neutral-300" />
              </div>
              <h3 className="text-sm font-semibold text-neutral-700 mb-1">
                {hasFilters ? 'No matching recordings' : 'No recordings yet'}
              </h3>
              <p className="text-xs text-neutral-400 max-w-xs">
                {hasFilters
                  ? 'Try a different date range or camera filter.'
                  : 'Recordings will appear here once your cameras start saving to storage.'}
              </p>
              {hasFilters && (
                <button
                  onClick={clearFilters}
                  className="mt-4 text-xs text-[#F7983A] border border-orange-200 hover:bg-orange-50 px-4 py-2 rounded-lg transition-colors"
                >
                  Clear all filters
                </button>
              )}
            </div>

          ) : viewMode === 'timeline' ? (
            /* Timeline View */
            <>
              <div className="space-y-6">
                {timelineGroups.map(({ date, recordings: recs }) => (
                  <div key={date} className="space-y-2">
                    {/* Date header */}
                    <div className="flex items-center gap-3 pb-2">
                      <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-widest">
                        {formatDateLabel(date)}
                      </h3>
                      <div className="flex-1 h-px bg-neutral-200" />
                      <span className="text-xs text-neutral-400">{recs.length} recording{recs.length !== 1 ? 's' : ''}</span>
                    </div>

                    {/* Recordings list */}
                    <div className="space-y-1">
                      {recs.map((rec) => (
                        <TimelineRow
                          key={rec.key}
                          rec={rec}
                          groupId={selectedGroupId}
                          onPlay={setSelectedRec}
                          onDownload={handleDownload}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <Pagination
                  page={page}
                  totalPages={totalPages}
                  perPage={perPage}
                  total={totalRecordings}
                  onPage={setPage}
                  onPerPage={(n) => { setPerPage(n); setPage(1); }}
                />
              )}
            </>

          ) : (
            /* Camera View */
            <>
              <div className="space-y-3">
                {cameraGroups.map(({ camera, recordings: recs }) => (
                  <CameraSection
                    key={camera}
                    cameraName={camera}
                    recordings={recs}
                    groupId={selectedGroupId}
                    onPlay={setSelectedRec}
                    onDownload={handleDownload}
                  />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <Pagination
                  page={page}
                  totalPages={totalPages}
                  perPage={perPage}
                  total={totalRecordings}
                  onPage={setPage}
                  onPerPage={(n) => { setPerPage(n); setPage(1); }}
                />
              )}
            </>
          )}
        </div>
      </div>

      {/* Player modal */}
      {selectedRec && (
        <PlayerModal
          recording={selectedRec}
          groupId={selectedGroupId}
          onClose={() => setSelectedRec(null)}
        />
      )}
    </div>
  );
}
