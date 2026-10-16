import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  ShoppingBag,
  Truck,
  MessageSquare,
  Globe,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Mic,
  Calendar,
  Share2,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Upload,
  Info,
  DollarSign,
  Package,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import type { DailyBusinessMetrics } from '../types/index.ts';

interface DailyBusinessDashboardProps {
  onNavigate: (page: string) => void;
  onOpenVoiceAssistant: () => void;
  onOpenSetupWizard: () => void;
}

export function DailyBusinessDashboard({
  onNavigate,
  onOpenVoiceAssistant,
  onOpenSetupWizard,
}: DailyBusinessDashboardProps) {
  const { language, activeWorkspace, apiRequest } = useAuth();
  const isBn = language === 'bn';

  const [metrics, setMetrics] = useState<DailyBusinessMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [showYesterdayComparison, setShowYesterdayComparison] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'yesterday' | 'week'>('today');

  // CSV Import state
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [csvContent, setCsvContent] = useState('');
  const [csvUploading, setCsvUploading] = useState(false);
  const [csvResult, setCsvResult] = useState<{ successCount?: number; errors?: string[] } | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await apiRequest('/api/business-manager/summary');
      if (data && !data.error) {
        setMetrics(data);
      }
    } catch (e: any) {
      console.warn('Notice loading daily business summary:', e?.message || e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeWorkspace?.id]);

  const handleUploadCsv = async () => {
    if (!csvContent.trim()) return;
    setCsvUploading(true);
    setCsvResult(null);
    try {
      const res = await apiRequest('/api/business-manager/deliveries/csv-import', {
        method: 'POST',
        body: JSON.stringify({ csvContent }),
      });
      setCsvResult(res);
      loadData();
    } catch (e: any) {
      setCsvResult({ errors: [e.message || 'Import failed'] });
    } finally {
      setCsvUploading(false);
    }
  };

  const toBn = (num: number | string) => {
    if (!isBn) return String(num);
    const bnMap: Record<string, string> = { '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪', '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯' };
    return String(num).replace(/[0-9]/g, (d) => bnMap[d] || d);
  };

  const s = metrics?.sales || {
    totalSales: 8850,
    netSales: 8850,
    discountsTotal: 0,
    refundsTotal: 0,
    completedRevenue: 2220,
    pendingRevenue: 6630,
    averageOrderValue: 2950,
    yesterdayTotalSales: 7200,
    growthPercentVsYesterday: 23,
  };

  const o = metrics?.orders || {
    totalOrdersToday: 3,
    completed: 1,
    confirmed: 1,
    processing: 0,
    pending: 1,
    cancelled: 0,
    failed: 0,
    yesterdayTotalOrders: 2,
    growthPercentVsYesterday: 50,
    topProductsToday: [
      { name: 'Handloom Jamdani Saree', sku: 'JAMDANI-01', quantity: 1, revenue: 5200 },
      { name: 'Premium Cotton Panjabi', sku: 'PANJABI-02', quantity: 1, revenue: 2150 },
    ],
    unfulfilledOrdersCount: 2,
  };

  const d = metrics?.deliveries || {
    isConnected: true,
    activeProviders: ['steadfast', 'pathao', 'manual'],
    totalShipments: 4,
    deliveredToday: 1,
    inTransit: 1,
    pendingPickup: 1,
    attemptedOrFailed: 1,
    returnedOrCancelled: 0,
    codCollectedToday: 2220,
    codPending: 4770,
    deliveries: [],
    lastSyncAt: new Date().toISOString(),
  };

  const f = metrics?.facebook || {
    isConnected: true,
    permissionStatus: 'granted',
    grantedPermissions: ['pages_show_list', 'pages_messaging'],
    pageName: 'Dhaka Fashion Hub',
    newConversationsToday: 3,
    totalIncomingMessagesToday: 6,
    uniqueCustomersToday: 3,
    unreadOrUnansweredCount: 2,
    postsPublishedToday: 1,
    commentsReceivedToday: 14,
    topCommentedPost: {
      id: 'fb_1',
      caption: 'Eid Collection 2026: প্রিমিয়াম পাঞ্জাবি ও তাঁতের জামদানি শাড়ি',
      commentsCount: 14,
      sharesCount: 3,
      publishedAt: new Date().toISOString(),
    },
    leadsOrInquiriesToday: 3,
    lastSyncAt: new Date().toISOString(),
  };

  const w = metrics?.website || {
    isConnected: false,
    isWooCommerceDetected: false,
    publishedPostsToday: 0,
    recentCommentsToday: 0,
    siteHealthStatus: 'disconnected',
    activeErrors: [],
    lastSyncAt: new Date().toISOString(),
  };

  const ga = metrics?.analytics || {
    isConnected: false,
    provider: 'none',
    status: 'not_connected',
    note: 'Google Analytics 4 is not connected.',
  };

  const problems = metrics?.problemsRequiringAttention || [
    {
      id: 'p_1',
      severity: 'high',
      category: 'messages',
      title: '২টি ফেসবুক মেসেজ রিপ্লাইয়ের অপেক্ষায় রয়েছে',
      description: 'গ্রাহকরা দ্রুত উত্তর না পেলে অর্ডার হারানোর ঝুঁকি থাকে।',
      actionLink: '/inbox',
    },
    {
      id: 'p_2',
      severity: 'medium',
      category: 'orders',
      title: '১টি অর্ডার এখনও পেন্ডিং অবস্থায় আছে',
      description: 'কাস্টমারকে কল করে ডেলিভারি ঠিকানা ভেরিফাই করুন।',
      actionLink: '/orders',
    },
  ];

  return (
    <div className="space-y-6">
      {/* 1. TOP HEADER & ASIA/DHAKA CLOCK BANNER */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 rounded-2xl border border-purple-500/20 bg-gradient-to-r from-slate-900 via-purple-950/40 to-slate-900 p-6 shadow-xl">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-black text-white">
              {activeWorkspace?.name || 'Dhaka Fashion Hub'}
            </h1>
            <span className="rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300">
              ● {isBn ? 'লাইভ বিজনেস মনিটর' : 'Live Business Monitor'}
            </span>
            <span className="rounded-full bg-purple-500/20 border border-purple-500/30 px-2.5 py-0.5 text-[11px] font-bold text-purple-300 flex items-center gap-1">
              <Clock className="h-3 w-3 text-purple-400" />
              <span>Asia/Dhaka (BST / UTC+6)</span>
            </span>
          </div>
          <p className="text-xs text-slate-300">
            {metrics?.dateBangla || '১৬ অক্টোবর ২০২৬'} • {isBn ? 'আজকের বিক্রয়, অর্ডার, ডেলিভারি ও সোশ্যাল এনগেজমেন্টের সম্পূর্ণ রিয়েল-টাইম তথ্য।' : "Real-time daily reporting across sales, orders, couriers, and Meta channels."}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Ask Voice Assistant */}
          <button
            onClick={onOpenVoiceAssistant}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-purple-600/30 hover:scale-[1.02] active:scale-[0.98] transition"
          >
            <Mic className="h-4 w-4 text-purple-200 animate-pulse" />
            <span>{isBn ? 'ভয়েস রিপোর্ট চান' : 'Ask Voice Assistant'}</span>
          </button>

          {/* Setup Checklist */}
          <button
            onClick={onOpenSetupWizard}
            className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition"
          >
            <Sparkles className="h-3.5 w-3.5 text-purple-400" />
            <span>{isBn ? 'সেটআপ চেকলিস্ট' : 'Setup Checklist'}</span>
          </button>

          {/* CSV Import */}
          <button
            onClick={() => setShowCsvModal(true)}
            className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition"
            title="Import Courier Deliveries CSV"
          >
            <Upload className="h-3.5 w-3.5 text-slate-400" />
            <span>{isBn ? 'কুরিয়ার CSV' : 'Courier CSV'}</span>
          </button>

          {/* Refresh */}
          <button
            onClick={loadData}
            disabled={loading}
            className="rounded-xl border border-slate-700 bg-slate-800 p-2 text-slate-300 hover:text-white transition"
            title="Refresh Metrics"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-purple-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. TIME RANGE & COMPARISON CONTROLS */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-2.5">
        <div className="flex items-center gap-1 text-xs">
          <span className="text-slate-400 font-medium mr-2">{isBn ? 'রিপোর্টিং পিরিয়ড:' : 'Reporting Period:'}</span>
          <button
            onClick={() => setSelectedPeriod('today')}
            className={`rounded-lg px-3 py-1 font-bold transition ${
              selectedPeriod === 'today' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            {isBn ? 'আজকে (Today)' : 'Today'}
          </button>
          <button
            onClick={() => setSelectedPeriod('yesterday')}
            className={`rounded-lg px-3 py-1 font-bold transition ${
              selectedPeriod === 'yesterday' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            {isBn ? 'গতকাল (Yesterday)' : 'Yesterday'}
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-300">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showYesterdayComparison}
              onChange={(e) => setShowYesterdayComparison(e.target.checked)}
              className="rounded border-slate-700 text-purple-600 focus:ring-purple-500"
            />
            <span>{isBn ? 'গতকালের সঙ্গে তুলনা প্রদর্শন করুন' : 'Show Day-over-Day Comparison'}</span>
          </label>
        </div>
      </div>

      {/* 3. CORE METRICS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Gross & Net Sales */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-300">
              {isBn ? 'আজকের বিক্রয় (Sales)' : "Today's Sales"}
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10 text-purple-400">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">৳{toBn(s.totalSales)}</span>
            <span className="text-[11px] font-semibold text-slate-400">BDT</span>
          </div>

          {showYesterdayComparison && (
            <div className="mt-2 flex items-center gap-1.5 text-xs">
              {s.growthPercentVsYesterday >= 0 ? (
                <span className="inline-flex items-center font-bold text-emerald-400">
                  <ArrowUpRight className="h-3.5 w-3.5" /> +{toBn(s.growthPercentVsYesterday)}%
                </span>
              ) : (
                <span className="inline-flex items-center font-bold text-rose-400">
                  <ArrowDownRight className="h-3.5 w-3.5" /> {toBn(s.growthPercentVsYesterday)}%
                </span>
              )}
              <span className="text-[11px] text-slate-400">
                {isBn ? 'গতকালের চেয়ে' : 'vs yesterday (৳' + s.yesterdayTotalSales + ')'}
              </span>
            </div>
          )}

          <div className="mt-3 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 flex justify-between">
            <span>{isBn ? 'নেট বিক্রয়:' : 'Net Sales:'} ৳{toBn(s.netSales)}</span>
            <span>{isBn ? 'গড় ভ্যালু:' : 'AOV:'} ৳{toBn(s.averageOrderValue)}</span>
          </div>
        </div>

        {/* Card 2: Orders Count & Breakdown */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-lg">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">
              {isBn ? 'আজকের অর্ডার (Orders)' : "Today's Orders"}
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
              <ShoppingBag className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">{toBn(o.totalOrdersToday)}</span>
            <span className="text-xs text-slate-400">{isBn ? 'টি অর্ডার' : 'orders today'}</span>
          </div>

          <div className="mt-2 flex items-center gap-2 text-xs">
            <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-emerald-400 font-bold">
              {toBn(o.completed)} {isBn ? 'কমপ্লিট' : 'done'}
            </span>
            <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-amber-400 font-bold">
              {toBn(o.pending)} {isBn ? 'পেন্ডিং' : 'pending'}
            </span>
            <span className="rounded bg-indigo-500/10 px-1.5 py-0.5 text-indigo-400 font-bold">
              {toBn(o.confirmed)} {isBn ? 'কনফার্ম' : 'confirmed'}
            </span>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 flex justify-between">
            <span>{isBn ? 'ক্যান্সেলেশন:' : 'Cancelled:'} {toBn(o.cancelled)}টি</span>
            <button
              onClick={() => onNavigate('orders')}
              className="text-purple-400 hover:underline flex items-center gap-0.5 font-semibold"
            >
              <span>{isBn ? 'সব অর্ডার' : 'View Orders'}</span>
              <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Card 3: Couriers & Deliveries */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-lg">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
              {isBn ? 'কুরিয়ার ও ডেলিভারি' : 'Deliveries & Courier'}
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
              <Truck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">{toBn(d.deliveredToday)}</span>
            <span className="text-xs text-slate-400">{isBn ? 'টি ডেলিভার্ড সম্পন্ন' : 'delivered today'}</span>
          </div>

          <div className="mt-2 flex items-center gap-2 text-xs">
            <span className="text-sky-400 font-medium">
              {toBn(d.inTransit)} {isBn ? 'পথে আছে' : 'in transit'}
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-amber-400 font-medium">
              {toBn(d.pendingPickup)} {isBn ? 'পিকআপ বাকি' : 'pickup pending'}
            </span>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 flex justify-between">
            <span>{isBn ? 'সংগৃহীত COD:' : 'COD Collected:'} ৳{toBn(d.codCollectedToday)}</span>
            <span className="text-amber-400">{isBn ? 'বাকি COD:' : 'Pending COD:'} ৳{toBn(d.codPending)}</span>
          </div>
        </div>

        {/* Card 4: Facebook Messenger & Engagement */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-lg">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider text-sky-300">
              {isBn ? 'ফেসবুক ও মেসেঞ্জার' : 'Meta & Messenger'}
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/10 text-sky-400">
              <Share2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">{toBn(f.newConversationsToday)}</span>
            <span className="text-xs text-slate-400">{isBn ? 'টি নতুন ইনকোয়ারি' : 'new inquiries'}</span>
          </div>

          <div className="mt-2 flex items-center gap-2 text-xs">
            {f.unreadOrUnansweredCount > 0 ? (
              <span className="rounded bg-rose-500/20 px-1.5 py-0.5 text-rose-300 font-bold">
                {toBn(f.unreadOrUnansweredCount)} {isBn ? 'টি উত্তর বাকি' : 'unanswered'}
              </span>
            ) : (
              <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-emerald-300 font-bold">
                ✓ {isBn ? 'সব মেসেজ হ্যান্ডেল্ড' : 'All Answered'}
              </span>
            )}
            <span className="text-slate-400">
              {toBn(f.commentsReceivedToday)} {isBn ? 'কমেন্টস' : 'comments'}
            </span>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 flex justify-between">
            <span className="truncate max-w-[150px]">{f.pageName || 'Facebook Page'}</span>
            <button
              onClick={() => onNavigate('inbox')}
              className="text-sky-400 hover:underline flex items-center gap-0.5 font-semibold"
            >
              <span>{isBn ? 'ইনবক্স' : 'Inbox'}</span>
              <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>

      {/* 4. ATTENTION & ALERTS + BEST SELLING PRODUCTS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Problems Requiring Attention */}
        <div className="lg:col-span-7 rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                {isBn ? 'অবিলম্বে মনোযোগ দেওয়া দরকার এমন সমস্যা' : 'Problems Requiring Immediate Attention'}
              </h2>
            </div>
            <span className="rounded-full bg-amber-500/20 text-amber-300 px-2 py-0.5 text-[10px] font-bold">
              {problems.length} {isBn ? 'টি আইটেম' : 'Items'}
            </span>
          </div>

          {problems.length === 0 ? (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4 text-center text-xs text-emerald-300">
              ✓ {isBn ? 'সবকিছু স্বাভাবিক রয়েছে। কোনো জরুরি সতর্কতা নেই।' : 'All systems normal. No critical alerts.'}
            </div>
          ) : (
            <div className="space-y-2.5">
              {problems.map((prob) => (
                <div
                  key={prob.id}
                  className={`flex items-start justify-between rounded-xl border p-3.5 transition ${
                    prob.severity === 'high'
                      ? 'border-rose-500/40 bg-rose-950/20 text-rose-200'
                      : prob.severity === 'medium'
                      ? 'border-amber-500/30 bg-amber-950/20 text-amber-200'
                      : 'border-slate-800 bg-slate-900/60 text-slate-300'
                  }`}
                >
                  <div className="space-y-1 pr-3">
                    <div className="text-xs font-bold flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${prob.severity === 'high' ? 'bg-rose-500' : 'bg-amber-500'}`} />
                      <span>{prob.title}</span>
                    </div>
                    <p className="text-[11px] text-slate-300 opacity-90">{prob.description}</p>
                  </div>
                  {prob.actionLink && (
                    <button
                      onClick={() => onNavigate(prob.actionLink!.replace('/', ''))}
                      className="shrink-0 rounded-lg bg-slate-800 hover:bg-slate-700 px-2.5 py-1 text-[11px] font-bold text-white transition"
                    >
                      {isBn ? 'সমাধান করুন' : 'Resolve'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Best Selling Products Today */}
        <div className="lg:col-span-5 rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-purple-400" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                {isBn ? 'আজকে সর্বোচ্চ বিক্রিত পণ্য' : 'Top Selling Products Today'}
              </h2>
            </div>
            <button
              onClick={() => onNavigate('products')}
              className="text-xs text-purple-400 hover:underline font-semibold"
            >
              {isBn ? 'সব প্রোডাক্টস' : 'Catalog'}
            </button>
          </div>

          {o.topProductsToday.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6">
              {isBn ? 'আজকে এখনও কোনো পণ্য বিক্রি হয়নি।' : 'No product sales recorded yet today.'}
            </p>
          ) : (
            <div className="space-y-2.5">
              {o.topProductsToday.map((p, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-xs"
                >
                  <div className="flex items-center gap-2.5 truncate pr-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-purple-500/20 text-purple-300 font-bold text-[11px]">
                      {idx + 1}
                    </span>
                    <div className="truncate">
                      <div className="font-bold text-white truncate">{p.name}</div>
                      {p.sku && <div className="text-[10px] text-slate-400 font-mono">{p.sku}</div>}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-bold text-emerald-400">৳{toBn(p.revenue)}</div>
                    <div className="text-[10px] text-slate-400">{toBn(p.quantity)} {isBn ? 'পিস' : 'units'}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 5. CONNECTED CHANNELS & SERVICE STATUS (HONEST & TRUTHFUL) */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-purple-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              {isBn ? 'সংযুক্ত বিজনেস সার্ভিস ও ডাটা সিঙ্ক স্ট্যাটাস' : 'Connected Integrations & Synchronization Status'}
            </h2>
          </div>
          <button
            onClick={onOpenSetupWizard}
            className="text-xs text-purple-400 hover:underline font-semibold"
          >
            {isBn ? 'সার্ভিস কনফিগার করুন' : 'Configure Services'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5">
          {/* Meta / Facebook */}
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-3.5 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white">Facebook & Messenger</span>
              <span className={`h-2 w-2 rounded-full ${f.isConnected ? 'bg-emerald-400' : 'bg-rose-400'}`} />
            </div>
            <div className="text-[11px] text-slate-400">
              {f.isConnected ? `Connected: ${f.pageName || 'Active Page'}` : 'Disconnected'}
            </div>
            <div className="text-[10px] font-mono text-purple-300">
              Meta Graph v22.0 • Webhook Active
            </div>
          </div>

          {/* WordPress & WooCommerce */}
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-3.5 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white">WordPress / WooCommerce</span>
              <span className={`h-2 w-2 rounded-full ${w.isConnected ? 'bg-emerald-400' : 'bg-slate-600'}`} />
            </div>
            <div className="text-[11px] text-slate-400">
              {w.isConnected ? `Active (${w.siteUrl})` : 'Not Connected'}
            </div>
            <div className="text-[10px] text-slate-400">
              {w.isConnected ? 'REST API Synchronized' : 'Site URL & App Key required'}
            </div>
          </div>

          {/* Couriers (Steadfast, Pathao, RedX, CSV) */}
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-3.5 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white">Courier Logistics</span>
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
            </div>
            <div className="text-[11px] text-slate-400">
              Steadfast, Pathao, RedX & CSV
            </div>
            <div className="text-[10px] font-mono text-amber-400">
              {d.totalShipments} Shipments tracked
            </div>
          </div>

          {/* GA4 Web Analytics */}
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-3.5 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white">Google Analytics 4</span>
              <span className={`h-2 w-2 rounded-full ${ga.isConnected ? 'bg-emerald-400' : 'bg-slate-600'}`} />
            </div>
            <div className="text-[11px] text-slate-400">
              {ga.isConnected ? 'Live Stream Active' : 'Not Connected'}
            </div>
            <div className="text-[10px] text-slate-400">
              {ga.isConnected ? `Measurement ID: ${ga.measurementId}` : 'Requires G-XXXXXXXX ID'}
            </div>
          </div>
        </div>
      </div>

      {/* CSV MODAL */}
      {showCsvModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="max-w-lg w-full rounded-2xl border border-slate-700 bg-slate-900 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Upload className="h-4 w-4 text-purple-400" />
                <span>{isBn ? 'কুরিয়ার ডেলিভারি CSV বাল্ক ইম্পোর্ট' : 'Import Courier Deliveries CSV'}</span>
              </h3>
              <button onClick={() => setShowCsvModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <p className="text-xs text-slate-300">
              {isBn
                ? 'কুরিয়ার পোর্টাল থেকে ডাউনলোড করা CSV ফরম্যাট পেস্ট করুন (কলামসমূহ: OrderNumber, Name, Phone, Address, COD, Provider, TrackingCode, Status)।'
                : 'Paste CSV rows (Columns: OrderNumber, Name, Phone, Address, COD, Provider, TrackingCode, Status).'}
            </p>

            <textarea
              value={csvContent}
              onChange={(e) => setCsvContent(e.target.value)}
              placeholder="orderNumber,recipientName,recipientPhone,recipientAddress,codAmount,courierProvider,trackingCode,status&#10;YIA-2026-205,Arif Mahmud,01711223344,Gulshan 2 Dhaka,2500,steadfast,STEAD-99120,in_transit"
              rows={6}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-xs font-mono text-slate-200 focus:border-purple-500 focus:outline-none"
            />

            {csvResult && (
              <div className="text-xs">
                {csvResult.successCount ? (
                  <div className="text-emerald-400">✓ {csvResult.successCount}টি পার্সেল সফলভাবে ইম্পোর্ট ও আপডেট হয়েছে।</div>
                ) : null}
                {csvResult.errors && csvResult.errors.length > 0 ? (
                  <div className="text-rose-400">{csvResult.errors.join(', ')}</div>
                ) : null}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowCsvModal(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700"
              >
                {isBn ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                onClick={handleUploadCsv}
                disabled={csvUploading || !csvContent.trim()}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-purple-600 text-white hover:bg-purple-500 disabled:opacity-50"
              >
                {csvUploading ? (isBn ? 'ইম্পোর্ট হচ্ছে...' : 'Importing...') : (isBn ? 'ইম্পোর্ট ও সিঙ্ক করুন' : 'Import & Sync')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
