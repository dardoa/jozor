import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { authenticateUser } from '../utils/authUtils';
import type {
  AIProxyImagePayload,
  AIProxyRequest,
  AncestorChatAIRequestData,
  BiographyAIRequestData,
} from '../types/ai';

const GOOGLE_AI_KEY = process.env.GOOGLE_AI_KEY || process.env.GEMINI_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
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

type AIUsagePeriod = 'daily' | 'monthly';

interface AIUsageReservation {
  allowed: boolean;
  usage_count: number;
  limit: number;
  last_reset: string;
  period: AIUsagePeriod;
  next_reset: string;
}

function getSupabaseAdminClient(): SupabaseClient {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase service role is not configured for AI usage enforcement.');
  }

  if (!supabaseAdminClient) {
    supabaseAdminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  }

  return supabaseAdminClient;
}

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

function getOperationPrompt(body: AIProxyRequest): { prompt: string; image?: AIProxyImagePayload } {
  switch (body.operation) {
    case 'biography':
      return { prompt: getBiographyPrompt(body.data) };
    case 'ancestor_chat':
      return { prompt: getAncestorChatPrompt(body.data) };
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

async function generateViaProvider(prompt: string, image?: AIProxyImagePayload) {
  if (!GOOGLE_AI_KEY) {
    throw new Error('AI provider key is not configured on the server.');
  }

  if (!prompt || prompt.length > MAX_PROMPT_LENGTH) {
    throw new Error(`Prompt exceeds maximum length of ${MAX_PROMPT_LENGTH} characters`);
  }

  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(GOOGLE_AI_KEY);
  const modelsToTry = [
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
      lastError = error;
      logServerError('API_AI_PROXY_MODEL', error);
    }
  }

  throw lastError || new Error('All AI provider attempts failed.');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      error: {
        message: 'Method not allowed',
        code: 'METHOD_NOT_ALLOWED',
      },
    });
  }

  const user = await authenticateUser(req.headers.authorization);
  if (!user) {
    return res.status(401).json({
      error: {
        message: 'Invalid or expired authentication token',
        code: 'UNAUTHORIZED',
      },
    });
  }

  try {
    const body = req.body as AIProxyRequest;
    const { prompt, image } = getOperationPrompt(body);
    const usage = await reserveAIUsage(user.uid);

    if (!usage.allowed) {
      return res.status(429).json({
        error: {
          message: buildUsageLimitMessage(usage),
          code: 'AI_USAGE_LIMIT_EXCEEDED',
          details: {
            usageCount: usage.usage_count,
            limit: usage.limit,
            lastReset: usage.last_reset,
            nextReset: usage.next_reset,
            period: usage.period,
          },
        },
      });
    }

    const response = await generateViaProvider(prompt, image);
    return res.status(200).json({
      ...response,
      usage: {
        usageCount: usage.usage_count,
        limit: usage.limit,
        lastReset: usage.last_reset,
        nextReset: usage.next_reset,
        period: usage.period,
      },
    });
  } catch (error: unknown) {
    logServerError('API_AI_PROXY', error);
    return res.status(500).json({
      error: {
        message: error instanceof Error ? error.message : 'AI proxy request failed',
        code: 'AI_PROXY_ERROR',
      },
    });
  }
}
