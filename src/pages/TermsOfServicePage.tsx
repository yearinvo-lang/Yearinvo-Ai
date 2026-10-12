import React from 'react';
import { ArrowLeft, FileText, CheckCircle2, AlertCircle, Mail, Shield, Scale } from 'lucide-react';
import { YearInfoLogo } from '../components/YearInfoLogo.tsx';

export const TermsOfServicePage: React.FC = () => {
  const lastUpdated = 'October 12, 2026';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-purple-500/30 selection:text-white">
      {/* Top Header */}
      <header className="sticky top-0 z-40 border-b border-purple-500/20 bg-slate-950/90 backdrop-blur-md px-4 sm:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <YearInfoLogo size="md" showText={true} />
          <span className="hidden sm:inline-block rounded-full bg-purple-500/10 px-2.5 py-0.5 text-xs font-semibold text-purple-300 border border-purple-500/20">
            Terms of Service
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
            <Scale className="h-3.5 w-3.5" />
            <span>User Agreement</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Terms of Service
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Last Updated: <span className="font-semibold text-slate-300">{lastUpdated}</span> · Effective Date: October 2026
          </p>
          <p className="text-sm text-slate-300 leading-relaxed pt-2">
            These Terms of Service ("Terms") govern your access to and use of <strong>YEAR INFO AI</strong> ("Service", "Platform", or "we"), accessible at{' '}
            <a href="https://year-info-ai.vercel.app" className="text-purple-400 underline hover:text-purple-300">
              https://year-info-ai.vercel.app
            </a>
            . By creating an account, connecting messaging channels, or utilizing our software, you agree to be bound by these Terms.
          </p>
        </div>

        {/* Notice for Owner Review */}
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 sm:p-5 flex items-start gap-3.5 text-xs text-amber-200">
          <AlertCircle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-bold text-amber-300">Owner Legal Review Notice</div>
            <p className="text-amber-200/90 leading-relaxed">
              These terms are tailored to the software capabilities and operational realities of the YEAR INFO AI SaaS application. Registered corporate legal jurisdiction, statutory dispute arbitration clauses, and formal merchant refund terms are marked for final review by the business owner (contact: <code className="bg-amber-950/60 px-1 py-0.5 rounded font-mono">yearinvo@gmail.com</code>).
            </p>
          </div>
        </div>

        {/* Section 1: Service Description */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="text-purple-400 font-mono text-sm">1.</span>
            Service Description
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            YEAR INFO AI provides cloud-based software tools for online retail businesses. Capabilities include unified multi-channel messaging (Facebook Pages, Facebook Messenger, Instagram Professional, WhatsApp Business, and Website Live Chat), AI-assisted customer inquiries handling, product inventory catalogs, automated social post scheduling, and conversational order management.
          </p>
        </section>

        {/* Section 2: Account Responsibilities */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="text-purple-400 font-mono text-sm">2.</span>
            Account Responsibilities & Security
          </h2>
          <ul className="list-disc list-inside space-y-2 text-sm text-slate-300 pl-2">
            <li><strong>Accuracy of Information:</strong> You agree to provide accurate, current, and complete registration details and keep your business contact information updated.</li>
            <li><strong>Credential Confidentiality:</strong> You are responsible for safeguarding your login credentials and for any activities or actions executed under your workspace account.</li>
            <li><strong>Unauthorized Access:</strong> You agree to notify us immediately at <a href="mailto:yearinvo@gmail.com" className="text-purple-400 underline">yearinvo@gmail.com</a> if you discover or suspect any security breach or unauthorized access to your account.</li>
          </ul>
        </section>

        {/* Section 3: Acceptable Use Policy */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="text-purple-400 font-mono text-sm">3.</span>
            Acceptable Use Policy
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            You agree not to use YEAR INFO AI to:
          </p>
          <ul className="list-disc list-inside space-y-1.5 text-sm text-slate-300 pl-2">
            <li>Transmit unsolicited bulk messages ("spam"), illegal marketing, or deceptive commercial communications.</li>
            <li>Violate Meta Platform Terms, WhatsApp Business Policies, or Google API Terms of Service.</li>
            <li>Distribute defamatory, fraudulent, sexually explicit, abusive, or infringing content.</li>
            <li>Interfere with, circumvent, or disrupt the integrity or security of our software infrastructure or rate limits.</li>
            <li>Scrape, reverse-engineer, or decompile any part of the platform without explicit written authorization.</li>
          </ul>
        </section>

        {/* Section 4: Third-Party Integrations */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="text-purple-400 font-mono text-sm">4.</span>
            Third-Party Integrations (Meta & WhatsApp)
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Our platform interacts with third-party software, including Meta Graph APIs (Facebook, Messenger, Instagram) and Meta Cloud APIs (WhatsApp Business).
          </p>
          <ul className="list-disc list-inside space-y-1.5 text-sm text-slate-300 pl-2">
            <li>You warrant that you hold legitimate administrative rights to any Facebook Page, Instagram Account, or WhatsApp Business number you connect.</li>
            <li>We do not control and are not liable for outages, API modifications, app verification requirements, or policy enforcement actions enacted independently by Meta Platforms, Inc.</li>
            <li>You can disconnect any integration at any time through the Channels page in your workspace dashboard.</li>
          </ul>
        </section>

        {/* Section 5: AI-Generated Responses & Merchant Oversight */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="text-purple-400 font-mono text-sm">5.</span>
            AI-Generated Responses & Merchant Oversight
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Our AI Sales Agent and automated replies leverage Google Gemini large language models:
          </p>
          <ul className="list-disc list-inside space-y-1.5 text-sm text-slate-300 pl-2">
            <li><strong>Automated Nature:</strong> AI models generate responses based on probabilistic pattern matching using your configured product catalog and store context.</li>
            <li><strong>Merchant Responsibility:</strong> The merchant retains final business responsibility for the accuracy of pricing, discounts, product specifications, and customer commitments.</li>
            <li><strong>Manual Override:</strong> The platform provides one-click controls in the Central Inbox allowing human agents to pause AI handling for any conversation at any time.</li>
          </ul>
        </section>

        {/* Section 6: Subscription, Billing & Plans */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="text-purple-400 font-mono text-sm">6.</span>
            Subscription & Billing Terms
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            YEAR INFO AI offers monthly and annual software subscription tiers (such as Starter, Professional, and Enterprise plans).
          </p>
          <ul className="list-disc list-inside space-y-1.5 text-sm text-slate-300 pl-2">
            <li><strong>Plan Quotas:</strong> Plans include specified allowances for connected channels, monthly AI replies, and scheduled social media posts.</li>
            <li><strong>Payment Methods:</strong> Payments are processed through approved payment methods, including verified mobile financial services (e.g., bKash) and digital invoices.</li>
            <li><strong>Refund Policy:</strong> (Subject to owner confirmation): Subscriptions are billed in advance on a recurring or manual cycle. Refund eligibility for unused plan periods must be requested through support.</li>
          </ul>
        </section>

        {/* Section 7: Service Availability & Disclaimers */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="text-purple-400 font-mono text-sm">7.</span>
            Service Availability & Warranty Disclaimer
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            The platform is provided on an "AS IS" and "AS AVAILABLE" basis. While we strive for maximum uptime, we do not warrant that service will be uninterrupted, error-free, or entirely free of bugs. We disclaim all implied warranties of merchantability, fitness for a particular purpose, and non-infringement to the maximum extent permitted by applicable law.
          </p>
        </section>

        {/* Section 8: Termination */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="text-purple-400 font-mono text-sm">8.</span>
            Account Termination
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            You may terminate your account at any time by contacting support or submitting a request via our Data Deletion page. We reserve the right to suspend or terminate accounts that violate our Acceptable Use Policy, engage in fraudulent activity, or repeatedly breach third-party platform messaging rules.
          </p>
        </section>

        {/* Section 9: Contact Information */}
        <section className="space-y-3 border-t border-slate-800 pt-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="text-purple-400 font-mono text-sm">9.</span>
            Contact Information
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            For contractual inquiries, billing questions, or legal communications regarding these Terms:
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
            <a href="/privacy-policy" className="hover:text-white transition">Privacy Policy</a>
            <span>•</span>
            <a href="/terms-of-service" className="text-purple-400 hover:underline">Terms of Service</a>
            <span>•</span>
            <a href="/data-deletion" className="hover:text-white transition">Data Deletion</a>
          </div>
        </div>
      </footer>
    </div>
  );
};
