import { db } from '../db.ts';
import type { FacebookBusinessMetrics, FacebookPagePostMetrics } from '../../types/index.ts';

/**
 * Get the start and end of "Today" in Bangladesh Standard Time (Asia/Dhaka, UTC+6)
 */
export function getDhakaDateRange(targetDate?: Date): { start: Date; end: Date; dateStr: string; dateBangla: string } {
  const now = targetDate || new Date();
  
  // Format into Asia/Dhaka parts
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Dhaka',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const dateStr = formatter.format(now); // "YYYY-MM-DD"
  
  // Create start of day in Dhaka (00:00:00 BST is UTC-6 hours)
  const [year, month, day] = dateStr.split('-').map(Number);
  const start = new Date(Date.UTC(year, month - 1, day, 0 - 6, 0, 0));
  const end = new Date(Date.UTC(year, month - 1, day, 23 - 6, 59, 59, 999));

  const monthsBn = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];
  const banglaDigits: Record<string, string> = { '0':'০','1':'১','2':'২','3':'৩','4':'৪','5':'৫','6':'৬','7':'৭','8':'৮','9':'৯' };
  const dayBn = String(day).replace(/[0-9]/g, (d) => banglaDigits[d] || d);
  const yearBn = String(year).replace(/[0-9]/g, (d) => banglaDigits[d] || d);
  const dateBangla = `${dayBn} ${monthsBn[month - 1]} ${yearBn}`;

  return { start, end, dateStr, dateBangla };
}

/**
 * Meta Graph API Integration Service
 * Communicates with official Graph API v22.0 or local synchronized channels
 */
export class MetaIntegrationService {
  /**
   * Retrieve Facebook & Messenger metrics for a workspace strictly for today (Asia/Dhaka)
   */
  public static async getTodayMetrics(workspaceId: string): Promise<FacebookBusinessMetrics> {
    const { start: dhakaStart, end: dhakaEnd, dateStr } = getDhakaDateRange();

    // 1. Check connected channel records in database
    const fbChannel = db.getChannel(workspaceId, 'facebook');
    const messengerChannel = db.getChannel(workspaceId, 'messenger');
    const channel = fbChannel || messengerChannel;

    const creds = db.getChannelCredential(workspaceId, 'facebook') || db.getChannelCredential(workspaceId, 'messenger');
    const pageAccessToken = creds?.pageAccessToken || creds?.accessToken;
    const pageId = channel?.metadata?.pageId || channel?.accountId;
    const isConnected = channel?.status === 'connected';

    // Default structure
    const metrics: FacebookBusinessMetrics = {
      isConnected: Boolean(isConnected),
      permissionStatus: isConnected ? 'granted' : 'disconnected',
      grantedPermissions: channel?.metadata?.permissionsGranted || ['public_profile', 'pages_show_list'],
      pageName: channel?.metadata?.pageName || channel?.name || 'Dhaka Fashion Hub',
      pageId: pageId || undefined,
      newConversationsToday: 0,
      totalIncomingMessagesToday: 0,
      uniqueCustomersToday: 0,
      unreadOrUnansweredCount: 0,
      postsPublishedToday: 0,
      commentsReceivedToday: 0,
      leadsOrInquiriesToday: 0,
      lastSyncAt: new Date().toISOString(),
    };

    // 2. Fetch live data from Meta Graph API if active real token is available
    if (isConnected && pageAccessToken && !pageAccessToken.startsWith('client_token_') && pageId) {
      try {
        const sinceTimestamp = Math.floor(dhakaStart.getTime() / 1000);
        const untilTimestamp = Math.floor(dhakaEnd.getTime() / 1000);

        // A. Fetch Page Posts Published Today
        const postsUrl = `https://graph.facebook.com/v22.0/${pageId}/posts?fields=id,message,story,created_time,permalink_url,comments.summary(true),reactions.summary(true)&since=${sinceTimestamp}&access_token=${encodeURIComponent(pageAccessToken)}`;
        const postsRes = await fetch(postsUrl);
        const postsData = await postsRes.json();

        if (postsData.data && Array.isArray(postsData.data)) {
          metrics.postsPublishedToday = postsData.data.length;
          let highestComments = -1;
          let topPostObj: any = null;

          for (const post of postsData.data) {
            const commentsCount = post.comments?.summary?.total_count || 0;
            metrics.commentsReceivedToday += commentsCount;

            if (commentsCount > highestComments) {
              highestComments = commentsCount;
              topPostObj = {
                id: post.id,
                caption: (post.message || post.story || 'Facebook Page Post').slice(0, 100),
                commentsCount,
                sharesCount: post.shares?.count || 0,
                permalinkUrl: post.permalink_url,
                publishedAt: post.created_time,
              };
            }
          }
          if (topPostObj) {
            metrics.topCommentedPost = topPostObj;
          }
        }

        // B. Fetch Messenger Conversations for Today
        const convsUrl = `https://graph.facebook.com/v22.0/${pageId}/conversations?fields=id,updated_time,unread_count,messages{id,created_time,from}&access_token=${encodeURIComponent(pageAccessToken)}`;
        const convsRes = await fetch(convsUrl);
        const convsData = await convsRes.json();

        if (convsData.data && Array.isArray(convsData.data)) {
          const uniqueSenders = new Set<string>();

          for (const conv of convsData.data) {
            const updated = new Date(conv.updated_time);
            if (updated >= dhakaStart && updated <= dhakaEnd) {
              metrics.newConversationsToday += 1;
              if (conv.unread_count > 0) {
                metrics.unreadOrUnansweredCount += 1;
              }
              const msgs = conv.messages?.data || [];
              for (const m of msgs) {
                const msgTime = new Date(m.created_time);
                if (msgTime >= dhakaStart && msgTime <= dhakaEnd) {
                  metrics.totalIncomingMessagesToday += 1;
                  if (m.from?.id && m.from.id !== pageId) {
                    uniqueSenders.add(m.from.id);
                  }
                }
              }
            }
          }
          metrics.uniqueCustomersToday = uniqueSenders.size;
          metrics.leadsOrInquiriesToday = metrics.newConversationsToday;
        }

        metrics.lastSyncAt = new Date().toISOString();
        return metrics;
      } catch (err: any) {
        console.warn('Meta Graph live sync notice (falling back to workspace sync records):', err.message);
        metrics.error = err.message;
      }
    }

    // Fallback to synchronized workspace conversations & scheduled posts from database
    const convs = db.getConversations(workspaceId).filter((c) => c.channel === 'facebook' || c.channel === 'messenger');
    const scheduledPosts = db.getScheduledPosts(workspaceId);

    const uniqueCustomers = new Set<string>();
    for (const c of convs) {
      const msgTime = new Date(c.lastMessageAt || c.createdAt);
      if (msgTime >= dhakaStart && msgTime <= dhakaEnd) {
        metrics.newConversationsToday += 1;
        uniqueCustomers.add(c.customerId);
        if (c.status === 'unread' || c.status === 'open' || c.unreadCount > 0) {
          metrics.unreadOrUnansweredCount += 1;
        }
      }
    }
    metrics.uniqueCustomersToday = uniqueCustomers.size;
    metrics.leadsOrInquiriesToday = metrics.newConversationsToday;

    // Check posts today
    const postsToday = scheduledPosts.filter((p) => {
      const pTime = new Date(p.scheduledAt || p.createdAt);
      return pTime >= dhakaStart && pTime <= dhakaEnd && p.platforms.includes('facebook') && p.status === 'published';
    });
    metrics.postsPublishedToday = postsToday.length;

    return metrics;
  }

  /**
   * Publish a Facebook Page Post via official Meta Graph API v22.0
   * Endpoint: POST /{page-id}/feed or /{page-id}/photos
   */
  public static async publishFacebookPagePost(
    workspaceId: string,
    post: { caption: string; mediaUrls?: string[]; hashtags?: string[] }
  ): Promise<{
    success: boolean;
    postId?: string;
    permalinkUrl?: string;
    error?: string;
  }> {
    const creds = db.getChannelCredential(workspaceId, 'facebook') || db.getChannelCredential(workspaceId, 'messenger');
    const channel = db.getChannel(workspaceId, 'facebook') || db.getChannel(workspaceId, 'messenger');
    const pageAccessToken = creds?.pageAccessToken || creds?.accessToken;
    const pageId = channel?.metadata?.pageId || channel?.accountId;

    if (!pageAccessToken || !pageId) {
      return {
        success: false,
        error: 'Facebook Page is not connected or Page Access Token is missing. Connect your Facebook Page in Channels settings.',
      };
    }

    const hashtagStr = (post.hashtags && post.hashtags.length > 0)
      ? '\n\n' + post.hashtags.map((h) => (h.startsWith('#') ? h : `#${h}`)).join(' ')
      : '';
    const fullCaption = `${post.caption}${hashtagStr}`.trim();

    try {
      const hasPhoto = post.mediaUrls && post.mediaUrls.length > 0 && post.mediaUrls[0].startsWith('http');
      const url = hasPhoto
        ? `https://graph.facebook.com/v22.0/${pageId}/photos`
        : `https://graph.facebook.com/v22.0/${pageId}/feed`;

      const bodyData: Record<string, string> = {
        access_token: pageAccessToken,
      };

      if (hasPhoto) {
        bodyData.url = post.mediaUrls![0];
        bodyData.caption = fullCaption;
      } else {
        bodyData.message = fullCaption;
      }

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data || data.error) {
        const errDetail = data?.error?.message || `HTTP ${res.status} from Meta Graph API`;
        return {
          success: false,
          error: `Meta Graph API Error (${data?.error?.code || res.status}): ${errDetail}`,
        };
      }

      const postId = data.id || data.post_id;
      return {
        success: true,
        postId,
        permalinkUrl: `https://facebook.com/${postId}`,
      };
    } catch (err: any) {
      return {
        success: false,
        error: `Network failure connecting to Meta Graph API: ${err.message}`,
      };
    }
  }

  /**
   * Publish to Instagram Professional Account via Meta Graph API
   * Requires: instagram_basic, instagram_content_publish permissions
   */
  public static async publishInstagramPost(
    workspaceId: string,
    post: { caption: string; mediaUrl: string; hashtags?: string[] }
  ): Promise<{
    success: boolean;
    postId?: string;
    error?: string;
  }> {
    const creds = db.getChannelCredential(workspaceId, 'instagram') || db.getChannelCredential(workspaceId, 'facebook');
    const channel = db.getChannel(workspaceId, 'instagram');
    const pageAccessToken = creds?.pageAccessToken || creds?.accessToken;
    const igUserId = (channel?.metadata as any)?.instagramAccountId || channel?.metadata?.igAccountId || channel?.accountId;

    if (!pageAccessToken || !igUserId) {
      return {
        success: false,
        error: 'Instagram Professional account is not linked or access token is missing. Please connect your linked Instagram account in Channels.',
      };
    }

    if (!post.mediaUrl || !post.mediaUrl.startsWith('http')) {
      return {
        success: false,
        error: 'Instagram API requires a publicly accessible HTTPS image or video URL for media publishing.',
      };
    }

    const hashtagStr = (post.hashtags && post.hashtags.length > 0)
      ? '\n\n' + post.hashtags.map((h) => (h.startsWith('#') ? h : `#${h}`)).join(' ')
      : '';
    const fullCaption = `${post.caption}${hashtagStr}`.trim();

    try {
      // Step 1: Create media container
      const containerRes = await fetch(`https://graph.facebook.com/v22.0/${igUserId}/media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_url: post.mediaUrl,
          caption: fullCaption,
          access_token: pageAccessToken,
        }),
      });

      const containerData = await containerRes.json().catch(() => null);
      if (!containerRes.ok || !containerData || containerData.error || !containerData.id) {
        return {
          success: false,
          error: `Instagram Media Container Error: ${containerData?.error?.message || 'Failed to create media object'}`,
        };
      }

      const creationId = containerData.id;

      // Step 2: Publish media container
      const publishRes = await fetch(`https://graph.facebook.com/v22.0/${igUserId}/media_publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creation_id: creationId,
          access_token: pageAccessToken,
        }),
      });

      const publishData = await publishRes.json().catch(() => null);
      if (!publishRes.ok || !publishData || publishData.error || !publishData.id) {
        return {
          success: false,
          error: `Instagram Media Publish Error: ${publishData?.error?.message || 'Publishing step failed'}`,
        };
      }

      return {
        success: true,
        postId: publishData.id,
      };
    } catch (err: any) {
      return {
        success: false,
        error: `Instagram API connection failed: ${err.message}`,
      };
    }
  }

  /**
   * Send Messenger reply via official Send API
   */
  public static async sendMessengerMessage(
    workspaceId: string,
    recipientId: string,
    messageText: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const creds = db.getChannelCredential(workspaceId, 'facebook') || db.getChannelCredential(workspaceId, 'messenger');
    const pageAccessToken = creds?.pageAccessToken || creds?.accessToken;

    if (!pageAccessToken) {
      return { success: false, error: 'Facebook Page access token is missing.' };
    }

    try {
      const res = await fetch(`https://graph.facebook.com/v22.0/me/messages?access_token=${encodeURIComponent(pageAccessToken)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient: { id: recipientId },
          message: { text: messageText },
          messaging_type: 'RESPONSE',
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data || data.error) {
        return { success: false, error: data?.error?.message || `HTTP ${res.status}` };
      }

      return { success: true, messageId: data.message_id };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Reply to a Facebook post comment
   */
  public static async replyToComment(
    workspaceId: string,
    commentId: string,
    messageText: string,
    isPrivate: boolean = false
  ): Promise<{ success: boolean; replyId?: string; error?: string }> {
    const creds = db.getChannelCredential(workspaceId, 'facebook') || db.getChannelCredential(workspaceId, 'messenger');
    const pageAccessToken = creds?.pageAccessToken || creds?.accessToken;

    if (!pageAccessToken) {
      return { success: false, error: 'Facebook Page access token is missing.' };
    }

    try {
      if (isPrivate) {
        // Send a private message to the commenter
        const res = await fetch(`https://graph.facebook.com/v22.0/me/messages?access_token=${encodeURIComponent(pageAccessToken)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipient: { comment_id: commentId },
            message: { text: messageText },
          }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data || data.error) {
          return { success: false, error: data?.error?.message || `Private reply failed (${res.status})` };
        }
        return { success: true, replyId: data.message_id };
      } else {
        // Public comment reply
        const res = await fetch(`https://graph.facebook.com/v22.0/${commentId}/comments?access_token=${encodeURIComponent(pageAccessToken)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: messageText }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data || data.error) {
          return { success: false, error: data?.error?.message || `Public comment reply failed (${res.status})` };
        }
        return { success: true, replyId: data.id };
      }
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }
}
