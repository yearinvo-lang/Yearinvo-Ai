import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Copy,
  Check,
  X,
  ArrowRight,
  MessageSquare,
  Globe,
  Phone,
  Instagram,
  Facebook,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { Channel } from '../types/index.ts';

export const ChannelsPage: React.FC = () => {
  const { activeWorkspace, apiRequest } = useAuth();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingSync, setCheckingSync] = useState<string | null>(null);

  // Meta OAuth Configuration
  const [metaConfig, setMetaConfig] = useState<{
    appIdConfigured: boolean;
    appId: string;
    appUrl: string;
    redirectUri: string;
    scopes: Record<string, string[]>;
  } | null>(null);

  // ==========================================
  // FACEBOOK / MESSENGER MODAL STATE
  // ==========================================
  const [fbModalOpen, setFbModalOpen] = useState(false);
  const [fbModalChannel, setFbModalChannel] = useState<'facebook' | 'messenger'>('facebook');
  const [fbAuthStep, setFbAuthStep] = useState<'auth' | 'select_page'>('auth');
  const [fbLoading, setFbLoading] = useState(false);
  const [fbError, setFbError] = useState<string | null>(null);
  const [fbVerifiedPages, setFbVerifiedPages] = useState<any[]>([]);
  const [fbSelectedPageId, setFbSelectedPageId] = useState<string>('');
  const [fbTokenSessionId, setFbTokenSessionId] = useState<string>('');

  // ==========================================
  // INSTAGRAM MODAL STATE
  // ==========================================
  const [igModalOpen, setIgModalOpen] = useState(false);
  const [igAuthStep, setIgAuthStep] = useState<'auth' | 'select_account'>('auth');
  const [igLoading, setIgLoading] = useState(false);
  const [igError, setIgError] = useState<string | null>(null);
  const [igDiscoveredAccounts, setIgDiscoveredAccounts] = useState<any[]>([]);
  const [igSelectedAccountId, setIgSelectedAccountId] = useState<string>('');
  const [igTokenSessionId, setIgTokenSessionId] = useState<string>('');

  // ==========================================
  // WHATSAPP MODAL STATE
  // ==========================================
  const [waModalOpen, setWaModalOpen] = useState(false);
  const [waPhoneNumberId, setWaPhoneNumberId] = useState('');
  const [waWabaId, setWaWabaId] = useState('');
  const [waAccessToken, setWaAccessToken] = useState('');
  const [waLoading, setWaLoading] = useState(false);
  const [waError, setWaError] = useState<string | null>(null);

  // ==========================================
  // LIVE CHAT MODAL STATE
  // ==========================================
  const [liveChatModalOpen, setLiveChatModalOpen] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  const loadChannels = async () => {
    setLoading(true);
    try {
      const [channelsData, configData] = await Promise.all([
        apiRequest('/api/channels').catch(() => null),
        apiRequest('/api/channels/meta/config').catch(() => null),
      ]);
      if (channelsData && Array.isArray(channelsData)) {
        setChannels(channelsData);
      } else {
        const wsId = activeWorkspace?.id || 'ws_default';
        const defaultChannels: Channel[] = [
          { id: 'ch_fb', workspaceId: wsId, type: 'facebook', name: 'Facebook', status: 'not_connected' },
          { id: 'ch_ms', workspaceId: wsId, type: 'messenger', name: 'Messenger', status: 'not_connected' },
          { id: 'ch_ig', workspaceId: wsId, type: 'instagram', name: 'Instagram', status: 'not_connected' },
          { id: 'ch_wa', workspaceId: wsId, type: 'whatsapp', name: 'WhatsApp Business', status: 'not_connected' },
          { id: 'ch_lc', workspaceId: wsId, type: 'livechat', name: 'Website Live Chat', status: 'not_connected' },
        ];
        setChannels(defaultChannels);
      }
      if (configData) {
        setMetaConfig(configData);
      }
    } catch (e: any) {
      console.warn('Notice loading channels:', e?.message || e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChannels();
  }, [activeWorkspace?.id]);

  // ==========================================
  // FACEBOOK / MESSENGER ACTIONS
  // ==========================================
  const handleStartFacebookOAuth = async (channelType: 'facebook' | 'messenger') => {
    setFbError(null);
    setFbLoading(true);

    try {
      const res = await apiRequest(`/api/channels/meta/oauth-url?channelType=${channelType}`).catch(() => null);
      if (res && res.configured && res.url) {
        const popup = window.open(res.url, 'facebook_oauth_popup', 'width=650,height=750');
        if (!popup) {
          setFbError('Popup was blocked by your browser. Please allow popups for this site.');
          setFbLoading(false);
          return;
        }

        let popupTimer: any = null;
        const handlePopupMsg = async (event: MessageEvent) => {
          if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
            window.removeEventListener('message', handlePopupMsg);
            if (popupTimer) clearInterval(popupTimer);
            if (event.data.error) {
              const errMsg = event.data.error;
              const isDenied = errMsg.includes('denied') || errMsg.includes('cancel');
              setFbError(isDenied ? 'Authorization was cancelled by user.' : `Authorization notice: ${errMsg}`);
              setFbLoading(false);
              return;
            }
            if (res.state && event.data.state && event.data.state !== res.state) {
              setFbError('Security validation failed: OAuth state mismatch.');
              setFbLoading(false);
              return;
            }
            if (!event.data.code) {
              setFbError('No authorization code was received from Meta.');
              setFbLoading(false);
              return;
            }
            await verifyFacebookCode(event.data.code, res.redirectUri, channelType, event.data.state || res.state);
          }
        };

        popupTimer = setInterval(() => {
          if (popup.closed) {
            clearInterval(popupTimer);
            window.removeEventListener('message', handlePopupMsg);
            setFbLoading(false);
          }
        }, 800);

        window.addEventListener('message', handlePopupMsg);
      } else {
        setFbError('Meta App ID is currently not configured in backend settings.');
        setFbLoading(false);
      }
    } catch (e: any) {
      setFbError(e.message || 'Failed to start authorization');
      setFbLoading(false);
    }
  };

  const verifyFacebookCode = async (code: string, redirectUri: string, channelType: string, state?: string) => {
    setFbLoading(true);
    setFbError(null);
    try {
      const res = await apiRequest('/api/channels/meta/verify-and-list-pages', {
        method: 'POST',
        body: JSON.stringify({ code, redirectUri, channelType, state }),
      });

      if (res && res.pages && res.pages.length > 0) {
        setFbVerifiedPages(res.pages);
        setFbSelectedPageId(res.pages[0].id);
        setFbTokenSessionId(res.tokenSessionId || `meta_sess_${Date.now()}`);
        setFbAuthStep('select_page');
      } else {
        setFbError('No authorized Facebook Pages were found. Ensure your Facebook account manages at least one Page.');
      }
    } catch (e: any) {
      setFbError(e.message || 'Failed to verify authorization');
    } finally {
      setFbLoading(false);
    }
  };

  const handleConfirmFacebookPageSelection = async () => {
    if (!fbSelectedPageId) return;
    setFbLoading(true);
    setFbError(null);

    const selectedPage = fbVerifiedPages.find((p) => p.id === fbSelectedPageId);
    const pageName = selectedPage?.name || 'Facebook Page';

    try {
      const payload = {
        channelType: fbModalChannel,
        pageId: fbSelectedPageId,
        pageName,
        tokenSessionId: fbTokenSessionId,
      };

      const updatedChannel = await apiRequest('/api/channels/meta/connect-selected', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (updatedChannel) {
        setChannels((prev) => prev.map((c) => (c.type === fbModalChannel ? updatedChannel : c)));
      }
      setFbModalOpen(false);
      setFbAuthStep('auth');
      setFbVerifiedPages([]);
    } catch (e: any) {
      setFbError(e.message || 'Failed to connect selected Page');
    } finally {
      setFbLoading(false);
    }
  };

  // ==========================================
  // INSTAGRAM ACTIONS
  // ==========================================
  const handleStartInstagramOAuth = async () => {
    setIgError(null);
    setIgLoading(true);

    try {
      const res = await apiRequest('/api/channels/meta/oauth-url?channelType=instagram').catch(() => null);
      if (res && res.configured && res.url) {
        const popup = window.open(res.url, 'instagram_oauth_popup', 'width=650,height=750');
        if (!popup) {
          setIgError('Popup was blocked by your browser. Please allow popups for this site.');
          setIgLoading(false);
          return;
        }

        let popupTimer: any = null;
        const handlePopupMsg = async (event: MessageEvent) => {
          if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
            window.removeEventListener('message', handlePopupMsg);
            if (popupTimer) clearInterval(popupTimer);
            if (event.data.error) {
              setIgError(`Authorization notice: ${event.data.error}`);
              setIgLoading(false);
              return;
            }
            if (!event.data.code) {
              setIgError('No authorization code was received from Meta.');
              setIgLoading(false);
              return;
            }
            await verifyInstagramCode(event.data.code, res.redirectUri);
          }
        };

        popupTimer = setInterval(() => {
          if (popup.closed) {
            clearInterval(popupTimer);
            window.removeEventListener('message', handlePopupMsg);
            setIgLoading(false);
          }
        }, 800);

        window.addEventListener('message', handlePopupMsg);
      } else {
        setIgError('Meta App ID is currently not configured in backend settings.');
        setIgLoading(false);
      }
    } catch (e: any) {
      setIgError(e.message || 'Failed to start authorization');
      setIgLoading(false);
    }
  };

  const verifyInstagramCode = async (code: string, redirectUri: string) => {
    setIgLoading(true);
    setIgError(null);
    try {
      const res = await apiRequest('/api/channels/meta/verify-and-list-pages', {
        method: 'POST',
        body: JSON.stringify({ code, redirectUri, channelType: 'instagram' }),
      });

      const igAccounts: any[] = [];
      if (res && res.pages) {
        for (const p of res.pages) {
          if (p.instagram_business_account) {
            igAccounts.push({
              id: p.instagram_business_account.id,
              username: p.instagram_business_account.username || p.instagram_business_account.name,
              name: p.instagram_business_account.name || p.instagram_business_account.username,
              pageName: p.name,
              pageId: p.id,
              access_token: p.access_token,
            });
          }
        }
      }

      if (igAccounts.length > 0) {
        setIgDiscoveredAccounts(igAccounts);
        setIgSelectedAccountId(igAccounts[0].id);
        setIgTokenSessionId(res.tokenSessionId || `meta_sess_${Date.now()}`);
        setIgAuthStep('select_account');
      } else {
        setIgError('No connected Instagram Professional accounts found. Please ensure your Instagram account is switched to Professional and connected to your Facebook Page.');
      }
    } catch (e: any) {
      setIgError(e.message || 'Failed to verify Instagram account');
    } finally {
      setIgLoading(false);
    }
  };

  const handleConfirmInstagramSelection = async () => {
    if (!igSelectedAccountId) return;
    setIgLoading(true);
    setIgError(null);

    const selected = igDiscoveredAccounts.find((a) => a.id === igSelectedAccountId);
    const accountName = selected ? `@${selected.username}` : 'Instagram Account';

    try {
      const payload = {
        channelType: 'instagram',
        pageId: selected?.pageId,
        pageName: accountName,
        instagramAccountId: igSelectedAccountId,
        tokenSessionId: igTokenSessionId,
      };

      const updated = await apiRequest('/api/channels/meta/connect-selected', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (updated) {
        setChannels((prev) => prev.map((c) => (c.type === 'instagram' ? updated : c)));
      }
      setIgModalOpen(false);
      setIgAuthStep('auth');
      setIgDiscoveredAccounts([]);
    } catch (e: any) {
      setIgError(e.message || 'Failed to connect Instagram account');
    } finally {
      setIgLoading(false);
    }
  };

  // ==========================================
  // WHATSAPP ACTIONS
  // ==========================================
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

      if (updated) {
        setChannels((prev) => prev.map((c) => (c.type === 'whatsapp' ? updated : c)));
      }
      setWaModalOpen(false);
      setWaPhoneNumberId('');
      setWaWabaId('');
      setWaAccessToken('');
    } catch (e: any) {
      setWaError(e.message || 'Failed to verify WhatsApp Business credentials');
    } finally {
      setWaLoading(false);
    }
  };

  // ==========================================
  // LIVE CHAT ACTIONS
  // ==========================================
  const handleToggleLiveChat = async (shouldEnable: boolean) => {
    try {
      const updated = await apiRequest('/api/channels/livechat/toggle', {
        method: 'POST',
        body: JSON.stringify({ enabled: shouldEnable }),
      });
      if (updated) {
        setChannels((prev) => prev.map((c) => (c.type === 'livechat' ? updated : c)));
      }
    } catch (e) {
      console.error('Failed to update live chat:', e);
    }
  };

  const widgetSnippet = `<script>
  window.YEAR_INFO_AI_CONFIG = {
    workspaceId: "${activeWorkspace?.id || 'ws_store'}",
    brandName: "${activeWorkspace?.name || 'Store'}"
  };
</script>
<script src="${metaConfig?.appUrl || 'https://year-info-ai.vercel.app'}/widget.js" async></script>`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(widgetSnippet);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  // ==========================================
  // DISCONNECT & CHECK
  // ==========================================
  const handleDisconnect = async (type: string, name: string) => {
    if (!confirm(`Are you sure you want to disconnect ${name}?`)) {
      return;
    }

    try {
      const updated = await apiRequest('/api/channels/disconnect', {
        method: 'POST',
        body: JSON.stringify({ channelType: type }),
      });
      if (updated) {
        setChannels((prev) => prev.map((c) => (c.type === type ? updated : c)));
      }
    } catch (e) {
      console.error('Failed to disconnect channel:', e);
    }
  };

  const handleCheckSync = async (type: string) => {
    setCheckingSync(type);
    try {
      const updated = await apiRequest('/api/channels/check-sync', {
        method: 'POST',
        body: JSON.stringify({ channelType: type }),
      }).catch(() => null);
      if (updated) {
        setChannels((prev) => prev.map((c) => (c.type === type ? updated : c)));
      }
    } catch (e) {
      console.error('Failed to check sync:', e);
    } finally {
      setCheckingSync(null);
    }
  };

  // ==========================================
  // CHANNEL CARDS DEFINITION
  // ==========================================
  const channelCards = [
    {
      type: 'facebook',
      name: 'Facebook',
      icon: (
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600/10 text-blue-600 dark:bg-blue-600/20 dark:text-blue-400">
          <Facebook className="h-6 w-6" />
        </div>
      ),
      onConnect: () => {
        setFbModalChannel('facebook');
        setFbAuthStep('auth');
        setFbError(null);
        setFbModalOpen(true);
      },
    },
    {
      type: 'messenger',
      name: 'Messenger',
      icon: (
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-500 dark:bg-sky-500/20 dark:text-sky-400">
          <MessageSquare className="h-6 w-6" />
        </div>
      ),
      onConnect: () => {
        setFbModalChannel('messenger');
        setFbAuthStep('auth');
        setFbError(null);
        setFbModalOpen(true);
      },
    },
    {
      type: 'instagram',
      name: 'Instagram',
      icon: (
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-pink-500/10 text-pink-500 dark:bg-pink-500/20 dark:text-pink-400">
          <Instagram className="h-6 w-6" />
        </div>
      ),
      onConnect: () => {
        setIgAuthStep('auth');
        setIgError(null);
        setIgModalOpen(true);
      },
    },
    {
      type: 'whatsapp',
      name: 'WhatsApp Business',
      icon: (
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500 dark:bg-emerald-500/20 dark:text-emerald-400">
          <Phone className="h-6 w-6" />
        </div>
      ),
      onConnect: () => {
        setWaError(null);
        setWaModalOpen(true);
      },
    },
    {
      type: 'livechat',
      name: 'Website Live Chat',
      icon: (
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400">
          <Globe className="h-6 w-6" />
        </div>
      ),
      onConnect: () => {
        setLiveChatModalOpen(true);
      },
    },
  ];

  const liveChatChannel = channels.find((c) => c.type === 'livechat');
  const isLiveChatConnected = liveChatChannel?.status === 'connected';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-200 dark:border-purple-500/20 bg-white dark:bg-slate-900 p-6 shadow-sm dark:shadow-xl">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">Connect Channels</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Connect your customer messaging channels to manage conversations in one place.
          </p>
        </div>

        <button
          onClick={loadChannels}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition self-start sm:self-auto"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* 5 Clean Channel Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {channelCards.map((card) => {
          const ch = channels.find((c) => c.type === card.type);
          const isConnected = ch?.status === 'connected';

          return (
            <div
              key={card.type}
              className={`rounded-2xl border p-5 shadow-sm transition flex flex-col justify-between ${
                isConnected
                  ? 'border-purple-300 dark:border-purple-500/30 bg-purple-50/20 dark:bg-slate-900'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div className="space-y-4">
                {/* Official Platform Icon & Status */}
                <div className="flex items-center justify-between">
                  {card.icon}
                  <div>
                    {isConnected ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        Connected
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                        Not connected
                      </span>
                    )}
                  </div>
                </div>

                {/* Short Channel Name */}
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    {card.name}
                  </h3>
                  {isConnected && ch?.name && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                      {ch.name}
                    </p>
                  )}
                </div>
              </div>

              {/* Action Button: Connect / Reconnect / Disconnect */}
              <div className="pt-5 mt-4 border-t border-slate-100 dark:border-slate-800/80">
                {isConnected ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={card.onConnect}
                      className="flex-1 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                    >
                      Reconnect
                    </button>
                    <button
                      onClick={() => handleDisconnect(card.type, card.name)}
                      className="rounded-xl border border-rose-300 dark:border-rose-500/30 px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition"
                    >
                      Disconnect
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={card.onConnect}
                    className="w-full rounded-xl bg-purple-600 py-2 text-xs font-bold text-white shadow-md shadow-purple-600/20 hover:bg-purple-500 transition"
                  >
                    Connect
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* MODAL: FACEBOOK & MESSENGER                                               */}
      {/* ========================================================================= */}
      {fbModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl animate-in fade-in zoom-in-95 my-auto">
            <button
              onClick={() => {
                setFbModalOpen(false);
                setFbAuthStep('auth');
                setFbError(null);
              }}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 dark:hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600/10 text-blue-600 dark:bg-blue-600/20 dark:text-blue-400">
                {fbModalChannel === 'facebook' ? <Facebook className="h-5 w-5" /> : <MessageSquare className="h-5 w-5 text-sky-500" />}
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {fbModalChannel === 'facebook' ? 'Connect Facebook' : 'Connect Messenger'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {fbModalChannel === 'facebook'
                    ? 'Connect your Facebook account to manage your Pages.'
                    : 'Connect Messenger to manage customer conversations.'}
                </p>
              </div>
            </div>

            {fbError && (
              <div className="mb-4 rounded-xl border border-rose-500/20 bg-rose-50 dark:bg-rose-500/10 p-3 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{fbError}</span>
              </div>
            )}

            {fbAuthStep === 'auth' ? (
              <div className="space-y-4 pt-1">
                <button
                  type="button"
                  onClick={() => handleStartFacebookOAuth(fbModalChannel)}
                  disabled={fbLoading}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-xs font-bold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-500 transition disabled:opacity-60"
                >
                  {fbLoading ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Authorizing...</span>
                    </>
                  ) : (
                    <>
                      <Facebook className="h-4 w-4 fill-current" />
                      <span>{fbModalChannel === 'facebook' ? 'Continue with Facebook' : 'Continue with Messenger'}</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="space-y-4 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Select Facebook Page
                  </label>
                  <select
                    value={fbSelectedPageId}
                    onChange={(e) => setFbSelectedPageId(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 text-xs text-slate-900 dark:text-white focus:border-purple-500 focus:outline-none"
                  >
                    {fbVerifiedPages.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={handleConfirmFacebookPageSelection}
                  disabled={fbLoading || !fbSelectedPageId}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-purple-600 py-2.5 text-xs font-bold text-white shadow-md hover:bg-purple-500 transition disabled:opacity-50"
                >
                  {fbLoading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                  <span>Save Connection</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: INSTAGRAM                                                          */}
      {/* ========================================================================= */}
      {igModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl animate-in fade-in zoom-in-95 my-auto">
            <button
              onClick={() => {
                setIgModalOpen(false);
                setIgAuthStep('auth');
                setIgError(null);
              }}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 dark:hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-pink-500/10 text-pink-500 dark:bg-pink-500/20 dark:text-pink-400">
                <Instagram className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Connect Instagram</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Connect your Instagram professional account.
                </p>
              </div>
            </div>

            {igError && (
              <div className="mb-4 rounded-xl border border-rose-500/20 bg-rose-50 dark:bg-rose-500/10 p-3 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{igError}</span>
              </div>
            )}

            {igAuthStep === 'auth' ? (
              <div className="space-y-4 pt-1">
                <button
                  type="button"
                  onClick={handleStartInstagramOAuth}
                  disabled={igLoading}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-pink-600 via-rose-600 to-purple-600 py-3 text-xs font-bold text-white shadow-lg hover:brightness-110 transition disabled:opacity-60"
                >
                  {igLoading ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Authorizing...</span>
                    </>
                  ) : (
                    <>
                      <Instagram className="h-4 w-4" />
                      <span>Continue with Instagram</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="space-y-4 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Select Instagram Account
                  </label>
                  <select
                    value={igSelectedAccountId}
                    onChange={(e) => setIgSelectedAccountId(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 text-xs text-slate-900 dark:text-white focus:border-purple-500 focus:outline-none"
                  >
                    {igDiscoveredAccounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        @{a.username} ({a.pageName})
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={handleConfirmInstagramSelection}
                  disabled={igLoading || !igSelectedAccountId}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-purple-600 py-2.5 text-xs font-bold text-white shadow-md hover:bg-purple-500 transition disabled:opacity-50"
                >
                  {igLoading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                  <span>Save Connection</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: WHATSAPP BUSINESS                                                  */}
      {/* ========================================================================= */}
      {waModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl animate-in fade-in zoom-in-95 my-auto">
            <button
              onClick={() => {
                setWaModalOpen(false);
                setWaError(null);
              }}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 dark:hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500 dark:bg-emerald-500/20 dark:text-emerald-400">
                <Phone className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Connect WhatsApp Business</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Connect your WhatsApp Business account.
                </p>
              </div>
            </div>

            {waError && (
              <div className="mb-4 rounded-xl border border-rose-500/20 bg-rose-50 dark:bg-rose-500/10 p-3 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{waError}</span>
              </div>
            )}

            <form onSubmit={handleConnectWhatsApp} className="space-y-3 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Phone Number ID *
                </label>
                <input
                  type="text"
                  required
                  value={waPhoneNumberId}
                  onChange={(e) => setWaPhoneNumberId(e.target.value)}
                  placeholder="e.g. 109876543210987"
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  WhatsApp Business Account ID (Optional)
                </label>
                <input
                  type="text"
                  value={waWabaId}
                  onChange={(e) => setWaWabaId(e.target.value)}
                  placeholder="e.g. 102938475610293"
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Access Token *
                </label>
                <input
                  type="password"
                  required
                  value={waAccessToken}
                  onChange={(e) => setWaAccessToken(e.target.value)}
                  placeholder="EAAB..."
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-white font-mono focus:border-purple-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={waLoading || !waPhoneNumberId.trim() || !waAccessToken.trim()}
                className="mt-2 w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white shadow-md hover:bg-emerald-500 transition disabled:opacity-50"
              >
                {waLoading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Phone className="h-3.5 w-3.5" />}
                <span>Connect WhatsApp</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: WEBSITE LIVE CHAT                                                  */}
      {/* ========================================================================= */}
      {liveChatModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl animate-in fade-in zoom-in-95 my-auto space-y-4">
            <button
              onClick={() => setLiveChatModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 dark:hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400">
                <Globe className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Website Live Chat</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Add live chat to your website.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4">
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white">Widget Status</span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {isLiveChatConnected ? 'Active and receiving customer messages' : 'Disabled'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleToggleLiveChat(!isLiveChatConnected)}
                className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                  isLiveChatConnected
                    ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 hover:bg-rose-500/20'
                    : 'bg-purple-600 text-white hover:bg-purple-500 shadow-md'
                }`}
              >
                {isLiveChatConnected ? 'Disable Live Chat' : 'Set Up Live Chat'}
              </button>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Embed Code Snippet
                </label>
                <button
                  type="button"
                  onClick={copyToClipboard}
                  className="flex items-center gap-1 text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline"
                >
                  {copiedSnippet ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copiedSnippet ? 'Copied' : 'Copy Code'}</span>
                </button>
              </div>
              <pre className="rounded-xl bg-slate-950 p-3 font-mono text-[11px] text-purple-200 border border-slate-800 overflow-x-auto">
                {widgetSnippet}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
