import { GoogleGenAI } from '@google/genai';
import { db } from './db.ts';
import type { AIProviderConfig } from '../types/index.ts';

export type AITaskType =
  | 'customer_support'
  | 'comment_classification'
  | 'vision_understanding'
  | 'order_extraction'
  | 'business_analytics'
  | 'voice_assistant'
  | 'marketing_content';

export interface TaskRouteConfig {
  task: AITaskType;
  providerId: string; // 'auto' or specific provider ID
  model?: string;
  fallbackProviderId?: string;
  temperature?: number;
}

export interface AIGatewayInput {
  task: AITaskType;
  prompt: string;
  systemInstruction?: string;
  workspaceId: string;
  conversationId?: string;
  images?: { mimeType: string; dataBase64: string }[];
  temperature?: number;
  maxTokens?: number;
  jsonOutput?: boolean;
}

export interface AIGatewayResult {
  text: string;
  providerId: string;
  providerName: string;
  model: string;
  tokensUsed: number;
  latencyMs: number;
  costUsd: number;
  isFallback: boolean;
  rawJson?: any;
}

export interface ProviderConnectionTestResult {
  success: boolean;
  latencyMs: number;
  message: string;
  modelOutput?: string;
  error?: string;
}

export function sanitizeErrorMessage(err: any): string {
  if (!err) return 'Unknown error';
  const raw = typeof err === 'string' ? err : err.message || String(err);
  const status = (err && typeof err === 'object' && (err.status || err.code)) || undefined;

  let parsed: any = null;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // not JSON
  }

  const code = parsed?.error?.code || status;
  const statusStr = parsed?.error?.status || '';
  const innerMsg = parsed?.error?.message || raw;

  // 1. Missing credentials
  if (/no valid api key|no api credential|api key is required|api_key_missing|not configured/i.test(raw)) {
    return 'API key is missing or not configured. Please enter your API key in Settings > AI Assistant & API Gateway Configuration.';
  }

  // 2. Invalid API Key
  if ((code === 400 || code === 401) && /API_KEY_INVALID|key not valid|invalid api key/i.test(innerMsg)) {
    return 'The provided API key is invalid or expired (API_KEY_INVALID). Please verify and enter a valid API key from Google AI Studio (aistudio.google.com).';
  }

  // 3. Project Denied / Permission Denied
  if (code === 403 || statusStr === 'PERMISSION_DENIED' || /PERMISSION_DENIED|denied access|project has been denied access/i.test(innerMsg)) {
    return 'Project API access restricted (403 PERMISSION_DENIED). Please enter your custom Gemini API key from Google AI Studio (aistudio.google.com) in Settings.';
  }

  // 4. Quota Exceeded / Rate Limit
  if (code === 429 || statusStr === 'RESOURCE_EXHAUSTED' || /RESOURCE_EXHAUSTED|quota exceeded|rate limit/i.test(innerMsg)) {
    return 'AI request limit or quota exceeded (429 RESOURCE_EXHAUSTED). Please wait a few moments or check your quota at Google AI Studio.';
  }

  // 5. Model Not Found / Unsupported
  if (code === 404 || statusStr === 'NOT_FOUND' || /NOT_FOUND|is not found|no longer available/i.test(innerMsg)) {
    return `The requested AI model was not found or is deprecated (404 NOT_FOUND). Please ensure gemini-3.8-flash is configured in AI Providers. (${innerMsg})`;
  }

  // 6. Network / Abort
  if (err?.name === 'AbortError' || /timeout|network|econnrefused|fetch failed/i.test(raw)) {
    return 'Connection to AI service timed out or failed. Please check your internet connectivity.';
  }

  return innerMsg;
}

export class AIGateway {
  /**
   * Execute an AI task through the unified Gateway with per-task routing & automatic fallback
   */
  public static async execute(input: AIGatewayInput): Promise<AIGatewayResult> {
    const { task, prompt, systemInstruction = '', workspaceId, conversationId, images, jsonOutput } = input;
    const startTime = Date.now();

    // 1. Resolve Provider according to Per-Task Routing
    const { primary, fallback, modelOverride, tempOverride } = this.resolveProvidersForTask(task);

    if (!primary) {
      throw new Error(`No active AI provider configured or enabled for task "${task}". Please configure an API key in Owner Settings.`);
    }

    const temperature = input.temperature ?? tempOverride ?? 0.7;
    const maxTokens = input.maxTokens ?? 1024;

    // 2. Try primary provider
    try {
      const result = await this.callProvider({
        provider: primary,
        modelOverride,
        prompt,
        systemInstruction,
        images,
        temperature,
        maxTokens,
        jsonOutput,
        workspaceId,
        conversationId,
        task,
        startTime,
      });

      return {
        ...result,
        isFallback: false,
      };
    } catch (primaryError: any) {
      const cleanErrMsg = sanitizeErrorMessage(primaryError);
      console.log(`[AIGateway] Provider note for task "${task}": ${cleanErrMsg}`);

      // 3. Fallback handling
      if (fallback && fallback.id !== primary.id && fallback.isEnabled) {
        try {
          console.log(`[AIGateway] Initiating fallback to provider "${fallback.name}" for task "${task}"...`);
          const fallbackResult = await this.callProvider({
            provider: fallback,
            prompt,
            systemInstruction,
            images,
            temperature,
            maxTokens,
            jsonOutput,
            workspaceId,
            conversationId,
            task,
            startTime,
          });

          return {
            ...fallbackResult,
            isFallback: true,
          };
        } catch (fallbackError: any) {
          const cleanFallbackMsg = sanitizeErrorMessage(fallbackError);
          console.log(`[AIGateway] Fallback provider note: ${cleanFallbackMsg}`);
          throw new Error(`AI operations unavailable on primary (${cleanErrMsg}) and fallback (${cleanFallbackMsg}).`);
        }
      }

      throw new Error(`AI operations unavailable (${cleanErrMsg}).`);
    }
  }

  /**
   * Dispatch to provider-specific adapter
   */
  private static async callProvider(opts: {
    provider: AIProviderConfig;
    modelOverride?: string;
    prompt: string;
    systemInstruction: string;
    images?: { mimeType: string; dataBase64: string }[];
    temperature: number;
    maxTokens: number;
    jsonOutput?: boolean;
    workspaceId: string;
    conversationId?: string;
    task: AITaskType;
    startTime: number;
  }): Promise<Omit<AIGatewayResult, 'isFallback'>> {
    const { provider, modelOverride, prompt, systemInstruction, images, temperature, maxTokens, jsonOutput, workspaceId, conversationId, task, startTime } = opts;
    const model = modelOverride || provider.model;
    const apiKey = db.getAIProviderCredential(provider.id) || (provider.providerType === 'gemini' ? process.env.GEMINI_API_KEY : '');

    if (!apiKey) {
      throw new Error(`Provider "${provider.name}" has no valid API key configured.`);
    }

    let text = '';
    let tokensUsed = 0;
    let costUsd = 0;

    switch (provider.providerType) {
      case 'gemini': {
        const client = new GoogleGenAI({
          apiKey,
          httpOptions: {
            headers: { 'User-Agent': 'aistudio-build' },
          },
        });

        const contents: any[] = [];
        if (images && images.length > 0) {
          for (const img of images) {
            contents.push({
              inlineData: {
                mimeType: img.mimeType,
                data: img.dataBase64,
              },
            });
          }
        }
        contents.push(prompt);

        const config: any = {
          temperature,
          maxOutputTokens: maxTokens,
        };

        if (systemInstruction) {
          config.systemInstruction = systemInstruction;
        }

        if (jsonOutput) {
          config.responseMimeType = 'application/json';
        }

        const response = await client.models.generateContent({
          model,
          contents,
          config,
        });

        text = response.text || '';
        tokensUsed = Math.ceil((prompt.length + text.length) / 4);
        costUsd = Number(((tokensUsed / 1000) * 0.00015).toFixed(6));
        break;
      }

      case 'anthropic': {
        const url = (provider.apiEndpoint || 'https://api.anthropic.com/v1').replace(/\/+$/, '') + '/messages';
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000);

        const contentBlocks: any[] = [];
        if (images && images.length > 0) {
          for (const img of images) {
            contentBlocks.push({
              type: 'image',
              source: {
                type: 'base64',
                media_type: img.mimeType,
                data: img.dataBase64,
              },
            });
          }
        }
        contentBlocks.push({ type: 'text', text: prompt });

        const body: any = {
          model,
          max_tokens: maxTokens,
          temperature,
          messages: [{ role: 'user', content: contentBlocks }],
        };

        if (systemInstruction) {
          body.system = systemInstruction;
        }

        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error?.message || `Anthropic HTTP ${res.status}: ${res.statusText}`);
        }

        const data = await res.json();
        text = data.content?.[0]?.text || '';
        tokensUsed = (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0) || Math.ceil((prompt.length + text.length) / 4);
        costUsd = Number(((tokensUsed / 1000) * 0.0015).toFixed(6));
        break;
      }

      case 'openai':
      case 'groq':
      case 'custom':
      default: {
        const endpoint = (provider.apiEndpoint || 'https://api.openai.com/v1').replace(/\/+$/, '') + '/chat/completions';
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000);

        const messages: any[] = [];
        if (systemInstruction) {
          messages.push({ role: 'system', content: systemInstruction });
        }

        if (images && images.length > 0) {
          const userContent: any[] = [{ type: 'text', text: prompt }];
          for (const img of images) {
            userContent.push({
              type: 'image_url',
              image_url: { url: `data:${img.mimeType};base64,${img.dataBase64}` },
            });
          }
          messages.push({ role: 'user', content: userContent });
        } else {
          messages.push({ role: 'user', content: prompt });
        }

        const body: any = {
          model,
          messages,
          temperature,
          max_tokens: maxTokens,
        };

        if (jsonOutput) {
          body.response_format = { type: 'json_object' };
        }

        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error?.message || `Provider HTTP ${res.status}: ${res.statusText}`);
        }

        const data = await res.json();
        text = data.choices?.[0]?.message?.content || '';
        tokensUsed = data.usage?.total_tokens || Math.ceil((prompt.length + text.length) / 4);
        costUsd = Number(((tokensUsed / 1000) * 0.0006).toFixed(6));
        break;
      }
    }

    const latencyMs = Date.now() - startTime;

    // Update DB stats & audit
    provider.totalRequests = (provider.totalRequests || 0) + 1;
    provider.totalTokens = (provider.totalTokens || 0) + tokensUsed;

    db.logAIUsage({
      id: `ai_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      workspaceId,
      conversationId,
      model,
      tokensUsed,
      estimatedCostUsd: costUsd,
      timestamp: new Date().toISOString(),
      success: true,
      querySnippet: prompt.substring(0, 100),
    });

    let rawJson: any = undefined;
    if (jsonOutput) {
      try {
        const clean = text.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
        rawJson = JSON.parse(clean);
      } catch {
        // preserve text
      }
    }

    return {
      text,
      providerId: provider.id,
      providerName: provider.name,
      model,
      tokensUsed,
      latencyMs,
      costUsd,
      rawJson,
    };
  }

  /**
   * Execute real live ping test against any AI provider
   */
  public static async testProvider(
    providerId: string,
    testKey?: string,
    testModel?: string,
    testEndpoint?: string
  ): Promise<ProviderConnectionTestResult> {
    const provider = db.getAIProvider(providerId);
    const pType = provider?.providerType || 'gemini';
    const effectiveKey = testKey || db.getAIProviderCredential(providerId) || (pType === 'gemini' ? process.env.GEMINI_API_KEY : undefined);
    const effectiveModel = testModel || provider?.model || (pType === 'gemini' ? 'gemini-3.8-flash' : pType === 'anthropic' ? 'claude-3-5-sonnet-20241022' : 'gpt-4o-mini');
    const effectiveEndpoint = testEndpoint || provider?.apiEndpoint || (pType === 'anthropic' ? 'https://api.anthropic.com/v1' : 'https://api.openai.com/v1');

    if (!effectiveKey) {
      const errorMsg = 'No API credential configured. Please enter a valid API key to test.';
      if (provider) {
        db.updateAIProvider(providerId, {
          lastTestStatus: 'failed',
          lastTestedAt: new Date().toISOString(),
          lastError: errorMsg,
        });
      }
      return { success: false, latencyMs: 0, message: 'Authentication failed', error: errorMsg };
    }

    const startTime = Date.now();

    try {
      if (pType === 'gemini') {
        const client = new GoogleGenAI({
          apiKey: effectiveKey,
          httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
        });

        const response = await client.models.generateContent({
          model: effectiveModel,
          contents: 'Ping verification test for YEAR INFO AI. Reply with: "OK: Gemini Connected".',
          config: { temperature: 0.1, maxOutputTokens: 25 },
        });

        const latencyMs = Date.now() - startTime;
        const text = response.text?.trim() || 'OK: Gemini Connected';

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
      } else if (pType === 'anthropic') {
        const url = effectiveEndpoint.replace(/\/+$/, '') + '/messages';
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000);

        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': effectiveKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: effectiveModel,
            max_tokens: 20,
            messages: [{ role: 'user', content: 'Ping test. Reply with: "OK: Anthropic Connected".' }],
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        const latencyMs = Date.now() - startTime;
        const data = await res.json();

        if (!res.ok) {
          const errorMsg = data.error?.message || `Anthropic returned HTTP ${res.status}`;
          if (provider) {
            db.updateAIProvider(providerId, {
              lastTestStatus: 'failed',
              lastTestedAt: new Date().toISOString(),
              lastError: errorMsg,
            });
          }
          return { success: false, latencyMs, message: `Anthropic test failed (${res.status})`, error: errorMsg };
        }

        const reply = data.content?.[0]?.text?.trim() || 'OK: Connected';
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
          message: `Successfully verified Anthropic Claude API (${latencyMs}ms)`,
          modelOutput: reply,
        };
      } else {
        // OpenAI / Groq / Custom
        const url = effectiveEndpoint.replace(/\/+$/, '') + '/chat/completions';
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
            messages: [{ role: 'user', content: 'Ping test for YEAR INFO AI. Reply with: "OK: Connected".' }],
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
          return { success: false, latencyMs, message: `Request failed with status ${res.status}`, error: errorMsg };
        }

        const reply = data.choices?.[0]?.message?.content?.trim() || 'OK: Connected';
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
      const cleanMsg = err.name === 'AbortError' ? 'Connection timed out after 12s' : sanitizeErrorMessage(err);

      if (provider) {
        db.updateAIProvider(providerId, {
          lastTestStatus: 'failed',
          lastTestedAt: new Date().toISOString(),
          lastError: cleanMsg,
        });
      }

      return {
        success: false,
        latencyMs,
        message: 'Connection test failed',
        error: cleanMsg,
      };
    }
  }

  /**
   * Determine primary and fallback providers for a specific task based on configured task routing
   */
  private static resolveProvidersForTask(task: AITaskType): {
    primary?: AIProviderConfig;
    fallback?: AIProviderConfig;
    modelOverride?: string;
    tempOverride?: number;
  } {
    const routing = db.getTaskRouting();
    const route = routing[task];

    const defaultProv = db.getDefaultAIProvider();
    const fallbackProv = db.getFallbackAIProvider();

    if (!route || route.providerId === 'auto') {
      return {
        primary: defaultProv,
        fallback: fallbackProv,
      };
    }

    const assigned = db.getAIProvider(route.providerId);
    const assignedFallback = route.fallbackProviderId ? db.getAIProvider(route.fallbackProviderId) : fallbackProv;

    return {
      primary: (assigned && assigned.isEnabled) ? assigned : defaultProv,
      fallback: assignedFallback,
      modelOverride: route.model,
      tempOverride: route.temperature,
    };
  }
}
