import type { VercelRequest, VercelResponse } from '@vercel/node';

// Debug endpoint للتحقق من متغيرات البيئة الحاسمة
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Disable in production
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found' });
  }

  try {
    const envVars = {
      // Client-side variables
      VITE_SUPABASE_URL: !!process.env.VITE_SUPABASE_URL,
      VITE_SUPABASE_ANON_KEY: !!process.env.VITE_SUPABASE_ANON_KEY,
      VITE_GOOGLE_CLIENT_ID: !!process.env.VITE_GOOGLE_CLIENT_ID,
      
      // Server-side variables (critical for auth)
      SUPABASE_URL: !!process.env.SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      SUPABASE_JWT_SECRET: !!process.env.SUPABASE_JWT_SECRET,
      GOOGLE_CLIENT_ID: !!process.env.GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET: !!process.env.GOOGLE_CLIENT_SECRET,
      
      // Optional
      ENCRYPTION_SECRET: !!process.env.ENCRYPTION_SECRET,
      
      // Environment
      NODE_ENV: process.env.NODE_ENV,
    };

    // Check for critical missing variables
    const criticalMissing = [];
    if (!envVars.SUPABASE_JWT_SECRET) criticalMissing.push('SUPABASE_JWT_SECRET');
    if (!envVars.GOOGLE_CLIENT_SECRET) criticalMissing.push('GOOGLE_CLIENT_SECRET');
    if (!envVars.SUPABASE_SERVICE_ROLE_KEY) criticalMissing.push('SUPABASE_SERVICE_ROLE_KEY');

    return res.status(200).json({
      status: criticalMissing.length === 0 ? 'OK' : 'CRITICAL_MISSING',
      envVars,
      criticalMissing,
      recommendation: criticalMissing.length > 0 
        ? 'Add missing variables to your Vercel environment or .env.local'
        : 'All critical variables are present'
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Debug endpoint failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
