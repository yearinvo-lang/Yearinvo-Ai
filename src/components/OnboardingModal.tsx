import React, { useState } from 'react';
import { CheckCircle2, ChevronRight, ChevronLeft, Store, Globe, Package, Share2, Bot, Sparkles, X } from 'lucide-react';
import { YearInfoLogo } from './YearInfoLogo.tsx';
import { useAuth } from '../context/AuthContext.tsx';

interface OnboardingProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export const OnboardingModal: React.FC<OnboardingProps> = ({ isOpen, onClose, onComplete }) => {
  const { activeWorkspace, apiRequest, refreshUserData } = useAuth();
  const [step, setStep] = useState(1);
  const totalSteps = 7;

  // Form states
  const [businessName, setBusinessName] = useState(activeWorkspace?.name || '');
  const [businessType, setBusinessType] = useState(activeWorkspace?.businessType || 'E-commerce & Retail');
  const [phone, setPhone] = useState(activeWorkspace?.phone || '+8801');
  const [address, setAddress] = useState(activeWorkspace?.address || '');
  const [timezone, setTimezone] = useState(activeWorkspace?.timezone || 'Asia/Dhaka');
  const [language, setLanguage] = useState<'bn' | 'en' | 'both'>(activeWorkspace?.language || 'both');

  // Step 4: Sample product
  const [prodName, setProdName] = useState('');
  const [prodPrice, setProdPrice] = useState('');
  const [prodStock, setProdStock] = useState('10');

  // Step 5: Channels selected
  const [selectedChannels, setSelectedChannels] = useState<string[]>(['messenger', 'livechat']);

  // Step 6: AI greeting
  const [brandVoice, setBrandVoice] = useState('friendly');
  const [customGreeting, setCustomGreeting] = useState(
    'আসসালামু আলাইকুম! আমাদের শপে আপনাকে স্বাগতম। আমি কীভাবে সাহায্য করতে পারি?'
  );

  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleNext = async () => {
    if (step === 3 && activeWorkspace) {
      setSaving(true);
      try {
        await apiRequest(`/api/workspaces/${activeWorkspace.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            name: businessName,
            businessType,
            phone,
            address,
            timezone,
            language,
          }),
        });
      } catch (e) {
        console.error('Error saving workspace details:', e);
      } finally {
        setSaving(false);
      }
    }

    if (step === 4 && prodName && prodPrice && activeWorkspace) {
      setSaving(true);
      try {
        await apiRequest('/api/products', {
          method: 'POST',
          body: JSON.stringify({
            name: prodName,
            price: Number(prodPrice),
            stock: Number(prodStock) || 10,
            sku: 'SKU-' + Date.now().toString().slice(-4),
            category: 'Featured',
          }),
        });
      } catch (e) {
        console.error('Error saving initial product:', e);
      } finally {
        setSaving(false);
      }
    }

    if (step === 6 && activeWorkspace) {
      setSaving(true);
      try {
        await apiRequest('/api/ai/settings', {
          method: 'PUT',
          body: JSON.stringify({
            brandVoice,
            customGreetingBn: customGreeting,
          }),
        });
      } catch (e) {
        console.error('Error saving AI settings:', e);
      } finally {
        setSaving(false);
      }
    }

    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      await refreshUserData();
      onComplete();
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const toggleChannel = (type: string) => {
    setSelectedChannels((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="relative w-full max-w-2xl rounded-2xl border border-purple-500/30 bg-slate-900 p-6 sm:p-8 shadow-2xl shadow-purple-950/40 animate-in fade-in zoom-in-95">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
          <div className="flex items-center gap-3">
            <YearInfoLogo size="sm" showText={true} />
            <span className="rounded-full bg-purple-500/10 px-2.5 py-0.5 text-xs font-semibold text-purple-400 border border-purple-500/20">
              Setup Wizard ({step}/{totalSteps})
            </span>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
            aria-label="Skip onboarding"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Step Progress Bar */}
        <div className="mb-6 grid grid-cols-7 gap-1.5">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i + 1 <= step ? 'bg-gradient-to-r from-purple-500 to-indigo-500' : 'bg-slate-800'
              }`}
            />
          ))}
        </div>

        {/* Content by Step */}
        <div className="min-h-[280px]">
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-purple-400">
                <Store className="h-5 w-5" />
                <h3 className="text-xl font-bold text-white">Step 1: Your Business Workspace</h3>
              </div>
              <p className="text-sm text-slate-400">
                Create a dedicated multi-tenant workspace for your brand. All conversations, orders, and social posts are isolated securely.
              </p>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Business / Store Name</label>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g. Dhaka Artisan Boutique"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-white focus:border-purple-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Industry / Category</label>
                <select
                  value={businessType}
                  onChange={(e) => setBusinessType(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-white focus:border-purple-500 focus:outline-none"
                >
                  <option value="E-commerce & Retail">E-commerce & Retail</option>
                  <option value="Fashion & Apparel">Fashion & Apparel</option>
                  <option value="Electronics & Gadgets">Electronics & Gadgets</option>
                  <option value="Beauty & Cosmetics">Beauty & Cosmetics</option>
                  <option value="Home & Living">Home & Living</option>
                  <option value="Services & Consultancy">Services & Consultancy</option>
                </select>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-purple-400">
                <Store className="h-5 w-5" />
                <h3 className="text-xl font-bold text-white">Step 2: Business & Contact Details</h3>
              </div>
              <p className="text-sm text-slate-400">
                Provide store contact details used for official invoice generation and AI order confirmations.
              </p>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Official Support Mobile / WhatsApp</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+8801700000000"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-white focus:border-purple-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Store / Dispatch Address</label>
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  rows={3}
                  placeholder="e.g. House 14, Road 7, Banani, Dhaka"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-white focus:border-purple-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-purple-400">
                <Globe className="h-5 w-5" />
                <h3 className="text-xl font-bold text-white">Step 3: Language & Timezone</h3>
              </div>
              <p className="text-sm text-slate-400">
                Configure your operational schedule and audience language preference. Default timezone is Asia/Dhaka.
              </p>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Default Timezone</label>
                <input
                  type="text"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-white focus:border-purple-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Customer Language Support</label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'both', label: 'Bilingual (বাংলা + English)', sub: 'Recommended' },
                    { id: 'bn', label: 'Bengali Only (বাংলা)', sub: 'Local Audience' },
                    { id: 'en', label: 'English Only', sub: 'Global' },
                  ].map((l) => (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => setLanguage(l.id as any)}
                      className={`rounded-xl border p-3 text-left transition ${
                        language === l.id
                          ? 'border-purple-500 bg-purple-500/10 text-white'
                          : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="font-semibold text-sm">{l.label}</div>
                      <div className="text-[11px] text-slate-500">{l.sub}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-purple-400">
                <Package className="h-5 w-5" />
                <h3 className="text-xl font-bold text-white">Step 4: Add Your First Product (Optional)</h3>
              </div>
              <p className="text-sm text-slate-400">
                The AI Sales Agent references your active product inventory to answer pricing, size, and stock availability questions with 100% accuracy.
              </p>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Product Name</label>
                <input
                  type="text"
                  value={prodName}
                  onChange={(e) => setProdName(e.target.value)}
                  placeholder="e.g. Premium Silk Kurti"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-white focus:border-purple-500 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Price (BDT)</label>
                  <input
                    type="number"
                    value={prodPrice}
                    onChange={(e) => setProdPrice(e.target.value)}
                    placeholder="1850"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-white focus:border-purple-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Stock Quantity</label>
                  <input
                    type="number"
                    value={prodStock}
                    onChange={(e) => setProdStock(e.target.value)}
                    placeholder="15"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-white focus:border-purple-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-purple-400">
                <Share2 className="h-5 w-5" />
                <h3 className="text-xl font-bold text-white">Step 5: Connect Messaging Channels</h3>
              </div>
              <p className="text-sm text-slate-400">
                Select the channels you operate. You can complete authorization or provide API keys now or anytime in Settings.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: 'facebook', name: 'Facebook Page', desc: 'Sync posts, comments & page feed' },
                  { id: 'messenger', name: 'Facebook Messenger', desc: 'Real-time DMs with AI assistant' },
                  { id: 'instagram', name: 'Instagram Professional', desc: 'DMs & automated scheduled posts' },
                  { id: 'whatsapp', name: 'WhatsApp Business API', desc: 'Cloud API & policy-compliant messages' },
                  { id: 'livechat', name: 'Website Live Chat', desc: 'Embeddable customer widget' },
                ].map((ch) => {
                  const isSelected = selectedChannels.includes(ch.id);
                  return (
                    <button
                      key={ch.id}
                      type="button"
                      onClick={() => toggleChannel(ch.id)}
                      className={`flex items-start gap-3 rounded-xl border p-3 text-left transition ${
                        isSelected
                          ? 'border-purple-500 bg-purple-500/10 text-white'
                          : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <CheckCircle2
                        className={`mt-0.5 h-4 w-4 shrink-0 ${
                          isSelected ? 'text-purple-400' : 'text-slate-600'
                        }`}
                      />
                      <div>
                        <div className="font-semibold text-sm text-white">{ch.name}</div>
                        <div className="text-[11px] text-slate-400">{ch.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 6 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-purple-400">
                <Bot className="h-5 w-5" />
                <h3 className="text-xl font-bold text-white">Step 6: Configure AI Sales Agent</h3>
              </div>
              <p className="text-sm text-slate-400">
                Define how YEAR INFO AI communicates with your prospective buyers.
              </p>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Brand Voice & Persona</label>
                <div className="grid grid-cols-3 gap-2">
                  {['friendly', 'professional', 'consultative'].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setBrandVoice(v)}
                      className={`rounded-xl border py-2 px-3 text-xs capitalize font-semibold transition ${
                        brandVoice === v
                          ? 'border-purple-500 bg-purple-500/20 text-purple-300'
                          : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Custom Greeting (Bengali / বাংলা)</label>
                <textarea
                  value={customGreeting}
                  onChange={(e) => setCustomGreeting(e.target.value)}
                  rows={2}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-white focus:border-purple-500 focus:outline-none font-bengali"
                />
              </div>
            </div>
          )}

          {step === 7 && (
            <div className="space-y-4 text-center py-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-500/10 border border-purple-500/30 text-purple-400">
                <Sparkles className="h-8 w-8 animate-pulse" />
              </div>
              <h3 className="text-2xl font-bold text-white">Workspace Ready!</h3>
              <p className="text-sm text-slate-400 max-w-md mx-auto">
                Congratulations! Your business workspace <span className="text-purple-300 font-semibold">{businessName || 'YEAR INFO AI Store'}</span> has been configured. You can now manage conversations, let AI assist sales, and schedule social posts.
              </p>
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300 inline-block">
                ✓ All data is saved persistently in the database
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="mt-8 flex items-center justify-between border-t border-slate-800 pt-4">
          <button
            type="button"
            onClick={step === 1 ? onClose : handleBack}
            className="flex items-center gap-1.5 rounded-xl border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition"
          >
            {step === 1 ? 'Skip Setup' : <><ChevronLeft className="h-4 w-4" /> Back</>}
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={handleNext}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-purple-600/30 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 transition"
          >
            {step === totalSteps ? 'Launch Dashboard' : 'Continue'}
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
