import React, { useState } from 'react';
import {
  LayoutDashboard,
  MessageSquare,
  Bot,
  Users,
  Package,
  ShoppingBag,
  Calendar,
  Share2,
  TrendingUp,
  CreditCard,
  Settings,
  ShieldAlert,
  LogOut,
  ChevronDown,
  Globe,
  Sun,
  Moon,
  Menu,
  X,
  ExternalLink,
  Sparkles,
  Mic,
} from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { YearInfoLogo } from './components/YearInfoLogo.tsx';
import { LandingPage } from './pages/LandingPage.tsx';
import { AuthModal } from './components/AuthModal.tsx';
import { OnboardingModal } from './components/OnboardingModal.tsx';
import { LiveChatWidget } from './components/LiveChatWidget.tsx';
import { VoiceAssistantModal } from './components/VoiceAssistantModal.tsx';

// Authenticated Pages
import { OverviewPage } from './pages/OverviewPage.tsx';
import { InboxPage } from './pages/InboxPage.tsx';
import { AIAgentPage } from './pages/AIAgentPage.tsx';
import { CustomersPage } from './pages/CustomersPage.tsx';
import { ProductsPage } from './pages/ProductsPage.tsx';
import { OrdersPage } from './pages/OrdersPage.tsx';
import { SchedulerPage } from './pages/SchedulerPage.tsx';
import { WhatsAppPage } from './pages/WhatsAppPage.tsx';
import { AnalyticsPage } from './pages/AnalyticsPage.tsx';
import { ChannelsPage } from './pages/ChannelsPage.tsx';
import { TeamPage } from './pages/TeamPage.tsx';
import { SubscriptionPage } from './pages/SubscriptionPage.tsx';
import { AdminPortalPage } from './pages/AdminPortalPage.tsx';
import { SettingsPage } from './pages/SettingsPage.tsx';
import { PrivacyPolicyPage } from './pages/PrivacyPolicyPage.tsx';
import { DataDeletionPage } from './pages/DataDeletionPage.tsx';
import { TermsOfServicePage } from './pages/TermsOfServicePage.tsx';

function MainApp() {
  const {
    user,
    workspaces,
    activeWorkspace,
    setActiveWorkspace,
    logout,
    language,
    toggleLanguage,
    theme,
    toggleTheme,
    loading,
  } = useAuth();

  // Navigation State
  const [currentPage, setCurrentPage] = useState<string>('overview');
  const [showLanding, setShowLanding] = useState<boolean>(false);
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');
  const [onboardingOpen, setOnboardingOpen] = useState<boolean>(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false);
  const [voiceAssistantOpen, setVoiceAssistantOpen] = useState<boolean>(false);

  const isBn = language === 'bn';

  // Navigation items per Master Plan Section 19
  const navItems = [
    { id: 'overview', label: isBn ? 'ওভারভিউ' : 'Overview', icon: LayoutDashboard },
    { id: 'voice-assistant', label: isBn ? 'ভয়েস অ্যাসিস্ট্যান্ট' : 'Voice Assistant', icon: Mic, highlight: true, badge: 'Voice' },
    { id: 'inbox', label: isBn ? 'সেন্ট্রাল ইনবক্স' : 'Central Inbox', icon: MessageSquare, badge: 'Live' },
    { id: 'ai-agent', label: isBn ? 'এআই সেলস এজেন্ট' : 'AI Sales Agent', icon: Bot, highlight: true },
    { id: 'customers', label: isBn ? 'কাস্টমারস' : 'Customers', icon: Users },
    { id: 'products', label: isBn ? 'প্রোডাক্টস' : 'Products', icon: Package },
    { id: 'orders', label: isBn ? 'অর্ডার্স' : 'Orders', icon: ShoppingBag },
    { id: 'scheduler', label: isBn ? 'পোস্ট শিডিউলার' : 'Post Scheduler', icon: Calendar },
    { id: 'whatsapp', label: isBn ? 'হোয়াটসঅ্যাপ মেসেজ' : 'WhatsApp Messages', icon: Share2 },
    { id: 'analytics', label: isBn ? 'অ্যানালিটিক্স' : 'Analytics', icon: TrendingUp },
    { id: 'channels', label: isBn ? 'কানেক্টেড চ্যানেল' : 'Connected Channels', icon: Share2 },
    { id: 'team', label: isBn ? 'টিম ও মেম্বারস' : 'Team', icon: Users },
    { id: 'subscription', label: isBn ? 'সাবস্ক্রিপশন ও বিলিং' : 'Subscription & Billing', icon: CreditCard },
    ...(user?.isSuperAdmin || user?.role === 'superadmin'
      ? [{ id: 'admin-portal', label: isBn ? 'ওনার কন্ট্রোল সেন্টার' : 'Owner Control Center', icon: ShieldAlert, adminOnly: true, badge: 'Owner' }]
      : []),
    { id: 'settings', label: isBn ? 'সেটিংস' : 'Settings', icon: Settings },
  ];

  // Public legal routes accessible directly by URL
  if (typeof window !== 'undefined') {
    const pathname = window.location.pathname;
    if (pathname === '/privacy-policy') {
      return <PrivacyPolicyPage />;
    }
    if (pathname === '/data-deletion') {
      return <DataDeletionPage />;
    }
    if (pathname === '/terms-of-service') {
      return <TermsOfServicePage />;
    }
  }

  // Dedicated OAuth popup callback handler if opened in popup or routed to SPA
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/auth/')) {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code') || '';
    const state = params.get('state') || '';
    const error = params.get('error_description') || params.get('error') || '';

    if (window.opener) {
      try {
        window.opener.postMessage({
          type: 'OAUTH_AUTH_SUCCESS',
          code,
          state,
          error,
        }, '*');
        setTimeout(() => {
          try { window.close(); } catch {}
        }, 1000);
      } catch (e) {
        console.error('Failed to postMessage to opener:', e);
      }
    }

    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full rounded-2xl border border-purple-500/30 bg-slate-900 p-8 text-center space-y-4 shadow-2xl">
          <div className="mx-auto w-12 h-12 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <h2 className="text-xl font-black text-white">YEAR INFO AI Authorization</h2>
          <p className="text-sm text-slate-300">
            {error ? `Authorization Notice: ${error}` : 'Meta authorization received! Connecting channel and closing window...'}
          </p>
          <div className="text-xs text-slate-500 font-mono">
            {code ? `Auth code received (${code.slice(0, 10)}...)` : 'Closing...'}
          </div>
          {!window.opener && (
            <div className="pt-2">
              <a
                href="/"
                className="inline-block px-4 py-2 text-xs font-semibold rounded-xl bg-purple-600 text-white hover:bg-purple-500 transition"
              >
                Return to YEAR INFO AI
              </a>
            </div>
          )}
        </div>
      </div>
    );
  }

  // If user is not logged in or clicks "View Landing Page", show Public Landing Page
  if (!user || showLanding) {
    return (
      <div className="relative min-h-screen">
        <LandingPage
          onOpenAuth={(mode) => {
            setAuthModalMode(mode);
            setAuthModalOpen(true);
          }}
          onEnterApp={() => setShowLanding(false)}
        />
        <AuthModal
          isOpen={authModalOpen}
          initialMode={authModalMode}
          onClose={() => setAuthModalOpen(false)}
          onSuccess={(isNewUser) => {
            setAuthModalOpen(false);
            setShowLanding(false);
            if (isNewUser) {
              setOnboardingOpen(true);
            }
          }}
        />
        {/* Floating embeddable live chat widget */}
        <LiveChatWidget workspaceId={activeWorkspace?.id || 'ws_demo_store'} />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-200">
      {/* MOBILE SIDEBAR BACKDROP */}
      {mobileSidebarOpen && (
        <div
          onClick={() => setMobileSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* LEFT NAVIGATION SIDEBAR */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200 dark:border-purple-500/20 bg-white dark:bg-[#080612] transition-all duration-300 lg:static lg:translate-x-0 ${
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-0 lg:translate-x-0 hidden lg:flex'
        }`}
      >
        {/* Top Brand Logo */}
        <div className="flex h-16 items-center justify-between border-b border-slate-200 dark:border-purple-500/20 px-4 shrink-0">
          <YearInfoLogo size="md" showText={true} />
          <button
            onClick={() => setMobileSidebarOpen(false)}
            className="rounded-lg p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Workspace Switcher */}
        <div className="p-3 border-b border-slate-100 dark:border-slate-900 shrink-0">
          <div className="rounded-xl border border-slate-200 dark:border-purple-500/20 bg-slate-50 dark:bg-slate-900/90 p-2.5 flex items-center justify-between shadow-sm">
            <div className="truncate">
              <div className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">Workspace</div>
              <div className="text-xs font-bold text-slate-900 dark:text-white truncate">{activeWorkspace?.name || 'Dhaka Fashion Hub'}</div>
            </div>
            {workspaces.length > 1 && (
              <select
                value={activeWorkspace?.id}
                onChange={(e) => {
                  const ws = workspaces.find((w) => w.id === e.target.value);
                  if (ws) setActiveWorkspace(ws);
                }}
                className="bg-transparent text-slate-600 dark:text-slate-400 text-xs focus:outline-none cursor-pointer"
              >
                {workspaces.map((w) => (
                  <option key={w.id} value={w.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                    {w.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Navigation Items Scroll Area */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1 text-xs font-semibold">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.id === 'voice-assistant') {
                    setVoiceAssistantOpen(true);
                  } else {
                    setCurrentPage(item.id);
                  }
                  setMobileSidebarOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 transition duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-600/30 font-bold'
                    : item.adminOnly
                    ? 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-white' : item.adminOnly ? 'text-rose-500 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400'}`} />
                  <span className="truncate">{item.label}</span>
                </div>

                {item.badge && (
                  <span className="rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 px-1.5 py-0.2 text-[9px] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                    {item.badge}
                  </span>
                )}
                {item.highlight && !isActive && (
                  <span className="rounded-full bg-purple-500/10 dark:bg-purple-500/20 px-1.5 py-0.2 text-[9px] font-bold text-purple-600 dark:text-purple-300">
                    AI
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer User & Landing Switch */}
        <div className="p-3 border-t border-slate-200 dark:border-purple-500/20 bg-slate-50 dark:bg-slate-950/80 shrink-0 space-y-2">
          <button
            onClick={() => setShowLanding(true)}
            className="flex w-full items-center justify-between rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:border-purple-500 hover:text-purple-600 dark:hover:text-white transition shadow-sm"
          >
            <span className="flex items-center gap-2">
              <ExternalLink className="h-3.5 w-3.5 text-purple-500 dark:text-purple-400" />
              <span>Landing Page</span>
            </span>
          </button>

          <div className="flex items-center justify-between px-1 text-xs">
            <div className="truncate">
              <div className="font-bold text-slate-900 dark:text-white text-xs truncate">{user?.name}</div>
              <div className="text-[10px] text-slate-500 truncate">{user?.email}</div>
            </div>
            <button
              onClick={logout}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-rose-500 transition"
              title="Sign Out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* RIGHT MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* TOP BAR */}
        <header className="flex h-16 items-center justify-between border-b border-slate-200 dark:border-purple-500/20 bg-white/90 dark:bg-slate-950/80 px-4 sm:px-6 lg:px-8 backdrop-blur-xl shrink-0 transition-colors">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="rounded-lg p-1.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-900 dark:text-white capitalize">
                {navItems.find((n) => n.id === currentPage)?.label || 'YEAR INFO AI'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Voice Assistant Header Trigger Button */}
            <button
              onClick={() => setVoiceAssistantOpen(true)}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-3 py-1.5 text-xs font-bold text-white shadow-md shadow-purple-600/30 hover:brightness-110 transition active:scale-95"
              title="Open Voice Assistant"
            >
              <div className="relative flex items-center justify-center">
                <Mic className="h-3.5 w-3.5" />
                <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              </div>
              <span className="hidden sm:inline">{isBn ? 'ভয়েস অ্যাসিস্ট্যান্ট' : 'Voice Assistant'}</span>
            </button>

            {/* Theme Toggle (Light / Dark) */}
            <button
              onClick={toggleTheme}
              className="flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-2 text-slate-700 dark:text-slate-300 hover:border-purple-500 hover:text-purple-600 dark:hover:text-purple-400 transition shadow-sm"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <Sun className="h-4 w-4 text-amber-400" />
              ) : (
                <Moon className="h-4 w-4 text-purple-600" />
              )}
            </button>

            {/* Language Switch */}
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:border-purple-500 hover:text-purple-600 dark:hover:text-white transition shadow-sm"
              title="Toggle Language"
            >
              <Globe className="h-3.5 w-3.5 text-purple-500 dark:text-purple-400" />
              <span>{isBn ? 'English' : 'বাংলা'}</span>
            </button>

            {/* Owner Control Center Quick Header Button */}
            {(user?.isSuperAdmin || user?.role === 'superadmin') && (
              <button
                onClick={() => setCurrentPage('admin-portal')}
                className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition shadow-sm ${
                  currentPage === 'admin-portal'
                    ? 'border-rose-500 bg-rose-500/20 text-rose-600 dark:text-rose-300 shadow-sm'
                    : 'border-rose-300 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-500/20'
                }`}
                title="Open Owner Control Center"
              >
                <ShieldAlert className="h-3.5 w-3.5 text-rose-500 dark:text-rose-400" />
                <span>{isBn ? 'ওনার সেন্টার' : 'Owner Center'}</span>
              </button>
            )}

            {/* Setup Wizard Button */}
            <button
              onClick={() => setOnboardingOpen(true)}
              className="hidden sm:flex items-center gap-1.5 rounded-xl border border-purple-200 dark:border-purple-500/30 bg-purple-50 dark:bg-purple-500/10 px-3 py-1.5 text-xs font-semibold text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-500/20 transition shadow-sm"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Onboarding Wizard</span>
            </button>
          </div>
        </header>

        {/* MAIN BODY VIEW */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-slate-100/70 dark:bg-slate-950 transition-colors">
          {currentPage === 'overview' && <OverviewPage onNavigate={(page) => setCurrentPage(page)} />}
          {currentPage === 'inbox' && <InboxPage />}
          {currentPage === 'ai-agent' && <AIAgentPage />}
          {currentPage === 'customers' && <CustomersPage />}
          {currentPage === 'products' && <ProductsPage />}
          {currentPage === 'orders' && <OrdersPage />}
          {currentPage === 'scheduler' && <SchedulerPage />}
          {currentPage === 'whatsapp' && <WhatsAppPage />}
          {currentPage === 'analytics' && <AnalyticsPage />}
          {currentPage === 'channels' && <ChannelsPage />}
          {currentPage === 'team' && <TeamPage />}
          {currentPage === 'subscription' && <SubscriptionPage />}
          {currentPage === 'admin-portal' && <AdminPortalPage />}
          {currentPage === 'settings' && <SettingsPage />}
        </main>
      </div>

      {/* Onboarding Wizard Modal */}
      <OnboardingModal
        isOpen={onboardingOpen}
        onClose={() => setOnboardingOpen(false)}
        onComplete={() => setOnboardingOpen(false)}
      />

      {/* Voice Assistant Modal */}
      <VoiceAssistantModal
        isOpen={voiceAssistantOpen}
        onClose={() => setVoiceAssistantOpen(false)}
      />

      {/* Floating embeddable website live chat widget */}
      <LiveChatWidget workspaceId={activeWorkspace?.id || 'ws_demo_store'} />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
