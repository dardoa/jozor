import type { VercelRequest, VercelResponse } from '@vercel/node';
import { logError } from '../utils/errorLogger';
import { authenticateUser } from '../utils/authUtils';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const ALLOWED_ORIGIN = process.env.APP_ORIGIN || process.env.VITE_APP_ORIGIN || 'http://localhost:5173';

// verifyFirebaseToken removed, imported from authUtils instead

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
      },
    });
  }

  if (!GEMINI_API_KEY) {
    const logged = logError('API_GEMINI', new Error('GEMINI_API_KEY not configured'), {
      showToast: false,
    });
    return res.status(500).json({
      error: {
        message: logged.message,
        code: 'GEMINI_CONFIG_ERROR',
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

  const MAX_PROMPT_LENGTH = 30_000;

  try {
    const body = req.body as { prompt?: unknown; image?: { data: string; mimeType: string } };
    const { prompt: rawPrompt, image } = body ?? {};

    if (rawPrompt == null || rawPrompt === '') {
      return res.status(400).json({
        error: {
          message: 'Prompt is required',
          code: 'BAD_REQUEST',
        },
      });
    }
    const prompt = typeof rawPrompt === 'string' ? rawPrompt : String(rawPrompt);
    if (prompt.length > MAX_PROMPT_LENGTH) {
      return res.status(400).json({
        error: {
          message: `Prompt exceeds maximum length of ${MAX_PROMPT_LENGTH} characters`,
          code: 'BAD_REQUEST',
        },
      });
    }

    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

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
    let successResult: string | null = null;
    let successfulModel = '';

    const hasValidImage =
      image &&
      typeof image === 'object' &&
      typeof image.data === 'string' &&
      typeof image.mimeType === 'string';

    for (const modelName of modelsToTry) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });

        const content = hasValidImage
          ? [prompt, { inlineData: { data: image.data, mimeType: image.mimeType } }]
          : prompt;

        const result = await model.generateContent(content);
        const response = await result.response;
        const text = response.text();

        if (text) {
          successResult = text;
          successfulModel = modelName;
          break;
        }
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        logError('API_GEMINI_MODEL', err, { showToast: false });
        lastError = err;

        if (errorMessage.includes('Quota exceeded')) {
          // Intentional fall-through; try next model.
        }
      }
    }

    if (successResult) {
      return res.status(200).json({
        result: successResult,
        model: successfulModel,
      });
    }

    throw lastError || new Error('All models failed');
  } catch (error: unknown) {
    const logged = logError('API_GEMINI', error, { showToast: false });

    const details = error instanceof Error ? error.message : String(error);
    let message = 'Gemini API failed';

    if (details.includes('Quota exceeded')) {
      message = 'Quota Exceeded (Free Tier Limit Reached)';
    } else if (details.includes('API key not valid')) {
      message = 'Invalid API Key';
    }

    return res.status(500).json({
      error: {
        message,
        code: 'GEMINI_SERVER_ERROR',
        details,
      },
    });
  }
}
