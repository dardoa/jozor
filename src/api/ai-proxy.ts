import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { authenticateUser } from '../utils/authUtils';
import type {
  AIProxyImagePayload,
  AIProxyRequest,
  AncestorChatAIRequestData,
  BiographyAIRequestData,
  KindiPlanAIRequestData,
} from '../types/ai';

export const config = { runtime: 'edge' };

const resolveAllowedOrigin = () => {
  const candidate = process.env.APP_ORIGIN ?? process.env.VITE_APP_ORIGIN;
  if (typeof candidate === 'string' && candidate.trim()) {
    return candidate;
  }

  return 'http://localhost:5173';
};
const ALLOWED_ORIGIN = resolveAllowedOrigin();
const MAX_PROMPT_LENGTH = 30_000;
let supabaseAdminClient: SupabaseClient | null = null;

function logServerError(context: string, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;
  console.error(`[${context}] ${message}`, { stack });
}

function isInvalidProviderKeyError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes('API_KEY_INVALID')
    || message.toLowerCase().includes('api key expired')
    || message.toLowerCase().includes('api key not valid');
}

/*
type AIUsagePeriod = 'daily' | 'monthly';

interface AIUsageReservation {
  allowed: boolean;
  usage_count: number;
  limit: number;
  last_reset: string;
  period: AIUsagePeriod;
  next_reset: string;
}
*/

type HeaderRecord = Record<string, string | string[] | undefined>;

function getAuthorizationHeader(headers: Headers | HeaderRecord): string | undefined {
  const maybeGetter = (headers as { get?: unknown }).get;
  if (typeof maybeGetter === 'function') {
    const getHeader = maybeGetter as Headers['get'];
    return getHeader.call(headers, 'authorization') ?? getHeader.call(headers, 'Authorization') ?? undefined;
  }

  const headerRecord = headers as HeaderRecord;
  const value = headerRecord.authorization ?? headerRecord.Authorization;
  return Array.isArray(value) ? value[0] : value;
}

function getSupabaseAdminClient(): SupabaseClient {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase service role is not configured for AI usage enforcement.');
  }

  if (!supabaseAdminClient) {
    supabaseAdminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  }

  return supabaseAdminClient;
}

/*
async function reserveAIUsage(userId: string): Promise<AIUsageReservation> {
  const supabaseAdmin = getSupabaseAdminClient();
  const { data, error } = await supabaseAdmin.rpc('reserve_ai_usage', {
    p_user_id: userId,
  });

  if (error) {
    throw new Error(`Failed to validate AI usage: ${error.message}`);
  }

  const reservation = Array.isArray(data) ? data[0] : data;
  if (!reservation) {
    throw new Error('AI usage validation returned no data.');
  }

  return reservation as AIUsageReservation;
}

function buildUsageLimitMessage(usage: AIUsageReservation): string {
  return `AI usage limit exceeded for this ${usage.period} period. Try again after ${usage.next_reset}.`;
}
*/

function getBiographyPrompt(data: BiographyAIRequestData): string {
  const {
    fullName,
    gender,
    birthDate,
    birthPlace,
    deathDate,
    deathPlace,
    parentsCount,
    spousesCount,
    childrenCount,
    relatives,
    toneInstruction,
    preferredLanguage,
  } = data;

  return `You are a family-history writer.

Write a short biography using HTML paragraphs only.
Keep it concise, factual, and suitable for a family tree application.
Use the provided real values only and avoid inventing details.
Language: ${preferredLanguage === 'ar' ? 'Arabic' : 'English'}.
${toneInstruction}

Person:
- Full name: ${fullName || 'Unknown'}
- Gender: ${gender ?? ''}
- Birth date: ${birthDate ?? ''}
- Birth place: ${birthPlace ?? ''}
- Death date: ${deathDate ?? ''}
- Death place: ${deathPlace ?? ''}
- Parents count: ${parentsCount}
- Spouses count: ${spousesCount}
- Children count: ${childrenCount}
- Relatives: ${relatives}`;
}

function getAncestorChatPrompt(data: AncestorChatAIRequestData): string {
  const {
    fullName,
    birthPlace,
    birthDate,
    deathPlace,
    deathDate,
    preferredLanguage,
    historyText,
    newMessage,
  } = data;

  return `Respond as an ancestor persona for a family-tree chat.
Keep answers short, warm, and grounded in the provided information.
Do not claim facts that are not supported by the supplied data.
Language: ${preferredLanguage === 'ar' ? 'Arabic' : 'English'}.

Ancestor:
- Name: ${fullName || 'Unknown'}
- Birth place: ${birthPlace || 'Unknown'}
- Birth date: ${birthDate || 'Unknown'}
- Death place: ${deathPlace || 'Unknown'}
- Death date: ${deathDate || 'Unknown'}

Previous conversation:
${historyText || 'No prior conversation.'}

User message:
${newMessage}`;
}

function getKindiPlanPrompt(data: KindiPlanAIRequestData): string {
  const redactedText = String(data.redactedText || '').trim();

  return `You are Kindi's strict classifier and planning parser for the Jozor family-tree app.
Classify the user's redacted message and, only when it is a clear executable family-tree command, include a draft plan.
You are not a chat assistant and you never write the final user-facing answer.

Hard rules:
- Return exactly one valid JSON object and nothing else.
- Do not use markdown or code fences.
- Never output person IDs, database IDs, UUIDs, or invented identifiers.
- Never invent names. Preserve redaction tokens such as [NAME_1] and [NAME_2] exactly as received.
- If the message is not a clear executable command, return category only and do not include a draft.
- Use confidence from 0 to 1.
- Use targetMention for the existing person being acted on.
- Use newPersonName only for the new person being added.
- Use updates only for fields explicitly stated by the user.
- Classify greetings, general help, irrelevant/off-topic messages, and unclear family messages instead of inventing a plan.

Allowed JSON shape:
{
  "category": "EXECUTABLE_COMMAND" | "FAMILY_QUERY" | "SUPPORT" | "GREETING" | "IRRELEVANT" | "UNCLEAR",
  "draft": {
    "intent": "ADD" | "UPDATE" | "DELETE" | "QUERY" | "UNKNOWN",
    "relation": "parent" | "child" | "spouse" | "son" | "daughter" | "wife" | "husband" | "father" | "mother",
    "gender": "male" | "female" | "M" | "F",
    "targetMention": "[NAME_1]",
    "newPersonName": "[NAME_2]",
    "updates": {
      "firstName": "string",
      "middleName": "string",
      "lastName": "string",
      "nickName": "string",
      "birthDate": "YYYY-MM-DD or YYYY",
      "birthPlace": "string",
      "deathDate": "YYYY-MM-DD or YYYY",
      "deathPlace": "string",
      "residence": "string",
      "profession": "string",
      "bio": "string"
    },
    "missingFields": ["string"],
    "confidence": 0.0
  },
  "clarifyingQuestion": "short Arabic question when category is UNCLEAR or FAMILY_QUERY",
  "confidence": 0.0
}

Examples:
Input: "أضف ابن ل[NAME_1] اسمه [NAME_2]"
Output: {"category":"EXECUTABLE_COMMAND","draft":{"intent":"ADD","relation":"son","gender":"male","targetMention":"[NAME_1]","newPersonName":"[NAME_2]","missingFields":[],"confidence":0.95},"confidence":0.95}

Input: "add wife for [NAME_1] named [NAME_2]"
Output: {"category":"EXECUTABLE_COMMAND","draft":{"intent":"ADD","relation":"wife","gender":"female","targetMention":"[NAME_1]","newPersonName":"[NAME_2]","missingFields":[],"confidence":0.95},"confidence":0.95}

Input: "عدل مهنة [NAME_1] إلى طبيب"
Output: {"category":"EXECUTABLE_COMMAND","draft":{"intent":"UPDATE","targetMention":"[NAME_1]","updates":{"profession":"طبيب"},"missingFields":[],"confidence":0.9},"confidence":0.9}

Input: "عدل السيرة الذاتية ل[NAME_1] اضف انه صاحب اكبر كرشة"
Output: {"category":"EXECUTABLE_COMMAND","draft":{"intent":"UPDATE","targetMention":"[NAME_1]","updates":{"bio":"صاحب اكبر كرشة"},"missingFields":[],"confidence":0.86},"confidence":0.86}

Input: "احذف [NAME_1]"
Output: {"category":"EXECUTABLE_COMMAND","draft":{"intent":"DELETE","targetMention":"[NAME_1]","missingFields":[],"confidence":0.9},"confidence":0.9}

Input: "أضف ابن ل[NAME_1]"
Output: {"category":"EXECUTABLE_COMMAND","draft":{"intent":"ADD","relation":"son","gender":"male","targetMention":"[NAME_1]","missingFields":["newPersonName"],"confidence":0.85},"confidence":0.85}

Input: "مرحبا كيندي"
Output: {"category":"GREETING","confidence":0.95}

Input: "كيف أضيف زوجة؟"
Output: {"category":"SUPPORT","confidence":0.9}

Input: "ما حالة الطقس؟"
Output: {"category":"IRRELEVANT","confidence":0.95}

Input: "محمود من طرف أمه"
Output: {"category":"UNCLEAR","clarifyingQuestion":"هل تريد البحث عن محمود، أم تعديل علاقة تخص طرف الأم؟","confidence":0.65}

Redacted user command:
"""${redactedText}"""`;
}

interface OperationPromptConfig {
  prompt: string;
  image?: AIProxyImagePayload;
  preferredModels?: string[];
}

function getOperationPrompt(body: AIProxyRequest): OperationPromptConfig {
  switch (body.operation) {
    case 'biography':
      return { prompt: getBiographyPrompt(body.data) };
    case 'ancestor_chat':
      return { prompt: getAncestorChatPrompt(body.data) };
    case 'kindi_plan':
      return {
        prompt: getKindiPlanPrompt(body.data),
        preferredModels: ['gemini-1.5-flash'],
      };
    case 'extract_person_data':
    case 'family_story':
      return { prompt: body.prompt };
    case 'analyze_image':
      return { prompt: body.prompt, image: body.image };
    default: {
      const exhaustiveCheck: never = body;
      throw new Error(`Unsupported AI operation: ${String(exhaustiveCheck)}`);
    }
  }
}

async function generateViaProvider(prompt: string, image?: AIProxyImagePayload, preferredModels: string[] = []) {
  const googleAIKey = process.env.GOOGLE_AI_KEY || process.env.GEMINI_API_KEY;

  if (!googleAIKey) {
    throw new Error('AI provider key is not configured on the server.');
  }

  if (!prompt || prompt.length > MAX_PROMPT_LENGTH) {
    throw new Error(`Prompt exceeds maximum length of ${MAX_PROMPT_LENGTH} characters`);
  }

  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(googleAIKey);
  const modelsToTry = [
    ...preferredModels,
    'gemini-2.0-flash-lite',
    'gemini-2.0-flash',
    'gemini-2.5-flash-lite',
    'gemini-2.5-flash',
    'gemini-flash-lite-latest',
    'gemini-2.5-pro',
    'gemini-3-pro-preview',
  ];

  let lastError: unknown = null;
  for (const modelName of modelsToTry) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const content = image
        ? [prompt, { inlineData: { data: image.data, mimeType: image.mimeType } }]
        : prompt;
      const result = await model.generateContent(content);
      const response = await result.response;
      const text = response.text();

      if (text) {
        return { result: text, model: modelName };
      }
    } catch (error) {
      if (isInvalidProviderKeyError(error)) {
        throw new Error('AI provider API key is invalid or expired. Renew GEMINI_API_KEY or GOOGLE_AI_KEY and restart the dev server.');
      }

      lastError = error;
      logServerError('API_AI_PROXY_MODEL', error);
    }
  }

  throw lastError || new Error('All AI provider attempts failed.');
}

export default async function handler(req: Request) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return Response.json({
      error: {
        message: 'Method not allowed',
        code: 'METHOD_NOT_ALLOWED',
      },
    }, { status: 405, headers: corsHeaders });
  }

  // Resilient header retrieval to support both Edge Runtime and Node.js local dev.
  const authHeader = getAuthorizationHeader(req.headers);
  
  const user = await authenticateUser(authHeader);
  if (!user) {
    return Response.json({
      error: {
        message: 'Invalid or expired authentication token',
        code: 'UNAUTHORIZED',
      },
    }, { status: 401, headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as AIProxyRequest;
    const { prompt, image, preferredModels } = getOperationPrompt(body);
    const supabaseAdmin = getSupabaseAdminClient();
    
    // 1. Fetch user's subscription tier
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('tier')
      .eq('id', user.uid)
      .single();

    if (profileError || !profile) {
      return Response.json({
        error: {
          message: 'Failed to retrieve user profile tier.',
          code: 'PROFILE_RETRIEVAL_ERROR',
        },
      }, { status: 500, headers: corsHeaders });
    }

    const tier = profile.tier || 'free';

    // 2. Reject Free tier users
    if (tier === 'free') {
      return Response.json({
        error: {
          message: 'AI Cloud features are only available on Pro and Family plans.',
          code: 'TIER_LIMIT_EXCEEDED',
        },
      }, { status: 403, headers: corsHeaders });
    }

    let cloudRequestsUsed = 0;
    let cloudRequestsLimit = 30;
    let resetAtStr = '';

    // 3. Check and increment quota for Pro tier users
    if (tier === 'pro') {
      const { data: usage, error: usageError } = await supabaseAdmin
        .from('ai_monthly_usage')
        .select('*')
        .eq('user_id', user.uid)
        .maybeSingle();

      if (usageError) {
        return Response.json({
          error: {
            message: 'Failed to retrieve AI usage records.',
            code: 'USAGE_RETRIEVAL_ERROR',
          },
        }, { status: 500, headers: corsHeaders });
      }

      const now = new Date();
      if (!usage) {
        // Create first usage record
        const resetAt = new Date();
        resetAt.setMonth(resetAt.getMonth() + 1);
        
        const { data: newUsage, error: insertError } = await supabaseAdmin
          .from('ai_monthly_usage')
          .insert({
            user_id: user.uid,
            cloud_requests_used: 1,
            cloud_requests_limit: 30,
            reset_at: resetAt.toISOString(),
          })
          .select()
          .single();

        if (insertError || !newUsage) {
          return Response.json({
            error: {
              message: 'Failed to initialize AI usage record.',
              code: 'USAGE_INITIALIZATION_ERROR',
            },
          }, { status: 500, headers: corsHeaders });
        }
        cloudRequestsUsed = 1;
        resetAtStr = resetAt.toISOString();
      } else {
        const resetAt = new Date(usage.reset_at);
        if (now >= resetAt) {
          // Reset usage for new billing cycle
          const nextReset = new Date();
          nextReset.setMonth(nextReset.getMonth() + 1);
          
          const { data: resetUsage, error: resetError } = await supabaseAdmin
            .from('ai_monthly_usage')
            .update({
              cloud_requests_used: 1,
              reset_at: nextReset.toISOString(),
              updated_at: now.toISOString(),
            })
            .eq('user_id', user.uid)
            .select()
            .single();

          if (resetError || !resetUsage) {
            return Response.json({
              error: {
                message: 'Failed to reset AI usage record.',
                code: 'USAGE_RESET_ERROR',
              },
            }, { status: 500, headers: corsHeaders });
          }
          cloudRequestsUsed = 1;
          resetAtStr = nextReset.toISOString();
        } else {
          // Check if limit exceeded
          if (usage.cloud_requests_used >= usage.cloud_requests_limit) {
            return Response.json({
              error: {
                message: 'Monthly Pro AI cloud request limit exceeded. Upgrade to Family for unlimited cloud access.',
                code: 'AI_USAGE_LIMIT_EXCEEDED',
                details: {
                  used: usage.cloud_requests_used,
                  limit: usage.cloud_requests_limit,
                  resetAt: usage.reset_at,
                },
              },
            }, { status: 429, headers: corsHeaders });
          }

          // Increment usage
          const { data: updatedUsage, error: updateError } = await supabaseAdmin
            .from('ai_monthly_usage')
            .update({
              cloud_requests_used: usage.cloud_requests_used + 1,
              updated_at: now.toISOString(),
            })
            .eq('user_id', user.uid)
            .select()
            .single();

          if (updateError || !updatedUsage) {
            return Response.json({
              error: {
                message: 'Failed to update AI usage record.',
                code: 'USAGE_UPDATE_ERROR',
              },
            }, { status: 500, headers: corsHeaders });
          }
          cloudRequestsUsed = updatedUsage.cloud_requests_used;
          cloudRequestsLimit = updatedUsage.cloud_requests_limit;
          resetAtStr = updatedUsage.reset_at;
        }
      }
    }

    const response = await generateViaProvider(prompt, image, preferredModels);

    return Response.json({
      result: response.result,
      model: response.model,
      ...(tier === 'pro' ? {
        usage: {
          used: cloudRequestsUsed,
          limit: cloudRequestsLimit,
          resetAt: resetAtStr,
        }
      } : {}),
    }, { status: 200, headers: corsHeaders });
  } catch (error) {
    logServerError('API_AI_PROXY', error);
    return Response.json({
      error: {
        message: error instanceof Error ? error.message : 'Internal Server Error',
        code: 'INTERNAL_SERVER_ERROR',
      },
    }, { status: 500, headers: corsHeaders });
  }
}
