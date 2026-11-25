import {
  useState, useEffect, useCallback, useRef, useMemo,
} from 'react';
import {
  MapContainer, TileLayer, useMap, useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import {
  Search, Video, MapPin, X, Camera, Wifi, WifiOff,
  ChevronLeft, ChevronRight, RefreshCw, AlertCircle,
  Layers, Navigation, LocateFixed, Filter,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { cameraGroupService } from '@/services/cameraGroup';
import DirectStreamPlayer from '@/components/DirectStreamPlayer';

// ─────────────────────────────────────────────────────────────────────────────
// Inject custom keyframe CSS once at module level
// ─────────────────────────────────────────────────────────────────────────────
const STYLE_ID = 'drishyam-map-styles';
if (!document.getElementById(STYLE_ID)) {
  const el = document.createElement('style');
  el.id = STYLE_ID;
  el.textContent = `
    @keyframes dPing {
      0%   { transform: translate(-50%,-50%) scale(1); opacity: .7; }
      100% { transform: translate(-50%,-50%) scale(2.8); opacity: 0; }
    }
    /* Override leaflet cluster default styles */
    .drishyam-cluster {
      background: transparent !important;
      border: none !important;
    }
    /* Hide default leaflet attribution */
    .leaflet-control-attribution { display: none !important; }
    .leaflet-control-zoom { display: none !important; }
  `;
  document.head.appendChild(el);
}

// ─────────────────────────────────────────────────────────────────────────────
// Fix Leaflet icon path issue with Vite bundler
// ─────────────────────────────────────────────────────────────────────────────
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Returns true if the IP is a private/local address */
function isPrivateIP(ip) {
  return /^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|127\.|0\.|localhost)/i.test(ip || '');
}

/** Geocode a public IP via ip-api.com (free, no key, CORS-enabled, 45 req/min) */
async function geolocateIP(ip) {
  if (!ip || isPrivateIP(ip)) return null;
  try {
    const res  = await fetch(`https://ip-api.com/json/${ip}?fields=status,lat,lon,city,regionName,country`);
    const data = await res.json();
    if (data.status === 'success') {
      return {
        lat: data.lat, lng: data.lon,
        city: data.city, region: data.regionName, country: data.country,
      };
    }
  } catch { /* network error — silently ignore */ }
  return null;
}

/** Get browser geolocation (used as fallback map center) */
function getBrowserLocation() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { timeout: 5000 },
    );
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Custom marker icon builder
// ─────────────────────────────────────────────────────────────────────────────
function buildMarkerIcon(online, selected) {
  const color  = online  ? '#22c55e' : '#ef4444';
  const size   = selected ? 42 : 34;
  const ring   = selected ? '3px solid #F7983A' : `2px solid ${online ? '#fff' : 'rgba(255,255,255,0.6)'}`;
  const pulse  = online ? `<div style="position:absolute;top:50%;left:50%;width:${size + 18}px;height:${size + 18}px;border-radius:50%;background:${color}35;animation:dPing 1.8s ease-out infinite;"></div>` : '';

  const html = `<div style="position:relative;width:${size + 22}px;height:${size + 22}px;">
    ${pulse}
    <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:${size}px;height:${size}px;background:${selected ? '#F7983A' : color};border-radius:50%;border:${ring};display:flex;align-items:center;justify-content:center;box-shadow:0 3px 14px rgba(0,0,0,0.3);">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="white"><path d="M15 8v8H5V8h10zm1-2H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3.5l4 4v-11l-4 4V7a1 1 0 0 0-1-1z"/></svg>
    </div>
  </div>`;

  const sz = size + 22;
  return L.divIcon({ html, className: '', iconSize: [sz, sz], iconAnchor: [sz / 2, sz / 2] });
}

/** Custom cluster icon */
function buildClusterIcon(count, onlineRatio) {
  const color  = onlineRatio >= 0.8 ? '#22c55e' : onlineRatio >= 0.4 ? '#F7983A' : '#ef4444';
  const size   = count > 99 ? 52 : count > 9 ? 46 : 40;
  const html   = `<div style="width:${size}px;height:${size}px;background:${color};border-radius:50%;border:3px solid #fff;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 10px rgba(0,0,0,0.25);font-size:13px;font-weight:700;color:#fff;">${count}</div>`;
  return L.divIcon({ html, className: 'drishyam-cluster', iconSize: [size, size], iconAnchor: [size / 2, size / 2] });
}

// ─────────────────────────────────────────────────────────────────────────────
// ClusterLayer — renders all group markers with clustering for 1000+ pins
// ─────────────────────────────────────────────────────────────────────────────
function ClusterLayer({ groups, selectedGroupId, onSelect }) {
  const map         = useMap();
  const clusterRef  = useRef(null);

  useEffect(() => {
    if (!map) return;
    if (clusterRef.current) {
      map.removeLayer(clusterRef.current);
      clusterRef.current = null;
    }

    const validGroups = groups.filter((g) => g.latitude && g.longitude);
    if (validGroups.length === 0) return;

    const mcg = L.markerClusterGroup({
      maxClusterRadius: 60,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      iconCreateFunction: (cluster) => {
        const markers  = cluster.getAllChildMarkers();
        const online   = markers.filter((m) => m.options._online).length;
        const ratio    = markers.length > 0 ? online / markers.length : 0;
        return buildClusterIcon(cluster.getChildCount(), ratio);
      },
    });

    validGroups.forEach((group) => {
      const marker = L.marker(
        [parseFloat(group.latitude), parseFloat(group.longitude)],
        {
          icon: buildMarkerIcon(group.status === 'online', selectedGroupId === group.id),
          _online: group.status === 'online',
        },
      );
      marker.on('click', () => onSelect(group));
      mcg.addLayer(marker);
    });

    map.addLayer(mcg);
    clusterRef.current = mcg;

    return () => {
      if (clusterRef.current) {
        map.removeLayer(clusterRef.current);
        clusterRef.current = null;
      }
    };
  }, [map, groups, selectedGroupId, onSelect]);

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// MapController — smooth fly-to when a group is selected
// ─────────────────────────────────────────────────────────────────────────────
function MapController({ group }) {
  const map = useMap();
  useEffect(() => {
    if (group?.latitude && group?.longitude) {
      map.flyTo(
        [parseFloat(group.latitude), parseFloat(group.longitude)],
        16,
        { animate: true, duration: 1.0 },
      );
    }
  }, [group, map]);
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// MapClickHandler — captures map clicks for pin placement mode
// ─────────────────────────────────────────────────────────────────────────────
function MapClickHandler({ enabled, onMapClick }) {
  useMapEvents({ click: (e) => { if (enabled) onMapClick(e.latlng); } });
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Tile configs
// ─────────────────────────────────────────────────────────────────────────────
const TILE_MODES = {
  street: {
    label: 'Street',
    url:   'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
  },
  satellite: {
    label: 'Satellite',
    url:   'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// MapPage
// ─────────────────────────────────────────────────────────────────────────────
export default function Map() {
  const [groups,         setGroups]        = useState([]);
  const [loading,        setLoading]       = useState(true);
  const [error,          setError]         = useState(null);
  const [geoProgress,    setGeoProgress]   = useState(0); // 0-100
  const [mapCenter,      setMapCenter]     = useState([20.5937, 78.9629]); // India default
  const [search,         setSearch]        = useState('');
  const [statusFilter,   setStatusFilter]  = useState('all');   // all | online | offline
  const [pinFilter,      setPinFilter]     = useState('all');   // all | mapped | unmapped
  const [selectedGroup,  setSelectedGroup] = useState(null);
  const [selectedCamera, setSelectedCamera]= useState(null);
  const [panelOpen,      setPanelOpen]     = useState(false);
  const [sidebarOpen,    setSidebarOpen]   = useState(() => window.innerWidth >= 768);
  const [settingPin,     setSettingPin]    = useState(false);
  const [pinSaving,      setPinSaving]     = useState(false);
  const [tileMode,       setTileMode]      = useState('street');
  const [camSearch,      setCamSearch]     = useState('');

  const qc = useQueryClient();

  // ── Load groups + auto-geolocate ──────────────────────────────────────────
  const loadGroups = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setGeoProgress(0);

      const data = await cameraGroupService.getGroups();
      if (!data || data.length === 0) { setGroups([]); return; }

      // Start with what we have
      setGroups(data);

      // Try to get browser location for initial map center
      const browserLoc = await getBrowserLocation();
      if (browserLoc) setMapCenter([browserLoc.lat, browserLoc.lng]);

      // Auto-geolocate groups that have no coordinates
      const missing = data.filter((g) => !g.latitude || !g.longitude);
      if (missing.length === 0) { setGeoProgress(100); return; }

      let done = 0;
      const enriched = [...data];

      // Rate-limit: ip-api.com allows 45 req/min = ~750ms between requests
      for (const group of missing) {
        const geo = await geolocateIP(group.host);
        done++;
        setGeoProgress(Math.round((done / missing.length) * 100));

        if (geo) {
          const idx = enriched.findIndex((g) => g.id === group.id);
          if (idx !== -1) {
            enriched[idx] = { ...enriched[idx], latitude: geo.lat, longitude: geo.lng, geoCity: geo.city };
            setGroups([...enriched]); // update UI incrementally

            // Persist to DB (fire and forget)
            cameraGroupService.updateGroup(group.id, { latitude: geo.lat, longitude: geo.lng })
              .catch(() => { /* silently ignore */ });
          }
        }

        // Rate limit: wait 800ms between each IP lookup
        if (done < missing.length) await new Promise((r) => setTimeout(r, 800));
      }

      setGroups([...enriched]);
    } catch (err) {
      setError('Failed to load camera sites.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadGroups(); }, [loadGroups]);

  // ── Derived values ─────────────────────────────────────────────────────────
  const filteredGroups = useMemo(() => {
    return groups.filter((g) => {
      const q = search.toLowerCase();
      const matchSearch = !q
        || g.name.toLowerCase().includes(q)
        || (g.location || '').toLowerCase().includes(q)
        || (g.host || '').includes(q)
        || (g.geoCity || '').toLowerCase().includes(q);
      const matchStatus = statusFilter === 'all' || g.status === statusFilter
        || (statusFilter === 'offline' && g.status !== 'online');
      const hasPin = !!(g.latitude && g.longitude);
      const matchPin = pinFilter === 'all'
        || (pinFilter === 'mapped' && hasPin)
        || (pinFilter === 'unmapped' && !hasPin);
      return matchSearch && matchStatus && matchPin;
    });
  }, [groups, search, statusFilter, pinFilter]);

  const groupsOnMap   = useMemo(() => filteredGroups.filter((g) => g.latitude && g.longitude), [filteredGroups]);
  const totalOnline   = groups.filter((g) => g.status === 'online').length;
  const totalCams     = groups.reduce((s, g) => s + (g.cameras?.length || 0), 0);
  const onlineCams    = groups.reduce((s, g) => s + (g.cameras?.filter((c) => c.status === 'online').length || 0), 0);
  const mappedCount   = groups.filter((g) => g.latitude && g.longitude).length;

  const filteredCameras = useMemo(() => {
    if (!selectedGroup?.cameras) return [];
    const q = camSearch.toLowerCase();
    return selectedGroup.cameras.filter((c) =>
      !q || c.name.toLowerCase().includes(q),
    );
  }, [selectedGroup, camSearch]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const selectGroup = useCallback((group) => {
    setSelectedGroup(group);
    setPanelOpen(true);
    setSelectedCamera(null);
    setSettingPin(false);
    setCamSearch('');
  }, []);

  const openStream = (camera) => {
    setSelectedCamera(camera);
  };

  const closeStream = () => { setSelectedCamera(null); };
  const closePanel  = () => {
    setPanelOpen(false); setSelectedCamera(null); setSettingPin(false);
  };

  const handleMapClick = async (latlng) => {
    if (!settingPin || !selectedGroup || pinSaving) return;
    try {
      setPinSaving(true);
      await cameraGroupService.updateGroup(selectedGroup.id, {
        latitude: latlng.lat, longitude: latlng.lng,
      });
      const updated = { ...selectedGroup, latitude: latlng.lat, longitude: latlng.lng };
      setGroups((prev) => prev.map((g) => (g.id === selectedGroup.id ? { ...g, ...updated } : g)));
      setSelectedGroup(updated);
      setSettingPin(false);
      qc.invalidateQueries({ queryKey: ['groups'] });
    } catch { /* silently fail */ }
    finally { setPinSaving(false); }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div
      className="flex flex-col bg-neutral-50"
      style={{ height: 'calc(100vh - 64px)', overflow: 'hidden' }}
    >
      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 px-4 sm:px-5 py-3 bg-white border-b border-neutral-200 shrink-0 shadow-sm z-10">
        {/* Title */}
        <div className="flex items-center gap-2.5">
          <div className="w-1.5 h-6 bg-[#F7983A] rounded-full" />
          <h1 className="text-base font-bold text-neutral-900">Camera Map</h1>
        </div>

        {/* Stats */}
        <div className="hidden md:flex items-center gap-3 ml-2">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-neutral-600 bg-neutral-100 border border-neutral-200 px-2.5 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
            {totalOnline}/{groups.length} Sites
          </span>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-neutral-600 bg-neutral-100 border border-neutral-200 px-2.5 py-1 rounded-full">
            <Camera className="w-3 h-3 text-neutral-500" />
            {onlineCams}/{totalCams} Live
          </span>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-neutral-600 bg-neutral-100 border border-neutral-200 px-2.5 py-1 rounded-full">
            <MapPin className="w-3 h-3 text-orange-400" />
            {mappedCount}/{groups.length} Mapped
          </span>
        </div>

        {/* Geolocation progress */}
        {geoProgress > 0 && geoProgress < 100 && (
          <span className="text-[11px] text-orange-500 bg-orange-50 border border-orange-200 px-2.5 py-1 rounded-full flex items-center gap-1.5">
            <LocateFixed className="w-3 h-3 animate-pulse" />
            Auto-locating {geoProgress}%
          </span>
        )}

        <div className="flex-1" />

        {/* Search */}
        <div className="relative w-40 sm:w-52">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search sites, IPs…"
            className="w-full bg-neutral-50 border border-neutral-300 rounded-lg pl-8 pr-3 py-1.5 text-xs text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:border-orange-400 transition-colors"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-neutral-50 border border-neutral-300 rounded-lg px-2.5 py-1.5 text-xs text-neutral-700 focus:outline-none focus:border-orange-400 cursor-pointer"
        >
          <option value="all">All Status</option>
          <option value="online">Online</option>
          <option value="offline">Offline</option>
        </select>

        {/* Pin filter */}
        <select
          value={pinFilter}
          onChange={(e) => setPinFilter(e.target.value)}
          className="hidden sm:block bg-neutral-50 border border-neutral-300 rounded-lg px-2.5 py-1.5 text-xs text-neutral-700 focus:outline-none focus:border-orange-400 cursor-pointer"
        >
          <option value="all">All Pins</option>
          <option value="mapped">Mapped</option>
          <option value="unmapped">Unmapped</option>
        </select>

        {/* Refresh */}
        <button
          onClick={loadGroups}
          className="p-1.5 rounded-lg border border-neutral-200 bg-white text-neutral-500 hover:border-orange-300 hover:text-orange-500 transition-colors"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        {/* Sidebar toggle */}
        <button
          onClick={() => setSidebarOpen((v) => !v)}
          className="p-1.5 rounded-lg border border-neutral-200 bg-white text-neutral-500 hover:border-orange-300 hover:text-orange-500 transition-colors"
          title={sidebarOpen ? 'Hide list' : 'Show list'}
        >
          {sidebarOpen
            ? <ChevronLeft className="w-4 h-4" />
            : <ChevronRight className="w-4 h-4" />}
        </button>
      </div>

      {/* ── Body ─────────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden relative">

        {/* ── LEFT SIDEBAR — site list ─────────────────────────────────────────── */}
        <div
          className="shrink-0 bg-white border-r border-neutral-200 overflow-y-auto transition-all duration-300 overflow-x-hidden"
          style={{ width: sidebarOpen ? '272px' : '0px' }}
        >
          <div className="p-3" style={{ width: '272px' }}>
            {loading ? (
              <div className="space-y-2.5 pt-1">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-19 bg-neutral-100 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : error ? (
              <div className="flex flex-col items-center gap-3 py-14 text-center">
                <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-red-400" />
                </div>
                <p className="text-sm text-neutral-600">{error}</p>
                <button
                  onClick={loadGroups}
                  className="text-xs text-orange-500 hover:text-orange-600 underline"
                >
                  Retry
                </button>
              </div>
            ) : filteredGroups.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-14 text-center">
                <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center">
                  <MapPin className="w-6 h-6 text-orange-300" />
                </div>
                <p className="text-sm text-neutral-500">No sites match filters</p>
                <button
                  onClick={() => { setSearch(''); setStatusFilter('all'); setPinFilter('all'); }}
                  className="text-xs text-orange-500 hover:text-orange-600 underline"
                >
                  Clear filters
                </button>
              </div>
            ) : (
              <>
                <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider px-1 mb-2">
                  {filteredGroups.length} Site{filteredGroups.length !== 1 ? 's' : ''}
                  {filteredGroups.length !== groups.length ? ` of ${groups.length}` : ''}
                </p>
                <div className="space-y-1.5">
                  {filteredGroups.map((group) => {
                    const online   = group.status === 'online';
                    const camCount = group.cameras?.length || 0;
                    const liveCams = group.cameras?.filter((c) => c.status === 'online').length || 0;
                    const isSel    = selectedGroup?.id === group.id;
                    const hasPin   = !!(group.latitude && group.longitude);

                    return (
                      <button
                        key={group.id}
                        onClick={() => selectGroup(group)}
                        className={`w-full text-left p-3 rounded-xl border transition-all ${
                          isSel
                            ? 'bg-orange-50 border-orange-300 shadow-sm'
                            : 'bg-white border-neutral-200 hover:bg-neutral-50 hover:border-neutral-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`w-2 h-2 rounded-full shrink-0 ${
                              online ? 'bg-green-500' : 'bg-red-400'
                            }`} />
                            <span className={`text-sm font-semibold truncate capitalize ${
                              isSel ? 'text-orange-700' : 'text-neutral-800'
                            }`}>{group.name}</span>
                          </div>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 ml-2 font-medium ${
                            online
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-50 text-red-500'
                          }`}>
                            {online ? 'Online' : 'Offline'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-neutral-500">
                          <span className="flex items-center gap-1">
                            <Camera className="w-3 h-3" />
                            {liveCams}/{camCount} live
                          </span>
                          <span className={`flex items-center gap-1 ${hasPin ? 'text-blue-500' : 'text-neutral-400'}`}>
                            <MapPin className="w-3 h-3" />
                            {hasPin ? (group.geoCity || 'Mapped') : 'No pin'}
                          </span>
                        </div>

                        {group.location && (
                          <p className="mt-1 text-[10px] text-neutral-400 truncate">{group.location}</p>
                        )}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── MAP area ─────────────────────────────────────────────────────────── */}
        <div className="flex-1 relative">

          {/* Pin-setting banner */}
          {settingPin && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-1000 flex items-center gap-2 bg-blue-600 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-xl">
              <MapPin className="w-4 h-4 shrink-0" />
              {pinSaving
                ? 'Saving location…'
                : <>Click the map to pin <span className="capitalize underline">{selectedGroup?.name}</span></>
              }
              <button onClick={() => setSettingPin(false)} className="ml-2 opacity-70 hover:opacity-100">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Map tile mode toggle */}
          <div className="absolute top-3 right-3 z-1000 flex rounded-lg overflow-hidden border border-neutral-200 shadow-md bg-white">
            {Object.entries(TILE_MODES).map(([key, { label }]) => (
              <button
                key={key}
                onClick={() => setTileMode(key)}
                className={`flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium transition-colors ${
                  tileMode === key
                    ? 'bg-orange-500 text-white'
                    : 'bg-white text-neutral-600 hover:bg-neutral-50'
                }`}
              >
                <Layers className="w-3 h-3" />
                {label}
              </button>
            ))}
          </div>

          {/* DrishyamVMS branding (replaces Leaflet attribution) */}
          <div className="absolute bottom-2 right-2 z-1000 text-[10px] text-neutral-400 bg-white/80 backdrop-blur px-2 py-0.5 rounded-md select-none pointer-events-none">
            DrishyamVMS · Map data © OpenStreetMap / Esri
          </div>

          <MapContainer
            center={mapCenter}
            zoom={5}
            className="w-full h-full"
            attributionControl={false}
            zoomControl={false}
            style={{ cursor: settingPin ? 'crosshair' : undefined }}
          >
            <TileLayer url={TILE_MODES[tileMode].url} maxZoom={19} />

            <MapController group={selectedGroup} />
            <MapClickHandler enabled={settingPin} onMapClick={handleMapClick} />
            <ClusterLayer
              groups={groupsOnMap}
              selectedGroupId={selectedGroup?.id}
              onSelect={selectGroup}
            />
          </MapContainer>
        </div>

        {/* ── RIGHT DETAIL PANEL ───────────────────────────────────────────────── */}
        <div
          className={`absolute top-0 right-0 h-full bg-white border-l border-neutral-200 z-500 flex flex-col shadow-xl transition-transform duration-300 ${
            panelOpen && selectedGroup ? 'translate-x-0' : 'translate-x-full'
          }`}
          style={{ width: '300px' }}
        >
          {selectedGroup && (
            <>
              {/* Panel header */}
              <div className="px-4 pt-4 pb-3 border-b border-neutral-100 shrink-0">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-2.5 h-2.5 rounded-full shrink-0 mt-0.5 ${
                      selectedGroup.status === 'online'
                        ? 'bg-green-500 shadow-sm shadow-green-400/40'
                        : 'bg-red-400'
                    }`} />
                    <div className="min-w-0">
                      <h2 className="text-sm font-bold text-neutral-900 capitalize truncate">{selectedGroup.name}</h2>
                      <p className="text-[11px] text-neutral-400 truncate">{selectedGroup.host}</p>
                    </div>
                  </div>
                  <button
                    onClick={closePanel}
                    className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Stat pills */}
                <div className="grid grid-cols-3 gap-1.5 mb-3">
                  {[
                    {
                      label: 'Status',
                      value: selectedGroup.status === 'online' ? 'Online' : 'Offline',
                      valueClass: selectedGroup.status === 'online' ? 'text-green-600' : 'text-red-500',
                    },
                    {
                      label: 'Cameras',
                      value: selectedGroup.cameras?.length ?? 0,
                      valueClass: 'text-neutral-800',
                    },
                    {
                      label: 'Live',
                      value: selectedGroup.cameras?.filter((c) => c.status === 'online').length ?? 0,
                      valueClass: 'text-green-600',
                    },
                  ].map((s) => (
                    <div key={s.label} className="bg-neutral-50 border border-neutral-100 rounded-xl p-2 text-center">
                      <p className={`text-sm font-bold ${s.valueClass}`}>{s.value}</p>
                      <p className="text-[10px] text-neutral-400 mt-0.5">{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* Location */}
                <div className="flex items-start gap-2">
                  <MapPin className="w-3.5 h-3.5 text-orange-400 shrink-0 mt-0.5" />
                  <div className="text-xs min-w-0 flex-1">
                    {selectedGroup.location && (
                      <p className="text-neutral-600 truncate">{selectedGroup.location}</p>
                    )}
                    {selectedGroup.geoCity && (
                      <p className="text-neutral-500 text-[11px]">{selectedGroup.geoCity}</p>
                    )}
                    {selectedGroup.latitude ? (
                      <p className="text-neutral-400 text-[10px] mt-0.5 font-mono">
                        {parseFloat(selectedGroup.latitude).toFixed(5)}°N,
                        {parseFloat(selectedGroup.longitude).toFixed(5)}°E
                      </p>
                    ) : (
                      <button
                        onClick={() => setSettingPin(true)}
                        className="text-blue-500 hover:text-blue-600 flex items-center gap-1 text-[11px] mt-0.5 transition-colors"
                      >
                        <Navigation className="w-3 h-3" />
                        Click to set pin on map
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Camera search */}
              <div className="px-3 py-2 border-b border-neutral-100 shrink-0">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-neutral-400" />
                  <input
                    type="text"
                    value={camSearch}
                    onChange={(e) => setCamSearch(e.target.value)}
                    placeholder="Search cameras…"
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-lg pl-7 pr-3 py-1.5 text-xs text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:border-orange-400"
                  />
                  {camSearch && (
                    <button onClick={() => setCamSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400">
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <p className="text-[10px] text-neutral-400 mt-1 px-0.5">
                  {filteredCameras.length} of {selectedGroup.cameras?.length ?? 0} cameras
                  {filteredCameras.length > 20 ? ' — scroll to see all' : ''}
                </p>
              </div>

              {/* Camera list — virtual-scroll friendly */}
              <div className="flex-1 overflow-y-auto">
                {filteredCameras.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-10 text-center">
                    <Camera className="w-7 h-7 text-neutral-300" />
                    <p className="text-sm text-neutral-400">
                      {camSearch ? 'No cameras match' : 'No cameras'}
                    </p>
                  </div>
                ) : (
                  <div className="p-2 space-y-1">
                    {filteredCameras.map((cam) => {
                      const active  = selectedCamera?.id === cam.id;
                      const live    = cam.status === 'online';
                      return (
                        <button
                          key={cam.id}
                          onClick={() => openStream(cam)}
                          className={`w-full text-left px-3 py-2.5 rounded-xl border transition-all ${
                            active
                              ? 'bg-orange-50 border-orange-300'
                              : 'bg-white border-neutral-200 hover:bg-neutral-50 hover:border-neutral-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 min-w-0">
                              {live
                                ? <Wifi    className="w-3.5 h-3.5 text-green-500 shrink-0" />
                                : <WifiOff className="w-3.5 h-3.5 text-neutral-300 shrink-0" />
                              }
                              <span className={`text-xs truncate ${active ? 'text-orange-700 font-medium' : 'text-neutral-700'}`}>
                                {cam.name}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0 ml-2">
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                                live ? 'bg-green-100 text-green-600' : 'bg-neutral-100 text-neutral-400'
                              }`}>
                                {live ? 'Live' : 'Off'}
                              </span>
                              <Video className={`w-3.5 h-3.5 ${active ? 'text-orange-500' : 'text-neutral-400'}`} />
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── LIVE STREAM MODAL ─────────────────────────────────────────────────── */}
      {selectedCamera && (
        <div
          className="fixed inset-0 z-2000 bg-black/80 flex items-center justify-center p-3 sm:p-5"
          onClick={closeStream}
        >
          <div
            className="w-full max-w-5xl bg-white rounded-2xl overflow-hidden shadow-2xl border border-neutral-200 flex flex-col"
            style={{ maxHeight: 'calc(100vh - 2rem)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header — fixed height */}
            <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-neutral-100">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 bg-orange-100 rounded-xl flex items-center justify-center shrink-0">
                  <Video className="w-4 h-4 text-orange-500" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-neutral-900 truncate">{selectedCamera.name}</h3>
                  <p className="text-[11px] text-neutral-500 capitalize truncate">
                    {selectedGroup?.name} &middot; Live Stream
                  </p>
                </div>
                <span className="shrink-0 flex items-center gap-1 bg-red-50 border border-red-200 text-red-500 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  LIVE
                </span>
              </div>
              <button
                onClick={closeStream}
                className="shrink-0 ml-3 p-2 rounded-xl text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Video — fills all remaining space, maintains 16:9 via aspect-video + object-contain inside player */}
            <div className="flex-1 min-h-0 bg-neutral-950">
              <DirectStreamPlayer
                monitorId={selectedCamera.monitorId}
                muted={false}
                className="w-full h-full"
              />
            </div>

            {/* Modal footer — fixed height */}
            <div className="shrink-0 px-4 py-2.5 border-t border-neutral-100 flex items-center justify-between bg-neutral-50">
              <div className="flex items-center gap-2 text-xs text-neutral-500 min-w-0">
                <MapPin className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                <span className="capitalize truncate">{selectedGroup?.name}</span>
                <span className="text-neutral-300 shrink-0">/</span>
                <span className="truncate">{selectedCamera.name}</span>
              </div>
              <button
                onClick={closeStream}
                className="shrink-0 ml-3 text-xs font-medium text-neutral-500 hover:text-neutral-800 px-3 py-1.5 rounded-lg hover:bg-neutral-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
