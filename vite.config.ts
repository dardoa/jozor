import * as path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import crypto from 'crypto';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      headers: {
        // Allow Google OAuth popups to communicate back to the opener.
        // 'same-origin-allow-popups' allows popups opened from this page
        // to use window.opener, which is required for the Google sign-in flow.
        'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
      },
    },
    plugins: [
      react(),
      {
        name: 'api-local-handler',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (req.url?.startsWith('/api/')) {
              const url = new URL(req.url, `http://${req.headers.host}`);
              const pathName = url.pathname;
              const SUPABASE_URL = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
              const SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

              if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Supabase env vars missing. Check your .env' }));
                return;
              }

              // Body Parser for POST
              let body: any = {};
              if (req.method === 'POST') {
                const buffers = [];
                for await (const chunk of req) {
                  buffers.push(chunk);
                }
                const data = Buffer.concat(buffers).toString();
                try { body = JSON.parse(data); } catch (err) {
                  // Ignore
                }
              }

              res.setHeader('Content-Type', 'application/json');

              // 1. /api/share handler
              if (pathName === '/api/share') {
                try {
                  const ownerUid = url.searchParams.get('ownerUid') || body.ownerUid;
                  const driveFileId = url.searchParams.get('driveFileId') || body.driveFileId;
                  const treeId = url.searchParams.get('treeId') || body.treeId;

                  if (!ownerUid) {
                    res.statusCode = 400;
                    res.end(JSON.stringify({ error: 'ownerUid is required' }));
                    return;
                  }

                  // Find or Create Share Record
                  const tableUrl = `${SUPABASE_URL}/rest/v1/tree_shares`;
                  const filter = driveFileId ? `drive_file_id=eq.${driveFileId}` : `tree_id=eq.${treeId}`;
                  const query = `${tableUrl}?owner_uid=eq.${ownerUid}&${filter}&select=*&limit=1`;

                  const existingRes = await fetch(query, {
                    headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` }
                  });
                  const existing = await existingRes.json();
                  let record = existing[0];

                  if (!record && req.method === 'POST') {
                    const createRes = await fetch(tableUrl, {
                      method: 'POST',
                      headers: {
                        apikey: SUPABASE_SERVICE_ROLE_KEY,
                        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=representation'
                      },
                      body: JSON.stringify({
                        owner_uid: ownerUid,
                        drive_file_id: driveFileId || null,
                        tree_id: treeId || null,
                        collaborators: []
                      })
                    });
                    const created = await createRes.json();
                    record = created[0];
                  }

                  if (!record) {
                    res.end(JSON.stringify({ collaborators: [] }));
                    return;
                  }

                  if (req.method === 'GET') {
                    res.end(JSON.stringify({ collaborators: record.collaborators || [] }));
                    return;
                  }

                  if (req.method === 'POST') {
                    const action = url.searchParams.get('action');
                    let collabs = record.collaborators || [];

                    if (action === 'invite') {
                      const email = (body.email || '').toLowerCase();
                      const { role } = body;
                      const idx = collabs.findIndex((c: any) => c.email.toLowerCase() === email.toLowerCase());
                      if (idx >= 0) collabs[idx] = { email, role, status: 'active' };
                      else collabs.push({ email, role, status: 'active' });
                    } else if (action === 'remove') {
                      const { email } = body;
                      collabs = collabs.filter((c: any) => c.email.toLowerCase() !== email.toLowerCase());
                    }

                    await fetch(`${tableUrl}?id=eq.${record.id}`, {
                      method: 'PATCH',
                      headers: {
                        apikey: SUPABASE_SERVICE_ROLE_KEY,
                        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                        'Content-Type': 'application/json'
                      },
                      body: JSON.stringify({ collaborators: collabs })
                    });

                    res.end(JSON.stringify({ collaborators: collabs }));
                    return;
                  }
                } catch (err: any) {
                  res.statusCode = 500;
                  res.end(JSON.stringify({ error: err.message }));
                  return;
                }
              }

              // 2. /api/proxy handler
              if (pathName === '/api/proxy') {
                const searchId = url.searchParams.get('treeId') || url.searchParams.get('fileId') || url.searchParams.get('id');
                if (!searchId) {
                  res.statusCode = 400;
                  res.end(JSON.stringify({ error: 'treeId or fileId required' }));
                  return;
                }

                // Try Database First (UUID or ID)
                const treeUrl = `${SUPABASE_URL}/rest/v1/trees?id=eq.${searchId}&select=*,people(*),relationships(*)`;
                const treeRes = await fetch(treeUrl, {
                  headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` }
                });
                const trees = await treeRes.json();

                if (trees && Array.isArray(trees) && trees[0]) {
                  res.end(JSON.stringify(trees[0]));
                  return;
                }

                // If not in DB, it might be a legacy Google Drive file
                // In local dev, we don't proxy real GDrive files (usually handled client-side or omitted)
                res.statusCode = 404;
                res.end(JSON.stringify({ error: 'Tree not found. If this is a Google Drive file, ensure it has been imported to the database for collaborative sharing.' }));
                return;
              }

              // 3. /api/auth/exchange handler
              if (pathName === '/api/auth/exchange') {
                try {
                  const { code } = body;
                  if (!code) {
                    res.statusCode = 400;
                    res.end(JSON.stringify({ error: 'Missing auth code' }));
                    return;
                  }

                  const GOOGLE_CLIENT_ID = env.VITE_GOOGLE_CLIENT_ID;
                  const GOOGLE_CLIENT_SECRET = env.GOOGLE_CLIENT_SECRET;
                  const SUPABASE_JWT_SECRET = env.SUPABASE_JWT_SECRET || 'super-secret-jwt-token-with-at-least-32-characters-long'; // Fallback for local dev

                  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
                    res.statusCode = 500;
                    res.end(JSON.stringify({ error: 'Google Client ID or Secret missing in .env' }));
                    return;
                  }

                  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams({
                      code,
                      client_id: GOOGLE_CLIENT_ID,
                      client_secret: GOOGLE_CLIENT_SECRET,
                      redirect_uri: 'postmessage',
                      grant_type: 'authorization_code',
                    }),
                  });

                  const tokens = await tokenResponse.json();

                  if (tokens.error) {
                    console.error('Exchange failed:', tokens);
                    res.statusCode = 401;
                    res.end(JSON.stringify({ error: tokens.error_description || 'Failed to exchange code' }));
                    return;
                  }

                  const { access_token, refresh_token } = tokens;

                  const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                    headers: { Authorization: `Bearer ${access_token}` },
                  });
                  const userInfo = await userRes.json();

                  // Generate a local supabase_token

                  const base64UrlEncode = (str: string) => {
                    return Buffer.from(str)
                      .toString('base64')
                      .replace(/=/g, '')
                      .replace(/\+/g, '-')
                      .replace(/\//g, '_');
                  };

                  const payload = {
                    aud: 'authenticated',
                    role: 'authenticated',
                    sub: userInfo.sub,
                    email: userInfo.email,
                    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
                  };

                  const header = { alg: 'HS256', typ: 'JWT' };
                  const encodedHeader = base64UrlEncode(JSON.stringify(header));
                  const encodedPayload = base64UrlEncode(JSON.stringify(payload));

                  const signature = crypto
                    .createHmac('sha256', SUPABASE_JWT_SECRET)
                    .update(encodedHeader + '.' + encodedPayload)
                    .digest('base64')
                    .replace(/=/g, '')
                    .replace(/\+/g, '-')
                    .replace(/\//g, '_');

                  const supabase_token = `${encodedHeader}.${encodedPayload}.${signature}`;

                  res.end(JSON.stringify({
                    access_token,
                    supabase_token,
                    user: {
                      uid: userInfo.sub,
                      email: userInfo.email,
                      displayName: userInfo.name,
                      photoURL: userInfo.picture,
                    },
                  }));
                  return;
                } catch (err: any) {
                  res.statusCode = 500;
                  res.end(JSON.stringify({ error: err.message }));
                  return;
                }
              }
            }
            next();
          });
        }
      }
    ],
    define: {
      __APP_VERSION__: JSON.stringify('1.1.0'),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './tests/setup.ts',
    },
  };
});
