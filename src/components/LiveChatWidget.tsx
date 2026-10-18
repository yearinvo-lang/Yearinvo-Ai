import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, Bot, ShieldCheck, Sparkles } from 'lucide-react';
import { YearInfoLogo } from './YearInfoLogo.tsx';

interface ChatWidgetProps {
  workspaceId?: string;
}

export const LiveChatWidget: React.FC<ChatWidgetProps> = ({ workspaceId }) => {
  if (!workspaceId) return null;

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Array<{ sender: 'visitor' | 'ai'; text: string; time: string }>>([
    {
      sender: 'ai',
      text: 'আসসালামু আলাইকুম! YEAR INFO AI সেলস অ্যাসিস্ট্যান্ট-এ আপনাকে স্বাগতম। পণ্য, সাইজ বা ক্যাশ অন ডেলিভারি সম্পর্কে যেকোনো প্রশ্ন করুন!',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [visitorId] = useState(() => 'visitor_' + Math.random().toString(36).substring(7));
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || loading) return;

    const userText = inputText.trim();
    setInputText('');
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setMessages((prev) => [...prev, { sender: 'visitor', text: userText, time: timeStr }]);
    setLoading(true);

    try {
      const res = await fetch('/api/chat-widget/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          visitorId,
          visitorName: 'Online Visitor',
          message: userText,
        }),
      });

      const isJson = res.headers.get('content-type')?.includes('application/json');
      const data = isJson ? await res.json().catch(() => ({})) : {};
      if (data.aiReply) {
        setMessages((prev) => [
          ...prev,
          {
            sender: 'ai',
            text: data.aiReply.content,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            sender: 'ai',
            text: 'ধন্যবাদ! আপনার বার্তাটি স্টোরের ইনবক্সে গ্রহণ করা হয়েছে। একজন প্রতিনিধি শীঘ্রই উত্তর দেবেন।',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: 'সংযোগ করতে সমস্যা হচ্ছে। অনুগ্রহ করে একটু পর পুনরায় চেষ্টা করুন।',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Chat Popover Window */}
      {isOpen && (
        <div className="mb-4 flex h-[520px] w-[360px] sm:w-[400px] flex-col overflow-hidden rounded-2xl border border-purple-500/30 bg-slate-900 shadow-2xl shadow-purple-950/50 backdrop-blur-xl animate-in slide-in-from-bottom-5">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-purple-500/20 bg-gradient-to-r from-slate-950 via-purple-950/60 to-slate-950 px-4 py-3">
            <div className="flex items-center gap-2.5">
              <YearInfoLogo size="sm" showText={false} />
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold text-white">YEAR INFO AI</span>
                  <span className="flex items-center gap-1 rounded bg-emerald-500/20 px-1.5 py-0.2 text-[10px] font-semibold text-emerald-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Online
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">Live Sales & Support Assistant</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
              aria-label="Close Live Chat"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Messages Body */}
          <div className="flex-1 space-y-3 overflow-y-auto p-4 bg-slate-950/80">
            <div className="flex items-center justify-center">
              <span className="rounded-full bg-slate-800/80 px-2.5 py-0.5 text-[10px] text-slate-400 flex items-center gap-1">
                <ShieldCheck className="h-3 w-3 text-purple-400" /> End-to-end verified store session
              </span>
            </div>

            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex flex-col ${m.sender === 'visitor' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm ${
                    m.sender === 'visitor'
                      ? 'bg-purple-600 text-white rounded-br-sm'
                      : 'bg-slate-800/90 text-slate-100 border border-slate-700/60 rounded-bl-sm font-bengali'
                  }`}
                >
                  {m.sender === 'ai' && (
                    <div className="flex items-center gap-1 text-[10px] font-semibold text-purple-400 mb-1">
                      <Sparkles className="h-3 w-3" /> YEAR INFO AI
                    </div>
                  )}
                  <p className="leading-relaxed whitespace-pre-wrap">{m.text}</p>
                </div>
                <span className="mt-1 text-[10px] text-slate-500 px-1">{m.time}</span>
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2 rounded-xl bg-slate-800/70 px-3 py-2 text-xs text-purple-300 w-fit">
                <Bot className="h-3.5 w-3.5 animate-bounce text-purple-400" />
                <span>AI Agent is typing...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts Bar */}
          <div className="flex gap-1.5 overflow-x-auto px-3 py-2 bg-slate-900 border-t border-slate-800 text-[11px] no-scrollbar">
            <button
              type="button"
              onClick={() => setInputText('পাঞ্জাবির দাম ও সাইজ কত?')}
              className="shrink-0 rounded-full bg-purple-500/10 px-2.5 py-1 text-purple-300 border border-purple-500/20 hover:bg-purple-500/20 transition"
            >
              🛍️ পাঞ্জাবির দাম ও সাইজ?
            </button>
            <button
              type="button"
              onClick={() => setInputText('ঢাকার ভেতরে ডেলিভারি চার্জ কত?')}
              className="shrink-0 rounded-full bg-purple-500/10 px-2.5 py-1 text-purple-300 border border-purple-500/20 hover:bg-purple-500/20 transition"
            >
              🚚 ডেলিভারি চার্জ?
            </button>
            <button
              type="button"
              onClick={() => setInputText('ক্যাশ অন ডেলিভারি আছে?')}
              className="shrink-0 rounded-full bg-purple-500/10 px-2.5 py-1 text-purple-300 border border-purple-500/20 hover:bg-purple-500/20 transition"
            >
              💵 COD সুবিধা?
            </button>
          </div>

          {/* Input Form */}
          <form onSubmit={handleSendMessage} className="flex items-center gap-2 border-t border-purple-500/20 bg-slate-900 p-3">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ask anything in English or বাংলা..."
              className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || loading}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-600 text-white shadow-md hover:bg-purple-500 disabled:opacity-40 transition"
              aria-label="Send message"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}

      {/* Floating Widget Trigger Button with Logo Glow */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="group relative flex h-14 w-14 items-center justify-center rounded-2xl bg-[#090714] border border-purple-500/50 shadow-xl shadow-purple-600/30 hover:scale-105 active:scale-95 transition-all duration-300"
        aria-label="Toggle Live Chat Widget"
      >
        <span className="absolute -top-1 -right-1 flex h-4 w-4">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-purple-400 opacity-75"></span>
          <span className="relative inline-flex h-4 w-4 rounded-full bg-purple-500"></span>
        </span>
        {isOpen ? (
          <X className="h-6 w-6 text-purple-300" />
        ) : (
          <div className="flex items-center justify-center">
            <YearInfoLogo size="custom" showText={false} />
          </div>
        )}
      </button>
    </div>
  );
};
