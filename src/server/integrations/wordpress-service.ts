import { db } from '../db.ts';
import type { WordPressBusinessMetrics } from '../../types/index.ts';
import { getDhakaDateRange } from './meta-service.ts';

/**
 * WordPress & WooCommerce REST API Integration Service
 * Queries official /wp-json/wp/v2 and /wp-json/wc/v3 endpoints
 */
export class WordPressIntegrationService {
  /**
   * Get metrics for WordPress & WooCommerce for today in Asia/Dhaka
   */
  public static async getTodayMetrics(workspaceId: string): Promise<WordPressBusinessMetrics> {
    const { start: dhakaStart, end: dhakaEnd } = getDhakaDateRange();

    // Check saved credentials
    const integ = db.getGlobalIntegration('integ_wordpress');
    const creds = db.getIntegrationCredential('wordpress');

    const siteUrl = creds?.siteUrl || integ?.metadata?.siteUrl || '';
    const consumerKey = creds?.consumerKey || '';
    const consumerSecret = creds?.consumerSecret || '';
    const appPassword = creds?.appPassword || '';
    const isConfigured = Boolean(siteUrl && (consumerKey || appPassword));

    const result: WordPressBusinessMetrics = {
      isConnected: isConfigured,
      siteUrl: siteUrl || undefined,
      isWooCommerceDetected: Boolean(creds?.wooCommerceEnabled || integ?.metadata?.wooCommerceDetected),
      publishedPostsToday: 0,
      recentCommentsToday: 0,
      siteHealthStatus: isConfigured ? 'good' : 'disconnected',
      activeErrors: [],
      lastSyncAt: new Date().toISOString(),
    };

    if (!isConfigured) {
      result.error = 'WordPress REST API is not connected. Configure Site URL and Application Password or WooCommerce Consumer Keys in Settings.';
      return result;
    }

    // Live query against WordPress REST API if credentials exist
    try {
      const cleanUrl = siteUrl.replace(/\/$/, '');
      const authHeader = appPassword
        ? `Basic ${Buffer.from(`${creds?.username || 'admin'}:${appPassword}`).toString('base64')}`
        : (consumerKey && consumerSecret)
        ? `Basic ${Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64')}`
        : '';

      const headers: Record<string, string> = {
        'Accept': 'application/json',
      };
      if (authHeader) headers['Authorization'] = authHeader;

      // 1. Fetch Posts published today
      const afterIso = dhakaStart.toISOString();
      const postsRes = await fetch(`${cleanUrl}/wp-json/wp/v2/posts?after=${encodeURIComponent(afterIso)}&per_page=10`, {
        headers,
      });
      if (postsRes.ok) {
        const posts = await postsRes.json();
        if (Array.isArray(posts)) {
          result.publishedPostsToday = posts.length;
        }
      }

      // 2. Fetch Comments received today
      const commentsRes = await fetch(`${cleanUrl}/wp-json/wp/v2/comments?after=${encodeURIComponent(afterIso)}&per_page=10`, {
        headers,
      });
      if (commentsRes.ok) {
        const comments = await commentsRes.json();
        if (Array.isArray(comments)) {
          result.recentCommentsToday = comments.length;
        }
      }

      // 3. WooCommerce Orders if active
      if (result.isWooCommerceDetected) {
        const wcRes = await fetch(`${cleanUrl}/wp-json/wc/v3/orders?after=${encodeURIComponent(afterIso)}&per_page=20`, {
          headers,
        });
        if (wcRes.ok) {
          const wcOrders = await wcRes.json();
          if (Array.isArray(wcOrders)) {
            let gross = 0;
            let refunds = 0;
            let discounts = 0;
            const productSalesMap = new Map<string, number>();

            for (const order of wcOrders) {
              gross += parseFloat(order.total || '0');
              discounts += parseFloat(order.discount_total || '0');
              if (order.status === 'refunded') {
                refunds += parseFloat(order.total || '0');
              }
              for (const item of (order.line_items || [])) {
                const cur = productSalesMap.get(item.name) || 0;
                productSalesMap.set(item.name, cur + (item.quantity || 1));
              }
            }

            const topProducts = Array.from(productSalesMap.entries())
              .map(([name, quantity]) => ({ name, quantity }))
              .sort((a, b) => b.quantity - a.quantity)
              .slice(0, 3);

            result.wooCommerceStats = {
              ordersToday: wcOrders.length,
              grossSalesToday: gross,
              netSalesToday: Math.max(0, gross - refunds),
              refundsToday: refunds,
              discountsToday: discounts,
              topProductsSold: topProducts,
            };
          }
        }
      }

      return result;
    } catch (err: any) {
      console.warn('WordPress API connection attempt:', err.message);
      result.siteHealthStatus = 'warning';
      result.activeErrors.push(`API sync notice: ${err.message}`);
      return result;
    }
  }
}
