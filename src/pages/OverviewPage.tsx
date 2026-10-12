import React, { useEffect, useState } from 'react';
import {
  MessageSquare,
  ShoppingBag,
  Calendar,
  Bot,
  TrendingUp,
  ArrowUpRight,
  ShieldCheck,
  Sparkles,
  Plus,
  RefreshCw,
  Share2,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Mic,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

interface OverviewPageProps {
  onNavigate: (page: string) => void;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({ onNavigate }) => {
  const { activeWorkspace, apiRequest, language } = useAuth();
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const isBn = language === 'bn';

  const loadData = async () => {
    if (!activeWorkspace) return;
    setLoading(true);
    try {
      const data = await apiRequest('/api/analytics');
      setAnalytics(data);
    } catch (e) {
      console.error('Failed to load analytics:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeWorkspace?.id]);

  if (loading && !analytics) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex items-center gap-3 text-purple-400">
          <RefreshCw className="h-5 w-5 animate-spin" />
          <span className="text-sm font-semibold">Loading live workspace data...</span>
        </div>
      </div>
    );
  }

  const conv = analytics?.conversations || { total: 0, unread: 0, open: 0, resolved: 0, aiHandled: 0 };
  const ord = analytics?.orders || { total: 0, confirmed: 0, totalRevenue: 0, aiAssistedRevenue: 0 };
  const pub = analytics?.publishing || { total: 0, published: 0, scheduled: 0, failed: 0 };
  const aiStats = analytics?.ai || { totalCalls: 0, totalTokens: 0, estimatedCostUsd: 0 };
  const channels = analytics?.channels || [];

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-purple-500/20 bg-gradient-to-r from-slate-900 via-purple-950/40 to-slate-900 p-6 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-white">
              {activeWorkspace?.name || 'My Store'}
            </h1>
            <span className="rounded-full bg-purple-500/20 px-2.5 py-0.5 text-[11px] font-bold text-purple-300 border border-purple-500/30">
              {activeWorkspace?.businessType || 'Retail'}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {isBn
              ? 'কেন্দ্রীয় মেসেজিং, এআই সেলস এবং সোশ্যাল পাবলিশিংয়ের রিয়েল-টাইম ওভারভিউ।'
              : 'Real-time overview of conversations, AI sales conversions, and scheduled content.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => onNavigate('voice-assistant')}
            className="flex items-center gap-1.5 rounded-xl border border-purple-500/40 bg-purple-900/40 px-3.5 py-2 text-xs font-bold text-purple-200 hover:bg-purple-800/50 hover:text-white transition shadow-sm"
          >
            <Mic className="h-3.5 w-3.5 text-purple-400 animate-pulse" />
            <span>{isBn ? '🎙️ ভয়েস অ্যাসিস্ট্যান্ট' : '🎙️ Voice Assistant'}</span>
          </button>
          <button
            onClick={() => onNavigate('inbox')}
            className="flex items-center gap-1.5 rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-purple-600/30 hover:bg-purple-500 transition"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            <span>{isBn ? 'ইনবক্স খুলুন' : 'Open Inbox'}</span>
          </button>
          <button
            onClick={() => onNavigate('scheduler')}
            className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition"
          >
            <Calendar className="h-3.5 w-3.5 text-purple-400" />
            <span>{isBn ? 'নতুন পোস্ট শিডিউল' : 'Schedule Post'}</span>
          </button>
          <button
            onClick={loadData}
            className="rounded-xl border border-slate-700 bg-slate-800 p-2 text-slate-300 hover:text-white transition"
            title="Refresh Data"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Conversations */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Conversations</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10 text-purple-400">
              <MessageSquare className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">{conv.total}</span>
            {conv.unread > 0 && (
              <span className="text-xs font-bold text-rose-400">({conv.unread} unread)</span>
            )}
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Open: {conv.open}</span>
            <span>AI Handled: {conv.aiHandled}</span>
            <span>Resolved: {conv.resolved}</span>
          </div>
        </div>

        {/* Card 2: Orders & Confirmed Sales */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Confirmed Revenue</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
              <ShoppingBag className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">৳ {ord.totalRevenue.toLocaleString()}</span>
            <span className="text-xs text-slate-400">({ord.confirmed} orders)</span>
          </div>
          <div className="mt-2 text-[11px] text-emerald-400 flex items-center justify-between">
            <span>AI-Assisted: ৳ {ord.aiAssistedRevenue.toLocaleString()}</span>
            <span className="text-slate-500">COD / bKash</span>
          </div>
        </div>

        {/* Card 3: Social Media Posts */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Social Publishing</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
              <Calendar className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">{pub.total}</span>
            <span className="text-xs text-purple-300">({pub.scheduled} queued)</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Published: {pub.published}</span>
            {pub.failed > 0 ? (
              <span className="text-rose-400">Failed: {pub.failed}</span>
            ) : (
              <span className="text-emerald-400">0 errors</span>
            )}
          </div>
        </div>

        {/* Card 4: AI Usage */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">AI Sales Engine</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10 text-purple-400">
              <Bot className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">{aiStats.totalCalls}</span>
            <span className="text-xs text-slate-400">queries answered</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Tokens: {aiStats.totalTokens.toLocaleString()}</span>
            <span className="text-purple-400 font-mono">${aiStats.estimatedCostUsd}</span>
          </div>
        </div>
      </div>

      {/* Two Column Section: Channel Health & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Connected Channels Health */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
            <div>
              <h2 className="text-base font-bold text-white">Connected Channel Health</h2>
              <p className="text-xs text-slate-400">Active messaging webhooks and sync status</p>
            </div>
            <button
              onClick={() => onNavigate('channels')}
              className="text-xs font-semibold text-purple-400 hover:underline flex items-center gap-1"
            >
              <span>Manage Channels</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {channels.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-800 p-8 text-center">
              <Share2 className="mx-auto h-8 w-8 text-slate-600 mb-2" />
              <p className="text-sm font-semibold text-slate-300">No connected channels.</p>
              <p className="text-xs text-slate-500 mt-1">Connect your Facebook, Messenger, Instagram, or WhatsApp to start receiving customer messages.</p>
              <button
                onClick={() => onNavigate('channels')}
                className="mt-4 rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white hover:bg-purple-500 transition"
              >
                Connect Channel
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {channels.map((ch: any, idx: number) => {
                const isOnline = ch.status === 'connected';
                return (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 p-3.5 hover:border-slate-700 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 border border-slate-800 uppercase text-xs font-black text-purple-300">
                        {ch.type.slice(0, 2)}
                      </div>
                      <div>
                        <div className="font-semibold text-sm text-white">{ch.name}</div>
                        <div className="text-[11px] text-slate-400 capitalize">{ch.type} Integration</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          isOnline
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                        {ch.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Quick Launch & Guidance */}
        <div className="rounded-2xl border border-purple-500/20 bg-gradient-to-b from-slate-900 to-slate-950 p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-2 text-purple-400">
            <Sparkles className="h-5 w-5" />
            <h2 className="text-base font-bold text-white">Smart Hub Actions</h2>
          </div>
          <p className="text-xs text-slate-400">
            Quick operations designed for rapid store management and customer engagement.
          </p>

          <div className="space-y-2.5 pt-2">
            <button
              onClick={() => onNavigate('inbox')}
              className="flex w-full items-center justify-between rounded-xl border border-slate-800 bg-slate-900/90 p-3 text-xs font-semibold text-slate-200 hover:border-purple-500 hover:bg-slate-800 transition"
            >
              <span className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-purple-400" />
                Reply Customer Inquiries
              </span>
              <ArrowUpRight className="h-3.5 w-3.5 text-slate-500" />
            </button>

            <button
              onClick={() => onNavigate('products')}
              className="flex w-full items-center justify-between rounded-xl border border-slate-800 bg-slate-900/90 p-3 text-xs font-semibold text-slate-200 hover:border-purple-500 hover:bg-slate-800 transition"
            >
              <span className="flex items-center gap-2">
                <ShoppingBag className="h-4 w-4 text-emerald-400" />
                Manage Product Inventory
              </span>
              <ArrowUpRight className="h-3.5 w-3.5 text-slate-500" />
            </button>

            <button
              onClick={() => onNavigate('ai-agent')}
              className="flex w-full items-center justify-between rounded-xl border border-slate-800 bg-slate-900/90 p-3 text-xs font-semibold text-slate-200 hover:border-purple-500 hover:bg-slate-800 transition"
            >
              <span className="flex items-center gap-2">
                <Bot className="h-4 w-4 text-purple-400" />
                Update AI Knowledge Base
              </span>
              <ArrowUpRight className="h-3.5 w-3.5 text-slate-500" />
            </button>

            <button
              onClick={() => onNavigate('scheduler')}
              className="flex w-full items-center justify-between rounded-xl border border-slate-800 bg-slate-900/90 p-3 text-xs font-semibold text-slate-200 hover:border-purple-500 hover:bg-slate-800 transition"
            >
              <span className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-indigo-400" />
                Social Media Calendar
              </span>
              <ArrowUpRight className="h-3.5 w-3.5 text-slate-500" />
            </button>
          </div>

          <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-3 mt-4 text-[11px] text-slate-400">
            <span className="font-semibold text-purple-300">💡 Pro Tip:</span> You can test the AI Sales Agent in real time by clicking the chat widget in the bottom-right corner!
          </div>
        </div>
      </div>
    </div>
  );
};
