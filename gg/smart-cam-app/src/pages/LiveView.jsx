import { useCallback, useEffect, useState } from 'react';
import { releaseAllStreams } from '@/services/streamCache';
import { Badge } from '@/components/ui/badge';
import { useGroups } from '@/hooks/useQueries';
import { useQueryClient } from '@tanstack/react-query';
import DirectStreamPlayer from '@/components/DirectStreamPlayer';
import {
  Camera, ChevronDown, ChevronLeft, ChevronRight, Circle,
  Grid2X2, LayoutGrid, Maximize2, Monitor, RefreshCw, Search,
  Cctv, Video, X, Eye, List,
} from 'lucide-react';

// ─── Layout configs ───────────────────────────────────────────────────────────
const LAYOUTS = [
  { id: 1, label: 'Single', icon: Monitor, cols: 1, rows: 1 },
  { id: 4, label: '2 × 2', icon: Grid2X2, cols: 2, rows: 2 },
  { id: 6, label: '2 × 3', icon: LayoutGrid, cols: 3, rows: 2 },
];

// ─── Status Dot ───────────────────────────────────────────────────────────────
function StatusDot({ status }) {
  return status === 'online'
    ? <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)] shrink-0" />
    : <span className="w-2 h-2 rounded-full bg-neutral-500/40 shrink-0" />;
}

// ─── Grid Tile ────────────────────────────────────────────────────────────────
// forceHls=true: skip WebRTC for grid cameras — HLS is more reliable for
// multiple simultaneous streams and avoids 6 parallel WebRTC negotiations.
function GridTile({ camera, onExpand }) {
  return (
    <div className="relative rounded-xl overflow-hidden bg-neutral-950 group h-full ring-1 ring-white/6">
      <DirectStreamPlayer monitorId={camera?.monitorId} forceHls className="w-full h-full" />

      {/* Hover overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent px-3 py-3 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <div className="flex items-center gap-2 min-w-0">
          <StatusDot status={camera?.status} />
          <span className="text-white text-sm font-semibold truncate">{camera?.name}</span>
        </div>
        <div className="flex items-center gap-2">
          {camera?.status === 'online' && (
            <span className="flex items-center gap-1 text-xs text-red-400 font-bold tracking-widest">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />LIVE
            </span>
          )}
          <button
            onClick={() => onExpand(camera)}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-[#F7983A]/80 transition-colors"
            title="Expand to single view"
          >
            <Maximize2 className="w-3.5 h-3.5 text-white" />
          </button>
        </div>
      </div>

      {/* Always-visible name */}
      <div className="absolute bottom-0 left-0 right-0 px-3 py-2 bg-gradient-to-t from-black/70 to-transparent group-hover:opacity-0 transition-opacity pointer-events-none">
        <span className="text-white/80 text-xs font-medium truncate block">{camera?.name}</span>
      </div>
    </div>
  );
}

// ─── Camera List Item ─────────────────────────────────────────────────────────
function CameraItem({ camera, selected, onSelect, inGrid, onToggleGrid, maxGrid, collapsed }) {
  if (collapsed) {
    return (
      <button
        onClick={() => onSelect(camera)}
        title={camera.name}
        className={`w-full flex items-center justify-center py-2.5 rounded-lg transition-all ${selected ? 'bg-[#F7983A]/15' : 'hover:bg-white/[0.04]'
          }`}
      >
        <StatusDot status={camera.status} />
      </button>
    );
  }

  return (
    <div
      onClick={() => onSelect(camera)}
      className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all ${selected
          ? 'bg-[#F7983A]/10 ring-1 ring-[#F7983A]/25'
          : 'hover:bg-white/4'
        }`}
    >
      <StatusDot status={camera.status} />
      <div className="flex-1 min-w-0">
        {/* Camera name — headline of this row */}
        <p className={`text-sm font-semibold leading-tight truncate ${selected ? 'text-[#F7983A]' : 'text-foreground'}`}>
          {camera.name}
        </p>
        {/* Subline — resolution + fps */}
        <p className="text-xs text-muted-foreground mt-0.5">
          720p · 15 fps
        </p>
      </div>
      {camera.status === 'online' && (
        <button
          onClick={(e) => { e.stopPropagation(); onToggleGrid(camera); }}
          title={inGrid ? 'Remove from grid' : 'Add to grid'}
          className={`p-1.5 rounded-md transition-all shrink-0 ${inGrid
              ? 'text-[#F7983A] opacity-100 bg-[#F7983A]/10'
              : `opacity-0 group-hover:opacity-100 ${maxGrid ? 'text-muted-foreground/30 cursor-not-allowed' : 'text-muted-foreground hover:text-[#F7983A]'}`
            }`}
          disabled={!inGrid && maxGrid}
        >
          <Grid2X2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

// ─── Group Accordion ──────────────────────────────────────────────────────────
function GroupAccordion({ group, selectedCamera, onSelectCamera, gridCameras, onToggleGrid, maxGrid, collapsed }) {
  const [open, setOpen] = useState(true);
  const cameras = (group.cameras || []).slice().sort((a, b) => (a.channel || 0) - (b.channel || 0));
  const onlineCount = cameras.filter(c => c.status === 'online').length;

  if (collapsed) {
    return (
      <div className="mb-2">
        <div className="flex justify-center py-1.5" title={group.name}>
          <div className="w-7 h-7 rounded-lg bg-[#F7983A]/15 flex items-center justify-center">
            <Cctv className="w-3.5 h-3.5 text-[#F7983A]" />
          </div>
        </div>
        <div className="space-y-0.5 px-1">
          {cameras.map(cam => (
            <CameraItem key={cam.id} camera={cam} selected={selectedCamera?.id === cam.id}
              onSelect={onSelectCamera} inGrid={gridCameras.some(g => g.id === cam.id)}
              onToggleGrid={onToggleGrid} maxGrid={maxGrid} collapsed />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mb-1">
      {/* Group header */}
      <button
        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-white/4 transition-colors"
        onClick={() => setOpen(v => !v)}
      >
        {open
          ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
          : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
        }
        <div className="w-6 h-6 rounded-lg bg-[#F7983A]/15 flex items-center justify-center shrink-0">
          <Cctv className="w-3 h-3 text-[#F7983A]" />
        </div>
        {/* Group name — headline */}
        <span className="flex-1 text-sm font-bold text-foreground text-left truncate">{group.name}</span>
        {/* Online count — subline chip */}
        <Badge variant="outline" className="text-xs px-1.5 py-0 h-5 border-emerald-500/20 text-emerald-500 bg-emerald-500/5 font-bold shrink-0">
          {onlineCount} on
        </Badge>
      </button>

      {open && cameras.length > 0 && (
        <div className="ml-2 mt-0.5 space-y-0.5">
          {cameras.map(cam => (
            <CameraItem key={cam.id} camera={cam} selected={selectedCamera?.id === cam.id}
              onSelect={onSelectCamera} inGrid={gridCameras.some(g => g.id === cam.id)}
              onToggleGrid={onToggleGrid} maxGrid={maxGrid} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Layout Picker ────────────────────────────────────────────────────────────
function LayoutPicker({ layoutId, gridMode, onPick, compact = false }) {
  return (
    <div className={`flex ${compact ? 'gap-1' : 'gap-1.5'}`}>
      {LAYOUTS.map(l => {
        const Icon = l.icon;
        const active = layoutId === l.id && (gridMode || l.id === 1);
        return (
          <button
            key={l.id}
            onClick={() => onPick(l)}
            title={l.label}
            className={`rounded-xl transition-all ${compact
                ? 'w-9 h-9 flex items-center justify-center'
                : 'flex-1 flex flex-col items-center gap-1 py-2.5 text-xs font-semibold'
              } ${active
                ? 'bg-[#F7983A]/10 text-[#F7983A] ring-1 ring-[#F7983A]/25'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}
          >
            <Icon className="w-4 h-4" />
            {!compact && l.label}
          </button>
        );
      })}
    </div>
  );
}

// ─── Info Strip (single-view metadata bar) ────────────────────────────────────
function InfoStrip({ camera }) {
  const pills = [
    { label: 'Resolution', value: '1280×720 (Live)' },
    { label: 'Frame Rate', value: '15 fps (Live)' },
    { label: 'Codec', value: (camera.type || 'H.264').toUpperCase() },
    { label: 'Channel', value: `Ch ${camera.channel}` },
  ];

  return (
    <div className="shrink-0 flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 bg-card rounded-xl border border-border">
      {/* Status */}
      <div className="flex items-center gap-2">
        <StatusDot status={camera.status} />
        <span className={`text-sm font-bold ${camera.status === 'online' ? 'text-emerald-500' : 'text-muted-foreground'}`}>
          {camera.status === 'online' ? 'Live' : 'Offline'}
        </span>
      </div>

      <div className="w-px h-5 bg-border shrink-0" />

      {/* Stream pills */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
        {pills.map(p => (
          <div key={p.label} className="flex flex-col">
            {/* Label — small caption */}
            <span className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider leading-none">{p.label}</span>
            {/* Value — subline */}
            <span className="text-sm font-semibold text-foreground mt-0.5">{p.value}</span>
          </div>
        ))}
      </div>

      {/* REC badge — only when actually online */}
      {camera.status === 'online' && (
        <div className="ml-auto flex items-center gap-2 bg-red-500/10 px-3 py-1.5 rounded-full">
          <Circle className="w-2.5 h-2.5 fill-red-500 text-red-500 animate-pulse" />
          <span className="text-xs font-bold text-red-500 tracking-widest">REC</span>
        </div>
      )}
    </div>
  );
}

// ─── Mobile Camera Sheet ──────────────────────────────────────────────────────
function MobileCameraSheet({ open, onClose, groups, selectedCamera, onSelectCamera, gridCameras, onToggleGrid, maxGrid, onRefresh, searchQuery, setSearchQuery }) {
  const allCount = groups.flatMap(g => g.cameras || []).length;
  const onlineCount = groups.flatMap(g => g.cameras || []).filter(c => c.status === 'online').length;

  const filteredGroups = searchQuery
    ? groups.map(g => ({
      ...g,
      cameras: (g.cameras || []).filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
    })).filter(g => g.cameras.length > 0)
    : groups;

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-40 md:hidden"
        onClick={onClose}
      />
      {/* Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-card border-t border-border rounded-t-2xl flex flex-col"
        style={{ maxHeight: '80vh' }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 bg-border rounded-full" />
        </div>

        {/* Sheet header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <div>
            {/* Headline */}
            <p className="text-sm font-bold text-foreground">Cameras</p>
            {/* Subline */}
            <p className="text-xs text-muted-foreground mt-0.5">{onlineCount} of {allCount} online</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onRefresh}
              className="p-2 rounded-lg text-muted-foreground hover:text-[#F7983A] hover:bg-[#F7983A]/10 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button onClick={onClose} className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="px-4 py-2.5 border-b border-border shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
            <input
              type="text"
              placeholder="Search cameras…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 text-sm bg-muted/50 border border-border rounded-xl placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-[#F7983A]/40 focus:border-[#F7983A]/40 transition-all"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto py-2 px-2">
          {filteredGroups.map(g => (
            <GroupAccordion key={g.id} group={g} selectedCamera={selectedCamera}
              onSelectCamera={(cam) => { onSelectCamera(cam); onClose(); }}
              gridCameras={gridCameras} onToggleGrid={onToggleGrid}
              maxGrid={maxGrid} collapsed={false} />
          ))}
          {filteredGroups.length === 0 && (
            <div className="text-center py-10">
              <Camera className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                {searchQuery ? `No cameras match "${searchQuery}"` : 'No cameras added'}
              </p>
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="text-xs text-[#F7983A] mt-1 hover:underline">
                  Clear search
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Main LiveView ────────────────────────────────────────────────────────────
export default function LiveView() {
  const { data: groups = [], isLoading: loading } = useGroups({ refetchInterval: 15_000 });
  const qc = useQueryClient();

  const [selectedCamera, setSelectedCamera] = useState(null);
  const [gridCameras, setGridCameras] = useState([]);
  const [layoutId, setLayoutId] = useState(1);
  const [gridMode, setGridMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);

  const layout = LAYOUTS.find(l => l.id === layoutId) || LAYOUTS[0];
  const maxGridSlots = layoutId;

  // ── Stop all backend streams when leaving LiveView ─────────────────────────
  useEffect(() => {
    return () => releaseAllStreams();
  }, []);

  // ── Auto-select first online camera ───────────────────────────────────────
  useEffect(() => {
    if (!loading && groups.length > 0 && !selectedCamera) {
      const first = groups.flatMap(g => g.cameras || []).find(c => c.status === 'online');
      if (first) setSelectedCamera(first);
    }
  }, [loading, groups]);

  const handleRefresh = async () => qc.invalidateQueries({ queryKey: ['groups'] });
  const handleSelectCamera = (cam) => { setSelectedCamera(cam); setGridMode(false); };

  const handleToggleGrid = useCallback((cam) => {
    setGridCameras(prev => {
      if (prev.some(c => c.id === cam.id)) return prev.filter(c => c.id !== cam.id);
      if (prev.length >= maxGridSlots) return prev;
      return [...prev, cam];
    });
  }, [maxGridSlots]);

  const handlePickLayout = (l) => {
    setLayoutId(l.id);
    setGridMode(l.id > 1);
    if (l.id === 1) setGridMode(false);
  };

  const handleExpandFromGrid = (cam) => { setSelectedCamera(cam); setGridMode(false); };

  const allCameras = groups.flatMap(g => g.cameras || []);
  const onlineCount = allCameras.filter(c => c.status === 'online').length;
  const gridSlots = Array.from({ length: layoutId }, (_, i) => gridCameras[i] || null);

  const filteredGroups = searchQuery
    ? groups.map(g => ({
      ...g,
      cameras: (g.cameras || []).filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
    })).filter(g => g.cameras.length > 0)
    : groups;

  // On mobile: grid uses max 2 columns regardless of layout
  const gridColClass = layout.cols === 1 ? 'grid-cols-1' : layout.cols === 2 ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-3';
  const gridRowClass = layout.rows === 2 ? 'grid-rows-2' : 'grid-rows-1';

  return (
    <>
      {/* ── Desktop layout ─── */}
      <div className="flex h-[calc(100vh-4rem)] bg-background overflow-hidden">

        {/* ── Sidebar (desktop only) ── */}
        <aside className={`shrink-0 hidden md:flex flex-col bg-card border-r border-border h-full overflow-hidden transition-[width] duration-250 ease-in-out ${sidebarOpen ? 'w-65' : 'w-13'
          }`}>
          {/* Sidebar header */}
          <div className={`shrink-0 flex items-center border-b border-border ${sidebarOpen ? 'px-4 py-3 justify-between' : 'py-3 justify-center'}`}>
            {sidebarOpen && (
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#F7983A] flex items-center justify-center">
                  <Eye className="w-4 h-4 text-white" />
                </div>
                <div>
                  {/* Headline */}
                  <p className="text-sm font-bold text-foreground">Live View</p>
                  {/* Subline */}
                  <p className="text-xs text-muted-foreground">
                    {onlineCount}/{allCameras.length} cameras online
                  </p>
                </div>
              </div>
            )}
            <div className={`flex items-center ${sidebarOpen ? 'gap-0.5' : 'flex-col gap-1.5'}`}>
              {sidebarOpen && (
                <button
                  onClick={handleRefresh}
                  title="Refresh"
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-[#F7983A] hover:bg-[#F7983A]/10 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={() => setSidebarOpen(v => !v)}
                title={sidebarOpen ? 'Collapse panel' : 'Expand panel'}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                {sidebarOpen ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Search */}
          {sidebarOpen && (
            <div className="px-3 py-2.5 border-b border-border">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
                <input
                  type="text"
                  placeholder="Search cameras…"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-sm bg-muted/50 border border-border rounded-lg placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-[#F7983A]/40 focus:border-[#F7983A]/40 transition-all"
                />
              </div>
            </div>
          )}

          {/* Count label */}
          {sidebarOpen && (
            <div className="px-4 py-2 flex items-center justify-between border-b border-border/50">
              {/* Section label */}
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Cameras</span>
              <span className="text-xs font-bold text-foreground">{allCameras.length}</span>
            </div>
          )}

          {/* Camera list */}
          <div className="flex-1 overflow-y-auto py-2 px-1.5">
            {loading ? (
              <div className="space-y-2 px-1.5 py-2">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className={`bg-muted/50 rounded-xl animate-pulse ${sidebarOpen ? 'h-12 w-full' : 'h-8 w-8 mx-auto rounded-full'}`} />
                ))}
              </div>
            ) : filteredGroups.length === 0 ? (
              <div className="text-center py-10">
                <Camera className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
                {sidebarOpen && (
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">
                      {searchQuery ? 'No cameras found' : 'No cameras added'}
                    </p>
                    {searchQuery && (
                      <button onClick={() => setSearchQuery('')} className="text-xs text-[#F7983A] mt-1 hover:underline">
                        Clear search
                      </button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              filteredGroups.map(g => (
                <GroupAccordion key={g.id} group={g} selectedCamera={selectedCamera}
                  onSelectCamera={handleSelectCamera} gridCameras={gridCameras}
                  onToggleGrid={handleToggleGrid} maxGrid={gridCameras.length >= maxGridSlots}
                  collapsed={!sidebarOpen} />
              ))
            )}
          </div>

          {/* Layout picker */}
          <div className={`border-t border-border py-3 shrink-0 ${sidebarOpen ? 'px-3' : 'px-1.5'}`}>
            {sidebarOpen && (
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1 mb-2">Layout</p>
            )}
            <LayoutPicker
              layoutId={layoutId}
              gridMode={gridMode}
              onPick={handlePickLayout}
              compact={!sidebarOpen}
            />
            {sidebarOpen && gridMode && (
              <p className="text-xs text-muted-foreground/60 px-1 mt-2.5">
                {gridCameras.length}/{maxGridSlots} cameras selected
                {gridCameras.length === 0 && ' · tap the grid icon next to a camera'}
              </p>
            )}
          </div>
        </aside>

        {/* ── Main content area ── */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">

          {/* Top bar */}
          <div className="shrink-0 flex items-center justify-between px-4 py-2.5 border-b border-border bg-card/50 backdrop-blur-sm gap-3">
            {/* Left: what is showing */}
            <div className="flex items-center gap-3 min-w-0">
              {gridMode ? (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#F7983A]/10 flex items-center justify-center shrink-0">
                    <LayoutGrid className="w-4 h-4 text-[#F7983A]" />
                  </div>
                  <div>
                    {/* Headline */}
                    <p className="text-sm font-bold text-foreground">{layout.label} Grid</p>
                    {/* Subline */}
                    <p className="text-xs text-muted-foreground">{gridCameras.length} of {maxGridSlots} cameras</p>
                  </div>
                  {gridCameras.length > 0 && (
                    <button
                      onClick={() => setGridCameras([])}
                      className="ml-1 flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors font-medium px-2 py-1 rounded-lg hover:bg-destructive/10"
                    >
                      <X className="w-3 h-3" /> Clear
                    </button>
                  )}
                </div>
              ) : selectedCamera ? (
                <div className="flex items-center gap-2.5 min-w-0">
                  <StatusDot status={selectedCamera.status} />
                  {/* Camera name — headline */}
                  <span className="text-sm font-bold text-foreground truncate">{selectedCamera.name}</span>
                  {selectedCamera.status === 'online' && (
                    <span className="flex items-center gap-1.5 text-xs font-bold text-white tracking-wider bg-red-500 px-2 py-0.5 rounded-full shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                      LIVE
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-sm text-muted-foreground font-medium">Select a camera to start</span>
              )}
            </div>

            {/* Right: view controls */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Desktop: Single / Grid toggle */}
              <div className="hidden md:flex items-center bg-muted/50 rounded-xl p-0.5 gap-0.5">
                <button
                  onClick={() => { setGridMode(false); setLayoutId(1); }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${!gridMode ? 'bg-[#F7983A] text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                  <Monitor className="w-3.5 h-3.5" />
                  Single
                </button>
                <button
                  onClick={() => { setLayoutId(4); setGridMode(true); }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${gridMode ? 'bg-[#F7983A] text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                  <Grid2X2 className="w-3.5 h-3.5" />
                  Multi-View
                </button>
              </div>

              {/* Mobile: Camera list button */}
              <button
                onClick={() => setMobileSheetOpen(true)}
                className="flex md:hidden items-center gap-1.5 px-3 py-2 rounded-xl bg-[#F7983A]/10 text-[#F7983A] text-xs font-semibold hover:bg-[#F7983A]/20 transition-colors"
              >
                <List className="w-4 h-4" />
                Cameras
              </button>

              {/* Mobile: toggle single/grid */}
              <button
                onClick={() => {
                  if (gridMode) { setGridMode(false); setLayoutId(1); }
                  else { setLayoutId(4); setGridMode(true); }
                }}
                className="flex md:hidden items-center gap-1.5 px-3 py-2 rounded-xl bg-muted/50 text-muted-foreground text-xs font-semibold hover:text-foreground hover:bg-muted transition-colors"
              >
                {gridMode ? <Monitor className="w-4 h-4" /> : <Grid2X2 className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Video area */}
          <div className="flex-1 overflow-hidden p-3">
            {gridMode ? (
              /* Grid view */
              <div className={`h-full grid gap-2 ${gridColClass} ${gridRowClass}`}>
                {gridSlots.map((cam, i) => (
                  <div key={i} className="relative rounded-xl overflow-hidden bg-neutral-950 ring-1 ring-white/6">
                    {cam ? (
                      <GridTile camera={cam} onExpand={handleExpandFromGrid} />
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center gap-3">
                        <div className="w-12 h-12 rounded-2xl border-2 border-dashed border-white/8 flex items-center justify-center">
                          <Camera className="w-5 h-5 text-white/20" />
                        </div>
                        <div className="text-center px-4">
                          {/* Empty slot headline */}
                          <p className="text-sm font-semibold text-white/40">Empty slot</p>
                          {/* Empty slot subline */}
                          <p className="text-xs text-white/20 mt-0.5 hidden sm:block">
                            Tap the grid icon next to a camera
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

            ) : selectedCamera ? (
              /* Single view */
              <div className="h-full flex flex-col gap-3">
                {/* Player */}
                <div className="flex-1 rounded-2xl overflow-hidden ring-1 ring-white/6 shadow-2xl min-h-0 relative">
                  <DirectStreamPlayer monitorId={selectedCamera.monitorId} muted={false} className="w-full h-full" />

                  {/* Top overlay — camera name + date */}
                  <div className="absolute top-0 left-0 right-0 px-4 py-3 bg-linear-to-b from-black/60 to-transparent pointer-events-none">
                    <div className="flex items-center justify-between gap-2">
                      {/* Overlay headline */}
                      <span className="text-white/90 text-sm font-semibold truncate">{selectedCamera.name}</span>
                      {/* Overlay caption */}
                      <span className="text-white/50 text-xs font-medium tabular-nums shrink-0">
                        {new Date().toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Info strip */}
                <InfoStrip camera={selectedCamera} />
              </div>

            ) : (
              /* No camera selected */
              <div className="h-full flex flex-col items-center justify-center gap-5 text-center px-6">
                <div className="w-20 h-20 rounded-3xl bg-[#F7983A]/10 flex items-center justify-center">
                  <Video className="w-10 h-10 text-[#F7983A]/40" />
                </div>
                <div>
                  {/* Headline */}
                  <p className="text-base font-bold text-foreground">No camera selected</p>
                  {/* Paragraph */}
                  <p className="text-sm text-muted-foreground mt-2 max-w-xs leading-relaxed">
                    {loading
                      ? 'Loading cameras…'
                      : 'Choose a camera from the left panel to start watching the live feed.'
                    }
                  </p>
                </div>
                {/* Mobile: open camera list */}
                {!loading && groups.length > 0 && (
                  <button
                    onClick={() => setMobileSheetOpen(true)}
                    className="flex md:hidden items-center gap-2 px-4 py-2.5 rounded-xl bg-[#F7983A] text-white text-sm font-semibold hover:bg-[#E8882A] transition-colors"
                  >
                    <Camera className="w-4 h-4" />
                    Choose Camera
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Mobile camera bottom sheet ── */}
      <MobileCameraSheet
        open={mobileSheetOpen}
        onClose={() => setMobileSheetOpen(false)}
        groups={filteredGroups}
        selectedCamera={selectedCamera}
        onSelectCamera={handleSelectCamera}
        gridCameras={gridCameras}
        onToggleGrid={handleToggleGrid}
        maxGrid={gridCameras.length >= maxGridSlots}
        onRefresh={handleRefresh}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />
    </>
  );
}
