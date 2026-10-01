import type { VercelRequest, VercelResponse } from '@vercel/node';
import { buildCorsHeaders, getHeaderOrigin, resolveAllowedOriginFromEnv } from './cors.js';

/** Pre-migration artifact only. Cannot reopen old destructive handlers via a flag. */
export default async function accountAdmissionBridge(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Jozor-Admission-Gate', 'bridge-v1');
  const allowed = resolveAllowedOriginFromEnv(process.env);
  if (allowed) {
    Object.entries(buildCorsHeaders(allowed, { methods: 'POST, OPTIONS', allowCredentials: true }, getHeaderOrigin(req.headers)))
      .forEach(([key, value]) => res.setHeader(key, value));
  }
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  res.setHeader('Retry-After', '300');
  return res.status(503).json({
    code: 'ACCOUNT_ADMISSION_PAUSED',
    error: 'New checkout and account deletion requests are temporarily paused.',
  });
}
