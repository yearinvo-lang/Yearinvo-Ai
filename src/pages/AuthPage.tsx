import React, { useState } from 'react';
import {
  Lock,
  Mail,
  User,
  Store,
  Phone,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Sun,
  Moon,
  Globe,
  Sparkles,
  ShieldCheck,
  Bot,
  MessageSquare,
  TrendingUp,
} from 'lucide-react';
import { YearInfoLogo } from '../components/YearInfoLogo.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import {
  firebaseSignUp,
  firebaseSignIn,
  firebaseResetPassword,
  firebaseSignInWithGoogle,
  firebaseSignInWithFacebook,
  formatFirebaseAuthError,
} from '../lib/firebase.ts';
import { PrivacyPolicyPage } from './PrivacyPolicyPage.tsx';
import { TermsOfServicePage } from './TermsOfServicePage.tsx';
import { DataDeletionPage } from './DataDeletionPage.tsx';

interface AuthPageProps {
  onSuccess?: () => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onSuccess }) => {
  const { login, register, language, toggleLanguage, theme, toggleTheme } = useAuth();
  const isBn = language === 'bn';

  const [tab, setTab] = useState<'login' | 'register' | 'forgot'>('login');

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [phone, setPhone] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  // Password visibility
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Status
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Compliance modals
  const [complianceModal, setComplianceModal] = useState<'privacy' | 'terms' | 'deletion' | null>(null);

  const resetFormState = () => {
    setError(null);
    setSuccessMsg(null);
  };

  const handleTabChange = (nextTab: 'login' | 'register' | 'forgot') => {
    setTab(nextTab);
    resetFormState();
  };

  // 1. Handle Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    resetFormState();

    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setError(isBn ? 'ইমেইল এবং পাসওয়ার্ড উভয়ই প্রদান করুন।' : 'Please provide both email address and password.');
      return;
    }

    setLoading(true);

    try {
      // Step A: Attempt server-side login (which checks DB password hashes first)
      const serverRes = await login(cleanEmail, password, undefined, undefined, rememberMe).catch(() => null);

      if (serverRes && serverRes.success) {
        if (onSuccess) onSuccess();
        return;
      }

      // Step B: If server says invalid credentials or couldn't reach, attempt Firebase Authentication
      let fbUser = null;
      try {
        fbUser = await firebaseSignIn(cleanEmail, password);
      } catch (fbErr: any) {
        // Both failed — show detailed, user-friendly error
        const friendlyError = serverRes?.error || formatFirebaseAuthError(fbErr);
        setError(friendlyError);
        setLoading(false);
        return;
      }

      // Step C: If Firebase authentication succeeded, sync with backend session
      if (fbUser) {
        const syncRes = await login(cleanEmail, password, fbUser.uid, fbUser, rememberMe);
        if (syncRes.success) {
          if (onSuccess) onSuccess();
        } else {
          setError(syncRes.error || (isBn ? 'লগইন সফল হয়েছে, কিন্তু সেশন শুরু করতে সমস্যা হচ্ছে।' : 'Login succeeded, but workspace session creation failed.'));
        }
      }
    } catch (err: any) {
      setError(err.message || (isBn ? 'লগইন করার সময় একটি ত্রুটি ঘটেছে।' : 'An unexpected error occurred during login.'));
    } finally {
      setLoading(false);
    }
  };

  // 2. Handle Registration
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    resetFormState();

    const cleanName = name.trim();
    const cleanEmail = email.trim();
    const cleanBusiness = businessName.trim();
    const cleanPhone = phone.trim();

    if (!cleanName || !cleanEmail || !password) {
      setError(isBn ? 'নাম, ইমেইল এবং পাসওয়ার্ড অবশ্যই পূরণ করতে হবে।' : 'Please fill in all required fields (Name, Email, and Password).');
      return;
    }

    if (password.length < 6) {
      setError(isBn ? 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।' : 'Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError(isBn ? 'পাসওয়ার্ড দুটি মেলেনি। অনুগ্রহ করে যাচাই করুন।' : 'Passwords do not match. Please verify.');
      return;
    }

    setLoading(true);

    try {
      // Step A: Create account in Firebase Authentication if configured
      let fbUser: any = null;
      try {
        fbUser = await firebaseSignUp(cleanEmail, password, cleanName);
      } catch (fbErr: any) {
        const msg = formatFirebaseAuthError(fbErr);
        // If email already in use in Firebase, notify user
        if (fbErr?.code === 'auth/email-already-in-use') {
          setError(isBn ? 'এই ইমেইল দিয়ে ইতোমধ্যে একটি অ্যাকাউন্ট রয়েছে। লগইন করুন।' : 'An account with this email address already exists. Please sign in instead.');
          setLoading(false);
          return;
        }
        // If Firebase apiKey is missing or offline, proceed to server-backed registration
        console.warn('Firebase signup notice:', msg);
      }

      // Step B: Create verified user record & private workspace in backend
      const res = await register({
        name: cleanName,
        email: cleanEmail,
        password,
        businessName: cleanBusiness || undefined,
        phone: cleanPhone || undefined,
        uid: fbUser?.uid,
        fbUser,
      });

      if (res.success) {
        if (onSuccess) onSuccess();
      } else {
        setError(res.error || (isBn ? 'অ্যাকাউন্ট তৈরিতে সমস্যা হয়েছে।' : 'Account registration failed.'));
      }
    } catch (err: any) {
      setError(err.message || (isBn ? 'অ্যাকাউন্ট খোলার সময় ত্রুটি ঘটেছে।' : 'Registration error occurred.'));
    } finally {
      setLoading(false);
    }
  };

  // 3. Handle Forgot Password
  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    resetFormState();

    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError(isBn ? 'অনুগ্রহ করে একটি সঠিক ইমেইল এড্রেস লিখুন।' : 'Please enter a valid email address.');
      return;
    }

    setLoading(true);

    try {
      // Trigger Firebase password reset email
      try {
        await firebaseResetPassword(cleanEmail);
      } catch (fbErr: any) {
        console.warn('Firebase reset notice:', fbErr);
      }

      // Also dispatch to backend reset notification route
      await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail }),
      }).catch(() => null);

      setSuccessMsg(
        isBn
          ? 'যদি এই ইমেইল দিয়ে কোনো অ্যাকাউন্ট থাকে, তবে পাসওয়ার্ড রিসেটের নির্দেশাবলী পাঠানো হয়েছে। আপনার ইনবক্স বা স্প্যাম ফোল্ডার চেক করুন।'
          : 'If an account exists for this email address, password reset instructions have been dispatched. Please check your inbox or spam folder.'
      );
    } catch (err: any) {
      setError(err.message || (isBn ? 'রিসেট লিংক পাঠানো যায়নি।' : 'Failed to send password reset link.'));
    } finally {
      setLoading(false);
    }
  };

  // 4. Social Logins
  const handleGoogleAuth = async () => {
    if (loading) return;
    resetFormState();
    setLoading(true);

    try {
      const fbUser = await firebaseSignInWithGoogle();
      if (fbUser && fbUser.email) {
        const syncRes = await fetch('/api/auth/firebase-sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            uid: fbUser.uid,
            email: fbUser.email,
            name: fbUser.displayName,
            avatarUrl: fbUser.photoURL,
          }),
        });
        const data = await syncRes.json().catch(() => null);
        if (syncRes.ok && data?.token) {
          localStorage.setItem('yia_token', data.token);
          localStorage.setItem('yia_cached_user', JSON.stringify(data.user));
          if (data.activeWorkspace) {
            localStorage.setItem('yia_cached_workspace', JSON.stringify(data.activeWorkspace));
          }
          if (onSuccess) onSuccess();
          return;
        }
        // Fallback to local session
        const localRes = await login(fbUser.email, undefined, fbUser.uid, fbUser);
        if (localRes.success && onSuccess) onSuccess();
      }
    } catch (err: any) {
      setError(formatFirebaseAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleFacebookAuth = async () => {
    if (loading) return;
    resetFormState();
    setLoading(true);

    try {
      const fbUser = await firebaseSignInWithFacebook();
      if (fbUser && fbUser.email) {
        const syncRes = await fetch('/api/auth/firebase-sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            uid: fbUser.uid,
            email: fbUser.email,
            name: fbUser.displayName,
            avatarUrl: fbUser.photoURL,
          }),
        });
        const data = await syncRes.json().catch(() => null);
        if (syncRes.ok && data?.token) {
          localStorage.setItem('yia_token', data.token);
          localStorage.setItem('yia_cached_user', JSON.stringify(data.user));
          if (data.activeWorkspace) {
            localStorage.setItem('yia_cached_workspace', JSON.stringify(data.activeWorkspace));
          }
          if (onSuccess) onSuccess();
          return;
        }
        const localRes = await login(fbUser.email, undefined, fbUser.uid, fbUser);
        if (localRes.success && onSuccess) onSuccess();
      }
    } catch (err: any) {
      setError(formatFirebaseAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between overflow-x-hidden bg-slate-950 text-slate-100 selection:bg-purple-600 selection:text-white">
      {/* Dynamic Geometric Background Grid with Obsidian Radiance */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-grid-pattern opacity-60 mask-radial-vignette" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[450px] bg-purple-600/15 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[350px] bg-indigo-600/10 rounded-full blur-[130px] pointer-events-none" />
      </div>

      {/* Top Navigation Bar (Header) */}
      <header className="relative z-10 w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl px-4 py-3 sm:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <YearInfoLogo size="md" showText={true} />
            <span className="hidden sm:inline-block px-2.5 py-0.5 text-[11px] font-bold tracking-wide rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-300">
              AI Hub
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="flex items-center justify-center rounded-xl border border-slate-800 bg-slate-900/90 p-2 text-slate-300 hover:border-purple-500/50 hover:text-purple-400 transition"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-purple-400" />}
            </button>

            {/* Language Switcher */}
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900/90 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:border-purple-500/50 hover:text-white transition"
              title="Toggle Language"
            >
              <Globe className="h-3.5 w-3.5 text-purple-400" />
              <span>{isBn ? 'English' : 'বাংলা'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Authentication Card & Hero Grid */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-10 my-4">
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Column: Brand Pillars & Live Value */}
          <div className="hidden lg:flex lg:col-span-5 flex-col space-y-6 text-left pr-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-purple-500/30 bg-purple-500/10 text-xs font-medium text-purple-300 w-fit">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>{isBn ? 'ব্যবসায়িক এআই অটোমেশন' : 'Next-Gen Business Automation'}</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white leading-tight">
              {isBn ? (
                <>
                  এক প্ল্যাটফর্মেই <span className="bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">স্মার্ট মেসেজিং</span> ও স্বয়ংক্রিয় বিক্রয়
                </>
              ) : (
                <>
                  One Intelligent Hub for <span className="bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">Conversations</span> & Sales
                </>
              )}
            </h1>

            <p className="text-sm text-slate-400 leading-relaxed">
              {isBn
                ? 'ফেসবুক পেজ, মেসেঞ্জার, হোয়াটসঅ্যাপ ও ইনস্টাগ্রামের সকল কাস্টমার মেসেজ কেন্দ্রীয়ভাবে হ্যান্ডেল করুন এবং এআই সেলস এজেন্টের মাধ্যমে ২৪/৭ স্বয়ংক্রিয় অর্ডার নিশ্চিত করুন।'
                : 'Centralize Facebook, Instagram, Messenger and WhatsApp in one unified workspace. Automate customer replies, order processing, and social post scheduling with precision AI.'}
            </p>

            <div className="space-y-3.5 pt-2">
              <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-md">
                <div className="w-9 h-9 rounded-lg bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">{isBn ? 'সেন্ট্রাল মেসেজিং ইনবক্স' : 'Omnichannel Inbox'}</h4>
                  <p className="text-[11px] text-slate-400">{isBn ? 'সকল সোশ্যাল চ্যানেলের বার্তা এক জায়গায়' : 'Unified live messaging without tab switching'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-md">
                <div className="w-9 h-9 rounded-lg bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">{isBn ? 'বাংলা এআই সেলস এজেন্ট' : 'Bilingual AI Sales Agent'}</h4>
                  <p className="text-[11px] text-slate-400">{isBn ? 'স্বয়ংক্রিয় প্রোডাক্ট ক্যাটালগ ও ক্যাশ অন ডেলিভারি' : 'Smart conversational recommendations & checkout'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-md">
                <div className="w-9 h-9 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">{isBn ? 'ভয়েস ও রিয়েলটাইম অ্যানালিটিক্স' : 'Voice Business Intelligence'}</h4>
                  <p className="text-[11px] text-slate-400">{isBn ? 'ভয়েস কমান্ডে প্রতিদিনের সেলস ও অর্ডার রিপোর্ট' : 'Instant voice briefings and daily business summaries'}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 text-[11px] text-slate-500">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>{isBn ? 'এন্টারপ্রাইজ-গ্রেড সিকিউরিটি ও ওয়ার্কস্পেস আইসোলেশন' : 'Enterprise data isolation and authenticated session access'}</span>
            </div>
          </div>

          {/* Right Column: Premium Form Card */}
          <div className="w-full lg:col-span-7">
            <div className="relative rounded-3xl border border-purple-500/30 bg-slate-900/85 backdrop-blur-2xl p-6 sm:p-8 shadow-2xl shadow-purple-950/40">
              {/* Header Title inside Card */}
              <div className="text-center pb-6">
                <div className="inline-flex lg:hidden mb-3">
                  <YearInfoLogo size="md" showText={true} />
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-white">
                  {tab === 'login'
                    ? isBn ? 'আপনার অ্যাকাউন্টে লগইন করুন' : 'Sign in to your account'
                    : tab === 'register'
                    ? isBn ? 'নতুন অ্যাকাউন্ট খুলুন' : 'Create your business account'
                    : isBn ? 'পাসওয়ার্ড রিসেট করুন' : 'Reset your password'}
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  {tab === 'login'
                    ? isBn ? 'ওয়ার্কস্পেস ও ড্যাশবোর্ডে প্রবেশ করতে লগইন করুন' : 'Enter your credentials to access your workspace'
                    : tab === 'register'
                    ? isBn ? 'কয়েক সেকেন্ডেই চালু করুন আপনার নিজস্ব এআই সেলস হাব' : 'Start your omnichannel AI sales workspace in seconds'
                    : isBn ? 'আপনার অ্যাকাউন্টের নিবন্ধিত ইমেইল এড্রেসটি লিখুন' : 'Enter your email to receive recovery instructions'}
                </p>
              </div>

              {/* Tab Selector */}
              {tab !== 'forgot' && (
                <div className="flex rounded-2xl bg-slate-950/80 p-1 mb-6 border border-slate-800">
                  <button
                    type="button"
                    onClick={() => handleTabChange('login')}
                    className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition ${
                      tab === 'login'
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-900/40'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {isBn ? 'লগইন' : 'Sign In'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTabChange('register')}
                    className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition ${
                      tab === 'register'
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-900/40'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {isBn ? 'নতুন অ্যাকাউন্ট' : 'Create Account'}
                  </button>
                </div>
              )}

              {/* Error Banner */}
              {error && (
                <div className="mb-5 flex items-start gap-2.5 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-3.5 text-xs text-rose-300 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div className="flex-1 font-medium">{error}</div>
                </div>
              )}

              {/* Success Banner */}
              {successMsg && (
                <div className="mb-5 flex items-start gap-2.5 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-3.5 text-xs text-emerald-300 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div className="flex-1 font-medium">{successMsg}</div>
                </div>
              )}

              {/* Forms */}
              {tab === 'login' && (
                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      {isBn ? 'ইমেইল এড্রেস' : 'Email Address'} <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="business@example.com"
                        className="w-full rounded-xl border border-slate-800 bg-slate-950/80 pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-600 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 transition"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-slate-300">
                        {isBn ? 'পাসওয়ার্ড' : 'Password'} <span className="text-rose-400">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => handleTabChange('forgot')}
                        className="text-xs font-semibold text-purple-400 hover:text-purple-300 hover:underline transition"
                      >
                        {isBn ? 'পাসওয়ার্ড ভুলে গেছেন?' : 'Forgot password?'}
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full rounded-xl border border-slate-800 bg-slate-950/80 pl-10 pr-11 py-2.5 text-sm text-white placeholder-slate-600 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-2.5 text-slate-500 hover:text-slate-300 transition"
                        title={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-300 py-1">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="rounded border-slate-700 bg-slate-950 text-purple-600 focus:ring-purple-500 w-4 h-4 cursor-pointer accent-purple-600"
                      />
                      <span>{isBn ? 'এই ডিভাইসে লগইন সেভ রাখুন (Remember Me)' : 'Keep me logged in on this device'}</span>
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-600 py-3 text-sm font-bold text-white shadow-lg shadow-purple-600/30 hover:from-purple-500 hover:to-indigo-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>{isBn ? 'লগইন করুন' : 'Sign In to Workspace'}</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              )}

              {tab === 'register' && (
                <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        {isBn ? 'পূর্ণ নাম' : 'Full Name'} <span className="text-rose-400">*</span>
                      </label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                        <input
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder={isBn ? 'আপনার নাম' : 'Your name'}
                          className="w-full rounded-xl border border-slate-800 bg-slate-950/80 pl-10 pr-3 py-2.5 text-sm text-white placeholder-slate-600 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 transition"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        {isBn ? 'ব্যবসা বা স্টোরের নাম' : 'Store / Business Name'}
                      </label>
                      <div className="relative">
                        <Store className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                        <input
                          type="text"
                          value={businessName}
                          onChange={(e) => setBusinessName(e.target.value)}
                          placeholder={isBn ? 'উদাঃ ফ্যাশন গ্যালারি' : 'e.g. Trendy Boutique'}
                          className="w-full rounded-xl border border-slate-800 bg-slate-950/80 pl-10 pr-3 py-2.5 text-sm text-white placeholder-slate-600 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 transition"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        {isBn ? 'ইমেইল এড্রেস' : 'Email Address'} <span className="text-rose-400">*</span>
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="business@example.com"
                          className="w-full rounded-xl border border-slate-800 bg-slate-950/80 pl-10 pr-3 py-2.5 text-sm text-white placeholder-slate-600 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 transition"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        {isBn ? 'মোবাইল নম্বর' : 'Phone Number'}
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="017XXXXXXXX"
                          className="w-full rounded-xl border border-slate-800 bg-slate-950/80 pl-10 pr-3 py-2.5 text-sm text-white placeholder-slate-600 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 transition"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        {isBn ? 'পাসওয়ার্ড (কমপক্ষে ৬ অক্ষর)' : 'Password (min. 6)'} <span className="text-rose-400">*</span>
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          minLength={6}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full rounded-xl border border-slate-800 bg-slate-950/80 pl-10 pr-10 py-2.5 text-sm text-white placeholder-slate-600 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 transition"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 transition"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        {isBn ? 'পাসওয়ার্ড নিশ্চিত করুন' : 'Confirm Password'} <span className="text-rose-400">*</span>
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          required
                          minLength={6}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full rounded-xl border border-slate-800 bg-slate-950/80 pl-10 pr-10 py-2.5 text-sm text-white placeholder-slate-600 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 transition"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 transition"
                        >
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500 pt-1">
                    {isBn
                      ? 'অ্যাকাউন্ট তৈরি করে আপনি YEAR INFO AI-এর ব্যবহারের শর্তাবলী ও গোপনীয়তা নীতি মেনে নিচ্ছেন।'
                      : 'By creating an account, you agree to our Terms of Service and Privacy Policy.'}
                  </p>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-600 py-3 text-sm font-bold text-white shadow-lg shadow-purple-600/30 hover:from-purple-500 hover:to-indigo-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>{isBn ? 'অ্যাকাউন্ট খুলুন' : 'Create Free Account'}</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              )}

              {tab === 'forgot' && (
                <form onSubmit={handleForgotSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      {isBn ? 'নিবন্ধিত ইমেইল এড্রেস' : 'Registered Email Address'} <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="business@example.com"
                        className="w-full rounded-xl border border-slate-800 bg-slate-950/80 pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-600 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 transition"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 py-3 text-sm font-bold text-white shadow-lg shadow-purple-600/30 hover:from-purple-500 hover:to-indigo-500 transition disabled:opacity-50"
                  >
                    {loading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <span>{isBn ? 'রিসেট নির্দেশাবলী পাঠান' : 'Send Reset Instructions'}</span>
                    )}
                  </button>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => handleTabChange('login')}
                      className="text-xs font-semibold text-purple-400 hover:text-purple-300 transition"
                    >
                      ← {isBn ? 'লগইনে ফিরে যান' : 'Back to Sign In'}
                    </button>
                  </div>
                </form>
              )}

              {/* Social Login Separator (For login and register tabs) */}
              {tab !== 'forgot' && (
                <div className="mt-6">
                  <div className="relative flex items-center justify-center">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-slate-800" />
                    </div>
                    <span className="relative bg-slate-900/90 px-3 text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                      {isBn ? 'অথবা কন্টিনিউ করুন' : 'Or continue with'}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={handleGoogleAuth}
                      disabled={loading}
                      className="flex items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-950/60 p-2.5 text-xs font-semibold text-slate-300 hover:border-slate-700 hover:bg-slate-950 hover:text-white transition shadow-sm disabled:opacity-50"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
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
                      onClick={handleFacebookAuth}
                      disabled={loading}
                      className="flex items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-950/60 p-2.5 text-xs font-semibold text-slate-300 hover:border-slate-700 hover:bg-slate-950 hover:text-white transition shadow-sm disabled:opacity-50"
                    >
                      <svg className="w-4 h-4 text-[#1877F2]" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                      </svg>
                      <span>Facebook</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer with Compliance Links and Security Assurance (No Logout button) */}
      <footer className="relative z-10 w-full border-t border-slate-800/80 bg-slate-950/90 backdrop-blur-md px-4 py-4 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span>© {new Date().getFullYear()} YEAR INFO AI.</span>
            <span className="hidden sm:inline text-slate-600">•</span>
            <span className="text-slate-500">{isBn ? 'সকল অধিকার সংরক্ষিত' : 'All rights reserved.'}</span>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <button
              onClick={() => setComplianceModal('privacy')}
              className="text-slate-400 hover:text-purple-400 hover:underline transition"
            >
              {isBn ? 'গোপনীয়তা নীতি' : 'Privacy Policy'}
            </button>
            <span className="text-slate-700">•</span>
            <button
              onClick={() => setComplianceModal('terms')}
              className="text-slate-400 hover:text-purple-400 hover:underline transition"
            >
              {isBn ? 'ব্যবহারের শর্তাবলী' : 'Terms of Service'}
            </button>
            <span className="text-slate-700">•</span>
            <button
              onClick={() => setComplianceModal('deletion')}
              className="text-slate-400 hover:text-purple-400 hover:underline transition"
            >
              {isBn ? 'তথ্য মুছে ফেলার অনুরোধ' : 'Data Deletion'}
            </button>
          </div>
        </div>
      </footer>

      {/* Compliance Modals so public visitors can inspect legal pages without logging in */}
      {complianceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl border border-purple-500/30 bg-slate-900 p-6 sm:p-8 shadow-2xl">
            <div className="sticky top-0 right-0 flex justify-end z-20 pb-2">
              <button
                onClick={() => setComplianceModal(null)}
                className="rounded-xl border border-slate-700 bg-slate-800 p-2 text-slate-300 hover:bg-slate-700 hover:text-white transition"
              >
                ✕ {isBn ? 'বন্ধ করুন' : 'Close'}
              </button>
            </div>
            {complianceModal === 'privacy' && <PrivacyPolicyPage />}
            {complianceModal === 'terms' && <TermsOfServicePage />}
            {complianceModal === 'deletion' && <DataDeletionPage />}
          </div>
        </div>
      )}
    </div>
  );
};
