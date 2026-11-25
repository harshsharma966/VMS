import { NavLink } from 'react-router-dom';
import {
  Camera,
  Clock,
  Images,
  BarChart3,
  MapPin,
  Video,
  Cctv,
  Settings,
  HelpCircle,
  Home,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import logo from '../assets/logo.png';

const NAV = [
  { to: '/home', label: 'Home', icon: Home },
  { to: '/devices', label: 'Devices', icon: Cctv },
  { to: '/cameras', label: 'Cameras', icon: Camera },
  { to: '/live', label: 'Live View', icon: Video },
  { to: '/timelapse', label: 'Timelapse', icon: Clock },
  { to: '/gallery', label: 'Gallery', icon: Images },
  { to: '/timeline', label: 'Timeline', icon: BarChart3 },
  { to: '/map', label: 'Map', icon: MapPin },
];

const BOTTOM = [
  { to: '/settings', label: 'Settings', icon: Settings },
  { to: '/help', label: 'Help', icon: HelpCircle },
];

export default function Sidebar({ open, onToggle }) {
  return (
    <aside
      className={`fixed left-0 top-0 h-screen z-30 flex flex-col bg-[#111114] border-r border-white/[0.07] transition-[width] duration-[250ms] ease-in-out overflow-hidden ${open ? 'w-[220px]' : 'w-[60px]'
        }`}
    >
      {/* ── Logo + toggle ── */}
      <div className={`h-16 shrink-0 flex items-center border-b border-white/[0.07] ${open ? 'px-4 justify-between' : 'justify-center'}`}>
        {open && (
          <div className="flex items-center gap-2.5 min-w-0">
            <img src={logo} alt="DrishyamVMS" className="w-7 h-7 rounded-lg shrink-0 object-contain" />
            <span className="text-[15px] font-bold text-white tracking-tight whitespace-nowrap">Drishyam</span>
          </div>
        )}

        <button
          onClick={onToggle}
          className={`p-1.5 rounded-lg text-neutral-500 hover:text-white hover:bg-white/8 transition-all ${!open ? 'mt-0' : ''}`}
          title={open ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          {open ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
      </div>

      {/* ── Main nav ── */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            title={!open ? label : undefined}
            className={({ isActive }) =>
              `flex items-center rounded-xl transition-all group ${open ? 'gap-3 px-3 py-2.5' : 'justify-center px-0 py-2.5'
              } ${isActive
                ? 'bg-[#F7983A]/15 text-[#F7983A]'
                : 'text-neutral-400 hover:text-white hover:bg-white/[0.06]'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={`shrink-0 transition-colors ${open ? 'w-[18px] h-[18px]' : 'w-5 h-5'} ${isActive ? 'text-[#F7983A]' : ''}`} />
                {open && (
                  <span className={`text-[13px] font-medium whitespace-nowrap ${isActive ? 'text-[#F7983A]' : ''}`}>
                    {label}
                  </span>
                )}
                {/* Active indicator bar */}
                {isActive && open && (
                  <span className="ml-auto w-1 h-4 rounded-full bg-[#F7983A] shrink-0" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* ── Bottom nav ── */}
      <div className="shrink-0 border-t border-white/[0.07] py-3 px-2 space-y-0.5">
        {BOTTOM.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            title={!open ? label : undefined}
            className={({ isActive }) =>
              `flex items-center rounded-xl transition-all ${open ? 'gap-3 px-3 py-2.5' : 'justify-center px-0 py-2.5'
              } ${isActive
                ? 'bg-[#F7983A]/15 text-[#F7983A]'
                : 'text-neutral-500 hover:text-white hover:bg-white/[0.06]'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={`shrink-0 ${open ? 'w-[18px] h-[18px]' : 'w-5 h-5'} ${isActive ? 'text-[#F7983A]' : ''}`} />
                {open && (
                  <span className={`text-[13px] font-medium whitespace-nowrap ${isActive ? 'text-[#F7983A]' : ''}`}>
                    {label}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </aside>
  );
}
