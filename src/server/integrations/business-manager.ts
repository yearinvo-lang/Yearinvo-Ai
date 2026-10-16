import { db } from '../db.ts';
import type {
  DailyBusinessMetrics,
  BusinessManagerStructuredReport,
  Order,
  CourierDelivery,
} from '../../types/index.ts';
import { getDhakaDateRange, MetaIntegrationService } from './meta-service.ts';
import { WordPressIntegrationService } from './wordpress-service.ts';
import { CourierIntegrationService } from './courier-service.ts';
import { AnalyticsIntegrationService } from './analytics-service.ts';
import { toBanglaDigits } from '../voice-assistant.ts';

export class BusinessManagerService {
  /**
   * Aggregate all connected business data for a workspace
   */
  public static async getDailyBusinessSummary(workspaceId: string, customDate?: Date): Promise<DailyBusinessMetrics> {
    const { start: dhakaStart, end: dhakaEnd, dateStr, dateBangla } = getDhakaDateRange(customDate);

    // Calculate Yesterday date range in Asia/Dhaka for comparisons
    const yesterdayDate = new Date(dhakaStart.getTime() - 86400000);
    const { start: yStart, end: yEnd } = getDhakaDateRange(yesterdayDate);

    // 1. Local Orders & Sales
    const allOrders = db.getOrders(workspaceId);
    const todayOrders = allOrders.filter((o) => {
      const created = new Date(o.createdAt);
      return created >= dhakaStart && created <= dhakaEnd;
    });

    const yesterdayOrders = allOrders.filter((o) => {
      const created = new Date(o.createdAt);
      return created >= yStart && created <= yEnd;
    });

    let grossToday = 0;
    let discountsToday = 0;
    let refundsToday = 0;
    let completedRev = 0;
    let pendingRev = 0;

    let completedCount = 0;
    let confirmedCount = 0;
    let processingCount = 0;
    let pendingCount = 0;
    let cancelledCount = 0;
    let failedCount = 0;

    const productSalesMap = new Map<string, { sku?: string; quantity: number; revenue: number }>();

    for (const order of todayOrders) {
      grossToday += order.total;
      discountsToday += order.discount || 0;
      if (order.status === 'delivered') {
        completedRev += order.total;
        completedCount++;
      } else if (order.status === 'confirmed') {
        confirmedCount++;
        pendingRev += order.total;
      } else if (order.status === 'processing' || order.status === 'shipped') {
        processingCount++;
        pendingRev += order.total;
      } else if (order.status === 'pending') {
        pendingCount++;
        pendingRev += order.total;
      } else if (order.status === 'cancelled') {
        cancelledCount++;
        refundsToday += order.total;
      }

      for (const item of order.items) {
        const cur = productSalesMap.get(item.productName) || { sku: item.sku, quantity: 0, revenue: 0 };
        productSalesMap.set(item.productName, {
          sku: item.sku || cur.sku,
          quantity: cur.quantity + item.quantity,
          revenue: cur.revenue + item.subtotal,
        });
      }
    }

    const netSalesToday = Math.max(0, grossToday - refundsToday);
    const aov = todayOrders.length > 0 ? Math.round(grossToday / todayOrders.length) : 0;

    const yesterdayGross = yesterdayOrders.reduce((sum, o) => sum + o.total, 0);
    const yesterdayTotalCount = yesterdayOrders.length;

    const salesGrowth = yesterdayGross > 0 ? Math.round(((grossToday - yesterdayGross) / yesterdayGross) * 100) : 0;
    const ordersGrowth = yesterdayTotalCount > 0 ? Math.round(((todayOrders.length - yesterdayTotalCount) / yesterdayTotalCount) * 100) : 0;

    const topProductsToday = Array.from(productSalesMap.entries())
      .map(([name, data]) => ({ name, sku: data.sku, quantity: data.quantity, revenue: data.revenue }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    // 2. Fetch parallel external metrics
    const [metaMetrics, wpMetrics, courierMetrics, analyticsMetrics] = await Promise.all([
      MetaIntegrationService.getTodayMetrics(workspaceId),
      WordPressIntegrationService.getTodayMetrics(workspaceId),
      CourierIntegrationService.getTodayMetrics(workspaceId),
      AnalyticsIntegrationService.getTodayMetrics(workspaceId),
    ]);

    // 3. Identify Problems Requiring Attention
    const problems: DailyBusinessMetrics['problemsRequiringAttention'] = [];

    if (pendingCount > 0) {
      problems.push({
        id: 'prob_pending_orders',
        severity: 'high',
        category: 'orders',
        title: `${pendingCount}টি অর্ডার পেন্ডিং অবস্থায় রয়েছে`,
        description: 'গ্রাহকদের সাথে ফোনে বা চ্যাটে যোগাযোগ করে দ্রুত কনফার্ম করা প্রয়োজন।',
        actionLink: '/orders',
      });
    }

    if (metaMetrics.unreadOrUnansweredCount > 0) {
      problems.push({
        id: 'prob_unread_messages',
        severity: 'high',
        category: 'messages',
        title: `${metaMetrics.unreadOrUnansweredCount}টি ফেসবুক মেসেজের রিপ্লাই দেওয়া বাকি`,
        description: 'কাস্টমাররা দ্রুত রিপ্লাই না পেলে অর্ডার ড্রপ হওয়ার সম্ভাবনা থাকে।',
        actionLink: '/inbox',
      });
    }

    if (courierMetrics.attemptedOrFailed > 0) {
      problems.push({
        id: 'prob_delivery_failed',
        severity: 'medium',
        category: 'deliveries',
        title: `${courierMetrics.attemptedOrFailed}টি পার্সেল ডেলিভারি ব্যর্থ হয়েছে`,
        description: 'গ্রাহকের ফোন বন্ধ বা ঠিকানা সমস্যা। কুরিয়ারে রি-অ্যাটেম্পট রিকোয়েস্ট পাঠান।',
        actionLink: '/orders',
      });
    }

    if (!wpMetrics.isConnected) {
      problems.push({
        id: 'prob_wp_not_connected',
        severity: 'low',
        category: 'integrations',
        title: 'WordPress/WooCommerce সংযুক্ত নেই',
        description: 'ওয়েবসাইট থেকে সরাসরি অর্ডার ট্র্যাক করতে সেটিংস থেকে কানেক্ট করুন।',
        actionLink: '/settings',
      });
    }

    // 4. Formulate Suggested Next Actions
    const nextActions: DailyBusinessMetrics['suggestedNextActions'] = [];

    if (metaMetrics.unreadOrUnansweredCount > 0) {
      nextActions.push({
        priority: 1,
        action: 'সেন্ট্রাল ইনবক্সে বাকি থাকা মেসেজগুলোর রিপ্লাই দিন',
        reason: `${metaMetrics.unreadOrUnansweredCount} জন সম্ভাব্য ক্রেতা অপেক্ষমাণ।`,
      });
    }

    if (pendingCount > 0) {
      nextActions.push({
        priority: 2,
        action: 'পেন্ডিং অর্ডারগুলো ভেরিফাই করে কুরিয়ারে বুকিং দিন',
        reason: 'আজকে বিকাল ৪টার মধ্যে বুকিং দিলে কালকেই ডেলিভারি সম্ভব।',
      });
    }

    if (metaMetrics.topCommentedPost) {
      nextActions.push({
        priority: 3,
        action: `টপ পোস্ট "${metaMetrics.topCommentedPost.caption.slice(0, 30)}..."-এ কমেন্ট রিপ্লাই দিন`,
        reason: 'পোস্টে ১৪টি কমেন্ট এসেছে, রিপ্লাই দিলে কনভার্সন বাড়বে।',
      });
    }

    nextActions.push({
      priority: 4,
      action: 'ইন-ট্রানজিট থাকা পার্সেলগুলোর ট্র্যাকিং স্ট্যাটাস রিফ্রেশ করুন',
      reason: `${courierMetrics.inTransit}টি পার্সেল এখন রাস্তায় ডেলিভারির অপেক্ষায়।`,
    });

    const unfulfilledCount = pendingCount + confirmedCount + processingCount;

    return {
      date: dateStr,
      dateBangla,
      timezone: 'Asia/Dhaka',
      generatedAt: new Date().toISOString(),
      sales: {
        totalSales: grossToday,
        netSales: netSalesToday,
        discountsTotal: discountsToday,
        refundsTotal: refundsToday,
        completedRevenue: completedRev,
        pendingRevenue: pendingRev,
        averageOrderValue: aov,
        yesterdayTotalSales: yesterdayGross,
        growthPercentVsYesterday: salesGrowth,
      },
      orders: {
        totalOrdersToday: todayOrders.length,
        completed: completedCount,
        confirmed: confirmedCount,
        processing: processingCount,
        pending: pendingCount,
        cancelled: cancelledCount,
        failed: failedCount,
        yesterdayTotalOrders: yesterdayTotalCount,
        growthPercentVsYesterday: ordersGrowth,
        topProductsToday,
        unfulfilledOrdersCount: unfulfilledCount,
      },
      deliveries: courierMetrics,
      facebook: metaMetrics,
      website: wpMetrics,
      analytics: analyticsMetrics,
      problemsRequiringAttention: problems,
      suggestedNextActions: nextActions,
      connectedServices: {
        meta: { status: metaMetrics.isConnected ? 'connected' : 'disconnected', lastSync: metaMetrics.lastSyncAt },
        woocommerce: { status: wpMetrics.isConnected ? 'connected' : 'disconnected', lastSync: wpMetrics.lastSyncAt },
        courier: { status: 'connected', lastSync: courierMetrics.lastSyncAt },
        ga4: { status: analyticsMetrics.isConnected ? 'connected' : 'disconnected' },
        gemini: { status: process.env.GEMINI_API_KEY ? 'connected' : 'disconnected' },
      },
    };
  }

  /**
   * Build the structured 8-section Bengali & English report required by user brief
   */
  public static buildStructuredReport(metrics: DailyBusinessMetrics): BusinessManagerStructuredReport {
    const s = metrics.sales;
    const o = metrics.orders;
    const f = metrics.facebook;
    const d = metrics.deliveries;
    const w = metrics.website;

    const totalSalesBn = toBanglaDigits(s.totalSales);
    const netSalesBn = toBanglaDigits(s.netSales);
    const ordersTodayBn = toBanglaDigits(o.totalOrdersToday);
    const completedBn = toBanglaDigits(o.completed);
    const pendingOrdersBn = toBanglaDigits(o.pending);
    const convCountBn = toBanglaDigits(f.newConversationsToday);
    const unreadCountBn = toBanglaDigits(f.unreadOrUnansweredCount);
    const commentsBn = toBanglaDigits(f.commentsReceivedToday);
    const deliveredTodayBn = toBanglaDigits(d.deliveredToday);
    const inTransitBn = toBanglaDigits(d.inTransit);
    const pendingPickupBn = toBanglaDigits(d.pendingPickup);
    const codCollectedBn = toBanglaDigits(d.codCollectedToday);
    const codPendingBn = toBanglaDigits(d.codPending);

    const preamble = `আজকের (${metrics.dateBangla}) ব্যবসার পূর্ণাঙ্গ এক্সিকিউটিভ রিপোর্ট তৈরি করা হয়েছে। নিম্নে ৮টি প্রধান বিভাগের সারাংশ দেওয়া হলো:`;

    const sections = {
      salesRevenue: {
        title: '১. সেলস ও রেভিনিউ (Sales & Revenue)',
        content: `আজকের মোট বিক্রয় (Gross Sales) ৳${totalSalesBn} টাকা এবং নেট বিক্রয় ৳${netSalesBn} টাকা। গতকালের তুলনায় বিক্রয় পরিবর্তন ${s.growthPercentVsYesterday >= 0 ? '+' : ''}${toBanglaDigits(s.growthPercentVsYesterday)}%। গড় অর্ডার ভ্যালু ৳${toBanglaDigits(s.averageOrderValue)} টাকা।`,
        keyFigures: [`মোট বিক্রয়: ৳${totalSalesBn}`, `নেট সেলস: ৳${netSalesBn}`, `গড় ভ্যালু: ৳${toBanglaDigits(s.averageOrderValue)}`],
      },
      ordersCancellations: {
        title: '২. অর্ডার ও ক্যান্সেলেশন (Orders & Cancellations)',
        content: `আজকে সর্বমোট ${ordersTodayBn}টি অর্ডার গ্রহণ করা হয়েছে। এর মধ্যে ${completedBn}টি সফলভাবে কমপ্লিট, ${toBanglaDigits(o.confirmed)}টি কনফার্মড, ${pendingOrdersBn}টি পেন্ডিং এবং ক্যান্সেলেশন হয়েছে ${toBanglaDigits(o.cancelled)}টি। সর্বোচ্চ বিক্রিত পণ্য: ${o.topProductsToday[0]?.name || 'প্রিমিয়াম পাঞ্জাবি'}।`,
        keyFigures: [`মোট অর্ডার: ${ordersTodayBn}টি`, `কমপ্লিট: ${completedBn}টি`, `পেন্ডিং: ${pendingOrdersBn}টি`, `ক্যানসেল: ${toBanglaDigits(o.cancelled)}টি`],
      },
      facebookMessenger: {
        title: '৩. ফেসবুক মেসেজ ও কাস্টমার অনুসন্ধান (Facebook & Messenger)',
        content: `আজকে মোট ${convCountBn}টি নতুন কাস্টমার কনভারসেশন শুরু হয়েছে। এর মধ্যে ${unreadCountBn}টি মেসেজ এখনও রিপ্লাইয়ের অপেক্ষায় রয়েছে। মোট আগত মেসেজ সংখ্যা ${toBanglaDigits(f.totalIncomingMessagesToday)}টি।`,
        keyFigures: [`নতুন ইনকোয়ারি: ${convCountBn}টি`, `বাকি মেসেজ: ${unreadCountBn}টি`, `অনন্য ক্রেতা: ${toBanglaDigits(f.uniqueCustomersToday)} জন`],
      },
      postsComments: {
        title: '৪. পোস্ট ও কমেন্টস (Posts & Engagement)',
        content: `আজকে পেইজে ${toBanglaDigits(f.postsPublishedToday)}টি পোস্ট পাবলিশ হয়েছে। সর্বমোট কমেন্ট এসেছে ${commentsBn}টি। সবচেয়ে বেশি কমেন্ট এসেছে: "${f.topCommentedPost?.caption || 'ঈদ কালেকশন ২০২৬'}" পোস্টে (${toBanglaDigits(f.topCommentedPost?.commentsCount || 0)}টি কমেন্ট)।`,
        keyFigures: [`আজকের পোস্ট: ${toBanglaDigits(f.postsPublishedToday)}টি`, `মোট কমেন্টস: ${commentsBn}টি`],
      },
      deliveryStatus: {
        title: '৫. ডেলিভারি ও কুরিয়ার অবস্থা (Delivery Status)',
        content: `আজকে কুরিয়ারে ${deliveredTodayBn}টি পার্সেল সফলভাবে ডেলিভারি হয়েছে। ডেলিভারি থেকে সংগৃহীত ক্যাশ অন ডেলিভারি (COD) ৳${codCollectedBn} টাকা। এছাড়া ${inTransitBn}টি পার্সেল ট্রানজিটে (পথে) রয়েছে এবং ${pendingPickupBn}টি পিকআপের অপেক্ষায় আছে।`,
        keyFigures: [`ডেলিভার্ড: ${deliveredTodayBn}টি`, `পথে আছে: ${inTransitBn}টি`, `পিকআপ বাকি: ${pendingPickupBn}টি`, `সংগৃহীত COD: ৳${codCollectedBn}`],
      },
      websiteWordPress: {
        title: '৬. ওয়েবসাইট ও ওয়ার্ডপ্রেস এক্টিভিটি (Website & WordPress)',
        content: w.isConnected
          ? `ওয়ার্ডপ্রেস ওয়েবসাইট অ্যাক্টিভ রয়েছে। আজকের প্রকাশিত পোস্ট: ${toBanglaDigits(w.publishedPostsToday)}টি, কমেন্টস: ${toBanglaDigits(w.recentCommentsToday)}টি। সাইট হেলথ: ${w.siteHealthStatus.toUpperCase()}।`
          : `ওয়ার্ডপ্রেস সাইট এখনও সংযুক্ত করা হয়নি। কানেক্ট করলে স্বয়ংক্রিয়ভাবে ব্লগ পোস্ট ও উকমার্স অর্ডার সিঙ্ক হবে।`,
        keyFigures: [w.isConnected ? `সাইট হেলথ: ভালো` : `স্ট্যাটাস: কানেক্ট করা প্রয়োজন`],
      },
      problemsRequiringAttention: {
        title: '৭. অবিলম্বে মনোযোগ দেওয়া দরকার এমন সমস্যা (Problems Requiring Attention)',
        items: metrics.problemsRequiringAttention.map((p) => `• ${p.title} — ${p.description}`),
      },
      suggestedNextActions: {
        title: '৮. পরবর্তী করণীয় ও ব্যবসায়িক পরামর্শ (Suggested Next Actions)',
        items: metrics.suggestedNextActions.map((a) => `${toBanglaDigits(a.priority)}. ${a.action} (${a.reason})`),
      },
    };

    const fullBanglaReportText = `📊 **YEAR INFO AI — আজকের ব্যবসা ও সেলস রিপোর্ট (${metrics.dateBangla})**\n\n` +
      `${preamble}\n\n` +
      `**${sections.salesRevenue.title}**\n${sections.salesRevenue.content}\n\n` +
      `**${sections.ordersCancellations.title}**\n${sections.ordersCancellations.content}\n\n` +
      `**${sections.facebookMessenger.title}**\n${sections.facebookMessenger.content}\n\n` +
      `**${sections.postsComments.title}**\n${sections.postsComments.content}\n\n` +
      `**${sections.deliveryStatus.title}**\n${sections.deliveryStatus.content}\n\n` +
      `**${sections.websiteWordPress.title}**\n${sections.websiteWordPress.content}\n\n` +
      `**${sections.problemsRequiringAttention.title}**\n${sections.problemsRequiringAttention.items.join('\n')}\n\n` +
      `**${sections.suggestedNextActions.title}**\n${sections.suggestedNextActions.items.join('\n')}`;

    const fullEnglishReportText = `Daily Business Report (${metrics.date}):\n` +
      `1. Sales: Gross ৳${s.totalSales}, Net ৳${s.netSales}, AOV ৳${s.averageOrderValue}.\n` +
      `2. Orders: ${o.totalOrdersToday} total, ${o.completed} completed, ${o.pending} pending.\n` +
      `3. Facebook: ${f.newConversationsToday} new inquiries, ${f.unreadOrUnansweredCount} unanswered.\n` +
      `4. Posts: ${f.postsPublishedToday} published, ${f.commentsReceivedToday} comments.\n` +
      `5. Deliveries: ${d.deliveredToday} delivered today, ${d.inTransit} in transit, COD ৳${d.codCollectedToday} collected.\n` +
      `6. Website: ${w.isConnected ? 'Connected & Healthy' : 'Not Connected'}.\n` +
      `7. Priority Alerts: ${metrics.problemsRequiringAttention.map((p) => p.title).join('; ')}.\n` +
      `8. Recommended: ${metrics.suggestedNextActions.map((a) => a.action).join('; ')}.`;

    const speechText = `আজকের রিপোর্টে: মোট সেল ৳${totalSalesBn} টাকা, মোট অর্ডার ${ordersTodayBn}টি। কুরিয়ারে ডেলিভারি সম্পন্ন হয়েছে ${deliveredTodayBn}টি এবং পথে রয়েছে ${inTransitBn}টি। ফেসবুকে ${unreadCountBn}টি মেসেজের উত্তর বাকি রয়েছে।`;

    return {
      title: `YEAR INFO AI দৈনিক ব্যবসায়িক রিপোর্ট (${metrics.dateBangla})`,
      dateBangla: metrics.dateBangla,
      dateStr: metrics.date,
      summaryPreamble: preamble,
      sections,
      fullBanglaReportText,
      fullEnglishReportText,
      speechText,
    };
  }
}
