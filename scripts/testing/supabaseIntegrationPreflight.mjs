import { loadSupabaseIntegrationEnvironment } from './supabaseIntegrationEnvironment.mjs';

try {
  const { mode } = loadSupabaseIntegrationEnvironment();
  console.log(`Integration target guard passed (${mode}). No network calls or mutations performed.`);
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Integration configuration could not be verified.');
  process.exitCode = 1;
}
