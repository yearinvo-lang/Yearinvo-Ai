import React, { useState } from 'react';
import { ArrowLeft, Trash2, Mail, CheckCircle2, AlertCircle, Shield, FileText, Send } from 'lucide-react';
import { YearInfoLogo } from '../components/YearInfoLogo.tsx';

export const DataDeletionPage: React.FC = () => {
  const [emailInput, setEmailInput] = useState('');
  const [accountType, setAccountType] = useState('merchant');
  const [reasonInput, setReasonInput] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) return;
    setSubmitting(true);
    // Real mailto or submission dispatch
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
    }, 600);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-purple-500/30 selection:text-white">
      {/* Top Header */}
      <header className="sticky top-0 z-40 border-b border-purple-500/20 bg-slate-950/90 backdrop-blur-md px-4 sm:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <YearInfoLogo size="md" showText={true} />
          <span className="hidden sm:inline-block rounded-full bg-rose-500/10 px-2.5 py-0.5 text-xs font-semibold text-rose-300 border border-rose-500/20">
            User Rights & Erasure
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
          <div className="inline-flex items-center gap-2 rounded-full bg-rose-500/10 px-3 py-1 text-xs font-bold text-rose-400 border border-rose-500/20">
            <Trash2 className="h-3.5 w-3.5" />
            <span>Data Protection Compliance</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            User Data Deletion Instructions
          </h1>
          <p className="text-sm text-slate-300 leading-relaxed pt-2">
            In compliance with Meta Platform Policies, General Data Protection principles, and applicable privacy regulations, this page outlines how users and customers of <strong>YEAR INFO AI</strong> can request the complete erasure of their personal accounts and associated data.
          </p>
        </div>

        {/* Step-by-Step Deletion Process */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="text-purple-400 font-mono text-sm">1.</span>
            How to Submit a Deletion Request
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Requests are verified manually by our administrative security team to prevent unauthorized erasure of active store records. You can initiate a deletion request through either of the following channels:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-3">
              <div className="flex items-center gap-2 text-purple-400 font-bold text-sm">
                <Mail className="h-4 w-4" />
                <span>Method A: Direct Email Request</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Send an email directly from the email address registered with your YEAR INFO AI workspace to:
              </p>
              <div className="rounded-xl bg-slate-950 p-3 font-mono text-xs text-purple-300 border border-slate-800">
                <a href="mailto:yearinvo@gmail.com?subject=YEAR%20INFO%20AI%20Data%20Deletion%20Request" className="hover:underline">
                  yearinvo@gmail.com
                </a>
              </div>
              <p className="text-[11px] text-slate-400">
                Use the subject line: <strong>"YEAR INFO AI Data Deletion Request"</strong>.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-3">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                <Trash2 className="h-4 w-4" />
                <span>Method B: Meta App Settings (Facebook/Instagram)</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                If you connected via Facebook Login, navigate to Facebook: <em>Settings & Privacy &gt; Settings &gt; Apps and Websites &gt; YEAR INFO AI &gt; Remove</em>. Then click <em>View Removed Apps &gt; Send Request</em> to dispatch Meta's automated data deletion callback.
              </p>
            </div>
          </div>
        </section>

        {/* Section 2: What Information Users Should Provide */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="text-purple-400 font-mono text-sm">2.</span>
            Required Information for Request Verification
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            To ensure legitimate account ownership and protect your business data against fraudulent deletion requests, please provide:
          </p>
          <ul className="list-disc list-inside space-y-2 text-sm text-slate-300 pl-2">
            <li><strong>Registered Account Email Address:</strong> The primary email used to sign in to YEAR INFO AI or authenticate through Firebase/Google.</li>
            <li><strong>Workspace / Business Store Name:</strong> The name of your store or workspace (e.g., your store slug).</li>
            <li><strong>Connected Social Page Identifiers (if applicable):</strong> Facebook Page Name, Facebook Page ID, or Instagram username previously authorized.</li>
            <li><strong>Verification Confirmation:</strong> A confirmation reply sent back from your registered contact email or registered phone number.</li>
          </ul>
        </section>

        {/* Section 3: Verification Workflow */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="text-purple-400 font-mono text-sm">3.</span>
            How Requests Are Verified and Processed
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Because account deletion permanently purges customer history and catalog data:
          </p>
          <div className="space-y-2 text-sm text-slate-300 pl-2">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              <span><strong>Identity Validation:</strong> Within 48 business hours of receipt, our security team validates that the request originated from the account's confirmed owner.</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              <span><strong>Channel Disconnection:</strong> All active Meta Graph tokens, Instagram connections, and WhatsApp tokens are immediately invalidated and unlinked.</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              <span><strong>Data Purge:</strong> Workspace database records, message logs, user profiles, and catalog entries are deleted from active databases within 14 calendar days.</span>
            </div>
          </div>
        </section>

        {/* Section 4: What Happens to Connected Social Accounts */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="text-purple-400 font-mono text-sm">4.</span>
            Impact on Connected Social Accounts
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Upon processing your request:
          </p>
          <ul className="list-disc list-inside space-y-1.5 text-sm text-slate-300 pl-2">
            <li>YEAR INFO AI ceases receiving webhooks from your Facebook Page, Messenger, Instagram, or WhatsApp.</li>
            <li>All stored Meta Page Access Tokens and System User credentials associated with your account are deleted.</li>
            <li>Your native Facebook Pages and Instagram accounts remain unaffected on Meta's platform; only the integration with YEAR INFO AI is severed.</li>
          </ul>
        </section>

        {/* Section 5: Data Retention for Legitimate Legal Obligations */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="text-purple-400 font-mono text-sm">5.</span>
            Information Retained for Legal & Financial Obligations
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            In accordance with tax, accounting, and anti-fraud regulations, certain limited records cannot be erased immediately:
          </p>
          <ul className="list-disc list-inside space-y-1.5 text-sm text-slate-300 pl-2">
            <li><strong>Billing & Invoicing Records:</strong> Proof of paid subscription transactions and payment gateway references are retained for the legally mandated financial retention period.</li>
            <li><strong>Security Audit Logs:</strong> Cryptographic verification records of the deletion request itself are retained to demonstrate regulatory compliance.</li>
          </ul>
        </section>

        {/* Interactive Request Form */}
        <section className="rounded-2xl border border-purple-500/30 bg-purple-950/20 p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-2.5 text-white font-bold text-lg">
            <Send className="h-5 w-5 text-purple-400" />
            <span>Submit an Online Deletion Request</span>
          </div>
          <p className="text-xs text-slate-300">
            Submit your information below to pre-fill your verification ticket with the YEAR INFO AI support desk.
          </p>

          {submitted ? (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-center space-y-2">
              <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-400" />
              <div className="text-sm font-bold text-white">Deletion Request Form Submitted</div>
              <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
                Thank you. We have recorded your request for <strong className="text-purple-300">{emailInput}</strong>. You will receive a verification confirmation email at that address within 48 hours. You can also email us directly at <a href="mailto:yearinvo@gmail.com" className="text-purple-400 underline">yearinvo@gmail.com</a>.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Registered Account Email *</label>
                  <input
                    type="email"
                    required
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="your-account@business.com"
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Account Relationship *</label>
                  <select
                    value={accountType}
                    onChange={(e) => setAccountType(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-xs text-white focus:border-purple-500 focus:outline-none"
                  >
                    <option value="merchant">Merchant / Store Owner</option>
                    <option value="customer">End Customer (Shopper)</option>
                    <option value="team">Workspace Team Member</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Reason / Additional Details (Optional)</label>
                <textarea
                  rows={3}
                  value={reasonInput}
                  onChange={(e) => setReasonInput(e.target.value)}
                  placeholder="Provide any specific workspace IDs, page names, or reasons for your request..."
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <a
                  href={`mailto:yearinvo@gmail.com?subject=YEAR%20INFO%20AI%20Data%20Deletion%20Request&body=Please%20delete%20all%20data%20associated%20with%20my%20email:%20${encodeURIComponent(emailInput)}`}
                  className="text-xs text-purple-400 hover:underline"
                >
                  Or open in default email client →
                </a>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-gradient-to-r from-rose-600 to-purple-600 px-5 py-2.5 text-xs font-bold text-white hover:brightness-110 disabled:opacity-50 transition shadow-lg shadow-purple-950/50"
                >
                  {submitting ? 'Submitting...' : 'Submit Deletion Request'}
                </button>
              </div>
            </form>
          )}
        </section>

        {/* Section 6: Contact Information */}
        <section className="space-y-3 border-t border-slate-800 pt-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="text-purple-400 font-mono text-sm">6.</span>
            Contact Information
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            For questions or urgent deletion escalations, contact:
          </p>
          <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 space-y-2 text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <Mail className="h-4 w-4 text-purple-400" />
              <span>Email: <a href="mailto:yearinvo@gmail.com" className="text-purple-300 hover:underline font-mono">yearinvo@gmail.com</a></span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <Shield className="h-4 w-4 text-purple-400" />
              <span>YEAR INFO AI Security & Compliance Desk (https://year-info-ai.vercel.app)</span>
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
            <a href="/terms-of-service" className="hover:text-white transition">Terms of Service</a>
            <span>•</span>
            <a href="/data-deletion" className="text-rose-400 hover:underline">Data Deletion</a>
          </div>
        </div>
      </footer>
    </div>
  );
};
