import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, Mail, Lock, User, AlertCircle, CheckCircle2 } from 'lucide-react';
import logo from '../assets/logo.png';
import { useAuthStore } from '@/store/authStore';


function PasswordStrength({ password }) {
  if (!password) return null;
  const checks = [
    { label: 'At least 8 characters', ok: password.length >= 8 },
    { label: 'Uppercase letter', ok: /[A-Z]/.test(password) },
    { label: 'Lowercase letter', ok: /[a-z]/.test(password) },
    { label: 'Number', ok: /\d/.test(password) },
  ];
  const passed = checks.filter((c) => c.ok).length;
  const bars = ['', 'bg-red-400', 'bg-yellow-400', 'bg-blue-400', 'bg-green-500'];
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  return (
    <div className="mt-2.5">
      <div className="flex items-center gap-1.5 mb-1.5">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-200 ${i <= passed ? bars[passed] : 'bg-neutral-200'}`} />
        ))}
        <span className="text-xs text-neutral-500 w-10 text-right">{labels[passed]}</span>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-0.5">
        {checks.map((c) => (
          <span key={c.label} className={`text-xs flex items-center gap-1 ${c.ok ? 'text-green-600' : 'text-neutral-400'}`}>
            {c.ok ? '✓' : '○'} {c.label}
          </span>
        ))}
      </div>
    </div>
  );
}

const FEATURES = [
  { icon: '📹', text: 'Connect unlimited cameras on premium plans' },
  { icon: '☁️', text: 'Cloud recording with S3 storage' },
  { icon: '🗺️', text: 'Live map view and site monitoring' },
  { icon: '⏱️', text: 'Timelapse generation and playback' },
  { icon: '🔔', text: 'Real-time alerts and notifications' },
  { icon: '🔒', text: 'Enterprise-grade security' },
];

export default function Register() {
  const navigate = useNavigate();
  const register = useAuthStore((s) => s.register);

  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const set = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setFieldErrors((fe) => ({ ...fe, [field]: '' }));
    setError('');
  };

  const isPasswordValid =
    form.password.length >= 8 &&
    /[A-Z]/.test(form.password) &&
    /[a-z]/.test(form.password) &&
    /\d/.test(form.password);

  const validate = () => {
    const errs = {};
    if (!form.name.trim() || form.name.trim().length < 2) errs.name = 'Full name must be at least 2 characters.';
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Enter a valid email address.';
    if (!isPasswordValid) errs.password = 'Password must be at least 8 characters with uppercase, lowercase, and a number.';
    if (!agreed) errs.terms = 'You must agree to the Terms of Service to continue.';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }

    setLoading(true);
    try {
      await register({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });

      // authStore.register() handles all token storage and state update
      setSuccess(true);
      setTimeout(() => navigate('/home'), 1500);
    } catch (err) {
      const msg = err.response?.data?.message;
      const status = err.response?.status;
      if (status === 409) {
        setFieldErrors({ email: 'An account with this email already exists.' });
      } else if (status === 422 || status === 400) {
        setError(msg || 'Please check your details and try again.');
      } else {
        setError(msg || 'Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
          </div>
          <h2 className="text-xl font-bold text-neutral-900 mb-2">Account created!</h2>
          <p className="text-neutral-500 text-sm">Taking you to your dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left — Form */}
      <div className="flex items-center justify-center p-8 bg-white overflow-y-auto">
        <div className="w-full max-w-md py-4">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">
            <img src={logo} alt="Drishyam" className="w-12 h-12 rounded-xl object-contain shrink-0" />
            <div>
              <span className="text-2xl font-bold text-neutral-900">Drishyam</span>
              <span className="ml-2 text-xs font-medium bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">Free plan included</span>
            </div>
          </div>

          <div className="mb-7">
            <h1 className="text-3xl font-bold text-neutral-900 mb-2">Create your account</h1>
            <p className="text-neutral-600">Start monitoring your sites in minutes. No credit card required.</p>
          </div>

          {/* Global error */}
          {error && (
            <div className="flex items-start gap-3 p-4 mb-5 text-sm text-red-600 bg-red-50 rounded-lg border border-red-200">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-neutral-900 mb-1.5">Full name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                <Input
                  type="text"
                  value={form.name}
                  onChange={set('name')}
                  placeholder="Your full name"
                  className={`pl-11 h-12 ${fieldErrors.name ? 'border-red-400 focus-visible:ring-red-300' : ''}`}
                  autoComplete="name"
                  autoFocus
                />
              </div>
              {fieldErrors.name && <p className="mt-1.5 text-xs text-red-500">{fieldErrors.name}</p>}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-neutral-900 mb-1.5">Work email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                <Input
                  type="email"
                  value={form.email}
                  onChange={set('email')}
                  placeholder="you@company.com"
                  className={`pl-11 h-12 ${fieldErrors.email ? 'border-red-400 focus-visible:ring-red-300' : ''}`}
                  autoComplete="email"
                />
              </div>
              {fieldErrors.email && <p className="mt-1.5 text-xs text-red-500">{fieldErrors.email}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-neutral-900 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={set('password')}
                  placeholder="Create a strong password"
                  className={`pl-11 pr-11 h-12 ${fieldErrors.password ? 'border-red-400 focus-visible:ring-red-300' : ''}`}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {fieldErrors.password && <p className="mt-1.5 text-xs text-red-500">{fieldErrors.password}</p>}
              <PasswordStrength password={form.password} />
            </div>

            {/* Terms */}
            <div>
              <div className="flex items-start gap-3">
                {/* Real checkbox — visible, properly associated via id/htmlFor */}
                <input
                  id="agree-terms"
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => {
                    setAgreed(e.target.checked);
                    setFieldErrors((fe) => ({ ...fe, terms: '' }));
                  }}
                  className={`mt-1 w-4 h-4 rounded accent-[#F7983A] cursor-pointer shrink-0
                    ${fieldErrors.terms ? 'ring-2 ring-red-400 ring-offset-1' : ''}`}
                />
                <label htmlFor="agree-terms" className="text-sm text-neutral-600 leading-snug cursor-pointer select-none">
                  I agree to the{' '}
                  <a
                    href="#"
                    className="text-[#F7983A] hover:underline font-medium"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  >
                    Terms of Service
                  </a>
                  {' '}and{' '}
                  <a
                    href="#"
                    className="text-[#F7983A] hover:underline font-medium"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  >
                    Privacy Policy
                  </a>
                </label>
              </div>
              {fieldErrors.terms && (
                <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  {fieldErrors.terms}
                </p>
              )}
            </div>

            {/* Submit */}
            <Button
              type="submit"
              className="w-full h-12 bg-[#F7983A] hover:bg-orange-600 text-white font-semibold text-base"
              disabled={loading}
            >
              {loading ? 'Creating account…' : 'Create free account'}
            </Button>

            <p className="text-center text-neutral-600 text-sm">
              Already have an account?{' '}
              <Link to="/login" className="text-[#F7983A] hover:text-orange-600 font-medium">
                Sign in
              </Link>
            </p>
          </form>
        </div>
      </div>

      {/* Right — Feature highlights */}
      <div className="hidden lg:flex flex-col relative bg-neutral-900 overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1920&q=80"
          alt="Construction site monitoring"
          className="absolute inset-0 w-full h-full object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-orange-600/40 to-neutral-900/80" />

        <div className="relative z-10 flex flex-col justify-center h-full p-12">
          <div className="mb-10">
            <h2 className="text-3xl font-bold text-white mb-3 leading-snug">
              Everything you need to monitor your sites
            </h2>
            <p className="text-orange-200 text-base">
              Smart-Cam gives construction teams complete visibility — from anywhere in the world.
            </p>
          </div>

          <ul className="space-y-4">
            {FEATURES.map(({ icon, text }) => (
              <li key={text} className="flex items-center gap-3">
                <span className="text-xl">{icon}</span>
                <span className="text-white/85 text-sm">{text}</span>
              </li>
            ))}
          </ul>

          <div className="mt-10 pt-8 border-t border-white/20">
            <p className="text-white/60 text-xs">
              Free plan includes 2 cameras · No credit card needed · Cancel anytime
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
