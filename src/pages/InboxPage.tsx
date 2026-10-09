import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Search,
  Filter,
  Bot,
  User,
  PauseCircle,
  PlayCircle,
  CheckCircle2,
  Clock,
  Send,
  FileText,
  ShoppingBag,
  Phone,
  Mail,
  Tag,
  ChevronLeft,
  Sparkles,
  RefreshCw,
  AlertCircle,
  Shield,
  Layers,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { Conversation, Message, Customer, InternalNote } from '../types/index.ts';

export const InboxPage: React.FC = () => {
  const { activeWorkspace, user, apiRequest, language } = useAuth();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [activeThread, setActiveThread] = useState<{
    conversation: Conversation;
    messages: Message[];
    customer: Customer | null;
    internalNotes: InternalNote[];
  } | null>(null);

  const [loadingList, setLoadingList] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Right sidebar tab
  const [sidebarTab, setSidebarTab] = useState<'customer' | 'notes' | 'orders'>('customer');

  // Input states
  const [replyText, setReplyText] = useState('');
  const [noteText, setNoteText] = useState('');
  const [sending, setSending] = useState(false);

  // Mobile layout state
  const [mobileViewThread, setMobileViewThread] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isBn = language === 'bn';

  const loadConversations = async (autoSelectFirst = false) => {
    if (!activeWorkspace) return;
    try {
      const q = new URLSearchParams();
      if (statusFilter !== 'all') q.set('status', statusFilter);
      if (channelFilter !== 'all') q.set('channel', channelFilter);
      if (searchQuery.trim()) q.set('search', searchQuery.trim());

      const data = await apiRequest(`/api/conversations?${q.toString()}`);
      setConversations(data);

      if (autoSelectFirst && data.length > 0 && !selectedConvId) {
        setSelectedConvId(data[0].id);
      }
    } catch (e) {
      console.error('Failed to load conversations:', e);
    } finally {
      setLoadingList(false);
    }
  };

  const loadThread = async (convId: string) => {
    setLoadingThread(true);
    try {
      const data = await apiRequest(`/api/conversations/${convId}`);
      setActiveThread(data);
      // update conversation item in list to clear unread
      setConversations((prev) =>
        prev.map((c) => (c.id === convId ? { ...c, unreadCount: 0 } : c))
      );
    } catch (e) {
      console.error('Failed to load thread:', e);
    } finally {
      setLoadingThread(false);
    }
  };

  useEffect(() => {
    loadConversations(true);
  }, [activeWorkspace?.id, statusFilter, channelFilter]);

  useEffect(() => {
    if (selectedConvId) {
      loadThread(selectedConvId);
    } else {
      setActiveThread(null);
    }
  }, [selectedConvId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeThread?.messages]);

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedConvId || sending) return;

    setSending(true);
    const content = replyText.trim();
    setReplyText('');

    try {
      const res = await apiRequest('/api/messages', {
        method: 'POST',
        body: JSON.stringify({
          conversationId: selectedConvId,
          content,
          senderType: 'agent',
        }),
      });

      if (activeThread) {
        setActiveThread({
          ...activeThread,
          messages: [...activeThread.messages, res.message],
          conversation: {
            ...activeThread.conversation,
            aiActive: false, // sending manual message pauses AI
            status: 'human_handled',
            lastMessageText: content,
          },
        });
      }

      loadConversations(false);
    } catch (e) {
      console.error('Error sending message:', e);
    } finally {
      setSending(false);
    }
  };

  const handleAddInternalNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim() || !selectedConvId) return;

    const content = noteText.trim();
    setNoteText('');

    try {
      const newNote = await apiRequest('/api/messages/internal-note', {
        method: 'POST',
        body: JSON.stringify({
          conversationId: selectedConvId,
          content,
        }),
      });

      if (activeThread) {
        setActiveThread({
          ...activeThread,
          internalNotes: [...activeThread.internalNotes, newNote],
        });
      }
    } catch (e) {
      console.error('Error adding internal note:', e);
    }
  };

  const toggleAIPause = async () => {
    if (!activeThread) return;
    const nextState = !activeThread.conversation.aiActive;
    try {
      const updated = await apiRequest(`/api/conversations/${activeThread.conversation.id}/ai-toggle`, {
        method: 'POST',
        body: JSON.stringify({ active: nextState }),
      });

      setActiveThread({
        ...activeThread,
        conversation: updated,
      });

      setConversations((prev) =>
        prev.map((c) => (c.id === updated.id ? updated : c))
      );
    } catch (e) {
      console.error('Failed to toggle AI state:', e);
    }
  };

  const updateConvStatus = async (status: string) => {
    if (!activeThread) return;
    try {
      const updated = await apiRequest(`/api/conversations/${activeThread.conversation.id}/status`, {
        method: 'POST',
        body: JSON.stringify({ status }),
      });

      setActiveThread({
        ...activeThread,
        conversation: updated,
      });

      setConversations((prev) =>
        prev.map((c) => (c.id === updated.id ? updated : c))
      );
    } catch (e) {
      console.error('Failed to update status:', e);
    }
  };

  const getChannelBadge = (ch: string) => {
    switch (ch) {
      case 'messenger':
        return <span className="rounded bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-bold text-blue-400">Messenger</span>;
      case 'instagram':
        return <span className="rounded bg-pink-500/10 px-1.5 py-0.5 text-[10px] font-bold text-pink-400">Instagram</span>;
      case 'whatsapp':
        return <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald-400">WhatsApp</span>;
      case 'facebook':
        return <span className="rounded bg-indigo-500/10 px-1.5 py-0.5 text-[10px] font-bold text-indigo-400">Facebook</span>;
      default:
        return <span className="rounded bg-purple-500/10 px-1.5 py-0.5 text-[10px] font-bold text-purple-400">Live Chat</span>;
    }
  };

  return (
    <div className="h-[calc(100vh-8.5rem)] min-h-[550px] rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden shadow-2xl flex flex-col">
      {/* 3-PANEL CONTAINER */}
      <div className="flex-1 flex overflow-hidden">
        {/* PANEL 1: INBOX FOLDERS & FILTER NAVIGATION (Desktop only) */}
        <aside className="hidden lg:flex w-60 flex-col border-r border-slate-800 bg-slate-950 p-4 space-y-4 shrink-0">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 px-2 mb-2">
              Inbox Status
            </div>
            <nav className="space-y-1 text-xs font-semibold">
              {[
                { id: 'all', label: 'All Conversations', icon: MessageSquare },
                { id: 'unread', label: 'Unread Messages', icon: Clock },
                { id: 'open', label: 'Open Inquiries', icon: AlertCircle },
                { id: 'ai_handled', label: 'AI Handled', icon: Bot },
                { id: 'human_handled', label: 'Human Handled', icon: User },
                { id: 'resolved', label: 'Resolved Tickets', icon: CheckCircle2 },
              ].map((f) => {
                const Icon = f.icon;
                const isSelected = statusFilter === f.id;
                return (
                  <button
                    key={f.id}
                    onClick={() => setStatusFilter(f.id)}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2 transition ${
                      isSelected
                        ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30'
                        : 'text-slate-400 hover:bg-slate-900 hover:text-white'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Icon className={`h-4 w-4 ${isSelected ? 'text-purple-400' : 'text-slate-500'}`} />
                      <span>{f.label}</span>
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 px-2 mb-2">
              Channels Filter
            </div>
            <nav className="space-y-1 text-xs font-semibold">
              {[
                { id: 'all', label: 'All Channels' },
                { id: 'messenger', label: 'Messenger' },
                { id: 'instagram', label: 'Instagram' },
                { id: 'whatsapp', label: 'WhatsApp' },
                { id: 'livechat', label: 'Website Chat' },
              ].map((c) => {
                const isSelected = channelFilter === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => setChannelFilter(c.id)}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-1.5 transition ${
                      isSelected
                        ? 'bg-slate-800 text-white font-bold'
                        : 'text-slate-400 hover:bg-slate-900 hover:text-white'
                    }`}
                  >
                    <span>{c.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* PANEL 2: CONVERSATION LIST */}
        <section
          className={`w-full lg:w-80 md:w-80 flex flex-col border-r border-slate-800 bg-slate-900/40 shrink-0 ${
            mobileViewThread ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Search Header */}
          <div className="p-3 border-b border-slate-800">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadConversations(false)}
                placeholder="Search customer or message..."
                className="w-full rounded-xl border border-slate-700 bg-slate-950 pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
              />
            </div>
          </div>

          {/* List items */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60">
            {loadingList ? (
              <div className="p-8 text-center text-xs text-slate-500">Loading inbox...</div>
            ) : conversations.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                <MessageSquare className="mx-auto h-6 w-6 text-slate-600 mb-2" />
                No conversations found matching filters.
              </div>
            ) : (
              conversations.map((c) => {
                const isSelected = selectedConvId === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => {
                      setSelectedConvId(c.id);
                      setMobileViewThread(true);
                    }}
                    className={`flex w-full flex-col p-3 text-left transition ${
                      isSelected
                        ? 'bg-purple-950/40 border-l-4 border-purple-500'
                        : 'hover:bg-slate-900/80'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs text-white truncate max-w-[140px]">
                        {c.customerName}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {new Date(c.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 mb-1.5">
                      {getChannelBadge(c.channel)}
                      {c.aiActive ? (
                        <span className="rounded bg-purple-500/20 px-1 py-0.2 text-[9px] font-bold text-purple-300">
                          AI
                        </span>
                      ) : (
                        <span className="rounded bg-amber-500/20 px-1 py-0.2 text-[9px] font-bold text-amber-300">
                          Human
                        </span>
                      )}
                      {c.unreadCount > 0 && (
                        <span className="ml-auto rounded-full bg-rose-500 px-1.5 py-0.2 text-[9px] font-bold text-white">
                          {c.unreadCount}
                        </span>
                      )}
                    </div>

                    <p className="line-clamp-2 text-[11px] text-slate-400 font-bengali leading-relaxed">
                      {c.lastMessageText || 'No message content'}
                    </p>
                  </button>
                );
              })
            )}
          </div>
        </section>

        {/* PANEL 3: MESSAGE THREAD & ACTIONS */}
        <main
          className={`flex-1 flex flex-col bg-slate-950 overflow-hidden ${
            !mobileViewThread ? 'hidden md:flex' : 'flex'
          }`}
        >
          {loadingThread ? (
            <div className="flex-1 flex items-center justify-center text-xs text-purple-400">
              <RefreshCw className="h-5 w-5 animate-spin mr-2" />
              Loading thread...
            </div>
          ) : !activeThread ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500">
              <MessageSquare className="h-10 w-10 text-slate-700 mb-3" />
              <p className="text-sm font-semibold text-slate-400">Select a conversation from the inbox</p>
              <p className="text-xs text-slate-600 mt-1">Real-time incoming customer chats will appear here.</p>
            </div>
          ) : (
            <>
              {/* Thread Header */}
              <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/60 px-4 py-3 shrink-0">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setMobileViewThread(false)}
                    className="md:hidden rounded-lg p-1 text-slate-400 hover:bg-slate-800"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>

                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-600/20 text-purple-300 font-black text-sm border border-purple-500/30">
                    {activeThread.conversation.customerName.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-white">
                        {activeThread.conversation.customerName}
                      </span>
                      {getChannelBadge(activeThread.conversation.channel)}
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-2">
                      <span>Status: <strong className="capitalize text-slate-300">{activeThread.conversation.status}</strong></span>
                      {activeThread.conversation.customerPhone && (
                        <span>• Phone: {activeThread.conversation.customerPhone}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* AI Pause & Status Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={toggleAIPause}
                    className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                      activeThread.conversation.aiActive
                        ? 'border border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20'
                        : 'border border-purple-500/30 bg-purple-500/20 text-purple-300 hover:bg-purple-500/30'
                    }`}
                  >
                    {activeThread.conversation.aiActive ? (
                      <>
                        <PauseCircle className="h-3.5 w-3.5" />
                        <span>Pause AI</span>
                      </>
                    ) : (
                      <>
                        <PlayCircle className="h-3.5 w-3.5" />
                        <span>Resume AI</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => updateConvStatus(activeThread.conversation.status === 'resolved' ? 'open' : 'resolved')}
                    className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition"
                  >
                    {activeThread.conversation.status === 'resolved' ? 'Reopen' : 'Resolve'}
                  </button>
                </div>
              </div>

              {/* Thread Messages Body */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-950/70">
                {activeThread.messages.map((m) => {
                  const isAgent = m.senderType === 'agent';
                  const isAi = m.senderType === 'ai';
                  const isCustomer = m.senderType === 'customer';

                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${isCustomer ? 'items-start' : 'items-end'}`}
                    >
                      <div
                        className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-xs font-bengali leading-relaxed ${
                          isCustomer
                            ? 'bg-slate-900 text-slate-100 border border-slate-800 rounded-bl-sm'
                            : isAi
                            ? 'bg-purple-950/80 text-purple-100 border border-purple-500/40 rounded-br-sm shadow-md shadow-purple-950/50'
                            : 'bg-indigo-600 text-white rounded-br-sm shadow-md'
                        }`}
                      >
                        <div className="flex items-center gap-1 text-[10px] font-bold mb-1 opacity-75">
                          {isAi && <Bot className="h-3 w-3 text-purple-400" />}
                          {isAgent && <User className="h-3 w-3 text-indigo-300" />}
                          <span>{m.senderName}</span>
                          {isAi && <span className="text-purple-300 font-mono">(Gemini Auto)</span>}
                        </div>

                        <p className="whitespace-pre-wrap">{m.content}</p>
                      </div>

                      <span className="mt-1 text-[10px] text-slate-500 px-1">
                        {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {m.deliveryStatus}
                      </span>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Reply & Send Box */}
              <form onSubmit={handleSendReply} className="border-t border-slate-800 bg-slate-900/90 p-3 shrink-0">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Type official reply as human agent (will pause AI)..."
                    className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={!replyText.trim() || sending}
                    className="flex items-center gap-1.5 rounded-xl bg-purple-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-purple-600/30 hover:bg-purple-500 disabled:opacity-40 transition"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>Send</span>
                  </button>
                </div>
              </form>
            </>
          )}
        </main>

        {/* PANEL 4: CUSTOMER SIDEBAR & INTERNAL NOTES (Desktop only) */}
        {activeThread && (
          <aside className="hidden xl:flex w-72 flex-col border-l border-slate-800 bg-slate-950 p-4 shrink-0 overflow-y-auto">
            {/* Tabs */}
            <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-900 p-1 mb-4 text-xs font-semibold">
              <button
                onClick={() => setSidebarTab('customer')}
                className={`rounded-lg py-1 transition ${
                  sidebarTab === 'customer' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Profile
              </button>
              <button
                onClick={() => setSidebarTab('notes')}
                className={`rounded-lg py-1 transition ${
                  sidebarTab === 'notes' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Notes ({activeThread.internalNotes.length})
              </button>
            </div>

            {sidebarTab === 'customer' ? (
              <div className="space-y-4 text-xs">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Customer</div>
                  <div className="font-bold text-sm text-white mt-0.5">{activeThread.customer?.name || activeThread.conversation.customerName}</div>
                </div>

                {activeThread.customer?.phone && (
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Phone</div>
                    <div className="text-slate-300 flex items-center gap-1.5 mt-0.5">
                      <Phone className="h-3.5 w-3.5 text-purple-400" />
                      <span>{activeThread.customer.phone}</span>
                    </div>
                  </div>
                )}

                {activeThread.customer?.email && (
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Email</div>
                    <div className="text-slate-300 flex items-center gap-1.5 mt-0.5">
                      <Mail className="h-3.5 w-3.5 text-purple-400" />
                      <span>{activeThread.customer.email}</span>
                    </div>
                  </div>
                )}

                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Channel Origin</div>
                  <div className="mt-1">{getChannelBadge(activeThread.conversation.channel)}</div>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-900 p-3 space-y-1">
                  <div className="text-slate-400 text-[11px]">Total Confirmed Orders</div>
                  <div className="text-lg font-black text-white">{activeThread.customer?.totalOrders || 0}</div>
                  <div className="text-slate-400 text-[11px]">Total Lifetime Value</div>
                  <div className="text-sm font-bold text-emerald-400">৳ {(activeThread.customer?.totalSpent || 0).toLocaleString()}</div>
                </div>

                {activeThread.customer?.tags && activeThread.customer.tags.length > 0 && (
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Tags</div>
                    <div className="flex flex-wrap gap-1">
                      {activeThread.customer.tags.map((t, idx) => (
                        <span key={idx} className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3 flex-1 flex flex-col text-xs">
                <div className="flex-1 space-y-2 overflow-y-auto">
                  {activeThread.internalNotes.length === 0 ? (
                    <div className="p-4 text-center text-slate-500 text-[11px]">
                      No internal notes recorded yet.
                    </div>
                  ) : (
                    activeThread.internalNotes.map((n) => (
                      <div key={n.id} className="rounded-xl border border-slate-800 bg-slate-900 p-2.5 space-y-1">
                        <div className="flex items-center justify-between text-[10px] text-slate-400">
                          <span className="font-bold text-purple-300">{n.authorName}</span>
                          <span>{new Date(n.createdAt).toLocaleDateString()}</span>
                        </div>
                        <p className="text-slate-200 text-xs font-bengali leading-relaxed">{n.content}</p>
                      </div>
                    ))
                  )}
                </div>

                <form onSubmit={handleAddInternalNote} className="space-y-2 pt-2 border-t border-slate-800">
                  <textarea
                    rows={2}
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Add private note (visible to team only)..."
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2 text-xs text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={!noteText.trim()}
                    className="w-full rounded-xl bg-slate-800 py-1.5 text-xs font-bold text-white hover:bg-slate-700 disabled:opacity-40 transition"
                  >
                    Add Internal Note
                  </button>
                </form>
              </div>
            )}
          </aside>
        )}
      </div>
    </div>
  );
};
