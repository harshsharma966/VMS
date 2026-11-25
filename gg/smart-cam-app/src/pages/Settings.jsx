import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuthStore } from '@/store/authStore';
import { useNavigate } from 'react-router-dom';
import {
  User, Lock, LogOut, Eye, EyeOff, CheckCircle2, AlertCircle,
  Shield, Key, Camera, Save,
} from 'lucide-react';

// ------- Toast helper -------
function Toast({ toast }) {
  if (!toast) return null;
  const isSuccess = toast.type === 'success';
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium transition-all duration-300
      ${isSuccess ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
      {isSuccess
        ? <CheckCircle2 className="w-4 h-4 shrink-0" />
        : <AlertCircle className="w-4 h-4 shrink-0" />}
      {toast.message}
    </div>
  );
}

// ------- Password strength indicator -------
function PasswordStrength({ password }) {
  if (!password) return null;
  const checks = [
    { label: '8+ characters', ok: password.length >= 8 },
    { label: 'Uppercase', ok: /[A-Z]/.test(password) },
    { label: 'Lowercase', ok: /[a-z]/.test(password) },
    { label: 'Number', ok: /\d/.test(password) },
  ];
  const passed = checks.filter((c) => c.ok).length;
  const colors = ['bg-neutral-200', 'bg-red-400', 'bg-yellow-400', 'bg-blue-400', 'bg-green-400'];
  return (
    <div className="mt-2">
      <div className="flex gap-1 mb-1">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i <= passed ? colors[passed] : 'bg-neutral-200'}`} />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5">
        {checks.map((c) => (
          <span key={c.label} className={`text-xs ${c.ok ? 'text-green-600' : 'text-neutral-400'}`}>
            {c.ok ? '✓' : '○'} {c.label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ------- Section Card -------
function Card({ children, className = '' }) {
  return (
    <div className={`bg-card border border-border rounded-xl p-6 ${className}`}>
      {children}
    </div>
  );
}

function SectionTitle({ icon: Icon, title, description }) {
  return (
    <div className="flex items-start gap-3 mb-6">
      <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <div>
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        {description && <p className="text-sm text-muted-foreground mt-0.5">{description}</p>}
      </div>
    </div>
  );
}

// ------- Profile Section -------
function ProfileSection({ user, onToast }) {
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [loading, setLoading] = useState(false);

  const isDirty = name !== (user?.name || '') || email !== (user?.email || '');

  const handleSave = async (e) => {
    e.preventDefault();
    if (!isDirty) return;

    const updates = {};
    if (name !== user?.name) updates.name = name.trim();
    if (email !== user?.email) updates.email = email.trim().toLowerCase();

    if (!updates.name && !updates.email) return;
    if (updates.name && updates.name.length < 2) {
      onToast({ type: 'error', message: 'Name must be at least 2 characters.' });
      return;
    }
    if (updates.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(updates.email)) {
      onToast({ type: 'error', message: 'Please enter a valid email address.' });
      return;
    }

    setLoading(true);
    try {
      await updateProfile(updates);
      onToast({ type: 'success', message: 'Profile updated successfully.' });
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update profile. Please try again.';
      onToast({ type: 'error', message: msg });
    } finally {
      setLoading(false);
    }
  };

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  return (
    <Card>
      <SectionTitle icon={User} title="Profile Information" description="Update your name and email address." />

      {/* Avatar display */}
      <div className="flex items-center gap-4 mb-6 pb-6 border-b border-border">
        <Avatar className="w-14 h-14">
          <AvatarFallback className="bg-primary text-primary-foreground text-lg font-bold">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium text-foreground">{user?.name || 'User'}</p>
          <p className="text-sm text-muted-foreground">{user?.email || ''}</p>
          <span className="inline-flex items-center gap-1 mt-1 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
            <Shield className="w-3 h-3" />
            {user?.role === 'admin' ? 'Administrator' : 'User'}
          </span>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Full name</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your full name"
            className="h-11"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Email address</label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            className="h-11"
          />
          <p className="text-xs text-muted-foreground mt-1.5">Changing your email requires you to log in again.</p>
        </div>
        <div className="flex justify-end pt-2">
          <Button
            type="submit"
            disabled={loading || !isDirty}
            className="bg-primary hover:bg-primary/90 text-primary-foreground h-10 px-5"
          >
            <Save className="w-4 h-4 mr-2" />
            {loading ? 'Saving...' : 'Save changes'}
          </Button>
        </div>
      </form>
    </Card>
  );
}

// ------- Change Password Section -------
function ChangePasswordSection({ onToast }) {
  const changePassword = useAuthStore((s) => s.changePassword);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const [current, setCurrent] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState({ current: false, new: false, confirm: false });
  const [loading, setLoading] = useState(false);

  const isNewValid = newPwd.length >= 8 && /[A-Z]/.test(newPwd) && /[a-z]/.test(newPwd) && /\d/.test(newPwd);
  const matches = newPwd === confirm;

  const toggle = (field) => setShow((s) => ({ ...s, [field]: !s[field] }));

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!current) {
      onToast({ type: 'error', message: 'Please enter your current password.' });
      return;
    }
    if (!isNewValid) {
      onToast({ type: 'error', message: 'New password doesn\'t meet security requirements.' });
      return;
    }
    if (!matches) {
      onToast({ type: 'error', message: 'New passwords don\'t match. Please check and try again.' });
      return;
    }
    if (current === newPwd) {
      onToast({ type: 'error', message: 'New password must be different from your current password.' });
      return;
    }

    setLoading(true);
    try {
      await changePassword(current, newPwd);
      onToast({ type: 'success', message: 'Password changed! Logging you out of all sessions...' });
      setCurrent(''); setNewPwd(''); setConfirm('');
      // Logout after password change (server revoked all tokens)
      setTimeout(async () => {
        await logout();
        navigate('/login');
      }, 1800);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to change password. Please try again.';
      if (err.response?.status === 401) {
        onToast({ type: 'error', message: 'Current password is incorrect. Please try again.' });
      } else {
        onToast({ type: 'error', message: msg });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <SectionTitle icon={Lock} title="Change Password" description="Keep your account secure with a strong, unique password." />
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Current password */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Current password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type={show.current ? 'text' : 'password'}
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              placeholder="Enter current password"
              className="pl-10 pr-10 h-11"
            />
            <button type="button" onClick={() => toggle('current')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              {show.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <div className="text-right mt-1">
            <a href="/forgot-password" className="text-xs text-primary hover:underline">Forgot password?</a>
          </div>
        </div>

        {/* New password */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">New password</label>
          <div className="relative">
            <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type={show.new ? 'text' : 'password'}
              value={newPwd}
              onChange={(e) => setNewPwd(e.target.value)}
              placeholder="Create a strong password"
              className="pl-10 pr-10 h-11"
            />
            <button type="button" onClick={() => toggle('new')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              {show.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <PasswordStrength password={newPwd} />
        </div>

        {/* Confirm new password */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Confirm new password</label>
          <div className="relative">
            <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type={show.confirm ? 'text' : 'password'}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repeat your new password"
              className={`pl-10 pr-10 h-11 ${confirm && !matches ? 'border-red-400' : ''}`}
            />
            <button type="button" onClick={() => toggle('confirm')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              {show.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {confirm && !matches && (
            <p className="text-xs text-red-500 mt-1">Passwords don't match</p>
          )}
          {confirm && matches && newPwd && (
            <p className="text-xs text-green-600 mt-1">✓ Passwords match</p>
          )}
        </div>

        <div className="flex justify-end pt-2">
          <Button
            type="submit"
            disabled={loading || !current || !isNewValid || !matches}
            className="bg-primary hover:bg-primary/90 text-primary-foreground h-10 px-5"
          >
            {loading ? 'Changing...' : 'Change password'}
          </Button>
        </div>
      </form>
    </Card>
  );
}

// ------- Account Info Section -------
function AccountInfoSection({ user }) {
  return (
    <Card>
      <SectionTitle icon={Shield} title="Account Details" description="Your account information and subscription." />
      <div className="space-y-3">
        <div className="flex items-center justify-between py-2.5 border-b border-border">
          <span className="text-sm text-muted-foreground">Account ID</span>
          <span className="text-sm font-mono text-foreground">{user?.id ? user.id.slice(0, 8) + '...' : '—'}</span>
        </div>
        <div className="flex items-center justify-between py-2.5 border-b border-border">
          <span className="text-sm text-muted-foreground">Role</span>
          <span className="text-sm font-medium text-foreground capitalize">{user?.role || 'user'}</span>
        </div>
        <div className="flex items-center justify-between py-2.5 border-b border-border">
          <span className="text-sm text-muted-foreground">Plan</span>
          <span className="text-sm font-medium text-foreground">
            {user?.subscription?.plan?.name || 'Free'}
          </span>
        </div>
        <div className="flex items-center justify-between py-2.5 border-b border-border">
          <span className="text-sm text-muted-foreground">Max cameras</span>
          <span className="text-sm text-foreground">
            {user?.subscription?.plan?.maxCameras ?? '—'}
          </span>
        </div>
        <div className="flex items-center justify-between py-2.5">
          <span className="text-sm text-muted-foreground">Member since</span>
          <span className="text-sm text-foreground">
            {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long' }) : '—'}
          </span>
        </div>
      </div>
    </Card>
  );
}

// ------- Danger Zone -------
function DangerZone({ onToast }) {
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    await logout();
    navigate('/login');
  };

  return (
    <Card className="border-red-200 dark:border-red-900/40">
      <SectionTitle icon={LogOut} title="Sign Out" description="Log out from your current session." />
      <p className="text-sm text-muted-foreground mb-4">
        This will sign you out of Smart-Cam on this device. Your data and cameras remain safe.
      </p>
      <Button
        onClick={handleLogout}
        disabled={loading}
        variant="outline"
        className="border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/30 h-10"
      >
        <LogOut className="w-4 h-4 mr-2" />
        {loading ? 'Signing out...' : 'Sign out'}
      </Button>
    </Card>
  );
}

// ------- Main Settings Page -------
export default function Settings() {
  const user = useAuthStore((s) => s.user);
  const [toast, setToast] = useState(null);

  const showToast = (t) => {
    setToast(t);
    setTimeout(() => setToast(null), 3500);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Page header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
            <Camera className="w-4 h-4 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        </div>
        <p className="text-muted-foreground text-sm ml-11">Manage your account, profile, and security.</p>
      </div>

      <div className="space-y-6">
        <ProfileSection user={user} onToast={showToast} />
        <ChangePasswordSection onToast={showToast} />
        <AccountInfoSection user={user} />
        <DangerZone onToast={showToast} />
      </div>

      <Toast toast={toast} />
    </div>
  );
}
