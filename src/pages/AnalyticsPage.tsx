import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  MessageSquare,
  ShoppingBag,
  Calendar,
  Bot,
  DollarSign,
  CheckCircle,
  RefreshCw,
  Share2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

export const AnalyticsPage: React.FC = () => {
  const { activeWorkspace, apiRequest } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    if (!activeWorkspace) return;
    setLoading(true);
    try {
      const res = await apiRequest('/api/analytics');
      setData(res);
    } catch (e) {
      console.error('Failed to load analytics:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeWorkspace?.id]);

  if (loading && !data) {
    return (
      <div className="flex h-96 items-center justify-center text-xs text-purple-400">
        <RefreshCw className="h-5 w-5 animate-spin mr-2" />
        Calculating verified metrics...
      </div>
    );
  }

  const conv = data?.conversations || {};
  const ord = data?.orders || {};
  const pub = data?.publishing || {};
  const ai = data?.ai || {};

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-white">Analytics & Performance Reports</h1>
            <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-bold text-emerald-400 border border-emerald-500/30">
              100% Real DB Data
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Verified performance metrics calculated directly from database records without simulated numbers.
          </p>
        </div>

        <button
          onClick={loadData}
          className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Refresh Metrics</span>
        </button>
      </div>

      {/* Grid: 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase">
            <span>Customer Chats</span>
            <MessageSquare className="h-4 w-4 text-purple-400" />
          </div>
          <div className="text-3xl font-black text-white">{conv.total || 0}</div>
          <div className="text-[11px] text-slate-400">
            Open: {conv.open || 0} • Unread: {conv.unread || 0} • Resolved: {conv.resolved || 0}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase">
            <span>Confirmed Revenue</span>
            <ShoppingBag className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-black text-white">৳ {(ord.totalRevenue || 0).toLocaleString()}</div>
          <div className="text-[11px] text-emerald-400">
            AI Sales: ৳ {(ord.aiAssistedRevenue || 0).toLocaleString()} ({ord.confirmed || 0} orders)
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase">
            <span>Published Posts</span>
            <Calendar className="h-4 w-4 text-indigo-400" />
          </div>
          <div className="text-3xl font-black text-white">{pub.published || 0}</div>
          <div className="text-[11px] text-slate-400">
            Queued: {pub.scheduled || 0} • Errors: {pub.failed || 0}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase">
            <span>AI Sales Efficiency</span>
            <Bot className="h-4 w-4 text-purple-400" />
          </div>
          <div className="text-3xl font-black text-white">{ai.totalCalls || 0}</div>
          <div className="text-[11px] text-slate-400 font-mono">
            {ai.totalTokens?.toLocaleString() || 0} tokens (${ai.estimatedCostUsd || 0})
          </div>
        </div>
      </div>

      {/* Detailed Conversion Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 space-y-4">
          <h3 className="font-bold text-base text-white border-b border-slate-800 pb-3">
            Sales Revenue Breakdown
          </h3>
          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">AI-Assisted Converted Orders:</span>
              <span className="font-bold text-emerald-400">৳ {(ord.aiAssistedRevenue || 0).toLocaleString()}</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2">
              <div
                className="bg-purple-500 h-2 rounded-full"
                style={{
                  width: `${ord.totalRevenue > 0 ? (ord.aiAssistedRevenue / ord.totalRevenue) * 100 : 0}%`,
                }}
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-slate-400">Desk / Manual Converted Orders:</span>
              <span className="font-bold text-white">৳ {((ord.totalRevenue || 0) - (ord.aiAssistedRevenue || 0)).toLocaleString()}</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2">
              <div
                className="bg-indigo-500 h-2 rounded-full"
                style={{
                  width: `${ord.totalRevenue > 0 ? (((ord.totalRevenue - ord.aiAssistedRevenue) / ord.totalRevenue) * 100) : 0}%`,
                }}
              />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 space-y-4">
          <h3 className="font-bold text-base text-white border-b border-slate-800 pb-3">
            Messaging Channel Breakdown
          </h3>
          <div className="space-y-3">
            {data?.channels?.map((c: any, i: number) => (
              <div key={i} className="flex items-center justify-between text-xs rounded-xl bg-slate-950 p-3 border border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white capitalize">{c.name}</span>
                  <span className="text-[10px] text-slate-500 uppercase font-mono">{c.type}</span>
                </div>
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                  {c.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
