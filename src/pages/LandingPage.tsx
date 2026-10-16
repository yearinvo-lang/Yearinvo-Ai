import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Bot,
  Calendar,
  Share2,
  ShieldCheck,
  Zap,
  ArrowRight,
  CheckCircle,
  HelpCircle,
  Globe,
  ShoppingBag,
  Clock,
  Sparkles,
  ChevronDown,
  ChevronUp,
  LogIn,
} from 'lucide-react';
import { YearInfoLogo } from '../components/YearInfoLogo.tsx';
import { useAuth } from '../context/AuthContext.tsx';

interface LandingPageProps {
  onOpenAuth: (mode: 'login' | 'register') => void;
  onEnterApp: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onOpenAuth, onEnterApp }) => {
  const { user, language, toggleLanguage, logout } = useAuth();
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [branding, setBranding] = useState<any>(null);

  useEffect(() => {
    fetch('/api/public/branding')
      .then((res) => {
        if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
          return res.json();
        }
        return null;
      })
      .then((data) => {
        if (data) setBranding(data);
      })
      .catch((err) => console.log('Using default branding:', err));
  }, []);

  const isBn = language === 'bn';

  const faqs = [
    {
      qEn: 'Does YEAR INFO AI support Bangladeshi online sellers and Facebook pages?',
      qBn: 'YEAR INFO AI কি বাংলাদেশি ফেসবুক পেজ এবং অনলাইন শপ সাপোর্ট করে?',
      aEn: 'Yes! It is tailored for Bangladeshi online sellers, Facebook stores, Instagram boutiques, and multichannel brands. It features full Bengali (বাংলা) & English support, Asia/Dhaka timezone scheduling, and Cash on Delivery (COD)/bKash order flows.',
      aBn: 'হ্যাঁ! এটি বাংলাদেশি ফেসবুক এবং ইনস্টাগ্রাম ভিত্তিক উদ্যোক্তা ও মাল্টি-চ্যানেল ব্যবসার জন্য বিশেষভাবে প্রস্তুত। এতে বাংলা ও ইংরেজি উভয় ভাষায় নির্ভুল এআই সেলস অ্যাসিস্ট্যান্ট, এশিয়া/ঢাকা টাইমজোন অনুযায়ী পোস্ট শিডিউলার এবং ক্যাশ অন ডেলিভারি (COD) ও বিকাশ অর্ডার ম্যানেজমেন্ট রয়েছে।',
    },
    {
      qEn: 'How does the AI Sales Agent know my real product stock and prices?',
      qBn: 'এআই সেলস এজেন্ট কীভাবে আমার আসল পণ্যের দাম ও স্টক জানতে পারে?',
      aEn: 'The AI Sales Agent connects directly to your verified Product Catalog and Business Knowledge Base stored securely in your workspace database. It strictly adheres to your real prices and available quantities, never inventing fake prices or stock.',
      aBn: 'এআই সেলস এজেন্ট আপনার ডাটাবেজে সংরক্ষিত প্রোডাক্ট ক্যাটালগ ও নলেজ বেসের সাথে সরাসরি যুক্ত থাকে। এটি কখনও মনগড়া দাম বা মিথ্যা স্টক তৈরি করে না, বরং আপনার ডাটাবেজের প্রকৃত তথ্য ব্যবহার করে গ্রাহকের প্রশ্নের নির্ভুল উত্তর দেয়।',
    },
    {
      qEn: 'Can I take over customer conversations manually from the AI?',
      qBn: 'গ্রাহকের সাথে আলাপের সময় আমি কি এআই বন্ধ করে নিজে রিপ্লাই দিতে পারি?',
      aEn: 'Absolutely. You can pause AI automation for any conversation with one click, or reply manually—which automatically pauses AI to prevent conflicting responses. AI also automatically hands off conversations when customers request human assistance.',
      aBn: 'অবশ্যই। যেকোনো চ্যাটে এক ক্লিকেই এআই পজ (Pause) করে ম্যানুয়াল কন্ট্রোল নেওয়া যায়। এমনকি প্রতিনিধি নিজে রিপ্লাই দেওয়া মাত্রই এআই স্বয়ংক্রিয়ভাবে স্থগিত হয়ে যায় যেন কোনো বিশৃঙ্খলা না হয়।',
    },
    {
      qEn: 'Which platforms are supported in the initial release?',
      qBn: 'প্রাথমিক রিলিজে কোন কোন প্ল্যাটফর্ম সাপোর্ট করা হচ্ছে?',
      aEn: 'Facebook Pages, Facebook Messenger, Instagram Professional accounts, WhatsApp Business Platform, and our embeddable Website Live Chat widget. (YouTube and TikTok are deliberately excluded from this release).',
      aBn: 'ফেসবুক পেজ, ফেসবুক মেসেঞ্জার, ইনস্টাগ্রাম প্রফেশনাল অ্যাকাউন্ট, হোয়াটসঅ্যাপ বিজনেস ক্লাউড এপিআই এবং আমাদের এম্বেডেবল ওয়েবসাইট লাইভ চ্যাট উইজেট।',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-purple-600 selection:text-white">
      {/* 1. TOP NAVIGATION HEADER */}
      <header className="sticky top-0 z-40 border-b border-purple-500/20 bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <YearInfoLogo size="md" showText={true} />

          <nav className="hidden md:flex items-center gap-7 text-xs font-semibold uppercase tracking-wider text-slate-300">
            <a href="#features" className="hover:text-purple-400 transition">
              {isBn ? 'ফিচারসমূহ' : 'Features'}
            </a>
            <a href="#integrations" className="hover:text-purple-400 transition">
              {isBn ? 'ইন্টিগ্রেশন' : 'Integrations'}
            </a>
            <a href="#ai-agent" className="hover:text-purple-400 transition">
              {isBn ? 'এআই সেলস এজেন্ট' : 'AI Sales Agent'}
            </a>
            <a href="#scheduler" className="hover:text-purple-400 transition">
              {isBn ? 'পোস্ট শিডিউলার' : 'Post Scheduler'}
            </a>
            <a href="#pricing" className="hover:text-purple-400 transition">
              {isBn ? 'প্রাইসিং' : 'Pricing'}
            </a>
            <a href="#faq" className="hover:text-purple-400 transition">
              {isBn ? 'প্রশ্নোত্তর' : 'FAQ'}
            </a>
          </nav>

          <div className="flex items-center gap-3">
            {/* Language Switcher */}
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-slate-300 hover:border-purple-500 hover:text-white transition"
              title="Toggle Language"
            >
              <Globe className="h-3.5 w-3.5 text-purple-400" />
              <span>{isBn ? 'English' : 'বাংলা'}</span>
            </button>

            {user ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={onEnterApp}
                  className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-purple-600/30 hover:from-purple-500 hover:to-indigo-500 transition"
                >
                  <span>{isBn ? 'ড্যাশবোর্ডে প্রবেশ করুন' : 'Open Workspace'}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={logout}
                  className="rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2 text-xs font-semibold text-rose-300 hover:border-rose-500/50 hover:bg-rose-950/30 hover:text-white transition"
                  title="Log Out"
                >
                  {isBn ? 'লগআউট' : 'Log Out'}
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onOpenAuth('login')}
                  className="rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 hover:text-white transition"
                >
                  {isBn ? 'লগইন' : 'Login'}
                </button>
                <button
                  onClick={() => onOpenAuth('register')}
                  className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-purple-600/30 hover:from-purple-500 hover:to-indigo-500 transition"
                >
                  <span>{isBn ? 'শুরু করুন' : 'Get Started'}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 2. HERO SECTION */}
      <section className="relative overflow-hidden pt-16 pb-24 md:pt-24 md:pb-32">
        {/* Glow ambient background */}
        <div className="pointer-events-none absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[700px] rounded-full bg-purple-600/15 blur-[120px]" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-4 py-1.5 text-xs font-semibold text-purple-300 backdrop-blur-md mb-8">
            <Sparkles className="h-3.5 w-3.5 text-purple-400" />
            <span>YEAR INFO AI • Central Messaging + AI Sales + Social Publishing</span>
          </div>

          {/* Primary Headline */}
          <h1 className="mx-auto max-w-5xl text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight text-white leading-[1.1]">
            One Intelligent Hub for{' '}
            <span className="bg-gradient-to-r from-purple-400 via-indigo-300 to-purple-200 bg-clip-text text-transparent">
              Conversations, Sales & Social Publishing.
            </span>
          </h1>

          {/* Supporting Headline */}
          <p className="mx-auto mt-6 max-w-3xl text-base sm:text-lg md:text-xl text-slate-300 leading-relaxed font-normal">
            {isBn
              ? 'গ্রাহকদের সাথে কথোপকথন পরিচালনা করুন, এআই দিয়ে বিক্রি স্বয়ংক্রিয় করুন এবং সোশ্যাল মিডিয়া কনটেন্ট শিডিউল করুন একটি শক্তিশালী ওয়ার্কস্পেস থেকেই।'
              : 'Manage customer conversations, automate sales with AI, and schedule your social content from one powerful workspace.'}
          </p>

          <p className="mt-3 text-sm font-semibold tracking-widest text-purple-400 uppercase">
            CONNECT • CONVERSE • CONVERT
          </p>

          {/* CTA Buttons */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            {user ? (
              <button
                onClick={onEnterApp}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-7 py-3.5 text-sm font-bold text-white shadow-xl shadow-purple-600/40 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <span>{isBn ? 'ড্যাশবোর্ডে প্রবেশ করুন' : 'Open Workspace'}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <>
                <button
                  onClick={() => onOpenAuth('register')}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-7 py-3.5 text-sm font-bold text-white shadow-xl shadow-purple-600/40 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  <span>{isBn ? 'ফ্রি শুরু করুন' : 'Get Started Free'}</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  onClick={() => onOpenAuth('login')}
                  className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/90 px-6 py-3.5 text-sm font-semibold text-slate-200 hover:border-purple-500 hover:text-white transition"
                >
                  <span>{isBn ? 'লগইন করুন' : 'Log In'}</span>
                </button>
              </>
            )}
            <a
              href="#features"
              className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/90 px-6 py-3.5 text-sm font-semibold text-slate-200 hover:border-purple-500 hover:text-white transition"
            >
              <span>{isBn ? 'ফিচারসমূহ দেখুন' : 'Explore Features'}</span>
            </a>
          </div>

          {/* Interactive SaaS Platform Showcase Mockup (Original vector preview, no fake fabricated stats) */}
          <div className="mt-16 rounded-2xl border border-purple-500/30 bg-slate-900/90 p-3 sm:p-4 shadow-2xl shadow-purple-950/60 backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-slate-800 px-3 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-rose-500/80" />
                <span className="h-3 w-3 rounded-full bg-amber-500/80" />
                <span className="h-3 w-3 rounded-full bg-emerald-500/80" />
                <span className="ml-2 text-xs font-mono text-slate-400">app.yearinfo.ai/inbox</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded bg-purple-500/20 px-2 py-0.5 text-[11px] font-semibold text-purple-300">
                  Live Unified Workspace Preview
                </span>
              </div>
            </div>

            {/* 3-Panel Interactive Concept Grid */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 text-left">
              {/* Left Panel: Filter folders */}
              <div className="hidden md:block md:col-span-3 rounded-xl border border-slate-800 bg-slate-950 p-3 space-y-1 text-xs">
                <div className="font-bold text-slate-400 uppercase tracking-wider text-[10px] mb-2 px-2">Folders</div>
                <div className="flex items-center justify-between rounded-lg bg-purple-600/20 px-2.5 py-1.5 font-semibold text-purple-300 border border-purple-500/30">
                  <span className="flex items-center gap-2"><MessageSquare className="h-3.5 w-3.5" /> All Inbox</span>
                  <span className="rounded-full bg-purple-500 px-1.5 text-[10px] text-white">Live</span>
                </div>
                <div className="flex items-center justify-between rounded-lg px-2.5 py-1.5 text-slate-400 hover:bg-slate-900">
                  <span className="flex items-center gap-2"><Bot className="h-3.5 w-3.5 text-purple-400" /> AI Handled</span>
                  <span className="text-[10px]">Active</span>
                </div>
                <div className="flex items-center justify-between rounded-lg px-2.5 py-1.5 text-slate-400 hover:bg-slate-900">
                  <span className="flex items-center gap-2"><Zap className="h-3.5 w-3.5 text-amber-400" /> Human Escalation</span>
                  <span className="text-[10px]">0</span>
                </div>
                <div className="flex items-center justify-between rounded-lg px-2.5 py-1.5 text-slate-400 hover:bg-slate-900">
                  <span className="flex items-center gap-2"><ShoppingBag className="h-3.5 w-3.5 text-emerald-400" /> Confirmed Orders</span>
                  <span className="text-[10px]">Synced</span>
                </div>
              </div>

              {/* Middle Panel: Real Thread Preview */}
              <div className="md:col-span-5 rounded-xl border border-slate-800 bg-slate-950 p-3.5 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600/20 text-blue-400 text-xs font-bold">M</span>
                    <div>
                      <div className="text-xs font-bold text-white">Tanvir Hossain</div>
                      <div className="text-[10px] text-slate-400">Facebook Messenger</div>
                    </div>
                  </div>
                  <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                    AI Active
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="rounded-xl bg-slate-900 p-2.5 text-slate-200 border border-slate-800">
                    <div className="text-[10px] font-semibold text-slate-400 mb-1">Customer</div>
                    "আসসালামু আলাইকুম! রয়্যাল নেভি সুতি পাঞ্জাবির সাইজ ৪২ কি স্টকে আছে? দাম কত?"
                  </div>
                  <div className="rounded-xl bg-purple-950/60 p-2.5 text-purple-200 border border-purple-500/40">
                    <div className="flex items-center gap-1 text-[10px] font-bold text-purple-400 mb-1">
                      <Bot className="h-3 w-3" /> YEAR INFO AI (Gemini Factual Engine)
                    </div>
                    "ওয়ালাইকুম আসসালাম! জ্বী, সাইজ ৪২ বর্তমানে স্টকে রয়েছে। ডিসকাউন্টে মূল্য ২১৫০ টাকা। ঢাকার ভিতরে ডেলিভারি চার্জ ৭০ টাকা। আপনি কি অর্ডার করতে চান?"
                  </div>
                </div>
              </div>

              {/* Right Panel: Verified Context & Order Draft */}
              <div className="md:col-span-4 rounded-xl border border-slate-800 bg-slate-950 p-3.5 space-y-2.5 text-xs">
                <div className="font-bold text-white text-xs border-b border-slate-800 pb-1.5 flex items-center justify-between">
                  <span>Product & Order Context</span>
                  <span className="text-[10px] text-emerald-400 font-semibold">100% Verified Stock</span>
                </div>
                <div className="rounded-lg bg-slate-900 p-2.5 border border-slate-800">
                  <div className="font-semibold text-white">Premium Cotton Panjabi</div>
                  <div className="text-[11px] text-purple-300 font-bold">2,150 BDT • SKU: PANJABI-NV-42</div>
                  <div className="text-[10px] text-slate-400 mt-1">Available in DB: 15 pieces</div>
                </div>
                <div className="rounded-lg bg-emerald-950/40 border border-emerald-500/30 p-2.5">
                  <div className="font-semibold text-emerald-300 text-[11px] flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" /> Auto Order Capture
                  </div>
                  <div className="text-[10px] text-slate-300 mt-1">
                    Delivery: Banani, Dhaka (COD 70 BDT)
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. PLATFORM CAPABILITIES (3 Core Pillars) */}
      <section id="features" className="py-20 border-t border-purple-500/10 bg-slate-900/40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-widest text-purple-400">Core Capabilities</span>
            <h2 className="mt-2 text-3xl sm:text-4xl font-black text-white">
              Three Powerful Engines in One Seamless Hub
            </h2>
            <p className="mt-4 text-slate-400 text-sm sm:text-base">
              Eliminate switching between ten browser tabs. Connect conversations, automate sales, and schedule content from a unified workspace.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Pillar 1 */}
            <div className="rounded-2xl border border-purple-500/20 bg-slate-900/80 p-8 shadow-xl hover:border-purple-500/50 transition">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/30 mb-6">
                <MessageSquare className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">1. Central Messaging System</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                A unified 3-panel inbox for Facebook, Messenger, Instagram DMs, WhatsApp Business, and Website Live Chat. Real-time updates, customer profiles, and team assignments.
              </p>
              <ul className="mt-6 space-y-2 text-xs text-slate-300">
                <li className="flex items-center gap-2"><CheckCircle className="h-3.5 w-3.5 text-purple-400" /> Unified customer thread across channels</li>
                <li className="flex items-center gap-2"><CheckCircle className="h-3.5 w-3.5 text-purple-400" /> Instant human takeover with 1 click</li>
                <li className="flex items-center gap-2"><CheckCircle className="h-3.5 w-3.5 text-purple-400" /> Real unread counter & resolution state</li>
              </ul>
            </div>

            {/* Pillar 2 */}
            <div className="rounded-2xl border border-purple-500/30 bg-slate-900/90 p-8 shadow-xl hover:border-purple-500/60 transition relative">
              <div className="absolute -top-3 right-6 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-md">
                Powered by Gemini
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/40 mb-6">
                <Bot className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">2. AI Sales Agent</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Zero-hallucination sales assistant trained strictly on your store inventory, prices, and policies. Speaks fluent Bengali (বাংলা) & English to convert inquiries into sales.
              </p>
              <ul className="mt-6 space-y-2 text-xs text-slate-300">
                <li className="flex items-center gap-2"><CheckCircle className="h-3.5 w-3.5 text-purple-400" /> Never invents prices or fake stock</li>
                <li className="flex items-center gap-2"><CheckCircle className="h-3.5 w-3.5 text-purple-400" /> Captures name, address & phone for COD</li>
                <li className="flex items-center gap-2"><CheckCircle className="h-3.5 w-3.5 text-purple-400" /> Server-side secure token usage logging</li>
              </ul>
            </div>

            {/* Pillar 3 */}
            <div className="rounded-2xl border border-purple-500/20 bg-slate-900/80 p-8 shadow-xl hover:border-purple-500/50 transition">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 mb-6">
                <Calendar className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">3. Social Media Post Scheduler</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Compose, preview, and schedule posts across Facebook and Instagram. Durable backend scheduler with Asia/Dhaka timezone calendar and automated background worker.
              </p>
              <ul className="mt-6 space-y-2 text-xs text-slate-300">
                <li className="flex items-center gap-2"><CheckCircle className="h-3.5 w-3.5 text-purple-400" /> Monthly & weekly visual calendar</li>
                <li className="flex items-center gap-2"><CheckCircle className="h-3.5 w-3.5 text-purple-400" /> Facebook & Instagram post cards preview</li>
                <li className="flex items-center gap-2"><CheckCircle className="h-3.5 w-3.5 text-purple-400" /> Policy-compliant WhatsApp scheduled alerts</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 4. SUPPORTED CHANNELS & INTEGRATIONS */}
      <section id="integrations" className="py-20 border-t border-slate-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-widest text-purple-400">Supported Platforms</span>
            <h2 className="mt-2 text-3xl font-black text-white">
              Official Multi-Channel Ecosystem
            </h2>
            <p className="mt-3 text-slate-400 text-sm">
              We integrate only official, supported APIs for maximum stability and account security.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {[
              {
                name: 'Facebook Page',
                sub: 'Official Meta Graph API',
                color: 'text-blue-400',
                desc: 'Sync page feeds, wall posts & direct reviews',
              },
              {
                name: 'Messenger',
                sub: 'Real-time Webhook',
                color: 'text-sky-400',
                desc: 'Customer conversations with AI auto-replies',
              },
              {
                name: 'Instagram',
                sub: 'Professional Accounts',
                color: 'text-pink-400',
                desc: 'Direct messages & scheduled media publishing',
              },
              {
                name: 'WhatsApp Business',
                sub: 'Cloud Platform API',
                color: 'text-emerald-400',
                desc: 'Policy-compliant scheduled messaging & alerts',
              },
              {
                name: 'Live Chat Widget',
                sub: 'Embeddable Snippet',
                color: 'text-purple-400',
                desc: 'Real-time website visitor chat with zero latency',
              },
            ].map((p, i) => (
              <div key={i} className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 text-center hover:border-purple-500/40 transition">
                <div className={`text-sm font-bold ${p.color}`}>{p.name}</div>
                <div className="text-[11px] font-semibold text-slate-400 mt-1">{p.sub}</div>
                <div className="text-[11px] text-slate-500 mt-2">{p.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. PRICING PLANS */}
      <section id="pricing" className="py-20 border-t border-purple-500/10 bg-slate-900/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-widest text-purple-400">Pricing & Plans</span>
            <h2 className="mt-2 text-3xl sm:text-4xl font-black text-white">
              Transparent Plans for Growing Brands
            </h2>
            <p className="mt-3 text-slate-400 text-sm">
              Approved and managed directly through platform administration. Local payments supported via bKash, Nagad, and Cards.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                name: 'Starter',
                bdt: '1,499',
                usd: '15',
                desc: 'For small Facebook stores and emerging sellers.',
                features: [
                  '2 Channels (Facebook & Messenger)',
                  '500 Conversations / month',
                  '250 AI Sales Replies / month',
                  '20 Scheduled Social Posts',
                  '1 Team Member Seat',
                  'Standard Email Support',
                ],
                featured: false,
              },
              {
                name: 'Growth & Business',
                bdt: '3,499',
                usd: '35',
                desc: 'Best for active stores scaling customer conversions.',
                features: [
                  'All 5 Channels (FB, Messenger, IG, WhatsApp, Live Chat)',
                  '3,000 Conversations / month',
                  '1,500 Gemini AI Sales Replies / month',
                  '100 Scheduled Social Posts',
                  'WhatsApp Policy-Compliant Scheduler',
                  'Product Catalog & Direct Checkout',
                  '5 Team Member Seats',
                  'Priority Support',
                ],
                featured: true,
              },
              {
                name: 'Enterprise Hub',
                bdt: '7,999',
                usd: '80',
                desc: 'For established brands, agencies, and high volume.',
                features: [
                  'Unlimited Workspaces & Channels',
                  '15,000 Conversations / month',
                  '10,000 AI Sales Replies / month',
                  '500 Scheduled Posts / month',
                  'Custom Brand Voice & Deep Knowledge Base',
                  'Unlimited Team Seats',
                  'Audit Logging & Advanced Analytics',
                  'Dedicated Account Manager 24/7',
                ],
                featured: false,
              },
            ].map((plan, i) => (
              <div
                key={i}
                className={`relative rounded-2xl p-8 transition-all ${
                  plan.featured
                    ? 'border-2 border-purple-500 bg-slate-900 shadow-2xl shadow-purple-600/20'
                    : 'border border-slate-800 bg-slate-900/60'
                }`}
              >
                {plan.featured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white">
                    Most Popular
                  </div>
                )}
                <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                <p className="text-xs text-slate-400 mt-1">{plan.desc}</p>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-3xl sm:text-4xl font-black text-white">{plan.bdt} BDT</span>
                  <span className="text-xs text-slate-400">/ month (${plan.usd})</span>
                </div>
                <button
                  onClick={() => onOpenAuth('register')}
                  className={`mt-6 w-full rounded-xl py-2.5 text-xs font-bold transition ${
                    plan.featured
                      ? 'bg-purple-600 text-white hover:bg-purple-500 shadow-lg shadow-purple-600/30'
                      : 'border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700'
                  }`}
                >
                  Choose {plan.name}
                </button>
                <div className="mt-6 border-t border-slate-800 pt-6 space-y-2.5 text-xs text-slate-300">
                  {plan.features.map((f, j) => (
                    <div key={j} className="flex items-center gap-2">
                      <CheckCircle className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. FAQ SECTION */}
      <section id="faq" className="py-20 border-t border-slate-800">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-purple-400">Questions & Answers</span>
            <h2 className="mt-2 text-3xl font-black text-white">Frequently Asked Questions</h2>
          </div>

          <div className="space-y-4">
            {faqs.map((f, i) => {
              const isOpen = openFaq === i;
              return (
                <div key={i} className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : i)}
                    className="flex w-full items-center justify-between p-5 text-left text-sm font-bold text-white hover:text-purple-400 transition"
                  >
                    <span>{isBn ? f.qBn : f.qEn}</span>
                    {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 text-xs text-slate-400 leading-relaxed font-bengali">
                      {isBn ? f.aBn : f.aEn}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 7. FOOTER */}
      <footer className="border-t border-purple-500/20 bg-slate-950 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <YearInfoLogo size="md" showText={true} />
            <div className="flex flex-wrap items-center gap-6 text-xs text-slate-400">
              <a href="#features" className="hover:text-purple-400 transition">Features</a>
              <a href="#integrations" className="hover:text-purple-400 transition">Integrations</a>
              <a href="#pricing" className="hover:text-purple-400 transition">Pricing</a>
              <a href="#faq" className="hover:text-purple-400 transition">Support</a>
              <span className="text-slate-600">|</span>
              <span className="text-slate-500">Contact: yearinvo@gmail.com</span>
            </div>
          </div>
          <div className="mt-8 border-t border-slate-900 pt-6 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 gap-3">
            <div>© {new Date().getFullYear()} YEAR INFO AI. All rights reserved.</div>
            <div className="flex flex-wrap items-center gap-4 text-slate-400">
              <a href="/privacy-policy" className="hover:text-purple-400 transition underline-offset-2 hover:underline">
                Privacy Policy
              </a>
              <span>•</span>
              <a href="/terms-of-service" className="hover:text-purple-400 transition underline-offset-2 hover:underline">
                Terms of Service
              </a>
              <span>•</span>
              <a href="/data-deletion" className="hover:text-purple-400 transition underline-offset-2 hover:underline">
                User Data Deletion
              </a>
            </div>
            <div className="mt-2 sm:mt-0 text-slate-600">Central Messaging • AI Sales • Social Automation</div>
          </div>
        </div>
      </footer>
    </div>
  );
};
