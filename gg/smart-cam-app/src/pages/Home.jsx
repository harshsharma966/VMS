import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Video, Images, BarChart3, MapPin, Clock, Camera,
  WifiOff, RefreshCw, Activity, ChevronRight,
  Play, AlertTriangle, CheckCircle2, Cctv, HardDrive,
  TrendingUp, Circle,
} from 'lucide-react';
import { cameraGroupService } from '@/services/cameraGroup';
import { useAuthStore } from '@/store/authStore';
import { useGroups } from '@/hooks/useQueries';
import { useQueryClient } from '@tanstack/react-query';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function dateStr(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

function dayLabel(daysAgo) {
  if (daysAgo === 0) return 'Today';
  if (daysAgo === 1) return 'Yesterday';
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toLocaleDateString('en-US', { weekday: 'short' });
}

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

// ─── Mini Bar Chart (7-day recording trend) ───────────────────────────────────
function TrendBar({ days }) {
  const max = Math.max(...days.map(d => d.count), 1);
  return (
    <div className="flex items-end gap-1 h-14">
      {days.map((d, i) => {
        const pct = Math.round((d.count / max) * 100);
        const isToday = i === days.length - 1;
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
            {/* Tooltip */}
            <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:block z-10">
              <div className="bg-neutral-900 text-white text-xs rounded-lg px-2 py-1 whitespace-nowrap font-medium shadow-lg">
                {d.label}: {d.count} rec
              </div>
            </div>
            {/* Bar */}
            <div className="w-full flex-1 flex items-end">
              <div
                className={`w-full rounded-t-sm transition-all duration-500 ${
                  d.count === 0
                    ? 'bg-neutral-100'
                    : isToday
                      ? 'bg-[#F7983A]'
                      : 'bg-[#F7983A]/40'
                }`}
                style={{ height: `${Math.max(pct, d.count > 0 ? 8 : 4)}%` }}
              />
            </div>
            {/* Day label */}
            <span className={`text-xs font-medium ${isToday ? 'text-[#F7983A]' : 'text-neutral-400'}`}>
              {d.label === 'Today' ? 'T' : d.label === 'Yesterday' ? 'Y' : d.label.slice(0, 2)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Storage Donut ────────────────────────────────────────────────────────────
function StorageRing({ usedBytes, totalBytes }) {
  const pct   = totalBytes > 0 ? Math.min((usedBytes / totalBytes) * 100, 100) : 0;
  const r     = 28;
  const circ  = 2 * Math.PI * r;
  const dash  = (pct / 100) * circ;
  const color = pct > 85 ? '#EF4444' : pct > 65 ? '#F59E0B' : '#10B981';

  return (
    <div className="flex items-center gap-4">
      <div className="relative w-16 h-16 shrink-0">
        <svg className="w-16 h-16 -rotate-90" viewBox="0 0 72 72">
          <circle cx="36" cy="36" r={r} fill="none" stroke="#F3F4F6" strokeWidth="8" />
          <circle cx="36" cy="36" r={r} fill="none" stroke={color} strokeWidth="8"
            strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 1s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-bold text-neutral-700">{Math.round(pct)}%</span>
        </div>
      </div>
      <div>
        <p className="text-sm font-bold text-neutral-900">{formatBytes(usedBytes)}</p>
        <p className="text-xs text-neutral-400 mt-0.5">of {formatBytes(totalBytes)} used</p>
        <div className="flex items-center gap-1 mt-1">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
          <span className="text-xs font-medium" style={{ color }}>
            {pct > 85 ? 'Critical' : pct > 65 ? 'Warning' : 'Healthy'}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Uptime Heatmap Row (7-day per-camera) ────────────────────────────────────
// Each cell = one day; green=online, red=offline, grey=unknown
function UptimeRow({ camera, days7 }) {
  // We only know current status; shade today by it, others unknown
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ backgroundColor: camera.status === 'online' ? '#10B981' : '#EF4444' }} />
      <span className="text-xs text-neutral-700 truncate flex-1 min-w-0">{camera.name}</span>
      <div className="flex gap-0.5 shrink-0">
        {days7.map((_, i) => {
          const isToday = i === 6;
          return (
            <div
              key={i}
              title={isToday ? `Today · ${camera.status}` : 'Historical data unavailable'}
              className="w-3 h-3 rounded-sm"
              style={{
                backgroundColor: isToday
                  ? camera.status === 'online' ? '#10B981' : '#EF4444'
                  : '#E5E7EB',
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const qc = useQueryClient();

  const [now, setNow] = useState(new Date());
  const { data: groups = [], isLoading: loading } = useGroups({ refetchInterval: 30_000 });

  // 7-day recording counts — one entry per day per group, aggregated
  const [trendData, setTrendData]       = useState(Array.from({ length: 7 }, (_, i) => ({ label: dayLabel(6 - i), count: 0 })));
  const [trendLoading, setTrendLoading] = useState(false);

  // Storage — derived from recording sizes if available
  const [storageUsed,  setStorageUsed]  = useState(0);   // bytes
  const [storageTotal, setStorageTotal] = useState(0);   // bytes (or 0 if unknown)

  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { const id = setInterval(() => setNow(new Date()), 60_000); return () => clearInterval(id); }, []);

  // Load 7-day trend
  const loadTrend = useCallback(async (list) => {
    if (!list.length) return;
    setTrendLoading(true);
    try {
      const days = Array.from({ length: 7 }, (_, i) => 6 - i); // 6..0 (oldest→today)
      const allResults = await Promise.allSettled(
        list.flatMap(g =>
          days.map(ago =>
            cameraGroupService.getGroupRecordings(g.id, { date: dateStr(ago) })
              .then(res => {
                const recs = res?.data || [];
                return { ago, count: recs.length, size: recs.reduce((s, r) => s + (r.size || 0), 0) };
              })
              .catch(() => ({ ago, count: 0, size: 0 }))
          )
        )
      );
      // Aggregate by day index
      const byDay = Array(7).fill(0).map(() => ({ count: 0, size: 0 }));
      allResults.forEach(r => {
        if (r.status === 'fulfilled') {
          const idx = 6 - r.value.ago; // oldest=0, today=6
          byDay[idx].count += r.value.count;
          byDay[idx].size  += r.value.size;
        }
      });
      setTrendData(Array.from({ length: 7 }, (_, i) => ({
        label: dayLabel(6 - i),
        count: byDay[i].count,
      })));
      const totalSize = byDay.reduce((s, d) => s + d.size, 0);
      if (totalSize > 0) {
        setStorageUsed(totalSize);
        setStorageTotal(totalSize * 5); // rough estimate: 5× headroom
      }
    } catch { /* non-fatal */ }
    finally { setTrendLoading(false); }
  }, []);

  useEffect(() => { if (groups.length) loadTrend(groups); }, [groups, loadTrend]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await qc.invalidateQueries({ queryKey: ['groups'] });
    setRefreshing(false);
  };

  // ── Derived stats ──
  const allCams       = groups.flatMap(g => g.cameras || []);
  const totalCameras  = allCams.length;
  const onlineCameras = allCams.filter(c => c.status === 'online').length;
  const offlineCameras = totalCameras - onlineCameras;
  const onlineGroups  = groups.filter(g => g.status === 'online').length;
  const totalRec      = trendData[6]?.count ?? 0; // today

  // Offline cameras grouped by site
  const offlineBySite = groups
    .map(g => ({ group: g, cams: (g.cameras || []).filter(c => c.status !== 'online') }))
    .filter(s => s.cams.length > 0);

  const alertCount = offlineCameras;

  // Greeting
  const hour   = now.getHours();
  const greet  = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
  const name   = user?.name ? `, ${user.name.split(' ')[0]}` : '';
  const dLabel = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const tLabel = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  const days7 = Array.from({ length: 7 });

  return (
    <div className="min-h-screen bg-neutral-50">

      {/* ── Header ── */}
      <div className="bg-white border-b border-neutral-200 px-4 sm:px-6 lg:px-8 py-5">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            {/* Caption */}
            <p className="text-xs font-semibold text-[#F7983A] uppercase tracking-widest mb-1">
              {dLabel} · {tLabel}
            </p>
            {/* Headline */}
            <h1 className="text-2xl sm:text-3xl font-black text-neutral-900 tracking-tight leading-tight">
              {greet}{name}
            </h1>
            {/* Subline */}
            <p className="text-sm text-neutral-400 font-normal mt-1">
              Your surveillance network at a glance
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#F7983A] hover:bg-[#E8882A] text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 shadow-sm self-start sm:self-auto"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Alert banner — only when cameras offline ── */}
      {!loading && alertCount > 0 && (
        <div className="bg-red-50 border-b border-red-200 px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
            <p className="text-sm font-semibold text-red-800">
              {alertCount} camera{alertCount !== 1 ? 's' : ''} offline —
              <button
                onClick={() => document.getElementById('needs-attention')?.scrollIntoView({ behavior: 'smooth' })}
                className="underline ml-1 hover:text-red-600"
              >
                view details below
              </button>
            </p>
          </div>
        </div>
      )}

      <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* ── 4 Stat chips ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            {
              label: 'Devices',
              value: loading ? null : groups.length,
              sub: `${onlineGroups} online`,
              icon: Cctv,
              iconBg: 'bg-blue-50', iconColor: 'text-blue-500',
            },
            {
              label: 'Total Cameras',
              value: loading ? null : totalCameras,
              sub: `${onlineCameras} streaming`,
              icon: Camera,
              iconBg: 'bg-orange-50', iconColor: 'text-[#F7983A]',
            },
            {
              label: 'Offline',
              value: loading ? null : offlineCameras,
              sub: offlineCameras > 0 ? 'Need attention' : 'All clear',
              icon: offlineCameras > 0 ? WifiOff : CheckCircle2,
              iconBg: offlineCameras > 0 ? 'bg-red-50' : 'bg-green-50',
              iconColor: offlineCameras > 0 ? 'text-red-500' : 'text-green-500',
              valueColor: offlineCameras > 0 ? 'text-red-600' : 'text-neutral-900',
            },
            {
              label: "Today's Recordings",
              value: trendLoading && !trendData[6]?.count ? null : totalRec,
              sub: 'Clips saved today',
              icon: BarChart3,
              iconBg: 'bg-purple-50', iconColor: 'text-purple-500',
            },
          ].map((c) => (
            <div key={c.label} className="bg-white rounded-2xl border border-neutral-200 p-4 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${c.iconBg}`}>
                  <c.icon className={`w-4 h-4 ${c.iconColor}`} />
                </div>
                {/* Label */}
                <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider leading-tight">{c.label}</p>
              </div>
              {c.value === null ? (
                <div className="h-8 w-12 bg-neutral-100 rounded-lg animate-pulse" />
              ) : (
                <p className={`text-3xl font-black tracking-tight leading-none ${c.valueColor || 'text-neutral-900'}`}>
                  {c.value}
                </p>
              )}
              <p className="text-xs font-medium text-neutral-400 mt-1">{c.sub}</p>
            </div>
          ))}
        </div>

        {/* ── Main grid ── */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* ── LEFT column ── */}
          <div className="xl:col-span-2 space-y-6">

            {/* Recording trend (7 days) */}
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-purple-500" />
                  </div>
                  <div>
                    {/* Section headline */}
                    <h3 className="text-sm font-bold text-neutral-900">Recording Activity</h3>
                    {/* Section subline */}
                    <p className="text-xs text-neutral-400 mt-0.5">Last 7 days · all devices</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#F7983A]" />
                  <span className="text-xs text-neutral-400 font-medium">Today</span>
                  <span className="w-2 h-2 rounded-full bg-[#F7983A]/40 ml-2" />
                  <span className="text-xs text-neutral-400 font-medium">Previous</span>
                </div>
              </div>
              <div className="px-5 py-4">
                {trendLoading ? (
                  <div className="h-14 bg-neutral-50 rounded-xl animate-pulse" />
                ) : (
                  <TrendBar days={trendData} />
                )}
                {/* Total count summary */}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-neutral-100">
                  <span className="text-xs text-neutral-400">
                    {trendData.reduce((s, d) => s + d.count, 0)} total recordings this week
                  </span>
                  <button
                    onClick={() => navigate('/timeline')}
                    className="text-xs font-semibold text-[#F7983A] hover:underline flex items-center gap-1"
                  >
                    View Timeline <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Needs Attention — offline cameras */}
            {!loading && offlineBySite.length > 0 && (
              <div id="needs-attention" className="bg-white rounded-2xl border border-red-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-red-100 flex items-center justify-between bg-red-50/50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center border border-red-100">
                      <WifiOff className="w-4 h-4 text-red-500" />
                    </div>
                    <div>
                      {/* Alert headline */}
                      <h3 className="text-sm font-bold text-red-900">Needs Attention</h3>
                      {/* Alert subline */}
                      <p className="text-xs text-red-500 mt-0.5">
                        {offlineCameras} camera{offlineCameras !== 1 ? 's' : ''} currently offline
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate('/devices')}
                    className="text-xs font-semibold text-red-600 hover:underline flex items-center gap-1"
                  >
                    Manage <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="divide-y divide-neutral-100">
                  {offlineBySite.map(({ group, cams }) => (
                    <div key={group.id} className="px-5 py-3">
                      {/* Site name */}
                      <div className="flex items-center gap-2 mb-2">
                        <Cctv className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                        <p className="text-xs font-bold text-neutral-700 uppercase tracking-wider">{group.name}</p>
                        <span className="text-xs text-neutral-400">· {group.host}</span>
                      </div>
                      {/* Offline cameras */}
                      <div className="space-y-1.5 ml-5">
                        {cams.map(cam => (
                          <div key={cam.id} className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                            {/* Camera name */}
                            <span className="text-sm text-neutral-800 font-medium truncate">{cam.name}</span>
                            {/* Channel badge */}
                            <span className="text-xs text-neutral-400 shrink-0">Ch {cam.channel}</span>
                            <span className="ml-auto text-xs font-medium text-red-500 shrink-0">Offline</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* All clear state */}
            {!loading && offlineBySite.length === 0 && groups.length > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-2xl px-5 py-4 flex items-center gap-3">
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center border border-green-200 shrink-0">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                </div>
                <div>
                  {/* Status headline */}
                  <p className="text-sm font-bold text-green-900">All cameras are online</p>
                  {/* Status subline */}
                  <p className="text-xs text-green-600 mt-0.5">System is fully operational — no issues detected</p>
                </div>
              </div>
            )}

            {/* Site cards */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-1 h-7 bg-[#F7983A] rounded-full" />
                  <div>
                    {/* Section headline */}
                    <h2 className="text-base font-bold text-neutral-900">Camera Sites</h2>
                    {/* Section subline */}
                    <p className="text-xs text-neutral-400 mt-0.5">
                      {loading ? 'Loading…' : `${groups.length} sites · ${onlineGroups} active`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => navigate('/devices')}
                  className="flex items-center gap-1.5 px-3 py-2 border border-[#F7983A] text-[#F7983A] hover:bg-[#F7983A] hover:text-white text-xs font-semibold rounded-xl transition-colors"
                >
                  Manage Sites <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="bg-neutral-100 rounded-2xl h-44 animate-pulse" />
                  ))}
                </div>
              ) : groups.length === 0 ? (
                <div className="bg-white rounded-2xl border border-neutral-200 text-center py-16 px-8">
                  <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Cctv className="w-8 h-8 text-[#F7983A]/50" />
                  </div>
                  {/* Empty state headline */}
                  <h3 className="text-base font-bold text-neutral-900 mb-1">No Sites Configured</h3>
                  {/* Empty state paragraph */}
                  <p className="text-sm text-neutral-400 max-w-xs mx-auto mb-5 leading-relaxed">
                    Connect your first NVR, DVR, or IP camera to start monitoring.
                  </p>
                  <button
                    onClick={() => navigate('/devices')}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#F7983A] hover:bg-[#E8882A] text-white text-sm font-semibold rounded-xl transition-colors"
                  >
                    <Cctv className="w-4 h-4" />
                    Add First Site
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {groups.map(group => {
                    const cams    = group.cameras || [];
                    const online  = cams.filter(c => c.status === 'online').length;
                    const offline = cams.length - online;
                    const isOn    = group.status === 'online';
                    const pct     = cams.length > 0 ? Math.round((online / cams.length) * 100) : 0;
                    const todayRec = trendData[6]?.count ?? 0;

                    return (
                      <div key={group.id}
                        className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden hover:shadow-md hover:border-[#F7983A]/30 transition-all">
                        {/* Status accent bar */}
                        <div className={`h-1 ${isOn ? 'bg-emerald-400' : 'bg-red-400'}`} />

                        <div className="p-4 space-y-3">
                          {/* Card header */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              {/* Card headline */}
                              <h4 className="text-sm font-bold text-neutral-900 truncate">{group.name}</h4>
                              {/* Card subline */}
                              <p className="text-xs text-neutral-400 font-mono mt-0.5 truncate">{group.host}</p>
                            </div>
                            <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                              isOn ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${isOn ? 'bg-emerald-500 animate-pulse' : 'bg-red-400'}`} />
                              {isOn ? 'Online' : 'Offline'}
                            </span>
                          </div>

                          {/* Camera progress */}
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-xs font-semibold text-neutral-500">Cameras</span>
                              <span className="text-sm font-bold text-neutral-900">
                                {online}<span className="text-neutral-300 text-xs font-normal">/{cams.length}</span>
                                {offline > 0 && (
                                  <span className="text-xs text-red-400 font-medium ml-1">· {offline} down</span>
                                )}
                              </span>
                            </div>
                            <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-700 ${
                                  pct === 100 ? 'bg-emerald-500' : pct > 50 ? 'bg-[#F7983A]' : 'bg-red-400'
                                }`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>

                          {/* Recordings today */}
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-neutral-500">Recordings today</span>
                            {trendLoading
                              ? <div className="h-3 w-5 bg-neutral-100 rounded animate-pulse" />
                              : <span className="font-bold text-neutral-900">{todayRec}</span>
                            }
                          </div>

                          {/* Uptime cells — last 7 days */}
                          <div>
                            <p className="text-xs font-semibold text-neutral-400 mb-1.5">7-day uptime</p>
                            <div className="space-y-1.5 max-h-24 overflow-y-auto pr-0.5">
                              {cams.slice(0, 5).map(cam => (
                                <UptimeRow key={cam.id} camera={cam} days7={days7} />
                              ))}
                              {cams.length > 5 && (
                                <p className="text-xs text-neutral-400 pl-4">+{cams.length - 5} more cameras</p>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Footer actions */}
                        <div className="flex border-t border-neutral-100">
                          {[
                            { icon: Play,     label: 'Live',      to: '/live' },
                            { icon: BarChart3, label: 'Timeline', to: '/timeline' },
                            { icon: Images,   label: 'Gallery',   to: '/gallery' },
                          ].map(({ icon: Icon, label, to }, i) => (
                            <button
                              key={to}
                              onClick={() => navigate(to)}
                              className={`flex-1 flex items-center justify-center gap-1 py-2.5 text-xs font-semibold text-neutral-400 hover:text-[#F7983A] hover:bg-orange-50/50 transition-colors ${
                                i < 2 ? 'border-r border-neutral-100' : ''
                              }`}
                            >
                              <Icon className="w-3 h-3" />
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ── RIGHT column ── */}
          <div className="space-y-5">

            {/* Storage usage */}
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-neutral-100 flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                  <HardDrive className="w-4 h-4 text-blue-500" />
                </div>
                <div>
                  {/* Widget headline */}
                  <h3 className="text-sm font-bold text-neutral-900">Storage</h3>
                  {/* Widget subline */}
                  <p className="text-xs text-neutral-400 mt-0.5">Recording storage usage</p>
                </div>
              </div>
              <div className="p-5">
                {trendLoading ? (
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-neutral-100 rounded-full animate-pulse shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-neutral-100 rounded animate-pulse w-24" />
                      <div className="h-3 bg-neutral-100 rounded animate-pulse w-16" />
                      <div className="h-3 bg-neutral-100 rounded animate-pulse w-12" />
                    </div>
                  </div>
                ) : storageUsed > 0 ? (
                  <StorageRing usedBytes={storageUsed} totalBytes={storageTotal} />
                ) : (
                  <div className="text-center py-4">
                    <HardDrive className="w-8 h-8 text-neutral-200 mx-auto mb-2" />
                    {/* Para */}
                    <p className="text-sm font-medium text-neutral-500">No size data available</p>
                    <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                      Storage tracking requires recordings with size metadata from S3.
                    </p>
                  </div>
                )}
                <div className="mt-4 pt-4 border-t border-neutral-100 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-neutral-500">Recordings (7 days)</span>
                    <span className="font-bold text-neutral-900">
                      {trendLoading ? '…' : trendData.reduce((s, d) => s + d.count, 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-neutral-500">Today's clips</span>
                    <span className="font-bold text-neutral-900">
                      {trendLoading ? '…' : trendData[6]?.count ?? 0}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Live / active feeds summary */}
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
                    <Activity className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div>
                    {/* Widget headline */}
                    <h3 className="text-sm font-bold text-neutral-900">Network Status</h3>
                    {/* Widget subline */}
                    <p className="text-xs text-neutral-400 mt-0.5">Live system overview</p>
                  </div>
                </div>
                {onlineCameras > 0 && (
                  <div className="flex items-center gap-1.5 bg-red-50 px-2.5 py-1 rounded-full">
                    <Circle className="w-2 h-2 fill-red-500 text-red-500 animate-pulse" />
                    <span className="text-xs font-bold text-red-500 tracking-wider">REC</span>
                  </div>
                )}
              </div>
              <div className="p-5 space-y-3">
                {loading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => <div key={i} className="h-10 bg-neutral-100 rounded-xl animate-pulse" />)}
                  </div>
                ) : (
                  <>
                    {[
                      {
                        label: 'Sites active',
                        value: `${onlineGroups} / ${groups.length}`,
                        pct: groups.length > 0 ? (onlineGroups / groups.length) * 100 : 0,
                        color: 'bg-blue-500',
                      },
                      {
                        label: 'Cameras streaming',
                        value: `${onlineCameras} / ${totalCameras}`,
                        pct: totalCameras > 0 ? (onlineCameras / totalCameras) * 100 : 0,
                        color: 'bg-emerald-500',
                      },
                      {
                        label: 'Channels offline',
                        value: `${offlineCameras} / ${totalCameras}`,
                        pct: totalCameras > 0 ? (offlineCameras / totalCameras) * 100 : 0,
                        color: offlineCameras > 0 ? 'bg-red-400' : 'bg-neutral-200',
                      },
                    ].map(row => (
                      <div key={row.label}>
                        <div className="flex items-center justify-between mb-1">
                          {/* Metric label */}
                          <span className="text-xs font-semibold text-neutral-600">{row.label}</span>
                          {/* Metric value */}
                          <span className="text-xs font-bold text-neutral-900">{row.value}</span>
                        </div>
                        <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${row.color}`}
                            style={{ width: `${row.pct}%` }}
                          />
                        </div>
                      </div>
                    ))}

                    {/* Overall score */}
                    <div className="pt-2 mt-1 border-t border-neutral-100 flex items-center justify-between">
                      <span className="text-xs font-semibold text-neutral-500">Overall health</span>
                      {(() => {
                        const score = totalCameras > 0
                          ? Math.round((onlineCameras / totalCameras) * 100) : 0;
                        const color = score >= 80 ? 'text-emerald-600' : score >= 50 ? 'text-amber-500' : 'text-red-500';
                        return (
                          <span className={`text-sm font-black ${color}`}>{score}%</span>
                        );
                      })()}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Quick access */}
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-neutral-100">
                {/* Widget headline */}
                <h3 className="text-sm font-bold text-neutral-900">Quick Access</h3>
                {/* Widget subline */}
                <p className="text-xs text-neutral-400 mt-0.5">Jump to key sections</p>
              </div>
              <div className="p-2 space-y-0.5">
                {[
                  { icon: Video,    label: 'Live View',   desc: 'Real-time feeds',     to: '/live',     color: '#10B981' },
                  { icon: Clock,    label: 'Timeline',    desc: 'Review recordings',   to: '/timeline', color: '#3B82F6' },
                  { icon: Images,   label: 'Gallery',     desc: 'Recording library',   to: '/gallery',  color: '#8B5CF6' },
                  { icon: MapPin,   label: 'Map View',    desc: 'Site locations',      to: '/map',      color: '#EC4899' },
                  { icon: Cctv,     label: 'Devices',     desc: 'Manage NVR/DVR',      to: '/devices',  color: '#F7983A' },
                ].map(a => (
                  <button
                    key={a.label}
                    onClick={() => navigate(a.to)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-orange-50/50 transition-colors group text-left"
                  >
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${a.color}15` }}>
                      <a.icon className="w-4 h-4" style={{ color: a.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      {/* Nav item label */}
                      <p className="text-sm font-semibold text-neutral-900 group-hover:text-[#F7983A] transition-colors leading-tight">
                        {a.label}
                      </p>
                      {/* Nav item desc */}
                      <p className="text-xs text-neutral-400">{a.desc}</p>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-neutral-300 group-hover:text-[#F7983A] transition-colors shrink-0" />
                  </button>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
