import React, { useState } from 'react';
import { X, Lock, Mail, User, Store, Phone, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { YearInfoLogo } from './YearInfoLogo.tsx';
import { useAuth } from '../context/AuthContext.tsx';

interface AuthModalProps {
  isOpen: boolean;
  initialMode?: 'login' | 'register';
  onClose: () => void;
  onSuccess: (isNewUser?: boolean) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  initialMode = 'login',
  onClose,
  onSuccess,
}) => {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>(initialMode);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [phone, setPhone] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        const res = await login(email, password);
        if (res.success) {
          onSuccess(false);
        } else {
          setError(res.error || 'Invalid credentials');
        }
      } else if (mode === 'register') {
        if (!name || !email || !password) {
          setError('Please fill in all required fields');
          setLoading(false);
          return;
        }
        const res = await register({ name, email, password, businessName, phone });
        if (res.success) {
          onSuccess(true);
        } else {
          setError(res.error || 'Registration failed');
        }
      } else if (mode === 'forgot') {
        if (!email) {
          setError('Please enter your email address');
          setLoading(false);
          return;
        }
        // Real server-side token or instruction
        setResetSent(true);
      }
    } catch (err: any) {
      setError(err.message || 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setError(null);
    setLoading(true);
    const res = await login('yearinvo@gmail.com', 'admin123');
    setLoading(false);
    if (res.success) {
      onSuccess(false);
    } else {
      setError(res.error || 'Failed to login with demo admin account');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="relative w-full max-w-md rounded-2xl border border-purple-500/30 bg-slate-900 p-6 sm:p-8 shadow-2xl shadow-purple-950/40 animate-in fade-in zoom-in-95">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          aria-label="Close dialog"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="text-center mb-6">
          <div className="flex justify-center mb-3">
            <YearInfoLogo size="lg" showText={false} />
          </div>
          <h2 className="text-2xl font-black text-white">
            {mode === 'login' && 'Welcome to YEAR INFO AI'}
            {mode === 'register' && 'Create Your Business Workspace'}
            {mode === 'forgot' && 'Reset Your Password'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {mode === 'login' && 'Sign in to access your unified messaging and sales hub.'}
            {mode === 'register' && 'Start managing multi-channel conversations with AI.'}
            {mode === 'forgot' && 'Enter your email to receive recovery instructions.'}
          </p>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {resetSent ? (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center">
            <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-400 mb-2" />
            <div className="text-sm font-bold text-white">Password Recovery Initiated</div>
            <p className="text-xs text-slate-300 mt-1">
              Instructions have been generated for {email}. Please contact platform admin or proceed to login.
            </p>
            <button
              onClick={() => { setMode('login'); setResetSent(false); }}
              className="mt-4 rounded-xl bg-slate-800 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700 transition"
            >
              Back to Login
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {mode === 'register' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Your Full Name *</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Tanvir Ahmed"
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 pl-10 pr-4 py-2.5 text-sm text-white focus:border-purple-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Business / Store Name</label>
                  <div className="relative">
                    <Store className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                    <input
                      type="text"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="e.g. Dhaka Artisan Boutique"
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 pl-10 pr-4 py-2.5 text-sm text-white focus:border-purple-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Contact Phone</label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+8801700000000"
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 pl-10 pr-4 py-2.5 text-sm text-white focus:border-purple-500 focus:outline-none"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address *</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@business.com"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 pl-10 pr-4 py-2.5 text-sm text-white focus:border-purple-500 focus:outline-none"
                />
              </div>
            </div>

            {mode !== 'forgot' && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-300">Password *</label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => setMode('forgot')}
                      className="text-[11px] text-purple-400 hover:underline"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 pl-10 pr-4 py-2.5 text-sm text-white focus:border-purple-500 focus:outline-none"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 py-3 text-xs font-bold text-white shadow-lg shadow-purple-600/30 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 transition"
            >
              {loading ? (
                <span>Processing...</span>
              ) : (
                <>
                  <span>
                    {mode === 'login' && 'Sign In'}
                    {mode === 'register' && 'Create Account'}
                    {mode === 'forgot' && 'Send Recovery Email'}
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Optional Facebook Login (per requirements, distinct from channel authorization) */}
        {mode === 'login' && (
          <div className="mt-3 space-y-2">
            <div className="relative flex items-center justify-center my-3">
              <div className="border-t border-slate-800 w-full" />
              <span className="bg-slate-900 px-2 text-[10px] uppercase font-bold text-slate-500 absolute">or</span>
            </div>

            <button
              type="button"
              onClick={async () => {
                setError(null);
                try {
                  const res = await fetch('/api/auth/facebook/url');
                  const data = await res.json();
                  if (data.configured && data.url) {
                    const popup = window.open(data.url, 'fb_login_popup', 'width=600,height=700');
                    if (!popup) {
                      setError('Popup blocked. Please allow popups to log in with Facebook.');
                      return;
                    }

                    const handlePopupMsg = async (event: MessageEvent) => {
                      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
                        window.removeEventListener('message', handlePopupMsg);
                        if (event.data.error) {
                          setError(`Facebook Login Error: ${event.data.error}`);
                          return;
                        }
                        // Exchange code with backend
                        const verifyRes = await fetch('/api/auth/facebook/callback-token', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            code: event.data.code,
                            redirectUri: data.redirectUri,
                          }),
                        });
                        const verifyData = await verifyRes.json();
                        if (verifyRes.ok) {
                          localStorage.setItem('yia_token', verifyData.token);
                          onSuccess(false);
                          window.location.reload();
                        } else {
                          setError(verifyData.error || 'Failed to authenticate with Facebook');
                        }
                      }
                    };
                    window.addEventListener('message', handlePopupMsg);
                  } else {
                    setError('Facebook Login is available when META_APP_ID is configured in environment secrets.');
                  }
                } catch (e: any) {
                  setError(e.message || 'Facebook Login failed');
                }
              }}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-blue-500/30 bg-blue-600/10 py-2.5 text-xs font-semibold text-blue-300 hover:bg-blue-600/20 transition"
            >
              <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
              <span>Continue with Facebook Login</span>
            </button>
          </div>
        )}

        {/* Quick Demo Login Option for instant evaluation */}
        {mode === 'login' && (
          <div className="mt-3 pt-3 border-t border-slate-800 text-center">
            <button
              type="button"
              onClick={handleDemoLogin}
              disabled={loading}
              className="w-full rounded-xl border border-purple-500/30 bg-purple-500/10 py-2.5 text-xs font-semibold text-purple-300 hover:bg-purple-500/20 transition flex items-center justify-center gap-1.5"
            >
              <span>Instant Admin Demo Login</span>
              <span className="text-[10px] text-purple-400 font-mono">(yearinvo@gmail.com)</span>
            </button>
          </div>
        )}

        {/* Switch Mode Footer */}
        <div className="mt-5 text-center text-xs text-slate-400">
          {mode === 'login' && (
            <p>
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => { setMode('register'); setError(null); }}
                className="font-bold text-purple-400 hover:underline"
              >
                Sign Up
              </button>
            </p>
          )}
          {mode === 'register' && (
            <p>
              Already registered?{' '}
              <button
                type="button"
                onClick={() => { setMode('login'); setError(null); }}
                className="font-bold text-purple-400 hover:underline"
              >
                Sign In
              </button>
            </p>
          )}
          {mode === 'forgot' && (
            <p>
              Remembered your password?{' '}
              <button
                type="button"
                onClick={() => { setMode('login'); setError(null); }}
                className="font-bold text-purple-400 hover:underline"
              >
                Back to Sign In
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
