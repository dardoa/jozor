import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { checkServerIdentity } from 'node:tls';
import { executeReviewedBillingInsert, findBillingInsertReceipt, verifyBillingInsertSchema } from './accountBillingInsertOperator.mjs';

const require = createRequire(import.meta.url);
const driverPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../output/billing-postgres-tools/node_modules/pg');
const projectRefPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../supabase/.temp/project-ref');
const rejected = code => ({ status: 'rejected', code, mutationsPerformed: false });
const identitySql = `SELECT current_database() AS database, session_user AS "sessionUser",
  current_user AS "currentUser", pg_is_in_recovery() AS recovery`;

function resolveTarget({ env, linkedProjectRef, connectionString, ca }) {
  if (Object.keys(process.env).some(key => /^PG[A-Z_]/i.test(key)) || process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0') throw new Error();
  if (!/^[a-z0-9]{20}$/.test(linkedProjectRef ?? '')
    || ![undefined, '', `https://${linkedProjectRef}.supabase.co`, `https://${linkedProjectRef}.supabase.co/`].includes(env?.SUPABASE_URL)
    || ![`https://${linkedProjectRef}.supabase.co`, `https://${linkedProjectRef}.supabase.co/`].includes(env?.VITE_SUPABASE_URL)) throw new Error();
  const mode = env.PADDLE_ENVIRONMENT;
  if (!['sandbox', 'production'].includes(mode) || env.VITE_PADDLE_ENVIRONMENT !== mode
    || !env.VITE_PADDLE_CLIENT_TOKEN?.startsWith(mode === 'sandbox' ? 'test_' : 'live_')
    || !env.PADDLE_API_KEY?.startsWith(mode === 'sandbox' ? 'pdl_sdbx_apikey_' : 'pdl_live_apikey_')) throw new Error();
  if (typeof connectionString !== 'string' || connectionString.length > 8192 || /[\s\\]/.test(connectionString)) throw new Error();
  const url = new URL(connectionString);
  const user = decodeURIComponent(url.username);
  const password = decodeURIComponent(url.password);
  const direct = url.hostname === `db.${linkedProjectRef}.supabase.co` && user === 'postgres';
  const session = /^[a-z0-9]+(?:-[a-z0-9]+)*\.pooler\.supabase\.com$/.test(url.hostname) && user === `postgres.${linkedProjectRef}`;
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || (!direct && !session) || url.port !== '5432'
    || url.pathname !== '/postgres' || url.search || url.hash || !password || /[\u0000-\u001f\u007f]/.test(password)) throw new Error();
  if (ca !== undefined && (typeof ca !== 'string' || ca.length > 65536 || !ca.includes('-----BEGIN CERTIFICATE-----')
    || ca.includes('PRIVATE KEY'))) throw new Error();
  const target = { projectRef: linkedProjectRef, providerEnvironment: mode, connectionMode: direct ? 'direct' : 'session-pooler' };
  const targetFingerprint = createHash('sha256').update(JSON.stringify([target, url.hostname, user, '5432', 'postgres'])).digest('hex');
  return { target: Object.freeze({ ...target, targetFingerprint }), config: {
    host: url.hostname, port: 5432, user, password, database: 'postgres',
    ssl: { rejectUnauthorized: true, servername: url.hostname, checkServerIdentity, minVersion: 'TLSv1.2', ...(ca ? { ca } : {}) },
    // Never pass the DSN to pg: URI ssl/options parameters override explicit config.
    options: '-c search_path=pg_catalog,public', application_name: 'jozor-billing-reviewed-operator',
    client_encoding: 'UTF8', connectionTimeoutMillis: 10000, query_timeout: 20000,
    statement_timeout: 15000, lock_timeout: 2000, idle_in_transaction_session_timeout: 20000,
  } };
}

function matchesReview(prepared, target) {
  const { review, payload } = prepared ?? {};
  return review?.expectedProjectRef === target.projectRef && review?.providerEnvironment === target.providerEnvironment
    && payload?.version === 1 && review.requestId === payload.request_id
    && typeof payload.request_id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(payload.request_id)
    && review.snapshotFingerprint === payload.snapshot_fingerprint && /^[0-9a-f]{64}$/.test(payload.snapshot_fingerprint ?? '')
    && Array.isArray(payload.accounts) && payload.accounts.length > 0 && payload.accounts.length <= 10
    && review.accountCount === payload.accounts.length && payload.accounts.every(row => Array.isArray(row?.inserts) && row.inserts.length > 0)
    && review.insertCount === payload.accounts.flatMap(row => row.inserts).length && review.insertCount <= 20;
}

async function closeClient(client) {
  let timeout;
  try {
    await Promise.race([client.end(), new Promise((_, reject) => {
      timeout = setTimeout(() => reject(new Error()), 5000);
    })]);
    return true;
  } catch {
    try { client.connection?.stream?.destroy(); } catch { /* No driver diagnostics may cross the operator boundary. */ }
    return false;
  } finally { clearTimeout(timeout); }
}

/**
 * Operator-only connection boundary, not a public authorization API or apply CLI.
 * Options/Client are trusted operator inputs. Only the returned aggregate is loggable.
 * Each call owns a new TLS-verified connection and always closes it. No pool/reconnect.
 */
export async function runBillingOperatorSession(options, Client) {
  const mode = options?.mode ?? 'inspect';
  let resolved;
  let prepared;
  let approval;
  try {
    if (!['inspect', 'apply', 'receipt'].includes(mode)) return rejected('unsupported-operation');
    resolved = resolveTarget(options);
    // Own the reviewed bytes before the first await so callers cannot swap a batch.
    prepared = options.prepared === undefined ? undefined : structuredClone(options.prepared);
    approval = options.approval === undefined ? undefined : structuredClone(options.approval);
    if (mode !== 'inspect' && !matchesReview(prepared, resolved.target)) return rejected('review-target-mismatch');
    if (mode === 'apply' && (approval?.projectRef !== resolved.target.projectRef
      || approval.providerEnvironment !== resolved.target.providerEnvironment
      || approval.targetFingerprint !== resolved.target.targetFingerprint || approval.admissionShutdownConfirmed !== true
      || approval.requestId !== prepared.review.requestId || approval.snapshotFingerprint !== prepared.review.snapshotFingerprint
      || approval.accountCount !== prepared.review.accountCount || approval.insertCount !== prepared.review.insertCount)) return rejected('approval-target-mismatch');
  } catch { return rejected('target-configuration-rejected'); }

  try {
    if ((await readFile(projectRefPath, 'utf8')).trim() !== resolved.target.projectRef) return rejected('linked-project-mismatch');
  } catch { return rejected('linked-project-unavailable'); }

  let client;
  let result;
  let connectionFailed = false;
  let applyStarted = false;
  try {
    const Driver = Client ?? require(driverPath).Client;
    client = new Driver(resolved.config);
    client.on('error', () => { connectionFailed = true; });
    await client.connect();
    const stream = client.connection?.stream;
    if (stream?.encrypted !== true || stream.authorized !== true
      || checkServerIdentity(resolved.config.host, stream.getPeerCertificate(true))) throw new Error();
    const { rows } = await client.query(identitySql);
    if (connectionFailed || rows.length !== 1 || rows[0].database !== 'postgres' || rows[0].sessionUser !== 'postgres'
      || rows[0].currentUser !== 'postgres' || rows[0].recovery !== false) throw new Error();
    const binding = { target: resolved.target, databaseConnectionBound: true };
    if (mode === 'inspect') {
      await client.query('BEGIN READ ONLY');
      const schemaVerified = await verifyBillingInsertSchema(client);
      await client.query('ROLLBACK');
      result = { status: 'inspected', ...binding, schemaVerified, applyAllowed: false, mutationsPerformed: false };
    } else if (mode === 'receipt') {
      await client.query('BEGIN READ ONLY');
      const receipt = await findBillingInsertReceipt(client, prepared.payload);
      await client.query('ROLLBACK');
      result = { status: receipt ? 'receipt-found' : 'receipt-not-found', ...binding, receipt, mutationsPerformed: false };
    } else {
      applyStarted = true;
      result = { ...await executeReviewedBillingInsert(client, prepared.payload, approval), ...binding };
    }
  } catch {
    // COMMIT ambiguity is handled by the kernel, never rewritten as a safe retry.
    result = applyStarted
      ? { status: 'commit-unconfirmed', requestId: prepared.payload.request_id, discardConnection: true, requiresReceiptLookup: true }
      : rejected('target-session-unavailable');
  } finally {
    if (client) result = { ...result, connectionClosed: await closeClient(client) };
  }
  return result;
}
