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
const RENDER_TIMEOUT_MS = 45_000;
const RESOURCE_ATTRIBUTE_REGEX = /(?:src|href)\s*=\s*["']([^"']+)["']/gi;
const CSS_RESOURCE_REGEX = /url\(\s*["']?([^"')]+)["']?\s*\)/gi;

export const config = {
  maxDuration: 60,
};

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

async function renderWithEmbeddedChromium(html: string): Promise<Buffer> {
  const [{ default: chromium }, { default: puppeteer }] = await Promise.all([
    import('@sparticuz/chromium'),
    import('puppeteer-core'),
  ]);
  chromium.setGraphicsMode = false;

  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: {
      width: 1240,
      height: 1754,
      deviceScaleFactor: 1,
    },
    executablePath: await chromium.executablePath(),
    headless: 'shell',
    protocolTimeout: RENDER_TIMEOUT_MS,
  });

  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(RENDER_TIMEOUT_MS);
    page.setDefaultNavigationTimeout(RENDER_TIMEOUT_MS);
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      const url = request.url();
      if (url === 'about:blank' || url.startsWith('data:')) {
        void request.continue();
        return;
      }
      void request.abort('blockedbyclient');
    });

    await page.setContent(html, {
      waitUntil: 'domcontentloaded',
      timeout: RENDER_TIMEOUT_MS,
    });
    await page.emulateMediaType('print');
    await page.evaluate(async () => {
      await document.fonts.ready;
    });

    const pdf = await page.pdf({
      printBackground: true,
      format: 'A4',
      preferCSSPageSize: true,
      displayHeaderFooter: false,
      margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' },
      timeout: RENDER_TIMEOUT_MS,
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
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

  if (req.method === 'GET') {
    return res.status(200).json({ ready: true, renderer: 'embedded-chromium' });
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

  try {
    const buffer = await renderWithEmbeddedChromium(html);
    if (buffer.length < 5 || buffer.subarray(0, 5).toString('ascii') !== '%PDF-') {
      return res.status(502).json({ error: 'Controlled PDF renderer returned invalid PDF' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="family-manuscript.pdf"');
    res.setHeader('Content-Length', buffer.length.toString());
    return res.status(200).send(buffer);
  } catch {
    return res.status(502).json({ error: 'Controlled PDF renderer returned invalid PDF' });
  }
}
