import React from 'react';
import { ArrowLeft, Shield, Lock, FileText, CheckCircle2, AlertCircle, Mail, ExternalLink } from 'lucide-react';
import { YearInfoLogo } from '../components/YearInfoLogo.tsx';

export const PrivacyPolicyPage: React.FC = () => {
  const lastUpdated = 'October 12, 2026';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-purple-500/30 selection:text-white">
      {/* Top Header */}
      <header className="sticky top-0 z-40 border-b border-purple-500/20 bg-slate-950/90 backdrop-blur-md px-4 sm:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <YearInfoLogo size="md" showText={true} />
          <span className="hidden sm:inline-block rounded-full bg-purple-500/10 px-2.5 py-0.5 text-xs font-semibold text-purple-300 border border-purple-500/20">
            Legal Documentation
          </span>
        </div>
        <div className="flex items-center gap-4">
          <a
            href="/"
            className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-slate-300 hover:text-white hover:border-purple-500/40 transition"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Return to App</span>
          </a>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-10">
        
        {/* Document Header */}
        <div className="space-y-3 border-b border-slate-800 pb-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-purple-500/10 px-3 py-1 text-xs font-bold text-purple-400 border border-purple-500/20">
            <Shield className="h-3.5 w-3.5" />
            <span>Official Policy Document</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Privacy Policy
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Last Updated: <span className="font-semibold text-slate-300">{lastUpdated}</span> · Effective Date: October 2026
          </p>
          <p className="text-sm text-slate-300 leading-relaxed pt-2">
            This Privacy Policy describes how <strong>YEAR INFO AI</strong> ("we", "us", or "our"), available at{' '}
            <a href="https://year-info-ai.vercel.app" className="text-purple-400 underline hover:text-purple-300">
              https://year-info-ai.vercel.app
            </a>
            , collects, stores, processes, and protects your information when you register an account, utilize our multi-channel conversational platform, connect external messaging services, and use our AI-assisted e-commerce management features.
          </p>
        </div>

        {/* Notice for Store Owner Customization */}
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 sm:p-5 flex items-start gap-3.5 text-xs text-amber-200">
          <AlertCircle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-bold text-amber-300">Notice Regarding Specific Legal Jurisdiction & Corporate Entity</div>
            <p className="text-amber-200/90 leading-relaxed">
              This document reflects the actual technical implementation and data flows of the YEAR INFO AI platform. Formal legal entity registration details, registered business jurisdiction address, and custom data processing addenda should be confirmed by the platform owner (contact: <code className="bg-amber-950/60 px-1 py-0.5 rounded font-mono">yearinvo@gmail.com</code>).
            </p>
          </div>
        </div>

        {/* Section 1: Introduction */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="text-purple-400 font-mono text-sm">1.</span>
            Introduction
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            YEAR INFO AI is a unified conversational commerce platform designed for retail brands, e-commerce stores, and digital businesses. Our software enables merchants to centralize customer communications across Facebook Pages, Facebook Messenger, Instagram Professional Accounts, WhatsApp Business, and Website Live Chat into a single dashboard powered by automated AI response capabilities.
          </p>
        </section>

        {/* Section 2: Information Collected */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="text-purple-400 font-mono text-sm">2.</span>
            Information Collected
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            We collect information strictly necessary to provision your workspace, authenticate authorized users, route customer conversations, and execute merchant-configured workflows:
          </p>
          <ul className="list-disc list-inside space-y-2 text-sm text-slate-300 pl-2">
            <li>
              <strong>Account Registration Information:</strong> Your full name, business email address, contact phone number, workspace/store name, account passwords (cryptographically hashed using industry-standard salting), and profile avatars.
            </li>
            <li>
              <strong>Workspace & Catalog Data:</strong> Product catalog items, SKU codes, variants, prices, inventory counts, delivery charge rules, and merchant store settings.
            </li>
            <li>
              <strong>Customer Interaction Records:</strong> Names, phone numbers, email addresses, and message logs generated when customers communicate with your connected channels or website live chat widget.
            </li>
            <li>
              <strong>Order & Transaction Records:</strong> Order details, order numbers, purchased items, customer shipping addresses, payment methods (such as Cash on Delivery or bKash references), and delivery statuses.
            </li>
            <li>
              <strong>Technical & Usage Data:</strong> Session tokens, IP addresses, browser types, and API usage records (such as AI token consumption logs) required for service reliability and billing.
            </li>
          </ul>
        </section>

        {/* Section 3: Connected Social Media Accounts & Third-Party APIs */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="text-purple-400 font-mono text-sm">3.</span>
            Connected Social Media Accounts (Meta & WhatsApp)
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            YEAR INFO AI integrates with third-party messaging and social networks through official APIs:
          </p>
          <div className="space-y-3 pt-1">
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-2">
              <h3 className="text-sm font-bold text-purple-300">Facebook Pages & Facebook Messenger (Meta Graph API)</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                When you explicitly connect your Facebook account, our app requests authorized OAuth access tokens solely to access the Facebook Pages you manage. We use these tokens to retrieve incoming messages sent to your Page, post scheduled content created by you, and deliver merchant or AI responses. We do not access your personal profile feed, personal private messages, or friends lists.
              </p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-2">
              <h3 className="text-sm font-bold text-purple-300">Instagram Professional Accounts (Meta Graph API)</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                For Instagram integrations, our application interacts with Instagram Professional accounts connected to your authorized Facebook Pages. We process Direct Messages, comment inquiries, and media publishing tasks initiated through your workspace.
              </p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-2">
              <h3 className="text-sm font-bold text-purple-300">WhatsApp Business Cloud API</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                When you connect your WhatsApp Business account via Phone Number ID and Meta System User token, we transmit order updates and incoming customer replies compliant with WhatsApp Business messaging policies.
              </p>
            </div>
          </div>
        </section>

        {/* Section 4: AI-Assisted Processing */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="text-purple-400 font-mono text-sm">4.</span>
            AI-Assisted Processing (Google Gemini API)
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            YEAR INFO AI utilizes Google's Gemini models via server-side APIs to power customer support assistants and automated product recommendations. When an inquiry is received:
          </p>
          <ul className="list-disc list-inside space-y-1.5 text-sm text-slate-300 pl-2">
            <li>Customer inquiries and relevant product catalog entries are provided to the model strictly to compose contextual replies.</li>
            <li>We do not sell, rent, or lease customer conversation transcripts to third-party data brokers.</li>
            <li>Merchants can enable, pause, or disable AI automated handling for any individual customer conversation at any time from the Central Inbox.</li>
          </ul>
        </section>

        {/* Section 5: Data Storage, Security & Retention */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="text-purple-400 font-mono text-sm">5.</span>
            Data Storage, Security & Retention
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            We employ industry-standard technical measures to safeguard your information:
          </p>
          <ul className="list-disc list-inside space-y-1.5 text-sm text-slate-300 pl-2">
            <li><strong>Transport Security:</strong> All data transmitted between your browser and our servers is encrypted using Transport Layer Security (HTTPS/TLS).</li>
            <li><strong>Authentication Security:</strong> User credentials are authenticated through Firebase Authentication and cryptographically secured server session tokens.</li>
            <li><strong>Data Retention:</strong> Active account data is retained for the duration of your workspace subscription. When you delete your account or disconnect a channel, associated active channel access tokens are revoked and purged from active routing tables.</li>
          </ul>
        </section>

        {/* Section 6: Third-Party Service Providers */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="text-purple-400 font-mono text-sm">6.</span>
            Third-Party Service Providers
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Our application relies on the following infrastructure providers to deliver its services:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3">
              <span className="font-bold text-white">Meta Platforms, Inc.</span>
              <p className="text-slate-400 mt-1">Facebook Graph API, Instagram Graph API, WhatsApp Cloud API.</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3">
              <span className="font-bold text-white">Google Cloud & Firebase</span>
              <p className="text-slate-400 mt-1">Firebase Authentication, Google Gemini LLM API.</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3">
              <span className="font-bold text-white">Vercel Inc.</span>
              <p className="text-slate-400 mt-1">Frontend application delivery and hosting infrastructure.</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3">
              <span className="font-bold text-white">SMTP Email Service</span>
              <p className="text-slate-400 mt-1">Transactional report delivery and verification emails.</p>
            </div>
          </div>
        </section>

        {/* Section 7: User Rights & Data Deletion */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="text-purple-400 font-mono text-sm">7.</span>
            User Rights & Data Deletion
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            You have the right to inspect, update, export, or request the permanent deletion of your personal and business records. Detailed instructions on requesting data erasure are provided on our dedicated User Data Deletion page:
          </p>
          <div className="pt-1">
            <a
              href="/data-deletion"
              className="inline-flex items-center gap-2 rounded-xl border border-purple-500/40 bg-purple-900/30 px-4 py-2.5 text-xs font-bold text-purple-300 hover:bg-purple-900/50 hover:text-white transition"
            >
              <span>View Data Deletion Instructions (/data-deletion)</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </section>

        {/* Section 8: Cookies & Analytics */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="text-purple-400 font-mono text-sm">8.</span>
            Cookies & Local Storage
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            We use browser LocalStorage and essential session cookies strictly to keep you authenticated, remember your language preference (English or Bengali), preserve your theme preference (Dark or Light), and route workspace actions. We do not use third-party invasive ad tracking cookies.
          </p>
        </section>

        {/* Section 9: Policy Updates */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="text-purple-400 font-mono text-sm">9.</span>
            Updates to this Policy
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            We may revise this Privacy Policy periodically to reflect new software capabilities, regulatory requirements, or third-party platform policy adjustments. Material changes will be indicated with an updated "Last Updated" timestamp on this page.
          </p>
        </section>

        {/* Section 10: Contact Information */}
        <section className="space-y-3 border-t border-slate-800 pt-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="text-purple-400 font-mono text-sm">10.</span>
            Contact Information
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            For privacy inquiries, data access requests, or questions regarding this Privacy Policy, please reach out directly:
          </p>
          <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 space-y-2 text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <Mail className="h-4 w-4 text-purple-400" />
              <span>Email: <a href="mailto:yearinvo@gmail.com" className="text-purple-300 hover:underline font-mono">yearinvo@gmail.com</a></span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <Shield className="h-4 w-4 text-purple-400" />
              <span>Platform: YEAR INFO AI (https://year-info-ai.vercel.app)</span>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-8 px-4 text-center text-xs text-slate-500">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>© {new Date().getFullYear()} YEAR INFO AI. All rights reserved.</div>
          <div className="flex items-center gap-4 text-slate-400">
            <a href="/privacy-policy" className="text-purple-400 hover:underline">Privacy Policy</a>
            <span>•</span>
            <a href="/terms-of-service" className="hover:text-white transition">Terms of Service</a>
            <span>•</span>
            <a href="/data-deletion" className="hover:text-white transition">Data Deletion</a>
          </div>
        </div>
      </footer>
    </div>
  );
};
