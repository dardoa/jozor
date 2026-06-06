import type { VercelRequest, VercelResponse } from '@vercel/node';
import { logError } from '../utils/errorLogger';

// Diagnostic endpoint للتحقق من البيئة
export default async function handler(_req: VercelRequest, res: VercelResponse) {
  // Completely disable this endpoint in production to avoid leaking any metadata
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({
      error: {
        message: 'Not found',
      },
    });
  }

  try {
    const hasProviderKey = !!(process.env.GOOGLE_AI_KEY || process.env.GEMINI_API_KEY);
    const hasSupabaseServiceRole = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
    const kindiAIClientFlag = process.env.VITE_KINDI_AI_ENABLED === 'true';
    const appOrigin = process.env.APP_ORIGIN || process.env.VITE_APP_ORIGIN || null;

    return res.status(200).json({
      hasProviderKey,
      hasSupabaseServiceRole,
      kindiAIClientFlag,
      appOrigin,
      env: process.env.NODE_ENV,
    });
  } catch (error) {
    logError('API_CHECK_ENV', error, { showToast: false });
    return res.status(500).json({
      error: {
        message: 'Environment check failed',
      },
    });
  }
}
