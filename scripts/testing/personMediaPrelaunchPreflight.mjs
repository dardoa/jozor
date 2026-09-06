import { loadSupabaseIntegrationEnvironment } from './supabaseIntegrationEnvironment.mjs';
import { inspectPersonMediaReadiness } from './personMediaReadiness.mjs';

try {
  const config = loadSupabaseIntegrationEnvironment({
    readOnly: true, suite: 'private-person-media',
    envFile: process.env.SUPABASE_INTEGRATION_ENV_FILE || '.env.integration.prelaunch',
  });
  if (config.mode !== 'prelaunch') throw new Error('Prelaunch preflight requires explicit owner approval.');
  const report = await inspectPersonMediaReadiness(config);
  console.log(JSON.stringify(report, null, 2));
  if (report.status === 'blocked') process.exitCode = 1;
} catch (error) {
  console.error(error instanceof Error && (error.message.startsWith('Integration safety guard:')
    || error.message.startsWith('Prelaunch preflight requires'))
    ? error.message : 'Prelaunch metadata could not be checked safely.');
  process.exitCode = 1;
}
