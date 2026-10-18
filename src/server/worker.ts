import { db } from './db.ts';
import { MetaIntegrationService } from './integrations/meta-service.ts';

class BackgroundPublishingEngine {
  private intervalId: NodeJS.Timeout | null = null;
  private isProcessing = false;

  public start() {
    if (this.intervalId) return;
    console.log('[Scheduler Engine] Starting background publishing worker...');

    // Run every 20 seconds
    this.intervalId = setInterval(() => {
      this.checkAndProcessJobs();
    }, 20000);

    // Initial check immediately on boot
    this.checkAndProcessJobs();
  }

  public stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private async checkAndProcessJobs() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const now = new Date();
      // Collect pending posts across all workspaces in db
      const pendingPosts = ((db as any).data.scheduledPosts || []).filter(
        (p: any) => p.status === 'scheduled' && new Date(p.scheduledAt) <= now
      );

      for (const post of pendingPosts) {
        console.log(`[Scheduler Engine] Processing scheduled post ID: ${post.id} for platforms: ${post.platforms.join(', ')}`);
        db.updateScheduledPost(post.id, { status: 'publishing' });

        const postResults: { platform: string; postId: string; permalinkUrl?: string }[] = [];
        const errors: string[] = [];

        for (const platform of post.platforms) {
          if (platform === 'facebook') {
            const fbResult = await MetaIntegrationService.publishFacebookPagePost(post.workspaceId, {
              caption: post.caption,
              mediaUrls: post.mediaUrls,
              hashtags: post.hashtags,
            });

            if (fbResult.success && fbResult.postId) {
              postResults.push({
                platform: 'facebook',
                postId: fbResult.postId,
                permalinkUrl: fbResult.permalinkUrl,
              });
            } else {
              errors.push(`Facebook: ${fbResult.error || 'Failed to publish to Facebook Page'}`);
            }
          } else if (platform === 'instagram') {
            const igResult = await MetaIntegrationService.publishInstagramPost(post.workspaceId, {
              caption: post.caption,
              mediaUrl: post.mediaUrls?.[0] || '',
              hashtags: post.hashtags,
            });

            if (igResult.success && igResult.postId) {
              postResults.push({
                platform: 'instagram',
                postId: igResult.postId,
              });
            } else {
              errors.push(`Instagram: ${igResult.error || 'Failed to publish to Instagram'}`);
            }
          }
        }

        if (errors.length > 0 && postResults.length === 0) {
          // Never mark as published if the real API call failed
          db.updateScheduledPost(post.id, {
            status: 'failed',
            errorMessage: errors.join('; '),
          });
          continue;
        }

        db.updateScheduledPost(post.id, {
          status: 'published',
          externalPostIds: postResults,
          errorMessage: errors.length > 0 ? `Partial errors: ${errors.join('; ')}` : undefined,
        });

        db.logAudit({
          id: `log_pub_${Date.now()}`,
          workspaceId: post.workspaceId,
          userId: 'system_scheduler',
          userName: 'Background Scheduler',
          action: 'POST_PUBLISHED',
          details: `Successfully published scheduled post to ${postResults.map((p) => p.platform).join(', ')}. Post IDs: ${postResults.map((p) => p.postId).join(', ')}`,
          timestamp: new Date().toISOString(),
        });
      }

      // 2. Check WhatsApp Scheduled Messages
      const pendingMessages = ((db as any).data.scheduledMessages || []).filter(
        (m: any) => m.status === 'scheduled' && new Date(m.scheduledAt) <= now
      );

      for (const msg of pendingMessages) {
        console.log(`[WhatsApp Engine] Sending scheduled message to: ${msg.recipientPhone}`);
        db.updateScheduledMessage(msg.id, { status: 'sending' });

        const waChannel = db.getChannels(msg.workspaceId).find((c) => c.type === 'whatsapp' && c.status === 'connected');
        const cred = db.getChannelCredential(msg.workspaceId, 'whatsapp');
        const token = cred?.accessToken || process.env.WHATSAPP_API_TOKEN;
        const phoneId = cred?.phoneNumberId || waChannel?.accountId || process.env.WHATSAPP_PHONE_NUMBER_ID;

        if (!waChannel || !token || !phoneId) {
          db.updateScheduledMessage(msg.id, {
            status: 'failed',
          });
          continue;
        }

        try {
          const cleanPhone = msg.recipientPhone.replace(/[^0-9]/g, '');
          const waRes = await fetch(`https://graph.facebook.com/v22.0/${phoneId}/messages`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              messaging_product: 'whatsapp',
              recipient_type: 'individual',
              to: cleanPhone,
              type: 'text',
              text: { body: msg.messageContent },
            }),
          });

          const waData = await waRes.json().catch(() => null);
          if (waRes.ok && waData?.messages?.[0]?.id) {
            db.updateScheduledMessage(msg.id, { status: 'sent' });
          } else {
            db.updateScheduledMessage(msg.id, { status: 'failed' });
          }
        } catch (waErr) {
          db.updateScheduledMessage(msg.id, { status: 'failed' });
        }
      }
    } catch (err) {
      console.error('[Scheduler Engine] Error executing background job cycle:', err);
    } finally {
      this.isProcessing = false;
    }
  }

  public isRunning(): boolean {
    return this.intervalId !== null;
  }

  public getDiagnosticInfo() {
    const allPosts = (db as any).data?.scheduledPosts || [];
    const allMessages = (db as any).data?.scheduledMessages || [];
    return {
      running: this.isRunning(),
      intervalSeconds: 20,
      isProcessing: this.isProcessing,
      pendingPostsCount: allPosts.filter((p: any) => p.status === 'scheduled').length,
      publishedPostsCount: allPosts.filter((p: any) => p.status === 'published').length,
      pendingWhatsAppCount: allMessages.filter((m: any) => m.status === 'scheduled').length,
      lastCycleTimestamp: new Date().toISOString(),
    };
  }

  public async runSafeSchedulerTest(): Promise<{
    success: boolean;
    persisted: boolean;
    jobCleanedUp: boolean;
    message: string;
    details: any;
  }> {
    const startTime = Date.now();
    const testPostId = `diag_job_${Date.now()}`;
    const targetWsId = db.getAllWorkspaces()[0]?.id || 'ws_system_diagnostics';
    const testPayload = {
      id: testPostId,
      workspaceId: targetWsId,
      caption: '[DIAGNOSTIC_TEST_JOB] Safe scheduler persistence verification.',
      platforms: ['facebook'] as ('facebook' | 'instagram')[],
      hashtags: ['#test', '#diagnostic'],
      mediaUrls: [],
      scheduledAt: new Date(Date.now() + 86400000).toISOString(), // scheduled tomorrow so it won't fire
      timezone: 'Asia/Dhaka',
      status: 'scheduled' as const,
      createdAt: new Date().toISOString(),
    };

    try {
      // 1. Write job to DB
      db.createScheduledPost(testPayload);

      // 2. Read back from DB to verify persistence across memory/disk store
      const retrieved = (db as any).data?.scheduledPosts?.find((p: any) => p.id === testPostId);
      const persisted = Boolean(retrieved && retrieved.id === testPostId);

      // 3. Immediately clean up test job so no test post ever publishes to social accounts
      db.deleteScheduledPost(testPostId);

      const jobCleanedUp = !(db as any).data.scheduledPosts.some((p: any) => p.id === testPostId);
      const latencyMs = Date.now() - startTime;

      return {
        success: persisted && jobCleanedUp && this.isRunning(),
        persisted,
        jobCleanedUp,
        message: this.isRunning()
          ? `Scheduler background loop active. Test job verified in storage and cleaned up safely (${latencyMs}ms).`
          : 'Scheduler worker is currently stopped.',
        details: {
          testPostId,
          persisted,
          jobCleanedUp,
          schedulerActive: this.isRunning(),
          latencyMs,
        },
      };
    } catch (err: any) {
      return {
        success: false,
        persisted: false,
        jobCleanedUp: false,
        message: err.message || 'Scheduler diagnostic check encountered error.',
        details: { error: err.message },
      };
    }
  }
}

export const backgroundScheduler = new BackgroundPublishingEngine();
