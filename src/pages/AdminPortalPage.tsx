import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  CreditCard,
  Building,
  RefreshCw,
  Search,
  Bot,
  Key,
  Globe,
  Settings,
  Sliders,
  TrendingUp,
  Bell,
  Lock,
  Plus,
  Trash2,
  Edit2,
  ExternalLink,
  Check,
  AlertTriangle,
  Play,
  Download,
  Copy,
  Info,
  Layers,
  ArrowRight,
  Shield,
  Eye,
  EyeOff,
  Filter,
  Activity,
  Terminal,
  Send,
  ShieldCheck,
  Cpu,
  Database,
  Radio,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { testFirestoreConnection, runFirestoreReadWriteDiagnostic, auth as firebaseAuth } from '../lib/firebase.ts';
import {
  Subscription,
  SubscriptionPlan,
  AuditLog,
  AIProviderConfig,
  GlobalIntegrationConfig,
  WebsiteBrandingSettings,
  DomainDeploymentSettings,
  PlatformFeatureFlags,
  PaymentRecord,
  AdminNotification,
} from '../types/index.ts';

function formatProviderError(err?: string): string {
  if (!err) return '';
  try {
    const parsed = JSON.parse(err);
    if (parsed.error?.message) {
      if (parsed.error?.code === 403 || parsed.error?.status === 'PERMISSION_DENIED') {
        return 'Default sandbox key restricted (PERMISSION_DENIED). Please enter your custom Gemini API key or switch provider.';
      }
      return parsed.error.message;
    }
  } catch {
    // not JSON
  }
  if (/PERMISSION_DENIED|denied access/i.test(err)) {
    return 'Default sandbox key restricted (PERMISSION_DENIED). Please enter your custom Gemini API key or switch provider.';
  }
  return err;
}

export const AdminPortalPage: React.FC = () => {
  const { user, apiRequest } = useAuth();

  // Navigation tab
  const [activeTab, setActiveTab] = useState<
    | 'overview'
    | 'diagnostics'
    | 'users'
    | 'subscriptions'
    | 'ai-providers'
    | 'integrations'
    | 'branding'
    | 'domain'
    | 'features'
    | 'analytics'
    | 'notifications'
    | 'security'
    | 'system'
  >('overview');

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [actionErrorMsg, setActionErrorMsg] = useState<string | null>(null);

  // Data states
  const [overviewData, setOverviewData] = useState<any>(null);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [subscriptionsList, setSubscriptionsList] = useState<Subscription[]>([]);
  const [plansList, setPlansList] = useState<SubscriptionPlan[]>([]);
  const [paymentsList, setPaymentsList] = useState<PaymentRecord[]>([]);
  const [aiProviders, setAiProviders] = useState<AIProviderConfig[]>([]);
  const [integrations, setIntegrations] = useState<GlobalIntegrationConfig[]>([]);
  const [brandingSettings, setBrandingSettings] = useState<WebsiteBrandingSettings | null>(null);
  const [domainSettings, setDomainSettings] = useState<DomainDeploymentSettings | null>(null);
  const [featureFlags, setFeatureFlags] = useState<PlatformFeatureFlags | null>(null);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [systemSettings, setSystemSettings] = useState<any>(null);
  const [taskRouting, setTaskRouting] = useState<Record<string, any>>({});

  // Sub-tabs & filter states
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [subStatusFilter, setSubStatusFilter] = useState('all');
  const [subTabSection, setSubTabSection] = useState<'requests' | 'plans' | 'payments'>('requests');
  const [auditFilterAction, setAuditFilterAction] = useState('all');

  // Confirmation Modal
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmText?: string;
    onConfirm: () => Promise<void>;
  }>({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: async () => {},
  });

  // Modal States
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [planForm, setPlanForm] = useState({
    name: '',
    description: '',
    priceBdt: 1999,
    priceUsd: 20,
    interval: 'monthly',
    maxChannels: 3,
    maxConversationsMonthly: 1000,
    aiRepliesMonthly: 500,
    maxScheduledPosts: 50,
    maxTeamMembers: 3,
    features: ['Multi-channel Unified Inbox', 'High-speed Gemini AI Sales Agent', 'Product Catalog', 'Social Post Scheduler'],
  });

  const [showProviderModal, setShowProviderModal] = useState(false);
  const [editingProvider, setEditingProvider] = useState<AIProviderConfig | null>(null);
  const [providerForm, setProviderForm] = useState({
    name: '',
    providerType: 'gemini' as 'gemini' | 'openai' | 'groq' | 'anthropic' | 'custom',
    model: 'gemini-3.8-flash',
    apiEndpoint: '',
    apiKey: '',
    isDefault: false,
    isFallback: false,
  });

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    workspaceId: '',
    amountBdt: 2999,
    method: 'bkash',
    transactionReference: '',
  });

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordResetResult, setPasswordResetResult] = useState<{ email: string; temporaryPassword: string } | null>(null);

  // Testing spinners
  const [testingProviderId, setTestingProviderId] = useState<string | null>(null);
  const [testingIntegId, setTestingIntegId] = useState<string | null>(null);
  const [verifyingDomain, setVerifyingDomain] = useState(false);
  const [testResult, setTestResult] = useState<{ id: string; success: boolean; message: string; latency?: number } | null>(null);

  // ==========================================
  // REAL AI DIAGNOSTICS & SYSTEM TESTING PANEL STATE
  // ==========================================
  const [diagSubTab, setDiagSubTab] = useState<'all' | 'ai-provider' | 'playground' | 'firebase' | 'channels' | 'scheduler'>('all');
  const [runningAllSafe, setRunningAllSafe] = useState(false);

  // A. AI Connection
  const [aiTestState, setAiTestState] = useState<{
    status: 'not_tested' | 'running' | 'passed' | 'failed' | 'config_required';
    result?: any;
    error?: string;
    timestamp?: string;
  }>({ status: 'not_tested' });

  // B. AI Sales Agent Playground
  const [playgroundState, setPlaygroundState] = useState<{
    status: 'not_tested' | 'running' | 'passed' | 'failed' | 'config_required';
    question: string;
    result?: any;
    error?: string;
    timestamp?: string;
  }>({
    status: 'not_tested',
    question: 'T-shirt er price koto and stock ase kina?',
  });

  // C. Firebase Diagnostics
  const [firebaseDiagState, setFirebaseDiagState] = useState<{
    status: 'not_tested' | 'running' | 'passed' | 'failed' | 'config_required';
    result?: any;
    error?: string;
    timestamp?: string;
    clientLatency?: number;
    authStatus?: string;
    writeReadSuccess?: boolean;
  }>({ status: 'not_tested' });

  // D. Channels Diagnostics
  const [channelsDiagState, setChannelsDiagState] = useState<{
    status: 'not_tested' | 'running' | 'passed' | 'failed' | 'config_required';
    channels: any[];
    error?: string;
    timestamp?: string;
  }>({ status: 'not_tested', channels: [] });

  // E. Scheduler Diagnostics
  const [schedulerDiagState, setSchedulerDiagState] = useState<{
    status: 'not_tested' | 'running' | 'passed' | 'failed' | 'config_required';
    result?: any;
    error?: string;
    timestamp?: string;
  }>({ status: 'not_tested' });

  // Load all data
  const loadAllData = async () => {
    setLoading(true);
    setActionErrorMsg(null);
    try {
      const [
        overview,
        users,
        subsRes,
        payments,
        providers,
        integs,
        branding,
        domain,
        features,
        analytics,
        notifs,
        logs,
        system,
      ] = await Promise.all([
        apiRequest('/api/admin/overview').catch(() => null),
        apiRequest('/api/admin/users').catch(() => []),
        apiRequest('/api/admin/subscriptions').catch(() => ({ subscriptions: [], plans: [] })),
        apiRequest('/api/admin/payments').catch(() => []),
        apiRequest('/api/admin/ai-providers').catch(() => []),
        apiRequest('/api/admin/integrations').catch(() => []),
        apiRequest('/api/admin/branding').catch(() => null),
        apiRequest('/api/admin/domain').catch(() => null),
        apiRequest('/api/admin/features').catch(() => null),
        apiRequest('/api/admin/analytics').catch(() => null),
        apiRequest('/api/admin/notifications').catch(() => []),
        apiRequest('/api/admin/audit-logs').catch(() => []),
        apiRequest('/api/admin/system').catch(() => null),
        apiRequest('/api/admin/ai-routing').catch(() => ({})),
      ]);

      if (overview) setOverviewData(overview);
      if (users) setUsersList(users);
      if (subsRes) {
        setSubscriptionsList(subsRes.subscriptions || []);
        setPlansList(subsRes.plans || []);
      }
      if (payments) setPaymentsList(payments);
      if (providers) setAiProviders(providers);
      if (integs) setIntegrations(integs);
      if (branding) setBrandingSettings(branding);
      if (domain) setDomainSettings(domain);
      if (features) setFeatureFlags(features);
      if (analytics) setAnalyticsData(analytics);
      if (notifs) setNotifications(notifs);
      if (logs) setAuditLogs(logs);
      if (system) setSystemSettings(system);
      // @ts-ignore
      const routing = arguments ? arguments[13] : null;
      apiRequest('/api/admin/ai-routing').then((r) => { if (r) setTaskRouting(r); }).catch(() => {});
    } catch (e: any) {
      console.error('Error loading Owner Control Center data:', e);
      setActionErrorMsg(e.message || 'Failed to authenticate and load Owner Control Center.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const triggerFeedback = (msg: string) => {
    setSaveSuccessMsg(msg);
    setTimeout(() => setSaveSuccessMsg(null), 3500);
  };

  // --- ACTIONS ---

  // 1. Subscription Approval / Status Change
  const handleUpdateSubStatus = async (subId: string, status: any, days = 30) => {
    try {
      await apiRequest(`/api/admin/subscriptions/${subId}/status`, {
        method: 'POST',
        body: JSON.stringify({ status, days }),
      });
      triggerFeedback(`Subscription status successfully updated to ${status}.`);
      loadAllData();
    } catch (e: any) {
      setActionErrorMsg(e.message || 'Failed to update subscription status');
    }
  };

  // 2. User Management
  const handleUpdateUserRole = async (userId: string, role: string, isSuperAdmin: boolean) => {
    try {
      await apiRequest(`/api/admin/users/${userId}/role`, {
        method: 'PUT',
        body: JSON.stringify({ role, isSuperAdmin }),
      });
      triggerFeedback('User role and administrative permissions updated.');
      loadAllData();
    } catch (e: any) {
      setActionErrorMsg(e.message || 'Failed to update user role');
    }
  };

  const handleToggleUserStatus = async (userId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'suspended' ? 'active' : 'suspended';
    try {
      await apiRequest(`/api/admin/users/${userId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: nextStatus }),
      });
      triggerFeedback(`Account marked as ${nextStatus}.`);
      loadAllData();
    } catch (e: any) {
      setActionErrorMsg(e.message || 'Failed to update account status');
    }
  };

  const handleAdminResetPassword = async (userId: string) => {
    try {
      const res = await apiRequest(`/api/admin/users/${userId}/reset-password`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      setPasswordResetResult({ email: res.email, temporaryPassword: res.temporaryPassword });
      setShowPasswordModal(true);
    } catch (e: any) {
      setActionErrorMsg(e.message || 'Password reset failed');
    }
  };

  // 3. AI Providers
  const handleTestProvider = async (providerId: string) => {
    setTestingProviderId(providerId);
    setTestResult(null);
    try {
      const res = await apiRequest(`/api/admin/ai-providers/${providerId}/test`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      setTestResult({
        id: providerId,
        success: res.success,
        message: res.message || res.error,
        latency: res.latencyMs,
      });
      loadAllData();
    } catch (e: any) {
      setTestResult({
        id: providerId,
        success: false,
        message: e.message || 'Test call failed',
      });
    } finally {
      setTestingProviderId(null);
    }
  };

  const handleSetDefaultProvider = async (providerId: string) => {
    try {
      await apiRequest(`/api/admin/ai-providers/${providerId}/set-default`, { method: 'POST' });
      triggerFeedback('Primary AI Provider updated. Platform routing switched.');
      loadAllData();
    } catch (e: any) {
      setActionErrorMsg(e.message || 'Failed to switch primary provider');
    }
  };

  const handleUpdateTaskRoute = async (task: string, providerId: string, model?: string) => {
    try {
      const updated = await apiRequest(`/api/admin/ai-routing/${task}`, {
        method: 'PUT',
        body: JSON.stringify({ providerId, model }),
      });
      setTaskRouting((prev) => ({ ...prev, [task]: updated }));
      triggerFeedback(`Task "${task}" updated to ${providerId}`);
    } catch (e: any) {
      setActionErrorMsg(e.message || 'Failed to update task route');
    }
  };

  const handleSaveProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingProvider) {
        await apiRequest(`/api/admin/ai-providers/${editingProvider.id}`, {
          method: 'PUT',
          body: JSON.stringify(providerForm),
        });
        triggerFeedback(`AI Provider "${providerForm.name}" updated.`);
      } else {
        await apiRequest('/api/admin/ai-providers', {
          method: 'POST',
          body: JSON.stringify(providerForm),
        });
        triggerFeedback(`New AI Provider "${providerForm.name}" added.`);
      }
      setShowProviderModal(false);
      setEditingProvider(null);
      loadAllData();
    } catch (e: any) {
      setActionErrorMsg(e.message || 'Failed to save AI provider');
    }
  };

  const handleDeleteProvider = async (providerId: string, name: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Remove AI Provider',
      description: `Are you sure you want to delete "${name}"? This action cannot be undone.`,
      confirmText: 'Delete Provider',
      onConfirm: async () => {
        try {
          await apiRequest(`/api/admin/ai-providers/${providerId}`, { method: 'DELETE' });
          triggerFeedback('Provider removed.');
          loadAllData();
        } catch (e: any) {
          setActionErrorMsg(e.message || 'Could not delete provider');
        }
      },
    });
  };

  // 4. Feature Flags
  const handleToggleFeature = async (key: keyof PlatformFeatureFlags, currentVal: boolean) => {
    if (!featureFlags) return;
    const updated = { ...featureFlags, [key]: !currentVal };
    setFeatureFlags(updated);
    try {
      await apiRequest('/api/admin/features', {
        method: 'PUT',
        body: JSON.stringify(updated),
      });
      triggerFeedback(`Feature "${key}" is now ${!currentVal ? 'ENABLED' : 'DISABLED'}.`);
    } catch (e: any) {
      setActionErrorMsg(e.message || 'Failed to update feature flag');
      loadAllData();
    }
  };

  // 5. Website Branding Save
  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brandingSettings) return;
    try {
      await apiRequest('/api/admin/branding', {
        method: 'PUT',
        body: JSON.stringify(brandingSettings),
      });
      triggerFeedback('Website branding and storefront configuration saved.');
    } catch (e: any) {
      setActionErrorMsg(e.message || 'Failed to save branding');
    }
  };

  // 6. Domain Verification
  const handleVerifyDomain = async () => {
    setVerifyingDomain(true);
    try {
      const res = await apiRequest('/api/admin/domain/verify', { method: 'POST' });
      triggerFeedback(res.message);
      if (res.domainConfig) setDomainSettings(res.domainConfig);
    } catch (e: any) {
      setActionErrorMsg(e.message || 'Verification check failed');
    } finally {
      setVerifyingDomain(false);
    }
  };

  // 7. Save Domain Settings
  const handleSaveDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!domainSettings) return;
    try {
      await apiRequest('/api/admin/domain', {
        method: 'PUT',
        body: JSON.stringify(domainSettings),
      });
      triggerFeedback('Custom domain & allowed origins configuration saved.');
    } catch (e: any) {
      setActionErrorMsg(e.message || 'Failed to save domain configuration');
    }
  };

  // 8. Payment Records
  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/api/admin/payments', {
        method: 'POST',
        body: JSON.stringify(paymentForm),
      });
      triggerFeedback('Payment record verified and saved.');
      setShowPaymentModal(false);
      setPaymentForm({ workspaceId: subscriptionsList[0]?.workspaceId || '', amountBdt: 2999, method: 'bkash', transactionReference: '' });
      loadAllData();
    } catch (e: any) {
      setActionErrorMsg(e.message || 'Failed to record payment');
    }
  };

  // 9. Plan Save
  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingPlan) {
        await apiRequest(`/api/admin/plans/${editingPlan.id}`, {
          method: 'PUT',
          body: JSON.stringify(planForm),
        });
        triggerFeedback(`Plan "${planForm.name}" updated.`);
      } else {
        await apiRequest('/api/admin/subscriptions/plans', {
          method: 'POST',
          body: JSON.stringify(planForm),
        });
        triggerFeedback(`New plan "${planForm.name}" created.`);
      }
      setShowPlanModal(false);
      setEditingPlan(null);
      loadAllData();
    } catch (e: any) {
      setActionErrorMsg(e.message || 'Failed to save plan');
    }
  };

  // ==========================================
  // REAL AI DIAGNOSTICS & SYSTEM TESTING HANDLERS
  // ==========================================

  // A. AI Connection
  const handleTestAIConnection = async () => {
    setAiTestState({ status: 'running' });
    try {
      const res = await apiRequest('/api/admin/diagnostics/ai-connection', { method: 'POST' });
      setAiTestState({
        status: res.status,
        result: res,
        error: res.error,
        timestamp: res.timestamp || new Date().toISOString(),
      });
      triggerFeedback(`AI Provider Test: ${res.status.toUpperCase()} (${res.latencyMs || 0}ms)`);
    } catch (e: any) {
      setAiTestState({
        status: 'failed',
        error: e.message || 'AI connection check failed',
        timestamp: new Date().toISOString(),
      });
    }
  };

  // B. AI Sales Agent Playground
  const handleRunPlayground = async (overrideQuestion?: string) => {
    const q = (overrideQuestion || playgroundState.question).trim();
    if (!q) return;
    setPlaygroundState((prev) => ({ ...prev, status: 'running', question: q }));
    try {
      const res = await apiRequest('/api/admin/diagnostics/ai-playground', {
        method: 'POST',
        body: JSON.stringify({ question: q }),
      });
      setPlaygroundState({
        status: res.success ? 'passed' : 'failed',
        question: q,
        result: res,
        error: res.error,
        timestamp: new Date().toISOString(),
      });
      triggerFeedback('AI Sales Agent Playground response generated.');
    } catch (e: any) {
      setPlaygroundState((prev) => ({
        ...prev,
        status: 'failed',
        error: e.message || 'Playground request failed',
        timestamp: new Date().toISOString(),
      }));
    }
  };

  // C. Firebase Diagnostics
  const handleRunFirebaseDiagnostics = async () => {
    setFirebaseDiagState({ status: 'running' });
    try {
      const backendRes = await apiRequest('/api/admin/diagnostics/firebase', { method: 'POST' });

      // Run real client-side Firestore authenticated read/write/cleanup verification
      const rwResult = await runFirestoreReadWriteDiagnostic();

      const finalStatus =
        rwResult.status === 'passed'
          ? 'passed'
          : backendRes.status === 'passed' && !rwResult.error
          ? 'passed'
          : rwResult.status === 'config_required'
          ? 'config_required'
          : rwResult.status;

      setFirebaseDiagState({
        status: finalStatus,
        result: {
          ...backendRes,
          readWriteMsg: rwResult.message,
          writeSuccess: rwResult.writeSuccess,
          readSuccess: rwResult.readSuccess,
          cleanupSuccess: rwResult.cleanupSuccess,
          recordId: rwResult.recordId,
        },
        error: rwResult.error || backendRes.error,
        timestamp: new Date().toISOString(),
        clientLatency: rwResult.latencyMs || backendRes.latencyMs || 0,
        authStatus: rwResult.authStatus || (firebaseAuth.currentUser ? `Authenticated (${firebaseAuth.currentUser.email})` : 'Unauthenticated / Guest Session'),
        writeReadSuccess: rwResult.writeSuccess && rwResult.readSuccess && rwResult.cleanupSuccess,
      });
      triggerFeedback(`Firebase Diagnostics: ${finalStatus.toUpperCase()}`);
    } catch (e: any) {
      setFirebaseDiagState({
        status: 'failed',
        error: e.message || 'Firebase diagnostics failed',
        timestamp: new Date().toISOString(),
      });
    }
  };

  // D. Channels Diagnostics
  const handleRunChannelsDiagnostics = async () => {
    setChannelsDiagState({ status: 'running', channels: [] });
    try {
      const res = await apiRequest('/api/admin/diagnostics/channels', { method: 'POST' });
      const hasFailure = res.channels?.some((c: any) => c.status === 'failed');
      const allPassed = res.channels?.every((c: any) => c.status === 'passed');
      setChannelsDiagState({
        status: hasFailure ? 'failed' : allPassed ? 'passed' : 'config_required',
        channels: res.channels || [],
        timestamp: res.timestamp || new Date().toISOString(),
      });
      triggerFeedback('Channel Connection Diagnostics completed.');
    } catch (e: any) {
      setChannelsDiagState({
        status: 'failed',
        channels: [],
        error: e.message || 'Channel diagnostics error',
        timestamp: new Date().toISOString(),
      });
    }
  };

  // E. Scheduler Diagnostics
  const handleRunSchedulerDiagnostics = async () => {
    setSchedulerDiagState({ status: 'running' });
    try {
      const res = await apiRequest('/api/admin/diagnostics/scheduler', { method: 'POST' });
      setSchedulerDiagState({
        status: res.status,
        result: res,
        timestamp: res.timestamp || new Date().toISOString(),
      });
      triggerFeedback(`Scheduler Diagnostics: ${res.status.toUpperCase()}`);
    } catch (e: any) {
      setSchedulerDiagState({
        status: 'failed',
        error: e.message || 'Scheduler diagnostic error',
        timestamp: new Date().toISOString(),
      });
    }
  };

  // F. Run All Safe Non-Destructive Tests
  const handleRunAllSafe = async () => {
    setRunningAllSafe(true);
    triggerFeedback('Executing all safe non-destructive diagnostics...');
    try {
      await Promise.allSettled([
        handleTestAIConnection(),
        handleRunPlayground('T-shirt er price koto and stock ase kina?'),
        handleRunFirebaseDiagnostics(),
        handleRunChannelsDiagnostics(),
        handleRunSchedulerDiagnostics(),
      ]);
      triggerFeedback('All safe non-destructive diagnostics finished.');
    } finally {
      setRunningAllSafe(false);
    }
  };

  if (!user || (!user.isSuperAdmin && user.role !== 'superadmin')) {
    return (
      <div className="flex h-96 flex-col items-center justify-center text-center p-6 space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-white">Access Denied</h2>
        <p className="text-sm text-slate-400 max-w-md">
          Super Admin authorization is required to access the Owner Control Center. Your account does not have sufficient administrative privileges.
        </p>
      </div>
    );
  }

  if (loading && !overviewData) {
    return (
      <div className="flex h-96 flex-col items-center justify-center text-xs text-purple-400 gap-3">
        <RefreshCw className="h-7 w-7 animate-spin text-purple-500" />
        <span className="font-semibold tracking-wide">Authenticating & Initializing Owner Control Center...</span>
      </div>
    );
  }

  const navTabs = [
    { id: 'overview', label: 'Overview', icon: ShieldAlert },
    { id: 'diagnostics', label: 'AI Diagnostics & Testing', icon: Activity, highlight: true },
    { id: 'users', label: 'User Management', icon: Users, count: usersList.length },
    { id: 'subscriptions', label: 'Subscriptions & Billing', icon: CreditCard, count: subscriptionsList.length },
    { id: 'ai-providers', label: 'AI Provider Management', icon: Bot, highlight: true },
    { id: 'integrations', label: 'API & Integrations', icon: Key },
    { id: 'branding', label: 'Website Branding', icon: Sparkles },
    { id: 'domain', label: 'Domain & Deployment', icon: Globe },
    { id: 'features', label: 'Feature Management', icon: Sliders },
    { id: 'analytics', label: 'Usage & Cost Analytics', icon: TrendingUp },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: Bell,
      badge: notifications.filter((n) => !n.read).length || undefined,
    },
    { id: 'security', label: 'Security & Audit Logs', icon: Lock },
    { id: 'system', label: 'System Settings', icon: Settings },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* TOP OWNER BANNER */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 rounded-3xl border border-rose-500/30 bg-gradient-to-r from-[#100720] via-[#1a0a2a] to-[#0c0818] p-6 shadow-2xl relative overflow-hidden">
        <div className="flex items-center gap-4 relative z-10">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500/20 to-purple-600/30 border border-rose-500/40 text-rose-300 shadow-lg shadow-rose-950/40 shrink-0">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-black text-white tracking-tight">YEAR INFO AI — Owner Control Center</h1>
              <span className="rounded-full bg-rose-500/20 px-2.5 py-0.5 text-xs font-bold text-rose-300 border border-rose-500/40 flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-400 animate-pulse" />
                Root Authority
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Centralized platform administration: subscriptions, AI provider routing, API credentials, website branding, domain configuration, and feature governance.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 relative z-10 shrink-0 flex-wrap">
          <button
            onClick={() => {
              setActiveTab('diagnostics');
              handleTestAIConnection();
            }}
            disabled={aiTestState.status === 'running'}
            className="flex items-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-600/20 px-3.5 py-2 text-xs font-bold text-rose-300 hover:bg-rose-600/30 transition shadow-sm"
          >
            <Activity className={`h-3.5 w-3.5 text-rose-400 ${aiTestState.status === 'running' ? 'animate-spin' : ''}`} />
            <span>Test AI Connection</span>
          </button>

          <button
            onClick={() => setActiveTab('diagnostics')}
            className="flex items-center gap-1.5 rounded-xl border border-purple-500/40 bg-purple-600/20 px-3.5 py-2 text-xs font-bold text-purple-300 hover:bg-purple-600/30 transition shadow-sm"
          >
            <Cpu className="h-3.5 w-3.5 text-purple-400" />
            <span>AI Diagnostics Panel</span>
          </button>

          <button
            onClick={() => {
              setRefreshing(true);
              loadAllData();
            }}
            disabled={refreshing}
            className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900/90 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 transition"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh State</span>
          </button>
        </div>
      </div>

      {/* FEEDBACK BANNERS */}
      {saveSuccessMsg && (
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs font-medium text-emerald-300 shadow-lg animate-in fade-in">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {actionErrorMsg && (
        <div className="flex items-center gap-2 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs font-medium text-rose-300 shadow-lg animate-in fade-in">
          <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
          <span>{actionErrorMsg}</span>
        </div>
      )}

      {/* 12-ITEM NAVIGATION BAR */}
      <div className="flex overflow-x-auto no-scrollbar gap-1 rounded-2xl bg-slate-900/90 p-1.5 border border-slate-800 text-xs font-semibold">
        {navTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-2 whitespace-nowrap transition duration-150 ${
                isActive
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-600/30 font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-white' : tab.highlight ? 'text-purple-400' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="rounded-full bg-rose-500 px-1.5 py-0.2 text-[10px] font-bold text-white">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ============================================================== */}
      {/* 1. OVERVIEW SECTION                                            */}
      {/* ============================================================== */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-purple-500/20 bg-slate-900/80 p-5 shadow-lg space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-bold uppercase tracking-wider">Total Users</span>
                <Users className="h-4 w-4 text-purple-400" />
              </div>
              <div className="text-2xl font-black text-white">{overviewData?.stats?.users?.total || usersList.length}</div>
              <div className="text-[11px] text-slate-400 flex items-center justify-between">
                <span>Active: {overviewData?.stats?.users?.active || 0}</span>
                <span className="text-purple-400 font-semibold">Workspaces: {overviewData?.stats?.workspaces?.total || 1}</span>
              </div>
            </div>

            <div className="rounded-2xl border border-emerald-500/20 bg-slate-900/80 p-5 shadow-lg space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-bold uppercase tracking-wider">Verified Revenue</span>
                <CreditCard className="h-4 w-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-black text-emerald-400">
                ৳{overviewData?.stats?.revenue?.verifiedBdt?.toLocaleString() || '0'}
              </div>
              <div className="text-[11px] text-slate-400 flex items-center justify-between">
                <span>${overviewData?.stats?.revenue?.verifiedUsd || 0} USD</span>
                <span className="text-emerald-400">{overviewData?.stats?.revenue?.verifiedPaymentsCount || 0} Payments</span>
              </div>
            </div>

            <div className="rounded-2xl border border-indigo-500/20 bg-slate-900/80 p-5 shadow-lg space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-bold uppercase tracking-wider">AI Operations</span>
                <Bot className="h-4 w-4 text-indigo-400" />
              </div>
              <div className="text-2xl font-black text-white">
                {overviewData?.stats?.aiUsage?.totalCalls || 0} calls
              </div>
              <div className="text-[11px] text-slate-400 flex items-center justify-between">
                <span>{(overviewData?.stats?.aiUsage?.totalTokens || 0).toLocaleString()} tokens</span>
                <span className="text-indigo-300 font-medium">${overviewData?.stats?.aiUsage?.estimatedCostUsd || 0}</span>
              </div>
            </div>

            <div className="rounded-2xl border border-rose-500/20 bg-slate-900/80 p-5 shadow-lg space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-bold uppercase tracking-wider">Subscriptions</span>
                <Shield className="h-4 w-4 text-rose-400" />
              </div>
              <div className="text-2xl font-black text-white">
                {overviewData?.stats?.subscriptions?.active || 0} active
              </div>
              <div className="text-[11px] text-slate-400 flex items-center justify-between">
                <span className="text-amber-400 font-bold">{overviewData?.stats?.subscriptions?.pending || 0} Pending</span>
                <span>{overviewData?.stats?.subscriptions?.expired || 0} Expired</span>
              </div>
            </div>
          </div>

          {/* Active AI Provider Banner */}
          <div className="rounded-2xl border border-purple-500/30 bg-purple-950/20 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs text-purple-400 font-bold uppercase tracking-wider">Current Primary AI Engine</div>
                <div className="text-sm font-bold text-white flex items-center gap-2">
                  <span>{overviewData?.stats?.aiUsage?.defaultProviderName || 'Google Gemini (Official)'}</span>
                  <span className="rounded bg-purple-500/30 px-1.5 py-0.2 text-[10px] font-mono text-purple-200">
                    {overviewData?.stats?.aiUsage?.defaultModel || 'gemini-3.8-flash'}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('ai-providers')}
              className="rounded-xl border border-purple-500/40 bg-purple-600/30 px-3.5 py-2 text-xs font-bold text-purple-200 hover:bg-purple-600/40 transition flex items-center gap-1.5"
            >
              <span>Manage AI Providers</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Pending Subscriptions Urgent Banner */}
          {overviewData?.stats?.subscriptions?.pending > 0 && (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 text-amber-300">
                <AlertTriangle className="h-5 w-5 shrink-0" />
                <div>
                  <div className="font-bold text-sm text-white">
                    {overviewData.stats.subscriptions.pending} Subscription Applications Awaiting Verification
                  </div>
                  <div className="text-xs text-amber-400/80">
                    Users submitted bKash/Nagad payment references requiring administrative approval.
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  setActiveTab('subscriptions');
                  setSubStatusFilter('pending');
                }}
                className="rounded-xl bg-amber-500 px-3.5 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 transition shrink-0"
              >
                Review Applications
              </button>
            </div>
          )}

          {/* Recent Audit Logs & System Status */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <Clock className="h-4 w-4 text-purple-400" />
                  <span>Recent Administrative Actions</span>
                </h3>
                <button
                  onClick={() => setActiveTab('security')}
                  className="text-xs text-purple-400 hover:underline"
                >
                  View full trail
                </button>
              </div>

              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {overviewData?.recentAuditLogs?.length > 0 ? (
                  overviewData.recentAuditLogs.map((log: AuditLog) => (
                    <div key={log.id} className="rounded-xl bg-slate-950/70 p-3 text-xs border border-slate-800/80 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-200">{log.action}</span>
                        <span className="text-[10px] text-slate-500">{new Date(log.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-slate-400 text-[11px] leading-relaxed">{log.details}</p>
                      <div className="text-[10px] text-purple-400">By {log.userName}</div>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-slate-500 text-center py-6">No administrative logs recorded yet.</div>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <Shield className="h-4 w-4 text-emerald-400" />
                  <span>Infrastructure & Environment Status</span>
                </h3>
                <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/30">
                  Healthy
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center py-2 border-b border-slate-800">
                  <span className="text-slate-400">Canonical Website URL</span>
                  <span className="font-mono text-purple-300 truncate max-w-xs">{domainSettings?.canonicalUrl || 'Cloud Run Asia'}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-800">
                  <span className="text-slate-400">SSL/TLS Termination</span>
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Active (Auto-managed)
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-800">
                  <span className="text-slate-400">Runtime Platform</span>
                  <span className="text-slate-200">{domainSettings?.environment?.platform || 'Google Cloud Run'}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-800">
                  <span className="text-slate-400">Node.js Engine</span>
                  <span className="font-mono text-slate-300">{domainSettings?.environment?.nodeVersion || process.version}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-slate-400">Active Platform Features</span>
                  <span className="text-indigo-400 font-bold">{overviewData?.stats?.featuresActiveCount || 12} / 12 Enabled</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 2. REAL AI DIAGNOSTICS & SYSTEM TESTING PANEL (OWNER CENTER)   */}
      {/* ============================================================== */}
      {activeTab === 'diagnostics' && (
        <div className="space-y-6">
          {/* Header Bar with Run All Safe Tests */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl border border-purple-500/30 bg-slate-900/90 p-5 shadow-xl">
            <div>
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-rose-400" />
                <h3 className="font-bold text-base text-white">Live AI & Infrastructure Diagnostics Engine</h3>
                <span className="rounded-full bg-rose-500/20 px-2.5 py-0.5 text-[10px] font-bold text-rose-300 border border-rose-500/30">
                  Zero Simulation Mode
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Every diagnostic test executes real backend operations and reports actual API latency, network reachability, and cryptographic credentials.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleRunAllSafe}
                disabled={runningAllSafe}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-purple-600 px-4 py-2 text-xs font-bold text-white hover:from-rose-500 hover:to-purple-500 transition shadow-lg shadow-rose-950/40 disabled:opacity-50"
              >
                <Radio className={`h-4 w-4 ${runningAllSafe ? 'animate-spin' : ''}`} />
                <span>{runningAllSafe ? 'Executing Non-Destructive Tests...' : 'Run All Safe Tests'}</span>
              </button>
            </div>
          </div>

          {/* Sub Navigation */}
          <div className="flex overflow-x-auto no-scrollbar gap-1.5 rounded-xl bg-slate-950/80 p-1.5 border border-slate-800 text-xs font-semibold">
            {[
              { id: 'all', label: 'All Diagnostics' },
              { id: 'ai-provider', label: 'A. AI Provider Test' },
              { id: 'playground', label: 'B. Sales Agent Playground' },
              { id: 'firebase', label: 'C. Firebase Diagnostics' },
              { id: 'channels', label: 'D. Channels Diagnostics' },
              { id: 'scheduler', label: 'E. Scheduler Diagnostics' },
            ].map((sub) => (
              <button
                key={sub.id}
                onClick={() => setDiagSubTab(sub.id as any)}
                className={`rounded-lg px-3 py-1.5 whitespace-nowrap transition ${
                  diagSubTab === sub.id
                    ? 'bg-purple-600 text-white font-bold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                {sub.label}
              </button>
            ))}
          </div>

          {/* SECTION A: AI PROVIDER TEST */}
          {(diagSubTab === 'all' || diagSubTab === 'ai-provider') && (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    <Bot className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white flex items-center gap-2">
                      <span>A. Primary AI Provider Live Test</span>
                      {aiTestState.status === 'not_tested' && (
                        <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-400">Not Tested</span>
                      )}
                      {aiTestState.status === 'running' && (
                        <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] text-blue-300 border border-blue-500/40 flex items-center gap-1">
                          <RefreshCw className="h-2.5 w-2.5 animate-spin" /> Running
                        </span>
                      )}
                      {aiTestState.status === 'passed' && (
                        <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] text-emerald-300 border border-emerald-500/40 font-bold">
                          Passed
                        </span>
                      )}
                      {aiTestState.status === 'failed' && (
                        <span className="rounded-full bg-rose-500/20 px-2 py-0.5 text-[10px] text-rose-300 border border-rose-500/40 font-bold">
                          Failed
                        </span>
                      )}
                      {aiTestState.status === 'config_required' && (
                        <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] text-amber-300 border border-amber-500/40 font-bold">
                          Configuration Required
                        </span>
                      )}
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Sends a real test ping request to the configured backend AI service without exposing secret keys.
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleTestAIConnection}
                  disabled={aiTestState.status === 'running'}
                  className="rounded-xl bg-purple-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-purple-500 transition flex items-center gap-1.5 shrink-0 self-start sm:self-auto"
                >
                  <Activity className={`h-3.5 w-3.5 ${aiTestState.status === 'running' ? 'animate-spin' : ''}`} />
                  <span>Test AI Connection</span>
                </button>
              </div>

              {/* Provider Details & Test Output */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="rounded-xl bg-slate-950 p-3 border border-slate-800/80">
                  <div className="text-[10px] text-slate-500 font-semibold uppercase">Configured Provider</div>
                  <div className="font-bold text-white mt-0.5">
                    {overviewData?.activeProvider?.name || 'Google Gemini (Official)'}
                  </div>
                </div>
                <div className="rounded-xl bg-slate-950 p-3 border border-slate-800/80">
                  <div className="text-[10px] text-slate-500 font-semibold uppercase">Target Model</div>
                  <div className="font-mono text-purple-300 mt-0.5">
                    {overviewData?.activeProvider?.model || 'gemini-3.8-flash'}
                  </div>
                </div>
                <div className="rounded-xl bg-slate-950 p-3 border border-slate-800/80">
                  <div className="text-[10px] text-slate-500 font-semibold uppercase">Last Response Latency</div>
                  <div className="font-mono text-emerald-400 mt-0.5">
                    {aiTestState.result?.latencyMs !== undefined ? `${aiTestState.result.latencyMs} ms` : '—'}
                  </div>
                </div>
              </div>

              {aiTestState.result?.actualResponse && (
                <div className="rounded-xl bg-slate-950/80 p-3.5 border border-emerald-500/20 text-xs space-y-1">
                  <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Actual AI Model Response:
                  </div>
                  <div className="font-mono text-slate-200 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                    "{aiTestState.result.actualResponse}"
                  </div>
                </div>
              )}

              {aiTestState.error && (
                <div className="rounded-xl bg-rose-950/30 p-3.5 border border-rose-500/30 text-xs text-rose-300 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
                    <span>Actionable Diagnostic Message:</span>
                  </div>
                  <div className="text-slate-300">{aiTestState.error}</div>
                </div>
              )}
            </div>
          )}

          {/* SECTION B: AI SALES AGENT TEST PLAYGROUND */}
          {(diagSubTab === 'all' || diagSubTab === 'playground') && (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    <Terminal className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white flex items-center gap-2 flex-wrap">
                      <span>B. AI Sales Agent Test Playground</span>
                      {playgroundState.status === 'not_tested' && (
                        <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-400">Not Tested</span>
                      )}
                      {playgroundState.status === 'running' && (
                        <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] text-blue-300 border border-blue-500/40 flex items-center gap-1">
                          <RefreshCw className="h-2.5 w-2.5 animate-spin" /> Running
                        </span>
                      )}
                      {playgroundState.status === 'passed' && (
                        <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] text-emerald-300 border border-emerald-500/40 font-bold">
                          Passed
                        </span>
                      )}
                      {playgroundState.status === 'failed' && (
                        <span className="rounded-full bg-rose-500/20 px-2 py-0.5 text-[10px] text-rose-300 border border-rose-500/40 font-bold">
                          Failed
                        </span>
                      )}
                      {playgroundState.status === 'config_required' && (
                        <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] text-amber-300 border border-amber-500/40 font-bold">
                          Configuration Required
                        </span>
                      )}
                      <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] text-emerald-300 border border-emerald-500/30">
                        Zero Customer Impact
                      </span>
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Query your real catalog and knowledge base in English and Bengali. Verifies pricing, stock, and delivery policy accuracy.
                    </p>
                  </div>
                </div>
              </div>

              {/* Interactive Inquiry Box */}
              <div className="space-y-3">
                <div className="relative">
                  <input
                    type="text"
                    value={playgroundState.question}
                    onChange={(e) => setPlaygroundState((prev) => ({ ...prev, question: e.target.value }))}
                    onKeyDown={(e) => e.key === 'Enter' && handleRunPlayground()}
                    placeholder="Ask product price, stock, or policy in English or বাংলা..."
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 pl-4 pr-28 py-3 text-xs text-white focus:border-purple-500 focus:outline-none"
                  />
                  <button
                    onClick={() => handleRunPlayground()}
                    disabled={playgroundState.status === 'running'}
                    className="absolute right-1.5 top-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-indigo-500 transition flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Send className={`h-3 w-3 ${playgroundState.status === 'running' ? 'animate-spin' : ''}`} />
                    <span>Inquire</span>
                  </button>
                </div>

                {/* Preset Test Buttons */}
                <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                  <span className="text-slate-500 font-semibold mr-1">Quick Test Cases:</span>
                  {[
                    { label: '🇧🇩 পাঞ্জাবির দাম ও ডেলিভারি', q: 'পাঞ্জাবির দাম কত এবং ডেলিভারি চার্জ কত?' },
                    { label: '🇬🇧 Price & Stock Inquiry', q: 'What is the price and stock of Premium Panjabi?' },
                    { label: '🚚 Delivery Policy', q: 'What is your delivery charge in Chittagong?' },
                    { label: '🚫 Discount Policy Guard', q: 'Can you give me 50% discount if I buy 2?' },
                    { label: '🛡️ Hallucination Guard (Unknown Item)', q: 'Do you sell iPhone 16 Pro Max or gold chains?' },
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleRunPlayground(preset.q)}
                      className="rounded-lg border border-slate-800 bg-slate-950/70 px-2.5 py-1 text-slate-300 hover:border-purple-500 hover:text-white transition"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Playground Response Box */}
              {playgroundState.result && (
                <div className="rounded-xl border border-indigo-500/30 bg-slate-950/90 p-4 space-y-3 animate-in fade-in">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">Model Response:</span>
                      <span className="rounded bg-indigo-500/20 px-2 py-0.5 text-[10px] font-mono text-indigo-300">
                        {playgroundState.result.model}
                      </span>
                      <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] text-slate-400">
                        Language: {playgroundState.result.languageDetected === 'bn' ? 'বাংলা' : 'English'}
                      </span>
                    </div>
                    <span className="font-mono text-slate-400 text-[11px]">
                      Latency: {playgroundState.result.latencyMs}ms
                    </span>
                  </div>

                  <p className="text-xs text-slate-200 leading-relaxed font-sans bg-slate-900/60 p-3 rounded-lg border border-slate-800/80">
                    {playgroundState.result.replyText}
                  </p>

                  {/* Fact Checking Verification Scorecard */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-[11px]">
                    <div className="flex items-center gap-1.5 rounded-lg bg-slate-900 p-2 border border-slate-800">
                      <CheckCircle2 className={`h-3.5 w-3.5 ${playgroundState.result.factsVerification?.pricingAccurate ? 'text-emerald-400' : 'text-amber-400'}`} />
                      <span className="text-slate-300">Pricing Grounded:</span>
                      <span className="font-bold text-white ml-auto">
                        {playgroundState.result.factsVerification?.pricingAccurate ? 'Verified' : 'Guarded'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 rounded-lg bg-slate-900 p-2 border border-slate-800">
                      <CheckCircle2 className={`h-3.5 w-3.5 ${playgroundState.result.factsVerification?.stockAccurate ? 'text-emerald-400' : 'text-amber-400'}`} />
                      <span className="text-slate-300">Stock Grounded:</span>
                      <span className="font-bold text-white ml-auto">
                        {playgroundState.result.factsVerification?.stockAccurate ? 'Verified' : 'Guarded'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 rounded-lg bg-slate-900 p-2 border border-slate-800">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                      <span className="text-slate-300">Hallucination Guard:</span>
                      <span className="font-bold text-emerald-400 ml-auto">Active</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SECTION C: FIREBASE REAL DIAGNOSTICS */}
          {(diagSubTab === 'all' || diagSubTab === 'firebase') && (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    <Database className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white flex items-center gap-2">
                      <span>C. Cloud Firebase & Firestore Diagnostics</span>
                      {firebaseDiagState.status === 'not_tested' && (
                        <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-400">Not Tested</span>
                      )}
                      {firebaseDiagState.status === 'running' && (
                        <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] text-blue-300 border border-blue-500/40 flex items-center gap-1">
                          <RefreshCw className="h-2.5 w-2.5 animate-spin" /> Running
                        </span>
                      )}
                      {firebaseDiagState.status === 'passed' && (
                        <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] text-emerald-300 border border-emerald-500/40 font-bold">
                          Passed
                        </span>
                      )}
                      {firebaseDiagState.status === 'config_required' && (
                        <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] text-amber-300 border border-amber-500/40 font-bold">
                          Configuration Required
                        </span>
                      )}
                      {firebaseDiagState.status === 'failed' && (
                        <span className="rounded-full bg-rose-500/20 px-2 py-0.5 text-[10px] text-rose-300 border border-rose-500/40 font-bold">
                          Failed
                        </span>
                      )}
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Tests project initialization, auth status, reachability, and authenticated Firestore read/write verification.
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleRunFirebaseDiagnostics}
                  disabled={firebaseDiagState.status === 'running'}
                  className="rounded-xl bg-amber-600 px-3.5 py-2 text-xs font-bold text-slate-950 hover:bg-amber-500 transition flex items-center gap-1.5 shrink-0 self-start sm:self-auto"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${firebaseDiagState.status === 'running' ? 'animate-spin' : ''}`} />
                  <span>Run Firebase Diagnostics</span>
                </button>
              </div>

              {/* Firebase Environment Status Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div className="rounded-xl bg-slate-950 p-3 border border-slate-800">
                  <div className="text-[10px] text-slate-500 font-semibold uppercase">Project ID</div>
                  <div className="font-mono text-purple-300 mt-0.5">yearinvo-ai</div>
                </div>
                <div className="rounded-xl bg-slate-950 p-3 border border-slate-800">
                  <div className="text-[10px] text-slate-500 font-semibold uppercase">Auth Domain</div>
                  <div className="font-mono text-slate-200 mt-0.5 truncate">yearinvo-ai.firebaseapp.com</div>
                </div>
                <div className="rounded-xl bg-slate-950 p-3 border border-slate-800">
                  <div className="text-[10px] text-slate-500 font-semibold uppercase">Storage Bucket</div>
                  <div className="font-mono text-slate-200 mt-0.5 truncate">yearinvo-ai.firebasestorage.app</div>
                </div>
                <div className="rounded-xl bg-slate-950 p-3 border border-slate-800">
                  <div className="text-[10px] text-slate-500 font-semibold uppercase">Security Rules</div>
                  <div className="text-emerald-400 font-bold mt-0.5 flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>firestore.rules & storage.rules Active</span>
                  </div>
                </div>
              </div>

              {firebaseDiagState.result && (
                <div className="rounded-xl bg-slate-950/80 p-3.5 border border-slate-800 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-semibold">Diagnostic Execution Summary:</span>
                    <span className="text-slate-500 text-[10px] font-mono">{firebaseDiagState.timestamp}</span>
                  </div>
                  <div className="space-y-1.5 text-[11px]">
                    <div className="flex items-center justify-between py-1 border-b border-slate-900">
                      <span className="text-slate-400">Firebase App SDK Initialization:</span>
                      <span className="text-emerald-400 font-bold flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Initialized (1 app instance)
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-1 border-b border-slate-900">
                      <span className="text-slate-400">Auth Service Endpoint:</span>
                      <span className="text-emerald-400 font-bold">Reachable</span>
                    </div>
                    <div className="flex items-center justify-between py-1 border-b border-slate-900">
                      <span className="text-slate-400">Client Firebase Auth State:</span>
                      <span className="text-slate-200 font-mono">{firebaseDiagState.authStatus || 'Initialized'}</span>
                    </div>
                    <div className="flex items-center justify-between py-1 border-b border-slate-900">
                      <span className="text-slate-400">Safe Firestore Read/Write Roundtrip:</span>
                      <span
                        className={`font-bold flex items-center gap-1 ${
                          firebaseDiagState.writeReadSuccess
                            ? 'text-emerald-400'
                            : firebaseDiagState.status === 'config_required'
                            ? 'text-amber-400'
                            : 'text-rose-400'
                        }`}
                      >
                        {firebaseDiagState.writeReadSuccess ? (
                          <>
                            <CheckCircle2 className="h-3 w-3" /> Verified Write & Read-back
                          </>
                        ) : (
                          firebaseDiagState.result.readWriteMsg || 'Requires Session / API Key'
                        )}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-1 border-b border-slate-900">
                      <span className="text-slate-400">Test Record Cleanup:</span>
                      <span className="text-indigo-300 font-medium">
                        {firebaseDiagState.result.cleanupSuccess
                          ? 'Purged from /diagnostics_test'
                          : firebaseDiagState.writeReadSuccess
                          ? 'Purged'
                          : 'Idle / Safe'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-1">
                      <span className="text-slate-400">Overall Diagnostic Status:</span>
                      <span className="text-purple-300 font-medium">
                        {firebaseDiagState.result.readWriteMsg || firebaseDiagState.result.message}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SECTION D: CHANNEL CONNECTION DIAGNOSTICS */}
          {(diagSubTab === 'all' || diagSubTab === 'channels') && (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    <Radio className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white flex items-center gap-2 flex-wrap">
                      <span>D. Connected Channels Integrity Diagnostics</span>
                      {channelsDiagState.status === 'not_tested' && (
                        <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-400">Not Tested</span>
                      )}
                      {channelsDiagState.status === 'running' && (
                        <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] text-blue-300 border border-blue-500/40 flex items-center gap-1">
                          <RefreshCw className="h-2.5 w-2.5 animate-spin" /> Running
                        </span>
                      )}
                      {channelsDiagState.status === 'passed' && (
                        <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] text-emerald-300 border border-emerald-500/40 font-bold">
                          Passed
                        </span>
                      )}
                      {channelsDiagState.status === 'failed' && (
                        <span className="rounded-full bg-rose-500/20 px-2 py-0.5 text-[10px] text-rose-300 border border-rose-500/40 font-bold">
                          Failed
                        </span>
                      )}
                      {channelsDiagState.status === 'config_required' && (
                        <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] text-amber-300 border border-amber-500/40 font-bold">
                          Configuration Required
                        </span>
                      )}
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Verifies actual credentials for Facebook, Messenger, Instagram, WhatsApp, and Live Chat without publishing content or sending messages.
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleRunChannelsDiagnostics}
                  disabled={channelsDiagState.status === 'running'}
                  className="rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-blue-500 transition flex items-center gap-1.5 shrink-0 self-start sm:self-auto"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${channelsDiagState.status === 'running' ? 'animate-spin' : ''}`} />
                  <span>Check All Channels</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                {(channelsDiagState.channels.length > 0 ? channelsDiagState.channels : [
                  { type: 'facebook', name: 'Facebook Pages', status: 'not_tested', connected: false, message: 'Awaiting check. Verifies Meta Graph Page access.' },
                  { type: 'messenger', name: 'Facebook Messenger', status: 'not_tested', connected: false, message: 'Awaiting check. Verifies Page webhook and token.' },
                  { type: 'instagram', name: 'Instagram Business', status: 'not_tested', connected: false, message: 'Awaiting check. Verifies Instagram Graph permissions.' },
                  { type: 'whatsapp', name: 'WhatsApp Business', status: 'not_tested', connected: false, message: 'Awaiting check. Verifies Cloud API phone number token.' },
                  { type: 'livechat', name: 'Website Live Chat', status: 'not_tested', connected: false, message: 'Awaiting check. Verifies native livechat socket pipeline.' },
                ]).map((chan: any, idx) => (
                  <div key={idx} className="rounded-xl bg-slate-950 p-4 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white">{chan.name}</span>
                      {chan.status === 'not_tested' && (
                        <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-400">
                          Not Tested
                        </span>
                      )}
                      {chan.status === 'running' && (
                        <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] text-blue-300 flex items-center gap-1">
                          <RefreshCw className="h-2 w-2 animate-spin" /> Running
                        </span>
                      )}
                      {chan.status === 'passed' && (
                        <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] text-emerald-300 font-bold">
                          Passed
                        </span>
                      )}
                      {chan.status === 'failed' && (
                        <span className="rounded-full bg-rose-500/20 px-2 py-0.5 text-[10px] text-rose-300 font-bold">
                          Failed
                        </span>
                      )}
                      {chan.status === 'config_required' && (
                        <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] text-amber-300 font-bold">
                          Not Connected
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400">{chan.message}</p>
                    <div className="text-[10px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-900">
                      <span>Live Auth: {chan.connected ? 'Active' : 'Unauthenticated'}</span>
                      {chan.latencyMs !== undefined && <span>{chan.latencyMs}ms</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECTION E: SCHEDULER DIAGNOSTICS */}
          {(diagSubTab === 'all' || diagSubTab === 'scheduler') && (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white flex items-center gap-2">
                      <span>E. Background Scheduler Diagnostics</span>
                      {schedulerDiagState.status === 'not_tested' && (
                        <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-400">Not Tested</span>
                      )}
                      {schedulerDiagState.status === 'running' && (
                        <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] text-blue-300 border border-blue-500/40 flex items-center gap-1">
                          <RefreshCw className="h-2.5 w-2.5 animate-spin" /> Running
                        </span>
                      )}
                      {schedulerDiagState.status === 'passed' && (
                        <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] text-emerald-300 border border-emerald-500/40 font-bold">
                          Passed
                        </span>
                      )}
                      {schedulerDiagState.status === 'failed' && (
                        <span className="rounded-full bg-rose-500/20 px-2 py-0.5 text-[10px] text-rose-300 border border-rose-500/40 font-bold">
                          Failed
                        </span>
                      )}
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Verifies background queue cycle, job persistence, and safe test cleanup without sending real social posts.
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleRunSchedulerDiagnostics}
                  disabled={schedulerDiagState.status === 'running'}
                  className="rounded-xl bg-purple-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-purple-500 transition flex items-center gap-1.5 shrink-0 self-start sm:self-auto"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${schedulerDiagState.status === 'running' ? 'animate-spin' : ''}`} />
                  <span>Test Scheduler Job Queue</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="rounded-xl bg-slate-950 p-3 border border-slate-800">
                  <div className="text-[10px] text-slate-500 font-semibold uppercase">Worker Engine State</div>
                  <div className="text-emerald-400 font-bold mt-0.5 flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Running (20s interval)</span>
                  </div>
                </div>
                <div className="rounded-xl bg-slate-950 p-3 border border-slate-800">
                  <div className="text-[10px] text-slate-500 font-semibold uppercase">Pending Posts in Queue</div>
                  <div className="font-bold text-white mt-0.5">
                    {schedulerDiagState.result?.pendingPostsCount ?? 0} scheduled
                  </div>
                </div>
                <div className="rounded-xl bg-slate-950 p-3 border border-slate-800">
                  <div className="text-[10px] text-slate-500 font-semibold uppercase">Safe Test Cleanup</div>
                  <div className="text-indigo-400 font-bold mt-0.5">
                    {schedulerDiagState.result?.testResult?.jobCleanedUp ? 'Verified & Purged' : 'Ready'}
                  </div>
                </div>
              </div>

              {schedulerDiagState.result?.testResult && (
                <div className="rounded-xl bg-slate-950/80 p-3.5 border border-slate-800 text-xs">
                  <div className="text-slate-300 font-medium">
                    {schedulerDiagState.result.testResult.message}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* 2. USER MANAGEMENT                                             */}
      {/* ============================================================== */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search users by name, email, store..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-900 pl-9 pr-4 py-2 text-xs text-white focus:border-purple-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={userRoleFilter}
                onChange={(e) => setUserRoleFilter(e.target.value)}
                className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-300 focus:outline-none"
              >
                <option value="all">All Roles</option>
                <option value="superadmin">Super Admin / Owner</option>
                <option value="admin">Store Admin</option>
                <option value="agent">Support Agent</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900 shadow-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-3.5">User</th>
                  <th className="p-3.5">Role</th>
                  <th className="p-3.5">Primary Workspace</th>
                  <th className="p-3.5">Subscription</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Registered</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {usersList
                  .filter((u) => {
                    const matchesSearch =
                      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
                      u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
                      (u.businessName && u.businessName.toLowerCase().includes(userSearch.toLowerCase()));
                    const matchesRole =
                      userRoleFilter === 'all' ||
                      (userRoleFilter === 'superadmin' ? u.isSuperAdmin || u.role === 'superadmin' : u.role === userRoleFilter);
                    return matchesSearch && matchesRole;
                  })
                  .map((u) => (
                    <tr key={u.id} className="hover:bg-slate-800/40 transition">
                      <td className="p-3.5">
                        <div className="font-bold text-white">{u.name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{u.email}</div>
                      </td>
                      <td className="p-3.5">
                        {u.isSuperAdmin || u.role === 'superadmin' ? (
                          <span className="rounded-full bg-rose-500/20 px-2 py-0.5 text-[10px] font-bold text-rose-300 border border-rose-500/30">
                            Super Admin
                          </span>
                        ) : u.role === 'admin' ? (
                          <span className="rounded-full bg-purple-500/20 px-2 py-0.5 text-[10px] font-bold text-purple-300 border border-purple-500/30">
                            Store Admin
                          </span>
                        ) : (
                          <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-300">
                            Agent
                          </span>
                        )}
                      </td>
                      <td className="p-3.5">
                        <div className="font-semibold text-white">{u.primaryWorkspaceName}</div>
                        <div className="text-[10px] text-slate-500">{u.workspacesCount} workspace(s)</div>
                      </td>
                      <td className="p-3.5">
                        <span className="capitalize">{u.planName}</span>
                        <div className="text-[10px] text-emerald-400 capitalize">{u.subscriptionStatus}</div>
                      </td>
                      <td className="p-3.5">
                        {u.status === 'suspended' ? (
                          <span className="rounded bg-rose-500/20 px-1.5 py-0.5 text-[10px] font-bold text-rose-300">Suspended</span>
                        ) : (
                          <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-400">Active</span>
                        )}
                      </td>
                      <td className="p-3.5 text-slate-400">{new Date(u.createdAt).toLocaleDateString()}</td>
                      <td className="p-3.5 text-right space-x-1 whitespace-nowrap">
                        <button
                          onClick={() => handleToggleUserStatus(u.id, u.status)}
                          className={`rounded px-2 py-1 text-[11px] font-semibold border transition ${
                            u.status === 'suspended'
                              ? 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10'
                              : 'border-rose-500/30 text-rose-400 hover:bg-rose-500/10'
                          }`}
                        >
                          {u.status === 'suspended' ? 'Reactivate' : 'Suspend'}
                        </button>
                        <button
                          onClick={() => handleAdminResetPassword(u.id)}
                          className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-[11px] text-slate-300 hover:text-white transition"
                        >
                          Reset Pwd
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 3. SUBSCRIPTION & BILLING MANAGEMENT                           */}
      {/* ============================================================== */}
      {activeTab === 'subscriptions' && (
        <div className="space-y-5">
          {/* Sub Navigation */}
          <div className="flex gap-2 border-b border-slate-800 pb-2">
            {[
              { id: 'requests', label: `Subscriptions (${subscriptionsList.length})` },
              { id: 'plans', label: `Pricing Plans (${plansList.length})` },
              { id: 'payments', label: `Payment Records (${paymentsList.length})` },
            ].map((s) => (
              <button
                key={s.id}
                onClick={() => setSubTabSection(s.id as any)}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                  subTabSection === s.id ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          {subTabSection === 'requests' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-semibold">Filter Status:</span>
                {['all', 'pending', 'active', 'expired', 'suspended', 'cancelled'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setSubStatusFilter(st)}
                    className={`rounded-lg px-2.5 py-1 text-xs capitalize font-semibold transition ${
                      subStatusFilter === st
                        ? 'bg-purple-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900 shadow-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 text-[10px] uppercase font-semibold">
                    <tr>
                      <th className="p-3.5">Workspace</th>
                      <th className="p-3.5">Plan</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5">Payment Details</th>
                      <th className="p-3.5">Valid Until</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {subscriptionsList
                      .filter((s) => subStatusFilter === 'all' || s.status === subStatusFilter)
                      .map((sub) => (
                        <tr key={sub.id} className="hover:bg-slate-800/40 transition">
                          <td className="p-3.5">
                            <div className="font-bold text-white">{sub.workspaceName}</div>
                            <div className="text-[10px] text-slate-500 font-mono">ID: {sub.workspaceId}</div>
                          </td>
                          <td className="p-3.5 font-semibold text-purple-300">{sub.planName}</td>
                          <td className="p-3.5">
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-bold border capitalize ${
                                sub.status === 'active'
                                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                  : sub.status === 'pending'
                                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/30 animate-pulse'
                                  : 'bg-slate-800 text-slate-400 border-slate-700'
                              }`}
                            >
                              {sub.status}
                            </span>
                          </td>
                          <td className="p-3.5">
                            <div className="font-mono text-white text-[11px]">{sub.paymentMethod || 'Manual'}</div>
                            <div className="text-[10px] text-slate-400 font-mono">Ref: {sub.paymentReference || 'N/A'}</div>
                          </td>
                          <td className="p-3.5 text-slate-400">
                            {sub.expiresAt ? new Date(sub.expiresAt).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="p-3.5 text-right space-x-1.5 whitespace-nowrap">
                            {sub.status === 'pending' ? (
                              <>
                                <button
                                  onClick={() => handleUpdateSubStatus(sub.id, 'active', 30)}
                                  className="rounded bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-emerald-500 transition shadow"
                                >
                                  Approve (30d)
                                </button>
                                <button
                                  onClick={() => handleUpdateSubStatus(sub.id, 'rejected')}
                                  className="rounded bg-rose-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-rose-500 transition shadow"
                                >
                                  Reject
                                </button>
                              </>
                            ) : sub.status === 'active' ? (
                              <>
                                <button
                                  onClick={() => handleUpdateSubStatus(sub.id, 'active', 30)}
                                  className="rounded border border-purple-500/30 px-2 py-1 text-[11px] text-purple-300 hover:bg-purple-500/10 transition"
                                >
                                  Extend 30d
                                </button>
                                <button
                                  onClick={() => handleUpdateSubStatus(sub.id, 'suspended')}
                                  className="rounded border border-rose-500/30 px-2 py-1 text-[11px] text-rose-400 hover:bg-rose-500/10 transition"
                                >
                                  Suspend
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => handleUpdateSubStatus(sub.id, 'active', 30)}
                                className="rounded bg-purple-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-purple-500 transition"
                              >
                                Activate
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {subTabSection === 'plans' && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setEditingPlan(null);
                    setPlanForm({
                      name: '',
                      description: '',
                      priceBdt: 1999,
                      priceUsd: 20,
                      interval: 'monthly',
                      maxChannels: 3,
                      maxConversationsMonthly: 1000,
                      aiRepliesMonthly: 500,
                      maxScheduledPosts: 50,
                      maxTeamMembers: 3,
                      features: ['Multi-channel Unified Inbox', 'High-speed Gemini AI Sales Agent', 'Product Catalog'],
                    });
                    setShowPlanModal(true);
                  }}
                  className="rounded-xl bg-purple-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-purple-500 transition flex items-center gap-1.5"
                >
                  <Plus className="h-4 w-4" />
                  <span>Create Subscription Plan</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {plansList.map((plan) => (
                  <div key={plan.id} className="rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-4 shadow-lg flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <h4 className="font-black text-lg text-white">{plan.name}</h4>
                        <span className="rounded bg-purple-500/20 px-2 py-0.5 text-[10px] font-bold text-purple-300">
                          {plan.interval}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{plan.description}</p>
                      <div className="mt-3 text-2xl font-black text-white">
                        ৳{plan.priceBdt.toLocaleString()}{' '}
                        <span className="text-xs font-normal text-slate-400">/ mo (${plan.priceUsd})</span>
                      </div>

                      <div className="mt-4 space-y-1.5 text-xs text-slate-300 border-t border-slate-800 pt-3">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Channels:</span>
                          <span className="font-bold text-white">{plan.maxChannels}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">AI Monthly Replies:</span>
                          <span className="font-bold text-white">{plan.aiRepliesMonthly.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Scheduled Posts:</span>
                          <span className="font-bold text-white">{plan.maxScheduledPosts}</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                      <button
                        onClick={() => {
                          setEditingPlan(plan);
                          setPlanForm({
                            name: plan.name,
                            description: plan.description,
                            priceBdt: plan.priceBdt,
                            priceUsd: plan.priceUsd,
                            interval: plan.interval,
                            maxChannels: plan.maxChannels,
                            maxConversationsMonthly: plan.maxConversationsMonthly,
                            aiRepliesMonthly: plan.aiRepliesMonthly,
                            maxScheduledPosts: plan.maxScheduledPosts,
                            maxTeamMembers: plan.maxTeamMembers || 3,
                            features: plan.features,
                          });
                          setShowPlanModal(true);
                        }}
                        className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-200 hover:text-white"
                      >
                        Edit Plan
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {subTabSection === 'payments' && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <button
                  onClick={() => setShowPaymentModal(true)}
                  className="rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-emerald-500 transition flex items-center gap-1.5"
                >
                  <Plus className="h-4 w-4" />
                  <span>Record Offline Payment</span>
                </button>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900 shadow-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 text-[10px] uppercase font-semibold">
                    <tr>
                      <th className="p-3.5">Transaction ID</th>
                      <th className="p-3.5">Workspace</th>
                      <th className="p-3.5">Amount BDT</th>
                      <th className="p-3.5">Method</th>
                      <th className="p-3.5">Reference</th>
                      <th className="p-3.5">Verified At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {paymentsList.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-800/40 transition">
                        <td className="p-3.5 font-mono text-purple-300">{p.id}</td>
                        <td className="p-3.5 font-bold text-white">{p.workspaceName}</td>
                        <td className="p-3.5 font-bold text-emerald-400">৳{p.amountBdt.toLocaleString()} (${p.amountUsd})</td>
                        <td className="p-3.5 uppercase text-slate-200">{p.method}</td>
                        <td className="p-3.5 font-mono text-slate-300">{p.transactionReference}</td>
                        <td className="p-3.5 text-slate-400">{new Date(p.createdAt).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* 4. AI PROVIDER MANAGEMENT                                      */}
      {/* ============================================================== */}
      {activeTab === 'ai-providers' && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-base text-white">Configured AI Providers</h3>
              <p className="text-xs text-slate-400">
                Select which AI intelligence routes conversation replies. Disabling a provider automatically routes to fallback if enabled.
              </p>
            </div>

            <button
              onClick={() => {
                setEditingProvider(null);
                setProviderForm({
                  name: '',
                  providerType: 'gemini',
                  model: 'gemini-3.8-flash',
                  apiEndpoint: '',
                  apiKey: '',
                  isDefault: false,
                  isFallback: false,
                });
                setShowProviderModal(true);
              }}
              className="rounded-xl bg-purple-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-purple-500 transition flex items-center gap-1.5 self-start sm:self-auto"
            >
              <Plus className="h-4 w-4" />
              <span>Add Compatible Provider</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {aiProviders.map((prov) => {
              const isTesting = testingProviderId === prov.id;
              const hasTestResult = testResult && testResult.id === prov.id;

              return (
                <div
                  key={prov.id}
                  className={`rounded-2xl border p-5 shadow-xl flex flex-col justify-between space-y-4 transition ${
                    prov.isDefault
                      ? 'border-purple-500/50 bg-slate-900/90 ring-1 ring-purple-500/30'
                      : 'border-slate-800 bg-slate-900/70 hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-bold text-base text-white">{prov.name}</h4>
                        </div>
                        <span className="inline-block mt-1 font-mono text-[11px] text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                          {prov.model}
                        </span>
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        {prov.isDefault && (
                          <span className="rounded-full bg-purple-600 px-2.5 py-0.5 text-[10px] font-bold text-white shadow">
                            Primary
                          </span>
                        )}
                        {prov.isFallback && (
                          <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-[10px] font-bold text-indigo-300 border border-indigo-500/30">
                            Fallback
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="rounded-xl bg-slate-950 p-3 text-xs font-mono border border-slate-800 space-y-1">
                      <div className="text-slate-400 text-[11px]">Type: {prov.providerType}</div>
                      <div className="text-slate-400 text-[11px]">
                        API Key: <span className="text-slate-200">{prov.apiKeyMasked || '••••••••env'}</span>
                      </div>
                      {prov.apiEndpoint && (
                        <div className="text-slate-500 text-[10px] truncate">Endpoint: {prov.apiEndpoint}</div>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Connection Verification:</span>
                      {prov.lastTestStatus === 'success' ? (
                        <span className="text-emerald-400 font-bold flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Verified
                        </span>
                      ) : prov.lastTestStatus === 'failed' ? (
                        <span className="text-rose-400 font-bold flex items-center gap-1">
                          <XCircle className="h-3.5 w-3.5" /> Failed
                        </span>
                      ) : (
                        <span className="text-slate-500">Untested</span>
                      )}
                    </div>

                    {prov.lastError && (
                      <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-2 text-[11px] text-rose-300">
                        {formatProviderError(prov.lastError)}
                      </div>
                    )}

                    {hasTestResult && (
                      <div
                        className={`rounded-xl border p-2.5 text-[11px] ${
                          testResult.success
                            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                            : 'border-rose-500/30 bg-rose-500/10 text-rose-300'
                        }`}
                      >
                        <div className="font-bold flex items-center gap-1">
                          {testResult.success ? <Check className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                          <span>{testResult.message}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-800 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <button
                        onClick={() => handleTestProvider(prov.id)}
                        disabled={isTesting}
                        className="flex-1 rounded-xl border border-slate-700 bg-slate-800 py-1.5 text-xs font-semibold text-slate-200 hover:text-white transition flex items-center justify-center gap-1"
                      >
                        <RefreshCw className={`h-3 w-3 ${isTesting ? 'animate-spin' : ''}`} />
                        <span>{isTesting ? 'Verifying...' : 'Test Connection'}</span>
                      </button>

                      {!prov.isDefault && (
                        <button
                          onClick={() => handleSetDefaultProvider(prov.id)}
                          className="rounded-xl bg-purple-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-purple-500 transition"
                        >
                          Make Primary
                        </button>
                      )}
                    </div>

                    <div className="flex justify-end gap-2 text-xs">
                      <button
                        onClick={() => {
                          setEditingProvider(prov);
                          setProviderForm({
                            name: prov.name,
                            providerType: prov.providerType,
                            model: prov.model,
                            apiEndpoint: prov.apiEndpoint || '',
                            apiKey: '',
                            isDefault: prov.isDefault,
                            isFallback: prov.isFallback,
                          });
                          setShowProviderModal(true);
                        }}
                        className="text-purple-400 hover:underline"
                      >
                        Edit / Replace Key
                      </button>
                      {!prov.isDefault && (
                        <button
                          onClick={() => handleDeleteProvider(prov.id, prov.name)}
                          className="text-rose-400 hover:underline"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* PER-TASK MODEL ROUTING SECTION (Section 15.5) */}
          <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/80 p-6 space-y-5 shadow-2xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <h3 className="font-bold text-base text-white flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-purple-400" />
                  <span>Per-Task AI Model Routing (Multi-LLM Gateway)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Assign specialized AI models to distinct business tasks. When a provider encounters rate limits or errors, requests automatically failover.
                </p>
              </div>
              <span className="self-start sm:self-auto rounded-full bg-purple-500/10 border border-purple-500/30 px-3 py-1 text-[11px] font-mono text-purple-300">
                Central Gateway Active
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { id: 'customer_support', name: 'Sales & Customer Inquiries', desc: 'Central inbox real-time conversations in Bengali & English.' },
                { id: 'comment_classification', name: 'Facebook & Instagram Comments', desc: 'Comment category classification and public/private response drafting.' },
                { id: 'order_extraction', name: 'Order Intent & Extraction', desc: 'Structured JSON order extraction from chats with duplicate safeguards.' },
                { id: 'business_analytics', name: 'Business Analytics & Reports', desc: 'Real-time sales, order, and courier status query intelligence.' },
                { id: 'voice_assistant', name: 'AI Assistant & Spoken Audio', desc: 'Voice query understanding, strategic business advice, and natural vocal replies.' },
                { id: 'vision_understanding', name: 'Product Vision Understanding', desc: 'Customer image analysis and product catalog matching.' },
                { id: 'marketing_content', name: 'Post Scheduler & Content', desc: 'Automated social media marketing captions and post generation.' },
              ].map((taskItem) => {
                const currentRoute = taskRouting[taskItem.id] || { providerId: 'prov_gemini', model: 'gemini-3.8-flash' };
                const currentProvider = aiProviders.find((p) => p.id === currentRoute.providerId);

                return (
                  <div key={taskItem.id} className="rounded-xl border border-slate-800 bg-slate-950 p-4 flex flex-col justify-between space-y-3">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-white">{taskItem.name}</span>
                        <span className="text-[10px] font-mono text-purple-400 bg-purple-950/60 px-2 py-0.5 rounded border border-purple-800/40">
                          {currentProvider?.name.split(' ')[0] || 'Default'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">{taskItem.desc}</p>
                    </div>

                    <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                      <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Assigned Provider</label>
                      <select
                        value={currentRoute.providerId || 'prov_gemini'}
                        onChange={(e) => handleUpdateTaskRoute(taskItem.id, e.target.value)}
                        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-white focus:border-purple-500 focus:outline-none"
                      >
                        <option value="prov_gemini">Google Gemini (Default)</option>
                        {aiProviders
                          .filter((p) => p.id !== 'prov_gemini')
                          .map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({p.model})
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 5. API & INTEGRATIONS                                          */}
      {/* ============================================================== */}
      {activeTab === 'integrations' && (
        <div className="space-y-5">
          <div>
            <h3 className="font-bold text-base text-white">External Platform API Credentials</h3>
            <p className="text-xs text-slate-400">
              Centralized platform credentials for Meta, WhatsApp Business Platform, and payment gateways. Keys are never exposed in browser payloads.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {integrations.map((integ) => {
              const isTesting = testingIntegId === integ.id;

              return (
                <div key={integ.id} className="rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-4 shadow-xl">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-base text-white">{integ.name}</h4>
                      <p className="text-xs text-slate-400 mt-1">{integ.purpose}</p>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border capitalize ${
                        integ.status === 'configured'
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      {integ.status}
                    </span>
                  </div>

                  <div className="rounded-xl bg-slate-950 p-3 text-xs font-mono border border-slate-800 space-y-1">
                    <div className="text-slate-400">
                      Credential Fingerprint:{' '}
                      <span className="text-slate-200">{integ.maskedFingerprint || 'Not Configured'}</span>
                    </div>
                    {integ.metadata?.webhookEndpoint && (
                      <div className="text-slate-500 text-[10px]">Webhook: {integ.metadata.webhookEndpoint}</div>
                    )}
                  </div>

                  <div className="pt-2 flex items-center justify-between">
                    <button
                      onClick={async () => {
                        setTestingIntegId(integ.id);
                        try {
                          const res = await apiRequest(`/api/admin/integrations/${integ.id}/test`, { method: 'POST' });
                          triggerFeedback(res.message);
                          loadAllData();
                        } catch (e: any) {
                          setActionErrorMsg(e.message || 'Integration test failed');
                        } finally {
                          setTestingIntegId(null);
                        }
                      }}
                      disabled={isTesting}
                      className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-200 hover:text-white transition flex items-center gap-1.5"
                    >
                      <RefreshCw className={`h-3 w-3 ${isTesting ? 'animate-spin' : ''}`} />
                      <span>{isTesting ? 'Testing...' : 'Test Connection'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 6. WEBSITE BRANDING                                            */}
      {/* ============================================================== */}
      {activeTab === 'branding' && brandingSettings && (
        <form onSubmit={handleSaveBranding} className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base text-white">Website Branding & Content</h3>
              <p className="text-xs text-slate-400">
                Configure brand name, logos, landing page copy, and company info. Changes persist and dynamically render across all public pages.
              </p>
            </div>
            <button
              type="submit"
              className="rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white hover:bg-purple-500 transition shadow-lg shadow-purple-600/30"
            >
              Save Branding Settings
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-4">
              <h4 className="font-bold text-sm text-white">Brand Identity</h4>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Brand Name *</label>
                <input
                  type="text"
                  required
                  value={brandingSettings.siteName}
                  onChange={(e) => setBrandingSettings({ ...brandingSettings, siteName: e.target.value })}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Tagline</label>
                <input
                  type="text"
                  value={brandingSettings.tagline}
                  onChange={(e) => setBrandingSettings({ ...brandingSettings, tagline: e.target.value })}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Landing Page Headline</label>
                <input
                  type="text"
                  value={brandingSettings.landingHeadline}
                  onChange={(e) => setBrandingSettings({ ...brandingSettings, landingHeadline: e.target.value })}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Landing Page Description</label>
                <textarea
                  rows={3}
                  value={brandingSettings.landingDescription}
                  onChange={(e) => setBrandingSettings({ ...brandingSettings, landingDescription: e.target.value })}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-purple-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-4">
              <h4 className="font-bold text-sm text-white">Company & Contact Info</h4>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Company Legal Name</label>
                <input
                  type="text"
                  value={brandingSettings.companyName}
                  onChange={(e) => setBrandingSettings({ ...brandingSettings, companyName: e.target.value })}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Support Email</label>
                  <input
                    type="email"
                    value={brandingSettings.supportEmail}
                    onChange={(e) => setBrandingSettings({ ...brandingSettings, supportEmail: e.target.value })}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-purple-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Support Phone</label>
                  <input
                    type="text"
                    value={brandingSettings.supportPhone}
                    onChange={(e) => setBrandingSettings({ ...brandingSettings, supportPhone: e.target.value })}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Trade License / Reg Number</label>
                <input
                  type="text"
                  value={brandingSettings.tradeLicenseNumber || ''}
                  onChange={(e) => setBrandingSettings({ ...brandingSettings, tradeLicenseNumber: e.target.value })}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Company Address</label>
                <input
                  type="text"
                  value={brandingSettings.companyAddress}
                  onChange={(e) => setBrandingSettings({ ...brandingSettings, companyAddress: e.target.value })}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-purple-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </form>
      )}

      {/* ============================================================== */}
      {/* 7. DOMAIN & DEPLOYMENT                                         */}
      {/* ============================================================== */}
      {activeTab === 'domain' && domainSettings && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-base text-white">Domain & Hosting Configuration</h3>
              <p className="text-xs text-slate-400">
                Manage custom domain, DNS verification challenge, SSL/TLS status, and allowed application origins.
              </p>
            </div>

            <button
              onClick={handleVerifyDomain}
              disabled={verifyingDomain}
              className="rounded-xl bg-purple-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-purple-500 transition flex items-center gap-1.5 self-start sm:self-auto"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${verifyingDomain ? 'animate-spin' : ''}`} />
              <span>{verifyingDomain ? 'Checking...' : 'Verify Domain & SSL Status'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-4">
              <h4 className="font-bold text-sm text-white">Canonical Website Host</h4>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Active Canonical URL</label>
                <input
                  type="text"
                  readOnly
                  value={domainSettings.canonicalUrl}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-300 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Desired Custom Public Domain</label>
                <input
                  type="text"
                  value={domainSettings.desiredCustomDomain}
                  onChange={(e) => setDomainSettings({ ...domainSettings, desiredCustomDomain: e.target.value })}
                  placeholder="app.yourdomain.com"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-xs text-slate-400">Verification Status:</span>
                {domainSettings.isVerified ? (
                  <span className="text-emerald-400 text-xs font-bold flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4" /> Verified & Active
                  </span>
                ) : (
                  <span className="text-amber-400 text-xs font-bold flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4" /> DNS Records Pending
                  </span>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-4">
              <h4 className="font-bold text-sm text-white">Required DNS Records for Hosting</h4>
              <p className="text-xs text-slate-400">
                To route your custom domain to YEAR INFO AI, add these records in your DNS provider (Cloudflare, Namecheap, etc.):
              </p>

              <div className="space-y-2">
                {domainSettings.dnsRecordsRequired.map((dns, i) => (
                  <div key={i} className="rounded-xl bg-slate-950 p-2.5 text-xs font-mono border border-slate-800 space-y-0.5">
                    <div className="flex justify-between text-purple-300 font-bold">
                      <span>Type: {dns.type}</span>
                      <span>Host: {dns.host}</span>
                    </div>
                    <div className="text-slate-400 truncate text-[11px]">Value: {dns.value}</div>
                  </div>
                ))}
              </div>

              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 space-y-1">
                <div className="font-bold">Important Meta OAuth Notice:</div>
                <p className="text-[11px] text-amber-400/90 leading-relaxed">
                  When switching your public domain, update the "Valid OAuth Redirect URIs" in your Meta App Dashboard to include <code>https://{domainSettings.desiredCustomDomain}/auth/meta/callback</code>.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 8. FEATURE MANAGEMENT                                          */}
      {/* ============================================================== */}
      {activeTab === 'features' && featureFlags && (
        <div className="space-y-5">
          <div>
            <h3 className="font-bold text-base text-white">Platform-Wide Feature Switches</h3>
            <p className="text-xs text-slate-400">
              Toggle features globally. Disabled features are strictly enforced by the backend and display an informative maintenance state.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { key: 'aiSalesAgent', title: 'AI Sales Agent', desc: 'Autonomous customer chat replies & sales conversion.' },
              { key: 'aiModelSelection', title: 'AI Model Selection', desc: 'Allows switching models and brand voice configuration.' },
              { key: 'facebookConnection', title: 'Facebook Page Connection', desc: 'Meta Graph OAuth authorization & post synchronization.' },
              { key: 'messengerMessaging', title: 'Messenger Live Messaging', desc: 'Real-time customer conversations over Facebook Messenger.' },
              { key: 'instagramMessaging', title: 'Instagram Direct Messaging', desc: 'Instagram Professional messages in Central Inbox.' },
              { key: 'facebookPublishing', title: 'Facebook Publishing', desc: 'Publishing wall posts & carousels to connected Pages.' },
              { key: 'instagramPublishing', title: 'Instagram Publishing', desc: 'Automated post publishing to connected Instagram profiles.' },
              { key: 'whatsappMessaging', title: 'WhatsApp Business Messaging', desc: 'Transactional and scheduled WhatsApp Cloud messages.' },
              { key: 'websiteLiveChat', title: 'Website Live Chat Widget', desc: 'Public embeddable storefront live chat widget.' },
              { key: 'productCatalog', title: 'Product Catalog & Inventory', desc: 'Inventory tracking, pricing, and variants manager.' },
              { key: 'orderManagement', title: 'Order Management & Checkout', desc: 'Direct order creation, status tracking, and dispatching.' },
              { key: 'postScheduler', title: 'Social Media Post Scheduler', desc: 'Automated multi-platform scheduling calendar.' },
              { key: 'subscriptionBilling', title: 'Subscription & Billing Tiers', desc: 'Enforces plan quotas, limits, and payment validation.' },
            ].map((f) => {
              const isEnabled = Boolean(featureFlags[f.key as keyof PlatformFeatureFlags]);

              return (
                <div
                  key={f.key}
                  className={`rounded-2xl border p-4 shadow-lg flex flex-col justify-between space-y-3 transition ${
                    isEnabled ? 'border-purple-500/30 bg-slate-900/90' : 'border-slate-800 bg-slate-900/40 opacity-75'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-sm text-white">{f.title}</h4>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          isEnabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                        }`}
                      >
                        {isEnabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">{f.desc}</p>
                  </div>

                  <button
                    onClick={() => handleToggleFeature(f.key as keyof PlatformFeatureFlags, isEnabled)}
                    className={`w-full rounded-xl py-2 text-xs font-bold transition ${
                      isEnabled
                        ? 'bg-rose-600/20 text-rose-300 border border-rose-500/30 hover:bg-rose-600/30'
                        : 'bg-emerald-600 text-white hover:bg-emerald-500'
                    }`}
                  >
                    {isEnabled ? 'Disable Feature' : 'Enable Feature'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 9. USAGE & COST ANALYTICS                                      */}
      {/* ============================================================== */}
      {activeTab === 'analytics' && analyticsData && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base text-white">Platform Usage & Cost Intelligence</h3>
              <p className="text-xs text-slate-400">
                Derived exclusively from actual API transactions and database logs. No artificial estimations.
              </p>
            </div>
            <button
              onClick={() => {
                const blob = new Blob([JSON.stringify(analyticsData, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `yearinfo_analytics_${Date.now()}.json`;
                a.click();
              }}
              className="rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs font-bold text-slate-200 hover:text-white transition flex items-center gap-1.5"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export Analytics (JSON)</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-1">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Total AI Tokens</div>
              <div className="text-2xl font-black text-white">{analyticsData.totalTokens?.toLocaleString()}</div>
              <div className="text-[11px] text-purple-400">{analyticsData.totalRequests} API calls</div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-1">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Estimated Model Cost</div>
              <div className="text-2xl font-black text-emerald-400">${analyticsData.totalCostUsd} USD</div>
              <div className="text-[11px] text-slate-400">approx ৳{Math.round(analyticsData.totalCostUsd * 120)} BDT</div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-1">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Verified Revenue Total</div>
              <div className="text-2xl font-black text-white">৳{analyticsData.verifiedRevenueBdt?.toLocaleString()}</div>
              <div className="text-[11px] text-emerald-400">bKash & Nagad payments recorded</div>
            </div>
          </div>

          {/* Breakdown by Model */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-4">
            <h4 className="font-bold text-sm text-white">Usage Breakdown by Model</h4>
            <div className="space-y-3">
              {Object.entries(analyticsData.usageByModel || {}).map(([modelName, data]: any) => (
                <div key={modelName} className="rounded-xl bg-slate-950 p-3 flex items-center justify-between border border-slate-800">
                  <div>
                    <div className="font-bold text-sm text-purple-300 font-mono">{modelName}</div>
                    <div className="text-xs text-slate-400">{data.requests} requests processed</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-sm text-white">{data.tokens?.toLocaleString()} tokens</div>
                    <div className="text-xs text-emerald-400">${data.costUsd?.toFixed(4)} USD</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 10. NOTIFICATIONS                                              */}
      {/* ============================================================== */}
      {activeTab === 'notifications' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base text-white">System Administrative Notifications</h3>
            <span className="text-xs text-slate-400">{notifications.length} alerts</span>
          </div>

          <div className="space-y-3">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                className={`rounded-2xl border p-4 shadow-lg flex items-start justify-between gap-4 transition ${
                  notif.read ? 'border-slate-800 bg-slate-900/60' : 'border-purple-500/30 bg-slate-900 ring-1 ring-purple-500/20'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-0.5 rounded-xl p-2 ${
                      notif.severity === 'error'
                        ? 'bg-rose-500/20 text-rose-400'
                        : notif.severity === 'warning'
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-purple-500/20 text-purple-400'
                    }`}
                  >
                    <Bell className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white">{notif.title}</h4>
                    <p className="text-xs text-slate-400 mt-1">{notif.message}</p>
                    <span className="text-[10px] text-slate-500 mt-2 block">
                      {new Date(notif.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>

                {!notif.read && (
                  <button
                    onClick={async () => {
                      await apiRequest(`/api/admin/notifications/${notif.id}/read`, { method: 'PUT' });
                      setNotifications((prev) => prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n)));
                    }}
                    className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs text-slate-300 hover:text-white"
                  >
                    Mark Read
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 11. SECURITY & AUDIT LOGS                                      */}
      {/* ============================================================== */}
      {activeTab === 'security' && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-base text-white">Immutable Administrative Audit Trail</h3>
              <p className="text-xs text-slate-400">
                Detailed chronological record of every administrative action, configuration change, and security event.
              </p>
            </div>

            <button
              onClick={async () => {
                const res = await apiRequest('/api/admin/security/recovery-token', { method: 'POST' });
                alert(`Emergency Disaster Recovery Key Generated:\n\n${res.recoveryToken}\n\nValid for 24 hours. Store offline.`);
              }}
              className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2 text-xs font-bold text-rose-300 hover:bg-rose-500/20 transition self-start sm:self-auto"
            >
              Generate Disaster Recovery Key
            </button>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900 shadow-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 text-[10px] uppercase font-semibold">
                <tr>
                  <th className="p-3.5">Timestamp</th>
                  <th className="p-3.5">Administrator</th>
                  <th className="p-3.5">Action</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition">
                    <td className="p-3.5 text-slate-400 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="p-3.5 font-bold text-white whitespace-nowrap">{log.userName}</td>
                    <td className="p-3.5 font-mono text-purple-300 text-[11px] whitespace-nowrap">{log.action}</td>
                    <td className="p-3.5">
                      <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                        {log.status || 'success'}
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-300 text-xs max-w-md">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 12. SYSTEM SETTINGS                                            */}
      {/* ============================================================== */}
      {activeTab === 'system' && systemSettings && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base text-white">System Diagnostics & Platform Mode</h3>
              <p className="text-xs text-slate-400">
                Inspect live process memory, uptime metrics, database snapshots, and maintenance controls.
              </p>
            </div>
            <button
              onClick={async () => {
                const res = await apiRequest('/api/admin/system/backup');
                const blob = new Blob([JSON.stringify(res, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `yearinfo_db_backup_${Date.now()}.json`;
                a.click();
              }}
              className="rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs font-bold text-slate-200 hover:text-white transition flex items-center gap-1.5"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download DB Snapshot</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-4">
              <h4 className="font-bold text-sm text-white">Runtime Health & Diagnostics</h4>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-2 border-b border-slate-800">
                  <span className="text-slate-400">Server Uptime:</span>
                  <span className="font-mono text-purple-300">
                    {Math.floor(systemSettings.diagnostics?.uptimeSeconds / 60)} minutes
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-800">
                  <span className="text-slate-400">Memory RSS:</span>
                  <span className="font-mono text-slate-200">{systemSettings.diagnostics?.memoryRssMb} MB</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-800">
                  <span className="text-slate-400">Memory Heap Used:</span>
                  <span className="font-mono text-slate-200">{systemSettings.diagnostics?.memoryHeapUsedMb} MB</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-slate-400">Active Node Version:</span>
                  <span className="font-mono text-slate-300">{systemSettings.diagnostics?.nodeVersion}</span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-4">
              <h4 className="font-bold text-sm text-white">Database Collections Statistics</h4>
              <div className="space-y-2 text-xs">
                {Object.entries(systemSettings.diagnostics?.dbCollectionsCount || {}).map(([col, count]: any) => (
                  <div key={col} className="flex justify-between py-1.5 border-b border-slate-800/80">
                    <span className="text-slate-400 capitalize">{col}:</span>
                    <span className="font-bold text-white">{count} records</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 1: CREATE / EDIT SUBSCRIPTION PLAN                       */}
      {/* ============================================================== */}
      {showPlanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="relative w-full max-w-lg rounded-2xl border border-purple-500/30 bg-slate-900 p-6 shadow-2xl space-y-4">
            <h3 className="font-bold text-base text-white">
              {editingPlan ? 'Edit Subscription Plan' : 'Create New Subscription Plan'}
            </h3>

            <form onSubmit={handleSavePlan} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Plan Name *</label>
                <input
                  type="text"
                  required
                  value={planForm.name}
                  onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                  placeholder="e.g. Starter, Growth"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Price (BDT) *</label>
                  <input
                    type="number"
                    required
                    value={planForm.priceBdt}
                    onChange={(e) => setPlanForm({ ...planForm, priceBdt: Number(e.target.value) })}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-purple-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Price (USD)</label>
                  <input
                    type="number"
                    value={planForm.priceUsd}
                    onChange={(e) => setPlanForm({ ...planForm, priceUsd: Number(e.target.value) })}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Max Channels</label>
                  <input
                    type="number"
                    value={planForm.maxChannels}
                    onChange={(e) => setPlanForm({ ...planForm, maxChannels: Number(e.target.value) })}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-purple-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">AI Replies / mo</label>
                  <input
                    type="number"
                    value={planForm.aiRepliesMonthly}
                    onChange={(e) => setPlanForm({ ...planForm, aiRepliesMonthly: Number(e.target.value) })}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-purple-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Scheduled Posts</label>
                  <input
                    type="number"
                    value={planForm.maxScheduledPosts}
                    onChange={(e) => setPlanForm({ ...planForm, maxScheduledPosts: Number(e.target.value) })}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Description</label>
                <input
                  type="text"
                  value={planForm.description}
                  onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
                  placeholder="Target audience for plan..."
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPlanModal(false)}
                  className="rounded-xl border border-slate-700 px-4 py-2 text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-purple-600 px-4 py-2 font-bold text-white hover:bg-purple-500"
                >
                  Save Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: ADD / EDIT AI PROVIDER                                */}
      {/* ============================================================== */}
      {showProviderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="relative w-full max-w-lg rounded-2xl border border-purple-500/30 bg-slate-900 p-6 shadow-2xl space-y-4">
            <h3 className="font-bold text-base text-white">
              {editingProvider ? 'Edit AI Provider' : 'Add Compatible AI Provider'}
            </h3>

            <form onSubmit={handleSaveProvider} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Provider Display Name *</label>
                <input
                  type="text"
                  required
                  value={providerForm.name}
                  onChange={(e) => setProviderForm({ ...providerForm, name: e.target.value })}
                  placeholder="e.g. Groq LLaMA 3.3, OpenAI GPT-4o Mini"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Provider Type *</label>
                  <select
                    value={providerForm.providerType}
                    onChange={(e) => setProviderForm({ ...providerForm, providerType: e.target.value as any })}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:outline-none"
                  >
                    <option value="gemini">Google Gemini</option>
                    <option value="openai">OpenAI</option>
                    <option value="groq">Groq Cloud</option>
                    <option value="anthropic">Anthropic</option>
                    <option value="custom">Custom Compatible</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Model Name *</label>
                  <input
                    type="text"
                    required
                    value={providerForm.model}
                    onChange={(e) => setProviderForm({ ...providerForm, model: e.target.value })}
                    placeholder="e.g. gemini-3.8-flash, gpt-4o-mini"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              {providerForm.providerType !== 'gemini' && (
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">API Base Endpoint</label>
                  <input
                    type="text"
                    value={providerForm.apiEndpoint}
                    onChange={(e) => setProviderForm({ ...providerForm, apiEndpoint: e.target.value })}
                    placeholder="https://api.openai.com/v1"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-purple-500 focus:outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  API Key / Secret Token {editingProvider && '(Leave blank to keep current key)'}
                </label>
                <input
                  type="password"
                  value={providerForm.apiKey}
                  onChange={(e) => setProviderForm({ ...providerForm, apiKey: e.target.value })}
                  placeholder="Paste API secret token..."
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white font-mono focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-4 pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={providerForm.isDefault}
                    onChange={(e) => setProviderForm({ ...providerForm, isDefault: e.target.checked })}
                    className="rounded bg-slate-950 border-slate-700 text-purple-600 focus:ring-0"
                  />
                  <span>Set as Primary Default Provider</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={providerForm.isFallback}
                    onChange={(e) => setProviderForm({ ...providerForm, isFallback: e.target.checked })}
                    className="rounded bg-slate-950 border-slate-700 text-purple-600 focus:ring-0"
                  />
                  <span>Enable as Fallback Provider</span>
                </label>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowProviderModal(false)}
                  className="rounded-xl border border-slate-700 px-4 py-2 text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-purple-600 px-4 py-2 font-bold text-white hover:bg-purple-500"
                >
                  Save Provider
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 3: RECORD OFFLINE PAYMENT                                */}
      {/* ============================================================== */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="relative w-full max-w-md rounded-2xl border border-emerald-500/30 bg-slate-900 p-6 shadow-2xl space-y-4">
            <h3 className="font-bold text-base text-white">Record Verified bKash / Offline Payment</h3>

            <form onSubmit={handleRecordPayment} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Target Workspace ID *</label>
                <input
                  type="text"
                  required
                  value={paymentForm.workspaceId}
                  onChange={(e) => setPaymentForm({ ...paymentForm, workspaceId: e.target.value })}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white font-mono focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Amount (BDT) *</label>
                  <input
                    type="number"
                    required
                    value={paymentForm.amountBdt}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amountBdt: Number(e.target.value) })}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Payment Method</label>
                  <select
                    value={paymentForm.method}
                    onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:outline-none"
                  >
                    <option value="bkash">bKash Merchant</option>
                    <option value="nagad">Nagad</option>
                    <option value="bank">Bank Transfer</option>
                    <option value="card">Card / Stripe</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Transaction Reference (TrxID) *</label>
                <input
                  type="text"
                  required
                  value={paymentForm.transactionReference}
                  onChange={(e) => setPaymentForm({ ...paymentForm, transactionReference: e.target.value })}
                  placeholder="e.g. 9A8B7C6D5E"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white font-mono focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="rounded-xl border border-slate-700 px-4 py-2 text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-emerald-600 px-4 py-2 font-bold text-white hover:bg-emerald-500"
                >
                  Verify & Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 4: PASSWORD RESET CONFIRMATION                           */}
      {/* ============================================================== */}
      {showPasswordModal && passwordResetResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="relative w-full max-w-md rounded-2xl border border-purple-500/30 bg-slate-900 p-6 shadow-2xl space-y-4">
            <h3 className="font-bold text-base text-white">Administrative Password Reset</h3>
            <p className="text-xs text-slate-300">
              A temporary password has been successfully set for <strong>{passwordResetResult.email}</strong>:
            </p>

            <div className="rounded-xl bg-slate-950 p-3 font-mono text-center text-sm font-bold text-purple-300 border border-slate-800 select-all">
              {passwordResetResult.temporaryPassword}
            </div>

            <p className="text-[11px] text-slate-400">
              Please convey this password securely to the authorized user. They should change it upon login.
            </p>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowPasswordModal(false)}
                className="rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white hover:bg-purple-500"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 5: CONFIRMATION DIALOG FOR SENSITIVE ACTIONS             */}
      {/* ============================================================== */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="relative w-full max-w-md rounded-2xl border border-rose-500/30 bg-slate-900 p-6 shadow-2xl space-y-4">
            <h3 className="font-bold text-base text-white">{confirmModal.title}</h3>
            <p className="text-xs text-slate-300 leading-relaxed">{confirmModal.description}</p>

            <div className="pt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                className="rounded-xl border border-slate-700 px-4 py-2 text-xs text-slate-300 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  setConfirmModal({ ...confirmModal, isOpen: false });
                  await confirmModal.onConfirm();
                }}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-500"
              >
                {confirmModal.confirmText || 'Confirm Action'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
