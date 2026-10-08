import path from 'node:path';
import react from '@vitejs/plugin-react';
import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  envDir: false,
  plugins: [react()],
  resolve: { alias: { '@': path.resolve('src') } },
  define: { __APP_VERSION__: JSON.stringify('2.0.0') },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './tests/setup.ts',
    pool: 'forks',
    maxWorkers: 1,
    fileParallelism: false,
    env: {
      VITE_SUPABASE_URL: 'http://127.0.0.1',
      SUPABASE_URL: 'http://127.0.0.1',
      VITE_SUPABASE_ANON_KEY: 'review-dummy-anon-key',
      SUPABASE_ANON_KEY: 'review-dummy-anon-key',
      SUPABASE_SERVICE_ROLE_KEY: 'review-dummy-service-key',
      SUPABASE_JWT_SECRET: 'review-only-jwt-secret-with-at-least-32-characters',
      PADDLE_API_KEY: 'review-dummy-paddle-key',
      VITE_KINDI_AI_ENABLED: 'true',
    },
    exclude: [...configDefaults.exclude, 'output/**', 'tests/e2e/**',
      'tests/integration/**', 'legacy_archive/**', 'domain/legacy/visibleTree/__tests__/**'],
  },
});
