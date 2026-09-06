import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { createLocalApiProxyMiddleware } from './scripts/dev/localApiProxyMiddleware';
import { loadSupabaseIntegrationEnvironment } from './scripts/testing/supabaseIntegrationEnvironment.mjs';

const verified = loadSupabaseIntegrationEnvironment({
  envFile: 'output/private-media-local/.env.integration',
});
if (verified.mode !== 'local') throw new Error('Media browser review requires the isolated local backend.');
const env = {
  SUPABASE_URL: verified.supabaseUrl,
  VITE_SUPABASE_URL: verified.supabaseUrl,
  SUPABASE_ANON_KEY: verified.anonKey,
  VITE_SUPABASE_ANON_KEY: verified.anonKey,
  SUPABASE_SERVICE_ROLE_KEY: verified.serviceRoleKey,
  SUPABASE_JWT_SECRET: verified.env.SUPABASE_JWT_SECRET || '',
  ENABLE_LOCAL_API_PROXY: 'true',
  ALLOWED_ORIGIN: 'http://127.0.0.1:3300',
  APP_ORIGIN: 'http://127.0.0.1:3300',
  VITE_APP_ORIGIN: 'http://127.0.0.1:3300',
  VITE_KINDI_AI_ENABLED: 'false',
};
Object.assign(process.env, env);

export default defineConfig({
  envDir: false,
  server: { host: '127.0.0.1', port: 3300, strictPort: true },
  plugins: [react(), createLocalApiProxyMiddleware(env)],
  resolve: { alias: { '@': path.resolve('src') } },
  define: {
    __APP_VERSION__: JSON.stringify('2.0.0'),
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL),
    'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY),
    'import.meta.env.VITE_APP_ORIGIN': JSON.stringify(env.VITE_APP_ORIGIN),
    'import.meta.env.VITE_KINDI_AI_ENABLED': '"false"',
  },
});
