import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Camera, Wifi, WifiOff,
  Server, Video, ChevronRight, AlertTriangle,
  CheckCircle2, MapPin, Clock, Film,
} from 'lucide-react';
import { useGroups } from '@/hooks/useQueries';

export default function Dashboard() {
  const navigate = useNavigate();

  const { data: groups = [], isLoading: loading } = useGroups({
    refetchInterval: 30_000,
  });

  const stats = useMemo(() => {
    const allCams = groups.flatMap((g) => g.cameras || []);
    const onlineGroups = groups.filter((g) => g.status === 'online').length;
    const onlineCams = allCams.filter((c) => c.status === 'online').length;
    const health = groups.length > 0
      ? Math.round(((onlineGroups / groups.length) + (onlineCams / Math.max(allCams.length, 1))) / 2 * 100)
      : 0;

    return {
      totalSites: groups.length,
      onlineSites: onlineGroups,
      offlineSites: groups.length - onlineGroups,
      totalCameras: allCams.length,
      onlineCameras: onlineCams,
      offlineCameras: allCams.length - onlineCams,
      health,
    };
  }, [groups]);

  const healthColor = stats.health >= 80 ? '#10B981' : stats.health >= 50 ? '#F59E0B' : '#EF4444';
  const HealthIcon = stats.health >= 80 ? CheckCircle2 : stats.health >= 50 ? AlertTriangle : WifiOff;

  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Good Morning' : now.getHours() < 17 ? 'Good Afternoon' : 'Good Evening';
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="min-h-screen bg-neutral-50">

      {/* ═══════════════════════════════════════════════════════════════════════
          HERO BANNER
          ═══════════════════════════════════════════════════════════════════════ */}
      <div className="bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 text-white">
        <div className="px-6 lg:px-10 pt-8 pb-10">
          {/* Greeting */}
          <p className="text-sm font-medium text-neutral-400 tracking-wide uppercase mb-1">
            {dateStr}
          </p>
          <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight mb-2">
            {greeting}
          </h1>
          <p className="text-base text-neutral-400 font-normal max-w-lg">
            Here's what's happening across your surveillance network right now.
          </p>

          {/* Inline health summary */}
          <div className="flex flex-wrap items-center gap-4 mt-6">
            <div className="flex items-center gap-2.5 bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2.5 border border-white/10">
              <HealthIcon className="w-5 h-5" style={{ color: healthColor }} />
              <div>
                <p className="text-white text-sm font-bold leading-tight">
                  {loading ? '...' : `${stats.health}% System Health`}
                </p>
                <p className="text-neutral-400 text-xs font-medium">
                  {stats.onlineSites} of {stats.totalSites} sites online
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2.5 border border-white/10">
              <Camera className="w-5 h-5 text-[#F7983A]" />
              <div>
                <p className="text-white text-sm font-bold leading-tight">
                  {loading ? '...' : `${stats.onlineCameras} Live Cameras`}
                </p>
                <p className="text-neutral-400 text-xs font-medium">
                  {stats.totalCameras} total registered
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ═════════════════════════════════════════════════════════════════════
            STAT CARDS — overlap the banner
            ═════════════════════════════════════════════════════════════════════ */}
        <div className="px-6 lg:px-10 -mb-14 relative z-10">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
            {[
              {
                label: 'TOTAL SITES',
                value: stats.totalSites,
                sub: `${stats.onlineSites} online`,
                icon: Server,
                color: '#3B82F6',
                bgClass: 'bg-blue-50',
              },
              {
                label: 'CAMERAS',
                value: stats.totalCameras,
                sub: `${stats.onlineCameras} streaming`,
                icon: Camera,
                color: '#10B981',
                bgClass: 'bg-emerald-50',
              },
              {
                label: 'LIVE STREAMS',
                value: stats.onlineCameras,
                sub: `${stats.offlineCameras} offline`,
                icon: Wifi,
                color: '#F7983A',
                bgClass: 'bg-orange-50',
              },
              {
                label: 'ALERTS',
                value: stats.offlineSites + stats.offlineCameras,
                sub: (stats.offlineSites + stats.offlineCameras) > 0 ? 'Needs attention' : 'All clear',
                icon: AlertTriangle,
                color: (stats.offlineSites + stats.offlineCameras) > 0 ? '#EF4444' : '#10B981',
                bgClass: (stats.offlineSites + stats.offlineCameras) > 0 ? 'bg-red-50' : 'bg-emerald-50',
              },
            ].map((card) => (
              <div
                key={card.label}
                className="bg-white rounded-2xl shadow-lg shadow-neutral-900/5 border border-neutral-100 p-5 lg:p-6"
              >
                <div className="flex items-center justify-between mb-5">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${card.bgClass}`}>
                    <card.icon className="w-5.5 h-5.5" style={{ color: card.color }} />
                  </div>
                  <span className="text-[10px] font-extrabold tracking-[0.15em] text-neutral-400">
                    {card.label}
                  </span>
                </div>
                {loading ? (
                  <div className="h-10 w-16 bg-neutral-100 rounded-xl animate-pulse mb-1" />
                ) : (
                  <p className="text-4xl font-black text-neutral-900 tracking-tighter leading-none mb-1">
                    {card.value}
                  </p>
                )}
                <p className="text-sm font-medium text-neutral-500">
                  {card.sub}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          MAIN CONTENT
          ═══════════════════════════════════════════════════════════════════════ */}
      <div className="px-6 lg:px-10 pt-20 pb-10 space-y-8">

        {/* ── SECTION TITLE: Overview ────────────────────────────────────────── */}
        <div>
          <h2 className="text-xl font-extrabold text-neutral-900 tracking-tight">
            Network Overview
          </h2>
          <p className="text-sm font-normal text-neutral-500 mt-0.5">
            Monitor all connected sites and their camera status in real time.
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* ── SITES TABLE (2/3) ─────────────────────────────────────────────── */}
          <div className="xl:col-span-2">
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">

              {/* Table header bar */}
              <div className="flex items-center justify-between px-6 lg:px-7 py-5 border-b border-neutral-100">
                <div>
                  <h3 className="text-lg font-extrabold text-neutral-900 tracking-tight">
                    Camera Sites
                  </h3>
                  <p className="text-sm text-neutral-400 font-normal mt-0.5">
                    {loading ? 'Loading sites...' : `${groups.length} registered sites — ${stats.onlineSites} currently active`}
                  </p>
                </div>
                <button
                  onClick={() => navigate('/devices')}
                  className="hidden sm:flex items-center gap-1.5 px-4 py-2 bg-[#F7983A] hover:bg-[#E8882A] text-white text-xs font-bold rounded-lg transition-colors"
                >
                  Manage Sites
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Column headers */}
              <div className="hidden sm:grid grid-cols-12 gap-4 px-6 lg:px-7 py-3 bg-neutral-50/80 border-b border-neutral-100">
                <div className="col-span-5 text-[10px] font-extrabold text-neutral-400 uppercase tracking-[0.15em]">
                  Site Name
                </div>
                <div className="col-span-2 text-[10px] font-extrabold text-neutral-400 uppercase tracking-[0.15em] text-center">
                  Status
                </div>
                <div className="col-span-3 text-[10px] font-extrabold text-neutral-400 uppercase tracking-[0.15em] text-center">
                  Cameras
                </div>
                <div className="col-span-2 text-[10px] font-extrabold text-neutral-400 uppercase tracking-[0.15em] text-right">
                  Action
                </div>
              </div>

              {/* Rows */}
              {loading ? (
                <div className="p-5 space-y-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-16 bg-neutral-50 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : groups.length > 0 ? (
                <div className="divide-y divide-neutral-100">
                  {groups.map((group) => {
                    const cams = group.cameras || [];
                    const online = cams.filter((c) => c.status === 'online').length;
                    const isOnline = group.status === 'online';
                    return (
                      <div
                        key={group.id}
                        onClick={() => navigate('/live')}
                        className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4 items-center px-6 lg:px-7 py-4 hover:bg-neutral-50/60 transition-colors cursor-pointer group"
                      >
                        {/* Name */}
                        <div className="sm:col-span-5 flex items-center gap-3.5 min-w-0">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                            isOnline ? 'bg-emerald-50 border border-emerald-100' : 'bg-red-50 border border-red-100'
                          }`}>
                            <Server className={`w-4.5 h-4.5 ${isOnline ? 'text-emerald-600' : 'text-red-400'}`} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-neutral-900 truncate capitalize">
                              {group.name}
                            </p>
                            <p className="text-xs text-neutral-400 font-normal truncate mt-0.5">
                              {group.host || '—'}
                            </p>
                          </div>
                        </div>

                        {/* Status badge */}
                        <div className="sm:col-span-2 flex sm:justify-center">
                          <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full ${
                            isOnline
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-red-50 text-red-600 border border-red-200'
                          }`}>
                            <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-red-400'}`} />
                            {isOnline ? 'Online' : 'Offline'}
                          </span>
                        </div>

                        {/* Camera count */}
                        <div className="sm:col-span-3 sm:text-center">
                          <p className="text-base font-extrabold text-neutral-900 leading-tight">
                            {online}
                            <span className="text-neutral-300 font-normal text-sm">
                              /{cams.length}
                            </span>
                          </p>
                          <p className="text-[10px] font-medium text-neutral-400 uppercase tracking-wider">
                            cameras live
                          </p>
                        </div>

                        {/* Arrow */}
                        <div className="hidden sm:flex sm:col-span-2 justify-end">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-neutral-50 group-hover:bg-[#F7983A] transition-colors">
                            <ChevronRight className="w-4 h-4 text-neutral-400 group-hover:text-white transition-colors" />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Empty state */
                <div className="text-center py-20 px-8">
                  <div className="w-20 h-20 bg-neutral-100 rounded-3xl flex items-center justify-center mx-auto mb-5">
                    <Server className="w-9 h-9 text-neutral-300" />
                  </div>
                  <h3 className="text-xl font-extrabold text-neutral-900 mb-2">
                    No Sites Configured
                  </h3>
                  <p className="text-sm text-neutral-500 font-normal max-w-sm mx-auto mb-6 leading-relaxed">
                    Add your first camera device to start monitoring. Connect IP cameras, NVRs, or DVRs to begin.
                  </p>
                  <button
                    onClick={() => navigate('/devices')}
                    className="inline-flex items-center gap-2.5 px-6 py-3 bg-[#F7983A] hover:bg-[#E8882A] text-white text-sm font-bold rounded-xl transition-colors shadow-lg shadow-[#F7983A]/20"
                  >
                    <Server className="w-4.5 h-4.5" />
                    Add Your First Site
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ── RIGHT COLUMN (1/3) ────────────────────────────────────────────── */}
          <div className="space-y-6">

            {/* ── SYSTEM HEALTH ──────────────────────────────────────── */}
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-neutral-100">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-extrabold text-neutral-900 tracking-tight">
                      System Health
                    </h3>
                    <p className="text-xs text-neutral-400 font-normal mt-0.5">
                      Real-time infrastructure status
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black tracking-tighter leading-none" style={{ color: healthColor }}>
                      {loading ? '—' : `${stats.health}%`}
                    </p>
                    <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mt-0.5">
                      Overall
                    </p>
                  </div>
                </div>

                {/* Main bar */}
                <div className="mt-4 h-3 bg-neutral-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${stats.health}%`, backgroundColor: healthColor }}
                  />
                </div>
              </div>

              <div className="px-6 py-5 space-y-5">
                {/* Sites gauge */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-neutral-700">Sites Online</span>
                    <span className="text-sm font-extrabold text-neutral-900">
                      {stats.onlineSites}<span className="text-neutral-300 font-normal text-xs">/{stats.totalSites}</span>
                    </span>
                  </div>
                  <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-blue-500 transition-all duration-700"
                      style={{ width: stats.totalSites > 0 ? `${(stats.onlineSites / stats.totalSites) * 100}%` : '0%' }}
                    />
                  </div>
                </div>

                {/* Cameras gauge */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-neutral-700">Cameras Active</span>
                    <span className="text-sm font-extrabold text-neutral-900">
                      {stats.onlineCameras}<span className="text-neutral-300 font-normal text-xs">/{stats.totalCameras}</span>
                    </span>
                  </div>
                  <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all duration-700"
                      style={{ width: stats.totalCameras > 0 ? `${(stats.onlineCameras / stats.totalCameras) * 100}%` : '0%' }}
                    />
                  </div>
                </div>

                {/* Online / Offline boxes */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-center">
                    <p className="text-2xl font-black text-emerald-600 tracking-tighter leading-none">
                      {stats.onlineSites + stats.onlineCameras}
                    </p>
                    <p className="text-[10px] font-extrabold text-emerald-500 uppercase tracking-[0.12em] mt-1.5">
                      Online
                    </p>
                  </div>
                  <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-center">
                    <p className="text-2xl font-black text-red-500 tracking-tighter leading-none">
                      {stats.offlineSites + stats.offlineCameras}
                    </p>
                    <p className="text-[10px] font-extrabold text-red-400 uppercase tracking-[0.12em] mt-1.5">
                      Offline
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* ── QUICK ACCESS ───────────────────────────────────────── */}
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-neutral-100">
                <h3 className="text-base font-extrabold text-neutral-900 tracking-tight">
                  Quick Access
                </h3>
                <p className="text-xs text-neutral-400 font-normal mt-0.5">
                  Navigate to key sections
                </p>
              </div>

              <div className="p-3 space-y-0.5">
                {[
                  { icon: Video, label: 'Live View', desc: 'Real-time camera streams', to: '/live', color: '#10B981' },
                  { icon: Clock, label: 'Timeline', desc: 'Browse daily recordings', to: '/timeline', color: '#3B82F6' },
                  { icon: Film, label: 'Gallery', desc: 'Recording library', to: '/gallery', color: '#8B5CF6' },
                  { icon: MapPin, label: 'Map View', desc: 'Geographic overview', to: '/map', color: '#EC4899' },
                  { icon: Camera, label: 'Cameras', desc: 'Device management', to: '/cameras', color: '#F7983A' },
                ].map((action) => (
                  <button
                    key={action.label}
                    onClick={() => navigate(action.to)}
                    className="w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl hover:bg-neutral-50 transition-colors group text-left"
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${action.color}15` }}
                    >
                      <action.icon className="w-5 h-5" style={{ color: action.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-neutral-900 group-hover:text-[#F7983A] transition-colors">
                        {action.label}
                      </p>
                      <p className="text-xs text-neutral-400 font-normal mt-0.5">
                        {action.desc}
                      </p>
                    </div>
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-neutral-50 group-hover:bg-[#F7983A]/10 transition-colors shrink-0">
                      <ChevronRight className="w-3.5 h-3.5 text-neutral-400 group-hover:text-[#F7983A] transition-colors" />
                    </div>
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
