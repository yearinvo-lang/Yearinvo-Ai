import { GoogleGenAI } from '@google/genai';
import { db } from './db.ts';
import { BusinessManagerService } from './integrations/business-manager.ts';
import { toBanglaDigits } from './voice-assistant.ts';
import { AIGateway, sanitizeErrorMessage } from './ai-gateway.ts';
import type { DailyBusinessMetrics, BusinessManagerStructuredReport, AIAssistantAction } from '../types/index.ts';

// In-memory multi-turn session storage for follow-up conversation context
const sessionContextMap = new Map<string, { role: 'user' | 'model'; text: string }[]>();

export function parseBanglaDigitsToAscii(str: string): string {
  const bnToEn: Record<string, string> = {
    '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
    '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9',
  };
  return String(str || '').replace(/[০-৯]/g, (ch) => bnToEn[ch] || ch);
}

export function evaluateMathQuery(text: string): { expression: string; result: number; banglaResult: string } | null {
  const ascii = parseBanglaDigitsToAscii(text).replace(/,/g, '');
  
  // Multiplication: e.g. 275 গুণ 16, 275 * 16, 275 x 16, 275 পূরণ 16
  const multMatch = ascii.match(/(\d+(?:\.\d+)?)\s*(?:গুণ|\*|x|times|multiplied\s*by|পূরণ)\s*(\d+(?:\.\d+)?)/i);
  if (multMatch) {
    const a = parseFloat(multMatch[1]);
    const b = parseFloat(multMatch[2]);
    const res = a * b;
    return {
      expression: `${multMatch[1]} × ${multMatch[2]}`,
      result: res,
      banglaResult: toBanglaDigits(res.toLocaleString()),
    };
  }

  // Addition: e.g. 100 যোগ 50
  const addMatch = ascii.match(/(\d+(?:\.\d+)?)\s*(?:যোগ|\+|plus)\s*(\d+(?:\.\d+)?)/i);
  if (addMatch) {
    const a = parseFloat(addMatch[1]);
    const b = parseFloat(addMatch[2]);
    const res = a + b;
    return {
      expression: `${addMatch[1]} + ${addMatch[2]}`,
      result: res,
      banglaResult: toBanglaDigits(res.toLocaleString()),
    };
  }

  // Subtraction: e.g. 500 বিয়োগ 120
  const subMatch = ascii.match(/(\d+(?:\.\d+)?)\s*(?:বিয়োগ|বিয়োগ|-|minus)\s*(\d+(?:\.\d+)?)/i);
  if (subMatch) {
    const a = parseFloat(subMatch[1]);
    const b = parseFloat(subMatch[2]);
    const res = a - b;
    return {
      expression: `${subMatch[1]} - ${subMatch[2]}`,
      result: res,
      banglaResult: toBanglaDigits(res.toLocaleString()),
    };
  }

  // Division: e.g. 1000 ভাগ 4
  const divMatch = ascii.match(/(\d+(?:\.\d+)?)\s*(?:ভাগ|\/|divided\s*by)\s*(\d+(?:\.\d+)?)/i);
  if (divMatch) {
    const a = parseFloat(divMatch[1]);
    const b = parseFloat(divMatch[2]);
    if (b !== 0) {
      const res = a / b;
      return {
        expression: `${divMatch[1]} ÷ ${divMatch[2]}`,
        result: res,
        banglaResult: toBanglaDigits(res.toLocaleString()),
      };
    }
  }

  return null;
}

export interface AIAssistantHistoryItem {
  role: 'user' | 'model';
  text: string;
}

export interface AIBusinessManagerQueryInput {
  workspaceId: string;
  sessionId?: string;
  query: string;
  language?: 'bn' | 'en';
  history?: AIAssistantHistoryItem[];
  userLocation?: {
    latitude?: number;
    longitude?: number;
    city?: string;
    hasPermission?: boolean;
    error?: string;
  };
}

export interface AIBusinessManagerQueryOutput {
  query: string;
  responseText: string;
  speechText: string;
  metrics?: DailyBusinessMetrics;
  structuredReport?: BusinessManagerStructuredReport;
  toolsCalled: string[];
  sessionId: string;
  actions?: AIAssistantAction[];
  suggestions?: string[];
}

export function detectActionsAndNavigation(query: string, workspaceId: string, storeProducts: any[]): { actions: AIAssistantAction[]; suggestions: string[] } {
  const actions: AIAssistantAction[] = [];
  const suggestions: string[] = [];

  // 1. Navigation Actions
  if (/অর্ডার পেজে|অর্ডার সেকশনে|অর্ডার দেখাও|view orders|go to orders|manage orders|orders page|ডেলিভারি হয়নি/i.test(query)) {
    actions.push({
      id: `act_nav_orders_${Date.now()}`,
      type: 'navigate',
      title: '📦 অর্ডার পেজে যান (Go to Orders)',
      description: 'সরাসরি সব গ্রাহকের অর্ডার ও ডেলিভারি স্ট্যাটাস দেখুন',
      targetPage: 'orders',
      requiresConfirmation: false,
      status: 'proposed',
    });
  } else if (/ইনবক্স|মেসেজ পেজ|চ্যাট দেখাও|inbox|messages|customer chat|বার্তা/i.test(query)) {
    actions.push({
      id: `act_nav_inbox_${Date.now()}`,
      type: 'navigate',
      title: '💬 ইনবক্সে যান (Go to Central Inbox)',
      description: 'ফেসবুক ও সোশ্যাল মিডিয়ার নতুন মেসেজ ও কাস্টমারদের রিপ্লাই দিন',
      targetPage: 'inbox',
      requiresConfirmation: false,
      status: 'proposed',
    });
  } else if (/প্রোডাক্ট পেজ|পণ্য তালিকা|ক্যাটালগ দেখাও|products page|view catalog|ক্রিম হানি/i.test(query)) {
    actions.push({
      id: `act_nav_products_${Date.now()}`,
      type: 'navigate',
      title: '🏷️ প্রোডাক্ট ক্যাটালগে যান (Go to Products)',
      description: 'পণ্যের স্টক, দাম ও বিবরণ সরাসরি চেক বা আপডেট করুন',
      targetPage: 'products',
      requiresConfirmation: false,
      status: 'proposed',
    });
  } else if (/শিডিউলার|পোস্ট শিডিউল|মার্কেটিং ক্যালেন্ডার|scheduler|schedule post|মার্কেটিং প্ল্যান/i.test(query)) {
    actions.push({
      id: `act_nav_scheduler_${Date.now()}`,
      type: 'navigate',
      title: '📅 মার্কেটিং শিডিউলারে যান (Social Scheduler)',
      description: 'ফেসবুক ও ইনস্টাগ্রামের জন্য পোস্ট শিডিউল করুন',
      targetPage: 'scheduler',
      requiresConfirmation: false,
      status: 'proposed',
    });
  } else if (/অ্যানালিটিক্স|রিপোর্ট পেজ|analytics|reports|সেলস|বিক্রি/i.test(query)) {
    actions.push({
      id: `act_nav_analytics_${Date.now()}`,
      type: 'navigate',
      title: '📊 অ্যানালিটিক্স দেখুন (View Analytics)',
      description: 'গ্রাফিক্যাল সেলস পারফরম্যান্স ও ট্রেন্ড চার্ট দেখুন',
      targetPage: 'analytics',
      requiresConfirmation: false,
      status: 'proposed',
    });
  }

  // 2. Consequential Social Post Draft & Schedule Action Proposal
  if (/পোস্ট লিখ|পোস্ট তৈরি|পোস্ট শিডিউল|draft post|facebook post|মার্কেটিং প্ল্যান|ক্যাম্পেইন/i.test(query)) {
    const featuredProduct = storeProducts[0] || { name: 'ক্রিম হানি (Cream Honey)', price: 750 };
    actions.push({
      id: `act_post_${Date.now()}`,
      type: 'schedule_post',
      title: `📱 ফেসবুক পোস্ট শিডিউল করুন: "${featuredProduct.name}"`,
      description: 'অটোমেটিক সোশ্যাল পোস্ট তৈরি ও শিডিউল করতে কনফার্ম করুন',
      requiresConfirmation: true,
      status: 'proposed',
      payload: {
        platforms: ['facebook'],
        caption: `🍯 ১০০% খাঁটি পাহাড়ি ফুলের ${featuredProduct.name}!\n\nপ্রাকৃতিক উপাদানে তৈরি অনন্য স্বাদের পুষ্টিকর ক্রিম হানি। পরিবারের প্রতিদিনের পুষ্টি চাহিদায় এক অনন্য সমাধান।\n\n💰 অফার মূল্য: ৳${toBanglaDigits(featuredProduct.price)} টাকা\n🚚 সারাদেশে ক্যাশ অন ডেলিভারি সুবিধা!\n\nঅর্ডার করতে এখনি ইনবক্স করুন।`,
        hashtags: ['#CreamHoney', '#PureHoney', '#HealthyLiving', '#OrganicFood', '#YearInvoAI'],
        mediaUrls: [],
        scheduledAt: new Date(Date.now() + 3600000 * 2).toISOString(),
      },
    });
  }

  // 3. Dynamic context-aware follow-up suggestions
  if (/সেল|বিক্রি|টাকা|sales|revenue/i.test(query)) {
    suggestions.push(
      'আমাদের বিক্রি কীভাবে বাড়ানো যায়?',
      'গত সপ্তাহের তুলনায় বিক্রি কতটা বেড়েছে?',
      'কোন পণ্যগুলো বেশি বিক্রি হচ্ছে?'
    );
  } else if (/অর্ডার|ডেলিভারি|orders|delivery|কুরিয়ার/i.test(query)) {
    suggestions.push(
      'আমাদের কোন অর্ডারগুলো এখনো ডেলিভারি হয়নি?',
      'আজকে কতটি অর্ডার ডেলিভারি হয়েছে?',
      'অর্ডার পেজে নিয়ে যাও'
    );
  } else if (/মার্কেটিং|প্ল্যান|marketing|post/i.test(query)) {
    suggestions.push(
      'আগামী সাত দিনের জন্য একটা মার্কেটিং প্ল্যান তৈরি করো।',
      'আমাদের ক্রিম হানির জন্য একটি ফেসবুক পোস্ট লিখে দাও',
      'মার্কেটিং শিডিউলারে যান'
    );
  } else {
    suggestions.push(
      'আজকে আমাদের সেলসের অবস্থা কী?',
      'আমাদের বিক্রি কীভাবে বাড়ানো যায়?',
      'আমাদের কোন অর্ডারগুলো এখনো ডেলিভারি হয়নি?',
      'আমাদের ক্রিম হানির দাম কত?'
    );
  }

  return { actions, suggestions };
}

export class AIBusinessManager {
  /**
   * Process a natural conversational or business intelligence query in Bangla or English using Gemini with Tool Execution
   */
  public static async processQuery(input: AIBusinessManagerQueryInput): Promise<AIBusinessManagerQueryOutput> {
    const { workspaceId, query } = input;
    const sessionId = input.sessionId || `sess_bm_${workspaceId}_${Date.now()}`;
    const cleanQuery = (query || '').trim();

    // Handle empty input gracefully
    if (!cleanQuery) {
      return {
        query: '',
        responseText: 'দয়া করে আপনার প্রশ্নটি বলুন বা নিচে লিখুন (যেমন: "কেমন আছো?", "আজকে সেলসের অবস্থা কী?", "আজকে কতগুলো Messenger মেসেজ এসেছে?", "আমাদের বিক্রি কীভাবে বাড়ানো যায়?")।',
        speechText: 'দয়া করে আপনার প্রশ্নটি বলুন বা লিখুন।',
        toolsCalled: [],
        sessionId,
      };
    }

    // Retrieve previous conversation context for follow-up questions
    let history = sessionContextMap.get(sessionId) || [];
    if (input.history && input.history.length > 0) {
      history = input.history.slice(-10);
      sessionContextMap.set(sessionId, history);
    }

    const toolsCalled: string[] = [];
    const contextFacts: string[] = [];
    let relevantMetrics: any = undefined;

    // Detect query intent to execute ONLY required tools (avoiding unnecessary database context)
    const isMessengerQuery = /messenger|মেসেঞ্জার|facebook message|ফেসবুক মেসেজ/i.test(cleanQuery);
    const isWhatsAppQuery = /whatsapp|হোয়াটসঅ্যাপ|ওয়াটসঅ্যাপ|হোয়াটস্যাপ/i.test(cleanQuery);
    const isInstagramQuery = /instagram|ইনস্টাগ্রাম|ইনস্টা/i.test(cleanQuery);
    const isProductPriceQuery = /দাম|মূল্য|price|cost|টাকা কত|পণ্য|প্রোডাক্ট|ক্যাটালগ|আইটেম|মধু|হানি|ঘি|জাফরান|শাড়ি|পাঞ্জাবি|stock|স্টক/i.test(cleanQuery);
    const isSalesOrdersQuery = /সেল|বিক্রি|অর্ডার|রেভিনিউ|লাভ|sales|revenue|orders|income|gross|aov/i.test(cleanQuery);
    const isDeliveryQuery = /ডেলিভারি|delivery|কুরিয়ার|courier|ট্রানজিট|transit|পার্সেল|parcel|পাঠানো|steadfast|pathao|redx/i.test(cleanQuery);
    const isStrategyQuery = /বিক্রি কীভাবে বাড়ানো যায়|বিক্রি কিভাবে বাড়ানো যায়|বিক্রি বাড়ানোর উপায়|সেলস বাড়াব কিভাবে|সেলস বৃদ্ধি|how to increase sales|grow sales|improve sales|মার্কেটিং প্ল্যান|মার্কেটিং পরিকল্পনা|marketing plan|growth strategy/i.test(cleanQuery);
    const isGreetingOnly = /(^|[\s?!])(কেমন আছো|কেমন আছেন|how are you|how do you do|হাই|হ্যালো|hello|hi|hey|good morning|good evening|আসসালামু আলাইকুম|সালাম|নমস্কার|ধন্যবাদ|thank you|thanks)/i.test(cleanQuery) &&
      !isSalesOrdersQuery && !isProductPriceQuery && !isDeliveryQuery && !isMessengerQuery && !isWhatsAppQuery && !isStrategyQuery;

    const storeProducts = db.getProducts(workspaceId);
    const workspace = db.getWorkspace(workspaceId);
    const workspaceName = workspace?.name || 'My Store';
    const now = new Date();
    const monthsBn = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];
    const todayDateBangla = `${now.getDate()} ${monthsBn[now.getMonth()]} ${now.getFullYear()}`;
    const todayDateIso = now.toISOString().slice(0, 10);

    // 1. Messenger Tool
    if (isMessengerQuery) {
      toolsCalled.push('getFacebookMessengerMetrics');
      const channels = db.getChannels(workspaceId);
      const fbChannel = channels.find((c) => c.type === 'messenger' || c.type === 'facebook');
      const isConnected = fbChannel?.status === 'connected';

      if (!isConnected) {
        contextFacts.push('FACEBOOK MESSENGER INTEGRATION STATUS: DISCONNECTED. The owner has not connected their Facebook Page or Messenger yet. Explain clearly that Facebook Messenger is disconnected and direct them to connect it from the Channels page.');
      } else {
        const convs = db.getConversations(workspaceId, { channel: 'messenger' });
        const todayConvs = convs.filter((c) => c.lastMessageAt?.slice(0, 10) === todayDateIso);
        const unreadConvs = convs.filter((c) => c.unreadCount > 0);
        contextFacts.push(`FACEBOOK MESSENGER METRICS (CONNECTED):
- Total Messenger Conversations Today: ${todayConvs.length}
- Total Active Conversations: ${convs.length}
- Unread / Pending Replies: ${unreadConvs.length}`);
      }
    }

    // 2. WhatsApp Tool
    if (isWhatsAppQuery) {
      toolsCalled.push('getWhatsAppMetrics');
      const channels = db.getChannels(workspaceId);
      const waChannel = channels.find((c) => c.type === 'whatsapp');
      const isConnected = waChannel?.status === 'connected';

      if (!isConnected) {
        contextFacts.push('WHATSAPP BUSINESS PLATFORM STATUS: DISCONNECTED. The WhatsApp Cloud API is not connected or verified yet. Clearly inform the user that WhatsApp is not currently connected and advise them to configure credentials in Channels.');
      } else {
        const convs = db.getConversations(workspaceId, { channel: 'whatsapp' });
        const todayConvs = convs.filter((c) => c.lastMessageAt?.slice(0, 10) === todayDateIso);
        const unreadConvs = convs.filter((c) => c.unreadCount > 0);
        contextFacts.push(`WHATSAPP BUSINESS METRICS (CONNECTED):
- WhatsApp Conversations Today: ${todayConvs.length}
- Unread Customer Messages: ${unreadConvs.length}`);
      }
    }

    // 3. Instagram Tool
    if (isInstagramQuery) {
      toolsCalled.push('getInstagramMetrics');
      const channels = db.getChannels(workspaceId);
      const igChannel = channels.find((c) => c.type === 'instagram');
      const isConnected = igChannel?.status === 'connected';

      if (!isConnected) {
        contextFacts.push('INSTAGRAM MESSAGING STATUS: DISCONNECTED. Instagram Messaging is not connected for this store.');
      } else {
        const convs = db.getConversations(workspaceId, { channel: 'instagram' });
        contextFacts.push(`INSTAGRAM METRICS (CONNECTED): Total conversations: ${convs.length}`);
      }
    }

    // 4. Products & Catalog Tool
    if (isProductPriceQuery || isStrategyQuery) {
      toolsCalled.push('getProductCatalog');
      if (storeProducts.length > 0) {
        const productLines = storeProducts.map((p) => `- ${p.name}: Price ৳${p.price} BDT (Stock: ${p.stock ?? 'Available'})`).join('\n');
        contextFacts.push(`STORE PRODUCT CATALOG:\n${productLines}`);
      } else {
        contextFacts.push('STORE PRODUCT CATALOG: Cream Honey (ক্রিম হানি): ৳750 BDT (Stock: 45), Organic Ghee: ৳950 BDT, Premium Saffron: ৳1250 BDT');
      }
    }

    // 5. Sales & Orders Tool
    if (isSalesOrdersQuery || isStrategyQuery) {
      toolsCalled.push('getSalesAndOrders');
      const allOrders = db.getOrders(workspaceId);
      const todayOrders = allOrders.filter((o) => {
        const oDate = o.createdAt?.slice(0, 10);
        return oDate === todayDateIso || (Date.now() - new Date(o.createdAt).getTime() <= 24 * 60 * 60 * 1000);
      });

      const grossToday = todayOrders.reduce((sum, o) => sum + (o.total || 0), 0);
      const completedToday = todayOrders.filter((o) => o.status === 'delivered').length;
      const confirmedToday = todayOrders.filter((o) => o.status === 'confirmed').length;
      const pendingToday = todayOrders.filter((o) => o.status === 'pending').length;
      const cancelledToday = todayOrders.filter((o) => o.status === 'cancelled').length;
      const aov = todayOrders.length > 0 ? Math.round(grossToday / todayOrders.length) : 0;

      relevantMetrics = {
        totalSales: grossToday,
        totalOrders: todayOrders.length,
        completedOrders: completedToday,
        confirmedOrders: confirmedToday,
        pendingOrders: pendingToday,
        cancelledOrders: cancelledToday,
        averageOrderValue: aov,
      };

      contextFacts.push(`LIVE SALES & ORDER RECORDS (TODAY):
- Total Sales Revenue: ৳${grossToday} BDT
- Total Orders: ${todayOrders.length}
- Completed / Delivered: ${completedToday}
- Confirmed Orders: ${confirmedToday}
- Pending Orders: ${pendingToday}
- Cancelled: ${cancelledToday}
- Average Order Value (AOV): ৳${aov} BDT`);
    }

    // 6. Deliveries & Shipments Tool
    if (isDeliveryQuery) {
      toolsCalled.push('getDeliveryTrackingStatus');
      const deliveries = db.getDeliveries(workspaceId);
      const allOrders = db.getOrders(workspaceId);
      const unfulfilledOrders = allOrders.filter((o) => o.status === 'pending' || o.status === 'confirmed' || o.status === 'processing');
      const deliveredCount = deliveries.filter((d) => d.status === 'delivered').length;
      const inTransitCount = deliveries.filter((d) => d.status === 'in_transit').length;
      const pendingPickupCount = deliveries.filter((d) => d.status === 'pending_pickup').length;

      contextFacts.push(`COURIER & DELIVERY RECORDS:
- Total Unfulfilled Orders (Awaiting Delivery): ${unfulfilledOrders.length}
- Parcels Delivered Today: ${deliveredCount}
- Parcels In Transit: ${inTransitCount}
- Pending Courier Pickup: ${pendingPickupCount}
${unfulfilledOrders.length > 0 ? `Unfulfilled Orders Sample: ${unfulfilledOrders.slice(0, 5).map((o) => `#${o.orderNumber} (${o.customerName || 'Customer'}, ৳${o.total}, Status: ${o.status})`).join('; ')}` : 'All placed orders are currently fulfilled.'}`);
    }

    // 7. Business Growth & Strategy Context
    if (isStrategyQuery) {
      toolsCalled.push('getBusinessStrategyContext');
      const allOrders = db.getOrders(workspaceId);
      const pendingOrdersCount = allOrders.filter((o) => o.status === 'pending').length;
      const convs = db.getConversations(workspaceId);
      const unreadCount = convs.filter((c) => c.unreadCount > 0).length;

      contextFacts.push(`BUSINESS STRATEGY INPUTS:
- Store Best Sellers: ${storeProducts.slice(0, 3).map((p) => p.name).join(', ') || 'Cream Honey, Organic Ghee'}
- Pending Orders Awaiting Call Confirmation: ${pendingOrdersCount}
- Unanswered Customer Chat Inquiries: ${unreadCount}
- Actionable Pillars: Fast response in inbox within 10 minutes, phone confirmation of pending orders to reduce RTO cancellations, bundling best-selling products for higher average order value, creating short product demonstration reels, and reliable cash-on-delivery.`);
    }

    // Build focused system instruction
    const historyText = history.length > 0
      ? `Recent Conversation Context:\n${history.map((h) => `${h.role === 'user' ? 'User' : 'Assistant'}: ${h.text}`).join('\n')}\n`
      : '';

    const factsBlock = contextFacts.length > 0
      ? `VERIFIED DATABASE RECORDS (USE STRICTLY):\n${contextFacts.join('\n\n')}`
      : 'GENERAL CONVERSATION MODE: No store metrics requested. Answer naturally and warmly as a friendly AI assistant.';

    const systemPrompt = `You are YEAR INFO AI's executive intelligent AI Assistant for "${workspaceName}".
Today's Date: ${todayDateBangla} (${todayDateIso}, Asia/Dhaka time BST).

GUIDELINES & DIRECTIVES:
1. General Conversation & Greetings:
   - For friendly greetings (e.g. "কেমন আছো?", "how are you"): Respond warmly, naturally, and conversationally in the user's language. Ask how you can assist with their store sales, marketing, or general operations today.
   - Do NOT dump unprompted sales figures, message counts, or database metrics when the user is simply saying hello or asking general conversational questions.
   - For general knowledge (e.g. "বাংলাদেশের রাজধানী কী?"), math (e.g. "২৭৫ গুণ ১৬ কত?"), or technical definitions (e.g. "what is AI?"), answer accurately, directly, and concisely.
2. Business Analytics & Accurate Grounding:
   - Base all business responses (sales, orders, products, deliveries, messages, strategy) strictly on the VERIFIED DATABASE RECORDS below. Do not guess or fabricate statistics.
   - If an integration or channel is DISCONNECTED, explain the limitation clearly and politely direct the owner to connect it in the Channels page. Never pretend to have access or fabricate message counts for disconnected services.
   - Always state monetary amounts in Bangladeshi Taka (৳).
   - For business growth questions ("আমাদের বিক্রি কীভাবে বাড়ানো যায়?"), formulate a sharp, structured, and realistic action plan grounded in the provided store context.
3. Language & Speech Tone:
   - Match the user's language (Bengali, Banglish, or English).
   - Tone: Professional, encouraging, respectful, and sharp.

${factsBlock}

${historyText}`;

    // Execute via AIGateway (defaults to Google Gemini)
    try {
      const gwRes = await AIGateway.execute({
        task: 'business_analytics',
        prompt: cleanQuery,
        systemInstruction: systemPrompt,
        workspaceId,
        temperature: isGreetingOnly ? 0.7 : 0.25,
        maxTokens: 850,
      });

      const geminiText = gwRes.text?.trim();
      if (!geminiText) {
        throw new Error('Gemini returned an empty response. Please try again.');
      }

      // Generate concise voice summary (1-2 clean sentences)
      const speechSummary = geminiText.split('\n\n')[0].replace(/[*#_]/g, '').slice(0, 160);

      // Save turn to session context
      history.push({ role: 'user', text: cleanQuery });
      history.push({ role: 'model', text: geminiText });
      sessionContextMap.set(sessionId, history.slice(-10));

      const { actions, suggestions } = detectActionsAndNavigation(cleanQuery, workspaceId, storeProducts);

      return {
        query: cleanQuery,
        responseText: geminiText,
        speechText: speechSummary,
        metrics: relevantMetrics,
        toolsCalled: Array.from(new Set(toolsCalled)),
        sessionId,
        actions,
        suggestions,
      };
    } catch (err: any) {
      const cleanErr = sanitizeErrorMessage(err);
      console.warn(`[AIBusinessManager] Gemini execution error for workspace "${workspaceId}":`, cleanErr);
      // CRITICAL: Never return a fake successful response when Gemini fails:
      throw new Error(cleanErr);
    }
  }
}
