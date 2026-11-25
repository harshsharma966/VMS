import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Plus, Pencil, Trash2, Camera, Search, X, AlertCircle, CheckCircle2,
  ServerCrash, Wifi, AlertTriangle, Eye, EyeOff, Cctv, Video,
  ChevronDown, ChevronRight,
} from 'lucide-react';
import {
  useCameras, useAddCamera, useUpdateCamera, useDeleteCamera, useGroups,
} from '@/hooks/useQueries';

// ─── Constants ────────────────────────────────────────────────────────────────
const VIDEO_TYPES = [
  { value: 'h264',  label: 'H.264' },
  { value: 'h265',  label: 'H.265' },
  { value: 'mjpeg', label: 'MJPEG' },
];

const PROTOCOLS = [
  { value: 'rtsp',  label: 'RTSP' },
  { value: 'http',  label: 'HTTP' },
  { value: 'onvif', label: 'ONVIF' },
];

const defaultForm = {
  name: '', host: '', port: '554', path: '',
  type: 'h264', protocol: 'rtsp',
  username: '', password: '',
  width: '1920', height: '1080', fps: '30',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getStatus = (camera) => {
  const isOnline = camera.mode === 'start';
  return isOnline
    ? { badge: 'bg-green-100 text-green-700 border-green-200', dot: 'bg-green-500', label: 'Online' }
    : { badge: 'bg-red-100 text-red-700 border-red-200',       dot: 'bg-red-500',   label: 'Offline' };
};

// Build monitorId → parent group map from groups list
function buildParentMap(groups) {
  const map = {};
  groups.forEach(g => {
    (g.cameras || []).forEach(c => {
      map[c.monitorId] = { groupId: g.id, groupName: g.name, deviceType: g.deviceType };
    });
  });
  return map;
}

// ─── Notification ─────────────────────────────────────────────────────────────
function Notification({ note, onDismiss }) {
  if (!note) return null;
  const isError = note.type === 'error';
  return (
    <div className={`flex items-start gap-3 px-4 py-3 rounded-xl border text-sm mb-4
      ${isError ? 'bg-red-50 border-red-200 text-red-800' : 'bg-green-50 border-green-200 text-green-800'}`}>
      {isError
        ? <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-500" />
        : <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-green-500" />
      }
      <span className="flex-1">{note.message}</span>
      <button onClick={onDismiss} className="shrink-0 opacity-60 hover:opacity-100">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// ─── Delete Confirm Dialog ────────────────────────────────────────────────────
function DeleteConfirmDialog({ open, cameraName, loading, onConfirm, onCancel }) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-neutral-900">Delete Camera</DialogTitle>
        </DialogHeader>
        <div className="flex items-start gap-3 py-1">
          <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0 mt-0.5">
            <AlertTriangle className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-neutral-900">Delete &quot;{cameraName}&quot;?</p>
            <p className="text-sm text-neutral-500 mt-1 leading-relaxed">
              This will permanently remove the camera and stop its stream. This cannot be undone.
            </p>
          </div>
        </div>
        <DialogFooter className="gap-2 mt-2">
          <Button variant="outline" onClick={onCancel} disabled={loading}>Cancel</Button>
          <Button variant="destructive" onClick={onConfirm} disabled={loading}>
            {loading
              ? <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Deleting…
                </span>
              : 'Delete Camera'
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Add / Edit Dialog ────────────────────────────────────────────────────────
function CameraFormDialog({ open, editingCamera, onClose, onSaved, onNotify }) {
  const addMut    = useAddCamera();
  const updateMut = useUpdateCamera();

  const [form, setForm]           = useState(defaultForm);
  const [showPass, setShowPass]   = useState(false);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError('');
    setShowPass(false);
    setShowAdvanced(false);
    if (editingCamera) {
      setForm({
        name:     editingCamera.name     || '',
        host:     editingCamera.host     || '',
        port:     String(editingCamera.port || 554),
        path:     editingCamera.path     || '',
        type:     editingCamera.type     || 'h264',
        protocol: editingCamera.protocol || 'rtsp',
        username: editingCamera.username || '',
        password: '', // Never pre-fill — user must re-enter to change
        width:    String(editingCamera.width  || 1920),
        height:   String(editingCamera.height || 1080),
        fps:      String(editingCamera.fps    || 30),
      });
    } else {
      setForm(defaultForm);
    }
  }, [open, editingCamera]);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const canSave = !!(form.name.trim() && form.host.trim() && form.username.trim());

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      if (editingCamera) {
        const body = { ...form };
        // Only send password if user typed a new one — never expose existing
        if (!body.password.trim()) delete body.password;
        await updateMut.mutateAsync({ monitorId: editingCamera.mid, data: body });
        onNotify({ type: 'success', message: `"${form.name}" updated successfully.` });
      } else {
        await addMut.mutateAsync({
          ...form,
          mid: crypto.randomUUID().replace(/-/g, '').slice(0, 24),
        });
        onNotify({ type: 'success', message: `"${form.name}" added and streaming.` });
      }
      onSaved();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to save camera. Check the connection details.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-neutral-900">
            {editingCamera ? 'Edit Camera' : 'Add IP Camera'}
          </DialogTitle>
          <p className="text-sm text-neutral-500 mt-0.5">
            {editingCamera
              ? `Update connection details for ${editingCamera.name}`
              : 'Connect a standalone IP camera directly via RTSP or HTTP.'
            }
          </p>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">
              Camera Name <span className="text-red-500">*</span>
            </label>
            <Input
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder='e.g. "Front Door", "Server Room"'
              autoFocus
            />
          </div>

          {/* Protocol */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">Protocol</label>
            <div className="flex gap-2">
              {PROTOCOLS.map(p => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => set('protocol', p.value)}
                  className={`flex-1 py-2 rounded-lg border-2 text-xs font-semibold transition-all
                    ${form.protocol === p.value
                      ? 'border-[#F7983A] bg-orange-50 text-[#F7983A]'
                      : 'border-neutral-200 text-neutral-600 hover:border-neutral-300'
                    }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Video codec */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">Video Codec</label>
            <div className="flex gap-2">
              {VIDEO_TYPES.map(t => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => set('type', t.value)}
                  className={`flex-1 py-2 rounded-lg border-2 text-xs font-semibold transition-all
                    ${form.type === t.value
                      ? 'border-[#F7983A] bg-orange-50 text-[#F7983A]'
                      : 'border-neutral-200 text-neutral-600 hover:border-neutral-300'
                    }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* IP + Port */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                IP Address <span className="text-red-500">*</span>
              </label>
              <Input
                value={form.host}
                onChange={e => set('host', e.target.value)}
                placeholder="192.168.1.100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">Port</label>
              <Input
                value={form.port}
                onChange={e => set('port', e.target.value)}
                placeholder="554"
              />
            </div>
          </div>

          {/* Stream path */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">Stream Path</label>
            <Input
              value={form.path}
              onChange={e => set('path', e.target.value)}
              placeholder="/stream1  or  /h264/ch1/main/av_stream"
            />
            <p className="text-xs text-neutral-400 mt-1">
              RTSP path after the IP — e.g. <code className="bg-neutral-100 px-1 rounded">/stream1</code>
            </p>
          </div>

          {/* Credentials */}
          <div className="border border-neutral-200 rounded-xl p-4 space-y-3">
            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Credentials</p>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                Username <span className="text-red-500">*</span>
              </label>
              <Input
                value={form.username}
                onChange={e => set('username', e.target.value)}
                placeholder="admin"
                autoComplete="off"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                Password
                {editingCamera && (
                  <span className="text-neutral-400 font-normal ml-1">(leave blank to keep current)</span>
                )}
              </label>
              <div className="relative">
                <Input
                  type={showPass ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => set('password', e.target.value)}
                  placeholder={editingCamera ? 'Enter new password to change' : 'Camera password'}
                  className="pr-9"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Advanced toggle */}
          <button
            type="button"
            onClick={() => setShowAdvanced(v => !v)}
            className="text-xs text-neutral-400 hover:text-neutral-600 flex items-center gap-1 transition-colors"
          >
            {showAdvanced ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            {showAdvanced ? 'Hide' : 'Show'} advanced settings (resolution, FPS)
          </button>

          {showAdvanced && (
            <div className="grid grid-cols-3 gap-3 border border-neutral-200 rounded-xl p-3 bg-neutral-50">
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1.5">Width px</label>
                <Input value={form.width}  onChange={e => set('width',  e.target.value)} placeholder="1920" className="text-sm h-8" />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1.5">Height px</label>
                <Input value={form.height} onChange={e => set('height', e.target.value)} placeholder="1080" className="text-sm h-8" />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1.5">FPS</label>
                <Input value={form.fps}    onChange={e => set('fps',    e.target.value)} placeholder="30"   className="text-sm h-8" />
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              {error}
            </div>
          )}
        </div>

        <DialogFooter className="flex-row gap-2 mt-4">
          <Button variant="outline" onClick={onClose} disabled={saving} className="flex-1 sm:flex-none">
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !canSave}
            className="bg-[#F7983A] hover:bg-[#E8882A] text-white flex-1 sm:flex-none"
          >
            {saving
              ? <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving…
                </span>
              : editingCamera ? 'Save Changes' : 'Add Camera'
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Single Camera Row ────────────────────────────────────────────────────────
function CameraRow({ camera, onEdit, onDelete }) {
  const st = getStatus(camera);
  const isOnline = camera.mode === 'start';

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-neutral-50 hover:bg-neutral-100 border border-neutral-100 transition-colors">
      {/* Icon */}
      <div className={`w-7 h-7 rounded-md border flex items-center justify-center shrink-0
        ${isOnline ? 'bg-white border-green-100' : 'bg-white border-neutral-200'}`}>
        <Camera className={`w-3.5 h-3.5 ${isOnline ? 'text-green-500' : 'text-neutral-400'}`} />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-neutral-800 truncate">{camera.name}</p>
        <div className="flex items-center gap-x-2 text-xs text-neutral-400 mt-0.5 flex-wrap">
          <span className="flex items-center gap-0.5">
            <Wifi className="w-3 h-3" />
            {camera.host}:{camera.port || 554}
          </span>
          {camera.path && (
            <span className="font-mono truncate max-w-32">{camera.path}</span>
          )}
          {camera.type && (
            <span className="uppercase">{camera.type}</span>
          )}
          {camera.width && camera.height && (
            <span className="flex items-center gap-0.5">
              <Video className="w-3 h-3" />
              {camera.width}×{camera.height}
            </span>
          )}
        </div>
        {/* Connection string — no credentials, just host/path */}
        <p className="text-xs text-neutral-300 font-mono mt-0.5 truncate max-w-xs">
          {camera.protocol || 'rtsp'}://{camera.host}:{camera.port || 554}{camera.path || ''}
        </p>
      </div>

      {/* Status + actions */}
      <div className="flex items-center gap-1.5 shrink-0 ml-1">
        <Badge className={`text-xs border ${st.badge}`}>
          <span className="flex items-center gap-1">
            <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
            {st.label}
          </span>
        </Badge>
        <Button
          variant="ghost" size="sm"
          onClick={() => onEdit(camera)}
          className="h-7 w-7 p-0 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200"
        >
          <Pencil className="w-3 h-3" />
        </Button>
        <Button
          variant="ghost" size="sm"
          onClick={() => onDelete(camera)}
          className="h-7 w-7 p-0 text-neutral-400 hover:text-red-600 hover:bg-red-50"
        >
          <Trash2 className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}

// ─── Device Group Section ─────────────────────────────────────────────────────
function DeviceSection({ groupName, deviceType, cameras, onEdit, onDelete }) {
  const [open, setOpen] = useState(true);
  const online = cameras.filter(c => c.mode === 'start').length;

  return (
    <div className="border border-neutral-200 rounded-xl overflow-hidden bg-white">
      {/* Group header */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-neutral-50 hover:bg-neutral-100 transition-colors text-left select-none"
      >
        <div className="w-7 h-7 rounded-lg bg-orange-50 flex items-center justify-center shrink-0">
          <Cctv className="w-4 h-4 text-[#F7983A]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-neutral-800 truncate">{groupName}</p>
          <p className="text-xs text-neutral-400 capitalize">
            {deviceType || 'NVR/DVR'} · {cameras.length} channel{cameras.length !== 1 ? 's' : ''} ·{' '}
            <span className="text-green-600">{online} online</span>
          </p>
        </div>
        <span className="text-neutral-400 shrink-0">
          {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </span>
      </button>

      {/* Camera list */}
      {open && (
        <div className="p-3 space-y-1.5 border-t border-neutral-100">
          {cameras.map(cam => (
            <CameraRow key={cam.mid} camera={cam} onEdit={onEdit} onDelete={onDelete} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function SkeletonSection() {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 animate-pulse space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-7 h-7 rounded-lg bg-neutral-200" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3.5 bg-neutral-200 rounded w-1/4" />
          <div className="h-3 bg-neutral-100 rounded w-1/3" />
        </div>
      </div>
      {[1, 2].map(i => (
        <div key={i} className="h-14 bg-neutral-100 rounded-lg" />
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Cameras() {
  const { data: cameras = [], isLoading: camLoading, isError, error: fetchError } = useCameras();
  const { data: groups  = [], isLoading: grpLoading } = useGroups();
  const deleteMut = useDeleteCamera();

  const [formOpen,      setFormOpen]      = useState(false);
  const [editingCamera, setEditingCamera] = useState(null);
  const [deleteTarget,  setDeleteTarget]  = useState(null);
  const [deleting,      setDeleting]      = useState(false);
  const [search,        setSearch]        = useState('');
  const [notification,  setNotification]  = useState(null);

  const isLoading = camLoading || grpLoading;

  // Auto-dismiss notification
  useEffect(() => {
    if (!notification) return;
    const t = setTimeout(() => setNotification(null), 4000);
    return () => clearTimeout(t);
  }, [notification]);

  const notify = (note) => setNotification(note);

  // Build parent map and partition cameras into grouped + standalone
  const { deviceSections, standalone } = useMemo(() => {
    const parentMap = buildParentMap(groups);
    const sections  = {};
    const solo      = [];

    cameras.forEach(cam => {
      const info = parentMap[cam.mid];
      if (info) {
        if (!sections[info.groupId]) {
          sections[info.groupId] = { groupName: info.groupName, deviceType: info.deviceType, cameras: [] };
        }
        sections[info.groupId].cameras.push(cam);
      } else {
        solo.push(cam);
      }
    });

    return {
      deviceSections: Object.values(sections),
      standalone: solo,
    };
  }, [cameras, groups]);

  const openAdd  = () => { setEditingCamera(null); setFormOpen(true); };
  const openEdit = (cam) => { setEditingCamera(cam); setFormOpen(true); };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteMut.mutateAsync(deleteTarget.mid);
      notify({ type: 'success', message: `"${deleteTarget.name}" deleted successfully.` });
    } catch {
      notify({ type: 'error', message: 'Failed to delete camera. Please try again.' });
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  // Stats (before search)
  const total   = cameras.length;
  const online  = cameras.filter(c => c.mode === 'start').length;
  const offline = total - online;

  // Search filter — applies to camera name and host
  const q = search.trim().toLowerCase();
  const filteredSections = q
    ? deviceSections
        .map(s => ({ ...s, cameras: s.cameras.filter(c =>
            c.name?.toLowerCase().includes(q) || c.host?.toLowerCase().includes(q)
          )}))
        .filter(s => s.cameras.length > 0 || s.groupName.toLowerCase().includes(q))
    : deviceSections;

  const filteredStandalone = q
    ? standalone.filter(c =>
        c.name?.toLowerCase().includes(q) || c.host?.toLowerCase().includes(q)
      )
    : standalone;

  const hasResults = filteredSections.length > 0 || filteredStandalone.length > 0;

  return (
    <div className="p-4 sm:p-6 bg-neutral-50 min-h-screen flex flex-col">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-2 h-8 bg-[#F7983A] rounded-full shrink-0" />
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900">Cameras</h1>
            <p className="text-sm text-neutral-500 mt-0.5">All connected camera feeds across your system</p>
          </div>
        </div>
        <Button
          onClick={openAdd}
          className="bg-[#F7983A] hover:bg-[#E8882A] text-white w-full sm:w-auto shrink-0"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Camera
        </Button>
      </div>

      {/* ── Notification ── */}
      <Notification note={notification} onDismiss={() => setNotification(null)} />

      {/* ── API Error ── */}
      {isError && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl border bg-red-50 border-red-200 text-sm text-red-800 mb-4">
          <ServerCrash className="w-4 h-4 mt-0.5 shrink-0 text-red-500" />
          <div>
            <p className="font-medium">Failed to load cameras</p>
            <p className="text-xs text-red-600 mt-0.5">
              {fetchError?.message || 'Could not reach the server. Check your connection and try refreshing.'}
            </p>
          </div>
        </div>
      )}

      {/* ── Stats bar ── */}
      {!isLoading && total > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: 'Total Cameras', value: total,   color: 'text-neutral-900', sub: 'All feeds' },
            { label: 'Online',        value: online,  color: 'text-green-600',   sub: 'Streaming now' },
            { label: 'Offline',       value: offline, color: offline > 0 ? 'text-red-500' : 'text-neutral-400', sub: 'Not streaming' },
          ].map(s => (
            <Card key={s.label} className="border border-neutral-200 shadow-sm bg-white">
              <CardContent className="py-3 px-4">
                <p className={`text-2xl font-bold leading-tight ${s.color}`}>{s.value}</p>
                <p className="text-xs font-medium text-neutral-700 mt-0.5">{s.label}</p>
                <p className="text-xs text-neutral-400">{s.sub}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── Search ── */}
      {!isLoading && total >= 4 && (
        <div className="relative mb-4">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or IP…"
            className="pl-9 bg-white"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* ── Camera List (scrollable) ── */}
      {isLoading ? (
        <div className="space-y-4">
          <SkeletonSection />
          <SkeletonSection />
        </div>
      ) : total === 0 ? (
        /* Empty state */
        <Card className="border-2 border-dashed border-neutral-200 shadow-none bg-white">
          <CardContent className="text-center py-16 px-8">
            <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Cctv className="w-8 h-8 text-[#F7983A]" />
            </div>
            <h3 className="text-base font-semibold text-neutral-900 mb-1">No cameras connected</h3>
            <p className="text-sm text-neutral-500 max-w-xs mx-auto mb-6 leading-relaxed">
              Add a standalone IP camera here, or go to <strong>Devices</strong> to connect an
              NVR/DVR and auto-provision multiple channels at once.
            </p>
            <Button onClick={openAdd} className="bg-[#F7983A] hover:bg-[#E8882A] text-white">
              <Plus className="w-4 h-4 mr-2" />
              Add First Camera
            </Button>
          </CardContent>
        </Card>
      ) : !hasResults ? (
        /* No search results */
        <div className="text-center py-16">
          <Search className="w-10 h-10 text-neutral-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-neutral-600">No cameras match &ldquo;{search}&rdquo;</p>
          <button onClick={() => setSearch('')} className="text-xs text-[#F7983A] hover:underline mt-1">
            Clear search
          </button>
        </div>
      ) : (
        /* Scrollable list — capped so page doesn't stretch forever */
        <div className="overflow-y-auto flex-1 space-y-4 pr-0.5" style={{ maxHeight: 'calc(100vh - 320px)' }}>

          {/* Cameras grouped under their NVR/DVR device */}
          {filteredSections.map((section, i) => (
            <DeviceSection
              key={i}
              groupName={section.groupName}
              deviceType={section.deviceType}
              cameras={section.cameras}
              onEdit={openEdit}
              onDelete={setDeleteTarget}
            />
          ))}

          {/* Standalone cameras (not part of any device group) */}
          {filteredStandalone.length > 0 && (
            <div className="border border-neutral-200 rounded-xl overflow-hidden bg-white">
              <div className="flex items-center gap-3 px-4 py-3 bg-neutral-50 border-b border-neutral-100">
                <div className="w-7 h-7 rounded-lg bg-neutral-100 flex items-center justify-center shrink-0">
                  <Camera className="w-4 h-4 text-neutral-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-neutral-700">Standalone Cameras</p>
                  <p className="text-xs text-neutral-400">
                    Direct IP cameras · {filteredStandalone.length} camera{filteredStandalone.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <div className="p-3 space-y-1.5">
                {filteredStandalone.map(cam => (
                  <CameraRow key={cam.mid} camera={cam} onEdit={openEdit} onDelete={setDeleteTarget} />
                ))}
              </div>
            </div>
          )}

          {search && (
            <p className="text-xs text-neutral-400 text-center pt-1">
              Showing {filteredSections.reduce((s, x) => s + x.cameras.length, 0) + filteredStandalone.length} of {total} cameras
            </p>
          )}
        </div>
      )}

      {/* ── Add/Edit Dialog ── */}
      <CameraFormDialog
        open={formOpen}
        editingCamera={editingCamera}
        onClose={() => setFormOpen(false)}
        onSaved={() => setFormOpen(false)}
        onNotify={notify}
      />

      {/* ── Delete Confirm ── */}
      <DeleteConfirmDialog
        open={!!deleteTarget}
        cameraName={deleteTarget?.name || ''}
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
