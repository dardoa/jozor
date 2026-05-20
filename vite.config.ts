import * as path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import { createLocalApiProxyMiddleware } from './scripts/dev/localApiProxyMiddleware';

export default defineConfig(({ mode }) => {
  console.log('\x1b[36m%s\x1b[0m', '🛡️ Jozor Security: Initializing configuration...');
  const env = loadEnv(mode, process.cwd(), '');
  Object.assign(process.env, env);
  const shouldAnalyzeBundle = env.BUNDLE_ANALYZE === 'true' || process.env.BUNDLE_ANALYZE === 'true';

  // CRITICAL SECURITY CHECK: Force exit if secret is missing or insecure
  const jwtSecret = env.SUPABASE_JWT_SECRET || process.env.SUPABASE_JWT_SECRET;

  if (!jwtSecret || jwtSecret.length < 32) {
    process.stdout.write('\n\x1b[41m CRITICAL SECURITY ERROR \x1b[0m\n');
    process.stdout.write('\x1b[31mSUPABASE_JWT_SECRET is missing or too short in .env!\x1b[0m\n');
    process.stdout.write('The server will not start until this is fixed.\n\n');
    process.exit(1);
  }

  console.log('\x1b[32m%s\x1b[0m', '✅ Jozor Security: SUPABASE_JWT_SECRET validated.');

  return {
    server: {
      port: 3000,
      strictPort: true, // Fail loudly if 3000 is taken — NEVER silently upgrade to 3001 (breaks Supabase OAuth whitelist)
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
      shouldAnalyzeBundle && visualizer({
        filename: 'dist/bundle-stats.html',
        gzipSize: true,
        brotliSize: true,
        template: 'treemap',
      }),
      createLocalApiProxyMiddleware(env),
    ],
    define: {
      __APP_VERSION__: JSON.stringify('2.0.0'),
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            const normalizedId = id.replace(/\\/g, '/');

            if (normalizedId.includes('/src/features/kindi/')) {
              return 'feature-kindi';
            }

            if (normalizedId.includes('/src/features/smart-persona/')) {
              return 'feature-smart-persona';
            }

            if (normalizedId.includes('/src/features/settings/')) {
              return 'feature-settings';
            }

            if (normalizedId.includes('/src/features/tree-control/')) {
              return 'feature-tree-control';
            }

            if (normalizedId.includes('/src/features/the-vault/')) {
              return 'feature-vault';
            }

            if (normalizedId.includes('/src/features/geography/')) {
              return 'feature-geography';
            }

            if (!id.includes('node_modules')) return undefined;

            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'vendor-react';
            }

            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }

            if (id.includes('@supabase')) {
              return 'vendor-supabase';
            }

            if (id.includes('date-fns')) {
              return 'vendor-date';
            }

            if (id.includes('/d3-') || id.includes('\\d3-') || id.includes('/d3/') || id.includes('\\d3\\')) {
              return 'vendor-d3';
            }

            if (id.includes('jspdf')) {
              return 'vendor-jspdf';
            }

            if (id.includes('html2canvas')) {
              return 'vendor-html2canvas';
            }

            if (id.includes('html-to-image')) {
              return 'vendor-html-to-image';
            }

            if (
              id.includes('leaflet') ||
              id.includes('react-leaflet') ||
              id.includes('supercluster')
            ) {
              return 'vendor-map';
            }

            return undefined;
          },
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    test: {
      globals: true,
      environment: 'jsdom',
      environmentMatchGlobs: [
        ['**/*.unit.test.ts', 'node']
      ],
      setupFiles: './tests/setup.ts',
      // Cap concurrent worker forks to prevent Node.js heap OOM on large jsdom suites.
      pool: 'forks',
      maxWorkers: 1,
      fileParallelism: false,
      exclude: [
        '**/node_modules/**',
        '**/.git/**',
        'domain/legacy/visibleTree/__tests__/**',
        'tests/e2e/**',
        'legacy_archive/**',
      ],
    },
  };
});
