import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  CheckCircle,
  Clock,
  Sparkles,
  ArrowUpRight,
  ShieldCheck,
  AlertCircle,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { Subscription, SubscriptionPlan } from '../types/index.ts';

export const SubscriptionPage: React.FC = () => {
  const { activeWorkspace, apiRequest } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);

  // Upgrade Modal State
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('bKash Merchant');
  const [trxId, setTrxId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    if (!activeWorkspace) return;
    setLoading(true);
    try {
      const data = await apiRequest('/api/subscription/current');
      setSubscription(data.subscription);
      setPlans(data.plans || []);
      if (data.plans && data.plans.length > 0) {
        setSelectedPlanId(data.plans[1]?.id || data.plans[0].id);
      }
    } catch (e) {
      console.error('Failed to load subscription:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeWorkspace?.id]);

  const handleRequestUpgrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlanId || !trxId) return;

    setSubmitting(true);
    try {
      const res = await apiRequest('/api/subscription/request-plan', {
        method: 'POST',
        body: JSON.stringify({
          planId: selectedPlanId,
          paymentMethod,
          paymentReference: trxId,
        }),
      });
      setSubscription(res);
      setShowUpgradeModal(false);
      setTrxId('');
    } catch (e) {
      console.error('Failed to submit subscription request:', e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-purple-500/20 bg-gradient-to-r from-slate-900 via-purple-950/40 to-slate-900 p-6 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-white">Subscription & Plan Limits</h1>
            <span className="rounded-full bg-purple-500/20 px-2.5 py-0.5 text-xs font-bold text-purple-300">
              {subscription?.planName || 'Free Trial'}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Manage your workspace plan, usage quotas, and monthly invoice renewals.
          </p>
        </div>

        <button
          onClick={() => setShowUpgradeModal(true)}
          className="flex items-center gap-1.5 rounded-xl bg-purple-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-purple-600/30 hover:bg-purple-500 transition"
        >
          <Sparkles className="h-4 w-4" />
          <span>Upgrade or Renew Plan</span>
        </button>
      </div>

      {/* Current Subscription Card */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-4 gap-2">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Current Active Plan</div>
            <div className="text-xl font-black text-white mt-0.5">{subscription?.planName || 'Pro Plan'}</div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Status:</span>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-bold capitalize ${
                subscription?.status === 'active'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
              }`}
            >
              {subscription?.status || 'Active'}
            </span>
          </div>
        </div>

        {/* Quota Usage Bars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2">
          <div className="rounded-xl bg-slate-950 p-4 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-400">Monthly Conversations</span>
              <span className="text-white">
                {subscription?.currentUsage?.conversationsThisMonth || 12} / 3,000
              </span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2">
              <div className="bg-purple-500 h-2 rounded-full w-[4%]" />
            </div>
          </div>

          <div className="rounded-xl bg-slate-950 p-4 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-400">AI Sales Agent Replies</span>
              <span className="text-white">
                {subscription?.currentUsage?.aiRepliesThisMonth || 19} / 1,500
              </span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2">
              <div className="bg-indigo-500 h-2 rounded-full w-[6%]" />
            </div>
          </div>

          <div className="rounded-xl bg-slate-950 p-4 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-400">Scheduled Social Posts</span>
              <span className="text-white">
                {subscription?.currentUsage?.scheduledPostsThisMonth || 3} / 100
              </span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2">
              <div className="bg-emerald-500 h-2 rounded-full w-[3%]" />
            </div>
          </div>
        </div>
      </div>

      {/* Available Plans Catalog */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((p) => (
          <div
            key={p.id}
            className={`rounded-2xl border p-6 space-y-4 ${
              subscription?.planId === p.id
                ? 'border-purple-500 bg-slate-900'
                : 'border-slate-800 bg-slate-900/60'
            }`}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg text-white">{p.name}</h3>
              {subscription?.planId === p.id && (
                <span className="rounded bg-purple-500/20 px-2 py-0.5 text-[10px] font-bold text-purple-300">
                  Current
                </span>
              )}
            </div>
            <div className="text-2xl font-black text-white">৳ {p.priceBdt} <span className="text-xs text-slate-400 font-normal">/ month</span></div>
            <p className="text-xs text-slate-400">{p.description}</p>
            <div className="border-t border-slate-800 pt-3 space-y-2 text-xs text-slate-300">
              {p.features.map((f, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <CheckCircle className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                  <span>{f}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="relative w-full max-w-md rounded-2xl border border-purple-500/30 bg-slate-900 p-6 shadow-2xl">
            <button
              onClick={() => setShowUpgradeModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-lg font-bold text-white mb-2">Upgrade / Renew Subscription</h3>
            <p className="text-xs text-slate-400 mb-4">
              Submit your transaction details for instant approval by the platform owner.
            </p>

            <form onSubmit={handleRequestUpgrade} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Select Target Plan</label>
                <select
                  value={selectedPlanId}
                  onChange={(e) => setSelectedPlanId(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-purple-500 focus:outline-none"
                >
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} - ৳{p.priceBdt}/mo (${p.priceUsd})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-purple-500 focus:outline-none"
                >
                  <option value="bKash Merchant">bKash (Merchant / Send Money)</option>
                  <option value="Nagad">Nagad</option>
                  <option value="Bank Transfer">Bank Transfer (City Bank / BRAC)</option>
                  <option value="Card">Credit / Debit Card</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">bKash / Bank TrxID Reference *</label>
                <input
                  type="text"
                  required
                  value={trxId}
                  onChange={(e) => setTrxId(e.target.value)}
                  placeholder="e.g. TRX893049102"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white font-mono focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setShowUpgradeModal(false)}
                  className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-purple-600 px-5 py-2 text-xs font-bold text-white hover:bg-purple-500 transition"
                >
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
