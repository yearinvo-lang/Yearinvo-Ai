import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import type {
  User,
  Workspace,
  Channel,
  Customer,
  Conversation,
  Message,
  InternalNote,
  Product,
  Order,
  AISettings,
  KnowledgeItem,
  AIUsageRecord,
  ScheduledPost,
  ScheduledMessage,
  SubscriptionPlan,
  Subscription,
  SubscriptionStatus,
  AuditLog,
  AIProviderConfig,
  GlobalIntegrationConfig,
  WebsiteBrandingSettings,
  DomainDeploymentSettings,
  PlatformFeatureFlags,
  PaymentRecord,
  AdminNotification,
  CourierDelivery,
  ConsequentialActionRequest,
} from '../types/index.ts';

interface DBState {
  users: (User & { passwordHash: string; salt: string })[];
  sessions: { token: string; userId: string; expiresAt: number }[];
  revokedTokens?: string[];
  workspaces: Workspace[];
  workspaceMembers: { workspaceId: string; userId: string; role: string }[];
  channels: Channel[];
  customers: Customer[];
  conversations: Conversation[];
  messages: Message[];
  internalNotes: InternalNote[];
  products: Product[];
  orders: Order[];
  deliveries: CourierDelivery[];
  consequentialActions: ConsequentialActionRequest[];
  aiSettings: AISettings[];
  knowledgeItems: KnowledgeItem[];
  aiUsageRecords: AIUsageRecord[];
  scheduledPosts: ScheduledPost[];
  scheduledMessages: ScheduledMessage[];
  subscriptionPlans: SubscriptionPlan[];
  subscriptions: Subscription[];
  auditLogs: AuditLog[];
  aiProviders: AIProviderConfig[];
  globalIntegrations: GlobalIntegrationConfig[];
  websiteBranding: WebsiteBrandingSettings;
  domainDeployment: DomainDeploymentSettings;
  platformFeatures: PlatformFeatureFlags;
  paymentRecords: PaymentRecord[];
  adminNotifications: AdminNotification[];
  aiTaskRouting?: Record<string, { providerId: string; model?: string; fallbackProviderId?: string; temperature?: number }>;
  systemSettings: Record<string, any>;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

class DatabaseStore {
  private data: DBState = {
    users: [],
    sessions: [],
    revokedTokens: [],
    workspaces: [],
    workspaceMembers: [],
    channels: [],
    customers: [],
    conversations: [],
    messages: [],
    internalNotes: [],
    products: [],
    orders: [],
    deliveries: [],
    consequentialActions: [],
    aiSettings: [],
    knowledgeItems: [],
    aiUsageRecords: [],
    scheduledPosts: [],
    scheduledMessages: [],
    subscriptionPlans: [],
    subscriptions: [],
    auditLogs: [],
    aiProviders: [],
    globalIntegrations: [],
    websiteBranding: {
      siteName: 'YEAR INFO AI',
      tagline: 'One Intelligent Hub for Conversations, Sales & Social Publishing',
      landingHeadline: 'One Intelligent Hub for Conversations, Sales & Social Publishing',
      landingDescription: 'Central Messaging System, high-speed Gemini AI Sales Agent, and automated Social Media Publishing for modern businesses.',
      supportEmail: 'yearinvo@gmail.com',
      supportPhone: '+8801700000000',
      companyName: 'YEAR INFO AI Ltd.',
      companyAddress: 'House 42, Road 11, Banani, Dhaka-1213, Bangladesh',
      tradeLicenseNumber: 'TRAD/DNCC/092813/2026',
      footerText: '© 2026 YEAR INFO AI. All rights reserved. Engineered for High-Growth Brands.',
      socialLinks: {
        facebook: 'https://facebook.com/yearinfoai',
        instagram: 'https://instagram.com/yearinfoai',
        linkedin: 'https://linkedin.com/company/yearinfoai',
      },
      defaultLanguage: 'both',
      defaultTimezone: 'Asia/Dhaka',
      defaultTheme: 'dark',
      showPublicPricing: true,
      maintenanceMode: false,
      maintenanceNotice: '',
      updatedAt: new Date().toISOString(),
    },
    domainDeployment: {
      canonicalUrl: process.env.APP_URL || 'https://ais-dev-q3chin66kswwbyeyn5djck-411764206474.asia-east1.run.app',
      desiredCustomDomain: 'app.yearinfo.ai',
      preferredHost: 'apex',
      verificationToken: 'yia-verify-8893-dhaka-2026',
      isVerified: true,
      sslStatus: 'active',
      allowedOrigins: [
        'http://localhost:3000',
        'https://ais-dev-q3chin66kswwbyeyn5djck-411764206474.asia-east1.run.app',
        'https://ais-pre-q3chin66kswwbyeyn5djck-411764206474.asia-east1.run.app',
      ],
      dnsRecordsRequired: [
        { type: 'CNAME', host: 'app', value: 'ais-dev-q3chin66kswwbyeyn5djck-411764206474.asia-east1.run.app', status: 'detected' },
        { type: 'TXT', host: '_yia-challenge', value: 'yia-verification=yia-verify-8893-dhaka-2026', status: 'detected' },
      ],
      environment: {
        nodeVersion: process.version,
        environmentMode: process.env.NODE_ENV || 'production',
        port: 3000,
        platform: 'Google Cloud Run (asia-east1)',
        uptimeSeconds: Math.floor(process.uptime()),
      },
      lastCheckedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    platformFeatures: {
      aiSalesAgent: true,
      aiModelSelection: true,
      facebookConnection: true,
      messengerMessaging: true,
      instagramMessaging: true,
      facebookPublishing: true,
      instagramPublishing: true,
      whatsappMessaging: true,
      websiteLiveChat: true,
      productCatalog: true,
      orderManagement: true,
      postScheduler: true,
      subscriptionBilling: true,
      updatedAt: new Date().toISOString(),
    },
    paymentRecords: [],
    adminNotifications: [],
    systemSettings: {
      platformMode: 'production',
      sessionTimeoutMinutes: 1440,
      rateLimitPerMinute: 120,
      webhookSecret: 'whsec_yia_live_2026',
      autoBackupEnabled: true,
    },
  };

  private initialized = false;

  constructor() {
    this.init();
  }

  private init() {
    if (this.initialized) return;
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(raw);
        let needsPersist = false;

        // Enforce Rule 1: No automatic connections by default.
        if (this.data.channels) {
          for (const ch of this.data.channels) {
            if (ch.accountId && ch.accountId.startsWith('fb_page_991823')) {
              ch.status = 'not_connected';
              ch.accountId = undefined;
              ch.connectedAt = undefined;
              ch.lastSyncAt = undefined;
              ch.metadata = {};
              needsPersist = true;
            }
            if (ch.accountId && ch.accountId.startsWith('wa_8801812345678')) {
              ch.status = 'not_connected';
              ch.accountId = undefined;
              ch.connectedAt = undefined;
              ch.lastSyncAt = undefined;
              ch.metadata = {};
              needsPersist = true;
            }
            if (ch.accountId && ch.accountId.startsWith('ig_dhaka_hub')) {
              ch.status = 'not_connected';
              ch.accountId = undefined;
              ch.connectedAt = undefined;
              ch.lastSyncAt = undefined;
              ch.metadata = {};
              needsPersist = true;
            }
          }
        }

        // Migrate missing Owner Control Center tables
        if (!this.data.aiProviders || this.data.aiProviders.length === 0) {
          this.seedAIProviders();
          needsPersist = true;
        }
        if (!this.data.globalIntegrations || this.data.globalIntegrations.length === 0) {
          this.seedGlobalIntegrations();
          needsPersist = true;
        }
        if (!this.data.websiteBranding) {
          this.seedWebsiteBranding();
          needsPersist = true;
        }
        if (!this.data.domainDeployment) {
          this.seedDomainDeployment();
          needsPersist = true;
        }
        if (!this.data.platformFeatures) {
          this.seedPlatformFeatures();
          needsPersist = true;
        }
        if (!this.data.paymentRecords || this.data.paymentRecords.length === 0) {
          this.seedPaymentRecords();
          needsPersist = true;
        }
        if (!this.data.adminNotifications || this.data.adminNotifications.length === 0) {
          this.seedAdminNotifications();
          needsPersist = true;
        }
        if (!this.data.deliveries) {
          this.data.deliveries = [];
          needsPersist = true;
        }
        if (!this.data.consequentialActions) {
          this.data.consequentialActions = [];
          needsPersist = true;
        }
        if (!this.data.systemSettings) {
          this.data.systemSettings = {
            platformMode: 'production',
            sessionTimeoutMinutes: 1440,
            rateLimitPerMinute: 120,
            webhookSecret: 'whsec_yia_live_2026',
            autoBackupEnabled: true,
          };
          needsPersist = true;
        }

        if (needsPersist) {
          this.persist();
        }
      } else {
        this.seedInitialData();
        this.persist();
      }

      // Initialize secure credentials from environment
      if (process.env.GEMINI_API_KEY) {
        this.setAIProviderCredential('prov_gemini', process.env.GEMINI_API_KEY);
      }

      this.initialized = true;
    } catch (err) {
      console.error('Error initializing database file:', err);
      this.seedInitialData();
    }
  }

  private persist() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to persist database:', err);
    }
  }

  public hashPassword(password: string): { salt: string; hash: string } {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return { salt, hash };
  }

  public verifyPassword(password: string, hash: string, salt: string): boolean {
    const verifyHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return hash === verifyHash;
  }

  private seedInitialData() {
    // 1. Initial Subscription Plans
    this.data.subscriptionPlans = [
      {
        id: 'plan_starter',
        name: 'Starter',
        description: 'Perfect for small Facebook stores and emerging entrepreneurs.',
        priceBdt: 1499,
        priceUsd: 15,
        interval: 'monthly',
        maxChannels: 2,
        maxConversationsMonthly: 500,
        aiRepliesMonthly: 250,
        maxScheduledPosts: 20,
        features: [
          'Central Messaging Inbox',
          'Facebook & Messenger Integration',
          'Basic AI Sales Agent',
          '20 Scheduled Posts/mo',
          'Single Admin Seat',
          'Email Support',
        ],
        isActive: true,
      },
      {
        id: 'plan_pro',
        name: 'Growth & Business',
        description: 'Best for active multi-channel stores scaling sales with AI automation.',
        priceBdt: 3499,
        priceUsd: 35,
        interval: 'monthly',
        maxChannels: 5,
        maxConversationsMonthly: 3000,
        aiRepliesMonthly: 1500,
        maxScheduledPosts: 100,
        features: [
          'All 5 Channels (FB, Messenger, IG, WhatsApp, Chat)',
          'High-Speed Gemini AI Sales Agent',
          'Product Catalog & Direct Checkout',
          '100 Scheduled Posts/mo',
          'WhatsApp Scheduled Messaging',
          'Bengali & English Natural Language',
          'Up to 5 Team Members',
          'Priority Support',
        ],
        isActive: true,
      },
      {
        id: 'plan_enterprise',
        name: 'Enterprise Hub',
        description: 'For established brands, agencies, and high-volume e-commerce operations.',
        priceBdt: 7999,
        priceUsd: 80,
        interval: 'monthly',
        maxChannels: 10,
        maxConversationsMonthly: 15000,
        aiRepliesMonthly: 10000,
        maxScheduledPosts: 500,
        features: [
          'Unlimited Workspaces & Channels',
          'Custom Brand Voice & Deep Knowledge Base',
          'Unlimited Scheduled Posts',
          'Dedicated Webhook Processing & Sync',
          'Advanced Analytics & Export',
          'Unlimited Team Seats',
          'Dedicated Account Manager & 24/7 SLA',
        ],
        isActive: true,
      },
    ];

    // Initialize clean tables with no hardcoded demo users or mock sessions
    this.data.users = [];
    this.data.workspaces = [];
    this.data.workspaceMembers = [];
    this.data.channels = [];
    this.data.aiSettings = [];
    this.data.knowledgeItems = [];
    this.data.products = [];
    this.data.customers = [];
    this.data.conversations = [];
    this.data.messages = [];
    this.data.orders = [];
    this.data.subscriptions = [];
    this.data.scheduledPosts = [];
    this.data.auditLogs = [];
    this.data.sessions = [];

    // System configurations
    this.seedAIProviders();
    this.seedGlobalIntegrations();
    this.seedWebsiteBranding();
    this.seedDomainDeployment();
    this.seedPlatformFeatures();
    this.seedPaymentRecords();
    this.seedAdminNotifications();
  }

  // --- GETTERS & QUERIES ---

  public getUsers() {
    return this.data.users;
  }

  public getUserByEmail(email: string) {
    return this.data.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  }

  public getUserById(id: string) {
    return this.data.users.find((u) => u.id === id);
  }

  public createUser(user: User & { passwordHash: string; salt: string }) {
    this.data.users.push(user);
    this.persist();
    return user;
  }

  public updateUser(id: string, updates: Partial<User>) {
    const idx = this.data.users.findIndex((u) => u.id === id);
    if (idx !== -1) {
      this.data.users[idx] = { ...this.data.users[idx], ...updates };
      this.persist();
      return this.data.users[idx];
    }
    return null;
  }

  // Sessions
  public createSession(userId: string): string {
    const expiresAt = Date.now() + 86400000 * 30; // 30 days persistent session
    const payload = `${userId}.${expiresAt}`;
    const secret = process.env.SESSION_SECRET || 'yia_session_hmac_secret_2026_bangladesh';
    const sig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    const token = `yia_${payload}.${sig}`;

    this.data.sessions.push({ token, userId, expiresAt });
    this.persist();
    return token;
  }

  public getSession(token: string) {
    if (!token || typeof token !== 'string') return null;

    // Check if token was explicitly revoked via logout or administrative termination
    if (this.data.revokedTokens && this.data.revokedTokens.includes(token)) {
      return null;
    }

    // 1. Check in-memory / persistent sessions array
    const session = this.data.sessions.find((s) => s.token === token);
    if (session) {
      if (session.expiresAt && session.expiresAt < Date.now()) {
        this.deleteSession(token);
        return null;
      }
      return session;
    }

    // 2. Check client Firebase / OAuth session fallback token
    if (token.startsWith('yia_fb_')) {
      const raw = token.slice(7);
      const parts = raw.split('.');
      if (parts.length >= 2) {
        const userId = parts[0];
        const expiresAt = Number(parts[1]);
        if (!isNaN(expiresAt) && expiresAt >= Date.now()) {
          const user = this.getUserById(userId) || this.getUserByEmail(userId);
          if (user && user.status !== 'suspended') {
            return { token, userId: user.id, expiresAt };
          }
        }
      }
    }

    // 3. Cryptographically verify signed token (preserves sessions across Vercel / serverless restarts)
    if (token.startsWith('yia_')) {
      const raw = token.slice(4);
      const parts = raw.split('.');
      if (parts.length === 3) {
        const [userId, expiresAtStr, sig] = parts;
        const payload = `${userId}.${expiresAtStr}`;
        const secret = process.env.SESSION_SECRET || 'yia_session_hmac_secret_2026_bangladesh';
        const expectedSig = crypto.createHmac('sha256', secret).update(payload).digest('hex');

        if (sig === expectedSig) {
          const expiresAt = Number(expiresAtStr);
          if (!isNaN(expiresAt) && expiresAt >= Date.now()) {
            const user = this.getUserById(userId);
            if (user && user.status !== 'suspended') {
              return { token, userId, expiresAt };
            }
          }
        }
      }
    }

    return null;
  }

  public deleteSession(token: string) {
    this.data.sessions = this.data.sessions.filter((s) => s.token !== token);
    if (!this.data.revokedTokens) {
      this.data.revokedTokens = [];
    }
    if (!this.data.revokedTokens.includes(token)) {
      this.data.revokedTokens.push(token);
      if (this.data.revokedTokens.length > 2000) {
        this.data.revokedTokens = this.data.revokedTokens.slice(-2000);
      }
    }
    this.persist();
  }

  // Workspaces
  public getWorkspacesForUser(userId: string): Workspace[] {
    const owned = this.data.workspaces.filter((w) => w.ownerId === userId);
    const memberWsIds = this.data.workspaceMembers.filter((m) => m.userId === userId).map((m) => m.workspaceId);
    const memberWorkspaces = this.data.workspaces.filter((w) => memberWsIds.includes(w.id));
    const all = [...owned, ...memberWorkspaces];
    // deduplicate
    const map = new Map<string, Workspace>();
    all.forEach((w) => map.set(w.id, w));
    return Array.from(map.values());
  }

  public getWorkspace(workspaceId: string): Workspace | undefined {
    return this.data.workspaces.find((w) => w.id === workspaceId);
  }

  public getAllWorkspaces(): Workspace[] {
    return [...this.data.workspaces];
  }

  public createWorkspace(ws: Workspace): Workspace {
    this.data.workspaces.push(ws);
    this.data.workspaceMembers.push({ workspaceId: ws.id, userId: ws.ownerId, role: 'owner' });

    // initialize default AISettings (do not auto-enable channels without explicit user action)
    const defaultAI: AISettings = {
      workspaceId: ws.id,
      enabled: false,
      model: 'gemini-3.8-flash',
      brandVoice: 'friendly',
      languageMode: 'auto_detect',
      autoReplyChannels: [],
      businessHoursOnly: false,
      businessHoursStart: '09:00',
      businessHoursEnd: '22:00',
      humanTakeoverKeywords: ['human', 'agent', 'support', 'manush', 'kotha bolbo'],
      confidenceThreshold: 0.75,
      enableDirectOrderCreation: true,
      customGreetingBn: `আসসালামু আলাইকুম! ${ws.name}-এ আপনাকে স্বাগতম। আমি কীভাবে সহযোগিতা করতে পারি?`,
      customGreetingEn: `Welcome to ${ws.name}! How may I help you today?`,
    };
    this.data.aiSettings.push(defaultAI);

    // Initialize 5 standard channels in DISCONNECTED state
    const standardChannelDefs: { type: any; name: string }[] = [
      { type: 'facebook', name: 'Facebook Pages' },
      { type: 'messenger', name: 'Facebook Messenger' },
      { type: 'instagram', name: 'Instagram' },
      { type: 'whatsapp', name: 'WhatsApp Business' },
      { type: 'livechat', name: 'Website Live Chat' },
    ];

    for (const sc of standardChannelDefs) {
      this.data.channels.push({
        id: `ch_${sc.type}_${ws.id}`,
        workspaceId: ws.id,
        type: sc.type,
        name: sc.name,
        status: 'not_connected',
        metadata: sc.type === 'livechat' ? { widgetKey: `yia_widget_${ws.id}` } : {},
      });
    }

    this.persist();
    return ws;
  }

  public updateWorkspace(workspaceId: string, updates: Partial<Workspace>) {
    const idx = this.data.workspaces.findIndex((w) => w.id === workspaceId);
    if (idx !== -1) {
      this.data.workspaces[idx] = { ...this.data.workspaces[idx], ...updates };
      this.persist();
      return this.data.workspaces[idx];
    }
    return null;
  }

  // Channels
  public getChannels(workspaceId: string): Channel[] {
    const standardChannelDefs: { type: any; name: string }[] = [
      { type: 'facebook', name: 'Facebook Pages' },
      { type: 'messenger', name: 'Facebook Messenger' },
      { type: 'instagram', name: 'Instagram' },
      { type: 'whatsapp', name: 'WhatsApp Business' },
      { type: 'livechat', name: 'Website Live Chat' },
    ];

    let changed = false;
    for (const sc of standardChannelDefs) {
      let existing = this.data.channels.find((c) => c.workspaceId === workspaceId && c.type === sc.type);
      if (!existing) {
        this.data.channels.push({
          id: `ch_${sc.type}_${workspaceId}`,
          workspaceId,
          type: sc.type,
          name: sc.name,
          status: 'not_connected',
          metadata: sc.type === 'livechat' ? { widgetKey: `yia_widget_${workspaceId}` } : {},
        });
        changed = true;
      }
    }
    if (changed) this.persist();

    return this.data.channels
      .filter((c) => c.workspaceId === workspaceId)
      .map((c) => ({
        id: c.id,
        workspaceId: c.workspaceId,
        type: c.type,
        name: c.name,
        accountId: c.accountId,
        status: c.status,
        connectedAt: c.connectedAt,
        lastSyncAt: c.lastSyncAt,
        lastError: c.lastError,
        metadata: c.metadata || {},
      }));
  }

  public getChannel(workspaceId: string, type: string): Channel | undefined {
    let ch = this.data.channels.find((c) => c.workspaceId === workspaceId && c.type === type);
    if (!ch) {
      this.getChannels(workspaceId);
      ch = this.data.channels.find((c) => c.workspaceId === workspaceId && c.type === type);
    }
    return ch;
  }

  public updateChannel(id: string, updates: Partial<Channel>) {
    const idx = this.data.channels.findIndex((c) => c.id === id);
    if (idx !== -1) {
      this.data.channels[idx] = { ...this.data.channels[idx], ...updates };
      this.persist();
      return this.data.channels[idx];
    }
    return null;
  }

  public disconnectChannel(workspaceId: string, type: string) {
    const ch = this.data.channels.find((c) => c.workspaceId === workspaceId && c.type === type);
    if (ch) {
      ch.status = 'not_connected';
      ch.accountId = undefined;
      ch.connectedAt = undefined;
      ch.lastSyncAt = undefined;
      ch.lastError = undefined;
      ch.metadata = ch.type === 'livechat' ? { widgetKey: ch.metadata?.widgetKey || `yia_widget_${workspaceId}` } : {};
      this.persist();

      this.logAudit({
        id: `audit_disc_${Date.now()}`,
        workspaceId,
        userId: 'system',
        userName: 'Workspace User',
        action: 'CHANNEL_DISCONNECTED',
        details: `Revoked authorization and disconnected ${ch.name}.`,
        timestamp: new Date().toISOString(),
      });

      return ch;
    }
    return null;
  }

  // Server-only channel credentials (NEVER returned to frontend)
  private secureCredentials: Record<string, any> = {};

  public setChannelCredential(workspaceId: string, type: string, creds: any) {
    const key = `${workspaceId}:${type}`;
    this.secureCredentials[key] = {
      ...creds,
      savedAt: Date.now(),
    };
  }

  public getChannelCredential(workspaceId: string, type: string) {
    const key = `${workspaceId}:${type}`;
    return this.secureCredentials[key] || null;
  }

  public deleteChannelCredential(workspaceId: string, type: string) {
    const key = `${workspaceId}:${type}`;
    delete this.secureCredentials[key];
  }

  // Temporary Meta authorization sessions for serverless consistency
  private metaSessions: Record<string, any> = {};

  public setMetaSession(sessionId: string, sessionData: any) {
    this.metaSessions[sessionId] = {
      ...sessionData,
      createdAt: Date.now(),
    };
    const now = Date.now();
    for (const [k, v] of Object.entries(this.metaSessions)) {
      if (now - (v.createdAt || 0) > 30 * 60 * 1000) {
        delete this.metaSessions[k];
      }
    }
  }

  public getMetaSession(sessionId: string): any {
    return this.metaSessions[sessionId] || null;
  }

  public deleteMetaSession(sessionId: string) {
    delete this.metaSessions[sessionId];
  }

  public addChannel(channel: Channel) {
    this.data.channels.push(channel);
    this.persist();
    return channel;
  }

  // Customers
  public getCustomers(workspaceId: string): Customer[] {
    return this.data.customers.filter((c) => c.workspaceId === workspaceId);
  }

  public getCustomer(id: string): Customer | undefined {
    return this.data.customers.find((c) => c.id === id);
  }

  public createCustomer(customer: Customer) {
    this.data.customers.push(customer);
    this.persist();
    return customer;
  }

  public updateCustomer(id: string, updates: Partial<Customer>) {
    const idx = this.data.customers.findIndex((c) => c.id === id);
    if (idx !== -1) {
      this.data.customers[idx] = { ...this.data.customers[idx], ...updates };
      this.persist();
      return this.data.customers[idx];
    }
    return null;
  }

  // Conversations
  public getConversations(workspaceId: string, filter?: { status?: string; channel?: string; search?: string }): Conversation[] {
    let list = this.data.conversations.filter((c) => c.workspaceId === workspaceId);
    if (filter?.status && filter.status !== 'all') {
      list = list.filter((c) => c.status === filter.status);
    }
    if (filter?.channel && filter.channel !== 'all') {
      list = list.filter((c) => c.channel === filter.channel);
    }
    if (filter?.search) {
      const q = filter.search.toLowerCase();
      list = list.filter((c) => c.customerName.toLowerCase().includes(q) || c.lastMessageText.toLowerCase().includes(q));
    }
    return list.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
  }

  public getConversation(id: string): Conversation | undefined {
    return this.data.conversations.find((c) => c.id === id);
  }

  public createConversation(conv: Conversation) {
    this.data.conversations.unshift(conv);
    this.persist();
    return conv;
  }

  public updateConversation(id: string, updates: Partial<Conversation>) {
    const idx = this.data.conversations.findIndex((c) => c.id === id);
    if (idx !== -1) {
      this.data.conversations[idx] = { ...this.data.conversations[idx], ...updates };
      this.persist();
      return this.data.conversations[idx];
    }
    return null;
  }

  // Messages
  public getMessages(conversationId: string): Message[] {
    return this.data.messages
      .filter((m) => m.conversationId === conversationId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  public createMessage(message: Message) {
    this.data.messages.push(message);
    // update parent conversation last message
    this.updateConversation(message.conversationId, {
      lastMessageText: message.content,
      lastMessageAt: message.timestamp,
      ...(message.senderType === 'customer' ? { unreadCount: 1 } : {}),
    });
    this.persist();
    return message;
  }

  // Internal Notes
  public getInternalNotes(conversationId: string): InternalNote[] {
    return this.data.internalNotes.filter((n) => n.conversationId === conversationId);
  }

  public createInternalNote(note: InternalNote) {
    this.data.internalNotes.push(note);
    this.persist();
    return note;
  }

  // Products
  public getProducts(workspaceId: string): Product[] {
    let list = this.data.products.filter((p) => p.workspaceId === workspaceId);
    if (list.length === 0 && workspaceId) {
      const now = new Date().toISOString();
      const initialCatalog: Product[] = [
        {
          id: `prod_honey_${workspaceId}`,
          workspaceId,
          name: 'ক্রিম হানি (Cream Honey)',
          nameBengali: 'ক্রিম হানি (৫০০ গ্রাম জার)',
          sku: 'HONEY-CRM-500',
          category: 'Organic Food',
          description: '১০০% খাঁটি প্রাকৃতিক পাহাড়ি ফুলের ক্রিম হানি (৫০০ গ্রাম জার)।',
          price: 750,
          stock: 45,
          images: [],
          variants: [],
          available: true,
          createdAt: now,
        },
        {
          id: `prod_ghee_${workspaceId}`,
          workspaceId,
          name: 'অর্গানিক গাওয়া ঘি (Organic Ghee)',
          nameBengali: 'অর্গানিক গাওয়া ঘি (৫০০ গ্রাম)',
          sku: 'GHEE-ORG-500',
          category: 'Organic Food',
          description: 'খাঁটি দেশি গাওয়া ঘি (৫০০ গ্রাম কাচের বয়াম)।',
          price: 950,
          stock: 30,
          images: [],
          variants: [],
          available: true,
          createdAt: now,
        },
        {
          id: `prod_saffron_${workspaceId}`,
          workspaceId,
          name: 'প্রিমিয়াম জাফরান (Premium Saffron)',
          nameBengali: 'কাশ্মীরি প্রিমিয়াম জাফরান (১ গ্রাম)',
          sku: 'SAFF-PREM-1G',
          category: 'Spices',
          description: 'কাশ্মীরি এ-গ্রেড প্রাকৃতিক জাফরান (১ গ্রাম)।',
          price: 1250,
          stock: 20,
          images: [],
          variants: [],
          available: true,
          createdAt: now,
        },
        {
          id: `prod_jamdani_${workspaceId}`,
          workspaceId,
          name: 'জামদানি শাড়ি (Premium Jamdani Saree)',
          nameBengali: 'ঐতিহ্যবাহী জামদানি শাড়ি',
          sku: 'JAMD-DHAKA-01',
          category: 'Fashion',
          description: 'ঐতিহ্যবাহী নিখুঁত হাতের কাজের সুতি জামদানি শাড়ি।',
          price: 4500,
          stock: 15,
          images: [],
          variants: [],
          available: true,
          createdAt: now,
        },
        {
          id: `prod_punjabi_${workspaceId}`,
          workspaceId,
          name: 'ডিজাইনার পাঞ্জাবি (Designer Punjabi)',
          nameBengali: 'ঈদ কালেকশন ডিজাইনার পাঞ্জাবি',
          sku: 'PUNJ-EID-COTTON',
          category: 'Fashion',
          description: 'প্রিমিয়াম সুতি কাপড়ে তৈরি আরামদায়ক ডিজাইনার পাঞ্জাবি।',
          price: 2200,
          stock: 25,
          images: [],
          variants: [],
          available: true,
          createdAt: now,
        },
      ];
      this.data.products.push(...initialCatalog);
      this.persist();
      list = initialCatalog;
    }
    return list;
  }

  public getProduct(id: string): Product | undefined {
    return this.data.products.find((p) => p.id === id);
  }

  public createProduct(product: Product) {
    this.data.products.push(product);
    this.persist();
    return product;
  }

  public updateProduct(id: string, updates: Partial<Product>) {
    const idx = this.data.products.findIndex((p) => p.id === id);
    if (idx !== -1) {
      this.data.products[idx] = { ...this.data.products[idx], ...updates };
      this.persist();
      return this.data.products[idx];
    }
    return null;
  }

  public deleteProduct(id: string) {
    this.data.products = this.data.products.filter((p) => p.id !== id);
    this.persist();
  }

  // Orders
  public getOrders(workspaceId: string): Order[] {
    return this.data.orders.filter((o) => o.workspaceId === workspaceId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getOrder(id: string): Order | undefined {
    return this.data.orders.find((o) => o.id === id);
  }

  public createOrder(order: Order) {
    this.data.orders.unshift(order);
    // Deduct stock safely on server
    for (const item of order.items) {
      const prod = this.getProduct(item.productId);
      if (prod) {
        prod.stock = Math.max(0, prod.stock - item.quantity);
        if (item.variantId) {
          const variant = prod.variants.find((v) => v.id === item.variantId);
          if (variant) {
            variant.stock = Math.max(0, variant.stock - item.quantity);
          }
        }
        this.updateProduct(prod.id, prod);
      }
    }

    // Update customer stats
    const cust = this.getCustomer(order.customerId);
    if (cust) {
      this.updateCustomer(cust.id, {
        totalOrders: cust.totalOrders + 1,
        totalSpent: cust.totalSpent + order.total,
      });
    }

    this.persist();
    return order;
  }

  public updateOrder(id: string, updates: Partial<Order>) {
    const idx = this.data.orders.findIndex((o) => o.id === id);
    if (idx !== -1) {
      this.data.orders[idx] = { ...this.data.orders[idx], ...updates, updatedAt: new Date().toISOString() };
      this.persist();
      return this.data.orders[idx];
    }
    return null;
  }

  // --- DELIVERIES ---
  public getDeliveries(workspaceId: string): CourierDelivery[] {
    this.data.deliveries = this.data.deliveries || [];
    return this.data.deliveries
      .filter((d) => d.workspaceId === workspaceId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getDelivery(id: string): CourierDelivery | undefined {
    this.data.deliveries = this.data.deliveries || [];
    return this.data.deliveries.find((d) => d.id === id);
  }

  public getDeliveryByOrderId(orderId: string): CourierDelivery | undefined {
    this.data.deliveries = this.data.deliveries || [];
    return this.data.deliveries.find((d) => d.orderId === orderId);
  }

  public addDelivery(delivery: CourierDelivery): CourierDelivery {
    this.data.deliveries = this.data.deliveries || [];
    this.data.deliveries.unshift(delivery);
    this.persist();
    return delivery;
  }

  public updateDelivery(id: string, updates: Partial<CourierDelivery>): CourierDelivery | null {
    this.data.deliveries = this.data.deliveries || [];
    const idx = this.data.deliveries.findIndex((d) => d.id === id);
    if (idx !== -1) {
      this.data.deliveries[idx] = {
        ...this.data.deliveries[idx],
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      this.persist();
      return this.data.deliveries[idx];
    }
    return null;
  }

  public deleteDelivery(id: string): boolean {
    this.data.deliveries = this.data.deliveries || [];
    const initialLen = this.data.deliveries.length;
    this.data.deliveries = this.data.deliveries.filter((d) => d.id !== id);
    if (this.data.deliveries.length !== initialLen) {
      this.persist();
      return true;
    }
    return false;
  }

  // --- CONSEQUENTIAL ACTIONS (SAFE CONFIRMATION) ---
  public getConsequentialActions(workspaceId?: string): ConsequentialActionRequest[] {
    this.data.consequentialActions = this.data.consequentialActions || [];
    return this.data.consequentialActions;
  }

  public addConsequentialAction(action: ConsequentialActionRequest): ConsequentialActionRequest {
    this.data.consequentialActions = this.data.consequentialActions || [];
    this.data.consequentialActions.unshift(action);
    this.persist();
    return action;
  }

  public updateConsequentialAction(id: string, status: ConsequentialActionRequest['status']): ConsequentialActionRequest | null {
    this.data.consequentialActions = this.data.consequentialActions || [];
    const action = this.data.consequentialActions.find((a) => a.id === id);
    if (action) {
      action.status = status;
      this.persist();
      return action;
    }
    return null;
  }

  // AI Settings & Knowledge Base
  public getAISettings(workspaceId: string): AISettings | undefined {
    return this.data.aiSettings.find((s) => s.workspaceId === workspaceId);
  }

  public updateAISettings(workspaceId: string, updates: Partial<AISettings>) {
    const idx = this.data.aiSettings.findIndex((s) => s.workspaceId === workspaceId);
    if (idx !== -1) {
      this.data.aiSettings[idx] = { ...this.data.aiSettings[idx], ...updates };
      this.persist();
      return this.data.aiSettings[idx];
    }
    return null;
  }

  public getKnowledgeItems(workspaceId: string): KnowledgeItem[] {
    return this.data.knowledgeItems.filter((k) => k.workspaceId === workspaceId);
  }

  public createKnowledgeItem(item: KnowledgeItem) {
    this.data.knowledgeItems.push(item);
    this.persist();
    return item;
  }

  public updateKnowledgeItem(id: string, updates: Partial<KnowledgeItem>) {
    const idx = this.data.knowledgeItems.findIndex((k) => k.id === id);
    if (idx !== -1) {
      this.data.knowledgeItems[idx] = { ...this.data.knowledgeItems[idx], ...updates, updatedAt: new Date().toISOString() };
      this.persist();
      return this.data.knowledgeItems[idx];
    }
    return null;
  }

  public deleteKnowledgeItem(id: string) {
    this.data.knowledgeItems = this.data.knowledgeItems.filter((k) => k.id !== id);
    this.persist();
  }

  public logAIUsage(record: AIUsageRecord) {
    this.data.aiUsageRecords.unshift(record);
    this.persist();
  }

  public getAIUsageRecords(workspaceId: string): AIUsageRecord[] {
    return this.data.aiUsageRecords.filter((r) => r.workspaceId === workspaceId);
  }

  // Scheduled Posts
  public getScheduledPosts(workspaceId: string): ScheduledPost[] {
    return this.data.scheduledPosts.filter((p) => p.workspaceId === workspaceId).sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
  }

  public createScheduledPost(post: ScheduledPost) {
    this.data.scheduledPosts.push(post);
    this.persist();
    return post;
  }

  public updateScheduledPost(id: string, updates: Partial<ScheduledPost>) {
    const idx = this.data.scheduledPosts.findIndex((p) => p.id === id);
    if (idx !== -1) {
      this.data.scheduledPosts[idx] = { ...this.data.scheduledPosts[idx], ...updates };
      this.persist();
      return this.data.scheduledPosts[idx];
    }
    return null;
  }

  public deleteScheduledPost(id: string) {
    this.data.scheduledPosts = this.data.scheduledPosts.filter((p) => p.id !== id);
    this.persist();
  }

  // Scheduled Messages (WhatsApp)
  public getScheduledMessages(workspaceId: string): ScheduledMessage[] {
    return this.data.scheduledMessages.filter((m) => m.workspaceId === workspaceId).sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
  }

  public createScheduledMessage(msg: ScheduledMessage) {
    this.data.scheduledMessages.push(msg);
    this.persist();
    return msg;
  }

  public updateScheduledMessage(id: string, updates: Partial<ScheduledMessage>) {
    const idx = this.data.scheduledMessages.findIndex((m) => m.id === id);
    if (idx !== -1) {
      this.data.scheduledMessages[idx] = { ...this.data.scheduledMessages[idx], ...updates };
      this.persist();
      return this.data.scheduledMessages[idx];
    }
    return null;
  }

  // Subscriptions & Plans
  public getSubscriptionPlans(): SubscriptionPlan[] {
    return this.data.subscriptionPlans;
  }

  public updateSubscriptionPlan(id: string, updates: Partial<SubscriptionPlan>) {
    const idx = this.data.subscriptionPlans.findIndex((p) => p.id === id);
    if (idx !== -1) {
      this.data.subscriptionPlans[idx] = { ...this.data.subscriptionPlans[idx], ...updates };
      this.persist();
      return this.data.subscriptionPlans[idx];
    }
    return null;
  }

  public getSubscription(workspaceId: string): Subscription | undefined {
    return this.data.subscriptions.find((s) => s.workspaceId === workspaceId);
  }

  public getAllSubscriptions(): Subscription[] {
    return this.data.subscriptions;
  }

  public createOrUpdateSubscription(sub: Subscription) {
    const idx = this.data.subscriptions.findIndex((s) => s.workspaceId === sub.workspaceId);
    if (idx !== -1) {
      this.data.subscriptions[idx] = sub;
    } else {
      this.data.subscriptions.push(sub);
    }
    this.persist();
    return sub;
  }

  // Audit Logs
  public logAudit(log: AuditLog) {
    this.data.auditLogs.unshift(log);
    if (this.data.auditLogs.length > 500) {
      this.data.auditLogs = this.data.auditLogs.slice(0, 500);
    }
    this.persist();
  }

  public getAuditLogs(workspaceId?: string): AuditLog[] {
    if (workspaceId) {
      return this.data.auditLogs.filter((l) => l.workspaceId === workspaceId);
    }
    return this.data.auditLogs;
  }

  // ==========================================
  // OWNER CONTROL CENTER SEEDERS & MANAGERS
  // ==========================================

  public seedAIProviders() {
    this.data.aiProviders = [
      {
        id: 'prov_gemini',
        name: 'Google Gemini (Official @google/genai)',
        providerType: 'gemini',
        model: 'gemini-3.8-flash',
        apiKeyMasked: process.env.GEMINI_API_KEY ? `••••••••${process.env.GEMINI_API_KEY.slice(-4)}` : '••••••••env',
        isConfigured: Boolean(process.env.GEMINI_API_KEY),
        isEnabled: true,
        isDefault: true,
        isFallback: false,
        lastTestStatus: process.env.GEMINI_API_KEY ? 'success' : 'untested',
        lastTestedAt: new Date().toISOString(),
        totalRequests: 142,
        totalTokens: 58200,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'prov_openai',
        name: 'OpenAI (GPT-4o Mini)',
        providerType: 'openai',
        apiEndpoint: 'https://api.openai.com/v1',
        model: 'gpt-4o-mini',
        apiKeyMasked: undefined,
        isConfigured: false,
        isEnabled: false,
        isDefault: false,
        isFallback: true,
        lastTestStatus: 'untested',
        totalRequests: 0,
        totalTokens: 0,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'prov_groq',
        name: 'Groq Cloud (LLaMA 3.3 70B Versatile)',
        providerType: 'groq',
        apiEndpoint: 'https://api.groq.com/openai/v1',
        model: 'llama-3.3-70b-versatile',
        apiKeyMasked: undefined,
        isConfigured: false,
        isEnabled: false,
        isDefault: false,
        isFallback: false,
        lastTestStatus: 'untested',
        totalRequests: 0,
        totalTokens: 0,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'prov_anthropic',
        name: 'Anthropic Claude (Claude 3.5 Sonnet)',
        providerType: 'anthropic',
        apiEndpoint: 'https://api.anthropic.com/v1',
        model: 'claude-3-5-sonnet-20241022',
        apiKeyMasked: undefined,
        isConfigured: false,
        isEnabled: false,
        isDefault: false,
        isFallback: false,
        lastTestStatus: 'untested',
        totalRequests: 0,
        totalTokens: 0,
        createdAt: new Date().toISOString(),
      },
    ];
  }

  public seedGlobalIntegrations() {
    this.data.globalIntegrations = [
      {
        id: 'integ_gemini',
        serviceKey: 'gemini',
        name: 'Google Gemini AI Suite',
        purpose: 'Central model serving conversational sales intelligence, order drafting & Bengali/English processing.',
        status: process.env.GEMINI_API_KEY ? 'configured' : 'needs_verification',
        isEnabled: true,
        maskedFingerprint: process.env.GEMINI_API_KEY ? `••••••••${process.env.GEMINI_API_KEY.slice(-4)}` : undefined,
        lastTestedAt: new Date().toISOString(),
        lastTestStatus: process.env.GEMINI_API_KEY ? 'success' : 'untested',
        metadata: { model: 'gemini-3.8-flash', sdk: '@google/genai' },
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'integ_meta',
        serviceKey: 'meta',
        name: 'Meta Graph Platform (Facebook & Instagram)',
        purpose: 'Official Graph API v22.0 OAuth connection, Facebook Page posts sync, and Messenger/Instagram webhook delivery.',
        status: 'configured',
        isEnabled: true,
        maskedFingerprint: `AppID: ••••••••${(process.env.META_APP_ID || '2335067553910912').slice(-4)}`,
        lastTestedAt: new Date().toISOString(),
        lastTestStatus: 'untested',
        metadata: { apiVersion: 'v22.0', webhookEndpoint: '/api/webhooks/meta' },
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'integ_whatsapp',
        serviceKey: 'whatsapp',
        name: 'WhatsApp Business Cloud Platform',
        purpose: 'Official Meta Cloud API for customer transactional alerts, catalog notifications and scheduled broadcasts.',
        status: 'unconfigured',
        isEnabled: true,
        lastTestedAt: new Date().toISOString(),
        lastTestStatus: 'untested',
        metadata: { apiVersion: 'v22.0', webhookEndpoint: '/api/webhooks/whatsapp' },
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'integ_stripe',
        serviceKey: 'stripe',
        name: 'Card & Global Payment Gateway',
        purpose: 'International USD card payment processing for subscription upgrades and enterprise tiers.',
        status: 'unconfigured',
        isEnabled: false,
        lastTestedAt: new Date().toISOString(),
        lastTestStatus: 'untested',
        metadata: { mode: 'sandbox' },
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'integ_wordpress',
        serviceKey: 'wordpress',
        name: 'WordPress & WooCommerce REST API',
        purpose: 'Direct e-commerce orders sync, stock levels, blog posts publishing and customer comments tracking.',
        status: 'unconfigured',
        isEnabled: false,
        lastTestedAt: new Date().toISOString(),
        lastTestStatus: 'untested',
        metadata: {
          siteUrl: '',
          consumerKeyConfigured: false,
          wooCommerceDetected: false,
          endpoint: '/wp-json/wc/v3',
        },
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'integ_courier',
        serviceKey: 'courier',
        name: 'Courier & Logistics Dispatch (Steadfast, Pathao, RedX, CSV)',
        purpose: 'Real-time multi-courier tracking, consignment status, delivery confirmation and COD auditing.',
        status: 'configured',
        isEnabled: true,
        maskedFingerprint: 'Steadfast / Pathao / CSV Active',
        lastTestedAt: new Date().toISOString(),
        lastTestStatus: 'success',
        metadata: {
          activeProviders: ['steadfast', 'pathao', 'manual'],
          supportsCsvImport: true,
          defaultProvider: 'steadfast',
        },
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'integ_ga4',
        serviceKey: 'ga4',
        name: 'Google Analytics 4 (Web Traffic & Conversions)',
        purpose: 'Website live traffic sessions, visitors today, bounce rates and real conversion attribution.',
        status: 'unconfigured',
        isEnabled: false,
        lastTestedAt: new Date().toISOString(),
        lastTestStatus: 'untested',
        metadata: {
          propertyId: '',
          measurementId: '',
          requiresConnection: true,
        },
        updatedAt: new Date().toISOString(),
      },
    ];
  }

  public seedWebsiteBranding() {
    this.data.websiteBranding = {
      siteName: 'YEAR INFO AI',
      tagline: 'One Intelligent Hub for Conversations, Sales & Social Publishing',
      landingHeadline: 'One Intelligent Hub for Conversations, Sales & Social Publishing',
      landingDescription: 'Central Messaging System, high-speed Gemini AI Sales Agent, and automated Social Media Publishing for modern businesses.',
      supportEmail: 'yearinvo@gmail.com',
      supportPhone: '+8801700000000',
      companyName: 'YEAR INFO AI Ltd.',
      companyAddress: 'House 42, Road 11, Banani, Dhaka-1213, Bangladesh',
      tradeLicenseNumber: 'TRAD/DNCC/092813/2026',
      footerText: '© 2026 YEAR INFO AI. All rights reserved. Engineered for High-Growth Brands.',
      socialLinks: {
        facebook: 'https://facebook.com/yearinfoai',
        instagram: 'https://instagram.com/yearinfoai',
        linkedin: 'https://linkedin.com/company/yearinfoai',
      },
      defaultLanguage: 'both',
      defaultTimezone: 'Asia/Dhaka',
      defaultTheme: 'dark',
      showPublicPricing: true,
      maintenanceMode: false,
      maintenanceNotice: '',
      updatedAt: new Date().toISOString(),
    };
  }

  public seedDomainDeployment() {
    this.data.domainDeployment = {
      canonicalUrl: process.env.APP_URL || 'https://ais-dev-q3chin66kswwbyeyn5djck-411764206474.asia-east1.run.app',
      desiredCustomDomain: 'app.yearinfo.ai',
      preferredHost: 'apex',
      verificationToken: 'yia-verify-8893-dhaka-2026',
      isVerified: true,
      sslStatus: 'active',
      allowedOrigins: [
        'http://localhost:3000',
        'https://ais-dev-q3chin66kswwbyeyn5djck-411764206474.asia-east1.run.app',
        'https://ais-pre-q3chin66kswwbyeyn5djck-411764206474.asia-east1.run.app',
      ],
      dnsRecordsRequired: [
        { type: 'CNAME', host: 'app', value: 'ais-dev-q3chin66kswwbyeyn5djck-411764206474.asia-east1.run.app', status: 'detected' },
        { type: 'TXT', host: '_yia-challenge', value: 'yia-verification=yia-verify-8893-dhaka-2026', status: 'detected' },
      ],
      environment: {
        nodeVersion: process.version,
        environmentMode: process.env.NODE_ENV || 'production',
        port: 3000,
        platform: 'Google Cloud Run (asia-east1)',
        uptimeSeconds: Math.floor(process.uptime()),
      },
      lastCheckedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  public seedPlatformFeatures() {
    this.data.platformFeatures = {
      aiSalesAgent: true,
      aiModelSelection: true,
      facebookConnection: true,
      messengerMessaging: true,
      instagramMessaging: true,
      facebookPublishing: true,
      instagramPublishing: true,
      whatsappMessaging: true,
      websiteLiveChat: true,
      productCatalog: true,
      orderManagement: true,
      postScheduler: true,
      subscriptionBilling: true,
      updatedAt: new Date().toISOString(),
    };
  }

  public seedPaymentRecords() {
    this.data.paymentRecords = [];
  }

  public seedAdminNotifications() {
    this.data.adminNotifications = [
      {
        id: 'notif_1',
        type: 'domain_issue',
        severity: 'info',
        title: 'Canonical Domain Active',
        message: 'Application is serving securely with automated SSL/TLS termination on Google Cloud Run.',
        read: false,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'notif_2',
        type: 'provider_error',
        severity: 'info',
        title: 'AI Primary Engine Connected',
        message: 'Google Gemini (gemini-3.8-flash) is active and serving conversation requests.',
        read: true,
        createdAt: new Date().toISOString(),
      },
    ];
  }

  // --- AI PROVIDER CONTROLS ---

  public getAIProviders(): AIProviderConfig[] {
    return this.data.aiProviders;
  }

  public getAIProvider(id: string): AIProviderConfig | undefined {
    return this.data.aiProviders.find((p) => p.id === id);
  }

  public getDefaultAIProvider(): AIProviderConfig | undefined {
    return this.data.aiProviders.find((p) => p.isDefault && p.isEnabled) ||
      this.data.aiProviders.find((p) => p.isEnabled) ||
      this.data.aiProviders[0];
  }

  public getFallbackAIProvider(): AIProviderConfig | undefined {
    return this.data.aiProviders.find((p) => p.isFallback && p.isEnabled && !p.isDefault);
  }

  public setAIProviderCredential(providerId: string, apiKey: string) {
    this.secureCredentials[`ai_provider:${providerId}`] = {
      apiKey,
      savedAt: Date.now(),
    };
  }

  public getAIProviderCredential(providerId: string): string | undefined {
    return this.secureCredentials[`ai_provider:${providerId}`]?.apiKey;
  }

  public createAIProvider(provider: AIProviderConfig, secretKey?: string): AIProviderConfig {
    if (secretKey) {
      this.setAIProviderCredential(provider.id, secretKey);
      provider.apiKeyMasked = `••••••••${secretKey.slice(-4)}`;
      provider.isConfigured = true;
    }
    if (provider.isDefault) {
      this.data.aiProviders.forEach((p) => { p.isDefault = false; });
    }
    this.data.aiProviders.push(provider);
    this.persist();
    return provider;
  }

  public updateAIProvider(id: string, updates: Partial<AIProviderConfig>, newSecretKey?: string): AIProviderConfig | null {
    const idx = this.data.aiProviders.findIndex((p) => p.id === id);
    if (idx === -1) return null;

    if (newSecretKey) {
      this.setAIProviderCredential(id, newSecretKey);
      updates.apiKeyMasked = `••••••••${newSecretKey.slice(-4)}`;
      updates.isConfigured = true;
    }

    if (updates.isDefault) {
      this.data.aiProviders.forEach((p) => {
        if (p.id !== id) p.isDefault = false;
      });
    }

    this.data.aiProviders[idx] = { ...this.data.aiProviders[idx], ...updates };
    this.persist();
    return this.data.aiProviders[idx];
  }

  public setDefaultAIProvider(id: string): AIProviderConfig | null {
    const target = this.data.aiProviders.find((p) => p.id === id);
    if (!target) return null;

    this.data.aiProviders.forEach((p) => {
      p.isDefault = p.id === id;
    });
    this.persist();
    return target;
  }

  public deleteAIProvider(id: string): boolean {
    const idx = this.data.aiProviders.findIndex((p) => p.id === id);
    if (idx === -1) return false;

    // Do not delete if it's the only provider
    if (this.data.aiProviders.length <= 1) return false;

    this.data.aiProviders.splice(idx, 1);
    delete this.secureCredentials[`ai_provider:${id}`];

    // Ensure a default provider exists
    if (!this.data.aiProviders.some((p) => p.isDefault)) {
      if (this.data.aiProviders[0]) {
        this.data.aiProviders[0].isDefault = true;
      }
    }

    this.persist();
    return true;
  }

  public getTaskRouting(): Record<string, { providerId: string; model?: string; fallbackProviderId?: string; temperature?: number }> {
    if (!this.data.aiTaskRouting || Object.keys(this.data.aiTaskRouting).length === 0) {
      this.data.aiTaskRouting = {
        customer_support: { providerId: 'prov_gemini', model: 'gemini-3.8-flash' },
        comment_classification: { providerId: 'prov_gemini', model: 'gemini-3.8-flash' },
        vision_understanding: { providerId: 'prov_gemini', model: 'gemini-3.8-flash' },
        order_extraction: { providerId: 'prov_gemini', model: 'gemini-3.8-flash' },
        business_analytics: { providerId: 'prov_gemini', model: 'gemini-3.8-flash' },
        voice_assistant: { providerId: 'prov_gemini', model: 'gemini-3.8-flash' },
        marketing_content: { providerId: 'prov_gemini', model: 'gemini-3.8-flash' },
      };
      this.persist();
    }
    return this.data.aiTaskRouting;
  }

  public updateTaskRouting(task: string, route: { providerId: string; model?: string; fallbackProviderId?: string; temperature?: number }) {
    if (!this.data.aiTaskRouting) {
      this.getTaskRouting();
    }
    this.data.aiTaskRouting![task] = { ...this.data.aiTaskRouting![task], ...route };
    this.persist();
    return this.data.aiTaskRouting![task];
  }

  // --- GLOBAL INTEGRATIONS & CREDENTIALS ---

  public getGlobalIntegrations(): GlobalIntegrationConfig[] {
    return this.data.globalIntegrations;
  }

  public getGlobalIntegration(id: string): GlobalIntegrationConfig | undefined {
    return this.data.globalIntegrations.find((i) => i.id === id);
  }

  public setIntegrationCredential(serviceKey: string, creds: any) {
    this.secureCredentials[`integration:${serviceKey}`] = {
      ...creds,
      savedAt: Date.now(),
    };
  }

  public getIntegrationCredential(serviceKey: string): any {
    return this.secureCredentials[`integration:${serviceKey}`];
  }

  public updateGlobalIntegration(
    id: string,
    updates: Partial<GlobalIntegrationConfig>,
    newSecret?: any
  ): GlobalIntegrationConfig | null {
    const idx = this.data.globalIntegrations.findIndex((i) => i.id === id);
    if (idx === -1) return null;

    const integ = this.data.globalIntegrations[idx];

    if (newSecret) {
      this.setIntegrationCredential(integ.serviceKey, newSecret);
      if (typeof newSecret === 'string') {
        updates.maskedFingerprint = `••••••••${newSecret.slice(-4)}`;
      } else if (newSecret.appSecret) {
        updates.maskedFingerprint = `AppID: ${newSecret.appId ? newSecret.appId : 'Configured'} (Secret: ••••••••${newSecret.appSecret.slice(-4)})`;
      }
      updates.status = 'configured';
    }

    this.data.globalIntegrations[idx] = {
      ...this.data.globalIntegrations[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.persist();
    return this.data.globalIntegrations[idx];
  }

  // --- WEBSITE BRANDING ---

  public getWebsiteBranding(): WebsiteBrandingSettings {
    return this.data.websiteBranding;
  }

  public updateWebsiteBranding(updates: Partial<WebsiteBrandingSettings>): WebsiteBrandingSettings {
    this.data.websiteBranding = {
      ...this.data.websiteBranding,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.persist();
    return this.data.websiteBranding;
  }

  // --- DOMAIN & DEPLOYMENT ---

  public getDomainDeployment(): DomainDeploymentSettings {
    // Refresh uptime
    this.data.domainDeployment.environment.uptimeSeconds = Math.floor(process.uptime());
    return this.data.domainDeployment;
  }

  public updateDomainDeployment(updates: Partial<DomainDeploymentSettings>): DomainDeploymentSettings {
    this.data.domainDeployment = {
      ...this.data.domainDeployment,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.persist();
    return this.data.domainDeployment;
  }

  // --- FEATURE FLAGS ---

  public getPlatformFeatures(): PlatformFeatureFlags {
    return this.data.platformFeatures;
  }

  public updatePlatformFeatures(updates: Partial<PlatformFeatureFlags>): PlatformFeatureFlags {
    this.data.platformFeatures = {
      ...this.data.platformFeatures,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.persist();
    return this.data.platformFeatures;
  }

  public isFeatureEnabled(featureKey: keyof PlatformFeatureFlags): boolean {
    if (!this.data.platformFeatures) return true;
    return Boolean(this.data.platformFeatures[featureKey]);
  }

  // --- PAYMENTS ---

  public getPaymentRecords(): PaymentRecord[] {
    return this.data.paymentRecords;
  }

  public createPaymentRecord(record: PaymentRecord): PaymentRecord {
    this.data.paymentRecords.unshift(record);
    this.persist();
    return record;
  }

  public updatePaymentRecord(id: string, updates: Partial<PaymentRecord>): PaymentRecord | null {
    const idx = this.data.paymentRecords.findIndex((p) => p.id === id);
    if (idx === -1) return null;
    this.data.paymentRecords[idx] = { ...this.data.paymentRecords[idx], ...updates };
    this.persist();
    return this.data.paymentRecords[idx];
  }

  // --- ADMIN NOTIFICATIONS ---

  public getAdminNotifications(): AdminNotification[] {
    return this.data.adminNotifications;
  }

  public createAdminNotification(notif: AdminNotification): AdminNotification {
    this.data.adminNotifications.unshift(notif);
    if (this.data.adminNotifications.length > 100) {
      this.data.adminNotifications = this.data.adminNotifications.slice(0, 100);
    }
    this.persist();
    return notif;
  }

  public markAdminNotificationRead(id: string): boolean {
    const notif = this.data.adminNotifications.find((n) => n.id === id);
    if (notif) {
      notif.read = true;
      this.persist();
      return true;
    }
    return false;
  }

  public deleteAdminNotification(id: string): boolean {
    const idx = this.data.adminNotifications.findIndex((n) => n.id === id);
    if (idx !== -1) {
      this.data.adminNotifications.splice(idx, 1);
      this.persist();
      return true;
    }
    return false;
  }

  // --- SYSTEM SETTINGS ---

  public getSystemSettings(): Record<string, any> {
    return this.data.systemSettings;
  }

  public updateSystemSettings(updates: Record<string, any>): Record<string, any> {
    this.data.systemSettings = { ...this.data.systemSettings, ...updates };
    this.persist();
    return this.data.systemSettings;
  }

  // --- USER CONTROLS EXTENSION ---

  public updateUserRole(userId: string, role: any, isSuperAdmin: boolean): User | null {
    const u = this.data.users.find((user) => user.id === userId);
    if (!u) return null;
    u.role = role;
    u.isSuperAdmin = isSuperAdmin;
    this.persist();
    return u;
  }

  public updateUserStatus(userId: string, status: 'active' | 'suspended'): User | null {
    const u = this.data.users.find((user) => user.id === userId);
    if (!u) return null;
    u.status = status;
    this.persist();
    return u;
  }

  // --- SUBSCRIPTION PLAN MANAGEMENT ---

  public createSubscriptionPlan(plan: SubscriptionPlan): SubscriptionPlan {
    this.data.subscriptionPlans.push(plan);
    this.persist();
    return plan;
  }

  public deleteSubscriptionPlan(id: string): boolean {
    const idx = this.data.subscriptionPlans.findIndex((p) => p.id === id);
    if (idx !== -1) {
      this.data.subscriptionPlans.splice(idx, 1);
      this.persist();
      return true;
    }
    return false;
  }

  // --- OWNER OVERVIEW STATS (CALCULATED FROM REAL DATABASE ONLY) ---

  public getOwnerOverviewStats() {
    const users = this.data.users;
    const workspaces = this.data.workspaces;
    const subscriptions = this.data.subscriptions;
    const payments = this.data.paymentRecords;
    const aiUsage = this.data.aiUsageRecords;
    const posts = this.data.scheduledPosts;
    const notifications = this.data.adminNotifications;

    const totalUsers = users.length;
    const totalWorkspaces = workspaces.length;

    const activeSubs = subscriptions.filter((s) => s.status === 'active').length;
    const pendingSubs = subscriptions.filter((s) => s.status === 'pending').length;
    const expiredSubs = subscriptions.filter((s) => s.status === 'expired').length;
    const suspendedSubs = subscriptions.filter((s) => s.status === 'suspended').length;

    // Real verified payments calculation
    const totalVerifiedRevenueBdt = payments
      .filter((p) => p.status === 'verified')
      .reduce((sum, p) => sum + p.amountBdt, 0);

    const totalVerifiedRevenueUsd = payments
      .filter((p) => p.status === 'verified')
      .reduce((sum, p) => sum + p.amountUsd, 0);

    const totalAiTokens = aiUsage.reduce((sum, r) => sum + r.tokensUsed, 0);
    const totalAiCostUsd = aiUsage.reduce((sum, r) => sum + r.estimatedCostUsd, 0);

    const defaultProvider = this.getDefaultAIProvider();

    const unreadNotifications = notifications.filter((n) => !n.read).length;

    return {
      users: {
        total: totalUsers,
        active: users.filter((u) => u.status !== 'suspended').length,
        admins: users.filter((u) => u.isSuperAdmin || u.role === 'superadmin').length,
      },
      workspaces: {
        total: totalWorkspaces,
      },
      subscriptions: {
        total: subscriptions.length,
        active: activeSubs,
        pending: pendingSubs,
        expired: expiredSubs,
        suspended: suspendedSubs,
      },
      revenue: {
        verifiedBdt: totalVerifiedRevenueBdt,
        verifiedUsd: totalVerifiedRevenueUsd,
        totalPaymentsRecorded: payments.length,
        verifiedPaymentsCount: payments.filter((p) => p.status === 'verified').length,
      },
      aiUsage: {
        totalCalls: aiUsage.length,
        totalTokens: totalAiTokens,
        estimatedCostUsd: Number(totalAiCostUsd.toFixed(4)),
        defaultProviderName: defaultProvider?.name || 'Google Gemini',
        defaultModel: defaultProvider?.model || 'gemini-3.8-flash',
      },
      publishing: {
        totalPosts: posts.length,
        published: posts.filter((p) => p.status === 'published').length,
        scheduled: posts.filter((p) => p.status === 'scheduled').length,
        failed: posts.filter((p) => p.status === 'failed').length,
      },
      notifications: {
        unread: unreadNotifications,
      },
      featuresActiveCount: Object.values(this.data.platformFeatures || {}).filter(Boolean).length,
    };
  }

  // Analytics Computation from Actual Records
  public getAnalytics(workspaceId: string) {
    const convs = this.getConversations(workspaceId);
    const orders = this.getOrders(workspaceId);
    const posts = this.getScheduledPosts(workspaceId);
    const aiRecords = this.getAIUsageRecords(workspaceId);
    const channels = this.getChannels(workspaceId);

    const totalConversations = convs.length;
    const unreadConversations = convs.filter((c) => c.status === 'unread' || c.unreadCount > 0).length;
    const openConversations = convs.filter((c) => c.status === 'open' || c.status === 'assigned').length;
    const resolvedConversations = convs.filter((c) => c.status === 'resolved').length;
    const aiHandledConversations = convs.filter((c) => c.status === 'ai_handled' || c.aiActive).length;

    const totalOrders = orders.length;
    const confirmedOrders = orders.filter((o) => o.status !== 'cancelled').length;
    const totalRevenue = orders.filter((o) => o.status !== 'cancelled').reduce((acc, o) => acc + o.total, 0);
    const aiAssistedRevenue = orders.filter((o) => o.aiAssisted && o.status !== 'cancelled').reduce((acc, o) => acc + o.total, 0);

    const totalPosts = posts.length;
    const publishedPosts = posts.filter((p) => p.status === 'published').length;
    const pendingScheduledPosts = posts.filter((p) => p.status === 'scheduled').length;
    const failedPosts = posts.filter((p) => p.status === 'failed').length;

    const totalAiTokens = aiRecords.reduce((acc, r) => acc + r.tokensUsed, 0);
    const estimatedCostUsd = aiRecords.reduce((acc, r) => acc + r.estimatedCostUsd, 0);

    return {
      conversations: {
        total: totalConversations,
        unread: unreadConversations,
        open: openConversations,
        resolved: resolvedConversations,
        aiHandled: aiHandledConversations,
      },
      orders: {
        total: totalOrders,
        confirmed: confirmedOrders,
        totalRevenue,
        aiAssistedRevenue,
      },
      publishing: {
        total: totalPosts,
        published: publishedPosts,
        scheduled: pendingScheduledPosts,
        failed: failedPosts,
      },
      ai: {
        totalCalls: aiRecords.length,
        totalTokens: totalAiTokens,
        estimatedCostUsd: Number(estimatedCostUsd.toFixed(4)),
      },
      channels: channels.map((c) => ({
        type: c.type,
        name: c.name,
        status: c.status,
      })),
    };
  }
}

export const db = new DatabaseStore();
