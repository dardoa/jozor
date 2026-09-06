import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { parseEnv } from 'node:util';

const projectRefPattern = /^[a-z]{20}$/;
export const LOCAL_INTEGRATION_URL = 'http://127.0.0.1:55321';

/**
 * Only the approved app may receive synthetic user bearer tokens. Never follow
 * redirects or accept an arbitrary HTTP origin from integration configuration.
 * @param {{ mode: string, env: Record<string, string | undefined> }} config
 */
export function resolvePersonMediaIntegrationHttpOrigin(config) {
  const origin = config.env.PERSON_MEDIA_INTEGRATION_HTTP_ORIGIN;
  if (origin === undefined) return null;
  if (config.mode !== 'prelaunch' || origin !== 'https://jozor.vercel.app') {
    reject('deployed media HTTP tests require the approved prelaunch application origin.');
  }
  return origin;
}

/** @param {string} message */
function reject(message) {
  throw new Error(`Integration safety guard: ${message}`);
}

/** @param {Record<string, string | undefined>} env */
function getUrl(env) {
  const viteUrl = env.VITE_SUPABASE_URL?.trim();
  const serverUrl = env.SUPABASE_URL?.trim();
  if (viteUrl && serverUrl && viteUrl.replace(/\/$/, '') !== serverUrl.replace(/\/$/, '')) {
    reject('client and server Supabase URLs disagree.');
  }
  return viteUrl || serverUrl || '';
}

/**
 * Pure, offline validation. No client is constructed before this gate passes.
 * @param {Record<string, string | undefined>} env
 * @param {string[]} protectedUrls
 * @param {{ readOnly?: boolean, suite?: 'private-person-media' | 'person-route-context', linkedProjectRef?: string }} options
 */
export function validateSupabaseIntegrationEnvironment(env, protectedUrls = [], options = {}) {
  if (!options.readOnly && env.ALLOW_INTEGRATION_MUTATIONS !== 'true') {
    reject('ALLOW_INTEGRATION_MUTATIONS=true is required.');
  }
  const mode = env.SUPABASE_INTEGRATION_TARGET || 'staging';
  const rawUrl = getUrl(env);
  let url;
  try { url = new URL(rawUrl); } catch { reject('a valid Supabase URL is required.'); }
  if (!url || url.username || url.password || url.search || url.hash || url.pathname !== '/') {
    reject('the Supabase URL must be an origin without credentials, path, query or fragment.');
  }
  if (mode === 'local') {
    if (rawUrl.replace(/\/$/, '') !== LOCAL_INTEGRATION_URL) {
      reject('local tests require the dedicated loopback endpoint on port 55321.');
    }
  } else if (mode === 'staging') {
    const ref = env.SUPABASE_INTEGRATION_PROJECT_REF || '';
    const productionRef = env.SUPABASE_PRODUCTION_PROJECT_REF || '';
    if (!projectRefPattern.test(ref) || !projectRefPattern.test(productionRef)) {
      reject('valid staging and production project references are required.');
    }
    if (ref === productionRef) reject('staging cannot be the declared production project.');
    if (rawUrl.replace(/\/$/, '') !== `https://${ref}.supabase.co`) {
      reject('the URL must match the staging project hostname exactly.');
    }
    for (const protectedUrl of protectedUrls) {
      let protectedHost;
      try { protectedHost = new URL(protectedUrl).hostname; } catch {
        reject('an application/deployment URL is invalid; verify its configuration first.');
      }
      if (protectedHost === url.hostname) {
        reject('the target is also configured for the application or production deployment. Use a separate test project.');
      }
    }
  } else if (mode === 'prelaunch') {
    if (options.suite !== 'private-person-media' && options.suite !== 'person-route-context') {
      reject('prelaunch is restricted to the reviewed private-person-media and person-route-context suites.');
    }
    const ref = env.SUPABASE_INTEGRATION_PROJECT_REF || '';
    if (!projectRefPattern.test(ref)
      || env.SUPABASE_PRELAUNCH_APPROVED_PROJECT_REF !== ref
      || options.linkedProjectRef !== ref
      || env.SUPABASE_PRELAUNCH_ACKNOWLEDGEMENT !== 'owner-approved-test-data') {
      reject('prelaunch requires explicit owner acknowledgement for the exact linked project.');
    }
    if (rawUrl.replace(/\/$/, '') !== `https://${ref}.supabase.co`
      || !protectedUrls.some(value => value.replace(/\/$/, '') === url.origin)) {
      reject('prelaunch must match the approved application project URL exactly.');
    }
  } else {
    reject('SUPABASE_INTEGRATION_TARGET must be local, staging or explicitly approved prelaunch.');
  }
  const anonKey = env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || '';
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!anonKey.trim() || !serviceRoleKey.trim() || /[<>]/.test(anonKey + serviceRoleKey)) {
    reject('non-placeholder anonymous and service-role credentials are required.');
  }
  return { mode, supabaseUrl: url.origin, anonKey, serviceRoleKey };
}

/**
 * Never falls back to .env for credentials. Application/deployment files are
 * read only for target validation. The narrow prelaunch exception also requires
 * an exact match to the CLI-linked project and explicit owner acknowledgement.
 * @param {{ rootDirectory?: string, envFile?: string, readOnly?: boolean, suite?: 'private-person-media' | 'person-route-context' }} options
 */
export function loadSupabaseIntegrationEnvironment(options = {}) {
  const rootDirectory = options.rootDirectory || process.cwd();
  const file = path.resolve(rootDirectory, options.envFile
    || process.env.SUPABASE_INTEGRATION_ENV_FILE || '.env.integration');
  if (!existsSync(file)) reject('the selected integration environment file does not exist.');
  const env = parseEnv(readFileSync(file, 'utf8'));
  const protectedUrls = [];
  for (const name of ['.env', '.env.local', '.vercel/.env.production.local']) {
    const protectedFile = path.resolve(rootDirectory, name);
    if (!existsSync(protectedFile)) continue;
    const appEnv = parseEnv(readFileSync(protectedFile, 'utf8'));
    for (const key of ['VITE_SUPABASE_URL', 'SUPABASE_URL']) {
      if (appEnv[key]?.trim()) protectedUrls.push(appEnv[key].trim());
    }
  }
  let linkedProjectRef;
  if (env.SUPABASE_INTEGRATION_TARGET === 'prelaunch') {
    const linkedFile = path.join(rootDirectory, 'supabase/.temp/project-ref');
    if (!existsSync(linkedFile)) reject('prelaunch requires a verified CLI-linked project.');
    linkedProjectRef = readFileSync(linkedFile, 'utf8').trim();
  }
  return { env, ...validateSupabaseIntegrationEnvironment(env, protectedUrls, {
    readOnly: options.readOnly, suite: options.suite, linkedProjectRef,
  }) };
}
