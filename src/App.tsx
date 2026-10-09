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
} from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { YearInfoLogo } from './components/YearInfoLogo.tsx';
import { LandingPage } from './pages/LandingPage.tsx';
import { AuthModal } from './components/AuthModal.tsx';
import { OnboardingModal } from './components/OnboardingModal.tsx';
import { LiveChatWidget } from './components/LiveChatWidget.tsx';

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

  const isBn = language === 'bn';

  // Navigation items per Master Plan Section 19
  const navItems = [
    { id: 'overview', label: isBn ? 'ওভারভিউ' : 'Overview', icon: LayoutDashboard },
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
    <div className="flex h-screen overflow-hidden bg-slate-950 text-slate-100 font-sans">
      {/* MOBILE SIDEBAR BACKDROP */}
      {mobileSidebarOpen && (
        <div
          onClick={() => setMobileSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* LEFT NAVIGATION SIDEBAR */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-purple-500/20 bg-[#080612] transition-transform duration-300 lg:static lg:translate-x-0 ${
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-0 lg:translate-x-0 hidden lg:flex'
        }`}
      >
        {/* Top Brand Logo */}
        <div className="flex h-16 items-center justify-between border-b border-purple-500/20 px-4 shrink-0">
          <YearInfoLogo size="md" showText={true} />
          <button
            onClick={() => setMobileSidebarOpen(false)}
            className="rounded-lg p-1 text-slate-400 hover:text-white lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Workspace Switcher */}
        <div className="p-3 border-b border-slate-900 shrink-0">
          <div className="rounded-xl border border-purple-500/20 bg-slate-900/90 p-2.5 flex items-center justify-between">
            <div className="truncate">
              <div className="text-[10px] font-bold uppercase tracking-wider text-purple-400">Workspace</div>
              <div className="text-xs font-bold text-white truncate">{activeWorkspace?.name || 'Dhaka Fashion Hub'}</div>
            </div>
            {workspaces.length > 1 && (
              <select
                value={activeWorkspace?.id}
                onChange={(e) => {
                  const ws = workspaces.find((w) => w.id === e.target.value);
                  if (ws) setActiveWorkspace(ws);
                }}
                className="bg-transparent text-slate-400 text-xs focus:outline-none cursor-pointer"
              >
                {workspaces.map((w) => (
                  <option key={w.id} value={w.id} className="bg-slate-900 text-white">
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
                  setCurrentPage(item.id);
                  setMobileSidebarOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 transition duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-600/30 font-bold'
                    : item.adminOnly
                    ? 'text-rose-400 hover:bg-rose-500/10 hover:text-rose-300'
                    : 'text-slate-400 hover:bg-slate-900 hover:text-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-white' : item.adminOnly ? 'text-rose-400' : 'text-slate-400'}`} />
                  <span className="truncate">{item.label}</span>
                </div>

                {item.badge && (
                  <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.2 text-[9px] font-bold text-emerald-400 border border-emerald-500/30">
                    {item.badge}
                  </span>
                )}
                {item.highlight && !isActive && (
                  <span className="rounded-full bg-purple-500/20 px-1.5 py-0.2 text-[9px] font-bold text-purple-300">
                    AI
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer User & Landing Switch */}
        <div className="p-3 border-t border-purple-500/20 bg-slate-950/80 shrink-0 space-y-2">
          <button
            onClick={() => setShowLanding(true)}
            className="flex w-full items-center justify-between rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-300 hover:border-purple-500 hover:text-white transition"
          >
            <span className="flex items-center gap-2">
              <ExternalLink className="h-3.5 w-3.5 text-purple-400" />
              <span>Landing Page</span>
            </span>
          </button>

          <div className="flex items-center justify-between px-1 text-xs">
            <div className="truncate">
              <div className="font-bold text-white text-xs truncate">{user?.name}</div>
              <div className="text-[10px] text-slate-500 truncate">{user?.email}</div>
            </div>
            <button
              onClick={logout}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-rose-400 transition"
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
        <header className="flex h-16 items-center justify-between border-b border-purple-500/20 bg-slate-950/80 px-4 sm:px-6 lg:px-8 backdrop-blur-xl shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white capitalize">
                {navItems.find((n) => n.id === currentPage)?.label || 'YEAR INFO AI'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Language Switch */}
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-slate-300 hover:border-purple-500 hover:text-white transition"
              title="Toggle Language"
            >
              <Globe className="h-3.5 w-3.5 text-purple-400" />
              <span>{isBn ? 'English' : 'বাংলা'}</span>
            </button>

            {/* Owner Control Center Quick Header Button */}
            {(user?.isSuperAdmin || user?.role === 'superadmin') && (
              <button
                onClick={() => setCurrentPage('admin-portal')}
                className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition ${
                  currentPage === 'admin-portal'
                    ? 'border-rose-500 bg-rose-500/20 text-rose-300 shadow-sm shadow-rose-900/30'
                    : 'border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20'
                }`}
                title="Open Owner Control Center"
              >
                <ShieldAlert className="h-3.5 w-3.5 text-rose-400" />
                <span>{isBn ? 'ওনার সেন্টার' : 'Owner Center'}</span>
              </button>
            )}

            {/* Setup Wizard Button */}
            <button
              onClick={() => setOnboardingOpen(true)}
              className="hidden sm:flex items-center gap-1.5 rounded-xl border border-purple-500/30 bg-purple-500/10 px-3 py-1.5 text-xs font-semibold text-purple-300 hover:bg-purple-500/20 transition"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Onboarding Wizard</span>
            </button>
          </div>
        </header>

        {/* MAIN BODY VIEW */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-slate-950">
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
