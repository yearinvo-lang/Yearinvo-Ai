import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Plus,
  Clock,
  Send,
  Trash2,
  CheckCircle2,
  ShieldCheck,
  AlertCircle,
  Phone,
  Calendar,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { ScheduledMessage } from '../types/index.ts';

export const WhatsAppPage: React.FC = () => {
  const { activeWorkspace, apiRequest, language } = useAuth();
  const [messages, setMessages] = useState<ScheduledMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Form states
  const [phone, setPhone] = useState('+8801');
  const [name, setName] = useState('');
  const [template, setTemplate] = useState('order_confirmation_v1');
  const [content, setContent] = useState(
    'আসসালামু আলাইকুম! আপনার অর্ডারটি নিশ্চিত করা হয়েছে। ডেলিভারির সময় আমাদের প্রতিনিধি আপনাকে কল করবেন। ধন্যবাদ।'
  );
  const [scheduledAt, setScheduledAt] = useState(() => {
    const d = new Date(Date.now() + 3600000 * 2);
    return d.toISOString().slice(0, 16);
  });

  const isBn = language === 'bn';

  const loadMessages = async () => {
    if (!activeWorkspace) return;
    setLoading(true);
    try {
      const data = await apiRequest('/api/whatsapp/scheduled');
      setMessages(data);
    } catch (e) {
      console.error('Failed to load WhatsApp messages:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMessages();
  }, [activeWorkspace?.id]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || !content) return;

    try {
      const created = await apiRequest('/api/whatsapp/scheduled', {
        method: 'POST',
        body: JSON.stringify({
          recipientPhone: phone,
          recipientName: name || 'Customer',
          templateName: template,
          messageContent: content,
          scheduledAt: new Date(scheduledAt).toISOString(),
        }),
      });

      setMessages((prev) => [created, ...prev]);
      setShowModal(false);
      setName('');
      setPhone('+8801');
    } catch (e) {
      console.error('Failed to schedule WhatsApp message:', e);
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await apiRequest(`/api/whatsapp/scheduled/${id}`, { method: 'DELETE' });
      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, status: 'cancelled' } : m))
      );
    } catch (e) {
      console.error('Failed to cancel message:', e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-emerald-500/20 bg-gradient-to-r from-slate-900 via-emerald-950/30 to-slate-900 p-6 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-white">WhatsApp Scheduled Messages</h1>
            <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-bold text-emerald-400 border border-emerald-500/30">
              Cloud API Compliant
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Send policy-compliant transactional alerts and order delivery notifications via official WhatsApp Business API.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-600/30 hover:bg-emerald-500 transition"
        >
          <Plus className="h-4 w-4" />
          <span>Schedule WhatsApp Alert</span>
        </button>
      </div>

      {/* Guidelines Card */}
      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 flex items-start gap-3 text-xs text-slate-300">
        <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-bold text-white">WhatsApp Business Policy & Opt-In Rules</div>
          <p className="text-slate-400">
            Messages outside the 24-hour service window must use approved Meta message templates. Bulk unsolicited promotional spam is strictly prevented to safeguard your business phone number from bans.
          </p>
        </div>
      </div>

      {/* Messages Queue Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500">Loading scheduled queue...</div>
        ) : messages.length === 0 ? (
          <div className="p-12 text-center">
            <MessageSquare className="mx-auto h-10 w-10 text-slate-600 mb-2" />
            <div className="text-sm font-bold text-white">No scheduled WhatsApp messages</div>
            <p className="text-xs text-slate-400 mt-1">Prepare delivery reminders or order follow-up alerts to be sent automatically.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400 bg-slate-950/40">
                  <th className="py-3 px-4">Recipient</th>
                  <th className="py-3 px-4">Template / Content</th>
                  <th className="py-3 px-4">Scheduled Execution</th>
                  <th className="py-3 px-4">Opt-In Consent</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {messages.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-900/50">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white">{m.recipientName}</div>
                      <div className="text-[11px] font-mono text-emerald-400">{m.recipientPhone}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-[10px] text-purple-300 font-mono font-bold mb-0.5">{m.templateName}</div>
                      <p className="text-slate-300 font-bengali truncate max-w-sm">{m.messageContent}</p>
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-purple-400" />
                        <span>{new Date(m.scheduledAt).toLocaleString()}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/20">
                        Verified
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ${
                          m.status === 'sent'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : m.status === 'cancelled'
                            ? 'bg-slate-700 text-slate-400'
                            : 'bg-purple-500/20 text-purple-300'
                        }`}
                      >
                        {m.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {m.status === 'scheduled' && (
                        <button
                          onClick={() => handleCancel(m.id)}
                          className="rounded-lg p-1.5 text-slate-500 hover:text-rose-400 transition"
                          title="Cancel message"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Schedule Message Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="relative w-full max-w-lg rounded-2xl border border-emerald-500/30 bg-slate-900 p-6 shadow-2xl">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-lg font-bold text-white mb-4">
              Schedule Policy-Compliant WhatsApp Message
            </h3>

            <form onSubmit={handleCreate} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Customer Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Tanvir Hossain"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">WhatsApp Number *</label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+8801700000000"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white font-mono focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Approved Template</label>
                <select
                  value={template}
                  onChange={(e) => setTemplate(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none font-mono"
                >
                  <option value="order_confirmation_v1">order_confirmation_v1 (Transactional)</option>
                  <option value="dispatch_notification_v2">dispatch_notification_v2 (Shipping & Rider)</option>
                  <option value="delivery_reminder_v1">delivery_reminder_v1 (Delivery day alert)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Message Content *</label>
                <textarea
                  rows={3}
                  required
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-xs text-white focus:border-emerald-500 focus:outline-none font-bengali"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Scheduled Date & Time (Asia/Dhaka)</label>
                <input
                  type="datetime-local"
                  required
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-500 transition"
                >
                  Queue Message
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
