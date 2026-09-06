import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { parseEnv } from 'node:util';
import { validateSupabaseIntegrationEnvironment } from './supabaseIntegrationEnvironment.mjs';

// Input is piped directly from `supabase status --output env`; never echo keys.
try {
  const status = parseEnv(readFileSync(0, 'utf8'));
  const env = {
    ALLOW_INTEGRATION_MUTATIONS: 'true',
    SUPABASE_INTEGRATION_TARGET: 'local',
    VITE_SUPABASE_URL: status.API_URL || '',
    VITE_SUPABASE_ANON_KEY: status.ANON_KEY || '',
    SUPABASE_SERVICE_ROLE_KEY: status.SERVICE_ROLE_KEY || '',
    SUPABASE_JWT_SECRET: status.JWT_SECRET || '',
  };
  validateSupabaseIntegrationEnvironment(env);
  const directory = path.resolve('output/private-media-local');
  mkdirSync(directory, { recursive: true });
  writeFileSync(path.join(directory, '.env.integration'),
    Object.entries(env).map(([key, value]) => `${key}=${JSON.stringify(value)}`).join('\n') + '\n',
    { mode: 0o600 });
  console.log('Local-only media integration environment prepared. Credentials were not printed.');
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Local environment preparation failed.');
  process.exitCode = 1;
}
