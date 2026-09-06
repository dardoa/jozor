import { defineConfig } from 'vitest/config';
import { loadSupabaseIntegrationEnvironment } from './scripts/testing/supabaseIntegrationEnvironment.mjs';

loadSupabaseIntegrationEnvironment({ suite: 'person-route-context' });

export default defineConfig({
  envDir: false,
  test: {
    environment: 'node',
    include: ['tests/integration/personRouteContext.integration.test.ts'],
    fileParallelism: false,
    maxWorkers: 1,
    hookTimeout: 90000,
    testTimeout: 30000,
  },
});
