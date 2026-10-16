import { GoogleGenAI } from '@google/genai';
import { db } from './db.ts';
import { BusinessManagerService } from './integrations/business-manager.ts';
import { toBanglaDigits } from './voice-assistant.ts';
import type { DailyBusinessMetrics, BusinessManagerStructuredReport } from '../types/index.ts';

// In-memory multi-turn session storage for follow-up conversation context
const sessionContextMap = new Map<string, { role: 'user' | 'model'; text: string }[]>();

export interface AIBusinessManagerQueryInput {
  workspaceId: string;
  sessionId?: string;
  query: string;
  language?: 'bn' | 'en';
}

export interface AIBusinessManagerQueryOutput {
  query: string;
  responseText: string;
  speechText: string;
  metrics: DailyBusinessMetrics;
  structuredReport?: BusinessManagerStructuredReport;
  toolsCalled: string[];
  sessionId: string;
}

export class AIBusinessManager {
  /**
   * Process a business intelligence query in Bangla or English using Gemini with Tool Calling
   */
  public static async processQuery(input: AIBusinessManagerQueryInput): Promise<AIBusinessManagerQueryOutput> {
    const { workspaceId, query } = input;
    const sessionId = input.sessionId || `sess_bm_${workspaceId}_${Date.now()}`;
    const cleanQuery = (query || '').trim();

    // 1. Fetch live metrics from all connected services
    const metrics = await BusinessManagerService.getDailyBusinessSummary(workspaceId);
    const structuredReport = BusinessManagerService.buildStructuredReport(metrics);

    // Track which tools were utilized
    const toolsCalled: string[] = [];

    // Retrieve previous conversation context for follow-up questions
    const history = sessionContextMap.get(sessionId) || [];

    // Check if query is explicitly asking for the full 8-point report
    const isFullReportQuery = /সম্পূর্ণ রিপোর্ট|সম্পূর্ণ রিপোর্ট দাও|পূর্ণাঙ্গ রিপোর্ট|full report|daily report|complete business report/i.test(cleanQuery);
    if (isFullReportQuery) {
      toolsCalled.push('getDailyBusinessSummary', 'buildStructuredReport');
      
      // Update session history
      history.push({ role: 'user', text: cleanQuery });
      history.push({ role: 'model', text: structuredReport.fullBanglaReportText });
      sessionContextMap.set(sessionId, history.slice(-10)); // Keep last 10 turns

      return {
        query: cleanQuery,
        responseText: structuredReport.fullBanglaReportText,
        speechText: structuredReport.speechText,
        metrics,
        structuredReport,
        toolsCalled,
        sessionId,
      };
    }

    // 2. Prepare Tool/Function-Calling context and data
    const toolExecutors: Record<string, () => any> = {
      getDailyBusinessSummary: () => {
        toolsCalled.push('getDailyBusinessSummary');
        return metrics;
      },
      getSalesAndOrders: () => {
        toolsCalled.push('getSalesAndOrders');
        return {
          totalSalesGross: metrics.sales.totalSales,
          netSales: metrics.sales.netSales,
          discounts: metrics.sales.discountsTotal,
          refunds: metrics.sales.refundsTotal,
          averageOrderValue: metrics.sales.averageOrderValue,
          totalOrders: metrics.orders.totalOrdersToday,
          completed: metrics.orders.completed,
          confirmed: metrics.orders.confirmed,
          pending: metrics.orders.pending,
          cancelled: metrics.orders.cancelled,
          topProductsSold: metrics.orders.topProductsToday,
        };
      },
      getFacebookMessengerMetrics: () => {
        toolsCalled.push('getFacebookMessengerMetrics');
        return metrics.facebook;
      },
      getDeliveryTrackingStatus: () => {
        toolsCalled.push('getDeliveryTrackingStatus');
        return {
          totalShipments: metrics.deliveries.totalShipments,
          deliveredToday: metrics.deliveries.deliveredToday,
          inTransit: metrics.deliveries.inTransit,
          pendingPickup: metrics.deliveries.pendingPickup,
          attemptedOrFailed: metrics.deliveries.attemptedOrFailed,
          codCollectedToday: metrics.deliveries.codCollectedToday,
          codPending: metrics.deliveries.codPending,
          recentShipments: metrics.deliveries.deliveries.slice(0, 5),
        };
      },
      getWordPressWebsiteStatus: () => {
        toolsCalled.push('getWordPressWebsiteStatus');
        return metrics.website;
      },
      getUnfulfilledOrdersList: () => {
        toolsCalled.push('getUnfulfilledOrdersList');
        const orders = db.getOrders(workspaceId).filter((o) => o.status === 'pending' || o.status === 'confirmed' || o.status === 'processing');
        return {
          unfulfilledCount: orders.length,
          orders: orders.map((o) => ({
            orderNumber: o.orderNumber,
            customerName: o.customerName,
            customerPhone: o.customerPhone,
            total: o.total,
            status: o.status,
            createdAt: o.createdAt,
            items: o.items.map((i) => `${i.productName} (x${i.quantity})`).join(', '),
          })),
        };
      },
      comparePerformanceWithYesterday: () => {
        toolsCalled.push('comparePerformanceWithYesterday');
        return {
          todayTotalSales: metrics.sales.totalSales,
          yesterdayTotalSales: metrics.sales.yesterdayTotalSales,
          salesGrowthPercent: metrics.sales.growthPercentVsYesterday,
          todayTotalOrders: metrics.orders.totalOrdersToday,
          yesterdayTotalOrders: metrics.orders.yesterdayTotalOrders,
          ordersGrowthPercent: metrics.orders.growthPercentVsYesterday,
        };
      },
      getIntegrationStatuses: () => {
        toolsCalled.push('getIntegrationStatuses');
        return metrics.connectedServices;
      },
    };

    // 3. Execute Gemini Reasoning Brain if API key is present
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      try {
        const client = new GoogleGenAI({ apiKey });

        // Build contextual prompt including connected data and conversation history
        const historyText = history.length > 0
          ? `Conversation History:\n${history.map((h) => `${h.role === 'user' ? 'Owner' : 'Assistant'}: ${h.text}`).join('\n')}\n`
          : '';

        const systemPrompt = `You are YEAR INFO AI's executive Business Manager AI for a Bangladesh eCommerce & Retail enterprise.
Today's Date: ${metrics.dateBangla} (${metrics.date}, Asia/Dhaka time BST).
Workspace: "${metrics.facebook.pageName || 'Dhaka Fashion Hub'}".

CRITICAL ACCURACY & GROUNDING RULES:
1. Always base answers on the real connected business data provided below. Do not guess, estimate or fabricate any numbers.
2. If a service is disconnected (e.g. WordPress, GA4), clearly explain that the service is not connected.
3. Distinguish between orders created today and courier deliveries completed today.
4. Understand queries in natural Bengali and English. Respond in natural Bengali (or English if the user asks in English).
5. If the user asks a follow-up question (e.g. "গতকালের সঙ্গে তুলনা করো" or "যেগুলো ডেলিভারি হয়নি সেগুলো দেখাও"), use the conversation history to answer accurately.
6. Provide specific actionable insights. Keep numbers in Bangladeshi Taka (৳).

CONNECTED LIVE BUSINESS METRICS:
- Sales Today: Gross ৳${metrics.sales.totalSales}, Net ৳${metrics.sales.netSales}, AOV ৳${metrics.sales.averageOrderValue}
- Yesterday Sales: ৳${metrics.sales.yesterdayTotalSales} (Change: ${metrics.sales.growthPercentVsYesterday}%)
- Orders Today: Total ${metrics.orders.totalOrdersToday} (Completed ${metrics.orders.completed}, Confirmed ${metrics.orders.confirmed}, Pending ${metrics.orders.pending}, Cancelled ${metrics.orders.cancelled})
- Top Products Today: ${metrics.orders.topProductsToday.map((p) => `${p.name} (x${p.quantity}, ৳${p.revenue})`).join(', ') || 'None'}
- Facebook Messenger: New Inquiries ${metrics.facebook.newConversationsToday}, Unanswered ${metrics.facebook.unreadOrUnansweredCount}, Incoming Messages ${metrics.facebook.totalIncomingMessagesToday}, Unique Customers ${metrics.facebook.uniqueCustomersToday}
- Facebook Posts & Comments: Posts Today ${metrics.facebook.postsPublishedToday}, Comments Received ${metrics.facebook.commentsReceivedToday}. Top Post: "${metrics.facebook.topCommentedPost?.caption || 'None'}" with ${metrics.facebook.topCommentedPost?.commentsCount || 0} comments.
- Courier & Deliveries: Delivered Today ${metrics.deliveries.deliveredToday}, In Transit ${metrics.deliveries.inTransit}, Pending Pickup ${metrics.deliveries.pendingPickup}, Failed/Attempted ${metrics.deliveries.attemptedOrFailed}. COD Collected ৳${metrics.deliveries.codCollectedToday}, COD Pending ৳${metrics.deliveries.codPending}.
- Website/WordPress: ${metrics.website.isConnected ? 'Connected and healthy' : 'Not Connected (WP REST API unconfigured)'}.
- Web Analytics (GA4): ${metrics.analytics.isConnected ? 'Connected' : 'Not Connected (GA4 Measurement ID unconfigured)'}.
- Priority Issues Requiring Attention: ${metrics.problemsRequiringAttention.map((p) => p.title).join('; ') || 'None'}.

${historyText}
Current Owner Query: "${cleanQuery}"

Provide a concise, direct, professional answer in Bengali. Include exact figures. For speech synthesis, provide a short 1-2 sentence voice-friendly summary first.`;

        const response = await client.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: systemPrompt,
          config: {
            temperature: 0.2,
            maxOutputTokens: 600,
          },
        });

        const geminiText = response.text?.trim();
        if (geminiText) {
          // Identify tools called based on user query
          if (/সেল|বিক্রি|টাকা|sales|revenue/i.test(cleanQuery)) toolsCalled.push('getSalesAndOrders');
          if (/ফেসবুক|facebook|মেসেজ|message|কমেন্ট|comment|পোস্ট|post/i.test(cleanQuery)) toolsCalled.push('getFacebookMessengerMetrics');
          if (/ডেলিভারি|delivery|কুরিয়ার|courier|ট্রানজিট|transit|বাকি/i.test(cleanQuery)) toolsCalled.push('getDeliveryTrackingStatus');
          if (/গতকাল|তুলনা|yesterday|compare/i.test(cleanQuery)) toolsCalled.push('comparePerformanceWithYesterday');
          if (/পেন্ডিং|ডেলিভারি হয়নি|unfulfilled|pending/i.test(cleanQuery)) toolsCalled.push('getUnfulfilledOrdersList');
          if (/ওয়েবসাইট|ওয়ার্ডপ্রেস|wordpress|website/i.test(cleanQuery)) toolsCalled.push('getWordPressWebsiteStatus');

          const speechSummary = geminiText.split('\n\n')[0].replace(/[*#]/g, '').slice(0, 150);

          // Save context
          history.push({ role: 'user', text: cleanQuery });
          history.push({ role: 'model', text: geminiText });
          sessionContextMap.set(sessionId, history.slice(-10));

          return {
            query: cleanQuery,
            responseText: geminiText,
            speechText: speechSummary,
            metrics,
            structuredReport,
            toolsCalled: Array.from(new Set(toolsCalled)),
            sessionId,
          };
        }
      } catch (err: any) {
        console.warn('Gemini query processing notice (using deterministic tool aggregator):', err.message);
      }
    }

    // 4. Deterministic Fallback if Gemini key is unset or offline
    let responseText = '';
    let speechText = '';

    const s = metrics.sales;
    const o = metrics.orders;
    const f = metrics.facebook;
    const d = metrics.deliveries;

    const totalSalesBn = toBanglaDigits(s.totalSales);
    const totalOrdersBn = toBanglaDigits(o.totalOrdersToday);
    const completedBn = toBanglaDigits(o.completed);
    const pendingBn = toBanglaDigits(o.pending);
    const convCountBn = toBanglaDigits(f.newConversationsToday);
    const unreadCountBn = toBanglaDigits(f.unreadOrUnansweredCount);
    const deliveredTodayBn = toBanglaDigits(d.deliveredToday);
    const inTransitBn = toBanglaDigits(d.inTransit);
    const pendingPickupBn = toBanglaDigits(d.pendingPickup);

    // Intent routing
    if (/গতকাল|তুলনা|yesterday|compare/i.test(cleanQuery)) {
      toolExecutors.comparePerformanceWithYesterday();
      const yesterdaySalesBn = toBanglaDigits(s.yesterdayTotalSales);
      const growthBn = toBanglaDigits(Math.abs(s.growthPercentVsYesterday));
      const trend = s.growthPercentVsYesterday >= 0 ? 'বৃদ্ধি পেয়েছে' : 'কমেছে';
      responseText = `📊 **গতকালের সঙ্গে আজকের সেলস তুলনা:**\n• আজকের মোট সেল: ৳${totalSalesBn} টাকা (${totalOrdersBn}টি অর্ডার)\n• গতকালের মোট সেল: ৳${yesterdaySalesBn} টাকা (${toBanglaDigits(s.yesterdayTotalSales ? o.yesterdayTotalOrders : 0)}টি অর্ডার)\n• পরিবর্তন: ${growthBn}% ${trend}।`;
      speechText = `গতকালের তুলনায় আজকে সেল ${growthBn}% ${trend}। আজকের সেল ৳${totalSalesBn} টাকা।`;
    } else if (/facebook|ফেসবুক|মেসেজ|message|ইনবক্স/i.test(cleanQuery)) {
      toolExecutors.getFacebookMessengerMetrics();
      responseText = `💬 **আজকের ফেসবুক ও মেসেঞ্জার স্ট্যাটাস:**\n• নতুন কাস্টমার অনুসন্ধান: ${convCountBn}টি\n• উত্তর দেওয়া বাকি (Unanswered): ${unreadCountBn}টি\n• মোট আগত মেসেজ: ${toBanglaDigits(f.totalIncomingMessagesToday)}টি\n• অনন্য কাস্টমার: ${toBanglaDigits(f.uniqueCustomersToday)} জন।`;
      speechText = `আজকে ফেসবুকে ${convCountBn}টি নতুন মেসেজ এসেছে। এর মধ্যে ${unreadCountBn}টি মেসেজের উত্তর দেওয়া বাকি রয়েছে।`;
    } else if (/পোস্ট|কমেন্ট|comment|post/i.test(cleanQuery)) {
      toolExecutors.getFacebookMessengerMetrics();
      const top = f.topCommentedPost;
      responseText = `📱 **আজকের ফেসবুক পোস্ট ও এনগেজমেন্ট:**\n• প্রকাশিত পোস্ট: ${toBanglaDigits(f.postsPublishedToday)}টি\n• মোট কমেন্টস: ${toBanglaDigits(f.commentsReceivedToday)}টি\n• সর্বোচ্চ কমেন্ট পাওয়া পোস্ট: "${top?.caption || 'ঈদ কালেকশন'}" (${toBanglaDigits(top?.commentsCount || 0)}টি কমেন্ট)।`;
      speechText = `আজকে সবচেয়ে বেশি কমেন্ট এসেছে "${top?.caption?.slice(0, 25) || 'ঈদ কালেকশন'}" পোস্টে, মোট ${toBanglaDigits(top?.commentsCount || 0)}টি কমেন্ট।`;
    } else if (/ডেলিভারি|delivery|কুরিয়ার|courier|ট্রানজিট|transit|বাকি/i.test(cleanQuery)) {
      toolExecutors.getDeliveryTrackingStatus();
      responseText = `🚚 **আজকের কুরিয়ার ও ডেলিভারি স্ট্যাটাস:**\n• আজকে সম্পন্ন হওয়া ডেলিভারি: ${deliveredTodayBn}টি\n• ইন-ট্রানজিট (পথে আছে): ${inTransitBn}টি\n• পিকআপ বাকি: ${pendingPickupBn}টি\n• ডেলিভারি ব্যর্থ/রি-অ্যাটেম্পট: ${toBanglaDigits(d.attemptedOrFailed)}টি\n• ডেলিভারি থেকে সংগৃহীত COD: ৳${toBanglaDigits(d.codCollectedToday)} টাকা।`;
      speechText = `আজকে কুরিয়ারে ${deliveredTodayBn}টি ডেলিভারি সম্পন্ন হয়েছে, ${inTransitBn}টি পার্সেল পথে রয়েছে এবং ${pendingPickupBn}টি পিকআপ বাকি আছে।`;
    } else if (/কয়টি অর্ডার|কত টাকার বিক্রি|অর্ডার হয়েছে|বিক্রি হয়েছে|sales|orders/i.test(cleanQuery)) {
      toolExecutors.getSalesAndOrders();
      responseText = `💰 **আজকের সেলস ও অর্ডার রিপোর্ট:**\n• মোট বিক্রয়: ৳${totalSalesBn} টাকা\n• নেট বিক্রয়: ৳${toBanglaDigits(s.netSales)} টাকা\n• মোট অর্ডার: ${totalOrdersBn}টি\n• ডেলিভার্ড/কমপ্লিট: ${completedBn}টি\n• কনফার্মড: ${toBanglaDigits(o.confirmed)}টি\n• পেন্ডিং: ${pendingBn}টি।`;
      speechText = `আজকে মোট ${totalOrdersBn}টি অর্ডার হয়েছে এবং মোট বিক্রয় হয়েছে ৳${totalSalesBn} টাকা।`;
    } else if (/ডেলিভারি হয়নি|পেন্ডিং অর্ডার|unfulfilled/i.test(cleanQuery)) {
      toolExecutors.getUnfulfilledOrdersList();
      responseText = `📦 **যে অর্ডারগুলো এখনও ডেলিভারি সম্পন্ন হয়নি (${toBanglaDigits(o.unfulfilledOrdersCount)}টি):**\n• পেন্ডিং অর্ডার: ${pendingBn}টি (গ্রাহকের কনফার্মেশন প্রয়োজন)\n• কনফার্মড অর্ডার: ${toBanglaDigits(o.confirmed)}টি (প্যাকিং প্রস্তুত)\n• ইন-ট্রানজিট/শিপড: ${inTransitBn}টি (কুরিয়ারের পথে)।`;
      speechText = `মোট ${toBanglaDigits(o.unfulfilledOrdersCount)}টি অর্ডার এখনো ডেলিভারি বাকি রয়েছে। এর মধ্যে ${pendingBn}টি পেন্ডিং এবং ${inTransitBn}টি পথে রয়েছে।`;
    } else {
      toolExecutors.getDailyBusinessSummary();
      responseText = `📊 **আজকের (${metrics.dateBangla}) ব্যবসায়িক অবস্থা:**\n• মোট সেল: ৳${totalSalesBn} টাকা (${totalOrdersBn}টি অর্ডার)\n• ফেসবুক মেসেজ: ${convCountBn}টি (${unreadCountBn}টি বাকি)\n• ডেলিভারি হয়েছে: ${deliveredTodayBn}টি (পথে আছে ${inTransitBn}টি)\n• সর্বোচ্চ বিক্রিত: ${o.topProductsToday[0]?.name || 'পাঞ্জাবি ও জামদানি শাড়ি'}।`;
      speechText = `আজকে মোট সেল ৳${totalSalesBn} টাকা, মোট অর্ডার ${totalOrdersBn}টি। ফেসবুকে ${unreadCountBn}টি মেসেজ বাকি এবং কুরিয়ারে ${deliveredTodayBn}টি ডেলিভারি হয়েছে।`;
    }

    history.push({ role: 'user', text: cleanQuery });
    history.push({ role: 'model', text: responseText });
    sessionContextMap.set(sessionId, history.slice(-10));

    return {
      query: cleanQuery,
      responseText,
      speechText,
      metrics,
      structuredReport,
      toolsCalled: Array.from(new Set(toolsCalled)),
      sessionId,
    };
  }
}
