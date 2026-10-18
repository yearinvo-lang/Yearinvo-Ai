import { GoogleGenAI } from '@google/genai';
import { db } from './db.ts';
import type { AIProviderConfig } from '../types/index.ts';

interface GenerateResponseInput {
  workspaceId: string;
  conversationId: string;
  customerMessage: string;
  customerName?: string;
  recentMessages?: { senderType: string; content: string }[];
}

/**
 * Execute real connection test against an AI Provider
 */
export async function testAIProviderConnection(
  providerId: string,
  testKey?: string,
  testModel?: string,
  testEndpoint?: string
): Promise<{
  success: boolean;
  latencyMs: number;
  message: string;
  modelOutput?: string;
  error?: string;
}> {
  const provider = db.getAIProvider(providerId);
  const pType = provider?.providerType || 'gemini';
  const effectiveKey = testKey || db.getAIProviderCredential(providerId) || (pType === 'gemini' ? process.env.GEMINI_API_KEY : undefined);
  const effectiveModel = testModel || provider?.model || (pType === 'gemini' ? 'gemini-3.8-flash' : 'gpt-4o-mini');
  const effectiveEndpoint = testEndpoint || provider?.apiEndpoint || 'https://api.openai.com/v1';

  if (!effectiveKey) {
    const errorMsg = 'No API credential configured. Please provide a valid API key to test connection.';
    if (provider) {
      db.updateAIProvider(providerId, {
        lastTestStatus: 'failed',
        lastTestedAt: new Date().toISOString(),
        lastError: errorMsg,
      });
    }
    return {
      success: false,
      latencyMs: 0,
      message: 'Authentication failed',
      error: errorMsg,
    };
  }

  const startTime = Date.now();

  try {
    if (pType === 'gemini') {
      const client = new GoogleGenAI({
        apiKey: effectiveKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build-yearinfo',
          },
        },
      });

      const response = await client.models.generateContent({
        model: effectiveModel,
        contents: 'Ping test for YEAR INFO AI platform. Reply with: "OK: Gemini Connected".',
        config: {
          temperature: 0.1,
          maxOutputTokens: 25,
        },
      });

      const latencyMs = Date.now() - startTime;
      const text = response.text?.trim() || 'Connected';

      if (provider) {
        db.updateAIProvider(providerId, {
          lastTestStatus: 'success',
          lastTestedAt: new Date().toISOString(),
          lastError: undefined,
          isConfigured: true,
        });
      }

      return {
        success: true,
        latencyMs,
        message: `Successfully verified Google Gemini API (${latencyMs}ms)`,
        modelOutput: text,
      };
    } else {
      // OpenAI / Groq / Custom Compatible Provider via HTTP Chat Completions
      const cleanEndpoint = effectiveEndpoint.replace(/\/+$/, '');
      const url = `${cleanEndpoint}/chat/completions`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${effectiveKey}`,
        },
        body: JSON.stringify({
          model: effectiveModel,
          messages: [{ role: 'user', content: 'Ping test for YEAR INFO AI platform. Reply with: "OK: Connected".' }],
          max_tokens: 20,
          temperature: 0.1,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const latencyMs = Date.now() - startTime;
      const data = await res.json();

      if (!res.ok) {
        const errorMsg = data.error?.message || `Provider returned HTTP ${res.status}: ${res.statusText}`;
        if (provider) {
          db.updateAIProvider(providerId, {
            lastTestStatus: 'failed',
            lastTestedAt: new Date().toISOString(),
            lastError: errorMsg,
          });
        }
        return {
          success: false,
          latencyMs,
          message: `API request failed with status ${res.status}`,
          error: errorMsg,
        };
      }

      const reply = data.choices?.[0]?.message?.content?.trim() || 'Connected';

      if (provider) {
        db.updateAIProvider(providerId, {
          lastTestStatus: 'success',
          lastTestedAt: new Date().toISOString(),
          lastError: undefined,
          isConfigured: true,
        });
      }

      return {
        success: true,
        latencyMs,
        message: `Successfully verified ${provider?.name || 'AI Provider'} (${latencyMs}ms)`,
        modelOutput: reply,
      };
    }
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    const errorMsg = err.name === 'AbortError' ? 'Connection timed out after 12 seconds' : err.message || 'Unknown network error';

    if (provider) {
      db.updateAIProvider(providerId, {
        lastTestStatus: 'failed',
        lastTestedAt: new Date().toISOString(),
        lastError: errorMsg,
      });
    }

    return {
      success: false,
      latencyMs,
      message: 'Connection test failed',
      error: errorMsg,
    };
  }
}

/**
 * Call a specific configured AI provider
 */
async function invokeSpecificProvider(
  provider: AIProviderConfig,
  promptText: string,
  systemInstruction: string,
  workspaceId: string,
  conversationId: string,
  customerMessage: string
): Promise<{ text: string; tokensUsed: number; costUsd: number }> {
  const apiKey = db.getAIProviderCredential(provider.id) || (provider.providerType === 'gemini' ? process.env.GEMINI_API_KEY : '');
  if (!apiKey) {
    throw new Error(`Provider ${provider.name} has no API key configured.`);
  }

  if (provider.providerType === 'gemini') {
    const client = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build-yearinfo',
        },
      },
    });

    const response = await client.models.generateContent({
      model: provider.model || 'gemini-3.8-flash',
      contents: promptText,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    const text = response.text || '';
    const tokensUsed = Math.ceil((promptText.length + text.length) / 4);
    const costUsd = Number(((tokensUsed / 1000) * 0.00015).toFixed(6));

    // Update provider usage
    provider.totalRequests = (provider.totalRequests || 0) + 1;
    provider.totalTokens = (provider.totalTokens || 0) + tokensUsed;

    db.logAIUsage({
      id: `ai_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      workspaceId,
      conversationId,
      model: provider.model,
      tokensUsed,
      estimatedCostUsd: costUsd,
      timestamp: new Date().toISOString(),
      success: true,
      querySnippet: customerMessage.substring(0, 100),
    });

    return { text, tokensUsed, costUsd };
  } else {
    // OpenAI / Groq / Custom HTTP Compatible
    const endpoint = (provider.apiEndpoint || 'https://api.openai.com/v1').replace(/\/+$/, '');
    const res = await fetch(`${endpoint}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: provider.model,
        messages: [
          { role: 'system', content: systemInstruction },
          { role: 'user', content: promptText },
        ],
        temperature: 0.7,
        max_tokens: 800,
      }),
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.error?.message || `HTTP error ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || '';
    const tokensUsed = data.usage?.total_tokens || Math.ceil((promptText.length + text.length) / 4);
    const costUsd = Number(((tokensUsed / 1000) * 0.0005).toFixed(6));

    provider.totalRequests = (provider.totalRequests || 0) + 1;
    provider.totalTokens = (provider.totalTokens || 0) + tokensUsed;

    db.logAIUsage({
      id: `ai_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      workspaceId,
      conversationId,
      model: provider.model,
      tokensUsed,
      estimatedCostUsd: costUsd,
      timestamp: new Date().toISOString(),
      success: true,
      querySnippet: customerMessage.substring(0, 100),
    });

    return { text, tokensUsed, costUsd };
  }
}

export async function processCustomerMessageWithAI(input: GenerateResponseInput): Promise<{
  replyText: string;
  handoffToHuman: boolean;
  handoffReason?: string;
  orderIntentDetected?: boolean;
  orderDraft?: any;
}> {
  const { workspaceId, conversationId, customerMessage, customerName = 'Customer', recentMessages = [] } = input;

  // Check global feature flag
  if (!db.isFeatureEnabled('aiSalesAgent')) {
    return {
      replyText: '',
      handoffToHuman: false,
    };
  }

  const workspace = db.getWorkspace(workspaceId);
  const aiSettings = db.getAISettings(workspaceId);
  const products = db.getProducts(workspaceId).filter((p) => p.available);
  const knowledgeItems = db.getKnowledgeItems(workspaceId);

  // Check if AI is enabled for workspace
  if (!aiSettings || !aiSettings.enabled) {
    return {
      replyText: '',
      handoffToHuman: false,
    };
  }

  // Check for human takeover keywords
  const lowerMsg = customerMessage.toLowerCase();
  const takeoverKeywords = aiSettings.humanTakeoverKeywords || ['human', 'agent', 'support', 'manush', 'kotha bolbo'];
  const wantsHuman = takeoverKeywords.some((kw) => lowerMsg.includes(kw.toLowerCase()));

  if (wantsHuman) {
    db.updateConversation(conversationId, {
      aiActive: false,
      status: 'human_handled',
      aiHandoffReason: 'Customer requested human representative',
    });

    const handoffReply =
      workspace?.language === 'bn' || lowerMsg.match(/[\u0980-\u09FF]/)
        ? 'আপনার অনুরোধটি আমাদের কাস্টমার সাপোর্ট টিমের কাছে হস্তান্তর করা হয়েছে। একজন প্রতিনিধি অতি শীঘ্রই আপনার সাথে যোগাযোগ করবেন। ধন্যবাদ!'
        : 'Your request has been routed to our human support team. A representative will get back to you shortly. Thank you!';

    return {
      replyText: handoffReply,
      handoffToHuman: true,
      handoffReason: 'Human takeover requested',
    };
  }

  // Format business facts context for AI prompt
  const productCatalogText = products
    .map((p) => {
      const variantStr = p.variants.length > 0 ? ` (Variants: ${p.variants.map((v) => `${v.name} @ ${v.price} BDT, Stock: ${v.stock}`).join(', ')})` : '';
      return `- Product: "${p.name}" (Bangla: "${p.nameBengali || p.name}"), SKU: ${p.sku}, Category: ${p.category}, Regular Price: ${p.price} BDT, Current Sale Price: ${p.discountPrice || p.price} BDT, Current Available Stock: ${p.stock}${variantStr}. Details: ${p.description}. Shipping: ${p.shippingInfo || 'Standard'}`;
    })
    .join('\n');

  const knowledgeText = knowledgeItems
    .map((k) => `[Category: ${k.category.toUpperCase()}] Q: ${k.question} -> A: ${k.answer}`)
    .join('\n');

  const systemInstruction = `
You are the official AI Sales Agent for "${workspace?.name || 'YEAR INFO AI Store'}".
Your mission is to assist customers politely, answer product inquiries with 100% accurate facts, and guide them smoothly toward completing an order.

CRITICAL OPERATIONAL RULES (VIOLATION IS STRICTLY PROHIBITED):
1. ACCURACY: Never invent prices, fake discounts, fake stock, or fake delivery policies. Only use facts explicitly stated below in PRODUCT CATALOG and BUSINESS KNOWLEDGE.
2. If a customer asks about a product, stock, or policy NOT in the knowledge base, politely inform them that you will connect them with a human specialist or check details.
3. CURRENCY: Always use "${workspace?.currency || 'BDT'}" (Taka) for currency.
4. LANGUAGE: If the customer writes in Bengali (বাংলা) or Banglish, reply in natural, courteous Bengali. If they write in English, reply in crisp English.
5. TONE: ${aiSettings.brandVoice || 'friendly'}, helpful, professional, and sales-focused.
6. ORDER CONVERSION: If the customer wants to buy, confirm the selected item, size/variant, price, delivery charge, and politely ask for their (1) Full Name, (2) Mobile Number, and (3) Delivery Address for Cash on Delivery or bKash confirmation.
7. NEVER promise an order is completed or shipped until their address and phone number are received.

BUSINESS KNOWLEDGE:
- Store Name: ${workspace?.name}
- Business Type: ${workspace?.businessType}
- Timezone: ${workspace?.timezone || 'Asia/Dhaka'}
${knowledgeText}

ACTIVE PRODUCT CATALOG (REAL INVENTORY):
${productCatalogText}
`;

  const conversationHistoryContext = recentMessages
    .slice(-5)
    .map((m) => `${m.senderType === 'customer' ? customerName : 'AI Agent'}: ${m.content}`)
    .join('\n');

  const promptText = `
CONVERSATION CONTEXT:
${conversationHistoryContext}
${customerName}: ${customerMessage}

Generate your response as the AI Sales Agent now:
`;

  let responseText = '';

  // 1. Get active default AI Provider from Owner Control Center
  const defaultProvider = db.getDefaultAIProvider();
  const fallbackProvider = db.getFallbackAIProvider();

  let providerUsed: AIProviderConfig | null = null;

  if (defaultProvider && defaultProvider.isEnabled) {
    try {
      const result = await invokeSpecificProvider(
        defaultProvider,
        promptText,
        systemInstruction,
        workspaceId,
        conversationId,
        customerMessage
      );
      responseText = result.text;
      providerUsed = defaultProvider;
    } catch (err: any) {
      console.error(`Default AI Provider (${defaultProvider.name}) failed:`, err.message);

      // Try Fallback Provider if enabled
      if (fallbackProvider && fallbackProvider.isEnabled) {
        try {
          console.log(`Routing to fallback AI Provider (${fallbackProvider.name})...`);
          const result = await invokeSpecificProvider(
            fallbackProvider,
            promptText,
            systemInstruction,
            workspaceId,
            conversationId,
            customerMessage
          );
          responseText = result.text;
          providerUsed = fallbackProvider;
        } catch (fallbackErr: any) {
          console.error(`Fallback AI Provider (${fallbackProvider.name}) also failed:`, fallbackErr.message);
          db.createAdminNotification({
            id: `notif_${Date.now()}`,
            type: 'provider_error',
            severity: 'error',
            title: 'AI Providers Failed',
            message: `Primary (${defaultProvider.name}) and Fallback (${fallbackProvider.name}) both failed: ${fallbackErr.message}`,
            read: false,
            createdAt: new Date().toISOString(),
          });
        }
      } else {
        db.createAdminNotification({
          id: `notif_${Date.now()}`,
          type: 'provider_error',
          severity: 'warning',
          title: `AI Provider Error: ${defaultProvider.name}`,
          message: `Request failed: ${err.message}. Deterministic fallback knowledge served.`,
          read: false,
          createdAt: new Date().toISOString(),
        });
      }
    }
  }

  // 2. Fallback to deterministic factual knowledge if AI models unavailable or failed
  if (!responseText) {
    responseText = generateDeterministicFallback(customerMessage, products, knowledgeItems, workspace);
  }

  // Detect order intent
  const orderKeywords = ['অর্ডার', 'কিনব', 'নিতে চাই', 'buy', 'order', 'cash on delivery', 'cod', 'পাঠিয়ে দিন', 'পাঠান'];
  const orderIntentDetected = orderKeywords.some((k) => lowerMsg.includes(k));

  return {
    replyText: responseText,
    handoffToHuman: false,
    orderIntentDetected,
  };
}

function generateDeterministicFallback(
  message: string,
  products: any[],
  knowledgeItems: any[],
  workspace: any
): string {
  const isBengali = message.match(/[\u0980-\u09FF]/) || workspace?.language === 'bn';
  const lower = message.toLowerCase();

  // Check matching product
  for (const p of products) {
    if (
      lower.includes(p.name.toLowerCase()) ||
      (p.nameBengali && lower.includes(p.nameBengali.toLowerCase())) ||
      lower.includes(p.sku.toLowerCase())
    ) {
      const price = p.discountPrice || p.price;
      const stockMsg = p.stock > 0 ? `বর্তমানে স্টকে আছে (${p.stock} পিস)` : 'বর্তমানে স্টক শেষ';
      if (isBengali) {
        return `আসসালামু আলাইকুম! "${p.nameBengali || p.name}" ${stockMsg}। মূল্য: ${price} টাকা। আপনি কি অর্ডার করতে চান? অর্ডার করতে আপনার নাম, মোবাইল নম্বর এবং সম্পূর্ণ ঠিকানা প্রদান করুন।`;
      } else {
        return `Hello! "${p.name}" is currently in stock (${p.stock} available) at ${price} BDT. Would you like to place an order? Please provide your full name, phone number, and delivery address.`;
      }
    }
  }

  // Check delivery queries
  if (lower.includes('delivery') || lower.includes('ডেলিভারি') || lower.includes('চার্জ')) {
    const deliveryKn = knowledgeItems.find((k) => k.category === 'delivery');
    if (deliveryKn) return deliveryKn.answer;
    return isBengali
      ? 'ঢাকার ভিতরে ডেলিভারি চার্জ ৭০ টাকা (১-২ দিন) এবং ঢাকার বাইরে ১৩০ টাকা (৩-৪ দিন)। সারা বাংলাদেশে ক্যাশ অন ডেলিভারি সুবিধা রয়েছে।'
      : 'Delivery charge is 70 BDT inside Dhaka (1-2 days) and 130 BDT outside Dhaka (3-4 days). Cash on delivery is available nationwide.';
  }

  // Check payment queries
  if (lower.includes('payment') || lower.includes('টাকা') || lower.includes('bkash') || lower.includes('বিকাশ')) {
    const paymentKn = knowledgeItems.find((k) => k.category === 'payment');
    if (paymentKn) return paymentKn.answer;
    return isBengali
      ? 'আমরা ক্যাশ অন ডেলিভারি (COD), বিকাশ এবং নগদ পেমেন্ট গ্রহণ করি।'
      : 'We accept Cash on Delivery (COD), bKash, and Nagad.';
  }

  if (isBengali) {
    return `আসসালামু আলাইকুম! ${workspace?.name || 'আমাদের শপে'} আপনাকে স্বাগতম। আপনি কোন পণ্যটি সম্পর্কে জানতে চাচ্ছেন? আমাদের প্রিমিয়াম পাঞ্জাবি, জামদানি শাড়ি ও লেদার কালেকশন দেখতে পারেন।`;
  }
  return `Hello and welcome to ${workspace?.name || 'our store'}! How may I assist you today? Feel free to ask about our available products, prices, or delivery details.`;
}

/**
 * AI Sales Agent Test Playground (Section B)
 * Real execution with business knowledge base, zero impact on real customer orders or chats.
 */
export async function testPlaygroundAIResponse(input: {
  workspaceId?: string;
  question: string;
}): Promise<{
  success: boolean;
  question: string;
  replyText: string;
  providerName: string;
  model: string;
  latencyMs: number;
  languageDetected: 'bn' | 'en';
  queryCategory: 'price' | 'stock' | 'delivery' | 'order' | 'discount' | 'general' | 'unknown_item';
  matchedProducts: { name: string; price: number; stock: number }[];
  factsVerification: {
    pricingAccurate: boolean;
    stockAccurate: boolean;
    hallucinationGuarded: boolean;
  };
  error?: string;
}> {
  const startTime = Date.now();
  const workspaceId = input.workspaceId || db.getAllWorkspaces()[0]?.id || '';
  const question = input.question.trim();
  const workspace = db.getWorkspace(workspaceId);
  const products = db.getProducts(workspaceId);
  const knowledgeItems = db.getKnowledgeItems(workspaceId);
  const activeProvider = db.getDefaultAIProvider();

  const isBengali = /[\u0980-\u09FF]/.test(question) || /koto|dam|taka|ase|hobe/i.test(question);
  const languageDetected: 'bn' | 'en' = isBengali ? 'bn' : 'en';

  const lower = question.toLowerCase();
  let queryCategory: 'price' | 'stock' | 'delivery' | 'order' | 'discount' | 'general' | 'unknown_item' = 'general';
  if (lower.includes('price') || lower.includes('দাম') || lower.includes('মূল্য') || lower.includes('koto') || lower.includes('টাকা')) {
    queryCategory = 'price';
  } else if (lower.includes('stock') || lower.includes('স্টক') || lower.includes('ase') || lower.includes('আছে')) {
    queryCategory = 'stock';
  } else if (lower.includes('delivery') || lower.includes('ডেলিভারি') || lower.includes('charge') || lower.includes('চার্জ')) {
    queryCategory = 'delivery';
  } else if (lower.includes('discount') || lower.includes('ছাড়') || lower.includes('কম')) {
    queryCategory = 'discount';
  }

  // Find products mentioned in user query
  const matched = products.filter(
    (p) =>
      lower.includes(p.name.toLowerCase()) ||
      (p.nameBengali && lower.includes(p.nameBengali.toLowerCase())) ||
      lower.includes(p.sku.toLowerCase())
  );

  if (matched.length === 0 && (queryCategory === 'price' || queryCategory === 'stock')) {
    queryCategory = 'unknown_item';
  }

  try {
    // Generate actual AI reply through primary provider if configured
    let replyText = '';
    let usedProviderName = activeProvider?.name || 'Local Grounded Agent Engine';
    let usedModel = activeProvider?.model || 'grounded-catalog-v1';

    if (activeProvider && activeProvider.isEnabled && (activeProvider.isConfigured || process.env.GEMINI_API_KEY)) {
      const productCatalogText = products
        .map((p) => `- "${p.name}" (Bengali: "${p.nameBengali || p.name}"), Price: ${p.discountPrice || p.price} BDT, Stock: ${p.stock}. Details: ${p.description}`)
        .join('\n');

      const knowledgeText = knowledgeItems.map((k) => `Q: ${k.question} -> A: ${k.answer}`).join('\n');

      const systemInstruction = `You are the AI Sales Agent for "${workspace?.name || 'YEAR INFO AI Store'}".
CRITICAL RULES:
1. ACCURACY: Never invent prices, fake discounts, fake stock, or fake delivery policies.
2. If asked about a product not listed in the catalog, clearly state that it is not available in our current catalog.
3. If asked for discounts not stated in the catalog, politely explain that prices are fixed as listed.
4. Answer in the same language as the customer (${isBengali ? 'Bengali/Banglish' : 'English'}). Be concise, friendly, and helpful.

CATALOG:
${productCatalogText}

KNOWLEDGE:
${knowledgeText}`;

      const res = await invokeSpecificProvider(
        activeProvider,
        question,
        systemInstruction,
        workspaceId,
        'conv_diagnostic_test',
        question
      );
      replyText = res.text.trim();
      usedProviderName = activeProvider.name;
      usedModel = activeProvider.model;
    } else {
      // Fast deterministic grounded response
      replyText = generateDeterministicFallback(question, products, knowledgeItems, workspace);
    }

    const latencyMs = Date.now() - startTime;

    // Evaluate facts verification
    let pricingAccurate = true;
    let stockAccurate = true;
    let hallucinationGuarded = true;

    // If query was about unknown item, verify the response did not invent a fake price
    if (queryCategory === 'unknown_item') {
      const numbersInReply = replyText.match(/\b\d{3,5}\b/g);
      // If AI invented a number without matching catalog, warn
      if (numbersInReply && matched.length === 0 && !lower.includes('delivery')) {
        // Check if number matches standard delivery charges (70 or 130)
        const nonDeliveryNumbers = numbersInReply.filter((n) => n !== '70' && n !== '130');
        if (nonDeliveryNumbers.length > 0) {
          hallucinationGuarded = false;
        }
      }
    }

    // Verify mentioned matched product prices
    if (matched.length > 0) {
      const prod = matched[0];
      const correctPrice = prod.discountPrice || prod.price;
      // If price was asked, check if correct price appears in text
      if (queryCategory === 'price') {
        pricingAccurate = replyText.includes(String(correctPrice));
      }
      if (queryCategory === 'stock') {
        stockAccurate = replyText.includes(String(prod.stock)) || (prod.stock > 0 && /stock|স্টক|আছে/i.test(replyText));
      }
    }

    return {
      success: true,
      question,
      replyText,
      providerName: usedProviderName,
      model: usedModel,
      latencyMs,
      languageDetected,
      queryCategory,
      matchedProducts: matched.map((p) => ({ name: p.name, price: p.discountPrice || p.price, stock: p.stock })),
      factsVerification: {
        pricingAccurate,
        stockAccurate,
        hallucinationGuarded,
      },
    };
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    return {
      success: false,
      question,
      replyText: '',
      providerName: activeProvider?.name || 'AI Provider',
      model: activeProvider?.model || 'unknown',
      latencyMs,
      languageDetected,
      queryCategory,
      matchedProducts: matched.map((p) => ({ name: p.name, price: p.discountPrice || p.price, stock: p.stock })),
      factsVerification: {
        pricingAccurate: false,
        stockAccurate: false,
        hallucinationGuarded: true,
      },
      error: err.message || 'AI generation failed',
    };
  }
}

