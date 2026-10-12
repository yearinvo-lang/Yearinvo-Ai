import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Send,
  Mail,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Package,
  ShoppingBag,
  Clock,
  CheckCheck,
  RefreshCw,
  X,
  Sparkles,
  ExternalLink,
  Copy,
  ChevronRight,
  Info,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

interface VoiceAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface MessageItem {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  metrics?: any;
}

export function VoiceAssistantModal({ isOpen, onClose }: VoiceAssistantModalProps) {
  const { user, language, activeWorkspace } = useAuth();
  const isBn = language === 'bn';

  // Voice recognition states
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [speechLang, setSpeechLang] = useState<'bn-BD' | 'en-US'>('bn-BD');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Audio output (TTS) states
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // Conversation history
  const [messages, setMessages] = useState<MessageItem[]>([
    {
      id: 'welcome_1',
      sender: 'assistant',
      text: 'আসসালামু আলাইকুম! আমি আপনার YEAR INFO AI ভয়েস অ্যাসিস্ট্যান্ট। আমাকে মুখে জিজ্ঞাসা করুন: "আজকের কতটুকু সেল হলো?", "আজকের সেলে কি কি রিপোর্ট?", "কতগুলা সেল হইছে?", "কমপ্লিট হইছে কতগুলা?", অথবা "অর্ডার পেন্ডিংয়ে রয়েছে কতগুলা?"। এরপর এই রিপোর্টটি সরাসরি ইমেইলেও পাঠাতে পারবেন!',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  // Today's latest sales metrics
  const [latestMetrics, setLatestMetrics] = useState<any>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(false);

  // Email modal / form states
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState(user?.email || 'yearinvo@gmail.com');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailNote, setEmailNote] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSuccessMessage, setEmailSuccessMessage] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [copiedReport, setCopiedReport] = useState(false);

  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Helper for API requests
  const apiRequest = async (url: string, options: RequestInit = {}) => {
    const token = localStorage.getItem('yia_auth_token') || sessionStorage.getItem('yia_auth_token');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (activeWorkspace) headers['X-Workspace-Id'] = activeWorkspace.id;

    const res = await fetch(url, { ...options, headers });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
  };

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, interimTranscript, isOpen]);

  // Fetch initial sales metrics when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchTodayStats();
      if (user?.email) {
        setRecipientEmail(user.email);
      }
    } else {
      stopListening();
      stopSpeaking();
    }
  }, [isOpen]);

  const fetchTodayStats = async () => {
    setLoadingMetrics(true);
    try {
      const data = await apiRequest('/api/voice-assistant/today-stats');
      setLatestMetrics(data);
      setEmailSubject(`YEAR INFO AI — আজকের সেল ও অর্ডার রিপোর্ট (${data.dateBangla} / ${data.date})`);
    } catch (e) {
      console.error('Failed to load today stats:', e);
    } finally {
      setLoadingMetrics(false);
    }
  };

  // Setup Web Speech API recognition
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechSupported(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = speechLang;

      recognition.onstart = () => {
        setIsListening(true);
        setInterimTranscript('');
      };

      recognition.onresult = (event: any) => {
        let currentInterim = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            currentInterim += event.results[i][0].transcript;
          }
        }

        if (currentInterim) {
          setInterimTranscript(currentInterim);
        }

        if (finalTranscript) {
          setInterimTranscript('');
          handleSendQuery(finalTranscript);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition event:', event.error);
        setIsListening(false);
        setInterimTranscript('');
      };

      recognition.onend = () => {
        setIsListening(false);
        setInterimTranscript('');
      };

      recognitionRef.current = recognition;
    } catch (err) {
      console.warn('SpeechRecognition initialization error:', err);
      setSpeechSupported(false);
    }

    return () => {
      try {
        if (recognitionRef.current) {
          recognitionRef.current.abort();
        }
      } catch {}
    };
  }, [speechLang]);

  // Text to Speech playback
  const speakText = (text: string) => {
    if (isMuted || typeof window === 'undefined' || !window.speechSynthesis) return;

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      // Find Bengali voice if available
      const voices = window.speechSynthesis.getVoices();
      const bnVoice = voices.find(
        (v) => v.lang.includes('bn') || v.lang.includes('BD') || v.name.toLowerCase().includes('bangla')
      );
      if (bnVoice) {
        utterance.voice = bnVoice;
      } else {
        utterance.lang = speechLang === 'bn-BD' ? 'bn-BD' : 'en-US';
      }

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('SpeechSynthesis error:', e);
      setIsSpeaking(false);
    }
  };

  const stopSpeaking = () => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  const startListening = () => {
    if (!speechSupported || !recognitionRef.current) {
      alert('আপনার ব্রাউজারে স্পিচ রিকগনিশন সাপোর্ট নেই বা মাইক্রোফোন পারমিশন অফ করা আছে। অনুগ্রহ করে নিচে টাইপ করে প্রশ্ন করুন।');
      return;
    }
    stopSpeaking();
    try {
      recognitionRef.current.lang = speechLang;
      recognitionRef.current.start();
    } catch (e) {
      console.warn('Failed to start recognition:', e);
    }
  };

  const stopListening = () => {
    try {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    } catch {}
    setIsListening(false);
    setInterimTranscript('');
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // Submit voice/text question to backend
  const handleSendQuery = async (queryText: string) => {
    const query = queryText.trim();
    if (!query || isProcessing) return;

    // Add user question to conversation
    const userMsg: MessageItem = {
      id: `user_${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsProcessing(true);

    try {
      const res = await apiRequest('/api/voice-assistant/query', {
        method: 'POST',
        body: JSON.stringify({
          query,
          language: speechLang === 'bn-BD' ? 'bn' : 'en',
        }),
      });

      const assistantMsg: MessageItem = {
        id: `assistant_${Date.now()}`,
        sender: 'assistant',
        text: res.responseText || 'আজকের সেলস তথ্য আপডেট করা হয়েছে।',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        metrics: res.metrics,
      };

      setMessages((prev) => [...prev, assistantMsg]);
      if (res.metrics) {
        setLatestMetrics(res.metrics);
        setEmailSubject(`YEAR INFO AI — আজকের সেল ও অর্ডার রিপোর্ট (${res.metrics.dateBangla} / ${res.metrics.date})`);
      }

      // Audibly speak the answer
      if (res.speechText) {
        speakText(res.speechText);
      }
    } catch (err: any) {
      console.error('Error querying voice assistant:', err);
      const errMsg: MessageItem = {
        id: `err_${Date.now()}`,
        sender: 'assistant',
        text: `দুঃখিত, তথ্য লোড করতে সমস্যা হয়েছে: ${err.message || 'নেটওয়ার্ক ত্রুটি'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle email send dispatch
  const handleSendEmailReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientEmail || !recipientEmail.includes('@')) {
      setEmailError('অনুগ্রহ করে একটি সঠিক ইমেইল অ্যাড্রেস লিখুন।');
      return;
    }

    setSendingEmail(true);
    setEmailError(null);
    setEmailSuccessMessage(null);

    try {
      const res = await apiRequest('/api/voice-assistant/send-email', {
        method: 'POST',
        body: JSON.stringify({
          recipientEmail: recipientEmail.trim(),
          customSubject: emailSubject.trim(),
          customNote: emailNote.trim(),
        }),
      });

      if (res.success) {
        setEmailSuccessMessage(`রিপোর্টটি সফলভাবে ${recipientEmail} ঠিকানায় পাঠানো হয়েছে!`);
        setTimeout(() => {
          setShowEmailModal(false);
          setEmailSuccessMessage(null);
        }, 3000);
      } else {
        throw new Error(res.error || 'Failed to dispatch email');
      }
    } catch (err: any) {
      console.error('Error sending report email:', err);
      setEmailError(err.message || 'ইমেইল পাঠাতে ব্যর্থ হয়েছে। দয়া করে পুনরায় চেষ্টা করুন।');
    } finally {
      setSendingEmail(false);
    }
  };

  // Copy report summary to clipboard
  const handleCopyReport = () => {
    if (!latestMetrics) return;
    const text = `📊 YEAR INFO AI — আজকের সেলস রিপোর্ট (${latestMetrics.dateBangla})
• মোট বিক্রয়: ৳${latestMetrics.totalSales.toLocaleString()} টাকা
• সর্বমোট অর্ডার: ${latestMetrics.totalOrders}টি
• কমপ্লিট / ডেলিভার্ড: ${latestMetrics.completedOrders}টি
• কনফার্মড: ${latestMetrics.confirmedOrders}টি
• পেন্ডিং অর্ডার: ${latestMetrics.pendingOrders}টি
• গড় অর্ডার ভ্যালু: ৳${latestMetrics.averageOrderValue.toLocaleString()} টাকা
• শীর্ষ বিক্রিত: ${latestMetrics.topProducts?.[0]?.name || 'N/A'}`;

    navigator.clipboard.writeText(text);
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative flex flex-col w-full max-w-4xl h-[90vh] max-h-[820px] rounded-3xl border border-purple-500/30 bg-[#0a0718] text-slate-100 shadow-2xl overflow-hidden">
        
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-purple-500/20 bg-purple-950/20 shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30">
              <Mic className="w-5 h-5" />
              {isListening && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                </span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-wide">
                  YEAR INFO AI ভয়েস অ্যাসিস্ট্যান্ট
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Voice Sales Assistant
                </span>
              </div>
              <p className="text-xs text-slate-400">
                মুখের কথায় আজকের সেলস, অর্ডার ও রিপোর্ট জানুন এবং এক ক্লিকে ইমেইলে পাঠান
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Language switch for speech */}
            <select
              value={speechLang}
              onChange={(e) => setSpeechLang(e.target.value as any)}
              className="px-2.5 py-1.5 rounded-xl border border-purple-500/30 bg-purple-900/30 text-xs font-semibold text-purple-200 focus:outline-none"
              title="Speech Recognition Language"
            >
              <option value="bn-BD" className="bg-slate-900 text-white">বাংলা (Bangla)</option>
              <option value="en-US" className="bg-slate-900 text-white">English (US)</option>
            </select>

            {/* Mute/Unmute Audio Speech */}
            <button
              onClick={() => {
                if (isSpeaking) stopSpeaking();
                setIsMuted(!isMuted);
              }}
              className={`p-2 rounded-xl border transition ${
                isMuted
                  ? 'border-slate-700 bg-slate-800 text-slate-400 hover:text-white'
                  : 'border-purple-500/40 bg-purple-600/20 text-purple-300 hover:bg-purple-600/30'
              }`}
              title={isMuted ? 'Unmute Voice Output' : 'Mute Voice Output'}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition"
              title="Close Assistant"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* MAIN BODY: 2 COLUMN SPLIT ON LARGE SCREENS */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden min-h-0">
          
          {/* LEFT COLUMN: CONVERSATION & VOICE INPUT (lg:col-span-7) */}
          <div className="lg:col-span-7 flex flex-col border-r border-purple-500/20 min-h-0">
            
            {/* MESSAGES SCROLL AREA */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              {messages.map((msg) => {
                const isAssistant = msg.sender === 'assistant';
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isAssistant ? 'items-start' : 'items-end'}`}
                  >
                    <div className="flex items-center gap-1.5 mb-1 px-1 text-[11px] text-slate-400">
                      {isAssistant ? (
                        <>
                          <Sparkles className="w-3 h-3 text-purple-400" />
                          <span className="font-semibold text-purple-300">Voice Assistant</span>
                        </>
                      ) : (
                        <>
                          <span className="font-semibold text-slate-300">আপনি (You)</span>
                        </>
                      )}
                      <span>·</span>
                      <span>{msg.timestamp}</span>
                    </div>

                    <div
                      className={`max-w-[90%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed whitespace-pre-line shadow-md ${
                        isAssistant
                          ? 'border border-purple-500/20 bg-slate-900/90 text-slate-100 rounded-tl-sm'
                          : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-tr-sm'
                      }`}
                    >
                      {msg.text}

                      {/* If assistant returned metrics in message, show quick summary pills */}
                      {isAssistant && msg.metrics && (
                        <div className="mt-3 pt-3 border-t border-purple-500/20 grid grid-cols-2 gap-2 text-xs">
                          <div className="rounded-xl bg-purple-950/40 p-2 border border-purple-500/30">
                            <div className="text-[10px] text-purple-300 font-semibold uppercase">আজকের মোট সেল</div>
                            <div className="text-base font-black text-white">৳{msg.metrics.totalSales?.toLocaleString()}</div>
                          </div>
                          <div className="rounded-xl bg-purple-950/40 p-2 border border-purple-500/30">
                            <div className="text-[10px] text-purple-300 font-semibold uppercase">মোট অর্ডার</div>
                            <div className="text-base font-black text-white">{msg.metrics.totalOrders} টি</div>
                          </div>
                          <div className="rounded-xl bg-emerald-950/40 p-2 border border-emerald-500/30">
                            <div className="text-[10px] text-emerald-300 font-semibold uppercase">কমপ্লিট / ডেলিভার্ড</div>
                            <div className="text-base font-black text-emerald-400">{msg.metrics.completedOrders} টি</div>
                          </div>
                          <div className="rounded-xl bg-amber-950/40 p-2 border border-amber-500/30">
                            <div className="text-[10px] text-amber-300 font-semibold uppercase">পেন্ডিং অর্ডার</div>
                            <div className="text-base font-black text-amber-400">{msg.metrics.pendingOrders} টি</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Interim voice recognition transcript */}
              {interimTranscript && (
                <div className="flex flex-col items-end">
                  <div className="rounded-2xl bg-purple-900/40 border border-purple-500/40 p-3 text-xs sm:text-sm text-purple-200 italic animate-pulse">
                    🎙️ শুনছি: "{interimTranscript}"
                  </div>
                </div>
              )}

              {/* Processing indicator */}
              {isProcessing && (
                <div className="flex items-center gap-2 p-3 text-xs text-purple-400">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>সেলস ডেটা হিসাব করা হচ্ছে... Please wait...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* QUICK QUESTION CHIPS (Exact user requested phrases) */}
            <div className="px-4 py-2 border-t border-purple-500/10 bg-purple-950/10 shrink-0">
              <div className="text-[10px] uppercase font-bold text-slate-400 mb-1.5 flex items-center gap-1">
                <span>দ্রুত জিজ্ঞাসা করুন (Quick Prompts):</span>
              </div>
              <div className="flex flex-wrap gap-1.5 overflow-x-auto pb-1">
                {[
                  'আজকের কতটুকু সেল হলো?',
                  'আজকের সেলে কি কি রিপোর্ট?',
                  'কতগুলা সেল হইছে?',
                  'কমপ্লিট হইছে কতগুলা?',
                  'অর্ডার পেন্ডিংয়ে রয়েছে কতগুলা?',
                ].map((promptText) => (
                  <button
                    key={promptText}
                    onClick={() => handleSendQuery(promptText)}
                    className="px-2.5 py-1 rounded-xl border border-purple-500/30 bg-purple-900/30 hover:bg-purple-600/30 hover:border-purple-400 text-[11px] font-semibold text-purple-200 transition text-left"
                  >
                    🎙️ {promptText}
                  </button>
                ))}
              </div>
            </div>

            {/* INPUT & MICROPHONE CONTROLS BAR */}
            <div className="p-4 border-t border-purple-500/20 bg-[#090716] shrink-0">
              <div className="flex items-center gap-2">
                
                {/* Voice Push-to-Talk Mic Button */}
                <button
                  onClick={toggleListening}
                  className={`relative flex items-center justify-center p-3 sm:px-4 sm:py-3 rounded-2xl font-bold text-xs transition shadow-lg ${
                    isListening
                      ? 'bg-rose-600 text-white shadow-rose-600/40 animate-pulse'
                      : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:brightness-110 shadow-purple-600/30'
                  }`}
                  title={isListening ? 'Stop Listening' : 'Speak to Voice Assistant'}
                >
                  <div className="flex items-center gap-2">
                    {isListening ? (
                      <>
                        <MicOff className="w-5 h-5" />
                        <span className="hidden sm:inline">শুনছি... বন্ধ করুন</span>
                      </>
                    ) : (
                      <>
                        <Mic className="w-5 h-5" />
                        <span className="hidden sm:inline">কথা বলুন (Speak)</span>
                      </>
                    )}
                  </div>
                </button>

                {/* Text Input Fallback */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendQuery(inputText);
                  }}
                  className="flex-1 flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={
                      isListening
                        ? 'মাইক্রোফোনে কথা বলুন...'
                        : 'মুখে বলুন অথবা এখানে লিখুন (যেমন: আজকের কতটুকু সেল হলো?)...'
                    }
                    className="flex-1 px-4 py-3 rounded-2xl border border-purple-500/30 bg-slate-900/80 text-white placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:border-purple-500"
                  />
                  <button
                    type="submit"
                    disabled={!inputText.trim() || isProcessing}
                    className="p-3 rounded-2xl bg-purple-600 text-white hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed transition"
                    title="Send Query"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>

              {/* Real-time soundwave bar animation when listening */}
              {isListening && (
                <div className="mt-3 flex items-center justify-center gap-1.5 py-1">
                  <span className="text-[11px] text-rose-400 font-semibold mr-2 animate-pulse">
                    ● লাইভ মাইক্রোফোন চালু আছে — কথা বলুন:
                  </span>
                  {[30, 60, 90, 45, 80, 50, 100, 40, 75, 55].map((height, idx) => (
                    <span
                      key={idx}
                      className="w-1 bg-purple-400 rounded-full animate-bounce"
                      style={{
                        height: `${height * 0.25}px`,
                        animationDelay: `${idx * 0.1}s`,
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: LIVE SALES REPORT CARD & EMAIL DISPATCH (lg:col-span-5) */}
          <div className="lg:col-span-5 flex flex-col bg-[#0d0920] overflow-y-auto p-5 space-y-4">
            
            {/* CARD TITLE & REFRESH */}
            <div className="flex items-center justify-between pb-3 border-b border-purple-500/20 shrink-0">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-purple-400" />
                  <span>আজকের লাইভ সেলস রিপোর্ট</span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  {latestMetrics ? `${latestMetrics.dateBangla} · ${latestMetrics.date}` : 'ডেটা লোড হচ্ছে...'}
                </p>
              </div>
              <button
                onClick={fetchTodayStats}
                disabled={loadingMetrics}
                className="p-1.5 rounded-lg border border-purple-500/30 text-purple-300 hover:bg-purple-900/30 transition"
                title="Refresh Metrics"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingMetrics ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* METRIC CARDS */}
            {latestMetrics ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  
                  {/* Total Sales Revenue */}
                  <div className="col-span-2 rounded-2xl border border-purple-500/40 bg-gradient-to-br from-purple-900/30 to-indigo-900/20 p-4 shadow-sm">
                    <div className="flex items-center justify-between text-xs text-purple-300 font-semibold">
                      <span>আজকের মোট সেল (Revenue)</span>
                      <TrendingUp className="w-4 h-4 text-purple-400" />
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-white mt-1">
                      ৳{latestMetrics.totalSales?.toLocaleString()}
                    </div>
                    <div className="text-[11px] text-purple-300/80 mt-1">
                      মোট {latestMetrics.totalOrders}টি অর্ডারের সম্মিলিত বিক্রয়
                    </div>
                  </div>

                  {/* Total Orders */}
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>মোট সেলস / অর্ডার</span>
                      <ShoppingBag className="w-3.5 h-3.5 text-indigo-400" />
                    </div>
                    <div className="text-xl font-bold text-white mt-1">
                      {latestMetrics.totalOrders} টি
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      গড় ভ্যালু: ৳{latestMetrics.averageOrderValue?.toLocaleString()}
                    </div>
                  </div>

                  {/* Completed / Delivered */}
                  <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-3">
                    <div className="flex items-center justify-between text-[11px] text-emerald-300 font-medium">
                      <span>কমপ্লিট / ডেলিভার্ড</span>
                      <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                    </div>
                    <div className="text-xl font-bold text-emerald-400 mt-1">
                      {latestMetrics.completedOrders} টি
                    </div>
                    <div className="text-[10px] text-emerald-400/80 mt-0.5">
                      সফলভাবে ডেলিভারি হয়েছে
                    </div>
                  </div>

                  {/* Confirmed Orders */}
                  <div className="rounded-2xl border border-blue-500/30 bg-blue-950/20 p-3">
                    <div className="flex items-center justify-between text-[11px] text-blue-300 font-medium">
                      <span>কনফার্মড অর্ডার</span>
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
                    </div>
                    <div className="text-xl font-bold text-blue-400 mt-1">
                      {latestMetrics.confirmedOrders} টি
                    </div>
                    <div className="text-[10px] text-blue-400/80 mt-0.5">
                      শিপমেন্ট প্রসেসিংয়ে রয়েছে
                    </div>
                  </div>

                  {/* Pending Orders */}
                  <div className="rounded-2xl border border-amber-500/30 bg-amber-950/20 p-3">
                    <div className="flex items-center justify-between text-[11px] text-amber-300 font-medium">
                      <span>অর্ডার পেন্ডিং রয়েছে</span>
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                    </div>
                    <div className="text-xl font-bold text-amber-400 mt-1">
                      {latestMetrics.pendingOrders} টি
                    </div>
                    <div className="text-[10px] text-amber-400/80 mt-0.5">
                      কনফার্মেশন অপেক্ষমাণ
                    </div>
                  </div>
                </div>

                {/* TOP PRODUCTS SECTION */}
                {latestMetrics.topProducts?.length > 0 && (
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3.5 space-y-2">
                    <div className="text-xs font-bold text-slate-200 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5 text-purple-400" />
                        <span>শীর্ষ বিক্রিত পণ্য (Top Products):</span>
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {latestMetrics.topProducts.slice(0, 3).map((prod: any, idx: number) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-slate-800/40"
                        >
                          <div className="truncate pr-2">
                            <span className="font-semibold text-slate-200">{prod.name}</span>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-slate-400">{prod.quantity} পিস · </span>
                            <span className="font-bold text-emerald-400">৳{prod.revenue?.toLocaleString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* TODAY'S RECENT ORDERS TABLE */}
                {latestMetrics.recentOrders?.length > 0 && (
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3.5 space-y-2">
                    <div className="text-xs font-bold text-slate-200">
                      <span>আজকের অর্ডার তালিকা ({latestMetrics.recentOrders.length}টি):</span>
                    </div>
                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                      {latestMetrics.recentOrders.map((ord: any) => (
                        <div
                          key={ord.id}
                          className="flex items-center justify-between text-[11px] p-2 rounded-lg bg-slate-800/50 border border-slate-700/40"
                        >
                          <div>
                            <div className="font-bold text-white flex items-center gap-1.5">
                              <span>{ord.customerName}</span>
                              <span className="text-[9px] px-1.5 py-0.2 rounded font-mono bg-purple-900/40 text-purple-300 border border-purple-500/20">
                                {ord.orderNumber}
                              </span>
                            </div>
                            <div className="text-slate-400 truncate max-w-[180px]">{ord.itemsSummary}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-emerald-400">৳{ord.total?.toLocaleString()}</div>
                            <div className="text-[9px] uppercase font-bold text-purple-300">
                              {ord.status === 'delivered' ? 'কমপ্লিট' : ord.status === 'confirmed' ? 'কনফার্মড' : 'পেন্ডিং'}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ACTION BUTTONS: SEND TO EMAIL & COPY */}
                <div className="pt-2 space-y-2">
                  <button
                    onClick={() => setShowEmailModal(true)}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-xs sm:text-sm hover:brightness-110 transition shadow-lg shadow-purple-600/30"
                  >
                    <Mail className="w-4 h-4" />
                    <span>ইমেইলে রিপোর্ট পাঠান (Send Report via Email)</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCopyReport}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-purple-500/30 bg-purple-900/20 hover:bg-purple-900/40 text-xs font-semibold text-purple-200 transition"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>{copiedReport ? 'রিপোর্ট কপি হয়েছে!' : 'রিপোর্ট টেক্সট কপি করুন'}</span>
                    </button>

                    <a
                      href={`mailto:${recipientEmail}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(
                        `YEAR INFO AI — আজকের সেলস রিপোর্ট (${latestMetrics.dateBangla})\nমোট বিক্রয়: ৳${latestMetrics.totalSales}\nমোট অর্ডার: ${latestMetrics.totalOrders}\nকমপ্লিট: ${latestMetrics.completedOrders}\nপেন্ডিং: ${latestMetrics.pendingOrders}`
                      )}`}
                      className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition"
                      title="Open Mail App"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Mail App</span>
                    </a>
                  </div>
                </div>
              </>
            ) : (
              <div className="py-12 text-center text-slate-400 text-xs">
                সেলস ডেটা লোড হচ্ছে...
              </div>
            )}
          </div>
        </div>

        {/* EMAIL DISPATCH SUB-MODAL */}
        {showEmailModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="relative w-full max-w-lg rounded-3xl border border-purple-500/40 bg-[#120d26] p-6 text-slate-100 shadow-2xl">
              
              <div className="flex items-center justify-between pb-3 border-b border-purple-500/20 mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-purple-600/30 border border-purple-500/30 text-purple-300">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">ইমেইলে সেলস রিপোর্ট পাঠান</h4>
                    <p className="text-[11px] text-slate-400">Send Today's Sales & Orders Report via Email</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowEmailModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {emailSuccessMessage ? (
                <div className="py-6 text-center space-y-3">
                  <div className="mx-auto w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h5 className="text-base font-bold text-white">রিপোর্ট সফলভাবে পাঠানো হয়েছে!</h5>
                  <p className="text-xs text-slate-300">{emailSuccessMessage}</p>
                </div>
              ) : (
                <form onSubmit={handleSendEmailReport} className="space-y-4">
                  
                  {emailError && (
                    <div className="p-3 rounded-xl border border-rose-500/30 bg-rose-950/30 text-xs text-rose-300 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{emailError}</span>
                    </div>
                  )}

                  {/* Recipient Email */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      প্রাপকের ইমেইল অ্যাড্রেস (Recipient Email) <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={recipientEmail}
                      onChange={(e) => setRecipientEmail(e.target.value)}
                      placeholder="e.g. yourname@gmail.com"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-purple-500/30 bg-slate-900 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  {/* Subject */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      ইমেইল সাবজেক্ট (Subject Line)
                    </label>
                    <input
                      type="text"
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-purple-500/30 bg-slate-900 text-white text-xs focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  {/* Custom Note */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      অতিরিক্ত নোট বা বার্তা (Optional Note)
                    </label>
                    <textarea
                      rows={2}
                      value={emailNote}
                      onChange={(e) => setEmailNote(e.target.value)}
                      placeholder="যেমন: আজকের ইভিনিং সেলের আপডেট রিপোর্ট..."
                      className="w-full px-3.5 py-2 rounded-xl border border-purple-500/30 bg-slate-900 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  {/* Report Summary Preview Box */}
                  {latestMetrics && (
                    <div className="p-3 rounded-xl border border-purple-500/20 bg-purple-950/20 text-[11px] text-slate-300 space-y-1">
                      <div className="font-semibold text-purple-300 flex items-center justify-between">
                        <span>সংযুক্ত রিপোর্টের প্রিভিউ:</span>
                        <span>{latestMetrics.dateBangla}</span>
                      </div>
                      <div>• মোট বিক্রয়: ৳{latestMetrics.totalSales?.toLocaleString()} টাকা</div>
                      <div>• মোট অর্ডার: {latestMetrics.totalOrders}টি (কমপ্লিট: {latestMetrics.completedOrders}টি, পেন্ডিং: {latestMetrics.pendingOrders}টি)</div>
                    </div>
                  )}

                  {/* Modal Action Buttons */}
                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowEmailModal(false)}
                      className="px-4 py-2 rounded-xl border border-slate-700 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition"
                    >
                      বাতিল (Cancel)
                    </button>
                    <button
                      type="submit"
                      disabled={sendingEmail}
                      className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-bold hover:brightness-110 disabled:opacity-50 flex items-center gap-2 transition shadow-md shadow-purple-600/30"
                    >
                      {sendingEmail ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>পাঠানো হচ্ছে...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>এখনই ইমেইল পাঠান</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
