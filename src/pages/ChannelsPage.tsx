import React, { useState, useEffect } from 'react';
import {
  Share2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Code,
  Copy,
  Check,
  ShieldCheck,
  Globe,
  MessageSquare,
  Lock,
  ArrowRight,
  Info,
  Key,
  X,
  Phone,
  Power,
  RotateCcw,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { Channel } from '../types/index.ts';

export const ChannelsPage: React.FC = () => {
  const { activeWorkspace, apiRequest } = useAuth();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [checkingSync, setCheckingSync] = useState<string | null>(null);

  // Meta OAuth Configuration State
  const [metaConfig, setMetaConfig] = useState<{
    appIdConfigured: boolean;
    appId: string;
    appUrl: string;
    redirectUri: string;
    scopes: Record<string, string[]>;
  } | null>(null);

  // Modal States
  const [metaModalChannel, setMetaModalChannel] = useState<'facebook' | 'messenger' | 'instagram' | null>(null);
  const [metaAuthStep, setMetaAuthStep] = useState<'auth' | 'select_page'>('auth');
  const [metaInputToken, setMetaInputToken] = useState('');
  const [metaLoading, setMetaLoading] = useState(false);
  const [metaError, setMetaError] = useState<string | null>(null);
  const [metaVerifiedPages, setMetaVerifiedPages] = useState<any[]>([]);
  const [metaSelectedPageId, setMetaSelectedPageId] = useState<string>('');
  const [metaTokenSessionId, setMetaTokenSessionId] = useState<string>('');

  // WhatsApp Modal State
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [waPhoneNumberId, setWaPhoneNumberId] = useState('');
  const [waWabaId, setWaWabaId] = useState('');
  const [waAccessToken, setWaAccessToken] = useState('');
  const [waLoading, setWaLoading] = useState(false);
  const [waError, setWaError] = useState<string | null>(null);

  const loadChannels = async () => {
    if (!activeWorkspace) return;
    setLoading(true);
    try {
      const [channelsData, configData] = await Promise.all([
        apiRequest('/api/channels'),
        apiRequest('/api/channels/meta/config'),
      ]);
      setChannels(channelsData);
      setMetaConfig(configData);
    } catch (e) {
      console.error('Failed to load channels:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChannels();
  }, [activeWorkspace?.id]);

  // Handle Meta OAuth Popup
  const handleStartMetaOAuth = async (channelType: 'facebook' | 'messenger' | 'instagram') => {
    setMetaError(null);
    setMetaLoading(true);

    try {
      const res = await apiRequest(`/api/channels/meta/oauth-url?channelType=${channelType}`);
      if (res.configured && res.url) {
        const popup = window.open(res.url, 'meta_oauth_popup', 'width=650,height=750');
        if (!popup) {
          setMetaError('Popup blocked by browser. Please allow popups for this site.');
          setMetaLoading(false);
          return;
        }

        const handlePopupMsg = async (event: MessageEvent) => {
          if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
            window.removeEventListener('message', handlePopupMsg);
            if (event.data.error) {
              setMetaError(`Meta Authorization Error: ${event.data.error}`);
              setMetaLoading(false);
              return;
            }

            // Verify with Meta Graph API
            await verifyMetaCode(event.data.code, res.redirectUri, channelType);
          }
        };

        window.addEventListener('message', handlePopupMsg);
      } else {
        setMetaError(
          'Meta App ID is not configured in environment variables. You can enter your Meta User Access Token below to connect.'
        );
        setMetaLoading(false);
      }
    } catch (e: any) {
      setMetaError(e.message || 'Failed to start Meta OAuth');
      setMetaLoading(false);
    }
  };

  // Verify Code with Meta Graph API
  const verifyMetaCode = async (code: string, redirectUri: string, channelType: string) => {
    setMetaLoading(true);
    setMetaError(null);
    try {
      const res = await apiRequest('/api/channels/meta/verify-and-list-pages', {
        method: 'POST',
        body: JSON.stringify({ code, redirectUri, channelType }),
      });

      if (res.pages && res.pages.length > 0) {
        setMetaVerifiedPages(res.pages);
        setMetaSelectedPageId(res.pages[0].id);
        setMetaTokenSessionId(res.tokenSessionId);
        setMetaAuthStep('select_page');
      } else {
        setMetaError(
          'No eligible Facebook Pages were found for this account. Ensure you are an Admin of at least one Facebook Page.'
        );
      }
    } catch (e: any) {
      setMetaError(e.message || 'Failed to verify authorization with Meta');
    } finally {
      setMetaLoading(false);
    }
  };

  // Verify Manual Token with Meta Graph API
  const handleVerifyManualToken = async () => {
    if (!metaInputToken.trim() || !metaModalChannel) return;
    setMetaLoading(true);
    setMetaError(null);

    try {
      const res = await apiRequest('/api/channels/meta/verify-and-list-pages', {
        method: 'POST',
        body: JSON.stringify({
          accessToken: metaInputToken.trim(),
          channelType: metaModalChannel,
        }),
      });

      if (res.pages && res.pages.length > 0) {
        setMetaVerifiedPages(res.pages);
        setMetaSelectedPageId(res.pages[0].id);
        setMetaTokenSessionId(res.tokenSessionId);
        setMetaAuthStep('select_page');
      } else {
        setMetaError(
          'No eligible Facebook Pages were returned by Meta Graph API. Please ensure your token has the "pages_show_list" and "pages_read_engagement" permissions.'
        );
      }
    } catch (e: any) {
      setMetaError(e.message || 'Token verification failed');
    } finally {
      setMetaLoading(false);
    }
  };

  // Connect Selected Page
  const handleConfirmPageSelection = async () => {
    if (!metaModalChannel || !metaSelectedPageId) return;
    setMetaLoading(true);
    setMetaError(null);

    try {
      const selectedPage = metaVerifiedPages.find((p) => p.id === metaSelectedPageId);
      const igAcc = selectedPage?.instagramAccount;

      const payload = {
        channelType: metaModalChannel,
        pageId: selectedPage?.id,
        pageName: selectedPage?.name,
        igUsername: igAcc?.username,
        igAccountId: igAcc?.id,
        tokenSessionId: metaTokenSessionId,
        manualToken: metaInputToken || undefined,
      };

      const updated = await apiRequest('/api/channels/meta/connect-selected', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setChannels((prev) => prev.map((c) => (c.type === metaModalChannel ? updated : c)));
      setMetaModalChannel(null);
      setMetaAuthStep('auth');
      setMetaInputToken('');
      setMetaVerifiedPages([]);
    } catch (e: any) {
      setMetaError(e.message || 'Failed to connect selected Page');
    } finally {
      setMetaLoading(false);
    }
  };

  // Verify and Connect WhatsApp
  const handleConnectWhatsApp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!waPhoneNumberId.trim() || !waAccessToken.trim()) return;

    setWaLoading(true);
    setWaError(null);

    try {
      const updated = await apiRequest('/api/channels/whatsapp/verify-and-connect', {
        method: 'POST',
        body: JSON.stringify({
          phoneNumberId: waPhoneNumberId.trim(),
          wabaId: waWabaId.trim() || undefined,
          accessToken: waAccessToken.trim(),
        }),
      });

      setChannels((prev) => prev.map((c) => (c.type === 'whatsapp' ? updated : c)));
      setShowWhatsAppModal(false);
      setWaPhoneNumberId('');
      setWaWabaId('');
      setWaAccessToken('');
    } catch (e: any) {
      setWaError(e.message || 'Failed to verify WhatsApp credentials');
    } finally {
      setWaLoading(false);
    }
  };

  // Toggle Live Chat
  const handleToggleLiveChat = async (currentStatus: string) => {
    try {
      const shouldEnable = currentStatus !== 'connected';
      const updated = await apiRequest('/api/channels/livechat/toggle', {
        method: 'POST',
        body: JSON.stringify({ enabled: shouldEnable }),
      });
      setChannels((prev) => prev.map((c) => (c.type === 'livechat' ? updated : c)));
    } catch (e) {
      console.error('Failed to toggle live chat:', e);
    }
  };

  // Disconnect Channel
  const handleDisconnect = async (type: string, name: string) => {
    if (!confirm(`Are you sure you want to disconnect ${name}? This will revoke access credentials and stop automated messages.`)) {
      return;
    }

    try {
      const updated = await apiRequest('/api/channels/disconnect', {
        method: 'POST',
        body: JSON.stringify({ channelType: type }),
      });
      setChannels((prev) => prev.map((c) => (c.type === type ? updated : c)));
    } catch (e) {
      console.error('Failed to disconnect channel:', e);
    }
  };

  // Check Sync
  const handleCheckSync = async (type: string) => {
    setCheckingSync(type);
    try {
      const updated = await apiRequest('/api/channels/check-sync', {
        method: 'POST',
        body: JSON.stringify({ channelType: type }),
      });
      setChannels((prev) => prev.map((c) => (c.type === type ? updated : c)));
    } catch (e) {
      console.error('Failed to check sync:', e);
    } finally {
      setCheckingSync(null);
    }
  };

  const widgetSnippet = `<script>
  window.YEAR_INFO_AI_CONFIG = {
    workspaceId: "${activeWorkspace?.id || 'ws_demo_store'}",
    brandName: "${activeWorkspace?.name || 'Store'}"
  };
</script>
<script src="${metaConfig?.appUrl || 'https://ais-dev-q3chin66kswwbyeyn5djck-411764206474.asia-east1.run.app'}/widget.js" async></script>`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(widgetSnippet);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  const channelCardConfigs = [
    {
      type: 'facebook',
      title: 'Facebook Pages',
      category: 'Meta Graph API',
      badgeClass: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
      description: 'Connect an authorized Facebook Page to sync wall posts, view customer engagement, and enable scheduled social publishing.',
      permissions: ['pages_show_list', 'pages_read_engagement', 'pages_manage_posts'],
      onConnect: () => {
        setMetaModalChannel('facebook');
        setMetaAuthStep('auth');
        setMetaError(null);
      },
    },
    {
      type: 'messenger',
      title: 'Facebook Messenger',
      category: 'Meta Webhooks & Send API',
      badgeClass: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
      description: 'Connect Messenger to receive real-time direct customer inquiries in Central Inbox and configure AI sales assistance.',
      permissions: ['pages_messaging', 'pages_show_list'],
      onConnect: () => {
        setMetaModalChannel('messenger');
        setMetaAuthStep('auth');
        setMetaError(null);
      },
    },
    {
      type: 'instagram',
      title: 'Instagram',
      category: 'Instagram Professional Account',
      badgeClass: 'text-pink-400 bg-pink-500/10 border-pink-500/20',
      description: 'Connect an Instagram Professional account linked to your Facebook Page for Direct messaging and scheduled carousel/image publishing.',
      permissions: ['instagram_basic', 'instagram_manage_messages', 'instagram_content_publish', 'pages_show_list'],
      onConnect: () => {
        setMetaModalChannel('instagram');
        setMetaAuthStep('auth');
        setMetaError(null);
      },
    },
    {
      type: 'whatsapp',
      title: 'WhatsApp Business',
      category: 'Meta Cloud API Platform',
      badgeClass: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      description: 'Connect an official WhatsApp Business Cloud API account to send verified transactional order notifications and scheduled policy-compliant messages.',
      permissions: ['whatsapp_business_messaging', 'whatsapp_business_management'],
      onConnect: () => {
        setShowWhatsAppModal(true);
        setWaError(null);
      },
    },
    {
      type: 'livechat',
      title: 'Website Live Chat',
      category: 'Zero-Latency Widget',
      badgeClass: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
      description: 'Embeddable real-time customer chat widget for your e-commerce storefront. Connects directly to Central Inbox and AI Sales Agent.',
      permissions: ['public_visitor_sessions', 'realtime_agent_handoff'],
      onConnect: () => {
        const current = channels.find((c) => c.type === 'livechat')?.status || 'not_connected';
        handleToggleLiveChat(current);
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-purple-500/20 bg-gradient-to-r from-slate-900 via-purple-950/40 to-slate-900 p-6 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-white">Connected Channels</h1>
            <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs font-bold text-slate-300 border border-slate-700">
              Manual Authorization Only
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Authorize official Meta, WhatsApp Business, and Website messaging channels. Disconnected by default for security.
          </p>
        </div>

        <button
          onClick={loadChannels}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Status</span>
        </button>
      </div>

      {/* Info Callout */}
      <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-4 flex items-start gap-3 text-xs text-slate-300">
        <Info className="h-5 w-5 text-purple-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-bold text-white">Strict Authorization Policy</div>
          <p className="text-slate-400 leading-relaxed">
            Every channel begins in a <span className="text-slate-200 font-semibold">Not Connected</span> state. No account is linked without your explicit OAuth consent. Connecting an account does NOT automatically publish content or enable AI replies—those remain individually controlled in settings.
          </p>
        </div>
      </div>

      {/* 5 Channel Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {channelCardConfigs.map((cfg) => {
          const ch = channels.find((c) => c.type === cfg.type);
          const isConnected = ch?.status === 'connected';
          const isReauth = ch?.status === 'needs_reauth';

          return (
            <div
              key={cfg.type}
              className={`rounded-2xl border p-5 shadow-lg flex flex-col justify-between space-y-4 transition ${
                isConnected
                  ? 'border-purple-500/40 bg-slate-900/90 ring-1 ring-purple-500/20'
                  : 'border-slate-800 bg-slate-900/70 hover:border-slate-700'
              }`}
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-base text-white">{cfg.title}</h3>
                    <span className={`inline-block mt-1 rounded-md px-2 py-0.5 text-[10px] font-bold border ${cfg.badgeClass}`}>
                      {cfg.category}
                    </span>
                  </div>

                  {/* Status Indicator Badge */}
                  <div>
                    {isConnected ? (
                      <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-400 border border-emerald-500/20">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Connected
                      </span>
                    ) : isReauth ? (
                      <span className="flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-bold text-amber-400 border border-amber-500/20">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                        Reauth Needed
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 rounded-full bg-slate-800 px-2.5 py-0.5 text-xs font-bold text-slate-400 border border-slate-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
                        Not Connected
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-xs text-slate-400 mt-2.5 leading-relaxed">
                  {cfg.description}
                </p>

                {/* Connected Account Details */}
                {isConnected && ch && (
                  <div className="mt-3.5 rounded-xl bg-slate-950 p-3 text-xs font-mono border border-slate-800 space-y-1">
                    <div className="text-white font-bold truncate">
                      {ch.name}
                    </div>
                    {ch.accountId && (
                      <div className="text-[11px] text-slate-400 truncate">
                        ID: {ch.accountId}
                      </div>
                    )}
                    {ch.metadata?.phoneNumber && (
                      <div className="text-[11px] text-emerald-400">
                        Phone: {ch.metadata.phoneNumber}
                      </div>
                    )}
                    {ch.lastSyncAt && (
                      <div className="text-[10px] text-slate-500 mt-1">
                        Last Verified Check: {new Date(ch.lastSyncAt).toLocaleTimeString()}
                      </div>
                    )}
                  </div>
                )}

                {/* Error Banner */}
                {ch?.lastError && (
                  <div className="mt-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-2 text-[11px] text-rose-300 flex items-center gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5 text-rose-400 shrink-0" />
                    <span className="truncate">{ch.lastError}</span>
                  </div>
                )}

                {/* Required Scopes */}
                <div className="mt-3 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Required Scopes:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {cfg.permissions.map((p) => (
                      <span key={p} className="rounded bg-slate-800 px-1.5 py-0.2 text-[9px] font-mono text-slate-400">
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                {isConnected ? (
                  <div className="flex items-center gap-2 w-full justify-between">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleCheckSync(cfg.type)}
                        disabled={checkingSync === cfg.type}
                        className="rounded-xl border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs text-slate-300 hover:text-white transition flex items-center gap-1"
                        title="Check Connection Health"
                      >
                        <RefreshCw className={`h-3 w-3 ${checkingSync === cfg.type ? 'animate-spin' : ''}`} />
                        <span>Check</span>
                      </button>
                      <button
                        onClick={cfg.onConnect}
                        className="rounded-xl border border-purple-500/30 px-2.5 py-1.5 text-xs text-purple-300 hover:bg-purple-500/10 transition"
                      >
                        Reconnect
                      </button>
                    </div>

                    <button
                      onClick={() => handleDisconnect(cfg.type, cfg.title)}
                      className="rounded-xl border border-rose-500/30 px-2.5 py-1.5 text-xs font-semibold text-rose-400 hover:bg-rose-500/10 transition"
                    >
                      Disconnect
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={cfg.onConnect}
                    className="w-full rounded-xl bg-purple-600 py-2 text-xs font-bold text-white shadow-md shadow-purple-600/30 hover:bg-purple-500 transition flex items-center justify-center gap-1.5"
                  >
                    <span>Connect {cfg.title}</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Website Live Chat Installation Code */}
      <div className="rounded-2xl border border-purple-500/20 bg-slate-900/90 p-6 space-y-3 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            <Code className="h-5 w-5 text-purple-400" />
            <h3 className="font-bold text-base">Website Live Chat Widget Snippet</h3>
          </div>
          <button
            onClick={copyToClipboard}
            className="flex items-center gap-1.5 rounded-xl bg-purple-600/20 border border-purple-500/30 px-3 py-1.5 text-xs font-bold text-purple-300 hover:bg-purple-600/30 transition"
          >
            {copiedSnippet ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copiedSnippet ? 'Copied!' : 'Copy Code'}</span>
          </button>
        </div>
        <p className="text-xs text-slate-400">
          Paste this script into your HTML storefront to enable customer live chat connected to your Central Inbox.
        </p>
        <pre className="rounded-xl bg-slate-950 p-3.5 font-mono text-[11px] text-purple-200 border border-slate-800 overflow-x-auto">
          {widgetSnippet}
        </pre>
      </div>

      {/* MODAL 1: Meta Authorization Wizard (Facebook / Messenger / Instagram) */}
      {metaModalChannel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="relative w-full max-w-xl rounded-2xl border border-purple-500/30 bg-slate-900 p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <button
              onClick={() => {
                setMetaModalChannel(null);
                setMetaAuthStep('auth');
                setMetaError(null);
              }}
              className="absolute top-5 right-5 text-slate-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="mb-5">
              <h3 className="text-lg font-bold text-white capitalize">
                Connect {metaModalChannel === 'facebook' ? 'Facebook Pages' : metaModalChannel === 'messenger' ? 'Facebook Messenger' : 'Instagram'}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Authenticate with Meta to discover your authorized Facebook Pages and select which account to link.
              </p>
            </div>

            {metaError && (
              <div className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{metaError}</span>
              </div>
            )}

            {metaAuthStep === 'auth' ? (
              <div className="space-y-4">
                {/* Method A: Official OAuth Dialog */}
                <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-300 uppercase tracking-wider">
                      Option 1: Official Facebook OAuth Login
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">Popup Flow</span>
                  </div>
                  <p className="text-xs text-slate-300">
                    Log in directly via Meta's secure authorization dialog. Grants access only to the Pages you select.
                  </p>
                  <button
                    type="button"
                    disabled={metaLoading}
                    onClick={() => handleStartMetaOAuth(metaModalChannel)}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white shadow-lg shadow-blue-600/30 hover:bg-blue-500 disabled:opacity-50 transition"
                  >
                    <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                    </svg>
                    <span>{metaLoading ? 'Waiting for Meta Login...' : 'Continue with Facebook'}</span>
                  </button>
                </div>

                {/* Method B: Direct User Token Verification */}
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-3">
                  <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Option 2: Direct Meta Access Token Verification
                  </div>
                  <p className="text-xs text-slate-400">
                    If your Facebook App is currently in development mode or you use Meta Graph API Explorer, paste your User Access Token to fetch your real Pages:
                  </p>
                  <div>
                    <input
                      type="password"
                      value={metaInputToken}
                      onChange={(e) => setMetaInputToken(e.target.value)}
                      placeholder="EAABw..."
                      className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white font-mono focus:border-purple-500 focus:outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    disabled={!metaInputToken.trim() || metaLoading}
                    onClick={handleVerifyManualToken}
                    className="w-full rounded-xl bg-purple-600 py-2 text-xs font-bold text-white hover:bg-purple-500 disabled:opacity-40 transition"
                  >
                    {metaLoading ? 'Verifying with Meta API...' : 'Verify Token & List Pages'}
                  </button>
                </div>

                {/* Redirect URI Instructions for Meta Developers */}
                <div className="rounded-xl bg-slate-950 p-3 text-[11px] text-slate-400 border border-slate-800 space-y-1 font-mono">
                  <div className="text-purple-300 font-semibold font-sans">Meta Developer Settings Reference:</div>
                  <div>Valid OAuth Redirect URI:</div>
                  <div className="text-slate-300 select-all">{metaConfig?.redirectUri}</div>
                </div>
              </div>
            ) : (
              /* Step 2: Page Selection */
              <div className="space-y-4">
                <div className="text-xs text-slate-300 font-semibold">
                  Select the Page or Account to connect to YEAR INFO AI:
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {metaVerifiedPages.map((page) => (
                    <label
                      key={page.id}
                      className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition ${
                        metaSelectedPageId === page.id
                          ? 'border-purple-500 bg-purple-500/10'
                          : 'border-slate-800 bg-slate-950 hover:border-slate-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="selected_page"
                        value={page.id}
                        checked={metaSelectedPageId === page.id}
                        onChange={() => setMetaSelectedPageId(page.id)}
                        className="mt-1 text-purple-600 focus:ring-purple-500"
                      />
                      <div className="flex-1">
                        <div className="text-sm font-bold text-white">{page.name}</div>
                        <div className="text-xs text-slate-400 font-mono">Page ID: {page.id} • {page.category}</div>
                        {page.instagramAccount && (
                          <div className="text-xs text-pink-400 font-semibold mt-1">
                            Linked Instagram: @{page.instagramAccount.username}
                          </div>
                        )}
                      </div>
                    </label>
                  ))}
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setMetaAuthStep('auth')}
                    className="rounded-xl border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    disabled={!metaSelectedPageId || metaLoading}
                    onClick={handleConfirmPageSelection}
                    className="rounded-xl bg-purple-600 px-5 py-1.5 text-xs font-bold text-white hover:bg-purple-500 transition"
                  >
                    {metaLoading ? 'Saving Credentials...' : 'Confirm & Connect'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 2: WhatsApp Cloud API Setup Modal */}
      {showWhatsAppModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="relative w-full max-w-lg rounded-2xl border border-emerald-500/30 bg-slate-900 p-6 shadow-2xl">
            <button
              onClick={() => setShowWhatsAppModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-lg font-bold text-white mb-1">
              Connect WhatsApp Business Platform
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Enter your official WhatsApp Business Phone Number ID and Cloud API Access Token from the Meta Developer Console.
            </p>

            {waError && (
              <div className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{waError}</span>
              </div>
            )}

            <form onSubmit={handleConnectWhatsApp} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Phone Number ID *
                </label>
                <input
                  type="text"
                  required
                  value={waPhoneNumberId}
                  onChange={(e) => setWaPhoneNumberId(e.target.value)}
                  placeholder="e.g. 109283746501928"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white font-mono focus:border-emerald-500 focus:outline-none"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Found in Meta App &gt; WhatsApp &gt; API Setup &gt; Phone number ID.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  WhatsApp Business Account (WABA) ID (Optional)
                </label>
                <input
                  type="text"
                  value={waWabaId}
                  onChange={(e) => setWaWabaId(e.target.value)}
                  placeholder="e.g. 192837465091823"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white font-mono focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Cloud API Access Token *
                </label>
                <input
                  type="password"
                  required
                  value={waAccessToken}
                  onChange={(e) => setWaAccessToken(e.target.value)}
                  placeholder="EAABw..."
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white font-mono focus:border-emerald-500 focus:outline-none"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Permanent System User Token generated with whatsapp_business_messaging permission.
                </span>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowWhatsAppModal(false)}
                  className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={waLoading}
                  className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-500 transition"
                >
                  {waLoading ? 'Verifying with Meta...' : 'Verify & Connect Number'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
