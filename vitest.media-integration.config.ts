import { defineConfig } from 'vitest/config';
import { loadSupabaseIntegrationEnvironment, resolvePersonMediaIntegrationHttpOrigin } from './scripts/testing/supabaseIntegrationEnvironment.mjs';

const verified = loadSupabaseIntegrationEnvironment({ suite: 'private-person-media' });
resolvePersonMediaIntegrationHttpOrigin(verified);
const { mode, supabaseUrl, anonKey, serviceRoleKey } = verified;

export default defineConfig({
  envDir: false,
  test: {
    environment: 'node',
    include: ['tests/integration/privatePersonMedia.integration.test.ts',
      ...(mode === 'local' ? ['tests/integration/personMediaLifecycle.integration.test.ts'] : [])],
    fileParallelism: false,
    maxWorkers: 1,
    hookTimeout: 60000,
    testTimeout: 30000,
    env: {
      SUPABASE_URL: supabaseUrl,
      VITE_SUPABASE_URL: supabaseUrl,
      SUPABASE_ANON_KEY: anonKey,
      VITE_SUPABASE_ANON_KEY: anonKey,
      SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
      SUPABASE_JWT_SECRET: '',
      ALLOWED_ORIGIN: 'http://127.0.0.1:3000',
    },
  },
});
