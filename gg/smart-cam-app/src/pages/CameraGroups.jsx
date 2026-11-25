import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Plus, Trash2, ChevronDown, ChevronRight, Camera, MapPin, Wifi,
  Cctv, CheckCircle2, ArrowRight, ArrowLeft, RefreshCw, Pencil, AlertTriangle,
  X, Search, AlertCircle, ServerCrash, Eye, EyeOff, Lock, WifiOff,
} from 'lucide-react';
import {
  useGroups, useCreateGroup, useDeleteGroup, useSyncGroup, useUpdateGroup,
  useDeleteGroupCamera,
} from '@/hooks/useQueries';

// ─── Constants ────────────────────────────────────────────────────────────────
const DEVICE_TYPES = [
  { value: 'hikvision', label: 'Hikvision', hint: '/Streaming/Channels/101, 201…' },
  { value: 'dahua',     label: 'Dahua',     hint: '/cam/realmonitor?channel=1…' },
  { value: 'axis',      label: 'Axis',      hint: '/axis-media/media.amp?camera=1…' },
  { value: 'generic',   label: 'Generic',   hint: 'Manual RTSP path per channel' },
];

const defaultForm = {
  name: '', host: '', port: '554', httpPort: '80',
  username: 'admin', password: '', deviceType: 'hikvision',
  totalChannels: '4', location: '',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const STATUS_MAP = {
  online:  { badge: 'bg-green-100 text-green-700 border-green-200',  dot: 'bg-green-500', label: 'Online'  },
  offline: { badge: 'bg-red-100 text-red-700 border-red-200',        dot: 'bg-red-500',   label: 'Offline' },
  unknown: { badge: 'bg-neutral-100 text-neutral-500 border-neutral-200', dot: 'bg-neutral-400', label: 'Unknown' },
};

const getStatus = (s) => STATUS_MAP[s] || STATUS_MAP.unknown;

// ─── Inline Notification ──────────────────────────────────────────────────────
function Notification({ note, onDismiss }) {
  if (!note) return null;
  const isError = note.type === 'error';
  return (
    <div className={`flex items-start gap-3 px-4 py-3 rounded-xl border text-sm mb-4
      ${isError
        ? 'bg-red-50 border-red-200 text-red-800'
        : 'bg-green-50 border-green-200 text-green-800'
      }`}>
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

// ─── Step Wizard Indicators ───────────────────────────────────────────────────
function StepDot({ step, current, label }) {
  const done   = current > step;
  const active = current === step;
  return (
    <div className="flex flex-col items-center gap-1 min-w-0">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all
        ${done || active ? 'bg-[#F7983A] text-white' : 'bg-neutral-200 text-neutral-500'}
        ${active ? 'ring-4 ring-orange-100' : ''}`}>
        {done ? <CheckCircle2 className="w-4 h-4" /> : step}
      </div>
      <span className={`text-xs font-medium truncate max-w-18 text-center
        ${active ? 'text-[#F7983A]' : done ? 'text-neutral-600' : 'text-neutral-400'}`}>
        {label}
      </span>
    </div>
  );
}

function StepConnector({ done }) {
  return (
    <div className={`flex-1 h-0.5 mb-5 transition-all ${done ? 'bg-[#F7983A]' : 'bg-neutral-200'}`} />
  );
}

// ─── Delete Confirm Dialog ────────────────────────────────────────────────────
function DeleteConfirmDialog({ open, deviceName, loading, onConfirm, onCancel }) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-neutral-900">Delete Device</DialogTitle>
        </DialogHeader>
        <div className="flex items-start gap-3 py-1">
          <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0 mt-0.5">
            <AlertTriangle className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-neutral-900">
              Delete &quot;{deviceName}&quot;?
            </p>
            <p className="text-sm text-neutral-500 mt-1 leading-relaxed">
              All camera channels under this device will be permanently removed. This cannot be undone.
            </p>
          </div>
        </div>
        <DialogFooter className="gap-2 mt-2">
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={loading}>
            {loading
              ? <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Deleting…
                </span>
              : 'Delete Device'
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Edit Group Dialog ────────────────────────────────────────────────────────
function EditGroupDialog({ group, open, onClose, onSaved, onNotify }) {
  const updateMut = useUpdateGroup();
  const syncMut   = useSyncGroup();
  const [form, setForm] = useState({});
  const [showPass, setShowPass] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncingMsg, setSyncingMsg] = useState('');
  const [error, setError] = useState('');

  // Reset form when dialog opens with a group
  useEffect(() => {
    if (group && open) {
      // Use actual camera count as source of truth
      const ch = group.cameras?.length ?? group.totalChannels ?? 0;
      setForm({
        name:          group.name       || '',
        host:          group.host       || '',
        port:          String(group.port || 554),
        httpPort:      String(group.httpPort || 80),
        username:      group.username   || '',
        password:      '',
        deviceType:    group.deviceType || 'hikvision',
        location:      group.location   || '',
        totalChannels: String(ch),
      });
      setError('');
      setSyncingMsg('');
      setShowPass(false);
    }
  }, [group, open]);

  if (!group) return null;

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  // Source of truth: actual provisioned camera count (not stored totalChannels which may lag)
  const currentChannels = group.cameras?.length ?? group.totalChannels ?? 0;

  // Parse the channel input — blank/NaN is treated as "no change" to avoid false errors
  const rawInput    = String(form.totalChannels ?? '').trim();
  const parsedInput = rawInput === '' ? NaN : parseInt(rawInput, 10);
  const newChannels = isNaN(parsedInput) ? currentChannels : parsedInput;
  const inputBlank  = rawInput === '' || isNaN(parsedInput);

  const channelError =
    !inputBlank && newChannels < currentChannels
      ? `Cannot reduce channels — ${currentChannels} cameras already exist. Delete cameras individually to remove them.`
    : !inputBlank && newChannels > 64
      ? 'Maximum 64 channels allowed.'
    : '';

  const canSave = !!(form.name?.trim() && form.host?.trim() && form.username?.trim() && !channelError);

  const handleSave = async () => {
    setSaving(true);
    setSyncingMsg('');
    setError('');
    // Effective total: if user left input blank, keep the current count (no channels added)
    const effectiveTotal = inputBlank ? currentChannels : newChannels;
    const added = effectiveTotal - currentChannels;
    try {
      const body = {
        name:          form.name.trim(),
        host:          form.host.trim(),
        port:          parseInt(form.port) || 554,
        httpPort:      parseInt(form.httpPort) || 80,
        username:      form.username.trim(),
        deviceType:    form.deviceType,
        location:      form.location.trim(),
        totalChannels: effectiveTotal,
      };
      if (form.password.trim()) body.password = form.password;
      await updateMut.mutateAsync({ groupId: group.id, body });

      // Auto-sync to refresh camera statuses after save
      if (added > 0) {
        setSyncingMsg(`Syncing ${added} new channel${added !== 1 ? 's' : ''}…`);
      }
      try {
        await syncMut.mutateAsync(group.id);
      } catch {
        // Sync failure is non-fatal — cameras already saved in backend
      }

      const msg = added > 0
        ? `"${body.name}" updated — ${added} new camera channel${added !== 1 ? 's' : ''} provisioned.`
        : `"${body.name}" updated successfully.`;
      onNotify({ type: 'success', message: msg });
      onSaved();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to update device. Please try again.');
    } finally {
      setSaving(false);
      setSyncingMsg('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-neutral-900">
            Edit Device
          </DialogTitle>
          <p className="text-sm text-neutral-500 mt-0.5">
            Update connection details for <span className="font-medium text-neutral-700">{group.name}</span>
          </p>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">
              Device Name <span className="text-red-500">*</span>
            </label>
            <Input
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder='e.g. "Office NVR", "Warehouse Gate"'
              autoFocus
            />
          </div>

          {/* Device type */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">Device Type</label>
            <div className="grid grid-cols-2 gap-2">
              {DEVICE_TYPES.map(d => (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => set('deviceType', d.value)}
                  className={`p-3 rounded-lg border-2 text-left transition-all
                    ${form.deviceType === d.value
                      ? 'border-[#F7983A] bg-orange-50'
                      : 'border-neutral-200 hover:border-neutral-300'
                    }`}
                >
                  <p className="font-medium text-sm text-neutral-900">{d.label}</p>
                  <p className="text-xs text-neutral-400 mt-0.5 truncate">{d.hint}</p>
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
                placeholder="192.168.1.50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">RTSP Port</label>
              <Input
                value={form.port}
                onChange={e => set('port', e.target.value)}
                placeholder="554"
              />
            </div>
          </div>

          {/* HTTP Port + Location */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">HTTP Port</label>
              <Input
                value={form.httpPort}
                onChange={e => set('httpPort', e.target.value)}
                placeholder="80"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">Location</label>
              <Input
                value={form.location}
                onChange={e => set('location', e.target.value)}
                placeholder="3rd Floor, Block B"
              />
            </div>
          </div>

          {/* Credentials */}
          <div className="border border-neutral-200 rounded-xl p-4 space-y-3">
            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" /> Credentials
            </p>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                Username <span className="text-red-500">*</span>
              </label>
              <Input
                value={form.username}
                onChange={e => set('username', e.target.value)}
                placeholder="admin"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                Password
                <span className="text-neutral-400 font-normal ml-1">(leave blank to keep current)</span>
              </label>
              <div className="relative">
                <Input
                  type={showPass ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => set('password', e.target.value)}
                  placeholder="Enter new password to change"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* ── Camera Channels ── */}
          <div className="border border-neutral-200 rounded-xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-neutral-50 border-b border-neutral-100">
              <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5" /> Camera Channels
              </p>
              <span className="text-xs text-neutral-400">
                Provisioned: <span className="font-semibold text-neutral-700">{currentChannels}</span>
              </span>
            </div>

            <div className="p-4 space-y-3">
              {/* Zero-camera state */}
              {currentChannels === 0 && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
                  <span>
                    <strong>No cameras provisioned yet.</strong> This device was created but no channels
                    were set up. Use the buttons below to add channels now.
                  </span>
                </div>
              )}

              {/* Quick-add buttons */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  {currentChannels === 0
                    ? 'How many cameras does this device have?'
                    : 'Total channels — increase to add more'
                  }
                </label>
                <div className="grid grid-cols-5 gap-2 mb-2">
                  {(currentChannels === 0
                    ? [1, 4, 8, 16, 32]
                    : [currentChannels, currentChannels + 1, currentChannels + 2,
                       currentChannels + 4, currentChannels + 8]
                  )
                    .filter((n, i, arr) => arr.indexOf(n) === i && n <= 64)
                    .map(n => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => set('totalChannels', String(n))}
                        className={`h-9 rounded-xl border-2 text-xs font-semibold transition-all
                          ${(!inputBlank && newChannels === n) || (inputBlank && n === currentChannels)
                            ? 'border-[#F7983A] bg-[#F7983A] text-white'
                            : n === currentChannels && currentChannels > 0
                              ? 'border-neutral-300 bg-neutral-50 text-neutral-500'
                              : 'border-neutral-200 text-neutral-700 hover:border-neutral-300 bg-white'
                          }`}
                      >
                        {currentChannels === 0
                          ? n
                          : n === currentChannels
                            ? `${n} ✓`
                            : `+${n - currentChannels}`
                        }
                      </button>
                    ))
                  }
                </div>

                <Input
                  type="number"
                  min={currentChannels === 0 ? 1 : currentChannels}
                  max="64"
                  value={form.totalChannels}
                  onChange={e => set('totalChannels', e.target.value)}
                  placeholder={currentChannels === 0 ? 'Enter channel count (1–64)' : `Current: ${currentChannels}`}
                />

                {/* Validation & feedback messages */}
                {channelError ? (
                  <p className="text-xs text-red-500 mt-1.5 flex items-start gap-1">
                    <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" /> {channelError}
                  </p>
                ) : !inputBlank && newChannels > currentChannels ? (
                  <div className="mt-1.5 space-y-1">
                    <p className="text-xs text-green-600 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 shrink-0" />
                      {newChannels - currentChannels} new camera channel{newChannels - currentChannels !== 1 ? 's' : ''} will be created.
                    </p>
                    <p className="text-xs text-amber-600 flex items-start gap-1">
                      <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
                      New cameras start as <strong>offline</strong>. They go online only when the
                      physical channel is active on the device.
                    </p>
                  </div>
                ) : inputBlank ? (
                  <p className="text-xs text-neutral-400 mt-1.5">
                    Enter a number to add more channels, or leave blank to keep current ({currentChannels}).
                  </p>
                ) : (
                  <p className="text-xs text-neutral-400 mt-1.5">
                    Increase the count to auto-provision additional camera channels.
                  </p>
                )}
              </div>
            </div>
          </div>

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
                  {syncingMsg || 'Saving…'}
                </span>
              : 'Save Changes'
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Camera Channel Row ───────────────────────────────────────────────────────
function CameraRow({ camera, onDelete }) {
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [removing, setRemoving] = useState(false);
  const st = getStatus(camera.status);
  const isOffline = camera.status === 'offline' || camera.status === 'unknown';

  const handleRemove = async () => {
    setRemoving(true);
    try {
      await onDelete(camera);
    } finally {
      setRemoving(false);
      setConfirmRemove(false);
    }
  };

  return (
    <div className={`rounded-lg border transition-colors ${
      confirmRemove
        ? 'bg-red-50 border-red-200'
        : 'bg-neutral-50 hover:bg-neutral-100 border-neutral-100'
    }`}>
      {/* Main row */}
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        {/* Icon */}
        <div className={`w-7 h-7 rounded-md border flex items-center justify-center shrink-0 ${
          isOffline ? 'bg-red-50 border-red-100' : 'bg-white border-neutral-200'
        }`}>
          <Camera className={`w-3.5 h-3.5 ${isOffline ? 'text-red-300' : 'text-neutral-400'}`} />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-neutral-800 truncate">{camera.name}</p>
          <p className="text-xs text-neutral-400 truncate">
            Ch {camera.channel} · {camera.path || `/Streaming/Channels/${camera.channel}01`}
          </p>
          {/* "No stream" message for offline cameras */}
          {isOffline && (
            <p className="text-xs text-red-400 mt-0.5 flex items-center gap-1">
              <WifiOff className="w-3 h-3 shrink-0" />
              No camera or stream found on this channel
            </p>
          )}
        </div>

        {/* Status badge + delete */}
        <div className="flex items-center gap-1.5 shrink-0 ml-1">
          <Badge className={`text-xs border ${st.badge}`}>
            <span className="flex items-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
              {st.label}
            </span>
          </Badge>
          {!confirmRemove ? (
            <button
              onClick={() => setConfirmRemove(true)}
              title="Remove this camera channel"
              className="p-1 rounded text-neutral-300 hover:text-red-500 hover:bg-red-50 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          ) : null}
        </div>
      </div>

      {/* Inline confirm strip */}
      {confirmRemove && (
        <div className="flex items-center justify-between px-3 pb-2.5 gap-2">
          <p className="text-xs text-red-700 font-medium flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            Remove &ldquo;{camera.name}&rdquo; permanently?
          </p>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setConfirmRemove(false)}
              className="text-xs px-2.5 py-1 rounded-lg border border-neutral-200 text-neutral-600 hover:bg-neutral-100 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleRemove}
              disabled={removing}
              className="text-xs px-2.5 py-1 rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors flex items-center gap-1 disabled:opacity-60"
            >
              {removing
                ? <span className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                : <Trash2 className="w-3 h-3" />
              }
              {removing ? 'Removing…' : 'Yes, remove'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Device Group Card ────────────────────────────────────────────────────────
function GroupCard({ group, onDelete, onSync, onEdit, onNotify }) {
  const [expanded, setExpanded] = useState(false);
  const [syncing, setSyncing]   = useState(false);
  const deleteCamMut = useDeleteGroupCamera();

  const handleCameraDelete = async (camera) => {
    await deleteCamMut.mutateAsync({ groupId: group.id, monitorId: camera.monitorId });
    onNotify?.({ type: 'success', message: `Channel "${camera.name}" removed from ${group.name}.` });
  };

  const cameras    = group.cameras || [];
  const total      = cameras.length;
  const online     = cameras.filter(c => c.status === 'online').length;
  const offline    = cameras.filter(c => c.status === 'offline').length;
  const pct        = total > 0 ? Math.round((online / total) * 100) : 0;
  const st         = getStatus(group.status);
  const deviceMeta = DEVICE_TYPES.find(d => d.value === group.deviceType);

  const handleSync = async (e) => {
    e.stopPropagation();
    setSyncing(true);
    try { await onSync(group.id); }
    finally { setSyncing(false); }
  };

  return (
    <Card className="border border-neutral-200 shadow-sm hover:shadow-md transition-shadow bg-white overflow-hidden">
      <CardContent className="p-0">
        {/* ── Card Header Row ── */}
        <div
          className="flex items-center gap-3 sm:gap-4 p-4 cursor-pointer select-none group"
          onClick={() => setExpanded(v => !v)}
        >
          {/* Expand toggle */}
          <div className="text-neutral-400 group-hover:text-neutral-600 transition-colors shrink-0">
            {expanded
              ? <ChevronDown className="w-4 h-4" />
              : <ChevronRight className="w-4 h-4" />
            }
          </div>

          {/* CCTV Icon */}
          <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
            <Cctv className="w-5 h-5 text-[#F7983A]" />
          </div>

          {/* Device info */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-0.5">
              <h3 className="text-sm font-semibold text-neutral-900 truncate max-w-50 sm:max-w-none">
                {group.name}
              </h3>
              <Badge className={`text-xs border ${st.badge} shrink-0`}>
                <span className="flex items-center gap-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                  {st.label}
                </span>
              </Badge>
              {deviceMeta && (
                <span className="text-xs text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded-full capitalize">
                  {deviceMeta.label}
                </span>
              )}
            </div>

            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-neutral-500">
              <span className="flex items-center gap-1">
                <Wifi className="w-3 h-3" />
                {group.host}:{group.port}
              </span>
              {group.location && (
                <span className="flex items-center gap-1 truncate max-w-35">
                  <MapPin className="w-3 h-3 shrink-0" />
                  {group.location}
                </span>
              )}
              {total > 0 && (
                <span>
                  <span className="font-medium text-green-600">{online}</span>
                  <span className="text-neutral-400">/{total}</span>
                  <span className="ml-1">online</span>
                  {offline > 0 && (
                    <span className="ml-1 text-red-500">· {offline} offline</span>
                  )}
                </span>
              )}
            </div>

            {/* Mini progress bar (only when expanded or > 0 cameras) */}
            {total > 0 && (
              <div className="mt-2 flex items-center gap-2">
                <div className="flex-1 h-1 bg-neutral-100 rounded-full overflow-hidden max-w-30">
                  <div
                    className={`h-full rounded-full transition-all ${
                      pct === 100 ? 'bg-green-500' : pct > 0 ? 'bg-[#F7983A]' : 'bg-red-400'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-xs text-neutral-400">{pct}%</span>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div
            className="flex items-center gap-1.5 shrink-0"
            onClick={e => e.stopPropagation()}
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(group)}
              title="Edit device"
              className="h-8 w-8 p-0 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100"
            >
              <Pencil className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSync}
              disabled={syncing}
              title="Sync status from Shinobi"
              className="h-8 w-8 p-0 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(group)}
              title="Delete device"
              className="h-8 w-8 p-0 text-neutral-400 hover:text-red-600 hover:bg-red-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* ── Expanded Camera List ── */}
        {expanded && (
          <div className="border-t border-neutral-100 bg-neutral-50/60">
            <div className="px-4 py-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                  Camera Channels ({total})
                </p>
                {total > 0 && (
                  <span className="text-xs text-neutral-400">
                    {online} online · {offline} offline · {total - online - offline} unknown
                  </span>
                )}
              </div>

              {total === 0 ? (
                <div className="flex flex-col items-center py-8 text-center">
                  <Camera className="w-8 h-8 text-neutral-300 mb-2" />
                  <p className="text-sm font-medium text-neutral-500">No cameras in this group</p>
                  <p className="text-xs text-neutral-400 mt-1">
                    Sync the device to auto-discover camera channels.
                  </p>
                </div>
              ) : (
                /* Scrollable camera list — handles any number of cameras */
                <div className="space-y-1.5 max-h-75 overflow-y-auto pr-0.5">
                  {[...cameras]
                    .sort((a, b) => (a.channel || 0) - (b.channel || 0))
                    .map(cam => <CameraRow key={cam.id} camera={cam} onDelete={handleCameraDelete} />)
                  }
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Add Device Wizard ────────────────────────────────────────────────────────
function AddGroupWizard({ onCreated, onClose }) {
  const createMut = useCreateGroup();
  const [step, setStep]   = useState(1);
  const [form, setForm]   = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');
  const [showPass, setShowPass] = useState(false);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const selectedDevice = DEVICE_TYPES.find(d => d.value === form.deviceType);
  const channelCount   = parseInt(form.totalChannels) || 0;

  const canNext1   = form.name.trim() && form.host.trim();
  const canNext2   = form.username.trim() && form.password.trim();
  const canSubmit  = channelCount > 0 && channelCount <= 64;

  const handleCreate = async () => {
    setSaving(true);
    setError('');
    try {
      const group = await createMut.mutateAsync({
        name:          form.name.trim(),
        host:          form.host.trim(),
        port:          parseInt(form.port) || 554,
        httpPort:      parseInt(form.httpPort) || 80,
        username:      form.username.trim(),
        password:      form.password,
        deviceType:    form.deviceType,
        totalChannels: channelCount,
        location:      form.location.trim(),
      });
      onCreated(group);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to create device. Please check details and try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="text-base font-semibold text-neutral-900">
          Connect Camera Device
        </DialogTitle>
        <p className="text-sm text-neutral-500 mt-0.5">
          Add an NVR, DVR or IP device and all camera channels in one step.
        </p>
      </DialogHeader>

      {/* Step indicator */}
      <div className="flex items-center mt-3 mb-4">
        <StepDot step={1} current={step} label="Device" />
        <StepConnector done={step > 1} />
        <StepDot step={2} current={step} label="Credentials" />
        <StepConnector done={step > 2} />
        <StepDot step={3} current={step} label="Channels" />
      </div>

      {/* ── Step 1 ── */}
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">
              Device / Site Name <span className="text-red-500">*</span>
            </label>
            <Input
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder='e.g. "Office NVR", "Warehouse Gate"'
              autoFocus
            />
            <p className="text-xs text-neutral-400 mt-1">
              A label to identify this device in your dashboard.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">Device Type</label>
            <div className="grid grid-cols-2 gap-2">
              {DEVICE_TYPES.map(d => (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => set('deviceType', d.value)}
                  className={`p-3 rounded-xl border-2 text-left transition-all
                    ${form.deviceType === d.value
                      ? 'border-[#F7983A] bg-orange-50'
                      : 'border-neutral-200 hover:border-neutral-300 bg-white'
                    }`}
                >
                  <p className="font-semibold text-sm text-neutral-900">{d.label}</p>
                  <p className="text-xs text-neutral-400 mt-0.5 truncate">{d.hint}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                IP Address <span className="text-red-500">*</span>
              </label>
              <Input
                value={form.host}
                onChange={e => set('host', e.target.value)}
                placeholder="192.168.1.50 or 103.61.254.67"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">RTSP Port</label>
              <Input
                value={form.port}
                onChange={e => set('port', e.target.value)}
                placeholder="554"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">Location <span className="text-neutral-400 font-normal">(optional)</span></label>
            <Input
              value={form.location}
              onChange={e => set('location', e.target.value)}
              placeholder="e.g. 3rd Floor, Block B"
            />
          </div>
        </div>
      )}

      {/* ── Step 2 ── */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 bg-orange-50 border border-orange-200 rounded-xl p-3">
            <Cctv className="w-5 h-5 text-[#F7983A] shrink-0" />
            <div>
              <p className="text-sm font-semibold text-orange-900">{form.name}</p>
              <p className="text-xs text-orange-600 mt-0.5">
                {form.host}:{form.port} · {form.deviceType}
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">
              Username <span className="text-red-500">*</span>
            </label>
            <Input
              value={form.username}
              onChange={e => set('username', e.target.value)}
              placeholder="admin"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">
              Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Input
                type={showPass ? 'text' : 'password'}
                value={form.password}
                onChange={e => set('password', e.target.value)}
                placeholder="Camera / NVR password"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPass(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">
              HTTP Port <span className="text-neutral-400 font-normal">(web interface)</span>
            </label>
            <Input
              value={form.httpPort}
              onChange={e => set('httpPort', e.target.value)}
              placeholder="80"
            />
            <p className="text-xs text-neutral-400 mt-1">
              Used for the device's web interface — usually 80 or 8080.
            </p>
          </div>
        </div>
      )}

      {/* ── Step 3 ── */}
      {step === 3 && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="bg-neutral-50 border border-neutral-200 rounded-xl divide-y divide-neutral-100 text-sm overflow-hidden">
            {[
              ['Device',   form.name],
              ['IP',       `${form.host}:${form.port}`],
              ['Type',     <span className="capitalize">{form.deviceType}</span>],
              ['Location', form.location || <span className="text-neutral-400">—</span>],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between px-3 py-2">
                <span className="text-neutral-500">{k}</span>
                <span className="font-medium text-neutral-900">{v}</span>
              </div>
            ))}
          </div>

          {/* Channel count picker */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              How many camera channels does this device have?
            </label>
            <div className="grid grid-cols-5 gap-2 mb-3">
              {[1, 4, 8, 16, 32].map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => set('totalChannels', String(n))}
                  className={`h-10 rounded-xl border-2 text-sm font-semibold transition-all
                    ${channelCount === n
                      ? 'border-[#F7983A] bg-[#F7983A] text-white'
                      : 'border-neutral-200 text-neutral-700 hover:border-neutral-300 bg-white'
                    }`}
                >
                  {n}
                </button>
              ))}
            </div>
            <Input
              type="number"
              min="1"
              max="64"
              value={form.totalChannels}
              onChange={e => set('totalChannels', e.target.value)}
              placeholder="Custom (1–64)"
            />
            {channelCount > 64 && (
              <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> Maximum 64 channels allowed.
              </p>
            )}
            {channelCount <= 0 && form.totalChannels !== '' && (
              <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> Enter at least 1 channel.
              </p>
            )}
            {selectedDevice && channelCount > 0 && channelCount <= 64 && (
              <p className="text-xs text-neutral-400 mt-1">{selectedDevice.hint}</p>
            )}
          </div>

          {/* Preview */}
          {channelCount > 0 && channelCount <= 16 && (
            <div className="border border-neutral-200 rounded-xl overflow-hidden">
              <p className="text-xs font-semibold text-neutral-500 px-3 py-2 bg-neutral-50 border-b border-neutral-100 uppercase tracking-wider">
                Cameras to be created ({channelCount})
              </p>
              <div className="max-h-40 overflow-y-auto divide-y divide-neutral-50">
                {Array.from({ length: channelCount }, (_, i) => i + 1).map(ch => (
                  <div key={ch} className="flex items-center justify-between px-3 py-1.5 text-xs hover:bg-neutral-50">
                    <span className="text-neutral-700 font-medium">
                      {form.name} — Camera {String(ch).padStart(2, '0')}
                    </span>
                    <span className="text-neutral-400">Ch {ch}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {channelCount > 16 && channelCount <= 64 && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>
                <strong>{channelCount} cameras</strong> will be auto-provisioned. Preview hidden for large channel counts.
              </span>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              {error}
            </div>
          )}
        </div>
      )}

      <DialogFooter className="flex-row gap-2 mt-4">
        {step > 1 && (
          <Button
            variant="outline"
            onClick={() => setStep(s => s - 1)}
            className="flex-1 sm:flex-none"
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
        )}
        <Button
          variant="outline"
          onClick={onClose}
          className="flex-1 sm:flex-none"
        >
          Cancel
        </Button>
        {step < 3 ? (
          <Button
            onClick={() => setStep(s => s + 1)}
            disabled={step === 1 ? !canNext1 : !canNext2}
            className="bg-[#F7983A] hover:bg-[#E8882A] text-white flex-1 sm:flex-none"
          >
            Next <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        ) : (
          <Button
            onClick={handleCreate}
            disabled={saving || !canSubmit}
            className="bg-[#F7983A] hover:bg-[#E8882A] text-white flex-1 sm:flex-none"
          >
            {saving
              ? <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating…
                </span>
              : <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Create {channelCount} Camera{channelCount !== 1 ? 's' : ''}
                </span>
            }
          </Button>
        )}
      </DialogFooter>
    </DialogContent>
  );
}

// ─── Skeleton Loader ──────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 animate-pulse">
      <div className="flex items-center gap-4">
        <div className="w-4 h-4 rounded bg-neutral-200 shrink-0" />
        <div className="w-10 h-10 rounded-xl bg-neutral-200 shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-neutral-200 rounded w-1/3" />
          <div className="h-3 bg-neutral-100 rounded w-1/2" />
        </div>
        <div className="flex gap-1.5">
          <div className="w-8 h-8 rounded-lg bg-neutral-100" />
          <div className="w-8 h-8 rounded-lg bg-neutral-100" />
          <div className="w-8 h-8 rounded-lg bg-neutral-100" />
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function CameraGroups() {
  const { data: groups = [], isLoading, isError, error: fetchError } = useGroups({ refetchInterval: 30_000 });
  const deleteGroupMut = useDeleteGroup();
  const syncGroupMut   = useSyncGroup();

  const [wizardOpen,  setWizardOpen]  = useState(false);
  const [editTarget,  setEditTarget]  = useState(null);   // group being edited
  const [deleteTarget, setDeleteTarget] = useState(null); // group pending deletion
  const [deleting,    setDeleting]    = useState(false);
  const [search,      setSearch]      = useState('');
  const [notification, setNotification] = useState(null);

  // Auto-dismiss notification after 4 s
  useEffect(() => {
    if (!notification) return;
    const t = setTimeout(() => setNotification(null), 4000);
    return () => clearTimeout(t);
  }, [notification]);

  const notify = (note) => setNotification(note);

  // Filtered groups
  const filtered = search.trim()
    ? groups.filter(g =>
        g.name.toLowerCase().includes(search.toLowerCase()) ||
        g.host.toLowerCase().includes(search.toLowerCase()) ||
        (g.location || '').toLowerCase().includes(search.toLowerCase())
      )
    : groups;

  // Aggregate stats
  const totalCameras  = groups.reduce((s, g) => s + (g.cameras?.length || 0), 0);
  const onlineCameras = groups.reduce((s, g) => s + (g.cameras || []).filter(c => c.status === 'online').length, 0);
  const offlineCameras = totalCameras - onlineCameras;

  const handleCreated = () => {
    setWizardOpen(false);
    notify({ type: 'success', message: 'Device connected and cameras provisioned successfully.' });
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteGroupMut.mutateAsync(deleteTarget.id);
      notify({ type: 'success', message: `"${deleteTarget.name}" and all its cameras have been deleted.` });
    } catch {
      notify({ type: 'error', message: 'Failed to delete device. Please try again.' });
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const handleSync = async (groupId) => {
    try {
      await syncGroupMut.mutateAsync(groupId);
      notify({ type: 'success', message: 'Camera statuses refreshed.' });
    } catch {
      notify({ type: 'error', message: 'Sync failed. Check device connectivity.' });
    }
  };

  return (
    <div className="p-4 sm:p-6 bg-neutral-50 min-h-screen">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-2 h-8 bg-[#F7983A] rounded-full shrink-0" />
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900">
              Camera Devices
            </h1>
            <p className="text-sm text-neutral-500 mt-0.5">
              Manage NVR / DVR devices and their camera channels
            </p>
          </div>
        </div>
        <Button
          onClick={() => setWizardOpen(true)}
          className="bg-[#F7983A] hover:bg-[#E8882A] text-white w-full sm:w-auto shrink-0"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Device
        </Button>
      </div>

      {/* ── Notification Banner ── */}
      <Notification note={notification} onDismiss={() => setNotification(null)} />

      {/* ── API Error Banner ── */}
      {isError && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl border bg-red-50 border-red-200 text-sm text-red-800 mb-4">
          <ServerCrash className="w-4 h-4 mt-0.5 shrink-0 text-red-500" />
          <div>
            <p className="font-medium">Failed to load devices</p>
            <p className="text-xs text-red-600 mt-0.5">
              {fetchError?.message || 'Could not reach the server. Check your connection and try refreshing.'}
            </p>
          </div>
        </div>
      )}

      {/* ── Stats Bar ── */}
      {!isLoading && groups.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Total Devices',  value: groups.length,   sub: 'NVR / DVR / IP',       color: 'text-neutral-900' },
            { label: 'Total Cameras',  value: totalCameras,    sub: 'All channels',          color: 'text-neutral-900' },
            { label: 'Online',         value: onlineCameras,   sub: 'Cameras streaming',     color: 'text-green-600'   },
            { label: 'Offline',        value: offlineCameras,  sub: 'Need attention',        color: offlineCameras > 0 ? 'text-red-500' : 'text-neutral-400' },
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

      {/* ── Search bar (show when there are enough devices) ── */}
      {!isLoading && groups.length >= 4 && (
        <div className="relative mb-4">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, IP, or location…"
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

      {/* ── Device List ── */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
        </div>
      ) : groups.length === 0 ? (
        /* Empty state — no devices at all */
        <Card className="border-2 border-dashed border-neutral-200 shadow-none bg-white">
          <CardContent className="text-center py-16 px-8">
            <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Cctv className="w-8 h-8 text-[#F7983A]" />
            </div>
            <h3 className="text-base font-semibold text-neutral-900 mb-1">No devices connected</h3>
            <p className="text-sm text-neutral-500 max-w-xs mx-auto mb-6 leading-relaxed">
              Add your first NVR, DVR, or IP camera device. Camera channels are provisioned automatically.
            </p>
            <Button
              onClick={() => setWizardOpen(true)}
              className="bg-[#F7983A] hover:bg-[#E8882A] text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add First Device
            </Button>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        /* No search results */
        <div className="text-center py-16">
          <Search className="w-10 h-10 text-neutral-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-neutral-600">No devices match &ldquo;{search}&rdquo;</p>
          <button
            onClick={() => setSearch('')}
            className="text-xs text-[#F7983A] hover:underline mt-1"
          >
            Clear search
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(group => (
            <GroupCard
              key={group.id}
              group={group}
              onDelete={setDeleteTarget}
              onSync={handleSync}
              onEdit={setEditTarget}
              onNotify={notify}
            />
          ))}
          {search && (
            <p className="text-xs text-neutral-400 text-center pt-1">
              Showing {filtered.length} of {groups.length} devices
            </p>
          )}
        </div>
      )}

      {/* ── Add Device Wizard ── */}
      <Dialog open={wizardOpen} onOpenChange={setWizardOpen}>
        <AddGroupWizard
          onCreated={handleCreated}
          onClose={() => setWizardOpen(false)}
        />
      </Dialog>

      {/* ── Edit Device Dialog ── */}
      <EditGroupDialog
        group={editTarget}
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        onSaved={() => setEditTarget(null)}
        onNotify={notify}
      />

      {/* ── Delete Confirmation ── */}
      <DeleteConfirmDialog
        open={!!deleteTarget}
        deviceName={deleteTarget?.name || ''}
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
