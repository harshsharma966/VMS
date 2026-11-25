import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

function PasswordStrength({ password }) {
  if (!password) return null;

  const checks = [
    { label: 'At least 8 characters', ok: password.length >= 8 },
    { label: 'Uppercase letter (A-Z)', ok: /[A-Z]/.test(password) },
    { label: 'Lowercase letter (a-z)', ok: /[a-z]/.test(password) },
    { label: 'Number (0-9)', ok: /\d/.test(password) },
  ];

  const passed = checks.filter((c) => c.ok).length;
  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'][passed];
  const strengthColor = ['', 'bg-red-500', 'bg-yellow-500', 'bg-blue-500', 'bg-green-500'][passed];

  return (
    <div className="mt-3 space-y-2">
      {/* Strength bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-neutral-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${strengthColor}`}
            style={{ width: `${(passed / 4) * 100}%` }}
          />
        </div>
        <span className="text-xs font-medium text-neutral-500 w-12">{strengthLabel}</span>
      </div>
      {/* Checklist */}
      <ul className="space-y-1">
        {checks.map((c) => (
          <li key={c.label} className={`flex items-center gap-2 text-xs ${c.ok ? 'text-green-600' : 'text-neutral-400'}`}>
            <span className={`w-3 h-3 rounded-full flex items-center justify-center text-[10px] ${c.ok ? 'bg-green-100' : 'bg-neutral-100'}`}>
              {c.ok ? '✓' : ''}
            </span>
            {c.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const resetPassword = useAuthStore((s) => s.resetPassword);

  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [status, setStatus] = useState('idle'); // idle | loading | success | error
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMsg('This reset link is invalid. Please request a new one.');
    }
  }, [token]);

  const isValid = password.length >= 8 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /\d/.test(password);
  const matches = password === confirm;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!isValid) {
      setErrorMsg('Please choose a stronger password that meets all requirements.');
      return;
    }
    if (!matches) {
      setErrorMsg('Passwords do not match. Please check and try again.');
      return;
    }

    setStatus('loading');
    try {
      await resetPassword(token, password);
      setStatus('success');
    } catch (err) {
      setStatus('error');
      const msg = err.response?.data?.message;
      setErrorMsg(
        msg || 'This reset link has expired or is no longer valid. Please request a new one.'
      );
    }
  };

  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 p-8">
        <div className="w-full max-w-md text-center">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-green-500" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-neutral-900 mb-3">Password reset!</h1>
          <p className="text-neutral-600 mb-8">
            Your password has been changed successfully. You can now sign in with your new password.
            All other sessions have been logged out for your security.
          </p>
          <Button
            onClick={() => navigate('/login')}
            className="w-full h-12 bg-[#F7983A] hover:bg-orange-600 text-white font-semibold"
          >
            Sign in to Smart-Cam
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left Side - Form */}
      <div className="flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="text-2xl font-bold text-neutral-900">Smart-Cam</span>
          </div>

          <Link to="/login" className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-700 mb-8">
            <ArrowLeft className="w-4 h-4" />
            Back to login
          </Link>

          <div className="mb-8">
            <h1 className="text-3xl font-bold text-neutral-900 mb-2">Create new password</h1>
            <p className="text-neutral-600">Choose a strong password to keep your account secure.</p>
          </div>

          {/* Invalid token state */}
          {!token && status === 'error' ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 text-sm text-red-600 bg-red-50 rounded-lg border border-red-200">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{errorMsg}</span>
              </div>
              <Link to="/forgot-password">
                <Button className="w-full h-12 bg-[#F7983A] hover:bg-orange-600 text-white font-semibold">
                  Request a new reset link
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Error banner */}
              {errorMsg && (
                <div className="flex items-start gap-3 p-4 text-sm text-red-600 bg-red-50 rounded-lg border border-red-200">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <div>
                    <span>{errorMsg}</span>
                    {status === 'error' && (
                      <span className="block mt-1">
                        <Link to="/forgot-password" className="text-[#F7983A] hover:text-orange-600 font-medium underline">
                          Request a new link →
                        </Link>
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* New Password */}
              <div>
                <label className="block text-sm font-medium text-neutral-900 mb-2">New password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a strong password"
                    className="pl-11 pr-11 h-12"
                    required
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <PasswordStrength password={password} />
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-medium text-neutral-900 mb-2">Confirm password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                  <Input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Repeat your new password"
                    className={`pl-11 pr-11 h-12 ${confirm && !matches ? 'border-red-400 focus-visible:ring-red-300' : ''}`}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                  >
                    {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {confirm && !matches && (
                  <p className="mt-1.5 text-xs text-red-500">Passwords don't match</p>
                )}
                {confirm && matches && password && (
                  <p className="mt-1.5 text-xs text-green-600 flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-green-100 flex items-center justify-center text-[10px]">✓</span>
                    Passwords match
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full h-12 bg-[#F7983A] hover:bg-orange-600 text-white font-semibold text-base"
                disabled={status === 'loading' || !isValid || !matches}
              >
                {status === 'loading' ? 'Resetting password...' : 'Reset password'}
              </Button>
            </form>
          )}
        </div>
      </div>

      {/* Right Side - Image */}
      <div className="hidden lg:block relative bg-neutral-900">
        <img
          src="https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=1920&q=80"
          alt="Construction site"
          className="w-full h-full object-cover opacity-90"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/20 to-transparent" />
      </div>
    </div>
  );
}
