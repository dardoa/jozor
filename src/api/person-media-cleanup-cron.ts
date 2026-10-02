import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { sweepPersonMediaOrphans } from '../services/personMediaServerCleanup.js';
import { sweepUserAvatarCleanup } from '../services/userAvatarCleanup.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const secret = process.env.CRON_SECRET;
  if (!secret) return res.status(503).json({ error: 'Cleanup is not configured' });
  if (req.headers.authorization !== `Bearer ${secret}`) return res.status(401).json({ error: 'Unauthorized' });
  // Activate only after the target project's forward migration and staging gate.
  if (process.env.PERSON_MEDIA_CLEANUP_ENABLED !== 'true') return res.status(200).json({ enabled: false });
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return res.status(503).json({ error: 'Cleanup is not configured' });
  try {
    const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const counts = await sweepPersonMediaOrphans(admin);
    if (process.env.USER_AVATAR_CLEANUP_ENABLED === 'true') {
      const avatars = await sweepUserAvatarCleanup(admin);
      return res.status(200).json({
        checked: counts.checked + avatars.checked, removed: counts.removed + avatars.removed,
        retained: counts.retained + avatars.retained, failed: counts.failed + avatars.failed,
      });
    }
    return res.status(200).json(counts);
  } catch {
    return res.status(500).json({ error: 'Media cleanup failed' });
  }
}
