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

const DEFAULT_ANALYTICS = {
  conversations: { total: 0, unread: 0, open: 0, resolved: 0, aiHandled: 0 },
  orders: { total: 0, confirmed: 0, totalRevenue: 0, aiAssistedRevenue: 0 },
  publishing: { total: 0, published: 0, scheduled: 0, failed: 0 },
  ai: { totalCalls: 0, totalTokens: 0, estimatedCostUsd: 0 },
  channels: [],
};

export const OverviewPage: React.FC<OverviewPageProps> = ({ onNavigate }) => {
  const { activeWorkspace, apiRequest, language } = useAuth();
  const [analytics, setAnalytics] = useState<any>(DEFAULT_ANALYTICS);
  const [loading, setLoading] = useState(false);

  const isBn = language === 'bn';

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await apiRequest('/api/analytics');
      if (data && !data.error) {
        setAnalytics(data);
      }
    } catch (e: any) {
      console.warn('Notice loading analytics:', e?.message || e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeWorkspace?.id]);

  const conv = analytics?.conversations || { total: 0, unread: 0, open: 0, resolved: 0, aiHandled: 0 };
  const ord = analytics?.orders || { total: 0, confirmed: 0, totalRevenue: 0, aiAssistedRevenue: 0 };
  const pub = analytics?.publishing || { total: 0, published: 0, scheduled: 0, failed: 0 };
  const aiStats = analytics?.ai || { totalCalls: 0, totalTokens: 0, estimatedCostUsd: 0 };
  const channels = analytics?.channels || [];

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-purple-500/30 bg-gradient-to-r from-slate-900 via-[#191238] to-slate-900 p-6 shadow-2xl shadow-purple-950/30">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-white tracking-tight">
              {activeWorkspace?.name || 'My Store'}
            </h1>
            <span className="rounded-full bg-purple-500/20 px-2.5 py-0.5 text-[11px] font-bold text-purple-300 border border-purple-500/30">
              {activeWorkspace?.businessType || 'Retail'}
            </span>
          </div>
          <p className="text-xs text-slate-300 mt-1">
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
            <span>{isBn ? '🎙️ এআই অ্যাসিস্ট্যান্ট' : '🎙️ AI Assistant'}</span>
          </button>
          <button
            onClick={() => onNavigate('inbox')}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-purple-600/30 hover:brightness-110 transition active:scale-95"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            <span>{isBn ? 'ইনবক্স খুলুন' : 'Open Inbox'}</span>
          </button>
          <button
            onClick={() => onNavigate('scheduler')}
            className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/90 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition"
          >
            <Calendar className="h-3.5 w-3.5 text-purple-400" />
            <span>{isBn ? 'নতুন পোস্ট শিডিউল' : 'Schedule Post'}</span>
          </button>
          <button
            onClick={loadData}
            className="rounded-xl border border-slate-700 bg-slate-800/90 p-2 text-slate-300 hover:text-white transition"
            title="Refresh Data"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-purple-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Conversations */}
        <div className="rounded-2xl border border-slate-200 dark:border-purple-500/20 bg-white/90 dark:bg-[#0c0a1e]/85 p-5 shadow-lg dark:shadow-purple-950/20 backdrop-blur-md hover:border-purple-500/40 transition-all">
          <div className="flex items-center justify-between text-slate-600 dark:text-purple-300/80">
            <span className="text-xs font-bold uppercase tracking-wider">Conversations</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
              <MessageSquare className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">{conv.total}</span>
            {conv.unread > 0 && (
              <span className="text-xs font-bold text-rose-500 dark:text-rose-400">({conv.unread} unread)</span>
            )}
          </div>
          <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between font-medium">
            <span>Open: {conv.open}</span>
            <span>AI Handled: {conv.aiHandled}</span>
            <span>Resolved: {conv.resolved}</span>
          </div>
        </div>

        {/* Card 2: Orders & Confirmed Sales */}
        <div className="rounded-2xl border border-slate-200 dark:border-purple-500/20 bg-white/90 dark:bg-[#0c0a1e]/85 p-5 shadow-lg dark:shadow-purple-950/20 backdrop-blur-md hover:border-emerald-500/40 transition-all">
          <div className="flex items-center justify-between text-slate-600 dark:text-emerald-300/80">
            <span className="text-xs font-bold uppercase tracking-wider">Confirmed Revenue</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <ShoppingBag className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">৳ {ord.totalRevenue.toLocaleString()}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">({ord.confirmed} orders)</span>
          </div>
          <div className="mt-2 text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center justify-between font-medium">
            <span>AI-Assisted: ৳ {ord.aiAssistedRevenue.toLocaleString()}</span>
            <span className="text-slate-400 dark:text-slate-500">COD / bKash</span>
          </div>
        </div>

        {/* Card 3: Social Media Posts */}
        <div className="rounded-2xl border border-slate-200 dark:border-purple-500/20 bg-white/90 dark:bg-[#0c0a1e]/85 p-5 shadow-lg dark:shadow-purple-950/20 backdrop-blur-md hover:border-indigo-500/40 transition-all">
          <div className="flex items-center justify-between text-slate-600 dark:text-indigo-300/80">
            <span className="text-xs font-bold uppercase tracking-wider">Social Publishing</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              <Calendar className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">{pub.total}</span>
            <span className="text-xs font-bold text-purple-600 dark:text-purple-300">({pub.scheduled} queued)</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between font-medium">
            <span>Published: {pub.published}</span>
            {pub.failed > 0 ? (
              <span className="text-rose-500 dark:text-rose-400">Failed: {pub.failed}</span>
            ) : (
              <span className="text-emerald-600 dark:text-emerald-400">0 errors</span>
            )}
          </div>
        </div>

        {/* Card 4: AI Usage */}
        <div className="rounded-2xl border border-slate-200 dark:border-purple-500/20 bg-white/90 dark:bg-[#0c0a1e]/85 p-5 shadow-lg dark:shadow-purple-950/20 backdrop-blur-md hover:border-purple-500/40 transition-all">
          <div className="flex items-center justify-between text-slate-600 dark:text-purple-300/80">
            <span className="text-xs font-bold uppercase tracking-wider">AI Sales Engine</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
              <Bot className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">{aiStats.totalCalls}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">queries answered</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between font-medium">
            <span>Tokens: {aiStats.totalTokens.toLocaleString()}</span>
            <span className="text-purple-600 dark:text-purple-400 font-mono font-bold">${aiStats.estimatedCostUsd}</span>
          </div>
        </div>
      </div>

      {/* Two Column Section: Channel Health & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Connected Channels Health */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 dark:border-purple-500/20 bg-white/90 dark:bg-[#0c0a1e]/85 p-6 shadow-xl dark:shadow-purple-950/20 backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-purple-500/15 pb-4 mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Connected Channel Health</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Active messaging webhooks and sync status</p>
            </div>
            <button
              onClick={() => onNavigate('channels')}
              className="text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1"
            >
              <span>Manage Channels</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {channels.length === 0 || channels.every((c: any) => c.status !== 'connected') ? (
            <div className="rounded-xl border border-dashed border-purple-500/30 p-6 bg-gradient-to-br from-slate-900/60 via-purple-950/20 to-slate-900/60">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/30">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {isBn ? 'শুরুর গাইড: ইন্টিগ্রেশন কানেক্ট করুন' : 'Getting Started: Connect Your Integrations'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {isBn
                      ? 'রিয়েল ডেটা ও কাস্টমার বার্তা পেতে আপনার ফেসবুক ও ওয়েবসাইট যুক্ত করুন।'
                      : 'Connect Facebook and your business website to receive genuine live customer data.'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
                {/* Step 1: Facebook */}
                <div className="rounded-xl border border-slate-200 dark:border-purple-500/20 bg-white/50 dark:bg-[#120f2b]/80 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-600 text-[11px] font-bold text-white">1</span>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                      {isBn ? 'ফেসবুক পেজ ও মেসেঞ্জার' : 'Facebook Page & Messenger'}
                    </h4>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                    {isBn
                      ? 'চ্যানেল সেটিংস থেকে "Facebook" বা "Messenger"-এ ক্লিক করে আপনার পেজ যুক্ত করুন।'
                      : 'Go to Channels to link your Facebook Page. Authorize access to sync live customer chats.'}
                  </p>
                  <button
                    onClick={() => onNavigate('channels')}
                    className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-purple-600 dark:text-purple-400 hover:text-purple-300"
                  >
                    <span>{isBn ? 'ফেসবুক কানেক্ট করুন' : 'Connect Facebook'}</span>
                    <ArrowUpRight className="h-3 w-3" />
                  </button>
                </div>

                {/* Step 2: Website Chat Widget */}
                <div className="rounded-xl border border-slate-200 dark:border-purple-500/20 bg-white/50 dark:bg-[#120f2b]/80 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-600 text-[11px] font-bold text-white">2</span>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                      {isBn ? 'বিজনেস ওয়েবসাইট লাইভ চ্যাট' : 'Business Website Live Chat'}
                    </h4>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                    {isBn
                      ? 'আপনার ওয়েবসাইটে চ্যাট উইজেট কোডটি যোগ করে সরাসরি ভিজিটরদের সহায়তা দিন।'
                      : 'Embed our JavaScript snippet into your website HTML to assist store visitors 24/7.'}
                  </p>
                  <button
                    onClick={() => onNavigate('channels')}
                    className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-purple-600 dark:text-purple-400 hover:text-purple-300"
                  >
                    <span>{isBn ? 'উইজেট কোড পান' : 'Get Widget Code'}</span>
                    <ArrowUpRight className="h-3 w-3" />
                  </button>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => onNavigate('channels')}
                  className="rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2 text-xs font-bold text-white hover:brightness-110 transition shadow-md shadow-purple-600/30"
                >
                  {isBn ? 'চ্যানেল পেজে যান' : 'Go to Channels Page'}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {channels.map((ch: any, idx: number) => {
                const isOnline = ch.status === 'connected';
                return (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-purple-500/20 bg-slate-50 dark:bg-[#120f28] p-3.5 hover:border-purple-500/40 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white dark:bg-[#19153a] border border-slate-200 dark:border-purple-500/30 uppercase text-xs font-black text-purple-600 dark:text-purple-300">
                        {ch.type.slice(0, 2)}
                      </div>
                      <div>
                        <div className="font-bold text-sm text-slate-900 dark:text-white">{ch.name}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 capitalize">{ch.type} Integration</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          isOnline
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                        }`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-amber-500'}`} />
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
        <div className="rounded-2xl border border-purple-500/30 bg-white/90 dark:bg-gradient-to-b dark:from-[#0e0c25] dark:to-[#080716] p-6 shadow-xl dark:shadow-purple-950/30 backdrop-blur-md space-y-4">
          <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
            <Sparkles className="h-5 w-5" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Smart Hub Actions</h2>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Quick operations designed for rapid store management and customer engagement.
          </p>

          <div className="space-y-2.5 pt-2">
            <button
              onClick={() => onNavigate('inbox')}
              className="flex w-full items-center justify-between rounded-xl border border-slate-200 dark:border-purple-500/20 bg-slate-50 dark:bg-[#13102c]/90 p-3 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/30 transition"
            >
              <span className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                Reply Customer Inquiries
              </span>
              <ArrowUpRight className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
            </button>

            <button
              onClick={() => onNavigate('products')}
              className="flex w-full items-center justify-between rounded-xl border border-slate-200 dark:border-purple-500/20 bg-slate-50 dark:bg-[#13102c]/90 p-3 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition"
            >
              <span className="flex items-center gap-2">
                <ShoppingBag className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                Manage Product Inventory
              </span>
              <ArrowUpRight className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
            </button>

            <button
              onClick={() => onNavigate('ai-agent')}
              className="flex w-full items-center justify-between rounded-xl border border-slate-200 dark:border-purple-500/20 bg-slate-50 dark:bg-[#13102c]/90 p-3 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/30 transition"
            >
              <span className="flex items-center gap-2">
                <Bot className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                Update AI Knowledge Base
              </span>
              <ArrowUpRight className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
            </button>

            <button
              onClick={() => onNavigate('scheduler')}
              className="flex w-full items-center justify-between rounded-xl border border-slate-200 dark:border-purple-500/20 bg-slate-50 dark:bg-[#13102c]/90 p-3 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 transition"
            >
              <span className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                Social Media Calendar
              </span>
              <ArrowUpRight className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
            </button>
          </div>

          <div className="rounded-xl border border-purple-500/30 bg-purple-500/10 p-3 mt-4 text-[11px] text-slate-700 dark:text-slate-300">
            <span className="font-bold text-purple-700 dark:text-purple-300">💡 Pro Tip:</span> You can test the AI Sales Agent in real time by clicking the chat widget in the bottom-right corner!
          </div>
        </div>
      </div>
    </div>
  );
};
