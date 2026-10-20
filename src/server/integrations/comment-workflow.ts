import { GoogleGenAI } from '@google/genai';
import { db } from '../db.ts';
import { MetaIntegrationService } from './meta-service.ts';
import { AIGateway, sanitizeErrorMessage } from '../ai-gateway.ts';

export type CommentCategory =
  | 'purchase_intent'
  | 'price_inquiry'
  | 'product_inquiry'
  | 'general_discussion'
  | 'complaint'
  | 'spam';

export interface CommentWorkflowInput {
  workspaceId: string;
  commentId: string;
  postId?: string;
  commentText: string;
  authorName?: string;
  authorId?: string;
  platform?: 'facebook' | 'instagram';
  autoReply?: boolean;
}

export interface CommentWorkflowResult {
  commentId: string;
  category: CommentCategory;
  confidence: number;
  publicReplyText: string;
  privateFollowUpText?: string;
  publicReplyPublished: boolean;
  privateReplySent: boolean;
  escalatedToOwner: boolean;
  leadCreated: boolean;
  error?: string;
}

export class CommentToSalesWorkflow {
  /**
   * Process incoming post comment: classify, generate reply, send public/private response, and record lead
   */
  public static async processComment(input: CommentWorkflowInput): Promise<CommentWorkflowResult> {
    const {
      workspaceId,
      commentId,
      postId,
      commentText,
      authorName = 'Customer',
      authorId,
      platform = 'facebook',
      autoReply = true,
    } = input;

    const workspace = db.getWorkspace(workspaceId);
    const products = db.getProducts(workspaceId).filter((p) => p.available);
    const knowledge = db.getKnowledgeItems(workspaceId);

    // 1. Classify comment with Gemini AI (or deterministic fallback)
    const classification = await this.classifyCommentWithAI(commentText, products, workspace);

    let publicReplyText = classification.suggestedPublicReply;
    let privateFollowUpText = classification.suggestedPrivateFollowUp;
    let publicReplyPublished = false;
    let privateReplySent = false;
    let escalatedToOwner = false;
    let leadCreated = false;

    // 2. Handle Complaints or Negative Feedback
    if (classification.category === 'complaint') {
      escalatedToOwner = true;
      db.createAdminNotification({
        id: `notif_complaint_${Date.now()}`,
        type: 'customer_complaint',
        severity: 'warning',
        title: `Customer Complaint on ${platform.toUpperCase()}`,
        message: `Customer "${authorName}" posted: "${commentText.slice(0, 100)}". Public polite reply dispatched; owner intervention recommended.`,
        read: false,
        createdAt: new Date().toISOString(),
      });
    }

    // 3. Handle Leads & Purchase Intent
    if (classification.category === 'purchase_intent' || classification.category === 'price_inquiry') {
      leadCreated = true;
      // Record or update customer profile as active sales lead
      const existingCust = authorId ? db.getCustomers(workspaceId).find((c) => c.channelIdentifiers?.some((ci) => ci.externalId === authorId)) : null;
      if (!existingCust && authorId) {
        db.createCustomer({
          id: `cust_lead_${Date.now()}`,
          workspaceId,
          name: authorName,
          phone: '',
          primaryChannel: platform === 'instagram' ? 'instagram' : 'facebook',
          channelIdentifiers: [
            {
              channelType: platform === 'instagram' ? 'instagram' : 'facebook',
              externalId: authorId,
              username: authorName,
            },
          ],
          totalOrders: 0,
          totalSpent: 0,
          tags: ['social_lead', classification.category],
          createdAt: new Date().toISOString(),
        });
      }
    }

    // 4. Dispatch Public Reply if autoReply enabled and not spam
    if (autoReply && classification.category !== 'spam' && publicReplyText) {
      if (platform === 'facebook') {
        const pubRes = await MetaIntegrationService.replyToComment(workspaceId, commentId, publicReplyText, false);
        publicReplyPublished = pubRes.success;
      }
    }

    // 5. Dispatch Private Follow-Up if purchase intent or price inquiry
    if (
      autoReply &&
      (classification.category === 'purchase_intent' || classification.category === 'price_inquiry') &&
      privateFollowUpText &&
      platform === 'facebook'
    ) {
      const privRes = await MetaIntegrationService.replyToComment(workspaceId, commentId, privateFollowUpText, true);
      privateReplySent = privRes.success;
    }

    return {
      commentId,
      category: classification.category,
      confidence: classification.confidence,
      publicReplyText,
      privateFollowUpText,
      publicReplyPublished,
      privateReplySent,
      escalatedToOwner,
      leadCreated,
    };
  }

  /**
   * Classify comment using Google Gemini AI with catalog grounding
   */
  private static async classifyCommentWithAI(
    commentText: string,
    products: any[],
    workspace: any
  ): Promise<{
    category: CommentCategory;
    confidence: number;
    suggestedPublicReply: string;
    suggestedPrivateFollowUp?: string;
  }> {
    try {
      const catalogSummary = products
        .slice(0, 10)
        .map((p) => `- ${p.name} (Bengali: ${p.nameBengali || p.name}): ৳${p.discountPrice || p.price} BDT, Stock: ${p.stock}`)
        .join('\n');

      const prompt = `You are YEAR INFO AI's Social Comment-to-Sales intelligence engine for "${workspace?.name || 'Retail Store'}".
Analyze the following social media post comment.

COMMENT: "${commentText}"

AVAILABLE PRODUCTS CATALOG:
${catalogSummary}

INSTRUCTIONS:
1. Classify the comment into EXACTLY one category:
   - purchase_intent: wants to buy, order, cash on delivery, or complete checkout
   - price_inquiry: asking about price, cost, discount, or how much it is
   - product_inquiry: asking about fabric, size, color, stock, or delivery time
   - general_discussion: compliment, nice picture, emoji, greeting
   - complaint: angry, late delivery, wrong item, bad quality, scam accusation
   - spam: link spam, promotion of external scam/crypto, irrelevant gibberish
2. Formulate a polite, factual public reply in natural Bengali (or English if the comment is in English). Use exact product prices from the catalog.
3. If category is purchase_intent or price_inquiry, formulate a brief private follow-up message inviting them to complete the order with COD.

Return JSON in this format ONLY:
{
  "category": "purchase_intent" | "price_inquiry" | "product_inquiry" | "general_discussion" | "complaint" | "spam",
  "confidence": 0.95,
  "publicReply": "public response here",
  "privateFollowUp": "private follow up here"
}`;

      const gwResult = await AIGateway.execute({
        task: 'comment_classification',
        prompt,
        workspaceId: workspace?.id || 'default',
        temperature: 0.1,
        jsonOutput: true,
      });

      const parsed = gwResult.rawJson || (gwResult.text ? JSON.parse(gwResult.text.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim()) : null);
      if (parsed) {
        return {
          category: parsed.category || 'general_discussion',
          confidence: parsed.confidence || 0.9,
          suggestedPublicReply: parsed.publicReply || '',
          suggestedPrivateFollowUp: parsed.privateFollowUp,
        };
      }
    } catch (err: any) {
      const cleanErr = sanitizeErrorMessage(err);
      console.warn('[Comment Workflow] AIGateway comment classification unavailable (falling back to rule engine):', cleanErr);
    }

    // Deterministic Rule Engine Fallback
    const lower = commentText.toLowerCase();

    if (/অর্ডার|কিনব|নিতে চাই|order|buy|cod|ক্যাশ অন|পাঠিয়ে দিন/i.test(lower)) {
      return {
        category: 'purchase_intent',
        confidence: 0.88,
        suggestedPublicReply: 'আসসালামু আলাইকুম! অর্ডার কনফার্ম করতে আমরা আপনাকে ইনবক্সে বিস্তারিত পাঠিয়েছি। অনুগ্রহ করে আপনার ইনবক্স চেক করুন।',
        suggestedPrivateFollowUp: 'আসসালামু আলাইকুম! আপনি যে পণ্যটি অর্ডার করতে চান, অনুগ্রহ করে আপনার মোবাইল নম্বর এবং ডেলিভারি ঠিকানা দিন। আমরা ক্যাশ অন ডেলিভারিতে দ্রুত পাঠিয়ে দেব।',
      };
    }

    if (/দাম|price|koto|কত|মূল্য|discount|ছাড়/i.test(lower)) {
      const matched = products.find((p) => lower.includes(p.name.toLowerCase()) || lower.includes((p.nameBengali || '').toLowerCase()));
      const priceText = matched ? `৳${matched.discountPrice || matched.price} টাকা` : 'আমাদের ইনবক্সে বিস্তারিত দেওয়া হয়েছে';
      return {
        category: 'price_inquiry',
        confidence: 0.85,
        suggestedPublicReply: `আসসালামু আলাইকুম! পণ্যটির মূল্য ${priceText}। অর্ডার করতে ইনবক্সে আপনার নাম ও ঠিকানা দিন।`,
        suggestedPrivateFollowUp: `আসসালামু আলাইকুম! পণ্যটির বর্তমান অফার মূল্য ${priceText}। ডেলিভারি চার্জ ঢাকার মধ্যে ৭০ টাকা, বাইরে ১৩০ টাকা। অর্ডার করতে চান কি?`,
      };
    }

    if (/সাইজ|কালার|স্টক|ফেব্রিক|ডেলিভারি|size|color|stock|delivery/i.test(lower)) {
      return {
        category: 'product_inquiry',
        confidence: 0.8,
        suggestedPublicReply: 'আসসালামু আলাইকুম! পণ্যটি প্রিমিয়াম কোয়ালিটিতে বর্তমানে স্টকে অ্যাভেইলেবল রয়েছে। সাইজ বা কালার সংক্রান্ত যেকোনো তথ্যের জন্য ইনবক্স করুন।',
      };
    }

    if (/বাজে|ফালতু|ভুয়া|খারাপ|দেরি|অভিযোগ|cheat|scam|bad|fake|late/i.test(lower)) {
      return {
        category: 'complaint',
        confidence: 0.9,
        suggestedPublicReply: 'আসসালামু আলাইকুম। আপনার যেকোনো অসুবিধার জন্য আমরা আন্তরিকভাবে দুঃখিত। বিষয়টি দ্রুত সমাধানে আমাদের প্রতিনিধি ইনবক্সে যোগাযোগ করছেন।',
      };
    }

    if (/t\.me|bit\.ly|whatsapp\.com|free money|earn money/i.test(lower)) {
      return {
        category: 'spam',
        confidence: 0.95,
        suggestedPublicReply: '',
      };
    }

    return {
      category: 'general_discussion',
      confidence: 0.75,
      suggestedPublicReply: 'ধন্যবাদ আপনার সুন্দর মন্তব্যের জন্য! YEAR INFO AI-র সাথেই থাকুন।',
    };
  }
}
