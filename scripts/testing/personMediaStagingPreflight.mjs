import { loadSupabaseIntegrationEnvironment } from './supabaseIntegrationEnvironment.mjs';
import { inspectPersonMediaReadiness } from './personMediaReadiness.mjs';

try {
  const config = loadSupabaseIntegrationEnvironment({ readOnly: true });
  if (config.mode !== 'staging') throw new Error('Staging preflight requires a distinct hosted staging target.');
  const report = await inspectPersonMediaReadiness(config);
  console.log(JSON.stringify(report, null, 2));
  if (report.status === 'blocked') process.exitCode = 1;
} catch (error) {
  // The configuration guard emits fixed messages without credential values.
  console.error(error instanceof Error && (error.message.startsWith('Integration safety guard:')
    || error.message.startsWith('Staging preflight requires'))
    ? error.message : 'Staging metadata could not be checked safely.');
  process.exitCode = 1;
}
