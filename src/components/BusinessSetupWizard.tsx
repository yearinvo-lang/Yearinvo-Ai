import React, { useState } from 'react';
import {
  Sparkles,
  CheckCircle2,
  AlertCircle,
  X,
  ExternalLink,
  Copy,
  Check,
  ShieldCheck,
  Share2,
  Globe,
  Truck,
  TrendingUp,
  Cpu,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

interface BusinessSetupWizardProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BusinessSetupWizard({ isOpen, onClose }: BusinessSetupWizardProps) {
  const { language, apiRequest } = useAuth();
  const isBn = language === 'bn';

  const [activeTab, setActiveTab] = useState<'checklist' | 'credentials' | 'webhooks'>('checklist');
  const [testingService, setTestingService] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string }>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Form states for credentials configuration
  const [wpSiteUrl, setWpSiteUrl] = useState('');
  const [wpAppPassword, setWpAppPassword] = useState('');
  const [ga4MeasurementId, setGa4MeasurementId] = useState('');
  const [savingService, setSavingService] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, keyName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyName);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleTestService = async (serviceKey: string, customCreds?: any) => {
    setTestingService(serviceKey);
    try {
      const res = await apiRequest('/api/business-manager/test-integration', {
        method: 'POST',
        body: JSON.stringify({ serviceKey, credentials: customCreds }),
      });
      setTestResults((prev) => ({
        ...prev,
        [serviceKey]: { success: res.success, message: res.message || 'Connected successfully' },
      }));
    } catch (e: any) {
      setTestResults((prev) => ({
        ...prev,
        [serviceKey]: { success: false, message: e.message || 'Test failed' },
      }));
    } finally {
      setTestingService(null);
    }
  };

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://year-info-ai.vercel.app';
  const metaWebhookUrl = `${currentOrigin}/api/webhooks/meta`;
  const whatsappWebhookUrl = `${currentOrigin}/api/webhooks/whatsapp`;
  const woocommerceWebhookUrl = `${currentOrigin}/api/webhooks/woocommerce`;

  const checklistItems = [
    {
      id: 'gemini',
      title: isBn ? '১. গুগল জেমিনি এআই ব্রেন (Google Gemini AI)' : '1. Google Gemini AI Engine',
      category: 'ai',
      icon: Cpu,
      status: 'configured',
      description: isBn
        ? 'বাংলা ও ইংরেজিতে স্বাভাবিক প্রশ্নোত্তরের জন্য সার্ভার-সাইড GEMINI_API_KEY কনফিগার করা রয়েছে।'
        : 'Server-side GEMINI_API_KEY is configured for natural language query processing.',
      badge: 'Active & Verified',
      actionLabel: isBn ? 'কানেকশন টেস্ট' : 'Test Connection',
    },
    {
      id: 'meta',
      title: isBn ? '২. ফেসবুক পেইজ ও মেসেঞ্জার (Meta Graph API)' : '2. Facebook Pages & Messenger',
      category: 'meta',
      icon: Share2,
      status: 'configured',
      description: isBn
        ? 'অফিসিয়াল Meta OAuth এবং Graph API v22.0 সংযুক্ত। নতুন মেসেজ, পোস্ট ও কমেন্ট ট্র্যাকিং সক্রিয়।'
        : 'Official Meta Graph API v22.0 OAuth connected. Tracking messages, posts, and comments.',
      badge: 'Connected',
      actionLabel: isBn ? 'সিঙ্ক চেক' : 'Check Sync',
    },
    {
      id: 'courier',
      title: isBn ? '৩. কুরিয়ার ডেলিভারি ট্র্যাকিং (Steadfast, Pathao, RedX, CSV)' : '3. Courier & Delivery Tracking',
      category: 'courier',
      icon: Truck,
      status: 'configured',
      description: isBn
        ? 'মাল্টি-কুরিয়ার ট্র্যাকিং ও ম্যানুয়াল CSV বাল্ক আপডেট সক্রিয়। পার্সেল ডেলিভারি ও COD মনিটর হচ্ছে।'
        : 'Multi-courier tracking and manual CSV upload active. Tracking delivered, in-transit & COD.',
      badge: 'Active',
      actionLabel: isBn ? 'কুরিয়ার স্ট্যাটাস' : 'Courier Status',
    },
    {
      id: 'wordpress',
      title: isBn ? '৪. ওয়ার্ডপ্রেস ও উকমার্স (WordPress & WooCommerce)' : '4. WordPress & WooCommerce',
      category: 'wordpress',
      icon: Globe,
      status: 'optional',
      description: isBn
        ? 'আপনার ওয়েবসাইট থেকে সরাসরি ব্লগ পোস্ট, কমেন্টস ও অর্ডার সিঙ্ক করতে Site URL ও Application Password দিন।'
        : 'Connect your WordPress site via REST API for direct blog posts, comments, and WooCommerce order sync.',
      badge: 'Optional',
      actionLabel: isBn ? 'কনফিগার করুন' : 'Configure',
    },
    {
      id: 'ga4',
      title: isBn ? '৫. গুগল অ্যানালিটিক্স ৪ (Google Analytics 4)' : '5. Google Analytics 4',
      category: 'analytics',
      icon: TrendingUp,
      status: 'optional',
      description: isBn
        ? 'ওয়েবসাইটের লাইভ ভিজিটর সংখ্যা ও কনভার্সন রেট দেখতে GA4 Measurement ID (G-XXXXXXXX) সংযুক্ত করুন।'
        : 'Connect GA4 Measurement ID to track live website visitor counts and conversion rates.',
      badge: 'Optional',
      actionLabel: isBn ? 'কানেক্ট করুন' : 'Connect',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="max-w-2xl w-full rounded-2xl border border-purple-500/30 bg-slate-900 p-6 space-y-5 shadow-2xl my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                {isBn ? 'বিজনেস ইন্টিগ্রেশন ও সেটআপ চেকলিস্ট' : 'Business Integration & Setup Checklist'}
              </h2>
              <p className="text-xs text-slate-400">
                {isBn ? 'সবগুলো সার্ভিস কানেক্ট না থাকলেও সংযুক্ত সার্ভিস দিয়ে ভয়েস অ্যাসিস্ট্যান্ট পূর্ণ কাজ করবে।' : 'Services can be connected incrementally.'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-lg">✕</button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-800 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('checklist')}
            className={`pb-2.5 px-4 transition border-b-2 ${
              activeTab === 'checklist' ? 'border-purple-500 text-purple-400 font-bold' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {isBn ? '১. ইন্টিগ্রেশন চেকলিস্ট' : '1. Checklist'}
          </button>
          <button
            onClick={() => setActiveTab('webhooks')}
            className={`pb-2.5 px-4 transition border-b-2 ${
              activeTab === 'webhooks' ? 'border-purple-500 text-purple-400 font-bold' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {isBn ? '২. ওয়েবহুক URLs' : '2. Webhook URLs'}
          </button>
          <button
            onClick={() => setActiveTab('credentials')}
            className={`pb-2.5 px-4 transition border-b-2 ${
              activeTab === 'credentials' ? 'border-purple-500 text-purple-400 font-bold' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {isBn ? '৩. API ক্রেডেনশিয়ালস' : '3. Credentials'}
          </button>
        </div>

        {/* TAB 1: CHECKLIST */}
        {activeTab === 'checklist' && (
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            {checklistItems.map((item) => {
              const Icon = item.icon;
              const result = testResults[item.id];
              return (
                <div
                  key={item.id}
                  className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 space-y-2 transition hover:border-slate-700"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-xs text-white">
                      <Icon className="h-4 w-4 text-purple-400" />
                      <span>{item.title}</span>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        item.status === 'configured'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {item.badge}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">{item.description}</p>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-900 text-xs">
                    <div>
                      {result && (
                        <span className={`text-[11px] font-semibold ${result.success ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {result.success ? '✓ ' : '✕ '} {result.message}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        if (item.id === 'wordpress' || item.id === 'ga4') {
                          setActiveTab('credentials');
                        } else {
                          handleTestService(item.id);
                        }
                      }}
                      disabled={testingService === item.id}
                      className="rounded-lg bg-slate-800 hover:bg-slate-700 px-3 py-1 text-xs font-semibold text-purple-300 transition"
                    >
                      {testingService === item.id ? (isBn ? 'টেস্টিং...' : 'Testing...') : item.actionLabel}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* TAB 2: WEBHOOK URLS */}
        {activeTab === 'webhooks' && (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto text-xs">
            <p className="text-slate-300">
              {isBn
                ? 'রিয়েল-টাইম আপডেট পাওয়ার জন্য সংশ্লিষ্ট প্ল্যাটফর্মের ডেভেলপার পোর্টালে নিচের ওয়েবহুক URL ও Verify Token সেট করুন:'
                : 'Set these webhook URLs and verify token in your respective developer consoles for instant updates:'}
            </p>

            {/* Meta Webhook */}
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-2">
              <div className="font-bold text-white flex items-center justify-between">
                <span>Meta / Facebook & Messenger Webhook URL</span>
                <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded">Meta Graph API</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-slate-900 p-2 font-mono text-[11px] text-slate-300">
                <span className="truncate pr-2">{metaWebhookUrl}</span>
                <button
                  onClick={() => copyToClipboard(metaWebhookUrl, 'meta_wh')}
                  className="shrink-0 p-1 hover:text-white text-slate-400"
                  title="Copy URL"
                >
                  {copiedKey === 'meta_wh' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
              <div className="text-[11px] text-slate-400 flex items-center gap-2">
                <span>Verify Token:</span>
                <code className="bg-slate-900 px-1.5 py-0.5 rounded text-purple-300 font-mono">year_info_ai_verify_2026</code>
              </div>
            </div>

            {/* WooCommerce Webhook */}
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-2">
              <div className="font-bold text-white flex items-center justify-between">
                <span>WooCommerce Order Webhook Delivery URL</span>
                <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded">WooCommerce v3</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-slate-900 p-2 font-mono text-[11px] text-slate-300">
                <span className="truncate pr-2">{woocommerceWebhookUrl}</span>
                <button
                  onClick={() => copyToClipboard(woocommerceWebhookUrl, 'wc_wh')}
                  className="shrink-0 p-1 hover:text-white text-slate-400"
                >
                  {copiedKey === 'wc_wh' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: CREDENTIALS */}
        {activeTab === 'credentials' && (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto text-xs">
            {/* WordPress Config */}
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-3">
              <h3 className="font-bold text-white">WordPress / WooCommerce Connection</h3>
              <div className="space-y-1">
                <label className="text-[11px] text-slate-400">Site URL</label>
                <input
                  type="text"
                  placeholder="https://yourstore.com"
                  value={wpSiteUrl}
                  onChange={(e) => setWpSiteUrl(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white focus:border-purple-500 focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] text-slate-400">Application Password or WooCommerce Consumer Secret</label>
                <input
                  type="password"
                  placeholder="xxxx xxxx xxxx xxxx"
                  value={wpAppPassword}
                  onChange={(e) => setWpAppPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white focus:border-purple-500 focus:outline-none"
                />
              </div>
              <button
                onClick={() => handleTestService('wordpress', { siteUrl: wpSiteUrl, appPassword: wpAppPassword })}
                disabled={!wpSiteUrl}
                className="rounded-xl bg-purple-600 px-3 py-1.5 font-bold text-white hover:bg-purple-500 disabled:opacity-50 transition"
              >
                {isBn ? 'টেস্ট ও সেভ করুন' : 'Test & Save'}
              </button>
            </div>

            {/* GA4 Config */}
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-3">
              <h3 className="font-bold text-white">Google Analytics 4 (GA4)</h3>
              <div className="space-y-1">
                <label className="text-[11px] text-slate-400">Measurement ID (Format: G-XXXXXXXXXX)</label>
                <input
                  type="text"
                  placeholder="G-8R0WBR9LZD"
                  value={ga4MeasurementId}
                  onChange={(e) => setGa4MeasurementId(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white focus:border-purple-500 focus:outline-none"
                />
              </div>
              <button
                onClick={() => handleTestService('ga4', { measurementId: ga4MeasurementId })}
                disabled={!ga4MeasurementId}
                className="rounded-xl bg-purple-600 px-3 py-1.5 font-bold text-white hover:bg-purple-500 disabled:opacity-50 transition"
              >
                {isBn ? 'টেস্ট ও সেভ করুন' : 'Test & Save'}
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end pt-3 border-t border-slate-800">
          <button
            onClick={onClose}
            className="rounded-xl bg-slate-800 hover:bg-slate-700 px-5 py-2 text-xs font-semibold text-white transition"
          >
            {isBn ? 'বন্ধ করুন' : 'Done'}
          </button>
        </div>
      </div>
    </div>
  );
}
