import React, { useState, useEffect } from 'react';
import {
  Bot,
  Sparkles,
  Save,
  Plus,
  Trash2,
  Edit2,
  Clock,
  ShieldAlert,
  Send,
  Zap,
  CheckCircle,
  HelpCircle,
  Layers,
  TrendingUp,
  MessageSquare,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { AISettings, KnowledgeItem, AIUsageRecord } from '../types/index.ts';

export const AIAgentPage: React.FC = () => {
  const { activeWorkspace, apiRequest, language } = useAuth();

  const [settings, setSettings] = useState<AISettings | null>(null);
  const [knowledgeItems, setKnowledgeItems] = useState<KnowledgeItem[]>([]);
  const [usageRecords, setUsageRecords] = useState<AIUsageRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'settings' | 'knowledge' | 'tester' | 'usage'>('settings');

  // New knowledge modal/form
  const [showAddKnowledge, setShowAddKnowledge] = useState(false);
  const [newCategory, setNewCategory] = useState<'delivery' | 'payment' | 'policy' | 'faq' | 'general'>('faq');
  const [newQuestion, setNewQuestion] = useState('');
  const [newAnswer, setNewAnswer] = useState('');

  // Interactive Prompt Tester
  const [testPrompt, setTestPrompt] = useState('আপনাদের কাছে কি নীল রঙের সুতি পাঞ্জাবি আছে? দাম কত?');
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const isBn = language === 'bn';

  const loadData = async () => {
    if (!activeWorkspace) return;
    try {
      const [sData, kData, uData] = await Promise.all([
        apiRequest('/api/ai/settings'),
        apiRequest('/api/ai/knowledge'),
        apiRequest('/api/ai/usage'),
      ]);
      setSettings(sData);
      setKnowledgeItems(kData);
      setUsageRecords(uData);
    } catch (e) {
      console.error('Failed to load AI data:', e);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeWorkspace?.id]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    setSaveSuccess(false);
    try {
      const updated = await apiRequest('/api/ai/settings', {
        method: 'PUT',
        body: JSON.stringify(settings),
      });
      setSettings(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e) {
      console.error('Error saving AI settings:', e);
    } finally {
      setSaving(false);
    }
  };

  const handleAddKnowledge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestion.trim() || !newAnswer.trim()) return;

    try {
      const created = await apiRequest('/api/ai/knowledge', {
        method: 'POST',
        body: JSON.stringify({
          category: newCategory,
          question: newQuestion.trim(),
          answer: newAnswer.trim(),
          language: 'both',
        }),
      });
      setKnowledgeItems((prev) => [...prev, created]);
      setNewQuestion('');
      setNewAnswer('');
      setShowAddKnowledge(false);
    } catch (e) {
      console.error('Error adding knowledge item:', e);
    }
  };

  const handleDeleteKnowledge = async (id: string) => {
    try {
      await apiRequest(`/api/ai/knowledge/${id}`, { method: 'DELETE' });
      setKnowledgeItems((prev) => prev.filter((k) => k.id !== id));
    } catch (e) {
      console.error('Error deleting knowledge item:', e);
    }
  };

  const handleRunSimulator = async () => {
    if (!testPrompt.trim() || testing) return;
    setTesting(true);
    setTestResult(null);

    try {
      // Simulate reply against first active conversation or general test prompt
      const res = await apiRequest('/api/ai/sales-reply', {
        method: 'POST',
        body: JSON.stringify({
          conversationId: 'conv_1',
          prompt: testPrompt,
        }),
      });
      setTestResult(res.replyText || 'No reply generated');
      // Refresh usage logs
      const uData = await apiRequest('/api/ai/usage');
      setUsageRecords(uData);
    } catch (e: any) {
      setTestResult(`Error: ${e.message}`);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-purple-500/30 bg-gradient-to-r from-slate-900 via-purple-950/40 to-slate-900 p-6 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-lg shadow-purple-900/40">
            <Bot className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-white">AI Sales Agent Hub</h1>
              <span className="rounded-full bg-purple-500/20 px-2.5 py-0.5 text-[10px] font-bold text-purple-300 border border-purple-500/30">
                Gemini Factual Engine
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Zero-hallucination sales assistant grounded in your database products, pricing, and business rules.
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex flex-wrap gap-1 rounded-xl bg-slate-950 p-1 border border-slate-800 text-xs font-semibold">
          {[
            { id: 'settings', label: 'Agent Configuration' },
            { id: 'knowledge', label: `Knowledge Base (${knowledgeItems.length})` },
            { id: 'tester', label: 'Prompt Simulator' },
            { id: 'usage', label: `Usage & Costs (${usageRecords.length})` },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`rounded-lg px-3 py-1.5 transition ${
                activeTab === t.id ? 'bg-purple-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* TAB 1: SETTINGS */}
      {activeTab === 'settings' && settings && (
        <form onSubmit={handleSaveSettings} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* General Behavior */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 space-y-4">
              <h2 className="text-base font-bold text-white border-b border-slate-800 pb-3">
                Operational Behavior
              </h2>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-white">AI Automation Active</div>
                  <div className="text-xs text-slate-400">Allow AI to generate and send verified answers to customers</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.enabled}
                  onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
                  className="h-5 w-5 rounded border-slate-700 bg-slate-950 text-purple-600 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Brand Voice</label>
                <select
                  value={settings.brandVoice}
                  onChange={(e) => setSettings({ ...settings, brandVoice: e.target.value as any })}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-purple-500 focus:outline-none"
                >
                  <option value="friendly">Friendly & Helpful (Polite Bangladeshi Merchant Tone)</option>
                  <option value="professional">Professional & Crisp</option>
                  <option value="consultative">Consultative & Solution-Oriented</option>
                  <option value="concise">Concise & Direct (Fast checkout focus)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Primary Model Name</label>
                <input
                  type="text"
                  value={settings.model}
                  onChange={(e) => setSettings({ ...settings, model: e.target.value })}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-mono text-purple-300 focus:border-purple-500 focus:outline-none"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">Configured via server-side Google GenAI client.</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Human Handoff Keywords (Comma separated)</label>
                <input
                  type="text"
                  value={settings.humanTakeoverKeywords?.join(', ')}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      humanTakeoverKeywords: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                    })
                  }
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-purple-500 focus:outline-none"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Messages containing these trigger automatic human routing and pause AI.
                </span>
              </div>
            </div>

            {/* Language & Greetings */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 space-y-4">
              <h2 className="text-base font-bold text-white border-b border-slate-800 pb-3">
                Greetings & Language Modes
              </h2>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Custom Greeting (Bengali / বাংলা)</label>
                <textarea
                  rows={3}
                  value={settings.customGreetingBn}
                  onChange={(e) => setSettings({ ...settings, customGreetingBn: e.target.value })}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-xs text-white focus:border-purple-500 focus:outline-none font-bengali"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Custom Greeting (English)</label>
                <textarea
                  rows={3}
                  value={settings.customGreetingEn}
                  onChange={(e) => setSettings({ ...settings, customGreetingEn: e.target.value })}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-xs text-white focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <div>
                  <div className="text-sm font-semibold text-white">Direct Order Capture</div>
                  <div className="text-xs text-slate-400">Prompt customer for delivery address & mobile number upon purchase intent</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.enableDirectOrderCreation}
                  onChange={(e) => setSettings({ ...settings, enableDirectOrderCreation: e.target.checked })}
                  className="h-5 w-5 rounded border-slate-700 bg-slate-950 text-purple-600 focus:ring-purple-500"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            {saveSuccess ? (
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                <CheckCircle className="h-4 w-4" /> AI configuration saved successfully!
              </span>
            ) : <span />}

            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-purple-600/30 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 transition"
            >
              <Save className="h-4 w-4" />
              <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
            </button>
          </div>
        </form>
      )}

      {/* TAB 2: KNOWLEDGE BASE */}
      {activeTab === 'knowledge' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-400">
              Provide official business rules, delivery timelines, return conditions, and payment procedures.
            </p>
            <button
              onClick={() => setShowAddKnowledge(true)}
              className="flex items-center gap-1.5 rounded-xl bg-purple-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-purple-500 transition"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Knowledge Item</span>
            </button>
          </div>

          {showAddKnowledge && (
            <form onSubmit={handleAddKnowledge} className="rounded-2xl border border-purple-500/30 bg-slate-900 p-5 space-y-3">
              <h3 className="text-sm font-bold text-white">Create New Business Rule / FAQ</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-purple-500 focus:outline-none"
                  >
                    <option value="delivery">Delivery & Shipping</option>
                    <option value="payment">Payment Methods</option>
                    <option value="policy">Return & Exchange Policy</option>
                    <option value="faq">Frequently Asked Question</option>
                    <option value="general">General Store Information</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Question / Topic Heading</label>
                  <input
                    type="text"
                    required
                    value={newQuestion}
                    onChange={(e) => setNewQuestion(e.target.value)}
                    placeholder="e.g. Return procedure for defective size"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Official Factual Answer</label>
                <textarea
                  rows={3}
                  required
                  value={newAnswer}
                  onChange={(e) => setNewAnswer(e.target.value)}
                  placeholder="Detail the exact turnaround time, fees, or policy..."
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-xs text-white focus:border-purple-500 focus:outline-none font-bengali"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddKnowledge(false)}
                  className="rounded-xl border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-purple-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-purple-500"
                >
                  Save Item
                </button>
              </div>
            </form>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {knowledgeItems.map((k) => (
              <div key={k.id} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-2 relative group">
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-purple-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-purple-300 border border-purple-500/20">
                    {k.category}
                  </span>
                  <button
                    onClick={() => handleDeleteKnowledge(k.id)}
                    className="text-slate-500 hover:text-rose-400 transition"
                    title="Delete item"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <h4 className="font-bold text-sm text-white">{k.question}</h4>
                <p className="text-xs text-slate-300 font-bengali leading-relaxed whitespace-pre-wrap">{k.answer}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: INTERACTIVE PROMPT SIMULATOR */}
      {activeTab === 'tester' && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 space-y-4">
          <div className="border-b border-slate-800 pb-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-400" />
              Live Prompt Grounding Simulator
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Test asking any question in Bengali or English. Watch the AI reference your database products without fabricating information.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Customer Test Inquiry</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={testPrompt}
                onChange={(e) => setTestPrompt(e.target.value)}
                placeholder="Ask about price, stock, or delivery..."
                className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-xs text-white focus:border-purple-500 focus:outline-none font-bengali"
              />
              <button
                type="button"
                onClick={handleRunSimulator}
                disabled={testing}
                className="flex items-center gap-1.5 rounded-xl bg-purple-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-purple-500 disabled:opacity-40 transition"
              >
                <Send className="h-3.5 w-3.5" />
                <span>{testing ? 'Analyzing...' : 'Test AI'}</span>
              </button>
            </div>
          </div>

          {/* Quick preset buttons */}
          <div className="flex flex-wrap gap-2 text-xs">
            <button
              onClick={() => setTestPrompt('পাঞ্জাবির স্টক ও দাম কত?')}
              className="rounded-lg bg-slate-800 px-2.5 py-1 text-slate-300 hover:text-white"
            >
              🛍️ পাঞ্জাবির স্টক ও দাম
            </button>
            <button
              onClick={() => setTestPrompt('ঢাকার বাইরে ডেলিভারি চার্জ কত এবং কতদিন সময় লাগে?')}
              className="rounded-lg bg-slate-800 px-2.5 py-1 text-slate-300 hover:text-white"
            >
              🚚 ঢাকার বাইরে ডেলিভারি চার্জ
            </button>
            <button
              onClick={() => setTestPrompt('Do you accept bKash or credit cards?')}
              className="rounded-lg bg-slate-800 px-2.5 py-1 text-slate-300 hover:text-white"
            >
              💳 Payment methods
            </button>
            <button
              onClick={() => setTestPrompt('আমি একজন এজেন্টের সাথে কথা বলতে চাই')}
              className="rounded-lg bg-slate-800 px-2.5 py-1 text-slate-300 hover:text-white"
            >
              👤 Human handoff test
            </button>
          </div>

          {testResult && (
            <div className="mt-4 rounded-xl border border-purple-500/30 bg-purple-950/30 p-4 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-purple-300">
                <Bot className="h-4 w-4" />
                <span>Generated Factual Output:</span>
              </div>
              <p className="text-xs text-white font-bengali leading-relaxed whitespace-pre-wrap">
                {testResult}
              </p>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: USAGE & AUDIT LOGS */}
      {activeTab === 'usage' && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h2 className="text-base font-bold text-white">AI Consumption & Token Audit</h2>
              <p className="text-xs text-slate-400">Accurate token tracking and estimated compute costs</p>
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold text-slate-400">Total Queries Logged: </span>
              <strong className="text-sm text-purple-300">{usageRecords.length}</strong>
            </div>
          </div>

          {usageRecords.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No AI queries recorded yet. Test an inquiry in Central Inbox or Simulator to view live records.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="py-2.5 px-3">Timestamp</th>
                    <th className="py-2.5 px-3">Model</th>
                    <th className="py-2.5 px-3">Query Snippet</th>
                    <th className="py-2.5 px-3">Tokens</th>
                    <th className="py-2.5 px-3">Cost (USD)</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {usageRecords.slice(0, 20).map((r) => (
                    <tr key={r.id} className="hover:bg-slate-900/50">
                      <td className="py-2 px-3 text-slate-400">
                        {new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-2 px-3 text-purple-300 font-bold">{r.model}</td>
                      <td className="py-2 px-3 text-slate-300 font-sans truncate max-w-xs">{r.querySnippet}</td>
                      <td className="py-2 px-3 text-white">{r.tokensUsed}</td>
                      <td className="py-2 px-3 text-emerald-400">${r.estimatedCostUsd}</td>
                      <td className="py-2 px-3">
                        <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald-400">
                          Success
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
