import React, { useState } from 'react';
import {
  Settings,
  Store,
  User,
  Globe,
  Clock,
  Shield,
  Save,
  CheckCircle,
  LogOut,
  Sun,
  Moon,
  Sparkles,
  Key,
  Check,
  AlertTriangle,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

export const SettingsPage: React.FC = () => {
  const { user, activeWorkspace, apiRequest, logout, language, toggleLanguage, theme, toggleTheme } = useAuth();

  const [businessName, setBusinessName] = useState(activeWorkspace?.name || '');
  const [phone, setPhone] = useState(activeWorkspace?.phone || '');
  const [currency, setCurrency] = useState(activeWorkspace?.currency || 'BDT');
  const [timezone, setTimezone] = useState(activeWorkspace?.timezone || 'Asia/Dhaka');
  const [address, setAddress] = useState(activeWorkspace?.address || '');

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  // AI Provider & API Key States
  const [selectedProvider, setSelectedProvider] = useState<'prov_gemini' | 'prov_openai' | 'prov_groq'>('prov_gemini');
  const [aiApiKey, setAiApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [testingKey, setTestingKey] = useState(false);
  const [savingKey, setSavingKey] = useState(false);
  const [keyFeedback, setKeyFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleTestAIKey = async () => {
    if (!aiApiKey.trim()) return;
    setTestingKey(true);
    setKeyFeedback(null);
    try {
      const res = await apiRequest(`/api/admin/ai-providers/${selectedProvider}/test`, {
        method: 'POST',
        body: JSON.stringify({ testKey: aiApiKey.trim() }),
      });
      if (res.success) {
        setKeyFeedback({ type: 'success', message: `Verification successful! Connected in ${res.latencyMs || 0}ms.` });
      } else {
        setKeyFeedback({ type: 'error', message: res.error || res.message || 'Key test failed.' });
      }
    } catch (err: any) {
      setKeyFeedback({ type: 'error', message: err.message || 'Connection test failed.' });
    } finally {
      setTestingKey(false);
    }
  };

  const handleSaveAIKey = async () => {
    if (!aiApiKey.trim()) return;
    setSavingKey(true);
    setKeyFeedback(null);
    try {
      await apiRequest(`/api/admin/ai-providers/${selectedProvider}`, {
        method: 'PUT',
        body: JSON.stringify({
          apiKey: aiApiKey.trim(),
          isEnabled: true,
          isConfigured: true,
        }),
      });
      setKeyFeedback({ type: 'success', message: 'API key saved securely! The AI Assistant will now use this key.' });
      setAiApiKey('');
    } catch (err: any) {
      setKeyFeedback({ type: 'error', message: err.message || 'Failed to save API key.' });
    } finally {
      setSavingKey(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspace) return;
    setSaving(true);
    setSuccess(false);

    try {
      await apiRequest(`/api/workspaces/${activeWorkspace.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: businessName,
          phone,
          currency,
          timezone,
          address,
        }),
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e) {
      console.error('Failed to save settings:', e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">Workspace & Profile Settings</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Configure business metadata, currency, timezone, and security credentials.</p>
        </div>

        <button
          onClick={logout}
          className="flex items-center gap-1.5 rounded-xl border border-rose-300 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 px-3.5 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-500/20 transition shadow-sm"
        >
          <LogOut className="h-4 w-4" />
          <span>Sign Out</span>
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-6 space-y-4 shadow-sm transition-colors">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <Store className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            Business Store Details
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Store / Workspace Name</label>
              <input
                type="text"
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-purple-500 focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Support Mobile / WhatsApp</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-purple-500 focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Default Timezone</label>
              <input
                type="text"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-purple-500 focus:outline-none font-mono transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Store Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-purple-500 focus:outline-none transition-colors cursor-pointer"
              >
                <option value="BDT">BDT (৳ - Bangladeshi Taka)</option>
                <option value="USD">USD ($ - US Dollar)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Dispatch / Official Address</label>
            <textarea
              rows={2}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-2.5 text-xs text-slate-900 dark:text-white focus:border-purple-500 focus:outline-none transition-colors"
            />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-6 space-y-4 shadow-sm transition-colors">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <User className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            User Account, Theme & Language
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Account Name</label>
              <input
                type="text"
                disabled
                value={user?.name || ''}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 px-3 py-2 text-xs text-slate-500 dark:text-slate-400 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Email Address</label>
              <input
                type="text"
                disabled
                value={user?.email || ''}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 px-3 py-2 text-xs text-slate-500 dark:text-slate-400 cursor-not-allowed"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div>
              <div className="text-xs font-semibold text-slate-900 dark:text-white">Interface Language Preference</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">Current language: {language === 'bn' ? 'বাংলা (Bengali)' : 'English'}</div>
            </div>
            <button
              type="button"
              onClick={toggleLanguage}
              className="rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-purple-700 dark:text-purple-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
            >
              Switch to {language === 'bn' ? 'English' : 'বাংলা'}
            </button>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
            <div>
              <div className="text-xs font-semibold text-slate-900 dark:text-white">Interface Appearance & Theme</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">Current theme: {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</div>
            </div>
            <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-950 p-1">
              <button
                type="button"
                onClick={() => theme !== 'light' && toggleTheme()}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                  theme === 'light' ? 'bg-white text-purple-600 shadow-sm font-bold' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Sun className="h-3.5 w-3.5 text-amber-500" />
                <span>Light</span>
              </button>
              <button
                type="button"
                onClick={() => theme !== 'dark' && toggleTheme()}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                  theme === 'dark' ? 'bg-purple-600 text-white shadow-sm font-bold' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Moon className="h-3.5 w-3.5" />
                <span>Dark</span>
              </button>
            </div>
          </div>
        </div>

        {/* AI Assistant & Intelligence Configuration */}
        <div className="rounded-2xl border border-purple-500/20 bg-gradient-to-b from-purple-950/20 to-transparent p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-purple-500/20 pb-3">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-500" />
              AI Assistant & API Gateway Configuration
            </h2>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
              Active Grounded Brain
            </span>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            Configure your custom Gemini, OpenAI, or Groq API key to power conversational business intelligence, sales agent chats, and social post generation. When using the default project, grounded store analytics are always enabled automatically.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { id: 'prov_gemini', name: 'Google Gemini', desc: 'gemini-3.8-flash (Recommended)' },
              { id: 'prov_openai', name: 'OpenAI', desc: 'gpt-4o-mini' },
              { id: 'prov_groq', name: 'Groq Cloud', desc: 'llama-3.3-70b-versatile' },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedProvider(p.id as any)}
                className={`p-3 rounded-xl border text-left transition ${
                  selectedProvider === p.id
                    ? 'border-purple-500 bg-purple-600/10 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 shadow-sm'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="font-bold text-xs">{p.name}</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">{p.desc}</div>
              </button>
            ))}
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span>{selectedProvider === 'prov_gemini' ? 'Gemini API Key' : selectedProvider === 'prov_openai' ? 'OpenAI API Key' : 'Groq API Key'}</span>
              <span className="text-[11px] font-normal text-slate-500">Stored securely server-side</span>
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={aiApiKey}
                  onChange={(e) => setAiApiKey(e.target.value)}
                  placeholder={selectedProvider === 'prov_gemini' ? 'AIzaSy... (Custom Gemini Key)' : selectedProvider === 'prov_openai' ? 'sk-... (Custom OpenAI Key)' : 'gsk_... (Custom Groq Key)'}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:border-purple-500 focus:outline-none pr-10 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <button
                type="button"
                disabled={testingKey || !aiApiKey.trim()}
                onClick={handleTestAIKey}
                className="px-3.5 py-2 rounded-xl border border-purple-500/40 bg-purple-900/30 text-purple-200 text-xs font-bold hover:bg-purple-800/40 disabled:opacity-50 transition shrink-0"
              >
                {testingKey ? 'Testing...' : 'Test Key'}
              </button>

              <button
                type="button"
                disabled={savingKey || !aiApiKey.trim()}
                onClick={handleSaveAIKey}
                className="px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-bold hover:bg-purple-500 disabled:opacity-50 transition shadow-sm shrink-0"
              >
                {savingKey ? 'Saving...' : 'Save Key'}
              </button>
            </div>

            {keyFeedback && (
              <div className={`p-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                keyFeedback.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
              }`}>
                {keyFeedback.type === 'success' ? <Check className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
                <span>{keyFeedback.message}</span>
              </div>
            )}
          </div>
        </div>

        {/* Legal & Compliance Section */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-6 space-y-3 shadow-sm transition-colors">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <Shield className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            Legal & Data Compliance
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Review official platform policies, user data rights, and terms of service.
          </p>
          <div className="flex flex-wrap gap-3 pt-1">
            <a
              href="/privacy-policy"
              className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-purple-600 dark:hover:text-purple-400 hover:border-purple-300 dark:hover:border-purple-500/40 transition"
            >
              Privacy Policy →
            </a>
            <a
              href="/terms-of-service"
              className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-purple-600 dark:hover:text-purple-400 hover:border-purple-300 dark:hover:border-purple-500/40 transition"
            >
              Terms of Service →
            </a>
            <a
              href="/data-deletion"
              className="rounded-xl border border-rose-200 dark:border-rose-500/30 bg-rose-50/50 dark:bg-rose-500/10 px-3.5 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-500/20 transition"
            >
              User Data Deletion Request →
            </a>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          {success && (
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <CheckCircle className="h-4 w-4" /> Workspace settings updated successfully!
            </span>
          )}
          <div className="ml-auto">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 rounded-xl bg-purple-600 px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-purple-600/30 hover:bg-purple-500 disabled:opacity-50 transition"
            >
              <Save className="h-4 w-4" />
              <span>{saving ? 'Saving...' : 'Save Settings'}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
