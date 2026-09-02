import * as path from 'path';
import { gzipSync } from 'node:zlib';
import { defineConfig, loadEnv } from 'vite';
import type { Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import { createLocalApiProxyMiddleware } from './scripts/dev/localApiProxyMiddleware';

const ENTRY_CHUNK_BUDGET_BYTES = 950 * 1024;
const ENTRY_CHUNK_GZIP_BUDGET_BYTES = 315 * 1024;

function enforceEntryBundleBudget(): Plugin {
  return {
    name: 'jozor-entry-bundle-budget',
    apply: 'build',
    generateBundle(_options, bundle) {
      for (const output of Object.values(bundle)) {
        if (output.type !== 'chunk' || !output.isEntry) continue;

        const bytes = Buffer.byteLength(output.code, 'utf8');
        const gzipBytes = gzipSync(output.code).byteLength;
        if (bytes > ENTRY_CHUNK_BUDGET_BYTES || gzipBytes > ENTRY_CHUNK_GZIP_BUDGET_BYTES) {
          this.error(
            `Entry bundle ${output.fileName} exceeds the Jozor budget: `
            + `${(bytes / 1024).toFixed(2)} KB / ${(gzipBytes / 1024).toFixed(2)} KB gzip; `
            + `limits are ${ENTRY_CHUNK_BUDGET_BYTES / 1024} KB / `
            + `${ENTRY_CHUNK_GZIP_BUDGET_BYTES / 1024} KB gzip.`
          );
        }
      }
    },
  };
}

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
      enforceEntryBundleBudget(),
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
      chunkSizeWarningLimit: ENTRY_CHUNK_BUDGET_BYTES / 1024,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined;

            if (
              id.includes('/react/') ||
              id.includes('\\react\\') ||
              id.includes('/react-dom/') ||
              id.includes('\\react-dom\\') ||
              id.includes('/react-router') ||
              id.includes('\\react-router') ||
              id.includes('/react-leaflet/') ||
              id.includes('\\react-leaflet\\') ||
              id.includes('/@react-leaflet/') ||
              id.includes('\\@react-leaflet\\') ||
              id.includes('lucide-react') ||
              id.includes('sonner')
            ) {
              return 'vendor-react';
            }

            if (
              id.includes('leaflet') ||
              id.includes('supercluster')
            ) {
              return 'vendor-map';
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
      env: {
        VITE_KINDI_AI_ENABLED: 'true',
      },
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
        'tests/integration/**',
        'legacy_archive/**',
      ],
    },
  };
});
