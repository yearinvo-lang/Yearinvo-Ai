import React, { useState } from 'react';
import { X, Lock, Mail, User, Store, Phone, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { YearInfoLogo } from './YearInfoLogo.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import {
  firebaseSignUp,
  firebaseSignIn,
  firebaseResetPassword,
  firebaseSignInWithGoogle,
  firebaseSignInWithFacebook,
  formatFirebaseAuthError,
  auth as firebaseAuth,
} from '../lib/firebase.ts';

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
  const [successInfo, setSuccessInfo] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return; // Prevent duplicate submissions while in progress
    setError(null);
    setSuccessInfo(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        const cleanEmail = email.trim();
        if (!cleanEmail || !password) {
          setError('Please provide both email address and password.');
          return;
        }

        // 1. Authenticate with Firebase Authentication first
        let fbUser;
        try {
          fbUser = await firebaseSignIn(cleanEmail, password);
        } catch (fbErr: any) {
          // If Firebase Auth fails, report clear, user-friendly error
          setError(formatFirebaseAuthError(fbErr));
          return;
        }

        // 2. Sync session with server backend
        const res = await login(cleanEmail, password, fbUser.uid);
        if (res.success) {
          onSuccess(false);
        } else {
          setError(res.error || 'Account authentication succeeded, but workspace session synchronization failed.');
        }
      } else if (mode === 'register') {
        const cleanEmail = email.trim();
        const cleanName = name.trim();
        if (!cleanName || !cleanEmail || !password) {
          setError('Please fill in all required fields (Full Name, Email, and Password).');
          return;
        }

        if (password.length < 6) {
          setError('Password must be at least 6 characters long.');
          return;
        }

        // 1. Create real user in Firebase Authentication
        let fbUser;
        try {
          fbUser = await firebaseSignUp(cleanEmail, password, cleanName);
        } catch (fbErr: any) {
          setError(formatFirebaseAuthError(fbErr));
          return;
        }

        // 2. Once Firebase confirms account creation, provision workspace & server profile using authenticated user's UID
        const res = await register({
          name: cleanName,
          email: cleanEmail,
          password,
          businessName: businessName.trim() || undefined,
          phone: phone.trim() || undefined,
          uid: fbUser.uid,
        });

        if (res.success) {
          onSuccess(true);
        } else {
          setError(`Account created successfully, but workspace setup returned: ${res.error}`);
        }
      } else if (mode === 'forgot') {
        const cleanEmail = email.trim();
        if (!cleanEmail) {
          setError('Please enter your email address to receive password reset instructions.');
          return;
        }

        // Real Firebase Authentication sendPasswordResetEmail
        try {
          await firebaseResetPassword(cleanEmail);
          setResetSent(true);
        } catch (fbErr: any) {
          setError(formatFirebaseAuthError(fbErr));
        }
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred during authentication. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Google Login via real Firebase Auth
  const handleGoogleSignIn = async () => {
    if (loading) return;
    setError(null);
    setLoading(true);
    try {
      const fbUser = await firebaseSignInWithGoogle();
      if (!fbUser) {
        throw new Error('Google Sign-In returned empty user credentials.');
      }

      // Provision or retrieve user workspace session on server using authenticated UID
      const res = await register({
        name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Google User',
        email: fbUser.email!,
        password: `oauth_google_${fbUser.uid}`,
        businessName: `${fbUser.displayName || 'Google'}'s Workspace`,
        uid: fbUser.uid,
      });

      if (res.success) {
        onSuccess(true);
      } else {
        const loginRes = await login(fbUser.email!, `oauth_google_${fbUser.uid}`, fbUser.uid);
        if (loginRes.success) {
          onSuccess(false);
        } else {
          setError(loginRes.error || 'Failed to complete workspace login with Google credentials.');
        }
      }
    } catch (err: any) {
      setError(formatFirebaseAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  // Facebook Login via real Firebase Auth
  const handleFacebookSignIn = async () => {
    if (loading) return;
    setError(null);
    setLoading(true);
    try {
      const fbUser = await firebaseSignInWithFacebook();
      if (!fbUser) {
        throw new Error('Facebook Sign-In returned empty user credentials.');
      }

      const res = await register({
        name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Facebook User',
        email: fbUser.email || `fb_${fbUser.uid}@yearinfo.ai`,
        password: `oauth_facebook_${fbUser.uid}`,
        businessName: `${fbUser.displayName || 'Facebook'}'s Workspace`,
        uid: fbUser.uid,
      });

      if (res.success) {
        onSuccess(true);
      } else {
        const loginRes = await login(
          fbUser.email || `fb_${fbUser.uid}@yearinfo.ai`,
          `oauth_facebook_${fbUser.uid}`,
          fbUser.uid
        );
        if (loginRes.success) {
          onSuccess(false);
        } else {
          setError(loginRes.error || 'Failed to complete workspace login with Facebook credentials.');
        }
      }
    } catch (err: any) {
      setError(formatFirebaseAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-md max-h-[90dvh] flex flex-col rounded-2xl border border-purple-500/30 bg-slate-900 shadow-2xl shadow-purple-950/40 animate-in fade-in zoom-in-95 my-auto">
        {/* Sticky Header with Close Button */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-800/80 bg-slate-900/95 px-5 py-3.5 backdrop-blur-md rounded-t-2xl">
          <div className="flex items-center gap-2">
            <YearInfoLogo size="sm" showText={false} />
            <span className="text-xs font-bold uppercase tracking-wider text-purple-300">YEAR INFO AI</span>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Content Container */}
        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6 overscroll-contain">
          <div className="text-center mb-5">
            <h2 className="text-xl sm:text-2xl font-black text-white">
              {mode === 'login' && 'Welcome to YEAR INFO AI'}
              {mode === 'register' && 'Create Your Business Workspace'}
              {mode === 'forgot' && 'Reset Your Password'}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              {mode === 'login' && 'Sign in to access your unified messaging and sales hub.'}
              {mode === 'register' && 'Start managing multi-channel conversations with AI.'}
              {mode === 'forgot' && 'Enter your email to receive secure password recovery instructions.'}
            </p>
          </div>

          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          {resetSent ? (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center">
              <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-400 mb-2" />
              <div className="text-sm font-bold text-white">Password Reset Email Dispatched</div>
              <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                Password recovery instructions have been dispatched to <strong className="text-purple-300">{email}</strong>. Please check your inbox and spam folder, then follow the reset link to choose a new password.
              </p>
              <button
                onClick={() => { setMode('login'); setResetSent(false); }}
                className="mt-4 rounded-xl bg-slate-800 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700 transition"
              >
                Back to Sign In
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
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
                        onClick={() => { setMode('forgot'); setError(null); }}
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
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 py-2.5 text-xs font-bold text-white shadow-lg shadow-purple-600/30 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 transition"
              >
                {loading ? (
                  <span>Processing...</span>
                ) : (
                  <>
                    <span>
                      {mode === 'login' && 'Sign In to Workspace'}
                      {mode === 'register' && 'Create Business Account'}
                      {mode === 'forgot' && 'Send Password Recovery Email'}
                    </span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Real OAuth Providers (Google & Facebook via Firebase Auth) */}
          {mode !== 'forgot' && (
            <div className="mt-4 space-y-2">
              <div className="relative flex items-center justify-center my-3">
                <div className="border-t border-slate-800 w-full" />
                <span className="bg-slate-900 px-2 text-[10px] uppercase font-bold text-slate-500 absolute">or continue with</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 hover:text-white transition disabled:opacity-50"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Google</span>
                </button>

                <button
                  type="button"
                  onClick={handleFacebookSignIn}
                  disabled={loading}
                  className="flex items-center justify-center gap-2 rounded-xl border border-blue-500/30 bg-blue-600/10 py-2 text-xs font-semibold text-blue-300 hover:bg-blue-600/20 transition disabled:opacity-50"
                >
                  <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                  <span>Facebook</span>
                </button>
              </div>
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
    </div>
  );
};

