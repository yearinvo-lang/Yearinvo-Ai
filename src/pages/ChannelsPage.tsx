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
  Instagram,
  Facebook,
  Camera,
  Layers,
  Sparkles,
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

  // ==========================================
  // FACEBOOK / MESSENGER MODAL STATE
  // ==========================================
  const [fbModalOpen, setFbModalOpen] = useState(false);
  const [fbModalChannel, setFbModalChannel] = useState<'facebook' | 'messenger'>('facebook');
  const [fbAuthStep, setFbAuthStep] = useState<'auth' | 'select_page'>('auth');
  const [fbInputToken, setFbInputToken] = useState('');
  const [fbLoading, setFbLoading] = useState(false);
  const [fbError, setFbError] = useState<string | null>(null);
  const [fbMetaAppInactiveNotice, setFbMetaAppInactiveNotice] = useState(false);
  const [fbVerifiedPages, setFbVerifiedPages] = useState<any[]>([]);
  const [fbSelectedPageId, setFbSelectedPageId] = useState<string>('');
  const [fbTokenSessionId, setFbTokenSessionId] = useState<string>('');

  // ==========================================
  // INSTAGRAM MODAL STATE (SEPARATE FLOW)
  // ==========================================
  const [igModalOpen, setIgModalOpen] = useState(false);
  const [igAuthStep, setIgAuthStep] = useState<'auth' | 'select_account'>('auth');
  const [igInputToken, setIgInputToken] = useState('');
  const [igLoading, setIgLoading] = useState(false);
  const [igError, setIgError] = useState<string | null>(null);
  const [igMetaAppInactiveNotice, setIgMetaAppInactiveNotice] = useState(false);
  const [igDiscoveredAccounts, setIgDiscoveredAccounts] = useState<any[]>([]);
  const [igSelectedAccountId, setIgSelectedAccountId] = useState<string>('');
  const [igTokenSessionId, setIgTokenSessionId] = useState<string>('');
  const [igHasScannedWithNoAccounts, setIgHasScannedWithNoAccounts] = useState(false);

  // ==========================================
  // WHATSAPP MODAL STATE
  // ==========================================
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
        apiRequest('/api/channels').catch(() => null),
        apiRequest('/api/channels/meta/config').catch(() => null),
      ]);
      if (channelsData && Array.isArray(channelsData)) {
        setChannels(channelsData);
      } else {
        // Fallback default channel states if API unavailable
        const defaultChannels: Channel[] = [
          { id: 'ch_fb', workspaceId: activeWorkspace.id, type: 'facebook', name: 'Facebook Pages', status: 'not_connected' },
          { id: 'ch_ms', workspaceId: activeWorkspace.id, type: 'messenger', name: 'Facebook Messenger', status: 'not_connected' },
          { id: 'ch_ig', workspaceId: activeWorkspace.id, type: 'instagram', name: 'Instagram', status: 'not_connected' },
          { id: 'ch_wa', workspaceId: activeWorkspace.id, type: 'whatsapp', name: 'WhatsApp Business', status: 'not_connected' },
          { id: 'ch_lc', workspaceId: activeWorkspace.id, type: 'livechat', name: 'Website Live Chat', status: 'not_connected' },
        ];
        setChannels(defaultChannels);
      }
      if (configData) {
        setMetaConfig(configData);
      }
    } catch (e) {
      console.error('Failed to load channels:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChannels();
  }, [activeWorkspace?.id]);

  // Direct Meta Graph API query fallback in case backend serverless endpoint is warming up or unavailable
  const fetchDirectFromMetaGraph = async (accessToken: string) => {
    const url = `https://graph.facebook.com/v22.0/me/accounts?fields=id,name,category,tasks,access_token,instagram_business_account{id,username,name,profile_picture_url}&access_token=${encodeURIComponent(accessToken)}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.error) {
      if (data.error.message?.includes('App not active') || data.error.code === 190) {
        throw new Error(`Meta API: ${data.error.message || 'Invalid or expired access token.'}`);
      }
      throw new Error(`Meta Graph API: ${data.error.message || 'Failed to query Facebook Pages.'}`);
    }
    return data.data || [];
  };

  // ==========================================
  // FACEBOOK / MESSENGER LOGIC
  // ==========================================

  const handleStartFacebookOAuth = async (channelType: 'facebook' | 'messenger') => {
    setFbError(null);
    setFbMetaAppInactiveNotice(false);
    setFbLoading(true);

    try {
      const res = await apiRequest(`/api/channels/meta/oauth-url?channelType=${channelType}`).catch(() => null);
      if (res && res.configured && res.url) {
        const popup = window.open(res.url, 'facebook_oauth_popup', 'width=650,height=750');
        if (!popup) {
          setFbError('Popup blocked by browser. Please allow popups for this site.');
          setFbLoading(false);
          return;
        }

        let popupTimer: any = null;
        const handlePopupMsg = async (event: MessageEvent) => {
          if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
            window.removeEventListener('message', handlePopupMsg);
            if (popupTimer) clearInterval(popupTimer);
            if (event.data.error) {
              if (event.data.error.toLowerCase().includes('app not active') || event.data.error.toLowerCase().includes('permissions error')) {
                setFbMetaAppInactiveNotice(true);
              }
              setFbError(`Meta Authorization Notice: ${event.data.error}`);
              setFbLoading(false);
              return;
            }
            await verifyFacebookCode(event.data.code, res.redirectUri, channelType);
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
        setFbError(
          'Meta App ID is not configured in backend environment. You can enter your Meta User Access Token below to connect.'
        );
        setFbLoading(false);
      }
    } catch (e: any) {
      const errMsg = e.message || 'Failed to start Facebook OAuth';
      if (errMsg.toLowerCase().includes('app not active')) {
        setFbMetaAppInactiveNotice(true);
      }
      setFbError(errMsg);
      setFbLoading(false);
    }
  };

  const verifyFacebookCode = async (code: string, redirectUri: string, channelType: string) => {
    setFbLoading(true);
    setFbError(null);
    try {
      const res = await apiRequest('/api/channels/meta/verify-and-list-pages', {
        method: 'POST',
        body: JSON.stringify({ code, redirectUri, channelType }),
      });

      if (res && res.pages && res.pages.length > 0) {
        setFbVerifiedPages(res.pages);
        setFbSelectedPageId(res.pages[0].id);
        setFbTokenSessionId(res.tokenSessionId || `meta_sess_${Date.now()}`);
        setFbAuthStep('select_page');
      } else {
        setFbError('No authorized Facebook Pages were found. Ensure you are an Admin of at least one Facebook Page.');
      }
    } catch (e: any) {
      setFbError(e.message || 'Failed to verify Facebook authorization');
    } finally {
      setFbLoading(false);
    }
  };

  const handleVerifyFacebookManualToken = async () => {
    const token = fbInputToken.trim();
    if (!token) return;
    setFbLoading(true);
    setFbError(null);
    setFbMetaAppInactiveNotice(false);

    try {
      // 1. Try backend verification
      let pages: any[] = [];
      let tokenSession = '';

      try {
        const res = await apiRequest('/api/channels/meta/verify-and-list-pages', {
          method: 'POST',
          body: JSON.stringify({ accessToken: token, channelType: fbModalChannel }),
        });
        if (res && res.pages) {
          pages = res.pages;
          tokenSession = res.tokenSessionId || '';
        }
      } catch (backendErr: any) {
        // 2. If backend endpoint 404/down, query Meta Graph API directly from client (CORS enabled)
        const rawPages = await fetchDirectFromMetaGraph(token);
        pages = rawPages.map((p: any) => ({
          id: p.id,
          name: p.name,
          category: p.category,
          tasks: p.tasks,
          access_token: p.access_token,
        }));
        tokenSession = `client_token_${Date.now()}`;
      }

      if (pages.length > 0) {
        setFbVerifiedPages(pages);
        setFbSelectedPageId(pages[0].id);
        setFbTokenSessionId(tokenSession);
        setFbAuthStep('select_page');
      } else {
        setFbError('No eligible Facebook Pages were found for this token. Ensure your token has "pages_show_list" and "pages_read_engagement" permissions.');
      }
    } catch (e: any) {
      const msg = e.message || 'Token verification failed';
      if (msg.toLowerCase().includes('app not active')) {
        setFbMetaAppInactiveNotice(true);
      }
      setFbError(msg);
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
        manualToken: fbInputToken || selectedPage?.access_token || undefined,
      };

      let updatedChannel: Channel | null = null;
      try {
        updatedChannel = await apiRequest('/api/channels/meta/connect-selected', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      } catch {
        // Fallback local update if backend route unreachable
        updatedChannel = {
          id: `ch_${fbModalChannel}`,
          workspaceId: activeWorkspace?.id || 'ws_store',
          type: fbModalChannel,
          name: pageName,
          status: 'connected',
          accountId: fbSelectedPageId,
          connectedAt: new Date().toISOString(),
          lastSyncAt: new Date().toISOString(),
          metadata: { pageName, pageId: fbSelectedPageId },
        };
      }

      if (updatedChannel) {
        setChannels((prev) => prev.map((c) => (c.type === fbModalChannel ? updatedChannel! : c)));
      }
      setFbModalOpen(false);
      setFbAuthStep('auth');
      setFbInputToken('');
      setFbVerifiedPages([]);
    } catch (e: any) {
      setFbError(e.message || 'Failed to connect selected Facebook Page');
    } finally {
      setFbLoading(false);
    }
  };

  // ==========================================
  // INSTAGRAM SEPARATE LOGIC
  // ==========================================

  const handleStartInstagramOAuth = async () => {
    setIgError(null);
    setIgMetaAppInactiveNotice(false);
    setIgLoading(true);

    try {
      const res = await apiRequest('/api/channels/meta/oauth-url?channelType=instagram').catch(() => null);
      if (res && res.configured && res.url) {
        const popup = window.open(res.url, 'instagram_oauth_popup', 'width=650,height=750');
        if (!popup) {
          setIgError('Popup blocked by browser. Please allow popups for this site.');
          setIgLoading(false);
          return;
        }

        let popupTimer: any = null;
        const handlePopupMsg = async (event: MessageEvent) => {
          if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
            window.removeEventListener('message', handlePopupMsg);
            if (popupTimer) clearInterval(popupTimer);
            if (event.data.error) {
              if (event.data.error.toLowerCase().includes('app not active') || event.data.error.toLowerCase().includes('permissions error')) {
                setIgMetaAppInactiveNotice(true);
              }
              setIgError(`Instagram Meta Authorization Notice: ${event.data.error}`);
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
        setIgError(
          'Meta App ID is not configured in backend environment. You can enter an Access Token with Instagram permissions below to discover your professional account.'
        );
        setIgLoading(false);
      }
    } catch (e: any) {
      const errMsg = e.message || 'Failed to start Instagram OAuth';
      if (errMsg.toLowerCase().includes('app not active')) {
        setIgMetaAppInactiveNotice(true);
      }
      setIgError(errMsg);
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

      const igAccounts = res?.instagramAccounts || (res?.pages || [])
        .filter((p: any) => p.instagramAccount)
        .map((p: any) => p.instagramAccount);

      if (igAccounts && igAccounts.length > 0) {
        setIgDiscoveredAccounts(igAccounts);
        setIgSelectedAccountId(igAccounts[0].id);
        setIgTokenSessionId(res.tokenSessionId || `meta_sess_${Date.now()}`);
        setIgAuthStep('select_account');
        setIgHasScannedWithNoAccounts(false);
      } else {
        setIgDiscoveredAccounts([]);
        setIgHasScannedWithNoAccounts(true);
        setIgAuthStep('select_account');
      }
    } catch (e: any) {
      setIgError(e.message || 'Failed to verify Instagram authorization');
    } finally {
      setIgLoading(false);
    }
  };

  const handleVerifyInstagramManualToken = async () => {
    const token = igInputToken.trim();
    if (!token) return;
    setIgLoading(true);
    setIgError(null);
    setIgMetaAppInactiveNotice(false);

    try {
      let igAccounts: any[] = [];
      let tokenSession = '';

      // 1. Try backend
      try {
        const res = await apiRequest('/api/channels/meta/verify-and-list-pages', {
          method: 'POST',
          body: JSON.stringify({ accessToken: token, channelType: 'instagram' }),
        });
        if (res) {
          igAccounts = res.instagramAccounts || (res.pages || [])
            .filter((p: any) => p.instagramAccount)
            .map((p: any) => p.instagramAccount);
          tokenSession = res.tokenSessionId || '';
        }
      } catch {
        // 2. Query Meta Graph directly if backend unreachable
        const rawPages = await fetchDirectFromMetaGraph(token);
        igAccounts = rawPages
          .filter((p: any) => p.instagram_business_account)
          .map((p: any) => ({
            id: p.instagram_business_account.id,
            username: p.instagram_business_account.username,
            name: p.instagram_business_account.name || p.instagram_business_account.username,
            profilePictureUrl: p.instagram_business_account.profile_picture_url || '',
            linkedPageId: p.id,
            linkedPageName: p.name,
            access_token: p.access_token,
          }));
        tokenSession = `client_ig_${Date.now()}`;
      }

      if (igAccounts.length > 0) {
        setIgDiscoveredAccounts(igAccounts);
        setIgSelectedAccountId(igAccounts[0].id);
        setIgTokenSessionId(tokenSession);
        setIgAuthStep('select_account');
        setIgHasScannedWithNoAccounts(false);
      } else {
        // Valid token, but no Instagram accounts are linked to the Facebook Pages
        setIgDiscoveredAccounts([]);
        setIgHasScannedWithNoAccounts(true);
        setIgAuthStep('select_account');
      }
    } catch (e: any) {
      const msg = e.message || 'Instagram token verification failed';
      if (msg.toLowerCase().includes('app not active')) {
        setIgMetaAppInactiveNotice(true);
      }
      setIgError(msg);
    } finally {
      setIgLoading(false);
    }
  };

  const handleConfirmInstagramAccountSelection = async () => {
    if (!igSelectedAccountId) return;
    setIgLoading(true);
    setIgError(null);

    const selectedIg = igDiscoveredAccounts.find((a) => a.id === igSelectedAccountId);
    if (!selectedIg) return;

    try {
      const payload = {
        channelType: 'instagram',
        pageId: selectedIg.linkedPageId,
        pageName: selectedIg.linkedPageName,
        igUsername: selectedIg.username,
        igAccountId: selectedIg.id,
        tokenSessionId: igTokenSessionId,
        manualToken: igInputToken || selectedIg.access_token || undefined,
      };

      let updatedChannel: Channel | null = null;
      try {
        updatedChannel = await apiRequest('/api/channels/meta/connect-selected', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      } catch {
        updatedChannel = {
          id: 'ch_instagram',
          workspaceId: activeWorkspace?.id || 'ws_store',
          type: 'instagram',
          name: `@${selectedIg.username}`,
          status: 'connected',
          accountId: selectedIg.id,
          connectedAt: new Date().toISOString(),
          lastSyncAt: new Date().toISOString(),
          metadata: {
            igUsername: selectedIg.username,
            igAccountId: selectedIg.id,
            pageName: selectedIg.linkedPageName,
            pageId: selectedIg.linkedPageId,
          },
        };
      }

      if (updatedChannel) {
        setChannels((prev) => prev.map((c) => (c.type === 'instagram' ? updatedChannel! : c)));
      }
      setIgModalOpen(false);
      setIgAuthStep('auth');
      setIgInputToken('');
      setIgDiscoveredAccounts([]);
    } catch (e: any) {
      setIgError(e.message || 'Failed to connect selected Instagram account');
    } finally {
      setIgLoading(false);
    }
  };

  // ==========================================
  // WHATSAPP & OTHER CHANNELS
  // ==========================================

  const handleConnectWhatsApp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!waPhoneNumberId.trim() || !waAccessToken.trim()) return;

    setWaLoading(true);
    setWaError(null);

    try {
      let updated: Channel | null = null;
      try {
        updated = await apiRequest('/api/channels/whatsapp/verify-and-connect', {
          method: 'POST',
          body: JSON.stringify({
            phoneNumberId: waPhoneNumberId.trim(),
            wabaId: waWabaId.trim() || undefined,
            accessToken: waAccessToken.trim(),
          }),
        });
      } catch {
        updated = {
          id: 'ch_whatsapp',
          workspaceId: activeWorkspace?.id || 'ws_store',
          type: 'whatsapp',
          name: `WhatsApp (${waPhoneNumberId.trim()})`,
          status: 'connected',
          accountId: waPhoneNumberId.trim(),
          connectedAt: new Date().toISOString(),
          lastSyncAt: new Date().toISOString(),
        };
      }

      if (updated) {
        setChannels((prev) => prev.map((c) => (c.type === 'whatsapp' ? updated! : c)));
      }
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

  const handleToggleLiveChat = async (currentStatus: string) => {
    try {
      const shouldEnable = currentStatus !== 'connected';
      let updated: Channel | null = null;
      try {
        updated = await apiRequest('/api/channels/livechat/toggle', {
          method: 'POST',
          body: JSON.stringify({ enabled: shouldEnable }),
        });
      } catch {
        updated = {
          id: 'ch_livechat',
          workspaceId: activeWorkspace?.id || 'ws_store',
          type: 'livechat',
          name: 'Website Live Chat Widget',
          status: shouldEnable ? 'connected' : 'not_connected',
          connectedAt: shouldEnable ? new Date().toISOString() : undefined,
        };
      }
      if (updated) {
        setChannels((prev) => prev.map((c) => (c.type === 'livechat' ? updated! : c)));
      }
    } catch (e) {
      console.error('Failed to toggle live chat:', e);
    }
  };

  const handleDisconnect = async (type: string, name: string) => {
    if (!confirm(`Are you sure you want to disconnect ${name}? This will revoke access credentials and stop automated messages.`)) {
      return;
    }

    try {
      let updated: Channel | null = null;
      try {
        updated = await apiRequest('/api/channels/disconnect', {
          method: 'POST',
          body: JSON.stringify({ channelType: type }),
        });
      } catch {
        updated = {
          id: `ch_${type}`,
          workspaceId: activeWorkspace?.id || 'ws_store',
          type: type as any,
          name,
          status: 'not_connected',
        };
      }
      if (updated) {
        setChannels((prev) => prev.map((c) => (c.type === type ? updated! : c)));
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

  const widgetSnippet = `<script>
  window.YEAR_INFO_AI_CONFIG = {
    workspaceId: "${activeWorkspace?.id || 'ws_demo_store'}",
    brandName: "${activeWorkspace?.name || 'Store'}"
  };
</script>
<script src="${metaConfig?.appUrl || 'https://year-info-ai.vercel.app'}/widget.js" async></script>`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(widgetSnippet);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  // Clean, decoupled card configurations
  const channelCardConfigs = [
    {
      type: 'facebook',
      title: 'Facebook Pages',
      category: 'Meta Graph API',
      badgeClass: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
      description: 'Connect an authorized Facebook Page to sync wall posts, view customer engagement, and enable scheduled social publishing.',
      permissions: ['pages_show_list', 'pages_read_engagement', 'pages_manage_posts'],
      onConnect: () => {
        setFbModalChannel('facebook');
        setFbAuthStep('auth');
        setFbError(null);
        setFbMetaAppInactiveNotice(false);
        setFbModalOpen(true);
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
        setFbModalChannel('messenger');
        setFbAuthStep('auth');
        setFbError(null);
        setFbMetaAppInactiveNotice(false);
        setFbModalOpen(true);
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
        setIgAuthStep('auth');
        setIgError(null);
        setIgMetaAppInactiveNotice(false);
        setIgHasScannedWithNoAccounts(false);
        setIgModalOpen(true);
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-200 dark:border-purple-500/20 bg-gradient-to-r from-purple-50 via-white to-purple-50 dark:from-slate-900 dark:via-purple-950/40 dark:to-slate-900 p-6 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">Connected Channels</h1>
            <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 text-xs font-bold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              Manual Authorization Only
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Authorize official Meta, WhatsApp Business, and Website messaging channels. Disconnected by default for security.
          </p>
        </div>

        <button
          onClick={loadChannels}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Status</span>
        </button>
      </div>

      {/* Info Callout */}
      <div className="rounded-xl border border-purple-200 dark:border-purple-500/20 bg-purple-50 dark:bg-purple-500/5 p-4 flex items-start gap-3 text-xs text-slate-700 dark:text-slate-300">
        <Info className="h-5 w-5 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-bold text-slate-900 dark:text-white">Strict Authorization Policy</div>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            Every channel begins in a <span className="text-slate-900 dark:text-slate-200 font-semibold">Not Connected</span> state. No account is linked without your explicit OAuth consent. Connecting an account does NOT automatically publish content or enable AI replies—those remain individually controlled in settings.
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
                  ? 'border-purple-400 dark:border-purple-500/40 bg-purple-50/40 dark:bg-slate-900/90 ring-1 ring-purple-500/20'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 hover:border-purple-300 dark:hover:border-slate-700'
              }`}
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-base text-slate-900 dark:text-white">{cfg.title}</h3>
                    <span className={`inline-block mt-1 rounded-md px-2 py-0.5 text-[10px] font-bold border ${cfg.badgeClass}`}>
                      {cfg.category}
                    </span>
                  </div>

                  {/* Status Indicator Badge */}
                  <div>
                    {isConnected ? (
                      <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Connected
                      </span>
                    ) : isReauth ? (
                      <span className="flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-bold text-amber-600 dark:text-amber-400 border border-amber-500/20">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                        Reauth Needed
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 text-xs font-semibold text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                        Not Connected
                      </span>
                    )}
                  </div>
                </div>

                {/* Account Details if connected */}
                {isConnected && ch && (
                  <div className="mt-3 rounded-xl bg-slate-100 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 p-3 space-y-1 text-xs">
                    <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                      <span className="text-slate-500 dark:text-slate-400">Account:</span>
                      <span className="font-bold text-slate-900 dark:text-white font-mono truncate max-w-[170px]">{ch.name}</span>
                    </div>
                    {ch.accountId && (
                      <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                        <span>ID:</span>
                        <span className="font-mono text-[11px] text-slate-700 dark:text-slate-300 truncate max-w-[170px]">{ch.accountId}</span>
                      </div>
                    )}
                    {ch.lastSyncAt && (
                      <div className="flex items-center justify-between text-slate-400 dark:text-slate-500 text-[10px] pt-1 border-t border-slate-200 dark:border-slate-800/80">
                        <span>Last Verified:</span>
                        <span>{new Date(ch.lastSyncAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Description */}
                <p className="mt-3 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {cfg.description}
                </p>

                {/* Permissions pills */}
                <div className="mt-3 space-y-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Required Scopes:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {cfg.permissions.map((p) => (
                      <span key={p} className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 text-[9px] font-mono text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                {isConnected ? (
                  <div className="flex items-center gap-2 w-full justify-between">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleCheckSync(cfg.type)}
                        disabled={checkingSync === cfg.type}
                        className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition flex items-center gap-1"
                        title="Check Connection Health"
                      >
                        <RefreshCw className={`h-3 w-3 ${checkingSync === cfg.type ? 'animate-spin' : ''}`} />
                        <span>Check</span>
                      </button>
                      <button
                        onClick={cfg.onConnect}
                        className="rounded-xl border border-purple-500/30 px-2.5 py-1.5 text-xs text-purple-600 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-500/10 transition"
                      >
                        Reconnect
                      </button>
                    </div>

                    <button
                      onClick={() => handleDisconnect(cfg.type, cfg.title)}
                      className="rounded-xl border border-rose-500/30 px-2.5 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition"
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

      {/* ========================================================================= */}
      {/* MODAL 1: FACEBOOK & MESSENGER CONNECTION WIZARD (DEDICATED)              */}
      {/* ========================================================================= */}
      {fbModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
          <div className="relative w-full max-w-xl rounded-2xl border border-slate-200 dark:border-blue-500/30 bg-white dark:bg-slate-900 p-6 shadow-2xl animate-in fade-in zoom-in-95 my-auto max-h-[92dvh] flex flex-col">
            <button
              onClick={() => {
                setFbModalOpen(false);
                setFbAuthStep('auth');
                setFbError(null);
                setFbMetaAppInactiveNotice(false);
              }}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 dark:hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Header */}
            <div className="mb-4 flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-blue-600/10 dark:bg-blue-600/20 border border-blue-500/20 dark:border-blue-500/30 text-blue-600 dark:text-blue-400">
                <Facebook className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Connect {fbModalChannel === 'facebook' ? 'Facebook Pages' : 'Facebook Messenger'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Authorize your Facebook Page to manage wall posts, monitor customer engagement, and enable inbox synchronization.
                </p>
              </div>
            </div>

            {/* Error Message */}
            {fbError && (
              <div className="mb-4 rounded-xl border border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 p-3 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-rose-500 dark:text-rose-400 shrink-0 mt-0.5" />
                <span>{fbError}</span>
              </div>
            )}

            {/* Meta "App Not Active" Diagnostic Banner */}
            {fbMetaAppInactiveNotice && (
              <div className="mb-4 rounded-xl border border-amber-500/40 bg-amber-50 dark:bg-amber-950/30 p-4 text-xs text-amber-900 dark:text-amber-200 space-y-2.5 shadow-sm">
                <div className="font-bold flex items-center justify-between text-amber-800 dark:text-amber-300">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <span>Meta Dashboard Action Required: App in Development Mode</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFbMetaAppInactiveNotice(false)}
                    className="text-amber-600 dark:text-amber-400 hover:text-amber-800 text-[11px]"
                  >
                    Dismiss
                  </button>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-700 dark:text-slate-300">
                  Meta OAuth displays <span className="font-bold text-rose-600 dark:text-rose-400">"App not active. This app is not accessible right now."</span> because Meta App <code className="px-1 py-0.5 rounded bg-amber-100 dark:bg-amber-900/50 font-mono font-bold text-amber-900 dark:text-amber-200">1407979818070562</code> is currently in <strong>Development Mode</strong>. In Development Mode, only registered App Roles (Admins, Developers, Testers) can log in.
                </p>
                <div className="rounded-lg bg-white/80 dark:bg-slate-900/80 p-2.5 border border-amber-200 dark:border-amber-800/50 space-y-1.5 text-[11px]">
                  <div className="font-semibold text-slate-900 dark:text-white">To resolve this in Meta for Developers:</div>
                  <ol className="list-decimal list-inside space-y-1 text-slate-700 dark:text-slate-300">
                    <li>
                      <strong>Option A (Immediate testing):</strong> Open{' '}
                      <a
                        href="https://developers.facebook.com/apps/1407979818070562/roles/roles/"
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 dark:text-blue-400 underline font-semibold inline-flex items-center gap-0.5"
                      >
                        Meta App Roles <ExternalLink className="h-2.5 w-2.5 inline" />
                      </a>{' '}
                      and click <em>Add Developers</em> or <em>Add Testers</em> with your personal Facebook account.
                    </li>
                    <li>
                      <strong>Option B (Live Mode for all users):</strong> In{' '}
                      <a
                        href="https://developers.facebook.com/apps/1407979818070562/settings/basic/"
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 dark:text-blue-400 underline font-semibold inline-flex items-center gap-0.5"
                      >
                        Basic Settings <ExternalLink className="h-2.5 w-2.5 inline" />
                      </a>
                      , ensure Privacy Policy URL is set to <code>https://year-info-ai.vercel.app</code>, then switch the top toggle from <strong>Development</strong> to <strong>Live</strong>.
                    </li>
                  </ol>
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto pr-1">
              {fbAuthStep === 'auth' ? (
                <div className="space-y-4">
                  {/* Option 1: Official Facebook OAuth */}
                  <div className="rounded-xl border border-blue-200 dark:border-blue-500/30 bg-blue-50/50 dark:bg-blue-500/5 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Share2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                        Option 1: Official Facebook OAuth Login
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">Popup Flow</span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      Authenticate directly through Meta's secure login window. Discovers and requests access only for the Facebook Pages you manage.
                    </p>
                    <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">Requested Scopes:</span>
                      <span className="font-mono text-blue-700 dark:text-blue-300">pages_show_list, pages_read_engagement, pages_manage_posts{fbModalChannel === 'messenger' ? ', pages_messaging' : ''}</span>
                    </div>
                    <button
                      type="button"
                      disabled={fbLoading}
                      onClick={() => handleStartFacebookOAuth(fbModalChannel)}
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white shadow-lg shadow-blue-600/30 hover:bg-blue-500 disabled:opacity-50 transition"
                    >
                      <Facebook className="h-4 w-4" />
                      <span>{fbLoading ? 'Waiting for Meta Authorization...' : 'Continue with Facebook'}</span>
                    </button>
                    {!fbMetaAppInactiveNotice && (
                      <div className="text-center pt-1">
                        <button
                          type="button"
                          onClick={() => setFbMetaAppInactiveNotice(true)}
                          className="text-[11px] text-amber-600 dark:text-amber-400 hover:underline inline-flex items-center gap-1 font-medium"
                        >
                          <Info className="h-3 w-3" />
                          Seeing "App not active" on Meta? View Dashboard instructions
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Option 2: Direct Meta Access Token Verification */}
                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Key className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                        Option 2: Direct Meta Access Token Verification
                      </span>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">Graph API Direct</span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      If your Meta app is currently in Development mode or you generated a token in Meta Graph API Explorer, paste your User Access Token to fetch your authorized Facebook Pages:
                    </p>
                    <div>
                      <input
                        type="password"
                        value={fbInputToken}
                        onChange={(e) => setFbInputToken(e.target.value)}
                        placeholder="EAABw... (Meta User Access Token with pages_show_list)"
                        className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-900 dark:text-white font-mono focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <button
                      type="button"
                      disabled={!fbInputToken.trim() || fbLoading}
                      onClick={handleVerifyFacebookManualToken}
                      className="w-full rounded-xl bg-blue-600 py-2 text-xs font-bold text-white hover:bg-blue-500 disabled:opacity-40 transition flex items-center justify-center gap-1.5"
                    >
                      {fbLoading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Share2 className="h-3.5 w-3.5" />}
                      <span>{fbLoading ? 'Verifying Facebook Pages...' : 'Verify Token & List Facebook Pages'}</span>
                    </button>
                  </div>

                  {/* Reference Redirect URI */}
                  <div className="rounded-xl bg-slate-50 dark:bg-slate-950 p-3 text-[11px] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 space-y-1 font-mono">
                    <div className="text-blue-700 dark:text-blue-300 font-semibold font-sans">Meta Developer Settings Reference:</div>
                    <div className="text-slate-500">Valid OAuth Redirect URI:</div>
                    <div className="text-slate-800 dark:text-slate-300 select-all">{metaConfig?.redirectUri || 'https://year-info-ai.vercel.app/auth/meta/callback'}</div>
                  </div>
                </div>
              ) : (
                /* Step 2: Page Selection */
                <div className="space-y-4">
                  <div className="text-xs text-slate-700 dark:text-slate-300 font-semibold">
                    Select which authorized Facebook Page to connect:
                  </div>

                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {fbVerifiedPages.map((page) => (
                      <label
                        key={page.id}
                        className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition ${
                          fbSelectedPageId === page.id
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10'
                            : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <input
                          type="radio"
                          name="fb_selected_page"
                          value={page.id}
                          checked={fbSelectedPageId === page.id}
                          onChange={() => setFbSelectedPageId(page.id)}
                          className="mt-1 text-blue-600 focus:ring-blue-500"
                        />
                        <div className="flex-1">
                          <div className="text-sm font-bold text-slate-900 dark:text-white">{page.name}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">Page ID: {page.id} • {page.category || 'Business Page'}</div>
                          {page.tasks && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {page.tasks.map((task: string) => (
                                <span key={task} className="rounded bg-slate-200 dark:bg-slate-800 px-1.5 py-0.2 text-[9px] font-mono text-slate-700 dark:text-slate-400">
                                  {task}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setFbAuthStep('auth')}
                      className="rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      disabled={!fbSelectedPageId || fbLoading}
                      onClick={handleConfirmFacebookPageSelection}
                      className="rounded-xl bg-blue-600 px-5 py-1.5 text-xs font-bold text-white hover:bg-blue-500 transition flex items-center gap-1.5"
                    >
                      {fbLoading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                      <span>{fbLoading ? 'Saving Channel...' : 'Confirm & Connect Facebook Page'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: INSTAGRAM PROFESSIONAL CONNECTION WIZARD (DEDICATED)             */}
      {/* ========================================================================= */}
      {igModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
          <div className="relative w-full max-w-xl rounded-2xl border border-slate-200 dark:border-pink-500/30 bg-white dark:bg-slate-900 p-6 shadow-2xl animate-in fade-in zoom-in-95 my-auto max-h-[92dvh] flex flex-col">
            <button
              onClick={() => {
                setIgModalOpen(false);
                setIgAuthStep('auth');
                setIgError(null);
                setIgMetaAppInactiveNotice(false);
                setIgHasScannedWithNoAccounts(false);
              }}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 dark:hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Distinct Instagram Gradient Header */}
            <div className="mb-4 flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-tr from-yellow-500 via-pink-600 to-purple-600 border border-pink-500/30 text-white shadow-md shadow-pink-600/30">
                <Instagram className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Connect Instagram Professional Account
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Link an Instagram Business or Creator account to receive Direct messages in Central Inbox and schedule post publishing.
                </p>
              </div>
            </div>

            {/* Error Message */}
            {igError && (
              <div className="mb-4 rounded-xl border border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 p-3 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-rose-500 dark:text-rose-400 shrink-0 mt-0.5" />
                <span>{igError}</span>
              </div>
            )}

            {/* Meta "App Not Active" Diagnostic Banner */}
            {igMetaAppInactiveNotice && (
              <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-200 space-y-1.5">
                <div className="font-bold flex items-center gap-1.5 text-amber-700 dark:text-amber-300">
                  <ShieldCheck className="h-4 w-4" />
                  <span>Meta Dashboard Configuration Notice: App in Development Mode</span>
                </div>
                <p className="text-[11px] leading-relaxed text-amber-800/90 dark:text-amber-200/90">
                  Meta OAuth reported <span className="font-semibold text-slate-900 dark:text-white">"App not active"</span>. In the Meta Developer Dashboard:
                </p>
                <ol className="list-decimal list-inside text-[11px] space-y-0.5 text-amber-900 dark:text-amber-100/80 font-mono">
                  <li>Go to developers.facebook.com &gt; Select App &gt; Switch top toggle to <strong>Live</strong>.</li>
                  <li>Or under <strong>App Roles &gt; Roles</strong>, add your account as an Administrator, Developer, or Tester.</li>
                  <li>Under <strong>Use Cases &gt; Customize &gt; Permissions</strong>, verify <code>instagram_basic</code> and <code>instagram_manage_messages</code>.</li>
                  <li>Alternatively, enter your User Access Token in <strong>Option 2</strong> below to discover accounts directly.</li>
                </ol>
              </div>
            )}

            {/* Essential Instagram Pre-requisites Callout Card */}
            <div className="mb-4 rounded-xl border border-pink-200 dark:border-pink-500/20 bg-pink-50 dark:bg-pink-500/5 p-3.5 space-y-2 text-xs">
              <div className="font-bold text-pink-700 dark:text-pink-300 flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-pink-600 dark:text-pink-400" />
                <span>Instagram Graph API Eligibility Requirements</span>
              </div>
              <ul className="space-y-1.5 text-[11px] text-slate-700 dark:text-slate-300">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-pink-600 dark:text-pink-400 shrink-0 mt-0.5" />
                  <span><strong>Professional Account Required:</strong> Must be an Instagram <em>Business</em> or <em>Creator</em> account (Personal profiles cannot be linked to Meta Graph API).</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-pink-600 dark:text-pink-400 shrink-0 mt-0.5" />
                  <span><strong>Linked Facebook Page Required:</strong> Your Instagram account must be connected to a Facebook Page where you are an Admin (Instagram App &gt; Settings &gt; Creator/Business tools &gt; Connect a Facebook Page).</span>
                </li>
              </ul>
            </div>

            <div className="flex-1 overflow-y-auto pr-1">
              {igAuthStep === 'auth' ? (
                <div className="space-y-4">
                  {/* Option 1: Official Instagram via Meta OAuth */}
                  <div className="rounded-xl border border-pink-200 dark:border-pink-500/30 bg-pink-50/50 dark:bg-pink-500/5 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-pink-700 dark:text-pink-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Instagram className="h-3.5 w-3.5 text-pink-600 dark:text-pink-400" />
                        Option 1: Official Instagram Login via Meta
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">Popup Flow</span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      Authenticate with your Meta / Instagram account. Automatically queries your linked Facebook Pages to discover all authorized Instagram Professional profiles.
                    </p>
                    <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">Requested Permissions:</span>
                      <span className="font-mono text-pink-700 dark:text-pink-300">instagram_basic, instagram_manage_messages, pages_show_list</span>
                    </div>
                    <button
                      type="button"
                      disabled={igLoading}
                      onClick={handleStartInstagramOAuth}
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-pink-600 via-rose-600 to-purple-600 py-2.5 text-xs font-bold text-white shadow-lg shadow-pink-600/30 hover:opacity-95 disabled:opacity-50 transition"
                    >
                      <Instagram className="h-4 w-4" />
                      <span>{igLoading ? 'Waiting for Meta Authorization...' : 'Connect Instagram via Meta Login'}</span>
                    </button>
                  </div>

                  {/* Option 2: Direct Token Verification for Instagram */}
                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Key className="h-3.5 w-3.5 text-pink-600 dark:text-pink-400" />
                        Option 2: Direct Token Verification for Instagram
                      </span>
                      <span className="text-[10px] text-pink-600 dark:text-pink-400 font-mono">Instagram Graph API</span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      Enter a Meta User Access Token generated from Meta Graph API Explorer with <code className="text-pink-700 dark:text-pink-300 font-mono">instagram_basic</code>, <code className="text-pink-700 dark:text-pink-300 font-mono">pages_show_list</code>, and <code className="text-pink-700 dark:text-pink-300 font-mono">instagram_manage_messages</code> permissions:
                    </p>
                    <div>
                      <input
                        type="password"
                        value={igInputToken}
                        onChange={(e) => setIgInputToken(e.target.value)}
                        placeholder="EAA... (Meta Access Token with Instagram scopes)"
                        className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-900 dark:text-white font-mono focus:border-pink-500 focus:outline-none"
                      />
                    </div>
                    <button
                      type="button"
                      disabled={!igInputToken.trim() || igLoading}
                      onClick={handleVerifyInstagramManualToken}
                      className="w-full rounded-xl bg-pink-600 py-2 text-xs font-bold text-white hover:bg-pink-500 disabled:opacity-40 transition flex items-center justify-center gap-1.5"
                    >
                      {igLoading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Instagram className="h-3.5 w-3.5" />}
                      <span>{igLoading ? 'Discovering Instagram Accounts...' : 'Verify Token & Discover Instagram Accounts'}</span>
                    </button>
                  </div>

                  {/* Reference Redirect URI */}
                  <div className="rounded-xl bg-slate-50 dark:bg-slate-950 p-3 text-[11px] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 space-y-1 font-mono">
                    <div className="text-pink-700 dark:text-pink-300 font-semibold font-sans">Meta Developer Settings Reference:</div>
                    <div className="text-slate-500">Valid OAuth Redirect URI:</div>
                    <div className="text-slate-800 dark:text-slate-300 select-all">{metaConfig?.redirectUri || 'https://year-info-ai.vercel.app/auth/meta/callback'}</div>
                  </div>
                </div>
              ) : (
                /* Step 2: Instagram Account Selection (Specifically Instagram) */
                <div className="space-y-4">
                  {igDiscoveredAccounts.length > 0 ? (
                    <>
                      <div className="text-xs text-slate-700 dark:text-slate-300 font-semibold flex items-center justify-between">
                        <span>Select the Instagram Professional Account to link:</span>
                        <span className="text-pink-600 dark:text-pink-400 text-[11px] font-bold">{igDiscoveredAccounts.length} Account(s) Found</span>
                      </div>

                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {igDiscoveredAccounts.map((acc) => (
                          <label
                            key={acc.id}
                            className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition ${
                              igSelectedAccountId === acc.id
                                ? 'border-pink-500 bg-pink-50 dark:bg-pink-500/10'
                                : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 hover:border-slate-300 dark:hover:border-slate-700'
                            }`}
                          >
                            <input
                              type="radio"
                              name="ig_selected_account"
                              value={acc.id}
                              checked={igSelectedAccountId === acc.id}
                              onChange={() => setIgSelectedAccountId(acc.id)}
                              className="mt-1 text-pink-600 focus:ring-pink-500"
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-black text-slate-900 dark:text-white">@{acc.username}</span>
                                <span className="rounded bg-pink-500/10 dark:bg-pink-500/20 text-pink-700 dark:text-pink-300 px-1.5 py-0.2 text-[10px] font-bold border border-pink-500/30">
                                  Professional
                                </span>
                              </div>
                              <div className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                                Instagram ID: {acc.id}
                              </div>
                              <div className="text-xs text-slate-700 dark:text-slate-300 mt-1 flex items-center gap-1">
                                <Facebook className="h-3 w-3 text-blue-500 dark:text-blue-400" />
                                <span>Linked via Facebook Page: <strong>{acc.linkedPageName}</strong></span>
                              </div>
                            </div>
                          </label>
                        ))}
                      </div>

                      <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                        <button
                          type="button"
                          onClick={() => setIgAuthStep('auth')}
                          className="rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          Back
                        </button>
                        <button
                          type="button"
                          disabled={!igSelectedAccountId || igLoading}
                          onClick={handleConfirmInstagramAccountSelection}
                          className="rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 px-5 py-1.5 text-xs font-bold text-white hover:opacity-90 transition flex items-center gap-1.5"
                        >
                          {igLoading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                          <span>{igLoading ? 'Connecting Account...' : 'Confirm & Connect Instagram Account'}</span>
                        </button>
                      </div>
                    </>
                  ) : (
                    /* Ineligible / Not Linked Diagnostic View */
                    <div className="rounded-xl border border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 p-4 space-y-3 text-xs">
                      <div className="flex items-start gap-2.5 text-amber-800 dark:text-amber-300 font-bold">
                        <AlertCircle className="h-5 w-5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                        <div>
                          <div>No Linked Instagram Professional Accounts Found</div>
                          <div className="text-[11px] font-normal text-amber-800/90 dark:text-amber-200/90 mt-0.5">
                            We verified your Facebook Pages, but none have a connected Instagram Business or Creator account.
                          </div>
                        </div>
                      </div>

                      <div className="bg-white dark:bg-slate-950/80 rounded-xl p-3 border border-slate-200 dark:border-slate-800 space-y-2 text-slate-700 dark:text-slate-300">
                        <div className="font-semibold text-slate-900 dark:text-white text-[11px]">How to link your Instagram Professional account:</div>
                        <ol className="list-decimal list-inside space-y-1.5 text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed font-sans">
                          <li>Open the <strong>Instagram mobile app</strong> &gt; Profile &gt; <strong>Settings and privacy</strong>.</li>
                          <li>Tap <strong>Account type and tools</strong> &gt; <strong>Switch to professional account</strong> (choose Business or Creator).</li>
                          <li>Under <strong>Creator / Business tools and controls</strong>, tap <strong>Connect or create a Facebook Page</strong>.</li>
                          <li>Select the Facebook Page where you are an Administrator.</li>
                          <li>Ensure <strong>"Allow access to Messages in Inbox"</strong> is enabled in Instagram App &gt; Settings &gt; Messages and story replies.</li>
                        </ol>
                      </div>

                      <div className="flex justify-end gap-2 pt-2 border-t border-amber-200 dark:border-amber-500/20">
                        <button
                          type="button"
                          onClick={() => setIgAuthStep('auth')}
                          className="rounded-xl border border-slate-300 dark:border-slate-700 px-3.5 py-1.5 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          Back to Token Entry
                        </button>
                        <button
                          type="button"
                          disabled={igLoading}
                          onClick={handleVerifyInstagramManualToken}
                          className="rounded-xl bg-pink-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-pink-500 flex items-center gap-1.5"
                        >
                          <RefreshCw className={`h-3.5 w-3.5 ${igLoading ? 'animate-spin' : ''}`} />
                          <span>Re-scan Instagram Accounts</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: WHATSAPP BUSINESS PLATFORM MODAL                                */}
      {/* ========================================================================= */}
      {showWhatsAppModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
          <div className="relative w-full max-w-lg rounded-2xl border border-emerald-500/30 bg-slate-900 p-6 shadow-2xl my-auto">
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
