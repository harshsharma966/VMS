import { lazy, Suspense, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';
import ProtectedRoute from '@/components/ProtectedRoute';

const Login          = lazy(() => import('@/pages/Login'));
const Register       = lazy(() => import('@/pages/Register'));
const ForgotPassword = lazy(() => import('@/pages/ForgotPassword'));
const ResetPassword  = lazy(() => import('@/pages/ResetPassword'));
const Home           = lazy(() => import('@/pages/Home'));
const Dashboard      = lazy(() => import('@/pages/Dashboard'));
const Timelapse      = lazy(() => import('@/pages/Timelapse'));
const Gallery        = lazy(() => import('@/pages/Gallery'));
const LiveView       = lazy(() => import('@/pages/LiveView'));
const Timeline       = lazy(() => import('@/pages/Timeline'));
const Map            = lazy(() => import('@/pages/Map'));
const Playback       = lazy(() => import('@/pages/Playback'));
const Cameras        = lazy(() => import('@/pages/Cameras'));
const CameraGroups   = lazy(() => import('@/pages/CameraGroups'));
const Settings       = lazy(() => import('@/pages/Settings'));
const Help           = lazy(() => import('@/pages/Help'));

function AppLayout({ children, sidebarOpen, onToggleSidebar }) {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar open={sidebarOpen} onToggle={onToggleSidebar} />
      <div
        className="transition-[margin-left] duration-250 ease-in-out"
        style={{ marginLeft: sidebarOpen ? '220px' : '60px' }}
      >
        <Topbar />
        <main className="min-h-[calc(100vh-4rem)]">
          <Suspense
            fallback={
              <div className="flex items-center justify-center h-96">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            }
          >
            {children}
          </Suspense>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    try { return localStorage.getItem('sidebar-open') !== 'false'; } catch { return true; }
  });

  const handleToggle = () => {
    setSidebarOpen(v => {
      const next = !v;
      try { localStorage.setItem('sidebar-open', String(next)); } catch {}
      return next;
    });
  };

  const wrap = (page) => (
    <AppLayout sidebarOpen={sidebarOpen} onToggleSidebar={handleToggle}>
      {page}
    </AppLayout>
  );

  return (
    <Routes>
      {/* Public */}
      <Route path="/login"           element={<Suspense fallback={null}><Login /></Suspense>} />
      <Route path="/register"        element={<Suspense fallback={null}><Register /></Suspense>} />
      <Route path="/forgot-password" element={<Suspense fallback={null}><ForgotPassword /></Suspense>} />
      <Route path="/reset-password"  element={<Suspense fallback={null}><ResetPassword /></Suspense>} />

      {/* Redirect root */}
      <Route path="/" element={<Navigate to="/home" replace />} />

      {/* Protected */}
      <Route path="/home"      element={<ProtectedRoute>{wrap(<Home />)}</ProtectedRoute>} />
      <Route path="/cameras"   element={<ProtectedRoute>{wrap(<Cameras />)}</ProtectedRoute>} />
      <Route path="/devices"   element={<ProtectedRoute>{wrap(<CameraGroups />)}</ProtectedRoute>} />
      <Route path="/timelapse" element={<ProtectedRoute>{wrap(<Timelapse />)}</ProtectedRoute>} />
      <Route path="/gallery"   element={<ProtectedRoute>{wrap(<Gallery />)}</ProtectedRoute>} />
      <Route path="/live"      element={<ProtectedRoute>{wrap(<LiveView />)}</ProtectedRoute>} />
      <Route path="/timeline"  element={<ProtectedRoute>{wrap(<Timeline />)}</ProtectedRoute>} />
      <Route path="/map"       element={<ProtectedRoute>{wrap(<Map />)}</ProtectedRoute>} />
      <Route path="/dashboard" element={<ProtectedRoute>{wrap(<Dashboard />)}</ProtectedRoute>} />
      <Route path="/playback"  element={<ProtectedRoute>{wrap(<Playback />)}</ProtectedRoute>} />
      <Route path="/settings"  element={<ProtectedRoute>{wrap(<Settings />)}</ProtectedRoute>} />
      <Route path="/help"      element={<ProtectedRoute>{wrap(<Help />)}</ProtectedRoute>} />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
