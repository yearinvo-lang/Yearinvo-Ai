export type ChannelType = 'facebook' | 'messenger' | 'instagram' | 'whatsapp' | 'livechat';

export type UserRole = 'owner' | 'admin' | 'agent' | 'superadmin';

export interface User {
  id: string;
  name: string;
  email: string;
  businessName?: string;
  phone?: string;
  role: UserRole;
  isSuperAdmin?: boolean;
  status?: 'active' | 'suspended';
  avatarUrl?: string;
  createdAt: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  businessType: string;
  phone?: string;
  currency: string;
  timezone: string; // default: 'Asia/Dhaka'
  language: 'bn' | 'en' | 'both';
  address?: string;
  website?: string;
  createdAt: string;
}

export type ChannelStatus = 'not_connected' | 'connected' | 'needs_reauth' | 'pending_setup';

export interface Channel {
  id: string;
  workspaceId: string;
  type: ChannelType;
  name: string;
  accountId?: string;
  status: ChannelStatus;
  connectedAt?: string;
  lastSyncAt?: string;
  lastError?: string;
  metadata?: {
    pageName?: string;
    pageId?: string;
    igUsername?: string;
    igAccountId?: string;
    phoneNumber?: string;
    wabaId?: string;
    verifiedName?: string;
    qualityRating?: string;
    permissionsGranted?: string[];
    appSecretConfigured?: boolean;
    widgetKey?: string;
    webhookUrl?: string;
    errorDetails?: string;
  };
}

export interface Customer {
  id: string;
  workspaceId: string;
  name: string;
  email?: string;
  phone?: string;
  primaryChannel: ChannelType;
  channelIdentifiers: {
    channelType: ChannelType;
    externalId: string;
    username?: string;
  }[];
  totalOrders: number;
  totalSpent: number;
  tags: string[];
  notes?: string;
  createdAt: string;
}

export type ConversationStatus = 'open' | 'unread' | 'assigned' | 'ai_handled' | 'human_handled' | 'resolved';

export interface Conversation {
  id: string;
  workspaceId: string;
  customerId: string;
  customerName: string;
  customerAvatar?: string;
  customerPhone?: string;
  channel: ChannelType;
  channelName: string;
  status: ConversationStatus;
  unreadCount: number;
  lastMessageText: string;
  lastMessageAt: string;
  assignedTo?: string; // user id
  assignedToName?: string;
  aiActive: boolean;
  aiHandoffReason?: string;
  createdAt: string;
}

export interface MessageAttachment {
  id: string;
  url: string;
  type: 'image' | 'video' | 'file';
  name: string;
  size?: number;
}

export interface Message {
  id: string;
  conversationId: string;
  workspaceId: string;
  senderType: 'customer' | 'agent' | 'ai';
  senderName: string;
  content: string;
  attachments?: MessageAttachment[];
  timestamp: string;
  deliveryStatus: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  aiAssisted?: boolean;
}

export interface InternalNote {
  id: string;
  conversationId: string;
  workspaceId: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: string;
}

export interface ProductVariant {
  id: string;
  name: string;
  price: number;
  stock: number;
  sku: string;
}

export interface Product {
  id: string;
  workspaceId: string;
  name: string;
  nameBengali?: string;
  sku: string;
  category: string;
  description: string;
  price: number;
  discountPrice?: number;
  stock: number;
  images: string[];
  imageStoragePath?: string;
  variants: ProductVariant[];
  available: boolean;
  shippingInfo?: string;
  createdAt: string;
}

export type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'returned' | 'delivery_failed';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export interface OrderItem {
  productId: string;
  productName: string;
  sku?: string;
  variantId?: string;
  variantName?: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  workspaceId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  items: OrderItem[];
  subtotal: number;
  deliveryCharge: number;
  discount: number;
  total: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: 'cash_on_delivery' | 'bkash' | 'nagad' | 'bank_transfer' | 'card';
  channel?: 'facebook' | 'messenger' | 'whatsapp' | 'instagram' | 'website' | 'manual';
  courierProvider?: CourierProvider;
  courierConsignmentId?: string;
  courierTrackingCode?: string;
  courierTrackingUrl?: string;
  courierDispatchedAt?: string;
  conversationId?: string;
  aiAssisted: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type PostStatus = 'draft' | 'scheduled' | 'publishing' | 'published' | 'failed' | 'cancelled';

export interface ScheduledPost {
  id: string;
  workspaceId: string;
  platforms: ('facebook' | 'instagram')[];
  caption: string;
  hashtags: string[];
  mediaUrls: string[];
  scheduledAt: string;
  timezone: string;
  status: PostStatus;
  externalPostIds?: { platform: string; postId: string }[];
  errorMessage?: string;
  createdAt: string;
}

export interface ScheduledMessage {
  id: string;
  workspaceId: string;
  channel: 'whatsapp';
  recipientPhone: string;
  recipientName: string;
  templateName?: string;
  messageContent: string;
  scheduledAt: string;
  status: 'scheduled' | 'sending' | 'sent' | 'failed' | 'cancelled';
  consentVerified: boolean;
  createdAt: string;
}

export interface KnowledgeItem {
  id: string;
  workspaceId: string;
  category: 'policy' | 'faq' | 'delivery' | 'payment' | 'general';
  question: string;
  answer: string;
  language: 'bn' | 'en' | 'both';
  updatedAt: string;
}

export interface AISettings {
  workspaceId: string;
  enabled: boolean;
  model: string;
  brandVoice: 'friendly' | 'professional' | 'consultative' | 'concise';
  languageMode: 'bengali' | 'english' | 'auto_detect';
  autoReplyChannels: ChannelType[];
  businessHoursOnly: boolean;
  businessHoursStart: string;
  businessHoursEnd: string;
  humanTakeoverKeywords: string[];
  confidenceThreshold: number;
  enableDirectOrderCreation: boolean;
  customGreetingBn: string;
  customGreetingEn: string;
}

export interface AIUsageRecord {
  id: string;
  workspaceId: string;
  conversationId?: string;
  model: string;
  tokensUsed: number;
  estimatedCostUsd: number;
  timestamp: string;
  success: boolean;
  querySnippet: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  priceBdt: number;
  priceUsd: number;
  interval: 'monthly' | 'yearly';
  maxChannels: number;
  maxConversationsMonthly: number;
  aiRepliesMonthly: number;
  maxScheduledPosts: number;
  maxTeamMembers?: number;
  features: string[];
  isActive: boolean;
}

export type SubscriptionStatus = 'pending' | 'approved' | 'active' | 'rejected' | 'expired' | 'suspended' | 'cancelled';

export interface Subscription {
  id: string;
  workspaceId: string;
  workspaceName: string;
  planId: string;
  planName: string;
  status: SubscriptionStatus;
  startedAt?: string;
  expiresAt?: string;
  requestedAt: string;
  approvedBy?: string;
  paymentMethod?: string;
  paymentReference?: string;
  amountPaidBdt?: number;
  currentUsage: {
    conversationsThisMonth: number;
    aiRepliesThisMonth: number;
    scheduledPostsThisMonth: number;
  };
}

export interface PaymentRecord {
  id: string;
  subscriptionId: string;
  workspaceId: string;
  workspaceName: string;
  amountBdt: number;
  amountUsd: number;
  method: 'bkash' | 'nagad' | 'bank' | 'card' | 'manual';
  transactionReference: string;
  status: 'verified' | 'pending' | 'rejected';
  verifiedAt?: string;
  verifiedBy?: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  workspaceId?: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
  timestamp: string;
  ipAddress?: string;
  status?: 'success' | 'failure';
}

export interface AIProviderConfig {
  id: string;
  name: string;
  providerType: 'gemini' | 'openai' | 'groq' | 'anthropic' | 'custom';
  apiEndpoint?: string;
  model: string;
  apiKeyMasked?: string;
  isConfigured: boolean;
  isEnabled: boolean;
  isDefault: boolean;
  isFallback: boolean;
  lastTestStatus?: 'success' | 'failed' | 'untested';
  lastTestedAt?: string;
  lastError?: string;
  totalRequests: number;
  totalTokens: number;
  createdAt: string;
}

export interface GlobalIntegrationConfig {
  id: string;
  serviceKey: 'gemini' | 'meta' | 'whatsapp' | 'custom_ai' | 'smtp' | 'stripe' | 'wordpress' | 'courier' | 'ga4';
  name: string;
  purpose: string;
  status: 'configured' | 'unconfigured' | 'needs_verification' | 'blocked';
  isEnabled: boolean;
  maskedFingerprint?: string;
  lastTestedAt?: string;
  lastTestStatus?: 'success' | 'failed' | 'untested';
  lastError?: string;
  metadata?: Record<string, any>;
  updatedAt: string;
}

export interface WebsiteBrandingSettings {
  siteName: string;
  tagline: string;
  logoUrl?: string;
  faviconUrl?: string;
  landingHeadline: string;
  landingDescription: string;
  supportEmail: string;
  supportPhone: string;
  companyName: string;
  companyAddress: string;
  tradeLicenseNumber?: string;
  footerText: string;
  socialLinks: {
    facebook?: string;
    instagram?: string;
    linkedin?: string;
    youtube?: string;
    twitter?: string;
  };
  defaultLanguage: 'bn' | 'en' | 'both';
  defaultTimezone: string;
  defaultTheme: 'dark' | 'light' | 'system';
  showPublicPricing: boolean;
  maintenanceMode: boolean;
  maintenanceNotice?: string;
  updatedAt: string;
}

export interface DomainDeploymentSettings {
  canonicalUrl: string;
  desiredCustomDomain: string;
  preferredHost: 'apex' | 'www' | 'default';
  verificationToken: string;
  isVerified: boolean;
  sslStatus: 'active' | 'pending' | 'provisioning' | 'failed';
  allowedOrigins: string[];
  dnsRecordsRequired: {
    type: 'CNAME' | 'A' | 'TXT';
    host: string;
    value: string;
    status: 'detected' | 'pending';
  }[];
  environment: {
    nodeVersion: string;
    environmentMode: string;
    port: number;
    platform: string;
    uptimeSeconds: number;
  };
  lastCheckedAt?: string;
  lastCheckError?: string;
  updatedAt: string;
}

export interface PlatformFeatureFlags {
  aiSalesAgent: boolean;
  aiModelSelection: boolean;
  facebookConnection: boolean;
  messengerMessaging: boolean;
  instagramMessaging: boolean;
  facebookPublishing: boolean;
  instagramPublishing: boolean;
  whatsappMessaging: boolean;
  websiteLiveChat: boolean;
  productCatalog: boolean;
  orderManagement: boolean;
  postScheduler: boolean;
  subscriptionBilling: boolean;
  updatedAt: string;
}

export interface AdminNotification {
  id: string;
  type: 'api_failure' | 'provider_error' | 'sub_expiring' | 'post_failure' | 'webhook_failure' | 'domain_issue' | 'usage_spike' | 'voice_report_sent';
  severity: 'info' | 'warning' | 'error';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  targetId?: string;
}

// ==========================================
// BUSINESS MANAGER & COURIER/INTEGRATION TYPES
// ==========================================

export type DeliveryStatus = 'pending_pickup' | 'in_transit' | 'delivered' | 'attempted_failed' | 'returned' | 'cancelled';
export type CourierProvider = 'steadfast' | 'pathao' | 'redx' | 'ecourier' | 'paperfly' | 'manual';

export interface CourierDelivery {
  id: string;
  workspaceId: string;
  orderId: string;
  orderNumber: string;
  courierProvider: CourierProvider;
  trackingCode: string;
  consignmentId?: string;
  recipientName: string;
  recipientPhone: string;
  recipientAddress: string;
  codAmount: number;
  codCollected: boolean;
  status: DeliveryStatus;
  statusDetails?: string;
  dispatchedAt?: string;
  deliveredAt?: string;
  lastSyncAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface FacebookPagePostMetrics {
  id: string;
  message?: string;
  story?: string;
  createdTime: string;
  publishedToday: boolean;
  permalinkUrl?: string;
  commentsCount: number;
  reactionsCount: number;
  sharesCount: number;
  reach?: number;
  impressions?: number;
}

export interface FacebookBusinessMetrics {
  isConnected: boolean;
  permissionStatus: 'granted' | 'needs_review' | 'blocked' | 'disconnected';
  grantedPermissions: string[];
  pageName?: string;
  pageId?: string;
  newConversationsToday: number;
  totalIncomingMessagesToday: number;
  uniqueCustomersToday: number;
  unreadOrUnansweredCount: number;
  postsPublishedToday: number;
  commentsReceivedToday: number;
  topCommentedPost?: {
    id: string;
    caption: string;
    commentsCount: number;
    sharesCount: number;
    permalinkUrl?: string;
    publishedAt: string;
  };
  leadsOrInquiriesToday: number;
  lastSyncAt: string;
  error?: string;
}

export interface WordPressBusinessMetrics {
  isConnected: boolean;
  siteUrl?: string;
  isWooCommerceDetected: boolean;
  publishedPostsToday: number;
  recentCommentsToday: number;
  siteHealthStatus: 'good' | 'warning' | 'error' | 'disconnected';
  activeErrors: string[];
  wooCommerceStats?: {
    ordersToday: number;
    grossSalesToday: number;
    netSalesToday: number;
    refundsToday: number;
    discountsToday: number;
    topProductsSold: { name: string; quantity: number }[];
  };
  lastSyncAt: string;
  error?: string;
}

export interface CourierTrackingSummary {
  isConnected: boolean;
  activeProviders: CourierProvider[];
  totalShipments: number;
  deliveredToday: number;
  inTransit: number;
  pendingPickup: number;
  attemptedOrFailed: number;
  returnedOrCancelled: number;
  codCollectedToday: number;
  codPending: number;
  deliveries: CourierDelivery[];
  lastSyncAt: string;
  error?: string;
}

export interface WebsiteAnalyticsMetrics {
  isConnected: boolean;
  provider: 'ga4' | 'custom' | 'none';
  measurementId?: string;
  activeVisitorsNow?: number;
  totalVisitorsToday?: number;
  pageViewsToday?: number;
  bounceRatePercent?: number;
  conversionRatePercent?: number;
  status: 'connected' | 'not_connected';
  note: string;
}

export interface DailyBusinessMetrics {
  date: string; // YYYY-MM-DD
  dateBangla: string;
  timezone: string; // 'Asia/Dhaka'
  generatedAt: string;

  // 1. Sales & Revenue
  sales: {
    totalSales: number; // Gross
    netSales: number;
    discountsTotal: number;
    refundsTotal: number;
    completedRevenue: number;
    pendingRevenue: number;
    averageOrderValue: number;
    yesterdayTotalSales: number;
    growthPercentVsYesterday: number;
  };

  // 2. Orders & Order Status Breakdown
  orders: {
    totalOrdersToday: number;
    completed: number;
    confirmed: number;
    processing: number;
    pending: number;
    cancelled: number;
    failed: number;
    yesterdayTotalOrders: number;
    growthPercentVsYesterday: number;
    topProductsToday: { name: string; sku?: string; quantity: number; revenue: number }[];
    unfulfilledOrdersCount: number;
  };

  // 3. Deliveries
  deliveries: CourierTrackingSummary;

  // 4. Facebook & Messenger
  facebook: FacebookBusinessMetrics;

  // 5. Website & WordPress
  website: WordPressBusinessMetrics;

  // 6. Web Analytics (GA4)
  analytics: WebsiteAnalyticsMetrics;

  // 7. Problems & Attention Items
  problemsRequiringAttention: {
    id: string;
    severity: 'high' | 'medium' | 'low';
    category: 'orders' | 'messages' | 'deliveries' | 'integrations' | 'system';
    title: string;
    description: string;
    actionLink?: string;
  }[];

  // 8. Suggested Next Actions
  suggestedNextActions: {
    priority: number;
    action: string;
    reason: string;
  }[];

  // Service connection overview
  connectedServices: {
    meta: { status: 'connected' | 'disconnected' | 'blocked'; lastSync?: string };
    woocommerce: { status: 'connected' | 'disconnected' | 'blocked'; lastSync?: string };
    courier: { status: 'connected' | 'disconnected' | 'blocked'; lastSync?: string };
    ga4: { status: 'connected' | 'disconnected' | 'blocked'; lastSync?: string };
    gemini: { status: 'connected' | 'disconnected' | 'blocked'; lastSync?: string };
  };
}

export interface BusinessManagerStructuredReport {
  title: string;
  dateBangla: string;
  dateStr: string;
  summaryPreamble: string;
  sections: {
    salesRevenue: { title: string; content: string; keyFigures: string[] };
    ordersCancellations: { title: string; content: string; keyFigures: string[] };
    facebookMessenger: { title: string; content: string; keyFigures: string[] };
    postsComments: { title: string; content: string; keyFigures: string[] };
    deliveryStatus: { title: string; content: string; keyFigures: string[] };
    websiteWordPress: { title: string; content: string; keyFigures: string[] };
    problemsRequiringAttention: { title: string; items: string[] };
    suggestedNextActions: { title: string; items: string[] };
  };
  fullBanglaReportText: string;
  fullEnglishReportText: string;
  speechText: string;
}

export interface ConsequentialActionRequest {
  id: string;
  actionType: 'send_broadcast_message' | 'delete_post' | 'cancel_order' | 'refund_order' | 'disconnect_channel';
  targetId: string;
  description: string;
  details: Record<string, any>;
  requiresConfirmation: boolean;
  status: 'pending_confirmation' | 'confirmed' | 'rejected' | 'executed';
  createdAt: string;
}
