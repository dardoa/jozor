import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

import { verifyInternalToken } from '../../shared/auth/internalJwt.js';
import {
  buildCorsHeaders,
  getHeaderOrigin,
  isRequestOriginAllowed,
  resolveAllowedOriginFromEnv,
} from '../../shared/http/cors.js';

const MAX_HTML_BYTES = 3_800_000;
const MAX_TITLE_LENGTH = 240;
const RENDER_TIMEOUT_MS = 30_000;
const RESOURCE_ATTRIBUTE_REGEX = /(?:src|href)\s*=\s*["']([^"']+)["']/gi;
const CSS_RESOURCE_REGEX = /url\(\s*["']?([^"')]+)["']?\s*\)/gi;

function getEnv(name: string): string | undefined {
  const value = process.env[name];
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

async function authenticateUser(authHeader?: string): Promise<boolean> {
  if (!authHeader?.startsWith('Bearer ')) return false;
  const token = authHeader.slice('Bearer '.length);
  const internalUser = await verifyInternalToken(token, getEnv('SUPABASE_JWT_SECRET'));
  if (internalUser) return true;

  const supabaseUrl = getEnv('SUPABASE_URL') || getEnv('VITE_SUPABASE_URL');
  const supabaseAnonKey = getEnv('SUPABASE_ANON_KEY') || getEnv('VITE_SUPABASE_ANON_KEY');
  if (!supabaseUrl || !supabaseAnonKey) return false;

  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  const { data, error } = await authClient.auth.getUser(token);
  return !error && Boolean(data.user);
}

function isEmbeddedResource(value: string): boolean {
  return /^data:(?:image\/(?:jpeg|png|webp)|font\/ttf);base64,[a-z0-9+/=]+$/i.test(value);
}

function hasUnsafeResources(html: string): boolean {
  if (/<\s*(?:script|iframe|object|embed|base)\b/i.test(html) || /\son[a-z]+\s*=/i.test(html)) {
    return true;
  }
  for (const match of html.matchAll(RESOURCE_ATTRIBUTE_REGEX)) {
    if (!isEmbeddedResource(match[1])) return true;
  }
  for (const match of html.matchAll(CSS_RESOURCE_REGEX)) {
    if (!isEmbeddedResource(match[1])) return true;
  }
  return false;
}

function configureCors(req: VercelRequest, res: VercelResponse): boolean {
  const allowedOrigin = resolveAllowedOriginFromEnv(process.env);
  if (!allowedOrigin) {
    res.status(500).json({ error: 'Server configuration error' });
    return false;
  }
  const origin = getHeaderOrigin(req.headers);
  Object.entries(buildCorsHeaders(allowedOrigin, {
    methods: 'GET, POST, OPTIONS',
    allowCredentials: true,
  }, origin)).forEach(([key, value]) => res.setHeader(key, value));
  if (!isRequestOriginAllowed(origin, allowedOrigin)) {
    res.status(400).json({ error: 'Invalid request origin.' });
    return false;
  }
  return true;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');
  if (!configureCors(req, res)) return;

  if (req.method === 'OPTIONS') {
    res.setHeader('Allow', ['GET', 'POST', 'OPTIONS']);
    return res.status(204).end();
  }
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', ['GET', 'POST', 'OPTIONS']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  if (!(await authenticateUser(req.headers.authorization))) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = getEnv('BROWSERLESS_TOKEN');
  if (!token) {
    return res.status(503).json({ error: 'Controlled PDF renderer is not configured' });
  }
  if (req.method === 'GET') {
    return res.status(200).json({ ready: true });
  }

  const { html, title } = req.body || {};
  if (typeof html !== 'string' || !html.trim()) {
    return res.status(400).json({ error: 'Missing HTML content' });
  }
  if (Buffer.byteLength(html, 'utf8') > MAX_HTML_BYTES) {
    return res.status(413).json({ error: 'Manuscript exceeds the safe export size limit' });
  }
  if (typeof title !== 'string' || !title.trim() || title.length > MAX_TITLE_LENGTH) {
    return res.status(400).json({ error: 'Invalid title' });
  }
  if (hasUnsafeResources(html)) {
    return res.status(400).json({ error: 'Manuscript contains unsupported external resources' });
  }

  const endpoint = getEnv('BROWSERLESS_ENDPOINT') || 'https://chrome.browserless.io/pdf';
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), RENDER_TIMEOUT_MS);
  try {
    const response = await fetch(`${endpoint}?token=${encodeURIComponent(token)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        html,
        options: {
          printBackground: true,
          format: 'A4',
          preferCSSPageSize: true,
          displayHeaderFooter: false,
          margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' },
        },
      }),
    });

    if (!response.ok || !(response.headers.get('content-type') || '').includes('application/pdf')) {
      return res.status(502).json({ error: 'Controlled PDF renderer returned invalid PDF' });
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length < 5 || buffer.subarray(0, 5).toString('ascii') !== '%PDF-') {
      return res.status(502).json({ error: 'Controlled PDF renderer returned invalid PDF' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="family-manuscript.pdf"');
    res.setHeader('Content-Length', buffer.length.toString());
    return res.status(200).send(buffer);
  } catch {
    return res.status(502).json({ error: 'Controlled PDF renderer returned invalid PDF' });
  } finally {
    clearTimeout(timeout);
  }
}
